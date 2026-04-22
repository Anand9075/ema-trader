import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Inline SVG nav icons — no external dependency needed
const icons = {
  dashboard:  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>,
  portfolio:  [<path key="a" d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>,<path key="b" d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>],
  scanner:    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>,
  trend:      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
  history:    [<path key="a" d="M12 22a10 10 0 100-20 10 10 0 000 20"/>,<path key="b" d="M12 6v6l4 2"/>],
  alerts:     [<path key="a" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>,<path key="b" d="M13.73 21a2 2 0 01-3.46 0"/>],
  calendar:   [<path key="a" d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"/>,<path key="b" d="M16 2v4M8 2v4M3 10h18"/>],
  settings:   [<circle key="a" cx="12" cy="12" r="3"/>,<path key="b" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>],
  logout:     [<path key="a" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>,<polyline key="b" points="16 17 21 12 16 7"/>,<line key="c" x1="21" y1="12" x2="9" y2="12"/>],
};

function NavIcon({ name }) {
  const d = icons[name];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      {Array.isArray(d) ? d : <path d={d}/>}
    </svg>
  );
}

const NAV_TOP = [
  { to: '/',          icon: 'dashboard', label: 'Dashboard'  },
  { to: '/portfolio', icon: 'portfolio', label: 'Portfolio'  },
  { to: '/scanner',   icon: 'scanner',   label: 'Scanner'    },
  { to: '/trend',     icon: 'trend',     label: 'Trends'     },
];
const NAV_MID = [
  { to: '/history',  icon: 'history',  label: 'History'   },
  { to: '/alerts',   icon: 'alerts',   label: 'Alerts',   badge: true },
  { to: '/calendar', icon: 'calendar', label: 'Calendar'  },
];

export default function Sidebar({ alertCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="nav-logo" style={{ marginBottom: 16 }}>📈</div>

      {/* Top nav */}
      {NAV_TOP.map(n => (
        <NavLink key={n.to} to={n.to} end={n.to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          title={n.label}>
          <NavIcon name={n.icon}/>
        </NavLink>
      ))}

      <div className="nav-sep"/>

      {/* Mid nav */}
      {NAV_MID.map(n => (
        <NavLink key={n.to} to={n.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          title={n.label}>
          <NavIcon name={n.icon}/>
          {n.badge && alertCount > 0 && <span className="nav-badge"/>}
        </NavLink>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }}/>
      <div className="nav-sep"/>

      {/* Settings */}
      <NavLink to="/settings"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        title="Settings">
        <NavIcon name="settings"/>
      </NavLink>

      {/* Logout */}
      <button className="nav-item" title="Logout"
        onClick={() => { logout(); navigate('/login'); }}>
        <NavIcon name="logout"/>
      </button>

      {/* Avatar */}
      <div className="user-avatar" title={user?.name || ''} style={{ marginTop: 8 }}>
        {initials}
      </div>
    </aside>
  );
}