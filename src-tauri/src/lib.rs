mod ffmpeg;
mod transcribe;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    Emitter, Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Clear previous session logs before the log plugin opens file handles.
    // Tauri log plugin writes to $XDG_DATA_HOME/com.lumvas.app/logs/ on Linux.
    if let Ok(home) = std::env::var("HOME") {
        let log_dir = std::path::PathBuf::from(home)
            .join(".local/share/com.lumvas.app/logs");
        if log_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&log_dir) {
                for entry in entries.flatten() {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(ffmpeg::VideoEncoderState::new())
        .invoke_handler(tauri::generate_handler![
            ffmpeg::mix_audio,
            ffmpeg::encode_video,
            ffmpeg::get_audio_duration,
            ffmpeg::get_video_info,
            ffmpeg::decode_video_frame,
            ffmpeg::extract_video_frames,
            ffmpeg::start_video_pipe,
            ffmpeg::write_raw_frame,
            ffmpeg::finish_video_pipe,
            transcribe::transcribe_audio,
        ])
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Debug)
                .max_file_size(10_000_000) // 10 MB per log file
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .build(),
        )
        .setup(|app| {
            log::info!("═══ Lumvas session started ═══");


            // ── App menu (macOS only, first submenu) ──
            let app_menu = SubmenuBuilder::new(app, "Lumvas")
                .about(None)
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            // ── File ──
            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&MenuItemBuilder::new("New")
                    .id("new").accelerator("CmdOrCtrl+N").build(app)?)
                .item(&MenuItemBuilder::new("Open…")
                    .id("open").accelerator("CmdOrCtrl+O").build(app)?)
                .separator()
                .item(&MenuItemBuilder::new("Save")
                    .id("save").accelerator("CmdOrCtrl+S").build(app)?)
                .item(&MenuItemBuilder::new("Save As…")
                    .id("save_as").accelerator("CmdOrCtrl+Shift+S").build(app)?)
                .separator()
                .item(&MenuItemBuilder::new("Export Slides to Folder…")
                    .id("export_slides").accelerator("CmdOrCtrl+E").build(app)?)
                .item(&MenuItemBuilder::new("Export Merged Horizontal…")
                    .id("export_merge_h").build(app)?)
                .item(&MenuItemBuilder::new("Export Merged Vertical…")
                    .id("export_merge_v").build(app)?)
                .separator()
                .item(&MenuItemBuilder::new("Export Video…")
                    .id("export_video").accelerator("CmdOrCtrl+Shift+E").build(app)?)
                .separator()
                .close_window()
                .build()?;

            // ── Edit ──
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            // ── View ──
            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&MenuItemBuilder::new("Zoom In")
                    .id("zoom_in").accelerator("CmdOrCtrl+=").build(app)?)
                .item(&MenuItemBuilder::new("Zoom Out")
                    .id("zoom_out").accelerator("CmdOrCtrl+-").build(app)?)
                .item(&MenuItemBuilder::new("Reset Zoom")
                    .id("zoom_reset").accelerator("CmdOrCtrl+0").build(app)?)
                .separator()
                .item(&MenuItemBuilder::new("Single Slide")
                    .id("view_single").accelerator("CmdOrCtrl+1").build(app)?)
                .item(&MenuItemBuilder::new("Horizontal")
                    .id("view_horizontal").accelerator("CmdOrCtrl+2").build(app)?)
                .item(&MenuItemBuilder::new("Vertical")
                    .id("view_vertical").accelerator("CmdOrCtrl+3").build(app)?)
                .separator()
                .item(&MenuItemBuilder::new("Toggle Fullscreen")
                    .id("fullscreen").accelerator("F11").build(app)?)
                .build()?;

            // ── Window ──
            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .maximize()
                .separator()
                .close_window()
                .build()?;

            // ── Help ──
            let help_menu = SubmenuBuilder::new(app, "Help")
                .item(&MenuItemBuilder::new("About Lumvas")
                    .id("about").build(app)?)
                .build()?;

            let menu = MenuBuilder::new(app)
                .items(&[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu, &help_menu])
                .build()?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                let id = event.id().as_ref();
                match id {
                    // File actions → emit to frontend
                    "new" | "open" | "save" | "save_as"
                    | "export_slides" | "export_merge_h" | "export_merge_v"
                    | "export_video" => {
                        let _ = app_handle.emit(&format!("menu:{}", id), ());
                    }
                    // View zoom → emit to frontend
                    "zoom_in" | "zoom_out" | "zoom_reset" => {
                        let _ = app_handle.emit(&format!("menu:{}", id), ());
                    }
                    // View mode → emit to frontend
                    "view_single" | "view_horizontal" | "view_vertical" => {
                        let _ = app_handle.emit(&format!("menu:{}", id), ());
                    }
                    // Fullscreen toggle
                    "fullscreen" => {
                        if let Some(w) = app_handle.get_webview_window("main") {
                            let is_fs = w.is_fullscreen().unwrap_or(false);
                            let _ = w.set_fullscreen(!is_fs);
                        }
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
