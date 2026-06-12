import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import baseUrl from "../../api/api";
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

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

const STATUS_OPTIONS = ['Trial','Loss','Enquiry','Reissue','New Booking','Revisit Booking','Revisit Loss','New Walkin','Booked','Rentout','Return','Cancel','Other'];

const STATUS_COLORS = {
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
  'Enquiry':           { bg:'#f3f4f6', color:'#6b7280' },
  'New Walkin':        { bg:'#dbeafe', color:'#2563eb' },
  'Reissue':           { bg:'#ede9fe', color:'#7c3aed' },
};

/* ── Export to CSV ───────────────────────────────────────────────────────── */
const exportCSV = (data) => {
  const headers = ['#','Date','Customer','Contact','Function Date','Staff','Status','Category','Sub Category','Repeat Count','Remarks'];
  const rows = data.map((w,i) => [i+1,w.date,w.customerName,w.contact,w.functionDate,w.staff,w.status,w.category,w.subCategory,w.repeatCount,w.remarks||'–']);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='walkin-report.csv'; a.click();
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
        const list = Array.isArray(json?.stores) ? json.stores : (Array.isArray(json?.data) ? json.data : []);
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
        if (selectedStatus) data = data.filter(w => w.status === selectedStatus);
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
    const matchStatus = tableStatus === 'All' || w.status === tableStatus;
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
                  {user?.role !== 'store_admin' && <option value="All">Select Store</option>}
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
                  <option value="">Choose Status</option>
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
              {/* Export buttons */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <button onClick={()=>exportCSV(displayed)} style={{ display:'flex', alignItems:'center', gap:'6px', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:500, color:'#374151', background:'#f9fafb', cursor:'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export
                </button>
                <button onClick={()=>exportCSV(displayed)} style={{ width:'34px', height:'34px', background:'#16a34a', border:'none', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8" fill="none" stroke="white" strokeWidth="2"/></svg>
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
                <table className="min-w-[800px] md:min-w-full" style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px', fontFamily:"DM Sans, sans-serif" }}>
                  <thead>
                    <tr style={{ background:'#f9fafb', borderBottom:'1px solid #f3f4f6' }}>
                      {['#','DATE','CUSTOMER','CONTACT','FUNCTION DATE','STAFF','STATUS','CATEGORY','SUB CATEGORY','REPEAT COUNT','REMARKS'].map(h=>(
                        <th key={h} style={{ padding:'10px 14px', textAlign:(h==='#'||h==='REPEAT COUNT')?'center':'left', fontSize:'10px', fontWeight:600, color:'#9ca3af', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((w,i)=>{
                      const sc = STATUS_COLORS[w.status] || { bg:'#f3f4f6', color:'#6b7280' };
                      return (
                        <tr key={w._id||i} style={{ borderBottom:'1px solid #f9fafb', background:'#fff' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                          onMouseLeave={e=>e.currentTarget.style.background='#fff'}
                        >
                          <td style={{ padding:'12px 14px', textAlign:'center', color:'#9ca3af' }}>{indexFirst+i+1}</td>
                          <td style={{ padding:'12px 14px', whiteSpace:'nowrap', color:'#374151' }}>{w.date}</td>
                          <td style={{ padding:'12px 14px', color:'#111827', fontWeight:500, whiteSpace:'nowrap' }}>{w.customerName}</td>
                          <td style={{ padding:'12px 14px', whiteSpace:'nowrap', color:'#374151' }}>+91 {w.contact}</td>
                          <td style={{ padding:'12px 14px', whiteSpace:'nowrap', color:'#374151' }}>{w.functionDate}</td>
                          <td style={{ padding:'12px 14px', whiteSpace:'nowrap', color:'#374151' }}>{w.staff}</td>
                          <td style={{ padding:'12px 14px' }}>
                            <span style={{ background:sc.bg, color:sc.color, borderRadius:'20px', padding:'3px 10px', fontSize:'10px', fontWeight:700, whiteSpace:'nowrap', display:'inline-block' }}>
                              {w.status?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding:'12px 14px', whiteSpace:'nowrap', color:'#374151' }}>{w.category||'–'}</td>
                          <td style={{ padding:'12px 14px', whiteSpace:'nowrap', color:'#374151' }}>{w.subCategory||'–'}</td>
                          <td style={{ padding:'12px 14px', textAlign:'center', color:'#374151' }}>{w.repeatCount}</td>
                          <td style={{ padding:'12px 14px', color:'#6b7280', maxWidth:'140px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={w.remarks}>{w.remarks||'–'}</td>
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
              <span>Showing {itemsPerPage === 'All' ? displayed.length : Math.min(Number(itemsPerPage), Math.max(0, displayed.length - (currentPage - 1) * Number(itemsPerPage)))} of {displayed.length}</span>
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
      <style>{`@keyframes report-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default WalkinReport;
