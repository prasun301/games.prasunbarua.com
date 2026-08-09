document.addEventListener("DOMContentLoaded", () => {
  const PIECE_SYMBOLS = {
    p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
    P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
  };

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

  let board = JSON.parse(JSON.stringify(INITIAL_BOARD));
  let turn = "w";
  let selectedSquare = null;
  let moveHistory = [];
  let boardHistory = [JSON.parse(JSON.stringify(INITIAL_BOARD))];
  let isThinking = false;

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const movesEl = document.getElementById("moves");
  const resetBtn = document.getElementById("reset-btn");
  const undoBtn = document.getElementById("undo-btn");

  function renderBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = "";

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = document.createElement("div");
        const isLight = (r + c) % 2 === 0;

        square.className = `square ${isLight ? "light" : "dark"}`;
        square.dataset.row = r;
        square.dataset.col = c;

        if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
          square.classList.add("selected");
        }

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

  function handleSquareClick(r, c) {
    if (turn !== "w" || isThinking) return;

    const clickedPiece = board[r][c];

    if (clickedPiece && isWhite(clickedPiece)) {
      selectedSquare = { r, c };
      renderBoard();
      highlightMoves(r, c);
      return;
    }

    if (selectedSquare) {
      const from = selectedSquare;
      const to = { r, c };

      if (isValidMove(from, to)) {
        makeMove(from, to);
        selectedSquare = null;
        renderBoard();

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
    const uciMove = `${coordsToSquare(from.r, from.c)}${coordsToSquare(to.r, to.c)}`;

    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;

    moveHistory.push(uciMove);
    boardHistory.push(JSON.parse(JSON.stringify(board)));

    turn = turn === "w" ? "b" : "w";

    updateStatus();
    updateHistoryUI();
  }

  function triggerAIMove() {
    isThinking = true;
    updateStatus("AI is thinking...");

    setTimeout(() => {
      const moveMade = makeAIMove();

      isThinking = false;
      renderBoard();

      if (moveMade) {
        updateStatus();
      } else {
        updateStatus("Game Over — AI has no valid moves!");
      }
    }, 300);
  }

  function makeAIMove() {
    const validMoves = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] && isBlack(board[r][c])) {
          const from = { r, c };
          for (let tr = 0; tr < 8; tr++) {
            for (let tc = 0; tc < 8; tc++) {
              const to = { r: tr, c: tc };
              if (isValidMove(from, to)) {
                validMoves.push({ from, to });
              }
            }
          }
        }
      }
    }

    if (validMoves.length > 0) {
      const move = validMoves[Math.floor(Math.random() * validMoves.length)];
      makeMove(move.from, move.to);
      return true;
    }

    return false;
  }

  function highlightMoves(r, c) {
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

  renderBoard();
  updateStatus();
});
