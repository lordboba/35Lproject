import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";
const WS = "ws://localhost:8000";
const usernames = ["fishp1", "fishp2", "fishp3", "fishp4", "fishp5", "fishp6"];

const suitSymbols = {
  1: "♣",
  2: "♦",
  3: "♥",
  4: "♠",
};

const rankSymbols = {
  0: "J?", A: "A", 1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6",
  7: "7", 8: "8", 9: "9", 10: "T", 11: "J", 12: "Q", 13: "K",
};

function formatCard(card) {
  if (!card || card.rank === undefined || card.suit === undefined) return "?";
  if (card.rank === 0) return card.suit === 1 ? "JB" : "JR";
  return `${rankSymbols[card.rank]}${suitSymbols[card.suit] ?? "?"}`;
}

function App() {
  const [gameId, setGameId] = useState(null);
  const [userIds, setUserIds] = useState([]);
  const [log, setLog] = useState([]);
  const [screen, setScreen] = useState("setup");

  const [debug, setDebug] = useState([]);
  const [gameState, setGameState] = useState(null);

  const [cardInput, setCardInput] = useState("");
  const [turnType, setTurnType] = useState(0); // 0 = question, 1 = claim
  const [questionTarget, setQuestionTarget] = useState(null); // opponent to ask

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
      name: `Fish-${Date.now()}`,
      type: "fish",
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
    if (!gameId || !gameState || !gameState.current_player) return;

    const currentPlayer = gameState.current_player;
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

    let transactions = [];

    if (turnType === 0 && questionTarget && cards.length === 1) {
      const rank = rankDict[cards[0][0]];
      const suit = suitDict[cards[0][1]];
      transactions = [{
        sender: questionTarget,
        receiver: currentPlayer,
        card: { rank, suit },
        success: true,
      }];
    } else if (turnType === 1) {
      transactions = cards.map((card) => {
        const rank = rankDict[card[0]];
        const suit = suitDict[card[1]];
        return {
          sender: currentPlayer,
          receiver: "unknown", // actual receiver handled by backend
          card: { rank, suit },
          success: true,
        };
      });
    }

    const turn = {
      player: currentPlayer,
      transactions,
      type: turnType,
    };

    try {
      await axios.patch(`${API}/games/${gameId}/play`, turn);
      setCardInput("");
      setQuestionTarget(null);
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
      setGameState(msg);
      setDebug((prev) => {
        if (Array.isArray(msg)) return msg;
        return [...prev, JSON.stringify(msg)];
      });
    };
    ws.onerror = (e) => console.error("WS error:", e);
    return () => ws.close();
  }, [gameId, screen]);

  const currentPlayer = gameState?.current_player;
  const owners = gameState?.owners ?? {};
  const playerStatus = gameState?.player_status ?? {};
  const currentTeam = playerStatus?.[currentPlayer];

  const opponents = Object.keys(owners)
    .filter((id) => owners[id].is_player && id !== currentPlayer && playerStatus[id] !== currentTeam);

  return (
    <div style={{ padding: 30 }}>
      <button onClick={() => setScreen(screen === "setup" ? "play" : "setup")}>
        Switch to {screen === "setup" ? "Play" : "Setup"}
      </button>

      {screen === "setup" ? (
        <>
          <h1>Fish Manual Setup</h1>
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
          <h1>🐟 Fish Turn Play</h1>
          <h3>Game ID:</h3>
          <pre>{gameId}</pre>

          <h3>Current Player:</h3>
          <p style={{ fontWeight: "bold", color: "orange" }}>{currentPlayer}</p>

          <h3>All Player Hands:</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1em" }}>
            {Object.entries(owners)
              .filter(([id, owner]) => owner.is_player)
              .map(([id, owner]) => {
                const team = playerStatus?.[id];
                const bgColor =
                  team === 1 ? "#004488" : team === 2 ? "#884400" : "#111";

                return (
                  <div
                    key={id}
                    style={{
                      border: id === currentPlayer ? "2px solid gold" : "1px solid gray",
                      padding: 10,
                      background: bgColor,
                      color: "white",
                      borderRadius: 10,
                    }}
                  >
                    <strong>{id} {team ? `(Team ${team})` : ""}</strong>
                    <p>{owner.cards.map(formatCard).join(", ") || "(no cards)"}</p>
                  </div>
                );
              })}
          </div>

          <h3 style={{ marginTop: 20 }}>Play Turn (as {currentPlayer})</h3>
          <input
            placeholder="e.g. 3S or 2C,3C,..."
            value={cardInput}
            onChange={(e) => setCardInput(e.target.value)}
            style={{ marginRight: 10 }}
          />

          {turnType === 0 && (
            <select
              value={questionTarget ?? ""}
              onChange={(e) => setQuestionTarget(e.target.value)}
              style={{ marginRight: 10 }}
            >
              <option value="">Select Opponent</option>
              {opponents.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          )}

          <label style={{ marginRight: 10 }}>
            <input
              type="radio"
              checked={turnType === 0}
              onChange={() => setTurnType(0)}
            />
            ❓ Question
          </label>
          <label style={{ marginRight: 10 }}>
            <input
              type="radio"
              checked={turnType === 1}
              onChange={() => setTurnType(1)}
            />
            ✅ Claim
          </label>
          <button onClick={playTurn} disabled={!currentPlayer}>
            Submit Turn
          </button>

          <h3 style={{ marginTop: 30 }}>🔍 Game Debug Info</h3>
          <div style={{ background: "#222", color: "white", padding: 10, borderRadius: 10 }}>
            <p><strong>Status:</strong> {gameState?.status === 0 ? "Normal" : gameState?.status === 2 ? "Claim Mode" : "Game Over"}</p>

            <p><strong>Last Turn:</strong> {gameState?.last_turn?.player ?? "N/A"} — {gameState?.last_turn?.transactions?.map(t => `${formatCard(t.card)} from ${t.sender} → ${t.receiver} (${t.success ? "✔" : "❌"})`).join(", ") || "N/A"}</p>

            <p><strong>Options Owner:</strong> {gameState?.owners?.options?.cards?.map(formatCard).join(", ") || "(empty)"}</p>

            <p><strong>Player Status:</strong> {Object.entries(gameState?.player_status ?? {}).map(([id, stat]) => `${id}: ${stat}`).join(" | ")}</p>
          </div>

          <h3 style={{ marginTop: 20 }}>🧠 Raw GameState JSON:</h3>
          <pre style={{ background: "#111", color: "lime", padding: 10, maxHeight: 400, overflowY: "scroll" }}>
            {JSON.stringify(gameState, null, 2)}
          </pre>

        </>
      )}
    </div>
  );
}

export default App;
