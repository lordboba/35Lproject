import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { API_BASE_URL, getWebSocketURL } from '../config';

import './Vietcong.css'

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
  let statusColor = 'var(--error-color)'; // Use CSS variable
  let isFinished = false;

  if (playerStatus === -1) {
    statusText = 'PASSED';
    statusColor = 'var(--error-color)';
  } else if (playerStatus === 1) {
    statusText = '1st PLACE';
    statusColor = 'var(--highlight-color)'; // Use CSS variable (Gold)
    isFinished = true;
  } else if (playerStatus === 2) {
    statusText = '2nd PLACE';
    statusColor = 'var(--text-color)'; // Use text color for silver-like appearance
    isFinished = true;
  } else if (playerStatus === 3) {
    statusText = '3rd PLACE';
    statusColor = 'var(--text-color)'; // Use text color for bronze-like appearance
    isFinished = true;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      paddingLeft: '4%',
      paddingRight: '4%',
    }}>
      {/* Username label above cards */}
      <div style={{
        color: isCurrentUser ? 'var(--highlight-color)' : 'var(--text-color)', // Use CSS variables
        fontSize: '1.2vw',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '0.5vh',
        minHeight: '2vh',
        textShadow: isCurrentUser ? '1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000, 1px 1px #000, -1px -1px #000, 1px -1px #000, -1px 1px #000' : 'none',
        border: isCurrentUser ? '2px solid var(--player-border-color)' : 'none', // Use CSS variable
        borderRadius: isCurrentUser ? '8px' : '0',
        padding: isCurrentUser ? '4px 8px' : '0',
        backgroundColor: isCurrentUser ? 'var(--player-bg-color)' : 'transparent', // Use CSS variable
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
          height: '15vh',
          display: 'block',
          borderRadius: '8px',
          border: '1px solid var(--card-border-color)', // Use CSS variable
          opacity: (playerStatus === -1 || isFinished) ? 0.6 : 1,
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: '60%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--card-count-text-color)', // Use CSS variable
          fontSize: '4vh',
          fontWeight: 'bold',
          pointerEvents: 'none',
          textShadow: '2px 0 var(--card-count-shadow-color), -2px 0 var(--card-count-shadow-color), 0 2px var(--card-count-shadow-color), 0 -2px var(--card-count-shadow-color), 1px 1px var(--card-count-shadow-color), -1px -1px var(--card-count-shadow-color), 1px -1px var(--card-count-shadow-color), -1px 1px var(--card-count-shadow-color)'
        }}
      >
        {cardCount}
      </span>

      {moving && (
        <div style={{
          width: '80%',
          color: 'var(--success-color)', // Use CSS variable
          fontSize: '1.2vw',
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: '0.5vh',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          backgroundColor: 'var(--current-turn-bg-color)', // Use CSS variable
          borderRadius: '8px',
          padding: '2px 6px',
          border: '2px solid var(--current-turn-border-color)', // Use CSS variable
        }}>
          CURRENT TURN
        </div>
      )}
    </div>
  );
}

function getAllPlayers(users, userDetails, gameState, currentUserId) {
  if (!users || users.length === 0 || !gameState) {
    return <div style={{color: 'var(--text-color)'}}>Loading players...</div>; // Use CSS variable
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
      display: 'flex',
      flexDirection: 'row',
      gap: '10px',
      justifyContent: 'center',
      alignItems: 'center'
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
          border: isSelected ? "3px solid var(--primary-color)" : "1px solid var(--card-border-color)", // Use CSS variables
          borderRadius: "8px",
          padding: '2px',
          transform: isSelected ? "translateY(-10px)" : "translateY(0px)",
          transition: "all 0.2s ease-in-out",
          boxShadow: isSelected ? "0 4px 8px var(--card-shadow-color)" : "none", // Use CSS variable
        }}
        alt={cardname}
        onClick={() => cardClicked(cardname, selectedCards, setSelectedCards)}
      />
    );
  });

  return (
    <div style={{
      width: '100%',
      paddingBottom: '20px',
      display: 'inline-flex',
      gap: '0.5vw',
      alignItems: 'flex-end',
      alignContent: 'center',
      justifyContent: 'center'
    }}>
      {cardlist}
    </div>
  );
}

function lastCombo(cards){
  let cardlist = []
  cards.forEach(cardname => {
    cardlist.push(<img src={`/${cardname}icon.svg`} style={{width: "10%", display: "block"}} alt={cardname} key={cardname}/>)
  })
  return <div
  style={{
    width: '100%',
    display: 'flex',
    gap: '1vw',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  }}
  >
    {cardlist}
  </div>
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

  // No 'theme' state or 'toggleTheme' function needed for automatic detection

  // Apply theme based on browser's preferred color scheme
  useEffect(() => {
    const applySystemTheme = () => {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    // Apply theme on initial load
    applySystemTheme();

    // Listen for changes in preferred color scheme
    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (e.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    mediaQueryList.addEventListener('change', handleChange);

    // Cleanup listener on component unmount
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount


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

        <div style={{width: "100%", height: "35vh", display: "flex", justifyContent: "center", alignItems: "center", paddingBottom: "3%", position: "relative"}}>
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
          <div style={{width: "90%", height: "100%", position: "absolute", top: 0, left: "5%", display: "flex", justifyContent: "center", alignItems: "center", zIndex:100}}>
            {lastCombo(getLastPlayedCards())}
          </div>
        </div>


      <div style={{width: "100%"}}>
        {currentPlayerCards(getCurrentUserCards(), selectedCards, setSelectedCards)}
      </div>

      <div>
            <button
              style={{ marginRight: '5%', padding: '1% 2%', fontSize: '5vh',
                       backgroundColor: 'var(--primary-color)', color: 'var(--button-text-color)', border: '1px solid var(--card-border-color)', borderRadius: '8px' }}
              onClick={handlePlayCards}
              disabled={selectedCards.length === 0 || gameState?.current_player !== getCurrentUserId()}
            >
              Play
            </button>
            <button
              style={{ padding: '1vh 2vw', fontSize: '5vh',
                backgroundColor: 'var(--primary-color)', color: 'var(--button-text-color)', border: '1px solid var(--card-border-color)', borderRadius: '8px' }}
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
