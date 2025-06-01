import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

function cardClicked(cardname){
  console.log(cardname + "clicked")
}
function otherPlayer(number = 1, moving = false) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
    }}>
        <img
          src={"/src/assets/backicon.svg"}
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
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '4vh',
            fontWeight: 'bold',
            pointerEvents: 'none',
          }}
        >
          {number}
        </span>

      {moving && (
        <div style={{
          width: '150%',
          color: '#FFF',
          fontSize: '1.5vw',
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          current move
        </div>
      )}
    </div>
  );
}

function getAllOtherPlayers(playerList){
  let others = []
  others.push(otherPlayer(playerList[0], false))
  others.push(otherPlayer(playerList[1], false))
  others.push(otherPlayer(playerList[2], true))
  others.push(otherPlayer(playerList[3], false))
  return <div
style={{
  maxHeight: '30vh',
  display: 'flex',
  flexDirection: 'column',
  gap: '5vh',
  alignItems: 'center',
  overflowY: 'scroll',
  scrollbarWidth: 'thin', 
  msOverflowStyle: 'auto' 
}}
>
  {others}
</div>

}

function currentPlayerCards(cards){
  let cardlist = []
  cards.forEach(cardname => {
    cardlist.push(<img src={`/src/assets/${cardname}icon.svg`} style={{width: "10vw", height: "10vh", display: "flex", gap: "0px"}} alt={cardname} onClick={() => cardClicked(cardname)} />)
  })
return <div
style={{
  maxWidth: '80vw',
  display: 'inline-flex',
  gap: '3vw',
  alignItems: 'center',
  overflowX: 'scroll',

  scrollbarWidth: 'thin', 
  msOverflowStyle: 'auto' 
}}
>
  {cardlist}
</div>
}

function lastCombo(cards){
  let cardlist = []
  cards.forEach(cardname => {
    cardlist.push(<img src={`/src/assets/${cardname}icon.svg`} style={{width: "25hw", height: "25vh", display: "flex", gap: "0px"}} alt={cardname}/>)
  })
  return <div
  style={{
    maxWidth: '60vw',
    display: 'inline-flex',
    gap: '3vw',
    alignItems: 'center',
    overflowX: 'scroll',
  
    scrollbarWidth: 'thin', 
    msOverflowStyle: 'auto' 
  }}
  >
    {cardlist}
  </div>
}

function Game() {
  const [games, setGames] = useState([]);
  let cardlist = ["2C", "2D", "3C", "3D", "4C", "4D", "5C", "5D", "6C", "6D", "7C", "7D", "8C", "8D", "9C", "9D", "JC", "JD", "QC", "QD", "KC", "KD", "AC", "AD"]
  let lastPlayedCards = ["3C","4C","5C","6C","7C","8C","9C","JC","QC","KC","AC"]

  return (
      <>
      <div style={{width: "100%", height: "50vh", display: "flex", justifyContent: "center", alignItems: "center"}}>  

      <img
          src={"/src/assets/table.svg"}
          alt="table"
          style={{
            width: "70%",
            height: "70%",
            position: "absolute",
          }}
        />
         <div style={{paddingTop: "5vh", width: "100%", zIndex:100, position: "absolute"}}>
        {lastCombo(lastPlayedCards)}
      </div>
      </div>

     
      <div style={{paddingTop: "5vh", width: "100%"}}>

        {currentPlayerCards(cardlist)}
      </div>
      <div style={{
        paddingTop: "5vh",
        width: "100%",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "flex-start",

      }}>
        {getAllOtherPlayers([1,2,3,4])}
      </div>
      </>
  );
}

export default Game;