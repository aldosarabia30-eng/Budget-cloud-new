import React, { useState, useEffect } from 'react';

// Helper to format YYYY-MM-DD into DD/MM/YYYY for display
const formatDateDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

// Helper for ordinal numbers (1st, 2nd, 3rd, 4th...)
const getOrdinalSuffix = (num) => {
  const n = Number(num);
  if (isNaN(n)) return '';
  if (n > 3 && n < 21) return 'th';
  switch (n % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
};

// Helper for formatting schedule text
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
  const STORAGE_KEY = 'envelope_budget_app_data';

  // --- STATE DEFINITIONS ---
  const [readyToAssign, setReadyToAssign] = useState(1250.00);
  
  const [accounts, setAccounts] = useState([
    { id: 'acc-1', name: 'Checking Account', type: 'Checking', initialBalance: 2000, isDeleted: false },
    { id: 'acc-2', name: 'Savings Account', type: 'Savings', initialBalance: 5000, isDeleted: false }
  ]);

  const [groups, setGroups] = useState(['Housing & Utilities', 'Daily Living', 'Savings Goals']);
  
  // Track collapsed state for envelope groups
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const [envelopes, setEnvelopes] = useState([
    { id: 'env-1', name: 'Rent/Mortgage', group: 'Housing & Utilities', assigned: 1000, isDeleted: false, goalType: 'repeating', targetAmount: 1000, cadence: 'monthly', repeatDayOfMonth: '1', targetDate: '' },
    { id: 'env-2', name: 'Electric & Gas', group: 'Housing & Utilities', assigned: 150, isDeleted: false, goalType: 'repeating', targetAmount: 150, cadence: 'monthly', repeatDayOfMonth: '15', targetDate: '' },
    { id: 'env-3', name: 'Groceries', group: 'Daily Living', assigned: 400, isDeleted: false, goalType: 'repeating', targetAmount: 500, cadence: 'weekly', repeatDayOfWeek: 'Friday', targetDate: '' },
    { id: 'env-4', name: 'Dining Out', group: 'Daily Living', assigned: 150, isDeleted: false, goalType: 'none', targetAmount: 0, cadence: 'monthly', targetDate: '' },
    { id: 'env-5', name: 'Emergency Fund', group: 'Savings Goals', assigned: 300, isDeleted: false, goalType: 'target_by_date', targetAmount: 5000, targetDate: '2026-12-31', cadence: 'monthly' }
  ]);

  const [transactions, setTransactions] = useState([
    { id: 'tx-1', date: '2026-09-15', payee: 'Landlord Co.', amount: 1000, type: 'expense', accountId: 'acc-1', envelopeId: 'env-1', notes: 'Monthly rent', isDeleted: false },
    { id: 'tx-2', date: '2026-09-18', payee: 'Trader Joe\'s', amount: 125.50, type: 'expense', accountId: 'acc-1', envelopeId: 'env-3', notes: 'Weekly groceries', isDeleted: false },
    { id: 'tx-3', date: '2026-09-25', payee: 'Employer Inc.', amount: 2500, type: 'income', accountId: 'acc-1', envelopeId: '', notes: 'Bi-weekly Paycheck', isDeleted: false },
    { id: 'tx-4', date: '2026-09-25', payee: 'Coffee Shop', amount: 4.75, type: 'expense', accountId: 'acc-1', envelopeId: 'env-4', notes: 'Morning latte', isDeleted: false }
  ]);

  const [debts, setDebts] = useState([
    { id: 'd-1', name: 'Credit Card', totalAmount: 3000, balance: 2100, APR: 19.99, minimumPayment: 75, isDeleted: false }
  ]);

  const [activeTab, setActiveTab] = useState('budget');
  const [notification, setNotification] = useState('');

  // Form States
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
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txNotes, setTxNotes] = useState('');

  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtTotal, setNewDebtTotal] = useState('');
  const [newDebtAPR, setNewDebtAPR] = useState('');
  const [newDebtMin, setNewDebtMin] = useState('');

  // --- PERSISTENCE: LOCALSTORAGE ---
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.readyToAssign !== undefined) setReadyToAssign(parsed.readyToAssign);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.groups) setGroups(parsed.groups);
        if (parsed.collapsedGroups) setCollapsedGroups(parsed.collapsedGroups);
        if (parsed.envelopes) setEnvelopes(parsed.envelopes);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.debts) setDebts(parsed.debts);
      }
    } catch (e) {
      console.error('Failed to load budget data from localStorage', e);
    }
  }, []);

  useEffect(() => {
    const dataToSave = {
      readyToAssign,
      accounts,
      groups,
      collapsedGroups,
      envelopes,
      transactions,
      debts
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [readyToAssign, accounts, groups, collapsedGroups, envelopes, transactions, debts]);

  // --- NOTIFICATION HELPER ---
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // --- COLLAPSE TOGGLE HELPER ---
  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // --- DERIVED CALCULATIONS ---
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

  const getEnvelopeSpent = (envId) => {
    return activeTransactions
      .filter(t => t.envelopeId === envId && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getEnvelopeRemaining = (env) => {
    return Number(env.assigned) - getEnvelopeSpent(env.id);
  };

  const totalBankBalance = activeAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);

  // Group active transactions by date
  const groupedTransactions = activeTransactions.reduce((acc, tx) => {
    const dateKey = tx.date || 'No Date';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(tx);
    return acc;
  }, {});

  // Sort dates descending
  const sortedTransactionDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b) - new Date(a));

  // --- HANDLERS ---
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
    setEnvelopes(envelopes.map(env => 
      env.group === groupName ? { ...env, isDeleted: true } : env
    ));
    showNotification(`Group '${groupName}' deleted. $${refundedAmount.toFixed(2)} refunded to Ready to Assign.`);
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
    setNewEnvCadence('monthly');
    setNewEnvRepeatDayOfWeek('Monday');
    setNewEnvRepeatDayOfMonth('1');
    setNewEnvRepeatMonth('January');
    showNotification(`Envelope '${newEnv.name}' created.`);
  };

  const handleAssignFunds = (envId, newAssignedAmount) => {
    const env = envelopes.find(e => e.id === envId);
    if (!env) return;
    const diff = Number(newAssignedAmount) - Number(env.assigned);
    setReadyToAssign(prev => prev - diff);
    setEnvelopes(envelopes.map(e => e.id === envId ? { ...e, assigned: Number(newAssignedAmount) } : e));
  };

  const handleSoftDeleteEnvelope = (envId) => {
    const env = envelopes.find(e => e.id === envId);
    if (!env) return;
    setReadyToAssign(prev => prev + Number(env.assigned));
    setEnvelopes(envelopes.map(e => e.id === envId ? { ...e, isDeleted: true, assigned: 0 } : e));
    showNotification(`Envelope '${env.name}' deleted. $${Number(env.assigned).toFixed(2)} refunded.`);
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccBalance) return;
    const newAcc = {
      id: 'acc-' + Date.now(),
      name: newAccName.trim(),
      type: newAccType,
      initialBalance: parseFloat(newAccBalance) || 0,
      isDeleted: false
    };
    setAccounts([...accounts, newAcc]);
    setReadyToAssign(prev => prev + newAcc.initialBalance);
    setNewAccName('');
    setNewAccBalance('');
    showNotification(`Account '${newAcc.name}' added.`);
  };

  const handleSoftDeleteAccount = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    setAccounts(accounts.map(a => a.id === accId ? { ...a, isDeleted: true } : a));
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
      date: txDate,
      payee: txPayee.trim(),
      amount: amt,
      type: txType,
      accountId: txAccountId,
      envelopeId: txType === 'expense' ? txEnvelopeId : '',
      notes: txNotes,
      isDeleted: false
    };

    setTransactions([newTx, ...transactions]);

    if (txType === 'income') {
      setReadyToAssign(prev => prev + amt);
      showNotification(`Income of $${amt.toFixed(2)} added to Ready to Assign.`);
    } else {
      showNotification(`Expense of $${amt.toFixed(2)} recorded.`);
    }

    setTxPayee('');
    setTxAmount('');
    setTxNotes('');
  };

  const handleSoftDeleteTransaction = (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    if (tx.type === 'income') {
      setReadyToAssign(prev => prev - tx.amount);
    }
    setTransactions(transactions.map(t => t.id === txId ? { ...t, isDeleted: true } : t));
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
    setDebts(debts.map(d => d.id === debtId ? { ...d, isDeleted: true } : d));
    showNotification('Debt moved to Trash.');
  };

  // Trash Bin Handlers
  const handleRestoreTransaction = (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    if (tx.type === 'income') {
      setReadyToAssign(prev => prev + tx.amount);
    }
    setTransactions(transactions.map(t => t.id === txId ? { ...t, isDeleted: false } : t));
    showNotification('Transaction restored.');
  };

  const handlePermanentDeleteTransaction = (txId) => {
    setTransactions(transactions.filter(t => t.id !== txId));
    showNotification('Transaction permanently deleted.');
  };

  const handleRestoreEnvelope = (envId) => {
    setEnvelopes(envelopes.map(e => e.id === envId ? { ...e, isDeleted: false } : e));
    showNotification('Envelope restored.');
  };

  const handlePermanentDeleteEnvelope = (envId) => {
    setEnvelopes(envelopes.filter(e => e.id !== envId));
    showNotification('Envelope permanently deleted.');
  };

  const handleRestoreAccount = (accId) => {
    setAccounts(accounts.map(a => a.id === accId ? { ...a, isDeleted: false } : a));
    showNotification('Account restored.');
  };

  const handlePermanentDeleteAccount = (accId) => {
    setAccounts(accounts.filter(a => a.id !== accId));
    showNotification('Account permanently deleted.');
  };

  const handleRestoreDebt = (debtId) => {
    setDebts(debts.map(d => d.id === debtId ? { ...d, isDeleted: false } : d));
    showNotification('Debt restored.');
  };

  const handlePermanentDeleteDebt = (debtId) => {
    setDebts(debts.filter(d => d.id !== debtId));
    showNotification('Debt permanently deleted.');
  };

  const handleEmptyTrash = () => {
    setTransactions(transactions.filter(t => !t.isDeleted));
    setEnvelopes(envelopes.filter(e => !e.isDeleted));
    setAccounts(accounts.filter(a => !a.isDeleted));
    setDebts(debts.filter(d => !d.isDeleted));
    showNotification('Trash bin emptied.');
  };

  const deletedTx = transactions.filter(t => t.isDeleted);
  const deletedEnv = envelopes.filter(e => e.isDeleted);
  const deletedAcc = accounts.filter(a => a.isDeleted);
  const deletedDebts = debts.filter(d => d.isDeleted);
  const totalTrashCount = deletedTx.length + deletedEnv.length + deletedAcc.length + deletedDebts.length;

  // --- GOAL PROGRESS DISPLAY ---
  const renderGoalProgress = (env) => {
    if (!env.goalType || env.goalType === 'none' || !env.targetAmount) return null;

    const available = getEnvelopeRemaining(env);
    const target = Number(env.targetAmount) || 0;
    const amountLeft = Math.max(0, target - available);
    const percent = Math.min(100, Math.max(0, (available / target) * 100));

    if (env.goalType === 'target_by_date') {
      const today = new Date();
      const targetD = env.targetDate ? new Date(env.targetDate) : today;
      const monthsDiff = (targetD.getFullYear() - today.getFullYear()) * 12 + (targetD.getMonth() - today.getMonth());
      const monthlyNeeded = monthsDiff > 0 ? amountLeft / monthsDiff : amountLeft;

      return (
        <div style={{ marginTop: '10px', fontSize: '0.825rem', backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span>🎯 Target Goal: <strong>${target.toFixed(2)}</strong> by {formatDateDMY(env.targetDate) || 'Target Date'}</span>
            <span style={{ fontWeight: '700', color: amountLeft === 0 ? '#059669' : '#dc2626' }}>
              {amountLeft === 0 ? '🎉 Goal Reached!' : `$${amountLeft.toFixed(2)} left to goal`}
            </span>
          </div>

          <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${percent}%`, backgroundColor: percent >= 100 ? '#10b981' : '#2563eb', height: '100%', transition: 'width 0.3s ease' }} />
          </div>

          <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
            <span>Progress: {percent.toFixed(0)}% (${available.toFixed(2)} saved)</span>
            {amountLeft > 0 && monthsDiff > 0 && (
              <span style={{ fontWeight: '600', color: '#1e3a8a' }}>Need ~${monthlyNeeded.toFixed(2)}/mo ({monthsDiff} mos remaining)</span>
            )}
          </div>
        </div>
      );
    }

    if (env.goalType === 'repeating') {
      const scheduleText = getScheduleText(env);
      return (
        <div style={{ marginTop: '10px', fontSize: '0.825rem', backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span>🔄 Refill Target: <strong>${target.toFixed(2)}</strong> <span style={{ color: '#4b5563', fontStyle: 'italic' }}>({scheduleText})</span></span>
            <span style={{ fontWeight: '700', color: amountLeft === 0 ? '#059669' : '#d97706' }}>
              {amountLeft === 0 ? '✓ Fully Funded' : `$${amountLeft.toFixed(2)} needed to refill`}
            </span>
          </div>

          <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${percent}%`, backgroundColor: percent >= 100 ? '#10b981' : '#f59e0b', height: '100%', transition: 'width 0.3s ease' }} />
          </div>

          <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Funding: {percent.toFixed(0)}%</span>
            <span>{amountLeft === 0 ? 'Goal fully met for this period' : `$${amountLeft.toFixed(2)} remaining to hit target`}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '16px', color: '#1f2937', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      {/* Header Banner */}
      <header style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700' }}>Envelope Budgeting</h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.85, fontSize: '0.9rem' }}>Real-time Cash Flow & Goal Tracking</p>
          </div>
          <div style={{ textAlign: 'right', backgroundColor: '#3b82f6', padding: '10px 16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ready to Assign</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>${readyToAssign.toFixed(2)}</div>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {notification && (
        <div style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {notification}
        </div>
      )}

      {/* Navigation Tabs */}
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
              color: activeTab === tab ? '#ffffff' : '#4b5563',
              boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {tab === 'trash' ? `Trash (${totalTrashCount})` : tab}
          </button>
        ))}
      </nav>

      {/* TAB 1: BUDGET / ENVELOPES */}
      {activeTab === 'budget' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            
            {/* Create Group */}
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>+ Create Group</h3>
              <form onSubmit={handleAddGroup} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. Bills, Savings"
                  value={newGroup}
                  onChange={e => setNewGroup(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                  Add
                </button>
              </form>
            </div>

            {/* Create Envelope with Goal */}
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>+ Create Envelope with Goal</h3>
              <form onSubmit={handleAddEnvelope} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Envelope Name"
                    value={newEnvName}
                    onChange={e => setNewEnvName(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                  <select
                    value={newEnvGroup}
                    onChange={e => setNewEnvGroup(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="">Select Group...</option>
                    {groups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <select
                  value={newEnvGoalType}
                  onChange={e => setNewEnvGoalType(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="none">No Specific Goal</option>
                  <option value="target_by_date">Target Amount by Date (e.g. Save $X by Date)</option>
                  <option value="repeating">Repeating Target (e.g. Refill $X every week/month/year)</option>
                </select>

                {newEnvGoalType === 'target_by_date' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="Target Amount ($)"
                      value={newEnvTargetAmount}
                      onChange={e => setNewEnvTargetAmount(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                    <input
                      type="date"
                      value={newEnvTargetDate}
                      onChange={e => setNewEnvTargetDate(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </div>
                )}

                {/* Granular Schedule Selection for Repeating Targets */}
                {newEnvGoalType === 'repeating' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        placeholder="Amount ($)"
                        value={newEnvTargetAmount}
                        onChange={e => setNewEnvTargetAmount(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      />
                      <select
                        value={newEnvCadence}
                        onChange={e => setNewEnvCadence(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                      >
                        <option value="weekly">Every Week</option>
                        <option value="biweekly">Every 2 Weeks</option>
                        <option value="monthly">Every Month</option>
                        <option value="yearly">Every Year</option>
                      </select>
                    </div>

                    {/* Sub-controls based on chosen Cadence */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {(newEnvCadence === 'weekly' || newEnvCadence === 'biweekly') && (
                        <select
                          value={newEnvRepeatDayOfWeek}
                          onChange={e => setNewEnvRepeatDayOfWeek(e.target.value)}
                          style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        >
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                            <option key={day} value={day}>Repeat on {day}s</option>
                          ))}
                        </select>
                      )}

                      {newEnvCadence === 'monthly' && (
                        <select
                          value={newEnvRepeatDayOfMonth}
                          onChange={e => setNewEnvRepeatDayOfMonth(e.target.value)}
                          style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={day}>Repeat on the {day}{getOrdinalSuffix(day)}</option>
                          ))}
                          <option value="last">Repeat on Last Day of Month</option>
                        </select>
                      )}

                      {newEnvCadence === 'yearly' && (
                        <>
                          <select
                            value={newEnvRepeatMonth}
                            onChange={e => setNewEnvRepeatMonth(e.target.value)}
                            style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                          >
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <select
                            value={newEnvRepeatDayOfMonth}
                            onChange={e => setNewEnvRepeatDayOfMonth(e.target.value)}
                            style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <option key={day} value={day}>{day}{getOrdinalSuffix(day)}</option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginTop: '4px' }}>
                  Create Envelope
                </button>
              </form>
            </div>

          </div>

          {groups.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center' }}>No groups created yet.</p>
          ) : (
            groups.map(groupName => {
              const isCollapsed = !!collapsedGroups[groupName];
              const groupEnvs = activeEnvelopes.filter(e => e.group === groupName);
              const groupAssigned = groupEnvs.reduce((sum, e) => sum + Number(e.assigned), 0);
              const groupSpent = groupEnvs.reduce((sum, e) => sum + getEnvelopeSpent(e.id), 0);
              const groupAvailable = groupAssigned - groupSpent;

              return (
                <div key={groupName} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  {/* Group Header with Collapse Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? '0' : '12px', borderBottom: isCollapsed ? 'none' : '1px solid #f3f4f6', paddingBottom: isCollapsed ? '0' : '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => toggleGroupCollapse(groupName)}
                        style={{ backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '4px 8px', fontSize: '0.85rem', color: '#374151', fontWeight: 'bold' }}
                        title={isCollapsed ? "Expand Group" : "Collapse Group"}
                      >
                        {isCollapsed ? '▶ Expand' : '▼ Collapse'}
                      </button>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => toggleGroupCollapse(groupName)}>
                          {groupName}
                        </h2>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                          Available: <strong style={{ color: groupAvailable >= 0 ? '#10b981' : '#ef4444' }}>${groupAvailable.toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveGroup(groupName)}
                      style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Delete Group
                    </button>
                  </div>

                  {/* Envelope Cards (Visible only when not collapsed) */}
                  {!isCollapsed && (
                    groupEnvs.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '8px' }}>No envelopes in this group.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        {groupEnvs.map(env => {
                          const spent = getEnvelopeSpent(env.id);
                          const remaining = getEnvelopeRemaining(env);
                          const targetAmt = Number(env.targetAmount) || 0;
                          const leftToGoal = Math.max(0, targetAmt - remaining);

                          return (
                            <div key={env.id} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <div style={{ minWidth: '160px' }}>
                                  <strong>{env.name}</strong>
                                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                    Activity: ${spent.toFixed(2)}
                                  </div>
                                  {env.goalType && env.goalType !== 'none' && targetAmt > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: leftToGoal === 0 ? '#059669' : '#dc2626', fontWeight: '600', marginTop: '2px' }}>
                                      {leftToGoal === 0 ? '✓ Goal reached' : `Left to Goal: $${leftToGoal.toFixed(2)}`}
                                    </div>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div>
                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Assigned</label>
                                    <input
                                      type="number"
                                      value={env.assigned}
                                      onChange={e => handleAssignFunds(env.id, e.target.value)}
                                      style={{ width: '90px', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                    />
                                  </div>

                                  <div style={{ textAlign: 'right', minWidth: '90px' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Available</div>
                                    <div style={{ fontWeight: 'bold', color: remaining >= 0 ? '#059669' : '#dc2626' }}>
                                      ${remaining.toFixed(2)}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleSoftDeleteEnvelope(env.id)}
                                    style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Delete Envelope"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {/* Render Goal Progress Bar & Schedule Breakdown */}
                              {renderGoalProgress(env)}
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div>
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>+ Add Account</h3>
            <form onSubmit={handleAddAccount} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <input
                type="text"
                placeholder="Account Name"
                value={newAccName}
                onChange={e => setNewAccName(e.target.value)}
                style={{ flex: '1 1 200px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <select
                value={newAccType}
                onChange={e => setNewAccType(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
              </select>
              <input
                type="number"
                placeholder="Starting Balance"
                value={newAccBalance}
                onChange={e => setNewAccBalance(e.target.value)}
                style={{ width: '140px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                Add Account
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Active Accounts</h3>
              <strong style={{ color: '#1e3a8a' }}>Total: ${totalBankBalance.toFixed(2)}</strong>
            </div>

            {activeAccounts.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No active accounts.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeAccounts.map(acc => {
                  const currentBal = getAccountBalance(acc.id);
                  return (
                    <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <div>
                        <strong>{acc.name}</strong>
                        <span style={{ marginLeft: '8px', fontSize: '0.8rem', backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '12px' }}>{acc.type}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontWeight: 'bold', color: currentBal >= 0 ? '#111827' : '#dc2626' }}>
                          ${currentBal.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleSoftDeleteAccount(acc.id)}
                          style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Trash
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div>
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>+ Record Transaction</h3>
            <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <select value={txType} onChange={e => setTxType(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 'bold' }}>
                <option value="expense">Expense (-)</option>
                <option value="income">Income (+)</option>
              </select>

              <input
                type="date"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />

              <input
                type="text"
                placeholder="Payee / Source"
                value={txPayee}
                onChange={e => handlePayeeChange(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />

              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={txAmount}
                onChange={e => setTxAmount(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />

              <select value={txAccountId} onChange={e => setTxAccountId(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <option value="">Select Account...</option>
                {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              {txType === 'expense' && (
                <select value={txEnvelopeId} onChange={e => setTxEnvelopeId(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="">Select Envelope...</option>
                  {activeEnvelopes.map(e => <option key={e.id} value={e.id}>{e.name} ({e.group})</option>)}
                </select>
              )}

              <input
                type="text"
                placeholder="Notes (optional)"
                value={txNotes}
                onChange={e => setTxNotes(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />

              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', gridColumn: '1 / -1' }}>
                Submit Transaction
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Transaction Register</h3>
            {activeTransactions.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No active transactions recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Render Transactions Grouped by Date */}
                {sortedTransactionDates.map(dateKey => {
                  const txsForDate = groupedTransactions[dateKey];
                  const dayNet = txsForDate.reduce((sum, tx) => sum + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)), 0);

                  return (
                    <div key={dateKey} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ backgroundColor: '#f3f4f6', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600' }}>
                        <span style={{ color: '#1f2937' }}>📅 {formatDateDMY(dateKey)}</span>
                        <span style={{ fontSize: '0.85rem', color: dayNet >= 0 ? '#059669' : '#dc2626' }}>
                          Net: {dayNet >= 0 ? '+' : ''}${dayNet.toFixed(2)}
                        </span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', backgroundColor: '#fafafa' }}>
                              <th style={{ padding: '8px 12px' }}>Payee</th>
                              <th style={{ padding: '8px 12px' }}>Account</th>
                              <th style={{ padding: '8px 12px' }}>Envelope</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {txsForDate.map(tx => {
                              const acc = accounts.find(a => a.id === tx.accountId);
                              const env = envelopes.find(e => e.id === tx.envelopeId);
                              return (
                                <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                  <td style={{ padding: '8px 12px' }}>
                                    <strong>{tx.payee}</strong>
                                    {tx.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{tx.notes}</div>}
                                  </td>
                                  <td style={{ padding: '8px 12px' }}>{acc?.name || '—'}</td>
                                  <td style={{ padding: '8px 12px' }}>
                                    {tx.type === 'income' ? <em style={{ color: '#10b981' }}>Ready to Assign</em> : (env?.name || 'Uncategorized')}
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: tx.type === 'income' ? '#10b981' : '#111827' }}>
                                    {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                    <button
                                      onClick={() => handleSoftDeleteTransaction(tx.id)}
                                      style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                      Trash
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DEBTS */}
      {activeTab === 'debts' && (
        <div>
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>+ Track New Debt</h3>
            <form onSubmit={handleAddDebt} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <input
                type="text"
                placeholder="Debt Name (e.g. Visa Card)"
                value={newDebtName}
                onChange={e => setNewDebtName(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <input
                type="number"
                placeholder="Total Balance Owed"
                value={newDebtTotal}
                onChange={e => setNewDebtTotal(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="APR %"
                value={newDebtAPR}
                onChange={e => setNewDebtAPR(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <input
                type="number"
                placeholder="Min Monthly Payment"
                value={newDebtMin}
                onChange={e => setNewDebtMin(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', gridColumn: '1 / -1' }}>
                Add Debt
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>Active Debts</h3>
            {activeDebts.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No active debts tracked.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {activeDebts.map(d => (
                  <div key={d.id} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>{d.name}</strong>
                      <button onClick={() => handleSoftDeleteDebt(d.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                        Trash
                      </button>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>Balance: <strong style={{ color: '#dc2626' }}>${Number(d.balance).toFixed(2)}</strong></div>
                    <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>APR: {d.APR}%</div>
                    <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>Min Payment: ${Number(d.minimumPayment).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TRASH BIN */}
      {activeTab === 'trash' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Trash Bin ({totalTrashCount})</h3>
            {totalTrashCount > 0 && (
              <button
                onClick={handleEmptyTrash}
                style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Empty Trash
              </button>
            )}
          </div>

          {totalTrashCount === 0 ? (
            <p style={{ color: '#6b7280' }}>Trash is currently empty.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {deletedTx.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Deleted Transactions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {deletedTx.map(tx => (
                      <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{tx.payee}</strong> - ${tx.amount} ({formatDateDMY(tx.date)})
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleRestoreTransaction(tx.id)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                            Restore
                          </button>
                          <button onClick={() => handlePermanentDeleteTransaction(tx.id)} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                            Purge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deletedEnv.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Deleted Envelopes</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {deletedEnv.map(env => (
                      <div key={env.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{env.name}</strong> ({env.group})
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleRestoreEnvelope(env.id)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                            Restore
                          </button>
                          <button onClick={() => handlePermanentDeleteEnvelope(env.id)} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                            Purge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deletedAcc.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Deleted Accounts</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {deletedAcc.map(acc => (
                      <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{acc.name}</strong> ({acc.type})
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleRestoreAccount(acc.id)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                            Restore
                          </button>
                          <button onClick={() => handlePermanentDeleteAccount(acc.id)} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                            Purge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deletedDebts.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Deleted Debts</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {deletedDebts.map(d => (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{d.name}</strong> - ${d.balance}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleRestoreDebt(d.id)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                            Restore
                          </button>
                          <button onClick={() => handlePermanentDeleteDebt(d.id)} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                            Purge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
}
