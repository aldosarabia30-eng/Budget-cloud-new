import React, { useState } from 'react';

export default function App() {
  const [readyToAssign, setReadyToAssign] = useState(1000.00);
  const [envelopes, setEnvelopes] = useState([
    { id: '1', name: 'Groceries', assigned: 300, activity: 120 },
    { id: '2', name: 'Rent/Mortgage', assigned: 500, activity: 0 },
    { id: '3', name: 'Credit Card Payment', assigned: 100, activity: 50 }
  ]);

  const [newEnvelopeName, setNewEnvelopeName] = useState('');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedEnvelope, setSelectedEnvelope] = useState('1');
  const [transactions, setTransactions] = useState([]);

  // Add New Envelope
  const handleAddEnvelope = (e) => {
    e.preventDefault();
    if (!newEnvelopeName.trim()) return;

    const newEnv = {
      id: Date.now().toString(),
      name: newEnvelopeName.trim(),
      assigned: 0,
      activity: 0
    };

    setEnvelopes([...envelopes, newEnv]);
    setNewEnvelopeName('');
  };

  // Auto-suggest envelope based on repeating payees
  const handlePayeeChange = (val) => {
    setPayee(val);
    const lower = val.toLowerCase();
    if (lower.includes('walmart') || lower.includes('trader') || lower.includes('safeway')) {
      const groc = envelopes.find(e => e.name.toLowerCase().includes('grocery') || e.name.toLowerCase().includes('groceries'));
      if (groc) setSelectedEnvelope(groc.id);
    } else if (lower.includes('landlord') || lower.includes('rent')) {
      const rent = envelopes.find(e => e.name.toLowerCase().includes('rent'));
      if (rent) setSelectedEnvelope(rent.id);
    }
  };

  // Add Manual Transaction & Update Envelope Activity
  const handleAddTransaction = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!payee || isNaN(numAmount)) return;

    const newTx = {
      id: Date.now().toString(),
      payee,
      amount: numAmount,
      envelopeId: selectedEnvelope,
      date: new Date().toISOString().split('T')[0]
    };

    setTransactions([newTx, ...transactions]);

    // Update Envelope Activity
    setEnvelopes(envelopes.map(env => {
      if (env.id === selectedEnvelope) {
        return { ...env, activity: env.activity + numAmount };
      }
      return env;
    }));

    setPayee('');
    setAmount('');
  };

  // Move Money directly from Envelope <-> Ready to Assign
  const adjustEnvelope = (id, delta) => {
    if (readyToAssign - delta < 0 && delta > 0) {
      alert("Not enough Ready to Assign balance!");
      return;
    }
    setReadyToAssign(prev => prev - delta);
    setEnvelopes(envelopes.map(env => {
      if (env.id === id) {
        return { ...env, assigned: env.assigned + delta };
      }
      return env;
    }));
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Envelope Budgeting</h1>

      {/* Ready to Assign Header */}
      <div style={{ background: '#e6f4ea', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
        <h2>Ready to Assign: <span style={{ color: readyToAssign < 0 ? 'red' : 'green' }}>${readyToAssign.toFixed(2)}</span></h2>
      </div>

      {/* Add New Envelope Form */}
      <div style={{ background: '#f8f9fa', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <h3>Create New Envelope</h3>
        <form onSubmit={handleAddEnvelope} style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Envelope Name (e.g. Dining Out, Utilities)"
            value={newEnvelopeName}
            onChange={(e) => setNewEnvelopeName(e.target.value)}
            style={{ padding: '0.5rem', flex: 1 }}
          />
          <button type="submit" style={{ padding: '0.5rem 1rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            + Add Envelope
          </button>
        </form>
      </div>

      {/* Manual Transaction Input Form */}
      <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>Add Manual Transaction</h3>
        <form onSubmit={handleAddTransaction} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr 1fr auto' }}>
          <input
            type="text"
            placeholder="Payee (e.g. Walmart)"
            value={payee}
            onChange={(e) => handlePayeeChange(e.target.value)}
            style={{ padding: '0.5rem' }}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount ($)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ padding: '0.5rem' }}
          />
          <select 
            value={selectedEnvelope} 
            onChange={(e) => setSelectedEnvelope(e.target.value)}
            style={{ padding: '0.5rem' }}
          >
            {envelopes.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <button type="submit" style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px' }}>Add</button>
        </form>
      </div>

      {/* Envelopes Table */}
      <h3>Envelopes</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ background: '#f1f3f5', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Envelope</th>
            <th style={{ padding: '0.75rem' }}>Assigned</th>
            <th style={{ padding: '0.75rem' }}>Activity</th>
            <th style={{ padding: '0.75rem' }}>Available</th>
            <th style={{ padding: '0.75rem' }}>Quick Actions</th>
          </tr>
        </thead>
        <tbody>
          {envelopes.map(env => {
            const available = env.assigned - env.activity;
            return (
              <tr key={env.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '0.75rem' }}><strong>{env.name}</strong></td>
                <td style={{ padding: '0.75rem' }}>${env.assigned.toFixed(2)}</td>
                <td style={{ padding: '0.75rem' }}>${env.activity.toFixed(2)}</td>
                <td style={{ padding: '0.75rem', color: available < 0 ? 'red' : 'green', fontWeight: 'bold' }}>${available.toFixed(2)}</td>
                <td style={{ padding: '0.75rem' }}>
                  <button onClick={() => adjustEnvelope(env.id, 50)} style={{ marginRight: '0.5rem' }}>+$50</button>
                  <button onClick={() => adjustEnvelope(env.id, -50)}>- $50</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Transaction Log */}
      <h3>Recent Transactions</h3>
      {transactions.length === 0 ? <p style={{ color: '#666' }}>No transactions logged yet.</p> : (
        <ul>
          {transactions.map(tx => (
            <li key={tx.id}>
              {tx.date}: <strong>{tx.payee}</strong> — ${tx.amount.toFixed(2)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
