import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import baseUrl from '../../api/api';
import './TaskDetailModal.css';

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
  REASSIGNED: 'task-detail-status--reassigned',
};

const DetailField = ({ label, primary, secondary, children }) => (
  <div className="task-detail-field">
    <div className="task-detail-field__label">{label}</div>
    {children || (
      <>
        <div className="task-detail-field__primary">{primary}</div>
        {secondary ? <div className="task-detail-field__secondary">{secondary}</div> : null}
      </>
    )}
  </div>
);

const TaskDetailModal = ({ task, onClose, onRefresh }) => {
  const user = useSelector((state) => state.auth.user);
  const isAssignedToMe = task && task.assignedTo === user?.userId;
  const isAdmin = user?.role && user?.role !== 'employee' && user?.role !== 'user';
  const canReassign = isAssignedToMe || isAdmin;
  const isMyStore = user?.locCode && task?.storeCode === `Z-${user.locCode}`;
  const canUpdateStatus = isAssignedToMe || isMyStore || isAdmin;
  const isTaskCreator = task?.createdBy === user?.userId;
  const shouldShowWorkMap = isAdmin || isTaskCreator;
  const canEditDetails = (isAdmin || isTaskCreator) && user?.role !== 'cluster_admin' && user?.role !== 'store_admin';

  const [selectedFile, setSelectedFile] = useState(null);
  const [assigneesList, setAssigneesList] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');

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
              admin: 5,
              hr_admin: 4,
              cluster_admin: 3,
              store_admin: 2,
              employee: 1,
              user: 1
            };
            const userRole = user?.role;
            const userRank = roleRanks[userRole] || 1;

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

  const handleSubmitForReview = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const body = { status: 'UNDER REVIEW' };

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
      toast.success('Task submitted for review successfully!');
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

  const handleReassign = async () => {
    if (!selectedAssignee) {
      toast.error('Please select an assignee');
      return;
    }
    const option = assigneesList.find((opt) => opt.value === selectedAssignee);
    if (!option) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl.baseUrl}api/task/${task.id}/reassign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          assignedTo: selectedAssignee,
          assignedToLabel: option.label,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to reassign task');
      }
      toast.success('Task reassigned successfully!');
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
        <p className="task-detail-category">{categoryLine}</p>

        <div className="task-detail-divider" />

        <div className="task-detail-row task-detail-row--2">
          <DetailField
            label="ASSIGNED BY :"
            primary={task.assignedBy}
            secondary={task.assignedByRole}
          />
          <DetailField
            label="ASSIGNED DATE :"
            primary={task.assignedDate}
            secondary={task.assignedTime}
          />
        </div>

        <div className="task-detail-divider" />

        <div className="task-detail-grid-3">
          <DetailField
            label="ASSIGNED TO"
            primary={task.assignee}
            secondary={task.assigneeRole}
          />
          <DetailField
            label="START DATE :"
            primary={task.startDateDetail || task.startDate}
            secondary={task.startTime}
          />
          <DetailField
            label="END DATE :"
            primary={task.endDateDetail || task.endDate}
            secondary={task.endTime}
          />

          <DetailField label="DESCRIPTION" primary={desc} />
          
          <DetailField label="PRIORITY">
            <div className="task-detail-priority">
              <span
                className="task-detail-priority-dot"
                style={{ background: PRIORITY_COLOR[task.priority] || '#9ca3af' }}
              />
              {task.priority}
            </div>
          </DetailField>

          <DetailField label="STATUS">
            <div>
              <span className={`task-detail-status ${STATUS_CLASS[task.status] || ''}`}>
                {task.status}
              </span>
            </div>
          </DetailField>
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
                         step.action === 'EXTENSION REQUESTED' ? '⏳' :
                         step.action === 'EXTENSION APPROVED' ? '👍' : '❌'}
                      </span>
                    </div>
                    <div className="task-detail-workmap-content">
                      <div className="task-detail-workmap-action">
                        {step.action === 'ASSIGNED' ? 'First Assigned' :
                         step.action === 'REASSIGNED' ? 'Reassigned' :
                         step.action === 'COMPLETED' ? 'Completed' :
                         step.action === 'EXTENSION REQUESTED' ? 'Extension Requested' :
                         step.action === 'EXTENSION APPROVED' ? 'Extension Approved' : 'Extension Rejected'}
                      </div>
                      <div className="task-detail-workmap-details">
                        {step.action === 'COMPLETED' ? (
                          <>Completed by <strong>{step.assignedToLabel || 'Unknown User'}</strong></>
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

        {task.reviewAttachment ? (
          <>
            <div className="task-detail-divider" />
            <div className="task-detail-row">
              <DetailField label="REVIEW PROOF">
                <a
                  href={`${baseUrl.baseUrl.replace(/\/$/, '')}${task.reviewAttachment}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#7e22ce', textDecoration: 'underline', fontWeight: 500 }}
                >
                  {task.reviewAttachmentName || 'View Review Proof'}
                </a>
              </DetailField>
            </div>
          </>
        ) : null}

        {task.status !== 'COMPLETED' && (canUpdateStatus || canReassign || isAssignedToMe) ? (
          <>
            <div className="task-detail-divider" />
            <div className="task-detail-actions-panel">
              <h3 className="task-detail-actions-title">Task Action Control Panel</h3>
              
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
                        In Progress
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
                    <div className="task-detail-field__label">Submit for Review</div>
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
                        Submit for Review
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
 
              {canReassign && (
                <div className="task-detail-actions-row mt-4">
                  <div className="task-detail-action-group" style={{ width: '100%' }}>
                    <div className="task-detail-field__label">Reassign Task</div>
                    <div className="task-detail-reassign-form">
                      <select
                        value={selectedAssignee}
                        onChange={(e) => setSelectedAssignee(e.target.value)}
                        className="task-detail-select"
                        disabled={loadingAssignees || updating}
                      >
                        <option value="">Select Assignee...</option>
                        {assigneesList.map((opt) => (
                          <option key={opt.value} value={opt.value} disabled={opt.type === 'group'}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="task-detail-action-btn task-detail-btn-reassign"
                        onClick={handleReassign}
                        disabled={updating || !selectedAssignee}
                      >
                        Reassign
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

                  <div className="task-detail-edit-field mt-4">
                    <label className="task-detail-field__label">Additional Info</label>
                    <textarea
                      value={editAdditionalInfo}
                      onChange={(e) => setEditAdditionalInfo(e.target.value)}
                      className="task-detail-textarea"
                      placeholder="Additional Info"
                      rows={2}
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
