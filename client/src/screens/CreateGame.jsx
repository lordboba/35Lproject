import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateGame.css';

function CreateGame() {
    const navigate = useNavigate();
    const [gameName, setGameName] = useState('');
    return (
        <div>
            <h1>Create Game</h1>
            <p>Enter a name for your game and click "Create" to start.</p>
            <input type="text" placeholder="Game name" />

            <button onClick={() => navigate('/app/game')}>Create</button>
        </div>
    );
}

export default CreateGame;
