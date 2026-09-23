import { useState, useMemo } from 'react';
import { VISA_ROUTE_MASTER } from '../../data/visaRouteMaster';

export default function Clients() {
  const [showAddClient, setShowAddClient] = useState(false);
  
  // Cascading states (Row 1)
  const [selectedFromCountry, setSelectedFromCountry] = useState("");
  const [selectedToCountry, setSelectedToCountry] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  // Row 2 filter states
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPauseState, setSelectedPauseState] = useState("");
  const [selectedFaceVerification, setSelectedFaceVerification] = useState("");
  const [selectedPdfAvailable, setSelectedPdfAvailable] = useState("");
  const [transactionId, setTransactionId] = useState("");

  // Applicant filter states
  const [applicantName, setApplicantName] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [urn, setUrn] = useState("");

  // Date filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const clearAllFilters = () => {
    setSelectedFromCountry(""); setSelectedToCountry(""); setSelectedCenter("");
    setSelectedCategory(""); setSelectedSubCategory("");
    setSelectedUser(""); setSelectedStatus(""); setSelectedPauseState("");
    setSelectedFaceVerification(""); setSelectedPdfAvailable(""); setTransactionId("");
    setApplicantName(""); setPassportNumber(""); setReferenceNumber(""); setUrn("");
    setDateFrom(""); setDateTo("");
  };

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-gray-700 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            Filters
          </div>
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-red-500 border border-gray-300 hover:border-red-300 px-3 py-1 rounded bg-white hover:bg-red-50 transition-colors font-medium"
          >
            ✕ Clear All Filters
          </button>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Country</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedFromCountry} onChange={e => handleFromChange(e.target.value)}>
              <option value="">All origins</option>
              {fromCountries.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Country</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedToCountry} onChange={e => handleToChange(e.target.value)} disabled={!selectedFromCountry}>
              <option value="">All destinations</option>
              {toCountries.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Visa Center</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedCenter} onChange={e => handleCenterChange(e.target.value)} disabled={!selectedToCountry}>
              <option value="">All visa centers</option>
              {visaCenters.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Visa Category</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedCategory} onChange={e => handleCategoryChange(e.target.value)} disabled={!selectedCenter}>
              <option value="">All categories</option>
              {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sub Category</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedSubCategory} onChange={e => setSelectedSubCategory(e.target.value)} disabled={!selectedCategory}>
              <option value="">All sub categories</option>
              {subCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {/* Row 2 */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div>
            <label className="block text-xs text-gray-500 mb-1">User</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}><option value="">All users</option><option value="Nirupam Nirupam">Nirupam Nirupam</option><option value="Sany Sany">Sany Sany</option></select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}><option value="">All statuses</option><option value="Face Verification Pending">Face Verification Pending</option><option value="Processing">Processing</option><option value="Completed">Completed</option></select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pause State</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedPauseState} onChange={e => setSelectedPauseState(e.target.value)}><option value="">All</option><option value="Yes">Yes</option><option value="No">No</option></select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Face Verification</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedFaceVerification} onChange={e => setSelectedFaceVerification(e.target.value)}><option value="">All</option><option value="Yes">Yes</option><option value="No">No</option></select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">PDF Available</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={selectedPdfAvailable} onChange={e => setSelectedPdfAvailable(e.target.value)}><option value="">All</option><option value="Yes">Yes</option><option value="No">No</option></select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Transaction ID</label>
            <input type="text" placeholder="All" className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
          </div>
        </div>

        {/* Applicant Filters */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Applicant Filters</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Applicant Name</label>
              <input type="text" placeholder="Search by name..." className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={applicantName} onChange={e => setApplicantName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Passport Number</label>
              <input type="text" placeholder="Search by passport..." className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={passportNumber} onChange={e => setPassportNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reference Number</label>
              <input type="text" placeholder="Search by reference..." className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">URN</label>
              <input type="text" placeholder="Search by URN..." className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={urn} onChange={e => setUrn(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Date Filters */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Preferred Date Filters</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date From</label>
              <input type="date" className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date To</label>
              <input type="date" className="w-full border-gray-300 rounded p-2 border text-sm bg-white" value={dateTo} onChange={e => setDateTo(e.target.value)} />
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
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          prefilledFromCountry={selectedFromCountry}
          prefilledTargetCountry={selectedToCountry}
        />
      )}
    </div>
  );
}

// ─── State machine types ──────────────────────────────────────────────────────
type PassportState = 'initial' | 'searching' | 'available' | 'already_added' | 'error' | 'cleared';

function AddClientModal({
  onClose,
  prefilledFromCountry,
  prefilledTargetCountry,
}: {
  onClose: () => void;
  prefilledFromCountry: string;
  prefilledTargetCountry: string;
}) {
  const [passport, setPassport] = useState('');
  const [passportState, setPassportState] = useState<PassportState>('initial');
  const [errorMsg, setErrorMsg] = useState('');
  const [targetCountry, setTargetCountry] = useState(prefilledTargetCountry || '');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const toCountryOptions = VISA_ROUTE_MASTER.flatMap(f =>
    f.toCountries.map(t => t.name)
  ).filter((v, i, a) => a.indexOf(v) === i);

  const canSelectCountry = passportState === 'available';
  const canCreate = passportState === 'available' && targetCountry.trim() !== '';

  const handleSearch = async () => {
    if (!passport.trim()) return;
    setPassportState('searching');
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/applications/check-passport?passport=${encodeURIComponent(passport.trim().toUpperCase())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setPassportState(data.available ? 'available' : 'already_added');
    } catch {
      setPassportState('error');
      setErrorMsg('Search failed. Please try again.');
    }
  };

  const handleClear = () => {
    setPassport('');
    setPassportState('cleared');
    setErrorMsg('');
    setTargetCountry(prefilledTargetCountry || '');
    setSuccessMsg('');
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/applications/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          passportNumber: passport.trim().toUpperCase(),
          targetCountry,
          fromCountry: prefilledFromCountry || undefined,
        }),
      });
      if (res.status === 409) {
        setPassportState('already_added');
        setSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error('Create failed');
      setSuccessMsg('Client created successfully!');
      setTimeout(() => onClose(), 1500);
    } catch {
      setErrorMsg('Failed to create client. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-[520px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Passport Number + Search + Clear */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded p-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A0000000"
                value={passport}
                onChange={e => { setPassport(e.target.value); setPassportState('initial'); setErrorMsg(''); setSuccessMsg(''); }}
                onKeyDown={handleKeyDown}
                disabled={passportState === 'searching' || submitting}
              />
              <button
                onClick={handleSearch}
                disabled={!passport.trim() || passportState === 'searching' || submitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {passportState === 'searching' ? 'Searching...' : 'Search'}
              </button>
              <button
                onClick={handleClear}
                disabled={passportState === 'searching' || submitting}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>

            {/* Status indicator */}
            {passportState === 'searching' && (
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                Checking across all agents...
              </p>
            )}
            {passportState === 'available' && (
              <p className="mt-2 text-xs font-semibold text-green-600 flex items-center gap-1">
                <span>✓</span> Passport Available — you may proceed
              </p>
            )}
            {passportState === 'already_added' && (
              <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1">
                <span>✗</span> Already Added — this passport exists in the system
              </p>
            )}
            {passportState === 'error' && (
              <p className="mt-2 text-xs font-semibold text-orange-600">{errorMsg || 'Search failed. Please try again.'}</p>
            )}
          </div>

          {/* Target Country */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${canSelectCountry ? 'text-gray-700' : 'text-gray-400'}`}>
              Target Country
              {prefilledTargetCountry && canSelectCountry && (
                <span className="ml-2 text-xs text-blue-500 font-normal">(auto-filled from filter)</span>
              )}
            </label>
            <select
              className="w-full border border-gray-300 rounded p-2 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={targetCountry}
              onChange={e => setTargetCountry(e.target.value)}
              disabled={!canSelectCountry || submitting}
            >
              <option value="">Select Country</option>
              {toCountryOptions.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
            {!canSelectCountry && (
              <p className="mt-1 text-xs text-gray-400">Search passport first to enable country selection</p>
            )}
          </div>

          {/* Auto-carry info */}
          {prefilledFromCountry && (
            <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
              <span className="font-semibold">Filter context:</span> From Country = <strong>{prefilledFromCountry}</strong>
              {prefilledTargetCountry && <>, Target Country = <strong>{prefilledTargetCountry}</strong></>}
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700 font-medium">{successMsg}</div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            className="px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 text-sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCreate}
            disabled={!canCreate || submitting}
          >
            {submitting ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  );
}
