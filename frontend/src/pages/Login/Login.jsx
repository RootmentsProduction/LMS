import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import baseUrl from '../../api/api';
import { useDispatch } from 'react-redux';
import { setUser } from '../../features/auth/authSlice';

const ROLES = [
  { value: 'super_admin',   label: 'Super Admin' },
  { value: 'admin',         label: 'Admin' },
  { value: 'hr_admin',      label: 'HR Admin' },
];

/* ── Animated face SVG ─────────────────────────────────────────────────────── */
const FaceAvatar = ({ isTypingPassword, showPassword }) => {
  // eyes: open, peeking (half), closed
  const eyeState = isTypingPassword && !showPassword ? 'closed' : 'open';

  return (
    <div
      style={{
        transition: 'transform 0.4s cubic-bezier(.34,1.56,.64,1)',
        transform: isTypingPassword && !showPassword ? 'scale(1.08)' : 'scale(1)',
      }}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Face circle */}
        <circle cx="28" cy="28" r="26" fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="2" />

        {/* Left eye */}
        <g style={{ transition: 'all 0.3s ease' }}>
          {eyeState === 'open' ? (
            <>
              <ellipse cx="20" cy="26" rx="4" ry="4.5" fill="white" />
              <circle cx="21" cy="26" r="2" fill="#1a1a1a" />
              <circle cx="22" cy="25" r="0.7" fill="white" />
            </>
          ) : (
            /* closed — curved line */
            <path d="M16 26 Q20 22 24 26" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
          )}
        </g>

        {/* Right eye */}
        <g style={{ transition: 'all 0.3s ease' }}>
          {eyeState === 'open' ? (
            <>
              <ellipse cx="36" cy="26" rx="4" ry="4.5" fill="white" />
              <circle cx="37" cy="26" r="2" fill="#1a1a1a" />
              <circle cx="38" cy="25" r="0.7" fill="white" />
            </>
          ) : (
            <path d="M32 26 Q36 22 40 26" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
          )}
        </g>

        {/* Hands covering eyes when password hidden */}
        {isTypingPassword && !showPassword && (
          <>
            {/* left hand */}
            <rect x="10" y="20" width="14" height="10" rx="5" fill="#4a4a4a"
              style={{ transition: 'all 0.35s cubic-bezier(.34,1.56,.64,1)' }} />
            {/* right hand */}
            <rect x="32" y="20" width="14" height="10" rx="5" fill="#4a4a4a"
              style={{ transition: 'all 0.35s cubic-bezier(.34,1.56,.64,1)' }} />
          </>
        )}

        {/* Mouth */}
        <path
          d={isTypingPassword && !showPassword
            ? 'M22 38 Q28 35 34 38'   // slight frown / neutral
            : 'M22 37 Q28 42 34 37'}  // smile
          stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"
          style={{ transition: 'd 0.4s ease' }}
        />

        {/* Blush when covering eyes */}
        {isTypingPassword && !showPassword && (
          <>
            <ellipse cx="16" cy="34" rx="4" ry="2.5" fill="#ff6b6b" opacity="0.35" />
            <ellipse cx="40" cy="34" rx="4" ry="2.5" fill="#ff6b6b" opacity="0.35" />
          </>
        )}
      </svg>
    </div>
  );
};

/* ── Floating particles background ─────────────────────────────────────────── */
const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white/5"
        style={{
          width:  `${Math.random() * 6 + 2}px`,
          height: `${Math.random() * 6 + 2}px`,
          left:   `${Math.random() * 100}%`,
          top:    `${Math.random() * 100}%`,
          animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 4}s`,
        }}
      />
    ))}
  </div>
);

/* ── Main component ─────────────────────────────────────────────────────────── */
const Login = () => {
  const [mode, setMode]               = useState('login');
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [mounted, setMounted]         = useState(false);

  // Login fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [signup, setSignup] = useState({
    userName: '', userId: '', email: '', password: '', userRole: '', Branch: [],
  });

  const [branches, setBranches] = useState([]);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // mount animation
  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  useEffect(() => {
    fetch(`${baseUrl.baseUrl}api/usercreate/getBranch/public`)
      .then((r) => r.json())
      .then((d) => setBranches(d.data || []))
      .catch(() => {});
  }, []);

  const set = (field) => (e) => setSignup((p) => ({ ...p, [field]: e.target.value }));

  const toggleBranch = (id) => {
    setSignup((p) => ({
      ...p,
      Branch: p.Branch.includes(id) ? p.Branch.filter((b) => b !== id) : [...p.Branch, id],
    }));
  };

  const needsBranch  = signup.userRole === 'cluster_admin' || signup.userRole === 'store_admin';
  const singleBranch = signup.userRole === 'store_admin';

  // is the user actively typing in a password field?
  const isTypingPassword = passwordFocused && (mode === 'login' ? password.length > 0 : signup.password.length > 0);

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch(`${baseUrl.baseUrl}api/admin/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, EmpId: password }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(setUser({ userId: data.user?.userId, role: data.user?.role }));
        localStorage.setItem('token', data.token);
        toast.success('Login successful');
        navigate('/');
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch { toast.error('An error occurred during login'); }
    finally   { setLoading(false); }
  };

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signup.userRole) { toast.error('Please select a role'); return; }
    if (needsBranch && signup.Branch.length === 0) { toast.error('Please select at least one branch'); return; }
    if (singleBranch && signup.Branch.length > 1)  { toast.error('Store Admin can only be assigned to one store'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${baseUrl.baseUrl}api/admin/admin/createadmin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup),
      });
      const data = await res.json();
      if (res.ok) { toast.success('Admin account created! Please sign in.'); setMode('login'); }
      else        { toast.error(data.message || 'Sign up failed'); }
    } catch { toast.error('An error occurred during sign up'); }
    finally   { setLoading(false); }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputCls =
    'w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm ' +
    'focus:outline-none focus:border-gray-400 focus:bg-[#313131] transition-all duration-200';
  const selectCls =
    'w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white rounded-xl px-4 py-3 text-sm ' +
    'focus:outline-none focus:border-gray-400 transition-all duration-200 appearance-none';

  return (
    <>
      {/* keyframe styles injected inline */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.4; }
          50%       { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .slide-up  { animation: slideUp 0.5s cubic-bezier(.22,1,.36,1) both; }
        .fade-in   { animation: fadeIn  0.4s ease both; }
        .input-row { animation: slideUp 0.45s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      <div
        className="relative min-h-screen flex items-center justify-center px-4 py-8 overflow-y-auto"
        style={{ backgroundColor: '#212121' }}
      >
        <Particles />

        {/* subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255,255,255,0.03) 0%, transparent 70%)' }}
        />

        <div
          className="relative w-full max-w-sm"
          style={{
            opacity:   mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(.22,1,.36,1)',
          }}
        >
          {/* ── Avatar / Logo ── */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              {/* pulse ring when typing password */}
              {isTypingPassword && !showPassword && (
                <div
                  className="absolute inset-0 rounded-2xl border border-white/20"
                  style={{ animation: 'pulse-ring 1.2s ease-out infinite' }}
                />
              )}
              <div
                className="w-16 h-16 rounded-2xl bg-[#2a2a2a] border border-[#3a3a3a] flex items-center justify-center shadow-xl overflow-hidden"
                style={{ transition: 'border-color 0.3s ease', borderColor: isTypingPassword && !showPassword ? '#555' : '#3a3a3a' }}
              >
                <FaceAvatar isTypingPassword={isTypingPassword} showPassword={showPassword} />
              </div>
            </div>
          </div>

          {/* ── Mode toggle wrapper — slides between login & signup ── */}
          <div
            key={mode}
            style={{ animation: 'slideUp 0.45s cubic-bezier(.22,1,.36,1) both' }}
          >
            {mode === 'login' ? (
              /* ════════════════ LOGIN ════════════════ */
              <>
                <h1 className="text-white text-2xl font-semibold text-center mb-1">Welcome back!</h1>
                <p className="text-gray-400 text-sm text-center mb-7">
                  First time here?{' '}
                  <button
                    onClick={() => { setMode('signup'); setShowPassword(false); }}
                    className="text-white font-semibold hover:underline transition-opacity hover:opacity-80"
                  >
                    Sign up
                  </button>
                </p>

                <form onSubmit={handleLogin} className="flex flex-col gap-3">
                  {/* Employee ID */}
                  <div className="input-row" style={{ animationDelay: '0.05s' }}>
                    <input
                      type="text" placeholder="Employee ID" value={email} required
                      onChange={(e) => setEmail(e.target.value)} className={inputCls}
                    />
                  </div>

                  {/* Password */}
                  <div className="input-row relative" style={{ animationDelay: '0.1s' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password} required
                      autoComplete="off"
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      className={inputCls + ' pr-12'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {/* custom eye icon that reacts */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {showPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>

                  {/* Submit */}
                  <div className="input-row" style={{ animationDelay: '0.15s' }}>
                    <button
                      type="submit" disabled={loading}
                      className="w-full bg-white text-black font-semibold py-3 rounded-xl mt-1 hover:bg-gray-100 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Signing in...
                        </span>
                      ) : 'Sign in'}
                    </button>
                  </div>
                </form>
              </>

            ) : (
              /* ════════════════ SIGN UP ════════════════ */
              <>
                <h1 className="text-white text-2xl font-semibold text-center mb-1">Create admin account</h1>
                <p className="text-gray-400 text-sm text-center mb-5">
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('login'); setShowPassword(false); }}
                    className="text-white font-semibold hover:underline transition-opacity hover:opacity-80"
                  >
                    Sign in
                  </button>
                </p>

                <form onSubmit={handleSignup} className="flex flex-col gap-3">
                  {[
                    { placeholder: 'Full name',               field: 'userName', type: 'text',  delay: '0.05s' },
                    { placeholder: 'Employee ID (e.g. Emp123)', field: 'userId',  type: 'text',  delay: '0.08s' },
                    { placeholder: 'Email address',           field: 'email',    type: 'email', delay: '0.11s' },
                  ].map(({ placeholder, field, type, delay }) => (
                    <div key={field} className="input-row" style={{ animationDelay: delay }}>
                      <input
                        type={type} placeholder={placeholder} value={signup[field]} required
                        onChange={set(field)} className={inputCls}
                      />
                    </div>
                  ))}

                  {/* Password */}
                  <div className="input-row relative" style={{ animationDelay: '0.14s' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={signup.password} required
                      autoComplete="off"
                      onChange={set('password')}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      className={inputCls + ' pr-12'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200 transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {showPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>

                  {/* Role */}
                  <div className="input-row relative" style={{ animationDelay: '0.17s' }}>
                    <select value={signup.userRole} onChange={set('userRole')} required className={selectCls}>
                      <option value="" disabled>Select role</option>
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">▾</div>
                  </div>

                  {/* Branch picker — animated slide-in */}
                  <div
                    style={{
                      maxHeight: needsBranch ? '220px' : '0px',
                      opacity:   needsBranch ? 1 : 0,
                      overflow:  'hidden',
                      transition: 'max-height 0.4s cubic-bezier(.22,1,.36,1), opacity 0.3s ease',
                    }}
                  >
                    <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-3 mt-0">
                      <p className="text-gray-400 text-xs mb-2">
                        {singleBranch ? 'Select store (pick one)' : 'Select branches (pick one or more)'}
                      </p>
                      <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1">
                        {branches.length === 0 ? (
                          <p className="text-gray-500 text-xs">Loading branches...</p>
                        ) : (
                          branches.map((b) => {
                            const checked = signup.Branch.includes(b._id);
                            return (
                              <label
                                key={b._id}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all duration-150
                                  ${checked ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                              >
                                <input
                                  type={singleBranch ? 'radio' : 'checkbox'}
                                  name="branch" checked={checked}
                                  onChange={() => {
                                    if (singleBranch) setSignup((p) => ({ ...p, Branch: [b._id] }));
                                    else toggleBranch(b._id);
                                  }}
                                  className="accent-white"
                                />
                                {b.workingBranch}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="input-row" style={{ animationDelay: '0.2s' }}>
                    <button
                      type="submit" disabled={loading}
                      className="w-full bg-white text-black font-semibold py-3 rounded-xl mt-1 hover:bg-gray-100 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Creating account...
                        </span>
                      ) : 'Create account'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
