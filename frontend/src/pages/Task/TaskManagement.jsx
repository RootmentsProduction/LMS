import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import SideNav from '../../components/SideNav/SideNav';
import TaskDetailModal from '../../components/Task/TaskDetailModal';
import baseUrl from '../../api/api';
import { fetchTasks } from '../../features/task/taskFetch';
import './TaskManagement.css';

const PAGE_SIZE = 10;

const PRIORITY_COLOR = {
  High: '#ef4444',
  Medium: '#3b82f6',
  Low: '#22c55e',
  Not: '#9ca3af',
};

const STATUS_CLASS = {
  COMPLETED: 'task-mgmt-status--completed',
  'IN PROGRESS': 'task-mgmt-status--in-progress',
  PENDING: 'task-mgmt-status--pending',
  OVERDUE: 'task-mgmt-status--overdue',
  'ON HOLD': 'task-mgmt-status--on-hold',
  'UNDER REVIEW': 'task-mgmt-status--under-review',
  'PENDING REVIEW': 'task-mgmt-status--under-review',
  REASSIGNED: 'task-mgmt-status--reassigned',
};

const StackCell = ({ primary, secondary }) => (
  <div className="task-mgmt-cell-stack">
    <div className="primary" title={primary}>{primary}</div>
    <div className="secondary">{secondary}</div>
  </div>
);

const DateCell = ({ date, time }) => (
  <div className="task-mgmt-cell-stack">
    <div className="primary">{date}</div>
    <div className="secondary">{time}</div>
  </div>
);

const SlideToComplete = ({ onComplete, label }) => {
  const [position, setPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [completed, setCompleted] = useState(false);
  const trackRef = useRef(null);
  const startXRef = useRef(0);

  const handleStart = (clientX) => {
    if (completed) return;
    setIsDragging(true);
    startXRef.current = clientX - position;
  };

  const handleMove = (clientX) => {
    if (!isDragging) return;
    const track = trackRef.current;
    if (!track) return;
    const maxDelta = 146; // 180 (track width) - 32 (handle width) - 2 (borders)
    let newX = clientX - startXRef.current;
    if (newX < 0) newX = 0;
    if (newX > maxDelta) newX = maxDelta;
    setPosition(newX);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const maxDelta = 146;
    if (position >= maxDelta * 0.9) {
      setPosition(maxDelta);
      setCompleted(true);
      onComplete();
    } else {
      setPosition(0);
    }
  };

  useEffect(() => {
    const handleTouchMove = (e) => {
      if (isDragging) {
        handleMove(e.touches[0].clientX);
      }
    };
    const handleTouchEnd = () => {
      if (isDragging) {
        handleEnd();
      }
    };
    const handleMouseMove = (e) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };
    const handleMouseUp = () => {
      if (isDragging) {
        handleEnd();
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, position]);

  return (
    <div
      ref={trackRef}
      className={`slide-to-complete-track ${completed ? 'completed' : ''}`}
    >
      <div
        className="slide-to-complete-fill"
        style={{
          width: completed ? '100%' : `${position + 16}px`,
          transition: isDragging ? 'none' : 'width 0.2s ease',
        }}
      />
      <div
        className="slide-to-complete-handle"
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        style={{
          left: `${position + 1}px`,
          transition: isDragging ? 'none' : 'left 0.2s ease',
        }}
      >
        {completed ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        )}
      </div>
      <span className="slide-to-complete-text">
        {completed ? 'Completed' : (label || 'Slide to Complete')}
      </span>
    </div>
  );
};

const TaskManagement = () => {
  const user = useSelector((state) => state.auth.user);
  const isGlobalAdmin = ['super_admin', 'admin'].includes(user?.role);

  useEffect(() => {
    if (!document.getElementById('dm-sans-font')) {
      const link = document.createElement('link');
      link.id = 'dm-sans-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const [tasks, setTasks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState('assigned_to_me');

  const userIds = useMemo(() => [
    user?.userId,
    user?._id,
    user?.id,
    user?.empID,
    user?.EmpId,
    user?.employeeId
  ].filter(Boolean).map(String), [user]);

  const userNames = useMemo(() => [
    user?.name,
    user?.username,
    user?.firstName
  ].filter(Boolean).map(n => n.trim().toLowerCase()), [user]);

  const isAssignedToMe = useCallback((t) => {
    if (!t) return false;
    const assignedTo = String(t.assignedTo || '');
    const assignee = String(t.assignee || '').toLowerCase();
    const assignedToLabel = String(t.assignedToLabel || '').toLowerCase();

    if (userIds.includes(assignedTo)) return true;
    if (userNames.some(name => name.length >= 2 && (assignee.includes(name) || assignedToLabel.includes(name)))) return true;
    return false;
  }, [userIds, userNames]);

  const isAssignedByMe = useCallback((t) => {
    if (!t) return false;
    const createdBy = String(t.createdBy || '');
    const assignedBy = String(t.assignedBy || '').toLowerCase();

    if (userIds.includes(createdBy)) return true;
    if (userNames.some(name => name.length >= 2 && assignedBy.includes(name))) return true;
    if (t.workMap && t.workMap.some(step => userNames.some(name => name.length >= 2 && String(step.assignedBy || '').toLowerCase().includes(name)))) return true;
    return false;
  }, [userIds, userNames]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchList = [
        fetchTasks({
          search: search.trim(),
          category: categoryFilter,
          priority: priorityFilter,
          status: statusFilter,
        }),
        // Fetch both UNDER REVIEW and PENDING REVIEW status options for the requests section
        Promise.all([
          fetchTasks({ status: 'UNDER REVIEW' }),
          fetchTasks({ status: 'PENDING REVIEW' })
        ]).then(([underRes, pendingRes]) => {
          return {
            data: [...(underRes.data || []), ...(pendingRes.data || [])]
          };
        }),
        fetchTasks({
          status: 'EXTENSION REQUESTED',
        })
      ];

      const [tasksRes, requestsRes, extensionsRes] = await Promise.all(fetchList);

      setTasks(tasksRes.data || []);
      const allRequests = requestsRes.data || [];
      
      setRequests(
        allRequests.filter((t) => {
          // A task should show up in the Review Requests tab if the user is the current active approver in the chain or workMap
          const hasChain = t.approvalChain && t.approvalChain.length > 0;
          const currentApprover = hasChain ? t.approvalChain[t.approvalChainIndex ?? 0] : t.createdBy;

          return Boolean(
            userIds.includes(String(currentApprover)) ||
            (currentApprover && userNames.some(n => String(currentApprover).toLowerCase().includes(n))) ||
            (t.workMap && t.workMap.some(step => 
              step.action === 'REASSIGNED' && 
              userNames.some(n => String(step.assignedBy || '').toLowerCase().includes(n))
            )) ||
            userIds.includes(String(t.createdBy)) ||
            (t.assignedBy && userNames.some(n => String(t.assignedBy).toLowerCase().includes(n))) ||
            ['super_admin', 'admin', 'hr_admin'].includes(user?.role)
          );
        })
      );

      const allExtensions = extensionsRes.data || [];
      setExtensions(
        isGlobalAdmin
          ? allExtensions
          : allExtensions.filter((t) => String(t.createdBy) === String(user?.userId))
      );
    } catch (err) {
      setError(err.message);
      setTasks([]);
      setRequests([]);
      setExtensions([]);
      toast.error(err.message || 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, priorityFilter, statusFilter, user?.userId, userIds, userNames, isGlobalAdmin]);

  useEffect(() => {
    const timer = setTimeout(loadTasks, 300);
    return () => clearTimeout(timer);
  }, [loadTasks]);

  const categories = useMemo(() => {
    const set = new Set(tasks.map((t) => t.category?.split(' / ')[0]?.trim() || t.category).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [tasks]);

  const assignedToMeTasks = useMemo(() => {
    return tasks.filter(isAssignedToMe);
  }, [tasks, isAssignedToMe]);

  const assignedByMeTasks = useMemo(() => {
    return tasks.filter(isAssignedByMe);
  }, [tasks, isAssignedByMe]);

  const filteredExtensions = useMemo(() => {
    return extensions.filter((task) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch = [
          task.title, task.id, task.assignee, task.categorySub, task.category, task.description,
        ].some((v) => String(v).toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      if (categoryFilter && categoryFilter !== 'All') {
        if (!task.category.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      }
      if (priorityFilter && priorityFilter !== 'All') {
        if (task.priority !== priorityFilter) return false;
      }
      return true;
    });
  }, [extensions, search, categoryFilter, priorityFilter]);

  const filteredRequests = useMemo(() => {
    return requests.filter((task) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch = [
          task.title, task.id, task.assignee, task.categorySub, task.category, task.description,
        ].some((v) => String(v).toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      if (categoryFilter && categoryFilter !== 'All') {
        if (!task.category.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      }
      if (priorityFilter && priorityFilter !== 'All') {
        if (task.priority !== priorityFilter) return false;
      }
      return true;
    });
  }, [requests, search, categoryFilter, priorityFilter]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const currentList = useMemo(() => {
    if (activeTab === 'assigned_to_me') return assignedToMeTasks;
    if (activeTab === 'assigned_by_me') return assignedByMeTasks;
    if (activeTab === 'all') return tasks;
    if (activeTab === 'requests') return filteredRequests;
    if (activeTab === 'extensions') return filteredExtensions;
    return tasks;
  }, [activeTab, assignedToMeTasks, assignedByMeTasks, tasks, filteredRequests, filteredExtensions]);

  const totalCount = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = currentList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showingCount = String(pageItems.length).padStart(2, '0');

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const handleCompleteTask = async (taskObj) => {
    try {
      const token = localStorage.getItem('token');
      const hasChain = taskObj.approvalChain && taskObj.approvalChain.length > 0;
      
      let url = `${baseUrl.baseUrl}api/task/${taskObj._id || taskObj.id}/status`;
      let body = { status: 'COMPLETED' };

      if (hasChain) {
        url = `${baseUrl.baseUrl}api/task/${taskObj._id || taskObj.id}/approve`;
        body = { action: 'APPROVE' };
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || 'Failed to complete task');

      toast.success(hasChain ? 'Approval step recorded!' : 'Task marked as completed!');
      loadTasks();
    } catch (err) {
      toast.error(err.message || 'Could not update task');
    }
  };

  const handleResolveExtension = async (taskId, action, approvedDate) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl.baseUrl}api/task/${taskId}/resolve-extension`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ action, approvedDate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || `Failed to ${action.toLowerCase()} extension`);
      toast.success(action === 'APPROVE' ? 'Extension approved!' : 'Extension rejected');
      loadTasks();
    } catch (err) {
      toast.error(err.message || 'Error updating extension request');
    }
  };

  return (
    <div className="task-mgmt-page">
      <SideNav />

      <div className="task-mgmt-content">
        <div className="task-mgmt-header">
          <div>
            <h1 className="task-mgmt-title">
              Task <span className="task-mgmt-title--heavy">Management</span>
            </h1>
            <p className="task-mgmt-subtitle">Manage and track company wide tasks and approvals</p>
          </div>
          {user?.role !== 'telecaller' && (
            <Link to="/task/create" className="task-mgmt-new-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Task
            </Link>
          )}
        </div>

        {user?.role !== 'telecaller' && (
          <div className="task-mgmt-tabs">
            <button
              type="button"
              className={`task-mgmt-tab-btn ${activeTab === 'assigned_to_me' ? 'active' : ''}`}
              onClick={() => setActiveTab('assigned_to_me')}
            >
              Assigned to Me
              <span className="task-mgmt-tab-count">{assignedToMeTasks.length}</span>
            </button>
            <button
              type="button"
              className={`task-mgmt-tab-btn ${activeTab === 'assigned_by_me' ? 'active' : ''}`}
              onClick={() => setActiveTab('assigned_by_me')}
            >
              Assigned by Me
              <span className="task-mgmt-tab-count">{assignedByMeTasks.length}</span>
            </button>
            <button
              type="button"
              className={`task-mgmt-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Tasks
              <span className="task-mgmt-tab-count">{tasks.length}</span>
            </button>
            <button
              type="button"
              className={`task-mgmt-tab-btn ${activeTab === 'extensions' ? 'active' : ''}`}
              onClick={() => setActiveTab('extensions')}
            >
              Extension Requests
              <span className="task-mgmt-tab-count">{extensions.length}</span>
            </button>
            <button
              type="button"
              className={`task-mgmt-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Review Requests
              <span className="task-mgmt-tab-count">{requests.length}</span>
            </button>
          </div>
        )}

        <div className="task-mgmt-toolbar">
          <div className="task-mgmt-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by task, ID, assignee, store"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="task-mgmt-filter">
            <label>Categories :</label>
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="task-mgmt-filter">
            <label>Priority :</label>
            <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
              {['All', 'High', 'Medium', 'Low', 'Not'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {['assigned_to_me', 'assigned_by_me', 'all'].includes(activeTab) && (
            <div className="task-mgmt-filter">
              <label>Status :</label>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                {['All', 'COMPLETED', 'IN PROGRESS', 'PENDING', 'OVERDUE', 'ON HOLD', 'UNDER REVIEW', 'REASSIGNED', 'EXTENSION REQUESTED'].map((s) => (
                  <option key={s} value={s}>
                    {s === 'IN PROGRESS' ? 'TO DO' : s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="task-mgmt-card">
          <div className="task-mgmt-table-wrap">
            <table className="task-mgmt-table">
              <thead>
                {['assigned_to_me', 'assigned_by_me', 'all'].includes(activeTab) ? (
                  <tr>
                    <th>Task Title</th>
                    <th>Category</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>View</th>
                  </tr>
                ) : activeTab === 'requests' ? (
                  <tr>
                    <th>Task Title</th>
                    <th>Category</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Description</th>
                    <th>Proof</th>
                    <th>Action</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Task Title</th>
                    <th>Category</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Start Date</th>
                    <th>Current End Date</th>
                    <th>Requested Extension Date</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>
                      Loading tasks…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', color: '#ef4444', padding: '32px' }}>
                      {error}
                      <button type="button" onClick={loadTasks} style={{ marginLeft: 12, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#111827' }}>
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>
                      {activeTab === 'assigned_to_me'
                        ? 'No tasks assigned to you.'
                        : activeTab === 'assigned_by_me'
                        ? 'No tasks assigned by you.'
                        : activeTab === 'all'
                        ? 'No tasks found. Create one with + New Task.'
                        : activeTab === 'extensions'
                        ? 'No pending extension requests.'
                        : 'No pending review requests.'}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((task) => (
                    <tr key={task.id}>
                      <td className="task-mgmt-cell-title" onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer' }}>{task.title}</td>
                      <td><StackCell primary={task.category} secondary={task.categoryDetail ? `${task.categoryDetail} · ${task.categorySub}` : task.categorySub} /></td>
                      <td><StackCell primary={task.assignee} secondary={task.assigneeSub} /></td>
                      <td>
                        <span className="task-mgmt-priority">
                          <span
                            className="task-mgmt-priority-dot"
                            style={{ background: PRIORITY_COLOR[task.priority] || '#9ca3af' }}
                          />
                          {task.priority}
                        </span>
                      </td>
                      <td><DateCell date={task.startDate} time={task.startTime} /></td>
                      
                      {activeTab === 'extensions' ? (
                        <>
                          <td><DateCell date={task.endDate} time={task.endTime} /></td>
                          <td>
                            <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                              {task.requestedExtensionDate && task.requestedExtensionDate.includes('-') && task.requestedExtensionDate.split('-')[0].length === 4
                                ? (() => {
                                    const [yyyy, mm, dd] = task.requestedExtensionDate.split('-');
                                    return `${dd}/${mm}/${yyyy}`;
                                  })()
                                : task.requestedExtensionDate}
                            </div>
                          </td>
                        </>
                      ) : (
                        <td><DateCell date={task.endDate} time={task.endTime} /></td>
                      )}
                      
                      <td className="task-mgmt-desc">{task.description}</td>
                      
                      {['assigned_to_me', 'assigned_by_me', 'all'].includes(activeTab) ? (
                        <>
                          <td>
                            <span className={`task-mgmt-status ${STATUS_CLASS[task.status] || ''}`}>
                              {task.status === 'IN PROGRESS' ? 'TO DO' : task.status}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="task-mgmt-view"
                              aria-label={`View ${task.title}`}
                              onClick={() => setSelectedTask(task)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              View
                            </button>
                          </td>
                        </>
                      ) : activeTab === 'requests' ? (
                        <>
                          <td>
                            {task.reviewAttachment ? (
                              <a
                                href={`${baseUrl.baseUrl.replace(/\/$/, '')}${task.reviewAttachment}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="task-mgmt-proof-link"
                              >
                                {task.reviewAttachmentName || 'View Proof'}
                              </a>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>No proof</span>
                            )}
                          </td>
                           <td>
                            <div className="slide-to-complete-wrapper">
                              {(() => {
                                const userIds = [user?.userId, user?._id, user?.id, user?.empID, user?.EmpId, user?.employeeId].filter(Boolean).map(String);
                                const hasChain = task.approvalChain && task.approvalChain.length > 0;
                                const isFinalStep = !hasChain || (task.approvalChainIndex >= task.approvalChain.length - 1) || userIds.includes(String(task.createdBy));
                                const labelText = isFinalStep ? 'Slide to Complete' : 'Slide to Approve';
                                return (
                                  <SlideToComplete
                                    onComplete={() => handleCompleteTask(task)}
                                    label={labelText}
                                  />
                                );
                              })()}
                            </div>
                          </td>
                        </>
                      ) : (
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                              onClick={() => handleResolveExtension(task.id, 'APPROVE', task.requestedExtensionDate)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                              onClick={() => handleResolveExtension(task.id, 'REJECT', null)}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="task-mgmt-footer">
            <p className="task-mgmt-count">
              Showing <strong>{showingCount}</strong> of <strong>{totalCount}</strong>
            </p>
            <div className="task-mgmt-pagination">
              <button
                type="button"
                className="task-mgmt-page-btn"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                className="task-mgmt-page-btn"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onRefresh={loadTasks} />
      )}
    </div>
  );
};

export default TaskManagement;
