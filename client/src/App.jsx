import { useState } from 'react';
import './App.css';
import { auth, googleProvider } from './firebase'; 
import { signInWithPopup, signOut } from 'firebase/auth'; 

function App() {
  const [user, setUser] = useState(null); 

  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      console.log(result.user);
    } catch (error) {
      console.error("Error signing in: ", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <>
      <div>
      </div>
      <h1>multiplayer card games :D</h1>
      {user ? (
        <>
          <p>Welcome, {user.displayName || user.email}!</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </>
      ) : (
        <button onClick={handleSignIn}>Sign In with Google</button> 
      )}
    </>
  );
}

export default App;
