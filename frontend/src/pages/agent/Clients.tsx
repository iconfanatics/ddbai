import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VISA_ROUTE_MASTER } from '../../data/visaRouteMaster';
import { AddClientModal } from './AddClientModal';
import { EditApplicantModal } from './EditApplicantModal';
import { ViewClientModal } from './ViewClientModal';
import { ReviewImagesModal } from './ReviewImagesModal';

export default function Clients() {
  const navigate = useNavigate();
  const [showAddClient, setShowAddClient] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [reviewingImagesClient, setReviewingImagesClient] = useState<any>(null);
  
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
    return to?.centers.map(c => typeof c === 'string' ? c : c.name) || [];
  }, [selectedFromCountry, selectedToCountry]);

  const categories = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry || !selectedCenter) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    const center = to?.centers.find(c => (typeof c === 'string' ? c : c.name) === selectedCenter);
    if (!center || typeof center === 'string') return [];
    return center.categories.map(c => c.name) || [];
  }, [selectedFromCountry, selectedToCountry, selectedCenter]);

  const subCategories = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry || !selectedCenter || !selectedCategory) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    const center = to?.centers.find(c => (typeof c === 'string' ? c : c.name) === selectedCenter);
    if (!center || typeof center === 'string') return [];
    const cat = center.categories.find(c => c.name === selectedCategory);
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

  const fetchClients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        // Hide applications that have already been 'Run' and are in the dashboard processing queue
        setClients(data.filter((app: any) => app.status !== 'RUNNING'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleModalClose = () => {
    setShowAddClient(false);
    fetchClients();
  };

  // Selection Logic
  const isAllSelected = clients.length > 0 && selectedClientIds.length === clients.length;
  const isIndeterminate = selectedClientIds.length > 0 && selectedClientIds.length < clients.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(clients.map(c => c.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkDelete = async (overrideIds?: string[]) => {
    const idsToDelete = overrideIds || selectedClientIds;
    if (!confirm(`Delete ${idsToDelete.length} clients? This action is destructive.`)) return;
    setLoadingAction(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/applications/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: idsToDelete })
      });
      if (!overrideIds) setSelectedClientIds([]);
      await fetchClients();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleBulkResetVerification = async () => {
    if (!confirm(`Reset verification for ${selectedClientIds.length} clients?`)) return;
    setLoadingAction(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/applications/bulk-reset-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: selectedClientIds })
      });
      await fetchClients();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(false);
    }
  };


  const simulateVerify = async (token: string) => {
    try {
      const res = await fetch('/api/applications/webhook/face-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, status: 'VERIFIED', matchScore: 99.9, notes: 'Simulated verification' })
      });
      if (res.ok) {
        alert('Verification simulated successfully!');
        window.location.reload();
      } else {
        alert('Simulation failed.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkRun = async () => {
    if (selectedClientIds.length === 0) return;
    setLoadingAction(true);
    try {
      const token = localStorage.getItem('token');
      for (const id of selectedClientIds) {
        const res = await fetch(`/api/applications/${id}/run`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to run application');
        }
      }
      setSelectedClientIds([]);
      await fetchClients();
      navigate('/agent');
    } catch (e: any) {
      console.error(e);
      alert(`Error running application: ${e.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCopyUrls = () => {
    const urls = clients
      .filter(c => selectedClientIds.includes(c.id))
      .map(c => c.verificationSessions?.[0]?.verificationUrl)
      .filter(url => !!url);
    
    if (urls.length > 0) {
      navigator.clipboard.writeText(urls.join('\n'));
      alert(`Copied ${urls.length} URLs to clipboard.`);
    } else {
      alert('No verification URLs available for selected clients.');
    }
  };

  const handleExportCSV = () => {
    const selected = clients.filter(c => selectedClientIds.includes(c.id));
    const csvContent = [
      ['ID', 'Applicant', 'Target Country', 'Center', 'Category', 'Sub-Category', 'Status', 'Notes'].join(','),
      ...selected.map(c => [
        c.id,
        `"${c.customer?.user?.firstName || ''} ${c.customer?.user?.lastName || ''}"`,
        `"${c.notes?.replace('Target: ', '') || ''}"`,
        `"${c.applicationCenter || ''}"`,
        `"${c.category || ''}"`,
        `"${c.subCategory || ''}"`,
        c.status,
        `"${(c.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients_export.csv';
    a.click();
  };

  const handleExportJSON = () => {
    const selected = clients.filter(c => selectedClientIds.includes(c.id));
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients_export.json';
    a.click();
  };

  // Inline Row Actions
  const handleGenerateLink = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/applications/${id}/generate-verification-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchClients();
    } catch (e) {
      console.error(e);
    }
  };

  const saveNote = async (id: string) => {
    if (editingNoteId !== id) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/applications/${id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: noteInput })
      });
      await fetchClients();
    } catch (e) {
      console.error(e);
    } finally {
      setEditingNoteId(null);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen text-gray-800 text-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500">Manage your visa application clients</p>
        </div>
        <div className="space-x-3">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded shadow-sm hover:bg-gray-50">
            Bulk Upload
          </button>
          <button
            onClick={() => setShowAddClient(true)}
            className="px-4 py-2 bg-gray-900 text-white font-semibold rounded shadow-sm hover:bg-gray-800"
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
        <div className="border-t border-gray-200 pt-4 mb-4">
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


      {/* Selected Client Toolbar */}
      {selectedClientIds.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3 flex items-center justify-between shadow-sm">
          <div className="text-blue-800 font-medium text-sm">
            Selected: {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''}
          </div>
          <div className="flex space-x-2">
            <button onClick={handleCopyUrls} disabled={loadingAction} className="px-3 py-1.5 text-xs font-semibold bg-white border border-blue-200 text-blue-700 rounded hover:bg-blue-100 flex items-center">
              Copy URLs
            </button>
            <button onClick={handleExportCSV} disabled={loadingAction} className="px-3 py-1.5 text-xs font-semibold bg-white border border-blue-200 text-blue-700 rounded hover:bg-blue-100 flex items-center">
              Export CSV
            </button>
            <button onClick={handleExportJSON} disabled={loadingAction} className="px-3 py-1.5 text-xs font-semibold bg-white border border-blue-200 text-blue-700 rounded hover:bg-blue-100 flex items-center">
              Export JSON
            </button>
            <button onClick={handleBulkResetVerification} disabled={loadingAction} className="px-3 py-1.5 text-xs font-semibold bg-white border border-orange-200 text-orange-700 rounded hover:bg-orange-100 flex items-center">
              Reset Verification
            </button>
            <button onClick={() => handleBulkDelete()} disabled={loadingAction} className="px-3 py-1.5 text-xs font-semibold bg-white border border-red-200 text-red-700 rounded hover:bg-red-100 flex items-center">
              Delete
            </button>
            <button disabled={true} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-500 rounded cursor-not-allowed flex items-center">
              Update Notes
            </button>
            <button onClick={handleBulkRun} disabled={loadingAction || selectedClientIds.length === 0} className={`px-3 py-1.5 text-xs font-semibold border rounded flex items-center ${selectedClientIds.length > 0 ? 'bg-purple-600 border-purple-700 text-white hover:bg-purple-700' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'}`}>
              Run {selectedClientIds.length > 0 ? `(${selectedClientIds.length})` : ''}
            </button>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden pb-16">
        <table className="min-w-full divide-y divide-gray-200 relative">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-4 text-left w-12">
                <input 
                  type="checkbox" 
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" 
                  checked={isAllSelected}
                  ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-4 text-left font-semibold">Applicants</th>
              <th className="px-4 py-4 text-left font-semibold">User</th>
              <th className="px-4 py-4 text-left font-semibold">Target Visa</th>
              <th className="px-4 py-4 text-left font-semibold">Status</th>
              <th className="px-4 py-4 text-left font-semibold w-64">Verification / Link</th>
              <th className="px-4 py-4 text-left font-semibold w-48">Notes</th>
              <th className="px-4 py-4 text-center font-semibold w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading clients...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No clients found. Click "+ Add Client" to create one.</td></tr>
            ) : clients.map((app: any) => {
              const vSession = app.verificationSessions?.[0];
              const requiresFaceVerification = app.faceVerificationRequired;

              return (
                <tr key={app.id} className={`hover:bg-gray-50 ${selectedClientIds.includes(app.id) ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" 
                      checked={selectedClientIds.includes(app.id)}
                      onChange={() => toggleSelectRow(app.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-blue-600 text-xs font-semibold">1 applicant</span>
                      <span className="text-gray-900 font-medium uppercase text-xs mt-1">
                        {app.customer?.user?.firstName || 'UNKNOWN'} {app.customer?.user?.lastName || ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-700 font-medium">System (API)</td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    <div className="font-semibold text-gray-700">Center: {app.applicationCenter || 'N/A'}</div>
                    <div>Category: {app.category || 'N/A'}</div>
                    <div>Sub-Category: {app.subCategory || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      {requiresFaceVerification && (!vSession || vSession.status === 'PENDING') ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-semibold rounded whitespace-nowrap">Face Verification Pending</span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-[10px] font-semibold rounded">Processing</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {requiresFaceVerification ? (
                      !vSession?.verificationUrl ? (
                        <button onClick={() => handleGenerateLink(app.id)} className="text-blue-600 text-xs font-semibold hover:underline flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                          Generate Link
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <input readOnly value={vSession.verificationUrl} className="text-[10px] p-1 border border-gray-300 rounded w-full bg-gray-50 focus:outline-none" />
                            <button onClick={() => { navigator.clipboard.writeText(vSession.verificationUrl); alert('Copied'); }} className="text-gray-500 hover:text-gray-700" title="Copy URL">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-green-600 text-[10px] font-semibold flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>Verify Link Available</span>
                            <button onClick={() => simulateVerify(vSession.id)} className="text-green-600 hover:text-green-800 text-[10px] font-medium underline mr-2">Simulate Verify</button>
                            <button onClick={() => handleGenerateLink(app.id)} className="text-blue-500 hover:text-blue-700 text-[10px] font-medium underline">Regenerate</button>
                          </div>
                        </div>
                      )
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-xs">
                    {editingNoteId === app.id ? (
                      <div className="flex flex-col gap-1">
                        <textarea 
                          className="w-full border border-blue-300 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={noteInput}
                          onChange={e => setNoteInput(e.target.value)}
                          onBlur={() => saveNote(app.id)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(app.id); } }}
                          autoFocus
                          rows={2}
                        />
                        <span className="text-[9px] text-gray-400">Press Enter to save</span>
                      </div>
                    ) : (
                      <div 
                        className={`cursor-text p-1 min-h-[24px] rounded border border-transparent hover:border-gray-200 hover:bg-gray-50 ${!app.notes ? 'text-gray-400 italic' : 'text-gray-700'}`}
                        onClick={() => { setEditingNoteId(app.id); setNoteInput(app.notes || ''); }}
                      >
                        {app.notes || 'Add note...'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuOpen(actionMenuOpen === app.id ? null : app.id);
                      }} 
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
                    </button>
                    {actionMenuOpen === app.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActionMenuOpen(null)}></div>
                        <div className="absolute right-8 top-10 w-48 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-20 text-left">
                          <button onClick={() => { setViewingClient(app); setActionMenuOpen(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>View Client</button>
                          <button onClick={() => { setEditingClient(app); setActionMenuOpen(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>Edit Applicant</button>
                          <button onClick={() => { setReviewingImagesClient(app); setActionMenuOpen(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Review Client Images</button>
                          <button onClick={async () => {
                            if (confirm('Request cancellation for this application?')) {
                              setActionMenuOpen(null);
                              try {
                                const token = localStorage.getItem('token');
                                await fetch(`/api/applications/${app.id}/status`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ status: 'Cancellation Requested' })
                                });
                                fetchClients();
                              } catch (e) {
                                console.error(e);
                              }
                            }
                          }} className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-gray-100 flex items-center border-t border-gray-100"><svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Request to Cancel</button>
                          <button onClick={() => {
                            handleBulkDelete([app.id]);
                            setActionMenuOpen(null);
                          }} className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100 flex items-center"><svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>Delete Client</button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddClient && (
        <AddClientModal
          onClose={handleModalClose}
          prefilledFromCountry={selectedFromCountry}
          prefilledTargetCountry={selectedToCountry}
        />
      )}
      {editingClient && (
        <EditApplicantModal 
          client={editingClient} 
          onClose={() => setEditingClient(null)} 
          onSave={() => { setEditingClient(null); fetchClients(); }} 
        />
      )}
      {viewingClient && (
        <ViewClientModal 
          client={viewingClient} 
          onClose={() => setViewingClient(null)} 
        />
      )}

      {reviewingImagesClient && (
        <ReviewImagesModal 
          client={reviewingImagesClient} 
          onClose={() => setReviewingImagesClient(null)} 
        />
      )}
    </div>
  );
}
