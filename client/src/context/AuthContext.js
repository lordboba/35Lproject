import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the Auth Context
const AuthContext = createContext();

// Custom hook to use the Auth Context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component that wraps your app and makes auth object available to any child component that calls useAuth()
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // This would typically integrate with your authentication service (Firebase, Auth0, etc.)
  // For now, we'll create a simple mock implementation
  useEffect(() => {
    // Mock authentication
    // This simulates loading a user from localStorage or an auth service
    const mockUser = {
      uid: 'mock-user-id',
      email: 'user@example.com',
      displayName: 'Mock User'
    };
    
    // Simulate authentication delay
    const timer = setTimeout(() => {
      setUser(mockUser);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Function to sign in
  const signIn = async (email, password) => {
    // This would typically call your authentication service
    // For now, just return the mock user
    setUser({
      uid: 'mock-user-id',
      email: email,
      displayName: 'Mock User'
    });
    return true;
  };

  // Function to sign out
  const signOut = async () => {
    // This would typically call your authentication service
    setUser(null);
    return true;
  };

  // Context value
  const value = {
    user,
    loading,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
