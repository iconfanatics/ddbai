import { useState, useEffect } from 'react';

export default function ReportsDashboard() {
  const [stats, setStats] = useState({
    totalApplications: 0,
    approvedApplications: 0,
    totalRevenue: 0,
    activeAgents: 0
  });

  useEffect(() => {
    // In a real app, fetch from /api/reports/summary
    // Simulating the API response for now to ensure UI renders nicely without waiting
    setStats({
      totalApplications: 125,
      approvedApplications: 84,
      totalRevenue: 15400,
      activeAgents: 12
    });
  }, []);

  const handleExport = () => {
    alert('Simulating CSV Download. Real API is ready at /api/reports/export/applications.csv');
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
      
      <div className="flex justify-end mb-6">
        <button 
          onClick={handleExport}
          className="bg-green-600 text-white px-6 py-2 rounded font-bold"
        >
          Export Data (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Total Applications</h3>
          <p className="text-4xl font-bold mt-2">{stats.totalApplications}</p>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Approved</h3>
          <p className="text-4xl font-bold mt-2">{stats.approvedApplications}</p>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-yellow-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Total Revenue</h3>
          <p className="text-4xl font-bold mt-2">${stats.totalRevenue}</p>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-purple-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Active Agents</h3>
          <p className="text-4xl font-bold mt-2">{stats.activeAgents}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Recent Audit Logs</h2>
        <p className="text-sm text-gray-500 mb-4">Security hardening is tracking these events.</p>
        <table className="w-full text-left border">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">User</th>
              <th className="p-3">Action</th>
              <th className="p-3">IP Address</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-3">2026-09-22 10:45 AM</td>
              <td className="p-3">admin@visasync.com</td>
              <td className="p-3">Exported Applications CSV</td>
              <td className="p-3">192.168.1.1</td>
            </tr>
            <tr className="border-b">
              <td className="p-3">2026-09-22 09:30 AM</td>
              <td className="p-3">agent_x@visasync.com</td>
              <td className="p-3">Approved Document ID 142</td>
              <td className="p-3">10.0.0.5</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

