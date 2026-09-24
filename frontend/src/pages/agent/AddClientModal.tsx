import { useState, useMemo } from 'react';
import { VISA_ROUTE_MASTER } from '../../data/visaRouteMaster';
import { COUNTRY_MASTER_LIST } from '../../data/countryMaster';
import { SearchableSelect } from '../../components/SearchableSelect';

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

  // Step 1: Destination & Passport
  const [passport, setPassport] = useState("");
  const [passportState, setPassportState] = useState<PassportState>('initial');
  
  const [fromCountry, setFromCountry] = useState(prefilledFromCountry || "");
  const [targetCountry, setTargetCountry] = useState(prefilledTargetCountry || "");

  // Step 2: Route Config
  const [applicationCenter, setApplicationCenter] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");

  // Step 2: Applicants array
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -- PASSPORT SEARCH --
  const handleSearch = async () => {
    if (!passport.trim()) return;
    setPassportState('searching');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/applications/check-passport?passport=${encodeURIComponent(passport)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPassportState(data.available ? 'available' : 'already_added');
      } else {
        setPassportState('error');
      }
    } catch {
      setPassportState('error');
    }
  };

  const handleClear = () => {
    setPassport("");
    setPassportState('cleared');
    setFromCountry("");
    setTargetCountry("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const isPassportAvailable = passportState === 'available';
  const canProceedToStep2 = isPassportAvailable && fromCountry && targetCountry;

  // Route matching logic
  const validCenters = useMemo(() => {
    if (!fromCountry || !targetCountry) return [];
    const fromData = VISA_ROUTE_MASTER.find(c => c.name === fromCountry);
    if (!fromData) return [];
    const targetData = fromData.toCountries.find(t => t.name === targetCountry);
    if (!targetData) return [];
    return targetData.centers;
  }, [fromCountry, targetCountry]);

  const centerOptions = validCenters.map(c => typeof c === 'string' ? c : c.name);
  
  const validCategories = useMemo(() => {
    if (!applicationCenter) return [];
    const centerObj = validCenters.find(c => (typeof c === 'string' ? c : c.name) === applicationCenter);
    if (!centerObj || typeof centerObj === 'string') return [];
    return centerObj.categories;
  }, [applicationCenter, validCenters]);

  const categoryOptions = validCategories.map(c => c.name);

  const validSubCategories = useMemo(() => {
    if (!category) return [];
    const catObj = validCategories.find(c => c.name === category);
    if (!catObj) return [];
    return catObj.subCategories;
  }, [category, validCategories]);

  // -- NAVIGATION --
  const goToStep2 = () => {
    if (!canProceedToStep2) return;
    if (applicants.length === 0) {
      setApplicants([{
        id: Math.random().toString(36).substring(2, 9),
        firstName: '', lastName: '', nationality: fromCountry || '',
        passportNumber: passport.trim().toUpperCase(),
        passportExpiry: '', dateOfBirth: '', gender: '', gapDays: '',
        addressLine1: '', addressLine2: '', postalCode: '', city: '', state: ''
      }]);
    }
    // Pre-select if only 1 option available
    if (centerOptions.length === 1 && !applicationCenter) setApplicationCenter(centerOptions[0]);
    setStep(2);
  };

  const goToStep3 = () => {
    if (!applicationCenter || !category) {
      alert("Please complete the route configuration.");
      return;
    }
    // Validation
    const invalid = applicants.find(a => !a.firstName || !a.lastName || !a.passportNumber);
    if (invalid) {
      alert("Please fill out required applicant fields (First Name, Last Name, Passport).");
      return;
    }
    setStep(3);
  };

  const submitClient = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        fromCountry,
        targetCountry,
        applicationCenter,
        category,
        subCategory,
        applicants
      };

      const res = await fetch('/api/applications/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create client');
      }
      
      onClose(); // Automatically closes and refreshes
    } catch (e: any) {
      alert(e.message || "An error occurred");
      setIsSubmitting(false);
    }
  };

  const addApplicant = () => {
    setApplicants([...applicants, {
      id: Math.random().toString(36).substring(2, 9),
      firstName: '', lastName: '', nationality: fromCountry || '',
      passportNumber: '', passportExpiry: '', dateOfBirth: '', gender: '', gapDays: '',
      addressLine1: '', addressLine2: '', postalCode: '', city: '', state: ''
    }]);
  };

  const removeApplicant = (id: string) => {
    if (applicants.length === 1) return;
    setApplicants(applicants.filter(a => a.id !== id));
  };

  const updateApplicant = (id: string, field: keyof Applicant, value: string) => {
    setApplicants(applicants.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Wizard Steps indicator */}
        <div className="flex items-center justify-center py-4 border-b border-gray-100 bg-gray-50 text-sm">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</span>
            Destinations
          </div>
          <div className="w-16 h-px bg-gray-300 mx-4"></div>
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</span>
            Applicants
          </div>
          <div className="w-16 h-px bg-gray-300 mx-4"></div>
          <div className={`flex items-center ${step >= 3 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</span>
            Review
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number (Primary)</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={passport}
                    onChange={(e) => setPassport(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter passport number..."
                    className="flex-1 border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={isPassportAvailable}
                  />
                  {!isPassportAvailable && (
                    <button onClick={handleSearch} disabled={!passport.trim() || passportState === 'searching'} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50">
                      {passportState === 'searching' ? '...' : 'Search'}
                    </button>
                  )}
                  <button onClick={handleClear} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50">
                    Clear
                  </button>
                </div>

                <div className="mt-2 text-sm">
                  {passportState === 'searching' && <span className="text-gray-500 italic">Checking passport...</span>}
                  {passportState === 'available' && <span className="text-green-600 font-semibold flex items-center"><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Passport Available</span>}
                  {passportState === 'already_added' && <span className="text-red-600 font-semibold flex items-center"><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Already Added</span>}
                  {passportState === 'error' && <span className="text-red-600 italic">Unable to check passport. Please try again.</span>}
                </div>
              </div>

              {isPassportAvailable && (
                <div className="space-y-6 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From Country</label>
                      <SearchableSelect 
                        options={COUNTRY_MASTER_LIST}
                        value={fromCountry}
                        onChange={setFromCountry}
                        placeholder="Select Origin..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Country</label>
                      <SearchableSelect 
                        options={COUNTRY_MASTER_LIST}
                        value={targetCountry}
                        onChange={setTargetCountry}
                        placeholder="Select Destination..."
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic">Type 1–2 letters to search, or scroll and select manually.</p>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <h4 className="text-blue-800 font-semibold text-sm mb-1">Route configuration</h4>
                    <p className="text-blue-600 text-xs">Existing dashboard filters are used as the default source, but the user may change the route.</p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-gray-800 font-semibold text-sm mb-2">Next Step Preview — Applicants</h4>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>Application Center → matching route configuration</li>
                      <li>Category → matching categories</li>
                      <li>Sub-Category → matching sub-categories</li>
                      <li>Nationality → searchable A–Z country master list</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Route Summary */}
              <div className="bg-gray-50 rounded p-4 border border-gray-200 flex justify-between items-center">
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-bold tracking-wider mb-1">Selected Route</span>
                  <div className="text-gray-900 font-medium">
                    {fromCountry} <span className="text-gray-400 mx-2">→</span> {targetCountry}
                  </div>
                </div>
                <button onClick={() => setStep(1)} className="text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                  Change
                </button>
              </div>

              {/* Route Configuration */}
              <div className="grid grid-cols-3 gap-4 border-b border-gray-200 pb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Application Center <span className="text-red-500">*</span></label>
                  <select className="w-full border-gray-300 rounded p-2 border text-sm" value={applicationCenter} onChange={e => { setApplicationCenter(e.target.value); setCategory(""); setSubCategory(""); }}>
                    <option value="">Select Center...</option>
                    {centerOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <select className="w-full border-gray-300 rounded p-2 border text-sm" value={category} onChange={e => { setCategory(e.target.value); setSubCategory(""); }} disabled={!applicationCenter}>
                    <option value="">Select Category...</option>
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sub-Category</label>
                  <select className="w-full border-gray-300 rounded p-2 border text-sm" value={subCategory} onChange={e => setSubCategory(e.target.value)} disabled={!category || validSubCategories.length === 0}>
                    <option value="">Select Sub-Category...</option>
                    {validSubCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Applicants */}
              <div className="space-y-8">
                {applicants.map((app, index) => (
                  <div key={app.id} className="relative bg-white border border-gray-200 rounded p-5 shadow-sm">
                    {applicants.length > 1 && (
                      <button onClick={() => removeApplicant(app.id)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 text-xs font-semibold">
                        Remove
                      </button>
                    )}
                    <h3 className="font-semibold text-gray-900 mb-4 border-b pb-2">Applicant {index + 1}</h3>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">First Name <span className="text-red-500">*</span></label>
                        <input type="text" value={app.firstName} onChange={e => updateApplicant(app.id, 'firstName', e.target.value)} className="w-full border-gray-300 rounded p-2 border text-sm" placeholder="John" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Last Name <span className="text-red-500">*</span></label>
                        <input type="text" value={app.lastName} onChange={e => updateApplicant(app.id, 'lastName', e.target.value)} className="w-full border-gray-300 rounded p-2 border text-sm" placeholder="Doe" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nationality <span className="text-red-500">*</span></label>
                        <SearchableSelect 
                          options={COUNTRY_MASTER_LIST}
                          value={app.nationality}
                          onChange={(val) => updateApplicant(app.id, 'nationality', val)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Passport Number <span className="text-red-500">*</span></label>
                        <input type="text" value={app.passportNumber} onChange={e => updateApplicant(app.id, 'passportNumber', e.target.value)} className="w-full border-gray-300 rounded p-2 border text-sm font-semibold uppercase" placeholder="A000000" disabled={index === 0} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Passport Expiry</label>
                        <input type="date" value={app.passportExpiry} onChange={e => updateApplicant(app.id, 'passportExpiry', e.target.value)} className="w-full border-gray-300 rounded p-2 border text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Date of Birth</label>
                        <input type="date" value={app.dateOfBirth} onChange={e => updateApplicant(app.id, 'dateOfBirth', e.target.value)} className="w-full border-gray-300 rounded p-2 border text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Gender</label>
                        <select value={app.gender} onChange={e => updateApplicant(app.id, 'gender', e.target.value)} className="w-full border-gray-300 rounded p-2 border text-sm">
                          <option value="">Select...</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Address Line 1</label>
                        <input type="text" value={app.addressLine1} onChange={e => updateApplicant(app.id, 'addressLine1', e.target.value)} className="w-full border-gray-300 rounded p-2 border text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">City</label>
                        <input type="text" value={app.city} onChange={e => updateApplicant(app.id, 'city', e.target.value)} className="w-full border-gray-300 rounded p-2 border text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button onClick={addApplicant} className="text-blue-600 font-semibold text-sm hover:underline flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  Add Another Applicant
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded p-6 text-center">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Review Information</h3>
                <p className="text-blue-700 text-sm">Please review the details before creating the client record.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
                <h4 className="font-bold text-gray-900 border-b pb-2 mb-4">Route Configuration</h4>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div><span className="text-gray-500 block text-xs">Origin</span><span className="font-medium">{fromCountry}</span></div>
                  <div><span className="text-gray-500 block text-xs">Destination</span><span className="font-medium">{targetCountry}</span></div>
                  <div><span className="text-gray-500 block text-xs">Application Center</span><span className="font-medium">{applicationCenter}</span></div>
                  <div><span className="text-gray-500 block text-xs">Category</span><span className="font-medium">{category} {subCategory && `/ ${subCategory}`}</span></div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
                <h4 className="font-bold text-gray-900 border-b pb-2 mb-4">Applicants ({applicants.length})</h4>
                <div className="space-y-4">
                  {applicants.map((a) => (
                    <div key={a.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="font-semibold text-gray-800">{a.firstName} {a.lastName}</div>
                        <div className="text-xs text-gray-500 uppercase">{a.passportNumber} • {a.nationality}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          {step === 1 && (
            <>
              <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-100 font-medium">Cancel</button>
              <button onClick={goToStep2} disabled={!canProceedToStep2} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50">Next</button>
            </>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="px-6 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-100 font-medium">Previous</button>
              <button onClick={goToStep3} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Review</button>
            </>
          )}
          {step === 3 && (
            <>
              <button onClick={() => setStep(2)} disabled={isSubmitting} className="px-6 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-100 font-medium">Previous</button>
              <button onClick={submitClient} disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold flex items-center">
                {isSubmitting && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                Create Client
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
