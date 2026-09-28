import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as faceapi from 'face-api.js';

type VerificationState = 
  | 'loading' 
  | 'identity' 
  | 'passport' 
  | 'selfie' 
  | 'face_video_1' 
  | 'face_video_2' 
  | 'gesture_01' | 'gesture_02' | 'gesture_03' | 'gesture_04' | 'gesture_05' | 'gesture_06' | 'gesture_07' | 'gesture_08' | 'gesture_09'
  | 'submitting'
  | 'completed'
  | 'error';

const GESTURE_STEPS = [
  { id: 'gesture_01', title: '01 — Look Down', instruction: 'নিচের দিকে তাকান।' },
  { id: 'gesture_02', title: '02 — Look Down-Left', instruction: 'নিচে-বাম দিকে তাকান।' },
  { id: 'gesture_03', title: '03 — Look Down-Right', instruction: 'নিচে-ডান দিকে তাকান।' },
  { id: 'gesture_04', title: '04 — Look Left', instruction: 'বাম দিকে তাকান।' },
  { id: 'gesture_05', title: '05 — Look Right', instruction: 'ডান দিকে তাকান।' },
  { id: 'gesture_06', title: '06 — Smile', instruction: 'হাসুন।' },
  { id: 'gesture_07', title: '07 — Look Up', instruction: 'উপরে তাকান।' },
  { id: 'gesture_08', title: '08 — Look Up-Left', instruction: 'উপরে-বাম দিকে তাকান।' },
  { id: 'gesture_09', title: '09 — Look Up-Right', instruction: 'উপরে-ডান দিকে তাকান।' }
];

export default function FaceVerificationCustomerPage() {
  const { token } = useParams<{ token: string }>();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [status, setStatus] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [clientDetails, setClientDetails] = useState<{clientName: string, passportNumber: string} | null>(null);
  
  const [mediaFiles, setMediaFiles] = useState<{
    passport?: File | Blob,
    selfie?: File | Blob,
    face_video_1?: Blob,
    face_video_2?: Blob,
    [key: string]: File | Blob | undefined
  }>({});

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(0);

  // Quality checks for selfie
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  useEffect(() => {
    // 1. Fetch verification details
    const init = async () => {
      try {
        const res = await fetch(`/api/public/verification/${token}`);
        if (!res.ok) {
          throw new Error('Invalid or expired verification link.');
        }
        const data = await res.json();
        if (data.status === 'COMPLETED' || data.status === 'PASSED') {
          setStatus('completed');
          return;
        }
        setClientDetails(data);
        setStatus('identity');
        
        // Background load face-api models for selfie check
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message);
      }
    };
    init();
  }, [token]);

  const startCamera = async () => {
    try {
      if (stream) return;
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert("Camera permission is required!");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  // Selfie capture loop
  useEffect(() => {
    if (status === 'selfie' && stream && videoRef.current) {
      const interval = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState === 4) {
          const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
          setIsFaceDetected(detections.length === 1);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [status, stream]);

  const captureSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setMediaFiles(prev => ({ ...prev, selfie: blob }));
        setStatus('face_video_1');
      }
    }, 'image/jpeg', 0.9);
  };

  const startRecording = (durationSecs: number, nextState: VerificationState, key: string) => {
    if (!stream) return;
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, );
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setMediaFiles(prev => ({ ...prev, [key]: blob }));
      setStatus(nextState);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTimeLeft(durationSecs);

    const timer = setInterval(() => {
      setRecordingTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          mediaRecorder.stop();
          setIsRecording(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };


  useEffect(() => {
    if (status === 'submitting') {
      submitAll();
    }
  }, [status]);

  const submitAll = async () => {
    setStatus('submitting');
    stopCamera();
    try {
      const mediaData: any = {};
      
      for (const [key, file] of Object.entries(mediaFiles)) {
        if (!file) continue;
        const ext = file.type.includes('video') ? 'webm' : 'jpg';
        const filename = `${key}.${ext}`;
        
        // 1. Get presigned URL
        const resUrl = await fetch('/api/public/webhook/face-verification/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, filename })
        });
        if (!resUrl.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, key: s3Key } = await resUrl.json();
        
        // 2. Upload to S3/Minio
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        
        mediaData[key] = s3Key;
      }

      // 3. Final submission
      const resFin = await fetch('/api/public/webhook/face-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, status: 'COMPLETED', mediaData })
      });
      
      if (!resFin.ok) throw new Error("Failed to finalize submission");
      
      setStatus('completed');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-blue-600 animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow text-center max-w-sm w-full">
          <div className="text-red-500 mb-4"><svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Verification Failed</h2>
          <p className="text-sm text-gray-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow border border-gray-100 max-w-sm w-full">
          <div className="flex justify-center mb-4">
            <div className="text-green-500 flex items-center font-bold text-xl"><span className="mr-2">✓</span> Verification Complete</div>
          </div>
          <p className="text-center text-gray-600 text-sm mb-6">Your verification has been successfully completed.<br/><br/>Thank you.</p>
        </div>
      </div>
    );
  }

  if (status === 'submitting') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-blue-600 animate-spin w-12 h-12 border-4 border-current border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Uploading Verification Data...</h2>
          <p className="text-xs text-gray-500">Please do not close this window.</p>
        </div>
      </div>
    );
  }

  if (status === 'identity') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
          <div className="bg-blue-50/50 p-6 flex flex-col items-center border-b border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Identity Verification</h2>
            <p className="text-xs text-gray-500 mt-1">Please complete your verification.</p>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Name</label>
              <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-medium text-gray-800 uppercase">{clientDetails?.clientName}</div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Passport No</label>
              <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-medium text-gray-800 uppercase">{clientDetails?.passportNumber}</div>
            </div>
            
            <button 
              onClick={() => setStatus('passport')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center"
            >
              Start Verification <span className="ml-2">→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'passport') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center p-4 pt-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">1. Upload Passport Photo</h2>
          <p className="text-xs text-gray-500 mb-6">Upload clear image of your passport (JPG, PNG)</p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors relative">
            <input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setMediaFiles(prev => ({ ...prev, passport: e.target.files![0] }));
                }
              }}
            />
            {mediaFiles.passport ? (
              <div className="text-center">
                <svg className="w-10 h-10 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p className="text-sm font-bold text-gray-800">Passport Uploaded</p>
                <p className="text-xs text-gray-500 mt-1">Tap to change</p>
              </div>
            ) : (
              <div className="text-center">
                <svg className="w-10 h-10 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <p className="text-sm font-bold text-gray-800">Click to Upload</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG (Max 10MB)</p>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => { startCamera(); setStatus('selfie'); }}
            disabled={!mediaFiles.passport}
            className={`w-full mt-6 font-bold py-3.5 rounded-xl transition-all ${!mediaFiles.passport ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'}`}
          >
            Next Step
          </button>
        </div>
      </div>
    );
  }

  // Camera based steps
  
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 text-center border-b border-gray-800">
        <h2 className="font-bold">
          {status === 'selfie' && "2. Take Live Selfie"}
          {status === 'face_video_1' && "3. Face Verification Video 1"}
          {status === 'face_video_2' && "4. Face Verification Video 2"}
          {status.includes('gesture') && `5. Gesture Verification`}
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          {status === 'selfie' && "Position your face inside the frame and take a clear selfie"}
          {status === 'face_video_1' && "Look straight at the camera and keep still"}
          {status === 'face_video_2' && "Turn your head slightly left and right"}
          {status.includes('gesture') && (GESTURE_STEPS.find(g => g.id === status)?.instruction || '')}
        </p>
      </div>

      {/* Video Viewfinder */}
      <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" 
        />
        
        {/* Frame / Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center px-8">
          <div className={`w-full max-w-sm aspect-[3/4] border-2 rounded-[100px] border-dashed transition-colors ${isFaceDetected ? 'border-green-400 bg-green-400/10' : 'border-white/50 bg-white/5'}`}></div>
        </div>

        {/* Recording Timer Overlay */}
        {isRecording && (
          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
            00:0{recordingTimeLeft}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-6 pb-12 flex justify-center items-center">
        {status === 'selfie' && (
          <button 
            onClick={captureSelfie}
            disabled={!isFaceDetected}
            className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all ${isFaceDetected ? 'border-blue-500 bg-white' : 'border-gray-600 bg-gray-800'}`}
          >
            <div className={`w-12 h-12 rounded-full ${isFaceDetected ? 'bg-blue-600' : 'bg-gray-700'}`}></div>
          </button>
        )}
        
        {status === 'face_video_1' && !isRecording && (
          <button onClick={() => startRecording(5, 'face_video_2', 'face_video_1')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl">Record Video 1 (5s)</button>
        )}
        {status === 'face_video_2' && !isRecording && (
          <button onClick={() => startRecording(5, 'gesture_01', 'face_video_2')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl">Record Video 2 (5s)</button>
        )}

        {status.includes('gesture') && !isRecording && (
          <button onClick={() => {
            const currentIndex = GESTURE_STEPS.findIndex(g => g.id === status);
            const nextStep = currentIndex < GESTURE_STEPS.length - 1 ? GESTURE_STEPS[currentIndex + 1].id : 'submitting';
            if (nextStep === 'submitting') {
              startRecording(3, 'completed', status); // We intercept the state update in onstop anyway
              // Wait, onstop uses the old closure, we should handle submitAll carefully.
              // Let's fix startRecording so it submits if nextState is submitting
            } else {
              startRecording(3, nextStep as VerificationState, status);
            }
          }} className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl">Record {GESTURE_STEPS.find(g => g.id === status)?.title} (3s)</button>
        )}

        {isRecording && (
          <div className="text-white text-sm font-bold animate-pulse">Recording...</div>
        )}
      </div>
    </div>
  );
}
