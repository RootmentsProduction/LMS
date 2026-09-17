import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { createPortal } from "react-dom";

/* ─────────────────────────────────────────────────────────────────────────────
   Modern SVG Icons System
   ───────────────────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 transition-transform duration-200 ${className}`}
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ICONS = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  walkin: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  task: [
    "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2",
    "M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z",
    "M9 12l2 2 4-4"
  ],
  employee: [
    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",
    "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
  ],
  training: [
    "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z",
    "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
  ],
  assessment: ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
  module: ["M4 6h16M4 12h16M4 18h16"],
  branch: ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
  storeAnalysis: ["M21.21 15.89A10 10 0 1 1 8 2.83", "M22 12A10 10 0 0 0 12 2v10z"],
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
  ],
  customization: ["M12 20h9", "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  toggleSidebar: ["M4 6h16", "M4 12h10", "M4 18h16"],
  search: ["M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"],
  chevronDown: ["M6 9l6 6 6-6"],
  sun: [
    "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
  ],
  moon: ["M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"]
};

/* ─────────────────────────────────────────────────────────────────────────────
   Portal Hover Badge / Flyout for Collapsed Sidebar (Black & White Theme)
   ───────────────────────────────────────────────────────────────────────────── */
const CollapsedFlyout = ({ label, active, items, isCollapsed, children }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const flyoutRef = useRef(null);
  const hideTimer = useRef(null);

  const show = () => {
    if (!isCollapsed) return;
    clearTimeout(hideTimer.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 10
      });
    }
    setOpen(true);
  };

  const hide = () => {
    hideTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // Clamp flyout popover inside viewport vertically so bottom items (like Settings submenus) are never cut off
  useEffect(() => {
    if (open && flyoutRef.current) {
      const rect = flyoutRef.current.getBoundingClientRect();
      const pad = 16;
      if (rect.bottom > window.innerHeight - pad) {
        const diff = rect.bottom - (window.innerHeight - pad);
        setPos((prev) => ({ ...prev, top: prev.top - diff }));
      } else if (rect.top < pad) {
        const diff = pad - rect.top;
        setPos((prev) => ({ ...prev, top: prev.top + diff }));
      }
    }
  }, [open]);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      className="relative flex items-center justify-center w-full"
    >
      {children}

      {open &&
        isCollapsed &&
        createPortal(
          <div
            ref={flyoutRef}
            onMouseEnter={() => clearTimeout(hideTimer.current)}
            onMouseLeave={hide}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: "translateY(-50%)",
              zIndex: 99999,
              pointerEvents: "auto"
            }}
            className="animate-popoverOpen"
          >
            {items && items.length > 0 ? (
              /* Submenu Flyout Container - 100% Solid Black High-Contrast Theme */
              <div className="bg-[#09090b] border-2 border-gray-800 text-white rounded-2xl p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] min-w-[210px] flex flex-col gap-1.5 font-sans">
                <div className="px-3 py-1.5 border-b border-gray-800 text-[11px] font-black text-gray-300 uppercase tracking-wider">
                  {label}
                </div>
                {items.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                      it.active
                        ? "bg-white text-black font-black shadow-lg"
                        : "text-white hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        it.active ? "bg-black" : "bg-white"
                      }`}
                    />
                    <span>{it.label}</span>
                  </Link>
                ))}
              </div>
            ) : (
              /* Solid Black & White Tooltip Badge */
              <div className="relative flex items-center bg-[#09090b] text-white text-[12px] font-extrabold px-3.5 py-2 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-gray-700 whitespace-nowrap">
                <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-r-[6px] border-r-[#09090b] border-b-[5px] border-b-transparent" />
                <span>{label}</span>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main SideNav Component
   ───────────────────────────────────────────────────────────────────────────── */
const SideNav = () => {
  const user = useSelector((s) => s.auth.user);
  const location = useLocation();

  // Sidebar Collapse state (defaults to CLOSED on first opening or reload unless user clicked to open)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved === null) return true;
    return saved === "true";
  });

  // Real-time search filter query (expanded mode)
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

  // Accordion submenus open state
  const [openSubmenus, setOpenSubmenus] = useState({});

  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      document.documentElement.classList.contains("dark")
    );
  });

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
    }
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebarCollapsed", String(next));
  };

  const is = (path) => location.pathname === path;
  const isWalkin = is("/walkin/list") || is("/walkin/report") || is("/walkin/count");

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && !isCollapsed && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCollapsed]);

  // Define structured navigation items by category
  const navCategories = useMemo(() => {
    if (user?.role === "warehouse_admin") {
      return [
        {
          title: "NAVIGATION",
          items: [
            { id: "customization", to: "/customization", icon: "customization", label: "Customization", active: is("/customization") }
          ]
        }
      ];
    }

    const categories = [
      {
        title: "NAVIGATION",
        items: [
          { id: "dashboard", to: "/", icon: "dashboard", label: "Dashboard", active: is("/") || is("/store-insights") },
          ...(user?.role !== "telecaller"
            ? [
                {
                  id: "storeAnalysis",
                  icon: "storeAnalysis",
                  label: "Store Analysis",
                  active: location.pathname.startsWith("/store-analysis/"),
                  items: [
                    { to: "/store-analysis/dsr-report", label: "DSR Report", active: is("/store-analysis/dsr-report") },
                    { to: "/store-analysis/growth-comparison", label: "Growth Comparison", active: is("/store-analysis/growth-comparison") },
                    { to: "/store-analysis/google-review-task", label: "Google Review", active: is("/store-analysis/google-review-task") },
                    {
                      to: "/store-analysis/store-rating",
                      label: user?.role === "store_admin" ? "Staff Rating" : "Store Rating",
                      active:
                        is("/store-analysis/store-rating") ||
                        is("/store-analysis/store-rating/create") ||
                        location.pathname.startsWith("/store-analysis/store-rating/")
                    }
                  ]
                }
              ]
            : []),
          {
            id: "walkin",
            icon: "walkin",
            label: "Walk-In",
            active: isWalkin,
            items: [
              { to: "/walkin/list", label: "Walkin List", active: is("/walkin/list") },
              { to: "/walkin/report", label: "Walkin Report", active: is("/walkin/report") },
              ...(["telecaller", "office_admin", "super_admin", "admin", "hr_admin", "process_control_manager", "cluster_admin", "store_admin"].includes(user?.role)
                ? [{ to: "/walkin/count", label: "Walkin Count", active: is("/walkin/count") }]
                : [])
            ]
          },
          user?.role === "telecaller"
            ? { id: "task", to: "/task", icon: "task", label: "Task", active: is("/task") }
            : {
                id: "task",
                icon: "task",
                label: "Task",
                active: is("/task") || is("/task/create") || is("/task/auto-schedule"),
                items: [
                  { to: "/task/create", label: "Create Task", active: is("/task/create") },
                  { to: "/task", label: "Task Management", active: is("/task") },
                  { to: "/task/auto-schedule", label: "Auto Task", active: is("/task/auto-schedule") }
                ]
              },
          ...(user?.role !== "telecaller"
            ? [
                {
                  id: "employee",
                  to: "/employee",
                  icon: "employee",
                  label: "Employees",
                  active: is("/employee") || location.pathname.startsWith("/detailed/")
                }
              ]
            : [])
        ]
      },
      {
        title: "ACADEMICS & TRAINING",
        items: [
          ...(user?.role !== "telecaller"
            ? [
                { id: "trainingDash", to: "/training-dashboard", icon: "training", label: "Training Dashboard", active: is("/training-dashboard") },
                ...(user?.role !== "store_admin"
                  ? [
                      { id: "trainings", to: "/training", icon: "training", label: "Trainings", active: is("/training") || is("/alltraining") || is("/createnewtraining") },
                      { id: "assessments", to: "/assessments", icon: "assessment", label: "Assessments", active: is("/assessments") }
                    ]
                  : [])
              ]
            : []),
          ...(user?.role !== "cluster_admin" && user?.role !== "process_control_manager" && user?.role !== "store_admin" && user?.role !== "telecaller"
            ? [{ id: "module", to: "/module", icon: "module", label: "Modules", active: is("/module") }]
            : [])
        ].filter(Boolean)
      },
      {
        title: "MANAGEMENT & SYSTEM",
        items: [
          ...(user?.role !== "telecaller"
            ? [{ id: "branch", to: "/branch", icon: "branch", label: "Branches", active: is("/branch") || is("/Addbranch") }]
            : []),
          ...(user?.role !== "telecaller" &&
          ["super_admin", "admin", "hr_admin", "process_control_manager", "cluster_admin"].includes(user?.role)
            ? [
                {
                  id: "settings",
                  icon: "settings",
                  label: "Settings",
                  active:
                    is("/settings/users") ||
                    is("/settings/create-user") ||
                    is("/settings/create-notification"),
                  items:
                    user?.role === "cluster_admin" || user?.role === "process_control_manager"
                      ? [{ to: "/settings/users", label: "Create User", active: is("/settings/users") || is("/settings/create-user") }]
                      : [
                          { to: "/settings/users", label: "Create User", active: is("/settings/users") || is("/settings/create-user") },
                          { to: "/settings/create-notification", label: "Create Notification", active: is("/settings/create-notification") }
                        ]
                }
              ]
            : [])
        ].filter(Boolean)
      }
    ];

    return categories.filter((cat) => cat.items.length > 0);
  }, [user?.role, location.pathname]);

  // Filter categories and items based on search query in expanded mode
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return navCategories;
    const query = searchQuery.toLowerCase();
    return navCategories
      .map((cat) => {
        const matchingItems = cat.items.filter((item) => {
          if (item.label.toLowerCase().includes(query)) return true;
          if (item.items) {
            return item.items.some((sub) => sub.label.toLowerCase().includes(query));
          }
          return false;
        });
        return { ...cat, items: matchingItems };
      })
      .filter((cat) => cat.items.length > 0);
  }, [navCategories, searchQuery]);

  const toggleSubmenu = (id) => {
    setOpenSubmenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.35);
        }
        @keyframes popoverOpen {
          0% { opacity: 0; transform: translateY(-50%) scale(0.92); }
          100% { opacity: 1; transform: translateY(-50%) scale(1); }
        }
        .animate-popoverOpen {
          animation: popoverOpen 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Modern Sidebar Container positioned cleanly under top Header (top-[60px]) */}
      <aside
        style={{ height: "calc(100vh - 60px)" }}
        className={`fixed hidden md:flex top-[60px] left-0 z-40 flex-col bg-[#161618] dark:bg-[#12141c] text-gray-300 border-r border-white/10 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out font-sans ${
          isCollapsed ? "w-[110px]" : "w-[260px]"
        }`}
      >
        {/* Sub Header Controls Row (Toggle Collapse Button) */}
        <div className="flex items-center justify-between h-[42px] px-3 border-b border-white/10 shrink-0">
          {!isCollapsed && (
            <span className="text-[11px] font-extrabold text-white tracking-wider uppercase pl-1">
              MENU
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className={`flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer ${
              isCollapsed ? "mx-auto" : ""
            }`}
          >
            <Icon d={ICONS.toggleSidebar} size={17} />
          </button>
        </div>

        {/* Search Bar (Expanded Mode) */}
        {!isCollapsed && (
          <div className="px-3 py-2 shrink-0">
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs transition-all focus-within:border-white focus-within:ring-1 focus-within:ring-white/30">
              <Icon d={ICONS.search} size={14} className="text-gray-400 mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none text-[12px] font-medium"
              />
              <span className="text-[9px] font-bold text-gray-400 bg-white/10 border border-white/10 px-1.5 py-0.5 rounded">
                /
              </span>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto sidebar-scroll px-2 py-2 flex flex-col gap-2.5">
          {filteredCategories.map((cat, catIdx) => (
            <div key={catIdx} className="flex flex-col gap-0.5">
              {/* Category Header Label */}
              {!isCollapsed && (
                <div className="px-3 text-[9.5px] font-extrabold text-gray-500 tracking-wider uppercase mt-1 mb-0.5">
                  {cat.title}
                </div>
              )}

              {/* Category Nav Items */}
              {cat.items.map((item) => {
                const hasSub = Array.isArray(item.items) && item.items.length > 0;
                const isSubOpen = !!openSubmenus[item.id] || item.active;

                if (isCollapsed) {
                  return (
                    <CollapsedFlyout
                      key={item.id}
                      label={item.label}
                      active={item.active}
                      items={item.items}
                      isCollapsed={isCollapsed}
                    >
                      <Link
                        to={item.to || (hasSub ? item.items[0]?.to : "#")}
                        className={`flex flex-col items-center justify-center gap-1 w-full py-2.5 px-1 rounded-xl cursor-pointer select-none transition-all duration-200 relative ${
                          item.active
                            ? "bg-white text-black shadow-md font-black"
                            : "text-gray-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {item.active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                        )}
                        <Icon d={ICONS[item.icon]} size={20} />
                        <span className="text-[10px] font-medium tracking-wide leading-none text-center">
                          {item.label}
                        </span>
                      </Link>
                    </CollapsedFlyout>
                  );
                }

                /* Expanded Mode Nav Item */
                return (
                  <div key={item.id} className="flex flex-col gap-0.5">
                    {hasSub ? (
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(item.id)}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer ${
                          item.active
                            ? "bg-white/15 text-white border border-white/20 font-black"
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            d={ICONS[item.icon]}
                            size={18}
                            className={item.active ? "text-white" : "text-gray-400"}
                          />
                          <span>{item.label}</span>
                        </div>
                        <Icon
                          d={ICONS.chevronDown}
                          size={15}
                          className={`text-gray-400 transition-transform duration-200 ${
                            isSubOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    ) : (
                      <Link
                        to={item.to}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-bold transition-all ${
                          item.active
                            ? "bg-white text-black shadow-md font-black"
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon
                          d={ICONS[item.icon]}
                          size={18}
                          className={item.active ? "text-black" : "text-gray-400"}
                        />
                        <span>{item.label}</span>
                      </Link>
                    )}

                    {/* Submenu Accordion (Expanded mode) */}
                    {hasSub && isSubOpen && (
                      <div className="ml-5 pl-2.5 border-l border-white/10 flex flex-col gap-0.5 py-0.5 transition-all">
                        {item.items.map((sub) => (
                          <Link
                            key={sub.to}
                            to={sub.to}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all ${
                              sub.active
                                ? "bg-white text-black font-black shadow-sm"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                sub.active ? "bg-black" : "bg-gray-600"
                              }`}
                            />
                            <span>{sub.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Theme Switcher Bar */}
        <div className="px-3 py-2 border-t border-white/10 shrink-0 flex items-center justify-between">
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full bg-white/5 p-1.5 rounded-2xl border border-white/10">
              <span className="text-xs font-bold text-gray-300 ml-2">Theme</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="relative flex items-center w-12 h-6 bg-white/20 border border-white/20 rounded-full p-0.5 transition-all cursor-pointer shadow-inner"
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                    darkMode ? "translate-x-5.5" : "translate-x-0"
                  }`}
                >
                  <Icon
                    d={darkMode ? ICONS.moon : ICONS.sun}
                    size={11}
                    className="text-black"
                  />
                </div>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleTheme}
              title="Toggle Light / Dark Mode"
              className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer mx-auto"
            >
              <Icon d={darkMode ? ICONS.moon : ICONS.sun} size={18} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default SideNav;
