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

  // Category Groups & Envelopes State
  const [groups, setGroups] = useState(['Essentials', 'Subscriptions', 'Savings Goals']);
  const [envelopes, setEnvelopes] = useState([
    { 
      id: '1', 
      name: 'Groceries', 
      group: 'Essentials', 
      assigned: 250, 
      activity: 150, 
      targetType: 'WEEKLY_GOAL', // 'WEEKLY_GOAL' | 'REFILL_BY_DATE' | 'NONE'
      targetAmount: 100, 
      targetDate: '' 
    },
    { 
      id: '2', 
      name: 'Rent / Mortgage', 
      group: 'Essentials', 
      assigned: 0, 
      activity: 1200, 
      targetType: 'REFILL_BY_DATE', 
      targetAmount: 1200, 
      targetDate: '2026-10-01' 
    },
    { 
      id: '3', 
      name: 'Emergency Fund', 
      group: 'Savings Goals', 
      assigned: 500, 
      activity: 0, 
      targetType: 'REFILL_BY_DATE', 
      targetAmount: 5000, 
      targetDate: '2027-01-01' 
    }
  ]);

  // Form State for Creating New Envelope
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvGroup, setNewEnvGroup] = useState('Essentials');
  const [newEnvTargetType, setNewEnvTargetType] = useState('NONE');
  const [newEnvTargetAmount, setNewEnvTargetAmount] = useState('');
  const [newEnvTargetDate, setNewEnvTargetDate] = useState('');

  const [adjustAmounts, setAdjustAmounts] = useState({});

  // Debts State
  const [debts, setDebts] = useState([
    { id: '1', name: 'Auto Loan', totalOwed: 8500, interestRate: 4.5, monthlyPayment: 250 },
    { id: '2', name: 'Rewards Credit Card', totalOwed: 450, interestRate: 19.99, monthlyPayment: 50 }
  ]);

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState('expense');
  const [selectedAccount, setSelectedAccount] = useState('1');
  const [selectedEnvelope, setSelectedEnvelope] = useState('1');

  // Nav Click Handler
  const handleNavClick = (tabKey) => {
    setActiveTab(tabKey);
    setIsSidebarOpen(false);
  };

  // Add New Envelope with Target Options
  const handleAddEnvelope = (e) => {
    e.preventDefault();
    if (!newEnvName.trim()) return;

    const newEnv = {
      id: Date.now().toString(),
      name: newEnvName.trim(),
      group: newEnvGroup,
      assigned: 0,
      activity: 0,
      targetType: newEnvTargetType,
      targetAmount: newEnvTargetAmount ? parseFloat(newEnvTargetAmount) : 0,
      targetDate: newEnvTargetDate || ''
    };

    setEnvelopes([...envelopes, newEnv]);
    setNewEnvName('');
    setNewEnvTargetType('NONE');
    setNewEnvTargetAmount('');
    setNewEnvTargetDate('');
  };

  // Adjust Envelope Balance
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

  // Helper to Calculate Goal Details & Remaining to Fill
  const getTargetMetrics = (env) => {
    const available = env.assigned - env.activity;
    if (!env.targetType || env.targetType === 'NONE' || !env.targetAmount) {
      return null;
    }

    let remainingToFill = 0;
    let progress = 0;
    let label = '';

    if (env.targetType === 'WEEKLY_GOAL') {
      remainingToFill = Math.max(0, env.targetAmount - available);
      progress = Math.min(100, (available / env.targetAmount) * 100);
      label = `Goal: $${env.targetAmount.toFixed(2)}/week`;
    } else if (env.targetType === 'REFILL_BY_DATE') {
      remainingToFill = Math.max(0, env.targetAmount - available);
      progress = Math.min(100, (available / env.targetAmount) * 100);
      label = `Refill to $${env.targetAmount.toFixed(2)}${env.targetDate ? ` by ${env.targetDate}` : ''}`;
    }

    return { available, remainingToFill, progress, label };
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh' }}>
      <style>{`
        input, select, button { font-size: 16px !important; min-height: 44px; box-sizing: border-box; background-color: #2a2a2a; color: #ffffff; border: 1px solid #444; border-radius: 4px; }
        input::placeholder { color: #888; }
        .mobile-card { background: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .form-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .btn-primary { background: #0070f3; border: none; color: #fff; border-radius: 4px; font-weight: bold; padding: 0.5rem 1rem; cursor: pointer; }
        .sidebar-btn { display: block; width: 100%; text-align: left; padding: 0.85rem 1.25rem; background: none; border: none; color: #ccc; font-size: 1rem; font-weight: 600; cursor: pointer; border-left: 4px solid transparent; }
        .sidebar-btn.active { color: #28a745; background: #252525; border-left-color: #28a745; }
        @media (min-width: 600px) {
          .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        }
      `}</style>

      {/* Header Bar with Sidebar Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#1e1e1e', borderBottom: '1px solid #333', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          ☰
        </button>
        <h1 style={{ fontSize: '1.25rem', margin: 0, color: '#ffffff' }}>Envelope Budgeting</h1>
        <div style={{ width: '24px' }}></div>
      </div>

      {/* Sidebar Overlay Backdrop */}
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
          <strong style={{ fontSize: '1.1rem', color: '#fff' }}>Menu</strong>
          <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ flex: 1, paddingTop: '0.5rem' }}>
          <button className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleNavClick('overview')}>Overview</button>
          <button className={`sidebar-btn ${activeTab === 'envelopes' ? 'active' : ''}`} onClick={() => handleNavClick('envelopes')}>Envelopes</button>
          <button className={`sidebar-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => handleNavClick('accounts')}>Accounts</button>
          <button className={`sidebar-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => handleNavClick('transactions')}>Transactions</button>
          <button className={`sidebar-btn ${activeTab === 'debts' ? 'active' : ''}`} onClick={() => handleNavClick('debts')}>Debts</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '5rem' }}>

        {/* Ready to Assign Banner */}
        <div style={{ background: '#1c2d22', border: '1px solid #28a745', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#a0a0a0' }}>Ready to Assign</span>
          <h2 style={{ margin: '0.25rem 0 0 0', color: readyToAssign < 0 ? '#ff6b6b' : '#28a745', fontSize: '1.75rem' }}>
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
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#ccc' }}>{group}</h3>
                  {groupEnvelopes.map(env => {
                    const available = env.assigned - env.activity;
                    const metrics = getTargetMetrics(env);

                    return (
                      <div key={env.id} className="mobile-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{env.name}</strong>
                          <span style={{ fontWeight: 'bold', color: available < 0 ? '#ff6b6b' : '#28a745', fontSize: '1.1rem' }}>
                            ${available.toFixed(2)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.75rem' }}>
                          <span>Assigned: ${env.assigned.toFixed(2)}</span>
                          <span>Activity: ${env.activity.toFixed(2)}</span>
                        </div>

                        {/* Goal Progress Bar & Left to Fill Indicator */}
                        {metrics && (
                          <div style={{ background: '#252525', border: '1px solid #3b3b3b', padding: '0.65rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.35rem' }}>
                              <span>{metrics.label}</span>
                              <span style={{ color: metrics.remainingToFill > 0 ? '#ffb74d' : '#28a745', fontWeight: 'bold' }}>
                                {metrics.remainingToFill > 0 ? `Left to fill: $${metrics.remainingToFill.toFixed(2)}` : 'Goal Funded!'}
                              </span>
                            </div>
                            <div style={{ background: '#181818', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ background: metrics.remainingToFill <= 0 ? '#28a745' : '#0070f3', height: '100%', width: `${metrics.progress}%`, transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={adjustAmounts[env.id] || ''}
                            onChange={(e) => setAdjustAmounts({ ...adjustAmounts, [env.id]: e.target.value })}
                            style={{ flex: 1, padding: '0.4rem 0.6rem' }}
                          />
                          <button onClick={() => handleAdjustEnvelope(env.id, 'add')} style={{ background: '#1c2d22', border: '1px solid #28a745', color: '#28a745', borderRadius: '4px', padding: '0 0.75rem', fontWeight: 'bold' }}>+</button>
                          <button onClick={() => handleAdjustEnvelope(env.id, 'subtract')} style={{ background: '#3a1c1c', border: '1px solid #d93025', color: '#ff6b6b', borderRadius: '4px', padding: '0 0.75rem', fontWeight: 'bold' }}>-</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ENVELOPES TAB (Add Envelope with Target Options) */}
        {activeTab === 'envelopes' && (
          <div>
            <div className="mobile-card">
              <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#fff' }}>Add New Envelope</h3>
              <form onSubmit={handleAddEnvelope} className="form-grid">
                <input
                  type="text"
                  placeholder="Envelope Name (e.g. Groceries)"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  style={{ padding: '0.5rem' }}
                  required
                />
                
                <select value={newEnvGroup} onChange={(e) => setNewEnvGroup(e.target.value)} style={{ padding: '0.5rem' }}>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                <select value={newEnvTargetType} onChange={(e) => setNewEnvTargetType(e.target.value)} style={{ padding: '0.5rem' }}>
                  <option value="NONE">No Target Goal</option>
                  <option value="WEEKLY_GOAL">Save amount per week</option>
                  <option value="REFILL_BY_DATE">Refill to amount by date</option>
                </select>

                {newEnvTargetType !== 'NONE' && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder={newEnvTargetType === 'WEEKLY_GOAL' ? "Weekly Amount ($)" : "Target Amount ($)"}
                    value={newEnvTargetAmount}
                    onChange={(e) => setNewEnvTargetAmount(e.target.value)}
                    style={{ padding: '0.5rem' }}
                  />
                )}

                {newEnvTargetType === 'REFILL_BY_DATE' && (
                  <input
                    type="date"
                    value={newEnvTargetDate}
                    onChange={(e) => setNewEnvTargetDate(e.target.value)}
                    style={{ padding: '0.5rem' }}
                  />
                )}

                <button type="submit" className="btn-primary" style={{ gridColumn: '1 / -1' }}>+ Create Envelope</button>
              </form>
            </div>
          </div>
        )}

        {/* ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          <div>
            {accounts.map(acc => (
              <div key={acc.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#fff' }}>{acc.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{acc.type}</div>
                </div>
                <span style={{ fontWeight: 'bold', color: acc.balance < 0 ? '#ff6b6b' : '#ffffff' }}>${acc.balance.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* DEBTS TAB */}
        {activeTab === 'debts' && (
          <div>
            {debts.map(d => (
              <div key={d.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#fff' }}>{d.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{d.interestRate}% APR</div>
                </div>
                <span style={{ fontWeight: 'bold', color: '#ff6b6b' }}>${d.totalOwed.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
