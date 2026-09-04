import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: number;
  label: string;
}

interface DropdownProps {
  id?: string;
  value: number;
  options: DropdownOption[];
  onChange: (value: number) => void;
  title?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ id, value, options, onChange, title }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value) ?? options[0];

  return (
    <div
      id={id}
      ref={ref}
      title={title}
      style={{ position: 'relative', userSelect: 'none' }}
    >
      {/* Trigger */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 9px',
          background: 'var(--bg-elevated)',
          border: `1px solid ${open ? 'var(--blue)' : 'var(--border-dim)'}`,
          borderRadius: 'var(--radius)',
          color: open ? 'var(--text-hi)' : 'var(--text-mid)',
          fontSize: 12,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: open ? '0 0 0 2px var(--blue-dim)' : 'none',
          transition: 'border-color 0.15s, color 0.15s, box-shadow 0.15s',
          outline: 'none',
        }}
      >
        <span>{selected.label}</span>
        <ChevronDown
          size={12}
          style={{
            color: 'var(--text-lo)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.18s',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            right: 0,
            minWidth: '100%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 999,
            overflow: 'hidden',
          }}
        >
          {options.map(opt => {
            const isActive = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: '7px 14px',
                  fontSize: 12,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  color: isActive ? 'var(--blue)' : 'var(--text-mid)',
                  background: isActive ? 'var(--blue-dim)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  transition: 'background 0.1s, color 0.1s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-hi)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-mid)';
                  }
                }}
              >
                <span>{opt.label}</span>
                {isActive && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
