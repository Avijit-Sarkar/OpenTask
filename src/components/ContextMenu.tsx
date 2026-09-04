import React, { useEffect, useRef } from 'react';
import { StopCircle, Zap, Pause, Play, RotateCw, Info } from 'lucide-react';
import type { ProcessInfo } from '../types';

export type ProcessActionType = 'end' | 'kill' | 'suspend' | 'resume' | 'restart' | 'details';

interface ContextMenuProps {
  x: number;
  y: number;
  process: ProcessInfo;
  onClose: () => void;
  onAction: (process: ProcessInfo, action: ProcessActionType) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, process, onClose, onAction }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Viewport bounding logic so menu is never rendered outside screen bounds
  const adjustedStyle: React.CSSProperties = {
    top: `${Math.min(y, window.innerHeight - 260)}px`,
    left: `${Math.min(x, window.innerWidth - 220)}px`,
  };

  const handleSelect = (action: ProcessActionType) => {
    onAction(process, action);
    onClose();
  };

  return (
    <div ref={menuRef} className="context-menu" style={adjustedStyle}>
      <div className="context-menu-header">
        <span className="context-menu-title">{process.name}</span>
        <span className="context-menu-subtitle">PID {process.pid}</span>
      </div>

      <div className="context-menu-divider" />

      <button className="context-menu-item" onClick={() => handleSelect('end')}>
        <StopCircle size={14} className="icon-warn" />
        <span>End Process</span>
        <span className="badge-signal">SIGTERM</span>
      </button>

      <button className="context-menu-item danger" onClick={() => handleSelect('kill')}>
        <Zap size={14} className="icon-danger" />
        <span>Force Kill</span>
        <span className="badge-signal danger">SIGKILL</span>
      </button>

      <div className="context-menu-divider" />

      <button className="context-menu-item" onClick={() => handleSelect('suspend')}>
        <Pause size={14} />
        <span>Suspend Process</span>
        <span className="badge-signal">SIGSTOP</span>
      </button>

      <button className="context-menu-item" onClick={() => handleSelect('resume')}>
        <Play size={14} />
        <span>Resume Process</span>
        <span className="badge-signal">SIGCONT</span>
      </button>

      <button className="context-menu-item" onClick={() => handleSelect('restart')}>
        <RotateCw size={14} />
        <span>Restart Process</span>
      </button>

      <div className="context-menu-divider" />

      <button className="context-menu-item" onClick={() => handleSelect('details')}>
        <Info size={14} />
        <span>Process Details</span>
      </button>
    </div>
  );
};
