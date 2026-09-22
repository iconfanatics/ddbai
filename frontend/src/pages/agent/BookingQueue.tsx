import { useState } from 'react';

export default function BookingQueue() {
  const [queue] = useState([
    { id: 'REQ-9938', app: 'APP-1234', customer: 'John Doe', status: 'PENDING' },
    { id: 'REQ-9939', app: 'APP-5678', customer: 'Jane Smith', status: 'FAILED' },
  ]);

  return (
    <div className="bg-white p-6 rounded shadow mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Booking Request Queue</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold">
          Refresh Queue
        </button>
      </div>
      
      <table className="w-full text-left border">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-3">Request ID</th>
            <th className="p-3">Application ID</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Status</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {queue.map(q => (
            <tr key={q.id} className="border-b">
              <td className="p-3">{q.id}</td>
              <td className="p-3 font-medium text-blue-600">{q.app}</td>
              <td className="p-3">{q.customer}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${q.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                  {q.status}
                </span>
              </td>
              <td className="p-3">
                {q.status === 'FAILED' && (
                  <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">
                    Retry Booking
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

