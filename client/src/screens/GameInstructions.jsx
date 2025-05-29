import React from 'react';

const VietcongRules = () => (
  
  <div style={{maxWidth: '800px', margin: '0 auto', padding: '20px'}}>
    <h1>Vietcong Rules</h1>
  
    <h2>Objective</h2>
    <p>
      <strong>Be the first player to discard all your cards. Afterwards, continue to discard cards to place high. </strong>
    </p>

    <h2>Setup</h2>
    <ul style={{textAlign: 'left'}}>
      <li>Use a standard 52-card deck.</li>
      <li>
        4 players play; each is dealt 13 cards. 
      </li>
      <li>
        Card rank (low to high): 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2. Suits rank (low to high): spades ♠, clubs ♣, diamonds ♦, hearts ♥.
      </li>
    </ul>

    <h2>Gameplay</h2>
    <ul style={{textAlign: 'left'}}>
      <li>
        The player with the 3♠ starts the first round, and must play it as part of their opening combination.
      </li>
      <li>
        Play proceeds clockwise. On your turn, you may either:
        <ul style={{textAlign: 'left'}}>
          <li>Play a higher combination of the same type as the previous play (a combination is higher if its highest card is higher), or</li>
          <li>Pass (if you pass, you cannot play again until the next round).</li>
        </ul>
      </li>
      <li>
        When all but one player have passed, the last player to play starts a new round with any valid combination.
      </li>
      <li>
        The first player to discard all their cards wins. Play continues for the 2nd and 3rd place.
      </li>
      <li>
        In the case where the last player to not have passed played all their cards, the next player clockwise starts a new round. 
      </li>
    </ul>

    <h2>Valid Combinations</h2>
    <ul style={{textAlign: 'left'}}>
      <li><strong>Single:</strong> One card.</li>
      <li><strong>Pair:</strong> Two cards of the same rank.</li>
      <li><strong>Triple:</strong> Three cards of the same rank.</li>
      <li><strong>Quartet (Four of a Kind):</strong> Four cards of the same rank.</li>
      <li>
        <strong>Sequence (Run):</strong> Three or more consecutive cards, regardless of suit (cannot include 2s; runs go from 3 up to A).
      </li>
      <li>
        <strong>Double Sequence:</strong> Sequence of three or more consecutive pairs.
      </li>
    </ul>

    <h2>Special Combinations (Bombs/Slams)</h2>
    <ul style={{textAlign: 'left'}}>
      <li>
        Bombs (<strong>Four of a Kind</strong> or <strong>three consecutive pairs</strong>) can beat a single 2.
      </li>
      <li>
        <strong>Two consecutive four of a kinds</strong> or <strong>five consecutive pairs</strong> can beat a pair of 2s.
      </li>
      <li>
        <strong>Three consecutive four of a kinds</strong> or <strong>seven consecutive pairs</strong> can beat three 2s.
      </li>
      <li>Bombs/slams can only be beaten by higher bombs/slams of the same type.</li>
    </ul>


    <h2>End of Game</h2>
    <ul style={{textAlign: 'left'}}>
      <li>
        The game ends when one player has discarded all their cards. Remaining players can continue to play for lower places if desired.
      </li>
    </ul>
  </div>
);

const FishRules = () => (
  <div style={{maxWidth: '800px', margin: '0 auto', padding: '20px'}}>
    <h1>Fish Rules</h1>
    
    <h2>Objective</h2>
    <p>
      <strong>Collect as many half-suits as possible for your team through strategic questioning and card deduction.</strong>
    </p>

    <h2>Setup</h2>
    <ul style={{textAlign: 'left'}}>
      <li>Requires exactly 6 players divided into two teams of 3.</li>
      <li>Use a standard 52-card deck plus both jokers (54 cards total).</li>
      <li>Use a standard 52-card deck plus both jokers (54 cards total).</li>
      <li>
        Adding two jokers creates nine half-suits:
        <ul style={{textAlign: 'left'}}>
          <li><strong>Low cards:</strong> 2, 3, 4, 5, 6, 7 of each suit</li>
          <li><strong>High cards:</strong> 9, 10, J, Q, K, A of each suit</li>
          <li><strong>Middle cards:</strong> All 8's and jokers</li>
        </ul>
      </li>
      <li>Cards are dealt evenly among all 6 players (9 cards each).</li>
    </ul>

    <h2>Gameplay</h2>
    <ul style={{textAlign: 'left'}}>
      <li>A randomly chosen player goes first.</li>
      <li>
        On their turn a players may ask any opponent for a specific card. They may only ask for a card if:
        <ul style={{textAlign: 'left'}}>
          <li>The card belongs to a half-suit you already have at least one card from, AND</li>
          <li>You don't already have that specific card in your hand</li>
        </ul>
      </li>
      <li>
        If a player is asked for card they have, they must give it up immediately.
      </li>
      <li>
        On their turn the player continues to ask until an opponent doesn't have the requested card (the player does not have to always ask the same opponent). Then the turn passes to the most recent player to be asked.
      </li>
    </ul>

    <h2>Making Claims</h2>
    <ul style={{textAlign: 'left'}}>
      <li>
        A player may claim a half-suit at any point when they believe their team has all 6 cards of that half-suit AND they believe they know exactly which teammate holds each card.
      </li>
      <li>
        <strong>Failed claims:</strong> If your claim is incorrect, the opposing team automatically gets that half-suit, regardless of who actually held the cards.
      </li>
      <li>Only make claims when you are 100% certain of the card locations!</li>
    </ul>

    <h2>Winning</h2>
    <ul style={{textAlign: 'left'}}>
      <li>
        The team that correctly claims 5 half-suits wins the game.
      </li>
    </ul>
  </div>
);

function GameInstructions() {
    return (
        <div>
            <VietcongRules />
            <hr style={{margin: '40px 0'}} />
            <FishRules />
        </div>
    );
}

export default GameInstructions;