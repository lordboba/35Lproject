import React from 'react';
import './Lobby.css';
import { Link } from 'react-router-dom';

function Lobby() {
    return (
        <div>
            <h1>Lobby</h1>
            <p>Join a game or create a new one.</p>

            <button className="create-game-button"><Link to="/app/create-game">Create Game</Link></button>
        </div>
    );
}

export default Lobby;
