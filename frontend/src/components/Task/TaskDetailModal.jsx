import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Select from 'react-select';
import baseUrl from '../../api/api';
import './TaskDetailModal.css';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    minHeight: '38px',
    height: '38px',
    boxShadow: state.isFocused ? '0 0 0 1px #111827' : 'none',
    borderColor: state.isFocused ? '#111827' : '#d1d5db',
    '&:hover': {
      borderColor: state.isFocused ? '#111827' : '#d1d5db',
    },
    fontFamily: 'inherit',
    fontSize: '13px',
    color: '#374151',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 12px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
  }),
  input: (base) => ({
    ...base,
    margin: '0px',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: '4px 8px',
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: '36px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#f3f4f6' : state.isFocused ? '#f9fafb' : '#fff',
    color: '#374151',
    fontFamily: 'inherit',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '8px 12px',
    '&:active': {
      backgroundColor: '#f3f4f6',
    },
  }),
};

const PRIORITY_COLOR = {
  High: '#f59e0b',
  Medium: '#3b82f6',
  Low: '#22c55e',
  Not: '#9ca3af',
};

const STATUS_CLASS = {
  COMPLETED: 'task-detail-status--completed',
  'IN PROGRESS': 'task-detail-status--in-progress',
  PENDING: 'task-detail-status--pending',
  OVERDUE: 'task-detail-status--overdue',
  'ON HOLD': 'task-detail-status--on-hold',
  'UNDER REVIEW': 'task-detail-status--under-review',
  'PENDING REVIEW': 'task-detail-status--under-review',
  REASSIGNED: 'task-detail-status--reassigned',
};

const DetailField = ({ label, primary, secondary, icon, children }) => (
  <div className="task-detail-field">
    <div className="task-detail-field__label-container">
      {icon && <span className="task-detail-field__icon">{icon}</span>}
      <div className="task-detail-field__label">{label}</div>
    </div>
    {children || (
      <>
        <div className="task-detail-field__primary">{primary}</div>
        {secondary && secondary !== primary ? <div className="task-detail-field__secondary">{secondary}</div> : null}
      </>
    )}
  </div>
);

const TaskDetailModal = ({ task, onClose, onRefresh }) => {
  const user = useSelector((state) => state.auth.user);
  const userIds = [user?.userId, user?._id, user?.id, user?.empID, user?.EmpId, user?.employeeId].filter(Boolean).map(String);
  const userNames = [user?.name, user?.username].filter(Boolean).map(n => n.trim().toLowerCase());

  const isAssignedToMe = Boolean(
    task && (
      userIds.includes(String(task.assignedTo)) ||
      (task.assignedTo && userNames.some(n => String(task.assignedTo).toLowerCase().includes(n))) ||
      (task.assignee && userNames.some(n => String(task.assignee).toLowerCase().includes(n))) ||
      (task.assignedToLabel && userNames.some(n => String(task.assignedToLabel).toLowerCase().includes(n)))
    )
  );
  const isAdmin = user?.role && user?.role !== 'employee' && user?.role !== 'user';
  const canReassign = isAssignedToMe || isAdmin;
  const isMyStore = user?.locCode && task?.storeCode === `Z-${user.locCode}`;
  const canUpdateStatus = isAssignedToMe || isMyStore || isAdmin;
  const isTaskCreator = Boolean(
    task && (
      userIds.includes(String(task.createdBy)) ||
      (task.assignedByName && userNames.some(n => String(task.assignedByName).toLowerCase().includes(n)))
    )
  );
  const shouldShowWorkMap = isAdmin || isTaskCreator;
  const canEditDetails = (isAdmin || isTaskCreator) && user?.role !== 'cluster_admin' && user?.role !== 'store_admin';

  const [selectedFile, setSelectedFile] = useState(null);
  const [reassignFile, setReassignFile] = useState(null);
  const [approvalFile, setApprovalFile] = useState(null);
  const [assigneesList, setAssigneesList] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');

  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAdditionalInfo, setEditAdditionalInfo] = useState('');

  const getHtmlDate = (displayDate) => {
    if (!displayDate || displayDate === '—') return '';
    if (displayDate.includes('/')) {
      const [dd, mm, yyyy] = displayDate.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    return displayDate;
  };

  const startEditing = () => {
    setEditTitle(task.title || '');
    setEditCategory(task.category || '');
    setEditSubCategory(task.categoryDetail || task.subCategory || '');
    setEditAssignee(task.assignedTo || '');
    setEditPriority(task.priority || 'Medium');
    setEditEndDate(getHtmlDate(task.endDate));
    setEditDescription(task.description && task.description !== '—' ? task.description : '');
    setEditAdditionalInfo(task.additionalInfo && task.additionalInfo !== '—' ? task.additionalInfo : '');
    setIsEditing(true);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if ((canReassign || canEditDetails) && task) {
      const fetchAssignees = async () => {
        setLoadingAssignees(true);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${baseUrl.baseUrl}api/task/assignees`, {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          const json = await res.json();
          if (json.success) {
            const rawAssignees = json.data || [];
            const roleRanks = {
              super_admin: 5,
              'super admin': 5,
              admin: 5,
              hr_admin: 4,
              'hr admin': 4,
              cluster_admin: 3,
              'cluster admin': 3,
              store_admin: 2,
              'store admin': 2,
              employee: 1,
              user: 1
            };
            const userRole = String(user?.role || '').toLowerCase().replace(/\s+/g, '_');
            const userRank = roleRanks[userRole] || roleRanks[user?.role] || 1;

            const getOptionRank = (opt) => {
              if (opt.role && roleRanks[opt.role]) {
                return roleRanks[opt.role];
              }
              if (opt.label) {
                const parts = opt.label.split(' - ');
                if (parts.length >= 3) {
                  const designation = parts[1].trim().toLowerCase();
                  if (designation === 'super admin' || designation === 'admin') return 5;
                  if (designation === 'hr admin') return 4;
                  if (designation === 'cluster admin') return 3;
                  if (designation === 'store admin' || designation === 'store_admin') return 2;
                }
              }
              return 1;
            };

            const filteredAndFormatted = rawAssignees
              .filter(opt => {
                if (opt.type === 'group') {
                  if (opt.value === 'all_hr_admins' && userRank < 4) return false;
                  if (opt.value === 'all_cluster_admins' && userRank < 3) return false;
                  if (opt.value === 'all_store_admins' && userRank < 2) return false;
                  return true;
                }
                
                if (['cluster_admin', 'store_admin', 'hr_admin'].includes(userRole)) {
                  const optRank = getOptionRank(opt);
                  if (optRank > userRank) return false;
                }
                return true;
              })
              .map(opt => {
                if (opt.label) {
                  const parts = opt.label.split(' - ');
                  if (parts.length >= 3) {
                    const storeSegment = parts[parts.length - 1];
                    const stores = storeSegment.split(',').map(s => s.trim());
                    if (stores.length > 5 || storeSegment.toLowerCase().includes('all store')) {
                      parts[parts.length - 1] = 'All Stores';
                      return {
                        ...opt,
                        label: parts.join(' - ')
                      };
                    }
                  }
                }
                return opt;
              });
            setAssigneesList(filteredAndFormatted);
          }
        } catch (err) {
          console.error('Error fetching assignees:', err);
        } finally {
          setLoadingAssignees(false);
        }
      };
      fetchAssignees();
    }
  }, [canReassign, canEditDetails, task, user?.role]);

  useEffect(() => {
    if (canReassign && task) {
      const fetchCategories = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${baseUrl.baseUrl}api/task-category`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          if (response.ok) {
            const json = await response.json();
            const list = json.data || [];
            setCategoriesList(list);
            
            // Populate category/subcategory from current task if available
            if (task.category) {
              setSelectedCategory(task.category);
              if (task.subCategory) {
                setSelectedSubCategory(task.subCategory);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching categories:', err);
        }
      };
      fetchCategories();
    }
  }, [canReassign, task]);

  if (!task) return null;

  const categoryLine = task.categoryDetail
    ? `${task.category} | ${task.categoryDetail}`
    : task.category;

  const desc = task.description && task.description !== '—' ? task.description : '—';

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleReviewButtonClick = () => {
    setShowReviewForm((prev) => !prev);
    if (showReviewForm) setSelectedFile(null); // reset file if closing
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleReassignFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReassignFile(e.target.files[0]);
    }
  };

  const handleSubmitForReview = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const hasChain = task.approvalChain && task.approvalChain.length > 0;
      const body = { status: hasChain ? 'PENDING REVIEW' : 'UNDER REVIEW' };

      if (selectedFile) {
        const base64 = await getBase64(selectedFile);
        body.fileAttachment = { name: selectedFile.name, base64 };
      }

      const res = await fetch(`${baseUrl.baseUrl}api/task/${task.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to submit review');
      }
      toast.success(hasChain ? 'Task submitted for approval successfully!' : 'Task submitted for review successfully!');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl.baseUrl}api/task/${task.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to update status');
      }
      toast.success(`Task status updated to ${newStatus}`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCategoryChange = (e) => {
    const catName = e.target.value;
    setSelectedCategory(catName);
    setSelectedSubCategory('');
  };

  const handleReassign = async () => {
    if (!selectedAssignee) {
      toast.error('Please select an assignee');
      return;
    }
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }
    if (!selectedSubCategory) {
      toast.error('Please select a subcategory');
      return;
    }
    if (!reassignFile) {
      toast.error('Task completion attachment is required for reassignment');
      return;
    }
    const option = assigneesList.find((opt) => opt.value === selectedAssignee);
    if (!option) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const body = {
        assignedTo: selectedAssignee,
        assignedToLabel: option.label,
        category: selectedCategory,
        subCategory: selectedSubCategory,
      };

      if (reassignFile) {
        const base64 = await getBase64(reassignFile);
        body.fileAttachment = { name: reassignFile.name, base64 };
      }

      const res = await fetch(`${baseUrl.baseUrl}api/task/${task.id}/reassign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to reassign task');
      }
      toast.success('Task reassigned successfully!');
      setReassignFile(null);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to reassign task');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!editTitle) {
      toast.error('Title is required');
      return;
    }
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const chosenAssignee = assigneesList.find((opt) => opt.value === editAssignee);
      
      const payload = {
        title: editTitle,
        category: editCategory,
        subCategory: editSubCategory,
        assignedTo: editAssignee,
        assignedToLabel: chosenAssignee ? chosenAssignee.label : undefined,
        endDate: editEndDate,
        priority: editPriority,
        description: editDescription,
        additionalInfo: editAdditionalInfo
      };

      const res = await fetch(`${baseUrl.baseUrl}api/task/${task.id}/details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to update task details');
      }

      toast.success('Task details updated successfully!');
      setIsEditing(false);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update task details');
    } finally {
      setUpdating(false);
    }
  };

  const handleRequestExtension = async () => {
    if (!extensionDate) {
      toast.error('Please select an extension date');
      return;
    }
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl.baseUrl}api/task/${task.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          status: 'EXTENSION REQUESTED',
          requestedExtensionDate: extensionDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to request extension');
      }
      toast.success('Extension requested successfully!');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to request extension');
    } finally {
      setUpdating(false);
    }
  };

  const formatDateStr = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      const [yyyy, mm, dd] = dateStr.split('-');
      return `${dd}-${mm}-${yyyy}`;
    }
    return dateStr;
  };

  const getWorkMapForDisplay = () => {
    let rawMap = [];
    if (task.workMap && task.workMap.length > 0) {
      rawMap = task.workMap;
    } else {
      const mockMap = [
        {
          assignedTo: task.assignedTo,
          assignedToLabel: task.assignee || task.assignedToLabel || 'Staff',
          assignedBy: task.assignedBy || 'Creator',
          assignedAt: task.createdAt ? new Date(task.createdAt) : new Date(),
          action: 'ASSIGNED'
        }
      ];
      if (task.status === 'REASSIGNED') {
        mockMap.push({
          assignedTo: task.assignedTo,
          assignedToLabel: task.assignee || task.assignedToLabel || 'Staff',
          assignedBy: task.assignedBy || 'Creator',
          assignedAt: task.createdAt ? new Date(task.createdAt) : new Date(),
          action: 'REASSIGNED'
        });
      }
      if (task.status === 'COMPLETED') {
        mockMap.push({
          assignedTo: task.assignedTo,
          assignedToLabel: task.assignee || task.assignedToLabel || 'Staff',
          assignedBy: task.assignedBy || 'Creator',
          assignedAt: task.createdAt ? new Date(task.createdAt) : new Date(),
          action: 'COMPLETED'
        });
      }
      rawMap = mockMap;
    }

    const filteredMap = [];
    let lastAssignee = null;

    for (let i = 0; i < rawMap.length; i++) {
      const step = rawMap[i];
      if (
        step.action !== 'ASSIGNED' &&
        step.action !== 'REASSIGNED' &&
        step.action !== 'COMPLETED' &&
        step.action !== 'PENDING REVIEW' &&
        step.action !== 'UNDER REVIEW' &&
        step.action !== 'EXTENSION REQUESTED' &&
        step.action !== 'EXTENSION APPROVED' &&
        step.action !== 'EXTENSION REJECTED'
      ) {
        continue;
      }

      if (step.action === 'ASSIGNED') {
        filteredMap.push(step);
        lastAssignee = step.assignedTo;
      } else if (step.action === 'REASSIGNED') {
        // Only show reassigned if it is reassigned to another person
        if (step.assignedTo && lastAssignee && String(step.assignedTo) !== String(lastAssignee)) {
          filteredMap.push(step);
          lastAssignee = step.assignedTo;
        }
      } else if (
        step.action === 'COMPLETED' ||
        step.action === 'PENDING REVIEW' ||
        step.action === 'UNDER REVIEW' ||
        step.action === 'EXTENSION REQUESTED' ||
        step.action === 'EXTENSION APPROVED' ||
        step.action === 'EXTENSION REJECTED'
      ) {
        filteredMap.push(step);
      }
    }

    return filteredMap;
  };

  return (
    <div className="task-detail-overlay" onClick={onClose} role="presentation">
      <div
        className="task-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        <button type="button" className="task-detail-back" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 id="task-detail-title" className="task-detail-title">{task.title}</h2>
        <div className="task-detail-category-container">
          <span className="task-detail-category-badge">{task.category}</span>
          {task.categoryDetail && (
            <>
              <span className="task-detail-category-separator">/</span>
              <span className="task-detail-subcategory-badge">{task.categoryDetail}</span>
            </>
          )}
        </div>

        <div className="task-detail-divider" />

        <div className="task-detail-section-card">
          <div className="task-detail-grid-2">
            <DetailField
              label="Assigned By"
              primary={task.assignedBy}
              secondary={task.assignedByRole}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <DetailField
              label="Assigned Date"
              primary={task.assignedDate}
              secondary={task.assignedTime}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
            />
          </div>
        </div>

        <div className="task-detail-section-card">
          <div className="task-detail-grid-3">
            <DetailField
              label="Assigned To"
              primary={task.assignee}
              secondary={task.assigneeRole}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
            />
            <DetailField
              label="Start Date"
              primary={task.startDateDetail || task.startDate}
              secondary={task.startTime}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
            />
            <DetailField
              label="End Date"
              primary={task.endDateDetail || task.endDate}
              secondary={task.endTime}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
            />

            <DetailField
              label="Description"
              primary={desc}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="21" y1="10" x2="3" y2="10" />
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" />
                  <line x1="21" y1="18" x2="3" y2="18" />
                </svg>
              }
            />
            
            <DetailField
              label="Priority"
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              }
            >
              <div className="task-detail-priority">
                <span
                  className="task-detail-priority-dot"
                  style={{ background: PRIORITY_COLOR[task.priority] || '#9ca3af' }}
                />
                {task.priority}
              </div>
            </DetailField>

            <DetailField
              label="Status"
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
            >
              <div>
                <span className={`task-detail-status ${STATUS_CLASS[task.status] || ''}`}>
                  {task.status === 'IN PROGRESS' ? 'TO DO' : task.status}
                </span>
              </div>
            </DetailField>
          </div>
        </div>

        {shouldShowWorkMap && (
          <>
            <div className="task-detail-divider" />
            <div className="task-detail-workmap-section">
              <div className="task-detail-field__label">Task Work Flow Map</div>
              <div className="task-detail-workmap-timeline">
                {getWorkMapForDisplay().map((step, idx) => (
                  <div key={idx} className="task-detail-workmap-step">
                    <div className="task-detail-workmap-connector" />
                     <div className={`task-detail-workmap-node ${step.action.toLowerCase().replace(/\s+/g, '-')}`}>
                      <span className="task-detail-workmap-icon">
                        {step.action === 'ASSIGNED' ? '📌' :
                         step.action === 'REASSIGNED' ? '🔄' :
                         step.action === 'COMPLETED' ? '✅' :
                         step.action === 'PENDING REVIEW' ? '⏳' :
                         step.action === 'UNDER REVIEW' ? '🔍' :
                         step.action === 'EXTENSION REQUESTED' ? '⏳' :
                         step.action === 'EXTENSION APPROVED' ? '👍' : '❌'}
                      </span>
                    </div>
                    <div className="task-detail-workmap-content">
                      <div className="task-detail-workmap-action">
                        {step.action === 'ASSIGNED' ? 'First Assigned' :
                         step.action === 'REASSIGNED' ? 'Reassigned' :
                         step.action === 'COMPLETED' ? 'Completed' :
                         step.action === 'PENDING REVIEW' ? 'Submitted for Approval' :
                         step.action === 'UNDER REVIEW' ? 'Under Final Review' :
                         step.action === 'EXTENSION REQUESTED' ? 'Extension Requested' :
                         step.action === 'EXTENSION APPROVED' ? 'Extension Approved' : 'Extension Rejected'}
                      </div>
                      <div className="task-detail-workmap-details">
                        {step.action === 'COMPLETED' ? (
                          <>Completed by <strong>{step.assignedToLabel || 'Unknown User'}</strong></>
                        ) : step.action === 'PENDING REVIEW' ? (
                          <>Submitted for approval by <strong>{step.assignedToLabel || 'Unknown User'}</strong></>
                        ) : step.action === 'UNDER REVIEW' ? (
                          <>Submitted for final review by <strong>{step.assignedToLabel || 'Unknown User'}</strong></>
                        ) : step.action === 'REASSIGNED' ? (
                          <>Reassigned to <strong>{step.assignedToLabel}</strong> by <strong>{step.assignedBy}</strong></>
                        ) : step.action === 'EXTENSION REQUESTED' ? (
                          <>Extension requested to <strong>{formatDateStr(step.details)}</strong> by <strong>{step.assignedBy}</strong></>
                        ) : step.action === 'EXTENSION APPROVED' ? (
                          <>Extension approved (New Date: <strong>{formatDateStr(step.details)}</strong>) by <strong>{step.assignedBy}</strong></>
                        ) : step.action === 'EXTENSION REJECTED' ? (
                          <>Extension request rejected by <strong>{step.assignedBy}</strong></>
                        ) : (
                          <>Assigned to <strong>{step.assignedToLabel}</strong> by <strong>{step.assignedBy}</strong></>
                        )}
                      </div>
                      <div className="task-detail-workmap-time">
                        {new Date(step.assignedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {task.attachment ? (
          <>
            <div className="task-detail-divider" />
            <div className="task-detail-row">
              <DetailField label="ATTACHMENT">
                <a
                  href={`${baseUrl.baseUrl.replace(/\/$/, '')}${task.attachment}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 500 }}
                >
                  {task.attachmentName || 'View Attachment'}
                </a>
              </DetailField>
            </div>
          </>
        ) : null}

        {(() => {
          const proofAttachments = (task.attachments || []).filter(
            (att) => att.step === 'REASSIGNED' || att.step === 'UNDER REVIEW' || att.step === 'PENDING REVIEW'
          );
          if (proofAttachments.length === 0 && !task.reviewAttachment) return null;

          const seen = new Set();
          const uniqueProofs = [];
          
          if (task.reviewAttachment) {
            uniqueProofs.push({
              name: task.reviewAttachmentName || 'View Review Proof',
              url: task.reviewAttachment
            });
            seen.add(task.reviewAttachment);
            if (task.reviewAttachmentName) {
              seen.add(task.reviewAttachmentName);
            }
          }
          
          proofAttachments.forEach(att => {
            if (!seen.has(att.url) && !seen.has(att.name)) {
              const displayName = att.uploadedByName 
                ? `${att.name || 'Proof'} (by ${att.uploadedByName})`
                : (att.name || 'View Proof');
              uniqueProofs.push({
                name: displayName,
                url: att.url
              });
              seen.add(att.url);
              if (att.name) {
                seen.add(att.name);
              }
            }
          });

          if (uniqueProofs.length === 0) return null;

          return (
            <>
              <div className="task-detail-divider" />
              <div className="task-detail-row">
                <DetailField label="REVIEW PROOFS">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {uniqueProofs.map((proof, idx) => (
                      <a
                        key={idx}
                        href={`${baseUrl.baseUrl.replace(/\/$/, '')}${proof.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#7e22ce', textDecoration: 'underline', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        {proof.name}
                      </a>
                    ))}
                  </div>
                </DetailField>
              </div>
            </>
          );
        })()}

        {task.attachments && task.attachments.length > 0 ? (
          <>
            <div className="task-detail-divider" />
            <div className="task-detail-workmap-section">
              <div className="task-detail-field__label">Task Attachments History</div>
              <div className="task-detail-attachments-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '12px' }}>
                {task.attachments.map((att, idx) => (
                  <div key={att.id || idx} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f9fafb', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', background: att.step === 'ASSIGNED' ? '#e0f2fe' : att.step === 'REASSIGNED' ? '#fef3c7' : '#f3e8ff', color: att.step === 'ASSIGNED' ? '#0369a1' : att.step === 'REASSIGNED' ? '#d97706' : '#7e22ce', padding: '2px 8px', borderRadius: '9999px', textTransform: 'uppercase' }}>
                        {att.step === 'ASSIGNED' ? 'Initial' : att.step === 'REASSIGNED' ? 'Reassigned' : 'Review'}
                      </span>
                      <span style={{ fontSize: '10px', color: '#9ca3af' }}>{att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString() : ''}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={att.name}>
                      {att.name || 'attachment'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#4b5563' }}>
                      Uploaded by: <strong>{att.uploadedByName || 'Unknown'}</strong>
                    </div>
                    <a
                      href={`${baseUrl.baseUrl.replace(/\/$/, '')}${att.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="task-detail-action-btn"
                      style={{ fontSize: '11px', padding: '6px 12px', marginTop: '4px', textDecoration: 'none', background: '#111827', color: '#fff', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {task.status !== 'COMPLETED' && (canUpdateStatus || canReassign || isAssignedToMe) ? (
          <>
            <div className="task-detail-divider" />
            <div className="task-detail-actions-panel">
              <h3 className="task-detail-actions-title">Task Action Control Panel</h3>
              
              {(() => {
                const hasChain = task.approvalChain && task.approvalChain.length > 0;
                const currentApprover = hasChain ? task.approvalChain[task.approvalChainIndex ?? 0] : task.createdBy;
                const userIds = [user?.userId, user?._id, user?.id, user?.empID, user?.EmpId, user?.employeeId].filter(Boolean).map(String);
                const userNames = [user?.name, user?.username].filter(Boolean).map(n => n.trim().toLowerCase());

                const isCurrentApprover = Boolean(
                  userIds.includes(String(currentApprover)) ||
                  (currentApprover && userNames.some(n => String(currentApprover).toLowerCase().includes(n))) ||
                  (task.workMap && task.workMap.some(step => 
                    step.action === 'REASSIGNED' && 
                    userNames.some(n => String(step.assignedBy || '').toLowerCase().includes(n))
                  )) ||
                  userIds.includes(String(task.createdBy)) ||
                  (task.assignedBy && userNames.some(n => String(task.assignedBy).toLowerCase().includes(n))) ||
                  ['super_admin', 'admin', 'hr_admin'].includes(user?.role)
                );

                if ((task.status === 'PENDING REVIEW' || task.status === 'UNDER REVIEW') && isCurrentApprover) {
                  const isFinalStep = task.status === 'UNDER REVIEW' || !hasChain || (task.approvalChainIndex >= task.approvalChain.length - 1);

                  const handleApprove = async () => {
                    setUpdating(true);
                    try {
                      const token = localStorage.getItem('token');
                      const body = { action: 'APPROVE' };
                      if (approvalFile) {
                        const base64 = await getBase64(approvalFile);
                        body.fileAttachment = { name: approvalFile.name, base64 };
                      }
                      const res = await fetch(`${baseUrl.baseUrl}api/task/${task.id}/approve`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token && { Authorization: `Bearer ${token}` }),
                        },
                        body: JSON.stringify(body),
                      });
                      const json = await res.json();
                      if (!res.ok) {
                        throw new Error(json.message || 'Failed to approve task step');
                      }
                      toast.success(isFinalStep ? 'Task fully approved and completed!' : 'Task step approved & forwarded!');
                      setApprovalFile(null);
                      if (onRefresh) onRefresh();
                      onClose();
                    } catch (err) {
                      toast.error(err.message || 'Failed to approve step');
                    } finally {
                      setUpdating(false);
                    }
                  };

                  const handleReject = async () => {
                    setUpdating(true);
                    try {
                      const token = localStorage.getItem('token');
                      const res = await fetch(`${baseUrl.baseUrl}api/task/${task.id}/approve`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token && { Authorization: `Bearer ${token}` }),
                        },
                        body: JSON.stringify({ action: 'REJECT' }),
                      });
                      const json = await res.json();
                      if (!res.ok) {
                        throw new Error(json.message || 'Failed to reject task step');
                      }
                      toast.success('Task submission rejected.');
                      if (onRefresh) onRefresh();
                      onClose();
                    } catch (err) {
                      toast.error(err.message || 'Failed to reject step');
                    } finally {
                      setUpdating(false);
                    }
                  };

                  return (
                    <div className="task-detail-actions-row" style={{ flexDirection: 'column', gap: '10px' }}>
                      <div className="task-detail-action-group" style={{ width: '100%' }}>
                        <div className="task-detail-field__label">
                          {isFinalStep ? 'Review Submission & Final Approval' : 'Review Submission & Step Approval'}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0 12px 0' }}>
                          <input
                            type="file"
                            id="approval-attachment-file"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setApprovalFile(e.target.files[0]);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                          <label htmlFor="approval-attachment-file" className="task-detail-file-label" style={{ flex: 1, margin: 0, maxWidth: 'none', height: '38px', borderRadius: '8px', border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', cursor: 'pointer', background: '#fff' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: approvalFile ? '#10b981' : '#6b7280' }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                            </svg>
                            {approvalFile ? approvalFile.name : 'Attach review proof file (optional)…'}
                          </label>
                          {approvalFile && (
                            <button
                              type="button"
                              onClick={() => setApprovalFile(null)}
                              className="task-detail-action-btn"
                              style={{ background: '#ef4444', color: '#fff', padding: '0 12px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="task-detail-status-buttons">
                          <button
                            type="button"
                            className="task-detail-action-btn task-detail-btn-submit-review"
                            style={{ background: '#10b981', color: '#fff' }}
                            onClick={handleApprove}
                            disabled={updating}
                          >
                            {isFinalStep ? 'Approve & Complete' : 'Approve Step & Forward'}
                          </button>
                          <button
                            type="button"
                            className="task-detail-action-btn"
                            style={{ background: '#ef4444', color: '#fff', marginLeft: '8px' }}
                            onClick={handleReject}
                            disabled={updating}
                          >
                            Reject & Send Back
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="task-detail-actions-row">
                {canUpdateStatus && (
                  <div className="task-detail-action-group">
                    <div className="task-detail-field__label">Update Status</div>
                    <div className="task-detail-status-buttons">
                      <button
                        type="button"
                        className="task-detail-action-btn task-detail-btn-inprogress"
                        onClick={() => handleUpdateStatus('IN PROGRESS')}
                        disabled={updating}
                      >
                        To Do
                      </button>
                      <button
                        type="button"
                        className="task-detail-action-btn task-detail-btn-onhold"
                        onClick={() => handleUpdateStatus('ON HOLD')}
                        disabled={updating}
                      >
                        On Hold
                      </button>
                      <button
                        type="button"
                        className="task-detail-action-btn task-detail-btn-reassigned"
                        onClick={() => handleUpdateStatus('REASSIGNED')}
                        disabled={updating}
                      >
                        Reassigned
                      </button>
                      {!isAssignedToMe && (
                        <button
                          type="button"
                          className="task-detail-action-btn task-detail-btn-review"
                          onClick={handleReviewButtonClick}
                          disabled={updating}
                        >
                          Review
                        </button>
                      )}
                      {isAssignedToMe && (
                        <button
                          type="button"
                          className="task-detail-action-btn task-detail-btn-extension"
                          style={{ background: '#f59e0b', color: '#fff' }}
                          onClick={() => setShowExtensionForm(true)}
                          disabled={updating}
                        >
                          Extension
                        </button>
                      )}
                    </div>

                    {/* Inline review form — shown for anyone with canUpdateStatus when Review is toggled */}
                    {showReviewForm && (
                      <div className="task-detail-action-group" style={{ marginTop: '12px', width: '100%' }}>
                        <div className="task-detail-field__label">Submit for Review</div>
                        <div className="task-detail-review-form">
                          <input
                            type="file"
                            id="review-attachment-file"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                          />
                          <label htmlFor="review-attachment-file" className="task-detail-file-label">
                            {selectedFile ? selectedFile.name : 'Choose Proof File (optional)…'}
                          </label>
                          <button
                            type="button"
                            className="task-detail-action-btn task-detail-btn-submit-review"
                            onClick={handleSubmitForReview}
                            disabled={updating}
                          >
                            Submit
                          </button>
                          <button
                            type="button"
                            className="task-detail-action-btn"
                            style={{ background: '#6b7280', color: '#fff', marginLeft: '8px' }}
                            onClick={() => { setShowReviewForm(false); setSelectedFile(null); }}
                            disabled={updating}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
 
                {isAssignedToMe && (
                  <div className="task-detail-action-group">
                    <div className="task-detail-field__label">
                      {task.approvalChain && task.approvalChain.length > 0 ? 'Submit for Approval' : 'Submit for Review'}
                    </div>
                    <div className="task-detail-review-form">
                      <input
                        type="file"
                        id="review-attachment-file-assignee"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="review-attachment-file-assignee" className="task-detail-file-label">
                        {selectedFile ? selectedFile.name : 'Choose File…'}
                      </label>
                      <button
                        type="button"
                        className="task-detail-action-btn task-detail-btn-submit-review"
                        onClick={handleSubmitForReview}
                        disabled={updating || !selectedFile}
                      >
                        {task.approvalChain && task.approvalChain.length > 0 ? 'Submit for Approval' : 'Submit for Review'}
                      </button>
                    </div>
                  </div>
                )}

                {showExtensionForm && (
                  <div className="task-detail-action-group">
                    <div className="task-detail-field__label">Request Extension Date</div>
                    <div className="task-detail-review-form">
                      <input
                        type="date"
                        value={extensionDate}
                        onChange={(e) => setExtensionDate(e.target.value)}
                        className="task-detail-select"
                        style={{ height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #ccc' }}
                      />
                      <button
                        type="button"
                        className="task-detail-action-btn task-detail-btn-submit-review"
                        style={{ background: '#f59e0b', color: '#fff', marginLeft: '8px' }}
                        onClick={handleRequestExtension}
                        disabled={updating || !extensionDate}
                      >
                        Submit
                      </button>
                      <button
                        type="button"
                        className="task-detail-action-btn"
                        style={{ background: '#ef4444', color: '#fff', marginLeft: '8px' }}
                        onClick={() => { setShowExtensionForm(false); setExtensionDate(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
 
              {canReassign && (() => {
                const categoryOptions = [...categoriesList];
                if (selectedCategory && !categoryOptions.some(c => c.name === selectedCategory)) {
                  categoryOptions.push({ name: selectedCategory, subCategories: selectedSubCategory ? [selectedSubCategory] : [] });
                }
                const currentCategoryObj = categoriesList.find(c => c.name === selectedCategory);
                const subCategoriesList = currentCategoryObj ? currentCategoryObj.subCategories : [];

                return (
                  <div className="task-detail-actions-row mt-4" style={{ flexDirection: 'column', gap: '12px' }}>
                    <div className="task-detail-field__label">Reassign Task</div>
                    
                    <div className="task-detail-reassign-card">
                      <div className="task-detail-field__label">Reassign Task</div>
                      
                      <div className="task-detail-reassign-grid">
                        <div className="task-detail-action-group">
                          <div className="task-detail-field__label" style={{ fontSize: '10px', marginBottom: '4px' }}>
                            Assignee <span style={{ color: '#ef4444' }}>*</span>
                          </div>
                          <Select
                            options={assigneesList.map(opt => ({ ...opt, isDisabled: opt.type === 'group' }))}
                            value={assigneesList.find(opt => opt.value === selectedAssignee) || null}
                            onChange={(val) => setSelectedAssignee(val ? val.value : '')}
                            placeholder="Select Assignee..."
                            styles={selectStyles}
                            isSearchable={true}
                            isLoading={loadingAssignees}
                            isDisabled={updating}
                          />
                        </div>

                        <div className="task-detail-action-group">
                          <div className="task-detail-field__label" style={{ fontSize: '10px', marginBottom: '4px' }}>
                            Category <span style={{ color: '#ef4444' }}>*</span>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <select
                              value={selectedCategory}
                              onChange={handleCategoryChange}
                              className="task-detail-select"
                              disabled={updating}
                              style={{ appearance: 'none', paddingRight: '28px' }}
                            >
                              <option value="">Select Category...</option>
                              {categoryOptions.map((c) => (
                                <option key={c.name} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', paddingRight: '12px', color: '#6b7280' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="task-detail-action-group">
                          <div className="task-detail-field__label" style={{ fontSize: '10px', marginBottom: '4px' }}>
                            Sub Category <span style={{ color: '#ef4444' }}>*</span>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <select
                              value={selectedSubCategory}
                              onChange={(e) => setSelectedSubCategory(e.target.value)}
                              className="task-detail-select"
                              disabled={updating || !selectedCategory}
                              style={{ appearance: 'none', paddingRight: '28px' }}
                            >
                              <option value="">Select Sub Category...</option>
                              {subCategoriesList.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', paddingRight: '12px', color: '#6b7280' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="task-detail-action-group" style={{ gridColumn: 'span 3' }}>
                          <div className="task-detail-field__label" style={{ fontSize: '10px', marginBottom: '4px' }}>
                            Attachment <span style={{ color: '#ef4444' }}>*</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="file"
                              id="reassign-attachment-file"
                              onChange={handleReassignFileChange}
                              style={{ display: 'none' }}
                            />
                            <label htmlFor="reassign-attachment-file" className="task-detail-file-label" style={{ flex: 1, margin: 0, maxWidth: 'none', height: '38px', borderRadius: '8px', border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', cursor: 'pointer', background: '#fff' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: reassignFile ? '#2563eb' : '#6b7280' }}>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                              </svg>
                              {reassignFile ? reassignFile.name : 'Click to upload task completion attachment (required)…'}
                            </label>
                            {reassignFile && (
                              <button
                                type="button"
                                onClick={() => setReassignFile(null)}
                                className="task-detail-action-btn"
                                style={{ background: '#ef4444', color: '#fff', padding: '0 12px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', width: '100%' }}>
                        <button
                          type="button"
                          className="task-detail-action-btn task-detail-btn-reassign"
                          onClick={handleReassign}
                          disabled={updating || !selectedAssignee || !selectedCategory || !selectedSubCategory || !reassignFile}
                          style={{ minWidth: '120px' }}
                        >
                          Reassign
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        ) : null}

        {canEditDetails && (
          <>
            <div className="task-detail-divider" />
            <div className="task-detail-edit-section">
              {!isEditing ? (
                <button
                  type="button"
                  className="task-detail-action-btn task-detail-btn-edit-toggle"
                  onClick={startEditing}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit Task Details
                </button>
              ) : (
                <div className="task-detail-edit-form">
                  <h3 className="task-detail-actions-title">Edit Task Details</h3>
                  
                  <div className="task-detail-edit-grid">
                    <div className="task-detail-edit-field">
                      <label className="task-detail-field__label">Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="task-detail-select"
                        placeholder="Task Title"
                      />
                    </div>

                    <div className="task-detail-edit-field">
                      <label className="task-detail-field__label">Category</label>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="task-detail-select"
                        placeholder="Category"
                      />
                    </div>

                    <div className="task-detail-edit-field">
                      <label className="task-detail-field__label">Sub Category</label>
                      <input
                        type="text"
                        value={editSubCategory}
                        onChange={(e) => setEditSubCategory(e.target.value)}
                        className="task-detail-select"
                        placeholder="Sub Category"
                      />
                    </div>

                    <div className="task-detail-edit-field">
                      <label className="task-detail-field__label">Assigned To</label>
                      <select
                        value={editAssignee}
                        onChange={(e) => setEditAssignee(e.target.value)}
                        className="task-detail-select"
                      >
                        <option value="">Select Assignee...</option>
                        {assigneesList.map((opt) => (
                          <option key={opt.value} value={opt.value} disabled={opt.type === 'group'}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="task-detail-edit-field">
                      <label className="task-detail-field__label">Priority</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        className="task-detail-select"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                        <option value="Not">None</option>
                      </select>
                    </div>

                    <div className="task-detail-edit-field">
                      <label className="task-detail-field__label">Deadline</label>
                      <input
                        type="date"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="task-detail-select"
                      />
                    </div>
                  </div>

                  <div className="task-detail-edit-field mt-4">
                    <label className="task-detail-field__label">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="task-detail-textarea"
                      placeholder="Task Description"
                      rows={3}
                    />
                  </div>



                  <div className="task-detail-edit-actions mt-6">
                    <button
                      type="button"
                      className="task-detail-action-btn task-detail-btn-submit-review"
                      onClick={handleSaveDetails}
                      disabled={updating}
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="task-detail-action-btn task-detail-btn-cancel"
                      onClick={() => setIsEditing(false)}
                      disabled={updating}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TaskDetailModal;
