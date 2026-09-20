import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [reportSubTab, setReportSubTab] = useState('month'); // 'week' | 'month' | 'year'
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
    { id: '1', name: 'Groceries', group: 'Essentials', assigned: 400, activity: 150 },
    { id: '2', name: 'Rent / Mortgage', group: 'Essentials', assigned: 1200, activity: 1200 },
    { id: '3', name: 'Netflix & Spotify', group: 'Subscriptions', assigned: 30, activity: 30 },
    { id: '4', name: 'Emergency Fund', group: 'Savings Goals', assigned: 500, activity: 0 }
  ]);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvGroup, setNewEnvGroup] = useState('Essentials');
  const [adjustAmounts, setAdjustAmounts] = useState({});

  // Debts State
  const [debts, setDebts] = useState([
    { id: '1', name: 'Auto Loan', totalOwed: 8500, interestRate: 4.5, monthlyPayment: 250 },
    { id: '2', name: 'Rewards Credit Card', totalOwed: 450, interestRate: 19.99, monthlyPayment: 50 }
  ]);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtOwed, setNewDebtOwed] = useState('');
  const [newDebtRate, setNewDebtRate] = useState('');

  // Transactions State with editable date
  const todayStr = new Date().toISOString().split('T')[0];
  const [transactions, setTransactions] = useState([
    { id: 'tx-1', payee: 'Employer Co', amount: 3000, type: 'income', accountId: '1', envelopeId: '1', date: todayStr },
    { id: 'tx-2', payee: 'Supermarket', amount: 150, type: 'expense', accountId: '1', envelopeId: '1', date: todayStr },
    { id: 'tx-3', payee: 'Property Mgmt', amount: 1200, type: 'expense', accountId: '1', envelopeId: '2', date: todayStr }
  ]);
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [txDate, setTxDate] = useState(todayStr);
  const [txType, setTxType] = useState('expense');
  const [selectedAccount, setSelectedAccount] = useState('1');
  const [selectedEnvelope, setSelectedEnvelope] = useState('1');

  // --- HANDLERS ---
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
    setEnvelopes([...envelopes, {
      id: Date.now().toString(),
      name: newEnvName.trim(),
      group: newEnvGroup,
      assigned: 0,
      activity: 0
    }]);
    setNewEnvName('');
  };

  const handleRemoveEnvelope = (id) => {
    const target = envelopes.find(e => e.id === id);
    if (target && target.assigned > 0) {
      setReadyToAssign(prev => prev + target.assigned);
    }
    setEnvelopes(envelopes.filter(e => e.id !== id));
  };

  const handleAddDebt = (e) => {
    e.preventDefault();
    const owed = parseFloat(newDebtOwed);
    if (!newDebtName || isNaN(owed)) return;
    setDebts([...debts, {
      id: Date.now().toString(),
      name: newDebtName,
      totalOwed: owed,
      interestRate: parseFloat(newDebtRate) || 0,
      monthlyPayment: 0
    }]);
    setNewDebtName('');
    setNewDebtOwed('');
    setNewDebtRate('');
  };

  const handleRemoveDebt = (id) => {
    setDebts(debts.filter(d => d.id !== id));
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
      date: txDate || todayStr
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

  // --- REPORT CALCULATIONS BASED ON DATE ---
  const now = new Date();

  // Week Filter (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekTxs = transactions.filter(tx => new Date(tx.date) >= sevenDaysAgo);

  // Month Filter (current YYYY-MM)
  const currentMonthStr = now.toISOString().slice(0, 7);
  const monthTxs = transactions.filter(tx => tx.date && tx.date.startsWith(currentMonthStr));

  // Year Filter (current YYYY)
  const currentYearStr = now.getFullYear().toString();
  const yearTxs = transactions.filter(tx => tx.date && tx.date.startsWith(currentYearStr));

  const getMetrics = (txList) => {
    const inc = txList.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txList.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0);
    return { income: inc, expenses: exp, net: inc - exp, count: txList.length };
  };

  const weekMetrics = getMetrics(weekTxs);
  const monthMetrics = getMetrics(monthTxs);
  const yearMetrics = getMetrics(yearTxs);

  return (
    <div style={{ backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '5rem' }}>
        <style>{`
          input, select, button {
            font-size: 16px !important;
            min-height: 44px;
            box-sizing: border-box;
            background-color: #2a2a2a;
            color: #e0e0e0;
            border: 1px solid #444;
            border-radius: 4px;
          }
          input::placeholder { color: #888; }
          .tab-btn {
            padding: 0.75rem 1rem;
            border: none;
            background: none;
            font-size: 0.9rem;
            font-weight: 600;
            color: #888;
            cursor: pointer;
            white-space: nowrap;
            flex: 1;
            text-align: center;
          }
          .tab-btn.active {
            color: #388e3c;
            border-bottom: 3px solid #388e3c;
          }
          .mobile-card {
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.4);
          }
          .form-grid { display: flex; flex-direction: column; gap: 0.75rem; }
          .btn-danger {
            background: #3b1919;
            border: 1px solid #d93025;
            color: #ff6b6b;
            border-radius: 4px;
            padding: 0.4rem 0.75rem;
            font-weight: bold;
            cursor: pointer;
          }
          .btn-primary {
            background: #0070f3;
            border: none;
            color: #fff;
            border-radius: 4px;
            font-weight: bold;
            padding: 0.5rem 1rem;
            cursor: pointer;
          }
          .side-tab-btn {
            padding: 0.6rem 1rem;
            border: none;
            background: #1e1e1e;
            color: #aaa;
            font-weight: 600;
            text-align: left;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s ease;
          }
          .side-tab-btn:hover { background: #2a2a2a; color: #fff; }
          .side-tab-btn.active {
            background: #0070f3;
            color: #ffffff;
          }
          @media (min-width: 600px) {
            .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
          }
        `}</style>

        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>Envelope Budgeting</h1>

        {/* Top Navigation Bar */}
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #333', marginBottom: '1.25rem', WebkitOverflowScrolling: 'touch' }}>
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`tab-btn ${activeTab === 'envelopes' ? 'active' : ''}`} onClick={() => setActiveTab('envelopes')}>Envelopes</button>
          <button className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>Accounts</button>
          <button className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>Transactions</button>
          <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>Reports</button>
          <button className={`tab-btn ${activeTab === 'debts' ? 'active' : ''}`} onClick={() => setActiveTab('debts')}>Debts</button>
        </div>

        {/* Ready to Assign Banner */}
        <div style={{ background: '#1b3820', border: '1px solid #28a745', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#a3e2b2' }}>Ready to Assign</span>
          <h2 style={{ margin: '0.25rem 0 0 0', color: readyToAssign < 0 ? '#ff6b6b' : '#4caf50', fontSize: '1.75rem' }}>
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
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#bbb' }}>{group}</h3>
                  {groupEnvelopes.map(env => {
                    const available = env.assigned - env.activity;
                    return (
                      <div key={env.id} className="mobile-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{env.name}</strong>
                          <span style={{ fontWeight: 'bold', color: available < 0 ? '#ff6b6b' : '#4caf50', fontSize: '1.1rem' }}>
                            ${available.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.75rem' }}>
                          <span>Assigned: ${env.assigned.toFixed(2)}</span>
                          <span>Activity: ${env.activity.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={adjustAmounts[env.id] || ''}
                            onChange={(e) => setAdjustAmounts({ ...adjustAmounts, [env.id]: e.target.value })}
                            style={{ flex: 1, padding: '0.4rem 0.6rem' }}
                          />
                          <button onClick={() => handleAdjustEnvelope(env.id, 'add')} style={{ background: '#1b3820', border: '1px solid #28a745', color: '#4caf50', borderRadius: '4px', padding: '0 0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                          <button onClick={() => handleAdjustEnvelope(env.id, 'subtract')} style={{ background: '#3b1919', border: '1px solid #d93025', color: '#ff6b6b', borderRadius: '4px', padding: '0 0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
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

            <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0', color: '#bbb' }}>History</h3>
            {transactions.map(tx => (
              <div key={tx.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#fff' }}>{tx.payee}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>Date: {tx.date}</div>
                </div>
                <span style={{ color: tx.type === 'income' ? '#4caf50' : '#ff6b6b', fontWeight: 'bold' }}>
                  {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* REPORTS TAB WITH SIDE TABS */}
        {activeTab === 'reports' && (
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#fff' }}>Financial Reports</h3>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '120px' }}>
                <button
                  className={`side-tab-btn ${reportSubTab === 'week' ? 'active' : ''}`}
                  onClick={() => setReportSubTab('week')}
                >
                  Week
                </button>
                <button
                  className={`side-tab-btn ${reportSubTab === 'month' ? 'active' : ''}`}
                  onClick={() => setReportSubTab('month')}
                >
                  Month
                </button>
                <button
                  className={`side-tab-btn ${reportSubTab === 'year' ? 'active' : ''}`}
                  onClick={() => setReportSubTab('year')}
                >
                  Year
                </button>
              </div>

              <div style={{ flex: 1, minWidth: '240px' }}>
                {reportSubTab === 'week' && (
                  <div className="mobile-card">
                    <h4 style={{ margin: '0 0 1rem 0', color: '#388e3c', fontSize: '1.1rem' }}>Weekly Report (Last 7 Days)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Income</span>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>+${weekMetrics.income.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Expenses</span>
                        <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>-${weekMetrics.expenses.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold' }}>Net Cash Flow</span>
                        <span style={{ color: weekMetrics.net >= 0 ? '#4caf50' : '#ff6b6b', fontWeight: 'bold' }}>
                          ${weekMetrics.net.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888', textAlign: 'right' }}>
                        {weekMetrics.count} transaction(s) found
                      </div>
                    </div>
                  </div>
                )}

                {reportSubTab === 'month' && (
                  <div className="mobile-card">
                    <h4 style={{ margin: '0 0 1rem 0', color: '#388e3c', fontSize: '1.1rem' }}>Monthly Report ({currentMonthStr})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Income</span>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>+${monthMetrics.income.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Expenses</span>
                        <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>-${monthMetrics.expenses.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold' }}>Net Cash Flow</span>
                        <span style={{ color: monthMetrics.net >= 0 ? '#4caf50' : '#ff6b6b', fontWeight: 'bold' }}>
                          ${monthMetrics.net.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888', textAlign: 'right' }}>
                        {monthMetrics.count} transaction(s) found
                      </div>
                    </div>
                  </div>
                )}

                {reportSubTab === 'year' && (
                  <div className="mobile-card">
                    <h4 style={{ margin: '0 0 1rem 0', color: '#388e3c', fontSize: '1.1rem' }}>Yearly Report ({currentYearStr})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Income</span>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>+${yearMetrics.income.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Expenses</span>
                        <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>-${yearMetrics.expenses.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold' }}>Net Cash Flow</span>
                        <span style={{ color: yearMetrics.net >= 0 ? '#4caf50' : '#ff6b6b', fontWeight: 'bold' }}>
                          ${yearMetrics.net.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888', textAlign: 'right' }}>
                        {yearMetrics.count} transaction(s) found
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
