import React, { useState, useEffect } from 'react';

export default function BudgetApp() {
  const STORAGE_KEY = 'envelope_budget_app_data';

  // --- STATE DEFINITIONS ---
  const [readyToAssign, setReadyToAssign] = useState(1250.00);
  
  const [accounts, setAccounts] = useState([
    { id: 'acc-1', name: 'Checking Account', type: 'Checking', initialBalance: 2000, isDeleted: false },
    { id: 'acc-2', name: 'Savings Account', type: 'Savings', initialBalance: 5000, isDeleted: false }
  ]);

  const [groups, setGroups] = useState(['Housing & Utilities', 'Daily Living', 'Savings Goals']);

  const [envelopes, setEnvelopes] = useState([
    { id: 'env-1', name: 'Rent/Mortgage', group: 'Housing & Utilities', assigned: 1000, isDeleted: false },
    { id: 'env-2', name: 'Electric & Gas', group: 'Housing & Utilities', assigned: 150, isDeleted: false },
    { id: 'env-3', name: 'Groceries', group: 'Daily Living', assigned: 400, isDeleted: false },
    { id: 'env-4', name: 'Dining Out', group: 'Daily Living', assigned: 150, isDeleted: false },
    { id: 'env-5', name: 'Emergency Fund', group: 'Savings Goals', assigned: 300, isDeleted: false }
  ]);

  const [transactions, setTransactions] = useState([
    { id: 'tx-1', date: '2026-09-15', payee: 'Landlord Co.', amount: 1000, type: 'expense', accountId: 'acc-1', envelopeId: 'env-1', notes: 'Monthly rent', isDeleted: false },
    { id: 'tx-2', date: '2026-09-18', payee: 'Trader Joe\'s', amount: 125.50, type: 'expense', accountId: 'acc-1', envelopeId: 'env-3', notes: 'Weekly groceries', isDeleted: false },
    { id: 'tx-3', date: '2026-09-25', payee: 'Employer Inc.', amount: 2500, type: 'income', accountId: 'acc-1', envelopeId: '', notes: 'Bi-weekly Paycheck', isDeleted: false }
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
  // Load saved budget data on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.readyToAssign !== undefined) setReadyToAssign(parsed.readyToAssign);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.groups) setGroups(parsed.groups);
        if (parsed.envelopes) setEnvelopes(parsed.envelopes);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.debts) setDebts(parsed.debts);
      }
    } catch (e) {
      console.error('Failed to load budget data from localStorage', e);
    }
  }, []);

  // Save budget data whenever state updates
  useEffect(() => {
    const dataToSave = {
      readyToAssign,
      accounts,
      groups,
      envelopes,
      transactions,
      debts
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [readyToAssign, accounts, groups, envelopes, transactions, debts]);

  // --- NOTIFICATION HELPER ---
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // --- DERIVED CALCULATIONS ---
  const activeTransactions = transactions.filter(t => !t.isDeleted);
  const activeAccounts = accounts.filter(a => !a.isDeleted);
  const activeEnvelopes = envelopes.filter(e => !e.isDeleted);
  const activeDebts = debts.filter(d => !d.isDeleted);

  // Dynamically compute account balances (Initial + Income - Expenses)
  const getAccountBalance = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return 0;
    const txTotal = activeTransactions
      .filter(t => t.accountId === accId)
      .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    return Number(acc.initialBalance) + txTotal;
  };

  // Dynamically compute envelope activity (Spent)
  const getEnvelopeSpent = (envId) => {
    return activeTransactions
      .filter(t => t.envelopeId === envId && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  // Compute remaining envelope balance
  const getEnvelopeRemaining = (env) => {
    return Number(env.assigned) - getEnvelopeSpent(env.id);
  };

  // Total Bank Cash Balance
  const totalBankBalance = activeAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);

  // --- HANDLERS ---

  // Payee Smart Matcher
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

  // Add Group
  const handleAddGroup = (e) => {
    e.preventDefault();
    if (!newGroup.trim() || groups.includes(newGroup.trim())) return;
    setGroups([...groups, newGroup.trim()]);
    setNewGroup('');
    showNotification(`Group '${newGroup}' added.`);
  };

  // Soft Delete Group (Refunds assigned funds from active envelopes back to readyToAssign)
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

  // Add Envelope
  const handleAddEnvelope = (e) => {
    e.preventDefault();
    if (!newEnvName.trim() || !newEnvGroup) return;
    const newEnv = {
      id: 'env-' + Date.now(),
      name: newEnvName.trim(),
      group: newEnvGroup,
      assigned: 0,
      isDeleted: false
    };
    setEnvelopes([...envelopes, newEnv]);
    setNewEnvName('');
    showNotification(`Envelope '${newEnv.name}' created.`);
  };

  // Assign Funds to Envelope
  const handleAssignFunds = (envId, newAssignedAmount) => {
    const env = envelopes.find(e => e.id === envId);
    if (!env) return;
    const diff = Number(newAssignedAmount) - Number(env.assigned);
    setReadyToAssign(prev => prev - diff);
    setEnvelopes(envelopes.map(e => e.id === envId ? { ...e, assigned: Number(newAssignedAmount) } : e));
  };

  // Soft Delete Envelope & Refund
  const handleSoftDeleteEnvelope = (envId) => {
    const env = envelopes.find(e => e.id === envId);
    if (!env) return;
    setReadyToAssign(prev => prev + Number(env.assigned));
    setEnvelopes(envelopes.map(e => e.id === envId ? { ...e, isDeleted: true, assigned: 0 } : e));
    showNotification(`Envelope '${env.name}' deleted. $${Number(env.assigned).toFixed(2)} refunded to Ready to Assign.`);
  };

  // Add Account
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

  // Soft Delete Account
  const handleSoftDeleteAccount = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    setAccounts(accounts.map(a => a.id === accId ? { ...a, isDeleted: true } : a));
    showNotification(`Account '${acc?.name}' moved to Trash.`);
  };

  // Add Transaction (Income or Expense)
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
      type: txType, // 'income' or 'expense'
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

  // Soft Delete Transaction
  const handleSoftDeleteTransaction = (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    if (tx.type === 'income') {
      setReadyToAssign(prev => prev - tx.amount);
    }
    setTransactions(transactions.map(t => t.id === txId ? { ...t, isDeleted: true } : t));
    showNotification('Transaction moved to Trash.');
  };

  // Add Debt
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

  // Soft Delete Debt
  const handleSoftDeleteDebt = (debtId) => {
    setDebts(debts.map(d => d.id === debtId ? { ...d, isDeleted: true } : d));
    showNotification('Debt moved to Trash.');
  };

  // --- TRASH RESTORE & PURGE ACTIONS ---
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

  // Deleted Items Counts
  const deletedTx = transactions.filter(t => t.isDeleted);
  const deletedEnv = envelopes.filter(e => e.isDeleted);
  const deletedAcc = accounts.filter(a => a.isDeleted);
  const deletedDebts = debts.filter(d => d.isDeleted);
  const totalTrashCount = deletedTx.length + deletedEnv.length + deletedAcc.length + deletedDebts.length;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '16px', color: '#1f2937', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      
      {/* Header Banner */}
      <header style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700' }}>Envelope Budgeting</h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.85, fontSize: '0.9rem' }}>Real-time Cash Flow & Zero-Based Budgeting</p>
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
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>+ Create Group</h3>
              <form onSubmit={handleAddGroup} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. Bills, Fun"
                  value={newGroup}
                  onChange={e => setNewGroup(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                  Add
                </button>
              </form>
            </div>

            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>+ Create Envelope</h3>
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
                <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                  Create Envelope
                </button>
              </form>
            </div>
          </div>

          {groups.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center' }}>No groups created yet.</p>
          ) : (
            groups.map(groupName => {
              const groupEnvs = activeEnvelopes.filter(e => e.group === groupName);
              const groupAssigned = groupEnvs.reduce((sum, e) => sum + Number(e.assigned), 0);
              const groupSpent = groupEnvs.reduce((sum, e) => sum + getEnvelopeSpent(e.id), 0);
              const groupAvailable = groupAssigned - groupSpent;

              return (
                <div key={groupName} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{groupName}</h2>
                      <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        Available: <strong style={{ color: groupAvailable >= 0 ? '#10b981' : '#ef4444' }}>${groupAvailable.toFixed(2)}</strong>
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveGroup(groupName)}
                      style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Delete Group
                    </button>
                  </div>

                  {groupEnvs.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>No envelopes in this group.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {groupEnvs.map(env => {
                        const spent = getEnvelopeSpent(env.id);
                        const remaining = getEnvelopeRemaining(env);
                        return (
                          <div key={env.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px', gap: '8px' }}>
                            <div style={{ minWidth: '150px' }}>
                              <strong>{env.name}</strong>
                              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                Activity: ${spent.toFixed(2)}
                              </div>
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
                        );
                      })}
                    </div>
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
            <h3 style={{ margin: '0 0 12px 0' }}>Transaction Register</h3>
            {activeTransactions.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No active transactions recorded.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280' }}>
                      <th style={{ padding: '8px' }}>Date</th>
                      <th style={{ padding: '8px' }}>Payee</th>
                      <th style={{ padding: '8px' }}>Account</th>
                      <th style={{ padding: '8px' }}>Envelope</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTransactions.map(tx => {
                      const acc = accounts.find(a => a.id === tx.accountId);
                      const env = envelopes.find(e => e.id === tx.envelopeId);
                      return (
                        <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '8px' }}>{tx.date}</td>
                          <td style={{ padding: '8px' }}>
                            <strong>{tx.payee}</strong>
                            {tx.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{tx.notes}</div>}
                          </td>
                          <td style={{ padding: '8px' }}>{acc?.name || '—'}</td>
                          <td style={{ padding: '8px' }}>{tx.type === 'income' ? <em style={{ color: '#10b981' }}>Ready to Assign</em> : (env?.name || 'Uncategorized')}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: tx.type === 'income' ? '#10b981' : '#111827' }}>
                            {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
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
              
              {/* Deleted Transactions */}
              {deletedTx.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Deleted Transactions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {deletedTx.map(tx => (
                      <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{tx.payee}</strong> - ${tx.amount} ({tx.date})
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

              {/* Deleted Envelopes */}
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

              {/* Deleted Accounts */}
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

              {/* Deleted Debts */}
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
