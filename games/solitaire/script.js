"use strict";

/* =========================================================================
   PRASUN GAMES — CLASSIC KLONDIKE SOLITAIRE
   Corrected / polished rebuild.

   Single source of truth: the `state` object.

   The DOM is rebuilt from `state` on every render() call.
   DOM elements never drive game logic.

   Click, tap, drag and touch interactions funnel through the same
   move-validation and move-execution pipeline.
   ========================================================================= */


/* =========================================================================
   CONSTANTS
   ========================================================================= */

const SUIT_SPADES = 0;
const SUIT_HEARTS = 1;
const SUIT_CLUBS = 2;
const SUIT_DIAMONDS = 3;

const SUIT_SYMBOLS = [
  "\u2660", // ♠
  "\u2665", // ♥
  "\u2663", // ♣
  "\u2666"  // ♦
];

const SUIT_NAMES = [
  "Spades",
  "Hearts",
  "Clubs",
  "Diamonds"
];

const RANK_LABELS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K"
];

const RANK_ARIA = [
  "Ace",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "Jack",
  "Queen",
  "King"
];

const MAX_HISTORY = 100;
const DRAG_THRESHOLD = 6;

const SOUND_KEY = "prasunSolitaireSoundEnabled";
const STATS_KEY = "prasunSolitaireStats";


/* =========================================================================
   CARD HELPERS
   ========================================================================= */

function isRed(card) {
  return (
    card.suit === SUIT_HEARTS ||
    card.suit === SUIT_DIAMONDS
  );
}


/* =========================================================================
   GAME STATE
   ========================================================================= */

const state = {
  tableau: [
    [],
    [],
    [],
    [],
    [],
    [],
    []
  ],

  stock: [],

  waste: [],

  foundations: [
    [],
    [],
    [],
    []
  ],

  moves: 0,

  seconds: 0,

  started: false,

  won: false,

  selection: null,

  history: [],

  soundEnabled: true,

  justFlippedId: null,

  lastMovedIds: []
};


let timerHandle = null;

let dragState = null;

const cardElements = new Map();


/* =========================================================================
   STATISTICS
   ========================================================================= */

const stats = {
  gamesPlayed: 0,
  gamesWon: 0
};


/* =========================================================================
   DECK / DEALING
   ========================================================================= */

function createDeck() {
  const deck = [];

  for (let s = 0; s < 4; s++) {
    for (let r = 1; r <= 13; r++) {
      deck.push({
        id: "c-" + s + "-" + r,
        suit: s,
        rank: r,
        faceUp: false
      });
    }
  }

  return deck;
}


function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }

  return deck;
}


function dealGame() {
  const deck = shuffleDeck(createDeck());

  let idx = 0;

  /*
    Klondike tableau:

    Column 1 = 1 card
    Column 2 = 2 cards
    ...
    Column 7 = 7 cards

    Total tableau cards = 28
    Remaining stock = 24
  */

  for (let c = 0; c < 7; c++) {
    for (let r = 0; r <= c; r++) {
      const card = deck[idx++];

      card.faceUp = r === c;

      state.tableau[c].push(card);
    }
  }

  state.stock = deck.slice(idx);

  stats.gamesPlayed++;

  saveStats();
}


/* =========================================================================
   RULES
   ========================================================================= */

function getRunStart(col) {
  if (col.length === 0) {
    return 0;
  }

  let i = col.length - 1;

  if (!col[i].faceUp) {
    return col.length;
  }

  while (i > 0) {
    const cur = col[i];
    const prev = col[i - 1];

    if (
      prev.faceUp &&
      prev.rank === cur.rank + 1 &&
      isRed(prev) !== isRed(cur)
    ) {
      i--;
    } else {
      break;
    }
  }

  return i;
}


function canMoveToTableau(cards, colIndex) {
  const col = state.tableau[colIndex];

  if (!cards || cards.length === 0) {
    return false;
  }

  const first = cards[0];

  /*
    Empty tableau columns can only receive a King.
  */
  if (col.length === 0) {
    return first.rank === 13;
  }

  const top = col[col.length - 1];

  /*
    Destination must have a face-up top card.
  */
  if (!top.faceUp) {
    return false;
  }

  /*
    Alternating colors and descending rank.
  */
  return (
    isRed(first) !== isRed(top) &&
    first.rank === top.rank - 1
  );
}


function canMoveToFoundation(card, suitIndex) {
  if (!card) {
    return false;
  }

  if (card.suit !== suitIndex) {
    return false;
  }

  const pile = state.foundations[suitIndex];

  /*
    Empty foundation starts with Ace.
  */
  if (pile.length === 0) {
    return card.rank === 1;
  }

  return (
    card.rank ===
    pile[pile.length - 1].rank + 1
  );
}


function isLegalMoveCards(cards, destination, sel) {
  if (!cards || cards.length === 0) {
    return false;
  }

  if (!destination) {
    return false;
  }

  if (destination.type === "tableau") {
    /*
      Prevent moving a tableau sequence onto itself.
    */
    if (
      sel &&
      sel.source === "tableau" &&
      sel.col === destination.col
    ) {
      return false;
    }

    return canMoveToTableau(
      cards,
      destination.col
    );
  }

  if (destination.type === "foundation") {
    /*
      Foundations only accept one card at a time.
    */
    if (cards.length !== 1) {
      return false;
    }

    return canMoveToFoundation(
      cards[0],
      destination.suit
    );
  }

  return false;
}


/* =========================================================================
   SELECTION / CARD LOCATION
   ========================================================================= */

function getSelectedCards(sel) {
  if (!sel) {
    return [];
  }

  if (sel.source === "tableau") {
    return state.tableau[sel.col].slice(sel.index);
  }

  if (sel.source === "waste") {
    return state.waste.length
      ? [state.waste[state.waste.length - 1]]
      : [];
  }

  if (sel.source === "foundation") {
    const pile = state.foundations[sel.suit];

    return pile.length
      ? [pile[pile.length - 1]]
      : [];
  }

  return [];
}


function findCardLocation(cardId) {
  /*
    Search tableau.
  */
  for (let c = 0; c < 7; c++) {
    const idx = state.tableau[c].findIndex(
      card => card.id === cardId
    );

    if (idx !== -1) {
      return {
        source: "tableau",
        col: c,
        index: idx
      };
    }
  }

  /*
    Search waste.
  */
  const wIdx = state.waste.findIndex(
    card => card.id === cardId
  );

  if (wIdx !== -1) {
    return {
      source: "waste",
      index: wIdx
    };
  }

  /*
    Search foundations.
  */
  for (let s = 0; s < 4; s++) {
    const fIdx = state.foundations[s].findIndex(
      card => card.id === cardId
    );

    if (fIdx !== -1) {
      return {
        source: "foundation",
        suit: s,
        index: fIdx
      };
    }
  }

  return null;
}


function isSameSelection(a, b) {
  if (!a || !b) {
    return false;
  }

  if (a.source !== b.source) {
    return false;
  }

  if (a.source === "tableau") {
    return (
      a.col === b.col &&
      a.index === b.index
    );
  }

  if (a.source === "foundation") {
    return a.suit === b.suit;
  }

  if (a.source === "waste") {
    return true;
  }

  return false;
}


/* =========================================================================
   HISTORY / UNDO
   ========================================================================= */

/*
  Deep clone helper.
*/
function deepClone(x) {
  if (typeof structuredClone === "function") {
    return structuredClone(x);
  }

  return JSON.parse(JSON.stringify(x));
}


/*
  IMPORTANT:
  Timer seconds are intentionally NOT included in history.

  Undo should restore the board/game position, but it should not make
  the elapsed timer run backward.
*/
function snapshotState() {
  return {
    tableau: deepClone(state.tableau),
    stock: deepClone(state.stock),
    waste: deepClone(state.waste),
    foundations: deepClone(state.foundations),
    moves: state.moves,
    started: state.started,
    won: state.won
  };
}


function pushHistory() {
  state.history.push(snapshotState());

  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  }
}


/*
  Undo one action.
*/
function undo() {
  if (state.history.length === 0) {
    return;
  }

  const snap = state.history.pop();

  const wasWon = state.won;

  state.tableau = snap.tableau;
  state.stock = snap.stock;
  state.waste = snap.waste;
  state.foundations = snap.foundations;

  state.moves = snap.moves;

  /*
    Timer value is intentionally preserved.
  */

  state.started = snap.started;
  state.won = snap.won;

  state.selection = null;
  state.justFlippedId = null;
  state.lastMovedIds = [];

  /*
    If a winning state is undone, remove that win from statistics.
    This prevents one game from being counted multiple times if the
    player wins, undoes, and wins again.
  */
  if (wasWon && !state.won) {
    stats.gamesWon = Math.max(
      0,
      stats.gamesWon - 1
    );

    saveStats();

    hideWinModal();

    updateStatsDisplay();
  }

  /*
    Correct timer behavior after restoring the previous state.
  */
  if (!state.started || state.won) {
    stopTimer();
  } else if (!timerHandle) {
    timerHandle = setInterval(
      tick,
      1000
    );
  }

  playSound("click");

  render();

  announce("Move undone.");
}


/* =========================================================================
   TIMER
   ========================================================================= */

function tick() {
  state.seconds++;

  updateTimeDisplay();
}


function ensureTimerStarted() {
  state.started = true;

  if (!timerHandle && !state.won) {
    timerHandle = setInterval(
      tick,
      1000
    );
  }
}


function stopTimer() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}


function formatTime(totalSeconds) {
  const m = Math.floor(
    totalSeconds / 60
  );

  const s = totalSeconds % 60;

  return (
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0")
  );
}


/* =========================================================================
   CORE GAME MOVES
   ========================================================================= */

function executeMove(sel, destination) {
  const cards = getSelectedCards(sel);

  if (!cards.length) {
    return;
  }

  pushHistory();

  /*
    Remove cards from source.
  */
  if (sel.source === "tableau") {
    state.tableau[sel.col].splice(
      sel.index,
      cards.length
    );

    const col = state.tableau[sel.col];

    /*
      Automatically turn the newly exposed card face-up.
    */
    if (
      col.length &&
      !col[col.length - 1].faceUp
    ) {
      col[col.length - 1].faceUp = true;

      state.justFlippedId =
        col[col.length - 1].id;
    }
  } else if (sel.source === "waste") {
    state.waste.pop();
  } else if (sel.source === "foundation") {
    state.foundations[sel.suit].pop();
  }

  /*
    Add cards to destination.
  */
  if (destination.type === "tableau") {
    state.tableau[destination.col].push.apply(
      state.tableau[destination.col],
      cards
    );
  } else {
    state.foundations[destination.suit].push.apply(
      state.foundations[destination.suit],
      cards
    );
  }

  state.lastMovedIds = cards.map(
    card => card.id
  );

  state.moves++;

  ensureTimerStarted();

  /*
    Sound.
  */
  playSound(
    destination.type === "foundation"
      ? "foundation"
      : "move"
  );

  if (state.justFlippedId) {
    setTimeout(
      () => playSound("flip"),
      110
    );
  }

  state.selection = null;

  render();

  announce(
    cardAriaLabel(cards[0]) +
    " moved to " +
    (
      destination.type === "foundation"
        ? "foundation"
        : "tableau"
    ) +
    "."
  );

  checkWin();
}


/* =========================================================================
   STOCK / WASTE
   ========================================================================= */

function handleStockClick() {
  /*
    Draw from stock.
  */
  if (state.stock.length > 0) {
    pushHistory();

    const card = state.stock.pop();

    card.faceUp = true;

    state.waste.push(card);

    state.moves++;

    ensureTimerStarted();

    playSound("draw");

    state.selection = null;

    render();

    announce(
      cardAriaLabel(card) +
      " drawn from stock."
    );

    return;
  }

  /*
    Recycle waste back into stock.
  */
  if (state.waste.length > 0) {
    pushHistory();

    const recycled =
      state.waste.slice().reverse();

    recycled.forEach(
      card => {
        card.faceUp = false;
      }
    );

    state.stock = recycled;

    state.waste = [];

    state.moves++;

    ensureTimerStarted();

    playSound("draw");

    state.selection = null;

    render();

    announce(
      "Stock recycled from waste."
    );
  }
}


/* =========================================================================
   WIN DETECTION
   ========================================================================= */

function checkWin() {
  const total =
    state.foundations.reduce(
      (sum, pile) =>
        sum + pile.length,
      0
    );

  if (
    total === 52 &&
    !state.won
  ) {
    state.won = true;

    stopTimer();

    playSound("win");

    stats.gamesWon++;

    saveStats();

    updateStatsDisplay();

    showWinModal();

    announce(
      "Congratulations, you won the game."
    );
  }
}


/* =========================================================================
   HINT SYSTEM
   ========================================================================= */

function findHint() {
  /*
    -------------------------------------------------------------
    1. Waste -> Foundation
    -------------------------------------------------------------
  */
  if (state.waste.length) {
    const card =
      state.waste[
        state.waste.length - 1
      ];

    if (
      canMoveToFoundation(
        card,
        card.suit
      )
    ) {
      return {
        from: {
          type: "waste"
        },

        to: {
          type: "foundation",
          suit: card.suit
        }
      };
    }
  }


  /*
    -------------------------------------------------------------
    2. Tableau -> Foundation
    -------------------------------------------------------------
  */
  for (let c = 0; c < 7; c++) {
    const col = state.tableau[c];

    if (!col.length) {
      continue;
    }

    const top =
      col[col.length - 1];

    if (
      top.faceUp &&
      canMoveToFoundation(
        top,
        top.suit
      )
    ) {
      return {
        from: {
          type: "tableau",
          col: c
        },

        to: {
          type: "foundation",
          suit: top.suit
        }
      };
    }
  }


  /*
    -------------------------------------------------------------
    3. Foundation -> Tableau

    This is important because the game permits moving a top
    foundation card back onto the tableau.
    -------------------------------------------------------------
  */
  for (let s = 0; s < 4; s++) {
    const pile =
      state.foundations[s];

    if (!pile.length) {
      continue;
    }

    const card =
      pile[pile.length - 1];

    for (let t = 0; t < 7; t++) {
      if (
        canMoveToTableau(
          [card],
          t
        )
      ) {
        return {
          from: {
            type: "foundation",
            suit: s
          },

          to: {
            type: "tableau",
            col: t
          }
        };
      }
    }
  }


  /*
    -------------------------------------------------------------
    4. Waste -> Tableau
    -------------------------------------------------------------
  */
  if (state.waste.length) {
    const card =
      state.waste[
        state.waste.length - 1
      ];

    for (let t = 0; t < 7; t++) {
      if (
        canMoveToTableau(
          [card],
          t
        )
      ) {
        return {
          from: {
            type: "waste"
          },

          to: {
            type: "tableau",
            col: t
          }
        };
      }
    }
  }


  /*
    -------------------------------------------------------------
    5. Tableau -> Tableau
    -------------------------------------------------------------
  */
  for (let c = 0; c < 7; c++) {
    const col = state.tableau[c];

    const runStart =
      getRunStart(col);

    if (
      runStart >= col.length
    ) {
      continue;
    }

    const seq =
      col.slice(runStart);

    for (let t = 0; t < 7; t++) {
      if (
        t !== c &&
        canMoveToTableau(
          seq,
          t
        )
      ) {
        return {
          from: {
            type: "tableau",
            col: c
          },

          to: {
            type: "tableau",
            col: t
          }
        };
      }
    }
  }


  /*
    -------------------------------------------------------------
    6. If stock/waste still has cards, suggest drawing.
    -------------------------------------------------------------
  */
  if (
    state.stock.length ||
    state.waste.length
  ) {
    return {
      from: {
        type: "stock"
      },

      to: null
    };
  }

  return null;
}


function showHint() {
  const hint = findHint();

  if (!hint) {
    toast(
      "No moves available right now."
    );

    return;
  }

  if (
    hint.from.type === "stock"
  ) {
    toast(
      "Try drawing from the stock."
    );

    flashPile({
      type: "stock"
    });

    return;
  }

  toast(
    "Try the highlighted move."
  );

  flashPile(
    hint.from
  );

  if (hint.to) {
    flashPile(
      hint.to
    );
  }
}


/* =========================================================================
   AUTO COMPLETE
   ========================================================================= */

/*
  Simulates whether the remaining tableau cards can all safely move
  to the foundations.

  IMPORTANT:
  The simulation now correctly flips a newly exposed face-down card
  after a tableau card is removed.
*/
function simulateAutoComplete() {
  /*
    Auto Complete only operates once stock and waste are empty.
  */
  if (
    state.stock.length ||
    state.waste.length
  ) {
    return {
      possible: false
    };
  }

  /*
    Make an isolated lightweight copy.
  */
  const tab =
    state.tableau.map(
      col =>
        col.map(
          card => ({
            suit: card.suit,
            rank: card.rank,
            faceUp: card.faceUp
          })
        )
    );

  const found = [
    [],
    [],
    [],
    []
  ];

  let progress = true;

  let guard = 0;

  while (
    progress &&
    guard < 300
  ) {
    progress = false;

    guard++;

    for (let c = 0; c < 7; c++) {
      const col = tab[c];

      if (!col.length) {
        continue;
      }

      const top =
        col[col.length - 1];

      if (!top.faceUp) {
        continue;
      }

      const pile =
        found[top.suit];

      const need =
        pile.length === 0
          ? 1
          : pile[pile.length - 1].rank + 1;

      if (
        top.rank === need
      ) {
        /*
          Remove top card.
        */
        pile.push(
          col.pop()
        );

        /*
          Correctly flip newly exposed card.
        */
        if (
          col.length &&
          !col[col.length - 1].faceUp
        ) {
          col[col.length - 1].faceUp = true;
        }

        progress = true;
      }
    }
  }

  const total =
    found.reduce(
      (sum, pile) =>
        sum + pile.length,
      0
    );

  return {
    possible: total === 52
  };
}


function isAutoCompleteAvailable() {
  if (state.won) {
    return false;
  }

  return simulateAutoComplete().possible;
}


function runAutoComplete() {
  if (!isAutoCompleteAvailable()) {
    return;
  }

  playSound("click");

  function step() {
    let moved = false;

    for (let c = 0; c < 7; c++) {
      const col =
        state.tableau[c];

      if (!col.length) {
        continue;
      }

      const top =
        col[col.length - 1];

      if (
        top.faceUp &&
        canMoveToFoundation(
          top,
          top.suit
        )
      ) {
        pushHistory();

        col.pop();

        /*
          Flip newly exposed card.
        */
        if (
          col.length &&
          !col[col.length - 1].faceUp
        ) {
          col[col.length - 1].faceUp = true;

          state.justFlippedId =
            col[col.length - 1].id;
        }

        state.foundations[
          top.suit
        ].push(top);

        state.moves++;

        state.lastMovedIds = [
          top.id
        ];

        ensureTimerStarted();

        playSound("foundation");

        render();

        /*
          FIX:
          Auto Complete must use the same win detection as
          normal moves.
        */
        checkWin();

        moved = true;

        break;
      }
    }

    if (state.won) {
      return;
    }

    if (moved) {
      setTimeout(
        step,
        110
      );
    }
  }

  step();
}


/* =========================================================================
   SOUND
   ========================================================================= */

const SoundManager = {
  ctx: null,

  enabled: true,

  ensureCtx() {
    if (!this.ctx) {
      try {
        const Ctx =
          window.AudioContext ||
          window.webkitAudioContext;

        this.ctx =
          Ctx
            ? new Ctx()
            : null;
      } catch (e) {
        this.ctx = null;
      }
    }

    return this.ctx;
  },

  play(name) {
    if (!this.enabled) {
      return;
    }

    const ctx =
      this.ensureCtx();

    if (!ctx) {
      return;
    }

    if (
      ctx.state === "suspended"
    ) {
      ctx.resume();
    }

    const now =
      ctx.currentTime;

    switch (name) {
      case "select":
        this._tone(
          ctx,
          now,
          520,
          0.05,
          0.05,
          "sine"
        );
        break;

      case "move":
        this._tone(
          ctx,
          now,
          380,
          0.07,
          0.06,
          "sine"
        );
        break;

      case "flip":
        this._tone(
          ctx,
          now,
          300,
          0.06,
          0.05,
          "triangle"
        );
        break;

      case "foundation":
        this._chord(
          ctx,
          now,
          [660, 880],
          0.08
        );
        break;

      case "draw":
        this._tone(
          ctx,
          now,
          340,
          0.05,
          0.045,
          "sine"
        );
        break;

      case "error":
        this._tone(
          ctx,
          now,
          140,
          0.14,
          0.08,
          "sawtooth"
        );
        break;

      case "win":
        this._winSound(
          ctx,
          now
        );
        break;

      case "click":
        this._tone(
          ctx,
          now,
          440,
          0.04,
          0.04,
          "sine"
        );
        break;
    }
  },

  _tone(
    ctx,
    t0,
    freq,
    dur,
    vol,
    type
  ) {
    const osc =
      ctx.createOscillator();

    const gain =
      ctx.createGain();

    osc.type =
      type || "sine";

    osc.frequency.setValueAtTime(
      freq,
      t0
    );

    gain.gain.setValueAtTime(
      0.0001,
      t0
    );

    gain.gain.exponentialRampToValueAtTime(
      Math.max(vol, 0.001),
      t0 + 0.008
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      t0 + dur
    );

    osc.connect(gain);

    gain.connect(
      ctx.destination
    );

    osc.start(t0);

    osc.stop(
      t0 + dur + 0.03
    );
  },

  _chord(
    ctx,
    t0,
    freqs,
    vol
  ) {
    freqs.forEach(
      (f, i) => {
        this._tone(
          ctx,
          t0 + i * 0.02,
          f,
          0.2,
          vol,
          "sine"
        );
      }
    );
  },

  _winSound(
    ctx,
    t0
  ) {
    const notes = [
      523.25,
      659.25,
      783.99,
      1046.5
    ];

    notes.forEach(
      (f, i) => {
        this._tone(
          ctx,
          t0 + i * 0.11,
          f,
          0.26,
          0.09,
          "sine"
        );
      }
    );
  }
};


function playSound(name) {
  SoundManager.play(name);
}


function loadSoundPref() {
  let saved = null;

  try {
    saved =
      localStorage.getItem(
        SOUND_KEY
      );
  } catch (e) {
    saved = null;
  }

  state.soundEnabled =
    saved === null
      ? true
      : saved === "1";

  SoundManager.enabled =
    state.soundEnabled;
}


function toggleSound() {
  state.soundEnabled =
    !state.soundEnabled;

  SoundManager.enabled =
    state.soundEnabled;

  try {
    localStorage.setItem(
      SOUND_KEY,
      state.soundEnabled
        ? "1"
        : "0"
    );
  } catch (e) {
    /*
      localStorage unavailable.
    */
  }

  updateSoundButton();

  if (state.soundEnabled) {
    SoundManager.ensureCtx();

    playSound("click");
  }
}


/* =========================================================================
   STATS / STORAGE
   ========================================================================= */

function loadStats() {
  try {
    const raw =
      localStorage.getItem(
        STATS_KEY
      );

    if (raw) {
      const parsed =
        JSON.parse(raw);

      stats.gamesPlayed =
        Number(parsed.gamesPlayed) || 0;

      stats.gamesWon =
        Number(parsed.gamesWon) || 0;
    }
  } catch (e) {
    /*
      Ignore corrupt/missing storage.
    */
  }
}


function saveStats() {
  try {
    localStorage.setItem(
      STATS_KEY,
      JSON.stringify(stats)
    );
  } catch (e) {
    /*
      localStorage unavailable.
    */
  }
}


/* =========================================================================
   DOM REFERENCES
   ========================================================================= */

let boardEl;
let tableauColumns;
let foundationPiles;
let stockEl;
let wasteEl;

let movesEl;
let timeEl;

let undoBtn;
let autoBtn;
let soundBtn;
let hintBtn;
let newGameBtn;

let winModal;
let winMovesEl;
let winTimeEl;
let playAgainBtn;
let closeModalBtn;

let statsEl;
let liveRegion;

let toastEl;
let toastTimer;


/* =========================================================================
   DOM CACHE
   ========================================================================= */

function cacheDom() {
  boardEl =
    document.getElementById(
      "board"
    );

  tableauColumns =
    Array.from(
      document.querySelectorAll(
        ".column"
      )
    );

  foundationPiles =
    Array.from(
      document.querySelectorAll(
        ".foundation"
      )
    );

  stockEl =
    document.getElementById(
      "stockPile"
    );

  wasteEl =
    document.getElementById(
      "wastePile"
    );

  movesEl =
    document.getElementById(
      "movesValue"
    );

  timeEl =
    document.getElementById(
      "timeValue"
    );

  undoBtn =
    document.getElementById(
      "undoBtn"
    );

  autoBtn =
    document.getElementById(
      "autoBtn"
    );

  soundBtn =
    document.getElementById(
      "soundBtn"
    );

  hintBtn =
    document.getElementById(
      "hintBtn"
    );

  newGameBtn =
    document.getElementById(
      "newGameBtn"
    );

  winModal =
    document.getElementById(
      "winModal"
    );

  winMovesEl =
    document.getElementById(
      "winMoves"
    );

  winTimeEl =
    document.getElementById(
      "winTime"
    );

  playAgainBtn =
    document.getElementById(
      "playAgainBtn"
    );

  closeModalBtn =
    document.getElementById(
      "closeModalBtn"
    );

  statsEl =
    document.getElementById(
      "statsLine"
    );

  liveRegion =
    document.getElementById(
      "liveRegion"
    );

  toastEl =
    document.getElementById(
      "toast"
    );
}


/* =========================================================================
   RENDERING
   ========================================================================= */

function cardAriaLabel(card) {
  return (
    RANK_ARIA[card.rank - 1] +
    " of " +
    SUIT_NAMES[card.suit]
  );
}


function createCardElement(card) {
  const el =
    document.createElement(
      "div"
    );

  const classes = [
    "card"
  ];

  if (!card.faceUp) {
    classes.push(
      "face-down"
    );
  }

  if (card.faceUp) {
    classes.push(
      isRed(card)
        ? "red"
        : "black"
    );
  }

  if (
    state.justFlippedId ===
    card.id
  ) {
    classes.push(
      "just-flipped"
    );
  }

  if (
    state.lastMovedIds.indexOf(
      card.id
    ) !== -1
  ) {
    classes.push(
      "just-moved"
    );
  }

  el.className =
    classes.join(" ");

  el.dataset.cardId =
    card.id;

  el.setAttribute(
    "role",
    "img"
  );

  if (card.faceUp) {
    el.setAttribute(
      "aria-label",
      cardAriaLabel(card)
    );

    const symbol =
      SUIT_SYMBOLS[card.suit];

    const label =
      RANK_LABELS[
        card.rank - 1
      ];

    el.innerHTML =
      '<span class="card-face">' +
        '<span class="card-corner top-left">' +
          '<span class="c-rank">' +
            label +
          "</span>" +
          '<span class="c-suit">' +
            symbol +
          "</span>" +
        "</span>" +

        '<span class="card-pip">' +
          symbol +
        "</span>" +

        '<span class="card-corner bottom-right">' +
          '<span class="c-rank">' +
            label +
          "</span>" +
          '<span class="c-suit">' +
            symbol +
          "</span>" +
        "</span>" +

      "</span>";
  } else {
    el.setAttribute(
      "aria-label",
      "Face-down card"
    );

    el.innerHTML =
      '<span class="card-back"></span>';
  }

  cardElements.set(
    card.id,
    el
  );

  return el;
}


function createEmptyTableauSlot(
  colIndex
) {
  const el =
    document.createElement(
      "div"
    );

  el.className =
    "empty-slot tableau-empty";

  el.innerHTML =
    '<span class="empty-hint">K</span>';

  el.setAttribute(
    "aria-label",
    "Empty tableau column " +
      (colIndex + 1) +
      ". Only a King can be placed here."
  );

  return el;
}


function createEmptyFoundationSlot(
  suitIndex
) {
  const el =
    document.createElement(
      "div"
    );

  const colorClass =
    (
      suitIndex === SUIT_HEARTS ||
      suitIndex === SUIT_DIAMONDS
    )
      ? "red"
      : "black";

  el.className =
    "empty-slot foundation-empty " +
    colorClass;

  el.innerHTML =
    '<span class="empty-hint">' +
      SUIT_SYMBOLS[suitIndex] +
    "</span>";

  el.setAttribute(
    "aria-label",
    "Empty " +
      SUIT_NAMES[suitIndex] +
      " foundation"
  );

  return el;
}


function getCardMetrics() {
  const rootStyles =
    getComputedStyle(
      document.documentElement
    );

  const cardHeight =
    parseFloat(
      rootStyles.getPropertyValue(
        "--card-height"
      )
    ) || 100;

  return {
    cardHeight
  };
}


function computeGaps(
  col,
  availableHeight
) {
  const {
    cardHeight
  } = getCardMetrics();

  const faceDownBase =
    cardHeight * 0.16;

  const faceUpBase =
    cardHeight * 0.32;

  let faceDownCount = 0;
  let faceUpCount = 0;

  col.forEach(
    card => {
      if (card.faceUp) {
        faceUpCount++;
      } else {
        faceDownCount++;
      }
    }
  );

  /*
    Last face-up card does not need an additional trailing gap.
  */
  if (faceUpCount > 0) {
    faceUpCount -= 1;
  }

  const naturalStackHeight =
    faceDownCount *
      faceDownBase +
    faceUpCount *
      faceUpBase +
    cardHeight;

  let scale = 1;

  if (
    availableHeight > 0 &&
    naturalStackHeight >
      availableHeight
  ) {
    const budget =
      Math.max(
        availableHeight -
          cardHeight,
        cardHeight * 0.5
      );

    const denom =
      faceDownCount *
        faceDownBase +
      faceUpCount *
        faceUpBase ||
      1;

    scale =
      Math.max(
        0.28,
        budget / denom
      );
  }

  return {
    faceDownGap:
      faceDownBase * scale,

    faceUpGap:
      faceUpBase * scale
  };
}


function renderTableau() {
  for (let c = 0; c < 7; c++) {
    const colEl =
      tableauColumns[c];

    colEl.innerHTML = "";

    const col =
      state.tableau[c];

    if (col.length === 0) {
      colEl.appendChild(
        createEmptyTableauSlot(c)
      );

      continue;
    }

    const availableHeight =
      colEl.clientHeight;

    const {
      faceDownGap,
      faceUpGap
    } =
      computeGaps(
        col,
        availableHeight
      );

    let offset = 0;

    col.forEach(
      (card, i) => {
        const el =
          createCardElement(card);

        el.style.top =
          offset + "px";

        el.style.zIndex =
          String(i + 1);

        colEl.appendChild(el);

        offset +=
          card.faceUp
            ? faceUpGap
            : faceDownGap;
      }
    );
  }
}


function renderWaste() {
  wasteEl.innerHTML = "";

  if (state.waste.length === 0) {
    const ph =
      document.createElement(
        "div"
      );

    ph.className =
      "empty-slot waste-empty";

    ph.setAttribute(
      "aria-label",
      "Waste pile, empty"
    );

    wasteEl.appendChild(ph);

    return;
  }

  const top =
    state.waste[
      state.waste.length - 1
    ];

  wasteEl.appendChild(
    createCardElement(top)
  );
}


function renderStock() {
  stockEl.innerHTML = "";

  if (state.stock.length === 0) {
    const ph =
      document.createElement(
        "div"
      );

    ph.className =
      "empty-slot stock-empty";

    ph.innerHTML =
      '<span class="recycle-icon">\u21bb</span>';

    ph.setAttribute(
      "aria-label",
      "Stock empty. Click to recycle the waste pile."
    );

    stockEl.appendChild(ph);

    return;
  }

  const back =
    document.createElement(
      "div"
    );

  back.className =
    "card face-down stock-card";

  back.setAttribute(
    "aria-label",
    "Stock pile, " +
      state.stock.length +
      " card" +
      (
        state.stock.length === 1
          ? ""
          : "s"
      ) +
      " remaining. Click to draw."
  );

  back.innerHTML =
    '<span class="card-back"></span>';

  stockEl.appendChild(back);
}


function renderFoundations() {
  for (let s = 0; s < 4; s++) {
    const pileEl =
      foundationPiles[s];

    pileEl.innerHTML = "";

    const pile =
      state.foundations[s];

    if (pile.length === 0) {
      pileEl.appendChild(
        createEmptyFoundationSlot(s)
      );
    } else {
      const top =
        pile[pile.length - 1];

      pileEl.appendChild(
        createCardElement(top)
      );
    }
  }
}


function applySelectionHighlight() {
  if (!state.selection) {
    return;
  }

  const cards =
    getSelectedCards(
      state.selection
    );

  cards.forEach(
    card => {
      const el =
        cardElements.get(
          card.id
        );

      if (el) {
        el.classList.add(
          "selected"
        );
      }
    }
  );
}


function updateTimeDisplay() {
  if (timeEl) {
    timeEl.textContent =
      formatTime(
        state.seconds
      );
  }
}


function updateHUD() {
  if (movesEl) {
    movesEl.textContent =
      String(state.moves);
  }

  updateTimeDisplay();

  if (undoBtn) {
    undoBtn.disabled =
      state.history.length === 0;
  }

  if (autoBtn) {
    autoBtn.disabled =
      !isAutoCompleteAvailable();
  }
}


function updateStatsDisplay() {
  if (!statsEl) {
    return;
  }

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round(
          (
            stats.gamesWon /
            stats.gamesPlayed
          ) * 100
        )
      : 0;

  statsEl.textContent =
    "Games " +
    stats.gamesPlayed +
    " \u00b7 Wins " +
    stats.gamesWon +
    " \u00b7 Win rate " +
    winRate +
    "%";
}


function updateSoundButton() {
  if (!soundBtn) {
    return;
  }

  soundBtn.textContent =
    state.soundEnabled
      ? "\uD83D\uDD0A Sound On"
      : "\uD83D\uDD07 Sound Off";

  soundBtn.setAttribute(
    "aria-pressed",
    state.soundEnabled
      ? "true"
      : "false"
  );
}


function announce(message) {
  if (liveRegion) {
    liveRegion.textContent =
      message;
  }
}


function toast(message) {
  if (!toastEl) {
    return;
  }

  toastEl.textContent =
    message;

  toastEl.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () => {
        toastEl.classList.remove(
          "show"
        );
      },
      1800
    );
}


function pileElement(target) {
  if (target.type === "tableau") {
    return tableauColumns[
      target.col
    ];
  }

  if (
    target.type === "foundation"
  ) {
    return foundationPiles[
      target.suit
    ];
  }

  if (target.type === "stock") {
    return stockEl;
  }

  if (target.type === "waste") {
    return wasteEl;
  }

  return null;
}


function flashPile(target) {
  const el =
    pileElement(target);

  if (!el) {
    return;
  }

  el.classList.add(
    "hint-glow"
  );

  setTimeout(
    () => {
      el.classList.remove(
        "hint-glow"
      );
    },
    1400
  );
}


function flashInvalidTarget(
  target
) {
  const el =
    pileElement(target);

  if (!el) {
    return;
  }

  el.classList.add(
    "invalid-flash"
  );

  setTimeout(
    () => {
      el.classList.remove(
        "invalid-flash"
      );
    },
    350
  );
}


function shakeSelection() {
  if (!state.selection) {
    return;
  }

  getSelectedCards(
    state.selection
  ).forEach(
    card => {
      const el =
        cardElements.get(
          card.id
        );

      if (el) {
        el.classList.add(
          "invalid-shake"
        );

        setTimeout(
          () => {
            el.classList.remove(
              "invalid-shake"
            );
          },
          350
        );
      }
    }
  );
}


function render() {
  cardElements.clear();

  renderTableau();

  renderWaste();

  renderStock();

  renderFoundations();

  applySelectionHighlight();

  updateHUD();

  /*
    These visual-state arrays only apply to one render.
  */
  state.justFlippedId = null;

  state.lastMovedIds = [];
}


/* =========================================================================
   WIN MODAL
   ========================================================================= */

function showWinModal() {
  if (winMovesEl) {
    winMovesEl.textContent =
      String(state.moves);
  }

  if (winTimeEl) {
    winTimeEl.textContent =
      formatTime(
        state.seconds
      );
  }

  if (!winModal) {
    return;
  }

  winModal.hidden = false;

  requestAnimationFrame(
    () => {
      winModal.classList.add(
        "show"
      );
    }
  );

  if (playAgainBtn) {
    playAgainBtn.focus();
  }
}


function hideWinModal() {
  if (!winModal) {
    return;
  }

  winModal.classList.remove(
    "show"
  );

  winModal.hidden = true;
}


/* =========================================================================
   NEW GAME
   ========================================================================= */

function newGame() {
  stopTimer();

  state.tableau = [
    [],
    [],
    [],
    [],
    [],
    [],
    []
  ];

  state.stock = [];

  state.waste = [];

  state.foundations = [
    [],
    [],
    [],
    []
  ];

  state.moves = 0;

  state.seconds = 0;

  state.started = false;

  state.won = false;

  state.selection = null;

  state.history = [];

  state.justFlippedId = null;

  state.lastMovedIds = [];

  dealGame();

  hideWinModal();

  updateStatsDisplay();

  render();

  playSound("click");

  announce(
    "New game started."
  );
}


/* =========================================================================
   INPUT PIPELINE
   ========================================================================= */

function resolveTargetInfo(
  rawTarget
) {
  const cardEl =
    rawTarget.closest
      ? rawTarget.closest(
          ".card"
        )
      : null;

  const locEl =
    rawTarget.closest
      ? rawTarget.closest(
          "[data-location]"
        )
      : null;

  return {
    cardId:
      cardEl
        ? cardEl.dataset.cardId
        : null,

    location:
      locEl
        ? locEl.dataset.location
        : null,

    col:
      locEl &&
      locEl.dataset.col !==
        undefined
        ? Number(
            locEl.dataset.col
          )
        : null,

    suit:
      locEl &&
      locEl.dataset.suit !==
        undefined
        ? Number(
            locEl.dataset.suit
          )
        : null
  };
}


function getPickupSelection(
  targetInfo
) {
  if (!targetInfo.cardId) {
    return null;
  }

  const loc =
    findCardLocation(
      targetInfo.cardId
    );

  if (!loc) {
    return null;
  }

  /*
    Tableau:
    Only cards belonging to the valid face-up run can be picked.
  */
  if (
    loc.source === "tableau"
  ) {
    const col =
      state.tableau[
        loc.col
      ];

    const runStart =
      getRunStart(col);

    if (
      loc.index < runStart
    ) {
      return null;
    }

    return loc;
  }

  /*
    Waste:
    Only top card can be picked.
  */
  if (
    loc.source === "waste"
  ) {
    if (
      loc.index !==
      state.waste.length - 1
    ) {
      return null;
    }

    return loc;
  }

  /*
    Foundation:
    Only top card can be picked.
  */
  if (
    loc.source === "foundation"
  ) {
    if (
      loc.index !==
      state.foundations[
        loc.suit
      ].length - 1
    ) {
      return null;
    }

    return loc;
  }

  return null;
}


function handleActivate(
  targetInfo
) {
  /*
    Stock click.
  */
  if (
    targetInfo.location ===
    "stock"
  ) {
    handleStockClick();
    return;
  }

  let destination = null;

  if (
    targetInfo.location ===
    "tableau"
  ) {
    destination = {
      type: "tableau",
      col: targetInfo.col
    };
  } else if (
    targetInfo.location ===
    "foundation"
  ) {
    destination = {
      type: "foundation",
      suit: targetInfo.suit
    };
  }

  const clickedSelectable =
    getPickupSelection(
      targetInfo
    );

  /*
    Existing selection.
  */
  if (state.selection) {
    /*
      Clicking selected cards deselects them.
    */
    if (
      isSameSelection(
        state.selection,
        clickedSelectable
      )
    ) {
      state.selection = null;

      render();

      return;
    }

    /*
      Try moving selected cards to destination.
    */
    if (destination) {
      const cards =
        getSelectedCards(
          state.selection
        );

      if (
        cards.length &&
        isLegalMoveCards(
          cards,
          destination,
          state.selection
        )
      ) {
        executeMove(
          state.selection,
          destination
        );

        return;
      }
    }

    /*
      Clicking another selectable card changes selection.
    */
    if (clickedSelectable) {
      state.selection =
        clickedSelectable;

      playSound("select");

      render();

      return;
    }

    /*
      Genuine invalid attempt.
    */
    shakeSelection();

    if (destination) {
      flashInvalidTarget(
        destination
      );
    }

    playSound("error");

    return;
  }

  /*
    No existing selection.
  */
  if (clickedSelectable) {
    state.selection =
      clickedSelectable;

    playSound("select");

    render();
  }
}


/* =========================================================================
   DRAG VISUALS
   ========================================================================= */

function beginDragVisuals(ds) {
  ds.group =
    ds.cardIds
      .map(
        id =>
          cardElements.get(id)
      )
      .filter(Boolean);

  ds.group.forEach(
    (el, i) => {
      const rect =
        el.getBoundingClientRect();

      el.style.position =
        "fixed";

      el.style.left =
        rect.left + "px";

      el.style.top =
        rect.top + "px";

      el.style.width =
        rect.width + "px";

      el.style.height =
        rect.height + "px";

      el.style.margin =
        "0";

      el.style.zIndex =
        String(900 + i);

      el.style.pointerEvents =
        "none";

      el.classList.add(
        "dragging"
      );
    }
  );
}


function updateDragVisualsPosition(
  ds,
  dx,
  dy
) {
  ds.group.forEach(
    el => {
      el.style.transform =
        "translate(" +
        dx +
        "px, " +
        dy +
        "px)";
    }
  );
}


function clearDropHighlight(ds) {
  if (
    ds &&
    ds.lastHighlighted
  ) {
    ds.lastHighlighted.classList.remove(
      "drop-valid",
      "drop-invalid"
    );

    ds.lastHighlighted =
      null;
  }
}


function updateDropHighlight(
  ds,
  x,
  y
) {
  clearDropHighlight(ds);

  const el =
    document.elementFromPoint(
      x,
      y
    );

  const container =
    el &&
    el.closest
      ? el.closest(
          "[data-location]"
        )
      : null;

  if (!container) {
    return;
  }

  const loc =
    container.dataset.location;

  if (
    loc !== "tableau" &&
    loc !== "foundation"
  ) {
    return;
  }

  const destination =
    loc === "tableau"
      ? {
          type: "tableau",
          col: Number(
            container.dataset.col
          )
        }
      : {
          type: "foundation",
          suit: Number(
            container.dataset.suit
          )
        };

  const cards =
    getSelectedCards(
      ds.pickup
    );

  const legal =
    isLegalMoveCards(
      cards,
      destination,
      ds.pickup
    );

  container.classList.add(
    legal
      ? "drop-valid"
      : "drop-invalid"
  );

  ds.lastHighlighted =
    container;
}


function findDropTarget(
  x,
  y
) {
  const el =
    document.elementFromPoint(
      x,
      y
    );

  const container =
    el &&
    el.closest
      ? el.closest(
          "[data-location]"
        )
      : null;

  if (!container) {
    return null;
  }

  const loc =
    container.dataset.location;

  if (loc === "tableau") {
    return {
      type: "tableau",
      col: Number(
        container.dataset.col
      )
    };
  }

  if (
    loc === "foundation"
  ) {
    return {
      type: "foundation",
      suit: Number(
        container.dataset.suit
      )
    };
  }

  return null;
}


/* =========================================================================
   POINTER EVENTS
   ========================================================================= */

function onBoardPointerDown(e) {
  /*
    Only primary/left pointer.
  */
  if (
    e.button !== undefined &&
    e.button !== 0
  ) {
    return;
  }

  const targetInfo =
    resolveTargetInfo(
      e.target
    );

  if (
    !targetInfo.location &&
    !targetInfo.cardId
  ) {
    return;
  }

  dragState = {
    pointerId:
      e.pointerId,

    startX:
      e.clientX,

    startY:
      e.clientY,

    moved: false,

    targetInfo,

    pickup:
      getPickupSelection(
        targetInfo
      )
  };

  if (dragState.pickup) {
    dragState.cardIds =
      getSelectedCards(
        dragState.pickup
      ).map(
        card => card.id
      );

    try {
      e.target.setPointerCapture(
        e.pointerId
      );
    } catch (err) {
      /*
        Some elements/browsers may not support pointer capture.
      */
    }
  }
}


function onPointerMove(e) {
  if (
    !dragState ||
    e.pointerId !==
      dragState.pointerId
  ) {
    return;
  }

  const dx =
    e.clientX -
    dragState.startX;

  const dy =
    e.clientY -
    dragState.startY;

  if (!dragState.moved) {
    if (
      Math.hypot(dx, dy) <
      DRAG_THRESHOLD
    ) {
      return;
    }

    dragState.moved = true;

    if (dragState.pickup) {
      beginDragVisuals(
        dragState
      );
    }
  }

  if (
    dragState.moved &&
    dragState.pickup
  ) {
    e.preventDefault();

    updateDragVisualsPosition(
      dragState,
      dx,
      dy
    );

    updateDropHighlight(
      dragState,
      e.clientX,
      e.clientY
    );
  }
}


function onPointerUp(e) {
  if (
    !dragState ||
    e.pointerId !==
      dragState.pointerId
  ) {
    return;
  }

  const ds =
    dragState;

  dragState = null;

  /*
    Actual drag.
  */
  if (
    ds.moved &&
    ds.pickup
  ) {
    clearDropHighlight(ds);

    const dest =
      findDropTarget(
        e.clientX,
        e.clientY
      );

    const cards =
      getSelectedCards(
        ds.pickup
      );

    if (
      dest &&
      isLegalMoveCards(
        cards,
        dest,
        ds.pickup
      )
    ) {
      executeMove(
        ds.pickup,
        dest
      );
    } else {
      playSound("error");

      if (dest) {
        flashInvalidTarget(
          dest
        );
      }

      ds.group.forEach(
        el => {
          el.classList.add(
            "invalid-shake"
          );
        }
      );

      setTimeout(
        () => render(),
        260
      );
    }

    return;
  }

  /*
    Normal click/tap.
  */
  if (!ds.moved) {
    handleActivate(
      ds.targetInfo
    );
  }
}


function onPointerCancel() {
  if (!dragState) {
    return;
  }

  dragState = null;

  render();
}


/* =========================================================================
   STOCK KEYBOARD ACCESS
   ========================================================================= */

function onStockKeydown(e) {
  if (
    e.key === "Enter" ||
    e.key === " " ||
    e.key === "Spacebar"
  ) {
    e.preventDefault();

    handleStockClick();
  }
}


/* =========================================================================
   KEYBOARD SHORTCUTS
   ========================================================================= */

function onKeyDown(e) {
  const tag =
    (
      e.target &&
      e.target.tagName
    ) || "";

  if (
    tag === "INPUT" ||
    tag === "TEXTAREA"
  ) {
    return;
  }

  /*
    Ctrl/Cmd + Z
  */
  if (
    (e.ctrlKey || e.metaKey) &&
    (
      e.key === "z" ||
      e.key === "Z"
    )
  ) {
    e.preventDefault();

    undo();

    return;
  }

  /*
    Escape = deselect.
  */
  if (
    e.key === "Escape"
  ) {
    if (state.selection) {
      state.selection = null;

      render();
    }

    return;
  }

  /*
    N = new game.
  */
  if (
    e.key === "n" ||
    e.key === "N"
  ) {
    newGame();

    return;
  }

  /*
    S = sound.
  */
  if (
    e.key === "s" ||
    e.key === "S"
  ) {
    toggleSound();

    return;
  }

  /*
    H = hint.
  */
  if (
    e.key === "h" ||
    e.key === "H"
  ) {
    showHint();

    return;
  }
}


/* =========================================================================
   EVENT WIRING
   ========================================================================= */

function wireEvents() {
  /*
    Board pointer pipeline.
  */
  boardEl.addEventListener(
    "pointerdown",
    onBoardPointerDown
  );

  document.addEventListener(
    "pointermove",
    onPointerMove,
    {
      passive: false
    }
  );

  document.addEventListener(
    "pointerup",
    onPointerUp
  );

  document.addEventListener(
    "pointercancel",
    onPointerCancel
  );


  /*
    Stock keyboard access.
  */
  stockEl.addEventListener(
    "keydown",
    onStockKeydown
  );


  /*
    Toolbar.
  */
  newGameBtn.addEventListener(
    "click",
    newGame
  );

  undoBtn.addEventListener(
    "click",
    undo
  );

  if (autoBtn) {
    autoBtn.addEventListener(
      "click",
      runAutoComplete
    );
  }

  if (hintBtn) {
    hintBtn.addEventListener(
      "click",
      showHint
    );
  }

  soundBtn.addEventListener(
    "click",
    toggleSound
  );


  /*
    Win modal.
  */
  playAgainBtn.addEventListener(
    "click",
    newGame
  );

  if (closeModalBtn) {
    closeModalBtn.addEventListener(
      "click",
      hideWinModal
    );
  }


  /*
    Keyboard shortcuts.
  */
  document.addEventListener(
    "keydown",
    onKeyDown
  );


  /*
    Responsive tableau recalculation.
  */
  let resizeTimer = null;

  window.addEventListener(
    "resize",
    () => {
      clearTimeout(
        resizeTimer
      );

      resizeTimer =
        setTimeout(
          () => render(),
          120
        );
    }
  );
}


/* =========================================================================
   INITIALIZATION
   ========================================================================= */

function init() {
  cacheDom();

  loadSoundPref();

  loadStats();

  updateSoundButton();

  updateStatsDisplay();

  wireEvents();

  newGame();

  /*
    newGame() renders the board and plays the initial click sound.
    The new game itself has not started yet, so make sure the timer
    remains stopped until the first actual game action.
  */
  state.started = false;

  stopTimer();

  updateTimeDisplay();
}


/* =========================================================================
   DOM READY
   ========================================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    init
  );
} else {
  init();
}
