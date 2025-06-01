import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

function table(){
  return (
    <div style={{
      position: "relative",
      width: "60vw",
      height: "60vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      top:"-10%"
    }}>
      <img
        src={"/src/assets/tableedge.svg"}
        alt="table edge"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "60vw",
          height: "60vh",
          transform: "translate(-50%, -50%)"
        }}
      />
      <img
        src={"/src/assets/table.svg"}
        alt="table"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "55vw",
          height: "55vh",
          transform: "translate(-50%, -50%)"
        }}
      />
    </div>
  );
}
function setUpTable(game_id){



}
function getCard(cardname){
  return <img src={`/src/assets/${cardname}icon.svg`} style={{width: "20vw", height: "20vh"}} alt={cardname} />
}
function otherPlayer(number = 1, moving = false) {
  return (
    <div style={{
      position: 'relative',
      display: 'inline-block',
      width: '8vw',
      height: '12vh',
      textAlign: 'center',
    }}>
      <img
        src={"/src/assets/backicon.svg"}
        alt="card back"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '4vw',
          fontWeight: 'bold',
          pointerEvents: 'none',
        }}
      >
        {number}
      </span>
      {moving && (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '-3.5vh',
          transform: 'translateX(-50%)',
          width: '100%',
          color: '#FFF',
          fontSize: '1.5vw',
          fontWeight: 'bold',
        }}>
          current move
        </div>
      )}
    </div>
  );
}

function card(cardname){
  return <button><img src={`/src/assets/${cardname}icon.svg`} style={{width: "20vw", height: "20vh"}} alt={cardname} onClick={this.myfunction} /></button> 
}
function cardClicked(){
  console.log("clicked")
}

function currentPlayerCards(cardlist){
return <div
style={{
  position: 'absolute',
  left: '10vw', 
  top: '90%',
  transform: 'translateY(-50%)',
  width: '80vw',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  pointerEvents: 'none',
}}
>
  {cardlist}
</div>
}
function Game() {
  const [games, setGames] = useState([]);
  const [websocket, setWebsocket] = useState(null);
  useEffect(() => {
    // Create WebSocket connection to the lobby endpoint
    const ws = new WebSocket(`ws://localhost:8000/game/ws/${game_id}`);
    
    ws.onopen = () => {
        console.log('Connected to lobby WebSocket');
        setWebsocket(ws);
    };

    ws.onmessage = (event) => {
        try {
            const gamesList = JSON.parse(event.data);
            setGames(gamesList);
            console.log('Received games list:', gamesList);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
        setWebsocket(null);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    // Cleanup function to close WebSocket when component unmounts
    return () => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    };
}, []);
  let cardlist = []
  cardlist.push(otherPlayer(1, true))
  cardlist.push(otherPlayer(2, false))
  cardlist.push(otherPlayer(3, false))
  cardlist.push(otherPlayer(4, true))
  cardlist.push(otherPlayer(1, true))
  cardlist.push(otherPlayer(29, false))
  cardlist.push(otherPlayer(3, false))
  return (
    <div style={{width: "80vw", height: "80vh", display: "flex", justifyContent: "center", alignItems: "center"}}>
      {table()}
      {currentPlayerCards(cardlist)}
    </div>
  );
}

export default Game;
