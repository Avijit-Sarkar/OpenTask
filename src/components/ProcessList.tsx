import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { ProcessInfo, SortField, SortOrder } from '../types';
import { formatBytes, formatCpu } from '../utils/formatters';
import { AlertCircle, XCircle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface ProcessListProps {
  processes: ProcessInfo[];
  totalMemory: number;
  onKillProcess: (pid: number, name: string) => void;
  selectedPid: number | null;
  onSelectProcess: (pid: number | null) => void;
  onContextMenu?: (e: React.MouseEvent, process: ProcessInfo) => void;
}

// ── Virtual list ──────────────────────────────────────────────────
const ROW_HEIGHT = 34;
const OVERSCAN   = 8;

function cpuBarClass(pct: number) {
  if (pct >= 50) return 'bar-fill bar-cpu heat-high';
  if (pct >= 20) return 'bar-fill bar-cpu heat-mid';
  return 'bar-fill bar-cpu';
}

function ramBarClass(pct: number) {
  if (pct >= 50) return 'bar-fill bar-ram heat-high';
  if (pct >= 25) return 'bar-fill bar-ram heat-mid';
  return 'bar-fill bar-ram';
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes('run'))    return 'run';
  if (s.includes('zombie')) return 'zombie';
  return 'sleep';
}

function statusLabel(status: string) {
  const s = status.toLowerCase();
  if (s.includes('run'))    return 'Running';
  if (s.includes('zombie')) return 'Zombie';
  if (s.includes('sleep') || s.includes('idle')) return 'Sleeping';
  return status.slice(0, 8);
}

function procInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

// Stable color for process icon based on first char
const ICON_COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#10b981','#f59e0b',
  '#06b6d4','#ef4444','#84cc16','#f97316','#6366f1',
];
function iconColor(name: string) {
  return ICON_COLORS[name.charCodeAt(0) % ICON_COLORS.length];
}

// ── Sort icon ─────────────────────────────────────────────────────
const SortIcon: React.FC<{ field: SortField; active: SortField; order: SortOrder }> = ({ field, active, order }) => {
  if (field !== active) return <ChevronsUpDown size={11} className="sort-icon" />;
  return order === 'asc'
    ? <ChevronUp size={11} className="sort-icon" style={{ opacity: 1, color: 'var(--blue)' }} />
    : <ChevronDown size={11} className="sort-icon" style={{ opacity: 1, color: 'var(--blue)' }} />;
};

// ── Component ─────────────────────────────────────────────────────
export const ProcessList: React.FC<ProcessListProps> = ({
  processes, totalMemory, onKillProcess, selectedPid, onSelectProcess, onContextMenu,
}) => {
  const [sortField, setSortField] = useState<SortField>('cpu_usage');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Virtual scrolling state
  const scrollRef   = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(400);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewHeight(el.clientHeight);
    const ro = new ResizeObserver(() => setViewHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, []);

  const handleSort = (field: SortField) => {
    setSortOrder(prev => field === sortField ? (prev === 'asc' ? 'desc' : 'asc') : 'desc');
    setSortField(field);
  };

  const sorted = useMemo(() => {
    const arr = [...processes];
    arr.sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [processes, sortField, sortOrder]);

  const selectedProcess = useMemo(
    () => sorted.find(p => p.pid === selectedPid),
    [sorted, selectedPid]
  );

  // Virtual window
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx   = Math.min(sorted.length, Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + OVERSCAN);
  const totalH   = sorted.length * ROW_HEIGHT;
  const paddingTop = startIdx * ROW_HEIGHT;

  const TH = ({ field, label, style }: { field: SortField; label: string; style?: React.CSSProperties }) => (
    <th
      onClick={() => handleSort(field)}
      className={sortField === field ? 'sorted' : ''}
      style={style}
    >
      <div className="th-inner">
        {label}
        <SortIcon field={field} active={sortField} order={sortOrder} />
      </div>
    </th>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        className="table-container"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <table className="process-table">
          <thead>
            <tr>
              <TH field="name"      label="Name"   style={{ width: '30%' }} />
              <TH field="cpu_usage" label="CPU"    style={{ width: '20%' }} />
              <TH field="memory"    label="RAM"    style={{ width: '22%' }} />
              <TH field="pid"       label="PID"    style={{ width: '12%' }} />
              <TH field="status"    label="Status" style={{ width: '16%' }} />
            </tr>
          </thead>
          <tbody>
            {/* Top padding spacer */}
            {paddingTop > 0 && (
              <tr style={{ height: paddingTop }}>
                <td colSpan={5} style={{ padding: 0, border: 'none' }} />
              </tr>
            )}

            {sorted.slice(startIdx, endIdx).map(proc => {
              const cpuClamped = Math.min(proc.cpu_usage, 100);
              const ramPct     = totalMemory > 0 ? (proc.memory / totalMemory) * 100 : 0;
              const ramClamped = Math.min(ramPct * 8, 100); // scale for visibility
              const isSelected = proc.pid === selectedPid;
              const sc         = statusClass(proc.status);

              return (
                <tr
                  key={proc.pid}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => onSelectProcess(isSelected ? null : proc.pid)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onSelectProcess(proc.pid);
                    if (onContextMenu) onContextMenu(e, proc);
                  }}
                >
                  {/* Name */}
                  <td>
                    <div className="proc-name">
                      <div
                        className="proc-icon"
                        style={{
                          background: `${iconColor(proc.name)}22`,
                          borderColor: `${iconColor(proc.name)}44`,
                          color: iconColor(proc.name),
                        }}
                      >
                        {procInitial(proc.name)}
                      </div>
                      <span className="proc-name-text">{proc.name}</span>
                    </div>
                  </td>

                  {/* CPU */}
                  <td>
                    <div className="bar-cell">
                      <span className="bar-value">{formatCpu(proc.cpu_usage)}</span>
                      <div className="bar-track">
                        <div className={cpuBarClass(cpuClamped)} style={{ width: `${cpuClamped}%` }} />
                      </div>
                    </div>
                  </td>

                  {/* RAM */}
                  <td>
                    <div className="bar-cell">
                      <span className="bar-value">{formatBytes(proc.memory)}</span>
                      <div className="bar-track">
                        <div className={ramBarClass(ramClamped)} style={{ width: `${ramClamped}%` }} />
                      </div>
                    </div>
                  </td>

                  {/* PID */}
                  <td><span className="pid-val">{proc.pid}</span></td>

                  {/* Status */}
                  <td>
                    <span className={`status-dot ${sc}`}>{statusLabel(proc.status)}</span>
                  </td>
                </tr>
              );
            })}

            {/* Bottom padding spacer */}
            {totalH - (startIdx + sorted.slice(startIdx, endIdx).length) * ROW_HEIGHT > 0 && (
              <tr style={{ height: totalH - paddingTop - sorted.slice(startIdx, endIdx).length * ROW_HEIGHT }}>
                <td colSpan={5} style={{ padding: 0, border: 'none' }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="action-footer">
        <div className="footer-info">
          {selectedProcess ? (
            <>
              <AlertCircle size={13} style={{ color: 'var(--amber)', flexShrink: 0 }} />
              <span>
                <strong>{selectedProcess.name}</strong>
                &nbsp;·&nbsp;PID {selectedProcess.pid}
                &nbsp;·&nbsp;{formatBytes(selectedProcess.memory)} RAM
                &nbsp;·&nbsp;{formatCpu(selectedProcess.cpu_usage)} CPU
              </span>
            </>
          ) : (
            <span>{sorted.length} processes — click a row to select</span>
          )}
        </div>

        <button
          id="end-process-btn"
          className="btn-end"
          disabled={!selectedProcess}
          onClick={() => selectedProcess && onKillProcess(selectedProcess.pid, selectedProcess.name)}
        >
          <XCircle size={14} />
          End Process
        </button>
      </div>
    </div>
  );
};
