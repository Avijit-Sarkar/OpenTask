import React from 'react';
import type { ProcessInfo } from '../types';
import { formatBytes, formatCpu } from '../utils/formatters';
import { Terminal, XCircle } from 'lucide-react';

interface DetailsViewProps {
  processes: ProcessInfo[];
  onKillProcess: (pid: number, name: string) => void;
  selectedPid: number | null;
  onSelectProcess: (pid: number | null) => void;
  onContextMenu?: (e: React.MouseEvent, process: ProcessInfo) => void;
}

export const DetailsView: React.FC<DetailsViewProps> = ({
  processes,
  onKillProcess,
  selectedPid,
  onSelectProcess,
  onContextMenu,
}) => {
  const selectedProcess = processes.find((p) => p.pid === selectedPid);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="table-container">
        <table className="process-table">
          <thead>
            <tr>
              <th style={{ width: '10%' }}>PID</th>
              <th style={{ width: '22%' }}>Name</th>
              <th style={{ width: '12%' }}>CPU</th>
              <th style={{ width: '16%' }}>RAM</th>
              <th style={{ width: '40%' }}>Command Line</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((proc) => {
              const isSelected = selectedPid === proc.pid;
              const cmdStr = proc.cmdline.length > 0 ? proc.cmdline.join(' ') : proc.name;

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
                  <td className="font-mono" style={{ color: 'var(--text-lo)' }}>
                    {proc.pid}
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--text-hi)' }}>
                    {proc.name}
                  </td>
                  <td className="font-mono" style={{ color: 'var(--text-mid)' }}>{formatCpu(proc.cpu_usage)}</td>
                  <td className="font-mono" style={{ color: 'var(--text-mid)' }}>{formatBytes(proc.memory)}</td>
                  <td
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.78rem',
                      color: 'var(--text-lo)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '300px'
                    }}
                    title={cmdStr}
                  >
                    {cmdStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="action-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-lo)', fontSize: 12, overflow: 'hidden' }}>
          {selectedProcess ? (
            <>
              <Terminal size={13} style={{ color: 'var(--blue)', flexShrink: 0 }} />
              <span className="font-mono" style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedProcess.cmdline.join(' ') || selectedProcess.name}
              </span>
            </>
          ) : (
            <span>Select a process to view its command line</span>
          )}
        </div>

        <button
          id="details-end-process-btn"
          className="btn-end"
          disabled={!selectedProcess}
          onClick={() => {
            if (selectedProcess) {
              onKillProcess(selectedProcess.pid, selectedProcess.name);
            }
          }}
        >
          <XCircle size={14} />
          End Process
        </button>
      </div>
    </div>
  );
};
