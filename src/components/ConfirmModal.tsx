import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { ProcessInfo } from '../types';

interface ConfirmModalProps {
  process: ProcessInfo;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ process, onConfirm, onCancel }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onConfirm, onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-danger">
              <AlertTriangle size={18} />
            </div>
            <h3>Force Kill Process</h3>
          </div>
          <button className="modal-close" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p>
            Are you sure you want to <strong>Force Kill</strong> process{' '}
            <span className="proc-highlight">{process.name}</span> (PID: <code>{process.pid}</code>)?
          </p>
          <div className="modal-warning-box">
            <p>
              <strong>SIGKILL</strong> immediately terminates execution. The process will not have a chance to save unsaved files, clean up temporary data, or close network connections cleanly.
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-modal-cancel" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button className="btn-modal-danger" onClick={onConfirm}>
            Force Kill
          </button>
        </div>
      </div>
    </div>
  );
};
