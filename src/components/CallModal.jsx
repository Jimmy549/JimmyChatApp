import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket/socket';
import Peer from 'simple-peer';

const CallModal = ({ isOpen, onClose, chatData, currentUserId, callType }) => {
  const [callStatus, setCallStatus] = useState('calling');
  const [callDuration, setCallDuration] = useState(0);
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const myVideo = useRef();
  const userVideo = useRef();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Get user media
    const getMedia = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video',
          audio: true
        });
        setStream(userStream);
        if (myVideo.current) {
          myVideo.current.srcObject = userStream;
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    };

    getMedia();

    let interval;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    const handleCallAccepted = () => {
      setCallStatus('connected');
      // Create peer connection when call is accepted
      if (stream) {
        const newPeer = new Peer({ initiator: true, trickle: false, stream });
        setPeer(newPeer);
        
        newPeer.on('signal', (data) => {
          socket.emit('call:signal', { signal: data, chatId: chatData.id });
        });
        
        newPeer.on('stream', (remoteStream) => {
          setRemoteStream(remoteStream);
          if (userVideo.current) {
            userVideo.current.srcObject = remoteStream;
          }
        });
      }
    };

    const handleCallRejected = () => onClose();
    const handleCallEnded = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      onClose();
    };

    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);

    return () => {
      clearInterval(interval);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
    };
  }, [callStatus, isOpen, onClose, callType, chatData, stream]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (peer) {
      peer.destroy();
    }
    socket.emit('call:end', { chatId: chatData.id });
    onClose();
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream && callType === 'video') {
      stream.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50">
      {callType === 'video' ? (
        // Video Call UI
        <div className="relative w-full h-full">
          {/* Remote Video */}
          <video 
            ref={userVideo}
            autoPlay 
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Local Video */}
          <video 
            ref={myVideo}
            autoPlay 
            muted 
            playsInline
            className="absolute top-4 right-4 w-32 h-24 md:w-48 md:h-36 object-cover rounded-lg border-2 border-white/20"
          />
          
          {/* Call Info */}
          <div className="absolute top-4 left-4 glass-card p-3 rounded-lg">
            <h3 className="text-white font-semibold">{chatData.name}</h3>
            {callStatus === 'connected' && (
              <p className="text-green-400 text-sm font-mono">{formatTime(callDuration)}</p>
            )}
            {callStatus === 'calling' && (
              <p className="text-gray-300 text-sm">Video calling...</p>
            )}
          </div>
          
          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-500' : 'bg-gray-600/80'
              }`}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMuted ? "M5.586 5.586l12.828 12.828M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"} />
              </svg>
            </button>
            
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isVideoOff ? 'bg-red-500' : 'bg-gray-600/80'
              }`}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            
            <button
              onClick={handleEndCall}
              className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        // Audio Call UI
        <div className="flex items-center justify-center h-full">
          <div className="glass-card p-8 rounded-3xl max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <img 
                src={chatData.avatar} 
                alt={chatData.name}
                className="w-32 h-32 rounded-full mx-auto ring-4 ring-white/20"
              />
            </div>

            <h2 className="text-2xl font-semibold text-white mb-2">{chatData.name}</h2>

            <div className="mb-8">
              {callStatus === 'calling' && (
                <p className="text-gray-300 text-lg">Audio calling...</p>
              )}
              {callStatus === 'connected' && (
                <p className="text-green-400 text-lg font-mono">
                  {formatTime(callDuration)}
                </p>
              )}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-red-500' : 'bg-gray-600'
                }`}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMuted ? "M5.586 5.586l12.828 12.828M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"} />
                </svg>
              </button>
              
              <button
                onClick={handleEndCall}
                className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallModal;