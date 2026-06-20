import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import baseUrl from "../../api/api";
import { FaChevronLeft, FaChevronRight, FaDownload } from 'react-icons/fa';

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

const NON_SALES_REASONS = new Set([
    'Product Already Booked',
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
    'Z-Edapally1', 'G-Edappally', 'SG-Trivandrum', 'Z- Edappal', 'Z.Perinthalmanna',
    'Z.Kottakkal', 'G.Kottayam', 'G.Perumbavoor', 'G.Thrissur', 'G.Chavakkad',
    'G.Calicut', 'G.Vadakara', 'G.Edappal', 'G.Perinthalmanna', 'G.Kottakkal',
    'G.Manjeri', 'G.Palakkad', 'G.Kalpetta', 'G.Kannur', 'G.MG Road',
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

/* ── Export to CSV ───────────────────────────────────────────────────────── */
const exportCSV = (data) => {
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
    'NOTES', 
    'STORE', 
    'STAFF', 
    'ATTACHMENT', 
    'BOOKING DATE', 
    'RENTOUT DATE', 
    'RETURN DATE', 
    'BILLED DATE', 
    'BILL RETURNED DATE'
  ];

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

  const rows = data.map((w, i) => {
    const productType = w.lossProductType || '-';
    const notesText = w.notes || '-';

    let displayLossReason = '-';
    let displaySubCategory = '-';

    if (w.status === 'Loss' || w.status === 'Revisit Loss') {
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

    // Use a raw date string for the walkin date (already YYYY-MM-DD or similar)
    const walkinDate = w.date ? (w.date.includes('T') ? fmtDate(w.date) : w.date.split(' ')[0]) : '-';
    const functionDate = w.functionDate ? fmtDate(w.functionDate) : '-';

    return [
      i + 1,
      walkinDate,
      w.customerName || '-',
      w.contact ? `+91 ${w.contact}` : '-',
      w.repeatCount || 1,
      w.status || '-',
      functionDate,
      w.functionType || '-',
      w.category || '-',
      productType,
      displayLossReason,
      displaySubCategory,
      w.remarks || '-',
      w.lossSize || '-',
      w.lossColour || '-',
      notesText,
      w.store || '-',
      w.staff || '-',
      w.attachment ? (w.attachmentName || 'Yes') : '-',
      fmtDate(w.bookingDate),
      fmtDate(w.rentoutDate),
      fmtDate(w.returnDate),
      fmtDate(w.billedDate),
      fmtDate(w.billReturnedDate)
    ];
  });

  const csv = [headers, ...rows].map((r, rowIdx) => r.map((c, colIdx) => {
    let s = String(c ?? '');
    // Strip any en/em dashes that were used as placeholders (use plain hyphen instead)
    s = s.replace(/\u2013|\u2014/g, '-');
    // Clean up any newlines to prevent row-splitting bugs in CSV files
    s = s.replace(/[\r\n]+/g, ' ');
    // Escape quotes as per standard CSV rules
    return `"${s.replace(/"/g, '""')}"`;
  }).join(',')).join('\n');

  // Prefixing with UTF-8 BOM (\uFEFF) forces Excel to read the CSV as UTF-8 encoding
  const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); 
  a.href = url; 
  a.download = 'walkin-report.csv'; 
  a.click();
  URL.revokeObjectURL(url);
};

const WalkinReport = () => {
  const user  = useSelector(s => s.auth.user);
  const token = localStorage.getItem('token');

  const today = new Date().toISOString().split('T')[0];

  const [branches,  setBranches]  = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [formData, setFormData] = useState({ startDate: today, endDate: today, store: 'All', employee: '' });
  const [selectedStatus, setSelectedStatus] = useState('');

  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportData,      setReportData]      = useState([]);
  const [tableSearch,     setTableSearch]     = useState('');
  const [tableStatus,     setTableStatus]     = useState('All');
  const [currentPage,     setCurrentPage]     = useState(1);
  const [itemsPerPage,    setItemsPerPage]    = useState(50);
  const [isDropdownOpen,  setIsDropdownOpen]  = useState(false);

  /* load branches only (employees loaded lazily) */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`${baseUrl.baseUrl}api/admin/accessible-stores`, { headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } });
        const json = await res.json();
        let list = Array.isArray(json?.stores) ? json.stores : (Array.isArray(json?.data) ? json.data : []);
        
        if (user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr_admin') {
          const existing = new Set(list.map(b => b.workingBranch));
          const missing = HARDCODED_STORES.filter(s => !existing.has(s));
          list = [...missing.map(name => ({ workingBranch: name })), ...list];
        }
        
        setBranches(list);
        if (user?.role === 'store_admin' && list.length > 0) setFormData(p=>({...p, store: list[0].workingBranch}));
      } catch(e){ console.error(e); }
      finally { setLoading(false); }
    };
    if (token) load();
  }, [token, user?.role]);

  // Load employees dynamically based on selected store
  const loadEmployeesForStore = async (storeName) => {
    try {
      let url = `${baseUrl.baseUrl}api/admin/accessible-employees`;
      if (storeName && storeName !== 'All') {
        const selectedBranch = branches.find(b => b.workingBranch === storeName);
        if (selectedBranch && selectedBranch._id) {
          url += `?storeId=${selectedBranch._id}`;
        } else {
          url += `?store=${encodeURIComponent(storeName)}`;
        }
      }
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
      loadEmployeesForStore(formData.store);
    }
  }, [token, formData.store, branches]);

  const storeEmployees = employees;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch(`${baseUrl.baseUrl}api/walkin/list?startDate=${formData.startDate}&endDate=${formData.endDate}`, { headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        let data = json.data || [];
        if (formData.store && formData.store !== 'All') data = data.filter(w => locationKey(w.store) === locationKey(formData.store));
        if (formData.employee) data = data.filter(w => w.staff === formData.employee);
        if (selectedStatus) {
          data = data.filter(w => {
            if (!w.status) return false;
            const wStatus = String(w.status).trim().toLowerCase();
            const target = selectedStatus.trim().toLowerCase();
            if (target === 'cancelled' || target === 'cancel') {
              return wStatus.includes('cancel') || wStatus.includes('cancelled') || 
                     String(w.rentalStatus).toLowerCase().includes('cancel') || 
                     String(w.shoeStatus).toLowerCase().includes('cancel');
            }
            const parts = wStatus.split(',').map(p => p.trim());
            return parts.includes(target) || 
                   String(w.rentalStatus).trim().toLowerCase() === target || 
                   String(w.shoeStatus).trim().toLowerCase() === target;
          });
        }
        setReportData(data);
        setReportGenerated(true);
        setCurrentPage(1);
        setTableSearch('');
        setTableStatus('All');
      }
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  /* table-level filter */
  const displayed = reportData.filter(w => {
    const q = tableSearch.toLowerCase();
    const matchSearch = !q || w.customerName?.toLowerCase().includes(q) || w.contact?.includes(q) || w.staff?.toLowerCase().includes(q);
    const matchStatus = tableStatus === 'All' || (() => {
      if (!w.status) return false;
      const wStatus = String(w.status).trim().toLowerCase();
      const target = tableStatus.trim().toLowerCase();
      if (target === 'cancelled' || target === 'cancel') {
        return wStatus.includes('cancel') || wStatus.includes('cancelled') || 
               String(w.rentalStatus).toLowerCase().includes('cancel') || 
               String(w.shoeStatus).toLowerCase().includes('cancel');
      }
      const parts = wStatus.split(',').map(p => p.trim());
      return parts.includes(target) || 
             String(w.rentalStatus).trim().toLowerCase() === target || 
             String(w.shoeStatus).trim().toLowerCase() === target;
    })();
    return matchSearch && matchStatus;
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3" style={{}}>
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
              <div>
                <label style={lbl}>Store Name <span style={{color:'#ef4444'}}>*</span></label>
                <select value={formData.store} disabled={user?.role==='store_admin'} onChange={e=>setFormData(p=>({...p,store:e.target.value,employee:''}))} style={{...inp,cursor:'pointer',appearance:'auto'}}>
                  {user?.role !== 'store_admin' && <option value="All">All Store</option>}
                  {branches.map((b,i)=><option key={i} value={b.workingBranch}>{b.workingBranch}</option>)}
                </select>
              </div>
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3" style={{}}>
              <div>
                <label style={lbl}>Employee <span style={{color:'#9ca3af', fontWeight:400}}>(Optional)</span></label>
                <select value={formData.employee} onChange={e=>setFormData(p=>({...p,employee:e.target.value}))} style={{...inp,cursor:'pointer',appearance:'auto'}}>
                  <option value="">All Employees</option>
                  {storeEmployees.map((e,i)=><option key={i} value={e.username}>{e.username}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Status <span style={{color:'#9ca3af', fontWeight:400}}>(Optional)</span></label>
                <select value={selectedStatus} onChange={e=>setSelectedStatus(e.target.value)} style={{...inp,cursor:'pointer',appearance:'auto'}}>
                  <option value="">All Status</option>
                  {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
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
                {/* Status pill dropdown */}
                <div style={{ display:'flex', alignItems:'center', gap:'6px', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'6px 12px', fontSize:'13px', color:'#374151', background:'#fff', cursor:'pointer' }}>
                  <span>Status : </span>
                  <select value={tableStatus} onChange={e=>{setTableStatus(e.target.value);setCurrentPage(1);}} style={{ border:'none', outline:'none', fontSize:'13px', color:'#374151', background:'transparent', cursor:'pointer' }}>
                    <option value="All">All</option>
                    {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* Search */}
                <div style={{ display:'flex', alignItems:'center', gap:'8px', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'6px 12px', background:'#fff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" placeholder="Search" value={tableSearch} onChange={e=>{setTableSearch(e.target.value);setCurrentPage(1);}} style={{ border:'none', outline:'none', fontSize:'13px', color:'#374151', background:'transparent', width:'180px' }} />
                </div>
              </div>
              {/* Export button – single button only */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <button onClick={()=>exportCSV(displayed)} style={{ display:'flex', alignItems:'center', gap:'6px', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:500, color:'#374151', background:'#f9fafb', cursor:'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export CSV
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
              <div style={{ overflowX:'auto' }}>
                <table style={{ width: '3135px', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12px', fontFamily: "DM Sans, sans-serif" }}>
                  <thead>
                    <tr style={{ background:'#fafafa', borderBottom:'1px solid #f3f4f6' }}>
                      {['#', 'DATE', 'CUSTOMER', 'CONTACT', 'REPEAT COUNT', 'STATUS', 'FUNCTION DATE', 'FUNCTION TYPE', 'CATEGORY', 'PRODUCT TYPE', 'LOSS REASON', 'SUB CATEGORY', 'REMARKS', 'SIZE', 'COLOR', 'NOTES', 'STORE', 'STAFF', 'ATTACHMENT', 'BOOKING DATE', 'RENTOUT DATE', 'RETURN DATE', 'BILLED DATE', 'BILL RETURNED DATE'].map((h, i) => {
                          const getColWidth = (header) => {
                            const widths = {
                              '#': '50px',
                              'DATE': '100px',
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
                      const sc = getStatusColors(w.status);
                      
                      const productType = w.lossProductType || '–';
                      const notesText = w.notes || '–';

                      let displayLossReason = '–';
                      let displaySubCategory = '–';

                      if (w.status === 'Loss' || w.status === 'Revisit Loss') {
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
                                    <span className="walkin-marquee-text walkin-anim-scroll">{w.date ? w.date.split(' ')[0] : '–'}</span>
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
                                {w.status?.toUpperCase()}
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
                          <td style={{textAlign: 'center',  padding: '11px 12px', color: '#6b7280', boxSizing: 'border-box' }}>
                                <div className="walkin-marquee-container">
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: '#fff',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.4 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      color: '#374151'
                    }}
                    onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: '#fff',
                      cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                      opacity: (currentPage === totalPages || totalPages === 0) ? 0.4 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      color: '#374151'
                    }}
                    onMouseEnter={e => { if (currentPage !== totalPages && totalPages !== 0) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
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
