import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const [form, setForm]     = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(form.email, form.password); addToast('Welcome back!','success'); navigate('/'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">📈</div>
          <div><div style={{ fontWeight:700, fontSize:15 }}>EMA Trader</div><div style={{ fontSize:10, color:'var(--muted)' }}>NSE Terminal</div></div>
        </div>
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-sub">Enter your credentials to access your portfolio.</p>
        {error && <div className="auth-err">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="fg"><label className="flabel">Email</label>
            <input className="finput" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required autoFocus/>
          </div>
          <div className="fg"><label className="flabel">Password</label>
            <input className="finput" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required/>
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading}
            style={{ width:'100%', justifyContent:'center', padding:'10px', marginTop:8 }}>
            {loading ? <span className="spinner spinner-sm"/> : 'Sign In'}
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:18, fontSize:12, color:'var(--muted)' }}>
          No account? <Link to="/register" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  );
}