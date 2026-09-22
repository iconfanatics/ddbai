export default function AdminOverview() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded shadow border-t-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Total Organizations</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </div>
        <div className="bg-white p-6 rounded shadow border-t-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Active Agents</h3>
          <p className="text-3xl font-bold mt-2">48</p>
        </div>
        <div className="bg-white p-6 rounded shadow border-t-4 border-purple-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Visa Routes Configured</h3>
          <p className="text-3xl font-bold mt-2">5</p>
        </div>
        <div className="bg-white p-6 rounded shadow border-t-4 border-yellow-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Total Revenue (Simulated)</h3>
          <p className="text-3xl font-bold mt-2">$14,500</p>
        </div>
      </div>
      <div className="mt-8 bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Welcome to VisaSync Admin</h2>
        <p className="text-gray-600">Select an option from the sidebar to manage organizations, agents, routes, or centers.</p>
      </div>
    </div>
  );
}

