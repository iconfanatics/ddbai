import { useState } from 'react';

export function ReviewImagesModal({ client, onClose }: { client: any, onClose: () => void }) {
  const [uploading, setUploading] = useState(false);

  const handleUploadMock = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      alert('Image upload simulated (MinIO integration pending).');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review Client Images</h2>
            <p className="text-sm text-gray-500 mt-1">
              Applicant: {client.customer?.user?.firstName} {client.customer?.user?.lastName} ({client.customer?.passportNumber})
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Passport Front */}
            <div className="border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 h-48 relative group">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"/></svg>
              </div>
              <span className="text-sm font-medium text-gray-600">Passport Front</span>
              <span className="text-xs text-gray-400 mt-1">No file uploaded</span>
              <button onClick={handleUploadMock} disabled={uploading} className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <span className="bg-white text-gray-800 px-3 py-1.5 rounded text-sm font-semibold shadow">Upload</span>
              </button>
            </div>

            {/* Passport Back */}
            <div className="border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 h-48 relative group">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              </div>
              <span className="text-sm font-medium text-gray-600">Passport Back</span>
              <span className="text-xs text-gray-400 mt-1">No file uploaded</span>
              <button onClick={handleUploadMock} disabled={uploading} className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <span className="bg-white text-gray-800 px-3 py-1.5 rounded text-sm font-semibold shadow">Upload</span>
              </button>
            </div>

            {/* Applicant Photo */}
            <div className="border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 h-48 relative group">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
              <span className="text-sm font-medium text-gray-600">Applicant Photo</span>
              <span className="text-xs text-gray-400 mt-1">No file uploaded</span>
              <button onClick={handleUploadMock} disabled={uploading} className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <span className="bg-white text-gray-800 px-3 py-1.5 rounded text-sm font-semibold shadow">Upload</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium">Close</button>
        </div>
      </div>
    </div>
  );
}
