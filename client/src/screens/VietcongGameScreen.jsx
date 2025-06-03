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

// Helper function to display other players in the game.
// Styles are largely consistent with Replay, adapted for VietcongGameScreen context (no POV click)
function otherPlayer(userId, userDetails, moving = false, cardCount = 13, isCurrentUser = false, playerStatus = null) {
  const username = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;

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
    <div style={{ // Root div for each player
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center', // Ensures content within this div is centered
      position: 'relative',
      // cursor: 'default', // No special cursor needed as in Replay's POV change
    }}>
      {/* Username label above cards */}
      <div style={{
        color: isCurrentUser ? '#FFD700' : '#FFF',
        fontSize: '1.2vw',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '0.5vh',
        minHeight: '2vh',
        textShadow: isCurrentUser ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
        border: isCurrentUser ? '2px solid #FFD700' : 'none',
        borderRadius: isCurrentUser ? '8px' : '0',
        padding: isCurrentUser ? '4px 8px' : '0',
        backgroundColor: isCurrentUser ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
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
          opacity: (playerStatus === -1 || isFinished) ? 0.6 : 1,
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: '60%', // Adjusted slightly based on common positioning for card counts
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
          width: '80%', // Or adjust as needed, e.g., 'auto' with padding
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

// Helper function to get all players for display.
// Adopting justifyContent and gap from Replay, keeping VietcongGameScreen's overflow & maxWidth
function getAllPlayers(users, userDetails, gameState, currentUserId) {
  if (!users || users.length === 0 || !gameState) {
    return <div style={{ color: '#FFF' }}>Loading players...</div>;
  }

  let playerElements = [];
  users.forEach((userId) => {
    const isCurrentPlayerTurn = gameState?.current_player === userId;
    const cardCount = gameState?.owners?.[userId]?.cards?.length || 0;
    const isCurrentUser = userId === currentUserId;
    const playerStatus = gameState?.player_status?.[userId] || null;
    // It's good practice for items in an array to have a key.
    // If otherPlayer is consistently returning a single root element,
    // React might handle it, but explicit keying on map is better.
    // For forEach -> push, the element pushed should ideally have a key if it's a component.
    // Here, we construct the element and push it.
    // To add a key here, one would typically .map and return <Component key={} /> or similar.
    // For now, sticking to structural changes based on provided code.
    playerElements.push(
      // Assuming 'otherPlayer' function returns a single root JSX element,
      // key should ideally be on that element or if this was a map:
      // users.map(userId => <OtherPlayerComponent key={userId} ... />)
      // For current structure, if issues arise, wrap with <React.Fragment key={userId}> or <div key={userId}>
      // or refactor otherPlayer to be a full component that accepts a key prop.
      // For this specific request, we are focusing on style and structure merge.
      // Adding key to the div returned by otherPlayer would be ideal if otherPlayer was a component.
      // For now, the direct push:
      React.createElement(
        'div', // Temporary wrapper for key, if issues with direct push arise. Or pass key to otherPlayer if it can take it.
        { key: userId }, // Add key here
        otherPlayer(userId, userDetails, isCurrentPlayerTurn, cardCount, isCurrentUser, playerStatus)
      )
    );
  });

  return (
    <div style={{
      maxWidth: '80%', // Keep max width for responsiveness in game screen
      display: 'flex',
      flexDirection: 'row',
      gap: '20px', // Adjusted gap, inspired by Replay's fixed gap
      alignItems: 'center',
      justifyContent: 'center', // Adopted from Replay for centering player group
      overflowX: 'auto', // Keep scroll for many players
      scrollbarWidth: 'thin',
      msOverflowStyle: 'auto',
      // padding: '0 10%' // If content is not centered enough with maxWidth and justifyContent
    }}>
      {playerElements}
    </div>
  );
}


// Helper function to handle card display logic, adapted for interactivity
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
          cursor: "pointer", // Essential for game interaction
          padding: "1px", // From Replay
          border: isSelected ? "3px solid #007BFF" : "1px solid black", // Mix: Replay unselected, VCS selected
          borderRadius: "8px", // Consistent
          transform: isSelected ? "translateY(-10px)" : "translateY(0px)", // Essential for game interaction
          transition: "all 0.2s ease-in-out", // Essential for game interaction
          boxShadow: isSelected ? "0 4px 8px rgba(0, 123, 255, 0.3)" : "none", // Essential for game interaction
          // Removed incorrect 'display: flex' and 'gap' from individual img styles
        }}
        alt={cardname}
        onClick={() => cardClicked(cardname, selectedCards, setSelectedCards)}
      />
    );
  });

  return (
    <div style={{
      width: '100%', // Take full width for centering content
      display: 'inline-flex', // Or 'flex' if it should be a block-level flex container
      gap: '0.5vw',
      alignItems: 'center',
      justifyContent: 'center', // From Replay, ensures cards are centered
      overflowX: 'auto',
      scrollbarWidth: 'thin', // From original VCS
      msOverflowStyle: 'auto', // From original VCS
      // padding: '0.5vw 0', // Optional padding for the container
    }}>
      {cardlist}
    </div>
  );
}

// Helper function to display the last played combination of cards.
// Styles are identical to Replay, so no change needed from original VietcongGameScreen.
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
    scrollbarWidth: 'thin',
    msOverflowStyle: 'auto'
  }}
  >
    {cardlist}
  </div>
}

function VietcongGameScreen() {
  const location = useLocation();
  const { backendUser } = useOutletContext();
  const [currentUser, setCurrentUser] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [websocket, setWebsocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [users, setUsers] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [selectedCards, setSelectedCards] = useState([]);
  // const [games, setGames] = useState([]); // This was defined but not used in provided snippet

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    if (id) {
      setGameId(id);
    }
  }, [location]);

  const convertCardToString = (card) => {
    const ranks = ['','A','2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    const suits = ['','C', 'D', 'H', 'S'];
    const rank = ranks[card.rank] || card.rank;
    const suit = suits[card.suit] || card.suit;
    return `${rank}${suit}`;
  };

  const convertStringToCard = (cardString) => {
    const ranks = ['','A','2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    const suits = ['','C', 'D', 'H', 'S'];
    const rank = cardString.slice(0, -1);
    const suit = cardString.slice(-1);
    return {
      rank: ranks.indexOf(rank),
      suit: suits.indexOf(suit)
    };
  };

  const generatePlayTurnModel = (currentSelectedCards) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId || currentSelectedCards.length === 0) {
      return null;
    }
    const transactions = currentSelectedCards.map(cardString => ({
      sender: currentUserId,
      receiver: "pile",
      card: convertStringToCard(cardString),
      success: true
    }));
    return {
      player: currentUserId,
      transactions: transactions,
      type: 0
    };
  };

  const generatePassTurnModel = () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      return null;
    }
    return {
      player: currentUserId,
      transactions: [],
      type: 1
    };
  };

  const getCurrentUserCards = () => {
    const currentUserId = getCurrentUserId();
    if (!gameState || !gameState.owners || !currentUserId) {
      return [];
    }
    const userCards = gameState.owners[currentUserId]?.cards || [];
    return userCards.map(card => convertCardToString(card));
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`);
      if (response.ok) {
        return await response.json();
      } else {
        console.error(`Failed to fetch user details for ${userId}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching user details for ${userId}:`, error);
      return null;
    }
  };

  const fetchAllUserDetails = async (userIds) => {
    const newUserDetails = { ...userDetails };
    const usersToFetch = userIds.filter(userId => !newUserDetails[userId]);
    if (usersToFetch.length === 0) return;

    const fetchPromises = usersToFetch.map(async (userId) => {
      const userData = await fetchUserDetails(userId);
      if (userData) {
        newUserDetails[userId] = userData;
      }
    });
    await Promise.all(fetchPromises);
    setUserDetails(newUserDetails);
  };

  useEffect(() => {
    if (!gameId || !currentUser) return;
    const wsUrl = getWebSocketURL(`/game/ws/${gameId}`);
    console.log('Connecting to game WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => console.log('Game WebSocket connection established');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received game state:', data);
      setGameState(data);
      if (data.owners) {
        const playerIds = Object.keys(data.owners).filter(id => id !== 'pile' && data.owners[id].is_player);
        setUsers(playerIds);
        fetchAllUserDetails(playerIds);
      }
    };
    ws.onerror = (error) => console.error('Game WebSocket error:', error);
    ws.onclose = () => console.log('Game WebSocket connection closed');
    setWebsocket(ws);
    return () => {
      if (ws) ws.close();
    };
  }, [gameId, currentUser]); // Removed userDetails from dependency array as fetchAllUserDetails updates it

  const getCurrentUserId = () => backendUser?.id || null;

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnModel)
      });
      if (response.ok) {
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

  const handlePass = async () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      alert("User not authenticated!");
      return;
    }
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
        headers: { 'Content-Type': 'application/json' },
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

  const getLastPlayedCards = () => {
    if (!gameState || !gameState.last_turn || !gameState.last_turn.transactions) {
      return [];
    }
    const cardsPlayedToPile = gameState.last_turn.transactions.filter(
      transaction => transaction.receiver === "pile" // Ensure only cards to pile are shown
    );
    return cardsPlayedToPile.map(transaction =>
      convertCardToString(transaction.card)
    );
  };

  if (!currentUser || !backendUser) {
    return <div style={{ color: '#FFF', textAlign: 'center', paddingTop: '20vh' }}>Authenticating user...</div>;
  }
  if (!gameId) {
    return <div style={{ color: '#FFF', textAlign: 'center', paddingTop: '20vh' }}>No game ID specified.</div>;
  }
  if (!gameState) {
    return <div style={{ color: '#FFF', textAlign: 'center', paddingTop: '20vh' }}>Loading game state...</div>;
  }

  return (
      <>
        {/* Top section: Display all players */}
        <div style={{
               paddingBottom: "10px", // Consistent with Replay
               width: "100%",
             }}>
          {getAllPlayers(users, userDetails, gameState, getCurrentUserId())}
        </div>

        {/* Middle section: Table and last played combo */}
        <div style={{
          width: "100%",
          height: "35vh", // Adopted from Replay
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative"
          // Removed paddingBottom: "8%" from VCS
        }}>
          <img
            src={"/table.svg"}
            alt="table"
            style={{
              width: "100%",
              height: "90%", // Consistent with Replay
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 0
            }}
          />
          <div style={{ // Wrapper for lastCombo
            width: "100%",
            height: "100%",
            position: "absolute",
            top: "45%", // Adopted from Replay for better vertical centering of cards on table
            left: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100 // Ensure cards are above table
          }}>
            {lastCombo(getLastPlayedCards())}
          </div>
        </div>

        {/* Bottom section: Current player's cards */}
        <div style={{
          width: "100%",
          // Removed paddingTop: "4vh" from VCS, spacing adjusted by middle section height
          marginTop: "1vh", // Add a small margin for breathing room
          display: 'flex',
          justifyContent: 'center'
        }}>
          {currentPlayerCards(getCurrentUserCards(), selectedCards, setSelectedCards)}
        </div>

        {/* Game action buttons */}
        <div style={{
          marginTop: '2vh', // Added margin for spacing, similar to Replay's controls
          display: 'flex',
          justifyContent: 'center',
          gap: '20px' // Add gap between buttons
        }}>
            <button
              style={{ padding: '1% 2%', fontSize: '3vh' }} // Adjusted style for consistency
              onClick={handlePlayCards}
              disabled={selectedCards.length === 0 || gameState?.current_player !== getCurrentUserId()}
            >
              Play Cards
            </button>
            <button
              style={{ padding: '1% 2%', fontSize: '3vh' }} // Adjusted style for consistency
              onClick={handlePass}
              disabled={gameState?.current_player !== getCurrentUserId()}
            >
              Pass
            </button>
        </div>
        {/* Link to Replays (example, if needed) */}
        {gameState && gameState.game_over && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <h2 style={{ color: 'white' }}>Game Over!</h2>
            {/* You might want to navigate to a replay page or show a summary */}
            <Link to="/lobby" style={{ color: '#87CEFA', fontSize: '2vh' }}>Back to Lobby</Link>
          </div>
        )}
      </>
  );
}

export default VietcongGameScreen;
