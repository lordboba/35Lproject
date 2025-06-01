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
function Game() {
  const [games, setGames] = useState([]);
  const [websocket, setWebsocket] = useState(null);

  return (
    <div style={{width: "80vw", height: "80vh", display: "flex", justifyContent: "center", alignItems: "center"}}>
      {table()}
      {otherPlayer(1, true)}
      {otherPlayer(2, false)}
      {otherPlayer(3, false)}
      {otherPlayer(4, true)}
      {otherPlayer(5, false)}
      {otherPlayer(16)}
    </div>
  );
}

export default Game;
