import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [readyToAssign, setReadyToAssign] = useState(1250.00);

  // Accounts State
  const [accounts, setAccounts] = useState([
    { id: '1', name: 'Main Checking', type: 'Checking', balance: 2500.00 },
    { id: '2', name: 'High Yield Savings', type: 'Savings', balance: 5000.00 },
    { id: '3', name: 'Rewards Credit Card', type: 'Credit Card', balance: -450.00 }
  ]);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('Checking');
  const [newAccBalance, setNewAccBalance] = useState('');

  // Category Groups & Envelopes State
  const [groups, setGroups] = useState(['Essentials', 'Subscriptions', 'Savings Goals']);
  const [newGroupName, setNewGroupName] = useState('');

  const [envelopes, setEnvelopes] = useState([
    { 
      id: '1', 
      name: 'Groceries', 
      group: 'Essentials', 
      assigned: 400, 
      activity: 150, 
      targetType: 'weekly', 
      targetAmount: 500, 
      targetDate: '' 
    },
    { 
      id: '2', 
      name: 'Rent / Mortgage', 
      group: 'Essentials', 
      assigned: 1200, 
      activity: 1200, 
      targetType: 'refill_date', 
      targetAmount: 1200, 
      targetDate: '2026-10-01' 
    },
    { 
      id: '3', 
      name: 'Netflix & Spotify', 
      group: 'Subscriptions', 
      assigned: 30, 
      activity: 30, 
      targetType: 'none', 
      targetAmount: 0, 
      targetDate: '' 
    },
    { 
      id: '4', 
      name: 'Emergency Fund', 
      group: 'Savings Goals', 
      assigned: 500, 
      activity: 0, 
      targetType: 'refill_date', 
      targetAmount: 2000, 
      targetDate: '2026-12-31' 
    }
  ]);
  
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvGroup, setNewEnvGroup] = useState('Essentials');
  const [newTargetType, setNewTargetType] = useState('none');
  const [newTargetAmount, setNewTargetAmount] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [adjustAmounts, setAdjustAmounts] = useState({});

  // Debts State
  const [debts, setDebts] = useState([
    { id: '1', name: 'Auto Loan', totalOwed: 8500, interestRate: 4.5 },
    { id: '2', name: 'Rewards Credit Card', totalOwed: 450, interestRate: 19.99 }
  ]);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtOwed, setNewDebtOwed] = useState('');
  const [newDebtRate, setNewDebtRate] = useState('');

  // Transactions State
  const [transactions, setTransactions] = useState([
    { id: 'tx-1', payee: 'Employer Co', amount: 3000, type: 'income', accountId: '1', envelopeId: '1', date: new Date().toISOString().split('T')[0] },
    { id: 'tx-2', payee: 'Supermarket', amount: 150, type: 'expense', accountId: '1', envelopeId: '1', date: new Date().toISOString().split('T')[0] },
    { id: 'tx-3', payee: 'Property Mgmt', amount: 1200, type: 'expense', accountId: '1', envelopeId: '2', date: new Date().toISOString().split('T')[0] }
  ]);
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState('expense');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccount, setSelectedAccount] = useState('1');
  const [selectedEnvelope, setSelectedEnvelope] = useState('1');

  // Reports timeframe side-tab state
  const [reportTimeframe, setReportTimeframe] = useState('month');

  // --- HANDLERS ---
  const handleNavClick = (tabKey) => {
    setActiveTab(tabKey);
    setIsSidebarOpen(false);
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    const bal = parseFloat(newAccBalance);
    if (!newAccName || isNaN(bal)) return;
    setAccounts([...accounts, {
      id: Date.now().toString(),
      name: newAccName,
      type: newAccType,
      balance: bal
    }]);
    setNewAccName('');
    setNewAccBalance('');
  };

  const handleRemoveAccount = (id) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
  };

  const handleAddGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || groups.includes(newGroupName.trim())) return;
    const name = newGroupName.trim();
    setGroups([...groups, name]);
    setNewEnvGroup(name);
    setNewGroupName('');
  };

  const handleRemoveGroup = (groupName) => {
    setGroups(groups.filter(g => g !== groupName));
    setEnvelopes(envelopes.filter(env => env.group !== groupName));
  };

  const handleAddEnvelope = (e) => {
    e.preventDefault();
    if (!newEnvName.trim()) return;
    const tgtAmt = parseFloat(newTargetAmount) || 0;
    
    setEnvelopes([...envelopes, {
      id: Date.now().toString(),
      name: newEnvName.trim(),
      group: newEnvGroup,
      assigned: 0,
      activity: 0,
      targetType: newTargetType,
      targetAmount: tgtAmt,
      targetDate: newTargetType === 'refill_date' ? newTargetDate : ''
    }]);

    setNewEnvName('');
    setNewTargetType('none');
    setNewTargetAmount('');
    setNewTargetDate('');
  };

  const handleRemoveEnvelope = (id) => {
    const target = envelopes.find(e => e.id === id);
    if (target && target.assigned > 0) {
      setReadyToAssign(prev => prev + target.assigned);
    }
    setEnvelopes(envelopes.filter(e => e.id !== id));
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
      setEnvelopes(envelopes.map(env => env.id === id ? { ...env, assigned: Math.max(0, env.assigned - val) } : env));
    }

    setAdjustAmounts({ ...adjustAmounts, [id]: '' });
  };

  const handleAddDebt = (e) => {
    e.preventDefault();
    const owed = parseFloat(newDebtOwed);
    if (!newDebtName || isNaN(owed)) return;
    setDebts([...debts, {
      id: Date.now().toString(),
      name: newDebtName,
      totalOwed: owed,
      interestRate: parseFloat(newDebtRate) || 0
    }]);
    setNewDebtName('');
    setNewDebtOwed('');
    setNewDebtRate('');
  };

  const handleRemoveDebt = (id) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!payee || isNaN(numAmount)) return;

    const newTx = {
      id: Date.now().toString(),
      payee,
      amount: numAmount,
      type: txType,
      accountId: selectedAccount,
      envelopeId: selectedEnvelope,
      date: txDate || new Date().toISOString().split('T')[0]
    };

    setTransactions([newTx, ...transactions]);

    if (txType === 'income') {
      setAccounts(accounts.map(acc => acc.id === selectedAccount ? { ...acc, balance: acc.balance + numAmount } : acc));
      setReadyToAssign(prev => prev + numAmount);
    } else {
      setAccounts(accounts.map(acc => acc.id === selectedAccount ? { ...acc, balance: acc.balance - numAmount } : acc));
      setEnvelopes(envelopes.map(env => env.id === selectedEnvelope ? { ...env, activity: env.activity + numAmount } : env));
    }

    setPayee('');
    setAmount('');
  };

  // --- REPORT CALCULATIONS ---
  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = transactions
    .filter(tx => tx.type !== 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netCashFlow = totalIncome - totalExpenses;

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh' }}>
      <style>{`
        input, select, button { font-size: 16px !important; min-height: 44px; box-sizing: border-box; background-color: #2a2a2a; color: #ffffff; border: 1px solid #444; border-radius: 6px; }
        input::placeholder { color: #888; }
        .mobile-card { background: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 1rem; margin-bottom: 0.85rem; box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
        .form-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .btn-danger { background: #3a1c1c; border: 1px solid #d93025; color: #ff6b6b; border-radius: 6px; padding: 0.4rem 0.75rem; font-weight: bold; cursor: pointer; }
        .btn-primary { background: #0070f3; border: none; color: #fff; border-radius: 6px; font-weight: bold; padding: 0.5rem 1rem; cursor: pointer; }
        .stat-card { background: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 1rem; text-align: center; }
        .sidebar-btn { display: block; width: 100%; text-align: left; padding: 0.85rem 1.25rem; background: none; border: none; color: #ccc; font-size: 1rem; font-weight: 600; cursor: pointer; border-left: 4px solid transparent; }
        .sidebar-btn.active { color: #2ecc71; background: #252525; border-left-color: #2ecc71; }
        .subtab-btn { padding: 0.5rem 0.75rem; border: 1px solid #444; background: #2a2a2a; color: #aaa; border-radius: 6px; cursor: pointer; text-align: center; }
        .subtab-btn.active { background: #0070f3; color: #fff; border-color: #0070f3; font-weight: bold; }
        .progress-bar-bg { background-color: #333; border-radius: 4px; height: 8px; width: 100%; overflow: hidden; margin-top: 6px; }
        .progress-bar-fill { background-color: #2ecc71; height: 100%; transition: width 0.3s ease; }
        @media (min-width: 600px) {
          .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        }
      `}</style>

      {/* Header Bar with Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#1e1e1e', borderBottom: '1px solid #333', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          ☰
        </button>
        <h1 style={{ fontSize: '1.2rem', margin: 0, color: '#ffffff', fontWeight: 'bold' }}>Envelope Budgeting</h1>
        <div style={{ width: '24px' }}></div>
      </div>

      {/* Side Menu Overlay Backdrop */}
      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 101 }} />
      )}

      {/* Collapsible Sidebar Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '260px',
        backgroundColor: '#181818',
        borderRight: '1px solid #333',
        zIndex: 102,
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease-in-out',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '1.1rem', color: '#fff' }}>Navigation</strong>
          <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ flex: 1, paddingTop: '0.5rem' }}>
          <button className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleNavClick('overview')}>📊 Overview</button>
          <button className={`sidebar-btn ${activeTab === 'envelopes' ? 'active' : ''}`} onClick={() => handleNavClick('envelopes')}>✉️ Envelopes</button>
          <button className={`sidebar-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => handleNavClick('accounts')}>💳 Accounts</button>
          <button className={`sidebar-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => handleNavClick('transactions')}>📑 Transactions</button>
          <button className={`sidebar-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => handleNavClick('reports')}>📈 Reports</button>
          <button className={`sidebar-btn ${activeTab === 'debts' ? 'active' : ''}`} onClick={() => handleNavClick('debts')}>🏷️ Debts</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '5rem' }}>

        {/* Ready to Assign Header Banner */}
        <div style={{ background: '#1c2d22', border: '1px solid #2ecc71', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ready to Assign</span>
          <h2 style={{ margin: '0.25rem 0 0 0', color: readyToAssign < 0 ? '#ff6b6b' : '#2ecc71', fontSize: '1.8rem' }}>
            ${readyToAssign.toFixed(2)}
          </h2>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            {groups.map(group => {
              const groupEnvelopes = envelopes.filter(e => e.group === group);
              return (
                <div key={group} style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group}</h3>
                  {groupEnvelopes.map(env => {
                    const available = env.assigned - env.activity;
                    const targetAmt = env.targetAmount || 0;
                    const leftToFill = Math.max(0, targetAmt - env.assigned);
                    const progressPct = targetAmt > 0 ? Math.min(100, Math.round((env.assigned / targetAmt) * 100)) : 0;

                    return (
                      <div key={env.id} className="mobile-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{env.name}</strong>
                          <span style={{ fontWeight: 'bold', color: available < 0 ? '#ff6b6b' : '#2ecc71', fontSize: '1.1rem' }}>
                            ${available.toFixed(2)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>
                          <span>Assigned: ${env.assigned.toFixed(2)}</span>
                          <span>Activity: ${env.activity.toFixed(2)}</span>
                        </div>

                        {/* Envelope Goal Tracking Progress */}
                        {env.targetType !== 'none' && targetAmt > 0 && (
                          <div style={{ background: '#252525', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ccc' }}>
                              <span>
                                {env.targetType === 'weekly' ? 'Goal: Save / week' : `Goal: Refill by ${env.targetDate || 'target date'}`}
                              </span>
                              <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>
                                Left to fill: ${leftToFill.toFixed(2)}
                              </span>
                            </div>
                            <div className="progress-bar-bg">
                              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
                            </div>
                          </div>
                        )}

                        {/* Envelope Adjustment Form */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={adjustAmounts[env.id] || ''}
                            onChange={(e) => setAdjustAmounts({ ...adjustAmounts, [env.id]: e.target.value })}
                            style={{ flex: 1, padding: '0.4rem 0.6rem' }}
                          />
                          <button onClick={() => handleAdjustEnvelope(env.id, 'add')} style={{ background: '#1c2d22', border: '1px solid #2ecc71', color: '#2ecc71', borderRadius: '6px', padding: '0 0.85rem', fontWeight: 'bold' }}>+</button>
                          <button onClick={() => handleAdjustEnvelope(env.id, 'subtract')} style={{ background: '#3a1c1c', border: '1px solid #d93025', color: '#ff6b6b', borderRadius: '6px', padding: '0 0.85rem', fontWeight: 'bold' }}>-</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ENVELOPES TAB */}
        {activeTab === 'envelopes' && (
          <div>
            <div className="mobile-card">
              <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#fff' }}>Add Category Group</h3>
              <form onSubmit={handleAddGroup} className="form-grid">
                <input type="text" placeholder="Group Name (e.g., Bills)" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} style={{ padding: '0.5rem' }} />
                <button type="submit" className="btn-primary">Add Group</button>
              </form>
            </div>

            <div className="mobile-card">
              <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#fff' }}>Add New Envelope with Goal</h3>
              <form onSubmit={handleAddEnvelope} className="form-grid">
                <input type="text" placeholder="Envelope Name" value={newEnvName} onChange={(e) => setNewEnvName(e.target.value)} style={{ padding: '0.5rem' }} />
                <select value={newEnvGroup} onChange={(e) => setNewEnvGroup(e.target.value)} style={{ padding: '0.5rem' }}>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                <select value={newTargetType} onChange={(e) => setNewTargetType(e.target.value)} style={{ padding: '0.5rem' }}>
                  <option value="none">No Goal Target</option>
                  <option value="weekly">Save amount per week</option>
                  <option value="refill_date">Refill envelope up to amount by date</option>
                </select>

                {newTargetType !== 'none' && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Target Amount ($)"
                    value={newTargetAmount}
                    onChange={(e) => setNewTargetAmount(e.target.value)}
                    style={{ padding: '0.5rem' }}
                  />
                )}

                {newTargetType === 'refill_date' && (
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    style={{ padding: '0.5rem' }}
                  />
                )}

                <button type="submit" className="btn-primary">Add Envelope</button>
              </form>
            </div>

            <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0', color: '#ccc' }}>Manage Envelopes</h3>
            {groups.map(group => (
              <div key={group} className="mobile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#fff' }}>Group: {group}</strong>
                  <button onClick={() => handleRemoveGroup(group)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Delete Group</button>
                </div>
                {envelopes.filter(e => e.group === group).map(env => (
                  <div key={env.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid #333' }}>
                    <div>
                      <span style={{ color: '#fff' }}>{env.name}</span>
                      {env.targetType !== 'none' && (
                        <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                          Target: ${env.targetAmount} {env.targetType === 'weekly' ? '/ week' : `by ${env.targetDate}`}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleRemoveEnvelope(env.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Delete</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          <div>
            <div className="mobile-card">
              <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#fff' }}>Add Account</h3>
              <form onSubmit={handleAddAccount} className="form-grid">
                <input type="text" placeholder="Account Name" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} style={{ padding: '0.5rem' }} />
                <select value={newAccType} onChange={(e) => setNewAccType(e.target.value)} style={{ padding: '0.5rem' }}>
                  <option value="Checking">Checking</option>
                  <option value="Savings">Savings</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                </select>
                <input type="number" step="0.01" placeholder="Starting Balance" value={newAccBalance} onChange={(e) => setNewAccBalance(e.target.value)} style={{ padding: '0.5rem' }} />
                <button type="submit" className="btn-primary">Add Account</button>
              </form>
            </div>

            <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0', color: '#ccc' }}>Accounts</h3>
            {accounts.map(acc => (
              <div key={acc.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#fff' }}>{acc.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{acc.type}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 'bold', color: acc.balance < 0 ? '#ff6b6b' : '#ffffff' }}>${acc.balance.toFixed(2)}</span>
                  <button onClick={() => handleRemoveAccount(acc.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <div>
            <div className="mobile-card">
              <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#fff' }}>Add Transaction</h3>
              <form onSubmit={handleAddTransaction} className="form-grid">
                <input type="text" placeholder="Payee" value={payee} onChange={(e) => setPayee(e.target.value)} style={{ padding: '0.5rem' }} />
                <input type="number" step="0.01" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '0.5rem' }} />
                <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} style={{ padding: '0.5rem' }} />
                <select value={txType} onChange={(e) => setTxType(e.target.value)} style={{ padding: '0.5rem' }}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ padding: '0.5rem' }}>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                {txType === 'expense' && (
                  <select value={selectedEnvelope} onChange={(e) => setSelectedEnvelope(e.target.value)} style={{ padding: '0.5rem' }}>
                    {envelopes.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
                  </select>
                )}
                <button type="submit" className="btn-primary">Log Transaction</button>
              </form>
            </div>

            <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0', color: '#ccc' }}>History</h3>
            {transactions.map(tx => (
              <div key={tx.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#fff' }}>{tx.payee}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{tx.date}</div>
                </div>
                <span style={{ color: tx.type === 'income' ? '#2ecc71' : '#ff6b6b', fontWeight: 'bold' }}>
                  {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#fff' }}>Financial Reports</h3>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button className={`subtab-btn ${reportTimeframe === 'week' ? 'active' : ''}`} onClick={() => setReportTimeframe('week')}>Week</button>
                <button className={`subtab-btn ${reportTimeframe === 'month' ? 'active' : ''}`} onClick={() => setReportTimeframe('month')}>Month</button>
                <button className={`subtab-btn ${reportTimeframe === 'year' ? 'active' : ''}`} onClick={() => setReportTimeframe('year')}>Year</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Total Income</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2ecc71', marginTop: '0.25rem' }}>
                  ${totalIncome.toFixed(2)}
                </div>
              </div>

              <div className="stat-card">
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Total Expenses</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ff6b6b', marginTop: '0.25rem' }}>
                  ${totalExpenses.toFixed(2)}
                </div>
              </div>

              <div className="stat-card">
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Net Cash Flow</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: netCashFlow >= 0 ? '#2ecc71' : '#ff6b6b', marginTop: '0.25rem' }}>
                  ${netCashFlow.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEBTS TAB */}
        {activeTab === 'debts' && (
          <div>
            <div className="mobile-card">
              <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#fff' }}>Add Debt Account</h3>
              <form onSubmit={handleAddDebt} className="form-grid">
                <input type="text" placeholder="Debt Name" value={newDebtName} onChange={(e) => setNewDebtName(e.target.value)} style={{ padding: '0.5rem' }} />
                <input type="number" step="0.01" placeholder="Total Owed ($)" value={newDebtOwed} onChange={(e) => setNewDebtOwed(e.target.value)} style={{ padding: '0.5rem' }} />
                <input type="number" step="0.01" placeholder="Interest Rate (%)" value={newDebtRate} onChange={(e) => setNewDebtRate(e.target.value)} style={{ padding: '0.5rem' }} />
                <button type="submit" className="btn-primary">Add Debt</button>
              </form>
            </div>

            <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0', color: '#ccc' }}>Debts</h3>
            {debts.map(d => (
              <div key={d.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#fff' }}>{d.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{d.interestRate}% APR</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 'bold', color: '#ff6b6b' }}>${d.totalOwed.toFixed(2)}</span>
                  <button onClick={() => handleRemoveDebt(d.id)} className="btn-danger" style={{ fontSize: '0.8rem' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
