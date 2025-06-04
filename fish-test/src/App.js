// Core: React + Axios + WebSocket
import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";
const WS = "ws://localhost:8000";
const usernames = ["fishp1", "fishp2", "fishp3", "fishp4", "fishp5", "fishp6"];

const suitSymbols = { 1: "♣", 2: "♦", 3: "♥", 4: "♠" };
const rankSymbols = { 0: "J?", 1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "T", 11: "J", 12: "Q", 13: "K" };
const halfSuits = ["LOW_CLUB", "LOW_DIAMOND", "LOW_HEART", "LOW_SPADE", "HIGH_CLUB", "HIGH_DIAMOND", "HIGH_HEART", "HIGH_SPADE", "MIDDLE"];

function formatCard(card) {
  if (!card || card.rank === undefined || card.suit === undefined) return "?";
  if (card.rank === 0) return card.suit === 1 ? "JB" : "JR";
  return `${rankSymbols[card.rank]}${suitSymbols[card.suit] ?? "?"}`;
}

function getHalfSuitCards(halfSuitValue) {
  if (halfSuitValue === 8) {
    return [
      { rank: 8, suit: 1 }, { rank: 8, suit: 2 },
      { rank: 8, suit: 3 }, { rank: 8, suit: 4 },
      { rank: 0, suit: 1 }, { rank: 0, suit: 2 }
    ];
  }
  const suit = (halfSuitValue % 4) + 1;
  const baseOffset = Math.floor(halfSuitValue / 4) * 7;
  return Array.from({ length: 6 }, (_, i) => ({
    rank: (baseOffset + i + 1) % 13 + 1,
    suit
  }));
}

function App() {
  const [gameId, setGameId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [screen, setScreen] = useState("setup");
  const [log, setLog] = useState([]);
  const [turnType, setTurnType] = useState(0);
  const [questionTarget, setQuestionTarget] = useState("");
  const [cardInput, setCardInput] = useState("");
  const [selectedHalfSuit, setSelectedHalfSuit] = useState("");
  const [claimAssignments, setClaimAssignments] = useState([]);
  const [claimPlayer, setClaimPlayer] = useState(usernames[0]);

  const currentPlayer = gameState?.current_player;
  const owners = gameState?.owners ?? {};
  const playerStatus = gameState?.player_status ?? {};
  const currentTeam = playerStatus[currentPlayer];

  const playerIds = Object.keys(owners).filter(id => owners[id].is_player);
  const opponents = playerIds.filter(id => id !== currentPlayer && playerStatus[id] !== currentTeam);
  const teammates = playerIds.filter(id => id !== currentPlayer && playerStatus[id] === currentTeam);

  function displayNameFromId(id) {
    const index = playerIds.indexOf(id);
    return index >= 0 ? usernames[index] : id;
  }

  const logMsg = (msg) => setLog(prev => [...prev, msg]);

  async function setupGame() {
    const ids = await Promise.all(usernames.map(async name => {
      try {
        const res = await axios.post(`${API}/users/`, { firebase_uid: name, name });
        return res.data.id ?? res.data._id;
      } catch {
        const res = await axios.get(`${API}/users/name/${name}`);
        return res.data.id ?? res.data._id;
      }
    }));
    const res = await axios.post(`${API}/games/`, { name: `Fish-${Date.now()}`, type: "fish" });
    const gid = res.data.id ?? res.data._id;
    setGameId(gid);
    await Promise.all(ids.map(id => axios.patch(`${API}/games/${gid}/add_user/${id}`)));
    logMsg("All users added.");
  }

  async function startGame() {
    await axios.patch(`${API}/games/${gameId}/start`);
    setScreen("play");
  }

  async function playTurn() {
    const transactions = [];
  
    if (turnType === 0) {
      // ❓ Question
      const rankDict = { "0": 0, A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, T: 10, J: 11, Q: 12, K: 13 };
      const suitDict = { C: 1, D: 2, H: 3, S: 4 };
  
      let rank, suit;
      if (cardInput === "JB") {
        rank = 0;
        suit = 1;
      } else if (cardInput === "JR") {
        rank = 0;
        suit = 2;
      } else {
        const r = cardInput[0];
        const s = cardInput[1];
        rank = rankDict[r];
        suit = suitDict[s];
      }
  
      if (rank === undefined || suit === undefined) {
        alert("Invalid card input.");
        return;
      }
  
      transactions.push({
        sender: questionTarget,
        receiver: currentPlayer,
        card: { rank, suit },
        success: true
      });
  
    } else if (turnType === 1 && gameState.status === 0) {
      // ✅ Claim initiation
      const cards = getHalfSuitCards(halfSuits.indexOf(selectedHalfSuit));
      transactions.push({
        sender: claimPlayer,
        receiver: "",
        card: cards[0],
        success: true
      });
  
    } else if (turnType === 1 && gameState.status === 2) {
      // ✅ Full claim
      const cards = getHalfSuitCards(halfSuits.indexOf(selectedHalfSuit));
      const suitTeam = `suits_${playerStatus[currentPlayer]}`;
      for (let i = 0; i < 6; i++) {
        if (!claimAssignments[i]) return alert("Assign all cards.");
        transactions.push({
          sender: claimAssignments[i],
          receiver: suitTeam,
          card: cards[i],
          success: true
        });
      }
  
    } else if (turnType === 2) {
      // 🔁 Delegation
      if (!questionTarget) return alert("Select a teammate to delegate to.");
      transactions.push({
        sender: questionTarget,
        receiver: currentPlayer,
        card: { rank: 1, suit: 1 }, // dummy card
        success: true
      });
    }
  
    const turn = {
      player: turnType === 1 ? claimPlayer : currentPlayer,
      type: turnType,
      transactions
    };
  
    console.log("[DEBUG] Sending turn to backend:", turn);
  
    try {
      await axios.patch(`${API}/games/${gameId}/play`, turn);
      setCardInput("");
      setClaimAssignments([]);
    } catch (err) {
      console.error("[DEBUG] Backend error:", err.response?.data ?? err);
      alert("Invalid move! " + (err.response?.data?.detail ?? "Unknown error"));
    }
  }
  

  useEffect(() => {
    if (!gameId || screen !== "play") return;
    const ws = new WebSocket(`${WS}/game/ws/${gameId}`);
    ws.onmessage = (e) => setGameState(JSON.parse(e.data));
    return () => ws.close();
  }, [gameId, screen]);

  return (
    <div style={{ padding: 30 }}>
      <button onClick={() => setScreen(screen === "setup" ? "play" : "setup")}>Switch to {screen === "setup" ? "Play" : "Setup"}</button>
      {screen === "setup" ? (
        <>
          <h1>Fish Setup</h1>
          <button onClick={setupGame}>Create Game + Add Users</button>
          <button onClick={startGame}>Start Game</button>
          <pre>{log.join("\n")}</pre>
        </>
      ) : (
        <>
          <h1>🐟 Fish Tester</h1>
          <p><strong>Current Player:</strong> <span style={{ color: "orange" }}>{displayNameFromId(currentPlayer)} <span style={{ fontSize: "0.8em", color: "#bbb" }}>(ID: {currentPlayer})</span></span></p>
          <p><strong>Game ID:</strong> {gameId}</p>

          <div style={{ marginBottom: "1em" }}>
            <strong>Team Legend:</strong>
            <div style={{ display: "flex", gap: "1em", marginTop: "0.5em" }}>
              <div style={{ background: "#004488", color: "white", padding: "4px 10px", borderRadius: "5px" }}>Team 1</div>
              <div style={{ background: "#884400", color: "white", padding: "4px 10px", borderRadius: "5px" }}>Team 2</div>
              <div style={{ background: "#222", color: "white", padding: "4px 10px", borderRadius: "5px" }}>No Team</div>
            </div>
          </div>

          <h3>All Player Hands:</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1em" }}>
            {playerIds.map((id) => {
              const o = owners[id];
              const team = playerStatus[id];
              const bg = team === 1 ? "#004488" : team === 2 ? "#884400" : "#222";
              return (
                <div key={id} style={{ border: id === currentPlayer ? "2px solid gold" : "1px solid gray", background: bg, color: "white", padding: 10, borderRadius: 8 }}>
                  <strong>{displayNameFromId(id)}</strong>
                  <div style={{ fontSize: "0.8em", color: "#ccc" }}>(ID: {id})</div>
                  <p>{o.cards.map(formatCard).join(", ") || "(no cards)"}</p>
                </div>
              );
            })}
          </div>

          <h3 style={{ marginTop: 20 }}>Take Turn</h3>
          <label style={{ marginRight: 10 }}>
            <input type="radio" checked={turnType === 0} onChange={() => setTurnType(0)} /> ❓ Question
          </label>
          <label style={{ marginRight: 10 }}>
            <input type="radio" checked={turnType === 1} onChange={() => setTurnType(1)} /> ✅ Claim
          </label>
          <label style={{ marginRight: 10 }}>
            <input type="radio" checked={turnType === 2} onChange={() => setTurnType(2)} /> 🔁 Delegate Turn
          </label>


          {turnType === 0 && (
            <>
              <p><strong>Available cards to ask about:</strong> {gameState?.owners?.options?.cards?.map(formatCard).join(", ")}</p>
              <p>Ask for: <input placeholder="e.g. 3S" value={cardInput} onChange={(e) => setCardInput(e.target.value)} /></p>
              <select value={questionTarget ?? ""} onChange={(e) => setQuestionTarget(e.target.value)}>
                <option value="">Select Opponent</option>
                {opponents.map((id) => (
                  <option key={id} value={id}>{displayNameFromId(id)}</option>
                ))}
              </select>
            </>
          )}

          {turnType === 1 && (
            <>
              <p><strong>Who is submitting the claim?</strong></p>
              <select value={claimPlayer} onChange={e => setClaimPlayer(e.target.value)}>
                {playerIds.map((id) => (
                  <option key={id} value={id}>{displayNameFromId(id)} (ID: {id})</option>
                ))}
              </select>

              <p><strong>Select Half-Suit to Claim:</strong></p>
              <select value={selectedHalfSuit} onChange={e => setSelectedHalfSuit(e.target.value)}>
                <option value="">Select Half-Suit</option>
                {halfSuits.map(h => <option key={h} value={h}>{h}</option>)}
              </select>

              {gameState?.status === 2 && selectedHalfSuit && (
                getHalfSuitCards(halfSuits.indexOf(selectedHalfSuit)).map((card, idx) => (
                  <div key={idx}>
                    <span style={{ marginRight: 10 }}>{formatCard(card)}</span>
                    <select
                      value={claimAssignments[idx] || ""}
                      onChange={(e) => {
                        const copy = [...claimAssignments];
                        copy[idx] = e.target.value;
                        setClaimAssignments(copy);
                      }}>
                      <option value="">Who has this card?</option>
                      {[currentPlayer, ...teammates].map((id) => (
                        <option key={id} value={id}>{displayNameFromId(id)}</option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </>
          )}

          {turnType === 2 && (
            <>
              <p><strong>Select a teammate to delegate to:</strong></p>
              <select value={questionTarget} onChange={(e) => setQuestionTarget(e.target.value)}>
                <option value="">Select Teammate</option>
                {teammates.map((id) => (
                  <option key={id} value={id}>{displayNameFromId(id)}</option>
                ))}
              </select>
            </>
          )}

          <br />
          <button onClick={playTurn} disabled={!currentPlayer}>Submit Turn</button>

          <h3 style={{ marginTop: 30 }}>Debug Info</h3>
          <div style={{ background: "#222", color: "white", padding: 10, borderRadius: 10 }}>
            <p><strong>Status:</strong> {gameState?.status}</p>
            <p><strong>Last Turn:</strong> {JSON.stringify(gameState?.last_turn)}</p>
            <p><strong>Options Owner:</strong> {gameState?.owners?.options?.cards?.map(formatCard).join(", ")}</p>
          </div>
          <h3>Full JSON:</h3>
          <pre style={{ background: "#111", color: "lime", padding: 10, maxHeight: 300, overflowY: "scroll" }}>{JSON.stringify(gameState, null, 2)}</pre>
        </>
      )}
    </div>
  );
}

export default App;
