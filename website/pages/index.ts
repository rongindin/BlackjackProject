type Card = {
  name: string;
  suit: string;
  value: number;
};

let deck: Card[] = [];
let player: Card[] = [];
let dealer: Card[] = [];
let gameOver: boolean = false;

function createDeck(): Card[] {
  const suits = ["♠", "♥", "♦", "♣"];
  const values: [string, number][] = [
    ["A", 11], ["2", 2], ["3", 3], ["4", 4],
    ["5", 5], ["6", 6], ["7", 7], ["8", 8],
    ["9", 9], ["10", 10], ["J", 10], ["Q", 10], ["K", 10]
  ];

  let d: Card[] = [];
  for (let suit of suits) {
    for (let val of values) {
      d.push({ name: val[0], suit: suit, value: val[1] });
    }
  }
  return d;
}

function shuffle(d: Card[]): void {
  for (let i = d.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
}

function getScore(hand: Card[]): number {
  let score = 0;
  let aces = 0;

  for (let c of hand) {
    score += c.value;
    if (c.name === "A") aces++;
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
}

function render(hideDealer: boolean = true): void {
  const playerEl = document.getElementById("player")!;
  const dealerEl = document.getElementById("dealer")!;

  playerEl.innerText =
    "Player: " +
    player.map(c => c.name + c.suit).join(" ") +
    " (" + getScore(player) + ")";

  if (hideDealer && !gameOver) {
    dealerEl.innerText =
      "Dealer: [??] " + dealer[1].name + dealer[1].suit;
  } else {
    dealerEl.innerText =
      "Dealer: " +
      dealer.map(c => c.name + c.suit).join(" ") +
      " (" + getScore(dealer) + ")";
  }
}

/**
 * Centralized round ending
 */
function endRound(message: string): void {
  alert(message);
  gameOver = true;
  render(false);

  // auto restart after delay
  setTimeout(() => {
    startGame();
  }, 500);
}

function checkBlackjack(): boolean {
  let playerScore = getScore(player);
  let dealerScore = getScore(dealer);

  if (playerScore === 21 && player.length === 2) {
    if (dealerScore === 21 && dealer.length === 2) {
      endRound("Both have Blackjack! Push.");
    } else {
      endRound("Blackjack! You win! 🎉");
    }
    return true;
  }

  if (dealerScore === 21 && dealer.length === 2) {
    endRound("Dealer has Blackjack. You lose.");
    return true;
  }

  return false;
}

function checkGameState(): void {
  let score = getScore(player);

  if (score > 21) {
    endRound("You busted! Dealer wins.");
  } else if (score === 21) {
    alert("21!");
    stand();
  }

  render();
}

function startGame(): void {
  deck = createDeck();
  shuffle(deck);

  player = [deck.pop()!, deck.pop()!];
  dealer = [deck.pop()!, deck.pop()!];
  gameOver = false;

  render();

  checkBlackjack();
}

function hit(): void {
  if (gameOver) return;

  player.push(deck.pop()!);
  checkGameState();
}

function stand(): void {
  if (gameOver) return;

  while (getScore(dealer) < 17) {
    dealer.push(deck.pop()!);
  }

  let p = getScore(player);
  let d = getScore(dealer);

  if (d > 21 || p > d) {
    endRound("You win!");
  } else if (p < d) {
    endRound("Dealer wins!");
  } else {
    endRound("Push!");
  }
}

// expose to HTML
(window as any).hit = hit;
(window as any).stand = stand;
(window as any).startGame = startGame;

// start first round
startGame();