"use strict";

/* =========================================================================
   PRASUN GAMES — CLASSIC KLONDIKE SOLITAIRE

   Final corrected rebuild.

   Architecture:
   - `state` is the single source of truth.
   - DOM is rebuilt from `state` by render().
   - All normal moves pass through executeMove().
   - Click/tap and drag/drop use the same legality functions.
   - Auto-complete uses a cancellable generation token.
   - Undo restores complete game snapshots.
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

const AUTO_COMPLETE_DELAY = 110;


/* =========================================================================
   HELPERS
   ========================================================================= */

function isRed(card) {
  return (
    card.suit === SUIT_HEARTS ||
    card.suit === SUIT_DIAMONDS
  );
}


/* =========================================================================
   STATE
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


/* =========================================================================
   RUNTIME VARIABLES
   ========================================================================= */

let timerHandle = null;

let dragState = null;

/*
   Every time a new game starts, Undo happens, or auto-complete is cancelled,
   this generation changes.

   Any old auto-complete callback carrying an old generation becomes invalid.
*/
let autoCompleteGeneration = 0;

const cardElements = new Map();

const stats = {
  gamesPlayed: 0,
  gamesWon: 0
};


/* =========================================================================
   DECK / DEALING
   ========================================================================= */

function createDeck() {
  const deck = [];

  for (let suit = 0; suit < 4; suit++) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        id: "c-" + suit + "-" + rank,
        suit: suit,
        rank: rank,
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
     Standard Klondike tableau:

     Column 1 = 1 card
     Column 2 = 2 cards
     ...
     Column 7 = 7 cards
  */

  for (let c = 0; c < 7; c++) {
    for (let r = 0; r <= c; r++) {
      const card = deck[idx++];

      card.faceUp = r === c;

      state.tableau[c].push(card);
    }
  }

  /*
     52 total cards - 28 tableau cards = 24 stock cards.
  */

  state.stock = deck.slice(idx);

  stats.gamesPlayed++;

  saveStats();
}


/* =========================================================================
   RULES
   ========================================================================= */

function getRunStart(col) {
  if (!col || col.length === 0) {
    return 0;
  }

  let i = col.length - 1;

  /*
     If the top card is face-down, nothing in this column is movable.
  */

  if (!col[i].faceUp) {
    return col.length;
  }

  /*
     Walk backwards through a valid alternating-color descending sequence.
  */

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
  if (
    !cards ||
    cards.length === 0 ||
    colIndex < 0 ||
    colIndex >= state.tableau.length
  ) {
    return false;
  }

  const col = state.tableau[colIndex];

  const first = cards[0];

  /*
     Empty tableau columns accept Kings only.
  */

  if (col.length === 0) {
    return first.rank === 13;
  }

  const top = col[col.length - 1];

  if (!top.faceUp) {
    return false;
  }

  /*
     Tableau rule:

     - alternating colors
     - descending rank
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

  if (
    suitIndex < 0 ||
    suitIndex >= state.foundations.length
  ) {
    return false;
  }

  /*
     A card can only go to its own suit foundation.
  */

  if (card.suit !== suitIndex) {
    return false;
  }

  const pile = state.foundations[suitIndex];

  /*
     Empty foundation accepts Ace.
  */

  if (pile.length === 0) {
    return card.rank === 1;
  }

  /*
     Foundation must proceed sequentially.
  */

  return (
    card.rank ===
    pile[pile.length - 1].rank + 1
  );
}


function isLegalMoveCards(cards, destination, sel) {
  if (
    !cards ||
    cards.length === 0 ||
    !destination
  ) {
    return false;
  }

  if (destination.type === "tableau") {
    /*
       Prevent dropping a tableau stack onto its own column.
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
       Only one card can enter a foundation.
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
   CARD LOCATION / SELECTION
   ========================================================================= */

function getSelectedCards(sel) {
  if (!sel) {
    return [];
  }

  if (sel.source === "tableau") {
    return state.tableau[sel.col].slice(sel.index);
  }

  if (sel.source === "waste") {
    if (state.waste.length === 0) {
      return [];
    }

    return [
      state.waste[state.waste.length - 1]
    ];
  }

  if (sel.source === "foundation") {
    const pile = state.foundations[sel.suit];

    if (!pile || pile.length === 0) {
      return [];
    }

    return [
      pile[pile.length - 1]
    ];
  }

  return [];
}


function findCardLocation(cardId) {
  for (let c = 0; c < 7; c++) {
    const idx = state.tableau[c].findIndex(
      (x) => x.id === cardId
    );

    if (idx !== -1) {
      return {
        source: "tableau",
        col: c,
        index: idx
      };
    }
  }

  const wasteIndex = state.waste.findIndex(
    (x) => x.id === cardId
  );

  if (wasteIndex !== -1) {
    return {
      source: "waste",
      index: wasteIndex
    };
  }

  for (let s = 0; s < 4; s++) {
    const idx = state.foundations[s].findIndex(
      (x) => x.id === cardId
    );

    if (idx !== -1) {
      return {
        source: "foundation",
        suit: s,
        index: idx
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

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}


function snapshotState() {
  return {
    tableau: deepClone(state.tableau),
    stock: deepClone(state.stock),
    waste: deepClone(state.waste),
    foundations: deepClone(state.foundations),

    moves: state.moves,
    seconds: state.seconds,
    started: state.started,
    won: state.won
  };
}


function pushHistory() {
  state.history.push(
    snapshotState()
  );

  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  }
}


/*
   Cancel any currently running auto-complete sequence.

   Incrementing the generation invalidates all old timeout callbacks.
*/

function cancelAutoComplete() {
  autoCompleteGeneration++;
}


function undo() {
  if (state.history.length === 0) {
    return;
  }

  /*
     An Undo operation must invalidate auto-complete callbacks.
  */

  cancelAutoComplete();

  const snap = state.history.pop();

  const wasWon = state.won;

  state.tableau = snap.tableau;
  state.stock = snap.stock;
  state.waste = snap.waste;
  state.foundations = snap.foundations;

  state.moves = snap.moves;
  state.seconds = snap.seconds;
  state.started = snap.started;
  state.won = snap.won;

  state.selection = null;
  state.justFlippedId = null;
  state.lastMovedIds = [];

  if (wasWon && !state.won) {
    hideWinModal();
  }

  if (state.won) {
    stopTimer();
  } else if (state.started) {
    ensureTimerStarted();
  } else {
    stopTimer();
  }

  playSound("click");

  render();

  announce("Move undone.");
}


/* =========================================================================
   TIMER
   ========================================================================= */

function tick() {
  if (!state.started || state.won) {
    return;
  }

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
  if (!sel || !destination) {
    return;
  }

  const cards = getSelectedCards(sel);

  if (cards.length === 0) {
    return;
  }

  if (
    !isLegalMoveCards(
      cards,
      destination,
      sel
    )
  ) {
    return;
  }

  /*
     A normal move invalidates any pending auto-complete sequence.
  */

  cancelAutoComplete();

  pushHistory();

  /*
     Remove cards from source.
  */

  if (sel.source === "tableau") {
    state.tableau[sel.col].splice(
      sel.index,
      cards.length
    );

    const col =
      state.tableau[sel.col];

    /*
       Flip the newly exposed card.
    */

    if (
      col.length &&
      !col[col.length - 1].faceUp
    ) {
      col[col.length - 1].faceUp = true;

      state.justFlippedId =
        col[col.length - 1].id;
    }
  }

  else if (sel.source === "waste") {
    state.waste.pop();
  }

  else if (sel.source === "foundation") {
    state.foundations[
      sel.suit
    ].pop();
  }

  /*
     Add cards to destination.
  */

  if (destination.type === "tableau") {
    state.tableau[
      destination.col
    ].push(...cards);
  }

  else if (
    destination.type === "foundation"
  ) {
    state.foundations[
      destination.suit
    ].push(...cards);
  }

  state.lastMovedIds =
    cards.map((c) => c.id);

  state.moves++;

  ensureTimerStarted();

  playSound(
    destination.type === "foundation"
      ? "foundation"
      : "move"
  );

  if (state.justFlippedId) {
    setTimeout(() => {
      playSound("flip");
    }, 110);
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
     Drawing a card.
  */

  if (state.stock.length > 0) {
    cancelAutoComplete();

    pushHistory();

    const card =
      state.stock.pop();

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

     This implementation uses unlimited recycling,
     which is valid for Draw-1 Klondike.
  */

  if (state.waste.length > 0) {
    cancelAutoComplete();

    pushHistory();

    const recycled =
      state.waste
        .slice()
        .reverse();

    recycled.forEach(
      (card) => {
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

    cancelAutoComplete();

    playSound("win");

    stats.gamesWon++;

    saveStats();

    updateStatsDisplay();

    showWinModal();

    announce(
      "Congratulations, you won the game."
    );

    return true;
  }

  return false;
}


/* =========================================================================
   HINT
   ========================================================================= */

function findHint() {
  /*
     1. Waste -> foundation
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
     2. Tableau -> foundation
  */

  for (let c = 0; c < 7; c++) {
    const col =
      state.tableau[c];

    if (col.length) {
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
  }

  /*
     3. Waste -> tableau
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
     4. Tableau sequence -> tableau
     
     IMPORTANT:
     There is NO artificial restriction here.
     If canMoveToTableau() says it is legal,
     the hint is valid.
  */

  for (let c = 0; c < 7; c++) {
    const col =
      state.tableau[c];

    if (!col.length) {
      continue;
    }

    const runStart =
      getRunStart(col);

    if (
      runStart >= col.length
    ) {
      continue;
    }

    const sequence =
      col.slice(runStart);

    for (let t = 0; t < 7; t++) {
      if (t === c) {
        continue;
      }

      if (
        canMoveToTableau(
          sequence,
          t
        )
      ) {
        return {
          from: {
            type: "tableau",
            col: c,
            index: runStart
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
     5. If stock remains, drawing is a useful hint.
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
  const hint =
    findHint();

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
   AUTO-COMPLETE
   ========================================================================= */

/*
   Simulate whether all remaining tableau cards can legally
   be moved directly to their foundations.

   Auto-complete is only available when:
   - stock is empty
   - waste is empty
   - every remaining card is face-up
   - foundation sequence can absorb all cards
*/

function simulateAutoComplete() {
  if (
    state.stock.length ||
    state.waste.length
  ) {
    return {
      possible: false
    };
  }

  const tab =
    state.tableau.map(
      (col) =>
        col.map(
          (card) => ({
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
      const col =
        tab[c];

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
        pile.push(
          col.pop()
        );

        /*
           When a face-down card becomes
           exposed during simulation, flip it.
        */

        if (col.length) {
          const exposed =
            col[col.length - 1];

          if (!exposed.faceUp) {
            exposed.faceUp = true;
          }
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
    possible:
      total === 52
  };
}


function isAutoCompleteAvailable() {
  if (state.won) {
    return false;
  }

  return simulateAutoComplete()
    .possible;
}


function runAutoComplete() {
  if (
    !isAutoCompleteAvailable()
  ) {
    return;
  }

  /*
     Start a fresh auto-complete generation.
  */

  cancelAutoComplete();

  const generation =
    autoCompleteGeneration;

  playSound("click");

  function step() {
    /*
       Stop immediately if this auto-complete
       sequence is no longer current.
    */

    if (
      generation !==
      autoCompleteGeneration
    ) {
      return;
    }

    if (state.won) {
      return;
    }

    let moved = false;

    /*
       Find a tableau card that can move
       directly to its foundation.
    */

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
        /*
           Every auto-complete card move is
           individually undoable.
        */

        pushHistory();

        col.pop();

        /*
           Flip newly exposed card.
        */

        if (
          col.length &&
          !col[col.length - 1].faceUp
        ) {
          col[col.length - 1].faceUp =
            true;

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

        moved = true;

        /*
           IMPORTANT:
           Check win immediately after
           every auto-complete move.
        */

        if (checkWin()) {
          return;
        }

        break;
      }
    }

    /*
       Continue only if another card was moved.
    */

    if (
      moved &&
      generation ===
        autoCompleteGeneration &&
      !state.won
    ) {
      setTimeout(
        step,
        AUTO_COMPLETE_DELAY
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
      (freq, index) => {
        this._tone(
          ctx,
          t0 + index * 0.02,
          freq,
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
      (freq, index) => {
        this._tone(
          ctx,
          t0 + index * 0.11,
          freq,
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
  try {
    const saved =
      localStorage.getItem(
        SOUND_KEY
      );

    state.soundEnabled =
      saved === null
        ? true
        : saved === "1";
  } catch (e) {
    state.soundEnabled = true;
  }

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
    /* localStorage unavailable */
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

    if (!raw) {
      return;
    }

    const parsed =
      JSON.parse(raw);

    stats.gamesPlayed =
      Number.isFinite(
        Number(parsed.gamesPlayed)
      )
        ? Number(parsed.gamesPlayed)
        : 0;

    stats.gamesWon =
      Number.isFinite(
        Number(parsed.gamesWon)
      )
        ? Number(parsed.gamesWon)
        : 0;

  } catch (e) {
    stats.gamesPlayed = 0;
    stats.gamesWon = 0;
  }
}


function saveStats() {
  try {
    localStorage.setItem(
      STATS_KEY,
      JSON.stringify(stats)
    );
  } catch (e) {
    /* localStorage unavailable */
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
    document.createElement("div");

  const classes = [
    "card"
  ];

  if (!card.faceUp) {
    classes.push("face-down");
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
    document.createElement("div");

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
    document.createElement("div");

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
    (card) => {
      if (card.faceUp) {
        faceUpCount++;
      } else {
        faceDownCount++;
      }
    }
  );

  /*
     The last face-up card doesn't need
     a trailing gap.
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

    if (!colEl) {
      continue;
    }

    colEl.innerHTML = "";

    /*
       The data-location attributes are expected
       to already exist in the HTML.
    */

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
  if (!wasteEl) {
    return;
  }

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
  if (!stockEl) {
    return;
  }

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

    if (!pileEl) {
      continue;
    }

    pileEl.innerHTML = "";

    const pile =
      state.foundations[s];

    if (pile.length === 0) {
      pileEl.appendChild(
        createEmptyFoundationSlot(s)
      );
    } else {
      const top =
        pile[
          pile.length - 1
        ];

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
    (card) => {
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
    " · Wins " +
    stats.gamesWon +
    " · Win rate " +
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
  if (!target) {
    return null;
  }

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
    (card) => {
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
     Animation flags are only needed for one render.
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
  /*
     IMPORTANT:
     Any previous auto-complete animation
     must be invalidated before replacing state.
  */

  cancelAutoComplete();

  /*
     Clear active drag.
  */

  dragState = null;

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
    rawTarget &&
    rawTarget.closest
      ? rawTarget.closest(
          ".card"
        )
      : null;

  const locEl =
    rawTarget &&
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
     Only cards from the valid movable run
     can be selected.
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
      loc.index <
      runStart
    ) {
      return null;
    }

    return loc;
  }

  /*
     Waste:
     Only top waste card is selectable.
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
     Only top foundation card is selectable.
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
  }

  else if (
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
     If a card is already selected,
     try to move it first.
  */

  if (state.selection) {
    /*
       Clicking the same card again deselects it.
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
       Try legal destination.
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
       If another selectable card was clicked,
       select that card instead.
    */

    if (clickedSelectable) {
      state.selection =
        clickedSelectable;

      playSound("select");

      render();

      return;
    }

    /*
       Invalid attempt.
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
     Nothing selected yet.
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
        (id) =>
          cardElements.get(id)
      )
      .filter(Boolean);

  ds.originalStyles = [];

  ds.group.forEach(
    (el, index) => {
      const rect =
        el.getBoundingClientRect();

      ds.originalStyles.push({
        el: el,
        position: el.style.position,
        left: el.style.left,
        top: el.style.top,
        width: el.style.width,
        height: el.style.height,
        margin: el.style.margin,
        zIndex: el.style.zIndex,
        pointerEvents:
          el.style.pointerEvents,
        transform: el.style.transform
      });

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

      el.style.margin = "0";

      el.style.zIndex =
        String(900 + index);

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
    (el) => {
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


function restoreDragVisuals(ds) {
  if (!ds || !ds.group) {
    return;
  }

  /*
     Since render() normally replaces
     these elements, this function is
     primarily defensive.
  */

  if (ds.originalStyles) {
    ds.originalStyles.forEach(
      (item) => {
        if (!item.el) {
          return;
        }

        item.el.style.position =
          item.position;

        item.el.style.left =
          item.left;

        item.el.style.top =
          item.top;

        item.el.style.width =
          item.width;

        item.el.style.height =
          item.height;

        item.el.style.margin =
          item.margin;

        item.el.style.zIndex =
          item.zIndex;

        item.el.style.pointerEvents =
          item.pointerEvents;

        item.el.style.transform =
          item.transform;

        item.el.classList.remove(
          "dragging"
        );
      }
    );
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
     Only primary mouse/touch pointer.
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

    targetInfo:
      targetInfo,

    pickup:
      getPickupSelection(
        targetInfo
      ),

    group: []
  };

  if (
    dragState.pickup
  ) {
    dragState.cardIds =
      getSelectedCards(
        dragState.pickup
      ).map(
        (card) =>
          card.id
      );

    try {
      e.target.setPointerCapture(
        e.pointerId
      );
    } catch (err) {
      /* Safe to ignore */
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
      Math.hypot(
        dx,
        dy
      ) <
      DRAG_THRESHOLD
    ) {
      return;
    }

    dragState.moved = true;

    if (
      dragState.pickup
    ) {
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

      return;
    }

    /*
       Invalid drag.
       Restore the board from state.
    */

    playSound("error");

    if (dest) {
      flashInvalidTarget(
        dest
      );
    }

    restoreDragVisuals(ds);

    render();

    return;
  }

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

  const ds =
    dragState;

  dragState = null;

  clearDropHighlight(ds);

  restoreDragVisuals(ds);

  render();
}


/* =========================================================================
   STOCK KEYBOARD
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
     Undo
  */

  if (
    (e.ctrlKey ||
      e.metaKey) &&
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
     Escape = deselect
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
     N = new game
  */

  if (
    e.key === "n" ||
    e.key === "N"
  ) {
    newGame();

    return;
  }

  /*
     S = sound
  */

  if (
    e.key === "s" ||
    e.key === "S"
  ) {
    toggleSound();

    return;
  }

  /*
     H = hint
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
  if (boardEl) {
    boardEl.addEventListener(
      "pointerdown",
      onBoardPointerDown
    );
  }

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

  if (stockEl) {
    stockEl.addEventListener(
      "keydown",
      onStockKeydown
    );
  }

  if (newGameBtn) {
    newGameBtn.addEventListener(
      "click",
      newGame
    );
  }

  if (undoBtn) {
    undoBtn.addEventListener(
      "click",
      undo
    );
  }

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

  if (soundBtn) {
    soundBtn.addEventListener(
      "click",
      toggleSound
    );
  }

  if (playAgainBtn) {
    playAgainBtn.addEventListener(
      "click",
      newGame
    );
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener(
      "click",
      hideWinModal
    );
  }

  document.addEventListener(
    "keydown",
    onKeyDown
  );

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

  /*
     Basic DOM validation.
     The game can still initialize even if optional controls
     are missing.
  */

  if (
    !boardEl ||
    tableauColumns.length !== 7 ||
    foundationPiles.length !== 4 ||
    !stockEl ||
    !wasteEl
  ) {
    console.error(
      "Prasun Games Solitaire: required DOM elements are missing."
    );

    return;
  }

  loadSoundPref();

  loadStats();

  updateSoundButton();

  updateStatsDisplay();

  wireEvents();

  newGame();

  /*
     newGame() intentionally leaves the timer stopped.
  */

  state.started = false;

  updateTimeDisplay();
}


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
