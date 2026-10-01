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

  const recordVideo = useCallback((key: string, nextStatus: VerificationState | null, duration: number = 5, onComplete?: () => void) => {
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
        if (nextStatus) setStatusSafe(nextStatus);
        if (onComplete) onComplete();
      };

      mr.start(500);
      setIsRecording(true);
      
      // Countdown timer
      let secs = duration;
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
            captureSnapshotFallback(key, nextStatus, onComplete);
          }
        } catch (err) {
          setIsRecording(false);
          setCountdown(0);
          captureSnapshotFallback(key, nextStatus, onComplete);
        }
      }, duration * 1000);
      
    } catch (e) {
      captureSnapshotFallback(key, nextStatus, onComplete);
    }
  }, [isRecording]);

  const captureSnapshotFallback = (key: string, nextStatus: VerificationState | null, onComplete?: () => void) => {
    if (!videoRef.current) { if (nextStatus) setStatusSafe(nextStatus);
        if (onComplete) onComplete(); return; }
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      if (blob) setMediaFiles(prev => ({ ...prev, [key]: blob }));
      setIsRecording(false);
      setCountdown(0);
      if (nextStatus) setStatusSafe(nextStatus);
        if (onComplete) onComplete();
    }, 'image/jpeg', 0.9);
  };

  const handleGestureComplete = useCallback(() => {
    if (!videoRef.current || isRecording) return;
    setGestureProgress(0);
    recordVideo(`gesture_0${currentGestureIndex + 1}`, null, 3, () => {
      setCurrentGestureIndex(prev => {
        const next = prev + 1;
        if (next >= GESTURES.length) {
          setTimeout(() => setStatusSafe('summary'), 300);
        }
        return next >= GESTURES.length ? prev : next;
      });
    });
  }, [currentGestureIndex, isRecording, recordVideo]);

  const captureSelfie = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    
    // First capture the raw selfie from camera
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = videoRef.current.videoWidth || 640;
    faceCanvas.height = videoRef.current.videoHeight || 480;
    const faceCtx = faceCanvas.getContext('2d');
    if (!faceCtx) return;
    faceCtx.translate(faceCanvas.width, 0);
    faceCtx.scale(-1, 1);
    faceCtx.drawImage(videoRef.current, 0, 0, faceCanvas.width, faceCanvas.height);
    
    // Crop the face out of the selfie (assume face is in the center dashed circle)
    // The dashed circle in UI is width 60%, height 75%.
    const cropX = faceCanvas.width * 0.2;
    const cropY = faceCanvas.height * 0.125;
    const cropW = faceCanvas.width * 0.6;
    const cropH = faceCanvas.height * 0.75;
    
    const croppedFaceCanvas = document.createElement('canvas');
    croppedFaceCanvas.width = cropW;
    croppedFaceCanvas.height = cropH;
    croppedFaceCanvas.getContext('2d')?.drawImage(
      faceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH
    );

    let finalCanvas = faceCanvas;

    // Load passport image and composite if available
    if (mediaFiles.passport) {
      try {
        const passportImg = new Image();
        passportImg.src = URL.createObjectURL(mediaFiles.passport as File | Blob);
        await new Promise((resolve, reject) => {
          passportImg.onload = resolve;
          passportImg.onerror = reject;
        });

        const compCanvas = document.createElement('canvas');
        compCanvas.width = passportImg.width;
        compCanvas.height = passportImg.height;
        const compCtx = compCanvas.getContext('2d');
        if (compCtx) {
          // Draw passport
          compCtx.drawImage(passportImg, 0, 0);
          
          // Draw cropped face over passport photo area
          // Photo area is typically around x: 8%, y: 20%, w: 28%, h: 48% (Angolan passport layout)
          const px = passportImg.width * 0.08;
          const py = passportImg.height * 0.20;
          const pw = passportImg.width * 0.28;
          const ph = passportImg.height * 0.48;
          
          compCtx.drawImage(croppedFaceCanvas, px, py, pw, ph);
          finalCanvas = compCanvas;
        }
      } catch (e) {
        console.error('Failed to composite passport', e);
      }
    }
    
    const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.9);
    setSelfiePreviewUrl(dataUrl);
    finalCanvas.toBlob(blob => {
      if (blob) setMediaFiles(prev => ({ ...prev, selfie: blob }));
    }, 'image/jpeg', 0.9);
    setStatusSafe('selfie_review');
  }, [mediaFiles.passport]);



   const submitAll = async () => {
    stopCamera();
    try {
      const mediaData: any = {};
      for (const [key, file] of Object.entries(mediaFiles)) {
        if (!file) continue;
        const isVideo = file.type.includes('video') || file.type.includes('webm') || file.type.includes('mp4');
        const ext = isVideo ? 'webm' : 'jpg';
        const filename = `${key}.${ext}`;
        const contentType = file.type || (isVideo ? 'video/webm' : 'image/jpeg');

        // Direct upload to backend — backend stores in Minio (no CORS issues)
        const res = await fetch('/api/public/webhook/face-verification/upload', {
          method: 'POST',
          headers: {
            'x-verification-token': token || '',
            'x-filename': filename,
            'content-type': contentType,
          },
          body: file,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Upload failed for ${filename}: ${text}`);
        }

        const { key: s3Key } = await res.json();
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

  const getGestureUI = (index: number) => {
    switch(index) {
      case 0: return { icon: '↓', label: 'Look down', arrowRot: 180, marker: { left: '50%', top: '100%' } };
      case 1: return { icon: '↙', label: 'Look down-left', arrowRot: 225, marker: { left: '14.6%', top: '85.4%' } };
      case 2: return { icon: '↘', label: 'Look down-right', arrowRot: 135, marker: { left: '85.4%', top: '85.4%' } };
      case 3: return { icon: '←', label: 'Look left', arrowRot: 270, marker: { left: '0%', top: '50%' } };
      case 4: return { icon: '→', label: 'Look right', arrowRot: 90, marker: { left: '100%', top: '50%' } };
      case 5: return { icon: '☺', label: 'Look at the camera', arrowRot: null, marker: null };
      case 6: return { icon: '↑', label: 'Look up', arrowRot: 0, marker: { left: '50%', top: '0%' } };
      case 7: return { icon: '↖', label: 'Look up-left', arrowRot: 315, marker: { left: '14.6%', top: '14.6%' } };
      case 8: return { icon: '↗', label: 'Look up-right', arrowRot: 45, marker: { left: '85.4%', top: '14.6%' } };
      default: return { icon: '', label: '', arrowRot: null, marker: null };
    }
  };

  const gestureUI = status === 'gesture' ? getGestureUI(currentGestureIndex) : null;

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col font-sans relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Selfie Review Overlay */}
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
      <div className="text-center px-6 pt-6 pb-4 bg-white z-10 rounded-b-3xl shadow-sm">
        <img src="/logo.png" alt="Visaora" className="h-8 mx-auto mb-4" onError={(e)=>e.currentTarget.style.display='none'}/>
        <div className="flex items-center justify-between">
          {status === 'gesture' && (
            <div className="w-8 h-8 rounded-full bg-[#0E1B31] text-white font-bold flex items-center justify-center text-sm shadow">
              {currentGestureIndex + 1}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-[#0E1B31] font-extrabold text-2xl">
              {status === 'selfie' && 'Look at the Camera'}
              {status === 'face_video_1' && 'Video 1'}
              {status === 'face_video_2' && 'Video 2'}
            </h2>
          </div>
          {status === 'gesture' && <div className="w-8" />}
        </div>
      </div>

      {/* Video Viewfinder Container */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
        <div className="relative w-full max-w-[320px] aspect-square">
          {/* Main Circle Camera */}
          <div className={`absolute inset-0 rounded-full overflow-hidden border-4 transition-colors duration-300 ${isRecording || gestureProgress > 0 ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : 'border-[#0E1B31]'}`}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
            
            {/* Selfie Blur Edge Effect */}
            {status === 'selfie' && (
              <div className="absolute inset-0 rounded-full shadow-[inset_0_0_40px_20px_rgba(255,255,255,1)] pointer-events-none"></div>
            )}

            {/* Dotted Face Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-[60%] h-[75%] border-2 rounded-[100px] border-dashed transition-all duration-300 ${isFaceGood ? 'border-white' : 'border-white/40'}`}></div>
            </div>

            {/* Direction Arrow inside circle */}
            {gestureUI && gestureUI.arrowRot !== null && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-16 h-16 text-white drop-shadow-md" style={{ transform: `rotate(${gestureUI.arrowRot}deg)` }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
              </div>
            )}
          </div>

          {/* Yellow Arc (Mocked as a curved border behind the main circle) */}
          {gestureUI && gestureUI.arrowRot !== null && (
            <div className="absolute inset-0 rounded-full border-8 border-transparent pointer-events-none" style={{
              transform: `rotate(${gestureUI.arrowRot - 45}deg)`,
              borderTopColor: '#FBBF24',
              margin: '-8px' // Push it outside the main border
            }}></div>
          )}

          {/* Green Marker on edge */}
          {gestureUI && gestureUI.marker && (
            <div 
              className="absolute w-8 h-8 bg-green-400 border-4 border-white rounded-full shadow-md z-10 transition-all duration-500"
              style={{
                left: gestureUI.marker.left,
                top: gestureUI.marker.top,
                transform: 'translate(-50%, -50%)'
              }}
            ></div>
          )}
        </div>

        {/* Status / Instruction Box below camera */}
        <div className="mt-10 bg-white rounded-3xl p-5 w-full max-w-[320px] shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="flex items-center text-[#0E1B31] font-bold text-lg mb-3">
            {status === 'selfie' && <><svg className="w-6 h-6 mr-2 text-[#0052FF]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>Hold still...</>}
            {isVideoStep && <><svg className="w-6 h-6 mr-2 text-[#0052FF]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>{isRecording ? 'Recording...' : 'Hold still...'}</>}
            {status === 'gesture' && (
              isRecording ? (
                <><svg className="w-6 h-6 mr-2 text-red-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>Recording...</>
              ) : (
                <><span className="text-[#0052FF] mr-2 text-xl">{gestureUI?.icon}</span>{gestureUI?.label}</>
              )
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-[#0052FF] h-3 rounded-full transition-all duration-300" 
                style={{ width: `${status === 'gesture' ? (isRecording ? ((3 - countdown) / 3) * 100 : gestureProgress) : (isRecording ? ((5 - countdown) / 5) * 100 : (isFaceGood ? 100 : 0))}%` }}
              ></div>
            </div>
            <span className="text-[#0052FF] font-bold text-sm min-w-[3ch]">
              {status === 'gesture' ? (isRecording ? `${Math.round(((3 - countdown) / 3) * 100)}%` : `${Math.round(gestureProgress)}%`) : (isRecording ? `${Math.round(((5 - countdown) / 5) * 100)}%` : (isFaceGood ? '100%' : '0%'))}
            </span>
          </div>
          
          {/* Guidance Message (Optional/Debug) */}
          {!isFaceGood && !isRecording && status !== 'gesture' && (
            <p className="text-xs text-red-500 mt-2 font-medium">{guidanceMsg || 'Detecting face...'}</p>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="bg-white px-6 pt-5 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl">
        {status === 'selfie' && (
          <button 
            onClick={captureSelfie}
            disabled={!canCapture}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex justify-center items-center transition-all ${canCapture ? 'bg-[#0052FF] text-white shadow-[0_8px_20px_rgba(0,82,255,0.3)] active:scale-95' : 'bg-gray-100 text-gray-400'}`}
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            {t.captureSelfie}
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
            className={`w-full py-4 rounded-2xl font-bold text-lg flex justify-center items-center transition-all ${canCapture && !isRecording ? 'bg-[#0052FF] text-white shadow-[0_8px_20px_rgba(0,82,255,0.3)] active:scale-95' : 'bg-gray-100 text-gray-400'}`}
          >
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>
            Start Video
          </button>
        )}

        {status === 'gesture' && (
          <div className="w-full py-4 rounded-2xl font-bold text-lg flex justify-center items-center bg-gray-100 text-gray-400">
            Auto-verifying gestures...
          </div>
        )}
      </div>
    </div>
  );
}

