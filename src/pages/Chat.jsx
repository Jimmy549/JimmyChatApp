import { useState, useEffect } from 'react';
import UserList from '../features/chat/UserList';
import ChatWindow from '../features/chat/ChatWindow';
import MessageInput from '../features/chat/MessageInput';
import CallModal from '../components/CallModal';
import IncomingCallModal from '../components/IncomingCallModal';
import { socket } from '../socket/socket';
import { useGetUsersQuery } from '../services/usersApi';

const Chat = ({ currentUser }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(currentUser?.id || 1);
  const [showSidebar, setShowSidebar] = useState(true);
  const [userStatuses, setUserStatuses] = useState({});
  const [showCallModal, setShowCallModal] = useState(false);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [callType, setCallType] = useState('audio');
  const { data: users } = useGetUsersQuery();

  useEffect(() => {
    if (currentUser) {
      setCurrentUserId(currentUser.id);
      socket.emit('user:online', currentUser.id);
    }
    
    // Simulate other users being online (for demo purposes)
    setTimeout(() => {
      [2, 3, 4, 5, 6, 7, 8].forEach(userId => {
        if (userId !== currentUser?.id && Math.random() > 0.3) {
          socket.emit('user:online', userId);
        }
      });
    }, 1000);
    
    const handleUserStatus = (data) => {
      setUserStatuses(prev => ({ ...prev, [data.userId]: data.status }));
    };

    const handleIncomingCall = (data) => {
      const caller = users?.find(u => u.id === data.callerId);
      setIncomingCallData({
        ...data,
        name: data.callerName,
        avatar: caller?.avatar || 'https://i.pravatar.cc/150?img=1'
      });
      setShowIncomingCall(true);
    };
    
    socket.on('user:status', handleUserStatus);
    socket.on('call:incoming', handleIncomingCall);
    
    return () => {
      socket.off('user:status', handleUserStatus);
      socket.off('call:incoming', handleIncomingCall);
    };
  }, [currentUser, users]);

  const handleChatSelect = (chat) => {
    // Leave previous chat if any
    if (selectedChat) {
      socket.emit('leave:chat', { chatId: selectedChat.id, userId: currentUserId });
    }
    
    setSelectedChat(chat);
    setShowSidebar(false);
  };

  const handleBackToChats = () => {
    // Leave current chat when going back
    if (selectedChat) {
      socket.emit('leave:chat', { chatId: selectedChat.id, userId: currentUserId });
    }
    
    setShowSidebar(true);
    setSelectedChat(null);
  };

  const initiateCall = (type) => {
    if (selectedChat) {
      setCallType(type);
      setShowCallModal(true);
      socket.emit('call:initiate', {
        chatId: selectedChat.id,
        callerId: currentUserId,
        callerName: users?.find(u => u.id === currentUserId)?.name,
        callType: type
      });
    }
  };

  const acceptCall = () => {
    setShowIncomingCall(false);
    setCallType(incomingCallData.callType);
    setShowCallModal(true);
    socket.emit('call:accept', { chatId: incomingCallData.chatId });
  };

  const rejectCall = () => {
    setShowIncomingCall(false);
    socket.emit('call:reject', { chatId: incomingCallData.chatId });
    setIncomingCallData(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-1 md:p-2" style={{
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'
    }}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-10 floating-element"></div>
        <div className="absolute top-60 right-32 w-24 h-24 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-10 floating-element" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-32 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-green-400 to-blue-400 opacity-5 floating-element" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-none h-[98vh] flex relative z-10 mx-2">
        {/* Sidebar */}
        <div className={`${
          showSidebar ? 'flex' : 'hidden'
        } md:flex w-full md:w-80 lg:w-96 flex-col slide-in`}>
          <div className="glass-card m-1 rounded-2xl overflow-hidden h-full">
            <UserList 
              selectedChat={selectedChat} 
              onChatSelect={handleChatSelect}
              currentUserId={currentUserId}
              onBackClick={() => setShowSidebar(false)}
            />
          </div>
        </div>
        
        {/* Main Chat Area */}
        <div className={`${
          !showSidebar || selectedChat ? 'flex' : 'hidden'
        } md:flex flex-1 flex-col`}>
        {selectedChat ? (
          <div className="glass-card m-1 rounded-2xl overflow-hidden h-full flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 backdrop-blur-strong">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <button 
                    onClick={handleBackToChats}
                    className="md:hidden mr-4 p-2 rounded-full glass-morphism hover:neon-glow transition-all duration-300"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="relative">
                    <img 
                      src={selectedChat.avatar} 
                      alt={selectedChat.name} 
                      className="w-12 h-12 rounded-full mr-4 ring-2 ring-white/20 hover:ring-purple-400/50 transition-all duration-300"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-white text-lg font-semibold gradient-text text-shadow">
                      {selectedChat.name}
                    </h2>
                    <p className="text-gray-300 text-sm flex items-center">
                      {selectedChat.isOnline ? (
                        <>
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                          Online
                        </>
                      ) : (
                        'Last seen recently'
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => initiateCall('audio')}
                      className="p-2 rounded-full glass-morphism hover:neon-glow hover:bg-green-500/20 hover:scale-110 transition-all duration-300 group"
                    >
                      <svg className="w-5 h-5 text-white group-hover:text-green-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => initiateCall('video')}
                      className="p-2 rounded-full glass-morphism hover:neon-glow hover:bg-blue-500/20 hover:scale-110 transition-all duration-300 group"
                    >
                      <svg className="w-5 h-5 text-white group-hover:text-blue-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Current User Profile - Small */}
                  {currentUser && (
                    <div className="relative group">
                      <div className="flex items-center gap-2 glass-morphism px-3 py-2 rounded-full cursor-pointer">
                        <span className="text-white text-sm font-medium hidden sm:block">{currentUser.name}</span>
                        <img 
                          src={currentUser.avatar} 
                          alt={currentUser.name}
                          className="w-8 h-8 rounded-full ring-2 ring-green-400/50"
                        />
                      </div>
                      <button
                        onClick={() => {
                          // Clear user data and messages
                          localStorage.removeItem('currentUser');
                          localStorage.clear();
                          
                          // Clear messages on server
                          fetch(`${import.meta.env.VITE_API_BASE_URL}/api/messages/clear`, {
                            method: 'POST'
                          }).catch(console.error);
                          
                          window.location.reload();
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
                        title="Remove Profile"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Chat Messages */}
            <ChatWindow chatId={selectedChat.id} currentUserId={currentUserId} />
            
            {/* Message Input */}
            <MessageInput chatId={selectedChat.id} userId={currentUserId} />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header with User Profile */}
            <div className="p-4 border-b border-white/10 backdrop-blur-strong">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden p-2 rounded-full glass-morphism hover:neon-glow transition-all duration-300"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <h2 className="text-xl font-bold gradient-text text-shadow">
                  JimmyChatApp
                </h2>
                
                {/* Current User Profile - Small */}
                {currentUser && (
                  <div className="relative group">
                    <div className="flex items-center gap-2 glass-morphism px-3 py-2 rounded-full cursor-pointer">
                      <span className="text-white text-sm font-medium hidden sm:block">{currentUser.name}</span>
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-full ring-2 ring-green-400/50"
                      />
                    </div>
                    <button
                      onClick={() => {
                        // Clear user data and messages
                        localStorage.removeItem('currentUser');
                        localStorage.clear();
                        
                        // Clear messages on server
                        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/messages/clear`, {
                          method: 'POST'
                        }).catch(console.error);
                        
                        window.location.reload();
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
                      title="Remove Profile"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Welcome Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="glass-card p-12 rounded-3xl max-w-md">
                <div className="mb-8">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center neon-glow floating-element">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold gradient-text mb-4 text-shadow">
                    Welcome to JimmyChatApp!
                  </h2>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    Connect with friends and family through secure messaging and crystal-clear voice & video calls.
                  </p>
                </div>
                <div className="text-gray-400 text-sm">
                  <span className="md:hidden">Tap the menu button to select a chat</span>
                  <span className="hidden md:inline">Select a conversation to begin your journey</span>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Call Modal */}
      <CallModal 
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        chatData={selectedChat}
        currentUserId={currentUserId}
        callType={callType}
      />
      
      {/* Incoming Call Modal */}
      <IncomingCallModal 
        isOpen={showIncomingCall}
        onAccept={acceptCall}
        onReject={rejectCall}
        callerData={incomingCallData}
      />
    </div>
  );
};

export default Chat;