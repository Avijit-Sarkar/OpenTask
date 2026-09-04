import React, { useState, useEffect } from 'react';
import type { SystemStats } from '../types';
import { formatBytes, formatCpu, formatUptime } from '../utils/formatters';
import { Cpu, HardDrive, Network, Clock, Activity, ArrowDown, ArrowUp } from 'lucide-react';

interface PerformanceViewProps {
  stats: SystemStats | null;
}

const HISTORY_LEN = 60;

function cpuGaugeColor(pct: number) {
  if (pct >= 80) return 'var(--red)';
  if (pct >= 50) return 'var(--amber)';
  return 'var(--blue)';
}

function ramGaugeColor(pct: number) {
  if (pct >= 85) return 'var(--red)';
  if (pct >= 65) return 'var(--amber)';
  return 'var(--green)';
}

function coreColor(pct: number) {
  if (pct >= 80) return 'var(--red)';
  if (pct >= 50) return 'var(--amber)';
  return 'var(--blue)';
}

function buildSparklinePath(data: number[], w = 300, h = 56): string {
  if (data.length < 2) return '';
  const dataMin = Math.min(...data);
  const dataMax = Math.max(...data);
  // Auto-scale: even tiny fluctuations (e.g. 68.1%→68.4%) become visible curves
  const range = Math.max(dataMax - dataMin, 0.5); // at least 0.5 unit range
  const pad   = range * 0.25;
  const lo    = Math.max(0,   dataMin - pad);
  const hi    = Math.min(100, dataMax + pad);
  const span  = hi - lo || 1;

  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((Math.min(v, 100) - lo) / span) * (h - 4);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildSparklineArea(data: number[], w = 300, h = 56): string {
  if (data.length < 2) return '';
  const linePath = buildSparklinePath(data, w, h);
  return `${linePath} L${w},${h} L0,${h} Z`;
}

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) return <div style={{ height: 64 }} />;
  const linePath = buildSparklinePath(data, 300, 56);
  const areaPath = buildSparklineArea(data, 300, 56);
  const id = `grad-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg className="sparkline-svg" viewBox="0 0 300 56" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${id})`} />
      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const PerformanceView: React.FC<PerformanceViewProps> = ({ stats }) => {
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [ramHistory, setRamHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!stats) return;
    setCpuHistory(prev => [...prev.slice(-(HISTORY_LEN - 1)), stats.global_cpu_usage]);
    const rp = stats.total_memory > 0 ? (stats.used_memory / stats.total_memory) * 100 : 0;
    setRamHistory(prev => [...prev.slice(-(HISTORY_LEN - 1)), rp]);
  }, [stats]);

  if (!stats) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-lo)', gap: 10 }}>
        <Activity size={18} style={{ opacity: 0.5 }} />
        <span>Loading metrics…</span>
      </div>
    );
  }

  const ramPct   = stats.total_memory > 0 ? (stats.used_memory / stats.total_memory) * 100 : 0;
  const diskPct  = stats.total_disk_space > 0 ? (stats.used_disk_space / stats.total_disk_space) * 100 : 0;
  const cpuC     = cpuGaugeColor(stats.global_cpu_usage);
  const ramC     = ramGaugeColor(ramPct);

  return (
    <div className="performance-grid">

      {/* ── CPU ────────────────────────────────── */}
      <div className="perf-card">
        <div className="perf-card-header">
          <div className="perf-card-title" style={{ color: cpuC }}>
            <Cpu size={18} />
            <span>CPU</span>
            <span style={{ fontSize: 11, color: 'var(--text-lo)', fontWeight: 400 }}>
              {stats.cpu_count} cores
            </span>
          </div>
          <span className="perf-card-value" style={{ color: cpuC }}>
            {formatCpu(stats.global_cpu_usage)}
          </span>
        </div>

        <div className="gauge-track">
          <div className="gauge-fill" style={{
            width: `${Math.min(stats.global_cpu_usage, 100)}%`,
            background: cpuC,
          }} />
        </div>

        <Sparkline data={cpuHistory} color={cpuC} />

        {/* Per-core bars */}
        {stats.per_cpu_usage && stats.per_cpu_usage.length > 0 && (
          <div className="cpu-cores-grid">
            {stats.per_cpu_usage.map((pct, i) => (
              <div className="cpu-core-bar" key={i} title={`Core ${i}: ${pct.toFixed(1)}%`}>
                <div className="cpu-core-track">
                  <div className="cpu-core-fill" style={{
                    height: `${Math.min(pct, 100)}%`,
                    background: coreColor(pct),
                  }} />
                </div>
                <span className="cpu-core-label">{i}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RAM ────────────────────────────────── */}
      <div className="perf-card">
        <div className="perf-card-header">
          <div className="perf-card-title" style={{ color: ramC }}>
            <Activity size={18} />
            <span>Memory</span>
          </div>
          <span className="perf-card-value" style={{ color: ramC }}>
            {ramPct.toFixed(1)}%
          </span>
        </div>

        <div className="gauge-track">
          <div className="gauge-fill" style={{
            width: `${Math.min(ramPct, 100)}%`,
            background: ramC,
          }} />
        </div>

        <Sparkline data={ramHistory} color={ramC} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="perf-row">
            <span className="perf-row-label">Used</span>
            <span className="perf-row-val">{formatBytes(stats.used_memory)}</span>
          </div>
          <div className="perf-row">
            <span className="perf-row-label">Free</span>
            <span className="perf-row-val">{formatBytes(stats.free_memory)}</span>
          </div>
          <div className="perf-row">
            <span className="perf-row-label">Total</span>
            <span className="perf-row-val">{formatBytes(stats.total_memory)}</span>
          </div>
        </div>
      </div>

      {/* ── Disk ───────────────────────────────── */}
      <div className="perf-card">
        <div className="perf-card-header">
          <div className="perf-card-title" style={{ color: 'var(--amber)' }}>
            <HardDrive size={18} />
            <span>Disk</span>
          </div>
          <span className="perf-card-value" style={{ color: 'var(--amber)' }}>
            {diskPct.toFixed(0)}%
          </span>
        </div>

        <div className="gauge-track">
          <div className="gauge-fill" style={{
            width: `${Math.min(diskPct, 100)}%`,
            background: `linear-gradient(90deg, var(--amber), var(--red))`,
          }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <div className="perf-row">
            <span className="perf-row-label">Used Space</span>
            <span className="perf-row-val">
              {formatBytes(stats.used_disk_space)} / {formatBytes(stats.total_disk_space)}
            </span>
          </div>
          <div className="perf-row">
            <span className="perf-row-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowDown size={11} style={{ color: 'var(--green)' }} /> Read
            </span>
            <span className="perf-row-val" style={{ color: 'var(--green)' }}>
              {formatBytes(stats.disk_read_bytes)}/s
            </span>
          </div>
          <div className="perf-row">
            <span className="perf-row-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowUp size={11} style={{ color: 'var(--amber)' }} /> Write
            </span>
            <span className="perf-row-val" style={{ color: 'var(--amber)' }}>
              {formatBytes(stats.disk_written_bytes)}/s
            </span>
          </div>
        </div>
      </div>

      {/* ── Network ────────────────────────────── */}
      <div className="perf-card">
        <div className="perf-card-header">
          <div className="perf-card-title" style={{ color: 'var(--purple)' }}>
            <Network size={18} />
            <span>Network</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-lo)', fontSize: 12 }}>
            <Clock size={13} />
            <span>{formatUptime(stats.uptime_seconds)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius)', border: '1px solid var(--border-dim)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowDown size={16} style={{ color: 'var(--green)' }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-lo)', marginBottom: 2 }}>Download</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)', fontSize: 15 }}>
                  {formatBytes(stats.network_rx_bytes)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-lo)', marginBottom: 2 }}>Upload</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--purple)', fontSize: 15 }}>
                  {formatBytes(stats.network_tx_bytes)}
                </div>
              </div>
              <ArrowUp size={16} style={{ color: 'var(--purple)' }} />
            </div>
          </div>

          <div className="perf-row">
            <span className="perf-row-label">System Uptime</span>
            <span className="perf-row-val">{formatUptime(stats.uptime_seconds)}</span>
          </div>
        </div>
      </div>

    </div>
  );
};
