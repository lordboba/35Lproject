import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Half suit names for display
const halfSuitNames = [
  "♣ 2-7",    // 0
  "♦ 2-7",    // 1  
  "♥ 2-7",    // 2
  "♠ 2-7",    // 3
  "♣ 9-A",    // 4
  "♦ 9-A",    // 5
  "♥ 9-A",    // 6
  "♠ 9-A",    // 7
  "8's & Jokers" // 8
];

function FishWinScreen() {
  const navigate = useNavigate();
  const [gameResults, setGameResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get game results from sessionStorage
    const storedResults = sessionStorage.getItem('fishGameResults');
    if (storedResults) {
      try {
        const results = JSON.parse(storedResults);
        setGameResults(results);
        console.log('Loaded game results:', results);
      } catch (error) {
        console.error('Error parsing game results:', error);
        // Redirect to lobby if no valid results
        navigate('/app/lobby');
        return;
      }
    } else {
      console.log('No game results found, redirecting to lobby');
      // Redirect to lobby if no results
      navigate('/app/lobby');
      return;
    }
    setLoading(false);
  }, [navigate]);

  const handleBackToLobby = () => {
    // Clear the stored results
    sessionStorage.removeItem('fishGameResults');
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

  // Determine team composition and results
  const teams = {};
  const teamScores = {};

  // Group players by team
  users.forEach(userId => {
    const teamNumber = gameState?.player_status?.[userId];
    if (teamNumber) {
      if (!teams[teamNumber]) {
        teams[teamNumber] = [];
        teamScores[teamNumber] = 0;
      }
      teams[teamNumber].push(userId);
    }
  });

  // Calculate team scores based on half-suit ownership
  const suits1Cards = gameState?.owners?.["suits_1"]?.cards || [];
  const suits2Cards = gameState?.owners?.["suits_2"]?.cards || [];
  
  // Convert cards to half suits to count claimed half-suits
  const cardsToHalfSuit = (cards) => {
    if (!cards || !Array.isArray(cards)) return new Set();
    return new Set(cards.map(card => {
      if (card.rank === 0 || card.rank === 8) {
        return 8; // MIDDLE
      }
      return (card.rank > 8 || card.rank === 1) * 4 + card.suit - 1;
    }));
  };

  const team1HalfSuits = cardsToHalfSuit(suits1Cards);
  const team2HalfSuits = cardsToHalfSuit(suits2Cards);

  teamScores[1] = team1HalfSuits.size;
  teamScores[2] = team2HalfSuits.size;

  // Determine winning team(s)
  const maxScore = Math.max(...Object.values(teamScores));
  const winningTeams = Object.keys(teamScores).filter(team => teamScores[team] === maxScore);

  // Render team color helper
  const getTeamColor = (teamNumber) => {
    if (teamNumber === 1) return '#3b82f6'; // Blue
    if (teamNumber === 2) return '#ef4444'; // Red
    if (teamNumber === 3) return '#10b981'; // Green
    return '#6b7280'; // Gray fallback
  };

  // Render half-suit ownership display
  const renderHalfSuitOwnership = () => {
    const claims = [0,0,0,0,0,0,0,0,0]; // Initialize all as unclaimed
    
    // Mark half-suits as claimed by teams
    for (let i = 0; i < 9; i++) {
      if (team1HalfSuits.has(i)) {
        claims[i] = 1;
      } else if (team2HalfSuits.has(i)) {
        claims[i] = 2;
      }
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{
          color: '#FFD700',
          fontSize: '2rem',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '1rem',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}>
          🏆 FINAL HALF-SUIT OWNERSHIP 🏆
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.8rem',
          maxWidth: '800px'
        }}>
          {halfSuitNames.map((name, index) => {
            let backgroundColor = '#444'; // Unclaimed
            let textColor = '#FFF';
            let claimText = 'UNCLAIMED';
            
            if (claims[index] === 1) {
              backgroundColor = getTeamColor(1);
              claimText = 'TEAM 1';
            } else if (claims[index] === 2) {
              backgroundColor = getTeamColor(2);
              claimText = 'TEAM 2';
            }

            return (
              <div key={index} style={{
                padding: '1rem',
                backgroundColor,
                color: textColor,
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '1rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                  {name}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  {claimText}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 'bold',
          color: '#FFD700',
          textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
          marginBottom: '0.5rem'
        }}>
          🃏 FISH GAME COMPLETE! 🃏
        </h1>
        <div style={{
          fontSize: '1.5rem',
          color: '#FFF',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}>
          {gameName || `Game ID: ${gameResults.gameId}`}
        </div>
      </div>

      {/* Half-suit ownership display */}
      {renderHalfSuitOwnership()}

      {/* Team Results */}
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
          🏅 FINAL RESULTS 🏅
        </h2>

        {Object.keys(teams).map(teamNumber => {
          const isWinning = winningTeams.includes(teamNumber);
          const teamColor = getTeamColor(parseInt(teamNumber));
          
          return (
            <div key={teamNumber} style={{
              backgroundColor: isWinning ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: `3px solid ${isWinning ? '#FFD700' : teamColor}`,
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              position: 'relative',
              boxShadow: isWinning ? '0 0 20px rgba(255, 215, 0, 0.5)' : '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              {isWinning && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#FFD700',
                  color: '#000',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                }}>
                  🏆 WINNERS! 🏆
                </div>
              )}
              
              <h3 style={{
                color: teamColor,
                fontSize: '2rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                marginTop: isWinning ? '1rem' : '0'
              }}>
                Team #{teamNumber}
              </h3>
              
              <div style={{
                fontSize: '1.5rem',
                marginBottom: '1rem',
                color: '#FFF'
              }}>
                Half-suits Claimed: <span style={{ color: teamColor, fontWeight: 'bold' }}>
                  {teamScores[teamNumber]} / 9
                </span>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <h4 style={{
                  color: '#FFD700',
                  fontSize: '1.3rem',
                  marginBottom: '0.5rem'
                }}>
                  Team Members:
                </h4>
                {teams[teamNumber].map(userId => {
                  const playerName = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;
                  return (
                    <div key={userId} style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      fontSize: '1.1rem',
                      fontWeight: 'bold'
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

export default FishWinScreen; 