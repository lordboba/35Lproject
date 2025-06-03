import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function VietCongWinScreen() {
  const navigate = useNavigate();
  const [gameResults, setGameResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get game results from sessionStorage
    const storedResults = sessionStorage.getItem('vietcongGameResults');
    if (storedResults) {
      try {
        const results = JSON.parse(storedResults);
        setGameResults(results);
        console.log('Loaded Viet Cong game results:', results);
      } catch (error) {
        console.error('Error parsing game results:', error);
        // Redirect to lobby if no valid results
        navigate('/app/lobby');
        return;
      }
    } else {
      console.log('No Viet Cong game results found, redirecting to lobby');
      // Redirect to lobby if no results
      navigate('/app/lobby');
      return;
    }
    setLoading(false);
  }, [navigate]);

  const handleBackToLobby = () => {
    // Clear the stored results
    sessionStorage.removeItem('vietcongGameResults');
    // Navigate back to lobby
    navigate('/app/lobby');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#FFF',
        fontSize: '2rem'
      }}>
        Loading game results...
      </div>
    );
  }

  if (!gameResults) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#FFF',
        fontSize: '2rem'
      }}>
        No game results available
      </div>
    );
  }

  const { gameState, userDetails, users, gameName } = gameResults;

  // Group players by their final placement
  const playersByPlace = {};
  
  users.forEach(userId => {
    const placement = gameState?.player_status?.[userId];
    if (placement) {
      if (!playersByPlace[placement]) {
        playersByPlace[placement] = [];
      }
      playersByPlace[placement].push(userId);
    }
  });

  // Get placement color and text
  const getPlacementInfo = (place) => {
    switch (place) {
      case 1:
        return { color: '#FFD700', text: '🥇 FIRST PLACE', bgColor: 'rgba(255, 215, 0, 0.3)' };
      case 2:
        return { color: '#C0C0C0', text: '🥈 SECOND PLACE', bgColor: 'rgba(192, 192, 192, 0.3)' };
      case 3:
        return { color: '#CD7F32', text: '🥉 THIRD PLACE', bgColor: 'rgba(205, 127, 50, 0.3)' };
      case 4:
        return { color: '#FF6B6B', text: '💀 FOURTH PLACE', bgColor: 'rgba(255, 107, 107, 0.2)' };
      default:
        return { color: '#888', text: `${place}th PLACE`, bgColor: 'rgba(136, 136, 136, 0.2)' };
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      backgroundImage: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      color: '#FFF',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Game Over Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem'
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 'bold',
          color: '#FFD700',
          textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
          marginBottom: '0.5rem'
        }}>
          🎴 VIET CONG GAME COMPLETE! 🎴
        </h1>
        <div style={{
          fontSize: '1.5rem',
          color: '#FFF',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}>
          {gameName || `Game ID: ${gameResults.gameId}`}
        </div>
      </div>

      {/* Results Section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '800px',
        marginBottom: '2rem'
      }}>
        <h2 style={{
          color: '#FFD700',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '1rem',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}>
          🏆 FINAL RANKINGS 🏆
        </h2>

        {/* Display results in placement order */}
        {[1, 2, 3, 4].map(place => {
          const playersAtPlace = playersByPlace[place] || [];
          if (playersAtPlace.length === 0) return null;

          const placeInfo = getPlacementInfo(place);
          const isWinner = place === 1;

          return (
            <div key={place} style={{
              backgroundColor: placeInfo.bgColor,
              border: `3px solid ${placeInfo.color}`,
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              position: 'relative',
              boxShadow: isWinner ? `0 0 25px ${placeInfo.color}` : '0 2px 8px rgba(0,0,0,0.3)',
              transform: isWinner ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.3s ease-in-out'
            }}>
              {isWinner && (
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#FFD700',
                  color: '#000',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '25px',
                  fontWeight: 'bold',
                  fontSize: '1.3rem',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                  border: '2px solid #FFA500'
                }}>
                  🎉 WINNER! 🎉
                </div>
              )}
              
              <h3 style={{
                color: placeInfo.color,
                fontSize: '2rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                marginTop: isWinner ? '1.5rem' : '0',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}>
                {placeInfo.text}
              </h3>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem'
              }}>
                {playersAtPlace.map(userId => {
                  const playerName = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;
                  return (
                    <div key={userId} style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      padding: '0.8rem 1.2rem',
                      borderRadius: '8px',
                      fontSize: '1.3rem',
                      fontWeight: 'bold',
                      border: `2px solid ${placeInfo.color}`,
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      {playerName}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Game Summary */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '2px solid #666',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <h3 style={{
          color: '#FFD700',
          fontSize: '1.5rem',
          marginBottom: '1rem',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}>
          Game Summary
        </h3>
        <p style={{
          fontSize: '1.1rem',
          color: '#CCC',
          lineHeight: '1.6',
          margin: '0'
        }}>
          In Viet Cong, players compete to be the first to play all their cards. 
          The game continues until only one player remains with cards, determining the final rankings.
        </p>
      </div>

      {/* Back to Lobby Button */}
      <button
        onClick={handleBackToLobby}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          backgroundColor: '#4CAF50',
          color: '#FFF',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease-in-out',
          marginTop: '1rem'
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = '#45a049';
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = '#4CAF50';
          e.target.style.transform = 'translateY(0px)';
          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        }}
      >
        🏠 Back to Lobby
      </button>
    </div>
  );
}

export default VietCongWinScreen; 