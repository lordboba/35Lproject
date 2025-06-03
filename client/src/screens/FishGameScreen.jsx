import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { API_BASE_URL, getWebSocketURL } from '../config';

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
      statusText = 'CLAIMING';
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
          src={`/src/assets/${cardname}icon.svg`} 
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
        alignItems: 'center',
        overflowX: 'auto',
        scrollbarWidth: 'thin',
        msOverflowStyle: 'auto',
        justifyContent: 'center',
      }}>
        {cardlist}
      </div>
    );
  }
function startClaim(buttonNo){
  let names = ["♣ 2-7", "♦ 2-7", "♥ 2-7", "♠2-7", "♣ 9-A", "♦ 9-A", "♥ 9-A", "♠ 9-A", "8 & Joker",]
  console.log(buttonNo + "clicked")
  // API call to initialize the claim

}
// Half suit enum constants
const HalfSuit = {
  MIDDLE: 8,
  SPADES_LOW: 0,
  HEARTS_LOW: 1, 
  DIAMONDS_LOW: 2,
  CLUBS_LOW: 3,
  SPADES_HIGH: 4,
  HEARTS_HIGH: 5,
  DIAMONDS_HIGH: 6,
  CLUBS_HIGH: 7
};
function getClaimsArray(suits_1,suits_2){
  let claims = [0,0,0,0,0,0,0,0,0]
  
  // Convert card arrays to half suit sets
  const halfSuits1 = cardsToHalfSuit(suits_1);
  const halfSuits2 = cardsToHalfSuit(suits_2);
  
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
  return new Set(cards.map(card => cardToHalfSuit(card)));
}

function claimButtons(claims) {
  let names = ["♠ 2-7", "♥ 2-7", "♦ 2-7", "♣ 2-7", "8 & Joker", "♠ 9-A", "♥ 9-A", "♦ 9-A", "♣ 9-A"]
  return (
    <div style={{
      maxWidth: '80%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1vw',
    }}>
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
            style.background = '#3b82f6'; // blue
            style.color = '#1a3b78';
          } else if (claims[i] === 2) {
            style.background = '#ef4444'; // red
            style.color = '#78211a';
          }
          return (
            <button
              key={i}
              style={style}
              disabled={claims[i] !== 0}
              onClick={() => startClaim(i)}
            >
              {names[i]}
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
          let i = j + 5;
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
            style.background = '#3b82f6'; // blue
            style.color = '#1a3b78';
          } else if (claims[i] === 2) {
            style.background = '#ef4444'; // red
            style.color = '#78211a';
          }
          return (
            <button
              key={i}
              style={style}
              disabled={claims[i] !== 0}
              onClick={() => startClaim(i)}
            >
              {names[i]}
            </button>
          );
        })}
      </div>
    </div>
  );
}






function FishGameScreen() {
    const location = useLocation();
    const { backendUser } = useOutletContext();
    const [currentUser, setCurrentUser] = useState(null);
    const [gameId, setGameId] = useState(null);
    const [websocket, setWebsocket] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [users, setUsers] = useState([]);
    const [userDetails, setUserDetails] = useState({});
    
    // Card selection state
    const [selectedCards, setSelectedCards] = useState([]);
    
    const [games, setGames] = useState([]);
    // Remove hardcoded lastPlayedCards - will get from gameState instead
  
    // Get the current Firebase user
    useEffect(() => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setCurrentUser(user);
      });
      
      return () => unsubscribe();
    }, []);
    
    // Get the game ID from URL parameters
    useEffect(() => {
      const searchParams = new URLSearchParams(location.search);
      const id = searchParams.get('id');
      if (id) {
        setGameId(id);
      }
    }, [location]);

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


      const generatePlayTurnModel = (selectedCards, receiverUser) => {
        const currentUserId = getCurrentUserId();
        if (!currentUserId || selectedCards.length === 0) {
          return null;
        }
        
        const transactions = selectedCards.map(cardString => ({
          sender: currentUserId,
          receiver: receiverUser,
          card: convertStringToCard(cardString),
          success: true
        }));
        
        return {
          player: currentUserId,
          transactions: transactions,
          type: 0 // 0 = playing cards
        };
      };
  
      
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
            src={"/src/assets/table.svg"}
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
            {claimButtons(getClaimsArray(gameState?.owners?.["suits_1"]?.cards, gameState?.owners?.["suits_2"]?.cards))}
          </div>
        </div>
           
     
      <div style={{width: "100%", paddingTop: "4vh"}}>
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

export default FishGameScreen;