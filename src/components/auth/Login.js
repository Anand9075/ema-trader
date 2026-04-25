import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const [form, setForm]       = useState({ email:'', password:'' });
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
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:'var(--white)' }}>EMA Trader</div>
            <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>NSE Terminal</div>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to access your trading dashboard.</p>

        {error && <div className="auth-err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label className="flabel">Email Address</label>
            <input className="finput" type="email" value={form.email} onChange={set('email')}
              placeholder="you@example.com" required autoFocus/>
          </div>
          <div className="fg">
            <label className="flabel">Password</label>
            <input className="finput" type="password" value={form.password} onChange={set('password')}
              placeholder="••••••••" required/>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width:'100%', justifyContent:'center', padding:'11px', marginTop:10, fontSize:13 }}>
            {loading ? <span className="spinner spinner-sm"/> : 'Sign In →'}
          </button>
        </form>

        <div style={{ borderTop:'1px solid var(--border)', marginTop:24, paddingTop:18, textAlign:'center', fontSize:12, color:'var(--text2)' }}>
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create one</Link>
        </div>
      </div>
    </div>
  );
}