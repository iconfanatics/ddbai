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
  if (yawRatio > 1.4) yaw = 'left';
  if (yawRatio < 0.7) yaw = 'right';

  // Pitch (Up / Down)
  const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
  const topToNose = noseTip.y - eyeCenterY;
  const noseToJaw = jawOutline[8].y - noseTip.y;
  const pitchRatio = topToNose / noseToJaw;
  
  let pitch = 'center';
  if (pitchRatio > 1.1) pitch = 'down'; // Nose is closer to jaw -> head tilted down
  if (pitchRatio < 0.6) pitch = 'up';   // Nose is closer to eyes -> head tilted up

  // Smile Detection
  const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
  const jawWidth = Math.abs(jawOutline[0].x - jawOutline[16].x);
  const smileRatio = mouthWidth / jawWidth;
  const isSmiling = smileRatio > 0.45; // Heuristic

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
