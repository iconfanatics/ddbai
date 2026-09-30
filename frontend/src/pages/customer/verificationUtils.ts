import * as faceapi from 'face-api.js';

export const TRANSLATIONS = {
  en: {
    identityVerification: "Identity Verification",
    pleaseComplete: "Please complete your verification to continue.",
    name: "NAME",
    passportNo: "PASSPORT NO",
    startVerification: "Start Verification →",
    uploadPassport: "Upload Passport Photo",
    uploadInstruction: "Please upload a clear image of your passport.",
    clickToUpload: "Click to Upload",
    formats: "JPG, PNG, PDF (Max 10MB)",
    importantInstructions: "Important Instructions",
    inst1: "Upload a clear and original passport photo.",
    inst2: "All details must be visible and readable.",
    inst3: "Image should not be cropped or blurred.",
    inst4: "Make sure there is no glare, shadow or reflection.",
    inst5: "Upload the full passport page.",
    nextStep: "Next Step →",
    lookAtCamera: "Look at the Camera",
    holdStill: "Hold still...",
    captureSelfie: "Capture Selfie",
    takePhoto: "Take Photo",
    video1: "Video 1",
    video2: "Video 2",
    startVideo: "Start Video",
    verificationFailed: "Verification Failed",
    retry: "Retry",
    verificationSummary: "Verification Summary",
    verificationComplete: "VERIFICATION COMPLETE",
    thankYou: "Your verification has been successfully completed.\n\nThank you."
  },
  ar: {
    identityVerification: "التحقق من الهوية",
    pleaseComplete: "يرجى إكمال التحقق للمتابعة.",
    name: "الاسم",
    passportNo: "رقم الجواز",
    startVerification: "بدء التحقق ←",
    uploadPassport: "رفع صورة الجواز",
    uploadInstruction: "يرجى رفع صورة واضحة لجواز سفرك.",
    clickToUpload: "اضغط للرفع",
    formats: "JPG, PNG, PDF (كحد أقصى 10 ميغابايت)",
    importantInstructions: "تعليمات هامة",
    inst1: "قم برفع صورة جواز سفر أصلية وواضحة.",
    inst2: "يجب أن تكون جميع التفاصيل مرئية ومقروءة.",
    inst3: "يجب ألا تكون الصورة مقصوصة أو ضبابية.",
    inst4: "تأكد من عدم وجود توهج أو ظل أو انعكاس.",
    inst5: "قم برفع صفحة الجواز كاملة.",
    nextStep: "الخطوة التالية ←",
    lookAtCamera: "انظر إلى الكاميرا",
    holdStill: "اثبت...",
    captureSelfie: "التقط صورة شخصية",
    takePhoto: "التقط صورة",
    video1: "فيديو 1",
    video2: "فيديو 2",
    startVideo: "بدء الفيديو",
    verificationFailed: "فشل التحقق",
    retry: "إعادة المحاولة",
    verificationSummary: "ملخص التحقق",
    verificationComplete: "اكتمل التحقق",
    thankYou: "تم إكمال التحقق بنجاح.\n\nشكراً لك."
  },
  pt: {
    identityVerification: "Verificação de Identidade",
    pleaseComplete: "Por favor, conclua sua verificação para continuar.",
    name: "NOME",
    passportNo: "Nº DO PASSAPORTE",
    startVerification: "Iniciar Verificação →",
    uploadPassport: "Enviar Foto do Passaporte",
    uploadInstruction: "Envie uma imagem nítida do seu passaporte.",
    clickToUpload: "Clique para Enviar",
    formats: "JPG, PNG, PDF (Máx 10MB)",
    importantInstructions: "Instruções Importantes",
    inst1: "Envie uma foto clara e original do passaporte.",
    inst2: "Todos os detalhes devem estar visíveis e legíveis.",
    inst3: "A imagem não deve estar cortada ou desfocada.",
    inst4: "Certifique-se de que não haja reflexo ou sombra.",
    inst5: "Envie a página inteira do passaporte.",
    nextStep: "Próximo Passo →",
    lookAtCamera: "Olhe para a Câmera",
    holdStill: "Fique parado...",
    captureSelfie: "Tirar Selfie",
    takePhoto: "Tirar Foto",
    video1: "Vídeo 1",
    video2: "Vídeo 2",
    startVideo: "Iniciar Vídeo",
    verificationFailed: "Falha na Verificação",
    retry: "Tentar Novamente",
    verificationSummary: "Resumo da Verificação",
    verificationComplete: "VERIFICAÇÃO CONCLUÍDA",
    thankYou: "Sua verificação foi concluída com sucesso.\n\nObrigado."
  }
};

export const detectHeadPose = (landmarks: faceapi.FaceLandmarks68) => {
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const jawOutline = landmarks.getJawOutline();
  const mouth = landmarks.getMouth();

  // Averages
  const noseTip = nose[3];
  const leftEyeCenter = { x: leftEye.reduce((acc, pt) => acc + pt.x, 0) / 6, y: leftEye.reduce((acc, pt) => acc + pt.y, 0) / 6 };
  const rightEyeCenter = { x: rightEye.reduce((acc, pt) => acc + pt.x, 0) / 6, y: rightEye.reduce((acc, pt) => acc + pt.y, 0) / 6 };
  
  // Yaw (Left / Right)
  const leftDist = Math.abs(noseTip.x - jawOutline[0].x);
  const rightDist = Math.abs(noseTip.x - jawOutline[16].x);
  const yawRatio = leftDist / rightDist; 
  // < 0.7 means looking right (left cheek is smaller)
  // > 1.4 means looking left
  
  let yaw = 'center';
  if (yawRatio > 1.25) yaw = 'left';
  if (yawRatio < 0.8) yaw = 'right';

  // Pitch (Up / Down)
  const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
  const topToNose = noseTip.y - eyeCenterY;
  const noseToJaw = jawOutline[8].y - noseTip.y;
  const pitchRatio = topToNose / noseToJaw;
  
  let pitch = 'center';
  if (pitchRatio > 0.9) pitch = 'down'; // Nose is closer to jaw -> head tilted down
  if (pitchRatio < 0.7) pitch = 'up';   // Nose is closer to eyes -> head tilted up

  // Smile Detection
  const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
  const jawWidth = Math.abs(jawOutline[0].x - jawOutline[16].x);
  const smileRatio = mouthWidth / jawWidth;
  const isSmiling = smileRatio > 0.38; // Heuristic

  return { yaw, pitch, isSmiling };
};

export const checkGesture = (gestureId: string, pose: { yaw: string, pitch: string, isSmiling: boolean }) => {
  switch (gestureId) {
    case 'Look Down': return pose.pitch === 'down' && pose.yaw === 'center';
    case 'Look Down-Left': return pose.pitch === 'down' && pose.yaw === 'left';
    case 'Look Down-Right': return pose.pitch === 'down' && pose.yaw === 'right';
    case 'Look Left': return pose.pitch === 'center' && pose.yaw === 'left';
    case 'Look Right': return pose.pitch === 'center' && pose.yaw === 'right';
    case 'Smile': return pose.isSmiling;
    case 'Look Up': return pose.pitch === 'up' && pose.yaw === 'center';
    case 'Look Up-Left': return pose.pitch === 'up' && pose.yaw === 'left';
    case 'Look Up-Right': return pose.pitch === 'up' && pose.yaw === 'right';
    default: return false;
  }
};



export const analyzeSelfieConditions = (
  video: HTMLVideoElement, 
  detection: faceapi.FaceDetection | undefined
): { isGood: boolean, message: string } => {
  if (!detection) return { isGood: false, message: "Face not detected. Please look at the camera." };

  const box = detection.box;
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;
  
  if (videoW === 0 || videoH === 0) return { isGood: false, message: "Loading camera..." };

  // 1. Check if face is centered and inside frame
  // Frame is roughly the middle 50% of the screen
  const isCenteredX = box.x > videoW * 0.1 && box.right < videoW * 0.9;
  const isCenteredY = box.y > videoH * 0.1 && box.bottom < videoH * 0.9;
  const isGoodSize = box.width > videoW * 0.15 && box.width < videoW * 0.8;

  if (!isCenteredX || !isCenteredY || !isGoodSize) {
    return { isGood: false, message: "Please position your face inside the frame." };
  }

  try {
    // 2. Pixel Analysis for Lighting (Optimized - Downscale for performance)
    const canvas = document.createElement('canvas');
    const scale = 0.1; // 10% scale for fast pixel sampling
    canvas.width = videoW * scale;
    canvas.height = videoH * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { isGood: true, message: "Hold still..." };
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Sample Face Area Brightness
    const sX = Math.max(0, box.x * scale);
    const sY = Math.max(0, box.y * scale);
    const sW = Math.max(1, box.width * scale);
    const sH = Math.max(1, box.height * scale);
    
    // Ensure we don't go out of bounds
    const faceImgData = ctx.getImageData(sX, sY, Math.min(sW, canvas.width - sX), Math.min(sH, canvas.height - sY)).data;
    let faceSum = 0;
    for (let i = 0; i < faceImgData.length; i += 4) {
      faceSum += (faceImgData[i] + faceImgData[i+1] + faceImgData[i+2]) / 3;
    }
    const faceAvgBrightness = faceImgData.length > 0 ? faceSum / (faceImgData.length / 4) : 100;

    // Sample Background Area Brightness (Sample top left corner)
    const bgImgData = ctx.getImageData(0, 0, Math.max(1, canvas.width * 0.2), Math.max(1, canvas.height * 0.2)).data;
    let bgSum = 0;
    for (let i = 0; i < bgImgData.length; i += 4) {
      bgSum += (bgImgData[i] + bgImgData[i+1] + bgImgData[i+2]) / 3;
    }
    const bgAvgBrightness = bgImgData.length > 0 ? bgSum / (bgImgData.length / 4) : 100;

    // 3. Logic based on brightness
    if (faceAvgBrightness < 20 && bgAvgBrightness < 20) {
      return { isGood: false, message: "Camera is blocked or too dark. Please move to a brighter area." };
    }
    if (faceAvgBrightness < 40) {
      return { isGood: false, message: "Face is too dark. Please move to a brighter area." };
    }
    if (bgAvgBrightness > 220 && faceAvgBrightness < 80) {
      return { isGood: false, message: "Excessive backlight detected. Please avoid bright lights behind you." };
    }
  } catch (e) {
    // Ignore canvas errors (e.g. cross origin or bounds)
    console.error(e);
  }

  return { isGood: true, message: "Hold still..." };
};

