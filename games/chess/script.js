/* =========================================================
   PRASUN GAMES — PROFESSIONAL CHESS ENGINE
   Local 2-player + Computer AI + Online Stubs
   ========================================================= */

"use strict";

/* =========================================================
   PIECES
   ========================================================= */

const PIECES = {
    w: {
        k: "♔",
        q: "♕",
        r: "♖",
        b: "♗",
        n: "♘",
        p: "♙"
    },
    b: {
        k: "♚",
        q: "♛",
        r: "♜",
        b: "♝",
        n: "♞",
        p: "♟"
    }
};

/* Piece values and evaluation tables for AI */
const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
};

const PAWN_TABLE = [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_TABLE = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_TABLE = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_TABLE = [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_TABLE = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_MIDGAME_TABLE = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
];


/* =========================================================
   INITIAL POSITION
   ========================================================= */

const INITIAL_BOARD = [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"]
];


/* =========================================================
   GAME STATE
   ========================================================= */

let board = cloneBoard(INITIAL_BOARD);
let currentPlayer = "w";
let selectedSquare = null;
let legalMoves = [];
let moveHistory = [];
let gameOver = false;
let enPassantTarget = null;

let castlingRights = {
    wK: true,
    wQ: true,
    bK: true,
    bQ: true
};


/* =========================================================
   GAME MODE
   ========================================================= */

let gameMode = "computer";
let playerColor = "w";
let aiColor = "b";
let difficulty = "medium";
let aiThinking = false;
let boardFlipped = false;


/* =========================================================
   CLOCK
   ========================================================= */

let clockInterval = null;
let whiteTime = null;
let blackTime = null;
let incrementSeconds = 0;
let clockRunning = false;


/* =========================================================
   DRAW / REPETITION
   ========================================================= */

let halfmoveClock = 0;
let positionHistory = [];


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const chessBoard = document.getElementById("chess-board");
const turnIndicator = document.getElementById("turn-indicator");
const moveHistoryElement = document.getElementById("move-history");
const newGameButton = document.getElementById("new-game");
const modeComputerButton = document.getElementById("mode-computer");
const modeLocalButton = document.getElementById("mode-local");
const modeOnlineButton = document.getElementById("mode-online");
const playerSideSelect = document.getElementById("player-side");
const difficultySelect = document.getElementById("difficulty");
const timeControlSelect = document.getElementById("time-control");
const difficultyGroup = document.getElementById("difficulty-group");
const onlinePanel = document.getElementById("online-panel");
const createRoomButton = document.getElementById("create-room");
const joinRoomButton = document.getElementById("join-room");
const roomCodeInput = document.getElementById("room-code");
const roomInfo = document.getElementById("room-info");
const roomCodeDisplay = document.getElementById("room-code-display");
const copyRoomButton = document.getElementById("copy-room");
const drawButton = document.getElementById("draw-game");
const resignButton = document.getElementById("resign-game");
const whiteClock = document.getElementById("white-clock");
const blackClock = document.getElementById("black-clock");
const whitePlayerName = document.getElementById("white-player-name");
const blackPlayerName = document.getElementById("black-player-name");
const whitePlayerStatus = document.getElementById("white-player-status");
const blackPlayerStatus = document.getElementById("black-player-status");
const whiteCaptured = document.getElementById("white-captured");
const blackCaptured = document.getElementById("black-captured");
const moveCountElement = document.getElementById("move-count");
const currentModeElement = document.getElementById("current-mode");
const currentDifficultyElement = document.getElementById("current-difficulty");
const currentStatusElement = document.getElementById("current-status");


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", initGame);

function initGame() {
    setupEventListeners();
    applyGameModeUI();
    resetGame(false);
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {
    if (newGameButton) {
        newGameButton.addEventListener("click", () => resetGame(true));
    }

    if (modeComputerButton) {
        modeComputerButton.addEventListener("click", () => {
            gameMode = "computer";
            applyGameModeUI();
            resetGame(false);
        });
    }

    if (modeLocalButton) {
        modeLocalButton.addEventListener("click", () => {
            gameMode = "local";
            applyGameModeUI();
            resetGame(false);
        });
    }

    if (modeOnlineButton) {
        modeOnlineButton.addEventListener("click", () => {
            gameMode = "online";
            applyGameModeUI();
            resetGame(false);
        });
    }

    if (playerSideSelect) {
        playerSideSelect.addEventListener("change", () => {
            if (gameMode !== "computer") return;
            resetGame(false);
        });
    }

    if (difficultySelect) {
        difficultySelect.addEventListener("change", () => {
            difficulty = difficultySelect.value;
            updateGameInfo();
        });
    }

    if (timeControlSelect) {
        timeControlSelect.addEventListener("change", () => {
            resetGame(false);
        });
    }

    if (drawButton) {
        drawButton.addEventListener("click", offerDraw);
    }

    if (resignButton) {
        resignButton.addEventListener("click", resignGame);
    }

    if (createRoomButton) {
        createRoomButton.addEventListener("click", createOnlineRoom);
    }

    if (joinRoomButton) {
        joinRoomButton.addEventListener("click", joinOnlineRoom);
    }

    if (copyRoomButton) {
        copyRoomButton.addEventListener("click", copyRoomCode);
    }
}


/* =========================================================
   UTILITIES
   ========================================================= */

function cloneBoard(source) {
    return source.map(row => [...row]);
}

function isInside(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}


/* =========================================================
   RESET GAME
   ========================================================= */

function resetGame(confirmReset = false) {
    if (confirmReset && moveHistory.length > 0 && !gameOver) {
        const confirmed = window.confirm("Start a new chess game?");
        if (!confirmed) return;
    }

    stopClock();

    board = cloneBoard(INITIAL_BOARD);
    currentPlayer = "w";
    selectedSquare = null;
    legalMoves = [];
    moveHistory = [];
    gameOver = false;
    aiThinking = false;
    enPassantTarget = null;

    castlingRights = {
        wK: true,
        wQ: true,
        bK: true,
        bQ: true
    };

    halfmoveClock = 0;
    positionHistory = [];

    difficulty = difficultySelect ? difficultySelect.value : "medium";

    setupPlayerColors();
    setupClock();

    positionHistory.push(getPositionKey());

    renderBoard();
    updateMoveHistory();
    updateStatus();
    updateCapturedPieces();
    updatePlayerLabels();
    updateGameInfo();
    startClockIfNeeded();

    if (gameMode === "computer" && currentPlayer === aiColor) {
        triggerComputerMove();
    }
}


/* =========================================================
   PLAYER COLORS & BOARD FLIP
   ========================================================= */

function setupPlayerColors() {
    if (gameMode !== "computer") {
        playerColor = "w";
        aiColor = "b";
        boardFlipped = false;
        return;
    }

    const selected = playerSideSelect ? playerSideSelect.value : "white";

    if (selected === "black") {
        playerColor = "b";
        aiColor = "w";
    } else if (selected === "random") {
        playerColor = Math.random() < 0.5 ? "w" : "b";
        aiColor = playerColor === "w" ? "b" : "w";
    } else {
        playerColor = "w";
        aiColor = "b";
    }

    boardFlipped = playerColor === "b";
}


/* =========================================================
   GAME MODE UI
   ========================================================= */

function applyGameModeUI() {
    document.querySelectorAll(".mode-card").forEach(button => {
        button.classList.remove("active");
    });

    if (gameMode === "computer") {
        if (modeComputerButton) modeComputerButton.classList.add("active");
        if (difficultyGroup) difficultyGroup.hidden = false;
        if (onlinePanel) onlinePanel.hidden = true;
    } else if (gameMode === "local") {
        if (modeLocalButton) modeLocalButton.classList.add("active");
        if (difficultyGroup) difficultyGroup.hidden = true;
        if (onlinePanel) onlinePanel.hidden = true;
    } else {
        if (modeOnlineButton) modeOnlineButton.classList.add("active");
        if (difficultyGroup) difficultyGroup.hidden = true;
        if (onlinePanel) onlinePanel.hidden = false;
    }

    updateGameInfo();
}


/* =========================================================
   RENDER BOARD
   ========================================================= */

function renderBoard() {
    if (!chessBoard) return;

    chessBoard.innerHTML = "";

    for (let displayRow = 0; displayRow < 8; displayRow++) {
        for (let displayCol = 0; displayCol < 8; displayCol++) {
            const row = boardFlipped ? 7 - displayRow : displayRow;
            const col = boardFlipped ? 7 - displayCol : displayCol;

            const square = document.createElement("div");
            square.classList.add("square");
            square.classList.add((row + col) % 2 === 0 ? "light" : "dark");

            square.dataset.row = row;
            square.dataset.col = col;

            const piece = board[row][col];

            if (piece) {
                const pieceElement = document.createElement("div");
                pieceElement.className = "piece";
                pieceElement.textContent = PIECES[piece[0]][piece[1]];
                pieceElement.dataset.row = row;
                pieceElement.dataset.col = col;
                square.appendChild(pieceElement);
            }

            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add("selected");
            }

            const isLegalMove = legalMoves.some(move => move.row === row && move.col === col);
            if (isLegalMove) {
                if (board[row][col]) {
                    square.classList.add("legal-capture");
                } else {
                    square.classList.add("legal-move");
                }
            }

            square.addEventListener("click", handleSquareClick);
            chessBoard.appendChild(square);
        }
    }

    highlightKingInCheck();
}


/* =========================================================
   HANDLE SQUARE CLICK
   ========================================================= */

function handleSquareClick(event) {
    if (gameOver || aiThinking) return;

    if (gameMode === "computer" && currentPlayer !== playerColor) {
        return;
    }

    const square = event.currentTarget;
    const row = Number(square.dataset.row);
    const col = Number(square.dataset.col);
    const piece = board[row][col];

    if (selectedSquare) {
        const targetMove = legalMoves.find(move => move.row === row && move.col === col);

        if (targetMove) {
            makeMove(selectedSquare.row, selectedSquare.col, row, col, targetMove, true);
            return;
        }

        if (piece && piece[0] === currentPlayer) {
            selectPiece(row, col);
            return;
        }

        clearSelection();
        return;
    }

    if (piece && piece[0] === currentPlayer) {
        selectPiece(row, col);
    }
}


/* =========================================================
   SELECTION
   ========================================================= */

function selectPiece(row, col) {
    selectedSquare = { row, col };
    legalMoves = getLegalMoves(board, row, col, currentPlayer);
    renderBoard();
}

function clearSelection() {
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
}


/* =========================================================
   MAKE MOVE
   ========================================================= */

function makeMove(fromRow, fromCol, toRow, toCol, moveData, humanMove = true) {
    if (gameOver) return;

    const movingPiece = board[fromRow][fromCol];
    if (!movingPiece) return;

    const capturedPiece = board[toRow][toCol];
    const isPawn = movingPiece[1] === "p";
    const wasCapture = Boolean(capturedPiece) || Boolean(moveData.enPassant);

    const notation = createMoveNotation(
        movingPiece,
        fromRow,
        fromCol,
        toRow,
        toCol,
        capturedPiece,
        moveData
    );

    // En Passant capture execution
    if (moveData.enPassant) {
        const capturedPawnRow = movingPiece[0] === "w" ? toRow + 1 : toRow - 1;
        board[capturedPawnRow][toCol] = null;
    }

    // Normal move execution
    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = null;

    // Castling execution
    if (moveData.castle === "K") {
        board[toRow][5] = board[toRow][7];
        board[toRow][7] = null;
    }
    if (moveData.castle === "Q") {
        board[toRow][3] = board[toRow][0];
        board[toRow][0] = null;
    }

    // Update castling rights
    updateCastlingRights(movingPiece, fromRow, fromCol, capturedPiece, toRow, toCol);

    // En Passant target update
    enPassantTarget = null;
    if (isPawn && Math.abs(toRow - fromRow) === 2) {
        enPassantTarget = {
            row: (fromRow + toRow) / 2,
            col: fromCol
        };
    }

    // Pawn Promotion
    let promotionPiece = null;
    if (isPawn && (toRow === 0 || toRow === 7)) {
        promotionPiece = humanMove ? askPromotion(movingPiece[0]) : "q";
        board[toRow][toCol] = movingPiece[0] + promotionPiece;
    }

    // Move counters (50-move rule reset)
    if (isPawn || wasCapture) {
        halfmoveClock = 0;
    } else {
        halfmoveClock++;
    }

    // Standard notation string formatting
    let finalNotation = notation;
    if (promotionPiece) {
        finalNotation += "=" + promotionPiece.toUpperCase();
    }

    // Check & Checkmate suffix
    const opponent = currentPlayer === "w" ? "b" : "w";
    const inCheck = isKingInCheck(board, opponent);
    const hasMoves = hasAnyLegalMoves(board, opponent);

    if (inCheck && !hasMoves) {
        finalNotation += "#";
    } else if (inCheck) {
        finalNotation += "+";
    }

    moveHistory.push(finalNotation);

    // Switch turns
    currentPlayer = opponent;
    selectedSquare = null;
    legalMoves = [];

    // Increment player clock
    addIncrement(movingPiece[0]);

    positionHistory.push(getPositionKey());

    updateMoveHistory();
    updateCapturedPieces();
    renderBoard();
    updateStatus();
    updatePlayerLabels();
    updateGameInfo();

    const result = evaluateGameState();
    if (result.gameOver) {
        finishGame(result.message);
        return;
    }

    startClockIfNeeded();

    if (gameMode === "computer" && currentPlayer === aiColor) {
        triggerComputerMove();
    }
}


/* =========================================================
   PROMOTION
   ========================================================= */

function askPromotion(color) {
    const choice = window.prompt(
        "Promote your pawn:\n\nQ = Queen\nR = Rook\nB = Bishop\nN = Knight",
        "Q"
    );

    const selected = String(choice || "Q").trim().toLowerCase();
    const allowed = ["q", "r", "b", "n"];
    return allowed.includes(selected) ? selected : "q";
}


/* =========================================================
   CASTLING RIGHTS UPDATE
   ========================================================= */

function updateCastlingRights(movingPiece, fromRow, fromCol, capturedPiece, toRow, toCol) {
    if (movingPiece === "wk") {
        castlingRights.wK = false;
        castlingRights.wQ = false;
    } else if (movingPiece === "bk") {
        castlingRights.bK = false;
        castlingRights.bQ = false;
    }

    if (movingPiece === "wr" && fromRow === 7) {
        if (fromCol === 7) castlingRights.wK = false;
        if (fromCol === 0) castlingRights.wQ = false;
    }
    if (movingPiece === "br" && fromRow === 0) {
        if (fromCol === 7) castlingRights.bK = false;
        if (fromCol === 0) castlingRights.bQ = false;
    }

    if (capturedPiece === "wr" && toRow === 7) {
        if (toCol === 7) castlingRights.wK = false;
        if (toCol === 0) castlingRights.wQ = false;
    }
    if (capturedPiece === "br" && toRow === 0) {
        if (toCol === 7) castlingRights.bK = false;
        if (toCol === 0) castlingRights.bQ = false;
    }
}


/* =========================================================
   GET LEGAL MOVES
   ========================================================= */

function getLegalMoves(position, row, col, color) {
    const piece = position[row][col];
    if (!piece || piece[0] !== color) return [];

    const pseudoMoves = getPseudoLegalMoves(position, row, col, color);
    const legal = [];

    for (const move of pseudoMoves) {
        const testBoard = cloneBoard(position);
        applyMoveToBoard(testBoard, row, col, move);

        if (!isKingInCheck(testBoard, color)) {
            legal.push(move);
        }
    }

    return legal;
}


/* =========================================================
   PSEUDO LEGAL MOVES
   ========================================================= */

function getPseudoLegalMoves(position, row, col, color) {
    const piece = position[row][col];
    if (!piece) return [];

    const type = piece[1];
    const moves = [];

    // PAWN
    if (type === "p") {
        const direction = color === "w" ? -1 : 1;
        const startRow = color === "w" ? 6 : 1;
        const oneRow = row + direction;

        if (isInside(oneRow, col) && !position[oneRow][col]) {
            moves.push({ row: oneRow, col });

            const twoRow = row + direction * 2;
            if (row === startRow && !position[twoRow][col]) {
                moves.push({ row: twoRow, col });
            }
        }

        for (const dc of [-1, 1]) {
            const targetRow = row + direction;
            const targetCol = col + dc;

            if (!isInside(targetRow, targetCol)) continue;

            const target = position[targetRow][targetCol];

            if (target && target[0] !== color) {
                moves.push({ row: targetRow, col: targetCol });
            }

            if (
                enPassantTarget &&
                enPassantTarget.row === targetRow &&
                enPassantTarget.col === targetCol
            ) {
                moves.push({ row: targetRow, col: targetCol, enPassant: true });
            }
        }
    }

    // KNIGHT
    if (type === "n") {
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of offsets) {
            addMoveIfValid(position, moves, row + dr, col + dc, color);
        }
    }

    // BISHOP
    if (type === "b") {
        addSlidingMoves(position, moves, row, col, color, [
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ]);
    }

    // ROOK
    if (type === "r") {
        addSlidingMoves(position, moves, row, col, color, [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ]);
    }

    // QUEEN
    if (type === "q") {
        addSlidingMoves(position, moves, row, col, color, [
            [-1, -1], [-1, 1], [1, -1], [1, 1],
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ]);
    }

    // KING
    if (type === "k") {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                addMoveIfValid(position, moves, row + dr, col + dc, color);
            }
        }
        addCastlingMoves(position, moves, row, col, color);
    }

    return moves;
}

function addMoveIfValid(position, moves, row, col, color) {
    if (!isInside(row, col)) return;
    const target = position[row][col];
    if (!target || target[0] !== color) {
        moves.push({ row, col });
    }
}

function addSlidingMoves(position, moves, row, col, color, directions) {
    for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;

        while (isInside(r, c)) {
            const target = position[r][c];

            if (!target) {
                moves.push({ row: r, col: c });
            } else {
                if (target[0] !== color) {
                    moves.push({ row: r, col: c });
                }
                break;
            }
            r += dr;
            c += dc;
        }
    }
}

function addCastlingMoves(position, moves, row, col, color) {
    if (isKingInCheck(position, color)) return;

    const opponent = color === "w" ? "b" : "w";
    const kingSideRight = color === "w" ? castlingRights.wK : castlingRights.bK;

    if (
        kingSideRight &&
        position[row][5] === null &&
        position[row][6] === null &&
        position[row][7] === color + "r" &&
        !isSquareAttacked(position, row, 5, opponent) &&
        !isSquareAttacked(position, row, 6, opponent)
    ) {
        moves.push({ row, col: 6, castle: "K" });
    }

    const queenSideRight = color === "w" ? castlingRights.wQ : castlingRights.bQ;

    if (
        queenSideRight &&
        position[row][1] === null &&
        position[row][2] === null &&
        position[row][3] === null &&
        position[row][0] === color + "r" &&
        !isSquareAttacked(position, row, 2, opponent) &&
        !isSquareAttacked(position, row, 3, opponent)
    ) {
        moves.push({ row, col: 2, castle: "Q" });
    }
}


/* =========================================================
   APPLY MOVE TO BOARD (Simulated)
   ========================================================= */

function applyMoveToBoard(position, fromRow, fromCol, move) {
    const piece = position[fromRow][fromCol];
    if (!piece) return;

    if (move.enPassant) {
        const capturedRow = piece[0] === "w" ? move.row + 1 : move.row - 1;
        position[capturedRow][move.col] = null;
    }

    position[move.row][move.col] = piece;
    position[fromRow][fromCol] = null;

    if (move.castle === "K") {
        position[move.row][5] = position[move.row][7];
        position[move.row][7] = null;
    }

    if (move.castle === "Q") {
        position[move.row][3] = position[move.row][0];
        position[move.row][0] = null;
    }
}


/* =========================================================
   KING & ATTACK DETECTION
   ========================================================= */

function findKing(position, color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = position[row][col];
            if (piece && piece[0] === color && piece[1] === "k") {
                return { row, col };
            }
        }
    }
    return null;
}

function isKingInCheck(position, color) {
    const king = findKing(position, color);
    if (!king) return true;

    const opponent = color === "w" ? "b" : "w";
    return isSquareAttacked(position, king.row, king.col, opponent);
}

function isSquareAttacked(position, targetRow, targetCol, attackerColor) {
    // Pawn Attacks
    const pawnDir = attackerColor === "w" ? 1 : -1;
    for (const dc of [-1, 1]) {
        const r = targetRow + pawnDir;
        const c = targetCol + dc;
        if (isInside(r, c)) {
            const p = position[r][c];
            if (p && p[0] === attackerColor && p[1] === "p") return true;
        }
    }

    // Knight Attacks
    const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightOffsets) {
        const r = targetRow + dr;
        const c = targetCol + dc;
        if (isInside(r, c)) {
            const p = position[r][c];
            if (p && p[0] === attackerColor && p[1] === "n") return true;
        }
    }

    // King Attacks
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = targetRow + dr;
            const c = targetCol + dc;
            if (isInside(r, c)) {
                const p = position[r][c];
                if (p && p[0] === attackerColor && p[1] === "k") return true;
            }
        }
    }

    // Straight line Attacks (Rook/Queen)
    const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of straightDirs) {
        let r = targetRow + dr;
        let c = targetCol + dc;
        while (isInside(r, c)) {
            const p = position[r][c];
            if (p) {
                if (p[0] === attackerColor && (p[1] === "r" || p[1] === "q")) return true;
                break;
            }
            r += dr;
            c += dc;
        }
    }

    // Diagonal Attacks (Bishop/Queen)
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
        let r = targetRow + dr;
        let c = targetCol + dc;
        while (isInside(r, c)) {
            const p = position[r][c];
            if (p) {
                if (p[0] === attackerColor && (p[1] === "b" || p[1] === "q")) return true;
                break;
            }
            r += dr;
            c += dc;
        }
    }

    return false;
}

function hasAnyLegalMoves(position, color) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = position[r][c];
            if (piece && piece[0] === color) {
                const moves = getLegalMoves(position, r, c, color);
                if (moves.length > 0) return true;
            }
        }
    }
    return false;
}


/* =========================================================
   GAME STATE EVALUATION
   ========================================================= */

function evaluateGameState() {
    const inCheck = isKingInCheck(board, currentPlayer);
    const hasLegal = hasAnyLegalMoves(board, currentPlayer);

    if (!hasLegal) {
        gameOver = true;
        stopClock();
        if (inCheck) {
            const winner = currentPlayer === "w" ? "Black" : "White";
            return { gameOver: true, message: `Checkmate! ${winner} wins.` };
        } else {
            return { gameOver: true, message: "Draw by Stalemate!" };
        }
    }

    if (halfmoveClock >= 100) {
        gameOver = true;
        stopClock();
        return { gameOver: true, message: "Draw by 50-move rule!" };
    }

    if (isThreefoldRepetition()) {
        gameOver = true;
        stopClock();
        return { gameOver: true, message: "Draw by 3-fold repetition!" };
    }

    if (isInsufficientMaterial()) {
        gameOver = true;
        stopClock();
        return { gameOver: true, message: "Draw due to insufficient material!" };
    }

    return { gameOver: false, message: "" };
}

function getPositionKey() {
    let key = "";
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            key += board[r][c] ? board[r][c] : "-";
        }
    }
    key += `_${currentPlayer}`;
    key += `_${castlingRights.wK ? 1 : 0}${castlingRights.wQ ? 1 : 0}${castlingRights.bK ? 1 : 0}${castlingRights.bQ ? 1 : 0}`;
    key += enPassantTarget ? `_${enPassantTarget.row},${enPassantTarget.col}` : "_-";
    return key;
}

function isThreefoldRepetition() {
    const currentKey = positionHistory[positionHistory.length - 1];
    let count = 0;
    for (const key of positionHistory) {
        if (key === currentKey) count++;
    }
    return count >= 3;
}

function isInsufficientMaterial() {
    const pieces = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c]) pieces.push(board[r][c]);
        }
    }

    if (pieces.length === 2) return true; // King vs King

    if (pieces.length === 3) {
        const nonKings = pieces.filter(p => p[1] !== "k");
        if (nonKings.some(p => p[1] === "b" || p[1] === "n")) return true;
    }

    return false;
}

function finishGame(message) {
    gameOver = true;
    stopClock();
    if (currentStatusElement) currentStatusElement.textContent = message;
    if (turnIndicator) turnIndicator.textContent = message;
    alert(message);
}


/* =========================================================
   MOVE NOTATION & UI UPDATES
   ========================================================= */

function createMoveNotation(movingPiece, fromRow, fromCol, toRow, toCol, capturedPiece, moveData) {
    if (moveData.castle === "K") return "O-O";
    if (moveData.castle === "Q") return "O-O-O";

    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

    const pieceType = movingPiece[1].toUpperCase();
    const dest = files[toCol] + ranks[toRow];
    const isCapture = Boolean(capturedPiece) || Boolean(moveData.enPassant);

    if (pieceType === "P") {
        return isCapture ? `${files[fromCol]}x${dest}` : dest;
    }

    return `${pieceType}${isCapture ? "x" : ""}${dest}`;
}

function updateMoveHistory() {
    if (!moveHistoryElement) return;

    moveHistoryElement.innerHTML = "";
    for (let i = 0; i < moveHistory.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = moveHistory[i] || "";
        const blackMove = moveHistory[i + 1] || "";

        const row = document.createElement("div");
        row.className = "move-row";
        row.innerHTML = `<span class="move-num">${moveNumber}.</span><span class="move-w">${whiteMove}</span><span class="move-b">${blackMove}</span>`;
        moveHistoryElement.appendChild(row);
    }

    moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;

    if (moveCountElement) {
        moveCountElement.textContent = Math.floor(moveHistory.length / 2) + 1;
    }
}

function updateCapturedPieces() {
    const initialCounts = { wp: 8, wr: 2, wn: 2, wb: 2, wq: 1, bp: 8, br: 2, bn: 2, bb: 2, bq: 1 };
    const currentCounts = { wp: 0, wr: 0, wn: 0, wb: 0, wq: 0, bp: 0, br: 0, bn: 0, bb: 0, bq: 0 };

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p[1] !== "k") {
                currentCounts[p]++;
            }
        }
    }

    if (whiteCaptured) whiteCaptured.innerHTML = getCapturedString(initialCounts, currentCounts, "b");
    if (blackCaptured) blackCaptured.innerHTML = getCapturedString(initialCounts, currentCounts, "w");
}

function getCapturedString(initialCounts, currentCounts, color) {
    let str = "";
    for (const type of ["q", "r", "b", "n", "p"]) {
        const key = color + type;
        const missing = initialCounts[key] - currentCounts[key];
        if (missing > 0) {
            str += PIECES[color][type].repeat(missing);
        }
    }
    return str;
}

function highlightKingInCheck() {
    const kingInCheck = isKingInCheck(board, currentPlayer);
    if (!kingInCheck) return;

    const kingPos = findKing(board, currentPlayer);
    if (!kingPos) return;

    const kingSquare = chessBoard.querySelector(
        `[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`
    );
    if (kingSquare) {
        kingSquare.classList.add("check");
    }
}

function updateStatus() {
    if (gameOver) return;

    const inCheck = isKingInCheck(board, currentPlayer);
    const colorName = currentPlayer === "w" ? "White" : "Black";
    let statusText = `${colorName}'s turn`;

    if (inCheck) {
        statusText += " (In Check!)";
    }

    if (turnIndicator) turnIndicator.textContent = statusText;
    if (currentStatusElement) currentStatusElement.textContent = statusText;
}

function updatePlayerLabels() {
    if (whitePlayerName) {
        whitePlayerName.textContent = gameMode === "computer" && playerColor === "b" ? "Computer (AI)" : "White Player";
    }
    if (blackPlayerName) {
        blackPlayerName.textContent = gameMode === "computer" && playerColor === "w" ? "Computer (AI)" : "Black Player";
    }
}

function updateGameInfo() {
    if (currentModeElement) {
        currentModeElement.textContent = gameMode.toUpperCase();
    }
    if (currentDifficultyElement) {
        currentDifficultyElement.textContent = gameMode === "computer" ? difficulty.toUpperCase() : "N/A";
    }
}


/* =========================================================
   CLOCK / TIMER LOGIC
   ========================================================= */

function setupClock() {
    stopClock();

    const control = timeControlSelect ? timeControlSelect.value : "none";
    if (control === "none") {
        whiteTime = null;
        blackTime = null;
        incrementSeconds = 0;
        updateClockDisplay();
        return;
    }

    const [mins, inc] = control.split("+").map(Number);
    whiteTime = mins * 60;
    blackTime = mins * 60;
    incrementSeconds = inc || 0;

    updateClockDisplay();
}

function startClockIfNeeded() {
    if (whiteTime === null || gameOver) return;
    stopClock();

    clockRunning = true;
    clockInterval = setInterval(() => {
        if (currentPlayer === "w") {
            whiteTime--;
            if (whiteTime <= 0) {
                whiteTime = 0;
                finishGame("Black wins on time!");
            }
        } else {
            blackTime--;
            if (blackTime <= 0) {
                blackTime = 0;
                finishGame("White wins on time!");
            }
        }
        updateClockDisplay();
    }, 1000);
}

function addIncrement(movedPieceColor) {
    if (incrementSeconds <= 0 || whiteTime === null) return;
    if (movedPieceColor === "w") {
        whiteTime += incrementSeconds;
    } else {
        blackTime += incrementSeconds;
    }
    updateClockDisplay();
}

function stopClock() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    clockRunning = false;
}

function updateClockDisplay() {
    if (whiteClock) whiteClock.textContent = formatTime(whiteTime);
    if (blackClock) blackClock.textContent = formatTime(blackTime);
}

function formatTime(seconds) {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}


/* =========================================================
   COMPUTER AI (Minimax with Alpha-Beta Pruning)
   ========================================================= */

function triggerComputerMove() {
    if (gameOver) return;

    aiThinking = true;
    if (turnIndicator) turnIndicator.textContent = "Computer is thinking...";

    setTimeout(() => {
        const move = getBestAiMove();
        aiThinking = false;

        if (move) {
            makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move, false);
        }
    }, 300);
}

function getBestAiMove() {
    const allMoves = getAllLegalMovesForColor(board, aiColor);
    if (allMoves.length === 0) return null;

    if (difficulty === "easy") {
        // Prefer captures randomly
        const captures = allMoves.filter(m => m.captured);
        if (captures.length > 0 && Math.random() < 0.7) {
            return captures[Math.floor(Math.random() * captures.length)];
        }
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    const depth = difficulty === "hard" ? 3 : 2;
    let bestMove = null;
    let bestEval = -Infinity;

    for (const move of allMoves) {
        const testBoard = cloneBoard(board);
        applyMoveToBoard(testBoard, move.fromRow, move.fromCol, move);

        const evalVal = minimax(testBoard, depth - 1, -Infinity, Infinity, false, aiColor);
        if (evalVal > bestEval) {
            bestEval = evalVal;
            bestMove = move;
        }
    }

    return bestMove || allMoves[0];
}

function minimax(position, depth, alpha, beta, isMaximizing, color) {
    if (depth === 0) {
        return evaluateBoard(position, color);
    }

    const currentTurn = isMaximizing ? color : (color === "w" ? "b" : "w");
    const moves = getAllLegalMovesForColor(position, currentTurn);

    if (moves.length === 0) {
        if (isKingInCheck(position, currentTurn)) {
            return isMaximizing ? -99999 : 99999;
        }
        return 0; // Stalemate
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const testBoard = cloneBoard(position);
            applyMoveToBoard(testBoard, move.fromRow, move.fromCol, move);
            const evalVal = minimax(testBoard, depth - 1, alpha, beta, false, color);
            maxEval = Math.max(maxEval, evalVal);
            alpha = Math.max(alpha, evalVal);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const testBoard = cloneBoard(position);
            applyMoveToBoard(testBoard, move.fromRow, move.fromCol, move);
            const evalVal = minimax(testBoard, depth - 1, alpha, beta, true, color);
            minEval = Math.min(minEval, evalVal);
            beta = Math.min(beta, evalVal);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function getAllLegalMovesForColor(position, color) {
    const movesList = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = position[r][c];
            if (p && p[0] === color) {
                const moves = getLegalMoves(position, r, c, color);
                for (const m of moves) {
                    movesList.push({
                        fromRow: r,
                        fromCol: c,
                        toRow: m.row,
                        toCol: m.col,
                        castle: m.castle,
                        enPassant: m.enPassant,
                        captured: Boolean(position[m.row][m.col])
                    });
                }
            }
        }
    }
    return movesList;
}

function evaluateBoard(position, perspectiveColor) {
    let totalScore = 0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = position[r][c];
            if (!p) continue;

            const color = p[0];
            const type = p[1];
            let val = PIECE_VALUES[type] || 0;

            // Add positional table bonus
            let pTable = 0;
            const tableRow = color === "w" ? r : 7 - r;
            if (type === "p") pTable = PAWN_TABLE[tableRow][c];
            else if (type === "n") pTable = KNIGHT_TABLE[tableRow][c];
            else if (type === "b") pTable = BISHOP_TABLE[tableRow][c];
            else if (type === "r") pTable = ROOK_TABLE[tableRow][c];
            else if (type === "q") pTable = QUEEN_TABLE[tableRow][c];
            else if (type === "k") pTable = KING_MIDGAME_TABLE[tableRow][c];

            val += pTable;

            if (color === perspectiveColor) {
                totalScore += val;
            } else {
                totalScore -= val;
            }
        }
    }

    return totalScore;
}


/* =========================================================
   DRAW, RESIGN & ONLINE STUBS
   ========================================================= */

function offerDraw() {
    if (gameOver) return;
    if (confirm("Offer a draw to your opponent?")) {
        finishGame("Game drawn by agreement!");
    }
}

function resignGame() {
    if (gameOver) return;
    if (confirm("Are you sure you want to resign?")) {
        const winner = currentPlayer === "w" ? "Black" : "White";
        finishGame(`${winner} wins by resignation!`);
    }
}

function createOnlineRoom() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (roomCodeDisplay) roomCodeDisplay.textContent = code;
    if (roomInfo) roomInfo.hidden = false;
    alert(`Room created! Code: ${code}`);
}

function joinOnlineRoom() {
    const code = roomCodeInput ? roomCodeInput.value.trim() : "";
    if (!code) {
        alert("Please enter a room code.");
        return;
    }
    alert(`Joined room ${code}. Waiting for opponent...`);
}

function copyRoomCode() {
    const code = roomCodeDisplay ? roomCodeDisplay.textContent : "";
    if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code);
        alert("Room code copied to clipboard!");
    }
}
