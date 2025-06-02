import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { auth } from '../firebase';
import './Game.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Game() {
    const location = useLocation();
    const navigate = useNavigate();
    const { backendUser } = useOutletContext();
    const [currentUser, setCurrentUser] = useState(null);
    const [gameId, setGameId] = useState(null);
    const [gameName, setGameName] = useState('');
    const [gameType, setGameType] = useState('');
    const [users, setUsers] = useState([]);
    const [userDetails, setUserDetails] = useState({}); // Store username details by user ID
    const [websocket, setWebsocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [gameStarted, setGameStarted] = useState(false);
    
    // Get the current Firebase user
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
        });
        
        return () => unsubscribe();
    }, []);
    
    // Function to fetch user details by ID
    const fetchUserDetails = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}`);
            if (response.ok) {
                const userData = await response.json();
                return userData;
            } else {
                console.error(`Failed to fetch user details for ${userId}`);
                return null;
            }
        } catch (error) {
            console.error(`Error fetching user details for ${userId}:`, error);
            return null;
        }
    };
    
    // Function to fetch multiple user details
    const fetchAllUserDetails = async (userIds) => {
        const newUserDetails = { ...userDetails };
        
        // Only fetch details for users we don't already have
        const usersToFetch = userIds.filter(userId => !newUserDetails[userId]);
        
        if (usersToFetch.length === 0) return;
        
        const fetchPromises = usersToFetch.map(async (userId) => {
            const userData = await fetchUserDetails(userId);
            if (userData) {
                newUserDetails[userId] = userData;
            }
            return userData;
        });
        
        await Promise.all(fetchPromises);
        setUserDetails(newUserDetails);
    };
    
    // Get the game ID from the URL query parameters
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const id = searchParams.get('id');
        
        if (!id) {
            setError('Game ID not found in URL');
            return;
        }
        
        setGameId(id);
        
        // Fetch game details
        fetchGameDetails(id);
    }, [location]);
    
    // Fetch game details from the backend
    const fetchGameDetails = async (id) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/games/${id}/get_game`);
            if (response.ok) {
                const gameData = await response.json();
                setGameName(gameData.name || '');
                setGameType(gameData.type || '');
                setUsers(gameData.players || []);
            } else {
                console.error('Failed to fetch game details:', response.statusText);
                setError('Failed to load game details');
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching game details:', err);
            setError('Failed to load game details');
            setLoading(false);
        }
    };
    
    // Fetch user details when users list changes
    useEffect(() => {
        if (users.length > 0) {
            fetchAllUserDetails(users);
        }
    }, [users]);
    
    // Set up WebSocket connection to monitor users in the game
    useEffect(() => {
        if (!gameId || !currentUser) return;
        
        // Create WebSocket connection
        // Extract the hostname from API_BASE_URL (without http:// or https://)
        const apiUrl = new URL(API_BASE_URL);
        const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${apiUrl.host}/games/${gameId}/waiting/ws`;
        console.log('Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('WebSocket connection established');
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received updated game data:', data);
            
            // Check if this is a game started message
            if (data.game_started || data.status === 'started') {
                // Game has started, navigate all users to the appropriate game screen
                if (gameType.toLowerCase() === 'vietcong') {
                    navigate(`/vietcong-game?id=${gameId}`);
                } else if (gameType.toLowerCase() === 'fish') {
                    navigate(`/fish-game?id=${gameId}`);
                } else {
                    console.error(`Unknown game type: ${gameType}`);
                }
                return;
            }
            
            // Update game data from WebSocket message
            if (data.players) {
                setUsers(data.players);
            }
            if (data.name) {
                setGameName(data.name);
            }
            if (data.type) {
                setGameType(data.type);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('Error connecting to game server');
        };
        
        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
        
        setWebsocket(ws);
        
        // Clean up the WebSocket connection when the component unmounts
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [gameId, currentUser, navigate, gameType]);
    
    // Function to leave the waiting room
    const handleLeaveGame = async () => {
        try {
            // Get the current user's backend ID
            let userObjectId = null;
            
            // Try to get from context first
            if (backendUser && backendUser.id) {
                userObjectId = backendUser.id;
            } else if (currentUser) {
                // Fallback: fetch user data by Firebase UID to get MongoDB ObjectId
                const userResponse = await fetch(`${API_BASE_URL}/users/initialize`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ firebase_uid: currentUser.uid })
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    userObjectId = userData.id;
                }
            }
            
            // Remove user from the game if we have their ID
            if (userObjectId && gameId) {
                await fetch(`${API_BASE_URL}/games/${gameId}/remove_user/${userObjectId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
            }
        } catch (error) {
            console.error('Error leaving game:', error);
            // Continue with navigation even if the API call fails
        }
        
        // Close WebSocket connection and navigate away
        if (websocket) {
            websocket.close();
        }
        navigate('/app');
    };
    
    // Function to start the game (only available to the creator)
    const handleStartGame = async () => {
        try {
            // Make API call to start the game
            const response = await fetch(`${API_BASE_URL}/games/${gameId}/start`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                // Game successfully started (204 status), navigate to appropriate game screen
                if (gameType.toLowerCase() === 'vietcong') {
                    navigate(`/vietcong-game?id=${gameId}`);
                } else if (gameType.toLowerCase() === 'fish') {
                    navigate(`/fish-game?id=${gameId}`);
                } else {
                    setError(`Unknown game type: ${gameType}`);
                }
            } else if (response.status === 400) {
                // Game not full yet - API returns 400 error
                const errorData = await response.json();
                setError(errorData.detail || "Game not full yet. Need more players to start.");
            } else {
                // Other errors (404, etc.)
                const errorData = await response.json();
                setError(errorData.detail || 'Failed to start game');
            }
        } catch (error) {
            console.error('Error starting game:', error);
            setError('Failed to start game. Please try again.');
        }
    };
    
    // Helper function to get display name for a user
    const getUserDisplayName = (userId) => {
        const user = userDetails[userId];
        if (user && user.name) {
            return user.name;
        }
        // Fallback to showing "Loading..." while we fetch the username
        return 'Loading...';
    };
    
    // If the game has started, render the actual game UI
    if (gameStarted) {
        return (
            <div className="game-container">
                <h1>Game Started</h1>
                {/* Game UI would go here */}
            </div>
        );
    }
    
    // Otherwise, render the waiting room UI
    return (
        <div className="waiting-room-container">
            <h1>Waiting Room</h1>
            
            {error && <p className="error-message">{error}</p>}
            
            {loading ? (
                <p>Loading game details...</p>
            ) : (
                <>
                    <div className="game-info">
                        <h2>{gameName || `Game ID: ${gameId}`}</h2>
                        {gameType && <p>Game Type: {gameType}</p>}
                    </div>
                    
                    <div className="users-list">
                        <h3>Players ({users.length}):</h3>
                        {users.length === 0 ? (
                            <p>No players have joined yet.</p>
                        ) : (
                            <ul>
                                {users.map((userId, index) => (
                                    <li key={index}>
                                        {getUserDisplayName(userId)}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    
                    <div className="waiting-room-actions">
                        <button 
                            onClick={handleLeaveGame}
                            className="leave-button"
                        >
                            Leave Game
                        </button>
                        
                        {/* Only show start button if enough players have joined */}
                        {users.length >= 2 && (
                            <button 
                                onClick={handleStartGame}
                                className="start-button"
                            >
                                Start Game
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default Game;
