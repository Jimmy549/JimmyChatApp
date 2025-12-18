import { useEffect, useRef, useState } from 'react';
import { useGetMessagesQuery } from '../../services/messagesApi';
import { useGetUsersQuery } from '../../services/usersApi';
import { socket } from '../../socket/socket';
import { useDispatch } from 'react-redux';
import { messagesApi } from '../../services/messagesApi';

const AudioMessage = ({ audio, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      const audioElement = audioRef.current;
      
      const handleTimeUpdate = () => {
        setCurrentTime(audioElement.currentTime);
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      audioElement.addEventListener('ended', handleEnded);
      
      return () => {
        audioElement.removeEventListener('timeupdate', handleTimeUpdate);
        audioElement.removeEventListener('ended', handleEnded);
      };
    }
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error('Audio play failed:', e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 bg-black/20 rounded-lg p-3 min-w-[200px]">
      <audio ref={audioRef} src={audio} preload="metadata" />
      <button 
        onClick={togglePlay}
        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
      >
        {isPlaying ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer">
            <div 
              className="h-full bg-white/60 rounded-full transition-all duration-100" 
              style={{width: `${progress}%`}}
            ></div>
          </div>
          <span className="text-xs text-white/80 font-mono">
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

const ChatWindow = ({ chatId, currentUserId }) => {
  const dispatch = useDispatch();
  const { data: messages, isLoading } = useGetMessagesQuery(chatId);
  const { data: users } = useGetUsersQuery();
  const messagesEndRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [messageStatuses, setMessageStatuses] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    if (chatId) {
      socket.emit('join:chat', { chatId, userId: currentUserId });
      
      const handleNewMessage = (message) => {
        dispatch(
          messagesApi.util.updateQueryData('getMessages', chatId, (draft) => {
            const exists = draft.find(msg => msg.id === message.id);
            if (!exists) {
              draft.push(message);
            }
          })
        );
      };

      const handleMessageStatus = (data) => {
        setMessageStatuses(prev => ({ ...prev, [data.id]: data.status }));
        
        // Update message status in RTK Query cache
        dispatch(
          messagesApi.util.updateQueryData('getMessages', chatId, (draft) => {
            const messageIndex = draft.findIndex(msg => msg.id === data.id);
            if (messageIndex !== -1) {
              draft[messageIndex].status = data.status;
            }
          })
        );
      };

      const handleTypingStart = (data) => {
        if (data.userId !== currentUserId) {
          setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
        }
      };

      const handleTypingStop = (data) => {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      };

      const handleMessageDeleted = (data) => {
        dispatch(
          messagesApi.util.updateQueryData('getMessages', chatId, (draft) => {
            return draft.filter(msg => msg.id !== data.messageId);
          })
        );
      };

      socket.on('message:receive', handleNewMessage);
      socket.on('message:status', handleMessageStatus);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);
      socket.on('message:deleted', handleMessageDeleted);
      
      return () => {
        socket.emit('leave:chat', { chatId, userId: currentUserId });
        socket.off('message:receive', handleNewMessage);
        socket.off('message:status', handleMessageStatus);
        socket.off('typing:start', handleTypingStart);
        socket.off('typing:stop', handleTypingStop);
        socket.off('message:deleted', handleMessageDeleted);
      };
    }
  }, [chatId, dispatch, currentUserId]);

  const handleDeleteMessage = (messageId) => {
    socket.emit('message:delete', { chatId, messageId });
    setOpenDropdown(null);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const getUserName = (userId) => {
    return users?.find(user => user.id === userId)?.name || 'Unknown';
  };

  const getStatusIcon = (message) => {
    const status = messageStatuses[message.id] || message.status;
    switch (status) {
      case 'sent': 
        return <span className="text-gray-400 text-sm">✓</span>;
      case 'delivered': 
        return <span className="text-gray-400 text-sm">✓✓</span>;
      case 'read': 
        return <span className="text-blue-400 text-sm">✓✓</span>;
      default: 
        return <span className="text-gray-500 text-xs">⏰</span>;
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (isLoading) return (
    <div className="text-whatsapp-text-secondary p-4 md:p-5">
      Loading messages...
    </div>
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative">
      {/* Chat Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-white rounded-full"></div>
        <div className="absolute bottom-20 right-1/3 w-1 h-1 bg-white rounded-full"></div>
      </div>
      
      <div className="relative z-10">
        {messages?.map((message, index) => {
          const isSent = message.userId === currentUserId;
          return (
            <div 
              key={message.id} 
              className={`mb-6 flex flex-col message-bubble ${
                isSent ? 'items-end' : 'items-start'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`max-w-[85%] md:max-w-[70%] relative group`}>
                {/* Message Options Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === message.id ? null : message.id);
                  }}
                  className={`absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 p-1 rounded-full glass-morphism hover:neon-glow ${
                    isSent ? 'left-2' : 'right-2'
                  }`}
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {openDropdown === message.id && (
                  <div className={`absolute top-8 z-30 glass-card rounded-lg shadow-lg min-w-[120px] ${
                    isSent ? 'left-2' : 'right-2'
                  }`}>
                    <button 
                      onClick={() => handleDeleteMessage(message.id)}
                      className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`p-4 rounded-2xl relative overflow-hidden ${
                  isSent 
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white ml-auto' 
                    : 'glass-card text-white'
                }`}>
                  {/* Glassmorphism overlay for received messages */}
                  {!isSent && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl"></div>
                  )}
                  
                  {/* Sender name for received messages */}
                  {!isSent && (
                    <div className="text-sm font-semibold gradient-text mb-2 relative z-10">
                      {getUserName(message.userId)}
                    </div>
                  )}
                  
                  {/* Message content */}
                  <div className="mb-2 relative z-10">
                    {message.type === 'text' && (
                      <div className="text-base leading-relaxed break-words whitespace-pre-wrap word-wrap overflow-wrap-anywhere">
                        {message.text}
                      </div>
                    )}
                    
                    {message.type === 'image' && (
                      <div className="max-w-xs">
                        <img 
                          src={message.image} 
                          alt={message.fileName || 'Shared image'}
                          className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(message.image, '_blank')}
                        />
                        {message.fileName && (
                          <p className="text-xs text-gray-300 mt-1 truncate">{message.fileName}</p>
                        )}
                      </div>
                    )}
                    
                    {message.type === 'audio' && (
                      <AudioMessage audio={message.audio} duration={message.duration} />
                    )}
                  </div>
                  
                  {/* Message footer */}
                  <div className={`text-xs flex items-center justify-end gap-2 relative z-10 ${
                    isSent ? 'text-white/80' : 'text-gray-300'
                  }`}>
                    <span className="bg-black/20 px-2 py-1 rounded-full">
                      {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    {isSent && (
                      <span className="text-sm bg-black/20 px-2 py-1 rounded-full">
                        {getStatusIcon(message)}
                      </span>
                    )}
                  </div>
                  
                  {/* Message tail */}
                  <div className={`absolute bottom-0 w-4 h-4 transform rotate-45 ${
                    isSent 
                      ? '-right-2 bg-gradient-to-br from-blue-600 to-cyan-600' 
                      : '-left-2 glass-morphism'
                  }`}></div>
                </div>
                
                {/* Hover effects */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                  isSent 
                    ? 'bg-gradient-to-br from-blue-400/20 to-cyan-400/20' 
                    : 'bg-white/5'
                }`}></div>
              </div>
            </div>
          );
        })}
        
        {/* Advanced Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-start mb-6 message-bubble">
            <div className="glass-card p-4 rounded-2xl max-w-[70%] relative">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full typing-dot"></div>
                </div>
                <span className="text-gray-300 text-sm">typing...</span>
              </div>
              
              {/* Typing indicator tail */}
              <div className="absolute bottom-0 -left-2 w-4 h-4 transform rotate-45 glass-morphism"></div>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {messages?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center mb-6 floating-element">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold gradient-text mb-2">Start the conversation</h3>
            <p className="text-gray-400">Send a message to begin chatting</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatWindow;