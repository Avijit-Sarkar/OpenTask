import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ActiveTab, ProcessInfo, SystemStats } from './types';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { ProcessList } from './components/ProcessList';
import { PerformanceView } from './components/PerformanceView';
import { DetailsView } from './components/DetailsView';
import { ContextMenu, type ProcessActionType } from './components/ContextMenu';
import { ConfirmModal } from './components/ConfirmModal';

export function App() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('processes');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Context menu and modal states
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; process: ProcessInfo } | null>(null);
  const [confirmKillProc, setConfirmKillProc] = useState<ProcessInfo | null>(null);

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Check if Tauri invoke is available
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const data = await invoke<SystemStats>('get_system_stats');
        setStats(data);
      } else {
        // Fallback / Web Mock mode for standard browser testing
        const mockProcesses: ProcessInfo[] = [
          { pid: 3821, name: 'firefox', cpu_usage: 8.2, memory: 1400000000, status: 'Running', cmdline: ['/usr/lib/firefox/firefox'], disk_read_bytes: 1048576, disk_written_bytes: 524288 },
          { pid: 4512, name: 'code', cpu_usage: 6.4, memory: 1100000000, status: 'Running', cmdline: ['/usr/share/code/code', '--unity-launch'], disk_read_bytes: 2097152, disk_written_bytes: 1048576 },
          { pid: 5121, name: 'ollama', cpu_usage: 3.1, memory: 3800000000, status: 'Running', cmdline: ['ollama', 'serve'], disk_read_bytes: 524288, disk_written_bytes: 262144 },
          { pid: 1022, name: 'docker', cpu_usage: 1.8, memory: 420000000, status: 'Sleeping', cmdline: ['dockerd', '-H', 'fd://'], disk_read_bytes: 131072, disk_written_bytes: 65536 },
          { pid: 1842, name: 'gnome-shell', cpu_usage: 4.5, memory: 350000000, status: 'Running', cmdline: ['/usr/bin/gnome-shell'], disk_read_bytes: 409600, disk_written_bytes: 204800 },
          { pid: 2150, name: 'pulseaudio', cpu_usage: 0.8, memory: 45000000, status: 'Sleeping', cmdline: ['/usr/bin/pulseaudio', '--daemonize=no'], disk_read_bytes: 81920, disk_written_bytes: 40960 },
          { pid: 6420, name: 'systemd', cpu_usage: 0.1, memory: 18000000, status: 'Sleeping', cmdline: ['/sbin/init'], disk_read_bytes: 4096, disk_written_bytes: 2048 },
        ];

        setStats({
          total_memory: 16000000000,
          used_memory: 7800000000,
          free_memory: 8200000000,
          global_cpu_usage: 12.4,
          per_cpu_usage: [18.2, 8.4, 22.1, 6.0, 14.3, 9.8, 5.2, 11.7],
          cpu_count: 8,
          total_disk_space: 512000000000,
          used_disk_space: 210000000000,
          disk_read_bytes: 4194304,
          disk_written_bytes: 1887436,
          network_rx_bytes: 15420000,
          network_tx_bytes: 8310000,
          processes: mockProcesses,
          process_count: mockProcesses.length,
          uptime_seconds: 142800,
        });
      }
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    if (refreshInterval <= 0) return;

    const timer = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [fetchStats, refreshInterval]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleSendSignal = async (process: ProcessInfo, signal: string) => {
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const msg = await invoke<string>('send_process_signal', { pid: process.pid, signal });
        showToast(msg, 'success');
      } else {
        // Web fallback simulation
        if (signal === 'term' || signal === 'kill') {
          setStats((prev) => {
            if (!prev) return null;
            const updated = prev.processes.filter((p) => p.pid !== process.pid);
            return { ...prev, processes: updated, process_count: updated.length };
          });
          showToast(`[Mock] Process "${process.name}" (PID ${process.pid}) ${signal === 'kill' ? 'force killed (SIGKILL)' : 'terminated (SIGTERM)'}.`, 'success');
        } else if (signal === 'stop') {
          showToast(`[Mock] Process "${process.name}" (PID ${process.pid}) suspended (SIGSTOP).`, 'success');
        } else if (signal === 'continue') {
          showToast(`[Mock] Process "${process.name}" (PID ${process.pid}) resumed (SIGCONT).`, 'success');
        }
      }
      if (signal === 'term' || signal === 'kill') {
        setSelectedPid(null);
      }
      fetchStats();
    } catch (err: any) {
      showToast(`Error signaling PID ${process.pid}: ${err.toString()}`, 'error');
    }
  };

  const handleRestartProcess = async (process: ProcessInfo) => {
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const msg = await invoke<string>('restart_process', { pid: process.pid });
        showToast(msg, 'success');
      } else {
        showToast(`[Mock] Process "${process.name}" (PID ${process.pid}) restarted.`, 'success');
      }
      fetchStats();
    } catch (err: any) {
      showToast(`Error restarting PID ${process.pid}: ${err.toString()}`, 'error');
    }
  };

  const handleKillProcess = (pid: number, name: string) => {
    const proc = stats?.processes.find(p => p.pid === pid) || { pid, name, cpu_usage: 0, memory: 0, status: 'Running', cmdline: [], disk_read_bytes: 0, disk_written_bytes: 0 };
    // Default footer action is graceful End Process (SIGTERM)
    handleSendSignal(proc, 'term');
  };

  const handleProcessAction = (process: ProcessInfo, action: ProcessActionType) => {
    switch (action) {
      case 'end':
        handleSendSignal(process, 'term');
        break;
      case 'kill':
        setConfirmKillProc(process);
        break;
      case 'suspend':
        handleSendSignal(process, 'stop');
        break;
      case 'resume':
        handleSendSignal(process, 'continue');
        break;
      case 'restart':
        handleRestartProcess(process);
        break;
      case 'details':
        setSelectedPid(process.pid);
        setActiveTab('details');
        break;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, process: ProcessInfo) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      process,
    });
  };

  const filteredProcesses = (stats?.processes || []).filter((p) => {
    const search = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(search) || p.pid.toString().includes(search);
  });

  return (
    <div className="app-container">
      <Header
        stats={stats}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={setRefreshInterval}
        onManualRefresh={fetchStats}
        isRefreshing={isRefreshing}
      />

      {notification && (
        <div className={`toast ${notification.type}`}>
          <span>{notification.message}</span>
          <button className="toast-close" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      <div className="main-body">
        <SidebarNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          processCount={stats?.process_count || 0}
        />

        <main className="content-area">
          {activeTab === 'processes' && (
            <ProcessList
              processes={filteredProcesses}
              totalMemory={stats?.total_memory || 1}
              onKillProcess={handleKillProcess}
              selectedPid={selectedPid}
              onSelectProcess={setSelectedPid}
              onContextMenu={handleContextMenu}
            />
          )}

          {activeTab === 'performance' && <PerformanceView stats={stats} />}

          {activeTab === 'details' && (
            <DetailsView
              processes={filteredProcesses}
              onKillProcess={handleKillProcess}
              selectedPid={selectedPid}
              onSelectProcess={setSelectedPid}
              onContextMenu={handleContextMenu}
            />
          )}
        </main>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          process={contextMenu.process}
          onClose={() => setContextMenu(null)}
          onAction={handleProcessAction}
        />
      )}

      {confirmKillProc && (
        <ConfirmModal
          process={confirmKillProc}
          onConfirm={() => {
            handleSendSignal(confirmKillProc, 'kill');
            setConfirmKillProc(null);
          }}
          onCancel={() => setConfirmKillProc(null)}
        />
      )}
    </div>
  );
}

export default App;
