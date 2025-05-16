import React from 'react';

const VietcongRules = () => (
  
  <div>
    <h1>Vietcong Rules</h1>
  
    <h2>Objective</h2>
    <p>
      <strong>Be the first player to discard all your cards. Afterwards, continue to discard cards to place high. </strong>
    </p>

    <h2>Setup</h2>
    <ul>
      <li>Use a standard 52-card deck.</li>
      <li>
        4 players is standard; each is dealt 13 cards. For 3 players, 17 cards each is also an option (leave out the 3♠).
      </li>
      <li>
        Card rank (low to high): 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2. Suits rank: spades ♠, clubs ♣, diamonds ♦, hearts ♥ (highest).
      </li>
    </ul>

    <h2>Gameplay</h2>
    <ul>
      <li>
        The player with the 3♠ starts the first round, and must play it as part of their opening combination.
      </li>
      <li>
        Play proceeds clockwise. On your turn, you may either:
        <ul>
          <li>Play a higher combination of the same type as the previous play (see valid combinations below), or</li>
          <li>Pass (if you pass, you cannot play again until the next round).</li>
        </ul>
      </li>
      <li>
        When all but one player have passed, the last player to play wins the pile and starts a new round with any valid combination.
      </li>
      <li>
        The first player to discard all their cards wins. Play can continue for lower places.
      </li>
    </ul>

    <h2>Valid Combinations</h2>
    <ul>
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
    <ul>
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
    <ul>
      <li>
        The game ends when one player has discarded all their cards. Remaining players can continue to play for lower places if desired.
      </li>
    </ul>
  </div>
);


function GameInstructions() {
    return (
        <div>
            <VietcongRules />
        </div>
    );
}

export default GameInstructions;