import { useLocation, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/* ── Icons ───────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ICONS = {
  dashboard:  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  walkin:     ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  task:       ["M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2", "M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z", "M9 12l2 2 4-4"],
  employee:   ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  training:   ["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z", "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"],
  assessment: ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
  module:     ["M4 6h16M4 12h16M4 18h16"],
  branch:     ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
  settings:   ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"],
  logout:     ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
};

/* ── Simple nav item ─────────────────────────────────────────────────────── */
const NavItem = ({ to, icon, label, active, onClick }) => {
  const base = "flex flex-col items-center justify-center gap-1.5 w-full py-3.5 px-2 rounded-xl cursor-pointer select-none transition-all duration-200 relative";
  const cls  = `${base} ${active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;

  const inner = (
    <div className={cls} onClick={onClick}>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
      <Icon d={ICONS[icon]} size={22} />
      <span className="text-[11px] font-medium tracking-wide leading-none text-center">{label}</span>
    </div>
  );

  if (to) return <Link to={to} className="w-full block">{inner}</Link>;
  return <div className="w-full">{inner}</div>;
};

/* ── Flyout rendered via portal so it escapes overflow clipping ──────────── */
const FlyoutNavItem = ({ icon, label, active, items }) => {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const triggerRef            = useRef(null);
  const flyoutRef             = useRef(null);
  const hideTimer             = useRef(null);

  const show = () => {
    clearTimeout(hideTimer.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedHeight = items.length * 45 + 40;
      let top = rect.top;
      if (top + estimatedHeight > window.innerHeight) {
        top = Math.max(10, window.innerHeight - estimatedHeight - 16);
      }
      setPos({
        top,
        left: rect.right + 8,   // 8px gap from sidebar edge
      });
    }
    setOpen(true);
  };

  const hide = () => {
    hideTimer.current = setTimeout(() => setOpen(false), 100);
  };

  // Close on route change
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // Recalculate position dynamically after mount if actual height causes overflow
  useEffect(() => {
    if (open && triggerRef.current && flyoutRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const flyoutHeight = flyoutRef.current.offsetHeight;
      let top = rect.top;
      if (top + flyoutHeight > window.innerHeight) {
        top = Math.max(10, window.innerHeight - flyoutHeight - 16);
        setPos(prev => ({ ...prev, top }));
      }
    }
  }, [open]);

  const base = "flex flex-col items-center justify-center gap-1.5 w-full py-3.5 px-2 rounded-xl cursor-pointer select-none transition-all duration-200 relative";
  const cls  = `${base} ${active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;

  return (
    <div className="w-full" ref={triggerRef} onMouseEnter={show} onMouseLeave={hide}>
      {/* Trigger button */}
      <div className={cls}>
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
        <Icon d={ICONS[icon]} size={22} />
        <span className="text-[11px] font-medium tracking-wide leading-none text-center">{label}</span>
      </div>

      {/* Portal flyout — renders directly on <body>, never clipped */}
      {open && createPortal(
        <div
          ref={flyoutRef}
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onMouseLeave={hide}
          style={{
            position:        'fixed',
            top:             pos.top,
            left:            pos.left,
            zIndex:          9999,
            minWidth:        '200px',
            backgroundColor: '#1e1e1e',
            border:          '1px solid rgba(255,255,255,0.09)',
            borderRadius:    '16px',
            padding:         '10px 8px',
            boxShadow:       '0 20px 60px rgba(0,0,0,0.6)',
            animation:       'flyoutIn 0.15s cubic-bezier(.22,1,.36,1)',
          }}
        >
          {/* Section label */}
          <p style={{
            fontSize:      '10px',
            fontWeight:    600,
            color:         '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding:       '2px 12px 8px',
          }}>
            {label}
          </p>

          {/* Menu items */}
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           '10px',
                padding:       '10px 12px',
                borderRadius:  '10px',
                fontSize:      '14px',
                fontWeight:    item.active ? 600 : 400,
                color:         item.active ? '#ffffff' : '#d1d5db',
                backgroundColor: item.active ? 'rgba(255,255,255,0.1)' : 'transparent',
                textDecoration: 'none',
                transition:    'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                if (!item.active) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={e => {
                if (!item.active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#d1d5db';
                }
              }}
            >
              {/* Active dot */}
              <span style={{
                width:           '6px',
                height:          '6px',
                borderRadius:    '50%',
                backgroundColor: item.active ? '#ffffff' : 'rgba(255,255,255,0.2)',
                flexShrink:      0,
              }} />
              {item.label}
            </Link>
          ))}
        </div>,
        document.body
      )}

      {/* Keyframe injected once */}
      <style>{`
        @keyframes flyoutIn {
          from { opacity: 0; transform: translateX(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
      `}</style>
    </div>
  );
};

/* ── Main SideNav ────────────────────────────────────────────────────────── */
const SideNav = () => {
  const user     = useSelector((s) => s.auth.user);
  const location = useLocation();

  const is       = (path) => location.pathname === path;
  const isWalkin = is('/walkin/list') || is('/walkin/report');

  return (
    <>
      <div
        className="fixed hidden md:flex top-[60px] left-0 z-50 flex-col items-center py-6 gap-1"
        style={{ width: '110px', backgroundColor: '#1a1a1a', height: 'calc(100vh - 60px)' }}
      >
        {/* Nav items */}
        <div className="flex flex-col items-center gap-1 w-full px-2 flex-1 overflow-y-auto">

          <NavItem to="/"            icon="dashboard"  label="Dashboard"   active={is('/')} />

          {/* Walk-In — portal flyout on hover */}
          <FlyoutNavItem
            icon="walkin"
            label="Walk-In"
            active={isWalkin}
            items={[
              { to: '/walkin/list',   label: 'Walkin List',   active: is('/walkin/list') },
              { to: '/walkin/report', label: 'Walkin Report', active: is('/walkin/report') },
            ]}
          />

          {/* Task — portal flyout on hover */}
          <FlyoutNavItem
            icon="task"
            label="Task"
            active={is('/task') || is('/task/create') || is('/task/auto-schedule')}
            items={[
              { to: '/task/create', label: 'Create Task',     active: is('/task/create') },
              { to: '/task',        label: 'Task Management', active: is('/task') },
              { to: '/task/auto-schedule', label: 'Auto Task', active: is('/task/auto-schedule') },
            ]}
          />

          <NavItem to="/employee"    icon="employee"   label="Employees"   active={is('/employee') || location.pathname.startsWith('/detailed/')} />
          {user?.role !== 'store_admin' && (
            <NavItem to="/training"    icon="training"   label="Trainings"   active={is('/training') || is('/alltraining') || is('/createnewtraining')} />
          )}
          {user?.role !== 'store_admin' && (
            <NavItem to="/assessments" icon="assessment" label="Assessments" active={is('/assessments')} />
          )}
          {user?.role !== "cluster_admin" && user?.role !== "store_admin" && (
            <NavItem to="/module"      icon="module"     label="Modules"     active={is('/module')} />
          )}
          <NavItem to="/branch"      icon="branch"     label="Branches"    active={is('/branch') || is('/Addbranch')} />
          {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr_admin' || user?.role === 'cluster_admin') && (
            <FlyoutNavItem
              icon="settings"
              label="Settings"
              active={is('/settings/users') || is('/settings/create-user') || is('/settings/create-notification')}
              items={
                user?.role === 'cluster_admin'
                  ? [
                      { to: '/settings/users', label: 'Create User', active: is('/settings/users') || is('/settings/create-user') }
                    ]
                  : [
                      { to: '/settings/users', label: 'Create User', active: is('/settings/users') || is('/settings/create-user') },
                      { to: '/settings/create-notification', label: 'Create Notification', active: is('/settings/create-notification') },
                    ]
              }
            />
          )}

        </div>
      </div>
    </>
  );
};

export default SideNav;
