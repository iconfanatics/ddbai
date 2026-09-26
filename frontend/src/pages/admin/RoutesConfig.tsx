import { useState, useEffect, useMemo } from 'react';
import { VISA_ROUTE_MASTER } from '../../data/visaRouteMaster';

export default function RoutesConfig() {
  const [routes, setRoutes] = useState<any[]>([]);
  
  // Cascading states
  const [selectedFromCountry, setSelectedFromCountry] = useState("");
  const [selectedToCountry, setSelectedToCountry] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [faceVerificationRequired, setFaceVerificationRequired] = useState(false);

  const [loading, setLoading] = useState(true);

  // Derived options based on selections
  const fromCountries = useMemo(() => VISA_ROUTE_MASTER.map(c => c.name), []);
  
  const toCountries = useMemo(() => {
    if (!selectedFromCountry) return [];
    return VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry)?.toCountries.map(t => t.name) || [];
  }, [selectedFromCountry]);

  const visaCenters = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    return to?.centers.map(c => c.name) || [];
  }, [selectedFromCountry, selectedToCountry]);

  const categories = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry || !selectedCenter) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    const center = to?.centers.find(c => c.name === selectedCenter);
    return center?.categories.map(c => c.name) || [];
  }, [selectedFromCountry, selectedToCountry, selectedCenter]);

  const subCategories = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry || !selectedCenter || !selectedCategory) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    const center = to?.centers.find(c => c.name === selectedCenter);
    const cat = center?.categories.find(c => c.name === selectedCategory);
    return cat?.subCategories || [];
  }, [selectedFromCountry, selectedToCountry, selectedCenter, selectedCategory]);

  const handleFromChange = (val: string) => { setSelectedFromCountry(val); setSelectedToCountry(""); setSelectedCenter(""); setSelectedCategory(""); setSelectedSubCategory(""); };
  const handleToChange = (val: string) => { setSelectedToCountry(val); setSelectedCenter(""); setSelectedCategory(""); setSelectedSubCategory(""); };
  const handleCenterChange = (val: string) => { setSelectedCenter(val); setSelectedCategory(""); setSelectedSubCategory(""); };
  const handleCategoryChange = (val: string) => { setSelectedCategory(val); setSelectedSubCategory(""); };

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
    if (!selectedFromCountry || !selectedToCountry || !selectedCenter || !selectedCategory) {
      alert("Please select at least From, To, Center, and Category");
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/configured-routes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          fromCountry: selectedFromCountry,
          toCountry: selectedToCountry,
          visaCenter: selectedCenter,
          visaCategory: selectedCategory,
          subCategory: selectedSubCategory,
          scheduleDate: scheduleDate,
          scheduleTime: scheduleTime,
          faceVerificationRequired: faceVerificationRequired,
          status: 'READY' 
        })
      });
      if (res.ok) {
        fetchRoutes();
        // Reset specific fields
        setSelectedSubCategory("");
        setScheduleDate("");
        setScheduleTime("");
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
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedFromCountry} onChange={e => handleFromChange(e.target.value)}>
              <option value="">Select origin</option>
              {fromCountries.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Country</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedToCountry} onChange={e => handleToChange(e.target.value)} disabled={!selectedFromCountry}>
              <option value="">Select destination</option>
              {toCountries.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Visa Center / Location</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedCenter} onChange={e => handleCenterChange(e.target.value)} disabled={!selectedToCountry}>
              <option value="">Select center</option>
              {visaCenters.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Visa Category</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedCategory} onChange={e => handleCategoryChange(e.target.value)} disabled={!selectedCenter}>
              <option value="">Select category</option>
              {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sub Category</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedSubCategory} onChange={e => setSelectedSubCategory(e.target.value)} disabled={!selectedCategory}>
              <option value="">Select sub category (optional)</option>
              {subCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Schedule Date</label>
            <input 
              type="date" 
              className="w-full border-gray-300 rounded p-2 border text-sm bg-white"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Schedule Time</label>
            <input 
              type="time" 
              className="w-full border-gray-300 rounded p-2 border text-sm bg-white"
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
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
                  <div className="text-gray-500 text-xs mt-0.5">
                    {r.visaCategory} {r.subCategory && `> ${r.subCategory}`}
                  </div>
                </td>
                <td className="p-3">
                  {r.scheduleDate && r.scheduleTime ? (
                    <div>
                      <div className="text-gray-800">{r.scheduleDate}</div>
                      <div className="text-gray-500 text-xs">{r.scheduleTime}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">Continuous</span>
                  )}
                </td>
                <td className="p-3">
                  {r.status === 'RUNNING' ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200 flex items-center w-max">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                      Running
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200 flex items-center w-max">
                      <span className="w-2 h-2 rounded-full bg-gray-400 mr-1.5"></span>
                      Stopped
                    </span>
                  )}
                </td>
                <td className="p-3 text-center space-x-2">
                  <button 
                    className={`px-3 py-1.5 rounded text-xs font-medium shadow-sm transition-colors ${
                      r.status === 'RUNNING' 
                        ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                    }`}
                    onClick={() => toggleRunStop(r)}
                  >
                    {r.status === 'RUNNING' ? 'STOP' : 'RUN'}
                  </button>
                  <button 
                    className="px-3 py-1.5 bg-white border border-gray-300 text-red-600 hover:bg-red-50 rounded text-xs font-medium shadow-sm"
                    onClick={() => handleDelete(r.id)}
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
