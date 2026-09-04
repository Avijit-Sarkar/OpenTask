export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_usage: number;
  memory: number; // bytes
  status: string;
  cmdline: string[];
  disk_read_bytes: number;
  disk_written_bytes: number;
}

export interface SystemStats {
  total_memory: number;
  used_memory: number;
  free_memory: number;
  global_cpu_usage: number;
  per_cpu_usage: number[];
  cpu_count: number;
  total_disk_space: number;
  used_disk_space: number;
  disk_read_bytes: number;
  disk_written_bytes: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
  processes: ProcessInfo[];
  process_count: number;
  uptime_seconds: number;
}

export type ActiveTab = 'processes' | 'performance' | 'details';

export type SortField = 'name' | 'pid' | 'cpu_usage' | 'memory' | 'status';
export type SortOrder = 'asc' | 'desc';
