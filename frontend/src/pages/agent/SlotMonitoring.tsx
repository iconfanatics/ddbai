import { useState } from 'react';

export default function SlotMonitoring() {
  const [slots] = useState([
    { id: '1', route: 'Dubai 30 Days', center: 'VFS Global Dhaka', date: '2026-10-05', status: 'AVAILABLE' },
    { id: '2', route: 'Dubai Business', center: 'VFS Global Sylhet', date: '2026-10-12', status: 'AVAILABLE' }
  ]);

  return (
    <div className="bg-white p-6 rounded shadow mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Slot Availability Dashboard</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold">
          Refresh Live Data
        </button>
      </div>
      
      <p className="mb-4 text-sm text-gray-600">This data is populated by background monitoring jobs (Simulated for Phase 5).</p>

      <table className="w-full text-left border">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-3">Route</th>
            <th className="p-3">Center</th>
            <th className="p-3">Available Date</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {slots.map(s => (
            <tr key={s.id} className="border-b">
              <td className="p-3 font-medium">{s.route}</td>
              <td className="p-3">{s.center}</td>
              <td className="p-3 font-bold text-blue-600">{s.date}</td>
              <td className="p-3 text-green-600 font-bold">{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

