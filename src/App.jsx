import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
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

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('1');
  const [selectedEnvelope, setSelectedEnvelope] = useState('1');

  // Direct Envelope Addition / Subtraction
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

  // Add Transaction
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

  return (
    <div style={{ padding: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '800px', margin: '0 auto', paddingBottom: '5rem' }}>
      <style>{`
        input, select, button { font-size: 16px !important; min-height: 44px; box-sizing: border-box; }
        .tab-btn { padding: 0.75rem 1rem; border: none; background: none; font-size: 0.9rem; font-weight: 600; color: #666; cursor: pointer; white-space: nowrap; flex: 1; text-align: center; }
        .tab-btn.active { color: #0070f3; border-bottom: 3px solid #0070f3; }
        .mobile-card { background: #fff; border: 1px solid #e1e4e8; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .form-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        @media (min-width: 600px) {
          .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        }
      `}</style>

      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Envelope Budgeting</h1>

      {/* Navigation Bar */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #ddd', marginBottom: '1.25rem', WebkitOverflowScrolling: 'touch' }}>
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab-btn ${activeTab === 'envelopes' ? 'active' : ''}`} onClick={() => setActiveTab('envelopes')}>Envelopes</button>
        <button className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>Accounts</button>
        <button className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>Transactions</button>
        <button className={`tab-btn ${activeTab === 'debts' ? 'active' : ''}`} onClick={() => setActiveTab('debts')}>Debts</button>
      </div>

      {/* Ready to Assign Banner */}
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
            const groupEnvelopes = envelopes.filter(e => e.group === group);
            return (
              <div key={group} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#444' }}>{group}</h3>
                {groupEnvelopes.map(env => {
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
                        <button onClick={() => handleAdjustEnvelope(env.id, 'add')} style={{ background: '#e6f4ea', border: '1px solid #28a745', color: '#28a745', borderRadius: '4px', padding: '0 0.75rem', fontWeight: 'bold' }}>+</button>
                        <button onClick={() => handleAdjustEnvelope(env.id, 'subtract')} style={{ background: '#fce8e6', border: '1px solid #d93025', color: '#d93025', borderRadius: '4px', padding: '0 0.75rem', fontWeight: 'bold' }}>-</button>
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
          <div className="mobile-card" style={{ background: '#f8f9fa' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Add Expense</h3>
            <form onSubmit={handleAddTransaction} className="form-grid">
              <input type="text" placeholder="Payee" value={payee} onChange={(e) => setPayee(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="number" step="0.01" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
              <select value={selectedEnvelope} onChange={(e) => setSelectedEnvelope(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                {envelopes.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
              </select>
              <button type="submit" style={{ background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', padding: '0.75rem' }}>Log Expense</button>
            </form>
          </div>

          <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem 0' }}>History</h3>
          {transactions.map(tx => (
            <div key={tx.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{tx.payee}</strong>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{tx.date}</div>
              </div>
              <span style={{ color: 'red', fontWeight: 'bold' }}>-${tx.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        <div>
          {accounts.map(acc => (
            <div key={acc.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{acc.name}</strong>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{acc.type}</div>
              </div>
              <span style={{ fontWeight: 'bold', color: acc.balance < 0 ? 'red' : 'black' }}>${acc.balance.toFixed(2)}</span>
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
                <strong>{d.name}</strong>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{d.interestRate}% APR</div>
              </div>
              <span style={{ fontWeight: 'bold', color: '#d93025' }}>${d.totalOwed.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
