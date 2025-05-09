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

function ProtectedLayout({ onSignOut }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  return (
    <>
      <Navbar onSignOut={onSignOut} onToggleSidebar={toggleSidebar} />
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={`content-area ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <Outlet />
      </div>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
      navigate('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <Routes>
      <Route path="/" element={
        user ? <Navigate to="/app" /> : (
          <>
            <div>
            </div>
            <h1>multiplayer card games :D</h1>
            <button onClick={handleSignIn}>Sign In with Google</button>
          </>
        )
      } />
      <Route path="/app" element={user ? <ProtectedLayout onSignOut={handleSignOut} /> : <Navigate to="/" />}>
        <Route index element={<Navigate to="lobby" />} />
        <Route path="lobby" element={<Lobby />} />
        <Route path="stats" element={<UserStats />} />
        <Route path="instructions" element={<GameInstructions />} />
      </Route>
    </Routes>
  );
}

export default App;
