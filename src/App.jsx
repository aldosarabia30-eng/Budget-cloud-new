import React, { useState } from 'react';

export default function App() {
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
    { id: '1', name: 'Groceries', group: 'Essentials', assigned: 400, activity: 150 },
    { id: '2', name: 'Rent / Mortgage', group: 'Essentials', assigned: 1200, activity: 1200 },
    { id: '3', name: 'Netflix & Spotify', group: 'Subscriptions', assigned: 30, activity: 30 },
    { id: '4', name: 'Emergency Fund', group: 'Savings Goals', assigned: 500, activity: 0 }
  ]);

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('1');
  const [selectedEnvelope, setSelectedEnvelope] = useState('1');

  // --- SIMPLE KEYWORD / PATTERN MATCHING HANDLER ---
  const handlePayeeChange = (val) => {
    setPayee(val);
    const lower = val.toLowerCase();

    // 1. Direct Pattern Rules
    if (lower.includes('walmart') || lower.includes('trader') || lower.includes('safeway') || lower.includes('kroger')) {
      const groc = envelopes.find(e => e.name.toLowerCase().includes('grocery') || e.name.toLowerCase().includes('groceries'));
      if (groc) setSelectedEnvelope(groc.id);
    } else if (lower.includes('landlord') || lower.includes('rent') || lower.includes('mortgage')) {
      const rent = envelopes.find(e => e.name.toLowerCase().includes('rent'));
      if (rent) setSelectedEnvelope(rent.id);
    } else if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('hulu')) {
      const sub = envelopes.find(e => e.name.toLowerCase().includes('netflix') || e.name.toLowerCase().includes('subscription'));
      if (sub) setSelectedEnvelope(sub.id);
    } else {
      // 2. Generic Keyword Match against Envelope Names
      const match = envelopes.find(e => lower.includes(e.name.toLowerCase()));
      if (match) setSelectedEnvelope(match.id);
    }
  };

  // Add Transaction & Update Balances
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

    // Deduct from Account Balance
    setAccounts(accounts.map(acc => acc.id === selectedAccount ? { ...acc, balance: acc.balance - numAmount } : acc));

    // Increase Envelope Activity
    setEnvelopes(envelopes.map(env => env.id === selectedEnvelope ? { ...env, activity: env.activity + numAmount } : env));

    setPayee('');
    setAmount('');
  };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Envelope Budgeting</h1>

      {/* Ready to Assign Banner */}
      <div style={{ background: '#e6f4ea', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: '#333' }}>Ready to Assign</span>
        <h2 style={{ margin: '0.25rem 0 0 0', color: readyToAssign < 0 ? 'red' : '#28a745', fontSize: '1.75rem' }}>
          ${readyToAssign.toFixed(2)}
        </h2>
      </div>

      {/* Manual Expense Form with Client-Side Keyword Auto-Suggest */}
      <div style={{ background: '#f8f9fa', border: '1px solid #e1e4e8', borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>Add Transaction</h3>
        <form onSubmit={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Payee (e.g., Walmart, Rent)"
            value={payee}
            onChange={(e) => handlePayeeChange(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount ($)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
          <select value={selectedEnvelope} onChange={(e) => setSelectedEnvelope(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
            {envelopes.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
          </select>
          <button type="submit" style={{ background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Log Expense
          </button>
        </form>
      </div>

      {/* Envelopes Display */}
      <h3>Envelopes</h3>
      {envelopes.map(env => {
        const available = env.assigned - env.activity;
        return (
          <div key={env.id} style={{ background: '#fff', border: '1px solid #e1e4e8', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{env.name}</strong>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Assigned: ${env.assigned.toFixed(2)} | Activity: ${env.activity.toFixed(2)}</div>
            </div>
            <span style={{ fontWeight: 'bold', color: available < 0 ? 'red' : 'green', fontSize: '1.1rem' }}>
              ${available.toFixed(2)}
            </span>
          </div>
        );
      })}

      {/* Recent Transactions Log */}
      <h3 style={{ marginTop: '2rem' }}>Recent Transactions</h3>
      {transactions.length === 0 ? <p style={{ color: '#666' }}>No transactions logged yet.</p> : (
        transactions.map(tx => (
          <div key={tx.id} style={{ borderBottom: '1px solid #eee', padding: '0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{tx.payee}</strong>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>{tx.date}</div>
            </div>
            <span style={{ color: 'red', fontWeight: 'bold' }}>-${tx.amount.toFixed(2)}</span>
          </div>
        ))
      )}
    </div>
  );
}
