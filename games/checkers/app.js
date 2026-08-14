"use strict";

/* =========================================================================
   PRASUN GAMES — CHECKERS
   Professional local 2-player Checkers engine

   Features
   -------------------------------------------------------------------------
   • Standard 8 × 8 American Checkers board
   • Local 2-player gameplay
   • Mandatory captures
   • Multi-jump captures
   • King promotion
   • Kings move in both directions
   • Win / stalemate detection
   • Undo
   • New game
   • Move counter
   • Turn indicator
   • Keyboard accessibility
   • Single source of truth: state
   • DOM never controls game logic
   ========================================================================= */


/* =========================================================================
   CONSTANTS
   ========================================================================= */

const BOARD_SIZE = 8;

const EMPTY = null;

const PLAYER_RED = "red";
const PLAYER_BLACK = "black";

const PIECE_MAN = "man";
const PIECE_KING = "king";

const MAX_HISTORY = 200;


/* =========================================================================
   GAME STATE
   ========================================================================= */

const state = {
  board: [],

  currentPlayer: PLAYER_RED,

  selected: null,

  forcedPiece: null,

  winner: null,

  gameOver: false,

  moves: 0,

  redPieces: 12,

  blackPieces: 12,

  history: [],

  started: false,

  lastMove: null
};


/* =========================================================================
   DOM REFERENCES
   ========================================================================= */

let boardElement = null;

let turnElement = null;
let statusElement = null;
let movesElement = null;

let redCountElement = null;
let blackCountElement = null;

let newGameButton = null;
let undoButton = null;


/* =========================================================================
   INITIALIZATION
   ========================================================================= */

function init() {
  cacheDOM();

  if (!boardElement) {
    console.error("Checkers: #checkersBoard was not found.");
    return;
  }

  wireEvents();

  newGame();
}


function cacheDOM() {
  boardElement = document.getElementById("checkersBoard");

  turnElement = document.getElementById("turnValue");
  statusElement = document.getElementById("gameStatus");
  movesElement = document.getElementById("movesValue");

  redCountElement = document.getElementById("redCount");
  blackCountElement = document.getElementById("blackCount");

  newGameButton = document.getElementById("newGameBtn");
  undoButton = document.getElementById("undoBtn");
}


/* =========================================================================
   EVENT WIRING
   ========================================================================= */

function wireEvents() {
  boardElement.addEventListener("click", handleBoardClick);

  boardElement.addEventListener("keydown", handleBoardKeydown);

  if (newGameButton) {
    newGameButton.addEventListener("click", newGame);
  }

  if (undoButton) {
    undoButton.addEventListener("click", undo);
  }

  document.addEventListener("keydown", handleGlobalKeydown);
}


/* =========================================================================
   BOARD CREATION
   ========================================================================= */

function createEmptyBoard() {
  return Array.from(
    { length: BOARD_SIZE },
    () => Array(BOARD_SIZE).fill(EMPTY)
  );
}


function createPiece(player, row, col) {
  return {
    id: player + "-" + row + "-" + col + "-" + Date.now() + "-" + Math.random().toString(36).slice(2),
    player,
    type: PIECE_MAN
  };
}


function createInitialPosition() {
  const board = createEmptyBoard();

  /*
    Black starts at the top.
    Red starts at the bottom.
  */

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isDarkSquare(row, col)) {
        board[row][col] = createPiece(
          PLAYER_BLACK,
          row,
          col
        );
      }
    }
  }

  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isDarkSquare(row, col)) {
        board[row][col] = createPiece(
          PLAYER_RED,
          row,
          col
        );
      }
    }
  }

  return board;
}


/* =========================================================================
   BOARD HELPERS
   ========================================================================= */

function isInsideBoard(row, col) {
  return (
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE
  );
}


function isDarkSquare(row, col) {
  return (row + col) % 2 === 1;
}


function getPiece(row, col) {
  if (!isInsideBoard(row, col)) {
    return null;
  }

  return state.board[row][col];
}


function isEmpty(row, col) {
  return isInsideBoard(row, col) && !state.board[row][col];
}


function opponentOf(player) {
  return player === PLAYER_RED
    ? PLAYER_BLACK
    : PLAYER_RED;
}


/* =========================================================================
   DIRECTION LOGIC
   ========================================================================= */

function getMoveDirections(piece) {
  /*
    Red moves upward.
    Black moves downward.

    Kings move in both directions.
  */

  if (piece.type === PIECE_KING) {
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];
  }

  if (piece.player === PLAYER_RED) {
    return [
      [-1, -1],
      [-1, 1]
    ];
  }

  return [
    [1, -1],
    [1, 1]
  ];
}


/* =========================================================================
   MOVE GENERATION
   ========================================================================= */

function getSimpleMoves(row, col) {
  const piece = getPiece(row, col);

  if (!piece) {
    return [];
  }

  if (piece.player !== state.currentPlayer) {
    return [];
  }

  const moves = [];

  const directions = getMoveDirections(piece);

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (
      isInsideBoard(newRow, newCol) &&
      isEmpty(newRow, newCol)
    ) {
      moves.push({
        from: {
          row,
          col
        },
        to: {
          row: newRow,
          col: newCol
        },
        capture: null
      });
    }
  }

  return moves;
}


function getCaptureMoves(row, col) {
  const piece = getPiece(row, col);

  if (!piece) {
    return [];
  }

  if (piece.player !== state.currentPlayer) {
    return [];
  }

  const moves = [];

  const directions = getMoveDirections(piece);

  for (const [dr, dc] of directions) {
    const middleRow = row + dr;
    const middleCol = col + dc;

    const landingRow = row + dr * 2;
    const landingCol = col + dc * 2;

    if (!isInsideBoard(landingRow, landingCol)) {
      continue;
    }

    const jumpedPiece = getPiece(
      middleRow,
      middleCol
    );

    if (
      jumpedPiece &&
      jumpedPiece.player === opponentOf(piece.player) &&
      isEmpty(landingRow, landingCol)
    ) {
      moves.push({
        from: {
          row,
          col
        },
        to: {
          row: landingRow,
          col: landingCol
        },
        capture: {
          row: middleRow,
          col: middleCol
        }
      });
    }
  }

  return moves;
}


/* =========================================================================
   GLOBAL MOVE CHECKING
   ========================================================================= */

function getAllCaptureMoves(player) {
  const captures = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = getPiece(row, col);

      if (!piece || piece.player !== player) {
        continue;
      }

      const pieceCaptures = getCaptureMoves(row, col);

      captures.push(...pieceCaptures);
    }
  }

  return captures;
}


function getAllSimpleMoves(player) {
  const moves = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = getPiece(row, col);

      if (!piece || piece.player !== player) {
        continue;
      }

      const pieceMoves = getSimpleMoves(row, col);

      moves.push(...pieceMoves);
    }
  }

  return moves;
}


function playerHasCapture(player) {
  return getAllCaptureMoves(player).length > 0;
}


function playerHasAnyMove(player) {
  return (
    getAllCaptureMoves(player).length > 0 ||
    getAllSimpleMoves(player).length > 0
  );
}


/* =========================================================================
   MOVE VALIDATION
   ========================================================================= */

function isMoveLegal(move) {
  if (!move) {
    return false;
  }

  const piece = getPiece(
    move.from.row,
    move.from.col
  );

  if (!piece) {
    return false;
  }

  if (piece.player !== state.currentPlayer) {
    return false;
  }

  /*
    During a multi-jump, only the same piece may move.
  */

  if (state.forcedPiece) {
    if (
      move.from.row !== state.forcedPiece.row ||
      move.from.col !== state.forcedPiece.col
    ) {
      return false;
    }
  }

  const mandatoryCapture = playerHasCapture(
    state.currentPlayer
  );

  if (mandatoryCapture && !move.capture) {
    return false;
  }

  if (move.capture) {
    const legalCaptures = getCaptureMoves(
      move.from.row,
      move.from.col
    );

    return legalCaptures.some(
      candidate =>
        candidate.to.row === move.to.row &&
        candidate.to.col === move.to.col &&
        candidate.capture &&
        candidate.capture.row === move.capture.row &&
        candidate.capture.col === move.capture.col
    );
  }

  const legalMoves = getSimpleMoves(
    move.from.row,
    move.from.col
  );

  return legalMoves.some(
    candidate =>
      candidate.to.row === move.to.row &&
      candidate.to.col === move.to.col
  );
}


/* =========================================================================
   SNAPSHOT / UNDO
   ========================================================================= */

function cloneBoard(board) {
  return board.map(row =>
    row.map(piece =>
      piece
        ? {
            ...piece
          }
        : null
    )
  );
}


function createSnapshot() {
  return {
    board: cloneBoard(state.board),
    currentPlayer: state.currentPlayer,
    selected: state.selected
      ? {
          ...state.selected
        }
      : null,
    forcedPiece: state.forcedPiece
      ? {
          ...state.forcedPiece
        }
      : null,
    winner: state.winner,
    gameOver: state.gameOver,
    moves: state.moves,
    started: state.started,
    lastMove: state.lastMove
      ? JSON.parse(JSON.stringify(state.lastMove))
      : null
  };
}


function restoreSnapshot(snapshot) {
  state.board = cloneBoard(snapshot.board);

  state.currentPlayer = snapshot.currentPlayer;

  state.selected = snapshot.selected
    ? {
        ...snapshot.selected
      }
    : null;

  state.forcedPiece = snapshot.forcedPiece
    ? {
        ...snapshot.forcedPiece
      }
    : null;

  state.winner = snapshot.winner;

  state.gameOver = snapshot.gameOver;

  state.moves = snapshot.moves;

  state.started = snapshot.started;

  state.lastMove = snapshot.lastMove
    ? JSON.parse(JSON.stringify(snapshot.lastMove))
    : null;

  updatePieceCounts();

  render();
}


function pushHistory() {
  state.history.push(createSnapshot());

  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  }
}


function undo() {
  if (state.history.length === 0) {
    return;
  }

  const snapshot = state.history.pop();

  restoreSnapshot(snapshot);

  setStatus("Move undone.");
}


/* =========================================================================
   EXECUTE MOVE
   ========================================================================= */

function executeMove(move) {
  if (!isMoveLegal(move)) {
    return false;
  }

  pushHistory();

  const movingPiece = getPiece(
    move.from.row,
    move.from.col
  );

  if (!movingPiece) {
    return false;
  }

  /*
    Remove piece from original square.
  */

  state.board[move.from.row][move.from.col] = EMPTY;

  /*
    Remove captured piece.
  */

  if (move.capture) {
    state.board[move.capture.row][move.capture.col] = EMPTY;
  }

  /*
    Place moving piece.
  */

  state.board[move.to.row][move.to.col] = movingPiece;

  /*
    Promotion.
  */

  let promoted = false;

  if (
    movingPiece.type === PIECE_MAN &&
    (
      (
        movingPiece.player === PLAYER_RED &&
        move.to.row === 0
      ) ||
      (
        movingPiece.player === PLAYER_BLACK &&
        move.to.row === BOARD_SIZE - 1
      )
    )
  ) {
    movingPiece.type = PIECE_KING;
    promoted = true;
  }

  state.moves++;

  state.started = true;

  state.lastMove = {
    from: {
      ...move.from
    },
    to: {
      ...move.to
    },
    capture: move.capture
      ? {
          ...move.capture
        }
      : null
  };

  state.selected = null;

  /*
    Capture may lead to another capture.
  */

  if (move.capture) {
    const nextCaptures = getCaptureMoves(
      move.to.row,
      move.to.col
    );

    if (nextCaptures.length > 0) {
      state.forcedPiece = {
        row: move.to.row,
        col: move.to.col
      };

      state.selected = {
        row: move.to.row,
        col: move.to.col
      };

      updatePieceCounts();
      render();

      setStatus(
        promoted
          ? "King promoted! Continue capturing."
          : "Continue capturing with the selected piece."
      );

      return true;
    }
  }

  state.forcedPiece = null;

  /*
    Change turn.
  */

  state.currentPlayer = opponentOf(
    state.currentPlayer
  );

  updatePieceCounts();

  /*
    Check game ending conditions.
  */

  if (checkGameOver()) {
    render();
    return true;
  }

  render();

  setStatus(
    state.currentPlayer === PLAYER_RED
      ? "Red's turn."
      : "Black's turn."
  );

  return true;
}


/* =========================================================================
   GAME OVER
   ========================================================================= */

function checkGameOver() {
  const redPieces = countPieces(PLAYER_RED);
  const blackPieces = countPieces(PLAYER_BLACK);

  if (redPieces === 0) {
    state.winner = PLAYER_BLACK;
    state.gameOver = true;

    setStatus("Black wins!");
    return true;
  }

  if (blackPieces === 0) {
    state.winner = PLAYER_RED;
    state.gameOver = true;

    setStatus("Red wins!");
    return true;
  }

  if (!playerHasAnyMove(state.currentPlayer)) {
    state.winner = opponentOf(
      state.currentPlayer
    );

    state.gameOver = true;

    setStatus(
      state.winner === PLAYER_RED
        ? "Red wins — Black has no legal moves."
        : "Black wins — Red has no legal moves."
    );

    return true;
  }

  return false;
}


/* =========================================================================
   PIECE COUNTING
   ========================================================================= */

function countPieces(player) {
  let count = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = state.board[row][col];

      if (piece && piece.player === player) {
        count++;
      }
    }
  }

  return count;
}


function updatePieceCounts() {
  state.redPieces = countPieces(PLAYER_RED);
  state.blackPieces = countPieces(PLAYER_BLACK);
}


/* =========================================================================
   SELECTION
   ========================================================================= */

function selectPiece(row, col) {
  if (state.gameOver) {
    return;
  }

  const piece = getPiece(row, col);

  if (!piece) {
    return;
  }

  if (piece.player !== state.currentPlayer) {
    return;
  }

  /*
    During a multi-jump only the forced piece can be selected.
  */

  if (state.forcedPiece) {
    if (
      row !== state.forcedPiece.row ||
      col !== state.forcedPiece.col
    ) {
      return;
    }
  }

  const captures = getCaptureMoves(row, col);

  const globalCaptureRequired =
    playerHasCapture(state.currentPlayer);

  if (
    globalCaptureRequired &&
    captures.length === 0
  ) {
    setStatus("A capture is required.");
    return;
  }

  state.selected = {
    row,
    col
  };

  render();

  setStatus(
    captures.length > 0
      ? "Capture available. Choose a highlighted square."
      : "Choose a highlighted destination."
  );
}


/* =========================================================================
   SQUARE DESTINATION
   ========================================================================= */

function tryMoveTo(row, col) {
  if (!state.selected) {
    return;
  }

  const from = {
    row: state.selected.row,
    col: state.selected.col
  };

  const captures = getCaptureMoves(
    from.row,
    from.col
  );

  let move = captures.find(
    candidate =>
      candidate.to.row === row &&
      candidate.to.col === col
  );

  if (!move) {
    const globalCaptureRequired =
      playerHasCapture(state.currentPlayer);

    if (globalCaptureRequired) {
      setStatus("You must capture when possible.");
      return;
    }

    const simpleMoves = getSimpleMoves(
      from.row,
      from.col
    );

    move = simpleMoves.find(
      candidate =>
        candidate.to.row === row &&
        candidate.to.col === col
    );
  }

  if (!move) {
    setStatus("That move is not legal.");
    return;
  }

  executeMove(move);
}


/* =========================================================================
   CLICK HANDLER
   ========================================================================= */

function handleBoardClick(event) {
  const square = event.target.closest(".checkers-square");

  if (!square || !boardElement.contains(square)) {
    return;
  }

  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return;
  }

  if (state.gameOver) {
    return;
  }

  /*
    If a piece is already selected:
    - Clicking another own piece changes selection.
    - Clicking a destination attempts a move.
    - Clicking the selected piece deselects it.
  */

  if (state.selected) {
    if (
      state.selected.row === row &&
      state.selected.col === col
    ) {
      if (!state.forcedPiece) {
        state.selected = null;
        render();
        setStatus(
          state.currentPlayer === PLAYER_RED
            ? "Red's turn."
            : "Black's turn."
        );
      }

      return;
    }

    const clickedPiece = getPiece(row, col);

    if (
      clickedPiece &&
      clickedPiece.player === state.currentPlayer
    ) {
      selectPiece(row, col);
      return;
    }

    tryMoveTo(row, col);
    return;
  }

  selectPiece(row, col);
}


/* =========================================================================
   KEYBOARD SUPPORT
   ========================================================================= */

function handleBoardKeydown(event) {
  const square = event.target.closest(".checkers-square");

  if (!square) {
    return;
  }

  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);

  if (
    event.key === "Enter" ||
    event.key === " "
  ) {
    event.preventDefault();

    if (state.selected) {
      tryMoveTo(row, col);
    } else {
      selectPiece(row, col);
    }

    return;
  }

  let nextRow = row;
  let nextCol = col;

  if (event.key === "ArrowUp") {
    nextRow--;
  } else if (event.key === "ArrowDown") {
    nextRow++;
  } else if (event.key === "ArrowLeft") {
    nextCol--;
  } else if (event.key === "ArrowRight") {
    nextCol++;
  } else {
    return;
  }

  event.preventDefault();

  if (isInsideBoard(nextRow, nextCol)) {
    const nextSquare = boardElement.querySelector(
      '.checkers-square[data-row="' +
        nextRow +
        '"][data-col="' +
        nextCol +
        '"]'
    );

    if (nextSquare) {
      nextSquare.focus();
    }
  }
}


function handleGlobalKeydown(event) {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "z"
  ) {
    event.preventDefault();
    undo();
    return;
  }

  if (event.key === "Escape") {
    if (state.selected && !state.forcedPiece) {
      state.selected = null;
      render();

      setStatus(
        state.currentPlayer === PLAYER_RED
          ? "Red's turn."
          : "Black's turn."
      );
    }

    return;
  }

  if (
    event.key.toLowerCase() === "n"
  ) {
    newGame();
  }
}


/* =========================================================================
   HIGHLIGHT CALCULATION
   ========================================================================= */

function getHighlightedDestinations() {
  if (!state.selected) {
    return [];
  }

  const { row, col } = state.selected;

  const captures = getCaptureMoves(row, col);

  if (captures.length > 0) {
    return captures.map(move => ({
      row: move.to.row,
      col: move.to.col
    }));
  }

  if (playerHasCapture(state.currentPlayer)) {
    return [];
  }

  return getSimpleMoves(row, col).map(move => ({
    row: move.to.row,
    col: move.to.col
  }));
}


function isDestinationHighlighted(row, col) {
  return getHighlightedDestinations().some(
    destination =>
      destination.row === row &&
      destination.col === col
  );
}


/* =========================================================================
   RENDER BOARD
   ========================================================================= */

function render() {
  if (!boardElement) {
    return;
  }

  boardElement.innerHTML = "";

  const highlighted = getHighlightedDestinations();

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const square = document.createElement("button");

      square.type = "button";

      square.className =
        "checkers-square " +
        (
          isDarkSquare(row, col)
            ? "dark-square"
            : "light-square"
        );

      square.dataset.row = String(row);
      square.dataset.col = String(col);

      square.setAttribute(
        "aria-label",
        "Row " +
          (row + 1) +
          ", Column " +
          (col + 1)
      );

      const piece = state.board[row][col];

      if (piece) {
        const pieceElement =
          createPieceElement(piece);

        square.appendChild(pieceElement);

        square.classList.add(
          piece.player === PLAYER_RED
            ? "red-square-piece"
            : "black-square-piece"
        );

        if (
          state.selected &&
          state.selected.row === row &&
          state.selected.col === col
        ) {
          square.classList.add("selected-square");
        }

        if (
          state.forcedPiece &&
          state.forcedPiece.row === row &&
          state.forcedPiece.col === col
        ) {
          square.classList.add("forced-square");
        }
      }

      if (
        highlighted.some(
          destination =>
            destination.row === row &&
            destination.col === col
        )
      ) {
        square.classList.add(
          "valid-destination"
        );
      }

      if (
        state.lastMove &&
        (
          (
            state.lastMove.from.row === row &&
            state.lastMove.from.col === col
          ) ||
          (
            state.lastMove.to.row === row &&
            state.lastMove.to.col === col
          )
        )
      ) {
        square.classList.add(
          "last-move-square"
        );
      }

      boardElement.appendChild(square);
    }
  }

  updateHUD();
}


/* =========================================================================
   PIECE DOM
   ========================================================================= */

function createPieceElement(piece) {
  const element = document.createElement("span");

  element.className =
    "checkers-piece " +
    (
      piece.player === PLAYER_RED
        ? "piece-red"
        : "piece-black"
    );

  if (piece.type === PIECE_KING) {
    element.classList.add("piece-king");
  }

  element.setAttribute(
    "aria-hidden",
    "true"
  );

  /*
    CSS can display the crown through ::after.
    The text fallback also helps if CSS is disabled.
  */

  element.textContent =
    piece.type === PIECE_KING
      ? "♛"
      : "";

  return element;
}


/* =========================================================================
   HUD
   ========================================================================= */

function updateHUD() {
  updatePieceCounts();

  if (turnElement) {
    if (state.gameOver) {
      turnElement.textContent =
        state.winner === PLAYER_RED
          ? "Red Wins"
          : "Black Wins";
    } else {
      turnElement.textContent =
        state.currentPlayer === PLAYER_RED
          ? "Red"
          : "Black";
    }
  }

  if (movesElement) {
    movesElement.textContent =
      String(state.moves);
  }

  if (redCountElement) {
    redCountElement.textContent =
      String(state.redPieces);
  }

  if (blackCountElement) {
    blackCountElement.textContent =
      String(state.blackPieces);
  }

  if (undoButton) {
    undoButton.disabled =
      state.history.length === 0;
  }

  if (statusElement) {
    /*
      Do not overwrite explicit win / error messages.
    */

    if (!state.gameOver) {
      statusElement.textContent =
        state.currentPlayer === PLAYER_RED
          ? "Red's turn"
          : "Black's turn";
    }
  }
}


function setStatus(message) {
  if (statusElement) {
    statusElement.textContent = message;
  }
}


/* =========================================================================
   NEW GAME
   ========================================================================= */

function newGame() {
  state.board = createInitialPosition();

  state.currentPlayer = PLAYER_RED;

  state.selected = null;

  state.forcedPiece = null;

  state.winner = null;

  state.gameOver = false;

  state.moves = 0;

  state.redPieces = 12;

  state.blackPieces = 12;

  state.history = [];

  state.started = false;

  state.lastMove = null;

  updatePieceCounts();

  render();

  setStatus("Red's turn.");
}


/* =========================================================================
   DEBUG / DEVELOPMENT HELPERS
   ========================================================================= */

function getGameState() {
  return {
    board: cloneBoard(state.board),
    currentPlayer: state.currentPlayer,
    selected: state.selected
      ? {
          ...state.selected
        }
      : null,
    forcedPiece: state.forcedPiece
      ? {
          ...state.forcedPiece
        }
      : null,
    winner: state.winner,
    gameOver: state.gameOver,
    moves: state.moves,
    redPieces: state.redPieces,
    blackPieces: state.blackPieces
  };
}


/* =========================================================================
   START APPLICATION
   ========================================================================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    init
  );
} else {
  init();
}
