import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://khutgtqavfyieykoxtez.supabase.co'; // Replace with your project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodXRndHFhdmZ5aWV5a294dGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NDExODYsImV4cCI6MjEwNjIxNzE4Nn0.TAZgRaonRt9OT9oDqmb_EFCaZaVYbgo7i33fNvxe5U4'; // Replace with your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ------------------------------

// Before accounts existed, each device kept a private budget ID (in the address or in local storage).
// It is only used once after signing in, to attach that old budget to the account.
const readLegacyBudgetIds = () => {
  const ids = [];
  try { ids.push(new URLSearchParams(window.location.search).get('budgetId')); } catch (e) { /* ignore */ }
  try { ids.push(localStorage.getItem('budgetId')); } catch (e) { /* storage unavailable */ }
  ids.push('default-budget'); // the shared ID the very first version of the app used
  return [...new Set(ids.filter(Boolean))];
};
const forgetLegacyBudgetId = () => {
  try { localStorage.removeItem('budgetId'); } catch (e) { /* storage unavailable */ }
  try {
    if (new URLSearchParams(window.location.search).has('budgetId')) window.history.replaceState({}, '', window.location.pathname);
  } catch (e) { /* ignore */ }
};

// Sign-in screen: email + password, or an emailed sign-in link.
const AuthScreen = () => {
  const [mode, setMode] = useState('password'); // 'password' | 'link'
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const back = window.location.origin + window.location.pathname;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(''); setMsg('');
    try {
      if (mode === 'link') {
        const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: back } });
        if (error) throw error;
        setMsg('Check your email for a sign-in link. It can take a minute.');
      } else if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: back } });
        if (error) throw error;
        if (!data.session) setMsg('Account created. Check your email to confirm it, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e2) {
      setErr((e2 && e2.message) || String(e2));
    }
    setBusy(false);
  };
  const input = { width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f5f7', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '16px', boxSizing: 'border-box' }}>
      <form onSubmit={submit} data-testid="auth-form" style={{ width: '100%', maxWidth: '360px', backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1f2f4f' }}>Envelope Budgeting</div>
        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '-6px' }}>
          {mode === 'link' ? 'We will email you a link to sign in.' : isSignUp ? 'Create your account.' : 'Sign in to open your budget on any device.'}
        </div>
        <input type="email" required autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} style={input} />
        {mode === 'password' && (
          <input type="password" required minLength={6} autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder="Password" aria-label="Password" value={password} onChange={e => setPassword(e.target.value)} style={input} />
        )}
        <button type="submit" disabled={busy} style={{ padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2f6fb3', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: busy ? 'wait' : 'pointer' }}>
          {busy ? 'Please wait…' : mode === 'link' ? 'Email me a link' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
        {err && <div role="alert" style={{ fontSize: '0.82rem', color: '#b42318', backgroundColor: '#fde2e0', padding: '8px 10px', borderRadius: '8px' }}>{err}</div>}
        {msg && <div role="status" style={{ fontSize: '0.82rem', color: '#17603a', backgroundColor: '#cdeed6', padding: '8px 10px', borderRadius: '8px' }}>{msg}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.8rem' }}>
          <button type="button" onClick={() => { setMode(mode === 'link' ? 'password' : 'link'); setErr(''); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#2f6fb3', cursor: 'pointer', padding: 0 }}>
            {mode === 'link' ? 'Use a password instead' : 'Email me a sign-in link instead'}
          </button>
          {mode === 'password' && (
            <button type="button" onClick={() => { setIsSignUp(v => !v); setErr(''); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0 }}>
              {isSignUp ? 'I have an account' : 'Create account'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

// Order-independent JSON so local state can be compared with what Postgres jsonb returns
// (jsonb does not preserve key order, including inside nested objects).
const stable = (v) => {
  if (Array.isArray(v)) return '[' + v.map(item => (item === undefined ? 'null' : stable(item))).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort()
      .map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
};

const snapshot = (d = {}) => stable({
  accounts: d.accounts ?? [],
  groups: d.groups ?? [],
  collapsedGroups: d.collapsedGroups ?? {},
  collapsedAccountTx: d.collapsedAccountTx ?? {},
  envelopes: d.envelopes ?? [],
  transactions: d.transactions ?? [],
  debts: d.debts ?? [],
  investments: d.investments ?? [],
  scheduled: d.scheduled ?? []
});

const DATA_LISTS = ['accounts', 'envelopes', 'transactions', 'debts', 'investments', 'scheduled'];
const normData = (d = {}) => ({
  accounts: d.accounts ?? [], groups: d.groups ?? [], collapsedGroups: d.collapsedGroups ?? {}, collapsedAccountTx: d.collapsedAccountTx ?? {},
  envelopes: d.envelopes ?? [], transactions: d.transactions ?? [], debts: d.debts ?? [], investments: d.investments ?? [], scheduled: d.scheduled ?? []
});
// Three-way merge of two edited copies of the budget, using the last copy both sides agreed on as the base.
// Whatever only one side changed is kept; if both changed the same item, "mine" wins.
const mergeBudgetData = (baseIn, mineIn, theirsIn) => {
  const base = normData(baseIn), mine = normData(mineIn), theirs = normData(theirsIn);
  const same = (a, b) => stable(a) === stable(b);
  const out = {};
  DATA_LISTS.forEach(k => {
    const B = new Map(base[k].map(x => [x.id, x])), M = new Map(mine[k].map(x => [x.id, x])), T = new Map(theirs[k].map(x => [x.id, x]));
    const ids = [...theirs[k].map(x => x.id), ...mine[k].map(x => x.id).filter(id => !T.has(id))];
    out[k] = ids.map(id => {
      const b = B.get(id), m = M.get(id), t = T.get(id);
      if (!b) return m || t;                       // added on one side (or both)
      if (!m) return same(b, t) ? null : t;        // I deleted it; keep it only if they edited it
      if (!t) return same(b, m) ? null : m;        // they deleted it; keep it only if I edited it
      if (same(b, m)) return t;
      return m;
    }).filter(Boolean);
  });
  out.groups = same(base.groups, mine.groups) ? theirs.groups
    : same(base.groups, theirs.groups) ? mine.groups
    : [...mine.groups, ...theirs.groups.filter(g => !mine.groups.includes(g))];
  ['collapsedGroups', 'collapsedAccountTx'].forEach(k => {
    const o = {};
    new Set([...Object.keys(mine[k]), ...Object.keys(theirs[k])]).forEach(key => {
      o[key] = same(base[k][key], mine[k][key]) ? theirs[k][key] : mine[k][key];
      if (o[key] === undefined) delete o[key];
    });
    out[k] = o;
  });
  return out;
};

// Months to pay off a loan, and the interest paid along the way
const loanPayoff = (balance, apr, payment) => {
  const bal = Number(balance) || 0;
  if (bal <= 0.004) return { done: true, months: 0, interest: 0 };
  const r = (Number(apr) || 0) / 1200;
  const pay = Number(payment) || 0;
  if (pay <= 0 || pay <= bal * r + 0.004) return { never: true };
  let b = bal, months = 0, interest = 0;
  while (b > 0.004 && months < 1200) {
    const i = b * r;
    interest += i;
    b = b + i - pay;
    months += 1;
  }
  return { months, interest: Math.round(interest * 100) / 100 };
};

// ----- Scheduled (recurring) transactions -----
const SCHED_FREQS = [['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Every month'], ['yearly', 'Every year']];
const isoToDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const dateToIso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
// The date after `iso` for a schedule. Monthly/yearly keep the original day of the month (clamped for short months).
const nextOccurrence = (iso, freq, anchorDay) => {
  const dt = isoToDate(iso);
  if (freq === 'weekly') dt.setDate(dt.getDate() + 7);
  else if (freq === 'biweekly') dt.setDate(dt.getDate() + 14);
  else {
    const day = anchorDay || dt.getDate();
    const months = freq === 'yearly' ? 12 : 1;
    const first = new Date(dt.getFullYear(), dt.getMonth() + months, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    first.setDate(Math.min(day, last));
    return dateToIso(first);
  }
  return dateToIso(dt);
};
const schedTxId = (schedId, date) => `sch-${schedId}-${date}`;

const MOBILE_QUERY = '(max-width: 720px)';
const isMobileNow = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;

const TAB_LABELS = {
  budget: 'Budget',
  new: 'Add New',
  accounts: 'Accounts',
  investments: 'Investments',
  scheduled: 'Scheduled',
  payees: 'Payees',
  transactions: 'Transactions',
  reports: 'Reports',
  debts: 'Debts',
  import: 'Import',
  trash: 'Trash'
};
const NAV_LABELS = { ...TAB_LABELS, new: '+ New' };

const INVESTMENT_TYPES = ['Brokerage', '401(k)', 'IRA', 'Roth IRA', 'HSA', 'Crypto', 'Other'];

const formatMoney = (n) => {
  const v = Number(n) || 0;
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const round2 = (n) => Math.round(Number(n) * 100) / 100;

// ---- monthly budgeting helpers ----
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const addMonthKey = (key, delta) => {
  const [y, m] = key.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};

const monthKeyOf = (dateStr) => String(dateStr || '').slice(0, 7);

const monthLabel = (key, short) => {
  const [y, m] = key.split('-').map(Number);
  const name = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1];
  return `${short ? name.slice(0, 3) : name} ${y}`;
};

// One envelope, month by month. What is left at the end of a month carries into the next one.
// An envelope that ends a month below zero starts the next month at $0: that overspending is taken
// out of Ready to Assign instead (see `overspend`).
// `incomeMap` is money sent straight into this envelope from income transactions (see incomeAllocs).
const buildEnvTimeline = (budgetMap, spendMap, throughKey, incomeMap, cardMap) => {
  const rows = new Map();
  const keys = [...Object.keys(budgetMap || {}), ...Object.keys(spendMap || {}), ...Object.keys(incomeMap || {})].filter(k => MONTH_RE.test(k)).sort();
  if (!keys.length || keys[0] > throughKey) return rows;
  let carry = 0;
  for (let k = keys[0], n = 0; k <= throughKey && n < 1200; k = addMonthKey(k, 1), n++) {
    const budgeted = Number(budgetMap && budgetMap[k]) || 0;
    const spent = Number(spendMap && spendMap[k]) || 0;
    const income = Number(incomeMap && incomeMap[k]) || 0;
    const end = Math.round((carry + budgeted + income - spent) * 100) / 100;
    const overspend = end < 0 ? -end : 0;
    // Overspending made with a credit card is "credit overspending": the card debt is not covered by money in the
    // card's payment category, but Ready to Assign is not touched. The rest of an overspend is cash overspending.
    const cardSpent = Number(cardMap && cardMap[k]) || 0;
    const creditOver = Math.round(Math.min(overspend, Math.max(0, cardSpent)) * 100) / 100;
    rows.set(k, { start: carry, budgeted, income, spent, cardSpent, end, overspend, creditOver, cashOver: Math.round((overspend - creditOver) * 100) / 100 });
    carry = end > 0 ? end : 0;
  }
  return rows;
};

// ---- split transaction helpers ----
// An expense is either filed under one envelope (envelopeId) or split across several (splits: [{envelopeId, amount}]).
// A split line with an empty envelopeId is the uncategorized part. Returns the envelope-charged parts only.
const isSplitTx = (t) => !!t && t.type === 'expense' && Array.isArray(t.splits) && t.splits.length > 0;
const txParts = (t) => {
  if (!t || t.type !== 'expense' || t.isTransfer) return [];
  if (isSplitTx(t)) {
    return t.splits
      .filter(s => s.envelopeId)
      .map(s => ({ envelopeId: s.envelopeId, amount: Number(s.amount) || 0 }));
  }
  return t.envelopeId ? [{ envelopeId: t.envelopeId, amount: Number(t.amount) || 0 }] : [];
};
// Income can be sent straight into envelopes: allocations: [{envelopeId, amount}] on an income transaction.
// Whatever is not allocated stays in Ready to Assign. Each allocation counts as assigned in the month of the income.
const incomeAllocs = (t) => {
  if (!t || t.type !== 'income' || t.isTransfer || !Array.isArray(t.allocations)) return [];
  return t.allocations
    .filter(a => a && a.envelopeId && Number(a.amount) > 0)
    .map(a => ({ envelopeId: a.envelopeId, amount: Number(a.amount) }));
};
// Split amounts can be typed as a sum, e.g. "13.97+4.50+2" (a trailing "+" is ignored while typing).
// Returns the total in dollars, or NaN when the text isn't a valid amount/sum.
const evalAmount = (raw) => {
  const s = String(raw == null ? '' : raw).replace(/[$,\s]/g, '').replace(/[+-]+$/, '');
  if (!s || !/^[+-]?(\d+\.?\d*|\.\d+)([+-](\d+\.?\d*|\.\d+))*$/.test(s)) return NaN;
  const total = (s.match(/[+-]?(\d+\.?\d*|\.\d+)/g) || []).reduce((sum, n) => sum + parseFloat(n), 0);
  return Math.round(total * 100) / 100;
};
const isSumText = (raw) => /\d[+-]/.test(String(raw == null ? '' : raw).replace(/[$,\s]/g, ''));

// Amount box for a split line: type a number or a sum. It shows the running total and settles to it on Enter/blur.
const SplitAmountInput = ({ value, onChange, ariaLabel, width, placeholder, onFocus, onBlur, wrapStyle, inputStyle }) => {
  const settle = () => {
    if (isSumText(value)) {
      const n = evalAmount(value);
      if (!isNaN(n)) onChange(String(n));
    }
  };
  const sum = isSumText(value) ? evalAmount(value) : NaN;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', ...(wrapStyle || {}) }}>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={() => { settle(); if (onBlur) onBlur(); }}
        onKeyDown={e => {
          if (e.key === 'Enter' && isSumText(value)) { e.preventDefault(); settle(); }
        }}
        aria-label={ariaLabel}
        placeholder={placeholder || '0.00 or 12+3.50'}
        title="Type a number, or add amounts together like 13.97+4.50"
        style={{ width: width || '100px', padding: '5px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', ...(inputStyle || {}) }}
      />
      {isSumText(value) && (
        <span data-testid="split-sum" style={{ fontSize: '0.7rem', color: isNaN(sum) ? '#dc2626' : '#2563eb', marginTop: '2px' }}>
          {isNaN(sum) ? 'Not a valid sum' : `= $${sum.toFixed(2)}`}
        </span>
      )}
    </div>
  );
};
// Colored "Available" pill, as on YNAB: green = money available, grey = empty, red = overspent, orange = overspent on a credit card only
const availColors = (end, row) => {
  if (end < -0.004) return row && row.cashOver <= 0.004 && row.creditOver > 0.004 ? { bg: '#ffe7c2', fg: '#8a4b00' } : { bg: '#fde2e0', fg: '#b42318' };
  if (end > 0.004) return { bg: '#cdeed6', fg: '#17603a' };
  return { bg: '#e9ecf1', fg: '#5a6372' };
};
const AvailPill = ({ value, row, onClick, label }) => {
  const c = availColors(value, row);
  return (
    <span
      onClick={onClick}
      aria-label={label}
      style={{ display: 'inline-block', minWidth: '64px', textAlign: 'center', padding: '3px 10px', borderRadius: '999px', backgroundColor: c.bg, color: c.fg, fontWeight: 700, fontSize: '0.85rem', cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
    >
      {formatMoney(value)}
    </span>
  );
};

// Assigned box on an envelope row: type a number or a sum. Each valid value is applied as you type.
const AssignedInput = ({ value, onCommit, ariaLabel, width = '92px', big = false }) => {
  const [draft, setDraft] = useState(null);
  return (
    <SplitAmountInput
      value={draft === null ? String(value) : draft}
      ariaLabel={ariaLabel}
      width={width}
      inputStyle={big ? { textAlign: 'center', fontSize: '1.6rem', fontWeight: 700, padding: '10px', boxSizing: 'border-box', width: '100%', minWidth: 0 } : { textAlign: 'right' }}
      placeholder="0.00"
      onFocus={() => setDraft(String(value))}
      onChange={v => {
        setDraft(v);
        const n = v.trim() === '' ? 0 : evalAmount(v);
        if (!isNaN(n)) onCommit(n);
      }}
      onBlur={() => setDraft(null)}
    />
  );
};
// Shows a transaction's effect on its account, e.g. "-$12.50" or "+$5.00" (refunds are expenses with a negative amount)
const signedMoney = (tx) => {
  const v = (tx.type === 'income' ? 1 : -1) * (Number(tx.amount) || 0);
  return `${v < 0 ? '-' : '+'}$${Math.abs(v).toFixed(2)}`;
};
const plainMoney = (n) => `${Number(n) < 0 ? '-' : ''}$${Math.abs(Number(n) || 0).toFixed(2)}`;
// ---- end split transaction helpers ----

// ---- drag-to-reorder for a vertical list of cards ----
// Hold the handle, drag up or down, release to drop. Pointer events, so it works with mouse and touch.
// `ids` is the current order; onCommit(newIds) is called once when the order really changed.
const useDragReorder = (ids, onCommit) => {
  const [drag, setDrag] = useState(null); // { id, dy, target, measuring }
  const ref = useRef(null);
  const els = useRef({});
  const live = useRef({});
  live.current = { ids, onCommit };

  const targetOf = (info, clientY) => {
    const cardTop = clientY + window.scrollY - info.grabOffset;
    const center = cardTop + info.rects[info.from].height / 2;
    let target = 0;
    info.ids.forEach((_, i) => { if (i !== info.from && info.rects[i].top + info.rects[i].height / 2 < center) target++; });
    return { target, dy: cardTop - info.rects[info.from].top };
  };
  const finish = (commit) => {
    const info = ref.current;
    if (info) {
      if (info.cleanup) info.cleanup();
      if (commit && info.phase === 'drag') {
        const { target } = targetOf(info, info.clientY);
        const others = info.ids.filter((_, i) => i !== info.from);
        const next = [...others.slice(0, target), info.id, ...others.slice(target)];
        if (next.some((x, i) => x !== info.ids[i])) live.current.onCommit(next);
      }
    }
    ref.current = null;
    setDrag(null);
  };
  const start = (e, id) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const onMove = (ev) => {
      const info = ref.current;
      if (!info) return;
      info.clientY = ev.clientY;
      if (info.phase === 'drag') {
        const { target, dy } = targetOf(info, ev.clientY);
        setDrag({ id: info.id, dy, target, measuring: false });
      }
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    document.body.style.userSelect = 'none';
    ref.current = {
      id,
      phase: 'pending',
      clientY: e.clientY,
      cleanup: () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        document.body.style.userSelect = '';
      }
    };
    setDrag({ id, dy: 0, target: 0, measuring: true }); // cards fold while dragging, then get measured
  };
  useLayoutEffect(() => {
    if (!drag || !drag.measuring) return;
    const info = ref.current;
    if (!info) return;
    const list = live.current.ids.slice();
    const scrollY = window.scrollY;
    const rects = list.map(id => {
      const el = els.current[id];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, height: r.height };
    });
    const from = list.indexOf(info.id);
    if (from === -1 || rects.some(r => !r)) { finish(false); return; }
    ref.current = {
      ...info, ids: list, rects, from, phase: 'drag',
      grabOffset: Math.min(rects[from].height / 2, 24),
      gap: list.length > 1 ? Math.max(0, rects[1].top - (rects[0].top + rects[0].height)) : 16
    };
    const { target, dy } = targetOf(ref.current, info.clientY);
    setDrag({ id: info.id, dy, target, measuring: false });
  }, [drag && drag.measuring]);
  useEffect(() => () => { if (ref.current && ref.current.cleanup) ref.current.cleanup(); }, []);

  const styleFor = (id) => {
    const info = ref.current;
    if (!drag || drag.measuring || !info || info.phase !== 'drag') return {};
    if (id === drag.id) {
      return { transform: `translateY(${drag.dy}px)`, position: 'relative', zIndex: 20, boxShadow: '0 10px 24px rgba(0,0,0,0.2)', cursor: 'grabbing' };
    }
    const idx = info.ids.indexOf(id);
    const step = info.rects[info.from].height + info.gap;
    let shift = 0;
    if (info.from < drag.target && idx > info.from && idx <= drag.target) shift = -step;
    else if (info.from > drag.target && idx >= drag.target && idx < info.from) shift = step;
    return { transform: `translateY(${shift}px)`, transition: 'transform 0.15s ease' };
  };
  return { dragging: drag !== null, start, styleFor, refFor: (id) => (el) => { els.current[id] = el; } };
};
// ---- end drag-to-reorder ----

// ---- transfer helpers ----
// A transfer between two accounts is stored as two linked transactions that share a transferId:
// the money-out leg (type 'expense') in the source account and the money-in leg (type 'income') in the
// destination. Both carry isTransfer, so account balances move but budgets and reports ignore them.
const centsOf = (n) => Math.round((Number(n) || 0) * 100);
const dayNumber = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN;
};
// Can these two existing transactions be linked as one transfer?
const canLinkAsTransfer = (a, b) =>
  !!a && !!b && a.id !== b.id &&
  !a.isDeleted && !b.isDeleted && !a.isTransfer && !b.isTransfer &&
  a.type !== b.type && a.accountId !== b.accountId &&
  centsOf(a.amount) === centsOf(b.amount) && centsOf(a.amount) > 0;
// Suggest likely pairs (same amount, opposite direction, different accounts, dates within a few days).
const findTransferMatches = (txs, maxDays = 3) => {
  const live = txs.filter(t => !t.isDeleted && !t.isTransfer && t.payee !== 'Reconciliation Adjustment');
  const outs = live.filter(t => t.type === 'expense');
  const ins = live.filter(t => t.type === 'income');
  const cands = [];
  outs.forEach(o => ins.forEach(i => {
    if (!canLinkAsTransfer(o, i)) return;
    const gap = Math.abs(dayNumber(o.date) - dayNumber(i.date));
    if (gap <= maxDays) cands.push({ out: o, in: i, gap });
  }));
  cands.sort((x, y) => x.gap - y.gap);
  const usedO = new Set();
  const usedI = new Set();
  const pairs = [];
  cands.forEach(c => {
    if (usedO.has(c.out.id) || usedI.has(c.in.id)) return;
    usedO.add(c.out.id);
    usedI.add(c.in.id);
    pairs.push(c);
  });
  return pairs.sort((x, y) => String(y.out.date).localeCompare(String(x.out.date)));
};
// ---- end transfer helpers ----

// ---- Actual Budget import ----
// Reads the .zip that Actual's "Export data" produces (db.sqlite + metadata.json) entirely in the browser.
// The SQLite file is read by a small built-in reader (table b-trees only), so no library or download is needed.

// --- zip ---
const zipEntries = (buf) => {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('This does not look like a .zip file.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = new Map();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    out.set(name, { method, csize, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
};
const zipRead = async (buf, entries, name) => {
  const e = entries.get(name);
  if (!e) return null;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const start = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
  const data = buf.subarray(start, start + e.csize);
  if (e.method === 0) return data;
  if (e.method !== 8) throw new Error('Unsupported zip compression.');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

// --- sqlite (read-only, table b-trees) ---
const sqliteOpen = (bytes) => {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header = new TextDecoder().decode(bytes.subarray(0, 15));
  if (header !== 'SQLite format 3') throw new Error('The export does not contain a SQLite database.');
  let pageSize = dv.getUint16(16, false);
  if (pageSize === 1) pageSize = 65536;
  const usable = pageSize - bytes[20];
  const textEnc = dv.getUint32(56, false); // 1 = UTF-8
  if (textEnc !== 1) throw new Error('Unsupported database text encoding.');
  const dec = new TextDecoder();
  const pageStart = (n) => (n - 1) * pageSize;
  const varint = (o) => {
    let v = 0n;
    for (let i = 0; i < 8; i++) {
      const b = bytes[o + i];
      v = (v << 7n) | BigInt(b & 0x7f);
      if (!(b & 0x80)) return [v, i + 1];
    }
    v = (v << 8n) | BigInt(bytes[o + 8]);
    return [v, 9];
  };
  const readRecord = (buf) => {
    const bdv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const vi = (o) => {
      let v = 0n;
      for (let i = 0; i < 8; i++) {
        const b = buf[o + i];
        v = (v << 7n) | BigInt(b & 0x7f);
        if (!(b & 0x80)) return [v, i + 1];
      }
      v = (v << 8n) | BigInt(buf[o + 8]);
      return [v, 9];
    };
    const [hsz, hl] = vi(0);
    const types = [];
    let o = hl;
    while (o < Number(hsz)) { const [t, l] = vi(o); types.push(Number(t)); o += l; }
    let d = Number(hsz);
    const vals = [];
    for (const t of types) {
      if (t === 0) vals.push(null);
      else if (t >= 1 && t <= 6) {
        const n = [0, 1, 2, 3, 4, 6, 8][t];
        let v = 0n;
        for (let i = 0; i < n; i++) v = (v << 8n) | BigInt(buf[d + i]);
        if (buf[d] & 0x80) v -= 1n << BigInt(8 * n);
        vals.push(Number(v)); d += n;
      } else if (t === 7) { vals.push(bdv.getFloat64(d, false)); d += 8; }
      else if (t === 8) vals.push(0);
      else if (t === 9) vals.push(1);
      else if (t >= 12 && t % 2 === 0) { const n = (t - 12) / 2; vals.push(buf.slice(d, d + n)); d += n; }
      else if (t >= 13) { const n = (t - 13) / 2; vals.push(dec.decode(buf.subarray(d, d + n))); d += n; }
      else throw new Error('Unreadable database record.');
    }
    return vals;
  };
  const payloadOf = (cell, total) => {
    // cell = offset of payload start; handles overflow pages
    const X = usable - 35;
    if (total <= X) return bytes.slice(cell, cell + total);
    const M = Math.floor(((usable - 12) * 32) / 255) - 23;
    const K = M + ((total - M) % (usable - 4));
    const local = K <= X ? K : M;
    const out = new Uint8Array(total);
    out.set(bytes.subarray(cell, cell + local), 0);
    let got = local;
    let next = dv.getUint32(cell + local, false);
    while (next && got < total) {
      const ps = pageStart(next);
      const take = Math.min(usable - 4, total - got);
      out.set(bytes.subarray(ps + 4, ps + 4 + take), got);
      got += take;
      next = dv.getUint32(ps, false);
    }
    return out;
  };
  const walk = (pageNo, onRow) => {
    const ps = pageStart(pageNo);
    const hb = ps + (pageNo === 1 ? 100 : 0);
    const kind = bytes[hb];
    const cells = dv.getUint16(hb + 3, false);
    if (kind === 0x0d) {
      for (let i = 0; i < cells; i++) {
        const cp = ps + dv.getUint16(hb + 8 + i * 2, false);
        const [size, l1] = varint(cp);
        const [rowid, l2] = varint(cp + l1);
        onRow(Number(rowid), readRecord(payloadOf(cp + l1 + l2, Number(size))));
      }
    } else if (kind === 0x05) {
      for (let i = 0; i < cells; i++) {
        const cp = ps + dv.getUint16(hb + 12 + i * 2, false);
        walk(dv.getUint32(cp, false), onRow);
      }
      walk(dv.getUint32(hb + 8, false), onRow);
    } else throw new Error('Unsupported database page.');
  };
  const splitTop = (s) => {
    const parts = []; let depth = 0; let cur = ''; let q = '';
    for (const ch of s) {
      if (q) { cur += ch; if (ch === q) q = ''; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
      if (ch === '[') { q = ']'; cur += ch; continue; }
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  };
  const tables = new Map();
  walk(1, (rowid, r) => {
    if (r[0] === 'table') tables.set(r[1], { root: r[3], sql: r[4] });
  });
  return {
    tableNames: () => [...tables.keys()],
    rows: (name) => {
      const t = tables.get(name);
      if (!t) return [];
      const body = t.sql.slice(t.sql.indexOf('(') + 1, t.sql.lastIndexOf(')'));
      const cols = [];
      splitTop(body).forEach(def => {
        if (/^(primary|unique|check|foreign|constraint)\b/i.test(def)) return;
        const m = /^(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([^\s]+))\s*(.*)$/s.exec(def);
        if (!m) return;
        // Columns added later with ALTER TABLE are missing from older rows; the schema's DEFAULT fills them in.
        const dm = /default\s+('(?:[^']|'')*'|"[^"]*"|[-+]?\d+(?:\.\d+)?|null)/i.exec(m[5] || '');
        let dflt = null;
        if (dm) {
          const lit = dm[1];
          if (/^['"]/.test(lit)) dflt = lit.slice(1, -1).replace(/''/g, "'");
          else if (/^null$/i.test(lit)) dflt = null;
          else dflt = Number(lit);
        }
        cols.push({ name: m[1] || m[2] || m[3] || m[4], rowidAlias: /integer\s+primary\s+key/i.test(m[5] || ''), def: dflt });
      });
      const out = [];
      walk(t.root, (rowid, vals) => {
        const o = {};
        cols.forEach((c, i) => { o[c.name] = c.rowidAlias && vals[i] === null ? rowid : (i < vals.length ? vals[i] : c.def); });
        out.push(o);
      });
      return out;
    }
  };
};

const ACTUAL_TABLES = ['accounts', 'category_groups', 'categories', 'category_mapping', 'payees', 'transactions', 'zero_budgets'];

// Open an Actual export (.zip as bytes) and pull out the tables the importer needs.
const readActualExport = async (bytes) => {
  const entries = zipEntries(bytes);
  const dbBytes = await zipRead(bytes, entries, 'db.sqlite');
  if (!dbBytes) throw new Error("No db.sqlite found. Use Actual's Settings > Export data.");
  let meta = {};
  try {
    const m = await zipRead(bytes, entries, 'metadata.json');
    if (m) meta = JSON.parse(new TextDecoder().decode(m));
  } catch (e) { /* metadata is optional */ }
  const db = sqliteOpen(dbBytes);
  const tables = {};
  ACTUAL_TABLES.forEach(n => { tables[n] = db.rows(n); });
  if (!tables.transactions.length && !tables.accounts.length) throw new Error('That export has no accounts or transactions.');
  return { tables, meta };
};

// Retirement and brokerage accounts are tracked on the Investments tab, not in the budget, so they start unticked.
const looksLikeInvestment = (name) => /\b(ira|roth|401\s?k|403\s?b|hsa|brokerage|invest(ment|ments)?|retirement|crypto)\b/i.test(String(name || ''));

const guessActualAccountType = (name) => {
  const n = String(name || '').toLowerCase();
  if (/card|credit|visa|mastercard|amex|discover|autograph|reflect|simplicity/.test(n)) return 'Credit Card';
  if (/saving/.test(n)) return 'Savings';
  if (/cash/.test(n) && !/cashback/.test(n)) return 'Cash';
  return 'Checking';
};

const actualDate = (d) => {
  const s = String(d || '');
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : '';
};
const cents = (n) => Math.round(Number(n) || 0) / 100;

// What Actual has, and how each account will be treated by default.
const describeActualExport = (tables) => {
  const live = tables.transactions.filter(t => !t.tombstone);
  const balance = {};
  const counts = {};
  live.forEach(t => {
    if (t.isParent) return;
    balance[t.acct] = (balance[t.acct] || 0) + (Number(t.amount) || 0);
    if (!t.isChild) counts[t.acct] = (counts[t.acct] || 0) + 1;
  });
  const accounts = tables.accounts
    .filter(a => !a.tombstone)
    .map(a => {
      const off = !!a.offbudget;
      const bal = cents(balance[a.id]);
      return {
        id: a.id,
        name: String(a.name || '').trim() || 'Account',
        offBudget: off,
        closed: !!a.closed,
        balance: bal,
        txCount: counts[a.id] || 0,
        // on-budget accounts import as accounts; off-budget loans become Debts; anything else is skipped
        include: off ? bal < 0 : !looksLikeInvestment(a.name),
        investment: looksLikeInvestment(a.name),
        type: guessActualAccountType(a.name)
      };
    });
  const dates = live.map(t => Number(t.date)).filter(Boolean).sort((x, y) => x - y);
  return {
    accounts,
    txCount: live.filter(t => !t.isParent && !t.isChild).length + live.filter(t => t.isParent).length * 0,
    firstDate: dates.length ? actualDate(dates[0]) : '',
    lastDate: dates.length ? actualDate(dates[dates.length - 1]) : '',
    budgetCount: tables.zero_budgets.filter(z => Number(z.amount) !== 0).length
  };
};

// Turn the Actual tables into this app's data. `choices[accountId] = { include, type }`.
const buildActualImport = (tables, choices, stamp) => {
  const warnings = [];
  const round = (n) => Math.round(n * 100) / 100;
  const nid = (() => { let i = 0; return (p) => `${p}-imp${stamp}-${++i}`; })();

  const accs = new Map(tables.accounts.filter(a => !a.tombstone).map(a => [a.id, a]));
  const choice = (id) => (choices && choices[id]) || {};
  const isIncluded = (id) => { const a = accs.get(id); return !!a && !a.offbudget && choice(id).include !== false; };
  const catMap = new Map(tables.category_mapping.map(m => [m.id, m.transferId]));
  const resolveCat = (id) => { let x = id; for (let i = 0; i < 10 && catMap.has(x) && catMap.get(x) && catMap.get(x) !== x; i++) x = catMap.get(x); return x; };
  const groupsById = new Map(tables.category_groups.map(g => [g.id, g]));
  const cats = new Map(tables.categories.map(c => [c.id, c]));
  const payees = new Map(tables.payees.map(p => [p.id, p]));

  const live = tables.transactions.filter(t => !t.tombstone);
  const byId = new Map(live.map(t => [t.id, t]));
  const kids = new Map();
  live.forEach(t => { if (t.isChild) { if (!kids.has(t.parent_id)) kids.set(t.parent_id, []); kids.get(t.parent_id).push(t); } });

  // --- envelopes: every spending category that has activity or a budget
  const catKind = (id) => {
    if (!id) return 'none';
    const c = cats.get(resolveCat(id));
    if (!c) return 'none';
    return c.is_income || (groupsById.get(c.cat_group) || {}).is_income ? 'income' : 'spend';
  };
  const used = new Set();
  const noteUse = (cid) => { if (catKind(cid) === 'spend') used.add(resolveCat(cid)); };
  live.forEach(t => { if (!t.isParent && isIncluded(t.acct)) noteUse(t.category); });
  tables.zero_budgets.forEach(z => { if (Number(z.amount) !== 0) noteUse(z.category); });

  const orderedCats = tables.categories
    .filter(c => !c.tombstone && used.has(c.id))
    .sort((a, b) => ((groupsById.get(a.cat_group) || {}).sort_order || 0) - ((groupsById.get(b.cat_group) || {}).sort_order || 0) || (a.sort_order || 0) - (b.sort_order || 0));
  const envByCat = new Map();
  const groups = [];
  const envelopes = orderedCats.map(c => {
    const g = groupsById.get(c.cat_group);
    const groupName = String((g && g.name) || 'Other').trim() || 'Other';
    if (!groups.includes(groupName)) groups.push(groupName);
    const hiddenInActual = !!(c.hidden || (g && g.hidden));
    const cleanName = String(c.name || '').trim().replace(hiddenInActual ? /\s*\(hidden\)\s*$/i : /$^/, '');
    const env = { id: nid('env'), name: cleanName || 'Envelope', group: groupName, budget: {}, isDeleted: false, isHidden: hiddenInActual, goalType: 'none', targetAmount: 0, targetDate: '' };
    envByCat.set(c.id, env);
    return env;
  });
  let budgetCount = 0;
  tables.zero_budgets.forEach(z => {
    const amt = cents(z.amount);
    if (!amt) return;
    const env = envByCat.get(resolveCat(z.category));
    const m = String(z.month || '');
    if (!env || !/^\d{6}$/.test(m)) return;
    const key = `${m.slice(0, 4)}-${m.slice(4, 6)}`;
    env.budget[key] = round((env.budget[key] || 0) + amt);
    budgetCount++;
  });
  envelopes.forEach(e => Object.keys(e.budget).forEach(k => { if (!e.budget[k]) delete e.budget[k]; }));

  // --- accounts
  const outAccounts = [];
  const accOut = new Map();
  accs.forEach(a => {
    if (!isIncluded(a.id)) return;
    const type = choice(a.id).type || guessActualAccountType(a.name);
    const acc = {
      id: nid('acc'),
      name: String(a.name || '').trim(),
      isHidden: !!a.closed, // closed in Actual = hidden here; history stays
      type,
      initialBalance: 0,
      isDeleted: false,
      lastReconciledDate: '',
      lastReconciledBalance: null
    };
    outAccounts.push(acc);
    accOut.set(a.id, acc);
  });

  const accName = (id) => String((accs.get(id) || {}).name || 'account').trim();
  const payeeName = (t) => {
    const p = payees.get(t.description);
    if (p && p.transfer_acct) return 'Transfer: ' + accName(p.transfer_acct);
    const n = p ? String(p.name || '').trim() : '';
    return n || '(no payee)';
  };
  const partnerOf = (t) => {
    const p = payees.get(t.description);
    if (!p || !p.transfer_acct) return null;
    const other = t.transferred_id ? byId.get(t.transferred_id) : null;
    return other && other.acct === p.transfer_acct && !other.isChild ? other : null;
  };

  // --- transactions
  const out = [];
  const stats = { oneSidedTransfers: 0, linkedTransfers: 0, splits: 0, flattened: 0, refunds: 0, negativeCardIncome: 0, uncategorizedDeposits: 0 };
  const done = new Set();
  const flags = (t) => ({ cleared: !!(t.cleared || t.reconciled), reconciled: !!t.reconciled });
  const base = (t, extra) => ({ date: actualDate(t.date), payee: payeeName(t), notes: String(t.notes || ''), isDeleted: false, ...flags(t), ...extra });

  const plain = (t, srcNotes) => {
    const acc = accOut.get(t.acct);
    const amount = cents(t.amount);
    const kind = catKind(t.category);
    const isCard = acc.type === 'Credit Card';
    const notes = srcNotes !== undefined ? srcNotes : String(t.notes || '');
    if (kind === 'income') {
      const tx = { id: nid('tx'), ...base(t, { notes }), type: 'income', amount, accountId: acc.id, envelopeId: '' };
      if (isCard) { tx.budgetIncome = true; if (amount < 0) stats.negativeCardIncome++; }
      out.push(tx);
    } else if (kind === 'spend') {
      const env = envByCat.get(resolveCat(t.category));
      if (amount > 0) stats.refunds++;
      out.push({ id: nid('tx'), ...base(t, { notes }), type: 'expense', amount: round(-amount), accountId: acc.id, envelopeId: env ? env.id : '' });
    } else if (amount > 0 && !(payees.get(t.description) || {}).transfer_acct) {
      // Money in with no category is not income in Actual, so it must not feed Ready to Assign here.
      stats.uncategorizedDeposits++;
      out.push({ id: nid('tx'), ...base(t, { notes }), type: 'income', amount, accountId: acc.id, envelopeId: '', isTransfer: true });
    } else if ((payees.get(t.description) || {}).transfer_acct) {
      stats.oneSidedTransfers++;
      out.push({ id: nid('tx'), ...base(t, { notes }), type: amount < 0 ? 'expense' : 'income', amount: Math.abs(amount), accountId: acc.id, envelopeId: '', isTransfer: true, transferAccountId: '' });
    } else {
      out.push({ id: nid('tx'), ...base(t, { notes }), type: 'expense', amount: round(-amount), accountId: acc.id, envelopeId: '' });
    }
  };

  live.slice().sort((a, b) => Number(b.date) - Number(a.date)).forEach(t => {
    if (t.isChild || done.has(t.id) || !isIncluded(t.acct)) return;
    const acc = accOut.get(t.acct);
    const p = payees.get(t.description);

    if (t.isParent) {
      const ks = kids.get(t.id) || [];
      const kinds = new Set(ks.map(k => catKind(k.category)));
      const total = cents(t.amount);
      if (ks.length && kinds.size === 1 && kinds.has('spend')) {
        // A split of spending (or of a refund): keep it as one split transaction
        const parts = [];
        ks.forEach(k => {
          const env = envByCat.get(resolveCat(k.category));
          const envId = env ? env.id : '';
          const amt = round(-cents(k.amount));
          const hit = parts.find(x => x.envelopeId === envId);
          if (hit) hit.amount = round(hit.amount + amt); else parts.push({ envelopeId: envId, amount: amt });
        });
        const tx = { id: nid('tx'), ...base(t), type: 'expense', amount: round(-total), accountId: acc.id, envelopeId: '' };
        if (total > 0) stats.refunds++;
        if (parts.length > 1) { tx.splits = parts; stats.splits++; } else tx.envelopeId = parts[0].envelopeId;
        out.push(tx);
      } else {
        // Mixed income and spending in one split: keep each part as its own transaction
        stats.flattened++;
        ks.forEach(k => plain({ ...k, description: t.description, date: k.date || t.date, acct: t.acct }, String(k.notes || t.notes || '')));
      }
      return;
    }

    if (p && p.transfer_acct && !t.category) {
      const partner = partnerOf(t);
      if (partner && isIncluded(partner.acct) && !done.has(partner.id) && Number(partner.amount) === -Number(t.amount) && Number(t.amount) !== 0) {
        const transferId = nid('xfer');
        const [o, i] = Number(t.amount) < 0 ? [t, partner] : [partner, t];
        const mk = (leg, type, other) => ({
          id: nid('tx'), ...base(leg, { payee: 'Transfer: ' + accOut.get(other.acct).name }),
          type, amount: Math.abs(cents(leg.amount)), accountId: accOut.get(leg.acct).id, envelopeId: '',
          isTransfer: true, transferId, transferAccountId: accOut.get(other.acct).id
        });
        out.push(mk(o, 'expense', i), mk(i, 'income', o));
        done.add(t.id); done.add(partner.id);
        stats.linkedTransfers++;
        return;
      }
    }
    plain(t);
  });

  // --- debts from off-budget loan accounts
  const debts = [];
  accs.forEach(a => {
    if (!a.offbudget || choice(a.id).include === false) return;
    const bal = live.filter(t => t.acct === a.id && !t.isParent).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    if (bal < 0) {
      const v = round(-bal / 100);
      debts.push({ id: nid('d'), name: String(a.name || '').trim(), totalAmount: v, balance: v, APR: 0, minimumPayment: 0, isDeleted: false });
    } else {
      warnings.push(`Off-budget account "${String(a.name || '').trim()}" has a positive balance, so it was skipped.`);
    }
  });

  out.sort((a, b) => b.date.localeCompare(a.date));
  return { accounts: outAccounts, groups, envelopes, transactions: out, debts, warnings, stats, budgetCount };
};
// ---- end Actual Budget import ----

// Older saves kept one lump "assigned" amount per envelope. Move it into the month the envelope was
// first used (or this month), so balances are unchanged at the moment of upgrade.
const migrateBudgetData = (d) => {
  const envs = d.envelopes || [];
  if (!envs.some(e => !e.budget)) return d;
  const thisMonth = getTodayISO().slice(0, 7);
  const firstSpend = {};
  (d.transactions || []).forEach(t => {
    if (t.isDeleted) return;
    const k = monthKeyOf(t.date);
    txParts(t).forEach(p => {
      if (MONTH_RE.test(k) && (!firstSpend[p.envelopeId] || k < firstSpend[p.envelopeId])) firstSpend[p.envelopeId] = k;
    });
  });
  return {
    ...d,
    envelopes: envs.map(e => {
      if (e.budget) return e;
      const { assigned, ...rest } = e;
      const amount = Number(assigned) || 0;
      const month = firstSpend[e.id] && firstSpend[e.id] < thisMonth ? firstSpend[e.id] : thisMonth;
      return { ...rest, budget: amount ? { [month]: Math.round(amount * 100) / 100 } : {} };
    })
  };
};
// ---- end monthly budgeting helpers ----

const REPORT_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const compactMoney = (n) => {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1000000) return '$' + (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return '$' + Math.round(v);
};

// Grouped bar chart: money out (blue) and money in (green) for each month. Click a month to open it.
// Simple line chart for one series: points = [{ label, value }]. Handles negative values.
const LineChart = ({ points, color = '#2f6fb3', ariaLabel, format = (v) => formatMoney(v) }) => {
  const W = 640, H = 210, padL = 62, padR = 10, padT = 12, padB = 30;
  if (!points.length) return null;
  const vals = points.map(p => p.value);
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  if (hi === lo) hi = lo + 1;
  const span = hi - lo;
  const x = (i) => padL + (points.length === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (points.length - 1));
  const y = (v) => padT + (1 - (v - lo) / span) * (H - padT - padB);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const step = Math.max(1, Math.ceil(points.length / 8));
  const ticks = [lo, lo + span / 2, hi];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#eef0f3" />
          <text x={padL - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="#6b7280">{format(t)}</text>
        </g>
      ))}
      {lo < 0 && <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="#cbd2dc" strokeDasharray="4 3" />}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={points.length > 24 ? 2 : 3.5} fill={color}><title>{`${p.label}: ${format(p.value)}`}</title></circle>
          {i % step === 0 && <text x={x(i)} y={H - 10} fontSize="11" textAnchor={i === points.length - 1 && i > 0 ? 'end' : i === 0 ? 'start' : 'middle'} fill="#6b7280">{p.label}</text>}
        </g>
      ))}
    </svg>
  );
};

const ReportChart = ({ data, selectedKey, onSelect }) => {
  const W = 640;
  const H = 210;
  const padL = 46;
  const padR = 8;
  const padT = 10;
  const padB = 34;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(1, ...data.flatMap(d => [d.spent, d.income]));
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const niceMax = ([1, 2, 4, 6, 8, 10].find(st => st * mag >= max) || 10) * mag;
  const slot = innerW / data.length;
  const barW = Math.min(20, slot * 0.36);
  const y = (v) => padT + innerH - (v / niceMax) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * niceMax);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Money spent and received by month">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth="1" />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#6b7280">{compactMoney(t)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = padL + slot * i + slot / 2;
        const sel = d.key === selectedKey;
        const base = padT + innerH;
        return (
          <g key={d.key} onClick={() => onSelect && onSelect(d.key)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            <title>{`${d.full}: spent ${formatMoney(d.spent)}, income ${formatMoney(d.income)}`}</title>
            <rect x={cx - slot / 2 + 1} y={padT} width={slot - 2} height={innerH} fill={sel ? '#eff6ff' : 'transparent'} rx="4" />
            <rect x={cx - barW - 1} y={y(d.spent)} width={barW} height={Math.max(0, base - y(d.spent))} fill="#2563eb" rx="2" />
            <rect x={cx + 1} y={y(d.income)} width={barW} height={Math.max(0, base - y(d.income))} fill="#10b981" rx="2" />
            <text x={cx} y={H - 18} textAnchor="middle" fontSize="10" fill={sel ? '#1e3a8a' : '#6b7280'} fontWeight={sel ? 700 : 400}>{d.label}</text>
            {d.sub && <text x={cx} y={H - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">{d.sub}</text>}
          </g>
        );
      })}
    </svg>
  );
};

// Helper to get local date string YYYY-MM-DD
const getTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Formatting helper: converts YYYY-MM-DD to readable date
const formatDate = (dateStr, type = 'readable') => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (type === 'us') {
      return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(month, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]} ${parseInt(day, 10)}, ${year}`;
    }
  }
  return dateStr;
};

// ---------- CSV import helpers ----------
const MAX_IMPORT_ROWS = 5000;
const MAX_IMPORT_BYTES = 3 * 1024 * 1024;

// Small RFC-4180-style parser: quoted fields, escaped quotes, CRLF/LF, BOM, and , ; or tab delimiters.
const parseCSV = (text) => {
  const t = text.replace(/^\uFEFF/, '');
  const firstLine = t.split(/\r?\n/, 1)[0] || '';
  const delim = [',', ';', '\t']
    .map(d => [d, firstLine.split(d).length])
    .sort((a, b) => b[1] - a[1])[0][0];

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter(r => r.some(cell => String(cell).trim() !== ''));
};

// "$1,234.56", "(45.00)", "-12.30", "12.30-", "1.234,56" -> number (NaN if unreadable)
const parseAmount = (raw) => {
  if (raw === undefined || raw === null) return NaN;
  const s = String(raw).trim();
  if (!s) return NaN;
  const neg = /^\s*\$?\s*-/.test(s) || /^\(.*\)$/.test(s) || /-\s*$/.test(s);
  let n = s.replace(/[^0-9.,]/g, '');
  if (!/\d/.test(n)) return NaN;
  const lastDot = n.lastIndexOf('.');
  const lastComma = n.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    n = lastComma > lastDot ? n.replace(/\./g, '').replace(',', '.') : n.replace(/,/g, '');
  } else if (lastComma !== -1) {
    n = (n.split(',').length === 2 && /,\d{1,2}$/.test(n)) ? n.replace(',', '.') : n.replace(/,/g, '');
  }
  const v = parseFloat(n);
  if (isNaN(v)) return NaN;
  return neg ? -v : v;
};

// Look at the file's dates to decide between MM/DD and DD/MM (defaults to US).
const detectDateFormat = (values) => {
  for (const v of values) {
    const m = String(v || '').trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (!m) continue;
    if (Number(m[1]) > 12) return 'dmy';
    if (Number(m[2]) > 12) return 'mdy';
  }
  return 'mdy';
};

// Returns YYYY-MM-DD or '' when the date can't be read. fmt: 'mdy' | 'dmy' | 'ymd'
const parseDate = (raw, fmt = 'mdy') => {
  const s = String(raw || '').trim().split(/[ T]/)[0];
  const m = s.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/);
  if (!m) return '';
  const [a, b, c] = [m[1], m[2], m[3]];
  const f = a.length === 4 ? 'ymd' : fmt;
  let y, mo, d;
  if (f === 'ymd') { y = a; mo = b; d = c; }
  else if (f === 'dmy') { d = a; mo = b; y = c; }
  else { mo = a; d = b; y = c; }
  if (String(y).length === 2) y = (Number(y) > 70 ? '19' : '20') + y;
  y = Number(y); mo = Number(mo); d = Number(d);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  const dt = new Date(y, mo - 1, d);
  if (dt.getMonth() !== mo - 1) return '';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

// Guess which column is which from the header names. Values are column indexes as strings ('' = none).
const detectMapping = (headers) => {
  const find = (regexes, exclude) => {
    for (const re of regexes) {
      const i = headers.findIndex(h => re.test(String(h)) && !(exclude && exclude.test(String(h))));
      if (i !== -1) return String(i);
    }
    return '';
  };
  const map = {
    date: find([/^date$/i, /trans.*date|posted|date/i]),
    payee: find([/^payee$/i, /description|merchant|name|details|payee/i]),
    amount: find([/^amount$/i, /amount/i], /debit|credit/i),
    debit: find([/debit|withdrawal|paid out|money out/i]),
    credit: find([/credit|deposit|paid in|money in/i]),
    notes: find([/^memo$/i, /note|memo/i])
  };
  if (map.amount !== '') { map.debit = ''; map.credit = ''; } // one signed column wins over split columns
  if (map.notes === map.payee) map.notes = '';
  return map;
};

const getOrdinalSuffix = (num) => {
  const n = Number(num);
  if (isNaN(n)) return '';
  if (n > 3 && n < 21) return 'th';
  switch (n % 10) {
    case 1:  return 'st';
    case 2:  return 'nd';
    case 3:  return 'rd';
    default: return 'th';
  }
};

const getScheduleText = (env) => {
  if (env.goalType === 'savings_balance') return 'Save up to a balance';
  if (env.goalType !== 'repeating') return '';
  const { cadence, repeatDayOfWeek, repeatDayOfMonth, repeatMonth, repeatYear } = env;
  if (cadence === 'weekly') return `Every week on ${repeatDayOfWeek || 'Monday'}`;
  if (cadence === 'biweekly') return `Every 2 weeks on ${repeatDayOfWeek || 'Monday'}`;
  if (cadence === 'monthly') {
    if (repeatDayOfMonth === 'last') return `Every month on the last day`;
    return `Every month on the ${repeatDayOfMonth}${getOrdinalSuffix(repeatDayOfMonth)}`;
  }
  if (cadence === 'yearly') {
    return `Every year on ${repeatMonth || 'January'} ${repeatDayOfMonth || '1'}${getOrdinalSuffix(repeatDayOfMonth || '1')}${repeatYear ? ` (${repeatYear})` : ''}`;
  }
  return `Every ${cadence}`;
};

const BottomSheet = ({ title, onClose, children, testId, inset = { bottom: 0, height: 0 } }) => (
  <>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.45)', zIndex: 59 }} />
    <div data-testid={testId} role="dialog" aria-label={title} style={{ position: 'fixed', left: 0, right: 0, bottom: inset.bottom, zIndex: 60, backgroundColor: 'white', borderRadius: '18px 18px 0 0', maxHeight: inset.height ? `${Math.round(inset.height * 0.94)}px` : '92vh', overflowY: 'auto', boxShadow: '0 -8px 28px rgba(0,0,0,0.25)', padding: inset.bottom ? '8px 16px 18px' : '8px 16px calc(18px + env(safe-area-inset-bottom))' }}>
      <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#d1d5db', margin: '0 auto 8px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111827', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <button onClick={onClose} aria-label="Close" style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '1rem', cursor: 'pointer', color: '#4b5563', flexShrink: 0 }}>✕</button>
      </div>
      {children}
    </div>
  </>
);

export default function BudgetApp() {
  const [session, setSession] = useState(undefined); // undefined = still checking, null = signed out
  const userId = session ? session.user.id : null;
  const rowIdRef = useRef(null); // id of this user's row in user_budgets
  const [budgetMonth, setBudgetMonth] = useState(() => getTodayISO().slice(0, 7)); // month shown on the Budget tab

  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [collapsedAccountTx, setCollapsedAccountTx] = useState({});

  const [envelopes, setEnvelopes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);

  const [activeTab, setActiveTab] = useState('budget');
  const [notification, setNotification] = useState('');

  const [reconcilingAccId, setReconcilingAccId] = useState(null);
  const [targetBankBalance, setTargetBankBalance] = useState('');

  const [newGroup, setNewGroup] = useState('');
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvGroup, setNewEnvGroup] = useState('');
  const [newEnvGoalType, setNewEnvGoalType] = useState('none');
  const [newEnvTargetAmount, setNewEnvTargetAmount] = useState('');
  const [newEnvTargetDate, setNewEnvTargetDate] = useState('');
  const [newEnvCadence, setNewEnvCadence] = useState('monthly');
  const [newEnvRepeatDayOfWeek, setNewEnvRepeatDayOfWeek] = useState('Monday');
  const [newEnvRepeatDayOfMonth, setNewEnvRepeatDayOfMonth] = useState('1');
  const [newEnvRepeatMonth, setNewEnvRepeatMonth] = useState('January');
  const [newEnvRepeatYear, setNewEnvRepeatYear] = useState(String(new Date().getFullYear()));

  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('Checking');
  const [newAccBalance, setNewAccBalance] = useState('');

  const [txPayee, setTxPayee] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState('expense');
  const [txAccountId, setTxAccountId] = useState('');
  const [txToAccountId, setTxToAccountId] = useState(''); // destination account when the type is Transfer
  // Transactions tab filters
  const [showHiddenEnvelopes, setShowHiddenEnvelopes] = useState(false);
  const [showHiddenAccounts, setShowHiddenAccounts] = useState(false);
  const [hideEnvUi, setHideEnvUi] = useState(null); // envelope id asking what to do with its money before hiding
  const [txLimit, setTxLimit] = useState(150); // how many transactions are drawn (long lists stay fast)
  const [txSearch, setTxSearch] = useState('');
  const [txFilterAccount, setTxFilterAccount] = useState('');
  const [txFilterEnvelope, setTxFilterEnvelope] = useState(''); // '' = any, '__none__' = uncategorized
  const [txFilterType, setTxFilterType] = useState(''); // '' | expense | income | transfer
  const [txFilterStatus, setTxFilterStatus] = useState(''); // '' | cleared | uncleared
  const [accStatusFilter, setAccStatusFilter] = useState({}); // per account on the Accounts tab: '' | cleared | uncleared
  const [txFromDate, setTxFromDate] = useState('');
  const [txToDate, setTxToDate] = useState('');
  // Budget tab: which envelope has its "move money" / "cover overspending" panel open
  const [moveUi, setMoveUi] = useState(null); // { envId, mode: 'move' | 'cover', otherId, amount }
  const [txSplitLines, setTxSplitLines] = useState(null); // split editor inside the add form: null = off
  const [txEnvelopeId, setTxEnvelopeId] = useState('');
  // Reconciled transactions are locked. Unlocking is per transaction and only lasts until the page is reloaded.
  const [unlockedTxIds, setUnlockedTxIds] = useState(() => {
    try { const v = JSON.parse(sessionStorage.getItem('budget-unlocked-tx') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  });
  useEffect(() => { try { sessionStorage.setItem('budget-unlocked-tx', JSON.stringify(unlockedTxIds)); } catch (e) { /* storage unavailable */ } }, [unlockedTxIds]);
  const [selectedEnvId, setSelectedEnvId] = useState(null); // envelope row opened for actions
  const [txSheetOpen, setTxSheetOpen] = useState(false); // phone: add/edit transaction sheet
  const [txFiltersOpen, setTxFiltersOpen] = useState(false); // phone: filters collapsed by default
  const [showCsv, setShowCsv] = useState(false); // phone: CSV import collapsed by default
  const [manageAccounts, setManageAccounts] = useState(false); // phone: Accounts tab shows overview unless true
  const [showRtaInfo, setShowRtaInfo] = useState(false); // phone: Ready to Assign breakdown
  useEffect(() => { setTxSheetOpen(false); }, [transactions]);
  useEffect(() => { setSelectedEnvId(null); setSelectMode(false); setSwipe(null); }, [activeTab]);
  useEffect(() => { setAdjustAmt(''); }, [selectedEnvId]);
  // Keep bottom sheets above the on-screen keyboard
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return undefined;
    const update = () => setKbInset({ bottom: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)), height: Math.round(vv.height) });
    update();
    vv.addEventListener('resize', update); vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
  const [envFilter, setEnvFilter] = useState('all'); // 'all' | 'underfunded' | 'overspent' | 'available'
  const [autoMenuOpen, setAutoMenuOpen] = useState(false);
  const [reportView, setReportView] = useState('spending'); // 'spending' | 'incexp' | 'networth' | 'age'
  const autoPayeeEnvRef = useRef('');
  const [unlockAskId, setUnlockAskId] = useState(null); // row showing the "unlock?" question
  const [splitTxId, setSplitTxId] = useState(null); // transaction whose split editor is open
  const [splitDraft, setSplitDraft] = useState([]); // [{ envelopeId, amount: string }]
  const [txDate, setTxDate] = useState(getTodayISO());
  const [txNotes, setTxNotes] = useState('');

  // Multi-select transactions state
  const [selectedTxIds, setSelectedTxIds] = useState([]);

  // Trash: bulk selection ('type:id' keys) and the pending bulk-delete confirmation
  const [trashSelected, setTrashSelected] = useState([]);
  const [trashConfirm, setTrashConfirm] = useState(null); // null | 'selected' | 'all'

  // Editing state (null = adding new)
  const [editingTxId, setEditingTxId] = useState(null);
  const [editingEnvId, setEditingEnvId] = useState(null);

  // CSV import state
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [importHasHeader, setImportHasHeader] = useState(true);
  const [importMap, setImportMap] = useState({ date: '', payee: '', amount: '', debit: '', credit: '', notes: '' });
  const [importDateFormat, setImportDateFormat] = useState('auto');
  const [importSign, setImportSign] = useState('negative-expense');
  const [importAccountId, setImportAccountId] = useState('');
  // Import from Actual Budget
  const [ax, setAx] = useState(null); // { fileName, meta, tables, desc, choices, mode }
  const [axBusy, setAxBusy] = useState(false);
  const [axError, setAxError] = useState('');
  const [axUndo, setAxUndo] = useState(null); // what the budget looked like before the last import
  const [axConfirm, setAxConfirm] = useState(false);
  const axFileRef = useRef(null);
  const [importSkipDupes, setImportSkipDupes] = useState(true);
  const importFileRef = useRef(null);

  // Investments (tracked separately from the budget)
  const [investments, setInvestments] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [adjustAmt, setAdjustAmt] = useState(''); // phone envelope sheet: exact amount to add or subtract
  const [kbInset, setKbInset] = useState({ bottom: 0, height: 0 }); // on-screen keyboard space (phones)
  const [sideMoreOpen, setSideMoreOpen] = useState(false); // sidebar "More" section
  const [sideCollapsed, setSideCollapsed] = useState({}); // sidebar account groups folded away
  const [selectMode, setSelectMode] = useState(false); // phone: checkboxes shown for bulk actions
  const [swipe, setSwipe] = useState(null); // { id, dx } while a row is being swiped
  const touchRef = useRef(null);
  const [installEvt, setInstallEvt] = useState(null); // browser's "install app" prompt, when it offers one
  const [debtPay, setDebtPay] = useState({}); // payment amounts typed on the Debts tab
  const [payeeEdit, setPayeeEdit] = useState(null); // { name, value } while renaming a payee
  const [payeeSearch, setPayeeSearch] = useState('');
  const [schedForm, setSchedForm] = useState(null); // form for adding/editing a scheduled transaction
  const [invFormOpen, setInvFormOpen] = useState(false);
  const [editingInvId, setEditingInvId] = useState(null);
  const [newInvName, setNewInvName] = useState('');
  const [newInvType, setNewInvType] = useState('Brokerage');
  const [newInvValue, setNewInvValue] = useState('');
  const [newInvBasis, setNewInvBasis] = useState('');
  const [invPanel, setInvPanel] = useState(null); // { id, mode: 'value' | 'contribute' | 'withdraw' }
  const [invAmount, setInvAmount] = useState('');
  const [invDate, setInvDate] = useState(getTodayISO());
  const [invShowAll, setInvShowAll] = useState({});

  // Reports
  const [reportMode, setReportMode] = useState('month'); // 'month' | 'year'
  const [reportMonth, setReportMonth] = useState(() => getTodayISO().slice(0, 7));
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [reportBreakdown, setReportBreakdown] = useState('group'); // 'group' | 'envelope' | 'payee'

  // Group drag-to-reorder
  const [dragState, setDragState] = useState(null); // { name, dy, target, measuring }
  const dragRef = useRef(null);
  const groupRefs = useRef({});

  // Side menu state
  const [isMobile, setIsMobile] = useState(isMobileNow);
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileNow());

  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtTotal, setNewDebtTotal] = useState('');
  const [newDebtAPR, setNewDebtAPR] = useState('');
  const [newDebtMin, setNewDebtMin] = useState('');

  // Sync guards: never save before the initial load finishes, and never echo remote data back.
  const loadedRef = useRef(false);
  const lastJsonRef = useRef('');
  const revRef = useRef(0);          // version of the budget this device last saw on the server
  const baseRef = useRef(null);      // the budget as the server last had it (for merging)
  const rowExistsRef = useRef(false);
  const savingRef = useRef(false);
  const applyRemoteRef = useRef(null);
  const localRef = useRef(null);     // the budget as it is on screen right now
  const histRef = useRef({ undo: [], redo: [], prev: null, prevKey: '', lastPush: 0, skip: false, reset: false, resetUntil: 0 });
  const [, setHistTick] = useState(0);
  const [syncTick, setSyncTick] = useState(0); // bumps once the first load finishes
  localRef.current = normData({ accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts, investments, scheduled });

  // Make the app installable (home-screen icon, full-screen window)
  useEffect(() => {
    try {
      const makeIcon = (size) => {
        const c = document.createElement('canvas'); c.width = c.height = size;
        const g = c.getContext('2d');
        if (!g) return '';
        g.fillStyle = '#1f2f4f'; g.fillRect(0, 0, size, size);
        g.fillStyle = '#cdeed6'; g.beginPath(); g.arc(size / 2, size / 2, size * 0.32, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1f2f4f'; g.font = `bold ${Math.round(size * 0.42)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', size / 2, size / 2 + size * 0.02);
        return c.toDataURL('image/png');
      };
      const icon192 = makeIcon(192), icon512 = makeIcon(512);
      const head = document.head;
      const put = (tag, attrs) => { const sel = tag === 'link' ? `link[rel="${attrs.rel}"]` : `meta[name="${attrs.name}"]`; let el = head.querySelector(sel); if (!el) { el = document.createElement(tag); head.appendChild(el); } Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); };
      put('meta', { name: 'theme-color', content: '#1f2f4f' });
      put('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
      put('meta', { name: 'mobile-web-app-capable', content: 'yes' });
      put('meta', { name: 'apple-mobile-web-app-title', content: 'Budget' });
      if (icon192) put('link', { rel: 'apple-touch-icon', href: icon192 });
      if (icon192 && !head.querySelector('link[rel="manifest"]')) {
        const manifest = { name: 'Envelope Budgeting', short_name: 'Budget', start_url: window.location.href.split('#')[0], scope: window.location.href.split('#')[0].replace(/[^/]*$/, ''), display: 'standalone', background_color: '#f4f5f7', theme_color: '#1f2f4f', icons: [{ src: icon192, sizes: '192x192', type: 'image/png' }, { src: icon512, sizes: '512x512', type: 'image/png' }] };
        put('link', { rel: 'manifest', href: URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })) });
      }
    } catch (err) { /* installability is a nice-to-have */ }
    const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e); };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  // Who is signed in
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession((data && data.session) || null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => { setSession(sess || null); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // Fetch budget data from Supabase & subscribe to real-time changes (one budget per signed-in user)
  useEffect(() => {
    if (!userId) {
      // Signed out: drop everything from memory so the next person never sees it
      loadedRef.current = false;
      rowIdRef.current = null;
      lastJsonRef.current = '';
      revRef.current = 0; baseRef.current = null; rowExistsRef.current = false;
      histRef.current.reset = true;
      setAccounts([]); setGroups([]); setCollapsedGroups({}); setCollapsedAccountTx({});
      setEnvelopes([]); setTransactions([]); setDebts([]); setInvestments([]); setScheduled([]);
      return;
    }
    let cancelled = false;
    loadedRef.current = false;

    const applyRemote = (raw, mergeWith) => {
      // Older saves kept one lump "assigned" per envelope; convert to monthly assignments.
      let d = migrateBudgetData(raw);
      histRef.current.reset = true; // data loaded from the server starts a fresh undo history
      histRef.current.resetUntil = Date.now() + 500;
      // Remember what the server has (not the converted copy) so a converted budget gets saved back.
      lastJsonRef.current = snapshot(raw);
      revRef.current = Number(raw && raw._rev) || 0;
      const theirs = normData(d);
      if (mergeWith) d = mergeBudgetData(baseRef.current || theirs, mergeWith, theirs); // keep my unsaved edits on top of theirs
      baseRef.current = theirs;
      setAccounts(d.accounts ?? []);
      setGroups(d.groups ?? []);
      setCollapsedGroups(d.collapsedGroups ?? {});
      setCollapsedAccountTx(d.collapsedAccountTx ?? {});
      setEnvelopes(d.envelopes ?? []);
      setTransactions(d.transactions ?? []);
      setDebts(d.debts ?? []);
      setInvestments(d.investments ?? []);
      setScheduled(d.scheduled ?? []);
    };

    applyRemoteRef.current = applyRemote;

    const selectMine = () => supabase.from('user_budgets').select('id, data').eq('user_id', userId).limit(1);

    const fetchBudgetData = async () => {
      let { data, error } = await selectMine();
      if (cancelled) return;
      if (error) {
        console.error('Error fetching budget data from Supabase:', error);
        setNotification("Couldn't load your budget, so changes won't be saved. Please refresh.");
        return; // stay "not loaded" so we never overwrite saved data with empty state
      }
      let row = data && data[0];
      // First sign-in on a device that used the old private budget ID: attach that budget to this account
      if (!row) {
        for (const legacyId of readLegacyBudgetIds()) {
          const claim = await supabase.rpc('claim_budget', { old_id: legacyId });
          if (cancelled) return;
          if (claim && !claim.error && claim.data) {
            const again = await selectMine();
            if (cancelled) return;
            row = again.data && again.data[0];
            if (row) { forgetLegacyBudgetId(); break; } // attached to the account, so the old private ID is no longer needed
          }
        }
      }
      if (row) {
        rowIdRef.current = row.id;
        rowExistsRef.current = true;
        if (row.data) applyRemote(row.data);
      } else {
        rowExistsRef.current = false;
        baseRef.current = normData({});
        revRef.current = 0;
        // A brand-new budget: nothing is saved until you actually add something
        rowIdRef.current = userId;
        lastJsonRef.current = snapshot({});
      }
      loadedRef.current = true;
      setSyncTick(t => t + 1);
    };

    fetchBudgetData();

    const channel = supabase
      .channel(`public:user_budgets:user_id=eq.${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_budgets', filter: `user_id=eq.${userId}` }, (payload) => {
        const d = payload.new && payload.new.data;
        if (!d) return;
        if (snapshot(d) === lastJsonRef.current) return; // our own save echoing back
        if ((Number(d._rev) || 0) < revRef.current) return; // older than what we already have
        rowExistsRef.current = true;
        const unsaved = snapshot(localRef.current) !== lastJsonRef.current;
        if (unsaved) { applyRemote(d, localRef.current); setNotification('Merged changes made on another device.'); }
        else applyRemote(d);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Save budget changes to Supabase (debounced, skipped when nothing actually changed)
  useEffect(() => {
    if (!userId || !loadedRef.current) return;
    const dataToSave = { accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts, investments, scheduled };
    const json = snapshot(dataToSave);
    if (json === lastJsonRef.current) return;

    const timer = setTimeout(async () => {
      if (savingRef.current) return; // the save in progress re-checks when it finishes
      savingRef.current = true;
      let retry = true;
      try {
        const rev = revRef.current;
        const next = { ...dataToSave, _rev: rev + 1 };
        let conflict = false;
        let failed = null;
        if (rowExistsRef.current) {
          // Only overwrite if the server still has the version we last saw
          let q = supabase.from('user_budgets').update({ data: next }).eq('id', rowIdRef.current);
          q = rev > 0 ? q.eq('data->>_rev', String(rev)) : q.is('data->>_rev', null);
          const { data: hit, error } = await q.select('id');
          if (error) failed = error; else if (!hit || hit.length === 0) conflict = true;
        } else {
          const { error } = await supabase.from('user_budgets').insert({ id: rowIdRef.current || userId, user_id: userId, data: next });
          if (error) { if (error.code === '23505') conflict = true; else failed = error; }
          else rowExistsRef.current = true;
        }
        if (failed) {
          retry = false; // don't hammer the server while it's failing; the next edit tries again
          console.error('Error saving budget data to Supabase:', failed);
          setNotification("Couldn't save your last change. Check your connection.");
        } else if (conflict) {
          // Another device saved first: pull its version and lay my unsaved changes on top, then save again
          const { data: rows, error } = await supabase.from('user_budgets').select('id, data').eq('user_id', userId).limit(1);
          const row = rows && rows[0];
          if (error || !row || !row.data) { setNotification("Couldn't save: your budget changed on another device. Please refresh."); }
          else {
            rowIdRef.current = row.id; rowExistsRef.current = true;
            applyRemoteRef.current(row.data, localRef.current);
            setNotification('Merged changes made on another device.');
          }
        } else {
          revRef.current = rev + 1;
          baseRef.current = normData(dataToSave);
          lastJsonRef.current = json;
        }
      } finally {
        savingRef.current = false;
        if (retry) setSyncTick(t => t + 1); // edits made while saving get picked up
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [userId, syncTick, accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts, investments, scheduled]);

  // ----- Undo / redo -----
  // Every change to the budget data is remembered. Edits made within ~1.2 s of each other (typing in a box) count as one step.
  const histKey = (d) => stable({ accounts: d.accounts, groups: d.groups, envelopes: d.envelopes, transactions: d.transactions, debts: d.debts, investments: d.investments, scheduled: d.scheduled });
  useEffect(() => {
    const h = histRef.current;
    const cur = { accounts, groups, envelopes, transactions, debts, investments, scheduled };
    const key = histKey(cur);
    const now = Date.now();
    if (h.prev === null || h.reset || now < h.resetUntil) {
      h.undo = []; h.redo = []; h.prev = cur; h.prevKey = key; h.reset = false;
      setHistTick(t => t + 1);
      return;
    }
    if (key === h.prevKey) return;
    if (h.skip) { h.skip = false; h.prev = cur; h.prevKey = key; setHistTick(t => t + 1); return; }
    if (now - h.lastPush > 1200 || !h.undo.length) {
      h.undo.push(h.prev);
      if (h.undo.length > 50) h.undo.shift();
    }
    h.lastPush = now;
    h.redo = [];
    h.prev = cur;
    h.prevKey = key;
    setHistTick(t => t + 1);
  }, [accounts, groups, envelopes, transactions, debts, investments, scheduled]);

  const applySnapshot = (snap) => {
    const h = histRef.current;
    if (histKey(snap) !== h.prevKey) h.skip = true;
    setAccounts(snap.accounts); setGroups(snap.groups); setEnvelopes(snap.envelopes);
    setTransactions(snap.transactions); setDebts(snap.debts); setInvestments(snap.investments); setScheduled(snap.scheduled || []);
  };
  const undo = () => {
    const h = histRef.current;
    if (!h.undo.length) return;
    const snap = h.undo.pop();
    h.redo.push(h.prev);
    h.lastPush = 0;
    applySnapshot(snap);
    setHistTick(t => t + 1);
    showNotification('Undone.');
  };
  const redo = () => {
    const h = histRef.current;
    if (!h.redo.length) return;
    const snap = h.redo.pop();
    h.undo.push(h.prev);
    h.lastPush = 0;
    applySnapshot(snap);
    setHistTick(t => t + 1);
    showNotification('Redone.');
  };
  const undoRef = useRef({});
  undoRef.current = { undo, redo };
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || String(e.key).toLowerCase() !== 'z') return;
      const el = e.target;
      const tag = el && el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return; // let text boxes undo their own typing
      e.preventDefault();
      if (e.shiftKey) undoRef.current.redo(); else undoRef.current.undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Keep the side menu sensible when the window is resized (open on desktop, closed drawer on mobile)
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => {
      setIsMobile(e.matches);
      setSidebarOpen(!e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ----- Group drag-to-reorder (pointer events: works with mouse and touch) -----
  const updateDrag = (clientY) => {
    const info = dragRef.current;
    if (!info || info.phase !== 'drag') return;
    const pointerPageY = clientY + window.scrollY;
    const { names, rects, from, grabOffset } = info;
    const cardTop = pointerPageY - grabOffset;
    const dy = cardTop - rects[from].top;
    const draggedCenter = cardTop + rects[from].height / 2;
    let target = 0;
    names.forEach((n, i) => {
      if (i !== from && rects[i].top + rects[i].height / 2 < draggedCenter) target++;
    });
    setDragState({ name: info.name, dy, target, measuring: false });
  };

  const finishGroupDrag = (commit) => {
    const info = dragRef.current;
    if (info) {
      if (info.cleanup) info.cleanup();
      if (commit && info.phase === 'drag') {
        const pointerPageY = info.clientY + window.scrollY;
        const cardTop = pointerPageY - info.grabOffset;
        const draggedCenter = cardTop + info.rects[info.from].height / 2;
        let target = 0;
        info.names.forEach((n, i) => {
          if (i !== info.from && info.rects[i].top + info.rects[i].height / 2 < draggedCenter) target++;
        });
        const others = info.names.filter((_, i) => i !== info.from);
        const next = [...others.slice(0, target), info.name, ...others.slice(target)];
        if (next.some((n, i) => n !== info.names[i])) setGroups(next);
      }
    }
    dragRef.current = null;
    setDragState(null);
  };

  const startGroupDrag = (e, name) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const onMove = (ev) => {
      const info = dragRef.current;
      if (!info) return;
      info.clientY = ev.clientY;
      updateDrag(ev.clientY);
    };
    const onUp = () => finishGroupDrag(true);
    const onCancel = () => finishGroupDrag(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    document.body.style.userSelect = 'none';
    dragRef.current = {
      name,
      phase: 'pending',
      clientY: e.clientY,
      cleanup: () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        document.body.style.userSelect = '';
      }
    };
    // All groups collapse while dragging so they are short and easy to move; measured right after.
    setDragState({ name, dy: 0, target: 0, measuring: true });
  };

  // Measure the (collapsed) group cards once the drag has started
  useLayoutEffect(() => {
    if (!dragState || !dragState.measuring) return;
    const info = dragRef.current;
    if (!info) return;
    const names = groups.slice();
    const scrollY = window.scrollY;
    const rects = names.map(n => {
      const el = groupRefs.current[n];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, height: r.height };
    });
    const from = names.indexOf(info.name);
    if (from === -1 || rects.some(r => !r)) {
      finishGroupDrag(false);
      return;
    }
    dragRef.current = {
      ...info,
      names,
      rects,
      from,
      grabOffset: Math.min(rects[from].height / 2, 24),
      gap: names.length > 1 ? Math.max(0, rects[1].top - (rects[0].top + rects[0].height)) : 16,
      phase: 'drag'
    };
    updateDrag(info.clientY);
  }, [dragState && dragState.measuring]);

  // Never leave listeners behind if the component unmounts mid-drag
  useEffect(() => () => {
    if (dragRef.current && dragRef.current.cleanup) dragRef.current.cleanup();
  }, []);

  const openTab = (tab) => {
    setTrashConfirm(null);
    if (tab === 'new' && editingEnvId) resetEnvForm(); // "+ New" always starts a fresh form
    setActiveTab(tab);
    if (isMobile) setSidebarOpen(false);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const toggleAccountTxCollapse = (accId) => {
    setCollapsedAccountTx(prev => ({ ...prev, [accId]: !prev[accId] }));
  };

  const activeTransactions = transactions.filter(t => !t.isDeleted);
  const activeAccounts = accounts.filter(a => !a.isDeleted);
  const activeEnvelopes = envelopes.filter(e => !e.isDeleted);
  const activeDebts = debts.filter(d => !d.isDeleted);
  const activeInvestments = investments.filter(i => !i.isDeleted);

  // Envelopes grouped for dropdowns (envelopes whose group no longer exists go under "Other")
  // Hidden envelopes keep their history and still count in every total, but can't be picked for new spending.
  const visibleEnvelopes = activeEnvelopes.filter(e => !e.isHidden);
  const hiddenEnvelopeCount = activeEnvelopes.length - visibleEnvelopes.length;
  const groupEnvelopeChoices = (list) => [
    ...groups.map(g => ({ label: g, list: list.filter(e => e.group === g) })),
    { label: 'Other', list: list.filter(e => !groups.includes(e.group)) }
  ].filter(c => c.list.length > 0);
  const envelopeChoices = groupEnvelopeChoices(visibleEnvelopes);
  // For filters: every envelope, hidden ones marked
  const envelopeChoicesAll = groupEnvelopeChoices(activeEnvelopes.map(e => (e.isHidden ? { ...e, name: e.name + ' (hidden)' } : e)));
  // Accounts you can put new transactions in (hidden accounts stay out of the way)
  const hiddenAccountCount = activeAccounts.filter(a => a.isHidden).length;
  const shownAccounts = activeAccounts.filter(a => showHiddenAccounts || !a.isHidden);
  const accountChoices = (keepId) => activeAccounts.filter(a => !a.isHidden || a.id === keepId);

  // Drag accounts into a new order. Only the accounts on screen move; hidden ones keep their place.
  const commitAccountOrder = (newIds) => {
    setAccounts(prev => {
      const shown = new Set(newIds);
      const byId = new Map(prev.map(a => [a.id, a]));
      let i = 0;
      return prev.map(a => (shown.has(a.id) ? byId.get(newIds[i++]) : a));
    });
  };
  const acctDrag = useDragReorder(shownAccounts.map(a => a.id), commitAccountOrder);
  const invTotals = activeInvestments.reduce(
    (t, i) => ({ value: t.value + Number(i.value), basis: t.basis + Number(i.costBasis) }),
    { value: 0, basis: 0 }
  );

  // Credit cards hold debt (negative balance) and never feed Ready to Assign.
  const isCreditCard = (acc) => acc?.type === 'Credit Card';

  // Does this transaction add to Ready to Assign? Only income into a live, non-credit-card account.
  const countsTowardRTA = (tx) => {
    if (tx.type !== 'income' || tx.isTransfer) return false;
    const acc = accounts.find(a => a.id === tx.accountId);
    // Card accounts normally never feed Ready to Assign. Imported income-category entries on a card (opening
    // balances, cash back) are flagged budgetIncome so the budget matches the app they came from.
    return !!acc && !acc.isDeleted && (!isCreditCard(acc) || !!tx.budgetIncome);
  };

  // ----- Monthly budgeting -----
  // Ready to Assign and every envelope balance are worked out from the data each time, so editing an old
  // transaction or month can never leave them out of sync.
  const todayMonth = getTodayISO().slice(0, 7);
  const txMonth = (t) => {
    const k = monthKeyOf(t.date);
    return MONTH_RE.test(k) ? k : todayMonth;
  };

  const budgetView = useMemo(() => {
    const key = budgetMonth;
    const spend = {};
    const cardSpend = {}; // the part of an envelope's spending that was put on a credit card
    const cardParts = []; // [{ accId, envelopeId, k, amount }]
    activeTransactions.forEach(t => {
      const k = txMonth(t);
      const onCard = isCreditCard(accounts.find(a => a.id === t.accountId));
      txParts(t).forEach(p => {
        if (!spend[p.envelopeId]) spend[p.envelopeId] = {};
        spend[p.envelopeId][k] = (spend[p.envelopeId][k] || 0) + p.amount;
        if (onCard) {
          if (!cardSpend[p.envelopeId]) cardSpend[p.envelopeId] = {};
          cardSpend[p.envelopeId][k] = (cardSpend[p.envelopeId][k] || 0) + p.amount;
          cardParts.push({ accId: t.accountId, envelopeId: p.envelopeId, k, amount: p.amount });
        }
      });
    });

    const incomeIn = {}; // money sent into envelopes straight from income
    activeTransactions.forEach(t => {
      if (!countsTowardRTA(t)) return;
      const k = txMonth(t);
      incomeAllocs(t).forEach(a => {
        if (!incomeIn[a.envelopeId]) incomeIn[a.envelopeId] = {};
        incomeIn[a.envelopeId][k] = (incomeIn[a.envelopeId][k] || 0) + a.amount;
      });
    });

    const rowsByEnv = {};
    let budgetedThrough = 0;
    let penalties = 0; // overspending from months before the selected one
    activeEnvelopes.forEach(env => {
      const budget = env.budget || {};
      const rows = buildEnvTimeline(budget, spend[env.id], key, incomeIn[env.id], cardSpend[env.id]);
      rowsByEnv[env.id] = rows;
      rows.forEach((r, k) => { if (k < key) penalties += r.cashOver; });
      Object.keys(budget).forEach(k => {
        if (MONTH_RE.test(k) && k <= key) budgetedThrough += Number(budget[k]) || 0;
      });
      Object.keys(incomeIn[env.id] || {}).forEach(k => {
        if (MONTH_RE.test(k) && k <= key) budgetedThrough += incomeIn[env.id][k];
      });
    });

    // ----- Credit card payment categories (like YNAB) -----
    // Spending on a card, filed under an envelope, moves that money out of the envelope into the card's payment
    // category. Paying the card (a transfer into it) uses that money up. Credit overspending is not moved.
    const cc = {};
    const ccOf = (id) => (cc[id] = cc[id] || { setAside: 0, setAsideMonth: 0, paid: 0, paidMonth: 0, assigned: 0, assignedMonth: 0 });
    cardParts.forEach(cp => {
      if (cp.k > key) return;
      const row = rowsByEnv[cp.envelopeId] && rowsByEnv[cp.envelopeId].get(cp.k);
      let frac = 1;
      if (row && row.cardSpent > 0.004) frac = (row.cardSpent - row.creditOver) / row.cardSpent;
      const c = ccOf(cp.accId);
      c.setAside += cp.amount * frac;
      if (cp.k === key) c.setAsideMonth += cp.amount * frac;
    });
    activeTransactions.forEach(t => {
      if (!t.isTransfer || txMonth(t) > key) return;
      if (!isCreditCard(accounts.find(a => a.id === t.accountId))) return;
      const amt = (t.type === 'income' ? 1 : -1) * Number(t.amount); // money paid into the card
      const c = ccOf(t.accountId);
      c.paid += amt;
      if (txMonth(t) === key) c.paidMonth += amt;
    });
    let ccAssignedThrough = 0;
    activeAccounts.filter(isCreditCard).forEach(a => {
      const c = ccOf(a.id);
      Object.keys(a.paymentBudget || {}).forEach(k => {
        if (!MONTH_RE.test(k) || k > key) return;
        const v = Number(a.paymentBudget[k]) || 0;
        c.assigned += v;
        ccAssignedThrough += v;
        if (k === key) c.assignedMonth += v;
      });
    });
    Object.values(cc).forEach(c => { c.available = round2(c.setAside + c.assigned - c.paid); });
    budgetedThrough += ccAssignedThrough;

    const opening = activeAccounts.filter(a => !isCreditCard(a)).reduce((sum, a) => sum + Number(a.initialBalance), 0);
    const income = activeTransactions
      .filter(t => countsTowardRTA(t) && txMonth(t) <= key)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      rowsByEnv,
      cc,
      inflow: round2(opening + income),
      budgetedThrough: round2(budgetedThrough),
      penalties: round2(penalties),
      rta: round2(opening + income - budgetedThrough - penalties)
    };
  }, [envelopes, accounts, transactions, budgetMonth]);

  const rtaShown = Math.abs(budgetView.rta) < 0.005 ? 0 : budgetView.rta;
  const EMPTY_ENV_ROW = { start: 0, budgeted: 0, income: 0, spent: 0, end: 0, overspend: 0 };
  const envRow = (env) => (budgetView.rowsByEnv[env.id] && budgetView.rowsByEnv[env.id].get(budgetMonth)) || EMPTY_ENV_ROW;

  // Months you can browse: back to your earliest data, forward one year for planning ahead
  const budgetEarliest = (() => {
    let m = todayMonth;
    envelopes.forEach(e => Object.keys(e.budget || {}).forEach(k => { if (MONTH_RE.test(k) && k < m) m = k; }));
    activeTransactions.forEach(t => { const k = txMonth(t); if (k < m) m = k; });
    return m;
  })();
  const budgetLatest = addMonthKey(todayMonth, 12);

  const getAccountBalance = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return 0;
    const txTotal = activeTransactions
      .filter(t => t.accountId === accId)
      .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    return round2(Number(acc.initialBalance) + txTotal) || 0; // rounding keeps thousands of cents-sized additions from showing -0.00
  };

  const getClearedBalance = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return 0;
    const txTotal = activeTransactions
      .filter(t => t.accountId === accId && (t.cleared || t.reconciled))
      .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    return round2(Number(acc.initialBalance) + txTotal) || 0; // rounding keeps thousands of cents-sized additions from showing -0.00
  };

  const handleToggleCleared = (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (isTxLocked(tx)) { showNotification(LOCKED_MSG); return; }
    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        // Un-clearing an unlocked reconciled transaction also takes it out of the reconciled set
        return t.cleared || t.reconciled ? { ...t, cleared: false, reconciled: false } : { ...t, cleared: true };
      }
      return t;
    }));
  };

  const startReconcile = (accId) => {
    setReconcilingAccId(accId);
    const currentBal = getClearedBalance(accId);
    setTargetBankBalance(currentBal.toFixed(2));
  };

  const handleFinishReconciliation = (accId) => {
    const target = parseFloat(targetBankBalance);
    if (isNaN(target)) {
      showNotification('Please enter a valid numeric statement balance.');
      return;
    }

    // The bank statement only knows about cleared transactions, so compare against the cleared balance.
    const clearedBal = getClearedBalance(accId);
    const diff = target - clearedBal;
    const needsAdjustment = Math.abs(diff) >= 0.01;
    const acc = accounts.find(a => a.id === accId);

    let adjTx = null;
    if (needsAdjustment) {
      const isIncome = diff > 0;
      adjTx = {
        id: 'tx-' + Date.now(),
        date: getTodayISO(),
        payee: 'Reconciliation Adjustment',
        amount: Math.abs(diff),
        type: isIncome ? 'income' : 'expense',
        accountId: accId,
        envelopeId: '',
        notes: `Auto adjustment for bank statement balance $${target.toFixed(2)}`,
        isDeleted: false,
        cleared: true,
        reconciled: true
      };
    }

    // Only cleared transactions become reconciled; uncleared ones stay visible for follow-up.
    setTransactions(prev => {
      const marked = prev.map(t => (
        t.accountId === accId && !t.isDeleted && (t.cleared || t.reconciled)
          ? { ...t, cleared: true, reconciled: true }
          : t
      ));
      return adjTx ? [adjTx, ...marked] : marked;
    });

    setAccounts(prev => prev.map(a => {
      if (a.id === accId) {
        return {
          ...a,
          lastReconciledDate: getTodayISO(),
          lastReconciledBalance: target
        };
      }
      return a;
    }));

    setReconcilingAccId(null);
    setTargetBankBalance('');
    showNotification(`Account reconciled successfully to $${target.toFixed(2)}.`);
  };

  // How far an envelope is from its target, for the selected month.
  // Repeating goals (bills): funded = what is available for the month (carried over + assigned).
  // Savings goals (with or without a date): funded = the balance in the envelope at the end of the month,
  // so money taken out shows up as needed again.
  const getTargetProgress = (env, row) => {
    if (!env.goalType || env.goalType === 'none') return null;
    const target = Number(env.targetAmount);
    if (!(target > 0)) return null;
    const funded = (env.goalType === 'target_by_date' || env.goalType === 'savings_balance') ? row.end : row.start + row.budgeted + row.income;
    const left = Math.max(0, target - funded);
    const pct = Math.min(100, Math.max(0, (funded / target) * 100));
    return { target, funded, left, pct };
  };

  // A reconciled transaction (or a transfer with a reconciled side) is locked until the person unlocks it.
  const isTxLocked = (t) => {
    if (!t) return false;
    if (t.reconciled && !unlockedTxIds.includes(t.id)) return true;
    if (t.isTransfer && t.transferId) {
      const other = transactions.find(x => x.id !== t.id && x.transferId === t.transferId);
      return !!other && !!other.reconciled && !unlockedTxIds.includes(other.id);
    }
    return false;
  };
  const LOCKED_MSG = 'This transaction is reconciled and locked. Click the 🔒 to unlock it first.';

  // Likely transfers hiding as separate expense/income pairs (e.g. after importing both accounts)
  const transferMatches = useMemo(() => findTransferMatches(activeTransactions.filter(t => !isTxLocked(t))), [transactions, unlockedTxIds]);

  // Transactions after the search box and filters
  const txFiltersActive = !!(txSearch.trim() || txFilterAccount || txFilterEnvelope || txFilterType || txFilterStatus || txFromDate || txToDate);
  const visibleTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase().replace(/^\$/, '');
    const accName = new Map(accounts.map(a => [a.id, a.name.toLowerCase()]));
    const envName = new Map(envelopes.map(e => [e.id, e.name.toLowerCase()]));
    return activeTransactions.filter(t => {
      if (txFilterAccount && t.accountId !== txFilterAccount) return false;
      if (txFilterType) {
        if (txFilterType === 'transfer' ? !t.isTransfer : (t.isTransfer || t.type !== txFilterType)) return false;
      }
      if (txFilterStatus) {
        const isCleared = !!(t.cleared || t.reconciled);
        if (txFilterStatus === 'cleared' ? !isCleared : isCleared) return false;
      }
      if (txFromDate && (t.date || '') < txFromDate) return false;
      if (txToDate && (t.date || '') > txToDate) return false;
      if (txFilterEnvelope) {
        if (txFilterEnvelope === '__has__') {
          if (!txParts(t).length) return false;
        } else if (txFilterEnvelope === '__none__') {
          const uncategorized = t.type === 'expense' && !t.isTransfer && (isSplitTx(t) ? t.splits.some(s => !s.envelopeId) : !t.envelopeId);
          if (!uncategorized) return false;
        } else if (!txParts(t).some(p => p.envelopeId === txFilterEnvelope)) return false;
      }
      if (q) {
        const hay = [
          t.payee, t.notes, accName.get(t.accountId),
          Number(t.amount).toFixed(2), String(Number(t.amount)),
          ...txParts(t).map(p => envName.get(p.envelopeId))
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, accounts, envelopes, txSearch, txFilterAccount, txFilterEnvelope, txFilterType, txFilterStatus, txFromDate, txToDate]);
  // Never act on selected transactions that a filter is hiding
  useEffect(() => {
    setSelectedTxIds(prev => {
      const vis = new Set(visibleTransactions.map(t => t.id));
      const next = prev.filter(id => vis.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleTransactions]);
  const clearTxFilters = () => {
    setTxSearch(''); setTxFilterAccount(''); setTxFilterEnvelope(''); setTxFilterType(''); setTxFilterStatus(''); setTxFromDate(''); setTxToDate('');
  };

  const pagedTransactions = useMemo(
    () => visibleTransactions.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, txLimit),
    [visibleTransactions, txLimit]
  );
  useEffect(() => { setTxLimit(150); }, [txSearch, txFilterAccount, txFilterEnvelope, txFilterType, txFilterStatus, txFromDate, txToDate]);

  const groupedTransactions = pagedTransactions.reduce((acc, tx) => {
    const dateKey = tx.date || getTodayISO();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(tx);
    return acc;
  }, {});

  const sortedTransactionDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  // Auto-pick an envelope only on a confident match (3+ chars, prefix match), not on any shared letter.
  // Payees you've used before, most recent first, each with the envelope you last filed it under
  const payeeMemory = useMemo(() => {
    const map = new Map();
    activeTransactions.forEach(t => {
      if (t.isTransfer || !t.payee || t.payee === 'Reconciliation Adjustment') return;
      const key = String(t.payee).trim().toLowerCase();
      if (!key) return;
      const cur = map.get(key);
      const envId = t.type === 'expense' && !isSplitTx(t) ? t.envelopeId || '' : '';
      if (!cur) map.set(key, { name: String(t.payee).trim(), date: t.date || '', envId, envDate: envId ? t.date || '' : '', count: 1 });
      else {
        cur.count++;
        if ((t.date || '') > cur.date) { cur.date = t.date || ''; cur.name = String(t.payee).trim(); }
        if (envId && (t.date || '') >= cur.envDate) { cur.envId = envId; cur.envDate = t.date || ''; }
      }
    });
    return [...map.values()].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.count - a.count);
  }, [transactions]);

  const handlePayeeChange = (val) => {
    setTxPayee(val);
    if (editingTxId || txType !== 'expense' || txSplitLines) return;
    const typed = val.trim().toLowerCase();
    if (typed.length < 2) return;
    // Don't override an envelope the person picked themselves
    if (txEnvelopeId && txEnvelopeId !== autoPayeeEnvRef.current) return;
    const known = payeeMemory.find(p => p.name.toLowerCase() === typed);
    let envId = '';
    if (known && known.envId && visibleEnvelopes.some(e => e.id === known.envId)) envId = known.envId;
    else if (typed.length >= 3) {
      const matchedEnv = visibleEnvelopes.find(env => {
        const name = env.name.toLowerCase();
        return name.startsWith(typed) || (name.length >= 3 && typed.startsWith(name));
      });
      if (matchedEnv) envId = matchedEnv.id;
    }
    if (envId) { autoPayeeEnvRef.current = envId; setTxEnvelopeId(envId); }
    else if (txEnvelopeId && txEnvelopeId === autoPayeeEnvRef.current) { autoPayeeEnvRef.current = ''; setTxEnvelopeId(''); }
  };

  const handleAddGroup = (e) => {
    e.preventDefault();
    if (!newGroup.trim() || groups.includes(newGroup.trim())) return;
    setGroups([...groups, newGroup.trim()]);
    setNewGroup('');
    showNotification(`Group '${newGroup}' added.`);
  };

  const handleRemoveGroup = (groupName) => {
    // Ready to Assign is worked out from live envelopes, so their money returns to it automatically.
    // Assignments are kept, so restoring an envelope from the Trash puts them back.
    setGroups(groups.filter(g => g !== groupName));
    setEnvelopes(envelopes.map(env => (env.group === groupName && !env.isDeleted ? { ...env, isDeleted: true } : env)));
    showNotification(`Group '${groupName}' deleted.`);
  };

  const resetEnvForm = () => {
    setEditingEnvId(null);
    setNewEnvName('');
    setNewEnvGroup('');
    setNewEnvGoalType('none');
    setNewEnvTargetAmount('');
    setNewEnvTargetDate('');
    setNewEnvCadence('monthly');
    setNewEnvRepeatDayOfWeek('Monday');
    setNewEnvRepeatDayOfMonth('1');
    setNewEnvRepeatMonth('January');
    setNewEnvRepeatYear(String(new Date().getFullYear()));
  };

  const startEditEnv = (env) => {
    setEditingEnvId(env.id);
    setNewEnvName(env.name);
    setNewEnvGroup(env.group);
    setNewEnvGoalType(env.goalType || 'none');
    setNewEnvTargetAmount(Number(env.targetAmount) > 0 ? String(env.targetAmount) : '');
    setNewEnvTargetDate(env.targetDate || '');
    setNewEnvCadence(env.cadence || 'monthly');
    setNewEnvRepeatDayOfWeek(env.repeatDayOfWeek || 'Monday');
    setNewEnvRepeatDayOfMonth(String(env.repeatDayOfMonth || '1'));
    setNewEnvRepeatMonth(env.repeatMonth || 'January');
    setNewEnvRepeatYear(String(env.repeatYear || new Date().getFullYear()));
    setActiveTab('new');
    if (isMobile) setSidebarOpen(false);
    scrollToTop();
  };

  const handleAddEnvelope = (e) => {
    e.preventDefault();
    if (!newEnvName.trim() || !newEnvGroup) return;

    const fields = {
      name: newEnvName.trim(),
      group: newEnvGroup,
      goalType: newEnvGoalType,
      targetAmount: parseFloat(newEnvTargetAmount) || 0,
      targetDate: newEnvTargetDate,
      cadence: newEnvCadence,
      repeatDayOfWeek: newEnvRepeatDayOfWeek,
      repeatDayOfMonth: newEnvRepeatDayOfMonth,
      repeatMonth: newEnvRepeatMonth,
      repeatYear: newEnvRepeatYear
    };

    // Editing: update in place, keeping id, assigned amount and history
    if (editingEnvId) {
      setEnvelopes(envelopes.map(env => (env.id === editingEnvId ? { ...env, ...fields } : env)));
      showNotification(`Envelope '${fields.name}' updated.`);
      resetEnvForm();
      setActiveTab('budget');
      return;
    }

    const newEnv = {
      id: 'env-' + Date.now(),
      budget: {},
      isDeleted: false,
      ...fields
    };

    setEnvelopes([...envelopes, newEnv]);
    setNewEnvName('');
    setNewEnvGoalType('none');
    setNewEnvTargetAmount('');
    setNewEnvTargetDate('');
    setNewEnvRepeatYear(String(new Date().getFullYear()));
    showNotification(`Envelope '${newEnv.name}' created.`);
  };

  // Set what is assigned to an envelope for the month being viewed
  const handleAssignMonth = (envId, rawValue) => {
    const amount = rawValue === '' ? 0 : Number(rawValue);
    if (isNaN(amount)) return;
    setEnvelopes(prev => prev.map(e => (e.id === envId ? { ...e, budget: { ...(e.budget || {}), [budgetMonth]: amount } } : e)));
  };

  // Money set aside for a card's payment this month, beyond what spending on the card sets aside by itself
  // (e.g. to start paying down debt you already had)
  const handleAssignPayment = (accId, rawValue) => {
    const amount = rawValue === '' ? 0 : Number(rawValue);
    if (isNaN(amount)) return;
    setAccounts(prev => prev.map(a => (a.id === accId ? { ...a, paymentBudget: { ...(a.paymentBudget || {}), [budgetMonth]: amount } } : a)));
  };

  // Fill this month's empty envelopes with what was assigned last month (never overwrites a month you've already set)
  const handleCopyLastMonth = () => {
    const prevKey = addMonthKey(budgetMonth, -1);
    let count = 0;
    const next = envelopes.map(e => {
      if (e.isDeleted) return e;
      const b = e.budget || {};
      if (b[budgetMonth] !== undefined) return e;
      const prevAmt = Number(b[prevKey]) || 0;
      if (prevAmt <= 0) return e;
      count++;
      return { ...e, budget: { ...b, [budgetMonth]: prevAmt } };
    });
    if (count === 0) {
      showNotification('Nothing to copy: last month has no assignments, or this month is already filled in.');
      return;
    }
    setEnvelopes(next);
    showNotification(`Copied ${count} assignment${count === 1 ? '' : 's'} from ${monthLabel(prevKey)}.`);
  };

  // ----- Needed this month, filters and Auto-Assign -----
  // How much more this envelope needs assigned in the month shown to stay on track with its goal.
  const getNeeded = (env, row) => {
    const prog = getTargetProgress(env, row);
    if (!prog || prog.left <= 0.004) return 0;
    if (env.goalType === 'target_by_date' && /^\d{4}-\d{2}/.test(env.targetDate || '')) {
      const [ty, tm] = env.targetDate.slice(0, 7).split('-').map(Number);
      const [by, bm] = budgetMonth.split('-').map(Number);
      const monthsLeft = Math.max(1, (ty - by) * 12 + (tm - bm) + 1);
      const perMonth = (prog.target - row.start) / monthsLeft;
      return Math.max(0, Math.min(prog.left, Math.ceil((perMonth - row.budgeted - row.income) * 100) / 100));
    }
    return Math.max(0, Math.round(prog.left * 100) / 100);
  };

  const AUTO_OPTIONS = [
    ['underfunded', 'Underfunded', 'Fill each goal to what it needs this month'],
    ['lastAssigned', 'Assigned last month', "Match last month's assignments"],
    ['lastSpent', 'Spent last month', 'Assign what each envelope spent last month'],
    ['avgAssigned', 'Average assigned', 'Average of the last 3 months'],
    ['avgSpent', 'Average spent', 'Average spending of the last 3 months'],
    ['reset', 'Reset assigned', "Set this month's assignments to $0"]
  ];
  const runAutoAssign = (mode) => {
    setAutoMenuOpen(false);
    const rowOf = (env, key) => (budgetView.rowsByEnv[env.id] && budgetView.rowsByEnv[env.id].get(key)) || null;
    const prevKeys = [1, 2, 3].map(n => addMonthKey(budgetMonth, -n));
    const ordered = groups.flatMap(g => visibleEnvelopes.filter(e => e.group === g));
    let remaining = Math.max(0, rtaShown);
    const updates = new Map();
    let total = 0;
    ordered.forEach(env => {
      const row = envRow(env);
      if (mode === 'reset') {
        if (row.budgeted !== 0) { updates.set(env.id, 0); total += row.budgeted; }
        return;
      }
      let target;
      if (mode === 'underfunded') target = row.budgeted + getNeeded(env, row);
      else if (mode === 'lastAssigned') target = (rowOf(env, prevKeys[0]) || { budgeted: 0 }).budgeted;
      else if (mode === 'lastSpent') target = Math.max(0, (rowOf(env, prevKeys[0]) || { spent: 0 }).spent);
      else if (mode === 'avgAssigned') target = prevKeys.reduce((t, k) => t + (rowOf(env, k) || { budgeted: 0 }).budgeted, 0) / 3;
      else target = Math.max(0, prevKeys.reduce((t, k) => t + (rowOf(env, k) || { spent: 0 }).spent, 0) / 3);
      target = round2(target);
      const delta = round2(target - row.budgeted);
      if (delta <= 0.004) return; // never lowers what is already assigned
      const take = round2(Math.min(delta, remaining));
      if (take <= 0.004) return;
      remaining = round2(remaining - take);
      updates.set(env.id, round2(row.budgeted + take));
      total = round2(total + take);
    });
    if (!updates.size) {
      showNotification(mode === 'reset' ? 'Nothing is assigned this month.' : rtaShown <= 0.004 ? 'There is no Ready to Assign money to use.' : 'Nothing to auto-assign.');
      return;
    }
    setEnvelopes(prev => prev.map(e => (updates.has(e.id) ? { ...e, budget: { ...(e.budget || {}), [budgetMonth]: updates.get(e.id) } } : e)));
    showNotification(mode === 'reset'
      ? `Reset ${updates.size} envelope${updates.size === 1 ? '' : 's'} to $0. Use Undo to bring them back.`
      : `Assigned ${formatMoney(total)} across ${updates.size} envelope${updates.size === 1 ? '' : 's'}. Use Undo to revert.`);
  };

  const envCounts = { underfunded: 0, overspent: 0, available: 0 };
  visibleEnvelopes.forEach(e => {
    const r = envRow(e);
    if (getNeeded(e, r) > 0.004) envCounts.underfunded++;
    if (r.end < -0.004) envCounts.overspent++;
    if (r.end > 0.004) envCounts.available++;
  });
  const passesEnvFilter = (env) => {
    if (envFilter === 'all') return true;
    const r = envRow(env);
    if (envFilter === 'underfunded') return getNeeded(env, r) > 0.004;
    if (envFilter === 'overspent') return r.end < -0.004;
    return r.end > 0.004;
  };

  // ----- Import from Actual Budget -----
  const axPreview = useMemo(() => {
    if (!ax) return null;
    try { return buildActualImport(ax.tables, ax.choices, 0); } catch (e) { return { error: String(e && e.message || e) }; }
  }, [ax]);

  const handleActualFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setAxBusy(true);
    setAxError('');
    setAx(null);
    setAxConfirm(false);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { tables, meta } = await readActualExport(bytes);
      const desc = describeActualExport(tables);
      const choices = Object.fromEntries(desc.accounts.map(a => [a.id, { include: a.include, type: a.type }]));
      setAx({ fileName: file.name, meta, tables, desc, choices, mode: 'replace' });
    } catch (err) {
      setAxError(String((err && err.message) || err));
    }
    setAxBusy(false);
  };

  const axSetChoice = (id, patch) => setAx(prev => (prev ? { ...prev, choices: { ...prev.choices, [id]: { ...prev.choices[id], ...patch } } } : prev));

  const downloadBudgetBackup = () => {
    try {
      const data = { accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts, investments, scheduled };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-backup-${getTodayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { /* a failed backup download should not block the import; the in-app Undo still works */ }
  };

  // ----- Export -----
  const downloadText = (filename, text, mime) => {
    try {
      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      showNotification("Couldn't start the download in this browser.");
    }
  };
  const csvCell = (v) => {
    const t = v == null ? '' : String(v);
    return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const toCSV = (rows) => '\ufeff' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

  const exportTransactionsCSV = () => {
    const accName = new Map(accounts.map(a => [a.id, a.name]));
    const envLabel = (id) => { const e = envelopes.find(x => x.id === id); return e ? `${e.group}: ${e.name}` : ''; };
    const rows = [['Date', 'Account', 'Payee', 'Envelope', 'Notes', 'Outflow', 'Inflow', 'Cleared', 'Reconciled']];
    [...activeTransactions].sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach(t => {
      const acc = accName.get(t.accountId) || '';
      const status = [t.cleared || t.reconciled ? 'Yes' : 'No', t.reconciled ? 'Yes' : 'No'];
      const money = (amt) => (t.type === 'income' ? ['', Number(amt).toFixed(2)] : [Number(amt).toFixed(2), '']);
      if (isSplitTx(t)) {
        t.splits.forEach((sp, i) => rows.push([t.date, acc, t.payee, envLabel(sp.envelopeId), `${t.notes ? t.notes + ' ' : ''}(split ${i + 1}/${t.splits.length})`, ...money(sp.amount), ...status]));
      } else {
        const env = t.type === 'income'
          ? incomeAllocs(t).map(a => `${envLabel(a.envelopeId)} ${a.amount.toFixed(2)}`).join(' | ')
          : t.isTransfer ? '' : envLabel(t.envelopeId);
        rows.push([t.date, acc, t.payee, env, t.notes || '', ...money(t.amount), ...status]);
      }
    });
    downloadText(`transactions-${getTodayISO()}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    showNotification(`Exported ${rows.length - 1} rows.`);
  };

  const exportBudgetCSV = () => {
    const spend = {}; const inc = {};
    activeTransactions.forEach(t => {
      const k = txMonth(t);
      txParts(t).forEach(p => { (spend[p.envelopeId] = spend[p.envelopeId] || {})[k] = ((spend[p.envelopeId] || {})[k] || 0) + p.amount; });
      if (countsTowardRTA(t)) incomeAllocs(t).forEach(a => { (inc[a.envelopeId] = inc[a.envelopeId] || {})[k] = ((inc[a.envelopeId] || {})[k] || 0) + a.amount; });
    });
    const through = todayMonth > budgetEarliest ? todayMonth : budgetEarliest;
    const rows = [['Month', 'Group', 'Envelope', 'Assigned', 'From income', 'Activity', 'Available']];
    activeEnvelopes.forEach(env => {
      const tl = buildEnvTimeline(env.budget || {}, spend[env.id], through, inc[env.id]);
      [...tl.keys()].sort().forEach(k => {
        const r = tl.get(k);
        rows.push([k, env.group, env.name, r.budgeted.toFixed(2), r.income.toFixed(2), r.spent.toFixed(2), r.end.toFixed(2)]);
      });
    });
    downloadText(`budget-by-month-${getTodayISO()}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    showNotification(`Exported ${rows.length - 1} rows.`);
  };

  const handleRunActualImport = () => {
    if (!ax || !axPreview || axPreview.error) return;
    const built = buildActualImport(ax.tables, ax.choices, Date.now());
    if (ax.mode === 'replace' && !axConfirm && (transactions.length || accounts.length || envelopes.length)) {
      setAxConfirm(true);
      return;
    }
    downloadBudgetBackup();
    setAxUndo({ accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts, investments });
    if (ax.mode === 'replace') {
      setAccounts(built.accounts);
      setGroups(built.groups);
      setCollapsedGroups({});
      setCollapsedAccountTx({});
      setEnvelopes(built.envelopes);
      setTransactions(built.transactions);
      // Investments are never touched, and existing debts stay (imported loans are added unless one has the same name)
      setDebts(prev => [...prev, ...built.debts.filter(d => !prev.some(x => !x.isDeleted && String(x.name).trim().toLowerCase() === String(d.name).trim().toLowerCase()))]);
    } else {
      setAccounts(prev => [...prev, ...built.accounts]);
      setGroups(prev => [...prev, ...built.groups.filter(g => !prev.includes(g))]);
      setEnvelopes(prev => [...prev, ...built.envelopes]);
      setTransactions(prev => [...built.transactions, ...prev]);
      setDebts(prev => [...prev, ...built.debts]);
    }
    setAxConfirm(false);
    setBudgetMonth(getTodayISO().slice(0, 7));
    setActiveTab('budget');
    setAx(null);
    showNotification(`Imported ${built.transactions.length} transactions, ${built.envelopes.length} envelopes and ${built.accounts.length} accounts. A backup of your previous budget was downloaded.`);
  };

  const handleUndoActualImport = () => {
    if (!axUndo) return;
    setAccounts(axUndo.accounts);
    setGroups(axUndo.groups);
    setCollapsedGroups(axUndo.collapsedGroups || {});
    setCollapsedAccountTx(axUndo.collapsedAccountTx || {});
    setEnvelopes(axUndo.envelopes);
    setTransactions(axUndo.transactions);
    setDebts(axUndo.debts);
    setInvestments(axUndo.investments);
    setAxUndo(null);
    setSelectedTxIds([]);
    showNotification('Import undone. Your previous budget is back.');
  };

  // ----- Move money between envelopes / cover overspending -----
  // A move is recorded by nudging the two envelopes' assigned amounts for the month being viewed, so Ready to Assign
  // stays put and rollover, reports and everything else keep working from the same monthly numbers.
  const moveSources = (targetId) =>
    visibleEnvelopes.filter(e => e.id !== targetId && envRow(e).end > 0.004);

  const openMove = (env, mode) => {
    const row = envRow(env);
    if (mode === 'cover') {
      const need = round2(-row.end);
      const firstSource = moveSources(env.id).sort((a, b) => envRow(b).end - envRow(a).end)[0];
      const otherId = rtaShown >= need && need > 0 ? 'rta' : (firstSource ? firstSource.id : '');
      setMoveUi({ envId: env.id, mode, otherId, amount: String(need) });
    } else {
      setMoveUi({ envId: env.id, mode, otherId: '', amount: String(Math.max(0, round2(row.end))) });
    }
  };
  const closeMove = () => setMoveUi(null);

  const confirmMove = () => {
    if (!moveUi) return;
    const amount = round2(evalAmount(moveUi.amount));
    if (!(amount > 0)) { showNotification('Enter an amount above $0.'); return; }
    if (!moveUi.otherId) { showNotification(moveUi.mode === 'cover' ? 'Choose where the money comes from.' : 'Choose where to move the money.'); return; }
    const main = envelopes.find(e => e.id === moveUi.envId);
    if (!main) { closeMove(); return; }
    // giver = who loses assigned money, taker = who gains it ('rta' = Ready to Assign, no envelope change)
    const giverId = moveUi.mode === 'cover' ? moveUi.otherId : main.id;
    const takerId = moveUi.mode === 'cover' ? main.id : moveUi.otherId;
    if (giverId === 'rta') {
      if (amount > rtaShown + 0.004) { showNotification(`Only ${formatMoney(Math.max(0, rtaShown))} is left in Ready to Assign.`); return; }
    } else {
      const giver = envelopes.find(e => e.id === giverId);
      if (!giver) { closeMove(); return; }
      if (amount > envRow(giver).end + 0.004) { showNotification(`'${giver.name}' only has ${formatMoney(Math.max(0, envRow(giver).end))} available.`); return; }
    }
    setEnvelopes(prev => prev.map(e => {
      const cur = Number((e.budget || {})[budgetMonth]) || 0;
      if (e.id === giverId && giverId !== 'rta') return { ...e, budget: { ...(e.budget || {}), [budgetMonth]: round2(cur - amount) } };
      if (e.id === takerId && takerId !== 'rta') return { ...e, budget: { ...(e.budget || {}), [budgetMonth]: round2(cur + amount) } };
      return e;
    }));
    const nameOf = (id) => (id === 'rta' ? 'Ready to Assign' : (envelopes.find(e => e.id === id) || {}).name);
    showNotification(moveUi.mode === 'cover'
      ? `Covered ${formatMoney(amount)} for '${main.name}' from ${nameOf(giverId)}.`
      : `Moved ${formatMoney(amount)} from '${main.name}' to ${nameOf(takerId)}.`);
    closeMove();
  };

  const handleSoftDeleteEnvelope = (envId) => {
    const env = envelopes.find(e => e.id === envId);
    if (!env) return;
    // Assignments are kept (so a restore brings them back); its money returns to Ready to Assign while it is deleted.
    setEnvelopes(envelopes.map(e => (e.id === envId ? { ...e, isDeleted: true } : e)));
    if (editingEnvId === envId) resetEnvForm();
    showNotification(`Envelope '${env.name}' deleted.`);
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccBalance) return;
    const entered = parseFloat(newAccBalance) || 0;
    const isCC = newAccType === 'Credit Card';
    const newAcc = {
      id: 'acc-' + Date.now(),
      name: newAccName.trim(),
      type: newAccType,
      // Credit cards are entered as "amount owed" and stored as a negative balance.
      initialBalance: isCC ? -Math.abs(entered) : entered,
      isDeleted: false,
      lastReconciledDate: '',
      lastReconciledBalance: null
    };
    setAccounts([...accounts, newAcc]);
    setNewAccName('');
    setNewAccBalance('');
    showNotification(`Account '${newAcc.name}' added.`);
  };

  // ----- Hide envelopes and accounts (history stays; nothing is deleted) -----
  const doHideEnvelope = (env, release) => {
    const avail = round2(envRow(env).end);
    setEnvelopes(prev => prev.map(e => {
      if (e.id !== env.id) return e;
      const next = { ...e, isHidden: true };
      // Optionally hand what is left in it back to Ready to Assign (recorded in the month being viewed)
      if (release && avail > 0) {
        const b = e.budget || {};
        next.budget = { ...b, [budgetMonth]: round2((Number(b[budgetMonth]) || 0) - avail) };
      }
      return next;
    }));
    setHideEnvUi(null);
    showNotification(release && avail > 0
      ? `'${env.name}' hidden. ${formatMoney(avail)} went back to Ready to Assign.`
      : `'${env.name}' hidden. Its history stays; use "Show hidden envelopes" to bring it back.`);
  };
  const requestHideEnvelope = (env) => {
    if (Math.abs(round2(envRow(env).end)) < 0.005) { doHideEnvelope(env, false); return; }
    setHideEnvUi(env.id);
  };
  const handleUnhideEnvelope = (env) => {
    setEnvelopes(prev => prev.map(e => (e.id === env.id ? { ...e, isHidden: false } : e)));
    showNotification(`'${env.name}' is visible again.`);
  };
  const handleHideAccount = (acc) => {
    setAccounts(prev => prev.map(a => (a.id === acc.id ? { ...a, isHidden: true } : a)));
    if (reconcilingAccId === acc.id) setReconcilingAccId(null);
    showNotification(`'${acc.name.trim()}' hidden. Its history and balance stay in your totals; use "Show hidden accounts" to see it.`);
  };
  const handleUnhideAccount = (acc) => {
    setAccounts(prev => prev.map(a => (a.id === acc.id ? { ...a, isHidden: false } : a)));
    showNotification(`'${acc.name.trim()}' is visible again.`);
  };

  const handleSoftDeleteAccount = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return;
    setAccounts(accounts.map(a => (a.id === accId ? { ...a, isDeleted: true } : a)));
    if (reconcilingAccId === accId) setReconcilingAccId(null);
    showNotification(`Account '${acc.name}' moved to Trash.`);
  };

  const unlockTx = (tx) => {
    const other = tx.isTransfer && tx.transferId ? transactions.find(x => x.id !== tx.id && x.transferId === tx.transferId) : null;
    setUnlockedTxIds(prev => [...new Set([...prev, tx.id, ...(other ? [other.id] : [])])]);
    setUnlockAskId(null);
    showNotification(other ? 'Transfer unlocked (both sides).' : 'Transaction unlocked. Changing its amount, date or account will mark it as needing reconciliation.');
  };
  const relockTx = (tx) => {
    const other = tx.isTransfer && tx.transferId ? transactions.find(x => x.id !== tx.id && x.transferId === tx.transferId) : null;
    const drop = new Set([tx.id, other && other.id].filter(Boolean));
    setUnlockedTxIds(prev => prev.filter(id => !drop.has(id)));
    if (editingTxId && drop.has(editingTxId)) cancelEditTx();
    if (splitTxId && drop.has(splitTxId)) setSplitTxId(null);
  };

  const cancelEditTx = () => {
    setEditingTxId(null);
    setTxPayee('');
    setTxAmount('');
    setTxNotes('');
    setTxEnvelopeId('');
    setTxToAccountId('');
    setTxSplitLines(null);
    setTxDate(getTodayISO());
  };

  // The other leg of a transfer (if it still exists)
  const transferPartner = (tx) =>
    tx && tx.isTransfer && tx.transferId
      ? transactions.find(t => t.id !== tx.id && t.transferId === tx.transferId)
      : null;

  const startEditTx = (tx) => {
    if (isTxLocked(tx)) { showNotification(LOCKED_MSG); return; }
    setEditingTxId(tx.id);
    if (isMobile) setTxSheetOpen(true);
    setTxAmount(String(tx.amount));
    setTxDate(tx.date || getTodayISO());
    setTxNotes(tx.notes || '');
    setTxSplitLines(null);
    const partner = transferPartner(tx);
    if (tx.isTransfer && partner) {
      // Show a transfer as From -> To, whichever leg was clicked
      const outLeg = tx.type === 'expense' ? tx : partner;
      const inLeg = tx.type === 'expense' ? partner : tx;
      setTxType('transfer');
      setTxPayee('');
      setTxAccountId(outLeg.accountId);
      setTxToAccountId(inLeg.accountId);
      setTxEnvelopeId('');
    } else {
      setTxType(tx.type);
      setTxPayee(tx.payee);
      setTxAccountId(tx.accountId);
      setTxToAccountId('');
      setTxEnvelopeId(tx.envelopeId || '');
    }
    scrollToTop();
  };

  // Merge lines with the same envelope; returns { lines, error }
  const cleanSplitLines = (draft, total) => {
    const lines = draft.filter(l => l.envelopeId || (evalAmount(l.amount) || 0) !== 0);
    if (lines.some(l => !(Math.abs(evalAmount(l.amount)) > 0))) return { error: 'Every split line needs an amount other than $0.' };
    const merged = [];
    lines.forEach(l => {
      const amount = round2(evalAmount(l.amount));
      const hit = merged.find(m => m.envelopeId === l.envelopeId);
      if (hit) hit.amount = round2(hit.amount + amount);
      else merged.push({ envelopeId: l.envelopeId, amount });
    });
    const sum = merged.reduce((s, m) => s + m.amount, 0);
    if (Math.abs(round2(sum) - round2(Number(total))) > 0.004) {
      return { error: `Split lines must add up to $${Number(total).toFixed(2)}.` };
    }
    return { lines: merged };
  };

  // ----- Phone gestures on transaction rows: swipe left = delete, swipe right = cleared, long-press = select -----
  const SWIPE_AT = 90;
  const rowTouch = (tx, locked) => ({
    onTouchStart: (e) => {
      const t = e.touches[0];
      const timer = setTimeout(() => {
        if (touchRef.current && touchRef.current.id === tx.id && !touchRef.current.moved) {
          touchRef.current.pressed = true;
          setSelectMode(true);
          setSelectedTxIds(prev => (prev.includes(tx.id) ? prev : [...prev, tx.id]));
        }
      }, 520);
      touchRef.current = { id: tx.id, x: t.clientX, y: t.clientY, dx: 0, moved: false, horizontal: false, timer };
    },
    onTouchMove: (e) => {
      const r = touchRef.current;
      if (!r || r.id !== tx.id) return;
      const t = e.touches[0];
      const dx = t.clientX - r.x, dy = t.clientY - r.y;
      if (!r.horizontal && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        r.moved = true; clearTimeout(r.timer);
        r.horizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
      }
      if (r.horizontal && !selectMode) { r.dx = dx; setSwipe({ id: tx.id, dx: Math.max(-140, Math.min(140, dx)) }); }
    },
    onTouchEnd: () => {
      const r = touchRef.current;
      touchRef.current = null;
      if (!r) return;
      clearTimeout(r.timer);
      if (r.pressed) { setSwipe(null); return; }
      if (r.horizontal && !selectMode) {
        if (r.dx <= -SWIPE_AT) { if (locked) showNotification(LOCKED_MSG); else handleSoftDeleteTransaction(tx.id); }
        else if (r.dx >= SWIPE_AT) handleToggleCleared(tx.id);
      }
      setSwipe(null);
    },
    onTouchCancel: () => { if (touchRef.current) clearTimeout(touchRef.current.timer); touchRef.current = null; setSwipe(null); }
  });

  // ----- Payees: list, rename, merge -----
  const payeeList = useMemo(() => {
    const m = new Map();
    transactions.forEach(t => {
      if (t.isDeleted || t.isTransfer || !t.payee || t.payee === 'Reconciliation Adjustment') return;
      const e = m.get(t.payee) || { name: t.payee, count: 0, total: 0 };
      e.count += 1;
      e.total += (t.type === 'income' ? 1 : -1) * Math.abs(Number(t.amount) || 0);
      m.set(t.payee, e);
    });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [transactions]);
  const renamePayee = (from, toRaw) => {
    const to = (toRaw || '').trim();
    if (!to || to === from) { setPayeeEdit(null); return; }
    const merging = payeeList.some(p => p.name === to);
    let n = 0;
    setTransactions(prev => prev.map(t => { if (t.payee === from) { n += 1; return { ...t, payee: to }; } return t; }));
    setPayeeEdit(null);
    showNotification(merging ? `Merged "${from}" into "${to}".` : `Renamed "${from}" to "${to}".`);
  };

  // ----- Scheduled transactions: logic -----
  const activeScheduled = scheduled.filter(x => !x.isDeleted);
  const buildSchedTx = (sc, date) => ({
    id: schedTxId(sc.id, date), date, payee: sc.payee, amount: sc.amount, type: sc.type, accountId: sc.accountId,
    envelopeId: sc.type === 'expense' ? (sc.envelopeId || '') : '', notes: sc.notes || '', isDeleted: false, cleared: false, reconciled: false
  });
  // Due occurrences of one schedule (up to today), oldest first
  const dueDates = (sc, limit = 120) => {
    const out = [];
    let d = sc.nextDate;
    const today = getTodayISO();
    while (d && d <= today && out.length < limit && (!sc.endDate || d <= sc.endDate)) { out.push(d); d = nextOccurrence(d, sc.frequency, sc.anchorDay); }
    return { dates: out, next: d };
  };
  const dueSchedules = activeScheduled.filter(sc => !sc.autoPost && dueDates(sc, 1).dates.length > 0);
  const postDue = (list) => {
    const newTx = [];
    const updates = new Map();
    list.forEach(sc => {
      const { dates, next } = dueDates(sc);
      dates.forEach(dt => newTx.push(buildSchedTx(sc, dt)));
      updates.set(sc.id, next);
    });
    if (!newTx.length) return 0;
    setTransactions(prev => {
      const have = new Set(prev.map(t => t.id));
      return [...newTx.filter(t => !have.has(t.id)), ...prev];
    });
    setScheduled(prev => prev.map(sc => (updates.has(sc.id) ? { ...sc, nextDate: updates.get(sc.id) } : sc)));
    return newTx.length;
  };
  const skipDue = (sc) => {
    const { dates, next } = dueDates(sc);
    if (!dates.length) return;
    setScheduled(prev => prev.map(x => (x.id === sc.id ? { ...x, nextDate: next } : x)));
    showNotification(`Skipped ${dates.length} ${dates.length === 1 ? 'occurrence' : 'occurrences'} of ${sc.payee}.`);
  };
  // Automatic ones post themselves when the budget loads
  useEffect(() => {
    if (!syncTick || !loadedRef.current) return;
    const auto = scheduled.filter(x => !x.isDeleted && x.autoPost && dueDates(x, 1).dates.length > 0);
    if (!auto.length) return;
    const n = postDue(auto);
    if (n) showNotification(`Posted ${n} scheduled ${n === 1 ? 'transaction' : 'transactions'}.`);
  }, [syncTick]);

  const emptySched = () => ({ id: '', payee: '', amount: '', type: 'expense', accountId: '', envelopeId: '', notes: '', frequency: 'monthly', nextDate: getTodayISO(), autoPost: false });
  const saveSched = (e) => {
    e.preventDefault();
    const f = schedForm;
    const amt = evalAmount(f.amount);
    if (!f.payee.trim() || !f.accountId || isNaN(amt) || amt <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(f.nextDate)) {
      showNotification('Enter a payee, an amount above $0, an account and a start date.');
      return;
    }
    const item = { ...f, payee: f.payee.trim(), amount: amt, anchorDay: isoToDate(f.nextDate).getDate(), isDeleted: false };
    if (f.id) setScheduled(prev => prev.map(x => (x.id === f.id ? item : x)));
    else setScheduled(prev => [...prev, { ...item, id: 'sch-' + Date.now() }]);
    setSchedForm(null);
    showNotification(f.id ? 'Schedule updated.' : 'Schedule added.');
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    const isTransferForm = txType === 'transfer';
    if ((!isTransferForm && !txPayee.trim()) || !txAmount || !txAccountId) {
      showNotification(isTransferForm ? 'Please fill in Amount and both accounts.' : 'Please fill in Payee, Amount, and Account.');
      return;
    }

    const amt = evalAmount(txAmount);
    if (isNaN(amt)) {
      showNotification('Please enter a valid amount.');
      return;
    }

    if (!isTransferForm && amt === 0) {
      showNotification('Enter an amount other than $0.');
      return;
    }

    // ----- Transfers between two accounts -----
    if (isTransferForm) {
      const from = accounts.find(a => a.id === txAccountId);
      const to = accounts.find(a => a.id === txToAccountId);
      if (!from || !to) {
        showNotification('Choose the account the money comes from and the one it goes to.');
        return;
      }
      if (from.id === to.id) {
        showNotification('A transfer needs two different accounts.');
        return;
      }
      if (!(amt > 0)) {
        showNotification('Enter a transfer amount above $0.');
        return;
      }
      const date = txDate || getTodayISO();
      const editing = editingTxId ? transactions.find(t => t.id === editingTxId) : null;
      if (editing && isTxLocked(editing)) { showNotification(LOCKED_MSG); return; }
      const oldPartner = editing ? transferPartner(editing) : null;
      if (editing && editing.isTransfer && oldPartner) {
        const outOld = editing.type === 'expense' ? editing : oldPartner;
        const inOld = editing.type === 'expense' ? oldPartner : editing;
        const moneyChanged = Number(outOld.amount) !== amt || outOld.accountId !== from.id || inOld.accountId !== to.id;
        const patch = (leg, accountId, other) => {
          const next = { ...leg, date, amount: amt, accountId, transferAccountId: other.id, payee: 'Transfer: ' + other.name, notes: txNotes };
          if (moneyChanged && leg.reconciled) { next.reconciled = false; next.cleared = true; }
          return next;
        };
        setTransactions(prev => prev.map(t => {
          if (t.id === outOld.id) return patch(t, from.id, to);
          if (t.id === inOld.id) return patch(t, to.id, from);
          return t;
        }));
        cancelEditTx();
        setUnlockedTxIds(prev => prev.filter(id => id !== outOld.id && id !== inOld.id)); // relock once the change is saved
        showNotification('Transfer updated.');
        return;
      }
      const transferId = 'xfer-' + Date.now();
      const base = { date, amount: amt, envelopeId: '', notes: txNotes, isDeleted: false, cleared: false, reconciled: false, isTransfer: true, transferId };
      const outLeg = { ...base, id: 'tx-' + Date.now() + '-o', type: 'expense', accountId: from.id, transferAccountId: to.id, payee: 'Transfer: ' + to.name };
      const inLeg = { ...base, id: 'tx-' + Date.now() + '-i', type: 'income', accountId: to.id, transferAccountId: from.id, payee: 'Transfer: ' + from.name };
      // Turning an ordinary transaction into a transfer replaces it with the new pair
      const replacing = editing && !(editing.isTransfer && oldPartner) ? editing.id : null;
      setTransactions(prev => [outLeg, inLeg, ...prev.filter(t => t.id !== replacing)]);
      cancelEditTx();
      setTxDate(getTodayISO());
      showNotification(`Transferred $${amt.toFixed(2)} from ${from.name} to ${to.name}.`);
      return;
    }

    // Editing: update in place and keep Ready to Assign in sync
    if (editingTxId) {
      const old = transactions.find(t => t.id === editingTxId);
      if (!old) {
        cancelEditTx();
        return;
      }
      if (isTxLocked(old)) { showNotification(LOCKED_MSG); return; }
      const updated = {
        ...old,
        date: txDate || getTodayISO(),
        payee: txPayee.trim(),
        amount: amt,
        type: txType,
        accountId: txAccountId,
        envelopeId: txType === 'expense' ? txEnvelopeId : '',
        notes: txNotes
      };
      // A transfer edited as a normal transaction (its partner is gone) becomes an ordinary one
      if (old.isTransfer) {
        delete updated.isTransfer;
        delete updated.transferId;
        delete updated.transferAccountId;
        delete updated.origPayee;
      }
      // Keep a split only while the amount and type stay the same; otherwise the parts no longer add up.
      let splitCleared = false;
      if (isSplitTx(old)) {
        if (txType === 'expense' && Number(old.amount) === amt) {
          updated.splits = old.splits;
          updated.envelopeId = '';
        } else {
          delete updated.splits;
          splitCleared = true;
        }
      }

      // Income sent to envelopes: keep it while it still fits in the new amount
      let allocDropped = false;
      if (Array.isArray(old.allocations)) {
        const allocTotal = old.allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
        if (txType === 'income' && allocTotal <= amt + 0.004) updated.allocations = old.allocations;
        else { delete updated.allocations; allocDropped = true; }
      }

      // Changing the money side of a reconciled transaction means it needs reconciling again
      const moneyChanged = Number(old.amount) !== amt || old.type !== txType || old.accountId !== txAccountId;
      if (moneyChanged && old.reconciled) {
        updated.reconciled = false;
        updated.cleared = true;
      }

      setTransactions(transactions.map(t => (t.id === editingTxId ? updated : t)));
      cancelEditTx();
      setUnlockedTxIds(prev => prev.filter(id => id !== old.id)); // relock once the change is saved
      if (splitCleared && splitTxId === editingTxId) setSplitTxId(null);
      showNotification(splitCleared ? 'Transaction updated. Its split was cleared because the amount or type changed.'
        : allocDropped ? 'Transaction updated. Its envelope amounts were cleared because they no longer fit the income.' : 'Transaction updated.');
      return;
    }

    // Optional split across envelopes (new expenses only)
    let splits = null;
    if (txType === 'expense' && txSplitLines) {
      const res = cleanSplitLines(txSplitLines, amt);
      if (res.error) {
        showNotification(res.error);
        return;
      }
      if (res.lines.length > 1) splits = res.lines;
    }
    const singleEnv = txType === 'expense'
      ? (txSplitLines && !splits ? ((cleanSplitLines(txSplitLines, amt).lines || [])[0]?.envelopeId || '') : txEnvelopeId)
      : '';

    let allocations = null;
    if (txType === 'income' && txSplitLines) {
      if (!(amt > 0)) { showNotification('Enter an income amount above $0 to send it to envelopes.'); return; }
      const res = cleanAllocLines(txSplitLines, amt);
      if (res.error) { showNotification(res.error); return; }
      if (res.lines.length) allocations = res.lines;
    }

    const newTx = {
      id: 'tx-' + Date.now(),
      date: txDate || getTodayISO(),
      payee: txPayee.trim(),
      amount: amt,
      type: txType,
      accountId: txAccountId,
      envelopeId: splits ? '' : singleEnv,
      notes: txNotes,
      isDeleted: false,
      cleared: false,
      reconciled: false
    };
    if (splits) newTx.splits = splits;
    if (allocations) newTx.allocations = allocations;

    setTransactions([newTx, ...transactions]);

    setTxPayee('');
    setTxAmount('');
    setTxNotes('');
    setTxSplitLines(null);
    setTxDate(getTodayISO());
    showNotification(splits ? `Transaction recorded, split across ${splits.length} envelopes.`
      : allocations ? `Income recorded. ${formatMoney(allocations.reduce((s, a) => s + a.amount, 0))} went into ${allocations.length} envelope${allocations.length === 1 ? '' : 's'}.`
      : 'Transaction recorded.');
  };

  // ----- Linking existing transactions as transfers -----
  const linkAsTransfer = (a, b) => {
    if (!canLinkAsTransfer(a, b)) return false;
    const accA = accounts.find(x => x.id === a.accountId);
    const accB = accounts.find(x => x.id === b.accountId);
    const transferId = 'xfer-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const strip = ({ splits, allocations, ...rest }) => rest;
    const mk = (t, other) => ({
      ...strip(t),
      envelopeId: '',
      isTransfer: true,
      transferId,
      transferAccountId: other.id,
      origPayee: t.payee,
      payee: 'Transfer: ' + other.name
    });
    setTransactions(prev => prev.map(t => (t.id === a.id ? mk(t, accB) : t.id === b.id ? mk(t, accA) : t)));
    return true;
  };

  const handleLinkSelected = () => {
    if (selectedTxIds.length !== 2) {
      showNotification('Select exactly two transactions to link as a transfer.');
      return;
    }
    const a = transactions.find(t => t.id === selectedTxIds[0]);
    const b = transactions.find(t => t.id === selectedTxIds[1]);
    if (isTxLocked(a) || isTxLocked(b)) { showNotification('One of these is reconciled and locked. Unlock it first to link it.'); return; }
    if (!canLinkAsTransfer(a, b)) {
      showNotification('To link them, one must be money out and the other money in, with the same amount, in different accounts.');
      return;
    }
    linkAsTransfer(a, b);
    setSelectedTxIds([]);
    showNotification('Linked as a transfer. It no longer counts as income or spending.');
  };

  const handleLinkMatch = (pair) => {
    if (linkAsTransfer(pair.out, pair.in)) showNotification('Linked as a transfer.');
  };

  const handleLinkAllMatches = () => {
    const pairs = transferMatches;
    if (!pairs.length) return;
    const strip = ({ splits, allocations, ...rest }) => rest;
    const stamp = Date.now();
    const byId = new Map();
    pairs.forEach((p, i) => {
      const transferId = `xfer-${stamp}-${i}`;
      const accOut = accounts.find(x => x.id === p.out.accountId);
      const accIn = accounts.find(x => x.id === p.in.accountId);
      byId.set(p.out.id, { ...strip(p.out), envelopeId: '', isTransfer: true, transferId, transferAccountId: p.in.accountId, origPayee: p.out.payee, payee: 'Transfer: ' + (accIn ? accIn.name : '') });
      byId.set(p.in.id, { ...strip(p.in), envelopeId: '', isTransfer: true, transferId, transferAccountId: p.out.accountId, origPayee: p.in.payee, payee: 'Transfer: ' + (accOut ? accOut.name : '') });
    });
    setTransactions(prev => prev.map(t => byId.get(t.id) || t));
    showNotification(`Linked ${pairs.length} transfer${pairs.length === 1 ? '' : 's'}.`);
  };

  // Turn a transfer back into two ordinary transactions
  const handleUnlinkTransfer = (tx) => {
    if (isTxLocked(tx)) { showNotification(LOCKED_MSG); return; }
    const partner = transferPartner(tx);
    const ids = new Set([tx.id, partner && partner.id].filter(Boolean));
    setTransactions(prev => prev.map(t => {
      if (!ids.has(t.id)) return t;
      const { isTransfer, transferId, transferAccountId, origPayee, ...rest } = t;
      return { ...rest, payee: origPayee || t.payee };
    }));
    if (editingTxId && ids.has(editingTxId)) cancelEditTx();
    showNotification('Unlinked. Both sides are now ordinary transactions (the money-in one counts as income).');
  };

  // ----- CSV import -----
  const closeImport = () => {
    setImportRows([]);
    setImportFileName('');
    setImportHasHeader(true);
    setImportMap({ date: '', payee: '', amount: '', debit: '', credit: '', notes: '' });
    setImportDateFormat('auto');
    setImportSign('negative-expense');
    setImportSkipDupes(true);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // lets the same file be chosen again later
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      showNotification('That file is too large (max 3 MB).');
      return;
    }
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        showNotification('No rows found in that file.');
        return;
      }
      if (rows.length > MAX_IMPORT_ROWS + 1) {
        showNotification(`Too many rows (max ${MAX_IMPORT_ROWS.toLocaleString()} per import).`);
        return;
      }
      // If the first row already contains a readable date, there is no header row.
      const hasHeader = !rows[0].some(cell => parseDate(cell, 'mdy') !== '');
      setImportRows(rows);
      setImportFileName(file.name);
      setImportHasHeader(hasHeader);
      setImportMap(hasHeader
        ? detectMapping(rows[0])
        : { date: '', payee: '', amount: '', debit: '', credit: '', notes: '' });
      setImportDateFormat('auto');
      setImportSign('negative-expense');
      setImportSkipDupes(true);
      setImportAccountId(
        accountChoices('').length === 1
          ? accountChoices('')[0].id
          : (activeAccounts.some(a => a.id === txAccountId) ? txAccountId : '')
      );
    } catch (err) {
      console.error('CSV read error:', err);
      showNotification("Couldn't read that file.");
    }
  };

  const handleImportHeaderToggle = (checked) => {
    setImportHasHeader(checked);
    if (importRows.length) {
      setImportMap(checked
        ? detectMapping(importRows[0])
        : { date: '', payee: '', amount: '', debit: '', credit: '', notes: '' });
    }
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    if (!importAccountId) {
      showNotification('Choose an account to import into.');
      return;
    }
    if (importMap.date === '' || (importMap.amount === '' && importMap.debit === '' && importMap.credit === '')) {
      showNotification('Map the Date column and an Amount (or Debit/Credit) column first.');
      return;
    }
    const toImport = importPreview.rows.filter(r => r.status === 'ok' || (r.status === 'dup' && !importSkipDupes));
    if (toImport.length === 0) {
      showNotification('Nothing to import.');
      return;
    }

    const stamp = Date.now();
    // Bank exports only contain transactions that have cleared, so they arrive as cleared (not yet reconciled).
    const newTxs = toImport.map((r, i) => ({
      id: `tx-${stamp}-${i}`,
      date: r.date,
      payee: r.payee,
      amount: r.amount,
      type: r.type,
      accountId: importAccountId,
      envelopeId: r.type === 'expense' ? r.envelopeId : '',
      notes: r.notes,
      isDeleted: false,
      cleared: true,
      reconciled: false
    }));

    setTransactions(prev => [...newTxs, ...prev]);
    closeImport();
    showNotification(`Imported ${newTxs.length} transaction${newTxs.length === 1 ? '' : 's'}.`);
  };

  // Assign (or clear) an envelope right from the transaction list, without opening the edit form
  // Pick one envelope for the whole transaction (drops any split)
  const withSingleEnvelope = (t, envId) => {
    const { splits, ...rest } = t;
    return { ...rest, envelopeId: envId };
  };

  // ----- Split transactions -----
  const openSplit = (tx) => {
    if (isTxLocked(tx)) { showNotification(LOCKED_MSG); return; }
    setSplitTxId(tx.id);
    if (tx.type === 'income') {
      const al = incomeAllocs(tx);
      setSplitDraft(al.length ? al.map(a => ({ envelopeId: a.envelopeId, amount: String(a.amount) })) : [{ envelopeId: '', amount: '' }]);
    } else if (isSplitTx(tx)) {
      setSplitDraft(tx.splits.map(s => ({ envelopeId: s.envelopeId || '', amount: String(s.amount) })));
    } else {
      setSplitDraft([
        { envelopeId: tx.envelopeId || '', amount: String(tx.amount) },
        { envelopeId: '', amount: '' }
      ]);
    }
  };
  const closeSplit = () => {
    setSplitTxId(null);
    setSplitDraft([]);
  };
  const updateSplitLine = (i, patch) => setSplitDraft(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addSplitLine = () => setSplitDraft(prev => [...prev, { envelopeId: '', amount: '' }]);
  const removeSplitLine = (i) => setSplitDraft(prev => prev.filter((_, idx) => idx !== i));
  const splitRemaining = (total) =>
    round2(Number(total) - splitDraft.reduce((s, l) => s + (evalAmount(l.amount) || 0), 0));
  // Put whatever is still unassigned onto one line
  const fillSplitRemainder = (i, total) => {
    const others = splitDraft.reduce((s, l, idx) => (idx === i ? s : s + (evalAmount(l.amount) || 0)), 0);
    const rest = round2(Number(total) - others);
    if (rest !== 0) updateSplitLine(i, { amount: String(rest) });
  };

  // The split / send-to-envelopes editor (used under a list row and inside the phone edit sheet)
  const renderSplitEditor = (tx) => {
                              const left = splitRemaining(tx.amount);
                              const inc = tx.type === 'income';
                              return (
                                <div data-testid="split-editor" style={{ marginTop: '8px', padding: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>
                                    {inc ? `Send part of $${Number(tx.amount).toFixed(2)} straight to envelopes` : `Split $${Number(tx.amount).toFixed(2)} across envelopes`}
                                  </div>
                                  {splitDraft.map((line, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: isMobile ? '12px' : '6px', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                                      <select
                                        value={line.envelopeId}
                                        onChange={e => updateSplitLine(i, { envelopeId: e.target.value })}
                                        aria-label={`Split line ${i + 1} envelope`}
                                        style={{ flex: isMobile ? '1 1 100%' : '1 1 auto', minWidth: 0, padding: isMobile ? '10px' : '5px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem' }}
                                      >
                                        <option value="">{inc ? 'Choose envelope' : 'No envelope'}</option>
                                        {line.envelopeId && envelopes.find(e => e.id === line.envelopeId && (e.isDeleted || e.isHidden)) && (
                                          <option value={line.envelopeId}>{envelopes.find(e => e.id === line.envelopeId).name} ({envelopes.find(e => e.id === line.envelopeId).isDeleted ? 'deleted' : 'hidden'})</option>
                                        )}
                                        {envelopeChoices.map(c => (
                                          <optgroup key={c.label} label={c.label}>
                                            {c.list.map(e => (
                                              <option key={e.id} value={e.id}>{e.name}</option>
                                            ))}
                                          </optgroup>
                                        ))}
                                      </select>
                                      <SplitAmountInput value={line.amount} onChange={v => updateSplitLine(i, { amount: v })} ariaLabel={`Split line ${i + 1} amount`} width="110px" />
                                      <button
                                        type="button"
                                        onClick={() => fillSplitRemainder(i, tx.amount)}
                                        title="Put the remaining amount on this line"
                                        aria-label={`Fill remainder on line ${i + 1}`}
                                        style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', padding: '4px 6px', fontSize: '0.7rem', color: '#374151' }}
                                      >
                                        Rest
                                      </button>
                                      {splitDraft.length > (inc ? 1 : 2) && (
                                        <button
                                          type="button"
                                          onClick={() => removeSplitLine(i)}
                                          aria-label={`Remove split line ${i + 1}`}
                                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px 4px' }}
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <div style={{ fontSize: '0.8rem', marginBottom: '8px', color: inc ? (left < -0.005 ? '#b45309' : '#059669') : Math.abs(left) < 0.005 ? '#059669' : '#b45309' }}>
                                    {inc
                                      ? (left < -0.005 ? `$${Math.abs(left).toFixed(2)} over` : Math.abs(left) < 0.005 ? 'All of it goes to envelopes' : `$${left.toFixed(2)} stays in Ready to Assign`)
                                      : Math.abs(left) < 0.005
                                      ? 'Fully assigned'
                                      : left > 0
                                        ? `$${left.toFixed(2)} left to assign`
                                        : `$${Math.abs(left).toFixed(2)} over`}
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={addSplitLine} style={{ background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                      + Add line
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleSaveSplit}
                                      disabled={inc ? left < -0.005 : Math.abs(left) >= 0.005}
                                      style={{ backgroundColor: (inc ? left < -0.005 : Math.abs(left) >= 0.005) ? '#9ca3af' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: (inc ? left < -0.005 : Math.abs(left) >= 0.005) ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                    >
                                      {inc ? 'Save' : 'Save split'}
                                    </button>
                                    <button type="button" onClick={closeSplit} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem' }}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              );
  };

  // Lines editor used by the Add Transaction form (the list's own editor keeps its state in splitDraft)
  const renderFormSplit = (draft, setDraft, total, income = false) => {
    const set = (i, patch) => setDraft(draft.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    const left = round2((evalAmount(total) || 0) - draft.reduce((s, l) => s + (evalAmount(l.amount) || 0), 0));
    return (
      <div data-testid="form-split" style={{ gridColumn: '1 / -1', padding: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        {draft.map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
            <select
              value={line.envelopeId}
              onChange={e => set(i, { envelopeId: e.target.value })}
              aria-label={`New split line ${i + 1} envelope`}
              style={{ flex: '1 1 auto', minWidth: 0, padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              <option value="">{income ? 'Choose envelope' : 'No envelope'}</option>
              {envelopeChoices.map(c => (
                <optgroup key={c.label} label={c.label}>
                  {c.list.map(e => (<option key={e.id} value={e.id}>{e.name}</option>))}
                </optgroup>
              ))}
            </select>
            <SplitAmountInput value={line.amount} onChange={v => set(i, { amount: v })} ariaLabel={`New split line ${i + 1} amount`} width="110px" />
            <button
              type="button"
              onClick={() => {
                const others = draft.reduce((s, l, idx) => (idx === i ? s : s + (evalAmount(l.amount) || 0)), 0);
                const rest = round2((evalAmount(total) || 0) - others);
                if (rest > 0) set(i, { amount: String(rest) });
              }}
              aria-label={`Fill remainder on new split line ${i + 1}`}
              title="Put the remaining amount on this line"
              style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', padding: '4px 6px', fontSize: '0.7rem', color: '#374151' }}
            >
              Rest
            </button>
            {draft.length > (income ? 1 : 2) && (
              <button type="button" onClick={() => setDraft(draft.filter((_, idx) => idx !== i))} aria-label={`Remove new split line ${i + 1}`} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px 4px' }}>✕</button>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}>
          <button type="button" onClick={() => setDraft([...draft, { envelopeId: '', amount: '' }])} style={{ background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>+ Add line</button>
          <span style={{ color: !(evalAmount(total) > 0) ? '#6b7280' : Math.abs(left) < 0.005 ? '#059669' : '#b45309' }}>
            {!(evalAmount(total) > 0)
              ? 'Enter the amount first'
              : income
                ? (left < -0.005 ? `$${Math.abs(left).toFixed(2)} over` : Math.abs(left) < 0.005 ? 'All of it goes to envelopes' : `$${left.toFixed(2)} stays in Ready to Assign`)
                : Math.abs(left) < 0.005 ? 'Fully assigned' : left > 0 ? `$${left.toFixed(2)} left to assign` : `$${Math.abs(left).toFixed(2)} over`}
          </span>
        </div>
      </div>
    );
  };

  // Income allocations: lines need an envelope and an amount; the total may be less than the income (the rest stays in Ready to Assign)
  const cleanAllocLines = (draft, total) => {
    const lines = draft.filter(l => l.envelopeId || String(l.amount || '').trim() !== '');
    if (lines.some(l => !l.envelopeId)) return { error: 'Choose an envelope for every line.' };
    if (lines.some(l => !(evalAmount(l.amount) > 0))) return { error: 'Every line needs an amount above $0.' };
    const merged = [];
    lines.forEach(l => {
      const amount = round2(evalAmount(l.amount));
      const hit = merged.find(m => m.envelopeId === l.envelopeId);
      if (hit) hit.amount = round2(hit.amount + amount);
      else merged.push({ envelopeId: l.envelopeId, amount });
    });
    const sum = round2(merged.reduce((s, m) => s + m.amount, 0));
    if (sum > round2(Number(total)) + 0.004) return { error: `Envelopes can't get more than the $${Number(total).toFixed(2)} you received.` };
    return { lines: merged };
  };

  const handleSaveSplit = () => {
    const tx = transactions.find(t => t.id === splitTxId);
    if (!tx) { closeSplit(); return; }
    if (isTxLocked(tx)) { showNotification(LOCKED_MSG); return; }
    if (tx.type === 'income') {
      const res = cleanAllocLines(splitDraft, tx.amount);
      if (res.error) { showNotification(res.error); return; }
      setTransactions(prev => prev.map(t => {
        if (t.id !== tx.id) return t;
        const { allocations, ...rest } = t;
        return res.lines.length ? { ...rest, allocations: res.lines } : rest;
      }));
      showNotification(res.lines.length ? `Sent ${formatMoney(res.lines.reduce((s, a) => s + a.amount, 0))} to ${res.lines.length} envelope${res.lines.length === 1 ? '' : 's'}. The rest stays in Ready to Assign.` : 'Envelope amounts removed. All of it is back in Ready to Assign.');
      closeSplit();
      return;
    }
    const lines = splitDraft.filter(l => l.envelopeId || (evalAmount(l.amount) || 0) !== 0);
    if (lines.some(l => !(Math.abs(evalAmount(l.amount)) > 0))) {
      showNotification('Every split line needs an amount other than $0.');
      return;
    }
    // Merge lines that use the same envelope
    const merged = [];
    lines.forEach(l => {
      const amount = round2(evalAmount(l.amount));
      const hit = merged.find(m => m.envelopeId === l.envelopeId);
      if (hit) hit.amount = round2(hit.amount + amount);
      else merged.push({ envelopeId: l.envelopeId, amount });
    });
    const total = merged.reduce((s, m) => s + m.amount, 0);
    if (Math.abs(round2(total) - round2(Number(tx.amount))) > 0.004) {
      showNotification(`Split lines must add up to $${Number(tx.amount).toFixed(2)}.`);
      return;
    }
    if (merged.length <= 1) {
      const only = merged[0] ? merged[0].envelopeId : '';
      setTransactions(prev => prev.map(t => (t.id === tx.id ? withSingleEnvelope(t, only) : t)));
      if (editingTxId === tx.id) setTxEnvelopeId(only);
      showNotification(only ? 'Filed under one envelope (no split needed).' : 'Split removed.');
    } else {
      setTransactions(prev => prev.map(t => (t.id === tx.id ? { ...t, envelopeId: '', splits: merged } : t)));
      if (editingTxId === tx.id) setTxEnvelopeId('');
      showNotification(`Split across ${merged.length} envelopes.`);
    }
    closeSplit();
  };

  const handleRemoveSplit = (txId) => {
    if (isTxLocked(transactions.find(t => t.id === txId))) { showNotification(LOCKED_MSG); return; }
    setTransactions(prev => prev.map(t => (t.id === txId ? withSingleEnvelope(t, '') : t)));
    if (editingTxId === txId) setTxEnvelopeId('');
    if (splitTxId === txId) closeSplit();
    showNotification('Split removed. Choose an envelope for this transaction.');
  };

  const handleAssignTxEnvelope = (txId, envId) => {
    const env = envelopes.find(e => e.id === envId);
    if (isTxLocked(transactions.find(t => t.id === txId))) { showNotification(LOCKED_MSG); return; }
    setTransactions(prev => prev.map(t => (t.id === txId && t.type === 'expense' && !t.isTransfer ? withSingleEnvelope(t, envId) : t)));
    if (editingTxId === txId) setTxEnvelopeId(envId); // keep the edit form from restoring an old value
    showNotification(env ? `Filed under '${env.name}'.` : 'Envelope cleared.');
  };

  const handleAssignSelectedEnvelope = (envId) => {
    if (!envId) return;
    const lockedCount = transactions.filter(t => selectedTxIds.includes(t.id) && t.type === 'expense' && !t.isTransfer && isTxLocked(t)).length;
    const ids = new Set(selectedTxIds.filter(id => !isTxLocked(transactions.find(t => t.id === id))));
    const env = envelopes.find(e => e.id === envId);
    const count = transactions.filter(t => ids.has(t.id) && !t.isDeleted && t.type === 'expense' && !t.isTransfer).length;
    if (count === 0) {
      showNotification(lockedCount ? 'Those transactions are reconciled and locked. Unlock them first.' : 'Select at least one expense to assign an envelope.');
      return;
    }
    setTransactions(prev => prev.map(t => (ids.has(t.id) && !t.isDeleted && t.type === 'expense' && !t.isTransfer ? withSingleEnvelope(t, envId) : t)));
    if (editingTxId && ids.has(editingTxId)) setTxEnvelopeId(envId);
    showNotification(`${count} transaction${count === 1 ? '' : 's'} filed under '${env ? env.name : 'envelope'}'.${lockedCount ? ` ${lockedCount} reconciled and locked ${lockedCount === 1 ? 'was' : 'were'} skipped.` : ''}`);
  };

  const handleSoftDeleteTransaction = (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    if (isTxLocked(tx)) { showNotification(LOCKED_MSG); return; }
    const partner = transferPartner(tx);
    const ids = new Set([txId, partner && partner.id].filter(Boolean));
    setTransactions(transactions.map(t => (ids.has(t.id) ? { ...t, isDeleted: true } : t)));
    setSelectedTxIds(prev => prev.filter(id => !ids.has(id))); // don't leave a stale selection behind
    if (ids.has(editingTxId)) cancelEditTx();
    showNotification(partner ? 'Transfer moved to Trash (both sides).' : 'Transaction moved to Trash.');
  };

  // Multi-select transaction deletion handlers
  const handleToggleSelectTx = (txId) => {
    setSelectedTxIds(prev =>
      prev.includes(txId) ? prev.filter(id => id !== txId) : [...prev, txId]
    );
  };

  const handleSelectAllTx = (e) => {
    if (e.target.checked) {
      setSelectedTxIds(visibleTransactions.map(t => t.id));
    } else {
      setSelectedTxIds([]);
    }
  };

  const handleDeleteSelectedTransactions = () => {
    if (selectedTxIds.length === 0) return;

    // A transfer always goes to the Trash as a pair. Reconciled (locked) transactions are left alone.
    const lockedPicked = transactions.filter(t => selectedTxIds.includes(t.id) && isTxLocked(t));
    const chosen = new Set(selectedTxIds.filter(id => !lockedPicked.some(t => t.id === id)));
    if (lockedPicked.length) {
      showNotification(`${lockedPicked.length} reconciled transaction${lockedPicked.length === 1 ? ' was' : 's were'} skipped. Unlock ${lockedPicked.length === 1 ? 'it' : 'them'} first to delete.`);
      if (chosen.size === 0) return;
    }
    const xfers = new Set(transactions.filter(t => chosen.has(t.id) && t.transferId).map(t => t.transferId));
    setTransactions(prev => prev.map(t => (chosen.has(t.id) || (t.transferId && xfers.has(t.transferId)) ? { ...t, isDeleted: true } : t)));
    if (selectedTxIds.includes(editingTxId)) cancelEditTx();
    setSelectedTxIds([]);
    if (!lockedPicked.length) showNotification('Selected transactions moved to Trash.');
  };

  const handleAddDebt = (e) => {
    e.preventDefault();
    if (!newDebtName.trim() || !newDebtTotal) return;
    const newDebt = {
      id: 'd-' + Date.now(),
      name: newDebtName.trim(),
      totalAmount: parseFloat(newDebtTotal) || 0,
      balance: parseFloat(newDebtTotal) || 0,
      APR: parseFloat(newDebtAPR) || 0,
      minimumPayment: parseFloat(newDebtMin) || 0,
      isDeleted: false
    };
    setDebts([...debts, newDebt]);
    setNewDebtName('');
    setNewDebtTotal('');
    setNewDebtAPR('');
    setNewDebtMin('');
    showNotification(`Debt '${newDebt.name}' tracked.`);
  };

  const handleSoftDeleteDebt = (debtId) => {
    setDebts(debts.map(d => (d.id === debtId ? { ...d, isDeleted: true } : d)));
    showNotification('Debt moved to Trash.');
  };

  // ----- Investments: fully separate from accounts/envelopes, so nothing here touches Ready to Assign -----
  const newEntryId = () => 'ie-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

  const resetInvForm = () => {
    setEditingInvId(null);
    setNewInvName('');
    setNewInvType('Brokerage');
    setNewInvValue('');
    setNewInvBasis('');
    setInvFormOpen(false);
  };

  const startEditInv = (inv) => {
    setEditingInvId(inv.id);
    setNewInvName(inv.name);
    setNewInvType(inv.type || 'Brokerage');
    setNewInvValue(String(inv.value));
    setNewInvBasis(String(inv.costBasis));
    setInvFormOpen(true);
    setInvPanel(null);
    scrollToTop();
  };

  const handleSaveInvestment = (e) => {
    e.preventDefault();
    const value = parseFloat(newInvValue);
    if (!newInvName.trim() || isNaN(value) || value < 0) {
      showNotification('Enter a name and a current value.');
      return;
    }
    const existing = editingInvId ? investments.find(i => i.id === editingInvId) : null;
    let basis = newInvBasis === '' ? (existing ? Number(existing.costBasis) : value) : parseFloat(newInvBasis);
    if (isNaN(basis)) {
      showNotification('Amount invested must be a number.');
      return;
    }

    if (existing) {
      const valueChanged = round2(existing.value) !== round2(value);
      const entries = valueChanged
        ? [{ id: newEntryId(), date: getTodayISO(), kind: 'value', amount: round2(value), note: 'Adjusted' }, ...(existing.entries || [])]
        : (existing.entries || []);
      setInvestments(investments.map(i => (i.id === existing.id
        ? { ...i, name: newInvName.trim(), type: newInvType, value: round2(value), costBasis: round2(basis), entries }
        : i)));
      showNotification(`'${newInvName.trim()}' updated.`);
    } else {
      const newInv = {
        id: 'inv-' + Date.now(),
        name: newInvName.trim(),
        type: newInvType,
        value: round2(value),
        costBasis: round2(basis),
        isDeleted: false,
        entries: [{ id: newEntryId(), date: getTodayISO(), kind: 'value', amount: round2(value), note: 'Opening value' }]
      };
      setInvestments([...investments, newInv]);
      showNotification(`Investment account '${newInv.name}' added.`);
    }
    resetInvForm();
  };

  const openInvPanel = (inv, mode) => {
    setInvPanel({ id: inv.id, mode });
    setInvAmount(mode === 'value' ? String(inv.value) : '');
    setInvDate(getTodayISO());
  };

  const handleInvAction = () => {
    if (!invPanel) return;
    const inv = investments.find(i => i.id === invPanel.id);
    if (!inv) {
      setInvPanel(null);
      return;
    }
    const mode = invPanel.mode;
    const amount = parseFloat(invAmount);
    if (isNaN(amount) || amount < 0 || (mode !== 'value' && amount === 0)) {
      showNotification('Please enter a valid amount.');
      return;
    }
    if (mode === 'withdraw' && amount > Number(inv.value)) {
      showNotification('That withdrawal is larger than the current value.');
      return;
    }

    let value = Number(inv.value);
    let costBasis = Number(inv.costBasis);
    let kind = 'value';
    if (mode === 'value') {
      value = amount;
    } else if (mode === 'contribute') {
      value += amount;
      costBasis += amount;
      kind = 'contribution';
    } else {
      value -= amount;
      costBasis -= amount;
      kind = 'withdrawal';
    }

    const entry = { id: newEntryId(), date: invDate || getTodayISO(), kind, amount: round2(amount) };
    setInvestments(investments.map(i => (i.id === inv.id
      ? { ...i, value: round2(value), costBasis: round2(costBasis), entries: [entry, ...(i.entries || [])] }
      : i)));
    setInvPanel(null);
    setInvAmount('');
    showNotification(mode === 'value' ? 'Value updated.' : mode === 'contribute' ? 'Contribution recorded.' : 'Withdrawal recorded.');
  };

  const handleSoftDeleteInv = (id) => {
    const inv = investments.find(i => i.id === id);
    if (!inv) return;
    setInvestments(investments.map(i => (i.id === id ? { ...i, isDeleted: true } : i)));
    if (editingInvId === id) resetInvForm();
    if (invPanel && invPanel.id === id) setInvPanel(null);
    showNotification(`'${inv.name}' moved to Trash.`);
  };

  const restoreItem = (type, id) => {
    if (type === 'tx') {
      const one = transactions.find(t => t.id === id);
      const xfer = one && one.transferId;
      setTransactions(transactions.map(t => (t.id === id || (xfer && t.transferId === xfer) ? { ...t, isDeleted: false } : t)));
    } else if (type === 'env') {
      const env = envelopes.find(e => e.id === id);
      // If its group was deleted too, bring the group back so the envelope isn't invisible.
      if (env && !groups.includes(env.group)) setGroups(prev => [...prev, env.group]);
      setEnvelopes(envelopes.map(e => (e.id === id ? { ...e, isDeleted: false } : e)));
    } else if (type === 'acc') {
      setAccounts(accounts.map(a => (a.id === id ? { ...a, isDeleted: false } : a)));
    } else if (type === 'debt') {
      setDebts(debts.map(d => (d.id === id ? { ...d, isDeleted: false } : d)));
    } else if (type === 'inv') {
      setInvestments(investments.map(i => (i.id === id ? { ...i, isDeleted: false } : i)));
    }
    showNotification('Item restored.');
  };

  const permDeleteItem = (type, id) => {
    if (type === 'tx') {
      const one = transactions.find(t => t.id === id);
      const xfer = one && one.transferId;
      setTransactions(transactions.filter(t => t.id !== id && !(xfer && t.isDeleted && t.transferId === xfer)));
    }
    if (type === 'env') setEnvelopes(envelopes.filter(e => e.id !== id));
    if (type === 'acc') setAccounts(accounts.filter(a => a.id !== id));
    if (type === 'debt') setDebts(debts.filter(d => d.id !== id));
    if (type === 'inv') setInvestments(investments.filter(i => i.id !== id));
    showNotification('Item permanently deleted.');
  };

  const deletedTx = transactions.filter(t => t.isDeleted);
  const deletedEnv = envelopes.filter(e => e.isDeleted);
  const deletedAcc = accounts.filter(a => a.isDeleted);
  const deletedDebts = debts.filter(d => d.isDeleted);
  const deletedInv = investments.filter(i => i.isDeleted);
  const totalTrashCount = deletedTx.length + deletedEnv.length + deletedAcc.length + deletedDebts.length + deletedInv.length;

  // ----- Trash bulk actions -----
  const trashKey = (type, id) => `${type}:${id}`;
  const allTrashKeys = [
    ...deletedTx.map(t => trashKey('tx', t.id)),
    ...deletedEnv.map(e => trashKey('env', e.id)),
    ...deletedAcc.map(a => trashKey('acc', a.id)),
    ...deletedInv.map(i => trashKey('inv', i.id)),
    ...deletedDebts.map(d => trashKey('debt', d.id))
  ];
  // Ignore selections for items that have since left the trash (restored or deleted one by one)
  const selectedTrashKeys = trashSelected.filter(k => allTrashKeys.includes(k));
  const allTrashSelected = allTrashKeys.length > 0 && selectedTrashKeys.length === allTrashKeys.length;
  const trashConfirmCount = trashConfirm === 'all' ? allTrashKeys.length : trashConfirm === 'selected' ? selectedTrashKeys.length : 0;

  const toggleTrashItem = (key) => {
    setTrashSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };
  const toggleTrashAll = () => {
    setTrashSelected(allTrashSelected ? [] : allTrashKeys);
  };

  // Permanently removes the given trash items. Ready to Assign was already adjusted when each item
  // was first deleted, so nothing else needs to change. Only items still in the trash are touched.
  const permDeleteMany = (keys) => {
    const idsOf = (type) => new Set(keys.filter(k => k.startsWith(type + ':')).map(k => k.slice(type.length + 1)));
    const txIds = idsOf('tx');
    const envIds = idsOf('env');
    const accIds = idsOf('acc');
    const invIds = idsOf('inv');
    const debtIds = idsOf('debt');
    if (txIds.size) {
      setTransactions(prev => {
        const xfers = new Set(prev.filter(t => t.isDeleted && txIds.has(t.id) && t.transferId).map(t => t.transferId));
        return prev.filter(t => !(t.isDeleted && (txIds.has(t.id) || (t.transferId && xfers.has(t.transferId)))));
      });
    }
    if (envIds.size) setEnvelopes(prev => prev.filter(e => !(e.isDeleted && envIds.has(e.id))));
    if (accIds.size) setAccounts(prev => prev.filter(a => !(a.isDeleted && accIds.has(a.id))));
    if (invIds.size) setInvestments(prev => prev.filter(i => !(i.isDeleted && invIds.has(i.id))));
    if (debtIds.size) setDebts(prev => prev.filter(d => !(d.isDeleted && debtIds.has(d.id))));
    setTrashSelected([]);
    setTrashConfirm(null);
    showNotification(`${keys.length} item${keys.length === 1 ? '' : 's'} permanently deleted.`);
  };

  // Build the import preview: parse every row, flag duplicates, and suggest envelopes.
  const importPreview = useMemo(() => {
    if (!importRows.length) return null;
    const dataRows = importHasHeader ? importRows.slice(1) : importRows;
    const col = (row, idx) => (idx === '' ? '' : (row[Number(idx)] ?? ''));

    const fmt = importDateFormat === 'auto'
      ? detectDateFormat(dataRows.slice(0, 300).map(r => col(r, importMap.date)))
      : importDateFormat;

    const liveTx = transactions.filter(t => !t.isDeleted);
    const liveEnv = envelopes.filter(e => !e.isDeleted);

    // Existing transactions in the target account, counted so identical repeats still import correctly.
    const existing = new Map();
    liveTx.filter(t => t.accountId === importAccountId).forEach(t => {
      const k = `${t.date}|${t.type}|${Math.round(Number(t.amount) * 100)}`;
      existing.set(k, (existing.get(k) || 0) + 1);
    });

    // Remember which envelope each payee was last filed under.
    const payeeHistory = new Map();
    liveTx.forEach(t => {
      const key = String(t.payee || '').trim().toLowerCase();
      if (t.type === 'expense' && t.envelopeId && key && !payeeHistory.has(key)) {
        payeeHistory.set(key, t.envelopeId);
      }
    });

    const rows = dataRows.map((row, i) => {
      const date = parseDate(col(row, importMap.date), fmt);
      const payeeRaw = String(col(row, importMap.payee)).trim();
      const notes = String(col(row, importMap.notes)).trim();

      let signed = NaN;
      if (importMap.amount !== '') {
        signed = parseAmount(col(row, importMap.amount));
        if (importSign === 'positive-expense' && !isNaN(signed)) signed = -signed;
      } else if (importMap.debit !== '' || importMap.credit !== '') {
        const d = parseAmount(col(row, importMap.debit));
        const c = parseAmount(col(row, importMap.credit));
        const debit = isNaN(d) ? 0 : Math.abs(d);
        const credit = isNaN(c) ? 0 : Math.abs(c);
        signed = (debit === 0 && credit === 0) ? NaN : credit - debit;
      }

      const base = {
        index: i,
        date,
        payee: payeeRaw || '(no payee)',
        notes,
        type: signed > 0 ? 'income' : 'expense',
        amount: isNaN(signed) ? 0 : Math.round(Math.abs(signed) * 100) / 100,
        envelopeId: ''
      };

      if (!date) return { ...base, status: 'invalid', reason: 'Bad date' };
      if (isNaN(signed) || Math.round(Math.abs(signed) * 100) === 0) return { ...base, status: 'invalid', reason: 'Bad amount' };

      const key = `${date}|${base.type}|${Math.round(base.amount * 100)}`;
      const isDup = (existing.get(key) || 0) > 0;
      if (isDup) existing.set(key, existing.get(key) - 1);

      let envelopeId = '';
      if (base.type === 'expense') {
        const lower = payeeRaw.toLowerCase();
        const fromHistory = payeeHistory.get(lower);
        if (fromHistory && liveEnv.some(e => e.id === fromHistory)) {
          envelopeId = fromHistory;
        } else if (lower) {
          const byName = liveEnv.find(e => e.name.length >= 3 && lower.includes(e.name.toLowerCase()));
          if (byName) envelopeId = byName.id;
        }
      }

      return { ...base, envelopeId, status: isDup ? 'dup' : 'ok' };
    });

    return {
      rows,
      ok: rows.filter(r => r.status === 'ok').length,
      dup: rows.filter(r => r.status === 'dup').length,
      invalid: rows.filter(r => r.status === 'invalid').length
    };
  }, [importRows, importHasHeader, importMap, importDateFormat, importSign, importAccountId, transactions, envelopes]);

  const importToImportCount = importPreview
    ? importPreview.ok + (importSkipDupes ? 0 : importPreview.dup)
    : 0;

  const importColumnOptions = importRows.length
    ? (importHasHeader ? importRows[0] : importRows[0].map((_, i) => `Column ${i + 1}`))
    : [];

  const invStat = (label, value, color) => (
    <div>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: color || '#111827' }}>{value}</div>
    </div>
  );

  const mapSelect = (label, key) => (
    <label key={key} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: '#6b7280', gap: '2px' }}>
      {label}
      <select
        value={importMap[key]}
        onChange={e => setImportMap(m => ({ ...m, [key]: e.target.value }))}
        style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem', color: '#1f2937' }}
      >
        <option value="">— none —</option>
        {importColumnOptions.map((h, i) => (
          <option key={i} value={String(i)}>{String(h).trim() || `Column ${i + 1}`}</option>
        ))}
      </select>
    </label>
  );

  // ----- Net worth and age of money reports -----
  const renderOtherReport = (view, viewPills) => {
    const card = { backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
    const statBox = (label, value, color, sub) => (
      <div style={{ ...card, padding: '12px' }}>
        <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: color || '#1f2937', marginTop: '2px' }}>{value}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>{sub}</div>}
      </div>
    );
    const dated = activeTransactions.filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t.date || ''));
    const firstMonth = dated.reduce((m, t) => (t.date.slice(0, 7) < m ? t.date.slice(0, 7) : m), todayMonth);
    const lastMonth = dated.reduce((m, t) => (t.date.slice(0, 7) > m ? t.date.slice(0, 7) : m), todayMonth);
    const monthKeys = [];
    for (let k = firstMonth; k <= lastMonth && monthKeys.length < 600; k = addMonthKey(k, 1)) monthKeys.push(k);
    const shortLabel = (k) => `${monthLabel(k, true).slice(0, 3)} ${k.slice(2, 4)}`;

    if (view === 'incexp') {
      const real = dated.filter(t => !t.isTransfer && t.payee !== 'Reconciliation Adjustment');
      const months = monthKeys.slice(-12).map(k => {
        let inc = 0, exp = 0;
        real.forEach(t => { if (t.date.slice(0, 7) !== k) return; const a = Number(t.amount) || 0; if (t.type === 'income') inc += a; else exp += a; });
        return { k, label: shortLabel(k), inc: round2(inc), exp: round2(exp), net: round2(inc - exp) };
      });
      const totInc = round2(months.reduce((t, m) => t + m.inc, 0));
      const totExp = round2(months.reduce((t, m) => t + m.exp, 0));
      const net = round2(totInc - totExp);
      const rate = totInc > 0 ? Math.round((net / totInc) * 100) : null;
      const maxV = Math.max(1, ...months.flatMap(m => [m.inc, m.exp]));
      const W = 640, H = 220, padL = 8, padB = 28, bw = Math.max(6, Math.min(22, (W - padL) / Math.max(1, months.length) / 2.6));
      const slot = (W - padL) / Math.max(1, months.length);
      const y = (v) => H - padB - (v / maxV) * (H - padB - 14);
      return (
        <div data-testid="incexp-report" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {viewPills}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {statBox('Income', formatMoney(totInc), '#059669', `last ${months.length} month${months.length === 1 ? '' : 's'}`)}
            {statBox('Spending', formatMoney(totExp), '#b45309')}
            {statBox(net >= 0 ? 'Saved' : 'Overspent', formatMoney(Math.abs(net)), net >= 0 ? '#059669' : '#dc2626', rate === null ? null : `${rate}% of income`)}
          </div>
          <div style={card}>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', color: '#6b7280', marginBottom: '6px' }}>
              <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#2f9e6e', borderRadius: '2px', marginRight: '4px' }} />Income</span>
              <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#e08a3c', borderRadius: '2px', marginRight: '4px' }} />Spending</span>
            </div>
            <svg role="img" aria-label="Income and spending by month" viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
              <line x1={padL} x2={W} y1={H - padB} y2={H - padB} stroke="#e5e7eb" />
              {months.map((m, i) => {
                const cx = padL + slot * i + slot / 2;
                return (
                  <g key={m.k}>
                    <rect x={cx - bw - 1} y={y(m.inc)} width={bw} height={H - padB - y(m.inc)} fill="#2f9e6e" rx="2"><title>{`${m.label} income ${formatMoney(m.inc)}`}</title></rect>
                    <rect x={cx + 1} y={y(m.exp)} width={bw} height={H - padB - y(m.exp)} fill="#e08a3c" rx="2"><title>{`${m.label} spending ${formatMoney(m.exp)}`}</title></rect>
                    {(months.length <= 8 || i % 2 === 0) && <text x={cx} y={H - 10} textAnchor="middle" fontSize="11" fill="#6b7280">{m.label}</text>}
                  </g>
                );
              })}
            </svg>
          </div>
          <div style={{ ...card, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ textAlign: 'right', color: '#6b7280', fontSize: '0.72rem', textTransform: 'uppercase' }}><th style={{ textAlign: 'left', padding: '4px 0' }}>Month</th><th>Income</th><th>Spending</th><th>Net</th></tr></thead>
              <tbody>
                {[...months].reverse().map(m => (
                  <tr key={m.k} style={{ textAlign: 'right', borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ textAlign: 'left', padding: '8px 0' }}>{monthLabel(m.k)}</td>
                    <td>{formatMoney(m.inc)}</td><td>{formatMoney(m.exp)}</td>
                    <td style={{ fontWeight: 600, color: m.net >= 0 ? '#059669' : '#dc2626' }}>{formatMoney(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (view === 'networth') {
      const accs = activeAccounts;
      const monthSums = new Map(); // accountId -> Map(month -> net change)
      dated.forEach(t => {
        const m = monthSums.get(t.accountId) || new Map();
        const k = t.date.slice(0, 7);
        m.set(k, (m.get(k) || 0) + (t.type === 'income' ? 1 : -1) * Number(t.amount));
        monthSums.set(t.accountId, m);
      });
      const running = new Map(accs.map(a => [a.id, Number(a.initialBalance) || 0]));
      const series = monthKeys.map(k => {
        let total = 0;
        accs.forEach(a => {
          const m = monthSums.get(a.id);
          running.set(a.id, running.get(a.id) + ((m && m.get(k)) || 0));
          total += running.get(a.id);
        });
        return { label: shortLabel(k), value: round2(total), key: k };
      });
      const cash = accs.filter(a => !isCreditCard(a)).reduce((t, a) => t + getAccountBalance(a.id), 0);
      const cards = accs.filter(isCreditCard).reduce((t, a) => t + getAccountBalance(a.id), 0);
      const invValue = activeInvestments.reduce((t, i) => t + (Number(i.value) || 0), 0);
      const otherDebt = debts.filter(d => !d.isDeleted).reduce((t, d) => t + (Number(d.balance) || 0), 0);
      const nowTotal = round2(cash + cards + invValue - otherDebt);
      const first = series[0] ? series[0].value : 0;
      const last = series.length ? series[series.length - 1].value : 0;
      return (
        <div data-testid="networth-report" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {viewPills}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {statBox('Net worth', formatMoney(nowTotal), nowTotal < 0 ? '#dc2626' : '#1f2937', 'Everything below, today')}
            {statBox('Cash & savings', formatMoney(cash), '#059669')}
            {statBox('Credit cards', formatMoney(cards), cards < 0 ? '#dc2626' : '#1f2937')}
            {statBox('Investments', formatMoney(invValue), '#1f2937', 'Current value')}
            {statBox('Other debts', formatMoney(-otherDebt), otherDebt > 0 ? '#dc2626' : '#1f2937', 'From the Debts tab')}
          </div>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Accounts over time</h3>
              {series.length > 1 && (
                <span style={{ fontSize: '0.8rem', color: last - first >= 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                  {last - first >= 0 ? '▲' : '▼'} {formatMoney(Math.abs(last - first))} since {series[0].label}
                </span>
              )}
            </div>
            <LineChart points={series} ariaLabel="Account balances over time" />
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '4px' }}>
              Month-end total of all your accounts (credit card debt counts against you). Investments and Debts-tab balances are shown only as they are today, because their history isn't tracked.
            </div>
          </div>
        </div>
      );
    }

    // ---- Age of money: how old the dollars you spend are (first in, first out) ----
    const cashIds = new Set(activeAccounts.filter(a => !isCreditCard(a)).map(a => a.id));
    const cardIds = new Set(activeAccounts.filter(isCreditCard).map(a => a.id));
    const toMs = (d) => new Date(d + 'T00:00:00').getTime();
    const events = [];
    const openingTotal = activeAccounts.filter(a => !isCreditCard(a)).reduce((t, a) => t + Math.max(0, Number(a.initialBalance) || 0), 0);
    if (openingTotal > 0 && dated.length) events.push({ date: dated.reduce((m, t) => (t.date < m ? t.date : m), dated[0].date), kind: 'in', amount: openingTotal, order: 0 });
    dated.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (!cashIds.has(t.accountId)) return;
      if (t.type === 'income' && !t.isTransfer && amt > 0) events.push({ date: t.date, kind: 'in', amount: amt, order: 1 });
      else if (t.type === 'expense' && !t.isTransfer) events.push(amt >= 0 ? { date: t.date, kind: 'out', amount: amt, order: 2 } : { date: t.date, kind: 'in', amount: -amt, order: 1 });
      else if (t.type === 'expense' && t.isTransfer && cardIds.has(t.transferAccountId)) events.push({ date: t.date, kind: 'out', amount: amt, order: 2 }); // paying a card
    });
    events.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
    const queue = [];
    const ages = []; // [{ date, age }]
    events.forEach(ev => {
      if (ev.kind === 'in') { queue.push({ ms: toMs(ev.date), left: ev.amount }); return; }
      let need = ev.amount, taken = 0, weighted = 0;
      while (need > 0.004 && queue.length) {
        const head = queue[0];
        const use = Math.min(head.left, need);
        taken += use; weighted += use * head.ms; need -= use; head.left -= use;
        if (head.left <= 0.004) queue.shift();
      }
      if (taken > 0.004) ages.push({ date: ev.date, age: Math.max(0, (toMs(ev.date) - weighted / taken) / 86400000) });
    });
    const avgLast = (list) => { const l = list.slice(-10); return l.length ? l.reduce((t, a) => t + a.age, 0) / l.length : null; };
    const current = avgLast(ages);
    const ageSeries = monthKeys.map(k => {
      const upTo = ages.filter(a => a.date.slice(0, 7) <= k);
      const v = avgLast(upTo);
      return v === null ? null : { label: shortLabel(k), value: Math.round(v) };
    }).filter(Boolean);
    return (
      <div data-testid="age-report" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {viewPills}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {statBox('Age of money', current === null ? '—' : `${Math.round(current)} day${Math.round(current) === 1 ? '' : 's'}`, '#1f2937', current === null ? 'Not enough spending yet' : 'Average of your last 10 outflows')}
          {statBox('Outflows counted', String(ages.length), '#1f2937', 'Spending from cash accounts and card payments')}
        </div>
        <div style={card}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>Month by month</h3>
          {ageSeries.length ? <LineChart points={ageSeries} ariaLabel="Age of money by month" format={(v) => `${Math.round(v)}d`} color="#7c3aed" /> : <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Add some income and spending to see this.</p>}
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '4px' }}>
            Each time you spend, the money comes from your oldest income first. The age is how many days that money sat before you spent it. The higher it is, the more of a buffer you have between paychecks and bills.
          </div>
        </div>
      </div>
    );
  };

  // ----- Shell pieces (YNAB-style sidebar, month bar, Ready to Assign pill) -----
  const SIDE_BG = '#1f2f4f';
  const sideItem = (key, active, onClick, label, right, opts = {}) => (
    <button
      key={key}
      onClick={onClick}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: isMobile ? '12px 12px' : (opts.small ? '6px 10px' : '8px 10px'), borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: opts.small ? '0.84rem' : '0.9rem', fontWeight: active ? 600 : 500, backgroundColor: active ? 'rgba(255,255,255,0.14)' : 'transparent', color: active ? 'white' : '#c9d3e6' }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {right}
    </button>
  );
  const sideHeading = (label, total) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 10px 4px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: '#8fa0c0' }}>
      <span>{label}</span><span>{formatMoney(total)}</span>
    </div>
  );
  const sideToggleHeading = (key, label, total) => (
    <button onClick={() => setSideCollapsed(c => ({ ...c, [key]: !c[key] }))} aria-expanded={!sideCollapsed[key]} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '14px 10px 4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: '#8fa0c0' }}>
      <span>{sideCollapsed[key] ? '▸' : '▾'} {label}</span><span>{formatMoney(total)}</span>
    </button>
  );
  const moreTabs = ['scheduled', 'payees', 'debts', 'investments', 'accounts', 'import', 'trash', 'new'];
  const sideBalance = (n) => (
    <span style={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums', color: n < -0.004 ? '#ffa8a1' : '#e6ecf7', flexShrink: 0 }}>{formatMoney(n)}</span>
  );
  const sideAccounts = activeAccounts.filter(a => !a.isHidden).map(a => ({ acc: a, bal: getAccountBalance(a.id) }));
  const sideCash = sideAccounts.filter(x => !isCreditCard(x.acc));
  const sideCredit = sideAccounts.filter(x => isCreditCard(x.acc));
  const sumBal = (list) => list.reduce((t, x) => t + x.bal, 0);
  const openAccountRegister = (accId) => { setTxFilterAccount(accId); if (!editingTxId) setTxAccountId(accId); openTab('transactions'); };

  const rtaTone = rtaShown < -0.004 ? { bg: '#fde2e0', fg: '#b42318', sub: 'Over-assigned' }
    : rtaShown < 0.004 ? { bg: '#e9ecf1', fg: '#4b5563', sub: 'Ready to Assign' }
    : { bg: '#cdeed6', fg: '#17603a', sub: 'Ready to Assign' };
  const rtaPill = (
    <div data-testid="rta-pill" onClick={isMobile ? () => setShowRtaInfo(v => !v) : undefined} style={{ cursor: isMobile ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-end', backgroundColor: rtaTone.bg, color: rtaTone.fg, padding: isMobile ? '8px 14px' : '6px 14px', borderRadius: '10px', minWidth: '110px', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
      <span style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.15 }}>{formatMoney(rtaShown)}</span>
      <span style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {rtaTone.sub}{budgetMonth !== todayMonth ? ` · ${monthLabel(budgetMonth, true)}` : ''}
      </span>
    </div>
  );
  const monthNav = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button
        disabled={budgetMonth <= budgetEarliest}
        aria-label="Previous month"
        onClick={() => setBudgetMonth(addMonthKey(budgetMonth, -1))}
        style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', color: budgetMonth <= budgetEarliest ? '#cbd2dc' : '#1f2937', cursor: budgetMonth <= budgetEarliest ? 'not-allowed' : 'pointer', fontSize: '1.3rem', lineHeight: 1 }}
      >
        ‹
      </button>
      <div style={{ minWidth: '130px', textAlign: 'center', fontWeight: 700, fontSize: '1.05rem' }}>{monthLabel(budgetMonth)}</div>
      <button
        disabled={budgetMonth >= budgetLatest}
        aria-label="Next month"
        onClick={() => setBudgetMonth(addMonthKey(budgetMonth, 1))}
        style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', color: budgetMonth >= budgetLatest ? '#cbd2dc' : '#1f2937', cursor: budgetMonth >= budgetLatest ? 'not-allowed' : 'pointer', fontSize: '1.3rem', lineHeight: 1 }}
      >
        ›
      </button>
      {budgetMonth !== todayMonth && (
        <button
          onClick={() => setBudgetMonth(todayMonth)}
          style={{ background: 'none', border: 'none', color: '#2f6fb3', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          This month
        </button>
      )}
    </div>
  );
  const undoBtnStyle = (enabled) => ({ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #e3e6eb', backgroundColor: 'white', color: enabled ? '#1f2937' : '#cbd2dc', cursor: enabled ? 'pointer' : 'not-allowed', fontSize: '1.05rem', lineHeight: 1 });
  const undoRedoButtons = (
    <div style={{ display: 'flex', gap: '4px' }}>
      <button onClick={undo} disabled={!histRef.current.undo.length} aria-label="Undo" title="Undo (Ctrl+Z)" style={undoBtnStyle(!!histRef.current.undo.length)}>↶</button>
      <button onClick={redo} disabled={!histRef.current.redo.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" style={undoBtnStyle(!!histRef.current.redo.length)}>↷</button>
    </div>
  );
  const txFormCard = (
          <div style={isMobile ? {} : { backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {!isMobile && <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>{editingTxId ? 'Edit Transaction' : '+ Add Transaction'}</h3>}
            {isMobile && (
              <div role="tablist" aria-label="Transaction type" style={{ display: 'flex', backgroundColor: '#f3f4f6', borderRadius: '10px', padding: '3px', marginBottom: '12px' }}>
                {[['expense', 'Expense'], ['income', 'Income'], ['transfer', 'Transfer']].map(([k, l]) => (
                  <button key={k} type="button" disabled={!!editingTxId && (txType === 'transfer') !== (k === 'transfer')} onClick={() => { setTxType(k); setTxSplitLines(null); }} style={{ flex: 1, border: 'none', borderRadius: '8px', padding: '9px 0', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', backgroundColor: txType === k ? 'white' : 'transparent', color: txType === k ? '#111827' : '#6b7280', boxShadow: txType === k ? '0 1px 2px rgba(0,0,0,0.15)' : 'none', opacity: (!!editingTxId && (txType === 'transfer') !== (k === 'transfer')) ? 0.4 : 1 }}>{l}</button>
                ))}
              </div>
            )}
            <datalist id="payee-suggestions">
              {payeeMemory.slice(0, 200).map(pm => <option key={pm.name} value={pm.name} />)}
            </datalist>
            <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr) minmax(0,1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {txType === 'transfer' ? (
                <div style={{ gridColumn: 'span 2', fontSize: '0.8rem', color: '#6b7280', alignSelf: 'center' }}>
                  Moves money between your accounts. It isn't income or spending, so budgets and reports don't change.
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Payee"
                  list="payee-suggestions"
                  autoComplete="off"
                  value={txPayee}
                  onChange={e => handlePayeeChange(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', gridColumn: 'span 2' }}
                />
              )}
              <SplitAmountInput
                value={txAmount}
                onChange={setTxAmount}
                ariaLabel="Amount"
                placeholder="Amount ($)"
                width="100%"
                wrapStyle={isMobile ? { alignItems: 'stretch', order: -1, gridColumn: '1 / -1' } : { alignItems: 'stretch' }}
                inputStyle={{ padding: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
              {!isMobile && (
              <select
                value={txType}
                onChange={e => { setTxType(e.target.value); setTxSplitLines(null); }}
                aria-label="Type"
                disabled={!!editingTxId && txType === 'transfer'}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>
              )}
              <select
                value={txAccountId}
                onChange={e => setTxAccountId(e.target.value)}
                aria-label={txType === 'transfer' ? 'From account' : 'Account'}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', gridColumn: 'span 2' }}
              >
                <option value="">{txType === 'transfer' ? 'From account' : 'Select Account'}</option>
                {accountChoices(txAccountId).map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
              {txType === 'transfer' && (
                <select
                  value={txToAccountId}
                  onChange={e => setTxToAccountId(e.target.value)}
                  aria-label="To account"
                  style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', gridColumn: 'span 2' }}
                >
                  <option value="">To account</option>
                  {accountChoices(txToAccountId).filter(acc => acc.id !== txAccountId).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              )}
              {txType === 'income' && !editingTxId && txSplitLines && renderFormSplit(txSplitLines, setTxSplitLines, txAmount, true)}
              {txType === 'income' && !editingTxId && !isCreditCard(accounts.find(a => a.id === txAccountId)) && (
                <button
                  type="button"
                  onClick={() => (txSplitLines ? setTxSplitLines(null) : setTxSplitLines([{ envelopeId: '', amount: '' }]))}
                  style={{ gridColumn: '1 / -1', justifySelf: 'start', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: '0.85rem', fontWeight: '600' }}
                >
                  {txSplitLines ? 'Keep it all in Ready to Assign' : 'Send some to envelopes'}
                </button>
              )}
              {!isMobile && txType === 'expense' && editingTxId && isSplitTx(transactions.find(t => t.id === editingTxId)) && (
                <div style={{ gridColumn: 'span 2', fontSize: '0.8rem', color: '#6b7280', padding: '6px 0' }}>
                  Split across several envelopes. Use the Split button in the list to change it. Changing the amount clears the split.
                </div>
              )}
              {txType === 'expense' && !editingTxId && txSplitLines && renderFormSplit(txSplitLines, setTxSplitLines, txAmount)}
              {txType === 'expense' && !editingTxId && (
                <button
                  type="button"
                  onClick={() => {
                    if (txSplitLines) { setTxSplitLines(null); return; }
                    setTxSplitLines([{ envelopeId: txEnvelopeId, amount: txAmount }, { envelopeId: '', amount: '' }]);
                  }}
                  style={{ gridColumn: '1 / -1', justifySelf: 'start', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: '0.85rem', fontWeight: '600' }}
                >
                  {txSplitLines ? 'Use a single envelope instead' : 'Split across envelopes'}
                </button>
              )}
              {txType === 'expense' && !txSplitLines && !(editingTxId && isSplitTx(transactions.find(t => t.id === editingTxId))) && (
                <select
                  value={txEnvelopeId}
                  onChange={e => setTxEnvelopeId(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', gridColumn: 'span 2' }}
                >
                  <option value="">Select Envelope (Optional)</option>
                  {activeEnvelopes.filter(env => !env.isHidden || env.id === txEnvelopeId).map(env => (
                    <option key={env.id} value={env.id}>{env.group} &gt; {env.name}{env.isHidden ? ' (hidden)' : ''}</option>
                  ))}
                </select>
              )}
              {isMobile && editingTxId && (() => {
                const et = transactions.find(t => t.id === editingTxId);
                if (!et || et.isTransfer || (et.type === 'income' && !countsTowardRTA(et))) return null;
                const inc = et.type === 'income';
                const open = splitTxId === et.id;
                const label = inc ? (incomeAllocs(et).length ? 'Edit envelope split' : 'Send some to envelopes') : (isSplitTx(et) ? 'Edit split' : 'Split across envelopes');
                return (
                  <div data-testid="sheet-split" style={{ gridColumn: '1 / -1' }}>
                    {!open && (
                      <>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '6px' }}>
                          The amount above is the whole {inc ? 'deposit' : 'purchase'}. To divide it between envelopes, use this button instead of changing the amount.
                        </div>
                        <button type="button" onClick={() => openSplit(et)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>{label}</button>
                      </>
                    )}
                    {open && renderSplitEditor(et)}
                  </div>
                );
              })()}
              <input
                type="date"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <input
                type="text"
                placeholder="Notes"
                value={txNotes}
                onChange={e => setTxNotes(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: isMobile ? '13px' : '10px', borderRadius: isMobile ? '10px' : '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                  {editingTxId ? 'Update Transaction' : 'Save Transaction'}
                </button>
                {editingTxId && isMobile && (
                  <button
                    type="button"
                    onClick={() => { const id = editingTxId; setTxSheetOpen(false); cancelEditTx(); handleSoftDeleteTransaction(id); }}
                    style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', padding: '12px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
                  >
                    Delete
                  </button>
                )}
                {editingTxId && !isMobile && (
                  <button
                    type="button"
                    onClick={cancelEditTx}
                    style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
  );
  const MOBILE_TABS = [['budget', 'Budget', '◔'], ['accounts', 'Accounts', '▦'], ['transactions', 'Transactions', '☰'], ['reports', 'Reports', '◭']];

  if (session === undefined) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#6b7280', backgroundColor: '#f4f5f7' }}>Loading…</div>;
  }
  if (!session) return <AuthScreen />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937', backgroundColor: '#f4f5f7' }}>

      {/* Mobile overlay behind the drawer */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 40 }}
        />
      )}

      {/* Side menu */}
      <aside
        style={{
          width: '240px',
          flexShrink: 0,
          boxSizing: 'border-box',
          backgroundColor: SIDE_BG,
          color: '#c9d3e6',
          padding: '16px 10px',
          display: !isMobile && !sidebarOpen ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflowY: 'auto',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          zIndex: 50,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.2s ease'
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white', padding: '4px 10px 14px 10px' }}>
          Envelope Budgeting
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {sideItem('budget', activeTab === 'budget', () => openTab('budget'), 'Budget')}
          {sideItem('reports', activeTab === 'reports', () => openTab('reports'), 'Reports')}
          {sideItem('transactions', activeTab === 'transactions' && !txFilterAccount, () => { setTxFilterAccount(''); openTab('transactions'); }, 'Transactions')}
        </nav>

        {sideCash.length > 0 && sideToggleHeading('cash', 'CASH', sumBal(sideCash))}
        {!sideCollapsed.cash && sideCash.map(x => sideItem('acc-' + x.acc.id, activeTab === 'transactions' && txFilterAccount === x.acc.id, () => openAccountRegister(x.acc.id), x.acc.name, sideBalance(x.bal), { small: true }))}
        {sideCredit.length > 0 && sideToggleHeading('credit', 'CREDIT', sumBal(sideCredit))}
        {!sideCollapsed.credit && sideCredit.map(x => sideItem('acc-' + x.acc.id, activeTab === 'transactions' && txFilterAccount === x.acc.id, () => openAccountRegister(x.acc.id), x.acc.name, sideBalance(x.bal), { small: true }))}
        {activeInvestments.length > 0 && sideHeading('TRACKING', invTotals.value)}
        {activeInvestments.length > 0 && sideItem('investments', activeTab === 'investments', () => openTab('investments'), 'Investments', sideBalance(invTotals.value), { small: true })}

        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.12)', margin: '14px 0 6px' }} />
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button onClick={() => setSideMoreOpen(o => !o)} aria-expanded={sideMoreOpen || moreTabs.includes(activeTab)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: isMobile ? '12px' : '8px 10px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#cfe0f7', fontSize: '0.85rem', fontWeight: 600 }}><span>{(sideMoreOpen || moreTabs.includes(activeTab)) ? '▾' : '▸'} More</span>{!(sideMoreOpen || moreTabs.includes(activeTab)) && dueSchedules.length > 0 && <span style={{ fontSize: '0.7rem', backgroundColor: '#d97706', color: 'white', borderRadius: '10px', padding: '1px 7px' }}>{dueSchedules.length} due</span>}</button>
          {(sideMoreOpen || moreTabs.includes(activeTab)) && ['scheduled', 'payees', 'debts', 'investments', 'accounts', 'import', 'trash', 'new'].filter(tab => tab !== 'investments' || activeInvestments.length === 0).map(tab =>
            sideItem(tab, activeTab === tab, () => { if (tab === 'accounts') setManageAccounts(true); openTab(tab); }, tab === 'accounts' ? 'Manage accounts' : tab === 'new' ? '+ New envelope or group' : NAV_LABELS[tab],
              tab === 'scheduled' && dueSchedules.length > 0
                ? <span style={{ fontSize: '0.7rem', backgroundColor: '#d97706', color: 'white', borderRadius: '10px', padding: '1px 7px' }}>{dueSchedules.length} due</span>
                : tab === 'trash' && totalTrashCount > 0
                ? <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.18)', color: 'white', borderRadius: '10px', padding: '1px 7px' }}>{totalTrashCount}</span>
                : null,
              { small: true })
          )}
          {(sideMoreOpen || moreTabs.includes(activeTab)) && (() => {
            const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
            const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
            if (standalone || (!installEvt && !ios)) return null;
            return sideItem('install', false, async () => {
              if (installEvt) { try { installEvt.prompt(); await installEvt.userChoice; } catch (err) { /* ignore */ } setInstallEvt(null); }
              else showNotification('On iPhone: tap the Share button, then "Add to Home Screen".');
            }, 'Install app', null, { small: true });
          })()}
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px 10px 0 10px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div data-testid="signed-in-as" style={{ fontSize: '0.72rem', color: '#8fa0c0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>
            Signed in as {session && session.user ? session.user.email : ''}
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ width: '100%', backgroundColor: 'transparent', color: '#cfe0f7', border: '1px solid rgba(255,255,255,0.28)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ width: '100%', maxWidth: '1040px', margin: '0 auto', padding: isMobile ? '10px 10px 96px' : '16px 20px', boxSizing: 'border-box' }}>

      {/* Top bar */}
      <header style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '10px', minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
          {!isMobile && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle menu"
              style={{ backgroundColor: 'white', border: '1px solid #e3e6eb', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem', color: '#374151' }}
            >
              ☰
            </button>
          )}
          {undoRedoButtons}
          {activeTab === 'budget'
            ? monthNav
            : <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>{TAB_LABELS[activeTab]}{activeTab === 'transactions' && txFilterAccount ? ` · ${(accounts.find(a => a.id === txFilterAccount) || {}).name || ''}` : ''}</h1>}
        </div>
        {(activeTab === 'budget' || !isMobile) && rtaPill}
      </header>

      {/* Notification Toast */}
      {notification && (
        <div style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
          {notification}
        </div>
      )}

      {/* BUDGET TAB */}
      {activeTab === 'budget' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Month summary */}
          {(!isMobile || showRtaInfo) && <div style={{ backgroundColor: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e3e6eb' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleCopyLastMonth}
                style={{ backgroundColor: 'white', color: '#2f6fb3', border: '1px solid #c9dcf0', padding: '5px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                Copy last month's assignments
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              Money in {formatMoney(budgetView.inflow)} − assigned {formatMoney(budgetView.budgetedThrough)}
              {budgetView.penalties > 0 ? ` − overspending from earlier months ${formatMoney(budgetView.penalties)}` : ''}
              {' = '}<strong style={{ color: rtaShown < 0 ? '#dc2626' : '#1e3a8a' }}>{formatMoney(rtaShown)}</strong> Ready to Assign
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px', display: isMobile ? 'none' : 'block' }}>
              What's left in an envelope carries into the next month. Overspending resets the envelope to $0 and comes out of the next month's Ready to Assign.
            </div>
          </div>}

          {groups.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => openTab('new')}
                style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                + Group / Envelope
              </button>
            </div>
          )}

          {groups.length === 0 && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              No budget groups or envelopes yet.{' '}
              <button
                onClick={() => openTab('new')}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
              >
                Add a group to get started
              </button>
            </div>
          )}

          {hiddenEnvelopeCount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#4b5563', cursor: 'pointer' }}>
              <input type="checkbox" checked={showHiddenEnvelopes} onChange={e => setShowHiddenEnvelopes(e.target.checked)} />
              Show hidden envelopes ({hiddenEnvelopeCount})
            </label>
          )}

          {/* Filters and Auto-Assign */}
          {groups.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', maxWidth: '100%' }}>
                {[['all', 'All'], ['underfunded', 'Underfunded'], ['overspent', 'Overspent'], ['available', 'Available']].map(([key, label]) => {
                  const n = key === 'all' ? null : envCounts[key];
                  const active = envFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setEnvFilter(key)}
                      aria-pressed={active}
                      style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '5px 12px', borderRadius: '999px', border: '1px solid ' + (active ? '#2f6fb3' : '#d5dae2'), backgroundColor: active ? '#2f6fb3' : 'white', color: active ? 'white' : '#4b5563', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {label}{n ? ` ${n}` : ''}
                    </button>
                  );
                })}
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setAutoMenuOpen(o => !o)}
                  aria-haspopup="menu"
                  aria-expanded={autoMenuOpen}
                  style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #c9dcf0', backgroundColor: 'white', color: '#2f6fb3', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Auto-Assign ▾
                </button>
                {autoMenuOpen && (
                  <>
                    <div onClick={() => setAutoMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
                    <div role="menu" data-testid="auto-menu" style={{ position: 'absolute', right: 0, top: '34px', width: '270px', backgroundColor: 'white', border: '1px solid #e3e6eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 10, padding: '4px' }}>
                      {AUTO_OPTIONS.map(([key, label, hint]) => (
                        <button
                          key={key}
                          role="menuitem"
                          onClick={() => runAutoAssign(key)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f2937' }}>{label}</div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{hint}</div>
                        </button>
                      ))}
                      <div style={{ fontSize: '0.68rem', color: '#9ca3af', padding: '4px 10px 6px' }}>Uses Ready to Assign only and never lowers an amount (except Reset).</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Column headings */}
          {!isMobile && groups.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 118px 104px 124px', columnGap: '10px', padding: '0 14px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', color: '#6b7280', marginBottom: '-8px' }}>
              <div>CATEGORY</div><div style={{ textAlign: 'right' }}>ASSIGNED</div><div style={{ textAlign: 'right' }}>ACTIVITY</div><div style={{ textAlign: 'right' }}>AVAILABLE</div>
            </div>
          )}

          {/* Group Categories */}
          {groups.map(groupName => {
            const groupEnvelopes = activeEnvelopes.filter(e => e.group === groupName && (showHiddenEnvelopes || !e.isHidden) && passesEnvFilter(e));
            const groupHasHidden = activeEnvelopes.some(e => e.group === groupName && e.isHidden);
            if (envFilter !== 'all' && groupEnvelopes.length === 0) return null; // no matches in this group
            const isCollapsed = collapsedGroups[groupName] || dragState !== null; // everything folds while dragging
            const groupTotals = groupEnvelopes.reduce((t, e) => {
              const r = envRow(e);
              return { assigned: t.assigned + r.budgeted + r.income, activity: t.activity + r.spent, available: t.available + r.end };
            }, { assigned: 0, activity: 0, available: 0 });

            // Visual position while a group is being dragged (the real order is committed on drop)
            let dragStyle = {};
            const dragInfo = dragRef.current;
            if (dragState && !dragState.measuring && dragInfo && dragInfo.phase === 'drag') {
              if (groupName === dragState.name) {
                dragStyle = {
                  transform: `translateY(${dragState.dy}px)`,
                  position: 'relative',
                  zIndex: 20,
                  boxShadow: '0 10px 24px rgba(0,0,0,0.2)',
                  cursor: 'grabbing'
                };
              } else {
                const idx = dragInfo.names.indexOf(groupName);
                const step = dragInfo.rects[dragInfo.from].height + dragInfo.gap;
                let shift = 0;
                if (dragInfo.from < dragState.target && idx > dragInfo.from && idx <= dragState.target) shift = -step;
                else if (dragInfo.from > dragState.target && idx >= dragState.target && idx < dragInfo.from) shift = step;
                dragStyle = { transform: `translateY(${shift}px)`, transition: 'transform 0.15s ease' };
              }
            }

            return (
              <div
                key={groupName}
                ref={el => { groupRefs.current[groupName] = el; }}
                style={{ backgroundColor: 'white', borderRadius: '8px', padding: 0, border: '1px solid #e3e6eb', overflow: 'hidden', ...dragStyle }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr) auto' : 'minmax(0,1fr) 118px 104px 124px', alignItems: 'center', columnGap: '10px', backgroundColor: '#f1f3f6', padding: isMobile ? '8px 12px' : '7px 14px', borderBottom: '1px solid #e3e6eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: '4px' }}>
                  {groups.length > 1 && (
                    <button
                      onPointerDown={e => startGroupDrag(e, groupName)}
                      onContextMenu={e => e.preventDefault()}
                      title="Hold and drag to reorder"
                      aria-label={`Drag to reorder ${groupName}`}
                      style={{ background: 'none', border: 'none', cursor: 'grab', touchAction: 'none', color: '#9ca3af', fontSize: '1.1rem', padding: '0 10px 0 0', lineHeight: 1, userSelect: 'none', WebkitUserSelect: 'none' }}
                    >
                      ⋮⋮
                    </button>
                  )}
                  <button
                    onClick={() => toggleGroupCollapse(groupName)}
                    style={{ background: 'none', border: 'none', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#1f2937', padding: 0, textAlign: 'left' }}
                  >
                    <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{isCollapsed ? '▶' : '▼'}</span> {groupName}
                  </button>
                  <button
                    onClick={() => handleRemoveGroup(groupName)}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.72rem', marginLeft: '8px' }}
                  >
                    Delete Group
                  </button>
                  </div>
                  {!isMobile && <div style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: '#4b5563' }}>{formatMoney(groupTotals.assigned)}</div>}
                  {!isMobile && <div style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: '#4b5563' }}>{formatMoney(groupTotals.activity)}</div>}
                  <div style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: groupTotals.available < -0.004 ? '#b42318' : '#4b5563' }}>{formatMoney(groupTotals.available)}</div>
                </div>

                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {groupEnvelopes.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af', padding: '10px 14px' }}>{groupHasHidden ? 'All envelopes in this group are hidden.' : 'No envelopes in this group.'}</div>
                    ) : (
                      groupEnvelopes.map(env => {
                        const row = envRow(env);
                        const spent = row.spent;
                        const remaining = row.end;
                        const progress = getTargetProgress(env, row);

                        const selected = selectedEnvId === env.id;
                        return (
                          <div key={env.id} data-testid="env-row" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr) auto' : 'minmax(0,1fr) 118px 104px 124px', alignItems: 'center', columnGap: '10px', rowGap: '8px', padding: isMobile ? '10px 12px' : '8px 14px', backgroundColor: selected ? '#eef4fb' : env.isHidden ? '#f3f4f6' : 'white', opacity: env.isHidden ? 0.75 : 1, borderBottom: '1px solid #eef0f3' }}>
                            <div onClick={() => setSelectedEnvId(selected ? null : env.id)} style={{ minWidth: 0, cursor: 'pointer' }}>
                              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                                {env.name}
                                {env.isHidden && <span data-testid="hidden-badge" style={{ marginLeft: '8px', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', backgroundColor: '#e5e7eb', borderRadius: '999px', padding: '1px 8px' }}>hidden</span>}
                              </div>
                              {env.goalType !== 'none' && (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {getScheduleText(env)} {env.targetAmount > 0 ? `(Target: $${Number(env.targetAmount).toFixed(2)})` : ''} {env.targetDate ? `by ${formatDate(env.targetDate, 'us')}` : ''}
                                </div>
                              )}
                              {progress && (
                                <div style={{ marginTop: '6px' }}>
                                  <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progress.pct}%`, height: '100%', backgroundColor: progress.left === 0 ? '#059669' : '#3b82f6' }} />
                                  </div>
                                  <div style={{ fontSize: '0.75rem', marginTop: '3px', fontWeight: '600', color: progress.left === 0 ? '#059669' : '#b45309' }}>
                                    {progress.left === 0
                                      ? 'Target reached ✓'
                                      : `$${progress.left.toFixed(2)} left to reach target`}
                                  </div>
                                </div>
                              )}
                              {(env.goalType === 'target_by_date' || env.goalType === 'savings_balance') && getNeeded(env, row) > 0.004 && (
                                <div data-testid="needed-note" style={{ fontSize: '0.72rem', color: '#8a4b00', marginTop: '3px' }}>
                                  Needs {formatMoney(getNeeded(env, row))} more {env.goalType === 'savings_balance' ? 'to reach your goal' : 'this month to stay on track'}
                                </div>
                              )}
                              {row.income > 0 && (
                                <div data-testid="income-note" style={{ fontSize: '0.72rem', color: '#059669', marginTop: '3px' }}>
                                  + {formatMoney(row.income)} from income this month
                                </div>
                              )}
                              {row.start > 0 && (
                                <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '3px' }}>
                                  {formatMoney(row.start)} carried over from last month
                                </div>
                              )}
                              {row.end < 0 && (
                                <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '3px' }}>
                                  Overspent by {formatMoney(-row.end)}.{' '}
                                  {row.cashOver > 0.004
                                    ? `Unless covered, ${row.creditOver > 0.004 ? formatMoney(row.cashOver) + ' of it ' : 'it '}comes out of ${monthLabel(addMonthKey(budgetMonth, 1), true)}'s Ready to Assign.`
                                    : 'It was put on a credit card, so your card payment will be short by that much unless you cover it.'}
                                  {row.cashOver > 0.004 && row.creditOver > 0.004 ? ` ${formatMoney(row.creditOver)} was on a credit card and leaves that card's payment short.` : ''}
                                </div>
                              )}
                            </div>
                            {!isMobile && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <AssignedInput
                                  value={row.budgeted}
                                  ariaLabel={`Assigned ${env.name}`}
                                  onCommit={n => handleAssignMonth(env.id, n)}
                                />
                              </div>
                            )}
                            {!isMobile && (
                              <div style={{ textAlign: 'right', fontSize: '0.88rem', color: '#4b5563' }}>{formatMoney(spent)}</div>
                            )}
                            <div style={{ textAlign: 'right' }}>
                              <AvailPill value={remaining} row={row} label={`Available ${env.name}`} onClick={() => setSelectedEnvId(selected ? null : env.id)} />
                            </div>
                            {selected && isMobile && <div onClick={() => { setSelectedEnvId(null); closeMove(); setHideEnvUi(null); }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.45)', zIndex: 59 }} />}
                            <div data-testid={selected && isMobile ? 'env-sheet' : undefined} style={selected && isMobile ? { position: 'fixed', left: 0, right: 0, bottom: kbInset.bottom, zIndex: 60, backgroundColor: 'white', borderRadius: '18px 18px 0 0', maxHeight: kbInset.height ? `${Math.round(kbInset.height * 0.92)}px` : '88vh', overflowY: 'auto', boxShadow: '0 -8px 28px rgba(0,0,0,0.25)', padding: kbInset.bottom ? '14px 16px 18px' : '14px 16px calc(18px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: '12px' } : { display: 'contents' }}>
                            {selected && isMobile && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{env.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <AvailPill value={remaining} row={row} label={`Sheet available ${env.name}`} />
                                  <button onClick={() => { setSelectedEnvId(null); closeMove(); setHideEnvUi(null); }} aria-label="Close" style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#4b5563' }}>✕</button>
                                </div>
                              </div>
                            )}
                            {selected && (
                              <div data-testid="env-actions" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '10px', flexWrap: 'wrap', paddingTop: '2px' }}>
                                {(() => {
                                  const needed = getNeeded(env, row);
                                  const prevRow = (budgetView.rowsByEnv[env.id] && budgetView.rowsByEnv[env.id].get(addMonthKey(budgetMonth, -1))) || null;
                                  const lastAssigned = prevRow ? Math.max(0, prevRow.budgeted) : 0;
                                  const lastSpent = prevRow ? Math.max(0, prevRow.spent) : 0;
                                  const cur = Number(row.budgeted) || 0;
                                  const setTo = (n) => handleAssignMonth(env.id, Math.max(0, round2(n)));
                                  const chips = [
                                    needed > 0.004 && [`Fund goal ${formatMoney(needed)}`, cur + needed],
                                    lastAssigned > 0.004 && Math.abs(lastAssigned - cur) > 0.004 && [`Last month ${formatMoney(lastAssigned)}`, lastAssigned],
                                    lastSpent > 0.004 && Math.abs(lastSpent - cur) > 0.004 && [`Spent last month ${formatMoney(lastSpent)}`, lastSpent],
                                    cur > 0.004 && ['Clear', 0]
                                  ].filter(Boolean);
                                  const stepBtn = isMobile ? { width: '52px', height: '52px', flexShrink: 0, borderRadius: '14px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '1.6rem', lineHeight: 1, color: '#1f2937', cursor: 'pointer' } : { height: '30px', padding: '0 12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '0.85rem', fontWeight: 600, color: '#1f2937', cursor: 'pointer' };
                                  return (
                                    <div data-testid="assign-block" style={{ width: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '10px' : '8px' }}>
                                      <div style={{ display: isMobile ? 'flex' : 'none', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
                                        <span>Assigned this month</span>
                                        <span>Ready to Assign <strong style={{ color: rtaShown < -0.004 ? '#b42318' : '#17603a' }}>{formatMoney(rtaShown)}</strong></span>
                                      </div>
                                      {isMobile ? (
                                        <>
                                          <AssignedInput value={row.budgeted} ariaLabel={`Assigned ${env.name}`} onCommit={n => handleAssignMonth(env.id, n)} width="100%" big />
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                            <button type="button" aria-label={`Subtract from ${env.name}`} onClick={() => { const v = evalAmount(adjustAmt); if (!(v > 0)) return; setTo(cur - v); setAdjustAmt(''); }} style={{ width: '56px', flexShrink: 0, borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '1.6rem', lineHeight: 1, cursor: 'pointer' }}>−</button>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <SplitAmountInput value={adjustAmt} onChange={setAdjustAmt} ariaLabel="Amount to add or subtract" placeholder="Amount to add or subtract" width="100%" wrapStyle={{ alignItems: 'stretch' }} inputStyle={{ textAlign: 'center', fontSize: '1.1rem', padding: '12px', boxSizing: 'border-box', width: '100%', minWidth: 0 }} />
                                            </div>
                                            <button type="button" aria-label={`Add to ${env.name}`} onClick={() => { const v = evalAmount(adjustAmt); if (!(v > 0)) return; setTo(cur + v); setAdjustAmt(''); }} style={{ width: '56px', flexShrink: 0, borderRadius: '12px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '1.6rem', lineHeight: 1, cursor: 'pointer' }}>+</button>
                                          </div>
                                        </>
                                      ) : (
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <button type="button" aria-label={`Assign $10 less to ${env.name}`} onClick={() => setTo(cur - 10)} style={stepBtn}>− $10</button>
                                        <button type="button" aria-label={`Assign $10 more to ${env.name}`} onClick={() => setTo(cur + 10)} style={stepBtn}>+ $10</button>
                                      </div>
                                      )}
                                      {chips.length > 0 && (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                          {chips.map(([label, val]) => (
                                            <button key={label} type="button" onClick={() => setTo(val)} style={{ padding: isMobile ? '9px 14px' : '5px 11px', borderRadius: '999px', border: '1px solid ' + (label === 'Clear' ? '#e5e7eb' : '#bfdbfe'), backgroundColor: label === 'Clear' ? 'white' : '#eff6ff', color: label === 'Clear' ? '#6b7280' : '#1d4ed8', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>{label}</button>
                                          ))}
                                        </div>
                                      )}
                                      <div style={{ display: isMobile ? 'flex' : 'none', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
                                        <span>Activity <strong>{formatMoney(spent)}</strong></span>
                                        <span>Available <strong style={{ color: remaining < -0.004 ? '#b42318' : '#17603a' }}>{formatMoney(remaining)}</strong></span>
                                      </div>
                                    </div>
                                  );
                                })()}
                                <div style={isMobile ? { width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } : { display: 'contents' }}>
                              {remaining < -0.004 && (
                                <button
                                  onClick={() => (moveUi && moveUi.envId === env.id ? closeMove() : openMove(env, 'cover'))}
                                  aria-label={`Cover overspending on ${env.name}`}
                                  style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', padding: isMobile ? '13px 10px' : '4px 8px', width: isMobile ? '100%' : undefined, cursor: 'pointer', fontSize: isMobile ? '0.95rem' : '0.75rem', fontWeight: 'bold' }}
                                >
                                  Cover
                                </button>
                              )}
                              {remaining > 0.004 && (
                                <button
                                  onClick={() => (moveUi && moveUi.envId === env.id ? closeMove() : openMove(env, 'move'))}
                                  aria-label={`Move money from ${env.name}`}
                                  style={{ backgroundColor: 'white', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: isMobile ? '13px 10px' : '3px 8px', width: isMobile ? '100%' : undefined, cursor: 'pointer', fontSize: isMobile ? '0.95rem' : '0.75rem', fontWeight: 'bold' }}
                                >
                                  Move
                                </button>
                              )}
                              {env.isHidden ? (
                                <button
                                  onClick={() => handleUnhideEnvelope(env)}
                                  aria-label={`Unhide envelope ${env.name}`}
                                  style={{ background: 'white', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: isMobile ? '13px 10px' : '3px 8px', width: isMobile ? '100%' : undefined, cursor: 'pointer', fontSize: isMobile ? '0.95rem' : '0.75rem', fontWeight: 'bold' }}
                                >
                                  Unhide
                                </button>
                              ) : (
                                <button
                                  onClick={() => (hideEnvUi === env.id ? setHideEnvUi(null) : requestHideEnvelope(env))}
                                  title="Hide this envelope. Its history stays."
                                  aria-label={`Hide envelope ${env.name}`}
                                  style={{ background: isMobile ? '#f3f4f6' : 'none', borderRadius: isMobile ? '10px' : undefined, color: '#6b7280', border: 'none', cursor: 'pointer', fontSize: isMobile ? '0.95rem' : '0.75rem', padding: isMobile ? '12px' : '4px' }}
                                >
                                  Hide
                                </button>
                              )}
                              <button
                                onClick={() => startEditEnv(env)}
                                title="Edit envelope"
                                aria-label="Edit envelope"
                                style={{ background: isMobile ? '#f3f4f6' : 'none', borderRadius: isMobile ? '10px' : undefined, border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: isMobile ? '0.95rem' : '0.95rem', padding: isMobile ? '12px' : '4px' }}
                              >
                                {isMobile ? 'Edit' : '✎'}
                              </button>
                              <button
                                onClick={() => handleSoftDeleteEnvelope(env.id)}
                                style={{ background: isMobile ? '#fef2f2' : 'none', borderRadius: isMobile ? '10px' : undefined, border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.9rem', padding: isMobile ? '12px' : '4px' }}
                              >
                                {isMobile ? 'Delete' : '✕'}
                              </button>
                              </div>
                              </div>
                            )}
                            {moveUi && moveUi.envId === env.id && (
                              <div data-testid="move-panel" style={{ gridColumn: '1 / -1', padding: '10px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>
                                  {moveUi.mode === 'cover'
                                    ? `Cover ${env.name}'s overspending in ${monthLabel(budgetMonth)}`
                                    : `Move money out of ${env.name} (${formatMoney(Math.max(0, remaining))} available)`}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{moveUi.mode === 'cover' ? 'From' : 'To'}</span>
                                  <select
                                    value={moveUi.otherId}
                                    onChange={e => setMoveUi({ ...moveUi, otherId: e.target.value })}
                                    aria-label={moveUi.mode === 'cover' ? 'Take money from' : 'Move money to'}
                                    style={{ padding: '5px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', maxWidth: '100%' }}
                                  >
                                    <option value="">Choose…</option>
                                    {(moveUi.mode === 'cover' ? rtaShown > 0.004 : true) && (
                                      <option value="rta">Ready to Assign{moveUi.mode === 'cover' ? ` (${formatMoney(rtaShown)})` : ''}</option>
                                    )}
                                    {(moveUi.mode === 'cover'
                                      ? moveSources(env.id)
                                      : visibleEnvelopes.filter(e => e.id !== env.id)
                                    ).map(e => (
                                      <option key={e.id} value={e.id}>
                                        {e.name}{moveUi.mode === 'cover' ? ` (${formatMoney(envRow(e).end)} available)` : ''}
                                      </option>
                                    ))}
                                  </select>
                                  <SplitAmountInput
                                    value={moveUi.amount}
                                    onChange={v => setMoveUi({ ...moveUi, amount: v })}
                                    ariaLabel="Amount to move"
                                    width="100px"
                                  />
                                  <button onClick={confirmMove} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    {moveUi.mode === 'cover' ? 'Cover' : 'Move'}
                                  </button>
                                  <button onClick={closeMove} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '6px' }}>
                                  This adjusts what is assigned in {monthLabel(budgetMonth)}. Later months follow automatically.
                                </div>
                              </div>
                            )}
                            {hideEnvUi === env.id && (
                              <div data-testid="hide-panel" style={{ gridColumn: '1 / -1', padding: '10px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.8rem' }}>
                                {remaining > 0.004 ? (
                                  <>
                                    <div style={{ marginBottom: '8px' }}>
                                      <strong>{env.name}</strong> still has {formatMoney(remaining)} in {monthLabel(budgetMonth)}. A hidden envelope keeps its money reserved, so you may want to send it back to Ready to Assign.
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      <button onClick={() => doHideEnvelope(env, true)} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Move {formatMoney(remaining)} to Ready to Assign and hide</button>
                                      <button onClick={() => doHideEnvelope(env, false)} style={{ backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>Hide, keep the money in it</button>
                                      <button onClick={() => setHideEnvUi(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div style={{ marginBottom: '8px' }}>
                                      <strong>{env.name}</strong> is overspent by {formatMoney(-remaining)}. Cover it first if you can. If you hide it as is, the shortfall still comes out of Ready to Assign next month.
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button onClick={() => doHideEnvelope(env, false)} style={{ backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Hide anyway</button>
                                      <button onClick={() => setHideEnvUi(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Credit card payments */}
          {(() => {
            const cards = activeAccounts.filter(a => isCreditCard(a) && !a.isHidden);
            if (!cards.length) return null;
            const cols = isMobile ? 'minmax(0,1fr) auto' : 'minmax(0,1fr) 118px 104px 124px';
            const info = cards.map(acc => {
              const c = budgetView.cc[acc.id] || { setAside: 0, setAsideMonth: 0, paid: 0, paidMonth: 0, assigned: 0, assignedMonth: 0, available: 0 };
              const owed = Math.max(0, round2(-getAccountBalance(acc.id)));
              return { acc, c, owed, short: round2(owed - c.available) };
            });
            const total = info.reduce((t, x) => ({ a: t.a + x.c.assignedMonth + x.c.setAsideMonth, act: t.act - x.c.paidMonth, av: t.av + x.c.available }), { a: 0, act: 0, av: 0 });
            return (
              <div data-testid="cc-payments" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e3e6eb', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: '10px', backgroundColor: '#f1f3f6', padding: isMobile ? '8px 12px' : '7px 14px', borderBottom: '1px solid #e3e6eb' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1f2937' }}>Credit Card Payments</div>
                  {!isMobile && <div style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: '#4b5563' }}>{formatMoney(total.a)}</div>}
                  {!isMobile && <div style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: '#4b5563' }}>{formatMoney(total.act)}</div>}
                  <div style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: '#4b5563' }}>{formatMoney(total.av)}</div>
                </div>
                {info.map(({ acc, c, owed, short }) => (
                  <div key={acc.id} data-testid="cc-row" style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: '10px', rowGap: '6px', padding: isMobile ? '10px 12px' : '8px 14px', borderBottom: '1px solid #eef0f3' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{acc.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
                        Set aside {formatMoney(c.setAsideMonth)} · Paid {formatMoney(c.paidMonth)}
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '2px', color: owed === 0 || short <= 0.004 ? '#17603a' : '#8a4b00', fontWeight: 600 }}>
                        {owed === 0 ? 'Nothing owed' : short <= 0.004 ? `Covers the full ${formatMoney(owed)} balance` : `${formatMoney(short)} short of the ${formatMoney(owed)} balance`}
                      </div>
                    </div>
                    {!isMobile && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <AssignedInput value={c.assignedMonth} ariaLabel={`Assigned payment ${acc.name}`} onCommit={n => handleAssignPayment(acc.id, n)} />
                      </div>
                    )}
                    {!isMobile && <div style={{ textAlign: 'right', fontSize: '0.88rem', color: '#4b5563' }}>{formatMoney(-c.paidMonth)}</div>}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'inline-block', minWidth: '64px', textAlign: 'center', padding: '3px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', backgroundColor: owed > 0 && short > 0.004 ? '#ffe7c2' : availColors(c.available).bg, color: owed > 0 && short > 0.004 ? '#8a4b00' : availColors(c.available).fg }}>
                        {formatMoney(c.available)}
                      </span>
                    </div>
                    {isMobile && (
                      <div style={{ gridColumn: '1 / -1', fontSize: '0.85rem' }}>
                        <span style={{ color: '#6b7280' }}>Assigned: </span>
                        <AssignedInput value={c.assignedMonth} ariaLabel={`Assigned payment ${acc.name}`} onCommit={n => handleAssignPayment(acc.id, n)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* NEW (ADD GROUP / ENVELOPE) TAB */}
      {activeTab === 'new' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>+ Add Group</h3>
              <form onSubmit={handleAddGroup} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Group Name"
                  value={newGroup}
                  onChange={e => setNewGroup(e.target.value)}
                  style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                />
                <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Add
                </button>
              </form>
            </div>

            <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>{editingEnvId ? 'Edit Envelope' : '+ Add Envelope'}</h3>
              <form onSubmit={handleAddEnvelope} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Envelope Name"
                    value={newEnvName}
                    onChange={e => setNewEnvName(e.target.value)}
                    style={{ flex: '1 1 130px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                  <select
                    value={newEnvGroup}
                    onChange={e => setNewEnvGroup(e.target.value)}
                    style={{ flex: '1 1 130px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                  >
                    <option value="">Select Group</option>
                    {groups.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <select
                    value={newEnvGoalType}
                    onChange={e => setNewEnvGoalType(e.target.value)}
                    style={{ flex: '1 1 140px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="none">No Goal</option>
                    <option value="repeating">Repeating Goal (Bill/Subscription)</option>
                    <option value="savings_balance">Save Up to an Amount (no date)</option>
                    <option value="target_by_date">Target Balance by Date</option>
                  </select>
                  {newEnvGoalType !== 'none' && (
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Target Amount ($)"
                      value={newEnvTargetAmount}
                      onChange={e => setNewEnvTargetAmount(e.target.value)}
                      style={{ flex: '1 1 100px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  )}
                </div>
                {newEnvGoalType === 'repeating' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <select
                      value={newEnvCadence}
                      onChange={e => setNewEnvCadence(e.target.value)}
                      style={{ flex: '1 1 100px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    {newEnvCadence === 'weekly' || newEnvCadence === 'biweekly' ? (
                      <select
                        value={newEnvRepeatDayOfWeek}
                        onChange={e => setNewEnvRepeatDayOfWeek(e.target.value)}
                        style={{ flex: '1 1 100px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                      >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    ) : newEnvCadence === 'monthly' ? (
                      <select
                        value={newEnvRepeatDayOfMonth}
                        onChange={e => setNewEnvRepeatDayOfMonth(e.target.value)}
                        style={{ flex: '1 1 100px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                      >
                        <option value="last">Last day of month</option>
                        {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => (
                          <option key={d} value={d}>Day {d}</option>
                        ))}
                      </select>
                    ) : newEnvCadence === 'yearly' ? (
                      <div style={{ display: 'flex', gap: '4px', flex: '1 1 100%', flexWrap: 'wrap' }}>
                        <select
                          value={newEnvRepeatMonth}
                          onChange={e => setNewEnvRepeatMonth(e.target.value)}
                          style={{ flex: '2 1 90px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={newEnvRepeatDayOfMonth}
                          onChange={e => setNewEnvRepeatDayOfMonth(e.target.value)}
                          style={{ flex: '1 1 50px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                          placeholder="Day"
                        />
                        <select
                          value={newEnvRepeatYear}
                          onChange={e => setNewEnvRepeatYear(e.target.value)}
                          style={{ flex: '2 1 80px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                          {Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() + i)).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                )}
                {newEnvGoalType === 'target_by_date' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' }}>Target Date</label>
                    <input
                      type="date"
                      value={newEnvTargetDate}
                      onChange={e => setNewEnvTargetDate(e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                    {editingEnvId ? 'Save Changes' : 'Create Envelope'}
                  </button>
                  {editingEnvId && (
                    <button
                      type="button"
                      onClick={() => { resetEnvForm(); setActiveTab('budget'); }}
                      style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

        </div>
      )}

      {/* PAYEES TAB */}
      {activeTab === 'payees' && (
        <div data-testid="payees-tab" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>Rename a payee to fix a spelling, or merge duplicates (like "Kroger" and "KROGER #123") into one. Every transaction with that payee changes.</div>
            <input type="search" placeholder="Search payees…" aria-label="Search payees" value={payeeSearch} onChange={e => setPayeeSearch(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px', border: '1px solid #d1d5db', borderRadius: '8px', marginBottom: '6px' }} />
            {payeeList.filter(p => p.name.toLowerCase().includes(payeeSearch.trim().toLowerCase())).map(p => (
              <div key={p.name} data-testid="payee-row" style={{ padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
                {payeeEdit && payeeEdit.name === p.name ? (
                  <form onSubmit={e => { e.preventDefault(); renamePayee(p.name, payeeEdit.value); }} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <input autoFocus aria-label={`New name for ${p.name}`} value={payeeEdit.value} onChange={e => setPayeeEdit({ ...payeeEdit, value: e.target.value })} style={{ flex: '1 1 160px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                    <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                    <button type="button" onClick={() => setPayeeEdit(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>Cancel</button>
                  </form>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.count} transaction{p.count === 1 ? '' : 's'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => setPayeeEdit({ name: p.name, value: p.name })} aria-label={`Rename ${p.name}`} style={{ background: 'white', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: isMobile ? '9px 12px' : '4px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Rename</button>
                      <select value="" onChange={e => { if (e.target.value) renamePayee(p.name, e.target.value); }} aria-label={`Merge ${p.name} into`} style={{ padding: isMobile ? '9px' : '4px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', maxWidth: '140px' }}>
                        <option value="">Merge into…</option>
                        {payeeList.filter(o => o.name !== p.name).map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {payeeList.length === 0 && <p style={{ color: '#6b7280' }}>No payees yet.</p>}
          </div>
        </div>
      )}

      {/* SCHEDULED TAB */}
      {activeTab === 'scheduled' && (
        <div data-testid="scheduled-tab" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {dueSchedules.length > 0 && (
            <div data-testid="sched-due" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <strong style={{ color: '#92400e' }}>Due now</strong>
                <button onClick={() => { const n = postDue(dueSchedules); showNotification(`Posted ${n} scheduled ${n === 1 ? 'transaction' : 'transactions'}.`); }} style={{ backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>Post all</button>
              </div>
              {dueSchedules.map(sc => {
                const n = dueDates(sc).dates.length;
                return (
                  <div key={sc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 0', borderTop: '1px solid #fde68a', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{sc.payee} · {plainMoney(sc.amount)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#92400e' }}>{n > 1 ? `${n} occurrences due, since ` : 'Due '}{formatDate(sc.nextDate, 'readable')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { postDue([sc]); showNotification(`Posted ${sc.payee}.`); }} aria-label={`Post ${sc.payee}`} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: isMobile ? '10px 14px' : '5px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Post</button>
                      <button onClick={() => skipDue(sc)} aria-label={`Skip ${sc.payee}`} style={{ backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: isMobile ? '10px 14px' : '5px 12px', cursor: 'pointer', fontSize: '0.85rem' }}>Skip</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {schedForm ? (
            <form onSubmit={saveSched} style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', gridColumn: '1 / -1' }}>{schedForm.id ? 'Edit schedule' : 'New scheduled transaction'}</h3>
              <input type="text" placeholder="Payee" aria-label="Scheduled payee" list="payee-suggestions" value={schedForm.payee} onChange={e => setSchedForm({ ...schedForm, payee: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', gridColumn: 'span 2' }} />
              <input type="text" inputMode="decimal" placeholder="Amount ($)" aria-label="Scheduled amount" value={schedForm.amount} onChange={e => setSchedForm({ ...schedForm, amount: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              <select aria-label="Scheduled type" value={schedForm.type} onChange={e => setSchedForm({ ...schedForm, type: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select aria-label="Scheduled account" value={schedForm.accountId} onChange={e => setSchedForm({ ...schedForm, accountId: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <option value="">Select account</option>
                {accountChoices(schedForm.accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {schedForm.type === 'expense' && (
                <select aria-label="Scheduled envelope" value={schedForm.envelopeId} onChange={e => setSchedForm({ ...schedForm, envelopeId: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="">Envelope (optional)</option>
                  {envelopeChoices.map(c => (
                    <optgroup key={c.label} label={c.label}>{c.list.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>
                  ))}
                </select>
              )}
              <select aria-label="Repeats" value={schedForm.frequency} onChange={e => setSchedForm({ ...schedForm, frequency: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                {SCHED_FREQS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#6b7280' }}>Next date</label>
                <input type="date" aria-label="Next date" value={schedForm.nextDate} onChange={e => setSchedForm({ ...schedForm, nextDate: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <input type="text" placeholder="Notes" value={schedForm.notes} onChange={e => setSchedForm({ ...schedForm, notes: e.target.value })} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                <input type="checkbox" checked={!!schedForm.autoPost} onChange={e => setSchedForm({ ...schedForm, autoPost: e.target.checked })} />
                Post automatically when it comes due (otherwise it waits for you to approve it)
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{schedForm.id ? 'Save changes' : 'Add schedule'}</button>
                <button type="button" onClick={() => setSchedForm(null)} style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setSchedForm({ ...emptySched(), accountId: (activeAccounts.find(a => !a.isHidden) || {}).id || '' })} style={{ alignSelf: 'flex-start', backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>+ New scheduled transaction</button>
          )}

          <div style={{ backgroundColor: 'white', padding: '6px 14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {activeScheduled.length === 0 && <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Nothing scheduled yet. Add rent, paychecks or subscriptions and they will post on their own or wait for your OK.</p>}
            {[...activeScheduled].sort((a, b) => a.nextDate.localeCompare(b.nextDate)).map(sc => {
              const acc = accounts.find(a => a.id === sc.accountId);
              const env = envelopes.find(e => e.id === sc.envelopeId);
              return (
                <div key={sc.id} data-testid="sched-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{sc.payee}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {(SCHED_FREQS.find(f => f[0] === sc.frequency) || [])[1]} · next {formatDate(sc.nextDate, 'readable')} · {acc ? acc.name : 'no account'}{env ? ` · ${env.name}` : ''} · {sc.autoPost ? 'posts automatically' : 'asks first'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <strong style={{ color: sc.type === 'income' ? '#059669' : '#1f2937' }}>{sc.type === 'income' ? '+' : '-'}{plainMoney(sc.amount).replace('-', '')}</strong>
                    <button onClick={() => setSchedForm({ ...sc, amount: String(sc.amount) })} aria-label={`Edit schedule ${sc.payee}`} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '6px' }}>Edit</button>
                    <button onClick={() => { setScheduled(prev => prev.filter(x => x.id !== sc.id)); showNotification('Schedule removed. Transactions already posted stay.'); }} aria-label={`Remove schedule ${sc.payee}`} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '6px' }}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACCOUNTS TAB */}
      {activeTab === 'accounts' && isMobile && !manageAccounts && (
        <div data-testid="accounts-overview" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[['Cash', sideCash], ['Credit', sideCredit]].filter(([, l]) => l.length > 0).map(([label, list]) => (
            <div key={label} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e3e6eb', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f7f8fa', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', color: '#6b7280', textTransform: 'uppercase' }}>
                <span>{label}</span><span>{formatMoney(sumBal(list))}</span>
              </div>
              {list.map(x => (
                <div key={x.acc.id} style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid #f0f2f5', backgroundColor: 'white' }}>
                  <button onClick={() => openAccountRegister(x.acc.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, minWidth: 0, padding: '15px 14px', background: 'white', border: 'none', textAlign: 'left', fontSize: '1rem', cursor: 'pointer', color: '#111827' }}>
                    <span>{x.acc.name}</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: x.bal < -0.004 ? '#b42318' : '#111827' }}>{formatMoney(x.bal)}</span>
                  </button>
                  <button onClick={() => { setManageAccounts(true); startReconcile(x.acc.id); }} aria-label={`Reconcile ${x.acc.name}`} style={{ margin: '0 10px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Reconcile</button>
                </div>
              ))}
            </div>
          ))}
          {activeInvestments.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e3e6eb', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', backgroundColor: '#f7f8fa', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', color: '#6b7280' }}>TRACKING</div>
              <button onClick={() => openTab('investments')} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '15px 14px', background: 'white', border: 'none', fontSize: '1rem', cursor: 'pointer', textAlign: 'left' }}>
                <span>Investments</span><span style={{ fontWeight: 600 }}>{formatMoney(invTotals.value)}</span>
              </button>
            </div>
          )}
          {sideAccounts.length === 0 && <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>No accounts yet.</div>}
          <button onClick={() => setManageAccounts(true)} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #c9dcf0', backgroundColor: 'white', color: '#2f6fb3', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>+ Add / manage accounts</button>
        </div>
      )}
      {activeTab === 'accounts' && (!isMobile || manageAccounts) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isMobile && <button onClick={() => setManageAccounts(false)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#2f6fb3', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', padding: '4px 0' }}>‹ Accounts</button>}
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>+ Add Account</h3>
            <form onSubmit={handleAddAccount} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Account Name"
                value={newAccName}
                onChange={e => setNewAccName(e.target.value)}
                style={{ flex: '2 1 140px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <select
                value={newAccType}
                onChange={e => setNewAccType(e.target.value)}
                style={{ flex: '1 1 100px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              >
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder={newAccType === 'Credit Card' ? 'Amount Owed ($)' : 'Initial Bal ($)'}
                value={newAccBalance}
                onChange={e => setNewAccBalance(e.target.value)}
                style={{ flex: '1 1 100px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', width: '100%' }}>
                Add Account
              </button>
            </form>
          </div>

          {activeAccounts.length === 0 && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              No accounts added yet. Add an account above to get started.
            </div>
          )}

          {hiddenAccountCount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#4b5563', cursor: 'pointer' }}>
              <input type="checkbox" checked={showHiddenAccounts} onChange={e => setShowHiddenAccounts(e.target.checked)} />
              Show hidden accounts ({hiddenAccountCount})
            </label>
          )}

          {shownAccounts.map(acc => {
            const accTransactionsAll = activeTransactions.filter(t => t.accountId === acc.id);
            const accStatus = accStatusFilter[acc.id] || '';
            const accTransactions = accStatus
              ? accTransactionsAll.filter(t => ((t.cleared || t.reconciled) ? 'cleared' : 'uncleared') === accStatus)
              : accTransactionsAll;
            const clearedBal = getClearedBalance(acc.id);
            const workingBal = getAccountBalance(acc.id);
            const isReconciling = reconcilingAccId === acc.id;
            const isTxCollapsed = collapsedAccountTx[acc.id] || acctDrag.dragging; // cards fold while one is dragged

            return (
              <div key={acc.id} ref={acctDrag.refFor(acc.id)} style={{ backgroundColor: acc.isHidden ? '#f9fafb' : 'white', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', ...acctDrag.styleFor(acc.id) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>
                      {shownAccounts.length > 1 && (
                        <button
                          onPointerDown={e => acctDrag.start(e, acc.id)}
                          onContextMenu={e => e.preventDefault()}
                          title="Hold and drag to reorder"
                          aria-label={`Drag to reorder ${acc.name.trim()}`}
                          style={{ background: 'none', border: 'none', cursor: 'grab', touchAction: 'none', color: '#9ca3af', fontSize: '1.1rem', padding: '0 10px 0 0', lineHeight: 1, userSelect: 'none', WebkitUserSelect: 'none' }}
                        >
                          ⋮⋮
                        </button>
                      )}
                      {acc.name} <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal' }}>({acc.type})</span>
                      {acc.isHidden && <span data-testid="hidden-account-badge" style={{ marginLeft: '8px', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', backgroundColor: '#e5e7eb', borderRadius: '999px', padding: '1px 8px' }}>hidden</span>}
                    </h3>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#4b5563' }}>
                      Cleared: <strong>${clearedBal.toFixed(2)}</strong> | Working: <strong>${workingBal.toFixed(2)}</strong>
                    </p>
                    {acc.lastReconciledDate && (
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>
                        ✓ Reconciled {formatDate(acc.lastReconciledDate, 'us')} (${Number(acc.lastReconciledBalance).toFixed(2)})
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => startReconcile(acc.id)}
                      style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Reconcile
                    </button>
                    <button
                      onClick={() => (acc.isHidden ? handleUnhideAccount(acc) : handleHideAccount(acc))}
                      title={acc.isHidden ? 'Show this account again' : 'Hide this account. Its history stays.'}
                      aria-label={`${acc.isHidden ? 'Unhide' : 'Hide'} account ${acc.name.trim()}`}
                      style={{ backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      {acc.isHidden ? 'Unhide' : 'Hide'}
                    </button>
                    <button
                      onClick={() => handleSoftDeleteAccount(acc.id)}
                      style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Reconcile Area */}
                {isReconciling && (
                  <div style={{ marginTop: '12px', backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#166534', fontSize: '0.95rem' }}>Reconcile {acc.name}</h4>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#15803d' }}>
                      Mark the transactions that appear on your statement as cleared (C), then enter the statement ending balance. Uncleared transactions stay open.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={targetBankBalance}
                        onChange={e => setTargetBankBalance(e.target.value)}
                        placeholder="Statement Bal ($)"
                        style={{ padding: '8px', border: '1px solid #86efac', borderRadius: '6px', flex: '1 1 130px', fontSize: '0.85rem' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', flex: '1 1 130px' }}>
                        <button
                          onClick={() => handleFinishReconciliation(acc.id)}
                          style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', flex: 1 }}
                        >
                          Finish
                        </button>
                        <button
                          onClick={() => setReconcilingAccId(null)}
                          style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Activity Table */}
                <div style={{ marginTop: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
                  <button
                    onClick={() => toggleAccountTxCollapse(acc.id)}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', padding: 0, marginBottom: '6px', fontSize: '0.85rem' }}
                  >
                    {isTxCollapsed ? `Show Activity (${accTransactionsAll.length})` : `Hide Activity (${accTransactionsAll.length})`}
                  </button>
                  {!isTxCollapsed && (
                    <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <select
                        value={accStatus}
                        onChange={e => setAccStatusFilter(prev => ({ ...prev, [acc.id]: e.target.value }))}
                        aria-label={`Filter ${acc.name.trim()} activity by cleared status`}
                        style={{ padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem' }}
                      >
                        <option value="">All</option>
                        <option value="cleared">Cleared</option>
                        <option value="uncleared">Not cleared</option>
                      </select>
                      {accStatus && (
                        <span data-testid={`acc-filter-count-${acc.id}`} style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {accTransactions.length} of {accTransactionsAll.length} shown
                        </span>
                      )}
                    </span>
                  )}

                  {!isTxCollapsed && (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '300px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
                            <th style={{ padding: '6px 4px', width: '45px' }}>Cleared</th>
                            <th style={{ padding: '6px 4px' }}>Date</th>
                            <th style={{ padding: '6px 4px' }}>Payee</th>
                            <th style={{ padding: '6px 4px', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accTransactions.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: '#9ca3af' }}>{accStatus ? 'No transactions match this filter.' : 'No transactions.'}</td>
                            </tr>
                          ) : (
                            accTransactions.map(t => (
                              <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '6px 4px' }}>
                                  <button
                                    onClick={() => (isTxLocked(t) ? unlockTx(t) : handleToggleCleared(t.id))}
                                    title={isTxLocked(t) ? 'Reconciled and locked. Click to unlock.' : 'Toggle cleared'}
                                    aria-label={`${(t.cleared || t.reconciled) ? 'Cleared' : 'Uncleared'}: ${t.payee}`}
                                    style={{
                                      opacity: isTxLocked(t) ? 0.55 : 1,
                                      backgroundColor: (t.cleared || t.reconciled) ? '#10b981' : '#e5e7eb',
                                      color: (t.cleared || t.reconciled) ? 'white' : '#6b7280',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      fontSize: '0.7rem'
                                    }}
                                  >
                                    {isTxLocked(t) ? '🔒' : 'C'}
                                  </button>
                                </td>
                                <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>{formatDate(t.date, 'us')}</td>
                                <td style={{ padding: '6px 4px' }}>{t.payee}</td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'bold', color: (t.type === 'income') === (Number(t.amount) >= 0) ? '#059669' : '#1f2937', whiteSpace: 'nowrap' }}>
                                  {signedMoney(t)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INVESTMENTS TAB */}
      {activeTab === 'investments' && (() => {
        const totalGain = invTotals.value - invTotals.basis;
        const totalPct = invTotals.basis > 0 ? (totalGain / invTotals.basis) * 100 : null;
        const gainColor = (g) => (g > 0 ? '#059669' : g < 0 ? '#dc2626' : '#111827');
        const signedMoney = (g) => `${g >= 0 ? '+' : '-'}${formatMoney(Math.abs(g))}`;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                {invStat('Total value', formatMoney(invTotals.value))}
                {invStat('Net contributed', formatMoney(invTotals.basis))}
                {invStat('Gain / loss', `${signedMoney(totalGain)}${totalPct !== null ? ` (${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)}%)` : ''}`, gainColor(totalGain))}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '10px' }}>
                Tracked separately: nothing here counts toward Ready to Assign or your envelopes.
              </div>
            </div>

            {invFormOpen ? (
              <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>{editingInvId ? 'Edit Investment Account' : '+ Add Investment Account'}</h3>
                <form onSubmit={handleSaveInvestment} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Account Name"
                    value={newInvName}
                    onChange={e => setNewInvName(e.target.value)}
                    style={{ flex: '2 1 140px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                  <select
                    value={newInvType}
                    onChange={e => setNewInvType(e.target.value)}
                    style={{ flex: '1 1 110px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                  >
                    {INVESTMENT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Current Value ($)"
                    value={newInvValue}
                    onChange={e => setNewInvValue(e.target.value)}
                    style={{ flex: '1 1 110px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount Invested ($)"
                    value={newInvBasis}
                    onChange={e => setNewInvBasis(e.target.value)}
                    style={{ flex: '1 1 110px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', flex: '1 1 100%' }}>
                    <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                      {editingInvId ? 'Save Changes' : 'Add Account'}
                    </button>
                    <button type="button" onClick={resetInvForm} style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                      Cancel
                    </button>
                  </div>
                </form>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '8px' }}>
                  Amount invested is what you have put in so far. Leave it blank to use the current value.
                </div>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setInvFormOpen(true)}
                  style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  + Add investment account
                </button>
              </div>
            )}

            {activeInvestments.length === 0 && (
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                No investment accounts yet.
              </div>
            )}

            {activeInvestments.map(inv => {
              const gain = Number(inv.value) - Number(inv.costBasis);
              const pct = Number(inv.costBasis) > 0 ? (gain / Number(inv.costBasis)) * 100 : null;
              const panelOpen = invPanel && invPanel.id === inv.id;
              const entries = [...(inv.entries || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
              const showAll = invShowAll[inv.id];
              const shownEntries = showAll ? entries : entries.slice(0, 5);
              const smallBtn = (bg, color) => ({ backgroundColor: bg, color, border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' });

              return (
                <div key={inv.id} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{inv.name} <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal' }}>({inv.type})</span></h3>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => startEditInv(inv)} title="Edit account" aria-label="Edit account" style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.95rem', padding: '4px' }}>✎</button>
                      <button onClick={() => handleSoftDeleteInv(inv.id)} title="Delete account" aria-label="Delete account" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.9rem', padding: '4px' }}>✕</button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginTop: '10px' }}>
                    {invStat('Value', formatMoney(inv.value))}
                    {invStat('Net contributed', formatMoney(inv.costBasis))}
                    {invStat('Gain / loss', `${signedMoney(gain)}${pct !== null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)` : ''}`, gainColor(gain))}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <button onClick={() => openInvPanel(inv, 'value')} style={smallBtn('#eff6ff', '#1e3a8a')}>Update value</button>
                    <button onClick={() => openInvPanel(inv, 'contribute')} style={smallBtn('#ecfdf5', '#047857')}>+ Contribute</button>
                    <button onClick={() => openInvPanel(inv, 'withdraw')} style={smallBtn('#fef2f2', '#b91c1c')}>− Withdraw</button>
                  </div>

                  {panelOpen && (
                    <form
                      onSubmit={e => { e.preventDefault(); handleInvAction(); }}
                      style={{ marginTop: '10px', backgroundColor: '#f9fafb', padding: '10px', borderRadius: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}
                    >
                      <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: '#6b7280', gap: '2px', flex: '1 1 130px' }}>
                        {invPanel.mode === 'value' ? 'New current value ($)' : invPanel.mode === 'contribute' ? 'Contribution ($)' : 'Withdrawal ($)'}
                        <input
                          type="number"
                          step="0.01"
                          value={invAmount}
                          onChange={e => setInvAmount(e.target.value)}
                          autoFocus
                          style={{ padding: '7px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: '#6b7280', gap: '2px', flex: '1 1 130px' }}>
                        Date
                        <input
                          type="date"
                          value={invDate}
                          onChange={e => setInvDate(e.target.value)}
                          style={{ padding: '7px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                        />
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="submit" style={smallBtn('#2563eb', 'white')}>Save</button>
                        <button type="button" onClick={() => setInvPanel(null)} style={smallBtn('#e5e7eb', '#374151')}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {entries.length > 0 && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', marginBottom: '4px' }}>Activity</div>
                      {shownEntries.map(en => (
                        <div key={en.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(en.date, 'us')}</span>
                          <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                            {en.kind === 'value' ? `Value set${en.note ? ` (${en.note})` : ''}` : en.kind === 'contribution' ? 'Contribution' : 'Withdrawal'}
                          </span>
                          <strong style={{ whiteSpace: 'nowrap', color: en.kind === 'contribution' ? '#059669' : en.kind === 'withdrawal' ? '#dc2626' : '#1f2937' }}>
                            {en.kind === 'contribution' ? '+' : en.kind === 'withdrawal' ? '-' : ''}{formatMoney(en.amount)}
                          </strong>
                        </div>
                      ))}
                      {entries.length > 5 && (
                        <button
                          onClick={() => setInvShowAll(prev => ({ ...prev, [inv.id]: !prev[inv.id] }))}
                          style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', padding: '6px 0 0 0', fontSize: '0.8rem' }}
                        >
                          {showAll ? 'Show less' : `Show all (${entries.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (() => {
        const viewPills = (
          <div style={{ backgroundColor: 'white', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['spending', 'Spending'], ['incexp', 'Income vs Expense'], ['networth', 'Net Worth'], ['age', 'Age of Money']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setReportView(key)}
                aria-pressed={reportView === key}
                style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid ' + (reportView === key ? '#1e3a8a' : '#e5e7eb'), backgroundColor: reportView === key ? '#1e3a8a' : 'white', color: reportView === key ? 'white' : '#4b5563', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                {label}
              </button>
            ))}
          </div>
        );
        if (reportView === 'networth' || reportView === 'age' || reportView === 'incexp') return renderOtherReport(reportView, viewPills);
        const ADJ = 'Reconciliation Adjustment'; // bookkeeping entries, not real spending
        const reportTx = activeTransactions.filter(t => t.payee !== ADJ && !t.isTransfer && /^\d{4}-\d{2}-\d{2}$/.test(t.date || ''));
        const isMonth = reportMode === 'month';
        const inPeriod = (t, kind, key) => (kind === 'month' ? t.date.slice(0, 7) === key : t.date.slice(0, 4) === String(key));
        const shiftMonth = (key, delta) => {
          const [yy, mm] = key.split('-').map(Number);
          const d = new Date(yy, mm - 1 + delta, 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };
        const monthName = (key, short) => {
          const [yy, mm] = key.split('-').map(Number);
          const n = REPORT_MONTHS[mm - 1];
          return `${short ? n.slice(0, 3) : n} ${yy}`;
        };

        const todayISO = getTodayISO();
        const todayKey = todayISO.slice(0, 7);
        const thisYear = new Date().getFullYear();
        const earliest = reportTx.reduce((min, t) => (t.date < min ? t.date : min), todayISO);
        const latest = reportTx.reduce((max, t) => (t.date > max ? t.date : max), todayISO);
        const canPrev = isMonth ? reportMonth > earliest.slice(0, 7) : reportYear > Number(earliest.slice(0, 4));
        const canNext = isMonth ? reportMonth < latest.slice(0, 7) : reportYear < Number(latest.slice(0, 4));

        const curKey = isMonth ? reportMonth : String(reportYear);
        const prevKey = isMonth ? shiftMonth(reportMonth, -1) : String(reportYear - 1);
        const periodLabel = isMonth ? monthName(reportMonth, false) : String(reportYear);
        const prevLabel = isMonth ? monthName(prevKey, true) : prevKey;

        const sum = (list, type) => list.filter(t => t.type === type).reduce((acc, t) => acc + Number(t.amount), 0);
        const curTx = reportTx.filter(t => inPeriod(t, reportMode, curKey));
        const prevTx = reportTx.filter(t => inPeriod(t, reportMode, prevKey));
        const spent = sum(curTx, 'expense');
        const income = sum(curTx, 'income');
        const prevSpent = sum(prevTx, 'expense');
        const net = income - spent;
        const spentDelta = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null;

        let avgLabel;
        let avgValue;
        if (isMonth) {
          const [yy, mm] = reportMonth.split('-').map(Number);
          const daysInMonth = new Date(yy, mm, 0).getDate();
          const days = reportMonth === todayKey ? Number(todayISO.slice(8, 10)) : daysInMonth;
          avgLabel = 'Avg per day';
          avgValue = spent / Math.max(1, days);
        } else {
          const months = reportYear === thisYear ? new Date().getMonth() + 1 : 12;
          avgLabel = 'Avg per month';
          avgValue = spent / months;
        }

        // Where the money went
        const envById = new Map(envelopes.map(e => [e.id, e]));
        const labelFor = (t, envId) => {
          if (reportBreakdown === 'payee') {
            const name = String(t.payee || '').trim();
            return { key: name.toLowerCase() || '(no payee)', label: name || '(no payee)', sub: '' };
          }
          const env = envId ? envById.get(envId) : null;
          if (!env) return { key: '__none__', label: 'Uncategorized', sub: '' };
          if (reportBreakdown === 'group') return { key: 'g:' + env.group, label: env.group, sub: '' };
          return { key: 'e:' + env.id, label: env.name, sub: env.group };
        };
        const tally = (list) => {
          const m = new Map();
          list.filter(t => t.type === 'expense').forEach(t => {
            // A split expense counts toward each of its envelopes; any unassigned part is Uncategorized.
            const pieces = isSplitTx(t) && reportBreakdown !== 'payee'
              ? t.splits.map(s => ({ envId: s.envelopeId, amount: Number(s.amount) || 0 }))
              : [{ envId: t.envelopeId, amount: Number(t.amount) }];
            pieces.forEach(p => {
              const { key, label, sub } = labelFor(t, p.envId);
              const row = m.get(key) || { key, label, sub, amount: 0 };
              row.amount += p.amount;
              m.set(key, row);
            });
          });
          return m;
        };
        const curMap = tally(curTx);
        const prevMap = tally(prevTx);
        const allRows = [...curMap.values()].sort((a, b) => b.amount - a.amount);
        const rows = reportBreakdown === 'payee' ? allRows.slice(0, 15) : allRows;
        const maxAmt = rows.length ? rows[0].amount : 0;
        const PALETTE = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#dc2626', '#4f46e5', '#0d9488'];

        // Trend: 12 months ending at the selected month, or the 12 months of the selected year
        const trendKeys = isMonth
          ? Array.from({ length: 12 }, (_, i) => shiftMonth(reportMonth, i - 11))
          : Array.from({ length: 12 }, (_, i) => `${reportYear}-${String(i + 1).padStart(2, '0')}`);
        const trend = trendKeys.map(k => {
          const l = reportTx.filter(t => t.date.slice(0, 7) === k);
          const mm = Number(k.slice(5, 7));
          return {
            key: k,
            label: REPORT_MONTHS[mm - 1].slice(0, 3),
            sub: mm === 1 ? k.slice(0, 4) : '',
            full: monthName(k, false),
            spent: sum(l, 'expense'),
            income: sum(l, 'income')
          };
        });

        // Year over year
        const yearSet = new Set(reportTx.map(t => t.date.slice(0, 4)));
        yearSet.add(String(thisYear));
        const years = [...yearSet].sort().reverse();
        const yoy = years.map(yr => {
          const l = reportTx.filter(t => t.date.slice(0, 4) === yr);
          return { year: yr, spent: sum(l, 'expense'), income: sum(l, 'income') };
        });

        const cardStyle = { backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
        const pill = (active) => ({
          padding: '6px 12px',
          borderRadius: '16px',
          border: '1px solid ' + (active ? '#1e3a8a' : '#e5e7eb'),
          backgroundColor: active ? '#1e3a8a' : 'white',
          color: active ? 'white' : '#4b5563',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '0.8rem'
        });
        const arrowBtn = (enabled) => ({
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          backgroundColor: 'white',
          color: enabled ? '#1f2937' : '#d1d5db',
          cursor: enabled ? 'pointer' : 'not-allowed',
          fontSize: '1rem'
        });
        const stat = (label, value, color, sub) => (
          <div style={{ ...cardStyle, padding: '12px' }}>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: color || '#1f2937', marginTop: '2px' }}>{value}</div>
            {sub && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>{sub}</div>}
          </div>
        );

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {viewPills}
            {/* Period controls */}
            <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setReportMode('month')} style={pill(isMonth)}>Monthly</button>
                <button onClick={() => setReportMode('year')} style={pill(!isMonth)}>Yearly</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  disabled={!canPrev}
                  aria-label="Previous period"
                  onClick={() => (isMonth ? setReportMonth(shiftMonth(reportMonth, -1)) : setReportYear(y => y - 1))}
                  style={arrowBtn(canPrev)}
                >
                  ‹
                </button>
                <div style={{ minWidth: '130px', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>{periodLabel}</div>
                <button
                  disabled={!canNext}
                  aria-label="Next period"
                  onClick={() => (isMonth ? setReportMonth(shiftMonth(reportMonth, 1)) : setReportYear(y => y + 1))}
                  style={arrowBtn(canNext)}
                >
                  ›
                </button>
              </div>
            </div>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              {stat(
                'Spent',
                formatMoney(spent),
                '#1f2937',
                spentDelta === null
                  ? (prevSpent === 0 ? `Nothing spent in ${prevLabel}` : '')
                  : `${spentDelta > 0 ? '▲' : spentDelta < 0 ? '▼' : ''} ${Math.abs(spentDelta).toFixed(0)}% vs ${prevLabel}`
              )}
              {stat('Income', formatMoney(income), '#059669')}
              {stat('Net', (net >= 0 ? '+' : '') + formatMoney(net), net >= 0 ? '#059669' : '#dc2626', net >= 0 ? 'Saved' : 'Overspent')}
              {stat(avgLabel, formatMoney(avgValue))}
            </div>

            {/* Trend */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{isMonth ? 'Month to month' : `${reportYear} by month`}</h3>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#4b5563' }}>
                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#2563eb', borderRadius: '2px', marginRight: '4px' }} />Spent</span>
                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '2px', marginRight: '4px' }} />Income</span>
                </div>
              </div>
              <ReportChart
                data={trend}
                selectedKey={isMonth ? reportMonth : null}
                onSelect={(key) => { setReportMode('month'); setReportMonth(key); }}
              />
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '4px' }}>
                {isMonth ? 'The last 12 months. Click a month to open it.' : 'Click a month to see its breakdown.'}
              </div>
            </div>

            {/* Where the money went */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Where the money went</h3>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button onClick={() => setReportBreakdown('group')} style={pill(reportBreakdown === 'group')}>Groups</button>
                  <button onClick={() => setReportBreakdown('envelope')} style={pill(reportBreakdown === 'envelope')}>Envelopes</button>
                  <button onClick={() => setReportBreakdown('payee')} style={pill(reportBreakdown === 'payee')}>Payees</button>
                </div>
              </div>

              {rows.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '10px 0 0 0' }}>No spending recorded for {periodLabel}.</p>
              ) : (
                <div>
                  {rows.map((r, i) => {
                    const prev = prevMap.get(r.key) ? prevMap.get(r.key).amount : 0;
                    const diff = r.amount - prev;
                    const color = r.key === '__none__' ? '#9ca3af' : PALETTE[i % PALETTE.length];
                    return (
                      <div key={r.key} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.88rem' }}>
                          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                            <strong>{r.label}</strong>
                            {r.sub && <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}> · {r.sub}</span>}
                          </div>
                          <div style={{ whiteSpace: 'nowrap' }}>
                            <strong>{formatMoney(r.amount)}</strong>{' '}
                            <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>{spent > 0 ? ((r.amount / spent) * 100).toFixed(0) : 0}%</span>
                          </div>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#f3f4f6', borderRadius: '3px', marginTop: '5px', overflow: 'hidden' }}>
                          <div style={{ width: `${maxAmt > 0 ? (r.amount / maxAmt) * 100 : 0}%`, height: '100%', backgroundColor: color }} />
                        </div>
                        <div style={{ fontSize: '0.72rem', marginTop: '3px', color: prev === 0 ? '#9ca3af' : diff > 0 ? '#dc2626' : diff < 0 ? '#059669' : '#6b7280' }}>
                          {prev === 0
                            ? `Nothing in ${prevLabel}`
                            : diff === 0
                              ? `Same as ${prevLabel}`
                              : `${diff > 0 ? '▲' : '▼'} ${formatMoney(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than ${prevLabel}`}
                        </div>
                      </div>
                    );
                  })}
                  {reportBreakdown === 'payee' && allRows.length > rows.length && (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', paddingTop: '8px' }}>Showing the top {rows.length} of {allRows.length} payees.</div>
                  )}
                  {reportBreakdown !== 'payee' && curMap.has('__none__') && (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', paddingTop: '8px' }}>
                      "Uncategorized" is spending that isn't filed under an envelope. Edit those transactions to assign one.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Year over year */}
            {yoy.length > 1 && (
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>Year to year</h3>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '360px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
                        <th style={{ padding: '6px 4px' }}>Year</th>
                        <th style={{ padding: '6px 4px', textAlign: 'right' }}>Spent</th>
                        <th style={{ padding: '6px 4px', textAlign: 'right' }}>Income</th>
                        <th style={{ padding: '6px 4px', textAlign: 'right' }}>Net</th>
                        <th style={{ padding: '6px 4px', textAlign: 'right' }}>Spending change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yoy.map((row, i) => {
                        const before = yoy[i + 1];
                        const chg = before && before.spent > 0 ? ((row.spent - before.spent) / before.spent) * 100 : null;
                        const rowNet = row.income - row.spent;
                        return (
                          <tr
                            key={row.year}
                            onClick={() => { setReportMode('year'); setReportYear(Number(row.year)); }}
                            style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', backgroundColor: !isMonth && String(reportYear) === row.year ? '#eff6ff' : 'transparent' }}
                          >
                            <td style={{ padding: '6px 4px', fontWeight: 600 }}>{row.year}</td>
                            <td style={{ padding: '6px 4px', textAlign: 'right' }}>{formatMoney(row.spent)}</td>
                            <td style={{ padding: '6px 4px', textAlign: 'right', color: '#059669' }}>{formatMoney(row.income)}</td>
                            <td style={{ padding: '6px 4px', textAlign: 'right', color: rowNet >= 0 ? '#059669' : '#dc2626' }}>{(rowNet >= 0 ? '+' : '') + formatMoney(rowNet)}</td>
                            <td style={{ padding: '6px 4px', textAlign: 'right', color: chg === null ? '#9ca3af' : chg > 0 ? '#dc2626' : '#059669' }}>
                              {chg === null ? '—' : `${chg > 0 ? '▲' : chg < 0 ? '▼' : ''} ${Math.abs(chg).toFixed(0)}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '6px' }}>Click a year to open it. The current year only covers the months so far.</div>
              </div>
            )}

            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
              Reports use your transactions only. Investment accounts and reconciliation adjustments are left out.
            </div>
          </div>
        );
      })()}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isMobile && txFormCard}

          {transferMatches.length > 0 && (
            <div data-testid="transfer-matches" style={{ backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#3730a3' }}>
                  {transferMatches.length} possible transfer{transferMatches.length === 1 ? '' : 's'} between your accounts
                </div>
                <button
                  onClick={handleLinkAllMatches}
                  style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Link all
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4b5563', margin: '2px 0 8px' }}>
                Same amount, opposite direction, within 3 days. Linked transfers stop counting as income or spending.
              </div>
              {transferMatches.slice(0, 6).map(m => (
                <div key={m.out.id + m.in.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: '1px solid #e0e7ff', fontSize: '0.8rem' }}>
                  <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                    <strong>${Number(m.out.amount).toFixed(2)}</strong>{' '}
                    {accounts.find(a => a.id === m.out.accountId)?.name} → {accounts.find(a => a.id === m.in.accountId)?.name}
                    <span style={{ color: '#6b7280' }}> ({m.out.payee} / {m.in.payee}, {formatDate(m.out.date, 'us')}{m.gap ? ` and ${formatDate(m.in.date, 'us')}` : ''})</span>
                  </div>
                  <button
                    onClick={() => handleLinkMatch(m)}
                    aria-label={`Link ${m.out.payee} and ${m.in.payee}`}
                    style={{ backgroundColor: 'white', color: '#4f46e5', border: '1px solid #c7d2fe', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}
                  >
                    Link
                  </button>
                </div>
              ))}
              {transferMatches.length > 6 && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280', paddingTop: '6px' }}>+ {transferMatches.length - 6} more</div>
              )}
            </div>
          )}

          {/* CSV import */}
          {isMobile && !showCsv ? (
            <button onClick={() => setShowCsv(true)} style={{ background: 'white', border: '1px dashed #c9d2de', borderRadius: '10px', padding: '12px', color: '#2f6fb3', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Import transactions from a CSV file…</button>
          ) : (
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Import CSV</h3>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px', wordBreak: 'break-word' }}>
                  {importRows.length ? importFileName : "Upload your bank's CSV export to add transactions in bulk."}
                </div>
              </div>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,.txt,text/csv"
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => importFileRef.current && importFileRef.current.click()}
                style={{ backgroundColor: 'white', color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {importRows.length ? 'Choose another file' : 'Choose CSV file'}
              </button>
            </div>

            {importRows.length > 0 && importPreview && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: '#6b7280', gap: '2px' }}>
                    Import into account
                    <select
                      value={importAccountId}
                      onChange={e => setImportAccountId(e.target.value)}
                      style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem', color: '#1f2937' }}
                    >
                      <option value="">Select Account</option>
                      {accountChoices(importAccountId).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: '#6b7280', gap: '2px' }}>
                    Date format
                    <select
                      value={importDateFormat}
                      onChange={e => setImportDateFormat(e.target.value)}
                      style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem', color: '#1f2937' }}
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="mdy">MM/DD/YYYY</option>
                      <option value="dmy">DD/MM/YYYY</option>
                      <option value="ymd">YYYY-MM-DD</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: '#6b7280', gap: '2px' }}>
                    Amount signs
                    <select
                      value={importSign}
                      onChange={e => setImportSign(e.target.value)}
                      style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem', color: '#1f2937' }}
                    >
                      <option value="negative-expense">Negative = money out</option>
                      <option value="positive-expense">Positive = money out</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {mapSelect('Date column', 'date')}
                  {mapSelect('Payee column', 'payee')}
                  {mapSelect('Amount column', 'amount')}
                  {mapSelect('Debit column', 'debit')}
                  {mapSelect('Credit column', 'credit')}
                  {mapSelect('Notes column', 'notes')}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                  Use either one Amount column, or separate Debit and Credit columns.
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#374151' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={importHasHeader} onChange={e => handleImportHeaderToggle(e.target.checked)} />
                    First row is a header
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={importSkipDupes} onChange={e => setImportSkipDupes(e.target.checked)} />
                    Skip likely duplicates
                  </label>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#374151' }}>
                  <strong style={{ color: '#059669' }}>{importPreview.ok} ready</strong>
                  {' · '}
                  <span style={{ color: '#b45309' }}>{importPreview.dup} duplicate{importPreview.dup === 1 ? '' : 's'}{importSkipDupes ? ' (skipped)' : ''}</span>
                  {' · '}
                  <span style={{ color: importPreview.invalid ? '#dc2626' : '#6b7280' }}>{importPreview.invalid} unreadable (skipped)</span>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '420px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
                        <th style={{ padding: '5px 4px' }}>Status</th>
                        <th style={{ padding: '5px 4px' }}>Date</th>
                        <th style={{ padding: '5px 4px' }}>Payee</th>
                        <th style={{ padding: '5px 4px' }}>Envelope</th>
                        <th style={{ padding: '5px 4px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.slice(0, 8).map(r => {
                        const envName = envelopes.find(e => e.id === r.envelopeId)?.name;
                        return (
                          <tr key={r.index} style={{ borderBottom: '1px solid #f3f4f6', opacity: r.status === 'ok' ? 1 : 0.65 }}>
                            <td style={{ padding: '5px 4px', whiteSpace: 'nowrap', fontWeight: 600, color: r.status === 'ok' ? '#059669' : r.status === 'dup' ? '#b45309' : '#dc2626' }}>
                              {r.status === 'ok' ? '✓ New' : r.status === 'dup' ? 'Duplicate' : r.reason}
                            </td>
                            <td style={{ padding: '5px 4px', whiteSpace: 'nowrap' }}>{r.date ? formatDate(r.date, 'us') : '—'}</td>
                            <td style={{ padding: '5px 4px', wordBreak: 'break-word' }}>{r.payee}</td>
                            <td style={{ padding: '5px 4px', color: '#6b7280' }}>{envName || '—'}</td>
                            <td style={{ padding: '5px 4px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 'bold', color: r.type === 'income' ? '#059669' : '#1f2937' }}>
                              {r.status === 'invalid' && r.reason === 'Bad amount' ? '—' : `${r.type === 'income' ? '+' : '-'}$${r.amount.toFixed(2)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {importPreview.rows.length > 8 && (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', padding: '6px 4px' }}>
                      …and {importPreview.rows.length - 8} more rows
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importToImportCount === 0 || !importAccountId}
                    style={{
                      flex: 1,
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: (importToImportCount === 0 || !importAccountId) ? 'not-allowed' : 'pointer',
                      opacity: (importToImportCount === 0 || !importAccountId) ? 0.5 : 1,
                      fontSize: '0.9rem'
                    }}
                  >
                    Import {importToImportCount} transaction{importToImportCount === 1 ? '' : 's'}
                  </button>
                  <button
                    onClick={closeImport}
                    style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          )}
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>All Transactions</h3>
              {selectedTxIds.length > 0 && (
                <div data-testid="bulk-bar" style={isMobile ? { position: 'fixed', left: 0, right: 0, bottom: 'calc(58px + env(safe-area-inset-bottom))', zIndex: 45, backgroundColor: 'white', borderTop: '1px solid #e3e6eb', boxShadow: '0 -4px 14px rgba(0,0,0,0.12)', padding: '10px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } : { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {isMobile && <strong style={{ fontSize: '0.9rem' }}>{selectedTxIds.length} selected</strong>}
                {selectedTxIds.length === 2 && (
                  <button
                    onClick={handleLinkSelected}
                    style={{ backgroundColor: 'white', color: '#4f46e5', border: '1px solid #c7d2fe', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Link as transfer
                  </button>
                )}
                <select
                  value=""
                  onChange={e => handleAssignSelectedEnvelope(e.target.value)}
                  aria-label="Assign envelope to selected transactions"
                  style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  <option value="">Assign envelope…</option>
                  {envelopeChoices.map(c => (
                    <optgroup key={c.label} label={c.label}>
                      {c.list.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  onClick={handleDeleteSelectedTransactions}
                  style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Delete Selected ({selectedTxIds.length})
                </button>
                </div>
              )}
            </div>

            <div data-testid="tx-filters" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
              <input
                type="search"
                placeholder="Search payee, notes, amount…"
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                aria-label="Search transactions"
                style={{ flex: '2 1 180px', padding: '7px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
              />
              {isMobile && <button type="button" onClick={() => { setSelectMode(v => !v); setSelectedTxIds([]); }} aria-pressed={selectMode} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: selectMode ? '#2f6fb3' : 'white', color: selectMode ? 'white' : '#2f6fb3', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>{selectMode ? 'Done' : 'Select'}</button>}
              {isMobile && <button type="button" onClick={() => setTxFiltersOpen(v => !v)} aria-expanded={txFiltersOpen} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: txFiltersActive ? '#e8f0fa' : 'white', color: '#2f6fb3', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Filters{txFiltersActive ? ' •' : ''}</button>}
              {(!isMobile || txFiltersOpen) && <>
              <select value={txFilterAccount} onChange={e => setTxFilterAccount(e.target.value)} aria-label="Filter by account" style={{ flex: '1 1 110px', padding: '7px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}>
                <option value="">All accounts</option>
                {activeAccounts.map(a => (<option key={a.id} value={a.id}>{a.name}{a.isHidden ? ' (hidden)' : ''}</option>))}
              </select>
              <select value={txFilterEnvelope} onChange={e => setTxFilterEnvelope(e.target.value)} aria-label="Filter by envelope" style={{ flex: '1 1 110px', padding: '7px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}>
                <option value="">All envelopes</option>
                <option value="__has__">Has an envelope</option>
                <option value="__none__">No envelope (uncategorized)</option>
                {envelopeChoicesAll.map(c => (
                  <optgroup key={c.label} label={c.label}>
                    {c.list.map(e => (<option key={e.id} value={e.id}>{e.name}</option>))}
                  </optgroup>
                ))}
              </select>
              <select value={txFilterType} onChange={e => setTxFilterType(e.target.value)} aria-label="Filter by type" style={{ flex: '1 1 100px', padding: '7px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}>
                <option value="">All types</option>
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
                <option value="transfer">Transfers</option>
              </select>
              <select value={txFilterStatus} onChange={e => setTxFilterStatus(e.target.value)} aria-label="Filter by cleared status" style={{ flex: '1 1 100px', padding: '7px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}>
                <option value="">Cleared or not</option>
                <option value="cleared">Cleared</option>
                <option value="uncleared">Not cleared</option>
              </select>
              <input type="date" value={txFromDate} onChange={e => setTxFromDate(e.target.value)} aria-label="From date" style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }} />
              <input type="date" value={txToDate} onChange={e => setTxToDate(e.target.value)} aria-label="To date" style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }} />
              </>}
              {txFiltersActive && (
                <>
                  <span data-testid="tx-filter-count" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {visibleTransactions.length} of {activeTransactions.length} shown
                  </span>
                  <button onClick={clearTxFilters} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Clear filters</button>
                </>
              )}
            </div>

            {(!isMobile || selectMode) && visibleTransactions.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#6b7280', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedTxIds.length === visibleTransactions.length && visibleTransactions.length > 0}
                  onChange={handleSelectAllTx}
                  style={{ cursor: 'pointer' }}
                />
                <span>{txFiltersActive ? `Select all ${visibleTransactions.length} shown` : 'Select All'}</span>
              </label>
            )}

            {sortedTransactionDates.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '10px' }}>
                {txFiltersActive ? 'No transactions match your search or filters.' : 'No transactions recorded yet.'}
              </p>
            ) : (
              sortedTransactionDates.map(dateStr => (
                <div key={dateStr} style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6b7280', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '6px' }}>
                    {formatDate(dateStr, 'readable')}
                  </div>
                  {groupedTransactions[dateStr].map(tx => {
                    const acc = accounts.find(a => a.id === tx.accountId);
                    const env = envelopes.find(e => e.id === tx.envelopeId);
                    const isSelected = selectedTxIds.includes(tx.id);
                    const locked = isTxLocked(tx);
                    const hasLock = locked || tx.reconciled || unlockedTxIds.includes(tx.id);

                    return (
                      <React.Fragment key={tx.id}>
                      <div style={{ position: 'relative', overflow: isMobile ? 'hidden' : 'visible' }}>
                      {isMobile && swipe && swipe.id === tx.id && (
                        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: swipe.dx > 0 ? 'flex-start' : 'flex-end', padding: '0 18px', backgroundColor: swipe.dx > 0 ? '#2f9e6e' : '#dc2626', color: 'white', fontWeight: 700 }}>
                          {swipe.dx > 0 ? ((tx.cleared || tx.reconciled) ? 'Uncleared' : 'Cleared ✓') : 'Delete'}
                        </div>
                      )}
                      <div {...(isMobile ? rowTouch(tx, locked) : {})} style={{ position: 'relative', backgroundColor: 'white', transform: isMobile && swipe && swipe.id === tx.id ? `translateX(${swipe.dx}px)` : 'none', transition: swipe && swipe.id === tx.id ? 'none' : 'transform 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '12px 0' : '8px 0', borderBottom: unlockAskId === tx.id ? 'none' : '1px solid #f3f4f6', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          {(!isMobile || selectMode) && <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectTx(tx.id)}
                            style={{ cursor: 'pointer', flexShrink: 0 }}
                          />}
                          <div onClick={isMobile ? () => (selectMode ? handleToggleSelectTx(tx.id) : locked ? setUnlockAskId(tx.id) : startEditTx(tx)) : undefined} style={{ minWidth: 0, flex: 1, cursor: isMobile ? 'pointer' : 'default' }}>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem', wordBreak: 'break-word' }}>{tx.payee}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-word' }}>
                              {acc?.name} {tx.notes ? `• ${tx.notes}` : ''}
                            </div>
                            {isMobile && tx.type === 'expense' && !tx.isTransfer && !isSplitTx(tx) && (
                              <div style={{ marginTop: '3px', fontSize: '0.75rem', fontWeight: 600, color: env ? '#2f6fb3' : '#b45309' }}>{env ? env.name : 'Needs a category'}</div>
                            )}
                            {tx.isTransfer && (
                              <div style={{ marginTop: '4px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span data-testid="transfer-badge" style={{ fontSize: '0.7rem', fontWeight: '600', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '2px 6px', borderRadius: '999px' }}>
                                  Transfer {tx.type === 'expense' ? 'out' : 'in'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkTransfer(tx)}
                                  disabled={locked}
                                  style={{ opacity: locked ? 0.4 : 1, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                                >
                                  Unlink
                                </button>
                              </div>
                            )}
                            {isSplitTx(tx) && (
                              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {tx.splits.map((s, i) => {
                                  const se = envelopes.find(e => e.id === s.envelopeId);
                                  return (
                                    <div key={i} data-testid="split-part" style={{ fontSize: '0.75rem', color: s.envelopeId ? '#374151' : '#b45309' }}>
                                      {se ? se.name + (se.isDeleted ? ' (deleted)' : '') : 'No envelope'}: {plainMoney(s.amount)}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {incomeAllocs(tx).length > 0 && countsTowardRTA(tx) && (
                              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {incomeAllocs(tx).map((a, i) => {
                                  const ae = envelopes.find(e => e.id === a.envelopeId);
                                  return (
                                    <div key={i} data-testid="income-alloc" style={{ fontSize: '0.75rem', color: '#059669' }}>
                                      → {ae ? ae.name + (ae.isDeleted ? ' (deleted)' : '') : 'Unknown envelope'}: {plainMoney(a.amount)}
                                    </div>
                                  );
                                })}
                                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                  {plainMoney(round2(Number(tx.amount) - incomeAllocs(tx).reduce((s, a) => s + a.amount, 0)))} stays in Ready to Assign
                                </div>
                              </div>
                            )}
                            {countsTowardRTA(tx) && (
                              <button
                                type="button"
                                onClick={() => (splitTxId === tx.id ? closeSplit() : openSplit(tx))}
                                disabled={locked}
                                style={{ opacity: locked ? 0.4 : 1, marginTop: '4px', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '2px 0', fontSize: '0.75rem', fontWeight: '600' }}
                              >
                                {splitTxId === tx.id ? 'Close' : incomeAllocs(tx).length ? 'Edit envelopes' : 'Send to envelopes'}
                              </button>
                            )}
                            {!isMobile && tx.type === 'expense' && !tx.isTransfer && !isSplitTx(tx) && (
                              <select
                                value={tx.envelopeId || ''}
                                onChange={e => handleAssignTxEnvelope(tx.id, e.target.value)}
                                disabled={locked}
                                aria-label="Assign envelope"
                                style={{
                                  marginTop: '4px',
                                  maxWidth: '100%',
                                  padding: '3px 6px',
                                  border: '1px solid ' + (tx.envelopeId ? '#d1d5db' : '#fbbf24'),
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  color: tx.envelopeId ? '#374151' : '#b45309',
                                  backgroundColor: tx.envelopeId ? 'white' : '#fffbeb'
                                }}
                              >
                                <option value="">No envelope</option>
                                {tx.envelopeId && env && (env.isDeleted || env.isHidden) && (
                                  <option value={tx.envelopeId}>{env.name} ({env.isDeleted ? 'deleted' : 'hidden'})</option>
                                )}
                                {envelopeChoices.map(c => (
                                  <optgroup key={c.label} label={c.label}>
                                    {c.list.map(e => (
                                      <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            )}
                            {tx.type === 'expense' && !tx.isTransfer && (
                              <button
                                type="button"
                                onClick={() => (splitTxId === tx.id ? closeSplit() : openSplit(tx))}
                                disabled={locked}
                                style={{ opacity: locked ? 0.4 : 1, marginTop: '4px', marginLeft: isSplitTx(tx) ? 0 : '6px', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '2px 0', fontSize: '0.75rem', fontWeight: '600' }}
                              >
                                {splitTxId === tx.id ? 'Close split' : isSplitTx(tx) ? 'Edit split' : 'Split'}
                              </button>
                            )}
                            {isSplitTx(tx) && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSplit(tx.id)}
                                disabled={locked}
                                style={{ opacity: locked ? 0.4 : 1, marginTop: '4px', marginLeft: '10px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px 0', fontSize: '0.75rem' }}
                              >
                                Remove split
                              </button>
                            )}
                            {splitTxId === tx.id && !(isMobile && txSheetOpen) && renderSplitEditor(tx)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <span style={{ fontWeight: 'bold', color: tx.isTransfer ? '#6b7280' : (tx.type === 'income') === (Number(tx.amount) >= 0) ? '#059669' : '#1f2937', fontSize: isMobile ? '1rem' : '0.9rem' }}>
                            {signedMoney(tx)}
                          </span>
                          {hasLock && (
                            <button
                              onClick={() => (locked ? unlockTx(tx) : relockTx(tx))}
                              title={locked ? 'Reconciled and locked. Click to unlock.' : 'Unlocked. Click to lock again.'}
                              aria-label={locked ? 'Unlock transaction' : 'Lock transaction'}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '0.9rem' }}
                            >
                              {locked ? '🔒' : '🔓'}
                            </button>
                          )}
                          {!isMobile && <button
                            onClick={() => startEditTx(tx)}
                            disabled={locked}
                            title={locked ? 'Reconciled and locked' : 'Edit transaction'}
                            aria-label="Edit transaction"
                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: locked ? 'not-allowed' : 'pointer', padding: '4px', opacity: locked ? 0.35 : 1 }}
                          >
                            ✎
                          </button>}
                          {!isMobile && <button
                            onClick={() => handleSoftDeleteTransaction(tx.id)}
                            disabled={locked}
                            title={locked ? 'Reconciled and locked' : 'Delete transaction'}
                            aria-label="Delete transaction"
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: locked ? 'not-allowed' : 'pointer', padding: '4px', opacity: locked ? 0.35 : 1 }}
                          >
                            ✕
                          </button>}
                        </div>
                      </div>
                      </div>
                      {unlockAskId === tx.id && locked && (
                        <div data-testid="unlock-ask" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', borderRadius: '8px', padding: '8px 10px', margin: '0 0 6px', fontSize: '0.8rem', borderBottom: '1px solid #fcd34d' }}>
                          <div style={{ marginBottom: '6px' }}>
                            This {tx.isTransfer ? 'transfer' : 'transaction'} was reconciled with your bank. Changing it can throw off your reconciled balance.
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => unlockTx(tx)} style={{ backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>Unlock to edit</button>
                            <button onClick={() => setUnlockAskId(null)} style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', fontSize: '0.8rem' }}>Keep locked</button>
                          </div>
                        </div>
                      )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ))
            )}
            {visibleTransactions.length > pagedTransactions.length && (
              <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '6px' }}>
                  Showing {pagedTransactions.length} of {visibleTransactions.length}
                </div>
                <button
                  onClick={() => setTxLimit(n => n + 200)}
                  style={{ backgroundColor: 'white', color: '#2563eb', border: '1px solid #bfdbfe', padding: '7px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Show 200 more
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEBTS TAB */}
      {activeTab === 'debts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>+ Track Debt</h3>
            <form onSubmit={handleAddDebt} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Debt Name"
                value={newDebtName}
                onChange={e => setNewDebtName(e.target.value)}
                style={{ flex: '2 1 130px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Balance ($)"
                value={newDebtTotal}
                onChange={e => setNewDebtTotal(e.target.value)}
                style={{ flex: '1 1 90px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="APR (%)"
                value={newDebtAPR}
                onChange={e => setNewDebtAPR(e.target.value)}
                style={{ flex: '1 1 70px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Min Pay ($)"
                value={newDebtMin}
                onChange={e => setNewDebtMin(e.target.value)}
                style={{ flex: '1 1 90px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', width: '100%' }}>
                Add Debt
              </button>
            </form>
          </div>

          {activeDebts.length === 0 && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              No debts tracked yet.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            {activeDebts.map(debt => (
              <div key={debt.id} style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{debt.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                    Bal: <strong>${Number(debt.balance).toFixed(2)}</strong> | APR: <strong>{debt.APR}%</strong> | Min: <strong>${Number(debt.minimumPayment).toFixed(2)}</strong>
                  </p>
                </div>
                <button
                  onClick={() => handleSoftDeleteDebt(debt.id)}
                  style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Delete
                </button>
                {(() => {
                  const extra = Number(debt.extraPayment) || 0;
                  const base = loanPayoff(debt.balance, debt.APR, Number(debt.minimumPayment) || 0);
                  const plan = loanPayoff(debt.balance, debt.APR, (Number(debt.minimumPayment) || 0) + extra);
                  const when = (months) => { const dt = new Date(); dt.setMonth(dt.getMonth() + months); return `${REPORT_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`; };
                  const line = (r) => r.done ? 'Paid off' : r.never ? 'The payment does not cover the interest, so the balance never shrinks.' : `Paid off ${when(r.months)} (${r.months} ${r.months === 1 ? 'month' : 'months'}), ${formatMoney(r.interest)} total interest`;
                  return (
                    <div data-testid="payoff" style={{ flexBasis: '100%', borderTop: '1px solid #f3f4f6', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '0.85rem', color: '#374151' }}>{line(plan)}</div>
                      {extra > 0 && !base.never && !base.done && !plan.never && (
                        <div style={{ fontSize: '0.78rem', color: '#059669' }}>
                          Paying {formatMoney(extra)} extra saves {formatMoney(base.interest - plan.interest)} in interest and {base.months - plan.months} {base.months - plan.months === 1 ? 'month' : 'months'}.
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.78rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Extra per month $
                          <input type="number" min="0" step="0.01" aria-label={`Extra payment ${debt.name}`} value={debt.extraPayment || ''} onChange={e => setDebts(prev => prev.map(d => (d.id === debt.id ? { ...d, extraPayment: e.target.value === '' ? 0 : Number(e.target.value) } : d)))} style={{ width: '90px', padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                        </label>
                        <label style={{ fontSize: '0.78rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Record a payment $
                          <input type="number" min="0" step="0.01" aria-label={`Payment amount ${debt.name}`} value={debtPay[debt.id] || ''} onChange={e => setDebtPay(prev => ({ ...prev, [debt.id]: e.target.value }))} style={{ width: '90px', padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                        </label>
                        <button
                          aria-label={`Record payment ${debt.name}`}
                          onClick={() => {
                            const amt = Number(debtPay[debt.id]);
                            if (!(amt > 0)) return;
                            setDebts(prev => prev.map(d => (d.id === debt.id ? { ...d, balance: Math.max(0, Math.round((Number(d.balance) - amt) * 100) / 100) } : d)));
                            setDebtPay(prev => ({ ...prev, [debt.id]: '' }));
                            showNotification(`Recorded a ${formatMoney(amt)} payment on ${debt.name}.`);
                          }}
                          style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                        >
                          Record
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IMPORT TAB */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div data-testid="export-card" style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>Export your data</h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#6b7280' }}>
              Download a copy any time. The files are made in your browser.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={exportTransactionsCSV} style={{ backgroundColor: 'white', color: '#2f6fb3', border: '1px solid #c9dcf0', padding: '7px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>Transactions (CSV)</button>
              <button onClick={exportBudgetCSV} style={{ backgroundColor: 'white', color: '#2f6fb3', border: '1px solid #c9dcf0', padding: '7px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>Budget by month (CSV)</button>
              <button onClick={() => { downloadBudgetBackup(); showNotification('Full backup downloaded.'); }} style={{ backgroundColor: 'white', color: '#2f6fb3', border: '1px solid #c9dcf0', padding: '7px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>Full backup (JSON)</button>
            </div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>Import from Actual Budget</h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#6b7280' }}>
              In Actual, open Settings → Export data and choose the .zip it gives you. The file is read in your browser and is not uploaded anywhere.
            </p>
            <input ref={axFileRef} type="file" accept=".zip,application/zip" onChange={handleActualFile} style={{ display: 'none' }} aria-label="Actual Budget export file" />
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => axFileRef.current && axFileRef.current.click()}
                disabled={axBusy}
                style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: axBusy ? 'wait' : 'pointer', fontSize: '0.9rem' }}
              >
                {axBusy ? 'Reading…' : ax ? 'Choose another file' : 'Choose export .zip'}
              </button>
              {axUndo && (
                <button
                  onClick={handleUndoActualImport}
                  style={{ backgroundColor: 'white', color: '#b91c1c', border: '1px solid #fca5a5', padding: '7px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Undo last import
                </button>
              )}
            </div>
            {axError && <div role="alert" style={{ marginTop: '10px', color: '#b91c1c', fontSize: '0.85rem' }}>{axError}</div>}
          </div>

          {ax && axPreview && axPreview.error && (
            <div role="alert" style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '10px', fontSize: '0.85rem' }}>
              Could not convert this export: {axPreview.error}
            </div>
          )}

          {ax && axPreview && !axPreview.error && (
            <div data-testid="import-preview" style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{(ax.meta && ax.meta.budgetName) || ax.fileName}</h3>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '10px' }}>
                {ax.desc.firstDate && `${formatDate(ax.desc.firstDate, 'us')} to ${formatDate(ax.desc.lastDate, 'us')}`}
              </div>
              <div data-testid="import-counts" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {[
                  [axPreview.accounts.length, 'accounts'],
                  [axPreview.envelopes.length, 'envelopes'],
                  [axPreview.transactions.length, 'transactions'],
                  [axPreview.budgetCount, 'monthly budget amounts'],
                  [axPreview.stats.linkedTransfers, 'transfers linked'],
                  [axPreview.stats.splits, 'split transactions'],
                  [axPreview.debts.length, 'debts']
                ].map(([n, label]) => (
                  <div key={label} style={{ backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem' }}>
                    <strong>{n}</strong> {label}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px' }}>Accounts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                {ax.desc.accounts.map(a => {
                  const ch = ax.choices[a.id] || {};
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 200px', minWidth: 0, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={ch.include !== false}
                          onChange={e => axSetChoice(a.id, { include: e.target.checked })}
                          aria-label={`Import ${a.name}`}
                        />
                        <span style={{ wordBreak: 'break-word' }}>{a.name}{a.closed ? ' (closed)' : ''}</span>
                        {a.investment && <span style={{ fontSize: '0.7rem', color: '#6b7280', backgroundColor: '#f3f4f6', borderRadius: '999px', padding: '1px 7px' }}>investment, left out</span>}
                      </label>
                      {a.offBudget ? (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Off budget · {a.balance < 0 ? `becomes a debt of ${formatMoney(-a.balance)}` : 'skipped (not a loan)'}
                        </span>
                      ) : (
                        <>
                          <select
                            value={ch.type || 'Checking'}
                            onChange={e => axSetChoice(a.id, { type: e.target.value })}
                            aria-label={`Type of ${a.name}`}
                            style={{ padding: '4px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem' }}
                          >
                            <option value="Checking">Checking</option>
                            <option value="Savings">Savings</option>
                            <option value="Cash">Cash</option>
                            <option value="Credit Card">Credit Card</option>
                          </select>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: '90px', textAlign: 'right' }}>
                            {a.txCount} tx · {formatMoney(a.balance)}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: '0.8rem', color: '#4b5563', backgroundColor: '#f9fafb', borderRadius: '8px', padding: '10px', marginBottom: '12px', lineHeight: 1.5 }}>
                <div>• Actual's monthly budget amounts become each envelope's assigned amounts, so rollover continues from where you left off.</div>
                <div>• Transfers between the accounts you import are linked. Categorized payments to off-budget loans stay as spending in their envelope.</div>
                <div>• Refunds and reimbursements in a spending category import as negative spending. Money in with no category is not counted as income.</div>
                <div>• Income on credit cards (opening balances, cash back) counts toward Ready to Assign, as in Actual.</div>
                <div>• Not imported: schedules, rules, goals and notes on categories. Closed accounts and hidden categories come in hidden, with their history.</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', fontSize: '0.85rem' }}>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="radio" name="axmode" checked={ax.mode === 'replace'} onChange={() => { setAx({ ...ax, mode: 'replace' }); setAxConfirm(false); }} aria-label="Replace my current budget" />
                  <span><strong>Replace my current budget</strong> with this one (recommended for a full move).</span>
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="radio" name="axmode" checked={ax.mode === 'add'} onChange={() => { setAx({ ...ax, mode: 'add' }); setAxConfirm(false); }} aria-label="Add to my current budget" />
                  <span><strong>Add to my current budget.</strong> Importing the same file twice would duplicate everything.</span>
                </label>
              </div>

              {axConfirm && (
                <div role="alert" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '10px' }}>
                  This replaces the accounts, envelopes and transactions currently in the app ({accounts.length} accounts, {envelopes.length} envelopes, {transactions.length} transactions). Your investments and debts are kept. A backup file downloads first, and you can undo right after.
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleRunActualImport}
                  style={{ backgroundColor: axConfirm ? '#dc2626' : '#059669', color: 'white', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  {axConfirm ? 'Yes, replace everything' : ax.mode === 'replace' ? 'Import and replace' : 'Import and add'}
                </button>
                {axConfirm && (
                  <button onClick={() => setAxConfirm(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRASH TAB */}
      {activeTab === 'trash' && (
        <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Trash / Deleted Items</h3>
            {totalTrashCount > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {selectedTrashKeys.length > 0 && (
                  <button
                    onClick={() => setTrashConfirm('selected')}
                    style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Delete Selected ({selectedTrashKeys.length})
                  </button>
                )}
                <button
                  onClick={() => setTrashConfirm('all')}
                  style={{ backgroundColor: 'white', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Empty Trash
                </button>
              </div>
            )}
          </div>

          {trashConfirm && trashConfirmCount > 0 && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '0.85rem', color: '#991b1b' }}>
              <div style={{ marginBottom: '8px' }}>
                Permanently delete {trashConfirm === 'all' ? `all ${trashConfirmCount}` : trashConfirmCount} item{trashConfirmCount === 1 ? '' : 's'} in the trash? This can't be undone.
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => permDeleteMany(trashConfirm === 'all' ? allTrashKeys : selectedTrashKeys)}
                  style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Yes, delete forever
                </button>
                <button
                  onClick={() => setTrashConfirm(null)}
                  style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {totalTrashCount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', marginBottom: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#6b7280', cursor: 'pointer' }}>
              <input type="checkbox" checked={allTrashSelected} onChange={toggleTrashAll} />
              Select all ({allTrashKeys.length})
            </label>
          )}
          {totalTrashCount === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Trash is empty.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {deletedTx.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', wordBreak: 'break-word', cursor: 'pointer', minWidth: 0, flex: '1 1 160px' }}><input type="checkbox" checked={trashSelected.includes(trashKey('tx', t.id))} onChange={() => toggleTrashItem(trashKey('tx', t.id))} style={{ flexShrink: 0 }} /><span>[Transaction] {t.payee} (${t.amount})</span></label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => restoreItem('tx', t.id)} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Restore</button>
                    <button onClick={() => permDeleteItem('tx', t.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Forever</button>
                  </div>
                </div>
              ))}
              {deletedEnv.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', wordBreak: 'break-word', cursor: 'pointer', minWidth: 0, flex: '1 1 160px' }}><input type="checkbox" checked={trashSelected.includes(trashKey('env', e.id))} onChange={() => toggleTrashItem(trashKey('env', e.id))} style={{ flexShrink: 0 }} /><span>[Envelope] {e.name} ({e.group})</span></label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => restoreItem('env', e.id)} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Restore</button>
                    <button onClick={() => permDeleteItem('env', e.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Forever</button>
                  </div>
                </div>
              ))}
              {deletedAcc.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', wordBreak: 'break-word', cursor: 'pointer', minWidth: 0, flex: '1 1 160px' }}><input type="checkbox" checked={trashSelected.includes(trashKey('acc', a.id))} onChange={() => toggleTrashItem(trashKey('acc', a.id))} style={{ flexShrink: 0 }} /><span>[Account] {a.name}</span></label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => restoreItem('acc', a.id)} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Restore</button>
                    <button onClick={() => permDeleteItem('acc', a.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Forever</button>
                  </div>
                </div>
              ))}
              {deletedInv.map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', wordBreak: 'break-word', cursor: 'pointer', minWidth: 0, flex: '1 1 160px' }}><input type="checkbox" checked={trashSelected.includes(trashKey('inv', i.id))} onChange={() => toggleTrashItem(trashKey('inv', i.id))} style={{ flexShrink: 0 }} /><span>[Investment] {i.name}</span></label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => restoreItem('inv', i.id)} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Restore</button>
                    <button onClick={() => permDeleteItem('inv', i.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Forever</button>
                  </div>
                </div>
              ))}
              {deletedDebts.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', wordBreak: 'break-word', cursor: 'pointer', minWidth: 0, flex: '1 1 160px' }}><input type="checkbox" checked={trashSelected.includes(trashKey('debt', d.id))} onChange={() => toggleTrashItem(trashKey('debt', d.id))} style={{ flexShrink: 0 }} /><span>[Debt] {d.name}</span></label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => restoreItem('debt', d.id)} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Restore</button>
                    <button onClick={() => permDeleteItem('debt', d.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Forever</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

        </div>
      </div>

      {/* Phone layout: global touch tweaks, transaction sheet, floating add button and bottom tab bar */}
      {isMobile && <style>{`input,select,textarea{font-size:16px !important} input[aria-label="Amount"]{font-size:1.5rem !important;font-weight:700 !important;padding:10px !important} [role=dialog] input,[role=dialog] select{min-width:0 !important;max-width:100% !important;box-sizing:border-box !important} button{touch-action:manipulation}`}</style>}
      {isMobile && txSheetOpen && (
        <BottomSheet inset={kbInset} title={editingTxId ? 'Edit transaction' : 'Add transaction'} testId="tx-sheet" onClose={() => { setTxSheetOpen(false); cancelEditTx(); }}>
          {txFormCard}
        </BottomSheet>
      )}
      {/* Phone layout: floating add button and bottom tab bar */}
      {isMobile && ['budget', 'accounts', 'transactions'].includes(activeTab) && !selectMode && (
        <button
          onClick={() => { cancelEditTx(); if (txFilterAccount) setTxAccountId(txFilterAccount); setTxSheetOpen(true); }}
          aria-label="Add transaction"
          style={{ position: 'fixed', right: '16px', bottom: 'calc(72px + env(safe-area-inset-bottom))', width: '56px', height: '56px', borderRadius: '50%', border: 'none', backgroundColor: '#2f6fb3', color: 'white', fontSize: '1.8rem', lineHeight: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.25)', cursor: 'pointer', zIndex: 30 }}
        >
          +
        </button>
      )}
      {isMobile && (
        <nav data-testid="mobile-tabs" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: 'calc(58px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)', display: 'flex', backgroundColor: 'white', borderTop: '1px solid #e3e6eb', zIndex: 30 }}>
          {MOBILE_TABS.map(([tab, label, glyph]) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => { if (tab === 'transactions') setTxFilterAccount(''); if (tab === 'accounts') setManageAccounts(false); setSelectedEnvId(null); openTab(tab); }}
                style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', color: active ? '#2f6fb3' : '#6b7280', fontWeight: active ? 700 : 500, fontSize: '0.68rem', borderTop: active ? '2px solid #2f6fb3' : '2px solid transparent' }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{glyph}</span>
                {label}
              </button>
            );
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', color: '#6b7280', fontSize: '0.68rem', borderTop: '2px solid transparent' }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⋯</span>
            More
          </button>
        </nav>
      )}
    </div>
  );
}
