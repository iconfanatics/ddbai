import { useState } from 'react';

export default function CentersConfig() {
  const [centers] = useState([
    { id: '1', name: 'VFS Global Dhaka', location: 'Dhaka, Bangladesh' },
  ]);

  return (
    <div className="bg-white p-6 rounded shadow mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Visa Centers</h2>
        <button className="bg-green-600 text-white px-4 py-2 rounded font-bold">
          + Add New Center
        </button>
      </div>
      
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="p-3">Center Name</th>
            <th className="p-3">Location</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {centers.map(c => (
            <tr key={c.id} className="border-b">
              <td className="p-3 font-bold">{c.name}</td>
              <td className="p-3">{c.location}</td>
              <td className="p-3 text-blue-600 hover:underline cursor-pointer">Edit</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

