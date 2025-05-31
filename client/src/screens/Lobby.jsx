import React, { useState, useEffect } from 'react';
import './Lobby.css';
import { Link } from 'react-router-dom';
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
function GameBox({ game }) {
    return (
        <div className="game-box">
            <div className="game-info">
                <h3 className="game-name">{game.name || 'Untitled Game'}</h3>
                <p className="game-type">Type: {game.type || 'Unknown'}</p>
                <p className="game-players">
                    Players: {game.currentPlayers || 0}/{game.maxPlayers || 'Unknown'}
                </p>
            </div>
            <div className="game-actions">
                <Link to={`/app/game/${game.id}`} className="join-game-link">
                    <button className="join-game-button">
                        Join Game
                    </button>
                </Link>
            </div>
        </div>
    );
}

function Lobby() {
    const [games, setGames] = useState([]);
    const [websocket, setWebsocket] = useState(null);

    useEffect(() => {
        // Create WebSocket connection to the lobby endpoint
        const ws = new WebSocket('ws://localhost:8080/lobby/ws');
        
        ws.onopen = () => {
            console.log('Connected to lobby WebSocket');
            setWebsocket(ws);
        };

        ws.onmessage = (event) => {
            try {
                const gamesList = JSON.parse(event.data);
                setGames(gamesList);
                console.log('Received games list:', gamesList);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
            setWebsocket(null);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
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
                <button className="create-game-button">
                    <Link to="/app/create-game">Create Game</Link>
                </button>
            </div>

            <div className="games-section">
                <h2>Active Games ({games.length})</h2>
                {games.length === 0 ? (
                    <div className="no-games">
                        <p>No active games. Be the first to create one!</p>
                    </div>
                ) : (
                    <div className="games-list">
                        {games.map((game) => (
                            <GameBox 
                                key={game.id || Math.random()} 
                                game={game} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Lobby;
