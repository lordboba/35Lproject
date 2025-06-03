import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ isOpen, toggleSidebar }) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="sidebar">
            <button onClick={toggleSidebar} className="sidebar-close-button">Close</button>
            <ul>
                <li><Link to="/app/lobby" onClick={toggleSidebar}>Play Game (Lobby)</Link></li>
                <li><Link to="/app/stats" onClick={toggleSidebar}>User Statistics</Link></li>
                <li><Link to="/app/instructions" onClick={toggleSidebar}>Game Instructions</Link></li>
                <li><Link to="/app/player-search" onClick={toggleSidebar}>Player Search</Link></li>
            </ul>
        </div>
    );
}

export default Sidebar;
