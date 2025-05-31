import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";
const WS = "ws://localhost:8000";
const usernames = ["vietcongp1", "vietcongp2", "vietcongp3", "vietcongp4"];

function App() {
  const [gameId, setGameId] = useState(null);
  const [userIds, setUserIds] = useState([]);
  const [log, setLog] = useState([]);
  const [screen, setScreen] = useState("setup");

  // For play screen
  const [debug, setDebug] = useState([]);
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
      setDebug((prev) => {
        if (Array.isArray(msg)) return msg;
        return [...prev, JSON.stringify(msg)];
      });
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

          <h3>Game Debug State:</h3>
          <pre style={{ background: "#111", color: "lime", padding: 10 }}>
            {debug.join("\n") || "Waiting for updates..."}
          </pre>

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
        </>
      )}
    </div>
  );
}

export default App;
