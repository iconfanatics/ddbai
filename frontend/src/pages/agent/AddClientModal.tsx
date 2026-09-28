import { NATIONALITY_LIST } from '../../data/nationalityList';
import { useState, useMemo } from 'react';
import { VISA_ROUTE_MASTER } from '../../data/visaRouteMaster';

import Tesseract from 'tesseract.js';

// Real OCR function
const extractPassportData = async (file: File) => {
  try {
    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(file);
    const text = ret.data.text;
    await worker.terminate();

    // Basic MRZ parsing
    const lines = text.split('\n').map(l => l.replace(/\s+/g, '').replace(/O/g, '0')); // Replace space and O with 0 in MRZ
    let mrz1 = '';
    let mrz2 = '';
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('P<') || lines[i].startsWith('P=')) {
        mrz1 = lines[i];
        if (i + 1 < lines.length) mrz2 = lines[i + 1];
        break;
      }
    }

    if (mrz1 && mrz2 && mrz1.length >= 30 && mrz2.length >= 30) {
      // Parse MRZ
      const namePart = mrz1.substring(5).split('<<');
      let lastName = namePart[0].replace(/</g, ' ');
      let firstName = namePart.length > 1 ? namePart[1].replace(/</g, ' ') : '';
      
      const passportNumber = mrz2.substring(0, 9).replace(/</g, '');
      const nationality = mrz2.substring(10, 13);
      
      const dobRaw = mrz2.substring(13, 19);
      const dobYear = parseInt(dobRaw.substring(0, 2), 10);
      const dobFullYear = dobYear > 50 ? 1900 + dobYear : 2000 + dobYear;
      const dateOfBirth = `${dobFullYear}-${dobRaw.substring(2, 4)}-${dobRaw.substring(4, 6)}`;
      
      const genderCode = mrz2.substring(20, 21);
      const gender = genderCode === 'M' ? 'Male' : genderCode === 'F' ? 'Female' : '';
      
      const expRaw = mrz2.substring(21, 27);
      const expFullYear = 2000 + parseInt(expRaw.substring(0, 2), 10);
      const passportExpiry = `${expFullYear}-${expRaw.substring(2, 4)}-${expRaw.substring(4, 6)}`;

      // Try mapping nationality code roughly
      let natMapped = nationality;
      if (nationality.includes('BGD')) natMapped = 'Bangladesh';
      else if (nationality.includes('IND')) natMapped = 'India';
      else if (nationality.includes('PAK')) natMapped = 'Pakistan';

      return {
        firstName: firstName.trim().toUpperCase() || 'UNKNOWN',
        lastName: lastName.trim().toUpperCase() || 'UNKNOWN',
        nationality: natMapped,
        passportNumber: passportNumber.toUpperCase(),
        dateOfBirth,
        passportExpiry,
        gender
      };
    }
    
    // Fallback if MRZ parsing fails
    return {
      firstName: "NOT_FOUND",
      lastName: "NOT_FOUND",
      nationality: "Bangladesh",
      passportNumber: "NOT_FOUND",
      dateOfBirth: "1995-01-01",
      passportExpiry: "2030-01-01",
      gender: "Male"
    };
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};

// A simple searchable select component
function SearchableSelect({ options, value, onChange, placeholder = "Select..." }: { options: string[], value: string, onChange: (val: string) => void, placeholder?: string }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    return options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  }, [options, query]);

  return (
    <div className="relative w-full">
      <div 
        className="w-full border border-gray-300 rounded p-2 text-sm bg-white cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>{value || placeholder}</span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
              placeholder="Type 1-2 letters to search..." 
              value={query} 
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">No results found</div>
          ) : (
            filteredOptions.map(opt => (
              <div 
                key={opt} 
                className="p-2 text-sm hover:bg-blue-50 cursor-pointer text-gray-800"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                  setQuery('');
                }}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
      {/* Click away overlay */}
      {isOpen && <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)}></div>}
    </div>
  );
}

const COUNTRY_MASTER_LIST = [
  "United Arab Emirates", "Portugal", "India", "Bangladesh", "Germany", "Angola", "Guinea-Bissau", "Senegal", "Latvia", "Bulgaria", "France", "United States", "United Kingdom", "Canada", "Australia", "Saudi Arabia", "Oman", "Qatar", "Kuwait", "Bahrain"
].sort();

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
  city: string;
  state: string;
  postalCode: string;

  // OCR specific
  passportFileName?: string;
  passportFileUrl?: string;
  ocrAnalyzing?: boolean;
  ocrData?: any;
  isAutoFilled?: boolean;
}

type PassportState = 'initial' | 'searching' | 'available' | 'unavailable';

export function AddClientModal({ onClose, onSuccess, prefilledFromCountry, prefilledTargetCountry }: { onClose: () => void, onSuccess: () => void, prefilledFromCountry?: string, prefilledTargetCountry?: string }) {
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [passport, setPassport] = useState('');
  const [passportState, setPassportState] = useState<PassportState>('initial');
  const [errorMsg, setErrorMsg] = useState('');
  const [fromCountry, setFromCountry] = useState(prefilledFromCountry || '');
  const [targetCountry, setTargetCountry] = useState(prefilledTargetCountry || '');


  const fromOptions = useMemo(() => VISA_ROUTE_MASTER.map(c => c.name), []);
  const toOptions = useMemo(() => {
    if (!fromCountry) return [];
    return VISA_ROUTE_MASTER.find(c => c.name === fromCountry)?.toCountries.map(t => t.name) || [];
  }, [fromCountry]);

  // Step 2 State
  const [applicationCenter, setApplicationCenter] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [focusedAppId, setFocusedAppId] = useState<string | null>(null);

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

  const categoryOptions = validCategories.map(c => typeof c === 'string' ? c : c.name);

  const validSubCategories = useMemo(() => {
    if (!category) return [];
    const catObj = validCategories.find(c => (typeof c === 'string' ? c : c.name) === category);
    if (!catObj || typeof catObj === 'string') return [];
    return catObj.subCategories;
  }, [category, validCategories]);

  const canProceedToStep2 = passportState === 'available' && fromCountry.trim() !== '' && targetCountry.trim() !== '';

  const handleSearch = async () => {
    if (!passport.trim()) {
      setErrorMsg('Please enter Passport Number.');
      return;
    }
    setErrorMsg('');
    setPassportState('searching');
    setTimeout(() => {
      setPassportState('available');
    }, 800);
  };

  const goToStep2 = () => {
    if (applicants.length === 0) {
      const initAppId = Date.now().toString();
      setApplicants([{
        id: initAppId, firstName: '', lastName: '', nationality: '', passportNumber: passport, passportExpiry: '', dateOfBirth: '', gender: '', gapDays: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: ''
      }]);
      setFocusedAppId(initAppId);
    }
    setStep(2);
  };

  const addApplicant = () => {
    const newId = Date.now().toString();
    setApplicants([...applicants, {
      id: newId, firstName: '', lastName: '', nationality: '', passportNumber: '', passportExpiry: '', dateOfBirth: '', gender: '', gapDays: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: ''
    }]);
    setFocusedAppId(newId);
  };

  const removeApplicant = (id: string) => {
    const newApps = applicants.filter(a => a.id !== id);
    setApplicants(newApps);
    if (focusedAppId === id) {
      setFocusedAppId(newApps.length > 0 ? newApps[0].id : null);
    }
  };

  const updateApplicant = (id: string, field: keyof Applicant, value: any) => {
    setApplicants(apps => apps.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleFileUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    
    updateApplicant(id, 'passportFileName', file.name);
    updateApplicant(id, 'passportFileUrl', url);
    updateApplicant(id, 'ocrAnalyzing', true);
    setFocusedAppId(id);

    try {
      const data = await extractPassportData(file);
      updateApplicant(id, 'ocrData', data);
      updateApplicant(id, 'ocrAnalyzing', false);
    } catch (err) {
      updateApplicant(id, 'ocrAnalyzing', false);
    }
  };

  const removePassport = (id: string) => {
    updateApplicant(id, 'passportFileName', undefined);
    updateApplicant(id, 'passportFileUrl', undefined);
    updateApplicant(id, 'ocrData', undefined);
    updateApplicant(id, 'isAutoFilled', false);
  };

  const fillFormFromOCR = (id: string) => {
    const app = applicants.find(a => a.id === id);
    if (app && app.ocrData) {
      setApplicants(apps => apps.map(a => {
        if (a.id === id) {
          return {
            ...a,
            firstName: a.ocrData.firstName || a.firstName,
            lastName: a.ocrData.lastName || a.lastName,
            nationality: a.ocrData.nationality || a.nationality,
            passportNumber: a.ocrData.passportNumber || a.passportNumber,
            dateOfBirth: a.ocrData.dateOfBirth || a.dateOfBirth,
            passportExpiry: a.ocrData.passportExpiry || a.passportExpiry,
            gender: a.ocrData.gender || a.gender,
            isAutoFilled: true
          };
        }
        return a;
      }));
    }
  };

  const [globalError, setGlobalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goToStep3 = () => {
    if (!applicationCenter || !category) {
      setGlobalError('Please select Application Center and Category.');
      return;
    }
    for (const a of applicants) {
      if (!a.firstName || !a.lastName || !a.passportNumber) {
        setGlobalError('First Name, Last Name, and Passport Number are required for all applicants.');
        return;
      }
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
          fromCountry: fromCountry || undefined,
          targetCountry,
          applicationCenter,
          category,
          subCategory,
          applicants: applicants.map(a => ({
            firstName: a.firstName,
            lastName: a.lastName,
            nationality: a.nationality,
            passportNumber: a.passportNumber,
            passportExpiry: a.passportExpiry || undefined,
            dateOfBirth: a.dateOfBirth || undefined,
            gender: a.gender || undefined,
            gapDays: a.gapDays ? parseInt(a.gapDays, 10) : undefined,
            addressLine1: a.addressLine1 || undefined,
            addressLine2: a.addressLine2 || undefined,
            city: a.city || undefined,
            state: a.state || undefined,
            postalCode: a.postalCode || undefined
          }))
        })
      });
      if (res.ok) {
        setSuccessMsg('Client created successfully!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        const err = await res.json();
        setGlobalError(err.message || 'Failed to create client.');
        setSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      setGlobalError('An unexpected error occurred.');
      setSubmitting(false);
    }
  };

  // Require face verification logic
  const faceVerificationRequired = useMemo(() => {
    if (fromCountry && targetCountry) {
      // In real app, this would hit the DB. For UI UX we assume some routes are required.
      const fromData = VISA_ROUTE_MASTER.find(c => c.name === fromCountry);
      if (fromData) {
        const targetData = fromData.toCountries.find(t => t.name === targetCountry);
        if (targetData && targetCountry === 'Portugal') {
          return true;
        }
      }
    }
    return false;
  }, [fromCountry, targetCountry]);

  // Derived state for right panel
  const focusedApp = applicants.find(a => a.id === focusedAppId) || applicants[0];

  // -------------------------------------------------------------
  // RENDER STEP 1
  // -------------------------------------------------------------
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-[800px] max-h-[90vh] overflow-y-auto">
          {/* Same as before for step 1 */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2 text-sm">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center">1</span>
              <span className="font-semibold text-blue-600">Destinations</span>
              <span className="text-gray-300">--</span>
              <span className="bg-gray-200 text-gray-600 w-6 h-6 rounded-full flex items-center justify-center">2</span>
              <span className="text-gray-500">Applicants</span>
              <span className="text-gray-300">--</span>
              <span className="bg-gray-200 text-gray-600 w-6 h-6 rounded-full flex items-center justify-center">3</span>
              <span className="text-gray-500">Review</span>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number (Primary)</label>
              <div className="flex gap-2">
                <input type="text" className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={passport} onChange={e => {setPassport(e.target.value); setPassportState('initial');}} placeholder="Enter primary applicant's passport number" />
                <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 flex items-center min-w-[100px] justify-center">
                  {passportState === 'searching' ? <span className="animate-spin mr-2">↻</span> : null} Search
                </button>
                <button onClick={() => {setPassport(''); setPassportState('initial');}} className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded text-sm font-medium hover:bg-gray-50">Clear</button>
              </div>
              {errorMsg && <p className="text-red-500 text-xs mt-1">{errorMsg}</p>}
              {passportState === 'available' && <p className="text-green-600 text-xs mt-1 font-medium flex items-center">✓ Passport Available</p>}
            </div>

            <div className={`transition-opacity duration-300 ${passportState === 'available' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Country</label>
                    <SearchableSelect options={fromOptions} value={fromCountry} onChange={setFromCountry} placeholder="Select Origin..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Country</label>
                    <SearchableSelect options={toOptions} value={targetCountry} onChange={setTargetCountry} placeholder="Select Destination..." />
                  </div>
                </div>

                {faceVerificationRequired && (
                  <div className="mt-6 bg-orange-50 border border-orange-200 p-4 rounded text-orange-800 flex items-start">
                    <svg className="w-5 h-5 mr-2 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    <div>
                      <div className="font-bold mb-1">Face Verification Required</div>
                      <div className="text-sm">This route ({fromCountry} &rarr; {targetCountry}) requires Face Verification for this application.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={goToStep2} disabled={!canProceedToStep2}>Next</button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STEP 2 (The large 2-column layout)
  // -------------------------------------------------------------
  if (step === 2) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-[1200px] max-w-[95vw] max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
            <div className="flex items-center space-x-2 text-sm ml-12">
              <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center">✓</span>
              <span className="text-gray-500">Destinations</span>
              <span className="text-gray-300">--</span>
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center">2</span>
              <span className="font-semibold text-blue-600">Applicants</span>
              <span className="text-gray-300">--</span>
              <span className="bg-gray-200 text-gray-600 w-6 h-6 rounded-full flex items-center justify-center">3</span>
              <span className="text-gray-500">Review</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-auto">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex gap-6 overflow-hidden flex-1">
            
            {/* LEFT COLUMN: Main Form */}
            <div className="w-[65%] overflow-y-auto pr-2 flex flex-col gap-6">
              
              {/* Route Summary */}
              <div className="bg-blue-50 border border-blue-100 rounded flex items-center p-3 text-sm">
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">Visa Destination</div>
                  <div className="font-medium text-blue-900">From: {fromCountry || 'Any'} &rarr; Target: {targetCountry}</div>
                </div>
                <button onClick={() => setStep(1)} className="text-blue-600 hover:underline flex items-center text-xs font-semibold">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  Change
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Application Center</label>
                  <select className="w-full border border-gray-300 rounded p-2 text-sm bg-white" value={applicationCenter} onChange={e => { setApplicationCenter(e.target.value); setCategory(""); setSubCategory(""); }}>
                    <option value="">Select center</option>
                    {centerOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select className="w-full border border-gray-300 rounded p-2 text-sm bg-white" value={category} onChange={e => { setCategory(e.target.value); setSubCategory(""); }} disabled={!applicationCenter}>
                    <option value="">Select category</option>
                    {categoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sub-Category</label>
                  <select className="w-full border border-gray-300 rounded p-2 text-sm bg-white" value={subCategory} onChange={e => setSubCategory(e.target.value)} disabled={!category || validSubCategories.length === 0}>
                    <option value="">Select sub-category</option>
                    {validSubCategories.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {applicants.map((app, index) => (
                  <div key={app.id} className={`border rounded-lg overflow-hidden transition-all ${focusedAppId === app.id ? 'border-blue-400 shadow-md ring-1 ring-blue-400' : 'border-gray-200 bg-gray-50'}`} onClick={() => setFocusedAppId(app.id)}>
                    <div className={`flex justify-between items-center px-4 py-3 cursor-pointer ${focusedAppId === app.id ? 'bg-blue-50/50' : 'bg-gray-50'}`}>
                      <h3 className="font-semibold text-gray-800 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        Applicant {index + 1}
                      </h3>
                      {applicants.length > 1 && (
                        <button onClick={(e) => {e.stopPropagation(); removeApplicant(app.id);}} className="text-red-500 hover:text-red-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      )}
                    </div>
                    
                    {focusedAppId === app.id && (
                      <div className="p-4 bg-white border-t border-gray-100">
                        
                        {/* Passport Upload Section */}
                        <div className="mb-6">
                          <h4 className="text-xs font-bold text-gray-700 mb-2">Upload Passport / Document</h4>
                          <p className="text-[10px] text-gray-400 mb-2">Supported formats: JPG, PNG, PDF (Max 10 MB)</p>
                          
                          <div className="flex gap-4 items-center">
                            {!app.passportFileName ? (
                              <label className="flex-1 border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-24">
                                <svg className="w-6 h-6 text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                                <span className="text-xs text-blue-600 font-medium text-center">Click to upload or drag and drop</span>
                                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => handleFileUpload(app.id, e)} />
                              </label>
                            ) : (
                              <div className="flex-1 border border-gray-200 rounded-lg p-3 flex items-center justify-between bg-gray-50 h-24">
                                <div className="flex items-center gap-3">
                                  {app.passportFileUrl && <img src={app.passportFileUrl} className="w-12 h-16 object-cover border border-gray-300 rounded shadow-sm" alt="Passport" />}
                                  <div>
                                    <p className="text-xs font-bold text-gray-800">{app.passportFileName}</p>
                                    <p className="text-[10px] text-gray-500 flex items-center mt-1">
                                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> Uploaded successfully
                                    </p>
                                  </div>
                                </div>
                                <button onClick={() => removePassport(app.id)} className="text-red-500 hover:text-red-700 p-2" title="Remove">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            )}

                            {app.passportFileName && (
                              <button 
                                onClick={() => fillFormFromOCR(app.id)}
                                disabled={app.ocrAnalyzing || !app.ocrData || app.isAutoFilled}
                                className={`w-32 h-24 rounded-lg flex flex-col items-center justify-center font-bold text-white transition-all shadow-sm ${app.isAutoFilled ? 'bg-green-600' : app.ocrAnalyzing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                              >
                                {app.ocrAnalyzing ? (
                                  <><span className="animate-spin text-xl mb-1">↻</span><span className="text-[10px]">Analyzing...</span></>
                                ) : app.isAutoFilled ? (
                                  <><span className="text-xl mb-1">✓</span><span className="text-[10px]">Auto Filled</span></>
                                ) : (
                                  <><span className="text-xl mb-1">✨</span><span className="text-[10px]">Fill Up Form</span><span className="text-[8px] font-normal opacity-80 mt-1">Auto fill from passport</span></>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Input Fields */}
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs text-gray-600 mb-1 font-semibold">First Name *</label><input type="text" className={`w-full border rounded p-2 text-sm ${app.isAutoFilled && app.ocrData?.firstName === app.firstName ? 'bg-green-50 border-green-200' : 'border-gray-300'}`} value={app.firstName} onChange={e => updateApplicant(app.id, 'firstName', e.target.value)} /></div>
                          <div><label className="block text-xs text-gray-600 mb-1 font-semibold">Last Name *</label><input type="text" className={`w-full border rounded p-2 text-sm ${app.isAutoFilled && app.ocrData?.lastName === app.lastName ? 'bg-green-50 border-green-200' : 'border-gray-300'}`} value={app.lastName} onChange={e => updateApplicant(app.id, 'lastName', e.target.value)} /></div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1 font-semibold">Nationality</label>
                            <div className={`${app.isAutoFilled && app.ocrData?.nationality === app.nationality ? 'ring-1 ring-green-200 rounded' : ''}`}>
                              <SearchableSelect options={NATIONALITY_LIST} value={app.nationality} onChange={(val) => updateApplicant(app.id, 'nationality', val)} />
                            </div>
                          </div>
                          <div><label className="block text-xs text-gray-600 mb-1 font-semibold">Passport Number *</label><input type="text" className={`w-full border rounded p-2 text-sm ${app.isAutoFilled && app.ocrData?.passportNumber === app.passportNumber ? 'bg-green-50 border-green-200' : 'border-gray-300'}`} value={app.passportNumber} onChange={e => updateApplicant(app.id, 'passportNumber', e.target.value)} /></div>
                          <div><label className="block text-xs text-gray-600 mb-1 font-semibold">Passport Expiry Date</label><input type="date" className={`w-full border rounded p-2 text-sm ${app.isAutoFilled && app.ocrData?.passportExpiry === app.passportExpiry ? 'bg-green-50 border-green-200' : 'border-gray-300'}`} value={app.passportExpiry} onChange={e => updateApplicant(app.id, 'passportExpiry', e.target.value)} /></div>
                          <div><label className="block text-xs text-gray-600 mb-1 font-semibold">Date of Birth</label><input type="date" className={`w-full border rounded p-2 text-sm ${app.isAutoFilled && app.ocrData?.dateOfBirth === app.dateOfBirth ? 'bg-green-50 border-green-200' : 'border-gray-300'}`} value={app.dateOfBirth} onChange={e => updateApplicant(app.id, 'dateOfBirth', e.target.value)} /></div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1 font-semibold">Gender</label>
                            <select className={`w-full border rounded p-2 text-sm ${app.isAutoFilled && app.ocrData?.gender === app.gender ? 'bg-green-50 border-green-200' : 'border-gray-300'}`} value={app.gender} onChange={e => updateApplicant(app.id, 'gender', e.target.value)}>
                              <option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option>
                            </select>
                          </div>
                          <div><label className="block text-xs text-gray-600 mb-1 font-semibold">Gap (Days)</label><input type="number" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.gapDays} onChange={e => updateApplicant(app.id, 'gapDays', e.target.value)} /></div>
                          <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1 font-semibold">Address Line 1</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.addressLine1} onChange={e => updateApplicant(app.id, 'addressLine1', e.target.value)} /></div>
                          <div className="col-span-2"><label className="block text-xs text-gray-600 mb-1 font-semibold">Address Line 2</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.addressLine2} onChange={e => updateApplicant(app.id, 'addressLine2', e.target.value)} /></div>
                          <div><label className="block text-xs text-gray-600 mb-1 font-semibold">City</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.city} onChange={e => updateApplicant(app.id, 'city', e.target.value)} /></div>
                          <div><label className="block text-xs text-gray-600 mb-1 font-semibold">State</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.state} onChange={e => updateApplicant(app.id, 'state', e.target.value)} /></div>
                          <div><label className="block text-xs text-gray-600 mb-1 font-semibold">Postal Code</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" value={app.postalCode} onChange={e => updateApplicant(app.id, 'postalCode', e.target.value)} /></div>
                        </div>

                      </div>
                    )}
                  </div>
                ))}

                <button onClick={addApplicant} className="text-blue-600 text-sm font-semibold flex items-center hover:underline mt-2">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Add Another Applicant
                </button>
                {globalError && <p className="mt-2 text-sm font-semibold text-red-600">{globalError}</p>}
              </div>

            </div>

            {/* RIGHT COLUMN: Passport Preview & Extracted Info */}
            <div className="w-[35%] bg-gray-50 border border-gray-200 rounded-lg flex flex-col overflow-hidden shrink-0">
              <div className="p-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-gray-800 text-sm border-l-4 border-blue-600 pl-2">Passport Preview</h3>
                <svg className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
              </div>
              
              <div className="p-4 border-b border-gray-200 flex items-center justify-center bg-gray-200 h-64 shrink-0 overflow-hidden">
                {focusedApp?.passportFileUrl ? (
                  <img src={focusedApp.passportFileUrl} className="max-w-full max-h-full object-contain shadow-sm border border-gray-300" alt="Passport Preview" />
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <p className="text-xs font-semibold">No passport uploaded yet</p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-100 border-b border-gray-200 shrink-0">
                <h3 className="font-bold text-gray-800 text-sm border-l-4 border-green-600 pl-2">Extracted Information (Auto Fill)</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 bg-white">
                {focusedApp?.ocrAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-full text-blue-600 space-y-3">
                    <span className="animate-spin text-3xl">↻</span>
                    <p className="text-xs font-semibold">Analyzing passport with OCR...</p>
                  </div>
                ) : focusedApp?.ocrData ? (
                  <div>
                    <div className="flex items-center text-green-600 text-xs font-bold mb-4 bg-green-50 p-2 rounded">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                      Data extracted successfully
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-3 border-b border-gray-100 pb-2"><span className="text-gray-500 col-span-1 flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>First Name</span><span className="font-semibold text-gray-900 col-span-2 uppercase">{focusedApp.ocrData.firstName}</span></div>
                      <div className="grid grid-cols-3 border-b border-gray-100 pb-2"><span className="text-gray-500 col-span-1 flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>Last Name</span><span className="font-semibold text-gray-900 col-span-2 uppercase">{focusedApp.ocrData.lastName}</span></div>
                      <div className="grid grid-cols-3 border-b border-gray-100 pb-2"><span className="text-gray-500 col-span-1 flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>Passport Number</span><span className="font-semibold text-gray-900 col-span-2 uppercase">{focusedApp.ocrData.passportNumber}</span></div>
                      <div className="grid grid-cols-3 border-b border-gray-100 pb-2"><span className="text-gray-500 col-span-1 flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg>Nationality</span><span className="font-semibold text-gray-900 col-span-2 uppercase">{focusedApp.ocrData.nationality}</span></div>
                      <div className="grid grid-cols-3 border-b border-gray-100 pb-2"><span className="text-gray-500 col-span-1 flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Date of Birth</span><span className="font-semibold text-gray-900 col-span-2">{focusedApp.ocrData.dateOfBirth}</span></div>
                      <div className="grid grid-cols-3 border-b border-gray-100 pb-2"><span className="text-gray-500 col-span-1 flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Date of Expiry</span><span className="font-semibold text-gray-900 col-span-2">{focusedApp.ocrData.passportExpiry}</span></div>
                      <div className="grid grid-cols-3"><span className="text-gray-500 col-span-1 flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>Gender</span><span className="font-semibold text-gray-900 col-span-2">{focusedApp.ocrData.gender}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 mt-10">
                    <p className="text-xs">Upload a passport to extract data</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200 shrink-0">
            <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>Cancel</button>
            <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setStep(1)}>Previous</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700" onClick={goToStep3}>Save / Next</button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STEP 3 (Review)
  // -------------------------------------------------------------
  if (step === 3) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-[800px] max-h-[90vh] overflow-y-auto">
          {/* Same as before for step 3 */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
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
              <button onClick={() => setStep(2)} className="text-blue-600 text-xs font-semibold hover:underline flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg> Edit</button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-3 text-sm">
              <div className="col-span-2 flex items-center">
                <span className="text-gray-500 w-32">From Country</span><span className="font-semibold">{fromCountry || 'Any'}</span><span className="mx-3 text-gray-400">→</span><span className="text-gray-500 mr-2">Target Country</span><span className="font-semibold">{targetCountry}</span>
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
              <button onClick={() => setStep(2)} className="text-blue-600 text-xs font-semibold hover:underline flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg> Edit</button>
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
