import React from 'react';

const NotificationPopup = ({ notification, onClose, onClick }) => {
  if (!notification) return null;

  const rawTitle = notification.title || notification.notificationTitle || 'LMS System Alert';
  // Strip emojis like 🔔 from title string for clean presentation
  const title = rawTitle.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  const body = notification.description || notification.body || notification.message || 'You have received a new notification.';
  const time = notification.time || 'Just now';

  return (
    <div 
      onClick={onClick}
      className="group relative flex items-start gap-3.5 p-3.5 bg-white dark:bg-[#111c2a] border border-gray-100 dark:border-[#1e293b] rounded-2xl shadow-xl hover:shadow-blue-500/10 cursor-pointer transition-all duration-300 transform active:scale-[0.98] max-w-sm w-full overflow-hidden select-none"
      style={{ animation: 'popupDropIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
    >
      {/* Top ambient gradient line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

      {/* Bell Badge Icon Container */}
      <div className="relative shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mt-0.5 group-hover:scale-105 transition-transform duration-200">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Live pulse dot on badge */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
        </span>
      </div>

      {/* Main Notification Details */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h4 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate tracking-tight">
            {title}
          </h4>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 shrink-0">
            {time}
          </span>
        </div>
        <p className="text-[12px] font-normal text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
          {body}
        </p>
      </div>

      {/* Quick Close / Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onClose) onClose();
        }}
        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        title="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default NotificationPopup;
