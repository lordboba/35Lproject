import React from 'react';
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
