import { useEffect, useState } from 'react';
import ReviewPanelModal from './ReviewPanelModal';

export default function WithoutFaceVerification({ hideHeader }: { hideHeader?: boolean }) {
  const [runningApps, setRunningApps] = useState<any[]>([]);
  const [selectedAppForReview, setSelectedAppForReview] = useState<any>(null);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/applications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setRunningApps(data.filter((app: any) => app.status === 'RUNNING' && !app.faceVerificationRequired));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };


  const handleBackToClientBoard = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'READY' })
      });
      setSelectedAppForReview(null);
      fetchApplications();
    } catch (e) {
      console.error(e);
      alert('Failed to return application to Client Board');
    }
  };

  const filteredApps = runningApps.filter((app: any) => {
    if (filterFrom && !app.fromCountry?.toLowerCase().includes(filterFrom.toLowerCase())) return false;
    if (filterTarget && !app.targetCountry?.toLowerCase().includes(filterTarget.toLowerCase())) return false;
    if (filterCategory && !app.category?.toLowerCase().includes(filterCategory.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={hideHeader ? "p-0" : "p-8"}>
      {!hideHeader && <h1 className="text-2xl font-bold mb-6">Without Face Verification (Page 02)</h1>}

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded mb-6 border border-gray-200 grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From Country</label>
          <input type="text" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="e.g. UAE" className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Country</label>
          <input type="text" value={filterTarget} onChange={e => setFilterTarget(e.target.value)} placeholder="e.g. Portugal" className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
          <input type="text" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} placeholder="e.g. Work Visa" className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
      </div>

      <table className="min-w-full bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Application / Ref</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Visa</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredApps.map((app) => (
            <tr key={app.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.id.split('-')[0]}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.customer?.user?.firstName} {app.customer?.user?.lastName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.fromCountry || 'Any'} &rarr; {app.targetCountry}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.applicationCenter} / {app.category}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">Processing</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm"><button onClick={() => setSelectedAppForReview(app)} className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-200">Review</button></td>
            </tr>
          ))}
          {!loading && filteredApps.length === 0 && (
            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No applications match the filters.</td></tr>
          )}
          {loading && (
            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
          )}
        </tbody>
      </table>
        {selectedAppForReview && (
          <ReviewPanelModal app={selectedAppForReview} onClose={() => setSelectedAppForReview(null)} onBackToClientBoard={handleBackToClientBoard} />
        )}
    </div>
  );
}
