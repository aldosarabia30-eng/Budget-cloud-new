import React, { useState, useEffect, useRef } from 'react';
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
  debts: d.debts ?? []
});

const MOBILE_QUERY = '(max-width: 720px)';
const isMobileNow = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;

const TAB_LABELS = {
  budget: 'Budget',
  new: 'Add New',
  accounts: 'Accounts',
  transactions: 'Transactions',
  debts: 'Debts',
  trash: 'Trash'
};
const NAV_LABELS = { ...TAB_LABELS, new: '+ New' };

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
    const dataToSave = { readyToAssign, accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts };
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
  }, [budgetId, readyToAssign, accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts]);

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
    }
    showNotification('Item restored.');
  };

  const permDeleteItem = (type, id) => {
    if (type === 'tx') setTransactions(transactions.filter(t => t.id !== id));
    if (type === 'env') setEnvelopes(envelopes.filter(e => e.id !== id));
    if (type === 'acc') setAccounts(accounts.filter(a => a.id !== id));
    if (type === 'debt') setDebts(debts.filter(d => d.id !== id));
    showNotification('Item permanently deleted.');
  };

  const deletedTx = transactions.filter(t => t.isDeleted);
  const deletedEnv = envelopes.filter(e => e.isDeleted);
  const deletedAcc = accounts.filter(a => a.isDeleted);
  const deletedDebts = debts.filter(d => d.isDeleted);
  const totalTrashCount = deletedTx.length + deletedEnv.length + deletedAcc.length + deletedDebts.length;

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
          {['budget', 'new', 'accounts', 'transactions', 'debts', 'trash'].map(tab => {
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
            const isCollapsed = collapsedGroups[groupName];

            return (
              <div key={groupName} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', marginBottom: '10px' }}>
                  <button
                    onClick={() => toggleGroupCollapse(groupName)}
                    style={{ background: 'none', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e3a8a', padding: 0 }}
                  >
                    <span>{isCollapsed ? '▶' : '▼'}</span> {groupName}
                  </button>
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
