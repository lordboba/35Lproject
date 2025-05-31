import React, { useState, useEffect } from 'react';
import './Lobby.css';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { auth } from '../firebase'; // Import Firebase auth

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Define maxMap as a constant object outside the component
const MAX_PLAYERS = {
    "vietcong": 4,
    "fish": 6,
    "simple": 2
};

/*
ServerButton is the button with that a lobby, when the user hovers over it, it will hover
and turn into a link to the lobby(with an endpoint)
*/
/*
function ServerButton() {
    return (
        
    )
}*/

// Component to display individual game information
function GameBox({ game, onJoinGame, maxPlayers }) {
    const [isJoining, setIsJoining] = useState(false);

    const handleJoinClick = async () => {
        setIsJoining(true);
        try {
            await onJoinGame(game.id || game._id);
        } catch (error) {
            console.error('Error joining game:', error);
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="game-box">
            <div className="game-info">
                <h3 className="game-name">{game.name || 'Untitled Game'}</h3>
                <p className="game-type">Type: {game.type || 'Unknown'}</p>
                <p className="game-players">
                    Players: {game.players.length || 0}/{maxPlayers[game.type] || 'Unknown'}
                </p>
            </div>
            <div className="game-actions">
                <button 
                    className="join-game-button"
                    onClick={handleJoinClick}
                    disabled={isJoining}
                >
                    {isJoining ? 'Joining...' : 'Join Game'}
                </button>
            </div>
        </div>
    );
}

// Component for pagination controls
function PaginationControls({ pagination, onPageChange }) {
    if (!pagination || pagination.total_pages <= 1) {
        return null;
    }

    return (
        <div className="pagination-controls">
            <button 
                onClick={() => onPageChange(pagination.current_page - 1)}
                disabled={!pagination.has_previous}
                className="pagination-button"
            >
                Previous
            </button>
            
            <span className="pagination-info">
                Page {pagination.current_page + 1} of {pagination.total_pages}
            </span>
            
            <button 
                onClick={() => onPageChange(pagination.current_page + 1)}
                disabled={!pagination.has_next}
                className="pagination-button"
            >
                Next
            </button>
        </div>
    );
}

function Lobby() {
    const navigate = useNavigate();
    const { backendUser } = useOutletContext();
    const [games, setGames] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [websocket, setWebsocket] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [error, setError] = useState(null);
    
    const requestPage = (page) => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                type: 'request_page',
                page: page
            }));
        }
    };

    const handleJoinGame = async (gameId) => {
        if (!backendUser || !backendUser.id) {
            setError('User not authenticated. Please try logging in again.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/games/${gameId}/add_user/${backendUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                // Successfully joined the game, navigate to the game page
                navigate(`/app/game?id=${gameId}`);
            } else if (response.status === 400) {
                // Handle various 400 errors (game full, already in game, etc.)
                const errorData = await response.json();
                if (errorData.detail === 'Game is already full') {
                    setError('This game is full. Please try joining another game.');
                    // Stay on the lobby screen as requested
                } else if (errorData.detail === 'User already in game') {
                    // If user is already in the game, just navigate to it
                    navigate(`/app/game?id=${gameId}`);
                } else {
                    setError(`Failed to join game: ${errorData.detail}`);
                }
            } else if (response.status === 404) {
                setError('Game not found. It may have been deleted or started already.');
            } else {
                setError(`Failed to join game. Server error: ${response.status}`);
            }
        } catch (error) {
            console.error('Error joining game:', error);
            setError('Network error. Please check your connection and try again.');
        }
    };

    useEffect(() => {
        // Create WebSocket connection to the lobby endpoint
        const ws = new WebSocket('ws://localhost:8000/lobby/ws');
        
        ws.onopen = () => {
            console.log('Connected to lobby WebSocket');
            setWebsocket(ws);
            setConnectionStatus('Connected');
            setError(null);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received lobby data:', data);
                
                // Handle new paginated format
                if (data.games && data.pagination) {
                    setGames(data.games);
                    setPagination(data.pagination);
                } else {
                    // Fallback for old format (if any)
                    setGames(Array.isArray(data) ? data : []);
                    setPagination(null);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
                setError('Failed to parse server response');
            }
        };

        ws.onclose = (event) => {
            console.log('WebSocket connection closed', event.code, event.reason);
            setWebsocket(null);
            setConnectionStatus('Disconnected');
            if (event.code === 1006) {
                setError('Connection lost unexpectedly');
            } else if (event.code === 403) {
                setError('Access denied (403). Please check authentication.');
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('WebSocket connection error');
            setConnectionStatus('Error');
        };

        // Cleanup function to close WebSocket when component unmounts
        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, []);

    return (
        <div className="lobby-container">
            <div className="lobby-header">
                <h1>Lobby</h1>
                <p>Join a game or create a new one.</p>
                {error && (
                    <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
                        Error: {error}
                    </div>
                )}
                <div className="connection-status" style={{ fontSize: '0.9em', marginBottom: '10px' }}>
                    Status: <span style={{ color: connectionStatus === 'Connected' ? 'green' : 'orange' }}>
                        {connectionStatus}
                    </span>
                </div>
                <button className="create-game-button">
                    <Link to="/app/create-game">Create Game</Link>
                </button>
            </div>

            <div className="games-section">
                <h2>
                    Active Games 
                    {pagination ? ` (${pagination.total_games} total)` : ` (${games.length})`}
                </h2>
                
                <PaginationControls 
                    pagination={pagination} 
                    onPageChange={requestPage}
                />
                
                {games.length === 0 ? (
                    <div className="no-games">
                        <p>No active games. Be the first to create one!</p>
                    </div>
                ) : (
                    <div className="games-list">
                        {games.map((game) => (
                            <GameBox 
                                key={game.id || game._id || Math.random()} 
                                game={game} 
                                onJoinGame={handleJoinGame}
                                maxPlayers={MAX_PLAYERS}
                            />
                        ))}
                    </div>
                )}
                
                <PaginationControls 
                    pagination={pagination} 
                    onPageChange={requestPage}
                />
            </div>
        </div>
    );
}

export default Lobby;
