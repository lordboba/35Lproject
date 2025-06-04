import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { API_BASE_URL, getWebSocketURL } from '../config';

// Half suit enum constants
const HalfSuit = {
  MIDDLE: 8,
  SPADES_LOW: 3,
  HEARTS_LOW: 2, 
  DIAMONDS_LOW: 1,
  CLUBS_LOW: 0,
  SPADES_HIGH: 7,
  HEARTS_HIGH: 6,
  DIAMONDS_HIGH: 5,
  CLUBS_HIGH: 4
};

function cardClicked(cardname, selectedCards, setSelectedCards) {
    console.log(cardname + " clicked");
    
    // For Fish game questions, only allow selecting one card at a time
    if (selectedCards.includes(cardname)) {
      // Remove card from selection
      setSelectedCards([]);
    } else {
      // Replace any existing selection with this card
      setSelectedCards([cardname]);
    }
  }
  
  function otherPlayer(userId, userDetails, moving = false, cardCount = 13, isCurrentUser = false, playerStatus = null) {
    const username = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;
    
    // Determine what status text to show based on player status
    let statusText = '';
    let statusColor = '#FF6B6B'; // Default red color
    let isFinished = false;
    
    if (playerStatus === -1) {
      statusText = 'CLAIMING';
      statusColor = '#FF6B6B';
    } else if (playerStatus === 1) {
      statusText = 'Team #1';
      statusColor = '#3b82f6'; // Blue for team 1
    } else if (playerStatus === 2) {
      statusText = 'Team #2';
      statusColor = '#ef4444'; // Red for team 2
    } else if (playerStatus === 3) {
      statusText = 'Team #3';
      statusColor = '#10b981'; // Green for team 3
    }
    
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}>
        {/* Username label above cards */}
        <div style={{
          color: isCurrentUser ? '#FFD700' : '#FFF', // Gold color for current user
          fontSize: '1.2vw',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '0.5vh',
          minHeight: '2vh',
          textShadow: isCurrentUser ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none', // Shadow for current user
          border: isCurrentUser ? '2px solid #FFD700' : 'none', // Border for current user
          borderRadius: isCurrentUser ? '8px' : '0',
          padding: isCurrentUser ? '4px 8px' : '0',
          backgroundColor: isCurrentUser ? 'rgba(255, 215, 0, 0.2)' : 'transparent', // Semi-transparent background
        }}>
          {username}
          {statusText && (
            <div style={{
              color: statusColor,
              fontSize: '0.9vw',
              fontWeight: 'bold',
              marginTop: '2px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            }}>
              {statusText}
            </div>
          )}
        </div>
        
        <img
          src={"/backicon.svg"}
          alt="card back"
          style={{
            width: '15vw',
            height: '15vh',
            display: 'block',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '60%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '4vh',
            fontWeight: 'bold',
            pointerEvents: 'none',
          }}
        >
          {cardCount}
        </span>
  
        {moving && (
          <div style={{
            width: '80%',
            color: '#00FF00',
            fontSize: '1.2vw',
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: '0.5vh',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
            borderRadius: '8px',
            padding: '2px 6px',
            border: '2px solid #00FF00',
          }}>
            CURRENT TURN
          </div>
        )}
      </div>
    );
  }
  function getAllPlayers(users, userDetails, gameState, currentUserId) {
    if (!users || users.length === 0 || !gameState) {
      return <div style={{color: '#FFF'}}>Loading players...</div>;
    }
    
    // Show ALL players (including current user)
    let players = [];
    users.forEach((userId, index) => {
      const isCurrentPlayer = gameState?.current_player === userId;
      const cardCount = gameState?.owners?.[userId]?.cards?.length || 0;
      const isCurrentUser = userId === currentUserId;
      const playerStatus = gameState?.player_status?.[userId] || null;
      players.push(otherPlayer(userId, userDetails, isCurrentPlayer, cardCount, isCurrentUser, playerStatus));
    });
    
    return (
      <div style={{
        maxWidth: '95%',
        display: 'flex',
        flexDirection: 'row',
        gap: '0%',
        alignItems: 'center',
        overflowX: 'scroll',
        scrollbarWidth: 'thin',
        msOverflowStyle: 'auto'
      }}>
        {players}
      </div>
    );
  }

  function currentPlayerCards(cards) {
    let cardlist = [];
    cards.forEach(cardname => {
      cardlist.push(
        <img 
          key={cardname}
          src={`/${cardname}icon.svg`}
          style={{
            width: "5.5%",
            display: "flex", 
            gap: "0px",
            border: "2px solid rgba(255, 255, 255, 0.3)", // Subtle border for definition
            borderRadius: "8px",
            transition: "all 0.2s ease-in-out", // Smooth animation for hover
            opacity: 0.9,
          }} 
          alt={cardname}
        />
      );
    });
    return (
      <div style={{
        maxWidth: '95%',
        display: 'inline-flex',
        gap: '0.5vw',
        alignItems: 'center',
        overflowX: 'auto',
        scrollbarWidth: 'thin',
        msOverflowStyle: 'auto',
        justifyContent: 'center',
        paddingTop: '10px',
        paddingBottom: '10px',
      }}>
        <div style={{
          color: '#FFF',
          fontSize: '1.4vw',
          fontWeight: 'bold',
          textAlign: 'center',
          marginRight: '15px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          minWidth: 'fit-content',
        }}>
          Your Hand:
        </div>
        {cardlist}
      </div>
    );
  }

  // Function to display current player's cards as question options
  function questionOptionsFromCards(cardStrings, selectedCards, setSelectedCards) {
    /*
    console.log('questionOptionsFromCards called with:', {
      cardStrings,
      selectedCards
    });*/

    if (!cardStrings || !Array.isArray(cardStrings) || cardStrings.length === 0) {
      console.log('questionOptionsFromCards returning null - no valid cards');
      return null;
    }

    let optionCards = [];
    
    cardStrings.forEach(cardname => {
      const isSelected = selectedCards.includes(cardname);
      optionCards.push(
        <img 
          key={`option-${cardname}`}
          src={`/${cardname}icon.svg`}
          style={{
            width: "4%",
            display: "flex", 
            cursor: "pointer",
            border: isSelected ? "3px solid #00FF00" : "3px solid #FFD700", // Green when selected, gold border normally
            borderRadius: "8px",
            transform: isSelected ? "translateY(-15px) scale(1.1)" : "translateY(0px)", // Move up and scale when selected
            transition: "all 0.3s ease-in-out", // Smooth animation
            boxShadow: isSelected ? "0 6px 12px rgba(0, 255, 0, 0.4)" : "0 2px 6px rgba(255, 215, 0, 0.3)", // Green/gold shadow
            opacity: isSelected ? 1 : 0.9,
          }} 
          alt={cardname} 
          onClick={() => cardClicked(cardname, selectedCards, setSelectedCards)} 
        />
      );
    });
    /*
    console.log('questionOptionsFromCards rendering with', optionCards.length, 'cards');*/

    return (
      <div style={{
        width: '100%',
        padding: '25px 15px 15px 15px', // Extra top padding for cards that move up
        backgroundColor: 'rgba(255, 215, 0, 0.15)', // Light gold background
        borderRadius: '12px',
        border: '2px solid #FFD700',
        marginBottom: '20px',
      }}>
        <div style={{
          color: '#FFD700',
          fontSize: '1.8vw',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '15px', // More space before cards
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        }}>
          Select a Card to Ask About
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'flex-end', // Align to bottom so cards can move up
          justifyContent: 'center',
          maxHeight: '30vh', // Increased height
          overflowY: 'auto',
          paddingTop: '20px', // Extra padding at top for movement
          paddingBottom: '10px',
        }}>
          {optionCards}
        </div>
        <div style={{
          color: '#FFF',
          fontSize: '1.2vw',
          textAlign: 'center',
          marginTop: '8px',
          fontStyle: 'italic',
        }}>
          You may only ask for cards from half-suits you already have at least one card from
        </div>
      </div>
    );
  }

  // Function to display selectable players for asking questions
  function playerSelectionForQuestions(users, userDetails, currentUserId, selectedPlayerToAsk, setSelectedPlayerToAsk, gameState) {
    if (!users || users.length === 0 || !gameState) {
      return null;
    }
    
    // Get current player's team
    const currentPlayerTeam = gameState?.player_status?.[currentUserId];
    
    // Filter out the current user and teammates - only show opponents
    const opponents = users.filter(userId => {
      if (userId === currentUserId) return false; // Can't ask yourself
      
      const playerTeam = gameState?.player_status?.[userId];
      // Only include players on different teams (opponents)
      return playerTeam && playerTeam !== currentPlayerTeam;
    });
    
    if (opponents.length === 0) {
      return (
        <div style={{
          width: '100%',
          padding: '20px 15px',
          backgroundColor: 'rgba(255, 193, 7, 0.15)', // Light yellow background
          borderRadius: '12px',
          border: '2px solid #FFC107',
          marginBottom: '20px',
        }}>
          <div style={{
            color: '#FFC107',
            fontSize: '1.6vw',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          }}>
            No opponents available to ask
          </div>
        </div>
      );
    }

    return (
      <div style={{
        width: '100%',
        padding: '20px 15px',
        backgroundColor: 'rgba(0, 123, 255, 0.15)', // Light blue background
        borderRadius: '12px',
        border: '2px solid #007BFF',
        marginBottom: '20px',
      }}>
        <div style={{
          color: '#007BFF',
          fontSize: '1.8vw',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '15px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        }}>
          Select an Opponent to Ask
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {opponents.map(userId => {
            const username = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;
            const playerTeam = gameState?.player_status?.[userId];
            const isSelected = selectedPlayerToAsk === userId;
            
            // Get team color
            let teamColor = '#007BFF'; // Default blue
            if (playerTeam === 1) teamColor = '#3b82f6'; // Blue for team 1
            else if (playerTeam === 2) teamColor = '#ef4444'; // Red for team 2
            else if (playerTeam === 3) teamColor = '#10b981'; // Green for team 3
            
            return (
              <button
                key={`player-select-${userId}`}
                style={{
                  padding: '12px 20px',
                  fontSize: '1.4vw',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: isSelected ? '3px solid #00FF00' : `3px solid ${teamColor}`,
                  background: isSelected ? '#00FF00' : teamColor,
                  color: isSelected ? '#000' : '#FFF',
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: isSelected ? '0 4px 8px rgba(0, 255, 0, 0.4)' : `0 2px 6px ${teamColor}33`,
                  minWidth: '120px',
                }}
                onClick={() => {
                  if (selectedPlayerToAsk === userId) {
                    setSelectedPlayerToAsk(null); // Deselect if already selected
                  } else {
                    setSelectedPlayerToAsk(userId); // Select this player
                  }
                }}
              >
                {username}
                <div style={{ fontSize: '0.8em', marginTop: '2px' }}>
                  Team #{playerTeam}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{
          color: '#FFF',
          fontSize: '1.2vw',
          textAlign: 'center',
          marginTop: '12px',
          fontStyle: 'italic',
        }}>
          Choose an opponent (different team) to ask about your selected card
        </div>
      </div>
    );
  }

  function playerSelectionForDelegation(users, userDetails, currentUserId, selectedTeammate, setSelectedTeammate, gameState) {
    if (!users || users.length === 0 || !gameState) return null;
  
    const currentTeam = gameState.player_status?.[currentUserId];
    const teammates = users.filter(id => id !== currentUserId && gameState.player_status?.[id] === currentTeam);
  
    if (teammates.length === 0) return null;
  
    return (
      <div style={{ marginTop: '2vh', padding: '20px', backgroundColor: 'rgba(0,255,255,0.1)', borderRadius: '10px', border: '2px solid cyan' }}>
        <div style={{ color: 'cyan', fontSize: '1.8vw', textAlign: 'center', fontWeight: 'bold' }}>
          Select a Teammate to Delegate Your Turn
        </div>
        <div style={{ display: 'flex', gap: '1vw', justifyContent: 'center', marginTop: '10px' }}>
          {teammates.map(id => (
            <button
              key={id}
              onClick={() => setSelectedTeammate(prev => prev === id ? null : id)}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '2px solid cyan',
                backgroundColor: selectedTeammate === id ? 'cyan' : 'transparent',
                color: selectedTeammate === id ? 'black' : 'white',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {userDetails[id]?.name || `Player ${id.slice(-4)}`}
            </button>
          ))}
        </div>
      </div>
    );
  }  

  // Function to display claim assignment interface when gameState.status = 2
  const renderClaimAssignmentInterface = () => {
    if (!gameState || gameState?.status !== 2) {
      return null;
    }
    
    const currentUserId = getCurrentUserId();
    
    // Get unclaimed cards that need to be assigned
    const unclaimedCards = gameState?.owners?.options?.cards || [];
    const unclaimedCardStrings = unclaimedCards.map(card => convertCardToString(card));
    
    // Check if all cards have been assigned
    const unassignedCards = unclaimedCardStrings.filter(cardString => !claimAssignments[cardString]);
    if (unassignedCards.length > 0) {
      alert(`Please assign all cards before submitting claim. Unassigned cards: ${unassignedCards.join(', ')}`);
      return;
    }
    
    // Get current player's team number
    const currentPlayerTeam = gameState?.player_status?.[currentUserId];
    if (!currentPlayerTeam) {
      alert("Error: Cannot determine your team number. Please refresh the page and try again.");
      return;
    }
    
    return (
      <div style={{
        width: '100%',
        padding: '25px',
        backgroundColor: 'rgba(255, 0, 0, 0.15)', // Light red background for claims
        borderRadius: '12px',
        border: '3px solid #FF0000',
        marginBottom: '20px',
      }}>
        <div style={{
          color: '#FF0000',
          fontSize: '2.2vw',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '15px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        }}>
          Making Claim - Assign Cards To Teammates
        </div>
        
        <div style={{
          color: '#FFF',
          fontSize: '1.4vw',
          textAlign: 'center',
          marginBottom: '20px',
          fontStyle: 'italic',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        }}>
          Assign each unclaimed card to one of your teammates:
        </div>
        
        {/* Cards in horizontal row with dropdowns */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '20px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}>
          {unclaimedCardStrings.map(cardString => {
            const assignedPlayer = claimAssignments[cardString];
            // Include current user + teammates in dropdown options
            const allTeamOptions = [currentUserId, ...teammates];
            
            return (
              <div key={`claim-${cardString}`} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}>
                {/* Card display */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}>
                  <img 
                    src={`/${cardString}icon.svg`}
                    style={{
                      width: '80px',
                      height: '120px',
                      border: '2px solid #FFD700',
                      borderRadius: '8px',
                      marginBottom: '8px',
                    }} 
                    alt={cardString}
                  />
                  <span style={{
                    color: '#FFD700',
                    fontSize: '1.2vw',
                    fontWeight: 'bold',
                    textAlign: 'center',
                  }}>
                    {cardString}
                  </span>
                </div>
                
                {/* Dropdown selector */}
                <select
                  value={assignedPlayer || ''}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    setClaimAssignments(prev => ({
                      ...prev,
                      [cardString]: selectedValue || null
                    }));
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: '1.1vw',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: assignedPlayer ? '2px solid #00FF00' : '2px solid #FFD700',
                    background: assignedPlayer ? '#e6ffe6' : '#fff',
                    color: '#000',
                    cursor: 'pointer',
                    minWidth: '120px',
                    textAlign: 'center',
                  }}
                >
                  <option value="" style={{ color: '#666' }}>
                    Select Player
                  </option>
                  {allTeamOptions.map(userId => {
                    const username = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;
                    const playerTeam = gameState?.player_status?.[userId];
                    const isCurrentUser = userId === currentUserId;
                    
                    return (
                      <option key={userId} value={userId}>
                        {username} {isCurrentUser ? '(You)' : `(Team #${playerTeam})`}
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

function getClaimsArray(suits_1,suits_2){
  let claims = [0,0,0,0,0,0,0,0,0]
  
  // Handle undefined/null cases with default empty arrays
  const safeCards1 = suits_1 || [];
  const safeCards2 = suits_2 || [];
  
  // Convert card arrays to half suit sets
  const halfSuits1 = cardsToHalfSuit(safeCards1);
  const halfSuits2 = cardsToHalfSuit(safeCards2);
  
  for (let i = 0; i < 9; i++){
    if (halfSuits1.has(i)) {
      claims[i] = 1;
    } else if (halfSuits2.has(i)) {
      claims[i] = 2;
    }
  }
  return claims;
}

function cardToHalfSuit(card) {
  if (card.rank === 0 || card.rank === 8) {
    return HalfSuit.MIDDLE;
  }
  return (card.rank > 8 || card.rank === 1) * 4 + card.suit - 1;
}

function cardsToHalfSuit(cards) {
  // Handle undefined/null cases
  if (!cards || !Array.isArray(cards)) {
    return new Set();
  }
  return new Set(cards.map(card => cardToHalfSuit(card)));
}

function claimButtons(claims, handleInitiateClaim) {
  let names = ["♠ 2-7", "♥ 2-7", "♦ 2-7", "♣ 2-7", "8 & Joker", "♠ 9-A", "♥ 9-A", "♦ 9-A", "♣ 9-A"]
  
  // Function to render button text with colored suits
  const renderButtonText = (name, index) => {
    if (index === 4) {
      // Special styling for "8 & Joker"
      return (
        <span style={{ 
          fontSize: '1.3vw', 
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          8's & Jokers
        </span>
      );
    }
    
    // For other suits, color hearts and diamonds red
    if (name.includes('♥') || name.includes('♦')) {
      const parts = name.split(' ');
      return (
        <span>
          <span style={{ color: '#DC143C' }}>{parts[0]}</span> {parts[1]}
        </span>
      );
    } else {
      return name;
    }
  };

  return (
    <div style={{
      maxWidth: '80%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1vw',
    }}>
      {/* Header for claims section */}
      <div style={{
        color: '#FFD700',
        fontSize: '2.2vw',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '0.5vw',
        textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
        background: 'rgba(255, 215, 0, 0.1)',
        padding: '8px 16px',
        borderRadius: '12px',
        border: '2px solid #FFD700',
      }}>
         HALF-SUIT CLAIMS 
      </div>
      
      {/* Instructional text */}
      <div style={{
        color: '#FFF',
        fontSize: '1.3vw',
        textAlign: 'center',
        marginBottom: '1vw',
        fontStyle: 'italic',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '6px 12px',
        borderRadius: '8px',
      }}>
        Click any unclaimed half-suit to initiate a claim
      </div>
      
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: '1vw',
        width: '100%',
      }}>
        {Array.from({ length: 4 }).map((_, i) => {
          let style = {
            width: '13vw',
            height: '5vw',
            fontSize: '1.5vw',
            fontWeight: 'bold',
            borderRadius: '8px',
            border: '2px solid #333',
            background: '#fff',
            color: '#222',
            cursor: claims[i] === 0 ? 'pointer' : 'not-allowed',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            transition: 'background 0.2s',
          };
          if (claims[i] === 1) {
            style.background = '#3b82f6'; // blue for team 1
            style.color = '#fff';
          } else if (claims[i] === 2) {
            style.background = '#ef4444'; // red for team 2
            style.color = '#fff';
          }
          return (
            <button
              key={i}
              style={style}
              disabled={claims[i] !== 0}
              onClick={() => handleInitiateClaim(i)}
            >
              {renderButtonText(names[i], i)}
            </button>
          );
        })}
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: '1vw',
        width: '100%',
        marginTop: '1vw',
      }}>
        {Array.from({ length: 5 }).map((_, j) => {
          let i = j + 4; // This should be j + 4, not j + 5 to get the correct indices
          let style = {
            width: '13vw',
            height: '5vw',
            fontSize: '1.5vw',
            fontWeight: 'bold',
            borderRadius: '8px',
            border: '2px solid #333',
            background: '#fff',
            color: '#222',
            cursor: claims[i] === 0 ? 'pointer' : 'not-allowed',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            transition: 'background 0.2s',
          };
          
          if (claims[i] === 1) {
            style.background = '#3b82f6'; // blue for team 1
            style.color = '#fff';
          } else if (claims[i] === 2) {
            style.background = '#ef4444'; // red for team 2
            style.color = '#fff';
          }
          return (
            <button
              key={i}
              style={style}
              disabled={claims[i] !== 0}
              onClick={() => handleInitiateClaim(i)}
            >
              {renderButtonText(names[i], i)}
            </button>
          );
        })}
      </div>
      
      {/* Warning text at bottom */}
      <div style={{
        color: '#FF6B6B',
        fontSize: '1.1vw',
        textAlign: 'center',
        marginTop: '0.5vw',
        fontWeight: 'bold',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        background: 'rgba(255, 107, 107, 0.1)',
        padding: '4px 8px',
        borderRadius: '6px',
        border: '1px solid #FF6B6B',
      }}>
         Warning: Failed claims give the opposing team that half-suit!
      </div>
    </div>
  );
}

function FishGameScreen() {
    const location = useLocation();
    const { backendUser } = useOutletContext();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [gameId, setGameId] = useState(null);
    const [gameName, setGameName] = useState('');
    const [websocket, setWebsocket] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [users, setUsers] = useState([]);
    const [userDetails, setUserDetails] = useState({});
    
    // Card selection state - modified to only allow one card for questions
    const [selectedCards, setSelectedCards] = useState([]);
    
    // Add state for selected player to ask
    const [selectedPlayerToAsk, setSelectedPlayerToAsk] = useState(null);
    
    // Add state for claim assignments - maps card to player
    const [claimAssignments, setClaimAssignments] = useState({});
    
    // Add state for claim processing
    const [isProcessingClaim, setIsProcessingClaim] = useState(false);
    
    // Add state for game end handling
    const [gameEnded, setGameEnded] = useState(false);

    // Add state for delegation handling
    const [selectedTeammate, setSelectedTeammate] = useState(null);
    
    const [games, setGames] = useState([]);
    // Remove hardcoded lastPlayedCards - will get from gameState instead
  
    // Card conversion functions - moved to top for availability
    const convertCardToString = (card) => {
        const ranks = ['','A','2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
        const suits = ['','C', 'D', 'H', 'S']; // Clubs, Diamonds, Hearts, Spades
        if (card.rank == 0) {
            if (card.suit == 1 || card.suit == 4) {
                return "JB"
            } else if (card.suit == 2 || card.suit == 3) {
                return "JR"
            }
        }
        const rank = ranks[card.rank] || card.rank;
        const suit = suits[card.suit] || card.suit;
        
        return `${rank}${suit}`;
      };
      
      // Function to convert frontend card format to backend format
      const convertStringToCard = (cardString) => {
        const ranks = ['','A','2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
        const suits = ['','C', 'D', 'H', 'S']; // Clubs, Diamonds, Hearts, Spades
        
        const rank = cardString.slice(0, -1); // All but last character
        const suit = cardString.slice(-1); // Last character
        if (suit == "B" ) {
            return {
                rank: 0,
                suit: 1
            };
        }
        else if (suit == "R") {
            return {
                rank: 0,
                suit: 2
            };
        }
        
        return {
          rank: ranks.indexOf(rank),
          suit: suits.indexOf(suit)
        };
      };

    // Get the current Firebase user
    useEffect(() => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setCurrentUser(user);
      });
      
      return () => unsubscribe();
    }, []);
    
    // Get the game ID from URL parameters and fetch game details
    useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const id = searchParams.get('id');
      if (id) {
        setGameId(id);
        
        // Fetch game details to get the name
        const fetchGameDetails = async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/games/${id}`);
            if (response.ok) {
              const gameData = await response.json();
              setGameName(gameData.name || '');
            }
          } catch (error) {
            console.error('Error fetching game details:', error);
          }
        };
        
        fetchGameDetails();
      }
    }, [location]);

    // Detect claim results when game state changes
    useEffect(() => {
      if (!gameState) return;
      
      // If we were processing a claim and now we're back to normal status
      if (isProcessingClaim && gameState.status === 0) {
        console.log('Claim processing completed, game returned to normal status');
        setIsProcessingClaim(false);
      }
      
      // Check for recent claim results in last_turn if available
      if (gameState.last_turn && gameState.last_turn.type === 1) {
        const lastTurn = gameState.last_turn;
        console.log('Recent claim detected in last_turn:', lastTurn);
        
        // Check if this was a recent claim by the current user
        const currentUserId = getCurrentUserId();
        if (lastTurn.player === currentUserId && lastTurn.success !== undefined) {
          // Show detailed claim result notification
          const claimResult = lastTurn.success ? 'SUCCESSFUL' : 'FAILED';
          const claimColor = lastTurn.success ? '#00FF00' : '#FF0000';
          
          console.log(`Your recent claim was ${claimResult}:`, lastTurn);
          
          // You could add a toast notification here instead of alert
          // For now, we'll log it for debugging
        }
      }
      
      // Check if game has ended
      if (gameState.status === 1 && !gameEnded) {
        console.log('=== GAME END DETECTED ===');
        console.log('Game has ended! Final status:', gameState);
        console.log('Current user details:', userDetails);
        console.log('All users:', users);
        console.log('Game ID:', gameId);
        console.log('=== END GAME END DEBUG ===');
        
        setGameEnded(true);
        
        // Navigate to win page with game results
        const gameResults = {
          gameState: gameState,
          userDetails: userDetails,
          users: users,
          gameId: gameId,
          gameName: gameName
        };
        
        console.log('Storing game results:', gameResults);
        
        // Store results in sessionStorage for the win page
        sessionStorage.setItem('fishGameResults', JSON.stringify(gameResults));
        
        // Navigate to win page
        console.log('Navigating to fish-win page...');
        navigate(`/app/fish-win`);
      }
    }, [gameState, isProcessingClaim, gameEnded, navigate, userDetails, users, gameId, gameName]);

    // Get current user's backend ID
    const getCurrentUserId = () => {
      if (backendUser && backendUser.id) {
        return backendUser.id;
      }
      return null;
    };

    // Get current user's cards from game state
    const getCurrentUserCards = () => {
      const currentUserId = getCurrentUserId();
      if (!gameState || !gameState.owners || !currentUserId) {
        return [];
      }
      
      const userCards = gameState.owners[currentUserId]?.cards || [];
      return userCards.map(card => convertCardToString(card));
    };

    // Function to fetch user details by ID
    const fetchUserDetails = async (userId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        if (response.ok) {
          const userData = await response.json();
          return userData;
        } else {
          console.error(`Failed to fetch user details for ${userId}`);
          return null;
        }
      } catch (error) {
        console.error(`Error fetching user details for ${userId}:`, error);
        return null;
      }
    };
    
    // Function to fetch multiple user details
    const fetchAllUserDetails = async (userIds) => {
      const newUserDetails = { ...userDetails };
      
      // Only fetch details for users we don't already have
      const usersToFetch = userIds.filter(userId => !newUserDetails[userId]);
      
      if (usersToFetch.length === 0) return;
      
      const fetchPromises = usersToFetch.map(async (userId) => {
        const userData = await fetchUserDetails(userId);
        if (userData) {
          newUserDetails[userId] = userData;
        }
        return userData;
      });
      
      await Promise.all(fetchPromises);
      setUserDetails(newUserDetails);
    };

    // Set up WebSocket connection for game state
    useEffect(() => {
      if (!gameId || !currentUser) return;
      
      // Create WebSocket connection for Fish game
      const wsUrl = getWebSocketURL(`/game/ws/${gameId}`);
      console.log('Connecting to Fish game WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Fish game WebSocket connection established');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        /*console.log('Received Fish game state:', data);*/
        setGameState(data);
        
        // Extract users from game state if available
        if (data.owners) {
          const playerIds = Object.keys(data.owners).filter(id => 
            id !== 'suits_1' && 
            id !== 'suits_2' && 
            id !== 'options' && 
            data.owners[id].cards
          );
          setUsers(playerIds);
          fetchAllUserDetails(playerIds);
        }
      };
      
      ws.onerror = (error) => {
        console.error('Fish game WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('Fish game WebSocket connection closed');
      };
      
      setWebsocket(ws);
      
      // Clean up the WebSocket connection when the component unmounts
      return () => {
        if (ws) {
          ws.close();
        }
      };
    }, [gameId, currentUser]);
   

    // Function to generate turn model for asking questions (turn_type = 0)
    const generateQuestionTurnModel = (selectedCard, playerToAsk) => {
      const currentUserId = getCurrentUserId();
      if (!currentUserId || !selectedCard || !playerToAsk) {
        return null;
      }
      /*
      console.log('generateQuestionTurnModel params:', {
        selectedCard,
        playerToAsk: playerToAsk,
        playerToAskType: typeof playerToAsk,
        currentUserId: currentUserId,
        currentUserIdType: typeof currentUserId
      });*/
      
      // For asking questions: sender = player being asked, receiver = current player
      const transaction = {
        sender: playerToAsk,
        receiver: currentUserId,
        card: convertStringToCard(selectedCard), // Keep as card object for questions
        success: true
      };
      
      const turnModel = {
        type: 0, // 0 = asking questions
        player: currentUserId,
        transactions: [transaction]
      };
      
      console.log('Generated Fish question turn model:', turnModel);
      return turnModel;
    };

    // Function to handle asking a question
    const handleAskQuestion = async () => {
      // Debug: Print entire game state when ask button is pressed
      /*console.log('=== ASK BUTTON PRESSED - FULL GAME STATE ===');
      console.log('Game State:', JSON.stringify(gameState, null, 2));
      console.log('=== END GAME STATE DEBUG ===');*/
      
      if (selectedCards.length !== 1) {
        alert("Please select exactly one card to ask about!");
        return;
      }
      
      if (!selectedPlayerToAsk) {
        alert("Please select a player to ask!");
        return;
      }
      
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        alert("User not authenticated!");
        return;
      }
      
      // Check if it's the current user's turn
      if (gameState?.current_player !== currentUserId) {
        alert("It's not your turn!");
        return;
      }
      
      const turnModel = generateQuestionTurnModel(selectedCards[0], selectedPlayerToAsk);
      if (!turnModel) {
        alert("Failed to generate question!");
        return;
      }
      
      console.log('Sending Fish question to API:', {
        endpoint: `${API_BASE_URL}/games/${gameId}/play`,
        method: 'PATCH',
        data: turnModel
      });
      
      try {
        const response = await fetch(`${API_BASE_URL}/games/${gameId}/play`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(turnModel)
        });
        
        if (response.ok) {
          // Clear selections on successful question
          setSelectedCards([]);
          setSelectedPlayerToAsk(null);
          console.log("Question asked successfully!");
        } else {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          alert(`Failed to ask question: ${errorData.detail || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error asking question:', error);
        alert('Failed to ask question. Please try again.');
      }
    };

    // Function to handle initiating a claim
    const handleInitiateClaim = async (halfSuitIndex) => {
      const halfSuitNames = ["♠ 2-7", "♥ 2-7", "♦ 2-7", "♣ 2-7", "8 & Joker", "♠ 9-A", "♥ 9-A", "♦ 9-A", "♣ 9-A"];
      
      // Example cards for each half suit (required by backend for claim initiation)
      const halfSuitEx = [
        "2C", // ♠ 2-7
        "2D", // ♥ 2-7
        "2H", // ♦ 2-7
        "2S", // ♣ 2-7
        "9C", // ♠ 9-A
        "9D", // ♥ 9-A
        "9H", // ♦ 9-A
        "9S",  // ♣ 9-A
        "8S" // 8 & Joker (using 8 of Spades as example)
      ];
      
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        alert("User not authenticated!");
        return;
      }
      
      // Debug: Log current game state and user info
      console.log('=== CLAIM INITIATION DEBUG ===');
      console.log('Current User ID:', currentUserId);
      console.log('Current Player:', gameState?.current_player);
      console.log('Game Status:', gameState?.status);
      console.log('Is Current Player Turn:', gameState?.current_player === currentUserId);
      console.log('Half Suit Index:', halfSuitIndex);
      console.log('Example Card for Half Suit:', halfSuitEx[halfSuitIndex]);
      console.log('Full Game State:', JSON.stringify(gameState, null, 2));
      console.log('=== END DEBUG ===');
      
      // Check if it's the current user's turn
      // Claims can be initiated at any time, not just during your turn
      // if (gameState?.current_player !== currentUserId) {
      //   alert("It's not your turn! Cannot initiate claim.");
      //   return;
      // }
      
      // Check game status
      if (gameState?.status !== 0) {
        alert(`Cannot initiate claim. Game status is ${gameState?.status} (expected 0 for normal play)`);
        return;
      }
      
      // Confirm the claim with user
      const confirmMessage = `Are you sure you want to initiate a claim for ${halfSuitNames[halfSuitIndex]}?\n\nRemember: Failed claims give the opposing team that half-suit automatically!`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
      
      // Create turn model for initiating claim (turn_type = 1, with example card from half suit)
      const exampleCard = halfSuitEx[halfSuitIndex];
      
      // Create transaction model with sample card (other fields don't matter for claim initiation)
      const transaction = {
        sender: currentUserId,
        receiver: currentUserId,
        card: convertStringToCard(exampleCard),
        success: true
      };
      
      const turnModel = {
        type: 1, // 1 = initiating claim
        player: currentUserId,
        transactions: [transaction] // Array with transaction model containing sample card
      };
      
      console.log('Initiating claim for half-suit:', halfSuitNames[halfSuitIndex]);
      console.log('Using example card:', exampleCard);
      console.log('Sending claim initiation to API:', {
        endpoint: `${API_BASE_URL}/games/${gameId}/play`,
        method: 'PATCH',
        data: turnModel
      });
      
      try {
        const response = await fetch(`${API_BASE_URL}/games/${gameId}/play`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(turnModel)
        });
        
        console.log('Claim response status:', response.status);
        console.log('Claim response ok:', response.ok);
        console.log('Claim response headers:', response.headers);
        
        let responseData = null;
        let responseText = '';
        
        try {
          // Read the response text first
          responseText = await response.text();
          console.log('Raw response text:', responseText);
          
          // Only try to parse as JSON if there's content
          if (responseText) {
            try {
              responseData = JSON.parse(responseText);
              console.log('Parsed response data:', responseData);
            } catch (jsonError) {
              console.log('Response was not valid JSON:', jsonError);
              // Not a JSON parsing error - just means response wasn't JSON
            }
          }
          
          // If response is ok, treat as success regardless of JSON parsing
          if (response.ok) {
            console.log("Claim submitted successfully!");
            setClaimAssignments({});
            
            // Show success message based on parsed data if available
            if (responseData && responseData.success !== undefined) {
              if (responseData.success) {
                alert("Claim Successful! Your team now owns this half-suit!");
              } else {
                alert("Claim Failed! The opposing team now owns this half-suit.");
              }
            } else {
              alert("Claim submitted! Check the game state for results.");
            }
            return;
          }
          
          // Handle error cases
          console.error('Claim submission failed:', {
            status: response.status,
            statusText: response.statusText,
            responseText,
            responseData,
            request: {
              url: `${API_BASE_URL}/games/${gameId}/play`,
              method: 'PATCH',
              body: turnModel
            }
          });
          
          // Handle specific error cases with more details
          if (response.status === 422) {
            console.error('Validation error details:', responseData);
            // Try to extract more specific error information
            if (responseData && responseData.detail && Array.isArray(responseData.detail)) {
              const errorMessages = responseData.detail.map(err => 
                `${err.loc?.join?.('.') || 'Unknown field'}: ${err.msg || 'Invalid value'}`
              ).join('\n');
              alert(`Claim validation errors:\n${errorMessages}`);
            } else {
              alert(`Claim validation error: ${responseData?.detail || responseText || 'Invalid claim format'}`);
            }
          } else if (response.status === 400) {
            alert(`Claim error: ${responseData?.detail || responseText || 'Bad request'}`);
          } else if (response.status === 403) {
            alert("Not authorized to make this claim. Make sure it's your team's turn to claim.");
          } else if (response.status === 404) {
            alert("Game not found. Please refresh the page and try again.");
          } else {
            alert(`Failed to submit claim: ${responseData?.detail || responseText || `Server error (${response.status})`}`);
          }
          
        } catch (error) {
          // Only a real error if it's not the "body stream already read" error
          if (!error.message.includes('body stream already read')) {
            console.error('Error processing claim response:', error);
            alert(`Error processing server response: ${error.message}`);
          }
        }
      } catch (error) {
        console.error('Actual network error submitting claim:', error);
        // Only show network error for actual fetch failures
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          alert('Network error while submitting claim. Please check your connection and try again.');
        } else if (!error.message.includes('body stream already read')) {
          // Don't show error for "body stream already read" as it's not a real error
          alert(`Unexpected error while submitting claim: ${error.message}`);
        }
      } finally {
        // Always clear loading state
        setIsProcessingClaim(false);
      }
    };

    // Function to handle submitting the actual claim with card assignments
    const handleSubmitClaim = async () => {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        alert("User not authenticated!");
        return;
      }
      
      // Get unclaimed cards that need to be assigned
      const unclaimedCards = gameState?.owners?.options?.cards || [];
      const unclaimedCardStrings = unclaimedCards.map(card => convertCardToString(card));
      
      // Check if all cards have been assigned
      const unassignedCards = unclaimedCardStrings.filter(cardString => !claimAssignments[cardString]);
      if (unassignedCards.length > 0) {
        alert(`Please assign all cards before submitting claim. Unassigned cards: ${unassignedCards.join(', ')}`);
        return;
      }
      
      // Get current player's team number
      const currentPlayerTeam = gameState?.player_status?.[currentUserId];
      if (!currentPlayerTeam) {
        alert("Error: Cannot determine your team number. Please refresh the page and try again.");
        return;
      }
      
      // Confirm the claim submission
      const assignmentSummary = unclaimedCardStrings.map(cardString => {
        const playerId = claimAssignments[cardString];
        const playerName = userDetails[playerId]?.name || `Player ${playerId.slice(-4)}`;
        const isCurrentUser = playerId === currentUserId;
        return `${cardString} → ${playerName}${isCurrentUser ? ' (You)' : ''}`;
      }).join('\n');
      
      const confirmMessage = `Are you sure you want to submit this claim?\n\n${assignmentSummary}\n\nRemember: If any assignment is wrong, you lose the claim!`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
      
      // Build transactions array for the claim
      const transactions = unclaimedCards.map(card => {
        const cardString = convertCardToString(card);
        const assignedPlayerId = claimAssignments[cardString];
        
        const receiver = `suits_${currentPlayerTeam}`;
        
        return {
          sender: assignedPlayerId, // The teammate who supposedly has the card
          receiver: receiver,       // The team's suits collection (e.g., "suits_1")
          card: card,               // Single card object (not wrapped in array)
          success: true             // Backend will verify if this is actually correct
        };
      });
      
      // Validate transactions before sending
      const invalidTransactions = transactions.filter(transaction => 
        !transaction.sender || 
        !transaction.receiver || 
        !transaction.card ||
        typeof transaction.card !== 'object' ||
        !transaction.card.hasOwnProperty('rank') ||
        !transaction.card.hasOwnProperty('suit')
      );
      
      if (invalidTransactions.length > 0) {
        console.error('Invalid transactions detected:', invalidTransactions);
        alert('Error: Some card assignments are invalid. Please try again.');
        setIsProcessingClaim(false);
        return;
      }
      
      // Create turn model for submitting claim (turn_type = 1, with transactions)
      const turnModel = {
        type: 1, // 1 = submitting claim
        player: currentUserId,
        transactions: transactions
      };
      
      console.log('=== CLAIM SUBMISSION DEBUG ===');
      console.log('Current Game State:', gameState);
      console.log('Unclaimed Cards (raw):', unclaimedCards);
      console.log('Unclaimed Card Strings:', unclaimedCardStrings);
      console.log('Claim Assignments:', claimAssignments);
      console.log('Generated Transactions:', transactions);
      console.log('Complete Turn Model:', turnModel);
      console.log('Turn Model JSON:', JSON.stringify(turnModel, null, 2));
      console.log('=== END CLAIM SUBMISSION DEBUG ===');
      
      // Set loading state
      setIsProcessingClaim(true);
      
      try {
        const response = await fetch(`${API_BASE_URL}/games/${gameId}/play`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(turnModel)
        });
        
        console.log('Claim response status:', response.status);
        console.log('Claim response ok:', response.ok);
        console.log('Claim response headers:', response.headers);
        
        let responseData = null;
        let responseText = '';
        
        try {
          // Read the response text first
          responseText = await response.text();
          console.log('Raw response text:', responseText);
          
          // Only try to parse as JSON if there's content
          if (responseText) {
            try {
              responseData = JSON.parse(responseText);
              console.log('Parsed response data:', responseData);
            } catch (jsonError) {
              console.log('Response was not valid JSON:', jsonError);
              // Not a JSON parsing error - just means response wasn't JSON
            }
          }
          
          // If response is ok, treat as success regardless of JSON parsing
          if (response.ok) {
            console.log("Claim submitted successfully!");
            setClaimAssignments({});
            
            // Show success message based on parsed data if available
            if (responseData && responseData.success !== undefined) {
              if (responseData.success) {
                alert("Claim Successful! Your team now owns this half-suit!");
              } else {
                alert("Claim Failed! The opposing team now owns this half-suit.");
              }
            } else {
              alert("Claim submitted! Check the game state for results.");
            }
            return;
          }
          
          // Handle error cases
          console.error('Claim submission failed:', {
            status: response.status,
            statusText: response.statusText,
            responseText,
            responseData,
            request: {
              url: `${API_BASE_URL}/games/${gameId}/play`,
              method: 'PATCH',
              body: turnModel
            }
          });
          
          // Handle specific error cases with more details
          if (response.status === 422) {
            console.error('Validation error details:', responseData);
            // Try to extract more specific error information
            if (responseData && responseData.detail && Array.isArray(responseData.detail)) {
              const errorMessages = responseData.detail.map(err => 
                `${err.loc?.join?.('.') || 'Unknown field'}: ${err.msg || 'Invalid value'}`
              ).join('\n');
              alert(`Claim validation errors:\n${errorMessages}`);
            } else {
              alert(`Claim validation error: ${responseData?.detail || responseText || 'Invalid claim format'}`);
            }
          } else if (response.status === 400) {
            alert(`Claim error: ${responseData?.detail || responseText || 'Bad request'}`);
          } else if (response.status === 403) {
            alert("Not authorized to make this claim. Make sure it's your team's turn to claim.");
          } else if (response.status === 404) {
            alert("Game not found. Please refresh the page and try again.");
          } else {
            alert(`Failed to submit claim: ${responseData?.detail || responseText || `Server error (${response.status})`}`);
          }
          
        } catch (error) {
          // Only a real error if it's not the "body stream already read" error
          if (!error.message.includes('body stream already read')) {
            console.error('Error processing claim response:', error);
            alert(`Error processing server response: ${error.message}`);
          }
        }
      } catch (error) {
        console.error('Actual network error submitting claim:', error);
        // Only show network error for actual fetch failures
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          alert('Network error while submitting claim. Please check your connection and try again.');
        } else if (!error.message.includes('body stream already read')) {
          // Don't show error for "body stream already read" as it's not a real error
          alert(`Unexpected error while submitting claim: ${error.message}`);
        }
      } finally {
        // Always clear loading state
        setIsProcessingClaim(false);
      }
    };

    const handleDelegateTurn = async () => {
      const currentUserId = getCurrentUserId();
      if (!selectedTeammate || !currentUserId) {
        alert("Select a teammate to delegate to.");
        return;
      }
    
      const turnModel = {
        type: 2, // Delegation
        player: currentUserId,
        transactions: [{
          sender: selectedTeammate,
          receiver: currentUserId,
          card: { rank: 1, suit: 1 }, // dummy card
          success: true
        }]
      };
    
      try {
        const res = await fetch(`${API_BASE_URL}/games/${gameId}/play`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(turnModel)
        });
    
        if (!res.ok) {
          const errData = await res.json();
          alert("Delegation failed: " + (errData?.detail || "Unknown error"));
        } else {
          setSelectedTeammate(null);
        }
      } catch (err) {
        console.error("Error delegating turn:", err);
        alert("Failed to delegate turn.");
      }
    };    

  
  return (
      <>
        <div style={{
               paddingBottom: "10px",
               width: "100%",
             }}>
          {getAllPlayers(users, userDetails, gameState, getCurrentUserId())}
        </div>

        {/* Show question options when it's current player's turn */}
        {(() => {
          const currentUserId = getCurrentUserId();
          const isCurrentPlayer = gameState?.current_player === currentUserId;
          
          // Get valid question options from game state instead of player's hand
          const questionOptions = gameState?.owners?.options?.cards || [];
          const questionOptionStrings = questionOptions.map(card => convertCardToString(card));
          
          console.log('Debug Options Display:', {
            currentUserId,
            currentPlayer: gameState?.current_player,
            isCurrentPlayer,
            questionOptions,
            questionOptionStrings,
            gameState: gameState
          });
          
          // Show question options when it's current player's turn, there are valid options, AND not in claim state
          if (isCurrentPlayer && questionOptionStrings && questionOptionStrings.length > 0 && gameState?.status !== 2) {
            return (
              <div style={{ width: "100%", padding: "0 2%" }}>
                {questionOptionsFromCards(questionOptionStrings, selectedCards, setSelectedCards)}
                {playerSelectionForQuestions(users, userDetails, currentUserId, selectedPlayerToAsk, setSelectedPlayerToAsk, gameState)}
                {playerSelectionForDelegation(users, userDetails, currentUserId, selectedTeammate, setSelectedTeammate, gameState)}
              </div>
            );
          }
          
          return null;
        })()}

        {/* Show claim assignment interface when gameState.status = 2 */}
        {(() => {
          const currentUserId = getCurrentUserId();
          
          // Show claim assignment interface when status = 2 (claim occurring)
          if (gameState?.status === 2) {
            const unclaimedCards = gameState?.owners?.options?.cards || [];
            const unclaimedCardStrings = unclaimedCards.map(card => convertCardToString(card));
            const currentPlayerTeam = gameState?.player_status?.[currentUserId];
            const teammates = users.filter(userId => {
              if (userId === currentUserId) return false;
              const playerTeam = gameState?.player_status?.[userId];
              return playerTeam && playerTeam === currentPlayerTeam;
            });
            
            return (
              <div style={{ width: "100%", padding: "0 2%" }}>
                <div style={{
                  width: '100%',
                  padding: '25px',
                  backgroundColor: 'rgba(255, 0, 0, 0.15)',
                  borderRadius: '12px',
                  border: '3px solid #FF0000',
                  marginBottom: '20px',
                }}>
                  <div style={{
                    color: '#FF0000',
                    fontSize: '2.2vw',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: '15px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  }}>
                    Making Claim - Assign Cards To Teammates
                  </div>
                  
                  <div style={{
                    color: '#FFF',
                    fontSize: '1.4vw',
                    textAlign: 'center',
                    marginBottom: '20px',
                    fontStyle: 'italic',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  }}>
                    Assign each unclaimed card to one of your teammates:
                  </div>
                  
                  {/* Cards in horizontal row with dropdowns */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '20px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '20px',
                  }}>
                    {unclaimedCardStrings.map(cardString => {
                      const assignedPlayer = claimAssignments[cardString];
                      // Include current user + teammates in dropdown options
                      const allTeamOptions = [currentUserId, ...teammates];
                      
                      return (
                        <div key={`claim-${cardString}`} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '10px',
                        }}>
                          {/* Card display */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}>
                            <img 
                              src={`/${cardString}icon.svg`}
                              style={{
                                width: '80px',
                                height: '120px',
                                border: '2px solid #FFD700',
                                borderRadius: '8px',
                                marginBottom: '8px',
                              }} 
                              alt={cardString}
                            />
                            <span style={{
                              color: '#FFD700',
                              fontSize: '1.2vw',
                              fontWeight: 'bold',
                              textAlign: 'center',
                            }}>
                              {cardString}
                            </span>
                          </div>
                          
                          {/* Dropdown selector */}
                          <select
                            value={assignedPlayer || ''}
                            onChange={(e) => {
                              const selectedValue = e.target.value;
                              setClaimAssignments(prev => ({
                                ...prev,
                                [cardString]: selectedValue || null
                              }));
                            }}
                            style={{
                              padding: '8px 12px',
                              fontSize: '1.1vw',
                              fontWeight: 'bold',
                              borderRadius: '6px',
                              border: assignedPlayer ? '2px solid #00FF00' : '2px solid #FFD700',
                              background: assignedPlayer ? '#e6ffe6' : '#fff',
                              color: '#000',
                              cursor: 'pointer',
                              minWidth: '120px',
                              textAlign: 'center',
                            }}
                          >
                            <option value="" style={{ color: '#666' }}>
                              Select Player
                            </option>
                            {allTeamOptions.map(userId => {
                              const username = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;
                              const playerTeam = gameState?.player_status?.[userId];
                              const isCurrentUser = userId === currentUserId;
                              
                              return (
                                <option key={userId} value={userId}>
                                  {username} {isCurrentUser ? '(You)' : `(Team #${playerTeam})`}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }
          
          return null;
        })()}

        <div style={{width: "100%", height: "60vh", display: "flex", justifyContent: "center", alignItems: "center", paddingBottom: "8%", position: "relative"}}>
          <img
            src={"/table.svg"}
            alt="table"
            style={{
              width: "100%",
              height: "90%",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 0
            }}
          />
          <div style={{width: "100%", height: "100%", position: "absolute", top: 0, left: 0, display: "flex", justifyContent: "center", alignItems: "center", zIndex:100}}>
            {claimButtons(getClaimsArray(gameState?.owners?.["suits_1"]?.cards, gameState?.owners?.["suits_2"]?.cards), handleInitiateClaim)}
          </div>
        </div>
           
     
      <div style={{width: "100%", paddingTop: "6vh"}}>
        {currentPlayerCards(getCurrentUserCards())}
      </div>

      <div>
            {/* Show different buttons based on game state */}
            {(() => {
              const currentUserId = getCurrentUserId();
              const unclaimedCards = gameState?.owners?.options?.cards || [];
              const unclaimedCardStrings = unclaimedCards.map(card => convertCardToString(card));
              const allCardsAssigned = unclaimedCardStrings.length > 0 && unclaimedCardStrings.every(cardString => claimAssignments[cardString]);
              
              if (gameState?.status === 2) {
                // Show submit claim button when in claim state
                return (
                  <button 
                    style={{ 
                      padding: '2% 4%', 
                      fontSize: '6vh',
                      backgroundColor: allCardsAssigned && !isProcessingClaim ? '#FF0000' : '#666',
                      color: '#FFF',
                      border: '3px solid #FFF',
                      borderRadius: '12px',
                      cursor: allCardsAssigned && !isProcessingClaim ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                      boxShadow: allCardsAssigned && !isProcessingClaim ? '0 4px 8px rgba(255, 0, 0, 0.4)' : 'none',
                      opacity: isProcessingClaim ? 0.7 : 1,
                    }}
                    onClick={handleSubmitClaim}
                    disabled={!allCardsAssigned || isProcessingClaim}
                  >
                    {isProcessingClaim ? 'Processing Claim...' : 'Submit Claim'}
                  </button>
                );
              } else {
                // Show regular ask/pass buttons for normal gameplay
                return (
                  <>
                    <button 
                      style={{ marginRight: '5%', padding: '1% 2%', fontSize: '5vh' }}
                      onClick={handleAskQuestion}
                      disabled={selectedCards.length !== 1 || !selectedPlayerToAsk || gameState?.current_player !== getCurrentUserId()}
                    >
                      Ask
                    </button>
                    <button 
                      style={{ 
                        marginLeft: '5%', 
                        padding: '1% 2%', 
                        fontSize: '5vh', 
                        backgroundColor: '#00FFFF', 
                        color: '#000',
                        border: '2px solid white',
                        fontWeight: 'bold',
                        borderRadius: '8px'
                      }}
                      onClick={handleDelegateTurn}
                      disabled={!selectedTeammate || gameState?.current_player !== getCurrentUserId()}
                    >
                      Delegate
                    </button>
                  </>
                );
              }
            })()}
            
            {/* Display current selections for debugging/user feedback during regular play */}
            {gameState?.status !== 2 && (selectedCards.length > 0 || selectedPlayerToAsk) && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#FFF',
                fontSize: '1.2vw',
                textAlign: 'center',
              }}>
                <div>
                  <strong>Selected Card:</strong> {selectedCards.length > 0 ? selectedCards[0] : 'None'}
                </div>
                <div>
                  <strong>Player to Ask:</strong> {selectedPlayerToAsk ? (userDetails[selectedPlayerToAsk]?.name || `Player ${selectedPlayerToAsk.slice(-4)}`) : 'None'}
                </div>
                {selectedCards.length === 1 && selectedPlayerToAsk && (
                  <div style={{ color: '#00FF00', fontWeight: 'bold', marginTop: '8px' }}>
                    Ready to ask!
                  </div>
                )}
              </div>
            )}
            
            {/* Display claim assignment progress during claim state */}
            {gameState?.status === 2 && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                borderRadius: '8px',
                border: '2px solid #FF0000',
                color: '#FFF',
                fontSize: '1.3vw',
                textAlign: 'center',
              }}>
                <div style={{ color: '#FF0000', fontWeight: 'bold', marginBottom: '8px' }}>
                  Claim In Progress
                </div>
                {(() => {
                  const unclaimedCards = gameState?.owners?.options?.cards || [];
                  const unclaimedCardStrings = unclaimedCards.map(card => convertCardToString(card));
                  const assignedCount = unclaimedCardStrings.filter(cardString => claimAssignments[cardString]).length;
                  
                  if (isProcessingClaim) {
                    return (
                      <div>
                        <div style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: '8px' }}>
                          Processing claim submission...
                        </div>
                        <div style={{ fontSize: '1.1vw' }}>
                          Please wait while the claim is being processed
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div>
                      <strong>Progress:</strong> {assignedCount} / {unclaimedCardStrings.length} cards assigned
                      {assignedCount === unclaimedCardStrings.length && (
                        <div style={{ color: '#00FF00', fontWeight: 'bold', marginTop: '8px' }}>
                          All cards assigned - Ready to submit claim!
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
      </div>
      </>
  );
}

export default FishGameScreen;