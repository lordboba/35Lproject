import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './Vietcong.css';

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
          cursor: "default",
          padding: "1px",
          border: "1px solid black",
          borderRadius: "8px",
          transform: "translateY(0px)",
          transition: "none",
          boxShadow: "none",
        }}
        alt={cardname}
      />
    );
  });
  return (
    <div style={{
      display: 'inline-flex',
      gap: '0.5vw',
      alignItems: 'center',
      overflowX: 'auto',
      justifyContent: 'center',
    }}>
      {cardlist}
    </div>
  );
}

function lastCombo(cards){
  const numCards = cards.length;
  if (numCards === 0) {
    return null; 
  }
  const cardWidthVW = 8; 
  const defaultSpacingVW = 1; 
  const overlapPercentage = 0.44;
  const containerWidthThresholdVW = 50; 
  const totalSpacedWidthVW = (numCards * cardWidthVW) + (Math.max(0, numCards - 1) * defaultSpacingVW);
  const useOverlap = totalSpacedWidthVW > containerWidthThresholdVW;
  let cardlist = []
  cards.forEach((cardname, index) => {
    let currentCardMarginLeftVW;
    if (index === 0) {
      currentCardMarginLeftVW = 0
    } else {
      if (useOverlap) {
        currentCardMarginLeftVW = -cardWidthVW * overlapPercentage;
      } else {
        currentCardMarginLeftVW = defaultSpacingVW;
      }
    }
    cardlist.push(<img
      key={`${cardname}-${index}`} 
      src={`/${cardname}icon.svg`}
      style={{
        maxWidth: `${cardWidthVW}vw`,
        height: "auto", 
        objectFit: 'contain',
        marginLeft: `${currentCardMarginLeftVW}vw`,
        zIndex: index, 
        position: 'relative', 
        boxShadow: '2px 2px 15px rgba(0,0,0,0.3)',
      }}
      alt={cardname}
    />)
  })
  return (
    <div style={{
      width: '100%', 
      display: 'flex',
      alignItems: 'center', 
      justifyContent: 'center', 
      overflowX: 'hidden',
    }}>
      {cardlist}
    </div>
  );
}

function otherPlayer(userId, userDetails, moving = false, cardCount = 13, isCurrentUser = false, playerStatus = null, handlePlayerClick) {
  const username = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;
  let statusText = '';
  let statusColor = 'var(--error-color)';
  let isFinished = false;
  if (playerStatus === -1) {
    statusText = 'PASSED';
    statusColor = 'var(--error-color)';
  } else if (playerStatus === 1) {
    statusText = '1st PLACE';
    statusColor = 'var(--first-place-color)'; // Use CSS variable (Gold)
    isFinished = true;
  } else if (playerStatus === 2) {
    statusText = '2nd PLACE';
    statusColor = 'var(--second-place-color)'; // Use text color for silver-like appearance
    isFinished = true;
  } else if (playerStatus === 3) {
    statusText = '3rd PLACE';
    statusColor = 'var(--third-place-color)'; // Use text color for bronze-like appearance
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
      cursor: 'pointer',
    }} onClick={() => handlePlayerClick(userId)}>
      <div style={{
        color: isCurrentUser ? 'var(--highlight-color)' : 'var(--text-color)',
        fontSize: '1.2vw',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '0.5vh',
        minHeight: '2vh',
        textShadow: isCurrentUser ? '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000' : 'none',
        border: isCurrentUser ? '2px solid var(--player-border-color)' : 'none',
        borderRadius: isCurrentUser ? '8px' : '0',
        padding: isCurrentUser ? '4px 8px' : '0',
        backgroundColor: isCurrentUser ? 'var(--player-bg-color)' : 'transparent',
      }}>
        {username}
        {statusText && (
          <div style={{
            color: statusColor,
            fontSize: '0.9vw',
            fontWeight: 'bold',
            marginTop: '2px',
            textShadow: '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000',
          }}>
            {statusText}
          </div>
        )}
      </div>
      {moving && (
        <div style={{
          width: '80%',
          color: 'var(--success-color)',
          fontSize: '1.2vw',
          fontWeight: 'bold',
          textAlign: 'center',
          textShadow: '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000',
          backgroundColor: 'var(--current-turn-bg-color)',
          borderRadius: '8px',
          padding: '2px 6px',
          border: '2px solid var(--current-turn-border-color)',
        }}>
          CURRENT TURN
        </div>
      )}
      <img
        src={"/backicon.svg"}
        alt="card back"
        style={{
          height: '15vh',
          display: 'block',
          borderRadius: '8px',
          border: '1px solid var(--card-border-color)',
          opacity: (playerStatus === -1 || isFinished) ? 0.6 : 1,
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: '60%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--card-count-text-color)',
          fontSize: '4vh',
          fontWeight: 'bold',
          pointerEvents: 'none',
          textShadow: '2px 0 var(--card-count-shadow-color), -2px 0 var(--card-count-shadow-color), 0 2px var(--card-count-shadow-color), 0 -2px var(--card-count-shadow-color), 1px 1px var(--card-count-shadow-color), -1px -1px var(--card-count-shadow-color), 1px -1px var(--card-count-shadow-color), -1px 1px var(--card-count-shadow-color)'
        }}
      >
        {cardCount}
      </span>
    </div>
  );
}

function getAllPlayers(users, userDetails, gameState, mainPlayerId, handlePlayerClick) {
  if (!users || users.length === 0 || !gameState) {
    return <div style={{color: 'var(--text-color)'}}>Loading players...</div>;
  }
  let players = [];
  users.forEach((userId) => {
    const isCurrentPlayerTurn = gameState?.current_player === userId;
    const cardCount = gameState?.owners?.[userId]?.cards?.length || 0;
    const isMainReplayPlayer = userId === mainPlayerId;
    const playerStatus = gameState?.player_status?.[userId] || 0;
    players.push(otherPlayer(userId, userDetails, isCurrentPlayerTurn, cardCount, isMainReplayPlayer, playerStatus, handlePlayerClick));
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

function VietcongReplay() {
  const { replayId } = useParams();
  const location = useLocation();
  const [replayData, setReplayData] = useState(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [gameState, setGameState] = useState(null);
  const [users, setUsers] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [mainPlayerId, setMainPlayerId] = useState(null);

  // Function to convert backend card format to frontend format
  const convertCardToString = (card) => {
    const ranks = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    const suits = ['', 'C', 'D', 'H', 'S'];
    const rank = ranks[card.rank] || card.rank;
    const suit = suits[card.suit] || card.suit;
    return `${rank}${suit}`;
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

  const fetchAllUserDetails = async (userIds) => {
    const newUserDetails = { ...userDetails };
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

  useEffect(() => {
    const id = replayId || new URLSearchParams(location.search).get('id');
    if (!id) return;
    const fetchReplayData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/replays/${id}`);
        if (response.ok) {
          const data = await response.json();
          setReplayData(data);
          if (data.game_states && data.game_states.length > 0) {
            setGameState(data.game_states[0]);
            const playerIds = Object.keys(data.players);
            setUsers(playerIds);
            fetchAllUserDetails(playerIds);
            if (playerIds.length > 0) {
              setMainPlayerId(playerIds[0]);
            }
          }
        } else {
          setReplayData(null);
        }
      } catch (error) {
        setReplayData(null);
      }
    };
    fetchReplayData();
  }, [replayId, location]);

  useEffect(() => {
    if (!isReplaying || !replayData || currentTurnIndex >= replayData.game_states.length) {
      setIsReplaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setGameState(replayData.game_states[currentTurnIndex]);
      setCurrentTurnIndex(prevIndex => prevIndex + 1);
    }, playbackSpeed);
    return () => clearTimeout(timer);
  }, [isReplaying, replayData, currentTurnIndex, playbackSpeed]);

  const getMainPlayerCards = () => {
    if (!gameState || !gameState.owners || !mainPlayerId) {
      return [];
    }
    const userCards = gameState.owners[mainPlayerId]?.cards || [];
    return userCards.map(card => convertCardToString(card));
  };

  const getLastPlayedCards = () => {
    if (!gameState || !gameState.last_turn || !gameState.last_turn.transactions) {
      return [];
    }
    const cardsPlayedToPile = gameState.last_turn.transactions.filter(
      transaction => transaction.receiver === "pile"
    );
    return cardsPlayedToPile.map(transaction =>
      convertCardToString(transaction.card)
    );
  };

  const handlePlayPauseReplay = () => {
    setIsReplaying(!isReplaying);
  };

  const handleNextTurn = () => {
    if (replayData && currentTurnIndex < replayData.game_states.length - 1) {
      setGameState(replayData.game_states[currentTurnIndex + 1]);
      setCurrentTurnIndex(prevIndex => prevIndex + 1);
      setIsReplaying(false);
    }
  };

  const handlePrevTurn = () => {
    if (currentTurnIndex > 0) {
      setGameState(replayData.game_states[currentTurnIndex - 1]);
      setCurrentTurnIndex(prevIndex => prevIndex - 1);
      setIsReplaying(false);
    }
  };

  const handleFirstTurn = () => {
    if (replayData && replayData.game_states.length > 0) {
      setGameState(replayData.game_states[0]);
      setCurrentTurnIndex(0);
      setIsReplaying(false);
    }
  };

  const handleLastTurn = () => {
    if (replayData && replayData.game_states.length > 0) {
      const lastIndex = replayData.game_states.length - 1;
      setGameState(replayData.game_states[lastIndex]);
      setCurrentTurnIndex(lastIndex);
      setIsReplaying(false);
    }
  };

  const handleSpeedChange = (event) => {
    setPlaybackSpeed(parseInt(event.target.value));
  };

  const handlePlayerClick = (clickedPlayerId) => {
    setMainPlayerId(clickedPlayerId);
  };

  if (!replayData) {
    return <div style={{ color: '#FFF', fontSize: '2vw', textAlign: 'center', paddingTop: '20vh' }}>Loading replay...</div>;
  }

  return (
    <>
      <div style={{
        paddingBottom: "10px",
        width: "100%",
      }}>
        {getAllPlayers(users, userDetails, gameState, mainPlayerId, handlePlayerClick)}
      </div>
      <div style={{ width: "100%", height: "35vh", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
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
        <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          {lastCombo(getLastPlayedCards())}
        </div>
      </div>
      <div style={{ width: "100%" }}>
        {currentPlayerCards(getMainPlayerCards())}
      </div>
      <div style={{ marginTop: '2vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <button
          style={{ padding: '1% 2%', fontSize: '3vh' }}
          onClick={handleFirstTurn}
          disabled={currentTurnIndex === 0}
        >
          First
        </button>
        <button
          style={{ padding: '1% 2%', fontSize: '3vh' }}
          onClick={handlePrevTurn}
          disabled={currentTurnIndex === 0}
        >
          Previous
        </button>
        <button
          style={{ padding: '1% 2%', fontSize: '3vh' }}
          onClick={handlePlayPauseReplay}
        >
          {isReplaying ? 'Pause' : 'Play'}
        </button>
        <button
          style={{ padding: '1% 2%', fontSize: '3vh' }}
          onClick={handleNextTurn}
          disabled={currentTurnIndex >= replayData.game_states.length - 1}
        >
          Next
        </button>
        <button
          style={{ padding: '1% 2%', fontSize: '3vh' }}
          onClick={handleLastTurn}
          disabled={currentTurnIndex >= replayData.game_states.length - 1}
        >
          Last
        </button>
        <select onChange={handleSpeedChange} value={playbackSpeed}
          style={{ padding: '1% 1%', fontSize: '3vh', backgroundColor: '#333', color: 'white', borderRadius: '5px' }}>
          <option value={2000}>Slow (2s)</option>
          <option value={1000}>Normal (1s)</option>
          <option value={500}>Fast (0.5s)</option>
          <option value={250}>Very Fast (0.25s)</option>
        </select>
        <span style={{ color: 'var(--text-color)', fontSize: '2vh' }}>
          Turn: {currentTurnIndex} / {replayData.game_states.length - 1}
        </span>
      </div>
    </>
  );
}

export default VietcongReplay;
