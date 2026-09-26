import { useEffect, useState } from 'react';

export default function FaceVerificationReview({ hideHeader }: { hideHeader?: boolean }) {
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
      setRunningApps(data.filter((app: any) => app.status === 'RUNNING' && app.faceVerificationRequired));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={hideHeader ? "p-0" : "p-8"}>
      {!hideHeader && <h1 className="text-2xl font-bold mb-6">Face Verification Review (Page 03)</h1>}
      <table className="min-w-full bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session / Ref</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Country</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match Score</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {runningApps.map((app) => {
            const session = app.verificationSessions?.[0];
            return (
              <tr key={app.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session?.id?.split('-')[0] || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.customer?.user?.firstName} {app.customer?.user?.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.targetCountry}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">{session?.score ? `${session.score}%` : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session?.status || app.faceVerificationStatus}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><button className="text-indigo-600 font-bold hover:underline">Review & Decide</button></td>
              </tr>
            );
          })}
          {runningApps.length === 0 && (
            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No applications require review.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
