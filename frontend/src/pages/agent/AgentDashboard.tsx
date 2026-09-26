import { useState } from 'react';
import WithoutFaceVerification from './WithoutFaceVerification';
import FaceVerificationReview from './FaceVerificationReview';
import Processing from './Processing';

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState('processing');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard / Workspace</h1>
      
      <div className="flex border-b mb-6 space-x-2">
        <button
          className={`px-4 py-2 ${activeTab === 'without_face' ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
          onClick={() => setActiveTab('without_face')}
        >
          Without Face Verification
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'face_review' ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
          onClick={() => setActiveTab('face_review')}
        >
          Face Verification Review
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'processing' ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
          onClick={() => setActiveTab('processing')}
        >
          Processing (Active Files)
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'without_face' && <WithoutFaceVerification hideHeader />}
        {activeTab === 'face_review' && <FaceVerificationReview hideHeader />}
        {activeTab === 'processing' && <Processing hideHeader />}
      </div>
    </div>
  );
}
