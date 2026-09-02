import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import baseUrl, { formatStoreDisplayName } from "../../api/api";
import { FaChevronLeft, FaChevronRight, FaDownload } from 'react-icons/fa';
import * as XLSX from 'xlsx';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const BRAND_TOKENS = new Set(["zorucci", "grooms", "suitor", "guy", "sg"]);
function canonFixes(s) {
  return s.replace(/\bedap{1,2}a?l{1,3}y\b/g,"edappally").replace(/\bedap{1,2}a?l{1,3}i\b/g,"edappally")
    .replace(/\bmanjeri\b/g,"manjery").replace(/\bperinthalmana\b/g,"perinthalmanna")
    .replace(/\bkottakal\b/g,"kottakkal").replace(/\bkalpeta\b/g,"kalpetta").replace(/\bzoruc+i\b/g,"zorucci");
}
function norm(s) {
  return canonFixes(String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim());
}
function locationKey(name) { return norm(name).split(" ").filter(t=>t&&!BRAND_TOKENS.has(t)).join(" "); }

const STATUS_OPTIONS = [
  'New Walkin',
  'Loss',
  'Revisit',
  'Booked',
  'Rentout',
  'Return',
  'Trial',
  'Enquiry',
  'Reissue',
  'Cancelled',
  'Billed',
  'Bill Returned'
];

const EVENT_TYPE_OPTIONS = [
  'Hindu Function',
  'Christian Function',
  'Muslim Function',
  'Grooms Men',
  'Office or College',
  'Other Functions'
];

const matchEventType = (actualValue, targetFilter) => {
  if (!actualValue || actualValue === '-') return false;
  if (!targetFilter || targetFilter === 'All') return true;
  const normActual = String(actualValue).trim().toLowerCase();
  const normTarget = String(targetFilter).trim().toLowerCase();

  if (normActual === normTarget) return true;

  if (normTarget.includes('groom') && normActual.includes('groom')) return true;
  if ((normTarget.includes('office') || normTarget.includes('college')) && (normActual.includes('office') || normActual.includes('college'))) return true;
  if ((normTarget.includes('other') || normTarget.includes('others')) && (normActual.includes('other') || normActual.includes('others'))) return true;

  return false;
};

const NON_SALES_REASONS = new Set([
    'Product Already Booked',
    'Design Not Available',
    'Colour Not Available',
    'Design and Colour Not Available',
    'Model, Design and Colour Not Available',
    'Design and Color Unavailable',
    'Price',
    'Size',
    'Enquiry Without Groom and Bride',
    'Enquiry Without Groom/Bride',
    'Enquiry Without Trial',
    'Enquiry Without Trail',
    'Confirm Later'
]);

const HARDCODED_STORES = [
    'G-Edappally', 'G.Calicut', 'G.Chavakkad', 'G.Edappal', 'G.Kalpetta',
    'G.Kannur', 'G.Kottakkal', 'G.Kottayam', 'G.Manjeri', 'G.MG Road',
    'G.Palakkad', 'G.Perinthalmanna', 'G.Perumbavoor', 'G.Thrissur', 'G-Trivandrum',
    'G.Vadakara',
    'Z-Edapally1', 'Z- Edappal', 'Z.Kottakkal', 'Z.Perinthalmanna',
    'Dappr Squad', 'office', 'production', 'WAREHOUSE'
];


const getStatusColors = (statusStr) => {
  const colors = {
    'Booked':            { bg:'#dcfce7', color:'#16a34a' },
    'New Booking':       { bg:'#dcfce7', color:'#16a34a' },
    'Revisit Booking':   { bg:'#dcfce7', color:'#16a34a' },
    'Rentout':           { bg:'#fce7f3', color:'#be185d' },
    'Rent Out':          { bg:'#fce7f3', color:'#be185d' },
    'Booking & Rentout': { bg:'#fce7f3', color:'#be185d' },
    'Return':            { bg:'#fef3c7', color:'#d97706' },
    'Trial':             { bg:'#e0e7ff', color:'#4338ca' },
    'Loss':              { bg:'#fee2e2', color:'#dc2626' },
    'Revisit Loss':      { bg:'#fee2e2', color:'#dc2626' },
    'Cancel':            { bg:'#fee2e2', color:'#dc2626' },
    'Cancelled':         { bg:'#fee2e2', color:'#dc2626' },
    'Enquiry':           { bg:'#f3f4f6', color:'#6b7280' },
    'New Walkin':        { bg:'#dbeafe', color:'#2563eb' },
    'Reissue':           { bg:'#ede9fe', color:'#7c3aed' },
    'Billed':            { bg:'#f3e8ff', color:'#7e22ce' },
    'Bill Returned':     { bg:'#fae8ff', color:'#a21caf' }
  };
  const s = String(statusStr || '').trim();
  if (colors[s]) return colors[s];
  const priorityList = [
    'Cancelled', 'Cancel', 'Loss', 'Revisit Loss', 'Rentout', 'Rent Out', 
    'Return', 'Bill Returned', 'Booked', 'New Booking', 'Revisit Booking', 'Billed', 'New Walkin'
  ];
  for (const p of priorityList) {
    if (s.toLowerCase().includes(p.toLowerCase())) {
      return colors[p];
    }
  }
  return { bg: '#f3f4f6', color: '#6b7280' };
};

const handleDownloadAndView = (base64Data, filename = 'attachment') => {
  try {
    if (!base64Data) return;
    
    if (!base64Data.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = base64Data;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const parts = base64Data.split(',');
    if (parts.length < 2) return;
    
    const mimeMatch = parts[0].match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    
    const byteCharacters = atob(parts[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    window.open(blobUrl, '_blank');
  } catch (error) {
    console.error('Error downloading/viewing attachment:', error);
  }
};

// Helper: format a date string as plain text for Excel (avoids ########)
const fmtDate = (val) => {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).split('T')[0];
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch { return '-'; }
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const parseYMD = (dateStr) => {
    const parts = String(dateStr).split('-');
    return {
        year:  parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        day:   parseInt(parts[2], 10)
    };
};
const getISTDayRange = (dateStr) => {
    const { year, month, day } = parseYMD(dateStr);
    const startUTC       = new Date(Date.UTC(year, month - 1, day,     0, 0, 0, 0) - IST_OFFSET_MS);
    const nextDayStartUTC = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0) - IST_OFFSET_MS);
    return { startUTC, nextDayStartUTC };
};

const getCombinedStatus = (rental, shoe) => {
  const r = (rental || 'New Walkin').trim();
  const s = (shoe || '').trim();
  if (!s || s === '-' || s === 'None') return r;
  if (r === 'New Walkin' || r === '-') return s;
  return `${r}, ${s}`;
};

const getCombinedStateAt = (w, endDateStr, startDateStr, statusFilterOrList) => {
  if (!endDateStr) {
    return {
      status: w.status,
      rentalStatus: w.rentalStatus || 'New Walkin',
      shoeStatus: w.shoeStatus || '-',
      date: w.updatedAt || w.date
    };
  }

  // 1. Build chronological timeline of all states
  const timeline = [];
  let rentalStatus = 'New Walkin';
  let shoeStatus = '-';
  let initialDate = w.createdAt || w.date;
  
  timeline.push({
    status: getCombinedStatus(rentalStatus, shoeStatus),
    rentalStatus,
    shoeStatus,
    date: initialDate
  });

  // Collect explicit status milestone dates as fallback events
  const milestones = [];
  if (w.bookingDate) milestones.push({ status: 'Booked', date: w.bookingDate });
  if (w.rentoutDate) milestones.push({ status: 'Rentout', date: w.rentoutDate });
  if (w.returnDate) milestones.push({ status: 'Return', date: w.returnDate });
  if (w.cancelDate || w.cancellationDate) milestones.push({ status: 'Cancelled', date: w.cancelDate || w.cancellationDate });
  if (w.billedDate) milestones.push({ status: 'Billed', date: w.billedDate });
  if (w.billReturnedDate) milestones.push({ status: 'Bill Returned', date: w.billReturnedDate });
  if (w.lastStatusChangeDate && w.status) milestones.push({ status: w.status, date: w.lastStatusChangeDate });

  const rawEvents = [
    ...(w.statusHistory || []).map(h => ({ status: h.status, category: h.category, date: h.date })),
    ...milestones
  ];

  rawEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  const rentalStatuses = ['New Walkin', 'Booked', 'Rentout', 'Return', 'Cancelled', 'Cancel'];

  rawEvents.forEach(h => {
    const s = String(h.status || '').trim();
    const isRental = rentalStatuses.includes(s) || (h.category && h.category !== 'Sales');
    if (isRental) {
      rentalStatus = s;
    } else {
      shoeStatus = s;
    }
    timeline.push({
      status: getCombinedStatus(rentalStatus, shoeStatus),
      rentalStatus,
      shoeStatus,
      date: h.date
    });
  });

  // 2. Filter states by the endDate cutoff
  const { nextDayStartUTC } = getISTDayRange(endDateStr);
  const cutoff = nextDayStartUTC.getTime();
  const statesBeforeCutoff = timeline.filter(s => new Date(s.date).getTime() < cutoff);
  
  if (statesBeforeCutoff.length === 0) {
    return null; // did not exist yet
  }

  // 3. Resolve status filters (if any are active)
  let activeFilters = [];
  if (Array.isArray(statusFilterOrList)) {
    activeFilters = statusFilterOrList.filter(s => s && s !== 'All');
  } else if (statusFilterOrList && statusFilterOrList !== 'All') {
    activeFilters = [statusFilterOrList];
  }

  if (activeFilters.length > 0) {
    // Determine startBoundary UTC
    let startBoundary = 0;
    if (startDateStr) {
      const { startUTC } = getISTDayRange(startDateStr);
      startBoundary = startUTC.getTime();
    }

    const normalizedFilters = activeFilters.map(f => f.trim().toLowerCase());

    // Filter timeline states that fall within [startBoundary, cutoff) and match any filter
    const matchingStates = statesBeforeCutoff.filter(s => {
      const stateTime = new Date(s.date).getTime();
      if (stateTime < startBoundary) return false;

      const wStatus = String(s.status).trim().toLowerCase();
      return normalizedFilters.some(target => {
        if (target === 'cancelled' || target === 'cancel') {
          return wStatus.includes('cancel') || wStatus.includes('cancelled') || 
                 String(s.rentalStatus).toLowerCase().includes('cancel') || 
                 String(s.shoeStatus).toLowerCase().includes('cancel');
        } else {
          const parts = wStatus.split(',').map(p => p.trim());
          return parts.includes(target) || 
                 String(s.rentalStatus).trim().toLowerCase() === target || 
                 String(s.shoeStatus).trim().toLowerCase() === target;
        }
      });
    });

    if (matchingStates.length > 0) {
      return matchingStates[matchingStates.length - 1];
    } else {
      return null; // Does not match filter in date range
    }
  }

  // 4. Default: return the latest state before cutoff
  return statesBeforeCutoff[statesBeforeCutoff.length - 1];
};

const formatDateForFileName = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = String(parseInt(parts[2], 10));
    return `${day}-${month}-${year}`;
  }
  return dateStr;
};

/* ── Export to CSV & Excel ───────────────────────────────────────────────── */
const getExportRows = (data, getState) => {
  const headers = [
    '#', 
    'DATE', 
    'CUSTOMER', 
    'CONTACT', 
    'REPEAT COUNT', 
    'STATUS', 
    'FUNCTION DATE', 
    'FUNCTION TYPE', 
    'CATEGORY', 
    'PRODUCT TYPE', 
    'LOSS REASON', 
    'SUB CATEGORY', 
    'REMARKS', 
    'SIZE', 
    'COLOR', 
    'WORK TYPE',
    'PRODUCT CATEGORY',
    'WORK SIZE',
    'NOTES', 
    'STORE', 
    'STAFF', 
    'ATTACHMENT', 
    'BOOKING DATE', 
    'RENTOUT DATE', 
    'RETURN DATE', 
    'BILLED DATE', 
    'BILL RETURNED DATE',
    'NEXT VISIT DATE'
  ];

  const rows = data.map((w, i) => {
    const itemState = getState ? (getState(w) || w) : w;
    const productType = w.lossProductType || '-';
    const notesText = w.notes || '-';

    let displayLossReason = '-';
    let displaySubCategory = '-';

    if (itemState.status === 'Loss' || itemState.status === 'Revisit Loss') {
      const isSales = (w.lossProductType || '').toLowerCase().trim() === 'sales';

      if (w.lossReason && w.lossReason !== '-' && w.lossReason !== '') {
        displayLossReason = w.lossReason;
        if (w.lossSelectRemarks && w.lossSelectRemarks !== '-' && w.lossSelectRemarks !== '') {
          displayLossReason += ` (${w.lossSelectRemarks})`;
        }
      } else if (w.subCategory && NON_SALES_REASONS.has(w.subCategory)) {
        displayLossReason = w.subCategory;
        if (w.lossSelectRemarks && w.lossSelectRemarks !== '-' && w.lossSelectRemarks !== '') {
          displayLossReason += ` (${w.lossSelectRemarks})`;
        }
      } else if (w.lossSelectRemarks && w.lossSelectRemarks !== '-' && w.lossSelectRemarks !== '') {
        displayLossReason = w.lossSelectRemarks;
      }

      if (isSales) {
        displaySubCategory = w.subCategory || '-';
      }
    } else {
      displaySubCategory = w.subCategory || '-';
    }

    const walkinDate = itemState.date ? fmtDate(itemState.date) : (w.createdAt || w.date ? fmtDate(w.createdAt || w.date) : '-');
    const functionDate = w.functionDate ? fmtDate(w.functionDate) : '-';

    return [
      i + 1,
      walkinDate,
      w.customerName || '-',
      w.contact ? `+91 ${w.contact}` : '-',
      w.repeatCount || 1,
      itemState.status || '-',
      functionDate,
      w.functionType || '-',
      w.category || '-',
      productType,
      displayLossReason,
      displaySubCategory,
      w.remarks || '-',
      w.lossSize || '-',
      w.lossColour || '-',
      w.workType || '-',
      w.productCategory || w.workSize || '-',
      w.workSize || w.productCategory || '-',
      notesText,
      w.store || '-',
      w.staff || '-',
      w.attachment ? (w.attachmentName || 'Yes') : '-',
      fmtDate(w.bookingDate),
      fmtDate(w.rentoutDate),
      fmtDate(w.returnDate),
      fmtDate(w.billedDate),
      fmtDate(w.billReturnedDate),
      w.lossEnquiryRevisitDate ? fmtDate(w.lossEnquiryRevisitDate) : '-'
    ];
  });

  return { headers, rows };
};

const buildExportFilename = (filters = {}, ext = 'csv') => {
  const {
    selectedStores = [],
    selectedStatuses = [],
    selectedTableStatuses = [],
    startDate = '',
    endDate = '',
    filterStartDate = '',
    filterEndDate = ''
  } = filters;

  const validStores = (selectedStores || []).filter(s => s && s !== 'All');
  let storeStr = 'all store';
  if (validStores.length === 1) {
    storeStr = formatStoreDisplayName(validStores[0]) || validStores[0];
  } else {
    storeStr = 'all store';
  }

  const tableStatuses = (selectedTableStatuses || []).filter(s => s && s !== 'All');
  const generalStatuses = (selectedStatuses || []).filter(s => s && s !== 'All');
  const activeStatuses = tableStatuses.length > 0 ? tableStatuses : generalStatuses;

  let statusStr = 'all status';
  if (activeStatuses.length === 1) {
    statusStr = activeStatuses[0];
  } else if (activeStatuses.length > 1) {
    statusStr = activeStatuses.join('-');
  } else {
    statusStr = 'all status';
  }

  const sDate = (startDate || filterStartDate || '').trim();
  const eDate = (endDate || filterEndDate || '').trim();

  let dateStr = 'all time';
  if (sDate && eDate) {
    if (sDate === eDate) {
      dateStr = sDate;
    } else {
      dateStr = `${sDate}_to_${eDate}`;
    }
  } else if (sDate) {
    dateStr = `from_${sDate}`;
  } else if (eDate) {
    dateStr = `until_${eDate}`;
  } else {
    dateStr = 'all time';
  }

  const sanitize = (str) => String(str || '').replace(/[\/\\?%*:|"<>]/g, '-').trim();

  const cleanStore = sanitize(storeStr);
  const cleanStatus = sanitize(statusStr);
  const cleanDate = sanitize(dateStr);

  return `${cleanStore}_${cleanStatus}_report_${cleanDate}.${ext}`;
};

const exportCSV = (data, getState, filters = {}) => {
  const { headers, rows } = getExportRows(data, getState);

  const csv = [headers, ...rows].map((r, rowIdx) => r.map((c, colIdx) => {
    let s = String(c ?? '');
    // Strip any en/em dashes that were used as placeholders (use plain hyphen instead)
    s = s.replace(/\u2013|\u2014/g, '-');
    // Clean up any newlines to prevent row-splitting bugs in CSV files
    s = s.replace(/[\r\n]+/g, ' ');
    // Escape quotes as per standard CSV rules
    return `"${s.replace(/"/g, '""')}"`;
  }).join(',')).join('\n');

  let storeNameStr = 'ALL STORES';
  if (filters.selectedStores && filters.selectedStores.length === 1 && filters.selectedStores[0] !== 'All') {
    const selectedId = filters.selectedStores[0];
    // We assume branches is passed via filters or it falls back to empty
    const branchesArr = filters.branches || [];
    const bObj = branchesArr.find(b => String(b._id) === String(selectedId) || b.workingBranch === selectedId || norm(b.workingBranch) === norm(selectedId));
    if (bObj) {
      storeNameStr = formatStoreDisplayName(bObj.workingBranch);
    } else {
      storeNameStr = String(selectedId);
    }
  } else if (filters.selectedStores && filters.selectedStores.length > 1) {
    storeNameStr = `${filters.selectedStores.length} STORES`;
  }

  const sanitizedStoreName = String(storeNameStr || 'ALL STORES').toUpperCase().replace(/[/\\?%*:|"<>]/g, '').trim();

  const startFmt = formatDateForFileName(filters.startDate || filters.filterStartDate);
  const endFmt = formatDateForFileName(filters.endDate || filters.filterEndDate);
  
  let dateRangeStr = startFmt;
  if (startFmt && endFmt && startFmt !== endFmt) {
    dateRangeStr = `${startFmt} TO ${endFmt}`;
  }

  const filename = `${sanitizedStoreName} - WALKIN REPORT - ${dateRangeStr}`.trim() + '.csv';
  // Prefixing with UTF-8 BOM (\uFEFF) forces Excel to read the CSV as UTF-8 encoding
  const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); 
  a.href = url; 
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const exportExcel = (data, getState, filters = {}) => {
  const { headers, rows } = getExportRows(data, getState);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const colWidths = headers.map((h, i) => {
    let maxLen = h.length;
    rows.forEach(r => {
      const valStr = String(r[i] ?? '');
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
  });
  worksheet['!cols'] = colWidths;

  const filename = buildExportFilename(filters, 'xlsx');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Walkin Report');
  XLSX.writeFile(workbook, filename);
};
/* ── CustomSelect Dropdown Component ────────────────────────────────────────── */
const CustomSelect = ({
  id,
  label,
  options,
  value, // array of values (always multi)
  onChange,
  disabled,
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    String(opt.label || opt.value || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectOption = (optVal) => {
    const currentValues = Array.isArray(value) ? value : [];
    if (currentValues.includes(optVal)) {
      onChange(currentValues.filter(v => v !== optVal));
    } else {
      onChange([...currentValues, optVal]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(opt => opt.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    const currentValues = Array.isArray(value) ? value : [];
    if (currentValues.length === 0) return placeholder || 'All Selected';
    if (currentValues.length === options.length) return `All (${options.length}) Selected`;
    if (currentValues.length <= 2) {
      return options
        .filter(opt => currentValues.includes(opt.value))
        .map(opt => opt.label)
        .join(', ');
    }
    return `${currentValues.length} Selected`;
  };

  const isSelected = (optVal) => {
    const currentValues = Array.isArray(value) ? value : [];
    return currentValues.includes(optVal);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', fontFamily: "DM Sans, sans-serif" }}>
      {/* Label */}
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>
        {label}
      </span>

      {/* Trigger or Search input */}
      {isOpen ? (
        <div style={{ position: 'relative' }}>
          <input
            id={id ? `${id}-search-input` : undefined}
            autoFocus
            type="text"
            placeholder="Type to filter..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: '1px solid #111827',
              borderRadius: '8px',
              padding: '7px 32px 7px 12px',
              fontSize: '12px',
              color: '#374151',
              background: '#fff',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              minHeight: '32px'
            }}
          />
          <span
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: '12px',
              userSelect: 'none'
            }}
          >
            ✕
          </span>
        </div>
      ) : (
        <div
          id={id ? `${id}-trigger` : undefined}
          onClick={() => !disabled && setIsOpen(true)}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '12px',
            color: disabled ? '#9ca3af' : '#374151',
            background: disabled ? '#f3f4f6' : '#fff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: '32px',
            boxSizing: 'border-box',
            position: 'relative',
            userSelect: 'none'
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
            {getDisplayText()}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: 'transform 0.2s',
              color: '#6b7280'
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id={id ? `${id}-panel` : undefined}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
            border: '1px solid #e5e7eb',
            zIndex: 1000,
            padding: '8px',
            boxSizing: 'border-box'
          }}
        >
          {/* Header Controls (Select All / Clear All) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>
              {options.length > 0 ? `${value.length}/${options.length} Selected` : '0 Selected'}
            </span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '10px' }}>
              <span id={id ? `${id}-select-all` : undefined} onClick={handleSelectAll} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}>Select All</span>
              <span id={id ? `${id}-clear-all` : undefined} onClick={handleClearAll} style={{ color: '#ef4444', cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}>Clear All</span>
            </div>
          </div>

          {/* Options List */}
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '8px', fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>No results found</div>
            ) : (
              filteredOptions.map((opt, optIdx) => {
                const selected = isSelected(opt.value);
                return (
                  <div
                    key={opt.value}
                    id={id ? `${id}-opt-${optIdx}` : undefined}
                    onClick={() => handleSelectOption(opt.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: selected ? '#111827' : '#4b5563',
                      background: selected ? '#f3f4f6' : 'transparent',
                      cursor: 'pointer',
                      fontWeight: selected ? 600 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'space-between',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        readOnly
                        style={{
                          width: '12px',
                          height: '12px',
                          cursor: 'pointer',
                          accentColor: '#111827'
                        }}
                      />
                      <span>{opt.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};



const sortStoresGThenZ = (a, b) => {
  const getStoreStr = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val.trim();
    if (typeof val === "object") {
      return (val.name || val.storeName || val.workingBranch || val.label || "").trim();
    }
    return String(val).trim();
  };
  const strA = getStoreStr(a);
  const strB = getStoreStr(b);
  const isZ_A = /^z/i.test(strA);
  const isZ_B = /^z/i.test(strB);
  if (!isZ_A && isZ_B) return -1;
  if (isZ_A && !isZ_B) return 1;
  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
};

const WalkinReport = () => {
  const user  = useSelector(s => s.auth.user);
  const token = localStorage.getItem('token');

  const today = new Date().toISOString().split('T')[0];

  const [branches,  setBranches]  = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [formData, setFormData] = useState({ startDate: today, endDate: today });
  
  // Selected values states
  const [clusters, setClusters] = useState([]);
  const [selectedClusters, setSelectedClusters] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState([]);

  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportData,      setReportData]      = useState([]);
  const [tableSearch,     setTableSearch]     = useState('');
  const [selectedTableStatuses, setSelectedTableStatuses] = useState(['All']);
  const [isTableStatusOpen, setIsTableStatusOpen] = useState(false);
  const tableStatusRef = React.useRef(null);
  
  const [selectedTableEventTypes, setSelectedTableEventTypes] = useState(['All']);
  const [isTableEventTypeOpen, setIsTableEventTypeOpen] = useState(false);
  const tableEventTypeRef = React.useRef(null);

  const [currentPage,     setCurrentPage]     = useState(1);
  const [itemsPerPage,    setItemsPerPage]    = useState(50);
  const [isDropdownOpen,  setIsDropdownOpen]  = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tableStatusRef.current && !tableStatusRef.current.contains(e.target)) {
        setIsTableStatusOpen(false);
      }
      if (tableEventTypeRef.current && !tableEventTypeRef.current.contains(e.target)) {
        setIsTableEventTypeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* Fetch active clusters */
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const res = await fetch(`${baseUrl.baseUrl}api/admin/admin/list`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json?.data) ? json.data.filter(i => i.role === 'cluster_admin') : [];
          setClusters(list);
        }
      } catch (e) {
        console.error('Error fetching clusters:', e);
      }
    };
    if (token) fetchClusters();
  }, [token]);

  /* load branches only (employees loaded lazily) */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`${baseUrl.baseUrl}api/admin/accessible-stores`, { headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } });
        const json = await res.json();
        let list = Array.isArray(json?.stores) ? json.stores : (Array.isArray(json?.data) ? json.data : []);
        
        if (user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr_admin' || user?.role === 'telecaller') {
          const existingNames = new Set(list.map(b => b.workingBranch).filter(Boolean));
          const missing = HARDCODED_STORES.filter(s => !existingNames.has(s));
          list = [...list, ...missing.map(name => ({ workingBranch: name }))];
        }
        
        const seenWorkingBranches = new Set();
        const uniqueBranches = [];
        for (const b of list) {
          if (b?.workingBranch && !seenWorkingBranches.has(b.workingBranch)) {
            seenWorkingBranches.add(b.workingBranch);
            uniqueBranches.push(b);
          }
        }

        setBranches(uniqueBranches.sort(sortStoresGThenZ));
        if (user?.role === 'store_admin' && uniqueBranches.length > 0) {
          setSelectedStores([uniqueBranches[0].workingBranch]);
        }
      } catch(e){ console.error(e); }
      finally { setLoading(false); }
    };
    if (token) load();
  }, [token, user?.role]);

  // Scoped store options based on cluster selection
  const availableBranches = React.useMemo(() => {
    if (!selectedClusters || selectedClusters.length === 0) return branches;
    const assignedKeys = new Set();
    selectedClusters.forEach(clusterId => {
      const cAdmin = clusters.find(c => String(c._id) === String(clusterId));
      if (cAdmin && Array.isArray(cAdmin.branches)) {
        cAdmin.branches.forEach(b => {
          const key = locationKey(b.workingBranch || b.branchName || b);
          if (key) assignedKeys.add(key);
        });
      }
    });
    return branches.filter(b => assignedKeys.has(locationKey(b.workingBranch)));
  }, [branches, selectedClusters, clusters]);

  // Load all employees once to filter client-side (excluding office staff for walkin reports)
  const loadAllEmployees = async () => {
    try {
      const url = `${baseUrl.baseUrl}api/admin/accessible-employees?excludeOffice=true`;
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      const list = Array.isArray(json?.employees) ? json.employees : [];
      setEmployees(list);
    } catch (e) {
      console.error('Error loading employees:', e);
    }
  };

  useEffect(() => {
    if (token && branches.length > 0) {
      loadAllEmployees();
    }
  }, [token, branches.length]);

  // Cascading client-side employee filtering based on selected store(s) and accessible store scope
  const filteredEmployees = React.useMemo(() => {
    const isOfficeStaff = (emp) => {
      if (!emp) return true;
      const branchStr = (emp.workingBranch || emp.store || '').toLowerCase();
      const deptStr = (emp.department || '').toLowerCase();
      const desigStr = (emp.designation || emp.role || '').toLowerCase();
      const locStr = String(emp.locCode || '').trim();

      const nonSalesKeywords = ['office', 'production', 'warehouse', 'dappr squad', 'no store', 'telecaller'];
      if (['101', '102', '103', '555'].includes(locStr)) return true;
      if (nonSalesKeywords.some(k => branchStr.includes(k) || deptStr.includes(k) || desigStr.includes(k))) return true;

      return false;
    };

    const storeEmps = employees.filter(e => !isOfficeStaff(e));

    if (selectedStores.length > 0) {
      return storeEmps.filter(e => {
        if (!e.workingBranch) return false;
        const eBranches = e.workingBranch.split(',').map(b => b.trim());
        return eBranches.some(eb =>
          selectedStores.some(selStore => locationKey(eb) === locationKey(selStore))
        );
      });
    }

    if (availableBranches.length > 0) {
      const storeBranches = availableBranches.filter(b => !isOfficeStaff({ workingBranch: b.workingBranch }));
      const allowedKeys = new Set(storeBranches.map(b => locationKey(b.workingBranch)).filter(Boolean));
      
      if (allowedKeys.size > 0) {
        return storeEmps.filter(e => {
          if (!e.workingBranch) return false;
          const eBranches = e.workingBranch.split(',').map(b => b.trim());
          return eBranches.some(eb => allowedKeys.has(locationKey(eb)));
        });
      }
    }

    return storeEmps;
  }, [employees, selectedStores, availableBranches]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: 'updatedAt'
      });
      if (formData.startDate) params.append('activityStartDate', formData.startDate);
      if (formData.endDate) params.append('activityEndDate', formData.endDate);

      const res  = await fetch(`${baseUrl.baseUrl}api/walkin/list?${params.toString()}`, { headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        let data = json.data || [];
        
        // Filter by cluster(s)
        if (Array.isArray(selectedClusters) && selectedClusters.length > 0) {
          const assignedKeys = new Set();
          selectedClusters.forEach(clusterId => {
            const cAdmin = clusters.find(c => String(c._id) === String(clusterId));
            if (cAdmin && Array.isArray(cAdmin.branches)) {
              cAdmin.branches.forEach(b => {
                const key = locationKey(b.workingBranch || b.branchName || b);
                if (key) assignedKeys.add(key);
              });
            }
          });
          data = data.filter(w => assignedKeys.has(locationKey(w.store)));
        }

        // Filter by store(s)
        if (Array.isArray(selectedStores) && selectedStores.length > 0) {
          const selectedKeys = selectedStores.map(locationKey);
          data = data.filter(w => selectedKeys.includes(locationKey(w.store)));
        }
        
        // Filter by employee(s)
        if (Array.isArray(selectedEmployees) && selectedEmployees.length > 0) {
          data = data.filter(w => selectedEmployees.includes(w.staff));
        }
        
        if (Array.isArray(selectedStatuses) && selectedStatuses.length > 0) {
          data = data.filter(w => selectedStatuses.some(status => matchStatusAndDate(w, status)));
        }

        // Filter by Event Type(s)
        if (Array.isArray(selectedEventTypes) && selectedEventTypes.length > 0) {
          data = data.filter(w => {
            const ft = w.functionType || '-';
            return selectedEventTypes.some(sel => matchEventType(ft, sel));
          });
        }

        // Apply date range filter client-side to ensure no out-of-range walk-ins (e.g. matched by updatedAt only)
        data = data.filter(hasActivityInRange);

        // Sort descending by the reconstructed state date (latest activity first)
        data.sort((a, b) => {
          const getReportState = (item) => {
            if (Array.isArray(selectedStatuses) && selectedStatuses.length > 0) {
              return getCombinedStateAt(item, formData.endDate, formData.startDate, selectedStatuses) || item;
            }
            return getCombinedStateAt(item, formData.endDate) || item;
          };
          const stateA = getReportState(a);
          const stateB = getReportState(b);
          
          const getSortDate = (item, state) => {
            const rawDate = state?.date || item.createdAt;
            const dStr = getISTDateString(rawDate);
            return dStr || "1970-01-01";
          };

          const dateA = getSortDate(a, stateA);
          const dateB = getSortDate(b, stateB);
          
          if (dateB !== dateA) {
            return dateB.localeCompare(dateA); // Descending order (latest first)
          }
          
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        setReportData(data);
        setReportGenerated(true);
        setCurrentPage(1);
        setTableSearch('');
        setSelectedTableStatuses(['All']);
        setSelectedTableEventTypes(['All']);
      }
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  // Helper to safely format any date format to an IST YYYY-MM-DD string
  const getISTDateString = (dateVal) => {
    if (!dateVal) return null;
    try {
      if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        return dateVal;
      }
      if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}\s/.test(dateVal)) {
        return dateVal.split(' ')[0];
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return null;
      
      const istTime = d.getTime() + (5.5 * 60 * 60 * 1000);
      const istDate = new Date(istTime);
      const y = istDate.getUTCFullYear();
      const m = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const dayStr = String(istDate.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    } catch {
      return null;
    }
  };

  const isDateInFilterRange = (dateVal) => {
    const dStr = getISTDateString(dateVal);
    if (!dStr) return false;
    return dStr >= formData.startDate && dStr <= formData.endDate;
  };

  const hasActivityInRange = (w) => {
    if (isDateInFilterRange(w.createdAt)) return true;
    if (isDateInFilterRange(w.date)) return true;
    if (Array.isArray(w.statusHistory) && w.statusHistory.some(h => isDateInFilterRange(h.date))) return true;
    if (isDateInFilterRange(w.bookingDate)) return true;
    if (isDateInFilterRange(w.rentoutDate)) return true;
    if (isDateInFilterRange(w.returnDate)) return true;
    if (isDateInFilterRange(w.billedDate)) return true;
    if (isDateInFilterRange(w.billReturnedDate)) return true;
    if (isDateInFilterRange(w.cancelDate || w.cancellationDate)) return true;
    return false;
  };

  const matchStatusAndDate = (w, targetStatus) => {
    const state = getCombinedStateAt(w, formData.endDate, formData.startDate, targetStatus);
    return state !== null;
  };

  const getDisplayedState = (w) => {
    if (selectedTableStatuses.length > 0 && !selectedTableStatuses.includes('All')) {
      return getCombinedStateAt(w, formData.endDate, formData.startDate, selectedTableStatuses) || w;
    }
    if (Array.isArray(selectedStatuses) && selectedStatuses.length > 0) {
      return getCombinedStateAt(w, formData.endDate, formData.startDate, selectedStatuses) || w;
    }
    return getCombinedStateAt(w, formData.endDate) || w;
  };

  /* table-level filter */
  const displayed = reportData.filter(w => {
    const q = tableSearch.toLowerCase();
    const matchSearch = !q || w.customerName?.toLowerCase().includes(q) || w.contact?.includes(q) || w.staff?.toLowerCase().includes(q) || w.functionType?.toLowerCase().includes(q);
    const matchStatus = selectedTableStatuses.includes('All') || selectedTableStatuses.length === 0 || selectedTableStatuses.some(st => matchStatusAndDate(w, st));
    const matchEventTypeFilter = selectedTableEventTypes.includes('All') || selectedTableEventTypes.length === 0 || selectedTableEventTypes.some(et => matchEventType(w.functionType, et));
    return matchSearch && matchStatus && matchEventTypeFilter;
  });

  const totalPages   = itemsPerPage === 'All' ? 1 : Math.ceil(displayed.length / Number(itemsPerPage));
  const indexFirst   = itemsPerPage === 'All' ? 0 : (currentPage - 1) * Number(itemsPerPage);
  const currentItems = itemsPerPage === 'All' ? displayed : displayed.slice(indexFirst, indexFirst + Number(itemsPerPage));

  /* ── input style ── */
  const inp = { border:'1px solid #e5e7eb', borderRadius:'8px', padding:'7px 12px', fontSize:'12px', color:'#374151', outline:'none', background:'#fff', width:'100%', boxSizing:'border-box', fontFamily:"DM Sans, sans-serif" };
  const lbl = { fontSize:'11px', fontWeight:600, color:'#374151', marginBottom:'4px', display:'block' };

  return (
    <div style={{ minHeight:'100vh', background:'#f9fafb', fontFamily:"DM Sans, sans-serif" }}>
      <SideNav />
      <div className="md:hidden"><ModileNav /></div>

      <div className="ml-0 md:ml-[120px]" style={{ paddingTop:'24px', paddingLeft:'24px', paddingRight:'24px', paddingBottom:'40px' }}>

        {/* Page title */}
        <h1 style={{ fontSize:'22px', fontWeight:700, lineHeight:1.2, color:'#111827', margin:'0 0 20px' }}>Walk In Report</h1>

        {/* Filter card */}
        <div style={{ background:'#fff', borderRadius:'16px', border:'1px solid #f0f0f0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', padding:'20px', marginBottom:'20px', width:'100%', boxSizing:'border-box' }}>
          <form onSubmit={handleGenerate}>
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label style={lbl}>Start Date <span style={{color:'#ef4444'}}>*</span></label>
                <div style={{ position:'relative' }}>
                  <input type="date" name="startDate" required value={formData.startDate} onChange={e=>setFormData(p=>({...p,startDate:e.target.value}))} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>End Date <span style={{color:'#ef4444'}}>*</span></label>
                <input type="date" name="endDate" required value={formData.endDate} onChange={e=>setFormData(p=>({...p,endDate:e.target.value}))} style={inp} />
              </div>
              {(user?.role === 'super_admin' || user?.role === 'admin') && (
                <div>
                  <CustomSelect
                    id="cluster-select"
                    label={<span>Cluster <span style={{color:'#9ca3af', fontWeight:400}}>(Optional)</span></span>}
                    options={clusters.map(c => ({ value: c._id, label: c.name || c.username }))}
                    value={selectedClusters}
                    onChange={(val) => {
                      setSelectedClusters(val);
                      setSelectedStores([]);
                      setSelectedEmployees([]);
                    }}
                    placeholder="All Clusters"
                  />
                </div>
              )}
              <div>
                <CustomSelect
                  id="store-select"
                  label={<span>Store Name <span style={{color:'#9ca3af', fontWeight:400}}>(Optional)</span></span>}
                  options={availableBranches.map(b => ({ value: b.workingBranch, label: formatStoreDisplayName(b.workingBranch) }))}
                  value={selectedStores}
                  onChange={(val) => {
                    setSelectedStores(val);
                    setSelectedEmployees([]);
                  }}
                  disabled={user?.role === 'store_admin'}
                  placeholder="All Stores"
                />
              </div>
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3" style={{}}>
              <div>
                <CustomSelect
                  id="employee-select"
                  label={<span>Employee <span style={{color:'#9ca3af', fontWeight:400}}>(Optional)</span></span>}
                  options={filteredEmployees.map(e => ({ value: e.username, label: e.username }))}
                  value={selectedEmployees}
                  onChange={setSelectedEmployees}
                  placeholder="All Employees"
                />
              </div>
              <div>
                <CustomSelect
                  id="status-select"
                  label={<span>Status <span style={{color:'#9ca3af', fontWeight:400}}>(Optional)</span></span>}
                  options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
                  value={selectedStatuses}
                  onChange={setSelectedStatuses}
                  placeholder="All Status"
                />
              </div>
              <div>
                <CustomSelect
                  id="event-type-select"
                  label={<span>Event Type <span style={{color:'#9ca3af', fontWeight:400}}>(Optional)</span></span>}
                  options={EVENT_TYPE_OPTIONS.map(et => ({ value: et, label: et }))}
                  value={selectedEventTypes}
                  onChange={setSelectedEventTypes}
                  placeholder="All Event Types"
                />
              </div>
            </div>
            <button type="submit" style={{ background:'#111827', color:'#fff', border:'none', borderRadius:'8px', padding:'8px 20px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
              {loading ? 'Loading...' : 'Show Report'}
            </button>
          </form>
        </div>



        {/* Results table */}
        {reportGenerated && (
          <div style={{ background:'#fff', borderRadius:'16px', border:'1px solid #f0f0f0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', overflow:'hidden' }}>

            {/* Table toolbar */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid #f3f4f6' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                {/* Status Multi-Select pill dropdown */}
                <div ref={tableStatusRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsTableStatusOpen(!isTableStatusOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      color: '#374151',
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    <span>
                      {selectedTableStatuses.includes('All') || selectedTableStatuses.length === 0
                        ? 'Status : All'
                        : selectedTableStatuses.length === 1
                          ? `Status : ${selectedTableStatuses[0]}`
                          : `Statuses (${selectedTableStatuses.length})`}
                    </span>
                    <svg className={`h-4 w-4 text-gray-400 transition-transform ${isTableStatusOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isTableStatusOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', width: '200px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', zIndex: 50, padding: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', marginBottom: '6px', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ fontWeight: 700, color: '#6b7280', fontSize: '11px' }}>Select Status(es)</span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                          <button type="button" onClick={() => { setSelectedTableStatuses(['All']); setCurrentPage(1); }} style={{ color: '#2563eb', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer' }}>All</button>
                          <button type="button" onClick={() => { setSelectedTableStatuses(['All']); setCurrentPage(1); }} style={{ color: '#ef4444', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer' }}>Reset</button>
                        </div>
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
                          <input
                            type="checkbox"
                            checked={selectedTableStatuses.includes('All')}
                            onChange={() => { setSelectedTableStatuses(['All']); setCurrentPage(1); }}
                            style={{ cursor: 'pointer', accentColor: '#000' }}
                          />
                          <span>All Statuses</span>
                        </label>
                        {STATUS_OPTIONS.map((st) => {
                          const isChecked = selectedTableStatuses.includes(st);
                          return (
                            <label key={st} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setCurrentPage(1);
                                  if (selectedTableStatuses.includes('All')) {
                                    setSelectedTableStatuses([st]);
                                  } else {
                                    if (isChecked) {
                                      const next = selectedTableStatuses.filter(s => s !== st);
                                      setSelectedTableStatuses(next.length === 0 ? ['All'] : next);
                                    } else {
                                      setSelectedTableStatuses([...selectedTableStatuses, st]);
                                    }
                                  }
                                }}
                                style={{ cursor: 'pointer', accentColor: '#000' }}
                              />
                              <span>{st}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {/* Event Type Multi-Select pill dropdown */}
                <div ref={tableEventTypeRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsTableEventTypeOpen(!isTableEventTypeOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      color: '#374151',
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    <span>
                      {selectedTableEventTypes.includes('All') || selectedTableEventTypes.length === 0
                        ? 'Event Type : All'
                        : selectedTableEventTypes.length === 1
                          ? `Event Type : ${selectedTableEventTypes[0]}`
                          : `Event Types (${selectedTableEventTypes.length})`}
                    </span>
                    <svg className={`h-4 w-4 text-gray-400 transition-transform ${isTableEventTypeOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isTableEventTypeOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', width: '220px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', zIndex: 50, padding: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', marginBottom: '6px', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ fontWeight: 700, color: '#6b7280', fontSize: '11px' }}>Select Event Type(s)</span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                          <button type="button" onClick={() => { setSelectedTableEventTypes(['All']); setCurrentPage(1); }} style={{ color: '#2563eb', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer' }}>All</button>
                          <button type="button" onClick={() => { setSelectedTableEventTypes(['All']); setCurrentPage(1); }} style={{ color: '#ef4444', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer' }}>Reset</button>
                        </div>
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
                          <input
                            type="checkbox"
                            checked={selectedTableEventTypes.includes('All')}
                            onChange={() => { setSelectedTableEventTypes(['All']); setCurrentPage(1); }}
                            style={{ cursor: 'pointer', accentColor: '#000' }}
                          />
                          <span>All Event Types</span>
                        </label>
                        {EVENT_TYPE_OPTIONS.map((et) => {
                          const isChecked = selectedTableEventTypes.includes(et);
                          return (
                            <label key={et} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setCurrentPage(1);
                                  if (selectedTableEventTypes.includes('All')) {
                                    setSelectedTableEventTypes([et]);
                                  } else {
                                    if (isChecked) {
                                      const next = selectedTableEventTypes.filter(e => e !== et);
                                      setSelectedTableEventTypes(next.length === 0 ? ['All'] : next);
                                    } else {
                                      setSelectedTableEventTypes([...selectedTableEventTypes, et]);
                                    }
                                  }
                                }}
                                style={{ cursor: 'pointer', accentColor: '#000' }}
                              />
                              <span>{et}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {/* Search */}
                <div style={{ display:'flex', alignItems:'center', gap:'8px', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'6px 12px', background:'#fff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" placeholder="Search" value={tableSearch} onChange={e=>{setTableSearch(e.target.value);setCurrentPage(1);}} style={{ border:'none', outline:'none', fontSize:'13px', color:'#374151', background:'transparent', width:'180px' }} />
                </div>
              </div>
              {/* Export buttons */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <button onClick={()=>exportCSV(displayed, getDisplayedState, { selectedStores, selectedStatuses, selectedTableStatuses, startDate: formData.startDate, endDate: formData.endDate, branches })} style={{ display:'flex', alignItems:'center', gap:'6px', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:500, color:'#374151', background:'#f9fafb', cursor:'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export CSV
                </button>
                <button onClick={()=>exportExcel(displayed, getDisplayedState, { selectedStores, selectedStatuses, selectedTableStatuses, startDate: formData.startDate, endDate: formData.endDate })} style={{ display:'flex', alignItems:'center', gap:'6px', border:'1px solid #86efac', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:500, color:'#15803d', background:'#dcfce7', cursor:'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export Excel
                </button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'48px' }}>
                <div style={{ width:'28px', height:'28px', border:'2px solid #e5e7eb', borderTopColor:'#111827', borderRadius:'50%', animation:'report-spin 0.7s linear infinite' }} />
              </div>
            ) : displayed.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px', color:'#9ca3af', fontSize:'13px' }}>No records found.</div>
            ) : (
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                <table style={{ width: '3655px', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', fontFamily: "DM Sans, sans-serif" }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fafafa' }}>
                    <tr style={{ background:'#fafafa' }}>
                      {['#', 'DATE', 'CUSTOMER', 'CONTACT', 'REPEAT COUNT', 'STATUS', 'FUNCTION DATE', 'FUNCTION TYPE', 'CATEGORY', 'PRODUCT TYPE', 'LOSS REASON', 'SUB CATEGORY', 'REMARKS', 'SIZE', 'COLOR', 'WORK TYPE', 'PRODUCT CATEGORY', 'WORK SIZE', 'NOTES', 'STORE', 'STAFF', 'ATTACHMENT', 'BOOKING DATE', 'RENTOUT DATE', 'RETURN DATE', 'BILLED DATE', 'BILL RETURNED DATE', 'NEXT VISIT DATE'].map((h, i) => {
                          const getColWidth = (header) => {
                            const widths = {
                              '#': '50px',
                              'DATE': '100px',
                              'NEXT VISIT DATE': '130px',
                              'CUSTOMER': '160px',
                              'CONTACT': '125px',
                              'REPEAT COUNT': '110px',
                              'STATUS': '130px',
                              'FUNCTION DATE': '115px',
                              'FUNCTION TYPE': '140px',
                              'CATEGORY': '115px',
                              'PRODUCT TYPE': '130px',
                              'LOSS REASON': '200px',
                              'SUB CATEGORY': '130px',
                              'REMARKS': '200px',
                              'SIZE': '70px',
                              'COLOR': '85px',
                              'WORK TYPE': '130px',
                              'PRODUCT CATEGORY': '140px',
                              'WORK SIZE': '120px',
                              'NOTES': '200px',
                              'STORE': '140px',
                              'STAFF': '155px',
                              'ATTACHMENT': '110px',
                              'BOOKING DATE': '110px',
                              'RENTOUT DATE': '110px',
                              'RETURN DATE': '110px',
                              'BILLED DATE': '110px',
                              'BILL RETURNED DATE': '165px'
                            };
                            return widths[header] || '120px';
                          };
                          const colWidth = getColWidth(h);
                          return (
                              <th
                                  key={i}
                                  style={{
                                      position: 'sticky',
                                      top: 0,
                                      zIndex: 10,
                                      background: '#fafafa',
                                      borderBottom: '1px solid #f3f4f6',
                                      padding: '12px 12px',
                                      textAlign: 'center',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#9ca3af',
                                      letterSpacing: '0.06em',
                                      whiteSpace: 'nowrap',
                                      width: colWidth,
                                      minWidth: colWidth,
                                      maxWidth: colWidth,
                                      boxSizing: 'border-box'
                                  }}
                              >
                                  {h}
                              </th>
                          );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((w,i)=>{
                      const itemState = getDisplayedState(w);
                      const sc = getStatusColors(itemState.status);
                      
                      const productType = w.lossProductType || '–';
                      const notesText = w.notes || '–';

                      let displayLossReason = '–';
                      let displaySubCategory = '–';

                      if (itemState.status === 'Loss' || itemState.status === 'Revisit Loss') {
                          const isSales = (w.lossProductType || '').toLowerCase().trim() === 'sales';
                          
                          if (w.lossReason && w.lossReason !== '-' && w.lossReason !== '') {
                              displayLossReason = w.lossReason;
                              if (w.lossSelectRemarks && w.lossSelectRemarks !== '-' && w.lossSelectRemarks !== '') {
                                  displayLossReason += ` (${w.lossSelectRemarks})`;
                              }
                          } else if (w.subCategory && NON_SALES_REASONS.has(w.subCategory)) {
                              displayLossReason = w.subCategory;
                              if (w.lossSelectRemarks && w.lossSelectRemarks !== '-' && w.lossSelectRemarks !== '') {
                                  displayLossReason += ` (${w.lossSelectRemarks})`;
                              }
                          } else if (w.lossSelectRemarks && w.lossSelectRemarks !== '-' && w.lossSelectRemarks !== '') {
                              displayLossReason = w.lossSelectRemarks;
                          }

                          if (isSales) {
                              displaySubCategory = w.subCategory || '–';
                          }
                      } else {
                          displaySubCategory = w.subCategory || '–';
                      }

                      return (
                        <tr key={w._id||i} style={{ borderBottom:'1px solid #f9fafb', background:'#fff' }}
                          onMouseEnter={e=>e.currentTarget.style.background = '#fafafa'}
                          onMouseLeave={e=>e.currentTarget.style.background = '#fff'}
                        >
                          <td style={{ padding: '11px 12px', textAlign: 'center', color: '#9ca3af', boxSizing: 'border-box' }}>{indexFirst+i+1}</td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{itemState.date ? fmtDate(itemState.date) : '–'}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#111827', fontWeight: 500, boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.customerName}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">+91 {w.contact}</span>
                                </div>
                              </td>
                          <td style={{ textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.repeatCount}</span>
                                </div>
                              </td>
                          <td style={{ padding: '11px 12px', textAlign: 'center', boxSizing: 'border-box' }}>
                            <div className="walkin-marquee-container" style={{ width: '110px', margin: '0 auto' }}>
                              <span
                                className="walkin-marquee-text walkin-anim-scroll"
                                style={{
                                  background: sc.bg,
                                  color: sc.color,
                                  borderRadius: '20px',
                                  padding: '3px 10px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block',
                                  boxSizing: 'border-box',
                                  textAlign: 'center'
                                }}
                              >
                                {itemState.status?.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.functionDate || '–'}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.functionType || '–'}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.category || '–'}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{productType}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{displayLossReason}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{displaySubCategory}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#6b7280', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.remarks||'–'}</span>
                                </div>
                              </td>
                              <td style={{textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.lossSize || '–'}</span>
                                </div>
                              </td>
                              <td style={{textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.lossColour || '–'}</span>
                                </div>
                              </td>
                              <td style={{textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container" title={w.workType}>
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.workType || '–'}</span>
                                </div>
                              </td>
                              <td style={{textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.productCategory || '–'}</span>
                                </div>
                              </td>
                              <td style={{textAlign: 'center', padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.workSize || '–'}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#6b7280', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container" title={notesText}>
                                    <span className="walkin-marquee-text walkin-anim-scroll">{notesText}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.store || '–'}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.staff || '–'}</span>
                                </div>
                              </td>
                          <td style={{ padding: '11px 12px', textAlign: 'center', boxSizing: 'border-box' }}>
                            {w.attachment ? (
                              <button
                                onClick={() => handleDownloadAndView(w.attachment, w.attachmentName || 'attachment')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '28px',
                                  height: '28px',
                                  color: '#2563eb',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '50%',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  boxSizing: 'border-box'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = '#dbeafe';
                                  e.currentTarget.style.color = '#1d4ed8';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = '#eff6ff';
                                  e.currentTarget.style.color = '#2563eb';
                                }}
                                title="Download and view attachment"
                              >
                                <FaDownload size={12} />
                              </button>
                            ) : '–'}
                          </td>
                          <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6b7280', fontSize: '11px', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.bookingDate ? new Date(w.bookingDate).toISOString().split('T')[0] : '–'}</span>
                                </div>
                              </td>
                          <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6b7280', fontSize: '11px', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.rentoutDate ? new Date(w.rentoutDate).toISOString().split('T')[0] : '–'}</span>
                                </div>
                              </td>
                          <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6b7280', fontSize: '11px', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.returnDate ? new Date(w.returnDate).toISOString().split('T')[0] : '–'}</span>
                                </div>
                              </td>
                          <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6b7280', fontSize: '11px', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.billedDate ? new Date(w.billedDate).toISOString().split('T')[0] : '–'}</span>
                                </div>
                              </td>
                          <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6b7280', fontSize: '11px', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.billReturnedDate ? new Date(w.billReturnedDate).toISOString().split('T')[0] : '–'}</span>
                                </div>
                              </td>
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#374151', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
                                    <span className="walkin-marquee-text walkin-anim-scroll">
                                        {(w.lossEnquiryRevisitDate && w.lossEnquiryRevisitDate !== '-') ? w.lossEnquiryRevisitDate.split(' ')[0].split('T')[0] : '–'}
                                    </span>
                                </div>
                              </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderTop: '1px solid #f3f4f6',
              fontSize: '13px',
              color: '#6b7280'
            }}>
              <span>Showing {displayed.length === 0 ? 0 : indexFirst + 1} to {indexFirst + currentItems.length} of {displayed.length} entries</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <span style={{ marginRight: '8px', color: '#6b7280' }}>Show:</span>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: '#fff',
                      fontSize: '13px',
                      color: '#374151',
                      cursor: 'pointer',
                      fontWeight: '500',
                      outline: 'none',
                      minWidth: '64px',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <span>{itemsPerPage}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <>
                      <div
                        onClick={() => setIsDropdownOpen(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          right: 0,
                          marginBottom: '6px',
                          background: '#4b5563',
                          borderRadius: '10px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                          padding: '4px',
                          zIndex: 999,
                          minWidth: '80px',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}
                      >
                        {[50, 100, 200, 'All'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setItemsPerPage(opt);
                              setCurrentPage(1);
                              setIsDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              width: '100%',
                              padding: '6px 12px 6px 8px',
                              border: 'none',
                              background: 'transparent',
                              color: '#fff',
                              fontSize: '13px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              fontWeight: itemsPerPage === opt ? '600' : '400',
                              fontFamily: 'inherit'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#2563eb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span style={{ width: '16px', display: 'inline-flex', alignItems: 'center', marginRight: '4px', fontSize: '11px' }}>
                              {itemsPerPage === opt ? '✓' : ''}
                            </span>
                            <span>{opt}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes report-spin{to{transform:rotate(360deg)}}
        .walkin-marquee-container {
            container-type: inline-size;
            overflow: hidden;
            white-space: nowrap;
            display: block;
            width: 100%;
        }
        .walkin-marquee-text {
            display: inline-block;
            min-width: 100%;
        }
        .walkin-marquee-container:hover .walkin-marquee-text {
            animation-play-state: paused;
        }
        .walkin-anim-scroll {
            animation: walkin-marquee-scroll 8s linear infinite;
        }
        @keyframes walkin-marquee-scroll {
            0%, 15% { transform: translateX(0); }
            85%, 100% { transform: translateX(calc(-100% + 100cqw)); }
        }
      `}</style>
    </div>
  );
};

export default WalkinReport;
