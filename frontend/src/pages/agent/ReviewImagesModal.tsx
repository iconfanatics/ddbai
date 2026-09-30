import { useState, useEffect } from 'react';

const MEDIA_LABELS: Record<string, string> = {
  passport: 'Passport',
  selfie: 'Selfie',
  face_video_1: 'Face Video 1',
  face_video_2: 'Face Video 2',
  gesture_01: 'Look Down',
  gesture_02: 'Look Down-Left',
  gesture_03: 'Look Down-Right',
  gesture_04: 'Look Left',
  gesture_05: 'Look Right',
  gesture_06: 'Smile',
  gesture_07: 'Look Up',
  gesture_08: 'Look Up-Left',
  gesture_09: 'Look Up-Right',
};

function MediaItem({ mediaKey, s3Key, token }: { mediaKey: string, s3Key: string, token: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isVideo = mediaKey.includes('video');
  const label = MEDIA_LABELS[mediaKey] || mediaKey;

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    fetch('/api/applications/verification-media-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ key: s3Key }),
    })
      .then(r => r.json())
      .then(d => { setUrl(d.downloadUrl); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [s3Key]);

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
      <div className="relative w-full bg-black" style={{ aspectRatio: isVideo ? '4/3' : '3/4' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs text-center px-2">
            Failed to load
          </div>
        )}
        {url && !error && (
          isVideo ? (
            <video
              src={url}
              controls
              className="w-full h-full object-cover"
              playsInline
            />
          ) : (
            <img
              src={url}
              alt={label}
              className="w-full h-full object-cover"
              onError={() => setError(true)}
            />
          )
        )}
      </div>
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        {url && (
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Download
          </a>
        )}
      </div>
    </div>
  );
}

export function ReviewImagesModal({ client, onClose }: { client: any, onClose: () => void }) {
  const vSession = client.verificationSessions?.[0];
  const mediaData: Record<string, string> = vSession?.mediaData || {};
  const hasMedia = Object.keys(mediaData).length > 0;

  // Order: passport, selfie, face_video_1, face_video_2, then gestures
  const orderedKeys = [
    'passport', 'selfie', 'face_video_1', 'face_video_2',
    'gesture_01', 'gesture_02', 'gesture_03', 'gesture_04', 'gesture_05',
    'gesture_06', 'gesture_07', 'gesture_08', 'gesture_09',
  ].filter(k => mediaData[k]);

  // Also include any keys not in the ordered list
  const extraKeys = Object.keys(mediaData).filter(k => !orderedKeys.includes(k));
  const allKeys = [...orderedKeys, ...extraKeys];

  const name = `${client.customer?.user?.firstName || ''} ${client.customer?.user?.lastName || ''}`.trim();
  const passport = client.customer?.passportNumber || 'N/A';
  const status = vSession?.status || 'N/A';

  const statusColor: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    PASSED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    FAILED: 'bg-red-100 text-red-700',
    MANUAL_REVIEW: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Verification Media</h2>
            <p className="text-sm text-gray-500 mt-0.5">{name} · Passport: {passport}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor[status] || 'bg-gray-100 text-gray-600'}`}>
                {status}
              </span>
              <span className="text-xs text-gray-400">{allKeys.length} file{allKeys.length !== 1 ? 's' : ''} recorded</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasMedia ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
              <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"/>
              </svg>
              <p className="font-semibold">No media available</p>
              <p className="text-sm mt-1">
                {vSession ? 'Verification was not completed or no files were recorded.' : 'No verification session found for this client.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {allKeys.map(key => (
                <MediaItem
                  key={key}
                  mediaKey={key}
                  s3Key={mediaData[key]}
                  token={client.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 text-sm font-semibold">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
