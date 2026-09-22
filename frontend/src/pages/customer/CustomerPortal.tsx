import { useState } from 'react';

export default function CustomerPortal() {
  const [activeTab, setActiveTab] = useState('profile');
  const [application, setApplication] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  const handleCreateApp = () => {
    setApplication({ id: 'APP-1234', status: 'DRAFT', route: 'Dubai Tourist Visa (30 Days)' });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocuments([...documents, { id: Math.random(), name: file.name, status: 'PENDING' }]);
      alert(`Simulated upload for ${file.name}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Customer Portal</h1>
      <p className="mb-8 text-gray-600">Welcome to your Visa application portal.</p>

      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 ${activeTab === 'profile' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          My Profile
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'applications' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          My Applications
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'verification' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('verification')}
        >
          Face Verification
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'billing' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          Billing & Invoices
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded shadow max-w-2xl">
          <h2 className="text-xl font-bold mb-4">Profile Details</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium">Full Name</label><input type="text" className="border p-2 w-full mt-1" defaultValue="John Doe" /></div>
            <div><label className="block text-sm font-medium">Passport Number</label><input type="text" className="border p-2 w-full mt-1" defaultValue="A12345678" /></div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded">Save Profile</button>
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <div>
          {!application ? (
            <div className="bg-white p-6 rounded shadow text-center py-12">
              <h2 className="text-xl font-bold mb-4">No Active Applications</h2>
              <button onClick={handleCreateApp} className="bg-blue-600 text-white px-6 py-2 rounded">Start New Application</button>
            </div>
          ) : (
            <div className="bg-white p-6 rounded shadow mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Application {application.id}</h2>
                <span className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm font-bold">{application.status}</span>
              </div>
              <p className="mb-4"><strong>Route:</strong> {application.route}</p>
              
              <h3 className="font-bold text-lg mb-4 border-t pt-4">Required Documents</h3>
              <div className="space-y-4">
                <div className="border p-4 rounded flex justify-between items-center">
                  <div>
                    <p className="font-bold">Passport Scan</p>
                    <p className="text-sm text-gray-500">Please upload the bio page.</p>
                  </div>
                  <input type="file" onChange={handleUpload} className="text-sm" />
                </div>
                <div className="border p-4 rounded flex justify-between items-center">
                  <div>
                    <p className="font-bold">Recent Photograph</p>
                    <p className="text-sm text-gray-500">White background, 2x2 inches.</p>
                  </div>
                  <input type="file" onChange={handleUpload} className="text-sm" />
                </div>
              </div>

              {documents.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-bold text-lg mb-4">Uploaded Documents</h3>
                  <ul className="space-y-2">
                    {documents.map((doc, idx) => (
                      <li key={idx} className="flex justify-between p-3 bg-gray-50 rounded border">
                        <span>{doc.name}</span>
                        <span className="text-blue-600 font-bold">{doc.status}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="bg-green-600 text-white px-6 py-2 rounded mt-6 w-full">Submit Application for Review</button>
                  {application.status === 'APPROVED' && (
                    <button 
                      className="bg-blue-600 text-white px-4 py-2 rounded font-bold mt-4 w-full"
                      onClick={() => alert(`Requested appointment for ${application.id}. Note: You must complete Face Verification first!`)}
                    >
                      Request Appointment
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="bg-white p-6 rounded shadow max-w-2xl text-center">
          <h2 className="text-xl font-bold mb-4">Biometric Verification</h2>
          <p className="mb-4 text-gray-600 text-sm">
            For security purposes, you must verify your identity using your device's camera.
            We will match your live face against the passport photo you uploaded.
          </p>
          <div className="mb-6 flex items-center justify-center space-x-2">
            <input type="checkbox" id="consent" className="w-4 h-4" />
            <label htmlFor="consent" className="text-sm">I consent to biometric data processing.</label>
          </div>
          
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded h-64 flex flex-col justify-center items-center mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-blue-200 mb-2 overflow-hidden flex items-center justify-center bg-gray-200">
               <span className="text-gray-400">📷</span>
            </div>
            <p className="text-sm text-gray-500">Camera simulated in this mockup</p>
          </div>

          <button 
            className="bg-blue-600 text-white px-6 py-3 rounded font-bold w-full"
            onClick={() => {
              const res = ['PASSED', 'FAILED', 'MANUAL_REVIEW'][Math.floor(Math.random() * 3)];
              alert(`Simulated Verification Result: ${res}`);
            }}
          >
            Start Face Scan
          </button>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white p-6 rounded shadow max-w-4xl">
          <h2 className="text-xl font-bold mb-4">My Invoices</h2>
          <table className="w-full text-left border">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3">Invoice ID</th>
                <th className="p-3">Application</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3 font-mono">INV-582910</td>
                <td className="p-3">APP-1234 (Dubai Tourist)</td>
                <td className="p-3 font-bold">$150.00</td>
                <td className="p-3"><span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">UNPAID</span></td>
                <td className="p-3">
                  <button 
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold"
                    onClick={() => alert('Simulated Payment Success!')}
                  >
                    Pay Now
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
