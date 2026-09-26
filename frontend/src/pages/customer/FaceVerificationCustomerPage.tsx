import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as faceapi from 'face-api.js';

export default function FaceVerificationCustomerPage() {
  const { token } = useParams<{ token: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [passportImage, setPassportImage] = useState<string | null>(null);
  
  const [status, setStatus] = useState<'loading_models' | 'idle' | 'camera_active' | 'verifying' | 'success' | 'error'>('loading_models');
  const [errorMessage, setErrorMessage] = useState('');
  const [matchResult, setMatchResult] = useState<{score: number, isMatch: boolean} | null>(null);

  // Load models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setStatus('idle');
      } catch (err) {
        console.error('Failed to load AI models', err);
        setStatus('error');
        setErrorMessage('Failed to load AI models. Make sure models are in /public/models');
      }
    };
    loadModels();
  }, []);

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

  const handlePassportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setPassportImage(url);
    }
  };

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
    setMatchResult(null);
    startCamera();
  };

  const submitVerification = async () => {
    if (!capturedImage || !passportImage) {
      alert("Please ensure both passport and live photo are captured.");
      return;
    }
    
    setStatus('verifying');
    setMatchResult(null);
    
    try {
      // Create HTMLImageElements
      const liveImg = new Image();
      liveImg.src = capturedImage;
      const passImg = new Image();
      passImg.src = passportImage;
      
      await Promise.all([
        new Promise(res => { liveImg.onload = res; }),
        new Promise(res => { passImg.onload = res; })
      ]);

      // Detect faces
      const liveDetection = await faceapi.detectSingleFace(liveImg).withFaceLandmarks().withFaceDescriptor();
      const passDetection = await faceapi.detectSingleFace(passImg).withFaceLandmarks().withFaceDescriptor();

      if (!liveDetection) {
        setStatus('error');
        setErrorMessage('Could not detect a face in your live photo. Please try again with better lighting.');
        return;
      }
      if (!passDetection) {
        setStatus('error');
        setErrorMessage('Could not detect a face in the passport photo. Please upload a clear passport image.');
        return;
      }

      // Compare
      const distance = faceapi.euclideanDistance(liveDetection.descriptor, passDetection.descriptor);
      const isMatch = distance < 0.6; // 0.6 is typical threshold
      const score = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));

      setMatchResult({ score, isMatch });

      // Send to backend
      const res = await fetch('/api/applications/webhook/face-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          status: isMatch ? 'VERIFIED' : 'FAILED', 
          matchScore: score, 
          notes: `Distance: ${distance.toFixed(2)}` 
        })
      });

      if (res.ok) {
        setStatus('success');
      } else {
        const errData = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(errData.message || 'Verification recorded, but failed on server.');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage('Error during face comparison.');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${matchResult?.isMatch ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {matchResult?.isMatch ? (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
            ) : (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {matchResult?.isMatch ? 'Verification Complete!' : 'Verification Failed'}
          </h1>
          <p className="text-gray-600 mb-2">
            Match Score: <span className="font-bold">{matchResult?.score}%</span>
          </p>
          <p className="text-gray-500 mb-8 text-sm">
            {matchResult?.isMatch 
              ? 'Your identity has been successfully verified.' 
              : 'The face did not match the passport strongly enough. The agent has been notified.'}
          </p>
          <button onClick={() => window.close()} className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300">Close Window</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      {status === 'loading_models' && (
        <div className="text-white text-center">
           <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
           <p>Loading AI Models (In-house Face Matching)...</p>
        </div>
      )}

      {status !== 'loading_models' && (
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-blue-600 p-4 text-center text-white">
          <h2 className="font-bold text-lg">Biometric Verification</h2>
          <p className="text-xs opacity-80 mt-1">Free In-House Demo Mode</p>
        </div>
        
        {/* Passport Upload Area for testing since backend doesn't serve it yet */}
        <div className="p-4 bg-gray-100 border-b border-gray-200">
          <p className="text-xs font-bold text-gray-600 mb-2 uppercase">1. Upload Passport Photo (For Demo)</p>
          {passportImage ? (
             <div className="relative w-full h-24 bg-black rounded overflow-hidden">
               <img src={passportImage} className="w-full h-full object-contain" />
               <button onClick={() => setPassportImage(null)} className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded">Remove</button>
             </div>
          ) : (
            <input type="file" accept="image/*" onChange={handlePassportUpload} className="w-full text-sm" />
          )}
        </div>

        <div className="p-4 bg-white border-b border-gray-200">
           <p className="text-xs font-bold text-gray-600 uppercase mb-2">2. Take Live Selfie</p>
           {status === 'idle' && !capturedImage && (
             <button onClick={startCamera} className="w-full bg-blue-100 text-blue-700 font-bold py-2 rounded">Start Camera</button>
           )}
        </div>

        {status !== 'idle' && (
        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
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

          {!capturedImage && status !== 'error' && (
            <div className="absolute inset-0 pointer-events-none flex justify-center items-center">
              <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-[100px] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
            </div>
          )}

          {status === 'verifying' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-10">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold">Analyzing Biometrics...</p>
              <p className="text-xs text-gray-400 mt-2">Extracting 128-point face descriptor...</p>
            </div>
          )}
        </div>
        )}

        {status === 'camera_active' || capturedImage ? (
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
                Retake Selfie
              </button>
              <button 
                onClick={submitVerification}
                disabled={status === 'verifying' || !passportImage}
                className={`flex-1 text-white font-bold py-3 rounded-lg flex items-center justify-center ${!passportImage ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {status === 'verifying' ? 'Processing...' : 'Verify'}
              </button>
            </div>
          )}
        </div>
        ) : null}
      </div>
      )}
      
      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
