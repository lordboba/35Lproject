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
  maxWidth: '80%',
  display: 'flex',
  flexDirection: 'row',
  gap: '5%',
  alignItems: 'center',
  overflowX: 'scroll',
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
    cardlist.push(<img src={`/src/assets/${cardname}icon.svg`} style={{width: "8%", display: "flex", gap: "0px"}} alt={cardname} onClick={() => cardClicked(cardname)} />)
  })
return <div
style={{
  maxWidth: '60%',
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
    cardlist.push(<img src={`/src/assets/${cardname}icon.svg`} style={{width: "10%", display: "flex", gap: "0px"}} alt={cardname}/>)
  })
  return <div
  style={{
    maxWidth: '80%',
    display: 'inline-flex',
    gap: '1.5vw',
    alignItems: 'center',
    overflowX: 'scroll',
  
    scrollbarWidth: 'thin', 
    msOverflowStyle: 'auto' 
  }}
  >
    {cardlist}
  </div>
}

function VietcongGameScreen() {

  const [games, setGames] = useState([]);
  let cardlist = ["3D", "4C", "KD", "5C", "5D", "6C", "6D", "7C", "7D", "8C", "8D", "9C", "9D", "JC", "JD", "QC", "QD", "KC", "KD", "AC", "AD"]
  let lastPlayedCards = ["3D","4C","5C","6C","7C","8C","9C","JC","QC","KC","AC"]

  return (
      <>
        <div style={{
               paddingBottom: "10px",
               width: "100%",
             }}>
          {getAllOtherPlayers([1,2,3,4])}
        </div>

        <div style={{width: "100%", height: "60vh", display: "flex", justifyContent: "center", alignItems: "center", paddingBottom: "5%", position: "relative"}}>
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
            {lastCombo(lastPlayedCards)}
          </div>
        </div>
           
     
      <div style={{width: "100%"}}>
        {currentPlayerCards(cardlist)}
      </div>

      <div>
            <button style={{ marginRight: '5%', padding: '1% 2%', fontSize: '5vh' }} disabled = {false}>Play</button>
            <button style={{ padding: '1vh 2vw', fontSize: '5vh' }}>Pass</button>
            </div>
      </>
  );
}

export default VietcongGameScreen;
