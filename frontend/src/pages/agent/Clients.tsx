import { useState, useMemo } from 'react';
import { VISA_ROUTE_MASTER } from '../../data/visaRouteMaster';

export default function Clients() {
  const [showAddClient, setShowAddClient] = useState(false);
  
  // Cascading states
  const [selectedFromCountry, setSelectedFromCountry] = useState("");
  const [selectedToCountry, setSelectedToCountry] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

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

  return (
    <div className="p-6 bg-white min-h-screen text-gray-800 text-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500">Manage your visa application clients</p>
        </div>
        <div className="space-x-3">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded shadow-sm hover:bg-gray-50">
            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            Bulk Upload
          </button>
          <button 
            className="px-4 py-2 bg-gray-900 text-white font-semibold rounded shadow-sm hover:bg-gray-800"
            onClick={() => setShowAddClient(true)}
          >
            + Add Client
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm">
        <div className="flex items-center text-gray-700 font-medium mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
          Filters
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Country</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm" value={selectedFromCountry} onChange={e => handleFromChange(e.target.value)}>
              <option value="">All origins</option>
              {fromCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Country</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm" value={selectedToCountry} onChange={e => handleToChange(e.target.value)} disabled={!selectedFromCountry}>
              <option value="">All destinations</option>
              {toCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Visa Center</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm" value={selectedCenter} onChange={e => handleCenterChange(e.target.value)} disabled={!selectedToCountry}>
              <option value="">All visa centers</option>
              {visaCenters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Visa Category</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm" value={selectedCategory} onChange={e => handleCategoryChange(e.target.value)} disabled={!selectedCenter}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sub Category</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm" value={selectedSubCategory} onChange={e => setSelectedSubCategory(e.target.value)} disabled={!selectedCategory}>
              <option value="">All sub categories</option>
              {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {/* Row 2 */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div>
            <label className="block text-xs text-gray-500 mb-1">User</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm"><option>All users</option></select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm"><option>All statuses</option></select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pause State</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm"><option>All</option></select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Face Verification</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm"><option>All</option></select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">PDF Available</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm"><option>All</option></select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Transaction ID</label>
            <input type="text" placeholder="All" className="w-full border-gray-300 rounded p-2 border text-sm" />
          </div>
        </div>

        {/* Applicant Filters */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Applicant Filters</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Applicant Name</label>
              <input type="text" placeholder="Search by name..." className="w-full border-gray-300 rounded p-2 border text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Passport Number</label>
              <input type="text" placeholder="Search by passport..." className="w-full border-gray-300 rounded p-2 border text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reference Number</label>
              <input type="text" placeholder="Search by reference..." className="w-full border-gray-300 rounded p-2 border text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">URN</label>
              <input type="text" placeholder="Search by URN..." className="w-full border-gray-300 rounded p-2 border text-sm" />
            </div>
          </div>
        </div>

        {/* Date Filters */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Preferred Date Filters</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date From</label>
              <input type="date" className="w-full border-gray-300 rounded p-2 border text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date To</label>
              <input type="date" className="w-full border-gray-300 rounded p-2 border text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <div className="text-red-500 text-xs font-semibold flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Error Display Controls
          </div>
          <button className="text-xs border border-gray-300 bg-white px-3 py-1 rounded shadow-sm hover:bg-gray-50 font-medium text-gray-700">
            Show Inline Errors
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 text-left font-semibold"><input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" /></th>
              <th className="px-6 py-4 text-left font-semibold">Applicants</th>
              <th className="px-6 py-4 text-left font-semibold">User</th>
              <th className="px-6 py-4 text-left font-semibold">Target Visa</th>
              <th className="px-6 py-4 text-left font-semibold">Status</th>
              <th className="px-6 py-4 text-left font-semibold">Booking Date</th>
              <th className="px-6 py-4 text-left font-semibold">Notes</th>
              <th className="px-6 py-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Dummy Row 1 */}
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap"><input type="checkbox" className="rounded text-blue-600" /></td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-blue-600 text-xs font-semibold">1 applicant</span>
                  <span className="text-gray-900 font-medium uppercase text-xs mt-1">BELARMINO LOURENCO DOMINGOS TONGA</span>
                </div>
              </td>
              <td className="px-6 py-4 text-gray-700 font-medium">Nirupam Nirupam</td>
              <td className="px-6 py-4 text-xs text-gray-500">
                <div className="font-semibold text-gray-700">Center: Portugal Visa Application Center-Luanda</div>
                <div>Category: Visto Nacional</div>
                <div>Sub-Category: Visto Nacional (National visa)</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded mr-2">Face Verification Pending</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">Processing</span>
              </td>
              <td className="px-6 py-4 text-gray-500">N/A</td>
              <td className="px-6 py-4 text-gray-400 text-xs italic">Add note...</td>
              <td className="px-6 py-4 text-center text-gray-400">...</td>
            </tr>
            {/* Dummy Row 2 */}
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap"><input type="checkbox" className="rounded text-blue-600" /></td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-blue-600 text-xs font-semibold">1 applicant</span>
                  <span className="text-gray-900 font-medium uppercase text-xs mt-1">MARCELINA ANTONIO DOMINGOS</span>
                </div>
              </td>
              <td className="px-6 py-4 text-gray-700 font-medium">Nirupam Nirupam</td>
              <td className="px-6 py-4 text-xs text-gray-500">
                <div className="font-semibold text-gray-700">Center: Portugal Visa Application Center-Luanda</div>
                <div>Category: Visto Nacional</div>
                <div>Sub-Category: Visto Nacional (National visa)</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded mr-2">Face Verification Pending</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">Processing</span>
              </td>
              <td className="px-6 py-4 text-gray-500">N/A</td>
              <td className="px-6 py-4 text-gray-400 text-xs italic">Add note...</td>
              <td className="px-6 py-4 text-center text-gray-400">...</td>
            </tr>
          </tbody>
        </table>
      </div>

      {showAddClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-[500px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add New Client</h2>
              <button onClick={() => setShowAddClient(false)} className="text-gray-500 hover:text-gray-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Applicant Name</label>
                <input type="text" className="w-full border-gray-300 rounded p-2 border" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
                <input type="text" className="w-full border-gray-300 rounded p-2 border" placeholder="A0000000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Country</label>
                  <select className="w-full border-gray-300 rounded p-2 border"><option>Select Country</option></select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visa Category</label>
                  <select className="w-full border-gray-300 rounded p-2 border"><option>Select Category</option></select>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button className="px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50" onClick={() => setShowAddClient(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700" onClick={() => {
                alert('Client addition mock success!');
                setShowAddClient(false);
              }}>Create Client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

