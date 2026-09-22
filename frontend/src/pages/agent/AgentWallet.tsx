import { useState } from 'react';

export default function AgentWallet() {
  const [balance, setBalance] = useState(1000.00);
  const [transactions, setTransactions] = useState([
    { id: 'TRX-001', amount: 1000.00, type: 'CREDIT', desc: 'Initial Deposit' },
    { id: 'TRX-002', amount: 150.00, type: 'DEBIT', desc: 'Booking APP-1234' }
  ]);

  return (
    <div className="bg-white p-6 rounded shadow mt-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-600">Wallet Balance</h2>
          <p className="text-4xl font-bold text-green-600">${balance.toFixed(2)}</p>
        </div>
        <button 
          className="bg-blue-600 text-white px-6 py-2 rounded font-bold"
          onClick={() => {
            setBalance(b => b + 500);
            setTransactions([{ id: `TRX-${Math.floor(Math.random()*1000)}`, amount: 500, type: 'CREDIT', desc: 'Manual Topup' }, ...transactions]);
            alert('Added $500 to wallet (Simulated)');
          }}
        >
          + Add Funds
        </button>
      </div>
      
      <h3 className="font-bold mb-4">Transaction History</h3>
      <table className="w-full text-left border">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Type</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Description</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id} className="border-b">
              <td className="p-3 text-sm text-gray-500">{t.id}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {t.type}
                </span>
              </td>
              <td className="p-3 font-bold">${t.amount.toFixed(2)}</td>
              <td className="p-3">{t.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

