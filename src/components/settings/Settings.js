import React, { useState, useEffect } from 'react';
import { userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fmt } from '../../utils/helpers';

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>
      <span className="toggle-slider"/>
    </label>
  );
}

function Row({ label, sub, children }) {
  return (
    <div className="s-row">
      <div><div className="s-lbl">{label}</div>{sub && <div className="s-sub">{sub}</div>}</div>
      <div>{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{title}</div>
      <div className="card" style={{ padding:'0 16px' }}>{children}</div>
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [tab,  setTab]  = useState('preferences');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'', capital:'100000', emailAlerts:true, theme:'dark', currentPassword:'', newPassword:'', confirmPassword:'' });

  useEffect(() => {
    if (user) setForm(f => ({ ...f, name:user.name||'', capital:String(user.capital||100000), emailAlerts:user.emailAlerts!==false, theme:user.theme||'dark' }));
  }, [user]);

  const set = k => v => setForm(f => ({ ...f, [k]: typeof v === 'object' && v?.target ? v.target.value : v }));

  const savePrefs = async () => {
    setLoading(true);
    try {
      const updated = await userAPI.update({ name:form.name, capital:Number(form.capital), emailAlerts:form.emailAlerts, theme:form.theme });
      updateUser(updated);
      addToast('Settings saved', 'success');
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const changePassword = async () => {
    if (form.newPassword !== form.confirmPassword) { addToast('Passwords do not match', 'error'); return; }
    if (form.newPassword.length < 6) { addToast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      await userAPI.update({ currentPassword:form.currentPassword, newPassword:form.newPassword });
      setForm(f => ({ ...f, currentPassword:'', newPassword:'', confirmPassword:'' }));
      addToast('Password changed!', 'success');
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const initials = (user?.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  return (
    <>
      <div className="page-hdr"><h1 className="page-ttl">Settings</h1></div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 290px', gap:20, alignItems:'start' }}>
        {/* Left */}
        <div>
          <div className="settings-tabs" style={{ marginBottom:20 }}>
            {['preferences','account','notifications'].map(t=>(
              <button key={t} className={`s-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'preferences' && (
            <>
              <Section title="Display">
                <Row label="Theme" sub="Dark mode is optimised for trading">
                  <div style={{ display:'flex', gap:6 }}>
                    {['dark','light'].map(t=>(
                      <button key={t} onClick={()=>set('theme')(t)} className={`btn btn-sm ${form.theme===t?'btn-primary':'btn-ghost'}`}>
                        {t==='dark'?'🌙 Dark':'☀️ Light'}
                      </button>
                    ))}
                  </div>
                </Row>
              </Section>

              <Section title="Portfolio">
                <Row label="Starting Capital" sub="Used for position sizing and P&L calculations">
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>₹</span>
                    <input className="finput" type="number" value={form.capital} onChange={set('capital')} style={{ width:130 }} min="1000"/>
                  </div>
                </Row>
              </Section>

              <Section title="Profile">
                <Row label="Display Name">
                  <input className="finput" value={form.name} onChange={set('name')} style={{ width:180 }}/>
                </Row>
              </Section>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className="btn btn-primary" onClick={savePrefs} disabled={loading}>
                  {loading ? <span className="spinner spinner-sm"/> : 'Save Changes'}
                </button>
              </div>
            </>
          )}

          {tab === 'account' && (
            <>
              <Section title="Change Password">
                <div style={{ padding:'8px 0' }}>
                  <div className="fg"><label className="flabel">Current Password</label><input className="finput" type="password" value={form.currentPassword} onChange={set('currentPassword')} placeholder="••••••••"/></div>
                  <div className="fg"><label className="flabel">New Password</label><input className="finput" type="password" value={form.newPassword} onChange={set('newPassword')} placeholder="Min. 6 characters"/></div>
                  <div className="fg"><label className="flabel">Confirm New Password</label><input className="finput" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••"/></div>
                  <div style={{ display:'flex', justifyContent:'flex-end', paddingBottom:8 }}>
                    <button className="btn btn-primary" onClick={changePassword} disabled={loading||!form.currentPassword||!form.newPassword}>
                      {loading ? <span className="spinner spinner-sm"/> : 'Change Password'}
                    </button>
                  </div>
                </div>
              </Section>

              <Section title="Danger Zone">
                <div style={{ padding:'10px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div><div className="s-lbl" style={{ color:'var(--red)' }}>Delete Account</div><div className="s-sub">Permanently deletes all your data. Cannot be undone.</div></div>
                  <button className="btn btn-danger btn-sm" onClick={()=>{ if(window.confirm('This will permanently delete your account and all trades. Are you sure?')) addToast('Contact support to delete your account','info'); }}>Delete</button>
                </div>
              </Section>
            </>
          )}

          {tab === 'notifications' && (
            <>
              <Section title="Email Alerts">
                <Row label="Email Alerts" sub="Master toggle for all email notifications"><Toggle checked={form.emailAlerts} onChange={set('emailAlerts')}/></Row>
                <Row label="Buy Zone Alerts" sub="When price enters your entry zone"><Toggle checked={form.emailAlerts} onChange={()=>{}}/></Row>
                <Row label="Target Hit Alerts" sub="When target price is reached"><Toggle checked={form.emailAlerts} onChange={()=>{}}/></Row>
                <Row label="Stop Loss Alerts" sub="When stop loss is triggered"><Toggle checked={form.emailAlerts} onChange={()=>{}}/></Row>
              </Section>

              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:11, color:'var(--muted)', lineHeight:1.7 }}>
                <strong style={{ color:'var(--text2)', display:'block', marginBottom:5 }}>Setup Required</strong>
                Email alerts require <code style={{ background:'var(--card2)', padding:'1px 5px', borderRadius:4 }}>EMAIL_USER</code> and <code style={{ background:'var(--card2)', padding:'1px 5px', borderRadius:4 }}>EMAIL_PASS</code> in Vercel environment variables. Use a Gmail App Password — never your real password.
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className="btn btn-primary" onClick={savePrefs} disabled={loading}>
                  {loading ? <span className="spinner spinner-sm"/> : 'Save Notifications'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Profile card */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
              <div style={{ width:50, height:50, borderRadius:'50%', background:'linear-gradient(135deg,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:'#000', flexShrink:0 }}>{initials}</div>
              <div><div style={{ fontWeight:700, fontSize:15 }}>{user?.name}</div><div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{user?.email}</div></div>
            </div>
            {[
              { lbl:'Capital',      val:fmt(user?.capital||100000) },
              { lbl:'Email Alerts', val:user?.emailAlerts!==false?'✓ Enabled':'✕ Disabled', col:user?.emailAlerts!==false?'var(--green)':'var(--red)' },
              { lbl:'Theme',        val:(user?.theme||'dark').charAt(0).toUpperCase()+(user?.theme||'dark').slice(1) },
              { lbl:'Member Since', val:user?.createdAt?new Date(user.createdAt).toLocaleDateString('en-IN',{month:'long',year:'numeric'}):'—' },
            ].map(s=>(
              <div key={s.lbl} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                <span style={{ color:'var(--muted)' }}>{s.lbl}</span>
                <span style={{ fontWeight:600, color:s.col||'var(--text)' }}>{s.val}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Daily Recap</div>
            <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.7 }}>When enabled, you'll receive a daily summary at 3:30 PM IST including P&L, triggered alerts, and open positions.</div>
          </div>
        </div>
      </div>
    </>
  );
}