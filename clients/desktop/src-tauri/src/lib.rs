use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;
use walkdir::{DirEntry, WalkDir};

const BRIDGE_VERSION: &str = "0.7.0";
const MAX_TEXT_FILE_BYTES: u64 = 2 * 1024 * 1024;
const MAX_SCAN_FILES: usize = 5_000;

#[derive(Default)]
struct BridgeState {
    workspace: Mutex<Option<PathBuf>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BridgeInfo {
    bridge_version: &'static str,
    device_id: String,
    platform: &'static str,
    connected: bool,
    workspace_name: Option<String>,
    capabilities: Vec<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSelection {
    name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEntry {
    path: String,
    size: u64,
    modified_at_ms: u64,
    sha256: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceScan {
    workspace_name: String,
    files: Vec<FileEntry>,
    checkpoint_sha256: String,
    truncated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileRead {
    path: String,
    content: String,
    sha256: String,
    size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileWrite {
    path: String,
    sha256: String,
    size: u64,
    backup_path: Option<String>,
}

fn app_url() -> String {
    std::env::var("ZIEPHER_APP_URL")
        .unwrap_or_else(|_| "https://app.ziepher.ai".to_string())
}

fn platform_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unknown"
    }
}

fn sha256_bytes(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn persistent_device_id(app: &AppHandle) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve bridge data directory: {error}"))?;
    fs::create_dir_all(&data_dir)
        .map_err(|error| format!("Unable to create bridge data directory: {error}"))?;
    let path = data_dir.join("bridge-device-id");
    if let Ok(value) = fs::read_to_string(&path) {
        let trimmed = value.trim();
        if trimmed.len() >= 8 {
            return Ok(trimmed.to_string());
        }
    }
    let value = format!("desktop-{}", Uuid::new_v4());
    fs::write(&path, &value)
        .map_err(|error| format!("Unable to persist bridge device id: {error}"))?;
    Ok(value)
}

fn selected_root(state: &State<'_, BridgeState>) -> Result<PathBuf, String> {
    state
        .workspace
        .lock()
        .map_err(|_| "Desktop bridge state is unavailable.".to_string())?
        .clone()
        .ok_or_else(|| "Choose a project folder in Ziepher before accessing local files.".to_string())
}

fn safe_relative_path(value: &str) -> Result<PathBuf, String> {
    if value.is_empty() || value.len() > 1_000 {
        return Err("Invalid project-relative file path.".to_string());
    }
    let path = Path::new(value);
    if path.is_absolute()
        || path.components().any(|component| {
            matches!(
                component,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err("Only project-relative paths are allowed.".to_string());
    }
    Ok(path.to_path_buf())
}

fn checked_existing_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = safe_relative_path(relative)?;
    let candidate = root.join(relative);
    let metadata = fs::symlink_metadata(&candidate)
        .map_err(|_| "Project file was not found.".to_string())?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("Symlinks and non-file paths are not available to the bridge.".to_string());
    }
    let canonical = fs::canonicalize(&candidate)
        .map_err(|error| format!("Unable to resolve project file: {error}"))?;
    if !canonical.starts_with(root) {
        return Err("Project file resolves outside the approved folder.".to_string());
    }
    Ok(canonical)
}

fn checked_write_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = safe_relative_path(relative)?;
    let candidate = root.join(&relative);
    let mut ancestor = candidate.parent().unwrap_or(root);
    while !ancestor.exists() {
        ancestor = ancestor
            .parent()
            .ok_or_else(|| "Unable to resolve the project file parent.".to_string())?;
    }
    let canonical_ancestor = fs::canonicalize(ancestor)
        .map_err(|error| format!("Unable to resolve project file parent: {error}"))?;
    if !canonical_ancestor.starts_with(root) {
        return Err("Project file parent resolves outside the approved folder.".to_string());
    }
    if candidate.exists() {
        let metadata = fs::symlink_metadata(&candidate)
            .map_err(|error| format!("Unable to inspect project file: {error}"))?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Symlinks and non-file paths cannot be overwritten.".to_string());
        }
    }
    Ok(candidate)
}

fn ignored_entry(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return false;
    }
    matches!(
        entry.file_name().to_string_lossy().as_ref(),
        ".git" | ".next" | ".ziepher" | "node_modules" | "dist" | "build" | "coverage"
    )
}

#[tauri::command]
fn bridge_info(app: AppHandle, state: State<'_, BridgeState>) -> Result<BridgeInfo, String> {
    let workspace = state
        .workspace
        .lock()
        .map_err(|_| "Desktop bridge state is unavailable.".to_string())?
        .clone();
    Ok(BridgeInfo {
        bridge_version: BRIDGE_VERSION,
        device_id: persistent_device_id(&app)?,
        platform: platform_name(),
        connected: workspace.is_some(),
        workspace_name: workspace.and_then(|path| {
            path.file_name().map(|name| name.to_string_lossy().to_string())
        }),
        capabilities: vec![
            "folder-picker",
            "workspace-scan",
            "text-read",
            "guarded-text-write",
            "recoverable-backup",
            "checkpoint-hash",
        ],
    })
}

#[tauri::command]
async fn bridge_choose_workspace(
    app: AppHandle,
    state: State<'_, BridgeState>,
) -> Result<Option<WorkspaceSelection>, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("Choose the Ziepher project folder")
        .blocking_pick_folder();
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = selected
        .into_path()
        .map_err(|error| format!("Unable to use the selected folder: {error}"))?;
    let canonical = fs::canonicalize(&path)
        .map_err(|error| format!("Unable to resolve the selected folder: {error}"))?;
    if !canonical.is_dir() {
        return Err("The selected workspace is not a folder.".to_string());
    }
    let name = canonical
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| "Ziepher project".to_string());
    *state
        .workspace
        .lock()
        .map_err(|_| "Desktop bridge state is unavailable.".to_string())? =
        Some(canonical.clone());
    Ok(Some(WorkspaceSelection {
        name,
    }))
}

#[tauri::command]
fn bridge_disconnect(state: State<'_, BridgeState>) -> Result<(), String> {
    *state
        .workspace
        .lock()
        .map_err(|_| "Desktop bridge state is unavailable.".to_string())? = None;
    Ok(())
}

#[tauri::command]
fn bridge_scan_workspace(state: State<'_, BridgeState>) -> Result<WorkspaceScan, String> {
    let root = selected_root(&state)?;
    let workspace_name = root
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| "Ziepher project".to_string());
    let mut files = Vec::new();
    let mut truncated = false;

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| !ignored_entry(entry))
    {
        let entry = entry.map_err(|error| format!("Unable to scan project folder: {error}"))?;
        if !entry.file_type().is_file() {
            continue;
        }
        if files.len() >= MAX_SCAN_FILES {
            truncated = true;
            break;
        }
        let metadata = entry
            .metadata()
            .map_err(|error| format!("Unable to read project file metadata: {error}"))?;
        let relative = entry
            .path()
            .strip_prefix(&root)
            .map_err(|_| "A scanned file escaped the project folder.".to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        let sha256 = if metadata.len() <= MAX_TEXT_FILE_BYTES {
            Some(sha256_bytes(
                &fs::read(entry.path())
                    .map_err(|error| format!("Unable to hash project file: {error}"))?,
            ))
        } else {
            None
        };
        let modified_at_ms = metadata
            .modified()
            .unwrap_or(UNIX_EPOCH)
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
            .min(u64::MAX as u128) as u64;
        files.push(FileEntry {
            path: relative,
            size: metadata.len(),
            modified_at_ms,
            sha256,
        });
    }

    files.sort_by(|left, right| left.path.cmp(&right.path));
    let mut checkpoint = Sha256::new();
    for file in &files {
        checkpoint.update(file.path.as_bytes());
        checkpoint.update(file.size.to_le_bytes());
        if let Some(hash) = &file.sha256 {
            checkpoint.update(hash.as_bytes());
        }
    }

    Ok(WorkspaceScan {
        workspace_name,
        files,
        checkpoint_sha256: format!("{:x}", checkpoint.finalize()),
        truncated,
    })
}

#[tauri::command]
fn bridge_read_file(
    relative_path: String,
    state: State<'_, BridgeState>,
) -> Result<FileRead, String> {
    let root = selected_root(&state)?;
    let path = checked_existing_path(&root, &relative_path)?;
    let metadata = fs::metadata(&path)
        .map_err(|error| format!("Unable to inspect project file: {error}"))?;
    if metadata.len() > MAX_TEXT_FILE_BYTES {
        return Err("The bridge only reads text files up to 2 MiB.".to_string());
    }
    let bytes = fs::read(&path)
        .map_err(|error| format!("Unable to read project file: {error}"))?;
    let content = String::from_utf8(bytes.clone())
        .map_err(|_| "The selected project file is not UTF-8 text.".to_string())?;
    Ok(FileRead {
        path: relative_path,
        content,
        sha256: sha256_bytes(&bytes),
        size: metadata.len(),
    })
}

#[tauri::command]
fn bridge_write_file(
    relative_path: String,
    content: String,
    expected_sha256: Option<String>,
    state: State<'_, BridgeState>,
) -> Result<FileWrite, String> {
    if content.len() as u64 > MAX_TEXT_FILE_BYTES {
        return Err("The bridge only writes text files up to 2 MiB.".to_string());
    }
    let root = selected_root(&state)?;
    let path = checked_write_path(&root, &relative_path)?;
    let mut backup_path = None;

    if path.exists() {
        let current = fs::read(&path)
            .map_err(|error| format!("Unable to verify existing project file: {error}"))?;
        let current_hash = sha256_bytes(&current);
        match expected_sha256.as_deref() {
            Some(expected) if expected == current_hash => {}
            Some(_) => {
                return Err(
                    "LOCAL_FILE_CONFLICT: the file changed after Ziepher read it.".to_string(),
                )
            }
            None => {
                return Err(
                    "An expected SHA-256 is required before overwriting an existing file."
                        .to_string(),
                )
            }
        }

        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        let backup = root
            .join(".ziepher")
            .join("backups")
            .join(stamp.to_string())
            .join(safe_relative_path(&relative_path)?);
        if let Some(parent) = backup.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Unable to create recovery backup: {error}"))?;
        }
        fs::copy(&path, &backup)
            .map_err(|error| format!("Unable to create recovery backup: {error}"))?;
        backup_path = Some(
            backup
                .strip_prefix(&root)
                .unwrap_or(&backup)
                .to_string_lossy()
                .replace('\\', "/"),
        );
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Unable to create project file directory: {error}"))?;
    }
    fs::write(&path, content.as_bytes())
        .map_err(|error| format!("Unable to write project file: {error}"))?;

    Ok(FileWrite {
        path: relative_path,
        sha256: sha256_bytes(content.as_bytes()),
        size: content.len() as u64,
        backup_path,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BridgeState::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            bridge_info,
            bridge_choose_workspace,
            bridge_disconnect,
            bridge_scan_workspace,
            bridge_read_file,
            bridge_write_file
        ])
        .setup(|app| {
            let parsed = url::Url::parse(&app_url())
                .map_err(Box::<dyn std::error::Error>::from)?;

            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
                .title("Ziepher AI — Build Your Dreams")
                .inner_size(1440.0, 920.0)
                .min_inner_size(980.0, 680.0)
                .resizable(true)
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Ziepher AI");
}
