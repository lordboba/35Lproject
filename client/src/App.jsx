import { useState, useEffect } from 'react';
import './App.css';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { Routes, Route, useNavigate, Navigate, Outlet } from 'react-router-dom';
import Lobby from './screens/Lobby.jsx';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import UserStats from './screens/UserStats';
import GameInstructions from './screens/GameInstructions';
import UsernameScreen from './screens/UsernameScreen';
import CreateGame from './screens/CreateGame';
import Game from './screens/Game';
import VietcongGameScreen from './screens/VietcongGameScreen';
import FishGameScreen from './screens/FishGameScreen';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ProtectedLayout({ onSignOut, backendUser }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  return (
    <>
      <Navbar onSignOut={onSignOut} onToggleSidebar={toggleSidebar} />
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={`content-area ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <Outlet context={{ backendUser }} />
      </div>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const response = await fetch(`${API_BASE_URL}/users/initialize`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ firebase_uid: currentUser.uid }),
            }
          );
          if (!response.ok) {
            console.error('Failed to initialize or get user from backend:', response.status, response.statusText);
            if (response.status === 500) {
              console.log("Backend returned 500 error. Signing out user to re-authenticate.");
              await handleSignOut(); 
            } else {
              let errorDetailMessage = `Error ${response.status}: ${response.statusText}.`;
              try {
                const errorData = await response.json();
                errorDetailMessage += ` Details: ${errorData.detail || JSON.stringify(errorData)}`;
              } catch (jsonParseError) {
                try {
                  const textError = await response.text();
                  errorDetailMessage += ` Response body: ${textError}`;
                } catch (textParseError) {
                  errorDetailMessage += " Could not read error response body.";
                }
              }
              console.error(errorDetailMessage);
              setBackendUser(null);
            }
          } else {
            const userData = await response.json();
            setBackendUser(userData);
          }
        } catch (error) {
          console.error("Error initializing user:", error);
          setBackendUser(null);
        }
      } else {
        setBackendUser(null);
      }
      setAuthChecked(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in: ", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setBackendUser(null);
      navigate('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleRegistrationSuccess = (updatedBackendUser) => {
    setBackendUser(updatedBackendUser);
  };

  if (!authChecked) {
    return <p>Authenticating...</p>;
  }

  return (
    <Routes>
      <Route path="/" element={
        user ? (
          backendUser ? (
            backendUser.username_set ? (
              <Navigate to="/app" />
            ) : (
              <Navigate to="/set-username" />
            )
          ) : (
            <p>Loading user data...</p>
          )
        ) : (
          <>
            <div>
            </div>
            <h1>multiplayer card games :D</h1>
            <button onClick={handleSignIn}>Sign In with Google</button>
          </>
        )
      } />
      <Route path="/set-username" element={
        user && backendUser && !backendUser.username_set ? (
          <UsernameScreen firebaseUser={user} onRegistrationSuccess={handleRegistrationSuccess} />
        ) : (
          <Navigate to={user && backendUser && backendUser.username_set ? "/app" : "/"} />
        )
      } />
      <Route path="/app" element={
        user && backendUser && backendUser.username_set ? (
          <ProtectedLayout onSignOut={handleSignOut} backendUser={backendUser} />
        ) : (
          <Navigate to="/" />
        )
      }>
        <Route index element={<Navigate to="lobby" />} />
        <Route path="lobby" element={<Lobby />} />
        <Route path="stats" element={<UserStats />} />
        <Route path="instructions" element={<GameInstructions />} />
        <Route path="create-game" element={<CreateGame />} />
        <Route path="vietcong-game" element={<VietcongGameScreen />} />
        <Route path="game" element={<FishGameScreen />} />
      </Route>
    </Routes>
  );
}

export default App;
