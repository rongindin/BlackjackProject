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

function updateUI() {
  document.getElementById("balance")!.textContent = String(balance);
  document.getElementById("bet")!.textContent = String(bet);

  const dealerCards = document.getElementById("dealerCards")!;
  const playerCards = document.getElementById("playerCards")!;

  const dealerScore = document.getElementById("dealerScore")!;
  const playerScore = document.getElementById("playerScore")!;

  if (gameActive && hideDealerCard) {
    dealerCards.textContent = "🂠 " + dealer[1];
    dealerScore.textContent = "?";
  } else {
    dealerCards.textContent = dealer.join(" ");
    dealerScore.textContent = String(score(dealer));
  }

  playerCards.textContent = player.join(" ");
  playerScore.textContent = String(score(player));
}

/* =========================
   EVENTS
========================= */

function bindUI() {
  document.querySelectorAll(".bet").forEach(btn => {
    btn.addEventListener("click", () => {
      if (gameActive) return;

      const val = Number((btn as HTMLElement).dataset.value);

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
  } else if (!push) {
    balance -= bet;
  }

  bet = 0;
  gameActive = false;

  updateUI();
}