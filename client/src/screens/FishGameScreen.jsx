import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { API_BASE_URL, getWebSocketURL } from '../config';
import './FishGameScreen.css';

// Toast notification component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const toastClassName = `toast toast-${type || 'default'}`;

  return (
    <div className={toastClassName} onClick={onClose}>
      <div className="toast-content">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="toast-close-btn"
        >
          ×
        </button>
      </div>
    </div>
  );
}

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
      <div className="player-container">
        {/* Username label above cards */}
        <div className={`player-info ${isCurrentUser ? 'player-info-current' : 'player-info-other'}`}>
          {username}
          {statusText && (
            <div className="player-status" style={{ color: statusColor }}>
              {statusText}
            </div>
          )}
        </div>
        
        <img
          src={"/backicon.svg"}
          alt="card back"
          className="player-card-back"
        />
        <span className="player-card-count">
          {cardCount}
        </span>
  
        {moving && (
          <div className="player-current-turn">
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
      <div className="players-container">
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
          className="player-card"
          alt={cardname}
        />
      );
    });
    return (
      <div className="current-player-cards">
        <div className="current-player-label">
          Your Hand:
        </div>
        {cardlist}
      </div>
    );
  }

  // Function to display current player's cards as question options
  function questionOptionsFromCards(cardStrings, selectedCards, setSelectedCards) {
    if (!cardStrings || !Array.isArray(cardStrings) || cardStrings.length === 0) {
      console.log('questionOptionsFromCards returning null - no valid cards');
      return null;
    }

    let optionCards = [];
    
    cardStrings.forEach(cardname => {
      const isSelected = selectedCards.includes(cardname);
      const cardClassName = `question-option-card ${isSelected ? 'question-option-card-selected' : ''}`;
      
      optionCards.push(
        <img 
          key={`option-${cardname}`}
          src={`/${cardname}icon.svg`}
          className={cardClassName}
          alt={cardname} 
          onClick={() => cardClicked(cardname, selectedCards, setSelectedCards)} 
        />
      );
    });

    return (
      <div className="question-options-container">
        <div className="question-options-title">
          Select a Card to Ask About
        </div>
        <div className="question-options-cards">
          {optionCards}
        </div>
        <div className="question-options-instruction">
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
        <div className="player-selection-container player-selection-opponents">
          <div className="player-selection-title player-selection-title-opponents">
            No opponents available to ask
          </div>
        </div>
      );
    }

    return (
      <div className="player-selection-container player-selection-opponents">
        <div className="player-selection-title player-selection-title-opponents">
          Select an Opponent to Ask
        </div>
        <div className="player-selection-buttons">
          {opponents.map(userId => {
            const username = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;
            const playerTeam = gameState?.player_status?.[userId];
            const isSelected = selectedPlayerToAsk === userId;
            
            // Get team color
            let teamColor = '#007BFF'; // Default blue
            if (playerTeam === 1) teamColor = '#3b82f6'; // Blue for team 1
            else if (playerTeam === 2) teamColor = '#ef4444'; // Red for team 2
            else if (playerTeam === 3) teamColor = '#10b981'; // Green for team 3
            
            const buttonStyle = {
              borderColor: isSelected ? '#00FF00' : teamColor,
              backgroundColor: isSelected ? '#00FF00' : teamColor,
              ...(isSelected ? {} : {})
            };
            
            return (
              <button
                key={`player-select-${userId}`}
                className={`player-selection-button ${isSelected ? 'player-selection-button-selected' : ''}`}
                style={buttonStyle}
                onClick={() => {
                  if (selectedPlayerToAsk === userId) {
                    setSelectedPlayerToAsk(null); // Deselect if already selected
                  } else {
                    setSelectedPlayerToAsk(userId); // Select this player
                  }
                }}
              >
                {username}
                <div className="player-team-info">
                  Team #{playerTeam}
                </div>
              </button>
            );
          })}
        </div>
        <div className="player-selection-instruction">
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
      <div className="player-selection-container player-selection-delegation">
        <div className="player-selection-title player-selection-title-delegation">
          Select a Teammate to Delegate Your Turn
        </div>
        <div className="player-selection-buttons">
          {teammates.map(id => (
            <button
              key={id}
              onClick={() => setSelectedTeammate(prev => prev === id ? null : id)}
              className={`player-selection-button ${selectedTeammate === id ? 'player-selection-button-selected' : ''}`}
              style={{
                borderColor: 'cyan',
                backgroundColor: selectedTeammate === id ? 'cyan' : 'transparent',
              }}
            >
              {userDetails[id]?.name || `Player ${id.slice(-4)}`}
            </button>
          ))}
        </div>
      </div>
    );
  }  

  // Function to display claim assignment interface when gameState.status = 2 and current user is the claimant
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
      console.error(`Claim assignment validation error: Please assign all cards before submitting claim. Unassigned cards: ${unassignedCards.join(', ')}`);
      return null;
    }
    
    // Get current player's team number
    const currentPlayerTeam = gameState?.player_status?.[currentUserId];
    if (!currentPlayerTeam) {
      console.error("Claim assignment validation error: Cannot determine your team number.");
      return null;
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
  let names = ["♣ 2-7", "♦ 2-7","♥ 2-7","♠ 2-7", "♣ 9-A",  "♦ 9-A", "♥ 9-A","♠ 9-A", "8 & Joker" ]
  
  // Function to render button text with colored suits
  const renderButtonText = (name, index) => {
    if (index === 8) {
      // Special styling for "8 & Joker" (index 8, not 4)
      return (
        <span className="claim-joker-text">
          8's & Jokers
        </span>
      );
    }
    
    // For other suits, color hearts and diamonds red
    if (name.includes('♥') || name.includes('♦')) {
      const parts = name.split(' ');
      return (
        <span>
          <span className="claim-suit-red">{parts[0]}</span> {parts[1]}
        </span>
      );
    } else {
      return name;
    }
  };

  return (
    <div className="claim-buttons-container">
      {/* Header for claims section */}
      <div className="claim-buttons-header">
         HALF-SUIT CLAIMS 
      </div>
      
      {/* Instructional text */}
      <div className="claim-buttons-instruction">
        Click any unclaimed half-suit to initiate a claim
      </div>
      
      <div className="claim-buttons-row">
        {Array.from({ length: 4 }).map((_, i) => {
          let className = 'claim-button';
          
          if (claims[i] === 0) {
            // Default style for unclaimed
          } else {
            className += ' claim-button-disabled';
            if (claims[i] === 1) {
              className += ' claim-button-team1';
            } else if (claims[i] === 2) {
              className += ' claim-button-team2';
            }
          }
          
          return (
            <button
              key={i}
              className={className}
              disabled={claims[i] !== 0}
              onClick={() => handleInitiateClaim(i)}
            >
              {renderButtonText(names[i], i)}
            </button>
          );
        })}
      </div>
      <div className="claim-buttons-row claim-buttons-row-second">
        {Array.from({ length: 4 }).map((_, j) => {
          let i = j + 4;
          let className = 'claim-button';
          
          if (claims[i] === 0) {
            // Default style for unclaimed
          } else {
            className += ' claim-button-disabled';
            if (claims[i] === 1) {
              className += ' claim-button-team1';
            } else if (claims[i] === 2) {
              className += ' claim-button-team2';
            }
          }
          
          return (
            <button
              key={i}
              className={className}
              disabled={claims[i] !== 0}
              onClick={() => handleInitiateClaim(i)}
            >
              {renderButtonText(names[i], i)}
            </button>
          );
        })}
      </div>
      <div className="claim-buttons-row claim-buttons-row-second">
        {/* 8 & Joker button as the final button */}
        {(() => {
          let i = 8;
          let className = 'claim-button';
          
          if (claims[i] === 0) {
            // Default style for unclaimed
          } else {
            className += ' claim-button-disabled';
            if (claims[i] === 1) {
              className += ' claim-button-team1';
            } else if (claims[i] === 2) {
              className += ' claim-button-team2';
            }
          }
          
          return (
            <button
              key={i}
              className={className}
              disabled={claims[i] !== 0}
              onClick={() => handleInitiateClaim(i)}
            >
              {renderButtonText(names[i], i)}
            </button>
          );
        })()}
      </div>
      
      {/* Warning text at bottom */}
      <div className="claim-buttons-warning">
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
    
    // Toast notification state
    const [toast, setToast] = useState(null);
    
    // Helper function to show toast notifications
    const showToast = (message, type = 'info') => {
      setToast({ message, type, id: Date.now() });
    };
    
    // Helper function to close toast
    const closeToast = () => {
      setToast(null);
    };
    
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
            const response = await fetch(`${API_BASE_URL}/games/${id}/get_game`);
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
        showToast("Please select exactly one card to ask about!", "warning");
        return;
      }
      
      if (!selectedPlayerToAsk) {
        showToast("Please select a player to ask!", "warning");
        return;
      }
      
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        showToast("User not authenticated!", "error");
        return;
      }
      
      // Check if it's the current user's turn
      if (gameState?.current_player !== currentUserId) {
        showToast("It's not your turn!", "warning");
        return;
      }
      
      const turnModel = generateQuestionTurnModel(selectedCards[0], selectedPlayerToAsk);
      if (!turnModel) {
        showToast("Failed to generate question!", "error");
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
          showToast("Question asked successfully!", "success");
          console.log("Question asked successfully!");
        } else {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          showToast(`Failed to ask question: ${errorData.detail || 'Unknown error'}`, "error");
        }
      } catch (error) {
        console.error('Error asking question:', error);
        showToast('Failed to ask question. Please try again.', "error");
      }
    };

    // Function to handle initiating a claim
    const handleInitiateClaim = async (halfSuitIndex) => {
      const halfSuitNames = ["♣ 2-7","♦ 2-7","♥ 2-7","♠ 2-7","♣ 9-A" , "♦ 9-A","♥ 9-A", "♠ 9-A" , "8 & Joker"];
      
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
        showToast("User not authenticated!", "error");
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
      //   showToast("It's not your turn! Cannot initiate claim.", "warning");
      //   return;
      // }
      
      // Check game status
      if (gameState?.status !== 0) {
        showToast(`Cannot initiate claim. Game status is ${gameState?.status} (expected 0 for normal play)`, "error");
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
                showToast("Claim Successful! Your team now owns this half-suit!", "success");
              } else {
                showToast("Claim Failed! The opposing team now owns this half-suit.", "error");
              }
            } else {
              showToast("Claim submitted! Check the game state for results.", "info");
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
              showToast(`Claim validation errors:\n${errorMessages}`, "error");
            } else {
              showToast(`Claim validation error: ${responseData?.detail || responseText || 'Invalid claim format'}`, "error");
            }
          } else if (response.status === 400) {
            showToast(`Claim error: ${responseData?.detail || responseText || 'Bad request'}`, "error");
          } else if (response.status === 403) {
            showToast("Not authorized to make this claim. Make sure it's your team's turn to claim.", "error");
          } else if (response.status === 404) {
            showToast("Game not found. Please refresh the page and try again.", "error");
          } else {
            showToast(`Failed to submit claim: ${responseData?.detail || responseText || `Server error (${response.status})`}`, "error");
          }
          
        } catch (error) {
          // Only a real error if it's not the "body stream already read" error
          if (!error.message.includes('body stream already read')) {
            console.error('Error processing claim response:', error);
            showToast(`Error processing server response: ${error.message}`, "error");
          }
        }
      } catch (error) {
        console.error('Actual network error submitting claim:', error);
        // Only show network error for actual fetch failures
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          showToast('Network error while submitting claim. Please check your connection and try again.', "error");
        } else if (!error.message.includes('body stream already read')) {
          // Don't show error for "body stream already read" as it's not a real error
          showToast(`Unexpected error while submitting claim: ${error.message}`, "error");
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
        showToast("User not authenticated!", "error");
        return;
      }
      
      // Get unclaimed cards that need to be assigned
      const unclaimedCards = gameState?.owners?.options?.cards || [];
      const unclaimedCardStrings = unclaimedCards.map(card => convertCardToString(card));
      
      // Check if all cards have been assigned
      const unassignedCards = unclaimedCardStrings.filter(cardString => !claimAssignments[cardString]);
      if (unassignedCards.length > 0) {
        showToast(`Please assign all cards before submitting claim. Unassigned cards: ${unassignedCards.join(', ')}`, "warning");
        return;
      }
      
      // Get current player's team number
      const currentPlayerTeam = gameState?.player_status?.[currentUserId];
      if (!currentPlayerTeam) {
        showToast("Error: Cannot determine your team number. Please refresh the page and try again.", "error");
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
        showToast('Error: Some card assignments are invalid. Please try again.', "error");
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
                showToast("Claim Successful! Your team now owns this half-suit!", "success");
              } else {
                showToast("Claim Failed! The opposing team now owns this half-suit.", "error");
              }
            } else {
              showToast("Claim submitted! Check the game state for results.", "info");
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
              showToast(`Claim validation errors:\n${errorMessages}`, "error");
            } else {
              showToast(`Claim validation error: ${responseData?.detail || responseText || 'Invalid claim format'}`, "error");
            }
          } else if (response.status === 400) {
            showToast(`Claim error: ${responseData?.detail || responseText || 'Bad request'}`, "error");
          } else if (response.status === 403) {
            showToast("Not authorized to make this claim. Make sure it's your team's turn to claim.", "error");
          } else if (response.status === 404) {
            showToast("Game not found. Please refresh the page and try again.", "error");
          } else {
            showToast(`Failed to submit claim: ${responseData?.detail || responseText || `Server error (${response.status})`}`, "error");
          }
          
        } catch (error) {
          // Only a real error if it's not the "body stream already read" error
          if (!error.message.includes('body stream already read')) {
            console.error('Error processing claim response:', error);
            showToast(`Error processing server response: ${error.message}`, "error");
          }
        }
      } catch (error) {
        console.error('Actual network error submitting claim:', error);
        // Only show network error for actual fetch failures
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          showToast('Network error while submitting claim. Please check your connection and try again.', "error");
        } else if (!error.message.includes('body stream already read')) {
          // Don't show error for "body stream already read" as it's not a real error
          showToast(`Unexpected error while submitting claim: ${error.message}`, "error");
        }
      } finally {
        // Always clear loading state
        setIsProcessingClaim(false);
      }
    };

    const handleDelegateTurn = async () => {
      const currentUserId = getCurrentUserId();
    
      console.debug("[DELEGATE] Attempting delegation");
      console.debug("[DELEGATE] Selected teammate:", selectedTeammate);
      console.debug("[DELEGATE] Current user ID:", currentUserId);
      console.debug("[DELEGATE] Current player in game state:", gameState?.current_player);
    
      if (!selectedTeammate) {
        showToast("Select a teammate to delegate to.", "warning");
        return;
      }
      if (!currentUserId || gameState?.current_player !== currentUserId) {
        showToast("It's not your turn!", "warning");
        console.warn("[DELEGATE] Delegation blocked - not user's turn");
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
    
      console.debug("[DELEGATE] Built turnModel:", JSON.stringify(turnModel, null, 2));
    
      try {
        const res = await fetch(`${API_BASE_URL}/games/${gameId}/play`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(turnModel)
        });
    
        if (!res.ok) {
          let errData = "";
          try {
            errData = await res.json();
          } catch (parseErr) {
            console.error("[DELEGATE] Failed to parse error response JSON", parseErr);
          }
          console.error("[DELEGATE] Server rejected delegation:", errData);
          showToast("Delegation failed: " + (errData?.detail || "Unknown error"), "error");
        } else {
          console.info("[DELEGATE] Delegation successful!");
          setSelectedTeammate(null);
          showToast("Turn successfully delegated!", "success");
        }
      } catch (err) {
        console.error("[DELEGATE] Network or unexpected error:", err);
        showToast("Failed to delegate turn.", "error");
      }
    };    

  
  return (
      <>
        <div className="game-container">
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

        {/* Show claim assignment interface when gameState.status = 2 and current user is the claimant */}
        {(() => {
          const currentUserId = getCurrentUserId();
          
          // Show claim assignment interface when status = 2 (claim occurring) AND current user is the one making the claim
          if (gameState?.status === 2 && gameState?.current_player === currentUserId) {
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
                <div className="claim-interface">
                  <div className="claim-interface-title">
                    Making Claim - Assign Cards To Teammates
                  </div>
                  
                  <div className="claim-interface-instruction">
                    Assign each unclaimed card to one of your teammates:
                  </div>
                  
                  {/* Cards in horizontal row with dropdowns */}
                  <div className="claim-cards-container">
                    {unclaimedCardStrings.map(cardString => {
                      const assignedPlayer = claimAssignments[cardString];
                      // Include current user + teammates in dropdown options
                      const allTeamOptions = [currentUserId, ...teammates];
                      
                      return (
                        <div key={`claim-${cardString}`} className="claim-card-item">
                          {/* Card display */}
                          <div className="claim-card-display">
                            <img 
                              src={`/${cardString}icon.svg`}
                              className="claim-card-image"
                              alt={cardString}
                            />
                            <span className="claim-card-name">
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
                            className={`claim-card-selector ${assignedPlayer ? 'claim-card-selector-assigned' : ''}`}
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
          
          // Show a message to other players when someone else is making a claim
          if (gameState?.status === 2 && gameState?.current_player !== currentUserId) {
            const claimantName = userDetails[gameState?.current_player]?.name || `Player ${gameState?.current_player?.slice(-4)}`;
            return (
              <div style={{ width: "100%", padding: "0 2%" }}>
                <div className="claim-waiting">
                  <div className="claim-waiting-title">
                    Claim In Progress
                  </div>
                  
                  <div className="claim-waiting-message">
                    {claimantName} is making a claim. Please wait...
                  </div>
                </div>
              </div>
            );
          }
          
          return null;
        })()}

        <div className="game-table-container">
          <img
            src={"/table.svg"}
            alt="table"
            className="game-table-image"
          />
          <div className="game-table-overlay">
            {claimButtons(getClaimsArray(gameState?.owners?.["suits_1"]?.cards, gameState?.owners?.["suits_2"]?.cards), handleInitiateClaim)}
          </div>
        </div>
           
      <div className="player-cards-section">
        {currentPlayerCards(getCurrentUserCards())}
      </div>

      <div>
            {/* Show different buttons based on game state */}
            {(() => {
              const currentUserId = getCurrentUserId();
              const unclaimedCards = gameState?.owners?.options?.cards || [];
              const unclaimedCardStrings = unclaimedCards.map(card => convertCardToString(card));
              const allCardsAssigned = unclaimedCardStrings.length > 0 && unclaimedCardStrings.every(cardString => claimAssignments[cardString]);
              
              if (gameState?.status === 2 && gameState?.current_player === currentUserId) {
                // Show submit claim button when current user is making the claim
                const buttonStyle = {
                  backgroundColor: allCardsAssigned && !isProcessingClaim ? '#FF0000' : '#666',
                  cursor: allCardsAssigned && !isProcessingClaim ? 'pointer' : 'not-allowed',
                  boxShadow: allCardsAssigned && !isProcessingClaim ? '0 4px 8px rgba(255, 0, 0, 0.4)' : 'none',
                  opacity: isProcessingClaim ? 0.7 : 1,
                };
                
                return (
                  <button 
                    className="game-button-submit-claim"
                    style={buttonStyle}
                    onClick={handleSubmitClaim}
                    disabled={!allCardsAssigned || isProcessingClaim}
                  >
                    {isProcessingClaim ? 'Processing Claim...' : 'Submit Claim'}
                  </button>
                );
              } else if (gameState?.status === 2 && gameState?.current_player !== currentUserId) {
                // Show waiting message when someone else is making a claim
                return (
                  <div className="claim-waiting-button">
                    Waiting for claim to complete...
                  </div>
                );
              } else {
                // Show regular ask/delegate buttons for normal gameplay
                return (
                  <>
                    <button 
                      className="game-button-ask"
                      onClick={handleAskQuestion}
                      disabled={selectedCards.length !== 1 || !selectedPlayerToAsk || gameState?.current_player !== getCurrentUserId()}
                    >
                      Ask
                    </button>
                    <button 
                      className="game-button-delegate"
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
              <div className="debug-selections">
                <div>
                  <strong>Selected Card:</strong> {selectedCards.length > 0 ? selectedCards[0] : 'None'}
                </div>
                <div>
                  <strong>Player to Ask:</strong> {selectedPlayerToAsk ? (userDetails[selectedPlayerToAsk]?.name || `Player ${selectedPlayerToAsk.slice(-4)}`) : 'None'}
                </div>
                {selectedCards.length === 1 && selectedPlayerToAsk && (
                  <div className="debug-ready">
                    Ready to ask!
                  </div>
                )}
              </div>
            )}
            
            {/* Display claim assignment progress during claim state */}
            {gameState?.status === 2 && gameState?.current_player === getCurrentUserId() && (
              <div className="claim-progress">
                <div className="claim-progress-title">
                  Claim In Progress
                </div>
                {(() => {
                  const unclaimedCards = gameState?.owners?.options?.cards || [];
                  const unclaimedCardStrings = unclaimedCards.map(card => convertCardToString(card));
                  const assignedCount = unclaimedCardStrings.filter(cardString => claimAssignments[cardString]).length;
                  
                  if (isProcessingClaim) {
                    return (
                      <div>
                        <div className="claim-progress-processing">
                          Processing claim submission...
                        </div>
                        <div className="claim-progress-processing-detail">
                          Please wait while the claim is being processed
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div>
                      <strong>Progress:</strong> {assignedCount} / {unclaimedCardStrings.length} cards assigned
                      {assignedCount === unclaimedCardStrings.length && (
                        <div className="claim-progress-ready">
                          All cards assigned - Ready to submit claim!
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
      </div>
      
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
      </>
  );
}

export default FishGameScreen;