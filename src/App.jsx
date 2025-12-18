import { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './app/store';
import Chat from './pages/Chat';
import ProfileSetup from './components/ProfileSetup';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleProfileComplete = (user) => {
    setCurrentUser(user);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'
      }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Provider store={store}>
      <div className="App">
        {currentUser ? (
          <Chat currentUser={currentUser} />
        ) : (
          <ProfileSetup onProfileComplete={handleProfileComplete} />
        )}
      </div>
    </Provider>
  );
}

export default App;