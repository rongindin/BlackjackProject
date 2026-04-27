let wins = 0;
let losses = 0;
let pushes = 0;
let balance = 1000;
let bet = 0;

let deck: string[] = [];
let player: string[] = [];
let dealer: string[] = [];

let gameActive = false;
let hideDealerCard = true;

/* =========================
   INIT
========================= */

window.addEventListener("DOMContentLoaded", () => {
  bindUI();
  updateUI();
});

/* =========================
   POPUP
========================= */

function popup(message: string) {
  const el = document.createElement("div");
  el.textContent = message;
  el.className = "popup";

  document.body.appendChild(el);

  setTimeout(() => el.remove(), 2000);
}

/* =========================
   CONFETTI
========================= */

function confetti() {
  const colors = ["#ff0", "#f0f", "#0ff", "#0f0", "#f00", "#00f"];

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");

    piece.style.position = "fixed";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.top = "-10px";
    piece.style.width = "8px";
    piece.style.height = "8px";
    piece.style.background =
      colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = "50%";
    piece.style.zIndex = "9999";

    document.body.appendChild(piece);

    const duration = Math.random() * 2 + 2;
    const drift = (Math.random() - 0.5) * 200;

    piece.animate(
      [
        { transform: "translateY(0)", opacity: 1 },
        { transform: `translateY(100vh) translateX(${drift}px)`, opacity: 0 }
      ],
      {
        duration: duration * 1000,
        easing: "ease-out"
      }
    );

    setTimeout(() => piece.remove(), duration * 1000);
  }
}

/* =========================
   DECK
========================= */

function makeDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

  deck = [];

  for (const s of suits) {
    for (const v of values) {
      deck.push(v + s);
    }
  }

  deck.sort(() => Math.random() - 0.5);
}

function drawCard() {
  return deck.pop()!;
}

/* =========================
   SCORE
========================= */

function score(hand: string[]) {
  let total = 0;
  let aces = 0;

  for (const c of hand) {
    const v = c.slice(0, -1);

    if (v === "A") {
      total += 11;
      aces++;
    } else if ("JQK".includes(v)) {
      total += 10;
    } else {
      total += Number(v);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}


/* =========================
   UI
========================= */

function renderHand(container: HTMLElement, hand: string[]) {
  container.innerHTML = "";

  for (const c of hand) {
    const card = document.createElement("div");
    card.className = "card";

    const value = c.slice(0, -1);
    const suit = c.slice(-1);

    // color for red suits
    if (suit === "♥" || suit === "♦") {
      card.classList.add("red");
    }

    card.innerHTML = `
      <div class="corner top-left">${value}<br>${suit}</div>
      <div class="center-suit">${suit}</div>
      <div class="corner bottom-right">${value}<br>${suit}</div>
    `;

    container.appendChild(card);
  }
}

function updateUI(): void {
  const balanceEl = document.getElementById("balance")!;
  const betEl = document.getElementById("bet")!;

  const dealerCardsEl = document.getElementById("dealerCards")!;
  const playerCardsEl = document.getElementById("playerCards")!;
  const statsEl = document.getElementById("stats")!;
  const dealerScoreEl = document.getElementById("dealerScore")!;
  const playerScoreEl = document.getElementById("playerScore")!;

  // Update money UI
  balanceEl.textContent = String(balance);
  betEl.textContent = String(bet);

  // =========================
  // PLAYER (always full render)
  // =========================
  renderHand(playerCardsEl, player);
  playerScoreEl.textContent = String(score(player));

  // =========================
  // DEALER
  // =========================
  dealerCardsEl.innerHTML = "";

  if (gameActive && hideDealerCard) {
    // show first card
    const firstCard = document.createElement("div");
    firstCard.className = "card";

    const firstValue = dealer[0].slice(0, -1);
    const firstSuit = dealer[0].slice(-1);

    if (firstSuit === "♥" || firstSuit === "♦") {
      firstCard.classList.add("red");
    }

    firstCard.innerHTML = `
      <div class="corner top-left">${firstValue}<br>${firstSuit}</div>
      <div class="center-suit">${firstSuit}</div>
      <div class="corner bottom-right">${firstValue}<br>${firstSuit}</div>
    `;

    // hidden card (card back)
    const hiddenCard = document.createElement("div");
    hiddenCard.className = "card back";
    hiddenCard.textContent = "";

    dealerCardsEl.appendChild(firstCard);
    dealerCardsEl.appendChild(hiddenCard);

    dealerScoreEl.textContent = "?";

  } else {
    // FULL REVEAL (uses same system as player → FIXES red + layout)
    renderHand(dealerCardsEl, dealer);
    dealerScoreEl.textContent = String(score(dealer));

    const totalGames = wins + losses;
const winRate = totalGames === 0 ? 0 : (wins / totalGames) * 100;

statsEl.textContent =
  `Wins: ${wins} | Losses: ${losses} | Pushes: ${pushes} | Win Rate: ${winRate.toFixed(1)}%`;
  }
}
/* =========================
   EVENTS
========================= */

function bindUI() {
  document.querySelectorAll(".bet").forEach(btn => {
    btn.addEventListener("click", () => {
      if (gameActive) return;

      const val = Number((btn as HTMLElement).dataset["value"]);

      if (bet + val <= balance) {
        bet += val;
        updateUI();
      }
    });
  });

  document.getElementById("clearBet")?.addEventListener("click", () => {
    if (gameActive) return;

    bet = 0;
    updateUI();
  });

  document.getElementById("confirmBtn")?.addEventListener("click", startRound);
  document.getElementById("hitBtn")?.addEventListener("click", hit);
  document.getElementById("standBtn")?.addEventListener("click", stand);

  document.getElementById("addCustomBet")?.addEventListener("click", () => {
  if (gameActive) return;

  const input = document.getElementById("customBetInput") as HTMLInputElement;

  // validation
const value = Math.floor(Number(input.value));

if (value <= 0) return;
if (value > balance - bet) return;

  bet += value;
  input.value = "";

  updateUI();
});
}

/* =========================
   START ROUND
========================= */

function startRound() {
  if (bet <= 0 || gameActive) return;

  gameActive = true;
  hideDealerCard = true;

  player = [];
  dealer = [];
  deck = [];

  makeDeck();

  player = [drawCard(), drawCard()];
  dealer = [drawCard(), drawCard()];

  updateUI();

  const p = score(player);

  if (p === 21) {
    popup("BLACKJACK!");
    confetti();
    endRound(true, false);
  }
}

/* =========================
   HIT
========================= */

function hit() {
  if (!gameActive) return;

  player.push(drawCard());

  const p = score(player);

  updateUI();

  if (p === 21) {
    popup("21!");
    confetti();
    endRound(true, false);
  }

  if (p > 21) {
    popup("BUST!");
    endRound(false, false);
  }
}

/* =========================
   STAND
========================= */

function stand() {
  if (!gameActive) return;

  hideDealerCard = false;

  while (score(dealer) < 17) {
    dealer.push(drawCard());
  }

  const p = score(player);
  const d = score(dealer);

  updateUI();

  if (d === 21) {
    popup("Dealer got 21!");
  }

  const win = p <= 21 && (p > d || d > 21);
  const push = p === d && p <= 21;

  if (win) {
    popup("You win!");
    confetti();
  } else if (push) {
    popup("Push!");
  } else {
    popup("You lose!");
  }

  endRound(win, push);
}

/* =========================
   END ROUND
========================= */

function endRound(win: boolean, push: boolean) {
  if (win) {
    balance += bet;
    wins++;
  } else if (!push) {
    balance -= bet;
    losses++;
  } else {
    pushes++;
  }

  bet = 0;
  gameActive = false;

  updateUI();
}