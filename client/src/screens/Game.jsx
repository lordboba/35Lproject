import React, { useState, useEffect, useCallback } from 'react';

function Game() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100vw',
            margin: 0,
            padding: 0
        }}>
            <div style={{
                width: '100px',
                height: '100px',
                backgroundColor: 'green',
            }}>
            </div>
        </div>
    );
}
export default Game;
