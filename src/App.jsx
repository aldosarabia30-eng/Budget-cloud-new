import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://khutgtqavfyieykoxtez.supabase.co'; // Replace with your project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodXRndHFhdmZ5aWV5a294dGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NDExODYsImV4cCI6MjEwNjIxNzE4Nn0.TAZgRaonRt9OT9oDqmb_EFCaZaVYbgo7i33fNvxe5U4'; // Replace with your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ------------------------------

// Helper to get or generate Budget ID from URL query parameters
const getBudgetIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  let id = params.get('budgetId');
  if (!id) {
    id = 'default-budget';
    const newUrl = `${window.location.pathname}?budgetId=${id}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }
  return id;
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
  const { cadence, repeatDayOfWeek, repeatDayOfMonth, repeatMonth } = env;
  if (cadence === 'weekly') return `Every week on ${repeatDayOfWeek || 'Monday'}`;
  if (cadence === 'biweekly') return `Every 2 weeks on ${repeatDayOfWeek || 'Monday'}`;
  if (cadence === 'monthly') {
    if (repeatDayOfMonth === 'last') return `Every month on the last day`;
    return `Every month on the ${repeatDayOfMonth}${getOrdinalSuffix(repeatDayOfMonth)}`;
  }
  if (cadence === 'yearly') {
    return `Every year on ${repeatMonth || 'January'} ${repeatDayOfMonth || '1'}${getOrdinalSuffix(repeatDayOfMonth || '1')}`;
  }
  return `Every ${cadence}`;
};

export default function BudgetApp() {
  const [budgetId, setBudgetId] = useState(getBudgetIdFromUrl());
  const [readyToAssign, setReadyToAssign] = useState(1250.0);

  const [accounts, setAccounts] = useState([
    { id: 'acc-1', name: 'Checking Account', type: 'Checking', initialBalance: 2000, isDeleted: false, lastReconciledDate: '2026-09-01', lastReconciledBalance: 2000 },
    { id: 'acc-2', name: 'Savings Account', type: 'Savings', initialBalance: 5000, isDeleted: false, lastReconciledDate: '', lastReconciledBalance: null }
  ]);

  const [groups, setGroups] = useState(['Housing & Utilities', 'Daily Living', 'Savings Goals']);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [collapsedAccountTx, setCollapsedAccountTx] = useState({});

  const [envelopes, setEnvelopes] = useState([
    { id: 'env-1', name: 'Rent/Mortgage', group: 'Housing & Utilities', assigned: 1000, isDeleted: false, goalType: 'repeating', targetAmount: 1000, cadence: 'monthly', repeatDayOfMonth: '1', targetDate: '' },
    { id: 'env-2', name: 'Electric & Gas', group: 'Housing & Utilities', assigned: 150, isDeleted: false, goalType: 'repeating', targetAmount: 150, cadence: 'monthly', repeatDayOfMonth: '15', targetDate: '' },
    { id: 'env-3', name: 'Groceries', group: 'Daily Living', assigned: 400, isDeleted: false, goalType: 'repeating', targetAmount: 500, cadence: 'weekly', repeatDayOfWeek: 'Friday', targetDate: '' },
    { id: 'env-4', name: 'Dining Out', group: 'Daily Living', assigned: 150, isDeleted: false, goalType: 'none', targetAmount: 0, cadence: 'monthly', targetDate: '' },
    { id: 'env-5', name: 'Emergency Fund', group: 'Savings Goals', assigned: 300, isDeleted: false, goalType: 'target_by_date', targetAmount: 5000, targetDate: '2026-12-31', cadence: 'monthly' }
  ]);

  const [transactions, setTransactions] = useState([
    { id: 'tx-1', date: '2026-09-15', payee: 'Landlord Co.', amount: 1000, type: 'expense', accountId: 'acc-1', envelopeId: 'env-1', notes: 'Monthly rent', isDeleted: false, cleared: true, reconciled: true },
    { id: 'tx-2', date: '2026-09-18', payee: "Trader Joe's", amount: 125.5, type: 'expense', accountId: 'acc-1', envelopeId: 'env-3', notes: 'Weekly groceries', isDeleted: false, cleared: true, reconciled: false },
    { id: 'tx-3', date: '2026-09-25', payee: 'Employer Inc.', amount: 2500, type: 'income', accountId: 'acc-1', envelopeId: '', notes: 'Bi-weekly Paycheck', isDeleted: false, cleared: true, reconciled: false },
    { id: 'tx-4', date: '2026-09-25', payee: 'Transfer to Savings', amount: 500, type: 'expense', accountId: 'acc-1', envelopeId: 'env-5', notes: 'Emergency fund transfer', isDeleted: false, cleared: false, reconciled: false }
  ]);

  const [debts, setDebts] = useState([
    { id: 'd-1', name: 'Credit Card', totalAmount: 3000, balance: 2100, APR: 19.99, minimumPayment: 75, isDeleted: false }
  ]);

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

  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtTotal, setNewDebtTotal] = useState('');
  const [newDebtAPR, setNewDebtAPR] = useState('');
  const [newDebtMin, setNewDebtMin] = useState('');

  // Fetch budget data from Supabase & Subscribe to Real-time Changes
  useEffect(() => {
    const fetchBudgetData = async () => {
      if (!budgetId) return;
      const { data, error } = await supabase
        .from('user_budgets')
        .select('data')
        .eq('id', budgetId)
        .single();

      if (error) {
        console.error('Error fetching budget data from Supabase:', error);
      } else if (data && data.data) {
        const parsed = data.data;
        if (parsed.readyToAssign !== undefined) setReadyToAssign(parsed.readyToAssign);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.groups) setGroups(parsed.groups);
        if (parsed.collapsedGroups) setCollapsedGroups(parsed.collapsedGroups);
        if (parsed.collapsedAccountTx) setCollapsedAccountTx(parsed.collapsedAccountTx);
        if (parsed.envelopes) setEnvelopes(parsed.envelopes);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.debts) setDebts(parsed.debts);
      }
    };

    fetchBudgetData();

    const channel = supabase
      .channel(`public:user_budgets:id=eq.${budgetId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_budgets', filter: `id=eq.${budgetId}` }, (payload) => {
        if (payload.new && payload.new.data) {
          const updated = payload.new.data;
          if (updated.readyToAssign !== undefined) setReadyToAssign(updated.readyToAssign);
          if (updated.accounts) setAccounts(updated.accounts);
          if (updated.groups) setGroups(updated.groups);
          if (updated.collapsedGroups) setCollapsedGroups(updated.collapsedGroups);
          if (updated.collapsedAccountTx) setCollapsedAccountTx(updated.collapsedAccountTx);
          if (updated.envelopes) setEnvelopes(updated.envelopes);
          if (updated.transactions) setTransactions(updated.transactions);
          if (updated.debts) setDebts(updated.debts);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [budgetId]);

  // Save budget changes to Supabase
  useEffect(() => {
    const saveBudgetData = async () => {
      if (!budgetId) return;
      const dataToSave = { readyToAssign, accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts };
      const { error } = await supabase
        .from('user_budgets')
        .upsert({ id: budgetId, data: dataToSave });

      if (error) {
        console.error('Error saving budget data to Supabase:', error);
      }
    };

    saveBudgetData();
  }, [budgetId, readyToAssign, accounts, groups, collapsedGroups, collapsedAccountTx, envelopes, transactions, debts]);

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

    const currentBal = getAccountBalance(accId);
    const diff = target - currentBal;

    if (Math.abs(diff) >= 0.01) {
      const isIncome = diff > 0;
      const adjustmentAmt = Math.abs(diff);

      const adjTx = {
        id: 'tx-' + Date.now(),
        date: getTodayISO(),
        payee: 'Reconciliation Adjustment',
        amount: adjustmentAmt,
        type: isIncome ? 'income' : 'expense',
        accountId: accId,
        envelopeId: '',
        notes: `Auto adjustment for bank statement balance $${target.toFixed(2)}`,
        isDeleted: false,
        cleared: true,
        reconciled: true
      };

      setTransactions(prev => [adjTx, ...prev]);
      setReadyToAssign(prev => prev + (isIncome ? adjustmentAmt : -adjustmentAmt));
    }

    setTransactions(prev => prev.map(t => {
      if (t.accountId === accId && (t.cleared || Math.abs(diff) >= 0.01) && !t.isDeleted) {
        return { ...t, cleared: true, reconciled: true };
      }
      return t;
    }));

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

  const totalBankBalance = activeAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);

  const groupedTransactions = activeTransactions.reduce((acc, tx) => {
    const dateKey = tx.date || getTodayISO();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(tx);
    return acc;
  }, {});

  const sortedTransactionDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const handlePayeeChange = (val) => {
    setTxPayee(val);
    if (!val) return;
    const matchedEnv = activeEnvelopes.find(env =>
      val.toLowerCase().includes(env.name.toLowerCase()) || env.name.toLowerCase().includes(val.toLowerCase())
    );
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
    setEnvelopes(envelopes.map(env => (env.group === groupName ? { ...env, isDeleted: true } : env)));
    showNotification(`Group '${groupName}' deleted.`);
  };

  const handleAddEnvelope = (e) => {
    e.preventDefault();
    if (!newEnvName.trim() || !newEnvGroup) return;

    const newEnv = {
      id: 'env-' + Date.now(),
      name: newEnvName.trim(),
      group: newEnvGroup,
      assigned: 0,
      isDeleted: false,
      goalType: newEnvGoalType,
      targetAmount: parseFloat(newEnvTargetAmount) || 0,
      targetDate: newEnvTargetDate,
      cadence: newEnvCadence,
      repeatDayOfWeek: newEnvRepeatDayOfWeek,
      repeatDayOfMonth: newEnvRepeatDayOfMonth,
      repeatMonth: newEnvRepeatMonth
    };

    setEnvelopes([...envelopes, newEnv]);
    setNewEnvName('');
    setNewEnvGoalType('none');
    setNewEnvTargetAmount('');
    setNewEnvTargetDate('');
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
    showNotification(`Envelope '${env.name}' deleted.`);
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccBalance) return;
    const newAcc = {
      id: 'acc-' + Date.now(),
      name: newAccName.trim(),
      type: newAccType,
      initialBalance: parseFloat(newAccBalance) || 0,
      isDeleted: false,
      lastReconciledDate: '',
      lastReconciledBalance: null
    };
    setAccounts([...accounts, newAcc]);
    setReadyToAssign(prev => prev + newAcc.initialBalance);
    setNewAccName('');
    setNewAccBalance('');
    showNotification(`Account '${newAcc.name}' added.`);
  };

  const handleSoftDeleteAccount = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    setAccounts(accounts.map(a => (a.id === accId ? { ...a, isDeleted: true } : a)));
    showNotification(`Account '${acc?.name}' moved to Trash.`);
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!txPayee.trim() || !txAmount || !txAccountId) {
      showNotification('Please fill in Payee, Amount, and Account.');
      return;
    }

    const amt = parseFloat(txAmount);
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

    if (txType === 'income') {
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
    if (tx.type === 'income') {
      setReadyToAssign(prev => prev - tx.amount);
    }
    setTransactions(transactions.map(t => (t.id === txId ? { ...t, isDeleted: true } : t)));
    showNotification('Transaction moved to Trash.');
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
      if (tx && tx.type === 'income') setReadyToAssign(prev => prev + tx.amount);
      setTransactions(transactions.map(t => (t.id === id ? { ...t, isDeleted: false } : t)));
    } else if (type === 'env') {
      setEnvelopes(envelopes.map(e => (e.id === id ? { ...e, isDeleted: false } : e)));
    } else if (type === 'acc') {
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
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '16px', color: '#1f2937', backgroundColor: '#f9fafb', minHeight: '100vh' }}>

      {/* App Header */}
      <header style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700' }}>Envelope Budgeting</h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.85, fontSize: '0.9rem' }}>Real-time Cash Flow & Reconciliation</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Budget ID: <strong>{budgetId}</strong></span>
              <button
                onClick={copyShareLink}
                style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
              >
                Copy Share Link
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right', backgroundColor: '#3b82f6', padding: '10px 16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Ready to Assign</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>${readyToAssign.toFixed(2)}</div>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {notification}
        </div>
      )}

      {/* Main Nav */}
      <nav style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        {['budget', 'accounts', 'transactions', 'debts', 'trash'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              textTransform: 'capitalize',
              cursor: 'pointer',
              backgroundColor: activeTab === tab ? '#1e3a8a' : '#ffffff',
              color: activeTab === tab ? '#ffffff' : '#4b5563'
            }}
          >
            {tab === 'trash' ? `Trash (${totalTrashCount})` : tab}
          </button>
        ))}
      </nav>

      {/* ACCOUNTS TAB (Showing the updated 'C' toggles in transaction lists) */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>+ Add Account</h3>
            <form onSubmit={handleAddAccount} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Account Name (e.g., Checking)"
                value={newAccName}
                onChange={e => setNewAccName(e.target.value)}
                style={{ flex: 2, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <select
                value={newAccType}
                onChange={e => setNewAccType(e.target.value)}
                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Initial Balance ($)"
                value={newAccBalance}
                onChange={e => setNewAccBalance(e.target.value)}
                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Add Account
              </button>
            </form>
          </div>

          {activeAccounts.map(acc => {
            const accTransactions = activeTransactions.filter(t => t.accountId === acc.id);
            const clearedBal = getClearedBalance(acc.id);
            const workingBal = getAccountBalance(acc.id);
            const isReconciling = reconcilingAccId === acc.id;
            const isTxCollapsed = collapsedAccountTx[acc.id];

            return (
              <div key={acc.id} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>{acc.name} <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal' }}>({acc.type})</span></h3>
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#4b5563' }}>
                      Cleared: <strong>${clearedBal.toFixed(2)}</strong> | Working Balance: <strong>${workingBal.toFixed(2)}</strong>
                    </p>
                    {acc.lastReconciledDate && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#059669', fontWeight: '600' }}>
                        ✓ Last Reconciled: {formatDate(acc.lastReconciledDate, 'us')} (${Number(acc.lastReconciledBalance).toFixed(2)})
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => startReconcile(acc.id)}
                      style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Reconcile
                    </button>
                    <button
                      onClick={() => handleSoftDeleteAccount(acc.id)}
                      style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Reconcile Modal / Form Area */}
                {isReconciling && (
                  <div style={{ marginTop: '16px', backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#166534' }}>Reconcile {acc.name}</h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#15803d' }}>
                      Enter the current ending balance from your bank statement. Transactions marked with a cleared "C" are included.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={targetBankBalance}
                        onChange={e => setTargetBankBalance(e.target.value)}
                        placeholder="Statement Balance ($)"
                        style={{ padding: '8px', border: '1px solid #86efac', borderRadius: '6px', width: '200px' }}
                      />
                      <button
                        onClick={() => handleFinishReconciliation(acc.id)}
                        style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Finish Reconciling
                      </button>
                      <button
                        onClick={() => setReconcilingAccId(null)}
                        style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Account Recent Activity Table with Green/Grey 'C' Toggles */}
                <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                  <button
                    onClick={() => toggleAccountTxCollapse(acc.id)}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', padding: 0, marginBottom: '8px', fontSize: '0.9rem' }}
                  >
                    {isTxCollapsed ? `Show Recent Activity (${accTransactions.length})` : `Hide Recent Activity (${accTransactions.length})`}
                  </button>

                  {!isTxCollapsed && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
                            <th style={{ padding: '8px 4px', width: '60px' }}>Cleared</th>
                            <th style={{ padding: '8px 4px' }}>Date</th>
                            <th style={{ padding: '8px 4px' }}>Payee</th>
                            <th style={{ padding: '8px 4px', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accTransactions.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>No transactions for this account yet.</td>
                            </tr>
                          ) : (
                            accTransactions.map(tx => (
                              <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>
                                  {/* Green full "C" for cleared, grey "C" for not cleared */}
                                  <span
                                    onClick={() => handleToggleCleared(tx.id)}
                                    title={tx.cleared ? "Cleared (Click to uncleared)" : "Not Cleared (Click to clear)"}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '4px',
                                      fontWeight: 'bold',
                                      fontSize: '13px',
                                      cursor: 'pointer',
                                      backgroundColor: tx.cleared ? '#DEF7EC' : '#F3F4F6',
                                      color: tx.cleared ? '#03543F' : '#9CA3AF',
                                      border: tx.cleared ? '1px solid #84E1BC' : '1px solid #D1D5DB',
                                      userSelect: 'none'
                                    }}
                                  >
                                    C
                                  </span>
                                </td>
                                <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>{formatDate(tx.date, 'us')}</td>
                                <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>{tx.payee}</td>
                                <td style={{
                                  padding: '8px 4px',
                                  textAlign: 'right',
                                  verticalAlign: 'middle',
                                  fontWeight: 'bold',
                                  color: tx.type === 'income' ? '#059669' : '#dc2626'
                                }}>
                                  {tx.type === 'income' ? `+$${Number(tx.amount).toFixed(2)}` : `-$${Number(tx.amount).toFixed(2)}`}
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

      {/* BUDGET TAB */}
      {activeTab === 'budget' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 12px 0' }}>+ Add Category Group</h3>
              <form onSubmit={handleAddGroup} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. Subscriptions"
                  value={newGroup}
                  onChange={e => setNewGroup(e.target.value)}
                  style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Add Group
                </button>
              </form>
            </div>

            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 12px 0' }}>+ Add Envelope</h3>
              <form onSubmit={handleAddEnvelope} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Envelope Name (e.g., Internet)"
                  value={newEnvName}
                  onChange={e => setNewEnvName(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <select
                  value={newEnvGroup}
                  onChange={e => setNewEnvGroup(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="">Select Group...</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                <select
                  value={newEnvGoalType}
                  onChange={e => setNewEnvGoalType(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="none">No Specific Goal</option>
                  <option value="repeating">Repeating Target (Bill/Expense)</option>
                  <option value="target_by_date">Savings Target by Date</option>
                </select>

                {newEnvGoalType !== 'none' && (
                  <input
                    type="number"
                    placeholder="Target Amount ($)"
                    value={newEnvTargetAmount}
                    onChange={e => setNewEnvTargetAmount(e.target.value)}
                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                )}

                {newEnvGoalType === 'target_by_date' && (
                  <input
                    type="date"
                    value={newEnvTargetDate}
                    onChange={e => setNewEnvTargetDate(e.target.value)}
                    style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                )}

                {newEnvGoalType === 'repeating' && (
                  <>
                    <select
                      value={newEnvCadence}
                      onChange={e => setNewEnvCadence(e.target.value)}
                      style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 Weeks</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>

                    {(newEnvCadence === 'weekly' || newEnvCadence === 'biweekly') && (
                      <select
                        value={newEnvRepeatDayOfWeek}
                        onChange={e => setNewEnvRepeatDayOfWeek(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <option key={day} value={day}>Every {newEnvCadence === 'biweekly' ? '2 weeks on' : 'week on'} {day}</option>
                        ))}
                      </select>
                    )}

                    {newEnvCadence === 'monthly' && (
                      <select
                        value={newEnvRepeatDayOfMonth}
                        onChange={e => setNewEnvRepeatDayOfMonth(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={String(day)}>Day {day}{getOrdinalSuffix(day)} of the month</option>
                        ))}
                        <option value="last">Last day of the month</option>
                      </select>
                    )}

                    {newEnvCadence === 'yearly' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          value={newEnvRepeatMonth}
                          onChange={e => setNewEnvRepeatMonth(e.target.value)}
                          style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={newEnvRepeatDayOfMonth}
                          onChange={e => setNewEnvRepeatDayOfMonth(e.target.value)}
                          style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={String(day)}>{day}{getOrdinalSuffix(day)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>
                  Create Envelope
                </button>
              </form>
            </div>
          </div>

          {groups.map(group => {
            const groupEnvelopes = activeEnvelopes.filter(e => e.group === group);
            const isCollapsed = collapsedGroups[group];

            return (
              <div key={group} style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div
                  style={{ backgroundColor: '#e0e7ff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => toggleGroupCollapse(group)}
                >
                  <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '1.05rem' }}>
                    {isCollapsed ? '►' : '▼'} {group} ({groupEnvelopes.length})
                  <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{group}</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveGroup(group); }}
                      style={{ backgroundColor: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      Delete Group
                    </button>
                    <span>{isCollapsed ? '▼' : '▲'}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveGroup(group); }}
                    style={{ backgroundColor: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                  >
                    Delete Group
                  </button>
                </div>

                {!isCollapsed && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', backgroundColor: '#f9fafb' }}>
                          <th style={{ padding: '10px 12px' }}>Envelope</th>
                          <th style={{ padding: '10px 12px' }}>Target / Goal</th>
                          <th style={{ padding: '10px 12px', width: '140px' }}>Assigned ($)</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Spent ($)</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Available ($)</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupEnvelopes.length === 0 ? (
                          <tr><td colSpan="6" style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>No envelopes in this group.</td></tr>
                        ) : (
                          groupEnvelopes.map(env => {
                            const spent = getEnvelopeSpent(env.id);
                            const remaining = getEnvelopeRemaining(env);
                            return (
                              <tr key={env.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '10px 12px', fontWeight: '600' }}>{env.name}</td>
                                <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#4b5563' }}>
                                  {env.goalType === 'repeating' && (
                                    <span>${env.targetAmount} ({getScheduleText(env)})</span>
                                  )}
                                  {env.goalType === 'target_by_date' && (
                                    <span>Target: ${env.targetAmount} by {formatDate(env.targetDate, 'readable')}</span>
                                  )}
                                  {env.goalType === 'none' && <span style={{ color: '#9ca3af' }}>—</span>}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                  <div style={{ padding: '12px 16px' }}>
                    {groupEnvelopes.length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: '4px 0' }}>No envelopes in this group.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {groupEnvelopes.map(env => {
                          const spent = getEnvelopeSpent(env.id);
                          const remaining = getEnvelopeRemaining(env);

                          return (
                            <div key={env.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '8px' }}>
                              <div>
                                <div style={{ fontWeight: '600' }}>{env.name}</div>
                                {env.goalType !== 'none' && (
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {getScheduleText(env)} {env.targetAmount ? `(Target: $${env.targetAmount})` : ''}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.85rem' }}>
                                  Assigned: 
                                  <input
                                    type="number"
                                    step="0.01"
                                    step="1"
                                    value={env.assigned}
                                    onChange={e => handleAssignFunds(env.id, e.target.value)}
                                    style={{ width: '100px', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                    style={{ width: '70px', marginLeft: '4px', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                  />
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: spent > 0 ? '#dc2626' : '#6b7280' }}>
                                  ${spent.toFixed(2)}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: remaining < 0 ? '#dc2626' : '#16a34a' }}>
                                  ${remaining.toFixed(2)}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => handleSoftDeleteEnvelope(env.id)}
                                    style={{ backgroundColor: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                                </div>
                                <div style={{ fontSize: '0.85rem' }}>Spent: <strong>${spent.toFixed(2)}</strong></div>
                                <div style={{ fontSize: '0.85rem', color: remaining >= 0 ? '#059669' : '#dc2626' }}>
                                  Left: <strong>${remaining.toFixed(2)}</strong>
                                </div>
                                <button
                                  onClick={() => handleSoftDeleteEnvelope(env.id)}
                                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>+ Add Bank Account</h3>
            <form onSubmit={handleAddAccount} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Account Name (e.g. Chase Checking)"
                value={newAccName}
                onChange={e => setNewAccName(e.target.value)}
                style={{ flex: 2, minWidth: '200px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <select
                value={newAccType}
                onChange={e => setNewAccType(e.target.value)}
                style={{ flex: 1, minWidth: '120px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Initial Balance ($)"
                value={newAccBalance}
                onChange={e => setNewAccBalance(e.target.value)}
                style={{ flex: 1, minWidth: '120px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Add Account
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Your Bank Accounts</h3>
              <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>Total Assets: ${totalBankBalance.toFixed(2)}</div>
            </div>

            {activeAccounts.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center' }}>No accounts active.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeAccounts.map(acc => {
                  const currentBal = getAccountBalance(acc.id);
                  const clearedBal = getClearedBalance(acc.id);
                  const accTx = activeTransactions.filter(t => t.accountId === acc.id);
                  const isTxCollapsed = collapsedAccountTx[acc.id];
                  const isReconciling = reconcilingAccId === acc.id;

                  return (
                    <div key={acc.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', backgroundColor: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#111827' }}>
                            {acc.name} <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal' }}>({acc.type})</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                            Cleared: ${clearedBal.toFixed(2)} | Working Balance: <strong style={{ color: '#1e3a8a' }}>${currentBal.toFixed(2)}</strong>
                          </div>
                          {acc.lastReconciledDate && (
                            <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '2px' }}>
                              ✓ Last Reconciled: {formatDate(acc.lastReconciledDate, 'readable')} (${acc.lastReconciledBalance?.toFixed(2)})
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => startReconcile(acc.id)}
                            style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                          >
                            Reconcile
                          </button>
                          <button
                            onClick={() => handleSoftDeleteAccount(acc.id)}
                            style={{ backgroundColor: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Reconciliation Drawer */}
                      {isReconciling && (
                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                          <div style={{ fontWeight: 'bold', color: '#065f46', marginBottom: '8px', fontSize: '0.9rem' }}>
                            Reconcile Account: Enter Current Bank Statement Balance
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="number"
                              step="0.01"
                              value={targetBankBalance}
                              onChange={e => setTargetBankBalance(e.target.value)}
                              placeholder="Statement Balance ($)"
                              style={{ padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', flex: 1 }}
                            />
                            <button
                              onClick={() => handleFinishReconciliation(acc.id)}
                              style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Finish
                            </button>
                            <button
                              onClick={() => setReconcilingAccId(null)}
                              style={{ backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Account Transactions Accordion */}
                      <div style={{ marginTop: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
                        <div
                          onClick={() => toggleAccountTxCollapse(acc.id)}
                          style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#2563eb', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}
                        >
                          <span>{isTxCollapsed ? 'Show' : 'Hide'} Recent Activity ({accTx.length})</span>
                        </div>

                        {!isTxCollapsed && accTx.length > 0 && (
                          <div style={{ marginTop: '8px', overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', textAlign: 'left' }}>
                                  <th style={{ padding: '4px' }}>Cleared</th>
                                  <th style={{ padding: '4px' }}>Date</th>
                                  <th style={{ padding: '4px' }}>Payee</th>
                                  <th style={{ padding: '4px', textAlign: 'right' }}>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {accTx.map(t => (
                                  <tr key={t.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                    <td style={{ padding: '4px' }}>
                                      <input
                                        type="checkbox"
                                        checked={t.cleared || t.reconciled}
                                        disabled={t.reconciled}
                                        onChange={() => handleToggleCleared(t.id)}
                                      />
                                      {t.reconciled && <span style={{ color: '#059669', marginLeft: '4px', fontSize: '0.75rem' }}>✓</span>}
                                    </td>
                                    <td style={{ padding: '4px', color: '#6b7280' }}>{formatDate(t.date, 'us')}</td>
                                    <td style={{ padding: '4px' }}>{t.payee}</td>
                                    <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold', color: t.type === 'income' ? '#16a34a' : '#dc2626' }}>
                                      {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
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
          </div>
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>+ Record Transaction</h3>
            <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <input
                type="date"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <input
                type="text"
                placeholder="Payee/Source"
                placeholder="Payee (e.g. Grocery Store)"
                value={txPayee}
                onChange={e => handlePayeeChange(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount ($)"
                value={txAmount}
                onChange={e => setTxAmount(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <select
                value={txType}
                onChange={e => setTxType(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option value="expense">Expense (-)</option>
                <option value="income">Income (+)</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select
                value={txAccountId}
                onChange={e => setTxAccountId(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option value="">Select Account...</option>
                {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                {activeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>

              {txType === 'expense' && (
                <select
                  value={txEnvelopeId}
                  onChange={e => setTxEnvelopeId(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="">Unassigned / General</option>
                  {activeEnvelopes.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
                  <option value="">Select Envelope...</option>
                  {activeEnvelopes.map(env => <option key={env.id} value={env.id}>{env.name} ({env.group})</option>)}
                </select>
              )}

              <input
                type="text"
                placeholder="Notes (optional)"
                value={txNotes}
                onChange={e => setTxNotes(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', gridColumn: 'span 2' }}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', gridColumn: '1 / -1' }}
              />

              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Add Transaction
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', gridColumn: '1 / -1' }}>
                Save Transaction
              </button>
            </form>
          </div>

          {/* Grouped Transaction History */}
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Transaction Ledger</h3>

            <h3 style={{ margin: '0 0 12px 0' }}>All Transactions</h3>
            {sortedTransactionDates.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center' }}>No transactions logged.</p>
              <p style={{ color: '#9ca3af' }}>No transactions recorded yet.</p>
            ) : (
              sortedTransactionDates.map(dateKey => (
                <div key={dateKey} style={{ marginBottom: '16px' }}>
                  <div style={{ backgroundColor: '#f3f4f6', padding: '6px 12px', fontWeight: 'bold', borderRadius: '4px', fontSize: '0.85rem', color: '#4b5563', marginBottom: '6px' }}>
                    {formatDate(dateKey, 'readable')}
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#6b7280', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '8px' }}>
                    {formatDate(dateKey, 'us')}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <tbody>
                        {groupedTransactions[dateKey].map(tx => {
                          const acc = accounts.find(a => a.id === tx.accountId);
                          const env = envelopes.find(e => e.id === tx.envelopeId);

                          return (
                            <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '8px', width: '30px' }}>
                                <input
                                  type="checkbox"
                                  checked={tx.cleared || tx.reconciled}
                                  disabled={tx.reconciled}
                                  onChange={() => handleToggleCleared(tx.id)}
                                />
                              </td>
                              <td style={{ padding: '8px', fontWeight: '600' }}>
                                {tx.payee}
                                {tx.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{tx.notes}</div>}
                              </td>
                              <td style={{ padding: '8px', fontSize: '0.8rem', color: '#4b5563' }}>
                                {acc ? acc.name : 'Unknown Account'}
                                {env && <span style={{ marginLeft: '6px', backgroundColor: '#e0e7ff', color: '#1e3a8a', padding: '2px 6px', borderRadius: '4px' }}>{env.name}</span>}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: tx.type === 'income' ? '#16a34a' : '#dc2626' }}>
                                {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', width: '60px' }}>
                                <button
                                  onClick={() => handleSoftDeleteTransaction(tx.id)}
                                  style={{ backgroundColor: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {groupedTransactions[dateKey].map(tx => {
                      const acc = accounts.find(a => a.id === tx.accountId);
                      const env = envelopes.find(e => e.id === tx.envelopeId);

                      return (
                        <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Green / Grey C Toggle */}
                            <span
                              onClick={() => handleToggleCleared(tx.id)}
                              title={tx.cleared ? "Cleared" : "Not Cleared"}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                cursor: 'pointer',
                                backgroundColor: tx.cleared ? '#DEF7EC' : '#F3F4F6',
                                color: tx.cleared ? '#03543F' : '#9CA3AF',
                                border: tx.cleared ? '1px solid #84E1BC' : '1px solid #D1D5DB'
                              }}
                            >
                              C
                            </span>
                            <div>
                              <div style={{ fontWeight: '600' }}>{tx.payee}</div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {acc?.name} {env ? `• ${env.name}` : ''} {tx.notes ? `• ${tx.notes}` : ''}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: tx.type === 'income' ? '#059669' : '#dc2626' }}>
                              {tx.type === 'income' ? `+$${Number(tx.amount).toFixed(2)}` : `-$${Number(tx.amount).toFixed(2)}`}
                            </div>
                            <button
                              onClick={() => handleSoftDeleteTransaction(tx.id)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* DEBTS TAB */}
      {activeTab === 'debts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>+ Track Debt / Loan</h3>
            <form onSubmit={handleAddDebt} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>+ Track Debt</h3>
            <form onSubmit={handleAddDebt} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Debt Name (e.g. Visa)"
                placeholder="Debt Name (e.g. Car Loan)"
                value={newDebtName}
                onChange={e => setNewDebtName(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                style={{ flex: 2, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Total Balance ($)"
                placeholder="Balance ($)"
                value={newDebtTotal}
                onChange={e => setNewDebtTotal(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="APR (%)"
                value={newDebtAPR}
                onChange={e => setNewDebtAPR(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Min Payment ($)"
                value={newDebtMin}
                onChange={e => setNewDebtMin(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Track Debt
                Add Debt
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Debt Payoff Overview</h3>
            <h3 style={{ margin: '0 0 12px 0' }}>Your Debts</h3>
            {activeDebts.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center' }}>No debts currently tracked.</p>
              <p style={{ color: '#9ca3af' }}>No active debts tracked.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeDebts.map(debt => (
                  <div key={debt.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', backgroundColor: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, color: '#111827' }}>{debt.name}</h4>
                  <div key={debt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{debt.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        APR: {debt.APR}% | Min Payment: ${debt.minimumPayment}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ fontWeight: 'bold', color: '#dc2626' }}>${Number(debt.balance).toFixed(2)}</div>
                      <button
                        onClick={() => handleSoftDeleteDebt(debt.id)}
                        style={{ backgroundColor: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#dc2626', margin: '8px 0' }}>
                      ${Number(debt.balance).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                      APR: {debt.APR}% | Min Payment: ${Number(debt.minimumPayment).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRASH TAB */}
      {activeTab === 'trash' && (
        <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Trash / Deleted Items</h3>

          <h3 style={{ margin: '0 0 12px 0' }}>Trash / Deleted Items</h3>
          {totalTrashCount === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center' }}>Trash is empty.</p>
            <p style={{ color: '#9ca3af' }}>Trash is empty.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {deletedTx.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Transactions</h4>
                  {deletedTx.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                      <span>{t.payee} (${Number(t.amount).toFixed(2)})</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => restoreItem('tx', t.id)} style={{ color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer' }}>Restore</button>
                        <button onClick={() => permDeleteItem('tx', t.id)} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}>Delete Permanently</button>
                      </div>
                    </div>
                  ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deletedTx.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <span>Transaction: {t.payee} (${t.amount})</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => restoreItem('tx', t.id)} style={{ padding: '4px 8px', backgroundColor: '#e0e7ff', color: '#1e3a8a', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Restore</button>
                    <button onClick={() => permDeleteItem('tx', t.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete Permanently</button>
                  </div>
                </div>
              )}

              {deletedEnv.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Envelopes</h4>
                  {deletedEnv.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                      <span>{e.name} ({e.group})</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => restoreItem('env', e.id)} style={{ color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer' }}>Restore</button>
                        <button onClick={() => permDeleteItem('env', e.id)} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}>Delete Permanently</button>
                      </div>
                    </div>
                  ))}
              ))}
              {deletedEnv.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <span>Envelope: {e.name}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => restoreItem('env', e.id)} style={{ padding: '4px 8px', backgroundColor: '#e0e7ff', color: '#1e3a8a', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Restore</button>
                    <button onClick={() => permDeleteItem('env', e.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete Permanently</button>
                  </div>
                </div>
              )}

              {deletedAcc.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Accounts</h4>
                  {deletedAcc.map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                      <span>{a.name} ({a.type})</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => restoreItem('acc', a.id)} style={{ color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer' }}>Restore</button>
                        <button onClick={() => permDeleteItem('acc', a.id)} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}>Delete Permanently</button>
                      </div>
                    </div>
                  ))}
              ))}
              {deletedAcc.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <span>Account: {a.name}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => restoreItem('acc', a.id)} style={{ padding: '4px 8px', backgroundColor: '#e0e7ff', color: '#1e3a8a', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Restore</button>
                    <button onClick={() => permDeleteItem('acc', a.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete Permanently</button>
                  </div>
                </div>
              )}

              {deletedDebts.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Debts</h4>
                  {deletedDebts.map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                      <span>{d.name} (${Number(d.balance).toFixed(2)})</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => restoreItem('debt', d.id)} style={{ color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer' }}>Restore</button>
                        <button onClick={() => permDeleteItem('debt', d.id)} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}>Delete Permanently</button>
                      </div>
                    </div>
                  ))}
              ))}
              {deletedDebts.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <span>Debt: {d.name}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => restoreItem('debt', d.id)} style={{ padding: '4px 8px', backgroundColor: '#e0e7ff', color: '#1e3a8a', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Restore</button>
                    <button onClick={() => permDeleteItem('debt', d.id)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete Permanently</button>
                  </div>
                </div>
              )}
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
