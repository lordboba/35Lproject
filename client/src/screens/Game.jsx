import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

function card(cardname){
  return <img src={`/src/assets/${cardname}icon.svg`} style={{width: "10vw", height: "10vh", display: "flex", gap: "0px"}} alt={cardname} onClick={() => cardClicked(cardname)} />
}

function cardClicked(cardname){
  console.log(cardname + "clicked")
}

function currentPlayerCards(cardlist){
return <div
style={{
  maxWidth: '80vw',
  display: 'inline-flex',
  gap: '3vw',
  alignItems: 'center',
  overflowX: 'scroll',
  border: "1px solid #ddd",
  scrollbarWidth: 'thin', // for Firefox
  msOverflowStyle: 'auto' // for IE and Edge
}}
>
  {cardlist}
</div>
}
function Game() {
  const [games, setGames] = useState([]);
  let cardlist = []
  cardlist.push(card("2C"))
  cardlist.push(card("2D"))
  cardlist.push(card("3C"))
  cardlist.push(card("3D"))
  cardlist.push(card("4C"))
  cardlist.push(card("4D"))
  cardlist.push(card("5C"))
  cardlist.push(card("5D"))
  cardlist.push(card("6C"))
  cardlist.push(card("6D"))
  cardlist.push(card("7C"))
  cardlist.push(card("7D"))
  cardlist.push(card("8C"))
  cardlist.push(card("9C"))
  cardlist.push(card("2C"))
  cardlist.push(card("2D"))
  cardlist.push(card("3C"))
  cardlist.push(card("3D"))
  cardlist.push(card("4C"))
  cardlist.push(card("4D"))
  cardlist.push(card("5C"))
  cardlist.push(card("5D"))
  cardlist.push(card("6C"))
  cardlist.push(card("6D"))
  cardlist.push(card("7C"))
  cardlist.push(card("7D"))
  cardlist.push(card("8C"))
  cardlist.push(card("9C"))
  cardlist.push(card("9D"))
  cardlist.push(card("JC"))
  cardlist.push(card("JD"))
  cardlist.push(card("QC"))
  
  cardlist.push(card("QD"))

  return (
    <>
    <div style={{width: "100%", height: "50vh", display: "flex", justifyContent: "center", alignItems: "center"}}>  

    <img
        src={"/src/assets/table.svg"}
        alt="table"
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
    <div style={{paddingTop: "5vh", width: "100%"}}>

      {currentPlayerCards(cardlist)}
    </div>
     
    </>
  );
}

export default Game;
