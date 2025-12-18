import { socket } from '../socket/socket';

const IncomingCallModal = ({ isOpen, onAccept, onReject, callerData }) => {
  if (!isOpen || !callerData) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="glass-card p-8 rounded-3xl max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <img 
            src={callerData.avatar} 
            alt={callerData.name}
            className="w-32 h-32 rounded-full mx-auto ring-4 ring-green-400/50 animate-pulse"
          />
        </div>

        <h2 className="text-2xl font-semibold text-white mb-2">{callerData.name}</h2>
        <p className="text-gray-300 text-lg mb-8">
          Incoming {callerData.callType} call...
        </p>

        <div className="flex justify-center gap-6">
          <button
            onClick={onReject}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button
            onClick={onAccept}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;