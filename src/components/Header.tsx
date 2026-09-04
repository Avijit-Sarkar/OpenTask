import React from 'react';
import { Search, RefreshCw, Settings, Cpu, MemoryStick, HardDrive, Layers } from 'lucide-react';
import type { SystemStats } from '../types';
import { formatBytes, formatCpu } from '../utils/formatters';
import { Dropdown } from './Dropdown';

interface HeaderProps {
  stats: SystemStats | null;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  refreshInterval: number;
  onRefreshIntervalChange: (n: number) => void;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}

function cpuColor(pct: number) {
  if (pct >= 80) return 'var(--red)';
  if (pct >= 50) return 'var(--amber)';
  return 'var(--blue)';
}

function ramColor(pct: number) {
  if (pct >= 85) return 'var(--red)';
  if (pct >= 65) return 'var(--amber)';
  return 'var(--green)';
}

export const Header: React.FC<HeaderProps> = ({
  stats, searchTerm, onSearchChange, refreshInterval,
  onRefreshIntervalChange, onManualRefresh, isRefreshing,
}) => {
  const ramPct = stats && stats.total_memory > 0
    ? (stats.used_memory / stats.total_memory) * 100 : 0;
  const cpuPct = stats?.global_cpu_usage ?? 0;

  return (
    <header className="app-header">
      {/* Brand */}
      <div className="brand-section">
        <div className="brand-icon" style={{ width: 32, height: 32, padding: 0, overflow: 'hidden', background: 'transparent', border: 'none' }}>
          <img src="/app-icon.png" alt="OpenTask" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span className="brand-name" style={{ fontSize: '15px' }}>OpenTask</span>
          <span className="brand-version">v0.1</span>
        </div>
      </div>

      {/* Metric chips */}
      <div className="header-metrics">
        {stats ? (
          <>
            <div className="metric-chip" title={`${cpuPct.toFixed(1)}% across ${stats.cpu_count} cores`}>
              <Cpu size={16} className="metric-chip-icon" color={cpuColor(cpuPct)} />
              <span className="metric-chip-label">CPU</span>
              <span className="metric-chip-value" style={{ color: cpuColor(cpuPct) }}>
                {formatCpu(cpuPct)}
              </span>
              <div className="metric-chip-bar">
                <div className="metric-chip-bar-fill" style={{
                  width: `${Math.min(cpuPct, 100)}%`,
                  background: cpuColor(cpuPct),
                }} />
              </div>
            </div>

            <div className="metric-chip" title={`${formatBytes(stats.used_memory)} / ${formatBytes(stats.total_memory)}`}>
              <MemoryStick size={16} className="metric-chip-icon" color={ramColor(ramPct)} />
              <span className="metric-chip-label">RAM</span>
              <span className="metric-chip-value" style={{ color: ramColor(ramPct) }}>
                {formatBytes(stats.used_memory)}
              </span>
              <div className="metric-chip-bar">
                <div className="metric-chip-bar-fill" style={{
                  width: `${Math.min(ramPct, 100)}%`,
                  background: ramColor(ramPct),
                }} />
              </div>
            </div>

            <div className="metric-chip" title="Disk used / total">
              <HardDrive size={16} className="metric-chip-icon" color="var(--amber)" />
              <span className="metric-chip-label">Disk</span>
              <span className="metric-chip-value" style={{ color: 'var(--amber)' }}>
                {stats.total_disk_space > 0
                  ? `${((stats.used_disk_space / stats.total_disk_space) * 100).toFixed(0)}%`
                  : '—'}
              </span>
            </div>

            <div className="metric-chip" title="Processes running">
              <Layers size={16} className="metric-chip-icon" color="var(--purple)" />
              <span className="metric-chip-label">Procs</span>
              <span className="metric-chip-value" style={{ color: 'var(--purple)', fontVariantNumeric: 'tabular-nums' }}>
                {stats.process_count}
              </span>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-lo)', fontSize: 12 }}>Connecting…</div>
        )}
      </div>

      {/* Controls */}
      <div className="header-controls">
        <div className="search-wrap">
          <Search size={15} className="search-icon-pos" />
          <input
            id="process-search"
            type="text"
            className="search-input"
            placeholder="Search PID or process…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <Dropdown
          id="refresh-rate"
          value={refreshInterval}
          onChange={onRefreshIntervalChange}
          title="Auto-refresh rate"
          options={[
            { value: 1000, label: 'Every 1s' },
            { value: 2000, label: 'Every 2s' },
            { value: 3000, label: 'Every 3s' },
            { value: 5000, label: 'Every 5s' },
            { value: 0, label: 'Paused' },
          ]}
        />

        <button
          id="manual-refresh"
          className={`icon-btn${isRefreshing ? ' spinning' : ''}`}
          onClick={onManualRefresh}
          title="Refresh now"
        >
          <RefreshCw size={14} />
        </button>

        <button className="icon-btn" title="Settings">
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
};
