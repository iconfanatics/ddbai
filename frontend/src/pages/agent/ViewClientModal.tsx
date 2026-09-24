export function ViewClientModal({ client, onClose }: { client: any, onClose: () => void }) {
  const c = client.customer;
  const u = c?.user;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">View Client Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          <div>
            <h3 className="text-gray-900 font-semibold mb-3 border-b pb-1">Applicant Information</h3>
            <div className="grid grid-cols-2 gap-y-3">
              <div><span className="text-gray-500 block text-xs">First Name</span><span className="font-medium">{u?.firstName || ''}</span></div>
              <div><span className="text-gray-500 block text-xs">Last Name</span><span className="font-medium">{u?.lastName || ''}</span></div>
              
              <div><span className="text-gray-500 block text-xs">Passport Number</span><span className="font-medium uppercase">{c?.passportNumber || ''}</span></div>
              <div><span className="text-gray-500 block text-xs">Passport Expiry Date</span><span className="font-medium">{c?.passportExpiry ? new Date(c.passportExpiry).toLocaleDateString() : ''}</span></div>
              
              <div><span className="text-gray-500 block text-xs">Nationality</span><span className="font-medium">{c?.nationality || ''}</span></div>
              <div><span className="text-gray-500 block text-xs">Date of Birth</span><span className="font-medium">{c?.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : ''}</span></div>
              
              <div><span className="text-gray-500 block text-xs">Gender</span><span className="font-medium">{c?.gender || ''}</span></div>
              <div><span className="text-gray-500 block text-xs">Gap (Days)</span><span className="font-medium">{c?.gapDays || ''}</span></div>
            </div>
          </div>
          
          <div>
            <h3 className="text-gray-900 font-semibold mb-3 border-b pb-1">Address Details</h3>
            <div className="grid grid-cols-2 gap-y-3">
              <div className="col-span-2"><span className="text-gray-500 block text-xs">Address Line 1</span><span className="font-medium">{c?.addressLine1 || ''}</span></div>
              <div className="col-span-2"><span className="text-gray-500 block text-xs">Address Line 2</span><span className="font-medium">{c?.addressLine2 || ''}</span></div>
              <div><span className="text-gray-500 block text-xs">City</span><span className="font-medium">{c?.city || ''}</span></div>
              <div><span className="text-gray-500 block text-xs">State</span><span className="font-medium">{c?.state || ''}</span></div>
              <div><span className="text-gray-500 block text-xs">Postal Code</span><span className="font-medium">{c?.postalCode || ''}</span></div>
            </div>
          </div>
          
          <div>
            <h3 className="text-gray-900 font-semibold mb-3 border-b pb-1">Visa Route & Center</h3>
            <div className="grid grid-cols-2 gap-y-3">
              <div><span className="text-gray-500 block text-xs">Application Center</span><span className="font-medium">{client.applicationCenter || 'N/A'}</span></div>
              <div><span className="text-gray-500 block text-xs">Category</span><span className="font-medium">{client.category || 'N/A'}</span></div>
              <div><span className="text-gray-500 block text-xs">Sub-Category</span><span className="font-medium">{client.subCategory || 'N/A'}</span></div>
              <div><span className="text-gray-500 block text-xs">Status</span>
                <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded ${client.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {client.status}
                </span>
              </div>
            </div>
          </div>
          
          {client.notes && (
            <div>
              <h3 className="text-gray-900 font-semibold mb-3 border-b pb-1">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">{client.notes}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium">Close</button>
        </div>
      </div>
    </div>
  );
}
