import React from 'react';
import './Navbar.css'; // Import the CSS file

function Navbar({ onSignOut, onToggleSidebar }) { 
  return (
    <nav className="navbar-container"> 
      <button onClick={onToggleSidebar} className="navbar-menu-button"> 
        Menu
      </button>
      <span className="navbar-title">Multiplayer Card Games</span> 
      <button 
        onClick={onSignOut}
        className="navbar-signout-button" 
      >
        Sign Out
      </button>
    </nav>
  );
}

export default Navbar;