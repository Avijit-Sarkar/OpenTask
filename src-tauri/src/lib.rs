use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, Disks, Networks, Pid, ProcessRefreshKind, RefreshKind, Signal, System};
use tauri::State;
use std::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory: u64, // in bytes
    pub status: String,
    pub cmdline: Vec<String>,
    pub disk_read_bytes: u64,
    pub disk_written_bytes: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SystemStats {
    pub total_memory: u64,
    pub used_memory: u64,
    pub free_memory: u64,
    pub global_cpu_usage: f32,
    pub per_cpu_usage: Vec<f32>,
    pub cpu_count: usize,
    pub total_disk_space: u64,
    pub used_disk_space: u64,
    pub disk_read_bytes: u64,
    pub disk_written_bytes: u64,
    pub network_rx_bytes: u64,
    pub network_tx_bytes: u64,
    pub processes: Vec<ProcessInfo>,
    pub process_count: usize,
    pub uptime_seconds: u64,
}

pub struct AppState {
    pub sys: Mutex<System>,
    pub disks: Mutex<Disks>,
    pub networks: Mutex<Networks>,
    pub tick: Mutex<u32>,
}

#[tauri::command]
fn get_system_stats(state: State<'_, AppState>) -> Result<SystemStats, String> {
    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    let mut tick = state.tick.lock().map_err(|e| e.to_string())?;
    *tick = tick.wrapping_add(1);
    let current_tick = *tick;
    drop(tick);

    // Refresh CPU + memory + processes every call
    sys.refresh_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_processes(
                ProcessRefreshKind::new()
                    .with_cpu()
                    .with_memory()
                    .with_disk_usage(),
            )
            .with_memory(MemoryRefreshKind::everything()),
    );

    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let free_memory = sys.free_memory();
    let global_cpu_usage = sys.global_cpu_info().cpu_usage();
    let per_cpu_usage: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();
    let cpu_count = per_cpu_usage.len();
    let uptime_seconds = System::uptime();

    // Refresh disks only every 5 ticks (avoid constant slow disk enumeration)
    let (total_disk_space, used_disk_space) = {
        let mut disks = state.disks.lock().map_err(|e| e.to_string())?;
        if current_tick % 5 == 1 {
            disks.refresh_list();
        }
        disks.refresh();
        let mut total = 0u64;
        let mut used = 0u64;
        for disk in disks.list() {
            total += disk.total_space();
            used += disk.total_space().saturating_sub(disk.available_space());
        }
        (total, used)
    };

    // Refresh network every call for live traffic data
    let (network_rx_bytes, network_tx_bytes) = {
        let mut networks = state.networks.lock().map_err(|e| e.to_string())?;
        networks.refresh();
        let mut rx = 0u64;
        let mut tx = 0u64;
        for (_, net) in networks.iter() {
            rx += net.received();
            tx += net.transmitted();
        }
        (rx, tx)
    };

    // Build process list - skip empty zombie entries
    let mut total_disk_read: u64 = 0;
    let mut total_disk_written: u64 = 0;

    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .filter(|(_, p)| p.memory() > 0 || p.cpu_usage() > 0.0)
        .map(|(pid, process)| {
            let disk = process.disk_usage();
            total_disk_read += disk.read_bytes;
            total_disk_written += disk.written_bytes;
            let cmdline: Vec<String> = process.cmd().iter()
                .map(|s| s.to_string())
                .collect();
            ProcessInfo {
                pid: pid.as_u32(),
                name: process.name().to_string(),
                cpu_usage: process.cpu_usage(),
                memory: process.memory(),
                status: format!("{:?}", process.status()),
                cmdline,
                disk_read_bytes: disk.read_bytes,
                disk_written_bytes: disk.written_bytes,
            }
        })
        .collect();

    // Sort by CPU descending (fast unstable sort)
    processes.sort_unstable_by(|a, b| {
        b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal)
    });

    let process_count = processes.len();

    Ok(SystemStats {
        total_memory,
        used_memory,
        free_memory,
        global_cpu_usage,
        per_cpu_usage,
        cpu_count,
        total_disk_space,
        used_disk_space,
        disk_read_bytes: total_disk_read,
        disk_written_bytes: total_disk_written,
        network_rx_bytes,
        network_tx_bytes,
        processes,
        process_count,
        uptime_seconds,
    })
}

#[tauri::command]
fn kill_process(state: State<'_, AppState>, pid: u32) -> Result<String, String> {
    send_process_signal(state, pid, "kill".to_string())
}

#[tauri::command]
fn send_process_signal(state: State<'_, AppState>, pid: u32, signal: String) -> Result<String, String> {
    let sys = state.sys.lock().map_err(|e| e.to_string())?;
    let sys_pid = Pid::from(pid as usize);
    if let Some(process) = sys.process(sys_pid) {
        let name = process.name().to_string();
        let sig = match signal.to_lowercase().as_str() {
            "term" | "end" => Signal::Term,
            "kill" | "force" => Signal::Kill,
            "stop" | "suspend" => Signal::Stop,
            "continue" | "resume" => Signal::Continue,
            _ => return Err(format!("Unknown signal type: {}", signal)),
        };

        let action_name = match sig {
            Signal::Term => "terminated (SIGTERM)",
            Signal::Kill => "force killed (SIGKILL)",
            Signal::Stop => "suspended (SIGSTOP)",
            Signal::Continue => "resumed (SIGCONT)",
            _ => "signaled",
        };

        if let Some(success) = process.kill_with(sig) {
            if success {
                Ok(format!("Process \"{}\" (PID {}) {}.", name, pid, action_name))
            } else {
                Err(format!("Failed to send signal to PID {}. Permission denied or process exited.", pid))
            }
        } else {
            Err(format!("Signal standard not supported for PID {}.", pid))
        }
    } else {
        Err(format!("Process PID {} not found.", pid))
    }
}

#[tauri::command]
fn restart_process(state: State<'_, AppState>, pid: u32) -> Result<String, String> {
    let (name, cmdline) = {
        let sys = state.sys.lock().map_err(|e| e.to_string())?;
        let sys_pid = Pid::from(pid as usize);
        if let Some(process) = sys.process(sys_pid) {
            let cmd: Vec<String> = process.cmd().iter().map(|s| s.to_string()).collect();
            (process.name().to_string(), cmd)
        } else {
            return Err(format!("Process PID {} not found.", pid));
        }
    };

    if cmdline.is_empty() {
        return Err(format!("Cannot restart process \"{}\" (PID {}): command line unavailable.", name, pid));
    }

    // Step 1: Send SIGTERM
    {
        let sys = state.sys.lock().map_err(|e| e.to_string())?;
        let sys_pid = Pid::from(pid as usize);
        if let Some(process) = sys.process(sys_pid) {
            process.kill_with(Signal::Term);
        }
    }

    // Step 2: Spawn new instance using extracted command line
    let executable = &cmdline[0];
    let args = &cmdline[1..];

    match Command::new(executable).args(args).spawn() {
        Ok(child) => Ok(format!("Restarted \"{}\" — new PID is {}.", name, child.id())),
        Err(e) => Err(format!("Sent termination signal to \"{}\", but failed to re-launch: {}", name, e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sys = System::new();
    let disks = Disks::new_with_refreshed_list();
    let networks = Networks::new_with_refreshed_list();

    tauri::Builder::default()
        .manage(AppState {
            sys: Mutex::new(sys),
            disks: Mutex::new(disks),
            networks: Mutex::new(networks),
            tick: Mutex::new(0),
        })
        .invoke_handler(tauri::generate_handler![get_system_stats, kill_process, send_process_signal, restart_process])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
