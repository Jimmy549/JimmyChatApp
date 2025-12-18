import { useState, useEffect, useRef } from 'react';
import { socket } from '../../socket/socket';

const MessageInput = ({ chatId, userId }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
    '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
    '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
    '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
    '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
    '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
    '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
    '😾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
    '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟',
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟',
    '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎',
    '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
    '🔥', '⭐', '🌟', '✨', '💫', '💥', '💢', '💦', '💨', '🎉',
    '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️'
  ];
  
  useEffect(() => {
    let typingTimer;
    
    if (message.trim() && !isTyping) {
      setIsTyping(true);
      socket.emit('typing:start', { chatId, userId });
    }
    
    if (message.trim()) {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing:stop', { chatId, userId });
      }, 1000);
    } else {
      setIsTyping(false);
      socket.emit('typing:stop', { chatId, userId });
    }
    
    return () => clearTimeout(typingTimer);
  }, [message, chatId, userId, isTyping]);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.emoji-picker') && !e.target.closest('.emoji-button')) {
        setShowEmojiPicker(false);
      }
    };
    
    if (showEmojiPicker) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmojiPicker]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && chatId) {
      const messageData = {
        userId,
        text: message.trim(),
        chatId,
        type: 'text'
      };
      
      socket.emit('message:send', messageData);
      setMessage('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm;codecs=opus' };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/mp4';
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        socket.emit('message:send', {
          userId,
          chatId,
          type: 'audio',
          audio: audioUrl,
          duration: recordingTime,
          mimeType: mediaRecorderRef.current.mimeType
        });
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const stream = mediaRecorderRef.current.stream;
      mediaRecorderRef.current.stop();
      stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      setRecordingTime(0);
      audioChunksRef.current = [];
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        socket.emit('message:send', {
          userId,
          chatId,
          type: 'image',
          image: reader.result,
          fileName: file.name
        });
      };
    }
    setShowAttachMenu(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 border-t border-white/10">
      <form onSubmit={handleSubmit} className="flex items-end gap-4">
        {/* Attachment Button */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-3 rounded-full glass-morphism hover:neon-glow hover:bg-purple-500/20 hover:scale-110 transition-all duration-300 group"
          >
            <svg className="w-6 h-6 text-gray-300 group-hover:text-purple-400 group-hover:rotate-45 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 glass-card rounded-xl p-2 min-w-[150px]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 p-3 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-purple-500/20 hover:scale-105 rounded-lg transition-all duration-300 text-white group"
              >
                <svg className="w-5 h-5 group-hover:text-pink-400 group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="group-hover:text-pink-400 transition-colors duration-300">Image</span>
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
        
        {/* Message Input Container */}
        <div className="flex-1 relative">
          <div className="bg-gray-800/50 rounded-2xl border border-gray-600/30">
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                className="w-full p-4 pr-12 bg-transparent text-white placeholder-gray-500 outline-none text-base rounded-2xl resize-none overflow-hidden"
                style={{
                  minHeight: '24px',
                  maxHeight: '120px',
                  height: 'auto'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
              
              {/* Emoji Button */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className="emoji-button absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Emoji Picker - Outside input container */}
          {showEmojiPicker && (
            <div 
              className="emoji-picker absolute bottom-full right-0 mb-2 glass-card rounded-2xl p-4 w-80 max-h-60 overflow-y-auto custom-scrollbar z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-8 gap-2">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-2 text-xl hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Typing indicator for current user */}
          {isTyping && message.trim() && (
            <div className="absolute -top-8 left-4 text-xs text-gray-400 bg-black/50 px-3 py-2 rounded-full flex items-center gap-1">
              <span>typing</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full typing-dot"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full typing-dot"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full typing-dot"></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Send/Voice Button */}
        {!isRecording ? (
          <button 
            type={message.trim() ? "submit" : "button"}
            onClick={message.trim() ? undefined : startRecording}
            className="p-4 rounded-full transition-all duration-300 group relative overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 neon-glow"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-full"></div>
            
            {message.trim() ? (
              <svg className="w-6 h-6 text-white relative z-10 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white relative z-10 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-300"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="glass-card px-4 py-2 rounded-full flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white font-mono">{formatTime(recordingTime)}</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="p-3 rounded-full bg-green-600 hover:bg-green-700 transition-all duration-300"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        )}
      </form>
      

    </div>
  );
};

export default MessageInput;