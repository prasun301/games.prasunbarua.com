/* =========================================================
   PRASUN GAMES — CHESS ENGINE & WORKER INTEGRATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Unicode Chess Piece Map
  const PIECE_SYMBOLS = {
    p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
    P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
  };

  // Initial Board State (8x8 Grid)
  const INITIAL_BOARD = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"]
  ];

  // Game State Variables
  let board = JSON.parse(JSON.stringify(INITIAL_BOARD));
  let turn = "w"; // 'w' = Player (White), 'b' = AI (Black)
  let selectedSquare = null;
  let moveHistory = [];
  let boardHistory = [JSON.parse(JSON.stringify(INITIAL_BOARD))];
  let isThinking = false;

  // DOM Elements
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const movesEl = document.getElementById("moves");
  const resetBtn = document.getElementById("reset-btn");
  const undoBtn = document.getElementById("undo-btn");

  /* =========================================================
     1. RENDER BOARD & UI
     ========================================================= */
  function renderBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = "";

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = document.createElement("div");
        const isLight = (r + c) % 2 === 0;
        const squareName = coordsToSquare(r, c);

        square.className = `square ${isLight ? "light" : "dark"}`;
        square.dataset.row = r;
        square.dataset.col = c;
        square.dataset.sq = squareName;

        // Selection Highlight
        if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
          square.classList.add("selected");
        }

        // Render Piece
        const piece = board[r][c];
        if (piece) {
          const pieceEl = document.createElement("div");
          pieceEl.className = "piece";
          pieceEl.textContent = PIECE_SYMBOLS[piece];
          square.appendChild(pieceEl);
        }

        square.addEventListener("click", () => handleSquareClick(r, c));
        boardEl.appendChild(square);
      }
    }
  }

  /* =========================================================
     2. PLAYER INTERACTION & MOVES
     ========================================================= */
  function handleSquareClick(r, c) {
    if (turn !== "w" || isThinking) return;

    const clickedPiece = board[r][c];

    // Select White Piece
    if (clickedPiece && isWhite(clickedPiece)) {
      selectedSquare = { r, c };
      renderBoard();
      highlightMoves(r, c);
      return;
    }

    // Execute Move if Source Square is Selected
    if (selectedSquare) {
      const from = selectedSquare;
      const to = { r, c };

      if (isValidMove(from, to)) {
        makeMove(from, to);
        selectedSquare = null;
        renderBoard();

        // Trigger AI Turn
        if (turn === "b") {
          triggerAIMove();
        }
      } else {
        selectedSquare = null;
        renderBoard();
      }
    }
  }

  function makeMove(from, to) {
    const piece = board[from.r][from.c];
    const target = board[to.r][to.c];
    const uciMove = `${coordsToSquare(from.r, from.c)}${coordsToSquare(to.r, to.c)}`;

    // Update Internal Board
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;

    // Record Move
    moveHistory.push(uciMove);
    boardHistory.push(JSON.parse(JSON.stringify(board)));

    // Switch Turn
    turn = turn === "w" ? "b" : "w";

    updateStatus();
    updateHistoryUI();
  }

  /* =========================================================
     3. CLOUDFLARE WORKER AI INTEGRATION
     ========================================================= */
  async function triggerAIMove() {
    isThinking = true;
    updateStatus("AI is thinking...");

    const currentFEN = generateFEN();

    try {
      // Fetch sub-second move from Cloudflare Worker API
      const response = await fetch("/api/chess-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: currentFEN })
      });

      if (!response.ok) throw new Error("API network error");

      const data = await response.json();
      const aiMove = data.move ? data.move.trim().toLowerCase() : null;

      if (aiMove && aiMove.length >= 4) {
        const from = squareToCoords(aiMove.substring(0, 2));
        const to = squareToCoords(aiMove.substring(2, 4));

        if (from && to) {
          makeMove(from, to);
        } else {
          fallbackAIMove();
        }
      } else {
        fallbackAIMove();
      }
    } catch (err) {
      console.warn("Worker API error, falling back to local move logic:", err);
      fallbackAIMove();
    } finally {
      isThinking = false;
      renderBoard();
      updateStatus();
    }
  }

  // Fallback random legal move generator in case API is offline
  function fallbackAIMove() {
    const blackMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] && isBlack(board[r][c])) {
          // Look for adjacent/forward open squares
          const targets = [
            { r: r + 1, c: c },
            { r: r + 1, c: c - 1 },
            { r: r + 1, c: c + 1 },
            { r: r + 2, c: c }
          ];
          targets.forEach(t => {
            if (t.r >= 0 && t.r < 8 && t.c >= 0 && t.c < 8) {
              if (!board[t.r][t.c] || isWhite(board[t.r][t.c])) {
                blackMoves.push({ from: { r, c }, to: t });
              }
            }
          });
        }
      }
    }

    if (blackMoves.length > 0) {
      const randomMove = blackMoves[Math.floor(Math.random() * blackMoves.length)];
      makeMove(randomMove.from, randomMove.to);
    }
  }

  /* =========================================================
     4. HELPER UTILITIES & UI UPDATES
     ========================================================= */
  function highlightMoves(r, c) {
    // Basic target highlighting
    const squares = boardEl.querySelectorAll(".square");
    squares.forEach(sq => {
      const tr = parseInt(sq.dataset.row, 10);
      const tc = parseInt(sq.dataset.col, 10);

      if (isValidMove({ r, c }, { r: tr, c: tc })) {
        if (board[tr][tc]) {
          sq.classList.add("legal-capture");
        } else {
          sq.classList.add("legal-move");
        }
      }
    });
  }

  function isValidMove(from, to) {
    if (from.r === to.r && from.c === to.c) return false;
    const targetPiece = board[to.r][to.c];
    const sourcePiece = board[from.r][from.c];

    // Cannot capture own piece
    if (targetPiece && isWhite(sourcePiece) === isWhite(targetPiece)) {
      return false;
    }
    return true;
  }

  function isWhite(piece) {
    return piece && piece === piece.toUpperCase();
  }

  function isBlack(piece) {
    return piece && piece === piece.toLowerCase();
  }

  function coordsToSquare(r, c) {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    return `${files[c]}${8 - r}`;
  }

  function squareToCoords(sq) {
    if (!sq || sq.length < 2) return null;
    const files = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
    const c = files[sq[0]];
    const r = 8 - parseInt(sq[1], 10);
    return (isNaN(r) || c === undefined) ? null : { r, c };
  }

  function generateFEN() {
    let fen = "";
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) {
          empty++;
        } else {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          fen += piece;
        }
      }
      if (empty > 0) fen += empty;
      if (r < 7) fen += "/";
    }
    return `${fen} ${turn} - - 0 1`;
  }

  function updateStatus(overrideText) {
    if (!statusEl) return;
    if (overrideText) {
      statusEl.textContent = overrideText;
      return;
    }
    statusEl.textContent = turn === "w" ? "Your Turn (White)" : "AI's Turn (Black)";
  }

  function updateHistoryUI() {
    if (!movesEl) return;
    movesEl.innerHTML = "";

    for (let i = 0; i < moveHistory.length; i += 2) {
      const row = document.createElement("div");
      row.className = "move-row";

      const num = document.createElement("span");
      num.className = "move-num";
      num.textContent = `${Math.floor(i / 2) + 1}.`;

      const whiteMove = document.createElement("span");
      whiteMove.textContent = moveHistory[i] || "";

      const blackMove = document.createElement("span");
      blackMove.textContent = moveHistory[i + 1] || "";

      row.appendChild(num);
      row.appendChild(whiteMove);
      row.appendChild(blackMove);
      movesEl.appendChild(row);
    }

    movesEl.scrollTop = movesEl.scrollHeight;
  }

  /* =========================================================
     5. CONTROLS (RESET & UNDO)
     ========================================================= */
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      board = JSON.parse(JSON.stringify(INITIAL_BOARD));
      boardHistory = [JSON.parse(JSON.stringify(INITIAL_BOARD))];
      moveHistory = [];
      turn = "w";
      selectedSquare = null;
      isThinking = false;
      renderBoard();
      updateStatus();
      updateHistoryUI();
    });
  }

  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      // Undo 2 turns (Player + AI)
      if (boardHistory.length > 2 && !isThinking) {
        boardHistory.pop();
        boardHistory.pop();
        moveHistory.pop();
        moveHistory.pop();

        board = JSON.parse(JSON.stringify(boardHistory[boardHistory.length - 1]));
        turn = "w";
        selectedSquare = null;
        renderBoard();
        updateStatus();
        updateHistoryUI();
      }
    });
  }

  // Initial Initialization
  renderBoard();
  updateStatus();
});
