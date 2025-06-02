import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { API_BASE_URL } from '../config';
import './CreateGame.css';

function CreateGame() {
    const navigate = useNavigate();
    const { backendUser } = useOutletContext();
    const [gameName, setGameName] = useState('');
    const [gameType, setGameType] = useState('simple');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
        });
        
        return () => unsubscribe();
    }, []);
    
    const handleCreateGame = async () => {
        if (!gameName.trim()) {
            setError('Please enter a game name');
            return;
        }
        
        // Make sure we have a currentUser before proceeding
        if (!currentUser) {
            setError('User not authenticated. Please log in again.');
            setLoading(false);
            return;
        }
        
        console.log('Current user:', currentUser);
        
        setLoading(true);
        setError('');
        
        try {
            // Get user's MongoDB ObjectId (either from context or by fetching)
            let userObjectId;
            if (backendUser && backendUser.id) {
                userObjectId = backendUser.id;
                console.log('Backend user from context:', backendUser);
            } else {
                // Fallback: fetch user data by Firebase UID to get MongoDB ObjectId
                console.log('Fetching user data by Firebase UID...');
                const userResponse = await fetch(`${API_BASE_URL}/users/initialize`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ firebase_uid: currentUser.uid })
                });
                
                if (!userResponse.ok) {
                    throw new Error(`Failed to get user data: ${userResponse.statusText}`);
                }
                
                const userData = await userResponse.json();
                userObjectId = userData.id;
                console.log('Fetched user data:', userData);
            }
            
            if (!userObjectId) {
                throw new Error('Could not get user MongoDB ObjectId');
            }
            
            console.log('Creating game with data:', { name: gameName, type: gameType });
            
            // Step 1: Create a new game
            const createResponse = await fetch(`${API_BASE_URL}/games/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: gameName,
                    type: gameType
                })
            });
            
            if (!createResponse.ok) {
                throw new Error(`Failed to create game: ${createResponse.statusText}`);
            }
            
            const responseText = await createResponse.text();
            console.log('Raw response:', responseText);
            
            let gameData;
            try {
                gameData = JSON.parse(responseText);
                console.log('Game data parsed:', gameData);
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
                throw new Error(`Invalid JSON response from server: ${responseText}`);
            }
            
            // Extract the game ID - handle different possible field names
            let gameId = null;
            
            // Check for common ID field names
            gameId = gameData.id;
            
            
            console.log('Game ID extracted:', gameId);
            
            // Make sure we have a valid game ID before proceeding
            if (!gameId) {
                throw new Error('Failed to extract game ID from server response');
            }
            // Step 2: Add the current user to the game using their MongoDB ObjectId
            const addUserResponse = await fetch(`${API_BASE_URL}/games/${gameId}/add_user/${userObjectId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!addUserResponse.ok) {
                throw new Error(`Failed to join game: ${addUserResponse.statusText}`);
            }
            
            // Navigate to the game waiting room with the game ID
            navigate(`/app/game?id=${gameId}`);
            
        } catch (err) {
            console.error('Error creating game:', err);
            setError(err.message || 'Failed to create game. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="create-game-container">
            <h1>Create Game</h1>
            <p>Enter a name for your game and select the game type</p>
            
            {error && <p className="error-message">{error}</p>}
            
            <div className="form-group">
                <label htmlFor="gameName">Game Name:</label>
                <input 
                    type="text" 
                    id="gameName"
                    placeholder="Enter game name" 
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    disabled={loading}
                />
            </div>
            
            <div className="form-group">
                <label htmlFor="gameType">Game Type:</label>
                <select 
                    id="gameType"
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value)}
                    disabled={loading}
                >
                    <option value="simple">Simple (2 players)</option>
                    <option value="fish">Fish (up to 6 players)</option>
                    <option value="vietcong">Vietcong (4 players)</option>
                </select>
            </div>
            
            <button 
                onClick={handleCreateGame} 
                disabled={loading}
                className="create-button"
            >
                {loading ? 'Creating...' : 'Create Game'}
            </button>
        </div>
    );
}

export default CreateGame;
