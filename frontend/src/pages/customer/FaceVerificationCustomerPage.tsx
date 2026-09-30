import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { TRANSLATIONS, detectHeadPose, checkGesture, analyzeSelfieConditions } from './verificationUtils';

type Language = 'en' | 'ar' | 'pt';
type VerificationState = 
  | 'loading' | 'identity' | 'passport_upload' 
  | 'selfie' | 'selfie_review'
  | 'face_video_1' | 'face_video_2' 
  | 'gesture' 
  | 'summary' | 'submitting' | 'completed' | 'error';

const GESTURES = [
  'Look Down', 'Look Down-Left', 'Look Down-Right', 
  'Look Left', 'Look Right', 'Smile', 
  'Look Up', 'Look Up-Left', 'Look Up-Right'
];

export default function FaceVerificationCustomerPage() {
  const { token } = useParams<{ token: string }>();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const statusRef = useRef<VerificationState>('loading');
  
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];

  const [status, setStatus] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [clientDetails, setClientDetails] = useState<{clientName: string, passportNumber: string} | null>(null);
  
  const [mediaFiles, setMediaFiles] = useState<{
    passport?: File | Blob,
    selfie?: Blob,
    face_video_1?: Blob,
    face_video_2?: Blob,
    [key: string]: File | Blob | undefined
  }>({});

  const [isFaceGood, setIsFaceGood] = useState(false);
  const [guidanceMsg, setGuidanceMsg] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const [currentGestureIndex, setCurrentGestureIndex] = useState(0);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState('');
  const [gestureProgress, setGestureProgress] = useState(0);

  // Keep statusRef in sync
  const setStatusSafe = useCallback((s: VerificationState) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // Load Models on Mount
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`/api/public/verification/${token}`);
        if (!res.ok) throw new Error('Invalid or expired verification link.');
        const data = await res.json();
        if (data.status === 'COMPLETED' || data.status === 'PASSED') {
          setStatusSafe('completed');
          return;
        }
        setClientDetails(data);
        setStatusSafe('identity');
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        ]);
      } catch (err: any) {
        setStatusSafe('error');
        setErrorMessage(err.message);
      }
    };
    init();
  }, [token]);

  const startCamera = async () => {
    try {
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 720 } }, 
          audio: false 
        });
        streamRef.current = stream;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      alert("Camera permission is required!");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // Re-attach video stream whenever we navigate back to a camera screen
  useEffect(() => {
    if (['selfie', 'face_video_1', 'face_video_2', 'gesture'].includes(status)) {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [status]);

  // Face Detection Loop
  useEffect(() => {
    let active = true;
    const loop = async () => {
      if (!active) return;
      
      const currentStatus = statusRef.current;
      
      if (videoRef.current && videoRef.current.readyState >= 2) {
        if ((currentStatus === 'selfie' || currentStatus === 'face_video_1' || currentStatus === 'face_video_2') && !isRecording) {
          try {
            const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }));
            const analysis = analyzeSelfieConditions(videoRef.current, detection);
            setIsFaceGood(analysis.isGood);
            setGuidanceMsg(analysis.message);
          } catch (e) {
            setIsFaceGood(false);
            setGuidanceMsg('Detecting face...');
          }
        }
        
        if (currentStatus === 'gesture' && !isRecording) {
          try {
            const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })).withFaceLandmarks();
            if (detection) {
              const pose = detectHeadPose(detection.landmarks);
              const expectedGesture = GESTURES[currentGestureIndex];
              const isCorrect = checkGesture(expectedGesture, pose);
              setGestureProgress(prev => {
                const next = isCorrect ? Math.min(prev + 8, 100) : Math.max(prev - 15, 0);
                return next;
              });
            } else {
              setGestureProgress(prev => Math.max(prev - 15, 0));
            }
          } catch (e) {
            // ignore
          }
        }
      }
      
      setTimeout(loop, 150);
    };
    
    if (['selfie', 'face_video_1', 'face_video_2', 'gesture'].includes(status)) {
      loop();
    }
    
    return () => { active = false; };
  }, [status, isRecording, currentGestureIndex]);

  // Gesture completion check
  useEffect(() => {
    if (gestureProgress >= 100 && status === 'gesture') {
      handleGestureComplete();
    }
  }, [gestureProgress]);

  const handleGestureComplete = useCallback(() => {
    if (!videoRef.current) return;
    setGestureProgress(0);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        setMediaFiles(prev => ({ ...prev, [`gesture_0${currentGestureIndex + 1}`]: blob }));
        setCurrentGestureIndex(prev => {
          const next = prev + 1;
          if (next >= GESTURES.length) {
            setTimeout(() => setStatusSafe('summary'), 300);
          }
          return next >= GESTURES.length ? prev : next;
        });
      }
    }, 'image/jpeg', 0.9);
  }, [currentGestureIndex]);

  const captureSelfie = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelfiePreviewUrl(dataUrl);
    canvas.toBlob(blob => {
      if (blob) setMediaFiles(prev => ({ ...prev, selfie: blob }));
    }, 'image/jpeg', 0.9);
    setStatusSafe('selfie_review');
  }, []);

  const recordVideo = useCallback((key: string, nextStatus: VerificationState) => {
    if (!streamRef.current || isRecording) return;
    chunksRef.current = [];
    
    const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4', ''];
    const supportedMime = mimeTypes.find(mime => {
      try { return mime === '' || MediaRecorder.isTypeSupported(mime); } catch { return false; }
    }) ?? '';
    
    try {
      const options = supportedMime ? { mimeType: supportedMime } : {};
      const mr = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mr;
      
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: supportedMime || 'video/webm' });
        setMediaFiles(prev => ({ ...prev, [key]: blob }));
        setIsRecording(false);
        setCountdown(0);
        setStatusSafe(nextStatus);
      };

      mr.start(500);
      setIsRecording(true);
      
      // Countdown timer
      let secs = 5;
      setCountdown(secs);
      const interval = setInterval(() => {
        secs--;
        setCountdown(secs);
        if (secs <= 0) clearInterval(interval);
      }, 1000);
      
      setTimeout(() => {
        clearInterval(interval);
        try {
          if (mr.state !== 'inactive') {
            mr.requestData();
            mr.stop();
          } else {
            // MediaRecorder never started properly - use snapshot fallback
            setIsRecording(false);
            setCountdown(0);
            captureSnapshotFallback(key, nextStatus);
          }
        } catch (err) {
          setIsRecording(false);
          setCountdown(0);
          captureSnapshotFallback(key, nextStatus);
        }
      }, 5000);
      
    } catch (e) {
      captureSnapshotFallback(key, nextStatus);
    }
  }, [isRecording]);

  const captureSnapshotFallback = (key: string, nextStatus: VerificationState) => {
    if (!videoRef.current) { setStatusSafe(nextStatus); return; }
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      if (blob) setMediaFiles(prev => ({ ...prev, [key]: blob }));
      setIsRecording(false);
      setCountdown(0);
      setStatusSafe(nextStatus);
    }, 'image/jpeg', 0.9);
  };

  const submitAll = async () => {
    stopCamera();
    try {
      const mediaData: any = {};
      for (const [key, file] of Object.entries(mediaFiles)) {
        if (!file) continue;
        const isVideo = file.type.includes('video') || file.type.includes('webm') || file.type.includes('mp4');
        const ext = isVideo ? 'webm' : 'jpg';
        const filename = `${key}.${ext}`;
        
        const resUrl = await fetch('/api/public/webhook/face-verification/upload-url', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, filename })
        });
        if (!resUrl.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, key: s3Key } = await resUrl.json();
        const finalUrl = uploadUrl.replace('http://minio:9000', window.location.origin + '/minio-api');
        
        await fetch(finalUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'video/webm' } });
        mediaData[key] = s3Key;
      }

      const resFin = await fetch('/api/public/webhook/face-verification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, status: 'COMPLETED', mediaData })
      });
      if (!resFin.ok) throw new Error("Failed to finalize submission");
      setStatusSafe('completed');
    } catch (err: any) {
      setStatusSafe('error');
      setErrorMessage(err.message);
    }
  };

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow text-center max-w-sm w-full">
          <div className="text-red-500 mb-4"><svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">{t.verificationFailed}</h2>
          <p className="text-sm text-gray-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (status === 'loading') return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="text-blue-600 animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full"></div></div>;

  if (status === 'identity') {
    return (
      <div className="min-h-screen bg-[#0E1B31] flex flex-col items-center justify-center p-4 font-sans text-gray-800" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative pb-6">
          <div className="p-6 flex flex-col items-center text-center mt-4">
            <img src="/logo.png" alt="Visaora World" className="h-16 mb-4" onError={(e)=>e.currentTarget.style.display='none'}/>
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-[#0E1B31]">{t.identityVerification}</h2>
            <p className="text-sm text-gray-500 mt-2 mb-6">{t.pleaseComplete}</p>

            <div className="flex space-x-2 rtl:space-x-reverse bg-gray-100 rounded-full p-1 w-full mb-6 text-sm font-medium">
              <button onClick={()=>setLang('en')} className={`flex-1 py-2 rounded-full flex items-center justify-center transition ${lang==='en'?'bg-blue-600 text-white shadow':'text-gray-600 hover:bg-gray-200'}`}><span className="mr-1">🇬🇧</span> English</button>
              <button onClick={()=>setLang('pt')} className={`flex-1 py-2 rounded-full flex items-center justify-center transition ${lang==='pt'?'bg-blue-600 text-white shadow':'text-gray-600 hover:bg-gray-200'}`}><span className="mr-1">🇵🇹</span> Português</button>
              <button onClick={()=>setLang('ar')} className={`flex-1 py-2 rounded-full flex items-center justify-center transition ${lang==='ar'?'bg-blue-600 text-white shadow':'text-gray-600 hover:bg-gray-200'}`}><span className="mr-1">🇸🇦</span> العربية</button>
            </div>

            <div className="w-full text-left rtl:text-right mb-4">
              <label className="block text-xs font-bold text-gray-400 mb-1">{t.name}</label>
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-semibold text-gray-800">{clientDetails?.clientName}</div>
            </div>
            <div className="w-full text-left rtl:text-right mb-8">
              <label className="block text-xs font-bold text-gray-400 mb-1">{t.passportNo}</label>
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm font-semibold text-gray-800">{clientDetails?.passportNumber}</div>
            </div>

            <button onClick={() => setStatusSafe('passport_upload')} className="w-full bg-[#0052FF] hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg text-lg">
              {t.startVerification}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'passport_upload') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mt-4">
          <h2 className="text-xl font-bold text-[#0E1B31] mb-1">{t.uploadPassport}</h2>
          <p className="text-sm text-gray-500 mb-6">{t.uploadInstruction}</p>
          
          <div className="border-2 border-dashed border-blue-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-colors relative mb-6">
            <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && setMediaFiles(prev => ({ ...prev, passport: e.target.files![0] }))} />
            {mediaFiles.passport ? (
              <div className="text-center">
                <svg className="w-12 h-12 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p className="text-sm font-bold text-gray-800">Passport Selected ✓</p>
              </div>
            ) : (
              <div className="text-center">
                <svg className="w-12 h-12 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <p className="text-base font-bold text-[#0E1B31]">{t.clickToUpload}</p>
                <p className="text-xs text-gray-500 mt-1">{t.formats}</p>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-5 mb-8">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 text-blue-500 mr-2 rtl:ml-2 rtl:mr-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
              <h3 className="text-sm font-bold text-[#0E1B31]">{t.importantInstructions}</h3>
            </div>
            <ul className="space-y-2 text-xs text-gray-600">
              {[t.inst1, t.inst2, t.inst3, t.inst4].map((inst, i) => (
                <li key={i} className="flex items-start"><svg className="w-4 h-4 text-green-500 mr-2 rtl:ml-2 rtl:mr-0 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>{inst}</li>
              ))}
            </ul>
          </div>
          
          <button onClick={() => { startCamera(); setStatusSafe('selfie'); }} disabled={!mediaFiles.passport} className={`w-full font-bold py-4 rounded-2xl transition-all text-lg ${!mediaFiles.passport ? 'bg-gray-200 text-gray-400' : 'bg-[#0052FF] text-white shadow-lg hover:bg-blue-700'}`}>
            {t.nextStep}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'summary') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mt-4">
          <h2 className="text-xl font-bold text-[#0E1B31] mb-6">{t.verificationSummary}</h2>
          <div className="space-y-3 mb-8">
            {['Passport', 'Selfie', 'Video 1', 'Video 2', ...GESTURES].map(item => (
              <div key={item} className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 text-sm">{item}</span>
                <span className="text-green-500 font-bold text-sm flex items-center"><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg> Approved</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setStatusSafe('submitting'); submitAll(); }} className="w-full bg-[#0052FF] hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg text-lg">
            Complete Verification
          </button>
        </div>
      </div>
    );
  }

  if (status === 'submitting') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow text-center max-w-sm w-full">
          <div className="text-blue-600 animate-spin w-12 h-12 border-4 border-current border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Uploading...</h2>
          <p className="text-sm text-gray-500">Please wait while we securely upload your verification data.</p>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-white p-8 rounded-3xl shadow border border-gray-100 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t.verificationComplete}</h2>
          <p className="text-gray-600 text-sm whitespace-pre-line">{t.thankYou}</p>
        </div>
      </div>
    );
  }

  // Camera Steps
  const isVideoStep = status === 'face_video_1' || status === 'face_video_2';
  const canCapture = isFaceGood && !isRecording;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Selfie Review Overlay - keeps camera mounted in background */}
      {status === 'selfie_review' && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col font-sans">
          <div className="flex-1 bg-gray-900 flex items-center justify-center p-4">
            {selfiePreviewUrl ? (
              <img src={selfiePreviewUrl} alt="Selfie" className="w-full max-w-sm rounded-3xl object-cover shadow-2xl" />
            ) : (
              <div className="text-white">Loading preview...</div>
            )}
          </div>
          <div className="bg-white p-6 pb-10 flex space-x-4 rtl:space-x-reverse rounded-t-3xl">
            <button onClick={() => { setIsFaceGood(false); setGuidanceMsg(''); setStatusSafe('selfie'); }} className="flex-1 bg-gray-100 text-gray-800 font-bold py-4 rounded-2xl">{t.retry}</button>
            <button onClick={() => { setIsFaceGood(false); setGuidanceMsg(''); setStatusSafe('face_video_1'); }} className="flex-1 bg-[#0052FF] text-white font-bold py-4 rounded-2xl">Verify & Continue →</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center px-6 pt-6 pb-3 bg-white z-10">
        <img src="/logo.png" alt="Visaora" className="h-10 mx-auto mb-3" onError={(e)=>e.currentTarget.style.display='none'}/>
        <h2 className="text-[#0E1B31] font-extrabold text-xl">
          {status === 'selfie' && t.lookAtCamera}
          {status === 'face_video_1' && `${t.video1} — Look at camera`}
          {status === 'face_video_2' && `${t.video2} — Look at camera`}
          {status === 'gesture' && GESTURES[currentGestureIndex]}
        </h2>
        {status === 'gesture' && (
          <p className="text-xs text-gray-500 mt-1">{currentGestureIndex + 1} of {GESTURES.length}</p>
        )}
      </div>

      {/* Video Viewfinder */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-100 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" />
        
        {/* Face Guide */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center px-6">
          <div className={`w-[220px] h-[290px] border-4 rounded-[110px] transition-all duration-300 ${
            status === 'gesture' 
              ? (gestureProgress > 0 ? 'border-green-400 shadow-lg shadow-green-400/30' : 'border-white/50 border-dashed')
              : (isFaceGood ? 'border-blue-400 shadow-lg shadow-blue-400/30' : 'border-white/50 border-dashed')
          }`}></div>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center shadow-lg animate-pulse">
            <div className="w-2.5 h-2.5 bg-white rounded-full mr-2"></div>
            REC {countdown > 0 ? `${countdown}s` : ''}
          </div>
        )}

        {/* Guidance message */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-3 text-center">
            <p className={`text-sm font-bold ${
              status === 'gesture' 
                ? (gestureProgress > 0 ? 'text-green-400' : 'text-white')
                : (isFaceGood ? 'text-green-400' : 'text-yellow-400')
            }`}>
              {status === 'gesture' 
                ? (gestureProgress > 0 ? `Hold it... ${gestureProgress}%` : `Do: ${GESTURES[currentGestureIndex]}`)
                : (isRecording ? `Recording... ${countdown}s` : (guidanceMsg || 'Detecting face...'))}
            </p>
            
            {/* Progress bar */}
            {status === 'gesture' && (
              <div className="w-full bg-white/20 rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-green-400 h-2 rounded-full transition-all duration-200" style={{ width: `${gestureProgress}%` }}></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="bg-white px-6 pt-5 pb-8">
        {status === 'selfie' && (
          <button 
            onClick={captureSelfie}
            disabled={!canCapture}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex justify-center items-center transition-all ${canCapture ? 'bg-[#0052FF] text-white shadow-lg active:scale-95' : 'bg-gray-100 text-gray-400'}`}
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            {canCapture ? t.captureSelfie : (isFaceGood === false ? 'Position face in frame' : 'Detecting...')}
          </button>
        )}
        
        {isVideoStep && (
          <button 
            onClick={() => {
              const key = status === 'face_video_1' ? 'face_video_1' : 'face_video_2';
              const next = status === 'face_video_1' ? 'face_video_2' : 'gesture';
              recordVideo(key, next as VerificationState);
            }}
            disabled={!canCapture || isRecording}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex justify-center items-center transition-all ${canCapture && !isRecording ? 'bg-[#0052FF] text-white shadow-lg active:scale-95' : 'bg-gray-100 text-gray-400'}`}
          >
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>
            {isRecording ? `Recording... ${countdown}s` : (canCapture ? `Record ${status === 'face_video_1' ? 'Video 1' : 'Video 2'} (5s)` : 'Position face in frame')}
          </button>
        )}

        {status === 'gesture' && (
          <div className="text-center py-3 text-gray-500 text-sm font-medium">
            {currentGestureIndex + 1}/{GESTURES.length} · Move your face to match: <span className="font-bold text-[#0052FF]">{GESTURES[currentGestureIndex]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
