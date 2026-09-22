import { useState } from 'react';

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const apps = [
    { id: 'APP-1234', customer: 'John Doe', route: 'Dubai Tourist Visa', status: 'PENDING_DOCS' },
    { id: 'APP-5678', customer: 'Jane Smith', route: 'Dubai Business Visa', status: 'UNDER_REVIEW' },
  ];

  const handleApproveDoc = (docName: string) => {
    alert(`${docName} approved!`);
  };

  const handleRejectDoc = (docName: string) => {
    const reason = prompt('Rejection reason:');
    if (reason) alert(`${docName} rejected: ${reason}`);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Agent Workspace</h1>
      
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 ${activeTab === 'queue' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => { setActiveTab('queue'); setSelectedApp(null); }}
        >
          My Queue
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'verification' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => { setActiveTab('verification'); setSelectedApp(null); }}
        >
          Verification Review
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'approved' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => { setActiveTab('approved'); setSelectedApp(null); }}
        >
          Processed
        </button>
      </div>

      {activeTab === 'queue' && !selectedApp && (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4">App ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Route</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b">
                  <td className="p-4">{app.id}</td>
                  <td className="p-4 font-medium">{app.customer}</td>
                  <td className="p-4">{app.route}</td>
                  <td className="p-4">
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">{app.status}</span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => setSelectedApp(app)} className="text-blue-600 font-bold hover:underline">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'verification' && !selectedApp && (
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Manual Verification Queue</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3">Session ID</th>
                <th className="p-3">Applicant Name</th>
                <th className="p-3">Match Score</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3">VER-883921</td>
                <td className="p-3">Rahim Uddin</td>
                <td className="p-3 text-yellow-600">62% (Uncertain)</td>
                <td className="p-3">
                  <button 
                    className="bg-yellow-500 text-white px-3 py-1 rounded"
                    onClick={() => {
                      if (window.confirm("Approve this verification manually?")) {
                        alert("Verification approved manually!");
                      }
                    }}
                  >
                    Review & Decide
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {selectedApp && (
        <div className="bg-white p-6 rounded shadow">
          <button onClick={() => setSelectedApp(null)} className="text-sm text-gray-500 mb-4">&larr; Back to Queue</button>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Review Application: {selectedApp.id}</h2>
            <span className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm font-bold">{selectedApp.status}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-8 border-b pb-8">
            <div>
              <h3 className="font-bold text-gray-700 mb-2">Customer Info</h3>
              <p>Name: {selectedApp.customer}</p>
              <p>Passport: A12345678</p>
            </div>
            <div>
              <h3 className="font-bold text-gray-700 mb-2">Visa Details</h3>
              <p>Route: {selectedApp.route}</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mb-4">Uploaded Documents</h3>
          <div className="space-y-4 mb-8">
            <div className="border p-4 rounded flex justify-between items-center">
              <div>
                <p className="font-bold text-blue-600 underline cursor-pointer">passport_scan.pdf</p>
                <p className="text-sm text-gray-500">Uploaded 2 hours ago</p>
              </div>
              <div className="space-x-2">
                <button onClick={() => handleApproveDoc('passport_scan.pdf')} className="bg-green-100 text-green-700 px-3 py-1 rounded font-bold">Approve</button>
                <button onClick={() => handleRejectDoc('passport_scan.pdf')} className="bg-red-100 text-red-700 px-3 py-1 rounded font-bold">Reject</button>
              </div>
            </div>
            <div className="border p-4 rounded flex justify-between items-center">
              <div>
                <p className="font-bold text-blue-600 underline cursor-pointer">photo.jpg</p>
                <p className="text-sm text-gray-500">Uploaded 2 hours ago</p>
              </div>
              <div className="space-x-2">
                <button onClick={() => handleApproveDoc('photo.jpg')} className="bg-green-100 text-green-700 px-3 py-1 rounded font-bold">Approve</button>
                <button onClick={() => handleRejectDoc('photo.jpg')} className="bg-red-100 text-red-700 px-3 py-1 rounded font-bold">Reject</button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="bg-blue-600 text-white px-6 py-2 rounded font-bold flex-1">Request Missing Documents</button>
            <button className="bg-green-600 text-white px-6 py-2 rounded font-bold flex-1">Mark Application Approved</button>
          </div>
        </div>
      )}
    </div>
  );
}
