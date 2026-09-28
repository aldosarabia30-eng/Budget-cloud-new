import React, { useState, useEffect } from 'react';

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
  const STORAGE_KEY = 'envelope_budget_app_data';

  const [readyToAssign, setReadyToAssign] = useState(1250.0);

  const [accounts, setAccounts] = useState([
    { id: 'acc-1', name: 'Checking Account', type: 'Checking', initialBalance: 2000, isDeleted: false },
    { id: 'acc-2', name: 'Savings Account', type: 'Savings', initialBalance: 5000, isDeleted: false }
  ]);

  const [groups, setGroups] = useState(['Housing & Utilities', 'Daily Living', 'Savings Goals']);
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
    { id: 'tx-2', date: '2026-09-18', payee: "Trader Joe's", amount: 125.5, type: 'expense', accountId: 'acc-1', envelopeId: 'env-3', notes: 'Weekly groceries', isDeleted: false },
    { id: 'tx-3', date: '2026-09-25', payee: 'Employer Inc.', amount: 2500, type: 'income', accountId: 'acc-1', envelopeId: '', notes: 'Bi-weekly Paycheck', isDeleted: false },
    { id: 'tx-4', date: '2026-09-25', payee: 'Transfer to Savings', amount: 500, type: 'expense', accountId: 'acc-1', envelopeId: 'env-5', notes: 'Emergency fund transfer', isDeleted: false }
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
  const [txDate, setTxDate] = useState(getTodayISO());
  const [txNotes, setTxNotes] = useState('');

  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtTotal, setNewDebtTotal] = useState('');
  const [newDebtAPR, setNewDebtAPR] = useState('');
  const [newDebtMin, setNewDebtMin] = useState('');

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
      console.error('Failed to load budget data', e);
    }
  }, []);

  useEffect(() => {
    const dataToSave = { readyToAssign, accounts, groups, collapsedGroups, envelopes, transactions, debts };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [readyToAssign, accounts, groups, collapsedGroups, envelopes, transactions, debts]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
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
      isDeleted: false
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
            <p style={{ margin: '4px 0 0 0', opacity: 0.85, fontSize: '0.9rem' }}>Real-time Cash Flow & Goal Tracking</p>
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
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={env.assigned}
                                    onChange={e => handleAssignFunds(env.id, e.target.value)}
                                    style={{ width: '100px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontWeight: 'bold' }}
                                  />
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: spent > 0 ? '#dc2626' : '#6b7280' }}>
                                  ${spent.toFixed(2)}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: remaining < 0 ? '#dc2626' : '#059669' }}>
                                  ${remaining.toFixed(2)}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => handleSoftDeleteEnvelope(env.id)}
                                    style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                  >
                                    Trash
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
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
            <h3 style={{ margin: '0 0 12px 0' }}>+ Add Account</h3>
            <form onSubmit={handleAddAccount} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <input
                type="text"
                placeholder="Account Name (e.g. Chase Checking)"
                value={newAccName}
                onChange={e => setNewAccName(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <select value={newAccType} onChange={e => setNewAccType(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
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
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                Add Account
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Linked Accounts</h3>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e3a8a' }}>
                Total Bank Balance: ${totalBankBalance.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {activeAccounts.map(acc => {
                const balance = getAccountBalance(acc.id);
                return (
                  <div key={acc.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' }}>{acc.type}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '4px 0' }}>{acc.name}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: balance >= 0 ? '#059669' : '#dc2626' }}>
                        ${balance.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Initial: ${Number(acc.initialBalance).toFixed(2)}</span>
                      <button
                        onClick={() => handleSoftDeleteAccount(acc.id)}
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Trash
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>+ Record Transaction</h3>
            <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <input
                type="text"
                placeholder="Payee (e.g., Target, Electric Co)"
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
              <select value={txType} onChange={e => setTxType(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <option value="expense">Expense</option>
                <option value="income">Income / Inflow</option>
              </select>
              <select value={txAccountId} onChange={e => setTxAccountId(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <option value="">Select Account...</option>
                {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              
              {txType === 'expense' && (
                <select value={txEnvelopeId} onChange={e => setTxEnvelopeId(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="">Select Envelope...</option>
                  {activeEnvelopes.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
                </select>
              )}

              <input
                type="date"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={txNotes}
                onChange={e => setTxNotes(e.target.value)}
                style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', gridColumn: '1 / -1' }}
              />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', gridColumn: '1 / -1' }}>
                Save Transaction
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Transaction Register</h3>
            {sortedTransactionDates.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic', margin: 0 }}>No transactions recorded yet.</p>
            ) : (
              sortedTransactionDates.map(date => (
                <div key={date} style={{ marginBottom: '24px' }}>
                  <div style={{ fontWeight: 'bold', paddingBottom: '8px', borderBottom: '2px solid #e5e7eb', marginBottom: '12px', color: '#1e3a8a' }}>
                    {formatDate(date, 'readable')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {groupedTransactions[date].map(tx => {
                      const accName = accounts.find(a => a.id === tx.accountId)?.name || 'Unknown Account';
                      const envName = tx.type === 'expense' 
                        ? (envelopes.find(e => e.id === tx.envelopeId)?.name || 'Uncategorized') 
                        : 'Income / Ready to Assign';
                      
                      return (
                        <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6', fontSize: '0.9rem', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ flex: 1, minWidth: '180px' }}>
                            <div style={{ fontWeight: '600' }}>{tx.payee}</div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>
                              <span>Account: <strong>{accName}</strong></span>
                              <span style={{ marginLeft: '8px', backgroundColor: tx.type === 'income' ? '#d1fae5' : '#e5e7eb', color: tx.type === 'income' ? '#065f46' : '#4b5563', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '500' }}>
                                {envName}
                              </span>
                              {tx.notes && <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>— {tx.notes}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: tx.type === 'income' ? '#059669' : '#1f2937' }}>
                              {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                            </span>
                            <button onClick={() => handleSoftDeleteTransaction(tx.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                              Trash
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
            <h3 style={{ margin: '0 0 12px 0' }}>+ Track New Debt</h3>
            <form onSubmit={handleAddDebt} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <input type="text" placeholder="Debt Name (e.g., Visa Card)" value={newDebtName} onChange={e => setNewDebtName(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              <input type="number" step="0.01" placeholder="Total Balance ($)" value={newDebtTotal} onChange={e => setNewDebtTotal(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              <input type="number" step="0.01" placeholder="Interest Rate (APR %)" value={newDebtAPR} onChange={e => setNewDebtAPR(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              <input type="number" step="0.01" placeholder="Minimum Payment ($)" value={newDebtMin} onChange={e => setNewDebtMin(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Add Debt</button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Active Debts</h3>
            {activeDebts.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic', margin: 0 }}>No debts tracked.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {activeDebts.map(debt => (
                  <div key={debt.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1f2937' }}>{debt.name}</div>
                      <button onClick={() => handleSoftDeleteDebt(debt.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Trash</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Remaining Balance:</span>
                        <span style={{ fontWeight: 'bold', color: '#dc2626' }}>${Number(debt.balance).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Interest Rate (APR):</span>
                        <span style={{ fontWeight: '600' }}>{debt.APR}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Minimum Payment:</span>
                        <span style={{ fontWeight: '600' }}>${Number(debt.minimumPayment).toFixed(2)}</span>
                      </div>
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
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>Trash Bin</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px' }}>
            Items here are hidden from your budget. Restoring an item returns it to its original location. Permanently deleting an item cannot be undone.
          </p>

          {totalTrashCount === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              Trash is empty.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {deletedTx.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Transactions</h4>
                  {deletedTx.map(tx => (
                    <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                      <div>
                        <strong>{tx.payee}</strong> <span style={{ color: '#6b7280' }}>({formatDate(tx.date, 'us')})</span> — ${tx.amount.toFixed(2)}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => restoreItem('tx', tx.id)} style={{ backgroundColor: '#d1fae5', color: '#065f46', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Restore</button>
                        <button onClick={() => permDeleteItem('tx', tx.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Delete Forever</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deletedEnv.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Envelopes</h4>
                  {deletedEnv.map(env => (
                    <div key={env.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                      <div><strong>{env.name}</strong> <span style={{ color: '#6b7280' }}>(Group: {env.group})</span></div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => restoreItem('env', env.id)} style={{ backgroundColor: '#d1fae5', color: '#065f46', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Restore</button>
                        <button onClick={() => permDeleteItem('env', env.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Delete Forever</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deletedAcc.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Accounts</h4>
                  {deletedAcc.map(acc => (
                    <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                      <div><strong>{acc.name}</strong> <span style={{ color: '#6b7280' }}>({acc.type})</span></div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => restoreItem('acc', acc.id)} style={{ backgroundColor: '#d1fae5', color: '#065f46', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Restore</button>
                        <button onClick={() => permDeleteItem('acc', acc.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Delete Forever</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deletedDebts.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Debts</h4>
                  {deletedDebts.map(debt => (
                    <div key={debt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                      <div><strong>{debt.name}</strong></div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => restoreItem('debt', debt.id)} style={{ backgroundColor: '#d1fae5', color: '#065f46', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Restore</button>
                        <button onClick={() => permDeleteItem('debt', debt.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Delete Forever</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
