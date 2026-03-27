use serde::Deserialize;
use tauri::command;

#[derive(Deserialize)]
pub struct AudioTrackSpec {
    pub path: String,
    pub start_ms: f64,
    pub volume: f64,
    pub fade_in_ms: f64,
    pub fade_out_ms: f64,
    pub trim_start_ms: f64,
    pub trim_end_ms: Option<f64>,
}

struct CmdOutput {
    success: bool,
    stdout: Vec<u8>,
    stderr: Vec<u8>,
}

/// Run an ffmpeg/ffprobe command. Tries the bundled sidecar first, falls back to system binary.
async fn run_ffmpeg_binary(
    app: &tauri::AppHandle,
    binary: &str,
    args: &[String],
) -> Result<CmdOutput, String> {
    // Try sidecar first
    {
        use tauri_plugin_shell::ShellExt;
        if let Ok(cmd) = app.shell().sidecar(binary) {
            if let Ok(out) = cmd.args(args).output().await {
                if out.status.success() {
                    return Ok(CmdOutput {
                        success: true,
                        stdout: out.stdout,
                        stderr: out.stderr,
                    });
                }
            }
        }
    }

    // Fallback to system binary
    let binary_owned = binary.to_string();
    let binary_name = binary.to_string();
    let args = args.to_vec();
    let result = tauri::async_runtime::spawn_blocking(move || {
        std::process::Command::new(&binary_owned)
            .args(&args)
            .output()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| format!("{} not found. Install it or provide a bundled binary: {}", binary_name, e))?;

    Ok(CmdOutput {
        success: result.status.success(),
        stdout: result.stdout,
        stderr: result.stderr,
    })
}

/// Mix multiple audio tracks into a single output file.
#[command]
pub async fn mix_audio(
    app: tauri::AppHandle,
    tracks: Vec<AudioTrackSpec>,
    output_path: String,
    total_duration_ms: f64,
) -> Result<String, String> {
    if tracks.is_empty() {
        return Err("No audio tracks to mix".into());
    }

    let mut args: Vec<String> = vec!["-y".into()];

    // Input files
    for track in &tracks {
        let ss = track.trim_start_ms / 1000.0;
        if ss > 0.0 {
            args.extend(["-ss".into(), format!("{:.3}", ss)]);
        }
        if let Some(trim_end) = track.trim_end_ms {
            let duration = (trim_end - track.trim_start_ms) / 1000.0;
            args.extend(["-t".into(), format!("{:.3}", duration)]);
        }
        args.extend(["-i".into(), track.path.clone()]);
    }

    // Build filter for mixing with delays and volumes
    let mut filters = Vec::new();
    let mut mix_inputs = Vec::new();

    for (i, track) in tracks.iter().enumerate() {
        let delay_ms = track.start_ms;
        let label = format!("a{}", i);
        let mut filter_parts = Vec::new();

        if (track.volume - 1.0).abs() > 0.01 {
            filter_parts.push(format!("volume={:.2}", track.volume));
        }
        if delay_ms > 0.0 {
            filter_parts.push(format!("adelay={}|{}", delay_ms as i64, delay_ms as i64));
        }
        if track.fade_in_ms > 0.0 {
            filter_parts.push(format!("afade=t=in:d={:.3}", track.fade_in_ms / 1000.0));
        }
        if track.fade_out_ms > 0.0 {
            let total_sec = total_duration_ms / 1000.0;
            let fade_start = total_sec - track.fade_out_ms / 1000.0;
            filter_parts.push(format!("afade=t=out:st={:.3}:d={:.3}", fade_start, track.fade_out_ms / 1000.0));
        }

        if filter_parts.is_empty() {
            filters.push(format!("[{}:a]acopy[{}]", i, label));
        } else {
            filters.push(format!("[{}:a]{}[{}]", i, filter_parts.join(","), label));
        }
        mix_inputs.push(format!("[{}]", label));
    }

    let mix_filter = format!(
        "{}amix=inputs={}:duration=longest",
        mix_inputs.join(""),
        tracks.len()
    );
    filters.push(mix_filter);

    let filter_complex = filters.join(";");
    args.extend(["-filter_complex".into(), filter_complex]);
    args.extend(["-c:a".into(), "aac".into(), "-b:a".into(), "192k".into()]);
    args.push(output_path.clone());

    let output = run_ffmpeg_binary(&app, "ffmpeg", &args).await?;

    if output.success {
        Ok(output_path)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Encode frames + audio into a video file.
#[command]
pub async fn encode_video(
    app: tauri::AppHandle,
    frames_dir: String,
    audio_path: Option<String>,
    output_path: String,
    fps: u32,
    codec: String,
    quality: String,
) -> Result<String, String> {
    let mut args: Vec<String> = vec![
        "-y".into(),
        "-framerate".into(),
        fps.to_string(),
        "-i".into(),
        format!("{}/frame-%05d.png", frames_dir),
    ];

    if let Some(audio) = audio_path {
        args.extend(["-i".into(), audio]);
    }

    let crf = match quality.as_str() {
        "draft" => "28",
        "high" => "18",
        _ => "23",
    };

    match codec.as_str() {
        "vp9" => {
            args.extend([
                "-c:v".into(), "libvpx-vp9".into(),
                "-crf".into(), crf.into(),
                "-b:v".into(), "0".into(),
                "-pix_fmt".into(), "yuv420p".into(),
            ]);
        }
        _ => {
            args.extend([
                "-c:v".into(), "libx264".into(),
                "-preset".into(), "medium".into(),
                "-crf".into(), crf.into(),
                "-pix_fmt".into(), "yuv420p".into(),
            ]);
        }
    }

    args.extend(["-c:a".into(), "aac".into(), "-shortest".into()]);
    args.push(output_path.clone());

    let output = run_ffmpeg_binary(&app, "ffmpeg", &args).await?;

    if output.success {
        Ok(output_path)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Get audio duration in milliseconds.
#[command]
pub async fn get_audio_duration(
    app: tauri::AppHandle,
    audio_path: String,
) -> Result<f64, String> {
    let args: Vec<String> = vec![
        "-v".into(), "quiet".into(),
        "-show_entries".into(), "format=duration".into(),
        "-of".into(), "csv=p=0".into(),
        audio_path,
    ];

    let output = run_ffmpeg_binary(&app, "ffprobe", &args).await?;

    if !output.success {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let duration_secs: f64 = stdout
        .trim()
        .parse()
        .map_err(|_| format!("Could not parse duration: {}", stdout))?;

    Ok(duration_secs * 1000.0)
}
