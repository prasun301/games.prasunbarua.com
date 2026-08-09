/* =========================================================
   PRASUN GAMES — CHESS ENGINE
   Local 2-player chess
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
    [
        "br", "bn", "bb", "bq",
        "bk", "bb", "bn", "br"
    ],

    [
        "bp", "bp", "bp", "bp",
        "bp", "bp", "bp", "bp"
    ],

    [
        null, null, null, null,
        null, null, null, null
    ],

    [
        null, null, null, null,
        null, null, null, null
    ],

    [
        null, null, null, null,
        null, null, null, null
    ],

    [
        null, null, null, null,
        null, null, null, null
    ],

    [
        "wp", "wp", "wp", "wp",
        "wp", "wp", "wp", "wp"
    ],

    [
        "wr", "wn", "wb", "wq",
        "wk", "wb", "wn", "wr"
    ]
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


/* =========================================================
   INITIALIZE
   ========================================================= */

function initGame() {

    renderBoard();

    updateStatus();

    updateMoveHistory();
}


/* =========================================================
   CLONE BOARD
   ========================================================= */

function cloneBoard(source) {

    return source.map(row => [...row]);

}


/* =========================================================
   RENDER BOARD
   ========================================================= */

function renderBoard() {

    chessBoard.innerHTML = "";

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

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


            const piece = board[row][col];

            if (piece) {

                const pieceElement =
                    document.createElement("div");

                pieceElement.className = "piece";

                pieceElement.textContent =
                    PIECES[piece[0]][piece[1]];

                pieceElement.dataset.row = row;
                pieceElement.dataset.col = col;

                square.appendChild(pieceElement);
            }


            if (
                selectedSquare &&
                selectedSquare.row === row &&
                selectedSquare.col === col
            ) {

                square.classList.add("selected");

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


            chessBoard.appendChild(square);
        }
    }


    highlightKingInCheck();
}


/* =========================================================
   HANDLE CLICK
   ========================================================= */

function handleSquareClick(event) {

    if (gameOver) {
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


    /* -----------------------------------------------------
       If a piece is already selected
       ----------------------------------------------------- */

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
                targetMove
            );

            return;
        }


        /* Select another own piece */

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


    /* -----------------------------------------------------
       Select own piece
       ----------------------------------------------------- */

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
    moveData
) {

    const movingPiece =
        board[fromRow][fromCol];

    const capturedPiece =
        board[toRow][toCol];


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


    /* -----------------------------------------------------
       En passant capture
       ----------------------------------------------------- */

    if (moveData.enPassant) {

        const capturedPawnRow =
            currentPlayer === "w"
                ? toRow + 1
                : toRow - 1;

        board[capturedPawnRow][toCol] = null;
    }


    board[toRow][toCol] =
        board[fromRow][fromCol];

    board[fromRow][fromCol] = null;


    /* -----------------------------------------------------
       Castling
       ----------------------------------------------------- */

    if (moveData.castle === "K") {

        board[toRow][5] =
            board[toRow][7];

        board[toRow][7] = null;
    }


    if (moveData.castle === "Q") {

        board[toRow][3] =
            board[toRow][0];

        board[toRow][0] = null;
    }


    /* -----------------------------------------------------
       Update castling rights
       ----------------------------------------------------- */

    updateCastlingRights(
        movingPiece,
        fromRow,
        fromCol,
        capturedPiece,
        toRow,
        toCol
    );


    /* -----------------------------------------------------
       En passant target
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Pawn promotion
       ----------------------------------------------------- */

    if (
        movingPiece[1] === "p" &&
        (toRow === 0 || toRow === 7)
    ) {

        promotePawn(
            toRow,
            toCol,
            movingPiece[0]
        );

        notation += "=Q";
    }


    moveHistory.push(notation);


    currentPlayer =
        currentPlayer === "w"
            ? "b"
            : "w";


    selectedSquare = null;

    legalMoves = [];


    updateMoveHistory();

    renderBoard();

    checkGameState();
}


/* =========================================================
   PROMOTION
   ========================================================= */

function promotePawn(row, col, color) {

    const choice =
        prompt(
            "Promote your pawn to:\n\n" +
            "Q = Queen\n" +
            "R = Rook\n" +
            "B = Bishop\n" +
            "N = Knight",
            "Q"
        );


    const selected =
        String(choice || "Q")
            .toLowerCase();


    const allowed =
        ["q", "r", "b", "n"];


    const pieceType =
        allowed.includes(selected)
            ? selected
            : "q";


    board[row][col] =
        color + pieceType;
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

    const type =
        piece[1];

    const moves = [];


    /* =====================================================
       PAWN
       ===================================================== */

    if (type === "p") {

        const direction =
            color === "w" ? -1 : 1;

        const startRow =
            color === "w" ? 6 : 1;


        /* Forward */

        const oneRow =
            row + direction;


        if (
            isInside(oneRow, col) &&
            !position[oneRow][col]
        ) {

            moves.push({
                row: oneRow,
                col
            });


            /* Double move */

            const twoRow =
                row + direction * 2;


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


        /* Captures */

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


            /* En passant */

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

        for (let dr = -1; dr <= 1; dr++) {

            for (let dc = -1; dc <= 1; dc++) {

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


        /* Castling */

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
   SLIDING PIECES
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

                if (target[0] !== color) {

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
        color === "w" ? "b" : "w";


    /* -----------------------------------------------------
       King side
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Queen side
       ----------------------------------------------------- */

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


    if (move.enPassant) {

        const capturedRow =
            piece[0] === "w"
                ? move.row + 1
                : move.row - 1;

        position[capturedRow][move.col] = null;
    }


    position[move.row][move.col] =
        piece;

    position[fromRow][fromCol] = null;


    if (move.castle === "K") {

        position[move.row][5] =
            position[move.row][7];

        position[move.row][7] = null;
    }


    if (move.castle === "Q") {

        position[move.row][3] =
            position[move.row][0];

        position[move.row][0] = null;
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
        color === "w" ? "b" : "w";


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

    /* -----------------------------------------------------
       Pawn attacks
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Knight attacks
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Bishop / Queen diagonals
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       Rook / Queen lines
       ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       King attacks
       ----------------------------------------------------- */

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
   CHECK GAME STATE
   ========================================================= */

function checkGameState() {

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

        gameOver = true;


        if (inCheck) {

            turnIndicator.textContent =
                (
                    currentPlayer === "w"
                        ? "White"
                        : "Black"
                ) +
                " is checkmated! " +
                (
                    currentPlayer === "w"
                        ? "Black"
                        : "White"
                ) +
                " wins!";

        } else {

            turnIndicator.textContent =
                "Draw — Stalemate!";
        }


        return;
    }


    if (inCheck) {

        turnIndicator.textContent =
            (
                currentPlayer === "w"
                    ? "White"
                    : "Black"
            ) +
            " is in check!";

    } else {

        updateStatus();
    }
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


                allMoves.push(
                    ...moves
                );
            }
        }
    }


    return allMoves;
}


/* =========================================================
   KING CHECK HIGHLIGHT
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


    const index =
        king.row * 8 +
        king.col;


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

    if (
        movingPiece === "wk"
    ) {

        castlingRights.wK = false;

        castlingRights.wQ = false;
    }


    if (
        movingPiece === "bk"
    ) {

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


    /* Captured rook */

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


    const fromSquare =
        files[fromCol] +
        (8 - fromRow);


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


    const capture =
        capturedPiece ||
        moveData.enPassant
            ? "x"
            : "-";


    if (piece[1] === "p") {

        if (capture === "x") {

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
        fromSquare +
        capture +
        toSquare
    );
}


/* =========================================================
   UPDATE STATUS
   ========================================================= */

function updateStatus() {

    if (gameOver) {
        return;
    }


    turnIndicator.textContent =
        currentPlayer === "w"
            ? "White's Turn"
            : "Black's Turn";
}


/* =========================================================
   UPDATE MOVE HISTORY
   ========================================================= */

function updateMoveHistory() {

    if (moveHistory.length === 0) {

        moveHistoryElement.innerHTML =
            '<p class="empty-history">No moves yet</p>';

        return;
    }


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


        moveHistoryElement.appendChild(row);
    }


    moveHistoryElement.scrollTop =
        moveHistoryElement.scrollHeight;
}


/* =========================================================
   RESET GAME
   ========================================================= */

function resetGame() {

    board =
        cloneBoard(
            INITIAL_BOARD
        );


    currentPlayer = "w";

    selectedSquare = null;

    legalMoves = [];

    moveHistory = [];

    gameOver = false;

    enPassantTarget = null;


    castlingRights = {
        wK: true,
        wQ: true,
        bK: true,
        bQ: true
    };


    updateMoveHistory();

    updateStatus();

    renderBoard();
}


/* =========================================================
   UTILITY
   ========================================================= */

function isInside(row, col) {

    return (
        row >= 0 &&
        row < 8 &&
        col >= 0 &&
        col < 8
    );
}


/* =========================================================
   NEW GAME BUTTON
   ========================================================= */

newGameButton.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                "Start a new chess game?"
            );


        if (confirmed) {

            resetGame();
        }
    }
);


/* =========================================================
   START
   ========================================================= */

initGame();
