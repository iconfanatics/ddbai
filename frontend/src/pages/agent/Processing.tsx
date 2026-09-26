import { useEffect, useState } from 'react';

export default function Processing({ hideHeader }: { hideHeader?: boolean }) {
  const [runningApps, setRunningApps] = useState<any[]>([]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setRunningApps(data.filter((app: any) => app.status === 'RUNNING'));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={hideHeader ? "p-0" : "p-8"}>
      {!hideHeader && <h1 className="text-2xl font-bold mb-6">Processing (Page 04)</h1>}
      <table className="min-w-full bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Application / Ref</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Visa</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verification</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {runningApps.map((app) => (
            <tr key={app.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.id.split('-')[0]}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.customer?.user?.firstName} {app.customer?.user?.lastName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.fromCountry} &rarr; {app.targetCountry}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.applicationCenter} / {app.category}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.faceVerificationRequired ? 'Required / Verified' : 'Not Required'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">Running / Active</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm"><button className="text-indigo-600 font-bold hover:underline">Open</button></td>
            </tr>
          ))}
          {runningApps.length === 0 && (
            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No applications are currently processing.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
