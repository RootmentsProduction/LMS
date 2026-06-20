import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Select, { components } from 'react-select';
import SideNav from '../../components/SideNav/SideNav';
import { createAutoTask } from '../../features/task/taskFetch';
import baseUrl from '../../api/api';
import './AutoTask.css';

const CATEGORIES = [
  'REPORTS&PERFORMANCE',
  'STORE HYGIENE&CLEANING',
  'INVENTORY AUDIT&MANAGEMENT',
  'EMPLOYEE MANAGEMENT&DEVELOPMENT',
  'MAINTENANCE'
];

const SUB_CATEGORIES = {
  'REPORTS&PERFORMANCE': [
    'POS REPORTS',
    'PERFORMANCE REPORTS',
    'RECORDS&DOCUMENTS'
  ],
  'STORE HYGIENE&CLEANING': [
    'DEEP CLEANING',
    'VISUAL MERCHANDISING',
    'PRODUCT CLEANING'
  ],
  'INVENTORY AUDIT&MANAGEMENT': [
    'STOCK VALUATION&VERIFICATION',
    'INTER STORE STOCK TRANSFER'
  ],
  'EMPLOYEE MANAGEMENT&DEVELOPMENT': [
    'EMPLOYEE TRAININGS',
    'EMPLOYEE PERFORMANCE REVIEW',
    'EMPLOYEE SPECIFIC TASK'
  ],
  'MAINTENANCE': [
    'ELECTRICAL',
    'PLUMBING',
    'CLEANING'
  ]
};

const TIMES = [
  '12:00am','12:30am','01:00am','01:30am','02:00am','02:30am','03:00am','03:30am',
  '04:00am','04:30am','05:00am','05:30am','06:00am','06:30am','07:00am','07:30am',
  '08:00am','08:30am','09:00am','09:30am','10:00am','10:30am','11:00am','11:30am',
  '12:00pm','12:30pm','01:00pm','01:30pm','02:00pm','02:30pm','03:00pm','03:30pm',
  '04:00pm','04:30pm','05:00pm','05:30pm','06:00pm','06:30pm','07:00pm','07:30pm',
  '08:00pm','08:30pm','09:00pm','09:30pm','10:00pm','10:30pm','11:00pm','11:30pm'
];

const PRIORITIES = [
  { label: 'Urgent', color: '#ef4444' },
  { label: 'High',   color: '#f59e0b' },
  { label: 'Normal', color: '#3b82f6' },
  { label: 'Low',    color: '#9ca3af' },
];

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'cluster_admin', label: 'Cluster Admin' },
  { value: 'store_admin', label: 'Store Admin' },
  { value: 'employee', label: 'Staff' }
];

const WEEK_DAYS = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' }
];

const CheckboxOption = (props) => (
  <components.Option {...props}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <input
        type="checkbox"
        checked={props.isSelected}
        onChange={() => null}
        style={{
          cursor: 'pointer',
          width: '14px',
          height: '14px',
          accentColor: '#111827',
        }}
      />
      <span style={{ fontSize: '13px', color: '#374151', fontFamily: "DM Sans, sans-serif" }}>{props.label}</span>
    </div>
  </components.Option>
);

const selectStyles = {
  control: (base, state) => ({
    ...base,
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(17, 24, 39, 0.05)' : 'none',
    borderColor: state.isFocused ? '#111827' : '#e5e7eb',
    '&:hover': {
      borderColor: state.isFocused ? '#111827' : '#e5e7eb',
    },
    fontFamily: "DM Sans, sans-serif",
    fontSize: '13px',
    color: '#374151',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 8px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#f3f4f6' : state.isFocused ? '#f9fafb' : '#fff',
    color: '#374151',
    fontFamily: "DM Sans, sans-serif",
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    '&:active': {
      backgroundColor: '#f3f4f6',
    },
  }),
  multiValue: (base) => ({
    ...base,
    display: 'none', /* Custom tag rendering below instead of inline */
  }),
};

const PriorityPicker = ({ value, onChange }) => {
  const getActiveStyles = (label) => {
    switch (label) {
      case 'Urgent':
        return { background: '#fef2f2', border: '1.5px solid #ef4444', text: '#991b1b', fontWeight: 600 };
      case 'High':
        return { background: '#fffbeb', border: '1.5px solid #f59e0b', text: '#92400e', fontWeight: 600 };
      case 'Normal':
        return { background: '#eff6ff', border: '1.5px solid #3b82f6', text: '#1e40af', fontWeight: 600 };
      case 'Low':
        return { background: '#f9fafb', border: '1.5px solid #9ca3af', text: '#374151', fontWeight: 600 };
      default:
        return {};
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
      {PRIORITIES.map((p) => {
        const selected = value === p.label;
        const active = selected ? getActiveStyles(p.label) : {};
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.label)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '999px',
              border: selected ? active.border : '1px solid #e5e7eb',
              background: selected ? active.background : '#fff',
              fontSize: '13px',
              fontWeight: selected ? active.fontWeight : 500,
              color: selected ? active.text : '#374151',
              cursor: 'pointer',
              fontFamily: "DM Sans, sans-serif",
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
};

const FileField = ({ file, onChange }) => (
  <label
    className="premium-input"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      color: '#6b7280',
    }}
  >
    <span style={{ color: '#111827', fontWeight: 500 }}>Choose File</span>
    <span style={{ color: '#d1d5db' }}>|</span>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
      {file ? file.name : 'No file chosen'}
    </span>
    <input type="file" onChange={(e) => onChange(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
  </label>
);

const DateInput = ({ value, onChange, required, placeholder, disabled }) => {
  const inputRef = useRef(null);

  const handleContainerClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      try {
        inputRef.current.showPicker();
      } catch (err) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div 
      onClick={handleContainerClick}
      className={`custom-date-container ${disabled ? 'custom-date-container--disabled' : ''}`}
      style={{ position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', width: '100%' }}
    >
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="premium-input"
        style={{ 
          paddingRight: '40px', 
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          backgroundColor: disabled ? '#f3f4f6' : '#fff'
        }}
      />
      <div style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: disabled ? '#d1d5db' : '#6b7280',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
    </div>
  );
};



const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

const AutoTask = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = useSelector((state) => state.auth.user);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Urgent');

  // Repeat Scheduling
  const [repeatType, setRepeatType] = useState('Daily');
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [startTime, setStartTime] = useState('09:00am');
  const [endDate, setEndDate] = useState('');
  const [weekDays, setWeekDays] = useState([]);
  const [monthDays, setMonthDays] = useState([]);
  const [repeatContinuously, setRepeatContinuously] = useState(true);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);

  const getSummaryText = () => {
    let text = '';
    if (repeatType === 'Daily') {
      text = `Repeats daily at ${startTime}`;
    } else if (repeatType === 'Weekly') {
      if (weekDays.length > 0) {
        text = `Repeats weekly on ${weekDays.map(d => d.label).join(', ')} at ${startTime}`;
      } else {
        text = `Repeats weekly at ${startTime}`;
      }
    } else if (repeatType === 'Monthly') {
      if (monthDays.length > 0) {
        const sortedDays = [...monthDays].sort((a, b) => a - b);
        text = `Repeats monthly on the ${sortedDays.join(', ')} at ${startTime}`;
      } else {
        text = `Repeats monthly at ${startTime}`;
      }
    }
    
    if (endDate) {
      text += ` until ${formatDateStr(endDate)}`;
    } else if (repeatContinuously) {
      text += ' continuously';
    }
    return text;
  };

  // Assignment states
  const [assignTo, setAssignTo] = useState('store'); // Default to store like mockup
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState([]);

  useEffect(() => {
    if (user?.role === 'store_admin') {
      setAssignTo('individual');
    } else if (user?.role === 'cluster_admin') {
      setAssignTo('store');
    }
  }, [user?.role]);

  // Loaded Options
  const [storeOptions, setStoreOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  
  // Footer state
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch branches/stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch/public`);
        if (response.ok) {
          const json = await response.json();
          const formatted = (json.data || []).map(b => ({
            value: b.workingBranch,
            label: b.workingBranch
          }));
          setStoreOptions(formatted);
        }
      } catch (err) {
        console.error('Error fetching stores:', err);
      }
    };
    fetchStores();
  }, []);

  // Fetch individual employees
  useEffect(() => {
    const fetchAssignees = async () => {
      setLoadingAssignees(true);
      try {
        const response = await fetch(`${baseUrl.baseUrl}api/task/assignees`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        if (response.ok) {
          const json = await response.json();
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

          const filteredAndFormatted = (json.data || [])
            .filter(opt => opt.type !== 'group')
            .filter(opt => {
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
          setAssigneeOptions(filteredAndFormatted);
        }
      } catch (err) {
        console.error('Error fetching assignees:', err);
      } finally {
        setLoadingAssignees(false);
      }
    };
    fetchAssignees();
  }, [token, user?.role]);

  // Format Date from YYYY-MM-DD to DD-MM-YYYY
  const formatDateStr = (dateStr) => {
    if (!dateStr) return 'DD-MM-YYYY';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  };

  // Submit Handler — saves an AutoTaskTemplate (not individual tasks directly)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Recurrence validation
    if (repeatType === 'Weekly' && weekDays.length === 0) {
      toast.error('Please select at least one weekday.');
      return;
    }
    if (repeatType === 'Monthly' && monthDays.length === 0) {
      toast.error('Please select at least one day of the month.');
      return;
    }

    // Client-side validation for assignment targets
    if (assignTo === 'store' && selectedStores.length === 0) {
      toast.error('Please select at least one store.');
      return;
    }
    if (assignTo === 'role' && selectedRoles.length === 0) {
      toast.error('Please select at least one role.');
      return;
    }
    if (assignTo === 'individual' && selectedIndividuals.length === 0) {
      toast.error('Please select at least one employee.');
      return;
    }

    setSubmitting(true);

    try {
      // Convert file to base64 if present
      let fileAttachment = null;
      if (file) {
        fileAttachment = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload  = () => resolve({ name: file.name, base64: reader.result });
          reader.onerror = (err) => reject(err);
        });
      }

      // Map form state to AutoTaskTemplate payload
      const payload = {
        title:       title.trim(),
        category,
        subCategory,
        description: description.trim(),
        priority,
        repeatType:  repeatType.toLowerCase(),
        weekDays:    repeatType === 'Weekly' ? weekDays.map(d => d.value) : [],
        monthDays:   repeatType === 'Monthly' ? monthDays : [],
        startDate,
        startTime,
        endDate:     endDate || '',
        endTime:     '',
        // Map assignTo radio value → assignMode enum expected by backend
        assignMode: assignTo === 'employees' ? 'all_employees' : assignTo,
        selectedStores:  selectedStores.map(s => s.value),
        selectedRoles:   selectedRoles.map(r => r.value),
        selectedUsers:   selectedIndividuals.map(i => ({ id: i.value, label: i.label })),
        isActive,
        fileAttachment,
      };

      await createAutoTask(payload);

      toast.success('Auto Task Schedule saved successfully!');
      navigate('/task');
    } catch (err) {
      toast.error(err.message || 'Failed to save auto task schedule');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="auto-task-page">
      <SideNav />

      <div className="auto-task-wrapper">
        <div className="auto-task-card">
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                type="button"
                onClick={() => navigate('/task')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#f3f4f6',
                  border: 'none',
                  color: '#1f2937',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>Auto Task Schedule</h2>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>Create a recurring rule that keeps assigning this task until you pause it</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            
            {/* Row 1: Title, Category, Sub Category, Attach File */}
            <div className="auto-task-grid-4">
              <div className="auto-task-field">
                <label className="auto-task-label">Task Title<span className="auto-task-req">*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter task title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                  className="premium-input"
                />
              </div>

              <div className="auto-task-field">
                <label className="auto-task-label">Category<span className="auto-task-req">*</span></label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={category} 
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSubCategory('');
                    }} 
                    required 
                    className="premium-input"
                    style={{ cursor: 'pointer', appearance: 'none', paddingRight: '28px' }}
                  >
                    <option value="">Select Options</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', paddingRight: '12px', color: '#6b7280' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="auto-task-field">
                <label className="auto-task-label">Sub Category<span className="auto-task-req">*</span></label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={subCategory} 
                    onChange={(e) => setSubCategory(e.target.value)} 
                    required 
                    className="premium-input"
                    style={{ cursor: 'pointer', appearance: 'none', paddingRight: '28px' }}
                  >
                    <option value="">Select Options</option>
                    {(SUB_CATEGORIES[category] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', paddingRight: '12px', color: '#6b7280' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="auto-task-field">
                <label className="auto-task-label">Attach File</label>
                <FileField file={file} onChange={setFile} />
              </div>
            </div>

            {/* Row 2: Description, Priority */}
            <div className="auto-task-grid-12">
              <div className="auto-task-field col-span-1 md:col-span-6" style={{}}>
                <label className="auto-task-label">Task Description<span className="auto-task-req">*</span></label>
                <textarea 
                  placeholder="Enter task description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required 
                  rows={4} 
                  className="premium-textarea"
                />
              </div>

              <div className="auto-task-field col-span-1 md:col-span-6" style={{}}>
                <label className="auto-task-label">Select Priority<span className="auto-task-req">*</span></label>
                <PriorityPicker value={priority} onChange={setPriority} />
              </div>
            </div>

            <hr className="auto-task-divider" />

            {/* Row 3: Repeat Type, Repeat Continuously, and End Date & Time */}
            <div className="auto-task-grid-12">
              
              {/* Repeat Type Button Group */}
              <div className="auto-task-field col-span-1 md:col-span-4">
                <label className="auto-task-label">Repeat Type<span className="auto-task-req">*</span></label>
                <div className="repeat-type-group">
                  {['Daily', 'Weekly', 'Monthly'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setRepeatType(type);
                        if (type === 'Weekly') setIsWeeklyModalOpen(true);
                        if (type === 'Monthly') setIsMonthlyModalOpen(true);
                      }}
                      className={`repeat-btn ${repeatType === type ? 'repeat-btn--active' : ''}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeat Continuously Toggle & End Date & Time */}
              <div className="auto-task-field col-span-1 md:col-span-8">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '24px' }}>
                  
                  {/* Repeat Continuously Switch */}
                  <div className="active-toggle-wrap" style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Repeat Continuously</span>
                    <label className="active-switch-container">
                      <input
                        type="checkbox"
                        checked={repeatContinuously}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setRepeatContinuously(val);
                          if (val) {
                            setEndDate('');
                          }
                        }}
                        className="active-switch-input"
                      />
                      <span className="active-switch-slider"></span>
                    </label>
                  </div>

                  {/* End Date Picker */}
                  <div style={{ flex: '1 1 200px' }}>
                    <label className="auto-task-label">End Date & Time</label>
                    <DateInput 
                      value={endDate} 
                      onChange={(val) => {
                        setEndDate(val);
                        if (val) {
                          setRepeatContinuously(false);
                        }
                      }} 
                      placeholder="DD/MM/YYYY"
                      disabled={repeatContinuously}
                    />
                  </div>

                </div>
              </div>

            </div>

            {/* Recurrence Selection Previews */}
            {repeatType === 'Weekly' && (
              <div className="auto-task-grid-12" style={{ marginTop: '16px', marginBottom: '16px' }}>
                <div className="auto-task-field col-span-1 md:col-span-12">
                  <div className="recurrence-summary-row" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Days</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                        {weekDays.length > 0 ? weekDays.map(d => d.label).join(', ') : 'None selected'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWeeklyModalOpen(true)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                      title="Edit Days"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {repeatType === 'Monthly' && (
              <div className="auto-task-grid-12" style={{ marginTop: '16px', marginBottom: '16px' }}>
                <div className="auto-task-field col-span-1 md:col-span-12">
                  <div className="recurrence-summary-row" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Dates</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                        {monthDays.length > 0 ? [...monthDays].sort((a, b) => a - b).join(', ') : 'None selected'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMonthlyModalOpen(true)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                      title="Edit Dates"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Row 4: Assign to Type & Targets dropdown */}
            <div className="auto-task-grid-12" style={{ marginTop: '24px' }}>
              
              {/* Radio Selector */}
              <div className="auto-task-field col-span-1 md:col-span-4" style={{}}>
                <label className="auto-task-label">Assign to<span className="auto-task-req">*</span></label>
                <div className="assign-radio-group">
                  
                  {user?.role !== 'store_admin' && user?.role !== 'cluster_admin' && (
                    <label className="assign-radio-label">
                      <input 
                        type="radio" 
                        name="assignTo" 
                        value="employees"
                        checked={assignTo === 'employees'}
                        onChange={() => setAssignTo('employees')}
                        className="assign-radio-input"
                      />
                      All Employees
                    </label>
                  )}

                  {user?.role !== 'store_admin' && (
                    <label className="assign-radio-label">
                      <input 
                        type="radio" 
                        name="assignTo" 
                        value="store"
                        checked={assignTo === 'store'}
                        onChange={() => setAssignTo('store')}
                        className="assign-radio-input"
                      />
                      Store
                    </label>
                  )}

                  {user?.role !== 'store_admin' && user?.role !== 'cluster_admin' && (
                    <label className="assign-radio-label">
                      <input 
                        type="radio" 
                        name="assignTo" 
                        value="role"
                        checked={assignTo === 'role'}
                        onChange={() => setAssignTo('role')}
                        className="assign-radio-input"
                      />
                      Role
                    </label>
                  )}

                  <label className="assign-radio-label">
                    <input 
                      type="radio" 
                      name="assignTo" 
                      value="individual"
                      checked={assignTo === 'individual'}
                      onChange={() => setAssignTo('individual')}
                      className="assign-radio-input"
                    />
                    Individual
                  </label>

                </div>
              </div>

              {/* Dynamic Target Input Dropdown */}
              {assignTo !== 'employees' && (
                <div className="auto-task-field col-span-1 md:col-span-8" style={{}}>
                  <label className="auto-task-label">
                    {assignTo === 'store' && 'Store*'}
                    {assignTo === 'role' && 'Role*'}
                    {assignTo === 'individual' && 'Individual*'}
                  </label>

                  {assignTo === 'store' && (
                    <Select
                      isMulti
                      closeMenuOnSelect={false}
                      hideSelectedOptions={false}
                      components={{ Option: CheckboxOption }}
                      options={storeOptions}
                      value={selectedStores}
                      onChange={setSelectedStores}
                      placeholder="Select Stores"
                      styles={selectStyles}
                    />
                  )}

                  {assignTo === 'role' && (
                    <Select
                      isMulti
                      closeMenuOnSelect={false}
                      hideSelectedOptions={false}
                      components={{ Option: CheckboxOption }}
                      options={ROLES}
                      value={selectedRoles}
                      onChange={setSelectedRoles}
                      placeholder="Select Roles"
                      styles={selectStyles}
                    />
                  )}

                  {assignTo === 'individual' && (
                    <Select
                      isMulti
                      closeMenuOnSelect={false}
                      hideSelectedOptions={false}
                      components={{ Option: CheckboxOption }}
                      options={assigneeOptions}
                      value={selectedIndividuals}
                      onChange={setSelectedIndividuals}
                      placeholder={loadingAssignees ? "Loading employees..." : "Select Individuals"}
                      styles={selectStyles}
                    />
                  )}
                </div>
              )}

            </div>

            {/* Display list of badges/tags for selected stores/roles/individuals */}
            {assignTo === 'store' && selectedStores.length > 0 && (
              <div className="badge-tags-container">
                {selectedStores.map((store) => (
                  <div key={store.value} className="badge-tag">
                    {store.label}
                    <button
                      type="button"
                      className="badge-tag-remove"
                      onClick={() => setSelectedStores(selectedStores.filter(s => s.value !== store.value))}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {assignTo === 'role' && selectedRoles.length > 0 && (
              <div className="badge-tags-container">
                {selectedRoles.map((role) => (
                  <div key={role.value} className="badge-tag">
                    {role.label}
                    <button
                      type="button"
                      className="badge-tag-remove"
                      onClick={() => setSelectedRoles(selectedRoles.filter(r => r.value !== role.value))}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {assignTo === 'individual' && selectedIndividuals.length > 0 && (
              <div className="badge-tags-container">
                {selectedIndividuals.map((indiv) => (
                  <div key={indiv.value} className="badge-tag">
                    {indiv.label}
                    <button
                      type="button"
                      className="badge-tag-remove"
                      onClick={() => setSelectedIndividuals(selectedIndividuals.filter(i => i.value !== indiv.value))}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Row 5: Footer summary and active toggle */}
            <div className="auto-task-divider" style={{ margin: '40px 0 24px 0' }} />

            <div className="auto-task-actions">
              
              {/* Bottom Left: Summary and Save Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                
                {/* Summary Box */}
                <div className="auto-task-summary-card" style={{ maxWidth: '400px' }}>
                  <span className="summary-card-title">Auto Task Scheduled</span>
                  <span className="summary-card-text">
                    {getSummaryText()}
                  </span>
                </div>

                {/* Save Button */}
                <div>
                  <button
                    type="submit"
                    className="save-auto-task-btn"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Auto Task'}
                  </button>
                </div>
              </div>

            </div>

          </form>

        </div>
      </div>

      {/* Weekly Modal */}
      {isWeeklyModalOpen && (
        <div className="recurrence-modal-overlay">
          <div className="recurrence-modal-card">
            <div className="recurrence-modal-header">
              <h3>Select Week Days</h3>
              <button 
                type="button" 
                className="recurrence-modal-close" 
                onClick={() => setIsWeeklyModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="recurrence-modal-body">
              <Select
                isMulti
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                components={{ Option: CheckboxOption }}
                options={WEEK_DAYS}
                value={weekDays}
                onChange={setWeekDays}
                placeholder="Select Days"
                styles={selectStyles}
              />
              {weekDays.length > 0 && (
                <div className="badge-tags-container" style={{ marginTop: '16px' }}>
                  {weekDays.map((day) => (
                    <div key={day.value} className="badge-tag">
                      {day.label}
                      <button
                        type="button"
                        className="badge-tag-remove"
                        onClick={() => setWeekDays(weekDays.filter(d => d.value !== day.value))}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="recurrence-modal-footer">
              <button 
                type="button" 
                className="save-auto-task-btn" 
                onClick={() => setIsWeeklyModalOpen(false)}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Modal */}
      {isMonthlyModalOpen && (
        <div className="recurrence-modal-overlay">
          <div className="recurrence-modal-card" style={{ maxWidth: '420px' }}>
            <div className="recurrence-modal-header">
              <h3>Select Days of Month</h3>
              <button 
                type="button" 
                className="recurrence-modal-close" 
                onClick={() => setIsMonthlyModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="recurrence-modal-body">
              <div className="monthly-day-grid" style={{ justifyContent: 'center' }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const isSelected = monthDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`monthly-day-btn ${isSelected ? 'monthly-day-btn--selected' : ''}`}
                      onClick={() => {
                        if (isSelected) {
                          setMonthDays(monthDays.filter(d => d !== day));
                        } else {
                          setMonthDays([...monthDays, day]);
                        }
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="recurrence-modal-footer" style={{ marginTop: '24px' }}>
              <button 
                type="button" 
                className="save-auto-task-btn" 
                onClick={() => setIsMonthlyModalOpen(false)}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AutoTask;
