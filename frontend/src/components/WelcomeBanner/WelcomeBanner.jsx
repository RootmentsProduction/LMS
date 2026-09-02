import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { 
  HiOutlineSparkles, 
  HiOutlineCalendar, 
  HiOutlineLocationMarker, 
  HiOutlineDocumentReport,
  HiOutlineClipboardList,
  HiOutlineChartBar
} from "react-icons/hi";

const WelcomeBanner = () => {
  const reduxUser = useSelector((state) => state.auth.user);
  
  // Safe user resolution with localStorage fallback
  const user = reduxUser || (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  })();

  const [greeting, setGreeting] = useState("Welcome");
  const [timeEmoji, setTimeEmoji] = useState("✨");
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const updateGreeting = () => {
      const currentHour = new Date().getHours();
      if (currentHour >= 4 && currentHour < 12) {
        setGreeting("Good morning");
        setTimeEmoji("🌅");
      } else if (currentHour >= 12 && currentHour < 17) {
        setGreeting("Good afternoon");
        setTimeEmoji("☀️");
      } else {
        setGreeting("Good evening");
        setTimeEmoji("🌙");
      }
    };

    updateGreeting();

    // Auto-dismiss after exactly 5 minutes (300,000 ms)
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, FIVE_MINUTES_MS - 1000);

    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
    }, FIVE_MINUTES_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, []);

  if (!isVisible) return null;

  const adminName = user?.name || user?.username || "Admin";
  const userRole = (user?.role || "admin").toLowerCase().trim();

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "store_admin":
        return "Store Admin";
      case "cluster_admin":
        return "Cluster Admin";
      case "hr_admin":
        return "HR Admin";
      case "warehouse_admin":
        return "Warehouse Admin";
      case "telecaller":
        return "Telecaller";
      default:
        return "Admin";
    }
  };

  const getStoreDisplayName = () => {
    if (user?.workingBranch && user.workingBranch !== "All" && user.workingBranch !== "No Store") {
      return user.workingBranch;
    }
    if (Array.isArray(user?.branches) && user.branches.length > 0) {
      if (user.branches.length === 1) {
        return user.branches[0].workingBranch || user.branches[0].branchName || "Store";
      }
      return `${user.branches.length} Assigned Stores`;
    }
    if (userRole === "super_admin" || userRole === "admin") {
      return "All Store Locations";
    }
    return "Operations Portal";
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div 
      className={`w-full font-['DM_Sans',sans-serif] transition-all duration-1000 ease-out overflow-hidden ${
        isFadingOut ? "opacity-0 -translate-y-2 max-h-0 pointer-events-none mb-0" : "opacity-100 translate-y-0 max-h-40"
      }`}
    >
      {/* Apple macOS / iOS Frosted Liquid Glass Theme */}
      <div 
        style={{
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.82) 0%, rgba(248, 250, 252, 0.68) 100%)",
          backdropFilter: "blur(24px) saturate(190%)",
          WebkitBackdropFilter: "blur(24px) saturate(190%)",
          boxShadow: "0 8px 28px -4px rgba(15, 23, 42, 0.06), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.85)"
        }}
        className="relative overflow-hidden rounded-2xl px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5"
      >
        {/* Subtle Ambient Apple Light Prism */}
        <div className="absolute -top-10 right-1/4 w-52 h-20 bg-gradient-to-r from-blue-100/40 via-indigo-100/30 to-purple-100/30 rounded-full blur-2xl pointer-events-none" />

        {/* Left Side: Greeting & Meta Info */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none select-none">{timeEmoji}</span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
              {greeting}, <span className="text-slate-950 font-extrabold">{adminName}</span>
            </span>
            <span 
              style={{
                background: "rgba(255, 255, 255, 0.75)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.9)"
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-slate-700 border border-white/90"
            >
              <HiOutlineSparkles className="w-2.5 h-2.5 text-indigo-500" />
              {getRoleDisplayName(userRole)}
            </span>
          </div>

          <div className="hidden sm:block w-px h-3.5 bg-slate-300/80" />

          {/* Meta Chips */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-medium text-slate-600">
              <HiOutlineLocationMarker className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
              <span>{getStoreDisplayName()}</span>
            </div>

            <span className="text-slate-300">•</span>

            <div className="flex items-center gap-1.5 text-slate-500">
              <HiOutlineCalendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Frosted Glass Pill Buttons */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
          <Link
            to="/walkin/report"
            style={{
              boxShadow: "0 2px 8px -1px rgba(15, 23, 42, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.15)"
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-900 text-white font-semibold text-xs backdrop-blur-md transition-all active:scale-95"
          >
            <HiOutlineDocumentReport className="w-3.5 h-3.5 text-slate-200" />
            <span>Walk-in Reports</span>
          </Link>

          <Link
            to="/task"
            style={{
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 1px 4px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.9)"
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl hover:bg-white text-slate-700 hover:text-slate-900 font-semibold text-xs border border-white/90 transition-all active:scale-95"
          >
            <HiOutlineClipboardList className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tasks</span>
          </Link>

          <Link
            to="/store-analysis/dsr-report"
            style={{
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 1px 4px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.9)"
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl hover:bg-white text-slate-700 hover:text-slate-900 font-semibold text-xs border border-white/90 transition-all active:scale-95"
          >
            <HiOutlineChartBar className="w-3.5 h-3.5 text-blue-600" />
            <span>DSR Report</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
