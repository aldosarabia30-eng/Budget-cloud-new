import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://khutgtqavfyieykoxtez.supabase.co'; // Replace with your project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodXRndHFhdmZ5aWV5a294dGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NDExODYsImV4cCI6MjEwNjIxNzE4Nn0.TAZgRaonRt9OT9oDqmb_EFCaZaVYbgo7i33fNvxe5U4'; // Replace with your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ------------------------------

// Helper to get or generate Budget ID from URL query parameters.
// No shared "default-budget" anymore: a private random ID is generated once and remembered on this device.
const getBudgetIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  let id = params.get('budgetId');
  if (!id) {
    try { id = localStorage.getItem('budgetId'); } catch (e) { /* storage unavailable */ }
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'b-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      try { localStorage.setItem('budgetId', id); } catch (e) { /* storage unavailable */ }
    }
    const newUrl = `${window.location.pathname}?budgetId=${id}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }
  return id;
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
  readyToAssign: d.readyToAssign ?? 0,
  accounts: d.accounts ?? [],
  groups: d.groups ?? [],
  collapsedGroups: d.collapsedGroups ?? {},
  collapsedAccountTx: d.collapsedAccountTx ?? {},
  envelopes: d.envelopes ?? [],
  transactions: d.transactions ?? [],
  debts: d.debts ?? [],
  investments: d.investments ?? []
});

const MOBILE_QUERY = '(max-width: 720px)';
const isMobileNow = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;

const TAB_LABELS = {
  budget: 'Budget',
  new: 'Add New',
  accounts: 'Accounts',
  investments: 'Investments',
  transactions: 'Transactions',
  reports: 'Reports',
  debts: 'Debts',
  trash: 'Trash'
};
const NAV_LABELS = { ...TAB_LABELS, new: '+ New' };

const INVESTMENT_TYPES = ['Brokerage', '401(k)', 'IRA', 'Roth IRA', 'HSA', 'Crypto', 'Other'];

const formatMoney = (n) => {
  const v = Number(n) || 0;
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const round2 = (n) => Math.round(Number(n) * 100) / 100;

const REPORT_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const compactMoney = (n) => {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1000000) return '$' + (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return '$' + Math.round(v);
};

// Grouped bar chart: money out (blue) and money in (green) for each month. Click a month to open it.
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

export default function BudgetApp() {
  const [budgetId, setBudgetId] = useState(getBudgetIdFromUrl);
  const [readyToAssign, setReadyToAssign] = useState(0.0);

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
  const [txEnvelopeId, setTxEnvelopeId] = useState('');
  const [txDate, setTxDate] = useState(getTodayISO());
  const [txNotes, setTxNotes] = useState('');

  // Multi-select transactions state
  const [selectedTxIds, setSelectedTxIds] = useState([]);

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
  const [importSkipDupes, setImportSkipDupes] = useState(true);
  const importFileRef = useRef(null);

  // Investments (tracked separately from the budget)
  const [investments, setInvestments] = useState([]);
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

  // Fetch budget data from Supabase & subscribe to real-time changes
  useEffect(() => {
    if (!budgetId) return;
    let cancelled = false;
    loadedRef.current = false;

    const applyRemote = (d) => {
      lastJsonRef.current = snapshot(d); // remember it so the save effect doesn't send it back
      setReadyToAssign(d.readyToAssign ?? 0);
      setAccounts(d.accounts ?? []);
      setGroups(d.groups ?? []);
      setCollapsedGroups(d.collapsedGroups ?? {});
      setCollapsedAccountTx(d.collapsedAccountTx ?? {});
      setEnvelopes(d.envelopes ?? []);
      setTransactions(d.transactions ?? []);
      setDebts(d.debts ?? []);
      setInvestments(d.investments ?? []);
    };

    const fetchBudgetData = async () => {
      const { data, error } = await supabase
        .from('user_budgets')
        .select('data')
        .eq('id', budgetId)
        .maybeSingle(); // a brand-new budget has no row yet, which is not an error

      if (cancelled) return;
      if (error) {
        console.error('Error fetching budget data from Supabase:', error);
        setNotification("Couldn't load your budget, so changes won't be saved. Please refresh.");
        return; // stay "not loaded" so we never overwrite saved data with empty state
      }
      if (data && data.data) applyRemote(data.data);
      loadedRef.current = true;
    };

    fetchBudgetData();

    const channel = supabase
      .channel(`public:user_budgets:id=eq.${budgetId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_budgets', filter: `id=eq.${budgetId}` }, (payload) => {
        const d = payload.new && payload.new.data;
        if (!d) return;
        if (snapshot(d) === lastJsonRef.current) return; // our own save echoing back
        applyRemote(d);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [budgetId]);

  // Save budget changes to Supabase (debounced, skipped when nothing actually changed)
  useEffect(() => {
    if (!budgetId || !loadedRef.current) return;
    const dataToSave = { readyToAssign, accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts, investments };
    const json = snapshot(dataToSave);
    if (json === lastJsonRef.current) return;

    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from('user_budgets')
        .upsert({ id: budgetId, data: dataToSave });

      if (error) {
        console.error('Error saving budget data to Supabase:', error);
      } else {
        lastJsonRef.current = json;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [budgetId, readyToAssign, accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts, investments]);

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
    if (tab === 'new' && editingEnvId) resetEnvForm(); // "+ New" always starts a fresh form
    setActiveTab(tab);
    if (isMobile) setSidebarOpen(false);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?budgetId=${budgetId}`;
    navigator.clipboard.writeText(shareUrl);
    showNotification('Share link copied to clipboard!');
  };

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
  const invTotals = activeInvestments.reduce(
    (t, i) => ({ value: t.value + Number(i.value), basis: t.basis + Number(i.costBasis) }),
    { value: 0, basis: 0 }
  );

  // Credit cards hold debt (negative balance) and never feed Ready to Assign.
  const isCreditCard = (acc) => acc?.type === 'Credit Card';

  // Does this transaction add to Ready to Assign? Only income into a live, non-credit-card account.
  const countsTowardRTA = (tx) => {
    if (tx.type !== 'income') return false;
    const acc = accounts.find(a => a.id === tx.accountId);
    return !!acc && !acc.isDeleted && !isCreditCard(acc);
  };

  // Total an account has contributed to Ready to Assign (used when deleting/restoring an account).
  const getRtaContribution = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc || isCreditCard(acc)) return 0;
    const income = activeTransactions
      .filter(t => t.accountId === accId && t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return Number(acc.initialBalance) + income;
  };

  const getAccountBalance = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return 0;
    const txTotal = activeTransactions
      .filter(t => t.accountId === accId)
      .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    return Number(acc.initialBalance) + txTotal;
  };

  const getClearedBalance = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return 0;
    const txTotal = activeTransactions
      .filter(t => t.accountId === accId && (t.cleared || t.reconciled))
      .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    return Number(acc.initialBalance) + txTotal;
  };

  const handleToggleCleared = (txId) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { ...t, cleared: !t.cleared };
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
      // Same rule as every other income transaction, so deleting/restoring it stays consistent.
      if (isIncome && acc && !isCreditCard(acc)) {
        setReadyToAssign(prev => prev + adjTx.amount);
      }
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

  const getEnvelopeSpent = (envId) => {
    return activeTransactions
      .filter(t => t.envelopeId === envId && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getEnvelopeRemaining = (env) => {
    return Number(env.assigned) - getEnvelopeSpent(env.id);
  };

  // How far an envelope is from its target.
  // Repeating goals (bills): funded = amount assigned this cycle.
  // Target-by-date goals (savings): funded = balance still sitting in the envelope.
  const getTargetProgress = (env) => {
    if (!env.goalType || env.goalType === 'none') return null;
    const target = Number(env.targetAmount);
    if (!(target > 0)) return null;
    const funded = env.goalType === 'target_by_date' ? getEnvelopeRemaining(env) : Number(env.assigned);
    const left = Math.max(0, target - funded);
    const pct = Math.min(100, Math.max(0, (funded / target) * 100));
    return { target, funded, left, pct };
  };

  const groupedTransactions = activeTransactions.reduce((acc, tx) => {
    const dateKey = tx.date || getTodayISO();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(tx);
    return acc;
  }, {});

  const sortedTransactionDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  // Auto-pick an envelope only on a confident match (3+ chars, prefix match), not on any shared letter.
  const handlePayeeChange = (val) => {
    setTxPayee(val);
    const typed = val.trim().toLowerCase();
    if (typed.length < 3) return;
    const matchedEnv = activeEnvelopes.find(env => {
      const name = env.name.toLowerCase();
      return name.startsWith(typed) || (name.length >= 3 && typed.startsWith(name));
    });
    if (matchedEnv) {
      setTxEnvelopeId(matchedEnv.id);
    }
  };

  const handleAddGroup = (e) => {
    e.preventDefault();
    if (!newGroup.trim() || groups.includes(newGroup.trim())) return;
    setGroups([...groups, newGroup.trim()]);
    setNewGroup('');
    showNotification(`Group '${newGroup}' added.`);
  };

  const handleRemoveGroup = (groupName) => {
    const groupEnvelopes = envelopes.filter(env => env.group === groupName && !env.isDeleted);
    const refundedAmount = groupEnvelopes.reduce((sum, env) => sum + Number(env.assigned), 0);

    if (refundedAmount > 0) {
      setReadyToAssign(prev => prev + refundedAmount);
    }

    setGroups(groups.filter(g => g !== groupName));
    // Zero out assigned so restoring an envelope later can't bring back money that was already refunded.
    setEnvelopes(envelopes.map(env => (env.group === groupName && !env.isDeleted ? { ...env, isDeleted: true, assigned: 0 } : env)));
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
      assigned: 0,
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

  const handleAssignFunds = (envId, newAssignedAmount) => {
    const env = envelopes.find(e => e.id === envId);
    if (!env) return;
    const diff = Number(newAssignedAmount) - Number(env.assigned);
    setReadyToAssign(prev => prev - diff);
    setEnvelopes(envelopes.map(e => (e.id === envId ? { ...e, assigned: Number(newAssignedAmount) } : e)));
  };

  const handleSoftDeleteEnvelope = (envId) => {
    const env = envelopes.find(e => e.id === envId);
    if (!env) return;
    setReadyToAssign(prev => prev + Number(env.assigned));
    setEnvelopes(envelopes.map(e => (e.id === envId ? { ...e, isDeleted: true, assigned: 0 } : e)));
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
    if (!isCC) {
      setReadyToAssign(prev => prev + newAcc.initialBalance);
    }
    setNewAccName('');
    setNewAccBalance('');
    showNotification(`Account '${newAcc.name}' added.`);
  };

  const handleSoftDeleteAccount = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return;
    const contribution = getRtaContribution(accId);
    if (contribution !== 0) {
      setReadyToAssign(prev => prev - contribution);
    }
    setAccounts(accounts.map(a => (a.id === accId ? { ...a, isDeleted: true } : a)));
    if (reconcilingAccId === accId) setReconcilingAccId(null);
    showNotification(`Account '${acc.name}' moved to Trash.`);
  };

  const cancelEditTx = () => {
    setEditingTxId(null);
    setTxPayee('');
    setTxAmount('');
    setTxNotes('');
    setTxEnvelopeId('');
    setTxDate(getTodayISO());
  };

  const startEditTx = (tx) => {
    setEditingTxId(tx.id);
    setTxPayee(tx.payee);
    setTxAmount(String(tx.amount));
    setTxType(tx.type);
    setTxAccountId(tx.accountId);
    setTxEnvelopeId(tx.envelopeId || '');
    setTxDate(tx.date || getTodayISO());
    setTxNotes(tx.notes || '');
    scrollToTop();
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!txPayee.trim() || !txAmount || !txAccountId) {
      showNotification('Please fill in Payee, Amount, and Account.');
      return;
    }

    const amt = parseFloat(txAmount);
    if (isNaN(amt)) {
      showNotification('Please enter a valid amount.');
      return;
    }

    // Editing: update in place and keep Ready to Assign in sync
    if (editingTxId) {
      const old = transactions.find(t => t.id === editingTxId);
      if (!old) {
        cancelEditTx();
        return;
      }
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

      // Changing the money side of a reconciled transaction means it needs reconciling again
      const moneyChanged = Number(old.amount) !== amt || old.type !== txType || old.accountId !== txAccountId;
      if (moneyChanged && old.reconciled) {
        updated.reconciled = false;
        updated.cleared = true;
      }

      const delta = (countsTowardRTA(updated) ? amt : 0) - (countsTowardRTA(old) ? Number(old.amount) : 0);
      if (delta !== 0) {
        setReadyToAssign(prev => prev + delta);
      }

      setTransactions(transactions.map(t => (t.id === editingTxId ? updated : t)));
      cancelEditTx();
      showNotification('Transaction updated.');
      return;
    }

    const newTx = {
      id: 'tx-' + Date.now(),
      date: txDate || getTodayISO(),
      payee: txPayee.trim(),
      amount: amt,
      type: txType,
      accountId: txAccountId,
      envelopeId: txType === 'expense' ? txEnvelopeId : '',
      notes: txNotes,
      isDeleted: false,
      cleared: false,
      reconciled: false
    };

    setTransactions([newTx, ...transactions]);

    if (countsTowardRTA(newTx)) {
      setReadyToAssign(prev => prev + amt);
    }

    setTxPayee('');
    setTxAmount('');
    setTxNotes('');
    setTxDate(getTodayISO());
    showNotification('Transaction recorded.');
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
        activeAccounts.length === 1
          ? activeAccounts[0].id
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

    const rtaAdd = newTxs.filter(countsTowardRTA).reduce((sum, t) => sum + Number(t.amount), 0);
    setTransactions(prev => [...newTxs, ...prev]);
    if (rtaAdd !== 0) {
      setReadyToAssign(prev => prev + rtaAdd);
    }
    closeImport();
    showNotification(`Imported ${newTxs.length} transaction${newTxs.length === 1 ? '' : 's'}.`);
  };

  const handleSoftDeleteTransaction = (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    if (countsTowardRTA(tx)) {
      setReadyToAssign(prev => prev - Number(tx.amount));
    }
    setTransactions(transactions.map(t => (t.id === txId ? { ...t, isDeleted: true } : t)));
    setSelectedTxIds(prev => prev.filter(id => id !== txId)); // don't leave a stale selection behind
    if (editingTxId === txId) cancelEditTx();
    showNotification('Transaction moved to Trash.');
  };

  // Multi-select transaction deletion handlers
  const handleToggleSelectTx = (txId) => {
    setSelectedTxIds(prev =>
      prev.includes(txId) ? prev.filter(id => id !== txId) : [...prev, txId]
    );
  };

  const handleSelectAllTx = (e) => {
    if (e.target.checked) {
      setSelectedTxIds(activeTransactions.map(t => t.id));
    } else {
      setSelectedTxIds([]);
    }
  };

  const handleDeleteSelectedTransactions = () => {
    if (selectedTxIds.length === 0) return;

    let incomeAdjustment = 0;
    transactions.forEach(t => {
      if (selectedTxIds.includes(t.id) && !t.isDeleted && countsTowardRTA(t)) {
        incomeAdjustment += Number(t.amount);
      }
    });

    if (incomeAdjustment > 0) {
      setReadyToAssign(prev => prev - incomeAdjustment);
    }

    setTransactions(prev => prev.map(t => selectedTxIds.includes(t.id) ? { ...t, isDeleted: true } : t));
    if (selectedTxIds.includes(editingTxId)) cancelEditTx();
    setSelectedTxIds([]);
    showNotification('Selected transactions moved to Trash.');
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
      const tx = transactions.find(t => t.id === id);
      if (tx && countsTowardRTA(tx)) setReadyToAssign(prev => prev + Number(tx.amount));
      setTransactions(transactions.map(t => (t.id === id ? { ...t, isDeleted: false } : t)));
    } else if (type === 'env') {
      const env = envelopes.find(e => e.id === id);
      // If its group was deleted too, bring the group back so the envelope isn't invisible.
      if (env && !groups.includes(env.group)) setGroups(prev => [...prev, env.group]);
      setEnvelopes(envelopes.map(e => (e.id === id ? { ...e, isDeleted: false } : e)));
    } else if (type === 'acc') {
      const contribution = getRtaContribution(id);
      if (contribution !== 0) setReadyToAssign(prev => prev + contribution);
      setAccounts(accounts.map(a => (a.id === id ? { ...a, isDeleted: false } : a)));
    } else if (type === 'debt') {
      setDebts(debts.map(d => (d.id === id ? { ...d, isDeleted: false } : d)));
    } else if (type === 'inv') {
      setInvestments(investments.map(i => (i.id === id ? { ...i, isDeleted: false } : i)));
    }
    showNotification('Item restored.');
  };

  const permDeleteItem = (type, id) => {
    if (type === 'tx') setTransactions(transactions.filter(t => t.id !== id));
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937', backgroundColor: '#f9fafb' }}>

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
          width: '210px',
          flexShrink: 0,
          boxSizing: 'border-box',
          backgroundColor: 'white',
          borderRight: '1px solid #e5e7eb',
          padding: '16px 12px',
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
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e3a8a', padding: '4px 8px 16px 8px' }}>
          Envelope Budgeting
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {['budget', 'new', 'accounts', 'investments', 'transactions', 'reports', 'debts', 'trash'].map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => openTab(tab)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#1e3a8a' : '#4b5563'
                }}
              >
                <span>{NAV_LABELS[tab]}</span>
                {tab === 'trash' && totalTrashCount > 0 && (
                  <span style={{ fontSize: '0.7rem', backgroundColor: '#e5e7eb', color: '#4b5563', borderRadius: '10px', padding: '1px 7px' }}>
                    {totalTrashCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px 8px 0 8px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', wordBreak: 'break-all', marginBottom: '8px' }}>
            Budget ID: {budgetId}
          </div>
          <button
            onClick={copyShareLink}
            style={{ width: '100%', backgroundColor: 'white', color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
          >
            Copy Share Link
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '12px', boxSizing: 'border-box' }}>

      {/* Top bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle menu"
            style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem', color: '#374151' }}
          >
            ☰
          </button>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>{TAB_LABELS[activeTab]}</h1>
        </div>
        <div style={{ textAlign: 'right', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#1d4ed8', letterSpacing: '0.03em' }}>Ready to Assign</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: readyToAssign < 0 ? '#dc2626' : '#1e3a8a' }}>${readyToAssign.toFixed(2)}</div>
        </div>
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

          {/* Group Categories */}
          {groups.map(groupName => {
            const groupEnvelopes = activeEnvelopes.filter(e => e.group === groupName);
            const isCollapsed = collapsedGroups[groupName] || dragState !== null; // everything folds while dragging

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
                style={{ backgroundColor: 'white', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', ...dragStyle }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
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
                    style={{ background: 'none', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e3a8a', padding: 0 }}
                  >
                    <span>{isCollapsed ? '▶' : '▼'}</span> {groupName}
                  </button>
                  </div>
                  <button
                    onClick={() => handleRemoveGroup(groupName)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Delete Group
                  </button>
                </div>

                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {groupEnvelopes.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af', padding: '4px 0' }}>No envelopes in this group.</div>
                    ) : (
                      groupEnvelopes.map(env => {
                        const spent = getEnvelopeSpent(env.id);
                        const remaining = getEnvelopeRemaining(env);
                        const progress = getTargetProgress(env);

                        return (
                          <div key={env.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ flex: '1 1 160px' }}>
                              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{env.name}</div>
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
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '1 1 200px' }}>
                              <div style={{ fontSize: '0.85rem' }}>
                                <span style={{ color: '#6b7280' }}>Ass.: </span>
                                <input
                                  type="number"
                                  value={env.assigned}
                                  onChange={e => handleAssignFunds(env.id, e.target.value)}
                                  style={{ width: '70px', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }}
                                />
                              </div>
                              <div style={{ fontSize: '0.85rem' }}>Spent: <strong>${spent.toFixed(2)}</strong></div>
                              <div style={{ fontSize: '0.85rem' }}>Rem: <strong style={{ color: remaining < 0 ? '#dc2626' : '#059669' }}>${remaining.toFixed(2)}</strong></div>
                              <button
                                onClick={() => startEditEnv(env)}
                                title="Edit envelope"
                                aria-label="Edit envelope"
                                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.95rem', padding: '4px' }}
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => handleSoftDeleteEnvelope(env.id)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.9rem', padding: '4px' }}
                              >
                                ✕
                              </button>
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

      {/* ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          {activeAccounts.map(acc => {
            const accTransactions = activeTransactions.filter(t => t.accountId === acc.id);
            const clearedBal = getClearedBalance(acc.id);
            const workingBal = getAccountBalance(acc.id);
            const isReconciling = reconcilingAccId === acc.id;
            const isTxCollapsed = collapsedAccountTx[acc.id];

            return (
              <div key={acc.id} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{acc.name} <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal' }}>({acc.type})</span></h3>
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
                    {isTxCollapsed ? `Show Activity (${accTransactions.length})` : `Hide Activity (${accTransactions.length})`}
                  </button>

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
                              <td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: '#9ca3af' }}>No transactions.</td>
                            </tr>
                          ) : (
                            accTransactions.map(t => (
                              <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '6px 4px' }}>
                                  <button
                                    onClick={() => handleToggleCleared(t.id)}
                                    style={{
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
                                    C
                                  </button>
                                </td>
                                <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>{formatDate(t.date, 'us')}</td>
                                <td style={{ padding: '6px 4px' }}>{t.payee}</td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'bold', color: t.type === 'income' ? '#059669' : '#1f2937', whiteSpace: 'nowrap' }}>
                                  {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
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
        const ADJ = 'Reconciliation Adjustment'; // bookkeeping entries, not real spending
        const reportTx = activeTransactions.filter(t => t.payee !== ADJ && /^\d{4}-\d{2}-\d{2}$/.test(t.date || ''));
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
        const labelFor = (t) => {
          if (reportBreakdown === 'payee') {
            const name = String(t.payee || '').trim();
            return { key: name.toLowerCase() || '(no payee)', label: name || '(no payee)', sub: '' };
          }
          const env = t.envelopeId ? envById.get(t.envelopeId) : null;
          if (!env) return { key: '__none__', label: 'Uncategorized', sub: '' };
          if (reportBreakdown === 'group') return { key: 'g:' + env.group, label: env.group, sub: '' };
          return { key: 'e:' + env.id, label: env.name, sub: env.group };
        };
        const tally = (list) => {
          const m = new Map();
          list.filter(t => t.type === 'expense').forEach(t => {
            const { key, label, sub } = labelFor(t);
            const row = m.get(key) || { key, label, sub, amount: 0 };
            row.amount += Number(t.amount);
            m.set(key, row);
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
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>{editingTxId ? 'Edit Transaction' : '+ Add Transaction'}</h3>
            <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <input
                type="text"
                placeholder="Payee"
                value={txPayee}
                onChange={e => handlePayeeChange(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', gridColumn: 'span 2' }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount ($)"
                value={txAmount}
                onChange={e => setTxAmount(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              />
              <select
                value={txType}
                onChange={e => setTxType(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select
                value={txAccountId}
                onChange={e => setTxAccountId(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', gridColumn: 'span 2' }}
              >
                <option value="">Select Account</option>
                {activeAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
              {txType === 'expense' && (
                <select
                  value={txEnvelopeId}
                  onChange={e => setTxEnvelopeId(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', gridColumn: 'span 2' }}
                >
                  <option value="">Select Envelope (Optional)</option>
                  {activeEnvelopes.map(env => (
                    <option key={env.id} value={env.id}>{env.group} &gt; {env.name}</option>
                  ))}
                </select>
              )}
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
                <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                  {editingTxId ? 'Update Transaction' : 'Save Transaction'}
                </button>
                {editingTxId && (
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

          {/* CSV import */}
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
                      {activeAccounts.map(acc => (
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

          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>All Transactions</h3>
              {selectedTxIds.length > 0 && (
                <button
                  onClick={handleDeleteSelectedTransactions}
                  style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Delete Selected ({selectedTxIds.length})
                </button>
              )}
            </div>

            {activeTransactions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#6b7280' }}>
                <input
                  type="checkbox"
                  checked={selectedTxIds.length === activeTransactions.length && activeTransactions.length > 0}
                  onChange={handleSelectAllTx}
                  style={{ cursor: 'pointer' }}
                />
                <span>Select All</span>
              </div>
            )}

            {sortedTransactionDates.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '10px' }}>No transactions recorded yet.</p>
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

                    return (
                      <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectTx(tx.id)}
                            style={{ cursor: 'pointer', flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem', wordBreak: 'break-word' }}>{tx.payee}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-word' }}>
                              {acc?.name} {env ? `• ${env.name}` : ''} {tx.notes ? `• ${tx.notes}` : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <span style={{ fontWeight: 'bold', color: tx.type === 'income' ? '#059669' : '#1f2937', fontSize: '0.9rem' }}>
                            {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                          </span>
                          <button
                            onClick={() => startEditTx(tx)}
                            title="Edit transaction"
                            aria-label="Edit transaction"
                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '4px' }}
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleSoftDeleteTransaction(tx.id)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRASH TAB */}
      {activeTab === 'trash' && (
        <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Trash / Deleted Items</h3>
          {totalTrashCount === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Trash is empty.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {deletedTx.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>[Transaction] {t.payee} (${t.amount})</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => restoreItem('tx', t.id)} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Restore</button>
                    <button onClick={() => permDeleteItem('tx', t.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Forever</button>
                  </div>
                </div>
              ))}
              {deletedEnv.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>[Envelope] {e.name} ({e.group})</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => restoreItem('env', e.id)} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Restore</button>
                    <button onClick={() => permDeleteItem('env', e.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Forever</button>
                  </div>
                </div>
              ))}
              {deletedAcc.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>[Account] {a.name}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => restoreItem('acc', a.id)} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Restore</button>
                    <button onClick={() => permDeleteItem('acc', a.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Forever</button>
                  </div>
                </div>
              ))}
              {deletedInv.map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>[Investment] {i.name}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => restoreItem('inv', i.id)} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Restore</button>
                    <button onClick={() => permDeleteItem('inv', i.id)} style={{ padding: '4px 8px', color: 'red', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Forever</button>
                  </div>
                </div>
              ))}
              {deletedDebts.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>[Debt] {d.name}</div>
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
    </div>
  );
}
