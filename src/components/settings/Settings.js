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

function SettingsRow({ label, sub, children }) {
  return (
    <div className="settings-row">
      <div>
        <div className="settings-label">{label}</div>
        {sub && <div className="settings-sub">{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{title}</div>
      <div className="card" style={{ padding: '0 16px' }}>{children}</div>
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [tab,      setTab]      = useState('preferences');
  const [loading,  setLoading]  = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    capital: String(user?.capital || 100000),
    emailAlerts: user?.emailAlerts !== false,
    theme: user?.theme || 'dark',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) setForm(f => ({ ...f, name: user.name, capital: String(user.capital || 100000), emailAlerts: user.emailAlerts !== false, theme: user.theme || 'dark' }));
  }, [user]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: typeof v === 'object' && v.target ? v.target.value : v }));

  const savePreferences = async () => {
    setLoading(true);
    try {
      const updated = await userAPI.update({ name: form.name, capital: Number(form.capital), emailAlerts: form.emailAlerts, theme: form.theme });
      updateUser(updated);
      addToast('Settings saved', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (form.newPassword !== form.confirmPassword) { addToast('Passwords do not match', 'error'); return; }
    if (form.newPassword.length < 6) { addToast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      await userAPI.update({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
      addToast('Password changed successfully', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Left: Settings tabs */}
        <div>
          <div className="settings-tabs" style={{ marginBottom: 20 }}>
            {['preferences', 'account', 'notifications'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`settings-tab ${tab === t ? 'active' : ''}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'preferences' && (
            <>
              <Section title="Display">
                <SettingsRow label="Theme" sub="Dark mode is optimised for trading">
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['dark', 'light'].map(t => (
                      <button key={t} onClick={() => set('theme')(t)}
                        className={`btn btn-sm ${form.theme === t ? 'btn-primary' : 'btn-ghost'}`}>
                        {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                      </button>
                    ))}
                  </div>
                </SettingsRow>
              </Section>

              <Section title="Capital">
                <SettingsRow label="Starting Capital" sub="Used for position sizing and P&L calculations">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>₹</span>
                    <input className="form-input" type="number" value={form.capital} onChange={set('capital')}
                      style={{ width: 130 }} min="1000"/>
                  </div>
                </SettingsRow>
              </Section>

              <Section title="Profile">
                <SettingsRow label="Display Name">
                  <input className="form-input" value={form.name} onChange={set('name')} style={{ width: 180 }}/>
                </SettingsRow>
              </Section>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={savePreferences} disabled={loading}>
                  {loading ? <span className="spinner spinner-sm"/> : 'Save Changes'}
                </button>
              </div>
            </>
          )}

          {tab === 'account' && (
            <>
              <Section title="Change Password">
                <div style={{ padding: '8px 0' }}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input className="form-input" type="password" value={form.currentPassword}
                      onChange={set('currentPassword')} placeholder="••••••••"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input className="form-input" type="password" value={form.newPassword}
                      onChange={set('newPassword')} placeholder="Min. 6 characters"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input className="form-input" type="password" value={form.confirmPassword}
                      onChange={set('confirmPassword')} placeholder="••••••••"/>
                  </div>
                  <div style={{ textAlign: 'right', paddingBottom: 8 }}>
                    <button className="btn btn-primary" onClick={changePassword} disabled={loading || !form.currentPassword || !form.newPassword}>
                      {loading ? <span className="spinner spinner-sm"/> : 'Change Password'}
                    </button>
                  </div>
                </div>
              </Section>

              <Section title="Danger Zone">
                <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="settings-label" style={{ color: 'var(--red)' }}>Delete Account</div>
                    <div className="settings-sub">This action cannot be undone. All data will be permanently deleted.</div>
                  </div>
                  <button className="btn btn-danger" onClick={() => { if (window.confirm('Delete your account and all data? This cannot be undone.')) addToast('Contact support to delete your account', 'info'); }}>
                    Delete Account
                  </button>
                </div>
              </Section>
            </>
          )}

          {tab === 'notifications' && (
            <>
              <Section title="Email Notifications">
                <SettingsRow label="Email Alerts" sub="Receive email when conditions are triggered">
                  <Toggle checked={form.emailAlerts} onChange={v => set('emailAlerts')(v)}/>
                </SettingsRow>
                <SettingsRow label="Buy Zone Alerts" sub="When price enters your entry zone">
                  <Toggle checked={form.emailAlerts} onChange={v => {}}/>
                </SettingsRow>
                <SettingsRow label="Target Hit Alerts" sub="When target price is reached">
                  <Toggle checked={form.emailAlerts} onChange={v => {}}/>
                </SettingsRow>
                <SettingsRow label="Stop Loss Alerts" sub="When stop loss is triggered">
                  <Toggle checked={form.emailAlerts} onChange={v => {}}/>
                </SettingsRow>
              </Section>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Note</div>
                  Email alerts require <strong>EMAIL_USER</strong> and <strong>EMAIL_PASS</strong> to be set in your Vercel environment variables. Your real Gmail password is never stored — use a Gmail App Password.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={savePreferences} disabled={loading}>
                  {loading ? <span className="spinner spinner-sm"/> : 'Save Notifications'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Profile card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Profile summary */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#000', flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
            </div>
            {[
              { label: 'Capital', value: fmt(user?.capital || 100000) },
              { label: 'Email Alerts', value: user?.emailAlerts !== false ? '✓ Enabled' : '✕ Disabled', color: user?.emailAlerts !== false ? 'var(--green)' : 'var(--red)' },
              { label: 'Theme', value: user?.theme || 'Dark' },
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontWeight: 600, color: s.color || 'var(--text-primary)' }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Daily recap preview */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily Recap Email</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              When email alerts are enabled, you'll receive a daily summary at market close (3:30 PM IST) including:
            </div>
            <ul style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, paddingLeft: 16, lineHeight: 1.8 }}>
              <li>Portfolio P&L for the day</li>
              <li>Alerts triggered</li>
              <li>Open positions summary</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}