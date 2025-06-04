import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { API_BASE_URL, getWebSocketURL } from '../config';

import { Link } from 'react-router-dom';

function cardClicked(cardname, selectedCards, setSelectedCards) {
  console.log(cardname + " clicked");
  
  // Toggle card selection
  if (selectedCards.includes(cardname)) {
    // Remove card from selection
    setSelectedCards(selectedCards.filter(card => card !== cardname));
  } else {
    // Add card to selection
    setSelectedCards([...selectedCards, cardname]);
  }
}

function otherPlayer(userId, userDetails, moving = false, cardCount = 13, isCurrentUser = false, playerStatus = null) {
  const username = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;
  
  // Determine what status text to show based on player status
  let statusText = '';
  let statusColor = '#FF6B6B'; // Default red color
  let isFinished = false;
  
  if (playerStatus === -1) {
    statusText = 'PASSED';
    statusColor = '#FF6B6B';
  } else if (playerStatus === 1) {
    statusText = '1st PLACE';
    statusColor = '#FFD700'; // Gold
    isFinished = true;
  } else if (playerStatus === 2) {
    statusText = '2nd PLACE';
    statusColor = '#C0C0C0'; // Silver
    isFinished = true;
  } else if (playerStatus === 3) {
    statusText = '3rd PLACE';
    statusColor = '#CD7F32'; // Bronze
    isFinished = true;
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
        src={"/public/backicon.svg"}
        alt="card back"
        style={{
          width: '15vw',
          height: '15vh',
          display: 'block',
          opacity: (playerStatus === -1 || isFinished) ? 0.6 : 1, // Make card slightly transparent if passed or finished
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
      maxWidth: '80%',
      display: 'flex',
      flexDirection: 'row',
      gap: '5%',
      alignItems: 'center',
      overflowX: 'scroll',
      scrollbarWidth: 'thin',
      msOverflowStyle: 'auto'
    }}>
      {players}
    </div>
  );
}

function currentPlayerCards(cards, selectedCards, setSelectedCards) {
  let cardlist = [];
  cards.forEach(cardname => {
    const isSelected = selectedCards.includes(cardname);
    cardlist.push(
      <img 
        key={cardname}
        src={`/${cardname}icon.svg`}
        style={{
          width: "5.5%",
          display: "flex", 
          gap: "0px",
          cursor: "pointer",
          border: isSelected ? "3px solid #007BFF" : "3px solid transparent", // Blue border when selected
          borderRadius: "8px",
          transform: isSelected ? "translateY(-10px)" : "translateY(0px)", // Move up when selected
          transition: "all 0.2s ease-in-out", // Smooth animation
          boxShadow: isSelected ? "0 4px 8px rgba(0, 123, 255, 0.3)" : "none", // Blue shadow when selected
        }} 
        alt={cardname} 
        onClick={() => cardClicked(cardname, selectedCards, setSelectedCards)} 
      />
    );
  });
  
  return (
    <div style={{
      maxWidth: '95%',
      display: 'inline-flex',
      gap: '0.5vw',
      alignItems: 'flex-end',
      overflowX: 'auto',
      scrollbarWidth: 'thin',
      msOverflowStyle: 'auto',
      justifyContent: 'center',
      paddingTop: '15px',
      paddingBottom: '5px',
    }}>
      {cardlist}
    </div>
  );
}


function lastCombo(cards){
  const numCards = cards.length;
  if (numCards === 0) {
    return null; // Return null if there are no cards to display
  }

  const cardWidthVW = 8; // Max width of a single card in viewport width units
  const defaultSpacingVW = 1; // Desired spacing between cards when not overlapping
  const overlapPercentage = 0.44; // Factor by which cards overlap (e.g., 0.44 means 44% of card width)
  const containerWidthThresholdVW = 50; // If total width of spaced cards exceeds this, they will overlap

  // Calculate the total width the cards would occupy if laid out with default spacing
  const totalSpacedWidthVW = (numCards * cardWidthVW) + (Math.max(0, numCards - 1) * defaultSpacingVW);

  // Determine if overlapping is needed
  const useOverlap = totalSpacedWidthVW > containerWidthThresholdVW;

  let cardlist = []
  cards.forEach((cardname, index) => {
    let currentCardMarginLeftVW;

    if (index === 0) {
      currentCardMarginLeftVW = 0; // The first card has no left margin due to spacing/overlap
    } else {
      if (useOverlap) {
        // Apply negative margin for overlapping effect
        currentCardMarginLeftVW = -cardWidthVW * overlapPercentage;
      } else {
        // Apply positive margin for spacing
        currentCardMarginLeftVW = defaultSpacingVW;
      }
    }

    cardlist.push(<img
      key={`${cardname}-${index}`} // Use cardname and index for a more robust unique key
      src={`/${cardname}icon.svg`}
      style={{
        maxWidth: `${cardWidthVW}vw`,
        height: "auto", // Maintain aspect ratio
        objectFit: 'contain',
        marginLeft: `${currentCardMarginLeftVW}vw`, // Dynamically set margin
        zIndex: index, // Ensure cards stack correctly (higher index on top)
        position: 'relative', // Necessary for z-index to take effect
        boxShadow: '2px 2px 15px rgba(0,0,0,0.3)', // Retain existing shadow style
      }}
      alt={cardname}
    />)
  })

  return (
    <div style={{
      width: '100%', // The container div takes the full width available to it
      display: 'flex',
      alignItems: 'center', // Vertically align cards in the center
      justifyContent: 'center', // Horizontally center the group of cards
      overflowX: 'hidden', // Prevent horizontal scrollbars
      // The previous complex padding calculations are removed as justifyContent: 'center'
      // effectively centers the flex items (the card images).
    }}>
      {cardlist}
    </div>
  );
}
function VietcongGameScreen() {
  // WebSocket and game state management
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
  
  // Card selection state
  const [selectedCards, setSelectedCards] = useState([]);
  
  // Add state for game end handling
  const [gameEnded, setGameEnded] = useState(false);
  
  const [games, setGames] = useState([]);
  // Remove hardcoded lastPlayedCards - will get from gameState instead

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

  // Detect game end and navigate to win screen
  useEffect(() => {
    if (!gameState) return;
    
    // Check if game has ended
    if (gameState.status === 1 && !gameEnded) {
      console.log('=== VIET CONG GAME END DETECTED ===');
      console.log('Game has ended! Final status:', gameState);
      console.log('Current user details:', userDetails);
      console.log('All users:', users);
      console.log('Game ID:', gameId);
      console.log('=== END VIET CONG GAME END DEBUG ===');
      
      setGameEnded(true);
      
      // Navigate to win page with game results
      const gameResults = {
        gameState: gameState,
        userDetails: userDetails,
        users: users,
        gameId: gameId,
        gameName: gameName
      };
      
      console.log('Storing Viet Cong game results:', gameResults);
      
      // Store results in sessionStorage for the win page
      sessionStorage.setItem('vietcongGameResults', JSON.stringify(gameResults));
      
      // Navigate to win page
      console.log('Navigating to vietcong-win page...');
      navigate(`/app/vietcong-win`);
    }
  }, [gameState, gameEnded, navigate, userDetails, users, gameId, gameName]);
  
  // Function to convert backend card format to frontend format
  const convertCardToString = (card) => {
    const ranks = ['','A','2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    const suits = ['','C', 'D', 'H', 'S']; // Clubs, Diamonds, Hearts, Spades
    
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
    
    return {
      rank: ranks.indexOf(rank),
      suit: suits.indexOf(suit)
    };
  };
  
  // Function to generate TurnModel for playing cards
  const generatePlayTurnModel = (selectedCards) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId || selectedCards.length === 0) {
      return null;
    }
    
    const transactions = selectedCards.map(cardString => ({
      sender: currentUserId,
      receiver: "pile",
      card: convertStringToCard(cardString),
      success: true
    }));
    
    return {
      player: currentUserId,
      transactions: transactions,
      type: 0 // 0 = playing cards
    };
  };
  
  // Function to generate TurnModel for passing
  const generatePassTurnModel = () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      return null;
    }
    
    return {
      player: currentUserId,
      transactions: [],
      type: 1 // 1 = passing
    };
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
    
    // Create WebSocket connection
    const wsUrl = getWebSocketURL(`/game/ws/${gameId}`);
    console.log('Connecting to game WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Game WebSocket connection established');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received game state:', data);
      setGameState(data);
      
      // Extract users from game state if available
      if (data.owners) {
        const playerIds = Object.keys(data.owners).filter(id => id !== 'pile' && data.owners[id].is_player);
        setUsers(playerIds);
        fetchAllUserDetails(playerIds);
      }
    };
    
    ws.onerror = (error) => {
      console.error('Game WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('Game WebSocket connection closed');
    };
    
    setWebsocket(ws);
    
    // Clean up the WebSocket connection when the component unmounts
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [gameId, currentUser]);
  
  // Get current user's backend ID
  const getCurrentUserId = () => {
    if (backendUser && backendUser.id) {
      return backendUser.id;
    }
    return null;
  };
  
  // Function to handle playing selected cards
  const handlePlayCards = async () => {
    if (selectedCards.length === 0) {
      alert("Please select cards to play!");
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
    
    const turnModel = generatePlayTurnModel(selectedCards);
    if (!turnModel) {
      alert("Failed to generate turn model!");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/play`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(turnModel)
      });
      
      if (response.ok) {
        // Clear selected cards on successful play
        setSelectedCards([]);
        console.log("Cards played successfully!");
      } else {
        const errorData = await response.json();
        alert(`Failed to play cards: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error playing cards:', error);
      alert('Failed to play cards. Please try again.');
    }
  };
  
  // Function to handle passing turn
  const handlePass = async () => {
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
    
    const turnModel = generatePassTurnModel();
    if (!turnModel) {
      alert("Failed to generate pass turn model!");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/play`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(turnModel)
      });
      
      if (response.ok) {
        console.log("Passed successfully!");
      } else {
        const errorData = await response.json();
        alert(`Failed to pass: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error passing:', error);
      alert('Failed to pass. Please try again.');
    }
  };

  // Get the last played cards from game state
  const getLastPlayedCards = () => {
    if (!gameState || !gameState.last_turn || !gameState.last_turn.transactions) {
      return []; // No cards played yet
    }
    
    // Convert backend card format to frontend format for display
    return gameState.last_turn.transactions.map(transaction => 
      convertCardToString(transaction.card)
    );
  };

  return (
      <>
        <div style={{
               paddingBottom: "10px",
               width: "100%",
             }}>
          {getAllPlayers(users, userDetails, gameState, getCurrentUserId())}
        </div>

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
            {lastCombo(getLastPlayedCards())}
          </div>
        </div>
           
     
      <div style={{width: "100%", paddingTop: "6vh"}}>
        {currentPlayerCards(getCurrentUserCards(), selectedCards, setSelectedCards)}
      </div>

      <div>
            <button 
              style={{ marginRight: '5%', padding: '1% 2%', fontSize: '5vh' }}
              onClick={handlePlayCards}
              disabled={selectedCards.length === 0 || gameState?.current_player !== getCurrentUserId()}
            >
              Play
            </button>
            <button 
              style={{ padding: '1vh 2vw', fontSize: '5vh' }}
              onClick={handlePass}
              disabled={gameState?.current_player !== getCurrentUserId()}
            >
              Pass
            </button>
      </div>
      </>
  );
}

export default VietcongGameScreen;
