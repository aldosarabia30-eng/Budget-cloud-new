import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [readyToAssign, setReadyToAssign] = useState(1250.00);
  const [toastMessage, setToastMessage] = useState('');

  // --- ACCOUNTS STATE ---
  const [accounts, setAccounts] = useState([
    { id: '1', name: 'Main Checking', type: 'Checking', initialBalance: 2500.00, balance: 2500.00, isDeleted: false },
    { id: '2', name: 'High Yield Savings', type: 'Savings', initialBalance: 5000.00, balance: 5000.00, isDeleted: false },
    { id: '3', name: 'Rewards Credit Card', type: 'Credit Card', initialBalance: -450.00, balance: -450.00, isDeleted: false }
  ]);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('Checking');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [accountAdjustAmounts, setAccountAdjustAmounts] = useState({});

  // --- CATEGORY GROUPS & ENVELOPES STATE ---
  const [groups, setGroups] = useState(['Essentials', 'Subscriptions', 'Savings Goals']);
  const [newGroupName, setNewGroupName] = useState('');

  const [envelopes, setEnvelopes] = useState([
    { id: '1', name: 'Groceries', group: 'Essentials', assigned: 400, activity: 150, isDeleted: false },
    { id: '2', name: 'Rent / Mortgage', group: 'Essentials', assigned: 1200, activity: 1200, isDeleted: false },
    { id: '3', name: 'Netflix & Spotify', group: 'Subscriptions', assigned: 30, activity: 30, isDeleted: false },
    { id: '4', name: 'Emergency Fund', group: 'Savings Goals', assigned: 500, activity: 0, isDeleted: false }
  ]);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvGroup, setNewEnvGroup] = useState('Essentials');
  const [adjustAmounts, setAdjustAmounts] = useState({});

  // --- DEBTS STATE ---
  const [debts, setDebts] = useState([
    { id: '1', name: 'Auto Loan', totalOwed: 8500, interestRate: 4.5, monthlyPayment: 250, isDeleted: false },
    { id: '2', name: 'Rewards Credit Card', totalOwed: 450, interestRate: 19.99, monthlyPayment: 50, isDeleted: false }
  ]);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtOwed, setNewDebtOwed] = useState('');
  const [newDebtRate, setNewDebtRate] = useState('');
  const [debtAdjustAmounts, setDebtAdjustAmounts] = useState({});

  // --- TRANSACTIONS STATE ---
  const [transactions, setTransactions] = useState([]);
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('1');
  const [selectedEnvelope, setSelectedEnvelope] = useState('1');

  // --- TOAST NOTIFICATION HELPER ---
  const showNotification = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // --- RECALCULATION ENGINE ---
  const recalculateBalances = (txList = transactions, accList = accounts, envList = envelopes) => {
    const activeTx = txList.filter(tx => !tx.isDeleted);

    const updatedAccounts = accList.map(acc => {
      const accTxTotal = activeTx
        .filter(tx => tx.accountId === acc.id)
        .reduce((sum, tx) => sum + tx.amount, 0);
      return {
        ...acc,
        balance: (acc.initialBalance || 0) - accTxTotal
      };
    });

    const updatedEnvelopes = envList.map(env => {
      const envTxTotal = activeTx
        .filter(tx => tx.envelopeId === env.id)
        .reduce((sum, tx) => sum + tx.amount, 0);
      return {
        ...env,
        activity: envTxTotal
      };
    });

    setAccounts(updatedAccounts);
    setEnvelopes(updatedEnvelopes);
  };

  const handleManualRecalculation = () => {
    recalculateBalances(transactions, accounts, envelopes);
    showNotification('Account balances and envelope activities successfully recalculated!');
  };

  // --- SOFT DELETE & RESTORE HANDLERS: TRANSACTIONS ---
  const handleSoftDeleteTransaction = (id) => {
    const updatedTx = transactions.map(tx => tx.id === id ? { ...tx, isDeleted: true } : tx);
    setTransactions(updatedTx);
    recalculateBalances(updatedTx, accounts, envelopes);
    showNotification('Transaction soft deleted. Balances recalculated.');
  };

  const handleRestoreTransaction = (id) => {
    const updatedTx = transactions.map(tx => tx.id === id ? { ...tx, isDeleted: false } : tx);
    setTransactions(updatedTx);
    recalculateBalances(updatedTx, accounts, envelopes);
    showNotification('Transaction restored. Balances recalculated.');
  };

  const handlePermanentDeleteTransaction = (id) => {
    const updatedTx = transactions.filter(tx => tx.id !== id);
    setTransactions(updatedTx);
    recalculateBalances(updatedTx, accounts, envelopes);
    showNotification('Transaction permanently deleted.');
  };

  // --- SOFT DELETE & RESTORE HANDLERS: ACCOUNTS ---
  const handleSoftDeleteAccount = (id) => {
    setAccounts(accounts.map(acc => acc.id === id ? { ...acc, isDeleted: true } : acc));
    showNotification('Account moved to Trash.');
  };

  const handleRestoreAccount = (id) => {
    setAccounts(accounts.map(acc => acc.id === id ? { ...acc, isDeleted: false } : acc));
    showNotification('Account restored.');
  };

  const handlePermanentDeleteAccount = (id) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
    showNotification('Account permanently deleted.');
  };

  // --- SOFT DELETE & RESTORE HANDLERS: ENVELOPES ---
  const handleSoftDeleteEnvelope = (id) => {
    const env = envelopes.find(e => e.id === id);
    if (env && env.assigned > 0) {
      setReadyToAssign(prev => prev + env.assigned);
    }
    setEnvelopes(envelopes.map(e => e.id === id ? { ...e, isDeleted: true } : e));
    showNotification('Envelope soft deleted. Remaining assigned funds returned to Ready to Assign.');
  };

  const handleRestoreEnvelope = (id) => {
    setEnvelopes(envelopes.map(e => e.id === id ? { ...e, isDeleted: false } : e));
    showNotification('Envelope restored.');
  };

  const handlePermanentDeleteEnvelope = (id) => {
    setEnvelopes(envelopes.filter(e => e.id !== id));
    showNotification('Envelope permanently deleted.');
  };

  // --- SOFT DELETE & RESTORE HANDLERS: DEBTS ---
  const handleSoftDeleteDebt = (id) => {
    setDebts(debts.map(d => d.id === id ? { ...d, isDeleted: true } : d));
    showNotification('Debt moved to Trash.');
  };

  const handleRestoreDebt = (id) => {
    setDebts(debts.map(d => d.id === id ? { ...d, isDeleted: false } : d));
    showNotification('Debt restored.');
  };

  const handlePermanentDeleteDebt = (id) => {
    setDebts(debts.filter(d => d.id !== id));
    showNotification('Debt permanently deleted.');
  };

  // --- EMPTY TRASH ---
  const handleEmptyTrash = () => {
    const activeTx = transactions.filter(t => !t.isDeleted);
    const activeAcc = accounts.filter(a => !a.isDeleted);
    const activeEnv = envelopes.filter(e => !e.isDeleted);
    const activeDebts = debts.filter(d => !d.isDeleted);

    setTransactions(activeTx);
    setAccounts(activeAcc);
    setEnvelopes(activeEnv);
    setDebts(activeDebts);
    recalculateBalances(activeTx, activeAcc, activeEnv);
    showNotification('Trash bin emptied permanently.');
  };

  // --- ACCOUNT FORM & ADJUSTMENTS ---
  const handleAddAccount = (e) => {
    e.preventDefault();
    const bal = parseFloat(newAccBalance);
    if (!newAccName.trim() || isNaN(bal)) return;
    const newAcc = {
      id: Date.now().toString(),
      name: newAccName.trim(),
      type: newAccType,
      initialBalance: bal,
      balance: bal,
      isDeleted: false
    };
    const updatedAccounts = [...accounts, newAcc];
    setAccounts(updatedAccounts);
    recalculateBalances(transactions, updatedAccounts, envelopes);
    setNewAccName('');
    setNewAccBalance('');
    showNotification(`Account '${newAcc.name}' created.`);
  };

  const handleAdjustAccount = (id, mode) => {
    const val = parseFloat(accountAdjustAmounts[id]);
    if (isNaN(val) || val <= 0) return;
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === id) {
        const delta = mode === 'add' ? val : -val;
        return { ...acc, initialBalance: acc.initialBalance + delta };
      }
      return acc;
    });
    setAccountAdjustAmounts({ ...accountAdjustAmounts, [id]: '' });
    recalculateBalances(transactions, updatedAccounts, envelopes);
    showNotification('Account balance adjusted and recalculated.');
  };

  // --- CATEGORY GROUP & ENVELOPE FORM HANDLERS ---
  const handleAddGroup = (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name || groups.includes(name)) return;
    setGroups([...groups, name]);
    setNewEnvGroup(name);
    setNewGroupName('');
    showNotification(`Category group '${name}' created.`);
  };

  const handleRemoveGroup = (groupName) => {
    setGroups(groups.filter(g => g !== groupName));
    const updatedEnvelopes = envelopes.map(env => env.group === groupName ? { ...env, isDeleted: true } : env);
    setEnvelopes(updatedEnvelopes);
    showNotification(`Group '${groupName}' and its envelopes moved to Trash.`);
  };

  const handleAddEnvelope = (e) => {
    e.preventDefault();
    if (!newEnvName.trim()) return;
    const newEnv = {
      id: Date.now().toString(),
      name: newEnvName.trim(),
      group: newEnvGroup,
      assigned: 0,
      activity: 0,
      isDeleted: false
    };
    const updatedEnvelopes = [...envelopes, newEnv];
    setEnvelopes(updatedEnvelopes);
    recalculateBalances(transactions, accounts, updatedEnvelopes);
    setNewEnvName('');
    showNotification(`Envelope '${newEnv.name}' added.`);
  };

  const handleAdjustEnvelope = (id, mode) => {
    const val = parseFloat(adjustAmounts[id]);
    if (isNaN(val) || val <= 0) return;

    if (mode === 'add') {
      if (readyToAssign < val) {
        alert("Not enough Ready to Assign balance!");
        return;
      }
      setReadyToAssign(prev => prev - val);
      setEnvelopes(envelopes.map(env => env.id === id ? { ...env, assigned: env.assigned + val } : env));
    } else {
      setReadyToAssign(prev => prev + val);
      setEnvelopes(envelopes.map(env => env.id === id ? { ...env, assigned: env.assigned - val } : env));
    }

    setAdjustAmounts({ ...adjustAmounts, [id]: '' });
  };

  // --- DEBT FORM & ADJUSTMENT HANDLERS ---
  const handleAddDebt = (e) => {
    e.preventDefault();
    const owed = parseFloat(newDebtOwed);
    if (!newDebtName.trim() || isNaN(owed)) return;
    setDebts([...debts, {
      id: Date.now().toString(),
      name: newDebtName.trim(),
      totalOwed: owed,
      interestRate: parseFloat(newDebtRate) || 0,
      monthlyPayment: 0,
      isDeleted: false
    }]);
    setNewDebtName('');
    setNewDebtOwed('');
    setNewDebtRate('');
    showNotification(`Debt '${newDebtName}' created.`);
  };

  const handleAdjustDebt = (id, mode) => {
    const val = parseFloat(debtAdjustAmounts[id]);
    if (isNaN(val) || val <= 0) return;
    setDebts(debts.map(d => {
      if (d.id === id) {
        return {
          ...d,
          totalOwed: mode === 'add' ? d.totalOwed + val : Math.max(0, d.totalOwed - val)
        };
      }
      return d;
    }));
    setDebtAdjustAmounts({ ...debtAdjustAmounts, [id]: '' });
  };

  // --- PAYEE KEYWORD MATCHING ---
  const handlePayeeChange = (val) => {
    setPayee(val);
    const lower = val.toLowerCase();
    const activeEnvList = envelopes.filter(e => !e.isDeleted);
    const match = activeEnvList.find(e => lower.includes(e.name.toLowerCase()));
    if (match) setSelectedEnvelope(match.id);
  };

  // --- TRANSACTION HANDLERS ---
  const handleAddTransaction = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!payee || isNaN(numAmount) || numAmount <= 0) return;

    const newTx = {
      id: Date.now().toString(),
      payee: payee.trim(),
      amount: numAmount,
      accountId: selectedAccount,
      envelopeId: selectedEnvelope,
      date: new Date().toISOString().split('T')[0],
      isDeleted: false
    };

    const updatedTx = [newTx, ...transactions];
    setTransactions(updatedTx);
    recalculateBalances(updatedTx, accounts, envelopes);

    setPayee('');
    setAmount('');
    showNotification('Expense transaction logged and balances recalculated.');
  };

  // Derived Active Lists
  const activeAccounts = accounts.filter(a => !a.isDeleted);
  const activeEnvelopes = envelopes.filter(e => !e.isDeleted);
  const activeDebts = debts.filter(d => !d.isDeleted);
  const activeTransactions = transactions.filter(t => !t.isDeleted);

  // Deleted Counts for Trash Tab Badge
  const deletedTx = transactions.filter(t => t.isDeleted);
  const deletedAccs = accounts.filter(a => a.isDeleted);
  const deletedEnvs = envelopes.filter(e => e.isDeleted);
  const deletedDebtsList = debts.filter(d => d.isDeleted);
  const totalTrashCount = deletedTx.length + deletedAccs.length + deletedEnvs.length + deletedDebtsList.length;

  return (
    <div style={{ padding: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '850px', margin: '0 auto', paddingBottom: '5rem' }}>
      <style>{`
        input, select, button { font-size: 16px !important; min-height: 44px; box-sizing: border-box; }
        .tab-btn { padding: 0.75rem 1rem; border: none; background: none; font-size: 0.9rem; font-weight: 600; color: #666; cursor: pointer; white-space: nowrap; flex: 1; text-align: center; }
        .tab-btn.active { color: #0070f3; border-bottom: 3px solid #0070f3; }
        .mobile-card { background: #fff; border: 1px solid #e1e4e8; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .form-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .btn-danger { background: #fce8e6; border: 1px solid #d93025; color: #d93025; border-radius: 4px; padding: 0.4rem 0.75rem; font-weight: bold; cursor: pointer; }
        .btn-primary { background: #0070f3; border: none; color: #fff; border-radius: 4px; font-weight: bold; padding: 0.5rem 1rem; cursor: pointer; }
        .btn-success { background: #e6f4ea; border: 1px solid #28a745; color: #28a745; border-radius: 4px; padding: 0.4rem 0.75rem; font-weight: bold; cursor: pointer; }
        .btn-secondary { background: #f1f3f5; border: 1px solid #ced4da; color: #495057; border-radius: 4px; padding: 0.4rem 0.75rem; font-weight: bold; cursor: pointer; }
        @media (min-width: 600px) {
          .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        }
      `}</style>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{ background: '#323232', color: '#fff', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Envelope Budgeting</h1>
        <button onClick={handleManualRecalculation} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
          🔄 Recalculate Balances
        </button>
      </div>

      {/* Horizontal Scrollable Tabs for Mobile */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #ddd', marginBottom: '1.25rem', WebkitOverflowScrolling: 'touch' }}>
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab-btn ${activeTab === 'envelopes' ? 'active' : ''}`} onClick={() => setActiveTab('envelopes')}>Envelopes & Groups</button>
        <button className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>Accounts</button>
        <button className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>Transactions</button>
        <button className={`tab-btn ${activeTab === 'debts' ? 'active' : ''}`} onClick={() => setActiveTab('debts')}>Debts</button>
        <button className={`tab-btn ${activeTab === 'trash' ? 'active' : ''}`} onClick={() => setActiveTab('trash')}>
          Trash {totalTrashCount > 0 && `(${totalTrashCount})`}
        </button>
      </div>

      {/* Ready to Assign Summary Banner */}
      <div style={{ background: '#e6f4ea', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: '#333' }}>Ready to Assign</span>
        <h2 style={{ margin: '0.25rem 0 0 0', color: readyToAssign < 0 ? 'red' : '#28a745', fontSize: '1.75rem' }}>
          ${readyToAssign.toFixed(2)}
        </h2>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          {groups.map(group => {
            const groupEnvelopes = activeEnvelopes.filter(e => e.group === group);
            return (
              <div key={group} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#444' }}>{group}</h3>
                {groupEnvelopes.length === 0 ? <p style={{ color: '#888', fontSize: '0.85rem' }}>No active envelopes in this group.</p> : groupEnvelopes.map(env => {
                  const available = env.assigned - env.activity;
                  return (
                    <div key={env.id} className="mobile-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1.05rem' }}>{env.name}</strong>
                        <span style={{ fontWeight: 'bold', color: available < 0 ? 'red' : 'green', fontSize: '1.1rem' }}>
                          ${available.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
                        <span>Assigned: ${env.assigned.toFixed(2)}</span>
                        <span>Activity: ${env.activity.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={adjustAmounts[env.id] || ''}
                          onChange={(e) => setAdjustAmounts({ ...adjustAmounts, [env.id]: e.target.value })}
                          style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                        <button onClick={() => handleAdjustEnvelope(env.id, 'add')} className="btn-success">+</button>
                        <button onClick={() => handleAdjustEnvelope(env.id, 'subtract')} className="btn-danger">-</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ENVELOPES MANAGEMENT TAB */}
      {activeTab === 'envelopes' && (
        <div>
          <div className="mobile-card" style={{ background: '#f8f9fa' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Create Category Group</h3>
            <form onSubmit={handleAddGroup} className="form-grid">
              <input type="text" placeholder="Group Name (e.g., Bills)" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              <button type="submit" className="btn-primary">Add Group</button>
            </form>
          </div>

          <div className="mobile-card" style={{ background: '#f8f9fa' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Add New Envelope</h3>
            <form onSubmit={handleAddEnvelope} className="form-grid">
              <input type="text" placeholder="Envelope Name" value={newEnvName} onChange={(e) => setNewEnvName(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              <select value={newEnvGroup} onChange={(e) => setNewEnvGroup(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <button type="submit" className="btn-primary">Add Envelope</button>
            </form>
          </div>

          <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0' }}>Manage Category Groups & Envelopes</h3>
          {groups.map(group => (
            <div key={group} className="mobile-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong>Group: {group}</strong>
                <button onClick={() => handleRemoveGroup(group)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Soft Delete Group</button>
              </div>
              {activeEnvelopes.filter(e => e.group === group).map(env => (
                <div key={env.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid #eee' }}>
                  <span>{env.name}</span>
                  <button onClick={() => handleSoftDeleteEnvelope(env.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Soft Delete</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        <div>
          <div className="mobile-card" style={{ background: '#f8f9fa' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Add Account</h3>
            <form onSubmit={handleAddAccount} className="form-grid">
              <input type="text" placeholder="Account Name" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              <select value={newAccType} onChange={(e) => setNewAccType(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
              </select>
              <input type="number" step="0.01" placeholder="Starting Balance" value={newAccBalance} onChange={(e) => setNewAccBalance(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              <button type="submit" className="btn-primary">Add Account</button>
            </form>
          </div>

          <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0' }}>Manage Active Accounts</h3>
          {activeAccounts.length === 0 ? <p style={{ color: '#666' }}>No active accounts found.</p> : activeAccounts.map(acc => (
            <div key={acc.id} className="mobile-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <strong>{acc.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{acc.type}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 'bold', color: acc.balance < 0 ? 'red' : 'black', fontSize: '1.1rem' }}>
                    ${acc.balance.toFixed(2)}
                  </span>
                  <button onClick={() => handleSoftDeleteAccount(acc.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Trash</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="number"
                  placeholder="Adjust Starting Balance"
                  value={accountAdjustAmounts[acc.id] || ''}
                  onChange={(e) => setAccountAdjustAmounts({ ...accountAdjustAmounts, [acc.id]: e.target.value })}
                  style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button onClick={() => handleAdjustAccount(acc.id, 'add')} className="btn-success">+ Add</button>
                <button onClick={() => handleAdjustAccount(acc.id, 'subtract')} className="btn-danger">- Subtract</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div>
          <div className="mobile-card" style={{ background: '#f8f9fa' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Log Expense Transaction</h3>
            <form onSubmit={handleAddTransaction} className="form-grid">
              <input type="text" placeholder="Payee" value={payee} onChange={(e) => handlePayeeChange(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="number" step="0.01" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                {activeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
              <select value={selectedEnvelope} onChange={(e) => setSelectedEnvelope(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                {activeEnvelopes.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
              </select>
              <button type="submit" className="btn-primary">Add Expense</button>
            </form>
          </div>

          <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0' }}>Transaction History</h3>
          {activeTransactions.length === 0 ? <p style={{ color: '#666' }}>No active transactions recorded yet.</p> : activeTransactions.map(tx => {
            const acc = accounts.find(a => a.id === tx.accountId);
            const env = envelopes.find(e => e.id === tx.envelopeId);
            return (
              <div key={tx.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{tx.payee}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>
                    {tx.date} • Account: {acc ? acc.name : 'N/A'} • Envelope: {env ? env.name : 'N/A'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: 'red', fontWeight: 'bold' }}>-${tx.amount.toFixed(2)}</span>
                  <button onClick={() => handleSoftDeleteTransaction(tx.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Soft Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DEBTS TAB */}
      {activeTab === 'debts' && (
        <div>
          <div className="mobile-card" style={{ background: '#f8f9fa' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Add Debt Account</h3>
            <form onSubmit={handleAddDebt} className="form-grid">
              <input type="text" placeholder="Debt Name" value={newDebtName} onChange={(e) => setNewDebtName(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input type="number" step="0.01" placeholder="Total Owed ($)" value={newDebtOwed} onChange={(e) => setNewDebtOwed(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input type="number" step="0.01" placeholder="Interest Rate (%)" value={newDebtRate} onChange={(e) => setNewDebtRate(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              <button type="submit" className="btn-primary">Add Debt</button>
            </form>
          </div>

          <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0' }}>Manage Debts</h3>
          {activeDebts.length === 0 ? <p style={{ color: '#666' }}>No active debts recorded.</p> : activeDebts.map(d => (
            <div key={d.id} className="mobile-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <strong>{d.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{d.interestRate}% APR</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 'bold', color: '#d93025', fontSize: '1.1rem' }}>${d.totalOwed.toFixed(2)}</span>
                  <button onClick={() => handleSoftDeleteDebt(d.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Soft Delete</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="number"
                  placeholder="Adjust Debt Amount"
                  value={debtAdjustAmounts[d.id] || ''}
                  onChange={(e) => setDebtAdjustAmounts({ ...debtAdjustAmounts, [d.id]: e.target.value })}
                  style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button onClick={() => handleAdjustDebt(d.id, 'add')} className="btn-danger">+ Debt</button>
                <button onClick={() => handleAdjustDebt(d.id, 'subtract')} className="btn-success">- Pay Down</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TRASH / DELETED ITEMS TAB */}
      {activeTab === 'trash' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Trash Bin ({totalTrashCount} items)</h3>
            {totalTrashCount > 0 && (
              <button onClick={handleEmptyTrash} className="btn-danger">
                Empty Trash Bin
              </button>
            )}
          </div>

          {totalTrashCount === 0 ? <p style={{ color: '#666' }}>Trash bin is empty.</p> : (
            <div>
              {deletedTx.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: '#555', marginBottom: '0.5rem' }}>Soft Deleted Transactions</h4>
                  {deletedTx.map(tx => (
                    <div key={tx.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff5f5' }}>
                      <div>
                        <strong>{tx.payee}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{tx.date} • Amount: ${tx.amount.toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleRestoreTransaction(tx.id)} className="btn-success" style={{ fontSize: '0.8rem' }}>Restore</button>
                        <button onClick={() => handlePermanentDeleteTransaction(tx.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Purge</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deletedAccs.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: '#555', marginBottom: '0.5rem' }}>Soft Deleted Accounts</h4>
                  {deletedAccs.map(acc => (
                    <div key={acc.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff5f5' }}>
                      <div>
                        <strong>{acc.name}</strong> ({acc.type})
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleRestoreAccount(acc.id)} className="btn-success" style={{ fontSize: '0.8rem' }}>Restore</button>
                        <button onClick={() => handlePermanentDeleteAccount(acc.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Purge</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deletedEnvs.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: '#555', marginBottom: '0.5rem' }}>Soft Deleted Envelopes</h4>
                  {deletedEnvs.map(env => (
                    <div key={env.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff5f5' }}>
                      <div>
                        <strong>{env.name}</strong> (Group: {env.group})
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleRestoreEnvelope(env.id)} className="btn-success" style={{ fontSize: '0.8rem' }}>Restore</button>
                        <button onClick={() => handlePermanentDeleteEnvelope(env.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Purge</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deletedDebtsList.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: '#555', marginBottom: '0.5rem' }}>Soft Deleted Debts</h4>
                  {deletedDebtsList.map(d => (
                    <div key={d.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff5f5' }}>
                      <div>
                        <strong>{d.name}</strong> (${d.totalOwed.toFixed(2)})
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleRestoreDebt(d.id)} className="btn-success" style={{ fontSize: '0.8rem' }}>Restore</button>
                        <button onClick={() => handlePermanentDeleteDebt(d.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Purge</button>
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
