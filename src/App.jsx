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
    { id: '1', name: 'Auto Loan', totalOwed: 8500, interestRate: 4.5 },
    { id: '2', name: 'Rewards Credit Card', totalOwed: 450, interestRate: 19.99 }
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

  // --- ACCOUNT MANAGEMENT ---
  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccName || isNaN(parseFloat(newAccBalance))) return;
    setAccounts([...accounts, {
      id: Date.now().toString(),
      name: newAccName,
      type: newAccType,
      balance: parseFloat(newAccBalance)
    }]);
    setNewAccName('');
    setNewAccBalance('');
  };

  const handleRemoveAccount = (id) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
  };

  // --- GROUP & ENVELOPE MANAGEMENT ---
  const handleAddGroup = (e) => {
    e.preventDefault();
    if (!newGroupName || groups.includes(newGroupName)) return;
    setGroups([...groups, newGroupName]);
    setNewEnvGroup(newGroupName);
    setNewGroupName('');
  };

  const handleRemoveGroup = (groupName) => {
    // Remove group and its associated envelopes
    setGroups(groups.filter(g => g !== groupName));
    setEnvelopes(envelopes.filter(env => env.group !== groupName));
    if (newEnvGroup === groupName && groups.length > 1) {
      setNewEnvGroup(groups.find(g => g !== groupName));
    }
  };

  const handleAddEnvelope = (e) => {
    e.preventDefault();
    if (!newEnvName) return;
    setEnvelopes([...envelopes, {
      id: Date.now().toString(),
      name: newEnvName,
      group: newEnvGroup,
      assigned: 0,
      activity: 0
    }]);
    setNewEnvName('');
  };

  const handleRemoveEnvelope = (id) => {
    const targetEnv = envelopes.find(e => e.id === id);
    if (targetEnv && targetEnv.assigned > 0) {
      // Return remaining assigned funds back to Ready to Assign
      setReadyToAssign(prev => prev + targetEnv.assigned);
    }
    setEnvelopes(envelopes.filter(e => e.id !== id));
  };

  // --- DEBT MANAGEMENT ---
  const handleAddDebt = (e) => {
    e.preventDefault();
    if (!newDebtName || isNaN(parseFloat(newDebtOwed))) return;
    setDebts([...debts, {
      id: Date.now().toString(),
      name: newDebtName,
      totalOwed: parseFloat(newDebtOwed),
      interestRate: parseFloat(newDebtRate) || 0
    }]);
    setNewDebtName('');
    setNewDebtOwed('');
    setNewDebtRate('');
  };

  const handleRemoveDebt = (id) => {
    setDebts(debts.filter(d => d.id !== id));
  };

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

  // Auto Suggest Envelope on Payee Typing
  const handlePayeeChange = (val) => {
    setPayee(val);
    const lower = val.toLowerCase();
    const match = envelopes.find(e => lower.includes(e.name.toLowerCase()));
    if (match) setSelectedEnvelope(match.id);
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

    // Update Account Balance
    setAccounts(accounts.map(acc => acc.id === selectedAccount ? { ...acc, balance: acc.balance - numAmount } : acc));

    // Update Envelope Activity
    setEnvelopes(envelopes.map(env => env.id === selectedEnvelope ? { ...env, activity: env.activity + numAmount } : env));

    setPayee('');
    setAmount('');
  };

  const navStyle = (tab) => ({
    padding: '0.75rem 1.25rem',
    cursor: 'pointer',
    border: 'none',
    borderBottom: activeTab === tab ? '3px solid #0070f3' : '3px solid transparent',
    background: 'none',
    fontWeight: activeTab === tab ? 'bold' : 'normal',
    color: activeTab === tab ? '#0070f3' : '#555',
    fontSize: '1rem'
  });

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Envelope Budgeting</h1>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button style={navStyle('overview')} onClick={() => setActiveTab('overview')}>Overview</button>
        <button style={navStyle('envelopes')} onClick={() => setActiveTab('envelopes')}>Envelopes & Groups</button>
        <button style={navStyle('accounts')} onClick={() => setActiveTab('accounts')}>Accounts</button>
        <button style={navStyle('transactions')} onClick={() => setActiveTab('transactions')}>Transactions</button>
        <button style={navStyle('debts')} onClick={() => setActiveTab('debts')}>Debt Tracking</button>
      </div>

      {/* Ready to Assign Header Banner */}
      <div style={{ background: '#e6f4ea', padding: '1.25rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ margin: 0 }}>Ready to Assign: <span style={{ color: readyToAssign < 0 ? 'red' : '#28a745' }}>${readyToAssign.toFixed(2)}</span></h2>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          <h3>Budget Overview</h3>
          {groups.map(group => {
            const groupEnvelopes = envelopes.filter(e => e.group === group);
            return (
              <div key={group} style={{ marginBottom: '2rem', background: '#fff', border: '1px solid #e1e4e8', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#f6f8fa', padding: '0.75rem 1rem', borderBottom: '1px solid #e1e4e8', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{group}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafbfc', textAlign: 'left', fontSize: '0.85rem', color: '#586069' }}>
                      <th style={{ padding: '0.5rem 1rem' }}>Envelope</th>
                      <th style={{ padding: '0.5rem 1rem' }}>Assigned</th>
                      <th style={{ padding: '0.5rem 1rem' }}>Activity</th>
                      <th style={{ padding: '0.5rem 1rem' }}>Available</th>
                      <th style={{ padding: '0.5rem 1rem' }}>Adjust Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupEnvelopes.map(env => {
                      const available = env.assigned - env.activity;
                      return (
                        <tr key={env.id} style={{ borderBottom: '1px solid #e1e4e8' }}>
                          <td style={{ padding: '0.75rem 1rem' }}><strong>{env.name}</strong></td>
                          <td style={{ padding: '0.75rem 1rem' }}>${env.assigned.toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>${env.activity.toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 1rem', color: available < 0 ? 'red' : 'green', fontWeight: 'bold' }}>${available.toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <input
                              type="number"
                              placeholder="Amount"
                              value={adjustAmounts[env.id] || ''}
                              onChange={(e) => setAdjustAmounts({ ...adjustAmounts, [env.id]: e.target.value })}
                              style={{ width: '80px', padding: '0.3rem', marginRight: '0.5rem' }}
                            />
                            <button onClick={() => handleAdjustEnvelope(env.id, 'add')} style={{ marginRight: '0.25rem', background: '#e6f4ea', border: '1px solid #28a745', cursor: 'pointer', borderRadius: '4px' }}>+ Add</button>
                            <button onClick={() => handleAdjustEnvelope(env.id, 'subtract')} style={{ background: '#fce8e6', border: '1px solid #d93025', cursor: 'pointer', borderRadius: '4px' }}>- Subtract</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* ENVELOPES & GROUPS MANAGEMENT TAB */}
      {activeTab === 'envelopes' && (
        <div>
          <h3>Envelope & Group Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Group Addition Form */}
            <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px' }}>
              <h4>Add New Category Group</h4>
              <form onSubmit={handleAddGroup} style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="Group Name (e.g. Bills)" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} style={{ padding: '0.5rem', flex: 1 }} />
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Group</button>
              </form>
            </div>

            {/* Envelope Addition Form */}
            <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px' }}>
              <h4>Add New Envelope</h4>
              <form onSubmit={handleAddEnvelope} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input type="text" placeholder="Envelope Name" value={newEnvName} onChange={(e) => setNewEnvName(e.target.value)} style={{ padding: '0.5rem' }} />
                <select value={newEnvGroup} onChange={(e) => setNewEnvGroup(e.target.value)} style={{ padding: '0.5rem' }}>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create Envelope</button>
              </form>
            </div>
          </div>

          <h3>Manage Existing Groups & Envelopes</h3>
          {groups.map(group => (
            <div key={group} style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid #e1e4e8', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0 }}>Group: {group}</h4>
                <button onClick={() => handleRemoveGroup(group)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '0.3rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>Remove Group</button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {envelopes.filter(e => e.group === group).map(env => (
                  <li key={env.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span>{env.name}</span>
                    <button onClick={() => handleRemoveEnvelope(env.id)} style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Delete Envelope</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        <div>
          <h3>Manage Accounts</h3>
          <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <h4>Add New Account</h4>
            <form onSubmit={handleAddAccount} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem' }}>
              <input type="text" placeholder="Account Name" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} style={{ padding: '0.5rem' }} />
              <select value={newAccType} onChange={(e) => setNewAccType(e.target.value)} style={{ padding: '0.5rem' }}>
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
              </select>
              <input type="number" step="0.01" placeholder="Starting Balance" value={newAccBalance} onChange={(e) => setNewAccBalance(e.target.value)} style={{ padding: '0.5rem' }} />
              <button type="submit" style={{ padding: '0.5rem 1rem', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Account</button>
            </form>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f3f5', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Account Name</th>
                <th style={{ padding: '0.75rem' }}>Type</th>
                <th style={{ padding: '0.75rem' }}>Current Balance</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '0.75rem' }}><strong>{acc.name}</strong></td>
                  <td style={{ padding: '0.75rem' }}>{acc.type}</td>
                  <td style={{ padding: '0.75rem', color: acc.balance < 0 ? 'red' : 'black', fontWeight: 'bold' }}>${acc.balance.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button onClick={() => handleRemoveAccount(acc.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div>
          <h3>Log Manual Transaction</h3>
          <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.5rem' }}>
              <input type="text" placeholder="Payee" value={payee} onChange={(e) => handlePayeeChange(e.target.value)} style={{ padding: '0.5rem' }} />
              <input type="number" step="0.01" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '0.5rem' }} />
              <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ padding: '0.5rem' }}>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
              <select value={selectedEnvelope} onChange={(e) => setSelectedEnvelope(e.target.value)} style={{ padding: '0.5rem' }}>
                {envelopes.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
              </select>
              <button type="submit" style={{ padding: '0.5rem 1rem', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Log Expense</button>
            </form>
          </div>

          <h3>Transaction History</h3>
          {transactions.length === 0 ? <p style={{ color: '#666' }}>No transactions recorded yet.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f3f5', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  <th style={{ padding: '0.75rem' }}>Payee</th>
                  <th style={{ padding: '0.75rem' }}>Account</th>
                  <th style={{ padding: '0.75rem' }}>Envelope</th>
                  <th style={{ padding: '0.75rem' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const acc = accounts.find(a => a.id === tx.accountId);
                  const env = envelopes.find(e => e.id === tx.envelopeId);
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '0.75rem' }}>{tx.date}</td>
                      <td style={{ padding: '0.75rem' }}><strong>{tx.payee}</strong></td>
                      <td style={{ padding: '0.75rem' }}>{acc ? acc.name : 'N/A'}</td>
                      <td style={{ padding: '0.75rem' }}>{env ? env.name : 'N/A'}</td>
                      <td style={{ padding: '0.75rem', color: 'red' }}>-${tx.amount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* DEBT TRACKING TAB */}
      {activeTab === 'debts' && (
        <div>
          <h3>Debt Tracker</h3>
          <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <h4>Track New Debt</h4>
            <form onSubmit={handleAddDebt} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem' }}>
              <input type="text" placeholder="Debt Name (e.g. Student Loan)" value={newDebtName} onChange={(e) => setNewDebtName(e.target.value)} style={{ padding: '0.5rem' }} />
              <input type="number" step="0.01" placeholder="Total Balance ($)" value={newDebtOwed} onChange={(e) => setNewDebtOwed(e.target.value)} style={{ padding: '0.5rem' }} />
              <input type="number" step="0.01" placeholder="Interest Rate (%)" value={newDebtRate} onChange={(e) => setNewDebtRate(e.target.value)} style={{ padding: '0.5rem' }} />
              <button type="submit" style={{ padding: '0.5rem 1rem', background: '#d93025', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Debt</button>
            </form>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f3f5', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Debt Name</th>
                <th style={{ padding: '0.75rem' }}>Interest Rate</th>
                <th style={{ padding: '0.75rem' }}>Remaining Balance</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {debts.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '0.75rem' }}><strong>{d.name}</strong></td>
                  <td style={{ padding: '0.75rem' }}>{d.interestRate}% APR</td>
                  <td style={{ padding: '0.75rem', color: '#d93025', fontWeight: 'bold' }}>${d.totalOwed.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button onClick={() => handleRemoveDebt(d.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
