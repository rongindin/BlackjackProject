type User = {
  id: number;
  username: string;
  balance: number;
  wins: number;
  losses: number;
  pushes: number;
  max_balance: number;
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let currentUser: User | null = null;

let deck: string[] = [];
let playerCards: string[] = [];
let dealerCards: string[] = [];

let bet = 0;
let gameActive = false;
let hideDealerCard = true;

/*
  Runs when the page loads.
*/
window.addEventListener("DOMContentLoaded", () => {
  connectButtons();
  restoreSavedUser();
  updateScreen();
  loadLeaderboard();
});

/*
  Finds an HTML element by id.
*/
function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

/*
  Sends POST requests to the server.
*/
async function post(url: string, data: object): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return response.json();
}

/*
  Connects all buttons to functions.
*/
function connectButtons(): void {
  el<HTMLButtonElement>("loginBtn").onclick = login;
  el<HTMLButtonElement>("registerBtn").onclick = register;
  el<HTMLButtonElement>("logoutBtn").onclick = logout;

  el<HTMLButtonElement>("dealBtn").onclick = deal;
  el<HTMLButtonElement>("hitBtn").onclick = hit;
  el<HTMLButtonElement>("standBtn").onclick = stand;
  el<HTMLButtonElement>("clearBetBtn").onclick = clearBet;
  el<HTMLButtonElement>("newGameBtn").onclick = newGame;

  document.querySelectorAll<HTMLButtonElement>(".betBtn").forEach((button) => {
    button.onclick = () => addBet(Number(button.dataset.bet));
  });
}

/*
  Makes sure max_balance exists.
*/
function fixUser(user: User): User {
  const fixedUser = user;

  if (fixedUser.max_balance === undefined || fixedUser.max_balance === null) {
    fixedUser.max_balance = fixedUser.balance;
  }

  return fixedUser;
}

/*
  Registers a new user.
*/
async function register(): Promise<void> {
  const username = el<HTMLInputElement>("registerUsername").value.trim();
  const password = el<HTMLInputElement>("registerPassword").value;

  const result = await post("/api/register", { username, password });

  if (!result.success) {
    el<HTMLParagraphElement>("authMessage").textContent = result.message;
    return;
  }

  startSession(result.user as User);
}

/*
  Logs in an existing user.
*/
async function login(): Promise<void> {
  const username = el<HTMLInputElement>("loginUsername").value.trim();
  const password = el<HTMLInputElement>("loginPassword").value;

  const result = await post("/api/login", { username, password });

  if (!result.success) {
    el<HTMLParagraphElement>("authMessage").textContent = result.message;
    return;
  }

  startSession(result.user as User);
}

/*
  Starts the game after login or signup.
*/
function startSession(user: User): void {
  const fixedUser = fixUser(user);

  currentUser = fixedUser;

  localStorage.setItem("blackjackUser", JSON.stringify(fixedUser));

  bet = 0;
  playerCards = [];
  dealerCards = [];
  gameActive = false;
  hideDealerCard = true;

  el("authBox").classList.add("hidden");
  el("gameBox").classList.remove("hidden");

  el<HTMLParagraphElement>("authMessage").textContent = "";
  el<HTMLParagraphElement>("message").textContent = "Place your bet.";

  updateScreen();
  loadRank();
}

/*
  Restores saved user after refresh.
*/
function restoreSavedUser(): void {
  const savedUser = localStorage.getItem("blackjackUser");

  if (!savedUser) return;

  try {
    const parsedUser = JSON.parse(savedUser) as User;
    currentUser = fixUser(parsedUser);
  } catch {
    localStorage.removeItem("blackjackUser");
    currentUser = null;
    return;
  }

  bet = 0;
  playerCards = [];
  dealerCards = [];
  gameActive = false;
  hideDealerCard = true;

  el("authBox").classList.add("hidden");
  el("gameBox").classList.remove("hidden");

  el<HTMLParagraphElement>("message").textContent = "Welcome back.";

  updateScreen();
  loadRank();
}

/*
  Logs out the user.
*/
function logout(): void {
  localStorage.removeItem("blackjackUser");

  currentUser = null;

  bet = 0;
  playerCards = [];
  dealerCards = [];
  gameActive = false;
  hideDealerCard = true;

  el("gameBox").classList.add("hidden");
  el("authBox").classList.remove("hidden");

  updateScreen();
}

/*
  Starts a new game only when balance is 0.
*/
async function newGame(): Promise<void> {
  const user = currentUser;

  if (!user) return;

  if (user.balance > 0) {
    el<HTMLParagraphElement>("message").textContent =
      "New Game is only available when your balance is 0.";
    return;
  }

  const result = await post("/api/new-game", {
    id: user.id
  });

  if (!result.success) {
    el<HTMLParagraphElement>("message").textContent = result.message;
    return;
  }

  const updatedUser = fixUser(result.user as User);

  currentUser = updatedUser;

  localStorage.setItem("blackjackUser", JSON.stringify(updatedUser));

  bet = 0;
  playerCards = [];
  dealerCards = [];
  gameActive = false;
  hideDealerCard = true;

  el<HTMLParagraphElement>("message").textContent = "New game started with $1000.";

  updateScreen();
  loadLeaderboard();
  loadRank();
}

/*
  Saves user progress to the database.
*/
async function saveProgress(): Promise<void> {
  const user = currentUser;

  if (!user) return;

  if (user.balance > user.max_balance) {
    user.max_balance = user.balance;
  }

  const result = await post("/api/save", {
    id: user.id,
    balance: user.balance,
    wins: user.wins,
    losses: user.losses,
    pushes: user.pushes
  });

  if (!result.success) {
    el<HTMLParagraphElement>("message").textContent = "Progress could not be saved.";
    return;
  }

  localStorage.setItem("blackjackUser", JSON.stringify(user));

  loadLeaderboard();
  loadRank();
}

/*
  Loads leaderboard.
*/
async function loadLeaderboard(): Promise<void> {
  const response = await fetch("/api/leaderboard");
  const users: User[] = await response.json();

  const body = el<HTMLTableSectionElement>("leaderboardBody");
  body.innerHTML = "";

  if (users.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">No users yet.</td>
      </tr>
    `;
    return;
  }

  users.forEach((user, index) => {
    body.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${user.username}</td>
        <td>$${user.balance}</td>
        <td>${user.wins}</td>
        <td>${user.losses}</td>
        <td>${user.pushes}</td>
      </tr>
    `;
  });
}

/*
  Loads current user's rank.
*/
async function loadRank(): Promise<void> {
  const user = currentUser;

  if (!user) {
    el<HTMLSpanElement>("rankText").textContent = "-";
    return;
  }

  const response = await fetch(`/api/rank/${user.id}`);
  const data = await response.json();

  el<HTMLSpanElement>("rankText").textContent = String(data.rank);
}

/*
  Creates and shuffles deck.
*/
function createDeck(): void {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  deck = [];

  for (const suit of suits) {
    for (const value of values) {
      deck.push(value + suit);
    }
  }

  deck.sort(() => Math.random() - 0.5);
}

/*
  Draws one card.
*/
function drawCard(): string {
  return deck.pop() as string;
}

/*
  Calculates hand score.
*/
function getScore(cards: string[]): number {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    const value = card.slice(0, -1);

    if (value === "A") {
      total += 11;
      aces++;
    } else if (["J", "Q", "K"].includes(value)) {
      total += 10;
    } else {
      total += Number(value);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

/*
  Checks natural Blackjack.
*/
function isBlackjack(cards: string[]): boolean {
  return cards.length === 2 && getScore(cards) === 21;
}

/*
  Adds amount to bet.
*/
function addBet(amount: number): void {
  const user = currentUser;

  if (!user || gameActive) return;

  if (bet + amount > user.balance) {
    el<HTMLParagraphElement>("message").textContent = "Not enough balance.";
    return;
  }

  bet += amount;
  el<HTMLParagraphElement>("message").textContent = `Current bet: $${bet}`;
  updateScreen();
}

/*
  Clears bet.
*/
function clearBet(): void {
  if (gameActive) return;

  bet = 0;
  el<HTMLParagraphElement>("message").textContent = "Bet cleared.";
  updateScreen();
}

/*
  Starts round.
*/
function deal(): void {
  const user = currentUser;

  if (!user || gameActive || bet <= 0) return;

  createDeck();

  playerCards = [drawCard(), drawCard()];
  dealerCards = [drawCard(), drawCard()];

  gameActive = true;
  hideDealerCard = true;

  el<HTMLParagraphElement>("message").textContent = "Hit or Stand.";
  updateScreen();

  const playerBlackjack = isBlackjack(playerCards);
  const dealerBlackjack = isBlackjack(dealerCards);

  if (playerBlackjack || dealerBlackjack) {
    hideDealerCard = false;
    updateScreen();

    if (playerBlackjack && dealerBlackjack) {
      endRound("push");
    } else if (playerBlackjack) {
      endRound("blackjack");
    } else {
      endRound("loss");
    }
  }
}

/*
  Player draws card.
*/
function hit(): void {
  if (!gameActive) return;

  playerCards.push(drawCard());

  const score = getScore(playerCards);

  updateScreen();

  if (score > 21) {
    endRound("loss");
  } else if (score === 21) {
    stand();
  }
}

/*
  Dealer plays and round is decided.
*/
function stand(): void {
  if (!gameActive) return;

  hideDealerCard = false;

  while (getScore(dealerCards) < 17) {
    dealerCards.push(drawCard());
  }

  const playerScore = getScore(playerCards);
  const dealerScore = getScore(dealerCards);

  updateScreen();

  if (dealerScore > 21 || playerScore > dealerScore) {
    endRound("win");
  } else if (playerScore === dealerScore) {
    endRound("push");
  } else {
    endRound("loss");
  }
}

/*
  Shows a large slot-machine style MEGA WIN animation.
  It stays visible until the user clicks, presses a key, or touches the screen.
*/
function showMegaWin(amount: number): void {
  const overlay = el<HTMLDivElement>("megaWinOverlay");
  const amountText = el<HTMLSpanElement>("megaWinAmount");

  amountText.textContent = String(amount);
  overlay.classList.remove("hidden");

  playCasinoBoom();

  setTimeout(() => {
    playCoinRumble();
  }, 250);

  const closeMegaWin = (): void => {
    overlay.classList.add("hidden");

    window.removeEventListener("click", closeMegaWin);
    window.removeEventListener("keydown", closeMegaWin);
    window.removeEventListener("touchstart", closeMegaWin);
  };

  setTimeout(() => {
    window.addEventListener("click", closeMegaWin);
    window.addEventListener("keydown", closeMegaWin);
    window.addEventListener("touchstart", closeMegaWin);
  }, 300);
}

/*
  Creates falling gold coins for win effects.
*/
function coinRain(): void {
  for (let i = 0; i < 100; i++) {
    const coin = document.createElement("div");

    coin.className = "coin";
    coin.textContent = "●";

    coin.style.left = Math.random() * 100 + "vw";
    coin.style.animationDuration = Math.random() * 1.5 + 1.8 + "s";
    coin.style.fontSize = Math.random() * 14 + 14 + "px";

    document.body.appendChild(coin);

    setTimeout(() => {
      coin.remove();
    }, 3500);
  }
}

/*
  Plays a short fake coin-rumbling sound using the browser audio system.
*/
function playCoinRumble(): void {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();

  const playCoinClick = (delay: number, frequency: number): void => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + delay + 0.09);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime + delay);
    oscillator.stop(audioContext.currentTime + delay + 0.1);
  };

  for (let i = 0; i < 32; i++) {
    const delay = i * 0.035;
    const frequency = 700 + Math.random() * 900;

    playCoinClick(delay, frequency);
  }

  setTimeout(() => {
    audioContext.close();
  }, 1800);
}

/*
  Plays a short casino-style explosion sound.
*/
function playCasinoBoom(): void {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();

  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.45, audioContext.currentTime + 0.02);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.8);
  masterGain.connect(audioContext.destination);

  const bass = audioContext.createOscillator();
  bass.type = "sine";
  bass.frequency.setValueAtTime(95, audioContext.currentTime);
  bass.frequency.exponentialRampToValueAtTime(35, audioContext.currentTime + 0.55);
  bass.connect(masterGain);
  bass.start();
  bass.stop(audioContext.currentTime + 0.65);

  const bufferSize = Math.floor(audioContext.sampleRate * 0.7);
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;

  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(900, audioContext.currentTime);
  noiseFilter.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.6);

  noise.connect(noiseFilter);
  noiseFilter.connect(masterGain);

  noise.start();
  noise.stop(audioContext.currentTime + 0.7);

  setTimeout(() => {
    audioContext.close();
  }, 1000);
}

/*
  Ends round and saves progress.
*/
async function endRound(result: "win" | "loss" | "push" | "blackjack"): Promise<void> {
  const user = currentUser;

  if (!user) return;

  gameActive = false;
  hideDealerCard = false;

  let winAmount = 0;

  if (result === "win") {
    winAmount = bet;
    user.balance += winAmount;
    user.wins++;
    el<HTMLParagraphElement>("message").textContent = "You won!";
  }

  if (result === "blackjack") {
    winAmount = Math.floor(bet * 1.5);
    user.balance += winAmount;
    user.wins++;
    el<HTMLParagraphElement>("message").textContent = `Blackjack! You won $${winAmount}.`;
  }

  if (result === "loss") {
    user.balance -= bet;
    user.losses++;
    el<HTMLParagraphElement>("message").textContent = "You lost!";
  }

  if (result === "push") {
    user.pushes++;
    el<HTMLParagraphElement>("message").textContent = "Push!";
  }

  if (user.balance < 0) {
    user.balance = 0;
  }

  if (user.balance > user.max_balance) {
    user.max_balance = user.balance;
  }

  bet = 0;
  currentUser = user;

  updateScreen();
  await saveProgress();

  if (winAmount >= 300 || result === "blackjack") {
    showMegaWin(winAmount);
    coinRain();
  }

  if (user.balance === 0) {
    el<HTMLParagraphElement>("message").textContent = "Game over. Press New Game to start again.";
  }
}

/*
  Updates screen.
*/
function updateScreen(): void {
  const user = currentUser;

  el<HTMLSpanElement>("usernameText").textContent = user ? user.username : "";
  el<HTMLSpanElement>("balanceText").textContent = user ? String(user.balance) : "0";
  el<HTMLSpanElement>("betText").textContent = String(bet);

  el<HTMLSpanElement>("winsText").textContent = user ? String(user.wins) : "0";
  el<HTMLSpanElement>("lossesText").textContent = user ? String(user.losses) : "0";
  el<HTMLSpanElement>("pushesText").textContent = user ? String(user.pushes) : "0";

  const totalGames = user ? user.wins + user.losses + user.pushes : 0;
  const winRate = totalGames === 0 || !user ? 0 : (user.wins / totalGames) * 100;

  el<HTMLSpanElement>("totalGamesText").textContent = String(totalGames);
  el<HTMLSpanElement>("winRateText").textContent = `${winRate.toFixed(1)}%`;
  el<HTMLSpanElement>("bestBalanceText").textContent = user ? String(user.max_balance) : "0";

  showCards("playerCards", playerCards, false);
  showCards("dealerCards", dealerCards, hideDealerCard);

  el<HTMLSpanElement>("playerScore").textContent = String(getScore(playerCards));

  if (hideDealerCard && dealerCards.length > 0) {
    el<HTMLSpanElement>("dealerScore").textContent = "?";
  } else {
    el<HTMLSpanElement>("dealerScore").textContent = String(getScore(dealerCards));
  }

  const noUser = !user;
  const noMoney = user ? user.balance <= 0 : true;

  el<HTMLButtonElement>("dealBtn").disabled = noUser || gameActive || bet <= 0 || noMoney;
  el<HTMLButtonElement>("hitBtn").disabled = noUser || !gameActive;
  el<HTMLButtonElement>("standBtn").disabled = noUser || !gameActive;
  el<HTMLButtonElement>("clearBetBtn").disabled = noUser || gameActive || bet <= 0;
  el<HTMLButtonElement>("newGameBtn").disabled = noUser || gameActive;
}

/*
  Displays cards.
*/
function showCards(elementId: string, cards: string[], hideSecondCard: boolean): void {
  const container = el<HTMLDivElement>(elementId);
  container.innerHTML = "";

  cards.forEach((card, index) => {
    const div = document.createElement("div");

    if (hideSecondCard && index === 1) {
      div.className = "card back";
      container.appendChild(div);
      return;
    }

    const value = card.slice(0, -1);
    const suit = card.slice(-1);

    div.className = suit === "♥" || suit === "♦" ? "card red" : "card";

    div.innerHTML = `
      <div class="corner top-left">${value}<br>${suit}</div>
      <div class="center-suit">${suit}</div>
      <div class="corner bottom-right">${value}<br>${suit}</div>
    `;

    container.appendChild(div);
  });
}