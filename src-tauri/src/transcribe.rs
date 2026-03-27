use serde::Serialize;
use std::path::PathBuf;
use tauri::{command, AppHandle, Emitter, Manager};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

#[derive(Serialize, Clone)]
pub struct TranscribedWord {
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub probability: f32,
}

#[derive(Serialize, Clone)]
pub struct TranscribedSegment {
    pub id: String,
    pub words: Vec<TranscribedWord>,
}

/// Download a Whisper GGML model from Hugging Face if not already cached.
fn ensure_model(app: &AppHandle, model_name: &str) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let models_dir = data_dir.join("whisper-models");
    std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;

    let filename = format!("ggml-{}.bin", model_name);
    let model_path = models_dir.join(&filename);

    if model_path.exists() {
        return Ok(model_path);
    }

    let _ = app.emit("transcribe:progress", "Downloading model...");
    let api = hf_hub::api::sync::Api::new().map_err(|e| e.to_string())?;
    let repo = api.model("ggerganov/whisper.cpp".to_string());
    let downloaded = repo
        .get(&filename)
        .map_err(|e| format!("Failed to download model '{}': {}", filename, e))?;

    std::fs::copy(&downloaded, &model_path).map_err(|e| e.to_string())?;

    Ok(model_path)
}

/// Convert audio to 16kHz mono f32le PCM using FFmpeg, then read samples.
async fn load_audio_samples(app: &AppHandle, audio_path: &str) -> Result<Vec<f32>, String> {
    let temp_dir = tempfile::tempdir().map_err(|e| e.to_string())?;
    let pcm_path = temp_dir.path().join("audio.pcm");
    let pcm_str = pcm_path.to_str().unwrap();

    let ffmpeg_args = [
        "-y", "-i", audio_path,
        "-ar", "16000", "-ac", "1", "-f", "f32le",
        pcm_str,
    ];

    // Try sidecar first
    let sidecar_ok = {
        use tauri_plugin_shell::ShellExt;
        match app.shell().sidecar("ffmpeg") {
            Ok(cmd) => match cmd.args(&ffmpeg_args).output().await {
                Ok(out) if out.status.success() => true,
                _ => false,
            },
            Err(_) => false,
        }
    };

    // Fallback to system ffmpeg
    if !sidecar_ok {
        let args: Vec<String> = ffmpeg_args.iter().map(|s| s.to_string()).collect();
        let result = tauri::async_runtime::spawn_blocking(move || {
            std::process::Command::new("ffmpeg").args(&args).output()
        })
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| format!("ffmpeg not found. Install ffmpeg: {}", e))?;

        if !result.status.success() {
            return Err(format!(
                "FFmpeg audio conversion failed: {}",
                String::from_utf8_lossy(&result.stderr)
            ));
        }
    }

    let bytes = std::fs::read(&pcm_path).map_err(|e| e.to_string())?;
    let samples: Vec<f32> = bytes
        .chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect();

    Ok(samples)
}

/// Transcribe audio using a 2-pass approach:
/// - Pass 1: Natural sentence/phrase segmentation (no max_len constraint)
/// - Pass 2: Word-level timestamps (max_len=1)
/// Then merge: use sentence boundaries from pass 1, word timestamps from pass 2.
#[command]
pub async fn transcribe_audio(
    app: AppHandle,
    audio_path: Option<String>,
    audio_data: Option<Vec<u8>>,
    model: Option<String>,
    language: Option<String>,
    strip_punctuation: Option<bool>,
) -> Result<Vec<TranscribedSegment>, String> {
    let model_name = model.unwrap_or_else(|| "base".to_string());
    let model_path = ensure_model(&app, &model_name)?;

    let _ = app.emit("transcribe:progress", "Loading model...");

    // Resolve audio path
    let _temp_dir_guard;
    let resolved_path = if let Some(data) = audio_data {
        let temp_dir = tempfile::tempdir().map_err(|e| e.to_string())?;
        let temp_path = temp_dir.path().join("input-audio");
        std::fs::write(&temp_path, &data).map_err(|e| e.to_string())?;
        _temp_dir_guard = Some(temp_dir);
        temp_path.to_str().unwrap().to_string()
    } else if let Some(path) = audio_path {
        _temp_dir_guard = None;
        path
    } else {
        return Err("Either audio_path or audio_data must be provided".to_string());
    };

    let samples = load_audio_samples(&app, &resolved_path).await?;

    let _ = app.emit("transcribe:progress", "Transcribing...");

    let lang = language.clone();
    let strip_punct = strip_punctuation.unwrap_or(false);
    let samples_clone = samples.clone();

    let segments = tokio::task::spawn_blocking(move || -> Result<Vec<TranscribedSegment>, String> {
        let ctx = WhisperContext::new_with_params(
            model_path.to_str().unwrap(),
            WhisperContextParameters::default(),
        )
        .map_err(|e| format!("Failed to load Whisper model: {:?}", e))?;

        // ── Pass 1: Sentence-level segmentation ──
        let mut params1 = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        if let Some(ref lang) = lang {
            params1.set_language(Some(lang));
        }
        params1.set_print_progress(false);
        params1.set_print_realtime(false);
        params1.set_print_timestamps(false);
        params1.set_token_timestamps(true);
        // No max_len — let Whisper create natural sentence boundaries

        let mut state1 = ctx.create_state().map_err(|e| format!("{:?}", e))?;
        state1.full(params1, &samples).map_err(|e| format!("Pass 1 failed: {:?}", e))?;

        // Collect sentence boundaries (start_ms, end_ms)
        let num_segs1 = state1.full_n_segments().map_err(|e| format!("{:?}", e))?;
        let mut sentence_boundaries: Vec<(i64, i64)> = Vec::new();
        for i in 0..num_segs1 {
            let t0 = state1.full_get_segment_t0(i).map_err(|e| format!("{:?}", e))? as i64 * 10;
            let t1 = state1.full_get_segment_t1(i).map_err(|e| format!("{:?}", e))? as i64 * 10;
            sentence_boundaries.push((t0, t1));
        }

        // ── Pass 2: Word-level timestamps ──
        let mut params2 = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        if let Some(ref lang) = lang {
            params2.set_language(Some(lang));
        }
        params2.set_print_progress(false);
        params2.set_print_realtime(false);
        params2.set_print_timestamps(false);
        params2.set_token_timestamps(true);
        params2.set_max_len(1); // Force word-by-word for precise timestamps

        let mut state2 = ctx.create_state().map_err(|e| format!("{:?}", e))?;
        state2.full(params2, &samples_clone).map_err(|e| format!("Pass 2 failed: {:?}", e))?;

        // Collect all words with timestamps
        let num_segs2 = state2.full_n_segments().map_err(|e| format!("{:?}", e))?;
        let mut all_words: Vec<TranscribedWord> = Vec::new();

        for i in 0..num_segs2 {
            let num_tokens = state2.full_n_tokens(i).map_err(|e| format!("{:?}", e))?;
            for j in 0..num_tokens {
                let token_text = state2.full_get_token_text(i, j).map_err(|e| format!("{:?}", e))?;
                let token_data = state2.full_get_token_data(i, j).map_err(|e| format!("{:?}", e))?;

                let mut text = token_text.trim().to_string();
                if text.is_empty() || text.starts_with('[') || text.starts_with('<') {
                    continue;
                }

                if strip_punct {
                    text = text.replace(|c: char| c.is_ascii_punctuation(), "");
                    if text.is_empty() {
                        continue;
                    }
                }

                all_words.push(TranscribedWord {
                    text,
                    start_ms: (token_data.t0 as i64) * 10,
                    end_ms: (token_data.t1 as i64) * 10,
                    probability: token_data.p,
                });
            }
        }

        // ── Post-process: merge punctuation into preceding word ──
        let mut merged_words: Vec<TranscribedWord> = Vec::new();
        for w in all_words {
            let is_punct_only = w.text.chars().all(|c| c.is_ascii_punctuation());
            if is_punct_only && !merged_words.is_empty() {
                // Append punctuation to the previous word (no space)
                let prev = merged_words.last_mut().unwrap();
                prev.text.push_str(&w.text);
                prev.end_ms = w.end_ms;
            } else if !is_punct_only {
                // Check if word starts with punctuation that should stick to previous
                // e.g. "'s", "'t", "'m", "'re", "'ve", "'ll", "'d"
                let starts_with_apos = w.text.starts_with('\'') || w.text.starts_with('\u{2019}');
                if starts_with_apos && !merged_words.is_empty() {
                    let prev = merged_words.last_mut().unwrap();
                    prev.text.push_str(&w.text);
                    prev.end_ms = w.end_ms;
                } else {
                    merged_words.push(w);
                }
            } else {
                merged_words.push(w);
            }
        }
        let all_words = merged_words;

        // ── Merge: group words into sentence boundaries ──
        let mut result: Vec<TranscribedSegment> = Vec::new();
        let mut word_idx = 0;

        for (seg_i, &(_seg_start, seg_end)) in sentence_boundaries.iter().enumerate() {
            let mut seg_words: Vec<TranscribedWord> = Vec::new();

            // Collect words that fall within this sentence's time range
            while word_idx < all_words.len() {
                let w = &all_words[word_idx];
                // Word belongs to this segment if its start is before segment end
                // (with some tolerance for alignment differences between passes)
                if w.start_ms < seg_end + 100 {
                    seg_words.push(w.clone());
                    word_idx += 1;
                } else {
                    break;
                }
            }

            if !seg_words.is_empty() {
                result.push(TranscribedSegment {
                    id: format!("seg-{}", seg_i + 1),
                    words: seg_words,
                });
            }
        }

        // Any remaining words go into a final segment
        if word_idx < all_words.len() {
            let remaining: Vec<TranscribedWord> = all_words[word_idx..].to_vec();
            if !remaining.is_empty() {
                result.push(TranscribedSegment {
                    id: format!("seg-{}", sentence_boundaries.len() + 1),
                    words: remaining,
                });
            }
        }

        Ok(result)
    })
    .await
    .map_err(|e| format!("Thread error: {}", e))?
    .map_err(|e| e)?;

    let _ = app.emit("transcribe:progress", "Done");

    Ok(segments)
}
