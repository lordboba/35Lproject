import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './UsernameScreen.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function UsernameScreen({ firebaseUser, onRegistrationSuccess }) {
  const [username, setUsername] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState({ checking: false, available: null, message: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Debounce function
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  };

  const checkUsername = useCallback(async (nameToCheck) => {
    if (!nameToCheck || nameToCheck.length < 3 || nameToCheck.length > 20 || !/^[a-zA-Z0-9_]+$/.test(nameToCheck)) {
      setAvailabilityStatus({
        checking: false,
        available: false,
        message: 'Username must be 3-20 alphanumeric characters or underscores.',
      });
      return;
    }
    setAvailabilityStatus({ checking: true, available: null, message: 'Checking...' });
    try {
      const response = await fetch(`${API_BASE_URL}/users/check_username_availability/${nameToCheck}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to check username');
      }
      const data = await response.json();
      setAvailabilityStatus({
        checking: false,
        available: data.is_available,
        message: data.is_available ? 'Username available!' : 'Username taken.',
      });
    } catch (err) {
      setAvailabilityStatus({ checking: false, available: null, message: `Error: ${err.message}` });
    }
  }, []);

  const debouncedCheckUsername = useCallback(debounce(checkUsername, 500), [checkUsername]);

  useEffect(() => {
    if (username) {
      debouncedCheckUsername(username);
    }
  }, [username, debouncedCheckUsername]);

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    // Reset error message if user starts typing again
    if (error) setError(''); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!availabilityStatus.available || availabilityStatus.checking || isSubmitting) {
      setError('Please choose an available username that meets the criteria.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/users/complete_registration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firebase_uid: firebaseUser.uid, username }),
      });
      const responseData = await response.json(); 
      if (!response.ok) {
        throw new Error(responseData.detail || 'Failed to complete registration');
      }
      onRegistrationSuccess(responseData); // Pass the updated user from backend
      navigate('/app/lobby');
    } catch (err) {
      setError(`Registration failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="username-screen-container">
      <h2>Set Your Username</h2>
      <p>Choose a unique username to complete your registration.</p>
      <form onSubmit={handleSubmit} className="username-form">
        <input
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder="Enter username"
          aria-label="Username"
          className="username-input"
        />
        <div className="availability-message">
          {availabilityStatus.message && 
            <span className={availabilityStatus.available === true ? 'available' : availabilityStatus.available === false ? 'unavailable' : 'checking'}>
              {availabilityStatus.message}
            </span>
          }
        </div>
        {error && <p className="error-message">{error}</p>}
        <button 
          type="submit" 
          disabled={!availabilityStatus.available || availabilityStatus.checking || isSubmitting}
          className="submit-button"
        >
          {isSubmitting ? 'Registering...' : 'Finish Registration'}
        </button>
      </form>
    </div>
  );
}

export default UsernameScreen;
