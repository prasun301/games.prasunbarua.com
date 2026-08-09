/* =========================================================
   PRASUN GAMES — PROFESSIONAL CHESS ENGINE
   Local 2-player + Computer AI
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

const chessBoard =
    document.getElementById("chess-board");

const turnIndicator =
    document.getElementById("turn-indicator");

const moveHistoryElement =
    document.getElementById("move-history");

const newGameButton =
    document.getElementById("new-game");

const modeComputerButton =
    document.getElementById("mode-computer");

const modeLocalButton =
    document.getElementById("mode-local");

const modeOnlineButton =
    document.getElementById("mode-online");

const playerSideSelect =
    document.getElementById("player-side");

const difficultySelect =
    document.getElementById("difficulty");

const timeControlSelect =
    document.getElementById("time-control");

const difficultyGroup =
    document.getElementById("difficulty-group");

const onlinePanel =
    document.getElementById("online-panel");

const createRoomButton =
    document.getElementById("create-room");

const joinRoomButton =
    document.getElementById("join-room");

const roomCodeInput =
    document.getElementById("room-code");

const roomInfo =
    document.getElementById("room-info");

const roomCodeDisplay =
    document.getElementById("room-code-display");

const copyRoomButton =
    document.getElementById("copy-room");

const drawButton =
    document.getElementById("draw-game");

const resignButton =
    document.getElementById("resign-game");

const whiteClock =
    document.getElementById("white-clock");

const blackClock =
    document.getElementById("black-clock");

const whitePlayerName =
    document.getElementById("white-player-name");

const blackPlayerName =
    document.getElementById("black-player-name");

const whitePlayerStatus =
    document.getElementById("white-player-status");

const blackPlayerStatus =
    document.getElementById("black-player-status");

const whiteCaptured =
    document.getElementById("white-captured");

const blackCaptured =
    document.getElementById("black-captured");

const moveCountElement =
    document.getElementById("move-count");

const currentModeElement =
    document.getElementById("current-mode");

const currentDifficultyElement =
    document.getElementById("current-difficulty");

const currentStatusElement =
    document.getElementById("current-status");


/* =========================================================
   INITIALIZE
   ========================================================= */

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

        newGameButton.addEventListener(
            "click",
            () => resetGame(true)
        );
    }


    if (modeComputerButton) {

        modeComputerButton.addEventListener(
            "click",
            () => {

                gameMode = "computer";

                applyGameModeUI();

                resetGame(false);
            }
        );
    }


    if (modeLocalButton) {

        modeLocalButton.addEventListener(
            "click",
            () => {

                gameMode = "local";

                applyGameModeUI();

                resetGame(false);
            }
        );
    }


    if (modeOnlineButton) {

        modeOnlineButton.addEventListener(
            "click",
            () => {

                gameMode = "online";

                applyGameModeUI();

                resetGame(false);
            }
        );
    }


    if (playerSideSelect) {

        playerSideSelect.addEventListener(
            "change",
            () => {

                if (gameMode !== "computer") {
                    return;
                }

                resetGame(false);
            }
        );
    }


    if (difficultySelect) {

        difficultySelect.addEventListener(
            "change",
            () => {

                difficulty =
                    difficultySelect.value;

                updateGameInfo();
            }
        );
    }


    if (timeControlSelect) {

        timeControlSelect.addEventListener(
            "change",
            () => {

                resetGame(false);
            }
        );
    }


    if (drawButton) {

        drawButton.addEventListener(
            "click",
            offerDraw
        );
    }


    if (resignButton) {

        resignButton.addEventListener(
            "click",
            resignGame
        );
    }


    if (createRoomButton) {

        createRoomButton.addEventListener(
            "click",
            createOnlineRoom
        );
    }


    if (joinRoomButton) {

        joinRoomButton.addEventListener(
            "click",
            joinOnlineRoom
        );
    }


    if (copyRoomButton) {

        copyRoomButton.addEventListener(
            "click",
            copyRoomCode
        );
    }
}


/* =========================================================
   CLONE BOARD
   ========================================================= */

function cloneBoard(source) {

    return source.map(
        row => [...row]
    );
}


/* =========================================================
   RESET GAME
   ========================================================= */

function resetGame(confirmReset = false) {

    if (
        confirmReset &&
        moveHistory.length > 0 &&
        !gameOver
    ) {

        const confirmed =
            window.confirm(
                "Start a new chess game?"
            );

        if (!confirmed) {
            return;
        }
    }


    stopClock();


    board =
        cloneBoard(INITIAL_BOARD);

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


    difficulty =
        difficultySelect
            ? difficultySelect.value
            : "medium";


    setupPlayerColors();

    setupClock();

    positionHistory.push(
        getPositionKey()
    );


    renderBoard();

    updateMoveHistory();

    updateStatus();

    updateCapturedPieces();

    updatePlayerLabels();

    updateGameInfo();

    startClockIfNeeded();


    if (
        gameMode === "computer" &&
        currentPlayer === aiColor
    ) {

        triggerComputerMove();
    }
}


/* =========================================================
   PLAYER COLORS
   ========================================================= */

function setupPlayerColors() {

    if (gameMode !== "computer") {

        playerColor = "w";

        aiColor = "b";

        return;
    }


    const selected =
        playerSideSelect
            ? playerSideSelect.value
            : "white";


    if (selected === "black") {

        playerColor = "b";

        aiColor = "w";

    } else if (selected === "random") {

        playerColor =
            Math.random() < 0.5
                ? "w"
                : "b";

        aiColor =
            playerColor === "w"
                ? "b"
                : "w";

    } else {

        playerColor = "w";

        aiColor = "b";
    }
}


/* =========================================================
   GAME MODE UI
   ========================================================= */

function applyGameModeUI() {

    document
        .querySelectorAll(".mode-card")
        .forEach(button => {

            button.classList.remove("active");
        });


    if (gameMode === "computer") {

        if (modeComputerButton) {
            modeComputerButton.classList.add("active");
        }

        if (difficultyGroup) {
            difficultyGroup.hidden = false;
        }

        if (onlinePanel) {
            onlinePanel.hidden = true;
        }

    } else if (gameMode === "local") {

        if (modeLocalButton) {
            modeLocalButton.classList.add("active");
        }

        if (difficultyGroup) {
            difficultyGroup.hidden = true;
        }

        if (onlinePanel) {
            onlinePanel.hidden = true;
        }

    } else {

        if (modeOnlineButton) {
            modeOnlineButton.classList.add("active");
        }

        if (difficultyGroup) {
            difficultyGroup.hidden = true;
        }

        if (onlinePanel) {
            onlinePanel.hidden = false;
        }
    }


    updateGameInfo();
}


/* =========================================================
   RENDER BOARD
   ========================================================= */

function renderBoard() {

    if (!chessBoard) {
        return;
    }


    chessBoard.innerHTML = "";


    for (let displayRow = 0; displayRow < 8; displayRow++) {

        for (let displayCol = 0; displayCol < 8; displayCol++) {

            const row =
                boardFlipped
                    ? 7 - displayRow
                    : displayRow;

            const col =
                boardFlipped
                    ? 7 - displayCol
                    : displayCol;


            const square =
                document.createElement("div");


            square.classList.add("square");


            if ((row + col) % 2 === 0) {

                square.classList.add("light");

            } else {

                square.classList.add("dark");
            }


            square.dataset.row = row;

            square.dataset.col = col;


            const piece =
                board[row][col];


            if (piece) {

                const pieceElement =
                    document.createElement("div");


                pieceElement.className =
                    "piece";


                pieceElement.textContent =
                    PIECES[piece[0]][piece[1]];


                pieceElement.dataset.row =
                    row;

                pieceElement.dataset.col =
                    col;


                square.appendChild(
                    pieceElement
                );
            }


            if (
                selectedSquare &&
                selectedSquare.row === row &&
                selectedSquare.col === col
            ) {

                square.classList.add(
                    "selected"
                );
            }


            const isLegalMove =
                legalMoves.some(
                    move =>
                        move.row === row &&
                        move.col === col
                );


            if (isLegalMove) {

                if (board[row][col]) {

                    square.classList.add(
                        "legal-capture"
                    );

                } else {

                    square.classList.add(
                        "legal-move"
                    );
                }
            }


            square.addEventListener(
                "click",
                handleSquareClick
            );


            chessBoard.appendChild(
                square
            );
        }
    }


    highlightKingInCheck();
}


/* =========================================================
   HANDLE SQUARE CLICK
   ========================================================= */

function handleSquareClick(event) {

    if (gameOver || aiThinking) {
        return;
    }


    if (
        gameMode === "computer" &&
        currentPlayer !== playerColor
    ) {
        return;
    }


    const square =
        event.currentTarget;


    const row =
        Number(square.dataset.row);

    const col =
        Number(square.dataset.col);


    const piece =
        board[row][col];


    if (selectedSquare) {

        const targetMove =
            legalMoves.find(
                move =>
                    move.row === row &&
                    move.col === col
            );


        if (targetMove) {

            makeMove(
                selectedSquare.row,
                selectedSquare.col,
                row,
                col,
                targetMove,
                true
            );

            return;
        }


        if (
            piece &&
            piece[0] === currentPlayer
        ) {

            selectPiece(row, col);

            return;
        }


        clearSelection();

        return;
    }


    if (
        piece &&
        piece[0] === currentPlayer
    ) {

        selectPiece(row, col);
    }
}


/* =========================================================
   SELECT PIECE
   ========================================================= */

function selectPiece(row, col) {

    selectedSquare = {
        row,
        col
    };


    legalMoves =
        getLegalMoves(
            board,
            row,
            col,
            currentPlayer
        );


    renderBoard();
}


/* =========================================================
   CLEAR SELECTION
   ========================================================= */

function clearSelection() {

    selectedSquare = null;

    legalMoves = [];

    renderBoard();
}


/* =========================================================
   MAKE MOVE
   ========================================================= */

function makeMove(
    fromRow,
    fromCol,
    toRow,
    toCol,
    moveData,
    humanMove = true
) {

    if (gameOver) {
        return;
    }


    const movingPiece =
        board[fromRow][fromCol];


    if (!movingPiece) {
        return;
    }


    const capturedPiece =
        board[toRow][toCol];


    const wasPawn =
        movingPiece[1] === "p";


    const wasCapture =
        Boolean(capturedPiece) ||
        Boolean(moveData.enPassant);


    const notation =
        createMoveNotation(
            movingPiece,
            fromRow,
            fromCol,
            toRow,
            toCol,
            capturedPiece,
            moveData
        );


    /* =====================================================
       EN PASSANT
       ===================================================== */

    if (moveData.enPassant) {

        const capturedPawnRow =
            movingPiece[0] === "w"
                ? toRow + 1
                : toRow - 1;


        board[capturedPawnRow][toCol] =
            null;
    }


    /* =====================================================
       NORMAL MOVE
       ===================================================== */

    board[toRow][toCol] =
        board[fromRow][fromCol];


    board[fromRow][fromCol] =
        null;


    /* =====================================================
       CASTLING
       ===================================================== */

    if (moveData.castle === "K") {

        board[toRow][5] =
            board[toRow][7];

        board[toRow][7] =
            null;
    }


    if (moveData.castle === "Q") {

        board[toRow][3] =
            board[toRow][0];

        board[toRow][0] =
            null;
    }


    /* =====================================================
       CASTLING RIGHTS
       ===================================================== */

    updateCastlingRights(
        movingPiece,
        fromRow,
        fromCol,
        capturedPiece,
        toRow,
        toCol
    );


    /* =====================================================
       EN PASSANT TARGET
       ===================================================== */

    enPassantTarget = null;


    if (
        movingPiece[1] === "p" &&
        Math.abs(toRow - fromRow) === 2
    ) {

        enPassantTarget = {
            row:
                (fromRow + toRow) / 2,
            col:
                fromCol
        };
    }


    /* =====================================================
       PROMOTION
       ===================================================== */

    let promotionPiece = null;


    if (
        movingPiece[1] === "p" &&
        (toRow === 0 || toRow === 7)
    ) {

        if (humanMove) {

            promotionPiece =
                askPromotion(
                    movingPiece[0]
                );

        } else {

            promotionPiece = "q";
        }


        board[toRow][toCol] =
            movingPiece[0] +
            promotionPiece;


        if (promotionPiece !== "q") {

            /* notation is updated below */
        }
    }


    /* =====================================================
       MOVE COUNTER
       ===================================================== */

    if (
        movingPiece[1] === "p" ||
        wasCapture
    ) {

        halfmoveClock = 0;

    } else {

        halfmoveClock++;
    }


    /* =====================================================
       NOTATION
       ===================================================== */

    let finalNotation =
        notation;


    if (promotionPiece) {

        finalNotation +=
            "=" +
            promotionPiece.toUpperCase();
    }


    moveHistory.push(
        finalNotation
    );


    currentPlayer =
        currentPlayer === "w"
            ? "b"
            : "w";


    selectedSquare = null;

    legalMoves = [];


    positionHistory.push(
        getPositionKey()
    );


    updateMoveHistory();

    updateCapturedPieces();

    renderBoard();

    updateStatus();

    updatePlayerLabels();

    updateGameInfo();


    const result =
        evaluateGameState();


    if (result.gameOver) {

        finishGame(
            result.message
        );

        return;
    }


    startClockIfNeeded();


    if (
        gameMode === "computer" &&
        currentPlayer === aiColor
    ) {

        triggerComputerMove();
    }
}


/* =========================================================
   PROMOTION
   ========================================================= */

function askPromotion(color) {

    const choice =
        window.prompt(
            "Promote your pawn:\n\n" +
            "Q = Queen\n" +
            "R = Rook\n" +
            "B = Bishop\n" +
            "N = Knight",
            "Q"
        );


    const selected =
        String(choice || "Q")
            .trim()
            .toLowerCase();


    const allowed =
        ["q", "r", "b", "n"];


    if (
        allowed.includes(selected)
    ) {

        return selected;
    }


    return "q";
}


/* =========================================================
   GET LEGAL MOVES
   ========================================================= */

function getLegalMoves(
    position,
    row,
    col,
    color
) {

    const piece =
        position[row][col];


    if (!piece) {
        return [];
    }


    if (piece[0] !== color) {
        return [];
    }


    const pseudoMoves =
        getPseudoLegalMoves(
            position,
            row,
            col,
            color
        );


    const legal = [];


    for (const move of pseudoMoves) {

        const testBoard =
            cloneBoard(position);


        applyMoveToBoard(
            testBoard,
            row,
            col,
            move
        );


        if (
            !isKingInCheck(
                testBoard,
                color
            )
        ) {

            legal.push(move);
        }
    }


    return legal;
}


/* =========================================================
   PSEUDO LEGAL MOVES
   ========================================================= */

function getPseudoLegalMoves(
    position,
    row,
    col,
    color
) {

    const piece =
        position[row][col];


    if (!piece) {
        return [];
    }


    const type =
        piece[1];


    const moves = [];


    /* =====================================================
       PAWN
       ===================================================== */

    if (type === "p") {

        const direction =
            color === "w"
                ? -1
                : 1;


        const startRow =
            color === "w"
                ? 6
                : 1;


        const oneRow =
            row + direction;


        if (
            isInside(
                oneRow,
                col
            ) &&
            !position[oneRow][col]
        ) {

            moves.push({
                row: oneRow,
                col
            });


            const twoRow =
                row +
                direction * 2;


            if (
                row === startRow &&
                !position[twoRow][col]
            ) {

                moves.push({
                    row: twoRow,
                    col
                });
            }
        }


        for (const dc of [-1, 1]) {

            const targetRow =
                row + direction;

            const targetCol =
                col + dc;


            if (
                !isInside(
                    targetRow,
                    targetCol
                )
            ) {
                continue;
            }


            const target =
                position[
                    targetRow
                ][targetCol];


            if (
                target &&
                target[0] !== color
            ) {

                moves.push({
                    row: targetRow,
                    col: targetCol
                });
            }


            if (
                enPassantTarget &&
                enPassantTarget.row === targetRow &&
                enPassantTarget.col === targetCol
            ) {

                moves.push({
                    row: targetRow,
                    col: targetCol,
                    enPassant: true
                });
            }
        }
    }


    /* =====================================================
       KNIGHT
       ===================================================== */

    if (type === "n") {

        const offsets = [
            [-2, -1],
            [-2, 1],
            [-1, -2],
            [-1, 2],
            [1, -2],
            [1, 2],
            [2, -1],
            [2, 1]
        ];


        for (const [dr, dc] of offsets) {

            addMoveIfValid(
                position,
                moves,
                row + dr,
                col + dc,
                color
            );
        }
    }


    /* =====================================================
       BISHOP
       ===================================================== */

    if (type === "b") {

        addSlidingMoves(
            position,
            moves,
            row,
            col,
            color,
            [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1]
            ]
        );
    }


    /* =====================================================
       ROOK
       ===================================================== */

    if (type === "r") {

        addSlidingMoves(
            position,
            moves,
            row,
            col,
            color,
            [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1]
            ]
        );
    }


    /* =====================================================
       QUEEN
       ===================================================== */

    if (type === "q") {

        addSlidingMoves(
            position,
            moves,
            row,
            col,
            color,
            [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1],
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1]
            ]
        );
    }


    /* =====================================================
       KING
       ===================================================== */

    if (type === "k") {

        for (
            let dr = -1;
            dr <= 1;
            dr++
        ) {

            for (
                let dc = -1;
                dc <= 1;
                dc++
            ) {

                if (
                    dr === 0 &&
                    dc === 0
                ) {
                    continue;
                }


                addMoveIfValid(
                    position,
                    moves,
                    row + dr,
                    col + dc,
                    color
                );
            }
        }


        addCastlingMoves(
            position,
            moves,
            row,
            col,
            color
        );
    }


    return moves;
}


/* =========================================================
   ADD NORMAL MOVE
   ========================================================= */

function addMoveIfValid(
    position,
    moves,
    row,
    col,
    color
) {

    if (!isInside(row, col)) {
        return;
    }


    const target =
        position[row][col];


    if (
        !target ||
        target[0] !== color
    ) {

        moves.push({
            row,
            col
        });
    }
}


/* =========================================================
   SLIDING MOVES
   ========================================================= */

function addSlidingMoves(
    position,
    moves,
    row,
    col,
    color,
    directions
) {

    for (const [dr, dc] of directions) {

        let r = row + dr;

        let c = col + dc;


        while (
            isInside(r, c)
        ) {

            const target =
                position[r][c];


            if (!target) {

                moves.push({
                    row: r,
                    col: c
                });

            } else {

                if (
                    target[0] !== color &&
                    target[1] !== "k"
                ) {

                    moves.push({
                        row: r,
                        col: c
                    });
                }

                break;
            }


            r += dr;

            c += dc;
        }
    }
}


/* =========================================================
   CASTLING
   ========================================================= */

function addCastlingMoves(
    position,
    moves,
    row,
    col,
    color
) {

    if (
        isKingInCheck(
            position,
            color
        )
    ) {
        return;
    }


    const opponent =
        color === "w"
            ? "b"
            : "w";


    const kingSideRight =
        color === "w"
            ? castlingRights.wK
            : castlingRights.bK;


    if (
        kingSideRight &&
        position[row][5] === null &&
        position[row][6] === null &&
        position[row][7] === color + "r" &&
        !isSquareAttacked(
            position,
            row,
            5,
            opponent
        ) &&
        !isSquareAttacked(
            position,
            row,
            6,
            opponent
        )
    ) {

        moves.push({
            row,
            col: 6,
            castle: "K"
        });
    }


    const queenSideRight =
        color === "w"
            ? castlingRights.wQ
            : castlingRights.bQ;


    if (
        queenSideRight &&
        position[row][1] === null &&
        position[row][2] === null &&
        position[row][3] === null &&
        position[row][0] === color + "r" &&
        !isSquareAttacked(
            position,
            row,
            2,
            opponent
        ) &&
        !isSquareAttacked(
            position,
            row,
            3,
            opponent
        )
    ) {

        moves.push({
            row,
            col: 2,
            castle: "Q"
        });
    }
}


/* =========================================================
   APPLY MOVE TO TEST BOARD
   ========================================================= */

function applyMoveToBoard(
    position,
    fromRow,
    fromCol,
    move
) {

    const piece =
        position[fromRow][fromCol];


    if (!piece) {
        return;
    }


    if (move.enPassant) {

        const capturedRow =
            piece[0] === "w"
                ? move.row + 1
                : move.row - 1;


        position[capturedRow][move.col] =
            null;
    }


    position[move.row][move.col] =
        piece;


    position[fromRow][fromCol] =
        null;


    if (move.castle === "K") {

        position[move.row][5] =
            position[move.row][7];

        position[move.row][7] =
            null;
    }


    if (move.castle === "Q") {

        position[move.row][3] =
            position[move.row][0];

        position[move.row][0] =
            null;
    }
}


/* =========================================================
   KING IN CHECK
   ========================================================= */

function isKingInCheck(
    position,
    color
) {

    const king =
        findKing(
            position,
            color
        );


    if (!king) {
        return true;
    }


    const opponent =
        color === "w"
            ? "b"
            : "w";


    return isSquareAttacked(
        position,
        king.row,
        king.col,
        opponent
    );
}


/* =========================================================
   FIND KING
   ========================================================= */

function findKing(
    position,
    color
) {

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            if (
                position[row][col] ===
                color + "k"
            ) {

                return {
                    row,
                    col
                };
            }
        }
    }


    return null;
}


/* =========================================================
   SQUARE ATTACKED
   ========================================================= */

function isSquareAttacked(
    position,
    row,
    col,
    attacker
) {

    /* Pawn */

    const pawnRow =
        attacker === "w"
            ? row + 1
            : row - 1;


    for (const dc of [-1, 1]) {

        const pawnCol =
            col + dc;


        if (
            isInside(
                pawnRow,
                pawnCol
            ) &&
            position[pawnRow][pawnCol] ===
            attacker + "p"
        ) {

            return true;
        }
    }


    /* Knight */

    const knightOffsets = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1]
    ];


    for (const [dr, dc] of knightOffsets) {

        const r = row + dr;

        const c = col + dc;


        if (
            isInside(r, c) &&
            position[r][c] ===
            attacker + "n"
        ) {

            return true;
        }
    }


    /* Bishop / Queen */

    const diagonalDirections = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
    ];


    if (
        slidingAttack(
            position,
            row,
            col,
            attacker,
            ["b", "q"],
            diagonalDirections
        )
    ) {

        return true;
    }


    /* Rook / Queen */

    const straightDirections = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
    ];


    if (
        slidingAttack(
            position,
            row,
            col,
            attacker,
            ["r", "q"],
            straightDirections
        )
    ) {

        return true;
    }


    /* King */

    for (let dr = -1; dr <= 1; dr++) {

        for (let dc = -1; dc <= 1; dc++) {

            if (
                dr === 0 &&
                dc === 0
            ) {
                continue;
            }


            const r = row + dr;

            const c = col + dc;


            if (
                isInside(r, c) &&
                position[r][c] ===
                attacker + "k"
            ) {

                return true;
            }
        }
    }


    return false;
}


/* =========================================================
   SLIDING ATTACK
   ========================================================= */

function slidingAttack(
    position,
    row,
    col,
    attacker,
    pieceTypes,
    directions
) {

    for (const [dr, dc] of directions) {

        let r = row + dr;

        let c = col + dc;


        while (
            isInside(r, c)
        ) {

            const piece =
                position[r][c];


            if (piece) {

                if (
                    piece[0] === attacker &&
                    pieceTypes.includes(
                        piece[1]
                    )
                ) {

                    return true;
                }


                break;
            }


            r += dr;

            c += dc;
        }
    }


    return false;
}


/* =========================================================
   ALL LEGAL MOVES
   ========================================================= */

function getAllLegalMoves(
    position,
    color
) {

    const allMoves = [];


    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const piece =
                position[row][col];


            if (
                piece &&
                piece[0] === color
            ) {

                const moves =
                    getLegalMoves(
                        position,
                        row,
                        col,
                        color
                    );


                for (const move of moves) {

                    allMoves.push({
                        fromRow: row,
                        fromCol: col,
                        ...move
                    });
                }
            }
        }
    }


    return allMoves;
}


/* =========================================================
   CHECK GAME STATE
   ========================================================= */

function evaluateGameState() {

    const moves =
        getAllLegalMoves(
            board,
            currentPlayer
        );


    const inCheck =
        isKingInCheck(
            board,
            currentPlayer
        );


    if (moves.length === 0) {

        if (inCheck) {

            const winner =
                currentPlayer === "w"
                    ? "Black"
                    : "White";


            return {
                gameOver: true,
                message:
                    `Checkmate — ${winner} wins!`
            };

        }


        return {
            gameOver: true,
            message:
                "Draw — Stalemate!"
        };
    }


    if (
        isInsufficientMaterial(
            board
        )
    ) {

        return {
            gameOver: true,
            message:
                "Draw — Insufficient material."
        };
    }


    if (halfmoveClock >= 100) {

        return {
            gameOver: true,
            message:
                "Draw — 50-move rule."
        };
    }


    if (
        isThreefoldRepetition()
    ) {

        return {
            gameOver: true,
            message:
                "Draw — Threefold repetition."
        };
    }


    return {
        gameOver: false,
        message: ""
    };
}


/* =========================================================
   FINISH GAME
   ========================================================= */

function finishGame(message) {

    gameOver = true;

    aiThinking = false;

    stopClock();


    if (turnIndicator) {

        turnIndicator.textContent =
            message;
    }


    if (currentStatusElement) {

        currentStatusElement.textContent =
            "Game Over";
    }


    updatePlayerLabels();

    renderBoard();
}


/* =========================================================
   UPDATE STATUS
   ========================================================= */

function updateStatus() {

    if (!turnIndicator) {
        return;
    }


    if (gameOver) {
        return;
    }


    const inCheck =
        isKingInCheck(
            board,
            currentPlayer
        );


    if (aiThinking) {

        turnIndicator.textContent =
            "Computer is thinking…";

        return;
    }


    if (inCheck) {

        turnIndicator.textContent =
            currentPlayer === "w"
                ? "White is in check!"
                : "Black is in check!";

    } else {

        turnIndicator.textContent =
            currentPlayer === "w"
                ? "White's Turn"
                : "Black's Turn";
    }
}


/* =========================================================
   HIGHLIGHT KING IN CHECK
   ========================================================= */

function highlightKingInCheck() {

    const king =
        findKing(
            board,
            currentPlayer
        );


    if (
        !king ||
        !isKingInCheck(
            board,
            currentPlayer
        )
    ) {

        return;
    }


    const squares =
        chessBoard.querySelectorAll(
            ".square"
        );


    let index;


    if (boardFlipped) {

        index =
            (7 - king.row) * 8 +
            (7 - king.col);

    } else {

        index =
            king.row * 8 +
            king.col;
    }


    if (squares[index]) {

        squares[index].classList.add(
            "in-check"
        );
    }
}


/* =========================================================
   CASTLING RIGHTS
   ========================================================= */

function updateCastlingRights(
    movingPiece,
    fromRow,
    fromCol,
    capturedPiece,
    toRow,
    toCol
) {

    if (movingPiece === "wk") {

        castlingRights.wK = false;

        castlingRights.wQ = false;
    }


    if (movingPiece === "bk") {

        castlingRights.bK = false;

        castlingRights.bQ = false;
    }


    if (
        movingPiece === "wr" &&
        fromRow === 7 &&
        fromCol === 7
    ) {

        castlingRights.wK = false;
    }


    if (
        movingPiece === "wr" &&
        fromRow === 7 &&
        fromCol === 0
    ) {

        castlingRights.wQ = false;
    }


    if (
        movingPiece === "br" &&
        fromRow === 0 &&
        fromCol === 7
    ) {

        castlingRights.bK = false;
    }


    if (
        movingPiece === "br" &&
        fromRow === 0 &&
        fromCol === 0
    ) {

        castlingRights.bQ = false;
    }


    if (
        capturedPiece === "wr" &&
        toRow === 7 &&
        toCol === 7
    ) {

        castlingRights.wK = false;
    }


    if (
        capturedPiece === "wr" &&
        toRow === 7 &&
        toCol === 0
    ) {

        castlingRights.wQ = false;
    }


    if (
        capturedPiece === "br" &&
        toRow === 0 &&
        toCol === 7
    ) {

        castlingRights.bK = false;
    }


    if (
        capturedPiece === "br" &&
        toRow === 0 &&
        toCol === 0
    ) {

        castlingRights.bQ = false;
    }
}


/* =========================================================
   MOVE NOTATION
   ========================================================= */

function createMoveNotation(
    piece,
    fromRow,
    fromCol,
    toRow,
    toCol,
    capturedPiece,
    moveData
) {

    const files =
        "abcdefgh";


    const toSquare =
        files[toCol] +
        (8 - toRow);


    if (moveData.castle === "K") {
        return "O-O";
    }


    if (moveData.castle === "Q") {
        return "O-O-O";
    }


    const pieceLetter =
        piece[1] === "p"
            ? ""
            : piece[1].toUpperCase();


    const isCapture =
        Boolean(capturedPiece) ||
        Boolean(moveData.enPassant);


    if (piece[1] === "p") {

        if (isCapture) {

            return (
                files[fromCol] +
                "x" +
                toSquare
            );
        }


        return toSquare;
    }


    return (
        pieceLetter +
        (isCapture ? "x" : "") +
        toSquare
    );
}


/* =========================================================
   MOVE HISTORY
   ========================================================= */

function updateMoveHistory() {

    if (!moveHistoryElement) {
        return;
    }


    if (moveHistory.length === 0) {

        moveHistoryElement.innerHTML =
            '<p class="empty-history">No moves yet</p>';

    } else {

        moveHistoryElement.innerHTML = "";


        for (
            let i = 0;
            i < moveHistory.length;
            i += 2
        ) {

            const row =
                document.createElement("div");


            row.className =
                "move-row";


            const number =
                document.createElement("span");


            number.className =
                "move-number";


            number.textContent =
                `${Math.floor(i / 2) + 1}.`;


            const white =
                document.createElement("span");


            white.textContent =
                moveHistory[i] || "";


            const black =
                document.createElement("span");


            black.textContent =
                moveHistory[i + 1] || "";


            row.appendChild(number);

            row.appendChild(white);

            row.appendChild(black);


            moveHistoryElement.appendChild(
                row
            );
        }
    }


    if (moveCountElement) {

        const count =
            moveHistory.length;


        moveCountElement.textContent =
            `${count} ${count === 1 ? "move" : "moves"}`;
    }


    moveHistoryElement.scrollTop =
        moveHistoryElement.scrollHeight;
}


/* =========================================================
   CAPTURED PIECES
   ========================================================= */

function updateCapturedPieces() {

    if (!whiteCaptured || !blackCaptured) {
        return;
    }


    whiteCaptured.innerHTML = "";

    blackCaptured.innerHTML = "";


    const whiteOriginal = [
        "wp", "wp", "wp", "wp",
        "wp", "wp", "wp", "wp",
        "wr", "wr",
        "wn", "wn",
        "wb", "wb",
        "wq"
    ];


    const blackOriginal = [
        "bp", "bp", "bp", "bp",
        "bp", "bp", "bp", "bp",
        "br", "br",
        "bn", "bn",
        "bb", "bb",
        "bq"
    ];


    const currentWhite = [];

    const currentBlack = [];


    for (const row of board) {

        for (const piece of row) {

            if (!piece) {
                continue;
            }


            if (piece[0] === "w") {

                currentWhite.push(piece);

            } else {

                currentBlack.push(piece);
            }
        }
    }


    const whiteCapturedPieces =
        getMissingPieces(
            whiteOriginal,
            currentWhite
        );


    const blackCapturedPieces =
        getMissingPieces(
            blackOriginal,
            currentBlack
        );


    for (
        const piece of blackCapturedPieces
    ) {

        const element =
            document.createElement("span");

        element.textContent =
            PIECES[piece[0]][piece[1]];

        whiteCaptured.appendChild(
            element
        );
    }


    for (
        const piece of whiteCapturedPieces
    ) {

        const element =
            document.createElement("span");

        element.textContent =
            PIECES[piece[0]][piece[1]];

        blackCaptured.appendChild(
            element
        );
    }
}


/* =========================================================
   GET MISSING PIECES
   ========================================================= */

function getMissingPieces(
    original,
    current
) {

    const remaining =
        [...current];

    const missing = [];


    for (const piece of original) {

        const index =
            remaining.indexOf(piece);


        if (index >= 0) {

            remaining.splice(
                index,
                1
            );

        } else {

            missing.push(piece);
        }
    }


    return missing;
}


/* =========================================================
   PLAYER LABELS
   ========================================================= */

function updatePlayerLabels() {

    if (!whitePlayerName || !blackPlayerName) {
        return;
    }


    if (gameMode === "computer") {

        if (playerColor === "w") {

            whitePlayerName.textContent =
                "You";

            blackPlayerName.textContent =
                "Computer";

        } else {

            whitePlayerName.textContent =
                "Computer";

            blackPlayerName.textContent =
                "You";
        }

    } else if (gameMode === "local") {

        whitePlayerName.textContent =
            "White";

        blackPlayerName.textContent =
            "Black";

    } else {

        whitePlayerName.textContent =
            "White";

        blackPlayerName.textContent =
            "Black";
    }


    if (whitePlayerStatus) {

        whitePlayerStatus.textContent =
            currentPlayer === "w"
                ? "Your Turn"
                : "Waiting";
    }


    if (blackPlayerStatus) {

        blackPlayerStatus.textContent =
            currentPlayer === "b"
                ? "Your Turn"
                : "Waiting";
    }
}


/* =========================================================
   GAME INFO
   ========================================================= */

function updateGameInfo() {

    if (currentModeElement) {

        currentModeElement.textContent =
            gameMode === "computer"
                ? "Computer"
                : gameMode === "local"
                    ? "2 Players"
                    : "Online";
    }


    if (currentDifficultyElement) {

        currentDifficultyElement.textContent =
            difficulty.charAt(0).toUpperCase() +
            difficulty.slice(1);
    }


    if (currentStatusElement) {

        if (gameOver) {

            currentStatusElement.textContent =
                "Game Over";

        } else if (aiThinking) {

            currentStatusElement.textContent =
                "Thinking";

        } else {

            currentStatusElement.textContent =
                "Playing";
        }
    }
}


/* =========================================================
   CHESS CLOCK SETUP
   ========================================================= */

function setupClock() {

    const value =
        timeControlSelect
            ? timeControlSelect.value
            : "unlimited";


    stopClock();


    if (value === "unlimited") {

        whiteTime = null;

        blackTime = null;

        incrementSeconds = 0;

        updateClockDisplay();

        return;
    }


    const parts =
        value.split("+");


    const minutes =
        Number(parts[0]);


    incrementSeconds =
        Number(parts[1] || 0);


    whiteTime =
        minutes * 60;

    blackTime =
        minutes * 60;


    updateClockDisplay();
}


/* =========================================================
   START CLOCK
   ========================================================= */

function startClockIfNeeded() {

    if (
        whiteTime === null ||
        blackTime === null ||
        gameOver
    ) {
        return;
    }


    if (clockRunning) {
        return;
    }


    clockRunning = true;


    clockInterval =
        window.setInterval(
            () => {

                if (gameOver) {

                    stopClock();

                    return;
                }


                if (currentPlayer === "w") {

                    whiteTime--;

                } else {

                    blackTime--;
                }


                updateClockDisplay();


                if (
                    whiteTime <= 0
                ) {

                    whiteTime = 0;

                    finishGame(
                        "Time — Black wins!"
                    );

                    return;
                }


                if (
                    blackTime <= 0
                ) {

                    blackTime = 0;

                    finishGame(
                        "Time — White wins!"
                    );
                }

            },
            1000
        );
}


/* =========================================================
   STOP CLOCK
   ========================================================= */

function stopClock() {

    if (clockInterval !== null) {

        window.clearInterval(
            clockInterval
        );
    }


    clockInterval = null;

    clockRunning = false;
}


/* =========================================================
   CLOCK DISPLAY
   ========================================================= */

function updateClockDisplay() {

    if (whiteClock) {

        const value =
            whiteTime === null
                ? "∞"
                : formatTime(whiteTime);


        const span =
            whiteClock.querySelector("span");


        if (span) {
            span.textContent = value;
        }


        whiteClock.classList.toggle(
            "active",
            currentPlayer === "w" &&
            !gameOver
        );
    }


    if (blackClock) {

        const value =
            blackTime === null
                ? "∞"
                : formatTime(blackTime);


        const span =
            blackClock.querySelector("span");


        if (span) {
            span.textContent = value;
        }


        blackClock.classList.toggle(
            "active",
            currentPlayer === "b" &&
            !gameOver
        );
    }
}


/* =========================================================
   FORMAT CLOCK
   ========================================================= */

function formatTime(seconds) {

    const safeSeconds =
        Math.max(
            0,
            Math.floor(seconds)
        );


    const minutes =
        Math.floor(
            safeSeconds / 60
        );


    const secs =
        safeSeconds % 60;


    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
}


/* =========================================================
   ADD INCREMENT
   ========================================================= */

function addClockIncrement(color) {

    if (
        incrementSeconds <= 0
    ) {
        return;
    }


    if (color === "w") {

        whiteTime +=
            incrementSeconds;

    } else {

        blackTime +=
            incrementSeconds;
    }


    updateClockDisplay();
}


/* =========================================================
   AI MOVE
   ========================================================= */

function triggerComputerMove() {

    if (
        gameOver ||
        gameMode !== "computer" ||
        currentPlayer !== aiColor ||
        aiThinking
    ) {
        return;
    }


    aiThinking = true;


    selectedSquare = null;

    legalMoves = [];


    updateStatus();

    updateGameInfo();

    renderBoard();


    const delay =
        difficulty === "easy"
            ? 350
            : difficulty === "medium"
                ? 500
                : difficulty === "hard"
                    ? 700
                    : 900;


    window.setTimeout(
        () => {

            if (gameOver) {

                aiThinking = false;

                return;
            }


            const move =
                chooseComputerMove();


            if (!move) {

                aiThinking = false;

                const result =
                    evaluateGameState();


                if (result.gameOver) {

                    finishGame(
                        result.message
                    );
                }

                return;
            }


            aiThinking = false;


            makeMove(
                move.fromRow,
                move.fromCol,
                move.row,
                move.col,
                move,
                false
            );

        },
        delay
    );
}


/* =========================================================
   CHOOSE COMPUTER MOVE
   ========================================================= */

function chooseComputerMove() {

    const moves =
        getAllLegalMoves(
            board,
            aiColor
        );


    if (moves.length === 0) {
        return null;
    }


    if (difficulty === "easy") {

        return chooseEasyMove(moves);
    }


    let depth = 2;


    if (difficulty === "medium") {
        depth = 2;
    }


    if (difficulty === "hard") {
        depth = 3;
    }


    if (difficulty === "expert") {
        depth = 3;
    }


    let bestMove = null;

    let bestScore = -Infinity;


    const orderedMoves =
        orderMoves(
            board,
            moves
        );


    for (const move of orderedMoves) {

        const test =
            createSimulatedState(
                board,
                move,
                aiColor
            );


        const score =
            minimax(
                test.board,
                oppositeColor(aiColor),
                depth - 1,
                -Infinity,
                Infinity,
                aiColor,
                test.castlingRights,
                test.enPassantTarget
            );


        if (
            score > bestScore
        ) {

            bestScore = score;

            bestMove = move;
        }
    }


    return bestMove || moves[0];
}


/* =========================================================
   EASY AI
   ========================================================= */

function chooseEasyMove(moves) {

    const captures =
        moves.filter(
            move =>
                board[move.row][move.col] !== null ||
                move.enPassant
        );


    if (
        captures.length &&
        Math.random() < 0.65
    ) {

        return captures[
            Math.floor(
                Math.random() *
                captures.length
            )
        ];
    }


    return moves[
        Math.floor(
            Math.random() *
            moves.length
        )
    ];
}


/* =========================================================
   MINIMAX
   ========================================================= */

function minimax(
    position,
    color,
    depth,
    alpha,
    beta,
    maximizingColor,
    rights,
    epTarget
) {

    const moves =
        getAllLegalMovesForState(
            position,
            color,
            rights,
            epTarget
        );


    if (moves.length === 0) {

        if (
            isKingInCheck(
                position,
                color
            )
        ) {

            if (
                color === maximizingColor
            ) {

                return -100000 - depth;

            } else {

                return 100000 + depth;
            }

        }


        return 0;
    }


    if (depth <= 0) {

        return evaluatePosition(
            position,
            maximizingColor
        );
    }


    const maximizing =
        color === maximizingColor;


    if (maximizing) {

        let value = -Infinity;


        for (const move of moves) {

            const next =
                createSimulatedState(
                    position,
                    move,
                    color,
                    rights,
                    epTarget
                );


            const score =
                minimax(
                    next.board,
                    oppositeColor(color),
                    depth - 1,
                    alpha,
                    beta,
                    maximizingColor,
                    next.castlingRights,
                    next.enPassantTarget
                );


            value =
                Math.max(
                    value,
                    score
                );


            alpha =
                Math.max(
                    alpha,
                    value
                );


            if (alpha >= beta) {
                break;
            }
        }


        return value;

    } else {

        let value = Infinity;


        for (const move of moves) {

            const next =
                createSimulatedState(
                    position,
                    move,
                    color,
                    rights,
                    epTarget
                );


            const score =
                minimax(
                    next.board,
                    oppositeColor(color),
                    depth - 1,
                    alpha,
                    beta,
                    maximizingColor,
                    next.castlingRights,
                    next.enPassantTarget
                );


            value =
                Math.min(
                    value,
                    score
                );


            beta =
                Math.min(
                    beta,
                    value
                );


            if (alpha >= beta) {
                break;
            }
        }


        return value;
    }
}


/* =========================================================
   SIMULATED STATE
   ========================================================= */

function createSimulatedState(
    position,
    move,
    color,
    rightsOverride = castlingRights,
    epOverride = enPassantTarget
) {

    const nextBoard =
        cloneBoard(position);


    const nextRights =
        {
            ...rightsOverride
        };


    const nextEP =
        epOverride
            ? {
                ...epOverride
            }
            : null;


    const movingPiece =
        nextBoard[
            move.fromRow
        ][
            move.fromCol
        ];


    const capturedPiece =
        nextBoard[
            move.row
        ][
            move.col
        ];


    if (move.enPassant) {

        const capturedRow =
            color === "w"
                ? move.row + 1
                : move.row - 1;


        nextBoard[
            capturedRow
        ][
            move.col
        ] = null;
    }


    nextBoard[
        move.row
    ][
        move.col
    ] =
        movingPiece;


    nextBoard[
        move.fromRow
    ][
        move.fromCol
    ] = null;


    if (move.castle === "K") {

        nextBoard[move.row][5] =
            nextBoard[move.row][7];

        nextBoard[move.row][7] =
            null;
    }


    if (move.castle === "Q") {

        nextBoard[move.row][3] =
            nextBoard[move.row][0];

        nextBoard[move.row][0] =
            null;
    }


    updateRightsForState(
        nextRights,
        movingPiece,
        move.fromRow,
        move.fromCol,
        capturedPiece,
        move.row,
        move.col
    );


    let newEP = null;


    if (
        movingPiece &&
        movingPiece[1] === "p" &&
        Math.abs(
            move.row -
            move.fromRow
        ) === 2
    ) {

        newEP = {
            row:
                (
                    move.row +
                    move.fromRow
                ) / 2,
            col:
                move.fromCol
        };
    }


    /* AI always promotes to queen */

    if (
        movingPiece &&
        movingPiece[1] === "p" &&
        (
            move.row === 0 ||
            move.row === 7
        )
    ) {

        nextBoard[
            move.row
        ][
            move.col
        ] =
            color + "q";
    }


    return {
        board: nextBoard,
        castlingRights: nextRights,
        enPassantTarget: newEP
    };
}


/* =========================================================
   STATE CASTLING RIGHTS
   ========================================================= */

function updateRightsForState(
    rights,
    movingPiece,
    fromRow,
    fromCol,
    capturedPiece,
    toRow,
    toCol
) {

    if (movingPiece === "wk") {

        rights.wK = false;
        rights.wQ = false;
    }


    if (movingPiece === "bk") {

        rights.bK = false;
        rights.bQ = false;
    }


    if (
        movingPiece === "wr" &&
        fromRow === 7 &&
        fromCol === 7
    ) {

        rights.wK = false;
    }


    if (
        movingPiece === "wr" &&
        fromRow === 7 &&
        fromCol === 0
    ) {

        rights.wQ = false;
    }


    if (
        movingPiece === "br" &&
        fromRow === 0 &&
        fromCol === 7
    ) {

        rights.bK = false;
    }


    if (
        movingPiece === "br" &&
        fromRow === 0 &&
        fromCol === 0
    ) {

        rights.bQ = false;
    }


    if (
        capturedPiece === "wr" &&
        toRow === 7 &&
        toCol === 7
    ) {

        rights.wK = false;
    }


    if (
        capturedPiece === "wr" &&
        toRow === 7 &&
        toCol === 0
    ) {

        rights.wQ = false;
    }


    if (
        capturedPiece === "br" &&
        toRow === 0 &&
        toCol === 7
    ) {

        rights.bK = false;
    }


    if (
        capturedPiece === "br" &&
        toRow === 0 &&
        toCol === 0
    ) {

        rights.bQ = false;
    }
}


/* =========================================================
   LEGAL MOVES FOR AI STATE
   ========================================================= */

function getAllLegalMovesForState(
    position,
    color,
    rights,
    epTarget
) {

    const originalRights =
        castlingRights;

    const originalEP =
        enPassantTarget;


    castlingRights =
        rights;


    enPassantTarget =
        epTarget;


    const moves =
        getAllLegalMoves(
            position,
            color
        );


    castlingRights =
        originalRights;


    enPassantTarget =
        originalEP;


    return moves;
}


/* =========================================================
   MOVE ORDERING
   ========================================================= */

function orderMoves(
    position,
    moves
) {

    return [...moves].sort(
        (a, b) => {

            return (
                movePriority(
                    position,
                    b
                ) -
                movePriority(
                    position,
                    a
                )
            );
        }
    );
}


/* =========================================================
   MOVE PRIORITY
   ========================================================= */

function movePriority(
    position,
    move
) {

    let score = 0;


    const target =
        position[
            move.row
        ][
            move.col
        ];


    if (target) {

        score +=
            pieceValue(
                target[1]
            ) * 10;
    }


    if (move.enPassant) {
        score += 100;
    }


    if (move.castle) {
        score += 50;
    }


    const movingPiece =
        position[
            move.fromRow
        ][
            move.fromCol
        ];


    if (
        movingPiece &&
        movingPiece[1] === "p" &&
        (
            move.row === 0 ||
            move.row === 7
        )
    ) {

        score += 900;
    }


    return score;
}


/* =========================================================
   POSITION EVALUATION
   ========================================================= */

function evaluatePosition(
    position,
    perspective
) {

    let score = 0;


    const values = {
        p: 100,
        n: 320,
        b: 330,
        r: 500,
        q: 900,
        k: 20000
    };


    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const piece =
                position[row][col];


            if (!piece) {
                continue;
            }


            const value =
                values[piece[1]];


            let positional = 0;


            if (piece[1] === "p") {

                const advance =
                    piece[0] === "w"
                        ? 6 - row
                        : row - 1;


                positional =
                    advance * 8;
            }


            if (piece[1] === "n") {

                const centerDistance =
                    Math.abs(
                        3.5 - row
                    ) +
                    Math.abs(
                        3.5 - col
                    );


                positional =
                    Math.max(
                        0,
                        30 -
                        centerDistance * 8
                    );
            }


            if (piece[1] === "b") {

                positional =
                    (
                        3.5 -
                        Math.abs(3.5 - col)
                    ) * 4;
            }


            if (piece[1] === "q") {

                positional =
                    (
                        3.5 -
                        Math.abs(3.5 - col)
                    ) * 2;
            }


            const total =
                value +
                positional;


            if (
                piece[0] === perspective
            ) {

                score += total;

            } else {

                score -= total;
            }
        }
    }


    const ownMoves =
        getAllPseudoSafeMoves(
            position,
            perspective
        );


    const enemyMoves =
        getAllPseudoSafeMoves(
            position,
            oppositeColor(
                perspective
            )
        );


    score +=
        (
            ownMoves.length -
            enemyMoves.length
        ) * 2;


    if (
        isKingInCheck(
            position,
            oppositeColor(
                perspective
            )
        )
    ) {

        score += 35;
    }


    if (
        isKingInCheck(
            position,
            perspective
        )
    ) {

        score -= 35;
    }


    return score;
}


/* =========================================================
   SAFE MOVE COUNT
   ========================================================= */

function getAllPseudoSafeMoves(
    position,
    color
) {

    let count = 0;


    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const piece =
                position[row][col];


            if (
                piece &&
                piece[0] === color
            ) {

                const pseudo =
                    getPseudoLegalMoves(
                        position,
                        row,
                        col,
                        color
                    );


                for (const move of pseudo) {

                    const test =
                        cloneBoard(
                            position
                        );


                    applyMoveToBoard(
                        test,
                        row,
                        col,
                        move
                    );


                    if (
                        !isKingInCheck(
                            test,
                            color
                        )
                    ) {

                        count++;
                    }
                }
            }
        }
    }


    return count;
}


/* =========================================================
   PIECE VALUE
   ========================================================= */

function pieceValue(type) {

    const values = {
        p: 100,
        n: 320,
        b: 330,
        r: 500,
        q: 900,
        k: 20000
    };


    return values[type] || 0;
}


/* =========================================================
   OPPOSITE COLOR
   ========================================================= */

function oppositeColor(color) {

    return color === "w"
        ? "b"
        : "w";
}


/* =========================================================
   INSUFFICIENT MATERIAL
   ========================================================= */

function isInsufficientMaterial(
    position
) {

    const pieces = [];


    for (const row of position) {

        for (const piece of row) {

            if (piece) {

                pieces.push(piece);
            }
        }
    }


    /* King vs King */

    if (
        pieces.length === 2
    ) {

        return true;
    }


    /* King + minor vs King */

    if (
        pieces.length === 3 &&
        pieces.some(
            piece =>
                ["b", "n"].includes(
                    piece[1]
                )
        )
    ) {

        return true;
    }


    /* King + bishop vs King + bishop
       with bishops on same color */

    if (
        pieces.length === 4 &&
        pieces.every(
            piece =>
                piece[1] === "k" ||
                piece[1] === "b"
        )
    ) {

        const bishops = [];


        for (let row = 0; row < 8; row++) {

            for (let col = 0; col < 8; col++) {

                const piece =
                    position[row][col];


                if (
                    piece &&
                    piece[1] === "b"
                ) {

                    bishops.push(
                        (row + col) % 2
                    );
                }
            }
        }


        if (
            bishops.length === 2 &&
            bishops[0] === bishops[1]
        ) {

            return true;
        }
    }


    return false;
}


/* =========================================================
   POSITION KEY
   ========================================================= */

function getPositionKey() {

    const boardKey =
        board
            .map(
                row =>
                    row
                        .map(
                            piece =>
                                piece || "--"
                        )
                        .join(",")
            )
            .join("/");


    const rights =
        [
            castlingRights.wK
                ? "K"
                : "",
            castlingRights.wQ
                ? "Q"
                : "",
            castlingRights.bK
                ? "k"
                : "",
            castlingRights.bQ
                ? "q"
                : ""
        ].join("");


    const ep =
        enPassantTarget
            ? `${enPassantTarget.row},${enPassantTarget.col}`
            : "-";


    return (
        boardKey +
        "|" +
        currentPlayer +
        "|" +
        rights +
        "|" +
        ep
    );
}


/* =========================================================
   THREEFOLD REPETITION
   ========================================================= */

function isThreefoldRepetition() {

    const current =
        getPositionKey();


    let count = 0;


    for (
        const position of positionHistory
    ) {

        if (
            position === current
        ) {

            count++;
        }
    }


    return count >= 3;
}


/* =========================================================
   RESIGN
   ========================================================= */

function resignGame() {

    if (gameOver) {
        return;
    }


    if (gameMode === "online") {

        window.alert(
            "Online multiplayer will be connected in the next stage."
        );

        return;
    }


    const confirmed =
        window.confirm(
            "Are you sure you want to resign?"
        );


    if (!confirmed) {
        return;
    }


    const winner =
        currentPlayer === "w"
            ? "Black"
            : "White";


    finishGame(
        `${winner} wins — opponent resigned.`
    );
}


/* =========================================================
   DRAW
   ========================================================= */

function offerDraw() {

    if (gameOver) {
        return;
    }


    if (gameMode === "online") {

        window.alert(
            "Online draw offers will be connected in the multiplayer stage."
        );

        return;
    }


    const accepted =
        window.confirm(
            "Offer a draw?\n\n" +
            "For this local game, accepting the dialog will end the game."
        );


    if (accepted) {

        finishGame(
            "Draw — Agreement."
        );
    }
}


/* =========================================================
   ONLINE ROOM — TEMPORARY UI
   ========================================================= */

function createOnlineRoom() {

    if (gameMode !== "online") {
        return;
    }


    const code =
        generateRoomCode();


    if (roomCodeDisplay) {

        roomCodeDisplay.textContent =
            code;
    }


    if (roomInfo) {

        roomInfo.hidden = false;
    }


    window.alert(
        "Room created.\n\n" +
        "Your room code is: " +
        code +
        "\n\n" +
        "Real-time online multiplayer will be connected in the next stage."
    );
}


/* =========================================================
   JOIN ROOM — TEMPORARY UI
   ========================================================= */

function joinOnlineRoom() {

    const code =
        roomCodeInput
            ? roomCodeInput.value
                .trim()
                .toUpperCase()
            : "";


    if (!code) {

        window.alert(
            "Please enter a room code."
        );

        return;
    }


    window.alert(
        "Room code received: " +
        code +
        "\n\n" +
        "Real-time online multiplayer will be connected in the next stage."
    );
}


/* =========================================================
   GENERATE ROOM CODE
   ========================================================= */

function generateRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let result = "";


    for (let i = 0; i < 6; i++) {

        result +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];
    }


    return result;
}


/* =========================================================
   COPY ROOM CODE
   ========================================================= */

async function copyRoomCode() {

    if (!roomCodeDisplay) {
        return;
    }


    const code =
        roomCodeDisplay.textContent;


    if (
        !code ||
        code === "------"
    ) {
        return;
    }


    try {

        await navigator.clipboard.writeText(
            code
        );


        window.alert(
            "Room code copied: " +
            code
        );

    } catch (error) {

        window.alert(
            "Room code: " +
            code
        );
    }
}


/* =========================================================
   BOARD FLIP
   ========================================================= */

function flipBoard() {

    boardFlipped =
        !boardFlipped;


    renderBoard();
}


/* =========================================================
   KEYBOARD SHORTCUT
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key.toLowerCase() ===
            "f"
        ) {

            flipBoard();
        }


        if (
            event.key.toLowerCase() ===
            "n"
        ) {

            resetGame(true);
        }
    }
);


/* =========================================================
   START GAME
   ========================================================= */

initGame();
