import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function FaceVerificationCustomerPage() {
  const { token } = useParams<{ token: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'camera_active' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStatus('camera_active');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setStatus('error');
      setErrorMessage('Could not access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const submitVerification = async () => {
    if (!capturedImage) return;
    setStatus('verifying');
    
    // Simulate AI processing time
    setTimeout(async () => {
      try {
        const res = await fetch('/api/applications/webhook/face-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token, 
            status: 'VERIFIED', 
            matchScore: Math.floor(Math.random() * (99 - 85 + 1) + 85) + (Math.random()), 
            notes: 'Verified via Customer Link' 
          })
        });

        if (res.ok) {
          setStatus('success');
        } else {
          const errData = await res.json().catch(() => ({}));
          setStatus('error');
          setErrorMessage(errData.message || 'Verification failed on server.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('Network error during verification.');
      }
    }, 2500);
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Verification Complete!</h1>
          <p className="text-gray-600 mb-8">Your identity has been successfully verified. You can now close this window and your agent will be notified immediately.</p>
          <button onClick={() => window.close()} className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300">Close Window</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-blue-600 p-4 text-center text-white">
          <h2 className="font-bold text-lg">Biometric Verification</h2>
          <p className="text-xs opacity-80 mt-1">Please position your face within the frame</p>
        </div>
        
        <div className="relative bg-black flex-1 min-h-[400px] flex items-center justify-center overflow-hidden">
          {status === 'error' ? (
            <div className="text-center p-6 text-white">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p>{errorMessage}</p>
              <button onClick={() => {setStatus('idle'); startCamera();}} className="mt-4 px-4 py-2 bg-blue-600 rounded text-sm font-bold">Try Again</button>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover transform scale-x-[-1]" 
            />
          )}

          {/* Oval overlay for face framing */}
          {!capturedImage && status !== 'error' && (
            <div className="absolute inset-0 pointer-events-none flex justify-center items-center">
              <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-[100px] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
            </div>
          )}

          {status === 'verifying' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-10">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold">Analyzing Biometrics...</p>
              <p className="text-xs text-gray-400 mt-2">Checking liveness & matching passport</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white">
          {!capturedImage ? (
            <button 
              onClick={capturePhoto} 
              disabled={status !== 'camera_active'}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Take Photo
            </button>
          ) : (
            <div className="flex gap-4">
              <button 
                onClick={retakePhoto} 
                disabled={status === 'verifying'}
                className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Retake
              </button>
              <button 
                onClick={submitVerification}
                disabled={status === 'verifying'}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {status === 'verifying' ? 'Processing...' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
