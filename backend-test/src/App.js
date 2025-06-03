import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";
const WS = "ws://localhost:8000";
const usernames = ["vietcongp1", "vietcongp2", "vietcongp3", "vietcongp4"];

// Helper functions for card visualization
const getSuitSymbol = (suit) => {
  const symbols = { 1: "♣", 2: "♦", 3: "♥", 4: "♠" };
  return symbols[suit] || "?";
};

const getRankSymbol = (rank) => {
  if (rank === 0) return "0";
  if (rank === 1) return "A";
  if (rank >= 2 && rank <= 9) return rank.toString();
  if (rank === 10) return "T";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return "?";
};

const formatCard = (card) => {
  return `${getRankSymbol(card.rank)}${getSuitSymbol(card.suit)}`;
};

const CardComponent = ({ card }) => {
  const isRed = card.suit === 2 || card.suit === 3; // Diamonds or Hearts
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        margin: "2px",
        backgroundColor: "white",
        color: isRed ? "red" : "black",
        border: "1px solid #ccc",
        borderRadius: "4px",
        fontFamily: "monospace",
        fontWeight: "bold",
        minWidth: "24px",
        textAlign: "center",
      }}
    >
      {formatCard(card)}
    </span>
  );
};

const PlayerHand = ({ playerName, cards, isCurrentTurn }) => {
  return (
    <div
      style={{
        margin: "10px 0",
        padding: "10px",
        border: isCurrentTurn ? "2px solid #4CAF50" : "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: isCurrentTurn ? "#f0f8f0" : "#f9f9f9",
      }}
    >
      <h4 style={{ margin: "0 0 8px 0", color: isCurrentTurn ? "#4CAF50" : "#333" }}>
        {playerName} {isCurrentTurn && "⭐ (Current Turn)"}
        <span style={{ marginLeft: "10px", fontSize: "14px", color: "#666" }}>
          ({cards?.length || 0} cards)
        </span>
      </h4>
      <div>
        {cards && cards.length > 0 ? (
          cards.map((card, index) => <CardComponent key={index} card={card} />)
        ) : (
          <span style={{ color: "#999", fontStyle: "italic" }}>No cards</span>
        )}
      </div>
    </div>
  );
};

const GameStateVisualization = ({ gameState, userIds, usernames, debug }) => {
  // Helper function to extract player data from debug messages
  const extractPlayerDataFromDebug = () => {
    if (!debug || debug.length === 0) return {};
    
    let playerData = {};
    
    // Try to parse each debug message to find player information
    for (let i = debug.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(debug[i]);
        
        // Check various possible structures
        if (parsed && typeof parsed === 'object') {
          let players = null;
          
          if (parsed.players) {
            players = parsed.players;
          } else if (parsed.state && parsed.state.players) {
            players = parsed.state.players;
          } else if (parsed.game && parsed.game.players) {
            players = parsed.game.players;
          } else if (Array.isArray(parsed)) {
            // If it's an array, look for player data in the items
            for (const item of parsed) {
              if (item && item.players) {
                players = item.players;
                break;
              }
            }
          }
          
          if (players) {
            playerData = players;
            break;
          }
        }
      } catch (e) {
        // Continue to next message if parsing fails
      }
    }
    
    return playerData;
  };

  const extractedPlayerData = extractPlayerDataFromDebug();
  const hasPlayerData = Object.keys(extractedPlayerData).length > 0;

  // Use game state if available, otherwise use extracted data
  const playersToShow = gameState?.players || extractedPlayerData;
  const currentTurn = gameState?.current_turn;
  const pile = gameState?.pile;
  const turnCount = gameState?.turn_count;

  return (
    <div>
      {/* Game Status Section */}
      {gameState && (
        <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Game Status</h3>
          <p style={{ margin: "5px 0" }}>
            <strong>Turn:</strong> {turnCount || 0}
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>Pile:</strong> {pile && pile.length > 0 ? (
              pile.map((card, index) => <CardComponent key={index} card={card} />)
            ) : (
              <span style={{ color: "#999", fontStyle: "italic" }}>Empty</span>
            )}
          </p>
        </div>
      )}

      {/* Player Cards Table */}
      <h3>Player Cards</h3>
      {Object.keys(playersToShow).length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Player</th>
              <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Cards</th>
              <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>Count</th>
              <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(playersToShow).map(([playerId, playerData]) => {
              const playerName = usernames.find((name, index) => 
                playerId === userIds[index]?.toString() || playerId === userIds[index]
              ) || `Player ${playerId}`;
              
              const isCurrentTurn = currentTurn === playerId || currentTurn === parseInt(playerId);
              const cards = playerData.hand || playerData.cards || [];
              
              return (
                <tr key={playerId} style={{ backgroundColor: isCurrentTurn ? "#f0f8f0" : "white" }}>
                  <td style={{ 
                    border: "1px solid #ddd", 
                    padding: "8px",
                    fontWeight: isCurrentTurn ? "bold" : "normal",
                    color: isCurrentTurn ? "#4CAF50" : "black"
                  }}>
                    {playerName} {isCurrentTurn && "⭐"}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
                      {cards && cards.length > 0 ? (
                        cards.map((card, index) => <CardComponent key={index} card={card} />)
                      ) : (
                        <span style={{ color: "#999", fontStyle: "italic" }}>No cards</span>
                      )}
                    </div>
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                    {cards?.length || 0}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                    {isCurrentTurn ? (
                      <span style={{ color: "#4CAF50", fontWeight: "bold" }}>Active</span>
                    ) : (
                      <span style={{ color: "#666" }}>Waiting</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: "20px", textAlign: "center", color: "#666", border: "1px solid #ddd", borderRadius: "4px" }}>
          <p>No player data available</p>
          <p style={{ fontSize: "14px", color: "#999" }}>
            Make sure the game is started and WebSocket is connected
          </p>
        </div>
      )}

      {/* Debug Information - Collapsible */}
      <details style={{ marginTop: "20px" }}>
        <summary style={{ cursor: "pointer", padding: "5px", backgroundColor: "#f5f5f5" }}>
          Debug Information ({hasPlayerData ? "✓ Player data found" : "✗ No player data"})
        </summary>
        <div style={{ background: "#f5f5f5", padding: "10px", margin: "10px 0", borderRadius: "4px" }}>
          {debug && debug.length > 0 ? (
            <div>
              <p><strong>Messages received:</strong> {debug.length}</p>
              <p><strong>Latest message structure:</strong></p>
              <pre style={{ background: "#111", color: "lime", padding: 10, fontSize: "12px", maxHeight: "200px", overflow: "auto" }}>
                {debug.slice(-1).join("\n")}
              </pre>
            </div>
          ) : (
            <p>No debug data available</p>
          )}
        </div>
      </details>
    </div>
  );
};

function App() {
  const [gameId, setGameId] = useState(null);
  const [userIds, setUserIds] = useState([]);
  const [log, setLog] = useState([]);
  const [screen, setScreen] = useState("setup");

  // For play screen
  const [debug, setDebug] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);
  const [cardInput, setCardInput] = useState("");
  const [turnType, setTurnType] = useState(0); // 0 = play, 1 = pass

  const logMsg = (msg) => setLog((prev) => [...prev, msg]);

  async function ensureUser(name) {
    try {
      const res = await axios.post(`${API}/users/`, {
        firebase_uid: name,
        name,
      });
      return res.data.id ?? res.data._id;
    } catch {
      const fallback = await axios.get(`${API}/users/name/${name}`);
      return fallback.data.id ?? fallback.data._id;
    }
  }

  async function setupGame() {
    logMsg("Creating users...");
    const ids = [];
    for (let name of usernames) {
      const id = await ensureUser(name);
      ids.push(id);
    }
    setUserIds(ids);
    logMsg("Users created.");

    const res = await axios.post(`${API}/games/`, {
      name: `Vietcong-${Date.now()}`,
      type: "vietcong",
    });
    const gid = res.data.id ?? res.data._id;
    setGameId(gid);
    logMsg(`Game created with ID: ${gid}`);

    for (let id of ids) {
      await axios.patch(`${API}/games/${gid}/add_user/${id}`);
    }
    logMsg("All users added to game.");
  }

  async function startGame() {
    if (!gameId) {
      logMsg("No game ID found.");
      return;
    }
    try {
      await axios.patch(`${API}/games/${gameId}/start`);
      logMsg("Game started!");
      setScreen("play");
    } catch (err) {
      logMsg("Error starting game: " + err.message);
    }
  }

  async function playTurn() {
    if (!gameId || userIds.length === 0) return;

    const playerId = userIds[selectedPlayerIndex];
    const sender = playerId;
    const receiver = "pile";
    const cards = cardInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    const rankDict = {
      "0": 0, A: 1, "2": 2, "3": 3, "4": 4,
      "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
      T: 10, J: 11, Q: 12, K: 13,
    };
    const suitDict = { C: 1, D: 2, H: 3, S: 4 };

    const turn = {
      player: playerId,
      transactions:
        turnType === 1
          ? []
          : cards.map((card) => ({
              sender,
              receiver,
              card: {
                rank: rankDict[card[0]],
                suit: suitDict[card[1]],
              },
              success: true,
            })),
      type: turnType,
    };

    try {
      await axios.patch(`${API}/games/${gameId}/play`, turn);
      setCardInput("");
    } catch (err) {
      alert("Invalid move!");
    }
  }

  useEffect(() => {
    if (!gameId || screen !== "play") return;

    const ws = new WebSocket(`${WS}/game/ws/${gameId}`);
    ws.onopen = () => console.log("Connected to WebSocket");
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      // Update debug output - replace old with new instead of accumulating
      if (Array.isArray(msg)) {
        setDebug(msg.map(item => JSON.stringify(item, null, 2)));
      } else {
        setDebug([JSON.stringify(msg, null, 2)]);
      }
      
      // Parse and update game state for visualization
      console.log("Received WebSocket message:", msg);
      
      try {
        let parsedState = null;
        
        if (Array.isArray(msg)) {
          // If it's an array, try each item
          for (let i = msg.length - 1; i >= 0; i--) {
            const item = msg[i];
            if (item && typeof item === 'object' && (item.players || item.state)) {
              parsedState = item.state || item;
              break;
            }
          }
        } else if (msg && typeof msg === 'object') {
          // If it's a single object
          if (msg.players) {
            parsedState = msg;
          } else if (msg.state && msg.state.players) {
            parsedState = msg.state;
          } else if (msg.game && msg.game.players) {
            parsedState = msg.game;
          }
        }
        
        if (parsedState) {
          console.log("Setting game state:", parsedState);
          setGameState(parsedState);
        } else {
          console.log("Could not find valid game state in message");
        }
      } catch (error) {
        console.error("Error parsing game state:", error);
      }
    };
    ws.onerror = (e) => console.error("WS error:", e);
    return () => ws.close();
  }, [gameId, screen]);

  return (
    <div style={{ padding: 30 }}>
      <button onClick={() => setScreen(screen === "setup" ? "play" : "setup")}>
        Switch to {screen === "setup" ? "Play" : "Setup"}
      </button>

      {screen === "setup" ? (
        <>
          <h1>Vietcong Manual Setup</h1>
          <button onClick={setupGame}>Create Game + Add Users</button>
          <button onClick={startGame} style={{ marginLeft: 10 }}>
            Start Game
          </button>

          <h3 style={{ marginTop: 20 }}>Game ID:</h3>
          <pre>{gameId ?? "None yet"}</pre>

          <h3>Log:</h3>
          <pre style={{ background: "#111", color: "lime", padding: 10 }}>
            {log.join("\n")}
          </pre>
        </>
      ) : (
        <>
          <h1>Vietcong Turn Play</h1>
          <h3>Game ID:</h3>
          <pre>{gameId}</pre>

          <GameStateVisualization gameState={gameState} userIds={userIds} usernames={usernames} debug={debug} />

          <h3>Play a Turn</h3>
          <label>Player:</label>
          <select
            value={selectedPlayerIndex}
            onChange={(e) => setSelectedPlayerIndex(parseInt(e.target.value))}
          >
            {usernames.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>

          <input
            placeholder="e.g. 3S,3D"
            value={cardInput}
            onChange={(e) => setCardInput(e.target.value)}
            disabled={turnType === 1}
            style={{ marginLeft: 10 }}
          />

          <label style={{ marginLeft: 10 }}>
            <input
              type="radio"
              checked={turnType === 0}
              onChange={() => setTurnType(0)}
            />
            Play
          </label>
          <label style={{ marginLeft: 10 }}>
            <input
              type="radio"
              checked={turnType === 1}
              onChange={() => setTurnType(1)}
            />
            Pass
          </label>
          <button style={{ marginLeft: 10 }} onClick={playTurn}>
            Submit Turn
          </button>

          <details style={{ marginTop: 20 }}>
            <summary>Debug Output (Raw JSON)</summary>
            <pre style={{ background: "#111", color: "lime", padding: 10, marginTop: 10 }}>
              {debug.join("\n") || "Waiting for updates..."}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}

export default App;
