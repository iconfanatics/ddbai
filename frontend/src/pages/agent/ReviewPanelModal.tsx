
export default function ReviewPanelModal({ app, onClose, onBackToClientBoard }: { app: any, onClose: () => void, onBackToClientBoard?: (id: string) => void }) {
  if (!app) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Review Application</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Client Information */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Client Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Customer Name</span> <span className="font-semibold">{app.customer?.user?.firstName} {app.customer?.user?.lastName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Passport Number</span> <span className="font-semibold">{app.customer?.passportNumber || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date of Birth</span> <span className="font-semibold">{app.customer?.dateOfBirth ? new Date(app.customer.dateOfBirth).toLocaleDateString() : 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Nationality</span> <span className="font-semibold">{app.customer?.nationality || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone Number</span> <span className="font-semibold">{app.customer?.contactNumber || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email</span> <span className="font-semibold">{app.customer?.user?.email || 'N/A'}</span></div>
            </div>
          </section>

          {/* Visa Route Details */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Visa Route Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">From Country</span> <span className="font-semibold">{app.fromCountry}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">To Country</span> <span className="font-semibold">{app.targetCountry}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Visa Center</span> <span className="font-semibold">{app.applicationCenter}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Category</span> <span className="font-semibold">{app.category}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Sub Category</span> <span className="font-semibold">{app.subCategory || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Preferred Date</span> <span className="font-semibold">N/A</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Reference Number</span> <span className="font-semibold">{app.id.split('-')[0]}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Transaction ID</span> <span className="font-semibold">N/A</span></div>
            </div>
          </section>

          {/* Documents */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Documents</h3>
            <div className="space-y-2">
              <div className="p-3 border rounded flex justify-between items-center hover:bg-gray-50 cursor-pointer">
                <span className="text-sm font-medium text-blue-600">Passport Copy</span>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Available</span>
              </div>
              <div className="p-3 border rounded flex justify-between items-center hover:bg-gray-50 cursor-pointer">
                <span className="text-sm font-medium text-blue-600">Photo</span>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Available</span>
              </div>
              <div className="p-3 border rounded flex justify-between items-center hover:bg-gray-50 cursor-pointer">
                <span className="text-sm font-medium text-blue-600">Application Form</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Pending</span>
              </div>
              <div className="p-3 border rounded flex justify-between items-center hover:bg-gray-50 cursor-pointer">
                <span className="text-sm font-medium text-blue-600">Supporting Documents</span>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Available</span>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={() => {
              if (onBackToClientBoard) onBackToClientBoard(app.id);
              else onClose();
            }} 
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Back to Client Board
          </button>
        </div>
      </div>
    </div>
  );
}
