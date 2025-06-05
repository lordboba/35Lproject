import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './FishGameScreen.css';

// --- Helper Components and Functions (from FishGameScreen) ---

// Toast notification (not used in replay, but included for completeness)
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const toastClassName = `toast toast-${type || 'default'}`;
  return (
    <div className={toastClassName} onClick={onClose}>
      <div className="toast-content">
        <span>{message}</span>
        <button onClick={onClose} className="toast-close-btn">×</button>
      </div>
    </div>
  );
}

// Question/Claim Result Sidebar (from FishGameScreen)
function QuestionResultSidebar({ lastTurn, userDetails }) {
  if (!lastTurn) return null;
  // Question result
  if (lastTurn.type === 0 && lastTurn.transactions && lastTurn.transactions.length > 0) {
    const t = lastTurn.transactions[0];
    const ranks = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    const suits = ['', 'C', 'D', 'H', 'S'];
    let cardString;
    if (t.card.rank === 0) {
      if (t.card.suit === 1 || t.card.suit === 4) cardString = 'JB';
      else if (t.card.suit === 2 || t.card.suit === 3) cardString = 'JR';
    } else {
      cardString = `${ranks[t.card.rank] || t.card.rank}${suits[t.card.suit] || t.card.suit}`;
    }
    return (
      <div className={`question-result-fixed ${t.success ? 'question-result-success' : 'question-result-failure'}`}>
        <div className="question-result-header">Question Result</div>
        <div className="question-result-details">
          <div className="question-result-question">
            <strong>{userDetails[t.receiver]?.name || `Player ${t.receiver?.slice(-4)}`}</strong> asked <strong>{userDetails[t.sender]?.name || `Player ${t.sender?.slice(-4)}`}</strong> for:
          </div>
          <img src={`/${cardString}icon.svg`} className="question-result-card-image" alt={cardString} />
          <div className="question-result-outcome" style={{ color: t.success ? '#00FF00' : '#FF6B6B' }}>
            <strong>{userDetails[t.sender]?.name || `Player ${t.sender?.slice(-4)}`} {t.success ? 'HAS THE CARD!' : 'DOES NOT have the card'}</strong>
          </div>
        </div>
      </div>
    );
  }
  // Claim result
  if (lastTurn.type === 1 && lastTurn.transactions && lastTurn.transactions.length > 0) {
    // Build cardResults as in FishGameScreen
    const ranks = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    const suits = ['', 'C', 'D', 'H', 'S'];
    const cardResults = {};
    lastTurn.transactions.forEach((transaction) => {
      let cardString;
      if (transaction.card.rank === 0) {
        if (transaction.card.suit === 1 || transaction.card.suit === 4) cardString = 'JB';
        else if (transaction.card.suit === 2 || transaction.card.suit === 3) cardString = 'JR';
      } else {
        cardString = `${ranks[transaction.card.rank] || transaction.card.rank}${suits[transaction.card.suit] || transaction.card.suit}`;
      }
      if (!transaction.success) {
        cardResults[cardString] = {
          card: transaction.card,
          cardString,
          guessedPlayer: transaction.sender,
          actualPlayer: null,
          isCorrect: false,
        };
      } else {
        if (cardResults[cardString]) {
          cardResults[cardString].actualPlayer = transaction.sender;
        } else {
          cardResults[cardString] = {
            card: transaction.card,
            cardString,
            guessedPlayer: transaction.sender,
            actualPlayer: transaction.sender,
            isCorrect: true,
          };
        }
      }
    });
    return (
      <div className={`question-result-fixed ${lastTurn.success ? 'question-result-success' : 'question-result-failure'}`}>
        <div className="question-result-header">Claim Result</div>
        <div className="question-result-details">
          <div className="question-result-question" style={{ fontSize: '0.8vw', marginBottom: '4px' }}>
            <strong>{userDetails[lastTurn.player]?.name || `Player ${lastTurn.player?.slice(-4)}`}</strong> claimed:
          </div>
          <div className="claim-result-cards">
            {Object.values(cardResults).map(cardResult => (
              <div key={cardResult.cardString} className="claim-result-card-item">
                <img src={`/${cardResult.cardString}icon.svg`} className="question-result-card-image" alt={cardResult.cardString} />
                <div className="claim-result-card-details">
                  {cardResult.isCorrect ? (
                    <div className="claim-result-correct">
                      <span style={{ color: '#00FF00' }}>✅</span> {userDetails[cardResult.guessedPlayer]?.name || `P${cardResult.guessedPlayer.slice(-2)}`}
                    </div>
                  ) : (
                    <div className="claim-result-incorrect">
                      <div style={{ color: '#FF6B6B' }}>
                        <span>❌</span> {userDetails[cardResult.guessedPlayer]?.name || `P${cardResult.guessedPlayer.slice(-2)}`}
                      </div>
                      {cardResult.actualPlayer && (
                        <div style={{ color: '#FFD700', fontSize: '0.6em' }}>
                          Actually: {userDetails[cardResult.actualPlayer]?.name || `P${cardResult.actualPlayer.slice(-2)}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// Player display (from FishGameScreen)
function otherPlayer(userId, userDetails, moving = false, cardCount = 13, isCurrentUser = false, playerStatus = null, handlePlayerClick, showWinLoss = false, status = 0) {
  const username = userDetails[userId]?.name || `Player ${userId.slice(-4)}`;
  let statusText = '';
  let statusColor = '#FF6B6B';
  if (showWinLoss) {
    if (playerStatus === 1) {
      statusText = 'WIN';
      statusColor = '#10b981';
    } else if (playerStatus === 0) {
      statusText = 'LOSS';
      statusColor = '#ef4444';
    }
  } else {
    if (playerStatus === 1) {
      statusText = 'Team #1';
      statusColor = '#3b82f6';
    } else if (playerStatus === 2) {
      statusText = 'Team #2';
      statusColor = '#ef4444';
    }
  }
  return (
    <div className="player-container" onClick={() => handlePlayerClick(userId)} style={{ cursor: 'pointer' }}>
      <div className={`player-info ${isCurrentUser ? 'player-info-current' : 'player-info-other'}`}
        style={{
          fontSize: '1.2vw',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '0.5vh',
          minHeight: '2vh',
          height: '4.5vw', // Reserve space for username, status, and current turn
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <span style={{
          color: isCurrentUser ? 'var(--highlight-color)' : 'var(--text-color)',
          textShadow: isCurrentUser ? '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000' : 'none',
          border: isCurrentUser ? '2px solid var(--player-border-color)' : 'none',
          borderRadius: isCurrentUser ? '8px' : '0',
          padding: isCurrentUser ? '4px 8px' : '0',
          backgroundColor: isCurrentUser ? 'var(--player-bg-color)' : 'transparent',
        }}>{username}</span>
        {statusText && (
          <div className="player-status" style={{ color: statusColor, textShadow: '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000' }}>
            {statusText}
          </div>
        )}
        {moving && (
          <div className="player-current-turn" style={{ textShadow: '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000', marginTop: '2px' }}>
            {status === 2 ? 'CLAIMING' : 'CURRENT TURN'}
          </div>
        )}
      </div>
      <img src={"/backicon.svg"} alt="card back" className="player-card-back" />
      <span className="player-card-count">{cardCount}</span>
    </div>
  );
}
function getAllPlayers(users, userDetails, gameState, mainPlayerId, handlePlayerClick, showWinLoss = false) {
  if (!users || users.length === 0 || !gameState) {
    return <div style={{ color: '#FFF' }}>Loading players...</div>;
  }
  let players = [];
  users.forEach((userId) => {
    const isCurrentPlayer = gameState?.current_player === userId;
    const cardCount = gameState?.owners?.[userId]?.cards?.length || 0;
    const isMainReplayPlayer = userId === mainPlayerId;
    const playerStatus = gameState?.player_status?.[userId] ?? null;
    players.push(otherPlayer(userId, userDetails, isCurrentPlayer, cardCount, isMainReplayPlayer, playerStatus, handlePlayerClick, showWinLoss, gameState.status));
  });
  return <div className="players-container">{players}</div>;
}
function currentPlayerCards(cards) {
  let cardlist = [];
  cards.forEach(cardname => {
    cardlist.push(
      <img key={cardname} src={`/${cardname}icon.svg`} className="player-card" alt={cardname} />
    );
  });
  return <div className="current-player-cards">{cardlist}</div>;
}

// Add getClaimsArray and cardsToHalfSuit helpers from FishGameScreen
function getClaimsArray(suits_1, suits_2) {
  let claims = [0,0,0,0,0,0,0,0,0];
  const safeCards1 = suits_1 || [];
  const safeCards2 = suits_2 || [];
  const halfSuits1 = cardsToHalfSuit(safeCards1);
  const halfSuits2 = cardsToHalfSuit(safeCards2);
  for (let i = 0; i < 9; i++) {
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
    return 8;
  }
  return (card.rank > 8 || card.rank === 1) * 4 + card.suit - 1;
}
function cardsToHalfSuit(cards) {
  if (!cards || !Array.isArray(cards)) {
    return new Set();
  }
  return new Set(cards.map(card => cardToHalfSuit(card)));
}
// Read-only claimButtons for replay
function claimButtonsReadOnly(claims) {
  let names = ["♣ 2-7", "♦ 2-7","♥ 2-7","♠ 2-7", "♣ 9-A",  "♦ 9-A", "♥ 9-A","♠ 9-A", "8 & Joker" ];
  const renderButtonText = (name, index) => {
    if (index === 8) {
      return (
        <span className="claim-joker-text">
          8's & Jokers
        </span>
      );
    }
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
      <div className="claim-buttons-header">HALF-SUIT CLAIMS</div>
      <div className="claim-buttons-row">
        {Array.from({ length: 4 }).map((_, i) => {
          let className = 'claim-button';
          if (claims[i] === 0) {
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
              disabled
              style={{ cursor: 'default' }}
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
              disabled
              style={{ cursor: 'default' }}
            >
              {renderButtonText(names[i], i)}
            </button>
          );
        })}
      </div>
      <div className="claim-buttons-row claim-buttons-row-second">
        {(() => {
          let i = 8;
          let className = 'claim-button';
          if (claims[i] === 0) {
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
              disabled
              style={{ cursor: 'default' }}
            >
              {renderButtonText(names[i], i)}
            </button>
          );
        })()}
      </div>
    </div>
  );
}

// --- Main FishReplay Component ---
function FishReplay() {
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

  // Card conversion
  const convertCardToString = (card) => {
    const ranks = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
    const suits = ['', 'C', 'D', 'H', 'S'];
    if (card.rank === 0) {
      if (card.suit === 1 || card.suit === 4) return 'JB';
      if (card.suit === 2 || card.suit === 3) return 'JR';
    }
    return `${ranks[card.rank] || card.rank}${suits[card.suit] || card.suit}`;
  };

  // Fetch user details
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

  // Fetch replay data
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
            const playerIds = Object.keys(data.players || data.player_names || {});
            setUsers(playerIds);
            fetchAllUserDetails(playerIds);
            if (playerIds.length > 0) setMainPlayerId(playerIds[0]);
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

  // Replay playback logic
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

  // Get main player's cards
  const getMainPlayerCards = () => {
    if (!gameState || !gameState.owners || !mainPlayerId) return [];
    const userCards = gameState.owners[mainPlayerId]?.cards || [];
    return userCards.map(card => convertCardToString(card));
  };

  // --- Controls ---
  const handlePlayPauseReplay = () => setIsReplaying(!isReplaying);
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
  const handleSpeedChange = (event) => setPlaybackSpeed(parseInt(event.target.value));
  const handlePlayerClick = (clickedPlayerId) => setMainPlayerId(clickedPlayerId);

  // --- Main Render ---
  if (!replayData) {
    return <div style={{ color: '#FFF', fontSize: '2vw', textAlign: 'center', paddingTop: '20vh' }}>Loading replay...</div>;
  }
  const isLastTurn = replayData && currentTurnIndex === replayData.game_states.length - 1;
  return (
    <>
      <div className="game-container">{getAllPlayers(users, userDetails, gameState, mainPlayerId, handlePlayerClick, isLastTurn)}</div>
      <div className="game-table-container">
        <div className="game-table-with-sidebar">
          <div className="game-table-main">
            <img src={"/table.svg"} alt="table" className="game-table-image" />
            <div className="game-table-overlay">
              {claimButtonsReadOnly(getClaimsArray(gameState?.owners?.["suits_1"]?.cards, gameState?.owners?.["suits_2"]?.cards))}
            </div>
          </div>
          <div className="question-result-sidebar">
            {gameState?.last_turn && (
              <QuestionResultSidebar lastTurn={gameState.last_turn} userDetails={userDetails} />
            )}
          </div>
        </div>
      </div>
      <div className="player-cards-section">{currentPlayerCards(getMainPlayerCards())}</div>
      <div style={{ marginTop: '2vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <button style={{ padding: '1% 2%', fontSize: '3vh' }} onClick={handleFirstTurn} disabled={currentTurnIndex === 0}>First</button>
        <button style={{ padding: '1% 2%', fontSize: '3vh' }} onClick={handlePrevTurn} disabled={currentTurnIndex === 0}>Previous</button>
        <button style={{ padding: '1% 2%', fontSize: '3vh' }} onClick={handlePlayPauseReplay}>{isReplaying ? 'Pause' : 'Play'}</button>
        <button style={{ padding: '1% 2%', fontSize: '3vh' }} onClick={handleNextTurn} disabled={currentTurnIndex >= replayData.game_states.length - 1}>Next</button>
        <button style={{ padding: '1% 2%', fontSize: '3vh' }} onClick={handleLastTurn} disabled={currentTurnIndex >= replayData.game_states.length - 1}>Last</button>
        <select onChange={handleSpeedChange} value={playbackSpeed} style={{ padding: '1% 1%', fontSize: '3vh', backgroundColor: '#333', color: 'white', borderRadius: '5px' }}>
          <option value={2000}>Slow (2s)</option>
          <option value={1000}>Normal (1s)</option>
          <option value={500}>Fast (0.5s)</option>
          <option value={250}>Very Fast (0.25s)</option>
        </select>
        <span style={{ color: 'var(--text-color)', fontSize: '2vh' }}>Turn: {currentTurnIndex} / {replayData.game_states.length - 1}</span>
      </div>
    </>
  );
}

export default FishReplay; 