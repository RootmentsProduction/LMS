import { useLocation, Link } from "react-router-dom";
import { useSelector } from "react-redux";

const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ICONS = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  walkin: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  employee: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  training: ["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z", "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"],
  assessment: ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
  branch: ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
};

const MobileNavItem = ({ to, icon, label, active }) => (
  <Link to={to} className="flex flex-col items-center gap-1 flex-1 flex-shrink-0 min-w-[72px]">
    <div className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all duration-200 w-full
      ${active ? 'text-white bg-white/10' : 'text-gray-500'}`}>
      <Icon d={ICONS[icon]} size={20} />
      <span className="text-[9px] font-semibold tracking-wide text-center truncate w-full">{label}</span>
    </div>
  </Link>
);

const ModileNav = () => {
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const is = (path) => location.pathname === path;
  const isWalkin = is('/walkin/list') || is('/walkin/report');

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center px-2 py-1 md:hidden overflow-x-auto scrollbar-none"
        style={{
          backgroundColor: '#1a1a1a',
          height: '64px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <MobileNavItem to="/" icon="dashboard" label="Dashboard" active={is('/')} />
        <MobileNavItem to="/walkin/list" icon="walkin" label="WalkIn" active={isWalkin} />
        <MobileNavItem to="/employee" icon="employee" label="Employees" active={is('/employee')} />
        {user?.role !== 'store_admin' && (
          <MobileNavItem to="/training" icon="training" label="Trainings" active={is('/training')} />
        )}
        {user?.role !== 'store_admin' && (
          <MobileNavItem to="/assessments" icon="assessment" label="Assessments" active={is('/assessments')} />
        )}
        <MobileNavItem to="/branch" icon="branch" label="Branches" active={is('/branch')} />
        {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr_admin' || user?.role === 'cluster_admin') && (
          <MobileNavItem to="/settings/users" icon="settings" label="Settings" active={location.pathname.startsWith('/settings')} />
        )}
      </div>
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
};

export default ModileNav;
