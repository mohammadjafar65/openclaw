import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavDivider,
  Theme,
  HeaderPanel,
  Switcher,
  SwitcherItem,
  SwitcherDivider,
} from '@carbon/react';
import {
  Dashboard,
  Search,
  DataTable,
  ChartBubblePacked,
  Flow,
  Email,
  Security,
  UserMultiple,
  Settings,
  Logout,
  UserAvatar,
  Light,
  Asleep,
} from '@carbon/icons-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard',   icon: Dashboard,          label: 'Dashboard' },
  { path: '/find-leads',  icon: Search,             label: 'Find Leads' },
  { path: '/leads',       icon: DataTable,          label: 'Lead Database' },
  { path: '/audit',       icon: ChartBubblePacked,  label: 'Audit Queue' },
  { path: '/pipeline',    icon: Flow,               label: 'CRM Pipeline' },
  { divider: true },
  { path: '/campaigns',   icon: Email,              label: 'Campaigns' },
  { divider: true },
  { path: '/compliance',  icon: Security,           label: 'Compliance' },
  { path: '/team',        icon: UserMultiple,        label: 'Team' },
  { path: '/settings',    icon: Settings,           label: 'Settings' },
];

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [userPanelOpen, setUserPanelOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const appTheme = darkMode ? 'g100' : 'white';

  return (
    <Theme theme={appTheme}>
      <div className={`oc-app-layout ${darkMode ? 'oc-dark' : 'oc-light'}`}>
        {/* ── Header ──────────────────────────────────── */}
        <Header aria-label="OpenClaw">
          <HeaderName prefix="">
            <span style={{ fontWeight: 600, letterSpacing: '-0.5px' }}>
              Open<span style={{ color: '#6929c4' }}>Claw</span>
            </span>
          </HeaderName>

          <HeaderGlobalBar>
            <HeaderGlobalAction
              aria-label="Toggle theme"
              onClick={() => setDarkMode(!darkMode)}
              tooltipAlignment="end"
            >
              {darkMode ? <Light size={20} /> : <Asleep size={20} />}
            </HeaderGlobalAction>

            <HeaderGlobalAction
              aria-label="User"
              isActive={userPanelOpen}
              onClick={() => setUserPanelOpen(!userPanelOpen)}
              tooltipAlignment="end"
            >
              <UserAvatar size={20} />
            </HeaderGlobalAction>
          </HeaderGlobalBar>

          <HeaderPanel
            aria-label="User panel"
            expanded={userPanelOpen}
          >
            <Switcher aria-label="User menu">
              <SwitcherItem aria-label="User info" style={{ cursor: 'default' }}>
                <div style={{ padding: '0.25rem 0' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {user?.full_name || user?.name || 'User'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#a8a8a8', marginTop: 2 }}>
                    {user?.email}
                  </div>
                  <div style={{
                    fontSize: '0.675rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.32px',
                    color: '#6929c4',
                    marginTop: 4,
                  }}>
                    {user?.role}
                  </div>
                </div>
              </SwitcherItem>
              <SwitcherDivider />
              <SwitcherItem aria-label="Settings" onClick={() => { navigate('/settings'); setUserPanelOpen(false); }}>
                Settings
              </SwitcherItem>
              <SwitcherDivider />
              <SwitcherItem aria-label="Log out" onClick={handleLogout}>
                Log out
              </SwitcherItem>
            </Switcher>
          </HeaderPanel>
        </Header>

        {/* ── Body ────────────────────────────────────── */}
        <div className="oc-body" style={{ marginTop: 'var(--oc-header-height)' }}>
          {/* Sidebar */}
          <SideNav
            aria-label="Side navigation"
            isRail={false}
            expanded
            className="oc-sidebar"
            style={{ top: 'var(--oc-header-height)' }}
          >
            <SideNavItems>
              {NAV_ITEMS.map((item, i) =>
                item.divider ? (
                  <SideNavDivider key={`div-${i}`} />
                ) : (
                  <SideNavLink
                    key={item.path}
                    renderIcon={item.icon}
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                    large
                  >
                    {item.label}
                  </SideNavLink>
                )
              )}

              <SideNavDivider />
              <SideNavLink renderIcon={Logout} onClick={handleLogout} large>
                Logout
              </SideNavLink>
            </SideNavItems>
          </SideNav>

          {/* Main Content */}
          <main className="oc-main-content">
            {children}
          </main>
        </div>
      </div>
    </Theme>
  );
}
