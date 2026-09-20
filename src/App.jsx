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
  const [accountAdjustAmounts, setAccountAdjustAmounts] = useState({});

  // Category Groups & Envelopes State
  const [groups, setGroups] = useState(['Essentials', 'Subscriptions', 'Savings Goals']);
  const [newGroupName, setNewGroupName] = useState('');

  const [envelopes, setEnvelopes] = useState([
    { id: '1', name: 'Groceries', group: 'Essentials', assigned: 400, activity: 150, goalType: 'weekly', goalAmount: 150, targetDate: '' },
    { id: '2', name: 'Rent / Mortgage', group: 'Essentials', assigned: 1200, activity: 1200, goalType: 'none', goalAmount: 0, targetDate: '' },
    { id: '3', name: 'Netflix & Spotify', group: 'Subscriptions', assigned: 30, activity: 30, goalType: 'none', goalAmount: 0, targetDate: '' },
    { id: '4', name: 'Emergency Fund', group: 'Savings Goals', assigned: 500, activity: 0, goalType: 'refill', goalAmount: 1000, targetDate: '2026-12-31' }
  ]);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvGroup, setNewEnvGroup] = useState('Essentials');
  const [newEnvGoalType, setNewEnvGoalType] = useState('none');
  const [newEnvGoalAmount, setNewEnvGoalAmount] = useState('');
  const [newEnvTargetDate, setNewEnvTargetDate] = useState('');
  const [adjustAmounts, setAdjustAmounts] = useState({});

  // Debts State
  const [debts, setDebts] = useState([
    { id: '1', name: 'Auto Loan', totalOwed: 8500, interestRate: 4.5 },
    { id: '2', name: 'Rewards Credit Card', totalOwed: 450, interestRate: 19.99 }
  ]);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtOwed, setNewDebtOwed] = useState('');
  const [newDebtRate, setNewDebtRate] = useState('');
  const [debtAdjustAmounts, setDebtAdjustAmounts] = useState({});

  // Transactions State
  const [transactions, setTransactions] = useState([
    { id: '101', payee: "Trader Joe's", amount: 85.50, accountId: '1', envelopeId: '1', date: '2026-09-18' },
    { id: '102', payee: 'Netflix', amount: 15.99, accountId: '3', envelopeId: '3', date: '2026-09-15' }
  ]);
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('1');
  const [selectedEnvelope, setSelectedEnvelope] = useState('1');

  // --- ACCOUNTS HANDLERS ---
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

  const handleAdjustAccount = (id, mode) => {
    const val = parseFloat(accountAdjustAmounts[id]);
    if (isNaN(val) || val <= 0) return;
    setAccounts(accounts.map(acc => {
      if (acc.id === id) {
        return {
          ...acc,
          balance: mode === 'add' ? acc.balance + val : acc.balance - val
        };
      }
      return acc;
    }));
    setAccountAdjustAmounts({ ...accountAdjustAmounts, [id]: '' });
  };

  // --- ENVELOPE & GROUP HANDLERS ---
  const handleAddGroup = (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name || groups.includes(name)) return;
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
    setEnvelopes([...envelopes, {
      id: Date.now().toString(),
      name: newEnvName.trim(),
      group: newEnvGroup,
      assigned: 0,
      activity: 0,
      goalType: newEnvGoalType,
      goalAmount: parseFloat(newEnvGoalAmount) || 0,
      targetDate: newEnvTargetDate
    }]);
    setNewEnvName('');
    setNewEnvGoalType('none');
    setNewEnvGoalAmount('');
    setNewEnvTargetDate('');
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
      setEnvelopes(envelopes.map(env => env.id === id ? { ...env, assigned: env.assigned - val } : env));
    }

    setAdjustAmounts({ ...adjustAmounts, [id]: '' });
  };

  // --- TRANSACTION HANDLERS ---
  const handleAddTransaction = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!payee || isNaN(numAmount)) return;

    const newTx = {
      id: Date.now().toString(),
      payee,
      amount: numAmount,
      accountId: selectedAccount,
      envelopeId: selectedEnvelope,
      date: new Date().toISOString().split('T')[0]
    };

    setTransactions([newTx, ...transactions]);
    setAccounts(accounts.map(acc => acc.id === selectedAccount ? { ...acc, balance: acc.balance - numAmount } : acc));
    setEnvelopes(envelopes.map(env => env.id === selectedEnvelope ? { ...env, activity: env.activity + numAmount } : env));

    setPayee('');
    setAmount('');
  };

  const handleRemoveTransaction = (id) => {
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      // Revert account balance & envelope activity
      setAccounts(accounts.map(acc => acc.id === tx.accountId ? { ...acc, balance: acc.balance + tx.amount } : acc));
      setEnvelopes(envelopes.map(env => env.id === tx.envelopeId ? { ...env, activity: env.activity - tx.amount } : env));
    }
    setTransactions(transactions.filter(t => t.id !== id));
  };

  // --- DEBT HANDLERS ---
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

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'envelopes', label: 'Envelopes & Goals', icon: '✉️' },
    { id: 'accounts', label: 'Accounts', icon: '🏦' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
    { id: 'debts', label: 'Debt Tracker', icon: '📉' }
  ];

  return (
    <div style={{ backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        input, select, button { font-size: 15px; min-height: 40px; }
        input, select { background-color: #2a2a2a; color: #ffffff; border: 1px solid #444; border-radius: 6px; padding: 0.5rem 0.75rem; }
        input:focus, select:focus { outline: 2px solid #0070f3; border-color: transparent; }
        .card { background-color: #1e1e1e; border: 1px solid #2d2d2d; border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .form-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
        @media (min-width: 600px) {
          .form-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        }
        .btn-primary { background: #0070f3; color: #fff; border: none; border-radius: 6px; font-weight: 600; padding: 0.5rem 1rem; cursor: pointer; transition: opacity 0.2s; }
        .btn-primary:hover { opacity: 0.9; }
        .btn-success { background: #28a745; color: #fff; border: none; border-radius: 6px; font-weight: 600; padding: 0.4rem 0.75rem; cursor: pointer; }
        .btn-danger { background: #dc3545; color: #fff; border: none; border-radius: 6px; font-weight: 600; padding: 0.4rem 0.75rem; cursor: pointer; }
        .btn-subtle-danger { background: rgba(220, 53, 69, 0.2); color: #ff6b6b; border: 1px solid #dc3545; border-radius: 6px; padding: 0.35rem 0.65rem; cursor: pointer; font-size: 0.85rem; }
        .progress-bar-bg { background-color: #333; border-radius: 4px; height: 8px; width: 100%; overflow: hidden; margin-top: 0.5rem; }
        .progress-bar-fill { background-color: #28a745; height: 100%; transition: width 0.3s ease; }
      `}</style>

      {/* HEADER BAR WITH HAMBURGER BUTTON */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', backgroundColor: '#1e1e1e', borderBottom: '1px solid #2d2d2d', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}
            title="Toggle Menu"
          >
            ☰
          </button>
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 700 }}>Envelope Budgeting</h1>
        </div>
        <div style={{ background: '#1c3d27', border: '1px solid #28a745', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.9rem' }}>
          <span style={{ color: '#aaa', marginRight: '0.4rem' }}>Ready to Assign:</span>
          <strong style={{ color: readyToAssign < 0 ? '#ff6b6b' : '#28a745' }}>${readyToAssign.toFixed(2)}</strong>
        </div>
      </header>

      {/* OVERLAY & SIDEBAR MENU */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200 }}
        />
      )}

      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '260px',
        backgroundColor: '#181818',
        borderRight: '1px solid #2d2d2d',
        zIndex: 300,
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '0.75rem', borderBottom: '1px solid #2d2d2d' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Navigation</h2>
          <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: activeTab === item.id ? '#2d2d2d' : 'transparent',
                color: activeTab === item.id ? '#0070f3' : '#cccccc',
                border: 'none',
                borderRadius: '8px',
                textAlign: 'left',
                fontWeight: activeTab === item.id ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ marginTop: 0, color: '#fff', fontSize: '1.3rem' }}>Budget Overview</h2>
            {groups.map(group => {
              const groupEnvelopes = envelopes.filter(e => e.group === group);
              return (
                <div key={group} style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#0070f3', marginBottom: '0.75rem', borderBottom: '1px solid #2d2d2d', paddingBottom: '0.4rem' }}>{group}</h3>
                  {groupEnvelopes.map(env => {
                    const available = env.assigned - env.activity;
                    let goalText = '';
                    let leftToFill = 0;
                    let progressPct = 0;

                    if (env.goalType === 'weekly' && env.goalAmount > 0) {
                      leftToFill = Math.max(0, env.goalAmount - env.assigned);
                      progressPct = Math.min(100, (env.assigned / env.goalAmount) * 100);
                      goalText = `Goal: Save $${env.goalAmount.toFixed(2)} / week`;
                    } else if (env.goalType === 'refill' && env.goalAmount > 0) {
                      leftToFill = Math.max(0, env.goalAmount - available);
                      progressPct = Math.min(100, Math.max(0, (available / env.goalAmount) * 100));
                      goalText = `Goal: Refill to $${env.goalAmount.toFixed(2)}${env.targetDate ? ' by ' + env.targetDate : ''}`;
                    }

                    return (
                      <div key={env.id} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{env.name}</strong>
                          <span style={{ fontWeight: 'bold', color: available < 0 ? '#ff6b6b' : '#28a745', fontSize: '1.2rem' }}>
                            ${available.toFixed(2)} <span style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 'normal' }}>available</span>
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>
                          <span>Assigned: <strong style={{ color: '#e0e0e0' }}>${env.assigned.toFixed(2)}</strong></span>
                          <span>Activity: <strong style={{ color: '#e0e0e0' }}>${env.activity.toFixed(2)}</strong></span>
                        </div>

                        {/* GOAL & PROGRESS DISPLAY */}
                        {env.goalType !== 'none' && env.goalAmount > 0 && (
                          <div style={{ backgroundColor: '#262626', padding: '0.6rem 0.8rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#bbb' }}>
                              <span>🎯 {goalText}</span>
                              <span style={{ color: leftToFill === 0 ? '#28a745' : '#ffc107', fontWeight: 'bold' }}>
                                {leftToFill === 0 ? 'Goal Reached!' : `Left to fill: $${leftToFill.toFixed(2)}`}
                              </span>
                            </div>
                            <div className="progress-bar-bg">
                              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={adjustAmounts[env.id] || ''}
                            onChange={(e) => setAdjustAmounts({ ...adjustAmounts, [env.id]: e.target.value })}
                            style={{ flex: 1 }}
                          />
                          <button onClick={() => handleAdjustEnvelope(env.id, 'add')} className="btn-success">+ Assign</button>
                          <button onClick={() => handleAdjustEnvelope(env.id, 'subtract')} className="btn-danger">- Remove</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ENVELOPES & GOALS TAB */}
        {activeTab === 'envelopes' && (
          <div>
            <div className="card">
              <h3 style={{ marginTop: 0, color: '#fff', fontSize: '1.1rem' }}>Create Category Group</h3>
              <form onSubmit={handleAddGroup} className="form-grid">
                <input type="text" placeholder="Group Name (e.g., Bills)" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
                <button type="submit" className="btn-primary">Add Group</button>
              </form>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0, color: '#fff', fontSize: '1.1rem' }}>Add New Envelope with Goal</h3>
              <form onSubmit={handleAddEnvelope} className="form-grid">
                <input type="text" placeholder="Envelope Name" value={newEnvName} onChange={(e) => setNewEnvName(e.target.value)} required />
                <select value={newEnvGroup} onChange={(e) => setNewEnvGroup(e.target.value)}>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={newEnvGoalType} onChange={(e) => setNewEnvGoalType(e.target.value)}>
                  <option value="none">No Goal Target</option>
                  <option value="weekly">Weekly Target (Save $X per week)</option>
                  <option value="refill">Refill Target (Refill to $X by date)</option>
                </select>
                {newEnvGoalType !== 'none' && (
                  <input type="number" step="0.01" placeholder="Target Amount ($)" value={newEnvGoalAmount} onChange={(e) => setNewEnvGoalAmount(e.target.value)} required />
                )}
                {newEnvGoalType === 'refill' && (
                  <input type="date" value={newEnvTargetDate} onChange={(e) => setNewEnvTargetDate(e.target.value)} />
                )}
                <button type="submit" className="btn-primary">Create Envelope</button>
              </form>
            </div>

            <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '1.5rem 0 0.75rem 0' }}>Manage Category Groups & Envelopes</h3>
            {groups.map(group => (
              <div key={group} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #2d2d2d' }}>
                  <strong style={{ fontSize: '1.05rem', color: '#0070f3' }}>Group: {group}</strong>
                  <button onClick={() => handleRemoveGroup(group)} className="btn-subtle-danger">Delete Group</button>
                </div>
                {envelopes.filter(e => e.group === group).map(env => (
                  <div key={env.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderTop: '1px solid #282828' }}>
                    <div>
                      <strong style={{ color: '#fff' }}>{env.name}</strong>
                      {env.goalType !== 'none' && (
                        <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                          Goal: {env.goalType === 'weekly' ? `Save $${env.goalAmount}/wk` : `Refill to $${env.goalAmount}`}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleRemoveEnvelope(env.id)} className="btn-subtle-danger">Delete</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          <div>
            <div className="card">
              <h3 style={{ marginTop: 0, color: '#fff', fontSize: '1.1rem' }}>Add New Account</h3>
              <form onSubmit={handleAddAccount} className="form-grid">
                <input type="text" placeholder="Account Name" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} required />
                <select value={newAccType} onChange={(e) => setNewAccType(e.target.value)}>
                  <option value="Checking">Checking</option>
                  <option value="Savings">Savings</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                </select>
                <input type="number" step="0.01" placeholder="Starting Balance" value={newAccBalance} onChange={(e) => setNewAccBalance(e.target.value)} required />
                <button type="submit" className="btn-primary">Add Account</button>
              </form>
            </div>

            <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '1.5rem 0 0.75rem 0' }}>Manage Accounts</h3>
            {accounts.map(acc => (
              <div key={acc.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{acc.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{acc.type}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 'bold', color: acc.balance < 0 ? '#ff6b6b' : '#28a745', fontSize: '1.15rem' }}>
                      ${acc.balance.toFixed(2)}
                    </span>
                    <button onClick={() => handleRemoveAccount(acc.id)} className="btn-subtle-danger">Remove</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    placeholder="Adjust Amount"
                    value={accountAdjustAmounts[acc.id] || ''}
                    onChange={(e) => setAccountAdjustAmounts({ ...accountAdjustAmounts, [acc.id]: e.target.value })}
                    style={{ flex: 1 }}
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
            <div className="card">
              <h3 style={{ marginTop: 0, color: '#fff', fontSize: '1.1rem' }}>Log Expense Transaction</h3>
              <form onSubmit={handleAddTransaction} className="form-grid">
                <input type="text" placeholder="Payee / Vendor" value={payee} onChange={(e) => setPayee(e.target.value)} required />
                <input type="number" step="0.01" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                <select value={selectedEnvelope} onChange={(e) => setSelectedEnvelope(e.target.value)}>
                  {envelopes.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
                </select>
                <button type="submit" className="btn-primary">Log Transaction</button>
              </form>
            </div>

            <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '1.5rem 0 0.75rem 0' }}>Transaction History</h3>
            {transactions.length === 0 ? (
              <p style={{ color: '#aaa' }}>No transactions logged yet.</p>
            ) : (
              transactions.map(tx => {
                const acc = accounts.find(a => a.id === tx.accountId);
                const env = envelopes.find(e => e.id === tx.envelopeId);
                return (
                  <div key={tx.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{tx.payee}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.2rem' }}>
                        {tx.date} • Account: {acc ? acc.name : 'Unknown'} • Envelope: {env ? env.name : 'Unknown'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        -${tx.amount.toFixed(2)}
                      </span>
                      <button onClick={() => handleRemoveTransaction(tx.id)} className="btn-subtle-danger" title="Delete Transaction">
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* DEBTS TAB */}
        {activeTab === 'debts' && (
          <div>
            <div className="card">
              <h3 style={{ marginTop: 0, color: '#fff', fontSize: '1.1rem' }}>Add Debt Account</h3>
              <form onSubmit={handleAddDebt} className="form-grid">
                <input type="text" placeholder="Debt Name (e.g. Student Loan)" value={newDebtName} onChange={(e) => setNewDebtName(e.target.value)} required />
                <input type="number" step="0.01" placeholder="Total Balance ($)" value={newDebtOwed} onChange={(e) => setNewDebtOwed(e.target.value)} required />
                <input type="number" step="0.01" placeholder="Interest Rate (%)" value={newDebtRate} onChange={(e) => setNewDebtRate(e.target.value)} />
                <button type="submit" className="btn-primary">Add Debt</button>
              </form>
            </div>

            <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '1.5rem 0 0.75rem 0' }}>Manage Debts</h3>
            {debts.map(d => (
              <div key={d.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{d.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{d.interestRate}% APR</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 'bold', color: '#ff6b6b', fontSize: '1.15rem' }}>
                      ${d.totalOwed.toFixed(2)}
                    </span>
                    <button onClick={() => handleRemoveDebt(d.id)} className="btn-subtle-danger">Delete Debt</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    placeholder="Adjust Balance"
                    value={debtAdjustAmounts[d.id] || ''}
                    onChange={(e) => setDebtAdjustAmounts({ ...debtAdjustAmounts, [d.id]: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => handleAdjustDebt(d.id, 'add')} className="btn-danger">+ Debt</button>
                  <button onClick={() => handleAdjustDebt(d.id, 'subtract')} className="btn-success">- Pay Down</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
