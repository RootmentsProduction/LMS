import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect, useRef } from "react";
import baseUrl from "../../api/api.js";
import LogoutConfirmation from "../LogoutConfirmation/LogoutConfirmation";
import ResetPasswordModal from "../ResetPasswordModal/ResetPasswordModal";
import { logout } from "../../features/auth/authSlice";

const Header = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const dropRef = useRef(null);

    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchUsers, setSearchUsers]     = useState([]);
    const [isSearching, setIsSearching]     = useState(false);
    const [dropOpen, setDropOpen]           = useState(false);
    const [showLogout, setShowLogout]       = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);

    const [darkMode, setDarkMode]           = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const user = useSelector((s) => s.auth.user);
    const token = localStorage.getItem('token');

    // Display name — prefer username, fall back to role label
    const displayName = user?.username
        ? user.username.replace(/\b\w/g, c => c.toUpperCase())
        : user?.role
            ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            : '';

    // Role subtitle
    const roleLabel = user?.role
        ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : '';

    // Initials for avatar fallback
    const initials = displayName
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    // Search
    const handleSearch = async () => {
        try {
            const res = await fetch(`${baseUrl.baseUrl}api/admin/get/searching/userORbranch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ search }),
            });
            const data = await res.json();
            setSearchResults(data.branch || []);
            setSearchUsers(data.data || []);
        } catch { /* silent */ }
    };

    useEffect(() => {
        if (search.trim()) {
            setIsSearching(true);
            const t = setTimeout(handleSearch, 450);
            return () => clearTimeout(t);
        } else {
            setIsSearching(false);
            setSearchResults([]);
            setSearchUsers([]);
        }
    }, [search]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogoutConfirm = () => {
        localStorage.removeItem('token');
        dispatch(logout());
        navigate('/login');
    };

    return (
        <>
            <header
                className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-white border-b border-gray-200"
                style={{ height: '60px', padding: '0 24px' }}
            >
                {/* ── Left: Logo + brand name ── */}
                <Link to="/" className="flex items-center gap-3 no-underline select-none group">
                    <div className="brand-logo-ambient relative flex items-center justify-center p-0.5 rounded-full" style={{ perspective: '1000px' }}>
                        <img 
                            src="/logo.png" 
                            alt="Brynex LMS" 
                            className="w-11 h-11 object-contain select-none relative z-10 brand-logo-choreographed transition-transform duration-300 group-hover:scale-110" 
                        />
                    </div>
                    <div className="flex flex-col ml-1 brand-text-perspective">
                        <h1 className="text-xl font-bold tracking-wide brand-title-container flex items-center">
                            {"BRYNEX ONE".split('').map((char, index) => (
                                <span
                                    key={index}
                                    className="brand-letter inline-block"
                                    style={{
                                        animationDelay: `${(index * 0.07).toFixed(2)}s`
                                    }}
                                >
                                    {char === ' ' ? '\u00A0' : char}
                                </span>
                            ))}
                        </h1>
                        <span className="text-[9px] font-medium tracking-widest uppercase text-gray-400 group-hover:text-gray-600 transition-all duration-300" style={{ letterSpacing: '0.18em' }}>
                            BRYNEX APPAREL PVT.LTD
                        </span>
                    </div>
                </Link>

                {/* ── Right: bell + avatar ── */}
                <div className="flex items-center gap-3">

                    {/* Dark Mode Toggle */}
                    <button 
                        onClick={() => setDarkMode(p => !p)} 
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {darkMode ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>

                    {/* Bell */}
                    <Link to="/admin/Notification">
                        <button className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </button>
                    </Link>

                    {/* Divider */}
                    <div className="w-px h-7 bg-gray-200" />

                    {/* Avatar + name dropdown */}
                    <div className="relative" ref={dropRef}>
                        <button
                            onClick={() => setDropOpen(p => !p)}
                            className="flex items-center gap-2.5 py-1 px-1 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ring-2 ring-gray-100">
                                {initials}
                            </div>
                            {/* Name + role */}
                            <div className="hidden md:flex flex-col items-start leading-tight" style={{ maxWidth: '130px', width: 'max-content' }}>
                                <div className="header-marquee-container">
                                    <span className="text-[13px] font-semibold text-gray-900 header-marquee-text">{displayName}</span>
                                </div>
                                <span className="text-[11px] text-gray-400">{roleLabel}</span>
                            </div>
                            {/* Chevron */}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                className="text-gray-400 hidden md:block ml-0.5">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {/* Dropdown menu */}
                        {dropOpen && (
                            <div
                                className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50"
                                style={{ animation: 'headerDropIn 0.15s cubic-bezier(.22,1,.36,1)' }}
                            >
                                <Link to="/admin/profile" onClick={() => setDropOpen(false)}>
                                    <div className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                        </svg>
                                        Profile
                                    </div>
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => { setDropOpen(false); setShowResetPassword(true); }}
                                    className="w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    Reset Password
                                </button>

                                <div className="border-t border-gray-100" />
                                <button
                                    onClick={() => { setDropOpen(false); setShowLogout(true); }}
                                    className="w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <style>{`
                @keyframes headerDropIn {
                    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .header-marquee-container {
                    container-type: inline-size;
                    overflow: hidden;
                    white-space: nowrap;
                    display: block;
                    width: 100%;
                }
                .header-marquee-text {
                    display: inline-block;
                    min-width: 100%;
                    animation: header-marquee-scroll 6s linear infinite;
                }
                .header-marquee-container:hover .header-marquee-text {
                    animation-play-state: paused;
                }
                @keyframes header-marquee-scroll {
                    0%, 15% { transform: translateX(0); }
                    85%, 100% { transform: translateX(min(0px, calc(-100% + 100cqw))); }
                }
            `}</style>

            <LogoutConfirmation
                isOpen={showLogout}
                onClose={() => setShowLogout(false)}
                onConfirm={handleLogoutConfirm}
            />

            <ResetPasswordModal
                isOpen={showResetPassword}
                onClose={() => setShowResetPassword(false)}
            />
        </>
    );
};

export default Header;
