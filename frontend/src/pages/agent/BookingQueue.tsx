import { useState } from 'react';

const DUMMY_BOOKINGS = [
  { id: 'REQ-9938', customer: 'John Doe', targetCountry: 'Portugal', reference: 'REF-9938', status: 'BOOKED', action: 'SUCCESS', hasPdf: true },
  { id: 'REQ-9939', customer: 'Jane Smith', targetCountry: 'Portugal', reference: 'REF-9939', status: 'BOOKED', action: 'SUCCESS', hasPdf: true },
  { id: 'REQ-9940', customer: 'Michael Brown', targetCountry: 'Portugal', reference: 'REF-9940', status: 'BOOKED', action: 'SUCCESS', hasPdf: true },
];

const ITEMS_PER_PAGE = 10;

export default function BookingQueue() {
  const [bookings] = useState(DUMMY_BOOKINGS);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(bookings.length / ITEMS_PER_PAGE);
  const paginated = bookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const bookedCount = bookings.filter(b => b.status === 'BOOKED').length;
  const successCount = bookings.filter(b => b.action === 'SUCCESS').length;
  const pdfCount = bookings.filter(b => b.hasPdf).length;

  return (
    <div className="p-6 bg-white min-h-screen text-gray-800 text-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Request Queue</h1>
          <p className="text-gray-500">Monitor and manage confirmed visa booking requests</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded shadow-sm hover:bg-gray-50">
            Refresh
          </button>
          <button className="px-4 py-2 bg-gray-900 text-white font-semibold rounded shadow-sm hover:bg-gray-800">
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Booked Requests</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{bookedCount}</span>
            <span className="text-xs font-semibold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">Confirmed</span>
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Successful</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{successCount}</span>
            <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Completed</span>
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">PDF Ready</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{pdfCount}</span>
            <span className="text-xs font-semibold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">Documents</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Confirmed Booking Requests</h2>
          <p className="text-xs text-gray-400">Only booked applications are shown in this queue.</p>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Target Country</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">No confirmed bookings found.</td>
              </tr>
            ) : paginated.map(b => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 font-medium text-gray-800">{b.customer}</td>
                <td className="px-4 py-4 text-gray-600">{b.targetCountry}</td>
                <td className="px-4 py-4 text-gray-600 font-mono text-xs">{b.reference}</td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-800">
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">
                    {b.action}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {b.hasPdf && (
                    <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors">
                      View PDF
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, bookings.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, bookings.length)} of {bookings.length} confirmed requests
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded text-xs font-semibold transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
