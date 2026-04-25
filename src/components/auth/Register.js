import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Register() {
  const [form, setForm]       = useState({ name:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const { register } = useAuth();
  const { addToast }  = useToast();
  const navigate = useNavigate();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try { await register(form.name, form.email, form.password); addToast('Account created!','success'); navigate('/'); }
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

        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Track your NSE trades with a professional dashboard.</p>

        {error && <div className="auth-err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label className="flabel">Full Name</label>
            <input className="finput" value={form.name} onChange={set('name')} placeholder="Anand Tyagi" required autoFocus/>
          </div>
          <div className="fg">
            <label className="flabel">Email Address</label>
            <input className="finput" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required/>
          </div>
          <div className="fg">
            <label className="flabel">Password</label>
            <input className="finput" type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required/>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width:'100%', justifyContent:'center', padding:'11px', marginTop:10, fontSize:13 }}>
            {loading ? <span className="spinner spinner-sm"/> : 'Create Account →'}
          </button>
        </form>

        <div style={{ borderTop:'1px solid var(--border)', marginTop:24, paddingTop:18, textAlign:'center', fontSize:12, color:'var(--text2)' }}>
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}