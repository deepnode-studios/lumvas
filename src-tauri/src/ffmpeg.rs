use serde::Deserialize;
use std::io::Write;
use std::process::{Child, ChildStdin, Stdio};
use std::sync::Mutex;
use tauri::{command, State};

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

/* ─── Streaming video encoder (raw RGBA → FFmpeg stdin pipe) ─── */

pub struct VideoEncoderState {
    stdin: Mutex<Option<ChildStdin>>,
    child: Mutex<Option<Child>>,
    raw_path: Mutex<Option<String>>,
}

impl VideoEncoderState {
    pub fn new() -> Self {
        Self {
            stdin: Mutex::new(None),
            child: Mutex::new(None),
            raw_path: Mutex::new(None),
        }
    }
}

/// Find a binary (ffmpeg / ffprobe) by checking common locations.
fn find_ffmpeg_binary(name: &str) -> Result<String, String> {
    // Try common absolute paths first
    for prefix in &["/usr/bin/", "/usr/local/bin/", "/opt/homebrew/bin/"] {
        let path = format!("{}{}", prefix, name);
        if std::path::Path::new(&path).exists() {
            return Ok(path);
        }
    }
    // Try `which`
    if let Ok(output) = std::process::Command::new("which")
        .arg(name)
        .env_clear()
        .env("PATH", std::env::var("PATH").unwrap_or_default())
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(path);
            }
        }
    }
    Err(format!("{} not found. Install it or provide a bundled binary.", name))
}

/// Start FFmpeg with raw RGBA video piped via stdin.
#[command]
pub fn start_video_pipe(
    state: State<'_, VideoEncoderState>,
    width: u32,
    height: u32,
    fps: u32,
    codec: String,
    quality: String,
    audio_path: Option<String>,
    output_path: String,
) -> Result<(), String> {
    let ffmpeg_bin = find_ffmpeg_binary("ffmpeg")?;

    let crf = match quality.as_str() {
        "draft" => "28",
        "high" => "18",
        _ => "23",
    };

    let size_str = format!("{}x{}", width, height);
    let fps_str = fps.to_string();

    let mut args: Vec<String> = vec![
        "-y".into(),
        "-f".into(), "rawvideo".into(),
        "-pix_fmt".into(), "rgba".into(),
        "-s".into(), size_str,
        "-r".into(), fps_str,
        "-i".into(), "pipe:0".into(),
    ];

    if let Some(ref audio) = audio_path {
        args.extend(["-i".into(), audio.clone()]);
    }

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
                "-preset".into(), "ultrafast".into(),
                "-crf".into(), crf.into(),
                "-pix_fmt".into(), "yuv420p".into(),
            ]);
        }
    }

    if audio_path.is_some() {
        args.extend(["-c:a".into(), "aac".into(), "-shortest".into()]);
    }
    args.push(output_path);

    let mut child = std::process::Command::new(&ffmpeg_bin)
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .env_clear()
        .env("PATH", std::env::var("PATH").unwrap_or_default())
        .env("HOME", std::env::var("HOME").unwrap_or_default())
        .spawn()
        .map_err(|e| format!("Failed to start ffmpeg ({}): {}", ffmpeg_bin, e))?;

    let stdin = child.stdin.take().ok_or("Failed to open ffmpeg stdin")?;

    *state.stdin.lock().unwrap() = Some(stdin);
    *state.child.lock().unwrap() = Some(child);
    Ok(())
}

/// Write a raw RGBA frame to FFmpeg's stdin using Tauri's raw binary IPC.
/// Accepts the frame pixel data directly in the request body — no temp files.
#[command]
pub fn write_raw_frame(
    request: tauri::ipc::Request<'_>,
    state: State<'_, VideoEncoderState>,
) -> Result<(), String> {
    let data = match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => bytes.clone(),
        tauri::ipc::InvokeBody::Json(val) => {
            // Fallback: if sent as JSON (shouldn't happen with rawBody)
            if let Some(path) = val.get("framePath").and_then(|v| v.as_str()) {
                std::fs::read(path)
                    .map_err(|e| format!("Failed to read frame file: {}", e))?
            } else {
                return Err("No frame data provided".into());
            }
        }
    };

    let mut guard = state.stdin.lock().unwrap();
    let stdin = guard.as_mut().ok_or("No video pipe active")?;
    stdin.write_all(&data).map_err(|e| format!("Failed to write to ffmpeg stdin: {}", e))?;
    Ok(())
}

/// Close the pipe and wait for FFmpeg to finish encoding.
#[command]
pub async fn finish_video_pipe(
    state: State<'_, VideoEncoderState>,
) -> Result<String, String> {
    // Close stdin to signal EOF
    {
        let mut guard = state.stdin.lock().unwrap();
        drop(guard.take());
    }

    let child = {
        let mut guard = state.child.lock().unwrap();
        guard.take()
    };

    if let Some(child) = child {
        let output = tauri::async_runtime::spawn_blocking(move || child.wait_with_output())
            .await
            .map_err(|e| e.to_string())?
            .map_err(|e| e.to_string())?;

        // Clean up raw frame file
        if let Some(path) = state.raw_path.lock().unwrap().take() {
            let _ = std::fs::remove_file(&path);
        }

        if output.status.success() {
            Ok("done".into())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    } else {
        Err("No video pipe active".into())
    }
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

    // Fallback to system binary — use env_clear() to avoid E2BIG
    // when the inherited environment is too large.
    let binary_name = binary.to_string();
    let binary_path = find_ffmpeg_binary(&binary_name)?;
    let binary_path_display = binary_path.clone();
    let args = args.to_vec();
    let args_debug = args.join(" ");
    let args_len: usize = args.iter().map(|a| a.len()).sum();
    let path_env = std::env::var("PATH").unwrap_or_default();
    let home_env = std::env::var("HOME").unwrap_or_default();
    let env_len = path_env.len() + home_env.len();
    log::info!(
        "run_ffmpeg_binary: bin={} args_count={} args_bytes={} env_bytes={} cmd: {} {}",
        binary_path_display, args.len(), args_len, env_len, binary_path_display, args_debug
    );
    let result = tauri::async_runtime::spawn_blocking(move || {
        std::process::Command::new(&binary_path)
            .args(&args)
            .env_clear()
            .env("PATH", &path_env)
            .env("HOME", &home_env)
            .output()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| format!(
        "Failed to run {} (at {}): {} [args_count={}, args_bytes={}, env_bytes={}]",
        binary_name, binary_path_display, e, args_debug.len(), args_len, env_len
    ))?;

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
