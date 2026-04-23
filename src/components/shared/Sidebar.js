import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IconDash, IconPortfolio, IconScanner, IconHistory, IconAlerts, IconCalendar, IconSettings, IconLogout } from './Icons';

const NAV = [
  { to:'/',           Icon: IconDash,       label:'Dashboard'  },
  { to:'/portfolio',  Icon: IconPortfolio,  label:'Portfolio'  },
  { to:'/scanner',    Icon: IconScanner,    label:'Scanner'    },
  { to:'/history',    Icon: IconHistory,    label:'History'    },
  { to:'/alerts',     Icon: IconAlerts,     label:'Alerts'     },
  { to:'/calendar',   Icon: IconCalendar,   label:'Calendar'   },
];

export default function Sidebar({ alertCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="nav-logo" title="EMA Trader">📈</div>
      {NAV.map(({ to, Icon, label }) => (
        <NavLink key={to} to={to} title={label}
          className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
          <Icon style={{ width:18, height:18 }}/>
          {to === '/alerts' && alertCount > 0 && <span className="nav-badge"/>}
        </NavLink>
      ))}
      <div className="nav-sep"/>
      <div style={{ flex:1 }}/>
      <NavLink to="/settings" title="Settings" className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
        <IconSettings style={{ width:18, height:18 }}/>
      </NavLink>
      <button className="nav-btn" title="Logout" onClick={() => { logout(); navigate('/login'); }} style={{ marginTop:4 }}>
        <IconLogout style={{ width:18, height:18 }}/>
      </button>
      <div className="avatar" title={user?.name} style={{ marginTop:8, width:34, height:34, fontSize:11 }}>
        {initials}
      </div>
    </aside>
  );
}