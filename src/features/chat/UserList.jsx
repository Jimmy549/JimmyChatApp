import { useEffect, useRef } from 'react';
import { useGetChatsQuery } from '../../services/messagesApi';
import { socket } from '../../socket/socket';

const UserList = ({ selectedChat, onChatSelect, currentUserId, onBackClick }) => {
  const { data: chats, isLoading, refetch } = useGetChatsQuery(currentUserId);
  const chatListRef = useRef(null);
  
  useEffect(() => {
    const handleChatUpdate = () => {
      refetch();
    };
    
    const handleMessageStatus = () => {
      refetch(); // Refetch to get updated message statuses
    };
    
    socket.on('chat:update', handleChatUpdate);
    socket.on('message:receive', handleChatUpdate);
    socket.on('message:status', handleMessageStatus);
    
    return () => {
      socket.off('chat:update', handleChatUpdate);
      socket.off('message:receive', handleChatUpdate);
      socket.off('message:status', handleMessageStatus);
    };
  }, [refetch]);



  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading) return (
    <div className="text-whatsapp-text-secondary p-5">
      Loading chats...
    </div>
  );

  return (
    <>
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center">
          <button 
            onClick={onBackClick}
            className="md:hidden mr-4 p-2 rounded-full glass-morphism hover:neon-glow transition-all duration-300"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h3 className="text-2xl font-bold gradient-text text-shadow">
              Messages
            </h3>
            <p className="text-gray-400 text-sm mt-1">Stay connected with everyone</p>
          </div>
        </div>
      </div>
      
      <div ref={chatListRef} className="overflow-y-scroll flex-1 custom-scrollbar px-2 max-h-[calc(100vh-140px)]">
        {chats?.map((chat, index) => (
          <div
            key={chat.id}
            className={`chat-item relative m-2 p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${
              selectedChat?.id === chat.id 
                ? 'glass-card neon-glow' 
                : 'glass-morphism hover:glass-card'
            }`}
            onClick={() => onChatSelect(chat)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/15 to-cyan-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            
            <div className="flex items-center relative z-10">
              <div className="relative">
                <div className="relative">
                  <img 
                    src={chat.avatar} 
                    alt={chat.name} 
                    className="w-14 h-14 rounded-full mr-4 ring-2 ring-white/10 group-hover:ring-purple-400/50 transition-all duration-300"
                  />
                  {chat.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-800 pulse-glow"></div>
                  )}
                </div>
                
                {/* Message Count Badge */}
                {chat.unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold neon-glow">
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-white text-base font-semibold truncate group-hover:gradient-text transition-all duration-300">
                    {chat.name}
                  </h4>
                  {chat.lastMessage && (
                    <span className="text-gray-400 text-xs bg-white/5 px-2 py-1 rounded-full">
                      {formatTime(chat.lastMessage.timestamp)}
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <p className="text-gray-300 text-sm truncate flex-1 group-hover:text-white transition-colors duration-300">
                    {chat.lastMessage ? (
                      <>
                        {chat.lastMessage.senderId === currentUserId && (
                          <span className={`mr-2 text-sm ${
                            chat.lastMessage.status === 'read' ? 'text-blue-400' :
                            chat.lastMessage.status === 'delivered' ? 'text-gray-400' :
                            chat.lastMessage.status === 'sent' ? 'text-gray-400' :
                            'text-gray-500'
                          }`}>
                            {chat.lastMessage.status === 'sent' ? '✓' :
                             chat.lastMessage.status === 'delivered' ? '✓✓' :
                             chat.lastMessage.status === 'read' ? '✓✓' : '⏰'}
                          </span>
                        )}
                        {chat.lastMessage.type === 'text' ? chat.lastMessage.text :
                         chat.lastMessage.type === 'image' ? '📷 Image' :
                         chat.lastMessage.type === 'audio' ? '🎵 Voice message' : chat.lastMessage.text}
                      </>
                    ) : (
                      <span className="italic">Start a conversation...</span>
                    )}
                  </p>
                  
                  {/* Online Status Indicator */}
                  {chat.isOnline && (
                    <div className="flex items-center ml-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
                
                {/* Hover Effect Line */}
                <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 w-0 group-hover:w-full transition-all duration-500 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Empty State */}
        {chats?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center mb-4 floating-element">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-400">No conversations yet</p>
            <p className="text-gray-500 text-sm mt-1">Start chatting with someone!</p>
          </div>
        )}
      </div>
    </>
  );
};

export default UserList;