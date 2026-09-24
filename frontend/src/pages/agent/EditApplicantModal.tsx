import { useState } from 'react';
import { COUNTRY_MASTER_LIST } from '../../data/countryMaster';
import { SearchableSelect } from '../../components/SearchableSelect';

export function EditApplicantModal({ client, onClose, onSave }: { client: any, onClose: () => void, onSave: () => void }) {
  const [firstName, setFirstName] = useState(client.customer?.user?.firstName || '');
  const [lastName, setLastName] = useState(client.customer?.user?.lastName || '');
  const [nationality, setNationality] = useState(client.customer?.nationality || '');
  const [passportNumber, setPassportNumber] = useState(client.customer?.passportNumber || '');
  const [gender, setGender] = useState(client.customer?.gender || '');
  
  // Basic date string formatting for input type="date"
  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toISOString().split('T')[0] : '';
  const [dateOfBirth, setDateOfBirth] = useState(formatDate(client.customer?.dateOfBirth));
  const [passportExpiry, setPassportExpiry] = useState(formatDate(client.customer?.passportExpiry));
  const [gapDays, setGapDays] = useState(client.customer?.gapDays || '');
  const [addressLine1, setAddressLine1] = useState(client.customer?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(client.customer?.addressLine2 || '');
  const [state, setState] = useState(client.customer?.state || '');
  const [postalCode, setPostalCode] = useState(client.customer?.postalCode || '');
  const [city, setCity] = useState(client.customer?.city || '');

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/applications/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName, lastName, nationality, passportNumber, gender, dateOfBirth,
          passportExpiry, gapDays: gapDays ? parseInt(gapDays as string, 10) : null,
          addressLine1, addressLine2, state, postalCode, city
        })
      });
      onSave();
    } catch (e) {
      console.error(e);
      alert('Failed to save applicant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Applicant</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" className="w-full border-gray-300 rounded p-2 text-sm border" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" className="w-full border-gray-300 rounded p-2 text-sm border" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Passport Number</label>
              <input type="text" className="w-full border-gray-300 rounded p-2 text-sm border uppercase font-semibold" value={passportNumber} onChange={e => setPassportNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Passport Expiry Date</label>
              <input type="date" className="w-full border-gray-300 rounded p-2 text-sm border" value={passportExpiry} onChange={e => setPassportExpiry(e.target.value)} />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nationality</label>
              <SearchableSelect options={COUNTRY_MASTER_LIST} value={nationality} onChange={setNationality} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" className="w-full border-gray-300 rounded p-2 text-sm border" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
              <select className="w-full border-gray-300 rounded p-2 text-sm border" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gap (Days)</label>
              <input type="number" className="w-full border-gray-300 rounded p-2 text-sm border" value={gapDays} onChange={e => setGapDays(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 1</label>
              <input type="text" className="w-full border-gray-300 rounded p-2 text-sm border" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 2</label>
              <input type="text" className="w-full border-gray-300 rounded p-2 text-sm border" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
              <input type="text" className="w-full border-gray-300 rounded p-2 text-sm border" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
              <input type="text" className="w-full border-gray-300 rounded p-2 text-sm border" value={state} onChange={e => setState(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Postal Code</label>
              <input type="text" className="w-full border-gray-300 rounded p-2 text-sm border" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-100 text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
