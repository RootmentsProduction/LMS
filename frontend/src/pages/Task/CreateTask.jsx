import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Select, { components } from 'react-select';
import SideNav from '../../components/SideNav/SideNav';
import { createTask } from '../../features/task/taskFetch';
import baseUrl from '../../api/api';
import './CreateTask.css';

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
const TIMES = ['12:00am','12:30am','1:00am','1:30am','2:00am','2:30am','3:00am','3:30am','4:00am','4:30am','5:00am','5:30am','6:00am','6:30am','7:00am','7:30am','8:00am','8:30am','9:00am','9:30am','10:00am','10:30am','11:00am','11:30am','12:00pm','12:30pm','1:00pm','1:30pm','2:00pm','2:30pm','3:00pm','3:30pm','4:00pm','4:30pm','5:00pm','5:30pm','6:00pm','6:30pm','7:00pm','7:30pm','8:00pm','8:30pm','9:00pm','9:30pm','10:00pm','10:30pm','11:00pm','11:30pm'];
const PRIORITIES = [
  { label: 'Urgent', color: '#ef4444' },
  { label: 'High',   color: '#f59e0b' },
  { label: 'Normal', color: '#3b82f6' },
  { label: 'Low',    color: '#9ca3af' },
];

const CheckboxOption = (props) => {
  return (
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
};

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
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#374151',
    fontFamily: "DM Sans, sans-serif",
    fontSize: '12px',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#9ca3af',
    '&:hover': {
      backgroundColor: '#e5e7eb',
      color: '#374151',
    },
  }),
};

const lbl = { fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' };
const req = { color: '#ef4444' };


const getCurrentDate = () => new Date().toISOString().split('T')[0];

const getCurrentTime = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strMinutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${strMinutes}${ampm}`;
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
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      marginTop: '4px',
    }}>
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

const DateInput = ({ value, onChange, required }) => {
  const inputRef = useRef(null);

  const handleContainerClick = () => {
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
      className="custom-date-container"
      style={{ position: 'relative', cursor: 'pointer', width: '100%' }}
    >
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="premium-input"
        style={{ paddingRight: '40px', cursor: 'pointer' }}
      />
      <div style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#6b7280',
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



const CreateTask = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [mode, setMode] = useState('task');
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const token = localStorage.getItem('token');

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

          const filtered = rawAssignees
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
          setAssigneeOptions(filtered);
        }
      } catch (err) {
        console.error('Error fetching assignees:', err);
      } finally {
        setLoadingAssignees(false);
      }
    };
    fetchAssignees();
  }, [token, user?.role]);

  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: '',
    subCategory: '',
    assignedTo: [],
    deadline: getCurrentDate(),
    description: '',
    additionalInfo: '',
    priority: 'Normal',
    file: null,
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isAuto = mode === 'auto';

  const handleAssigneeChange = (selected, actionMeta) => {
    const nextSelected = [...(selected || [])];
    const { action, option } = actionMeta;

    if (action === 'select-option' && option) {
      if (option.type === 'group') {
        if (option.value === 'all_employees') {
          assigneeOptions.forEach(opt => {
            if (opt.type === 'employee' && !nextSelected.some(s => s.value === opt.value)) {
              nextSelected.push(opt);
            }
          });
        } else if (option.value === 'all_hr_admins') {
          assigneeOptions.forEach(opt => {
            if (opt.type === 'admin' && opt.role === 'hr_admin' && !nextSelected.some(s => s.value === opt.value)) {
              nextSelected.push(opt);
            }
          });
        } else if (option.value === 'all_cluster_admins') {
          assigneeOptions.forEach(opt => {
            if (opt.type === 'admin' && opt.role === 'cluster_admin' && !nextSelected.some(s => s.value === opt.value)) {
              nextSelected.push(opt);
            }
          });
        } else if (option.value === 'all_store_admins') {
          assigneeOptions.forEach(opt => {
            if (opt.type === 'admin' && opt.role === 'store_admin' && !nextSelected.some(s => s.value === opt.value)) {
              nextSelected.push(opt);
            }
          });
        }
      }
    } else if ((action === 'deselect-option' || action === 'remove-value') && option) {
      if (option.type === 'group') {
        if (option.value === 'all_employees') {
          return set('assignedTo', nextSelected.filter(s => s.type !== 'employee' && s.value !== 'all_employees'));
        } else if (option.value === 'all_hr_admins') {
          return set('assignedTo', nextSelected.filter(s => !(s.type === 'admin' && s.role === 'hr_admin') && s.value !== 'all_hr_admins'));
        } else if (option.value === 'all_cluster_admins') {
          return set('assignedTo', nextSelected.filter(s => !(s.type === 'admin' && s.role === 'cluster_admin') && s.value !== 'all_cluster_admins'));
        } else if (option.value === 'all_store_admins') {
          return set('assignedTo', nextSelected.filter(s => !(s.type === 'admin' && s.role === 'store_admin') && s.value !== 'all_store_admins'));
        }
      } else {
        if (option.type === 'employee') {
          const idx = nextSelected.findIndex(s => s.value === 'all_employees');
          if (idx !== -1) nextSelected.splice(idx, 1);
        } else if (option.type === 'admin') {
          if (option.role === 'hr_admin') {
            const idx = nextSelected.findIndex(s => s.value === 'all_hr_admins');
            if (idx !== -1) nextSelected.splice(idx, 1);
          } else if (option.role === 'cluster_admin') {
            const idx = nextSelected.findIndex(s => s.value === 'all_cluster_admins');
            if (idx !== -1) nextSelected.splice(idx, 1);
          } else if (option.role === 'store_admin') {
            const idx = nextSelected.findIndex(s => s.value === 'all_store_admins');
            if (idx !== -1) nextSelected.splice(idx, 1);
          }
        }
      }
    } else if (action === 'clear') {
      return set('assignedTo', []);
    }

    const employees = assigneeOptions.filter(opt => opt.type === 'employee');
    const hrAdmins = assigneeOptions.filter(opt => opt.type === 'admin' && opt.role === 'hr_admin');
    const clusterAdmins = assigneeOptions.filter(opt => opt.type === 'admin' && opt.role === 'cluster_admin');
    const storeAdmins = assigneeOptions.filter(opt => opt.type === 'admin' && opt.role === 'store_admin');

    const hasAllEmployees = employees.length > 0 && employees.every(emp => nextSelected.some(s => s.value === emp.value));
    const hasAllHrAdmins = hrAdmins.length > 0 && hrAdmins.every(admin => nextSelected.some(s => s.value === admin.value));
    const hasAllClusterAdmins = clusterAdmins.length > 0 && clusterAdmins.every(admin => nextSelected.some(s => s.value === admin.value));
    const hasAllStoreAdmins = storeAdmins.length > 0 && storeAdmins.every(admin => nextSelected.some(s => s.value === admin.value));

    const groupAllEmployeesOpt = assigneeOptions.find(opt => opt.value === 'all_employees');
    const groupAllHrAdminsOpt = assigneeOptions.find(opt => opt.value === 'all_hr_admins');
    const groupAllClusterAdminsOpt = assigneeOptions.find(opt => opt.value === 'all_cluster_admins');
    const groupAllStoreAdminsOpt = assigneeOptions.find(opt => opt.value === 'all_store_admins');

    if (hasAllEmployees && groupAllEmployeesOpt && !nextSelected.some(s => s.value === 'all_employees')) {
      nextSelected.push(groupAllEmployeesOpt);
    }
    if (hasAllHrAdmins && groupAllHrAdminsOpt && !nextSelected.some(s => s.value === 'all_hr_admins')) {
      nextSelected.push(groupAllHrAdminsOpt);
    }
    if (hasAllClusterAdmins && groupAllClusterAdminsOpt && !nextSelected.some(s => s.value === 'all_cluster_admins')) {
      nextSelected.push(groupAllClusterAdminsOpt);
    }
    if (hasAllStoreAdmins && groupAllStoreAdminsOpt && !nextSelected.some(s => s.value === 'all_store_admins')) {
      nextSelected.push(groupAllStoreAdminsOpt);
    }

    set('assignedTo', nextSelected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const individualAssignees = (form.assignedTo || []).filter(assignee => assignee.type !== 'group');
    if (individualAssignees.length === 0) {
      toast.error('Please select at least one assignee.');
      return;
    }
    setSubmitting(true);
    try {
      let fileAttachment = null;
      if (form.file) {
        fileAttachment = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(form.file);
          reader.onload = () => resolve({ name: form.file.name, base64: reader.result });
          reader.onerror = (err) => reject(err);
        });
      }

      // Automatically fetch task creation date and time
      const currentStart = getCurrentDate();
      const currentStartT = getCurrentTime();

      for (const assignee of individualAssignees) {
        await createTask({
          mode: mode,
          title: form.title,
          category: form.category,
          subCategory: form.subCategory,
          assignedTo: assignee.value,
          assignedToLabel: assignee.label,
          startDate: currentStart,
          startTime: currentStartT,
          endDate: isAuto ? currentStart : form.deadline,
          endTime: isAuto ? currentStartT : '11:59pm',
          description: form.description,
          additionalInfo: form.additionalInfo,
          priority: form.priority,
          fileAttachment,
        });
      }
      toast.success(isAuto ? 'Auto task saved successfully!' : 'Task saved successfully!');
      navigate('/task');
    } catch (err) {
      toast.error(err.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "DM Sans, sans-serif" }}>
      <SideNav />

      <div className="ml-0 md:ml-[120px]" style={{ paddingTop: '24px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '40px' }}>
        
        {/* Form Container Card (wraps everything including Header) */}
        <div className="p-4 sm:p-8 bg-white rounded-2xl border border-gray-200 shadow-xs" style={{}}>
          
          {/* Header container inside the card */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8" style={{}}>
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
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Create & Assign New Task</h2>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0', fontFamily: 'DM Sans, sans-serif' }}>Track and manage all operational tasks across stores</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Row 1: Title, Category, Sub Category, Assigned To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" style={{}}>
              <div>
                <label style={lbl}>Task Title <span style={req}>*</span></label>
                <input 
                  type="text" 
                  placeholder="Enter task title" 
                  value={form.title} 
                  onChange={(e) => set('title', e.target.value)} 
                  required 
                  className="premium-input"
                />
              </div>
              <div>
                <label style={lbl}>Category <span style={req}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={form.category} 
                    onChange={(e) => {
                      set('category', e.target.value);
                      set('subCategory', '');
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
              <div>
                <label style={lbl}>Sub Category <span style={req}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={form.subCategory} 
                    onChange={(e) => set('subCategory', e.target.value)} 
                    required 
                    className="premium-input"
                    style={{ cursor: 'pointer', appearance: 'none', paddingRight: '28px' }}
                  >
                    <option value="">Select Options</option>
                    {(SUB_CATEGORIES[form.category] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', paddingRight: '12px', color: '#6b7280' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label style={lbl}>Assigned To <span style={req}>*</span></label>
                <Select
                  isMulti
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  components={{ Option: CheckboxOption }}
                  options={assigneeOptions}
                  value={form.assignedTo}
                  onChange={handleAssigneeChange}
                  placeholder={loadingAssignees ? "Loading options..." : "Select Options"}
                  styles={selectStyles}
                />
              </div>
            </div>

            {/* Row 2: Deadline, Attach File, Priority */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4" style={{}}>
              {!isAuto ? (
                <div className="col-span-1 md:col-span-3" style={{}}>
                  <label style={lbl}>Deadline <span style={req}>*</span></label>
                  <DateInput 
                    value={form.deadline} 
                    onChange={(val) => set('deadline', val)} 
                    required 
                  />
                </div>
              ) : null}

              <div className="col-span-1 md:col-span-3" style={{}}>
                <label style={lbl}>Attach File</label>
                <FileField file={form.file} onChange={(f) => set('file', f)} />
              </div>

              <div className={isAuto ? "col-span-1 md:col-span-9" : "col-span-1 md:col-span-6"} style={{}}>
                <label style={lbl}>Select Priority <span style={req}>*</span></label>
                <PriorityPicker value={form.priority} onChange={(v) => set('priority', v)} />
              </div>
            </div>

            {/* Row 3: Description, Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{}}>
              <div>
                <label style={lbl}>Task Description <span style={req}>*</span></label>
                <textarea 
                  placeholder="Enter task description" 
                  value={form.description} 
                  onChange={(e) => set('description', e.target.value)} 
                  required 
                  rows={4} 
                  className="premium-textarea"
                />
              </div>
              <div>
                <label style={lbl}>Additional Information</label>
                <textarea 
                  placeholder="Enter additional information" 
                  value={form.additionalInfo} 
                  onChange={(e) => set('additionalInfo', e.target.value)} 
                  rows={4} 
                  className="premium-textarea"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '8px' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: '#111827',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {submitting ? 'Saving…' : 'Save Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTask;
