import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

// function getCard(cardname){
//   return <img src={`/src/assets/${cardname}icon.svg`} style={{width: "20vw"}} alt={cardname} />
// }

// function currentPlayerCards(cardlist){
// return <div
// style={{
//   position: 'absolute',
//   left: '10vw',
//   top: '90%',
//   transform: 'translateY(-50%)',
//   width: '80vw',
//   display: 'flex',
//   justifyContent: 'space-between',
//   alignItems: 'center',
//   pointerEvents: 'none',
// }}
// >
//   {cardlist}
// </div>
// }
function Game() {
  const [games, setGames] = useState([]);
  // useEffect(() => {
  //   // Create WebSocket connection to the lobby endpoint
  //   const ws = new WebSocket(`ws://localhost:8000/game/ws/${game_id}`);
  //
  //   ws.onopen = () => {
  //       console.log('Connected to lobby WebSocket');
  //       setWebsocket(ws);
  //   };

  //   ws.onmessage = (event) => {
  //       try {
  //           const gamesList = JSON.parse(event.data);
  //           setGames(gamesList);
  //           console.log('Received games list:', gamesList);
  //       } catch (error) {
  //           console.error('Error parsing WebSocket message:', error);
  //       }
  //   };

  //   ws.onclose = () => {
  //       console.log('WebSocket connection closed');
  //       setWebsocket(null);
  //   };

  //   ws.onerror = (error) => {
  //       console.error('WebSocket error:', error);
  //   };

  //   // Cleanup function to close WebSocket when component unmounts
  //   return () => {
  //       if (ws.readyState === WebSocket.OPEN) {
  //           ws.close();
  //       }
  //   };
  //}, []);
  // let cardlist = []
  // cardlist.push(otherPlayer(1, true))
  // cardlist.push(otherPlayer(2, false))
  // cardlist.push(otherPlayer(3, false))
  // cardlist.push(otherPlayer(4, true))
  // cardlist.push(otherPlayer(1, true))
  // cardlist.push(otherPlayer(29, false))
  // cardlist.push(otherPlayer(3, false))
  return (
    <>
      <img
        src={"/src/assets/table.svg"}
        alt="table"
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </>
  );
}

export default Game;
