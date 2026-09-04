import React from 'react';
import { ListFilter, BarChart2, AlignLeft } from 'lucide-react';
import type { ActiveTab } from '../types';

interface SidebarNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  processCount: number;
}

const NAV_ITEMS: { id: ActiveTab; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: 'processes',   label: 'Processes',   icon: ListFilter },
  { id: 'performance', label: 'Performance', icon: BarChart2 },
  { id: 'details',     label: 'Details',     icon: AlignLeft },
];

export const SidebarNav: React.FC<SidebarNavProps> = ({ activeTab, onTabChange, processCount }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">Views</div>

      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <div
          key={id}
          id={`nav-${id}`}
          className={`nav-item${activeTab === id ? ' active' : ''}`}
          onClick={() => onTabChange(id)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onTabChange(id)}
        >
          <Icon size={16} />
          <span>{label}</span>
          {id === 'processes' && (
            <span className="nav-badge">{processCount}</span>
          )}
        </div>
      ))}
    </aside>
  );
};
