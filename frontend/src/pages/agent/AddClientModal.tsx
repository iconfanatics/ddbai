import { useState } from 'react';
import { VISA_ROUTE_MASTER } from '../../data/visaRouteMaster';

type PassportState = 'initial' | 'searching' | 'available' | 'already_added' | 'error' | 'cleared';
type WizardStep = 1 | 2 | 3;

interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  dateOfBirth: string;
  gender: string;
  gapDays: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  state: string;
}

export function AddClientModal({
  onClose,
  prefilledFromCountry,
  prefilledTargetCountry,
}: {
  onClose: () => void;
  prefilledFromCountry: string;
  prefilledTargetCountry: string;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1 State
  const [passport, setPassport] = useState('');
  const [passportState, setPassportState] = useState<PassportState>('initial');
  const [errorMsg, setErrorMsg] = useState('');
  const [targetCountry, setTargetCountry] = useState(prefilledTargetCountry || '');

  // Step 2 State
  const [applicationCenter, setApplicationCenter] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  const toCountryOptions = VISA_ROUTE_MASTER.flatMap(f =>
    f.toCountries.map(t => t.name)
  ).filter((v, i, a) => a.indexOf(v) === i);

  // Derive center options based on selected target country (mocked for now since schema isn't 100% matched, we use dummy data)
  const centerOptions = ['Portugal Visa Application Center-Luanda', 'Portugal Visa Application Center-Lisbon'];
  const categoryOptions = ['PLLS', 'Visto Nacional'];
  const subCategoryOptions = ['LONG', 'SHORT'];

  const canSelectCountry = passportState === 'available';
  const canProceedToStep2 = passportState === 'available' && targetCountry.trim() !== '';

  const handleSearch = async () => {
    if (!passport.trim()) {
      setErrorMsg('Please enter Passport Number.');
      return;
    }
    setPassportState('searching');
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/applications/check-passport?passport=${encodeURIComponent(passport.trim().toUpperCase())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data.status === 'ERROR') throw new Error(data.message || 'Error');
      setPassportState(data.available ? 'available' : 'already_added');
    } catch {
      setPassportState('error');
      setErrorMsg('Unable to check passport. Please try again.');
    }
  };

  const handleClear = () => {
    setPassport('');
    setPassportState('cleared');
    setErrorMsg('');
    setTargetCountry(prefilledTargetCountry || '');
  };

  const goToStep2 = () => {
    if (!canProceedToStep2) return;
    if (applicants.length === 0) {
      setApplicants([{
        id: crypto.randomUUID(),
        firstName: '', lastName: '', nationality: prefilledFromCountry || '',
        passportNumber: passport.trim().toUpperCase(),
        passportExpiry: '', dateOfBirth: '', gender: '', gapDays: '',
        addressLine1: '', addressLine2: '', postalCode: '', city: '', state: ''
      }]);
    }
    setStep(2);
  };

  const addApplicant = () => {
    setApplicants([...applicants, {
      id: crypto.randomUUID(),
      firstName: '', lastName: '', nationality: prefilledFromCountry || '',
      passportNumber: '', passportExpiry: '', dateOfBirth: '', gender: '', gapDays: '',
      addressLine1: '', addressLine2: '', postalCode: '', city: '', state: ''
    }]);
  };

  const updateApplicant = (id: string, field: keyof Applicant, value: string) => {
    setApplicants(applicants.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const removeApplicant = (id: string) => {
    if (applicants.length > 1) {
      setApplicants(applicants.filter(a => a.id !== id));
    }
  };

  const goToStep3 = () => {
    // Validate Step 2
    if (!applicationCenter || !category || !subCategory) {
      setGlobalError('Please select Center, Category and Sub-Category.');
      return;
    }
    const invalidApp = applicants.find(a => !a.firstName || !a.lastName || !a.passportNumber);
    if (invalidApp) {
      setGlobalError('Please fill required fields (First Name, Last Name, Passport) for all applicants.');
      return;
    }
    setGlobalError('');
    setStep(3);
  };

  const handleCreateClient = async () => {
    setSubmitting(true);
    setGlobalError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/applications/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fromCountry: prefilledFromCountry || undefined,
          targetCountry,
          applicationCenter,
          category,
          subCategory,
          applicants: applicants.map(a => ({
            ...a,
            passportNumber: a.passportNumber.trim().toUpperCase()
          }))
        }),
      });
      if (res.status === 409) {
        setGlobalError('One of the passports is already registered.');
        setSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error('Create failed');
      setSuccessMsg('Client created successfully!');
      setTimeout(() => onClose(), 1500);
    } catch {
      setGlobalError('Failed to create client. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER STEP 1
  // -------------------------------------------------------------
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-[520px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2 text-sm">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center">1</span>
              <span className="font-semibold text-blue-600">Destinations</span>
              <span className="text-gray-300">--</span>
              <span className="bg-gray-200 text-gray-500 w-6 h-6 rounded-full flex items-center justify-center">2</span>
              <span className="text-gray-500">Applicants</span>
              <span className="text-gray-300">--</span>
              <span className="bg-gray-200 text-gray-500 w-6 h-6 rounded-full flex items-center justify-center">3</span>
              <span className="text-gray-500">Review</span>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number (Primary)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded p-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="A0000000"
                  value={passport}
                  onChange={e => { setPassport(e.target.value); setPassportState('initial'); setErrorMsg(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  disabled={passportState === 'searching'}
                />
                <button
                  onClick={handleSearch}
                  disabled={!passport.trim() || passportState === 'searching'}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Search
                </button>
                <button
                  onClick={handleClear}
                  disabled={passportState === 'searching'}
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
              {passportState === 'searching' && <p className="mt-2 text-xs text-gray-500">Checking passport...</p>}
              {passportState === 'available' && <p className="mt-2 text-xs font-semibold text-green-600">✓ Passport Available</p>}
              {passportState === 'already_added' && <p className="mt-2 text-xs font-semibold text-red-600">✗ Already Added</p>}
              {(passportState === 'error' || errorMsg) && passportState !== 'already_added' && (
                <p className="mt-2 text-xs font-semibold text-orange-600">{errorMsg || 'Search failed.'}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${canSelectCountry ? 'text-gray-700' : 'text-gray-400'}`}>Target Country</label>
              <select
                className="w-full border border-gray-300 rounded p-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                value={targetCountry}
                onChange={e => setTargetCountry(e.target.value)}
                disabled={!canSelectCountry}
              >
                <option value="">Select Country</option>
                {toCountryOptions.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-8 flex justify-end space-x-3">
            <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>Cancel</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50" onClick={goToStep2} disabled={!canProceedToStep2}>Next</button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STEP 2
  // -------------------------------------------------------------
  if (step === 2) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-[800px] max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2 text-sm">
              <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center">✓</span>
              <span className="text-gray-500">Destinations</span>
              <span className="text-gray-300">--</span>
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center">2</span>
              <span className="font-semibold text-blue-600">Applicants</span>
              <span className="text-gray-300">--</span>
              <span className="bg-gray-200 text-gray-500 w-6 h-6 rounded-full flex items-center justify-center">3</span>
              <span className="text-gray-500">Review</span>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded mb-6 flex justify-between items-center border border-blue-100">
            <div>
              <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Visa Destination (Selected from previous step)</p>
              <p className="text-sm font-medium text-gray-800">
                From: <span className="font-bold">{prefilledFromCountry || 'Any'}</span> → Target: <span className="font-bold">{targetCountry}</span>
              </p>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-blue-600 font-medium hover:underline flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              Change
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Application Center</label>
              <select className="w-full border border-gray-300 rounded p-2 text-sm" value={applicationCenter} onChange={e => setApplicationCenter(e.target.value)}>
                <option value="">Select center</option>
                {centerOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select className="w-full border border-gray-300 rounded p-2 text-sm" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select category</option>
                {categoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sub-Category</label>
              <select className="w-full border border-gray-300 rounded p-2 text-sm" value={subCategory} onChange={e => setSubCategory(e.target.value)}>
                <option value="">Select sub-category</option>
                {subCategoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {applicants.map((app, index) => (
            <div key={app.id} className="border border-gray-200 rounded p-4 mb-4 relative">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  Applicant {index + 1}
                </h3>
                {applicants.length > 1 && (
                  <button onClick={() => removeApplicant(app.id)} className="text-red-500 hover:text-red-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-600 mb-1">First Name *</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.firstName} onChange={e => updateApplicant(app.id, 'firstName', e.target.value)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">Last Name *</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.lastName} onChange={e => updateApplicant(app.id, 'lastName', e.target.value)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">Nationality</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.nationality} onChange={e => updateApplicant(app.id, 'nationality', e.target.value)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">Passport Number *</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.passportNumber} onChange={e => updateApplicant(app.id, 'passportNumber', e.target.value)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">Passport Expiry Date</label><input type="date" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.passportExpiry} onChange={e => updateApplicant(app.id, 'passportExpiry', e.target.value)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">Date of Birth</label><input type="date" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.dateOfBirth} onChange={e => updateApplicant(app.id, 'dateOfBirth', e.target.value)} /></div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Gender</label>
                  <select className="w-full border border-gray-300 rounded p-2 text-sm" value={app.gender} onChange={e => updateApplicant(app.id, 'gender', e.target.value)}>
                    <option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>
                <div><label className="block text-xs text-gray-600 mb-1">Gap (Days)</label><input type="number" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.gapDays} onChange={e => updateApplicant(app.id, 'gapDays', e.target.value)} /></div>
                <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">Address Line 1</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.addressLine1} onChange={e => updateApplicant(app.id, 'addressLine1', e.target.value)} /></div>
                <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1">Address Line 2</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.addressLine2} onChange={e => updateApplicant(app.id, 'addressLine2', e.target.value)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">City</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.city} onChange={e => updateApplicant(app.id, 'city', e.target.value)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">State</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.state} onChange={e => updateApplicant(app.id, 'state', e.target.value)} /></div>
                <div><label className="block text-xs text-gray-600 mb-1">Postal Code</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.postalCode} onChange={e => updateApplicant(app.id, 'postalCode', e.target.value)} /></div>
              </div>
            </div>
          ))}

          <button onClick={addApplicant} className="text-blue-600 text-sm font-semibold flex items-center hover:underline">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            Add Another Applicant
          </button>

          {globalError && <p className="mt-4 text-sm font-semibold text-red-600">{globalError}</p>}

          <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>Cancel</button>
            <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setStep(1)}>Previous</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700" onClick={goToStep3}>Save / Next</button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STEP 3
  // -------------------------------------------------------------
  if (step === 3) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-[800px] max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2 text-sm">
              <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center">✓</span>
              <span className="text-gray-500">Destinations</span>
              <span className="text-gray-300">--</span>
              <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center">✓</span>
              <span className="text-gray-500">Applicants</span>
              <span className="text-gray-300">--</span>
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center">3</span>
              <span className="font-semibold text-blue-600">Review</span>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6 text-sm text-yellow-800 flex items-start">
            <svg className="w-5 h-5 mr-2 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <div>
              <span className="font-bold block mb-1">Please verify all information carefully.</span>
              After clicking "Create Client", the client will be created with the above configuration.
            </div>
          </div>

          <div className="border border-gray-200 rounded mb-6 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Route Information</h3>
              <button onClick={() => setStep(2)} className="text-blue-600 text-xs font-semibold hover:underline flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg> Edit
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-3 text-sm">
              <div className="col-span-2 flex items-center">
                <span className="text-gray-500 w-32">From Country</span>
                <span className="font-semibold">{prefilledFromCountry || 'Any'}</span>
                <span className="mx-3 text-gray-400">→</span>
                <span className="text-gray-500 mr-2">Target Country</span>
                <span className="font-semibold">{targetCountry}</span>
              </div>
              <div className="flex"><span className="text-gray-500 w-32">Application Center</span><span className="font-medium">{applicationCenter}</span></div>
              <div className="flex"><span className="text-gray-500 w-32">Category</span><span className="font-medium">{category}</span></div>
              <div className="flex"><span className="text-gray-500 w-32">Sub-Category</span><span className="font-medium">{subCategory}</span></div>
              <div className="flex"><span className="text-gray-500 w-32">Total Applicant(s)</span><span className="font-medium">{applicants.length} Applicant(s)</span></div>
            </div>
          </div>

          <div className="border border-gray-200 rounded overflow-hidden mb-6">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Applicant(s)</h3>
              <button onClick={() => setStep(2)} className="text-blue-600 text-xs font-semibold hover:underline flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg> Edit
              </button>
            </div>
            {applicants.map((app, index) => (
              <div key={app.id} className="p-4 border-b border-gray-100 last:border-0 grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2 font-bold mb-2">Applicant {index + 1}</div>
                <div className="flex"><span className="text-gray-500 w-24">Name</span><span className="font-medium uppercase">{app.firstName} {app.lastName}</span></div>
                <div className="flex"><span className="text-gray-500 w-24">Passport</span><span className="font-medium uppercase">{app.passportNumber}</span></div>
                <div className="flex"><span className="text-gray-500 w-24">Nationality</span><span className="font-medium uppercase">{app.nationality}</span></div>
                <div className="flex"><span className="text-gray-500 w-24">Gender</span><span className="font-medium uppercase">{app.gender || '-'}</span></div>
                <div className="flex"><span className="text-gray-500 w-24">DOB</span><span className="font-medium">{app.dateOfBirth || '-'}</span></div>
                <div className="flex"><span className="text-gray-500 w-24">City</span><span className="font-medium uppercase">{app.city || '-'}</span></div>
              </div>
            ))}
          </div>

          {globalError && <p className="mb-4 text-sm font-semibold text-red-600">{globalError}</p>}
          {successMsg && <p className="mb-4 text-sm font-semibold text-green-600">{successMsg}</p>}

          <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setStep(2)} disabled={submitting}>Previous</button>
            <button className="px-4 py-2 bg-blue-900 text-white rounded text-sm font-medium hover:bg-blue-800 flex items-center disabled:opacity-50" onClick={handleCreateClient} disabled={submitting}>
              {submitting ? 'Creating...' : <>✓ Create Client</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
