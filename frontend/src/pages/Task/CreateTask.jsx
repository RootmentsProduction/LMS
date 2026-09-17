import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Select, { components } from 'react-select';
import SideNav from '../../components/SideNav/SideNav';
import { createTask } from '../../features/task/taskFetch';
import baseUrl from '../../api/api';
import './CreateTask.css';

const SYSTEM_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'process_control_manager', label: 'Process Control Manager' },
  { value: 'office_admin', label: 'Office Admin' },
  { value: 'cluster_admin', label: 'Cluster Admin' },
  { value: 'store_admin', label: 'Store Admin' },
  { value: 'warehouse_admin', label: 'Warehouse Admin' },
  { value: 'employee', label: 'Employee' },
];
const TIMES = ['12:00am','12:30am','1:00am','1:30am','2:00am','2:30am','3:00am','3:30am','4:00am','4:30am','5:00am','5:30am','6:00am','6:30am','7:00am','7:30am','8:00am','8:30am','9:00am','9:30am','10:00am','10:30am','11:00am','11:30am','12:00pm','12:30pm','1:00pm','1:30pm','2:00pm','2:30pm','3:00pm','3:30pm','4:00pm','4:30pm','5:00pm','5:30pm','6:00pm','6:30pm','7:00pm','7:30pm','8:00pm','8:30pm','9:00pm','9:30pm','10:00pm','10:30pm','11:00pm','11:30pm'];
const PRIORITIES = [
  { label: 'Urgent', color: '#ef4444' },
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
            'super admin': 5,
            admin: 5,
            hr_admin: 4,
            'hr admin': 4,
            process_control_manager: 3,
            'process control manager': 3,
            office_admin: 3,
            'office admin': 3,
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
                if (designation === 'cluster admin' || designation === 'process control manager' || designation === 'process_control_manager' || designation === 'office admin' || designation === 'office_admin') return 3;
                if (designation === 'store admin' || designation === 'store_admin') return 2;
              }
            }
            return 1;
          };

          const filtered = rawAssignees
            .filter(opt => {
              if (opt.type === 'group') {
                if (opt.value === 'all_hr_admins' && userRank < 4) return false;
                if (opt.value === 'all_process_control_managers' && userRank < 3) return false;
                if (opt.value === 'all_office_admins' && userRank < 3) return false;
                if (opt.value === 'all_cluster_admins' && userRank < 3) return false;
                if (opt.value === 'all_store_admins' && userRank < 2) return false;
                return true;
              }
              
              if (['cluster_admin', 'process_control_manager', 'office_admin', 'store_admin', 'hr_admin'].includes(userRole)) {
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
    subCategories: [],
    assignedTo: [],
    deadline: getCurrentDate(),
    description: '',
    additionalInfo: '',
    priority: 'Urgent',
    file: null,
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isAuto = mode === 'auto';

  const [categoriesList, setCategoriesList] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatRoles, setNewCatRoles] = useState([]);
  const [newCatSubs, setNewCatSubs] = useState([]);
  const [subInputVal, setSubInputVal] = useState('');
  const [manageCategories, setManageCategories] = useState([]);
  const [inlineSubInputs, setInlineSubInputs] = useState({});

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/task-category?type=task`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const json = await response.json();
        setCategoriesList(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, [token]);

  const fetchManageCategories = useCallback(async () => {
    if (!['super_admin', 'admin'].includes(user?.role)) return;
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/task-category?manage=true&type=task`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const json = await response.json();
        setManageCategories(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching manage categories:', err);
    }
  }, [token, user?.role]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (showCategoryModal) {
      fetchManageCategories();
    }
  }, [showCategoryModal, fetchManageCategories]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/task-category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          name: newCatName.trim(),
          subCategories: newCatSubs,
          allowedRoles: newCatRoles,
          type: 'task'
        })
      });
      const json = await response.json();
      if (response.ok) {
        toast.success('Category added successfully!');
        setNewCatName('');
        setNewCatRoles([]);
        setNewCatSubs([]);
        setSubInputVal('');
        fetchManageCategories();
        fetchCategories();
      } else {
        toast.error(json.message || 'Failed to add category');
      }
    } catch (err) {
      toast.error('Failed to add category');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/task-category/${catId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        }
      });
      const json = await response.json();
      if (response.ok) {
        toast.success('Category deleted successfully!');
        fetchManageCategories();
        fetchCategories();
        const deletedCat = manageCategories.find(c => c._id === catId);
        if (deletedCat && form.category === deletedCat.name) {
          set('category', '');
          set('subCategories', []);
        }
      } else {
        toast.error(json.message || 'Failed to delete category');
      }
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  const handleAddSubCategoryToExisting = async (cat) => {
    const val = inlineSubInputs[cat._id]?.trim();
    if (!val) {
      toast.error('Subcategory name cannot be empty');
      return;
    }
    const updatedSubs = [...cat.subCategories, val];
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/task-category/${cat._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          subCategories: updatedSubs
        })
      });
      const json = await response.json();
      if (response.ok) {
        toast.success('Subcategory added!');
        setInlineSubInputs(p => ({ ...p, [cat._id]: '' }));
        fetchManageCategories();
        fetchCategories();
      } else {
        toast.error(json.message || 'Failed to add subcategory');
      }
    } catch (err) {
      toast.error('Failed to add subcategory');
    }
  };

  const handleDeleteSubCategoryFromExisting = async (cat, subIndex) => {
    const updatedSubs = cat.subCategories.filter((_, idx) => idx !== subIndex);
    try {
      const response = await fetch(`${baseUrl.baseUrl}api/task-category/${cat._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          subCategories: updatedSubs
        })
      });
      const json = await response.json();
      if (response.ok) {
        toast.success('Subcategory deleted!');
        fetchManageCategories();
        fetchCategories();
        if (form.category === cat.name) {
          const subCatName = cat.subCategories[subIndex];
          set('subCategories', (form.subCategories || []).filter(s => s.value !== subCatName));
        }
      } else {
        toast.error(json.message || 'Failed to delete subcategory');
      }
    } catch (err) {
      toast.error('Failed to delete subcategory');
    }
  };

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
        } else if (option.value === 'all_process_control_managers') {
          assigneeOptions.forEach(opt => {
            if (opt.type === 'admin' && opt.role === 'process_control_manager' && !nextSelected.some(s => s.value === opt.value)) {
              nextSelected.push(opt);
            }
          });
        } else if (option.value === 'all_office_admins') {
          assigneeOptions.forEach(opt => {
            if (opt.type === 'admin' && opt.role === 'office_admin' && !nextSelected.some(s => s.value === opt.value)) {
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
        } else if (option.value === 'all_process_control_managers') {
          return set('assignedTo', nextSelected.filter(s => !(s.type === 'admin' && s.role === 'process_control_manager') && s.value !== 'all_process_control_managers'));
        } else if (option.value === 'all_office_admins') {
          return set('assignedTo', nextSelected.filter(s => !(s.type === 'admin' && s.role === 'office_admin') && s.value !== 'all_office_admins'));
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
          } else if (option.role === 'process_control_manager') {
            const idx = nextSelected.findIndex(s => s.value === 'all_process_control_managers');
            if (idx !== -1) nextSelected.splice(idx, 1);
          } else if (option.role === 'office_admin') {
            const idx = nextSelected.findIndex(s => s.value === 'all_office_admins');
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
    const processControlManagers = assigneeOptions.filter(opt => opt.type === 'admin' && opt.role === 'process_control_manager');
    const officeAdmins = assigneeOptions.filter(opt => opt.type === 'admin' && opt.role === 'office_admin');
    const clusterAdmins = assigneeOptions.filter(opt => opt.type === 'admin' && opt.role === 'cluster_admin');
    const storeAdmins = assigneeOptions.filter(opt => opt.type === 'admin' && opt.role === 'store_admin');

    const hasAllEmployees = employees.length > 0 && employees.every(emp => nextSelected.some(s => s.value === emp.value));
    const hasAllHrAdmins = hrAdmins.length > 0 && hrAdmins.every(admin => nextSelected.some(s => s.value === admin.value));
    const hasAllProcessControlManagers = processControlManagers.length > 0 && processControlManagers.every(admin => nextSelected.some(s => s.value === admin.value));
    const hasAllOfficeAdmins = officeAdmins.length > 0 && officeAdmins.every(admin => nextSelected.some(s => s.value === admin.value));
    const hasAllClusterAdmins = clusterAdmins.length > 0 && clusterAdmins.every(admin => nextSelected.some(s => s.value === admin.value));
    const hasAllStoreAdmins = storeAdmins.length > 0 && storeAdmins.every(admin => nextSelected.some(s => s.value === admin.value));

    const groupAllEmployeesOpt = assigneeOptions.find(opt => opt.value === 'all_employees');
    const groupAllHrAdminsOpt = assigneeOptions.find(opt => opt.value === 'all_hr_admins');
    const groupAllProcessControlManagersOpt = assigneeOptions.find(opt => opt.value === 'all_process_control_managers');
    const groupAllOfficeAdminsOpt = assigneeOptions.find(opt => opt.value === 'all_office_admins');
    const groupAllClusterAdminsOpt = assigneeOptions.find(opt => opt.value === 'all_cluster_admins');
    const groupAllStoreAdminsOpt = assigneeOptions.find(opt => opt.value === 'all_store_admins');

    if (hasAllEmployees && groupAllEmployeesOpt && !nextSelected.some(s => s.value === 'all_employees')) {
      nextSelected.push(groupAllEmployeesOpt);
    }
    if (hasAllHrAdmins && groupAllHrAdminsOpt && !nextSelected.some(s => s.value === 'all_hr_admins')) {
      nextSelected.push(groupAllHrAdminsOpt);
    }
    if (hasAllProcessControlManagers && groupAllProcessControlManagersOpt && !nextSelected.some(s => s.value === 'all_process_control_managers')) {
      nextSelected.push(groupAllProcessControlManagersOpt);
    }
    if (hasAllOfficeAdmins && groupAllOfficeAdminsOpt && !nextSelected.some(s => s.value === 'all_office_admins')) {
      nextSelected.push(groupAllOfficeAdminsOpt);
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
    const selectedAssignees = form.assignedTo || [];
    if (selectedAssignees.length === 0) {
      toast.error('Please select at least one assignee.');
      return;
    }
    const selectedSubCategories = form.subCategories || [];
    if (selectedSubCategories.length === 0) {
      toast.error('Please select at least one subcategory.');
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

      for (const assignee of selectedAssignees) {
        for (const subCat of selectedSubCategories) {
          await createTask({
            mode: mode,
            title: form.category,
            category: form.category,
            subCategory: subCat.value,
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
            {['super_admin', 'admin'].includes(user?.role) && (
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                style={{
                  background: '#111827',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: "DM Sans, sans-serif",
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#374151'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#111827'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Manage Categories
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Row 1: Category, Sub Category, Assigned To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" style={{}}>
              <div>
                <label style={lbl}>Category <span style={req}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={form.category} 
                    onChange={(e) => {
                      set('category', e.target.value);
                      set('subCategories', []);
                    }} 
                    required 
                    className="premium-input"
                    style={{ cursor: 'pointer', appearance: 'none', paddingRight: '28px' }}
                  >
                    <option value="">Select Options</option>
                    {categoriesList.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
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
                <Select
                  isMulti
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  components={{ Option: CheckboxOption }}
                  options={((categoriesList.find(c => c.name === form.category)?.subCategories) || []).map((s) => ({ value: s, label: s }))}
                  value={form.subCategories}
                  onChange={(selected) => set('subCategories', selected || [])}
                  placeholder="Select Options"
                  styles={selectStyles}
                />
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

            {/* Row 3: Description */}
            <div className="grid grid-cols-1 gap-4" style={{}}>
              <div>
                <label style={lbl}>Task Description</label>
                <textarea 
                  placeholder="Enter task description" 
                  value={form.description} 
                  onChange={(e) => set('description', e.target.value)} 
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

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="cat-modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="cat-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="cat-modal-header">
              <h3 className="cat-modal-title">Manage Task Categories</h3>
              <button className="cat-modal-close-btn" onClick={() => setShowCategoryModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="cat-modal-content">
              {/* Add New Category Section */}
              <div className="cat-section">
                <h4 className="cat-section-title">Add New Category</h4>
                <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ ...lbl, marginBottom: '4px' }}>Category Name</label>
                    <input
                      type="text"
                      placeholder="e.g. MARKETING"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="premium-input"
                      style={{ height: '36px' }}
                    />
                  </div>

                  <div>
                    <label style={{ ...lbl, marginBottom: '4px' }}>Allowed Roles</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {SYSTEM_ROLES.map((role) => {
                        const checked = newCatRoles.includes(role.value);
                        return (
                          <label key={role.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setNewCatRoles(newCatRoles.filter(r => r !== role.value));
                                } else {
                                  setNewCatRoles([...newCatRoles, role.value]);
                                }
                              }}
                            />
                            {role.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ ...lbl, marginBottom: '4px' }}>Add Subcategory</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="e.g. CAMPAIGNS"
                        value={subInputVal}
                        onChange={(e) => setSubInputVal(e.target.value)}
                        className="premium-input"
                        style={{ height: '36px', flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (subInputVal.trim()) {
                            setNewCatSubs([...newCatSubs, subInputVal.trim()]);
                            setSubInputVal('');
                          }
                        }}
                        className="cat-btn-small"
                        style={{ height: '36px' }}
                      >
                        Add Sub
                      </button>
                    </div>
                    {newCatSubs.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {newCatSubs.map((sub, index) => (
                          <span key={index} className="cat-sub-tag">
                            {sub}
                            <button
                              type="button"
                              onClick={() => setNewCatSubs(newCatSubs.filter((_, i) => i !== index))}
                              className="cat-sub-delete-btn"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="cat-btn-small"
                    style={{ height: '38px', alignSelf: 'flex-start', marginTop: '4px' }}
                  >
                    Save Category
                  </button>
                </form>
              </div>

              {/* Existing Categories Section */}
              <div className="cat-section" style={{ marginTop: '10px' }}>
                <h4 className="cat-section-title">Existing Categories</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {manageCategories.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                      No categories found.
                    </div>
                  ) : (
                    manageCategories.map((cat) => (
                      <div key={cat._id} className="cat-item-card">
                        <div className="cat-item-header">
                          <div>
                            <span className="cat-item-name">{cat.name}</span>
                            <div className="cat-item-roles">
                              {cat.allowedRoles.map((roleVal) => {
                                const matchedRole = SYSTEM_ROLES.find(r => r.value === roleVal);
                                return (
                                  <span key={roleVal} className="cat-role-tag">
                                    {matchedRole ? matchedRole.label : roleVal}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="cat-delete-btn"
                            onClick={() => handleDeleteCategory(cat._id)}
                            title="Delete Category"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                          <label style={{ ...lbl, fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Subcategories</label>
                          <div className="cat-item-subs">
                            {cat.subCategories.length === 0 ? (
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>No subcategories</span>
                            ) : (
                              cat.subCategories.map((sub, idx) => (
                                <span key={idx} className="cat-sub-tag">
                                  {sub}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubCategoryFromExisting(cat, idx)}
                                    className="cat-sub-delete-btn"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                          
                          <div className="cat-inline-add-sub">
                            <input
                              type="text"
                              placeholder="New subcategory"
                              value={inlineSubInputs[cat._id] || ''}
                              onChange={(e) => setInlineSubInputs({ ...inlineSubInputs, [cat._id]: e.target.value })}
                              className="cat-input-small"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddSubCategoryToExisting(cat)}
                              className="cat-btn-small"
                              style={{ height: '32px' }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTask;
