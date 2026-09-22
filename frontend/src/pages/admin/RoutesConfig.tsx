import { useState, useEffect } from 'react';

// Using the same realistic mock data as in Clients
const FROM_COUNTRIES = ["Angola", "Bangladesh", "India", "Nepal", "Saudi Arabia", "Senegal", "United Arab Emirates"];
const TO_COUNTRIES = ["Bulgaria", "Czech Republic", "Germany", "Italy", "Japan", "Latvia", "Portugal", "Slovakia"];

const VISA_CENTERS_MAP: Record<string, string[]> = {
  "Portugal": [
    "Portugal Visa Application Center – Luanda", 
    "Portugal Visa Application Center – Dubai", 
    "Portugal Visa Application Center – Abu Dhabi"
  ],
  "Czech Republic": [
    "Czech Visa Application Center – Abu Dhabi", 
    "Czech Visa Application Center – Dubai"
  ],
  "Slovakia": ["Mumbai", "Chennai", "Bangalore", "Kolkata", "Delhi"],
  "Italy": ["VFS Global - Dhaka", "VFS Global - Sylhet"],
  "Japan": ["VFS Global - Kathmandu"],
  "Germany": ["VFS Global - New Delhi", "VFS Global - Mumbai"],
  "Bulgaria": ["VFS Global - New Delhi"],
  "Latvia": ["VFS Global - Dubai", "VFS Global - New Delhi"]
};

const VISA_CATEGORIES = ["Visto Nacional", "Long Term Visa", "Long Stay", "Seasonal Employment"];
const SUB_CATEGORIES = ["Visto Nacional (National visa)", "National Visa (Category D/E) Long Term", "Long Stay / Work Permit", "Season-Employment", "Employment"];

export default function RoutesConfig() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    fromCountry: 'United Arab Emirates',
    toCountry: 'Portugal',
    visaCenter: 'Portugal Visa Application Center – Dubai',
    visaCategory: 'Long Term Visa',
    subCategory: 'National Visa (Category D/E) Long Term',
    scheduleDate: '',
    scheduleTime: ''
  });
  const [loading, setLoading] = useState(true);

  // Dynamically get visa centers based on selected To Country
  const activeVisaCenters = VISA_CENTERS_MAP[formData.toCountry] || ["To be configured"];

  // Ensure visaCenter is valid when toCountry changes
  useEffect(() => {
    if (activeVisaCenters.length > 0 && !activeVisaCenters.includes(formData.visaCenter)) {
      setFormData(prev => ({...prev, visaCenter: activeVisaCenters[0]}));
    }
  }, [formData.toCountry]);

  const fetchRoutes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/configured-routes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoutes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleAddRoute = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/configured-routes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, status: 'READY' })
      });
      if (res.ok) {
        fetchRoutes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/configured-routes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchRoutes();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRunStop = async (route: any) => {
    const newStatus = route.status === 'RUNNING' ? 'STOPPED' : 'RUNNING';
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/configured-routes/${route.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchRoutes();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-6">Loading routes...</div>;

  return (
    <div className="bg-white p-6 rounded shadow max-w-full overflow-hidden text-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Visa Route Management & Automation</h2>
        <p className="text-gray-500">Configure dynamically schedulable routes for the automation engine.</p>
      </div>
      
      {/* Add New Route Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-8">
        <h3 className="font-semibold text-gray-700 mb-4">Add New Route</h3>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Country</label>
            <select 
              className="w-full border-gray-300 rounded p-2 border"
              value={formData.fromCountry}
              onChange={e => setFormData({...formData, fromCountry: e.target.value})}
            >
              {FROM_COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Country</label>
            <select 
              className="w-full border-gray-300 rounded p-2 border"
              value={formData.toCountry}
              onChange={e => setFormData({...formData, toCountry: e.target.value})}
            >
              {TO_COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Visa Center / Location</label>
            <select 
              className="w-full border-gray-300 rounded p-2 border"
              value={formData.visaCenter}
              onChange={e => setFormData({...formData, visaCenter: e.target.value})}
            >
              {activeVisaCenters.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Visa Category</label>
            <select 
              className="w-full border-gray-300 rounded p-2 border"
              value={formData.visaCategory}
              onChange={e => setFormData({...formData, visaCategory: e.target.value})}
            >
              {VISA_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sub Category</label>
            <select 
              className="w-full border-gray-300 rounded p-2 border"
              value={formData.subCategory}
              onChange={e => setFormData({...formData, subCategory: e.target.value})}
            >
              {SUB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Schedule Date</label>
            <input 
              type="date" 
              className="w-full border-gray-300 rounded p-2 border"
              value={formData.scheduleDate}
              onChange={e => setFormData({...formData, scheduleDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Schedule Time</label>
            <input 
              type="time" 
              className="w-full border-gray-300 rounded p-2 border"
              value={formData.scheduleTime}
              onChange={e => setFormData({...formData, scheduleTime: e.target.value})}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            className="bg-gray-900 text-white px-6 py-2 rounded font-medium shadow-sm hover:bg-gray-800"
            onClick={handleAddRoute}
          >
            + Configure Process
          </button>
        </div>
      </div>

      {/* Routes Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-100 border-b text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3 font-semibold">Route</th>
              <th className="p-3 font-semibold">Center & Category</th>
              <th className="p-3 font-semibold">Schedule</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold text-center">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {routes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">No visa routes configured yet.</td>
              </tr>
            ) : routes.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <div className="font-semibold text-gray-800">{r.fromCountry} <span className="text-gray-400 font-normal mx-1">→</span> {r.toCountry}</div>
                </td>
                <td className="p-3">
                  <div className="text-gray-900 font-medium">{r.visaCenter}</div>
                  <div className="text-gray-500 text-xs mt-1">{r.visaCategory} - {r.subCategory}</div>
                </td>
                <td className="p-3">
                  {r.scheduleDate && r.scheduleTime ? (
                    <div>
                      <div className="text-gray-800">{r.scheduleDate}</div>
                      <div className="text-gray-500 text-xs">{r.scheduleTime}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs italic">Not scheduled</span>
                  )}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    r.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' : 
                    r.status === 'READY' ? 'bg-gray-100 text-gray-800' :
                    r.status === 'STOPPED' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-3 text-center space-x-2">
                  <button 
                    onClick={() => toggleRunStop(r)}
                    className={`px-3 py-1 rounded font-semibold text-xs border ${
                      r.status === 'RUNNING' 
                        ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                        : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {r.status === 'RUNNING' ? 'STOP' : 'RUN'}
                  </button>
                  <button 
                    onClick={() => handleDelete(r.id)}
                    className="px-3 py-1 border border-gray-200 bg-white text-gray-600 rounded font-semibold text-xs hover:bg-gray-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
