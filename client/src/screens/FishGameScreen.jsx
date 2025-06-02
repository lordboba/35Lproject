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
  others.push(otherPlayer(playerList[3], true))
  others.push(otherPlayer(playerList[4], false))
  return <div
style={{
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'row',
  gap: '1.5%',
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
function startClaim(buttonNo){
  let names = ["♠ 2-7", "♥ 2-7", "♦ 2-7", "♣ 2-7", "8 & Joker", "♠ 9-A", "♥ 9-A", "♦ 9-A", "♣ 9-A"]
  console.log(buttonNo + "clicked")
  // API call to initialize the claim

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
        {Array.from({ length: 5 }).map((_, i) => {
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
        {Array.from({ length: 4 }).map((_, j) => {
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

function GameScreen() {
  const [games, setGames] = useState([]);
  let cardlist = ["2C", "2D", "3C", "3D", "4C", "4D", "5C", "5D", "6C", "6D", "7C", "7D", "8C", "8D", "9C", "9D", "JC", "JD", "QC", "QD", "KC", "KD", "AC", "AD"]
  let lastPlayedCards = ["3C","4C","5C","6C","7C","8C","9C","JC","QC","KC","AC"]
  let claims = [0,0,0,0,0,0,0,0,0]

  return (
      <>
        <div style={{
               paddingBottom: "10px",
               width: "100%",
             }}>
          {getAllOtherPlayers([1,2,3,4,5])}
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
            {claimButtons(claims)}
          </div>
        </div>
           
     
      <div style={{width: "100%"}}>
        {currentPlayerCards(cardlist)}
      </div>

      <div>
            <button style={{ marginRight: '5%', padding: '1% 2%', fontSize: '5vh' }}>Play</button>
            <button style={{ padding: '1vh 2vw', fontSize: '5vh' }}>Pass</button>
            </div>
      </>
  );
}

export default GameScreen;
