"use strict";

/* =========================================================================
   PRASUN GAMES — CHECKERS
   Professional Local 2-Player American Checkers
   =========================================================================
   Features:
   • 8 × 8 board
   • Local 2-player gameplay
   • Mandatory captures
   • Multiple jumps
   • King promotion
   • Kings move both directions
   • Win detection
   • Stalemate detection
   • Undo
   • New Game
   • Move counter
   • Turn indicator
   • Keyboard support
   • Responsive rendering
   • No external libraries
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
        console.error(
            "Prasun Games Checkers: #checkersBoard was not found."
        );
        return;
    }

    setupBoardContainer();

    wireEvents();

    newGame();
}


/* =========================================================================
   DOM CACHE
   ========================================================================= */

function cacheDOM() {

    boardElement =
        document.getElementById("checkersBoard");

    turnElement =
        document.getElementById("turnValue");

    statusElement =
        document.getElementById("gameStatus");

    movesElement =
        document.getElementById("movesValue");

    redCountElement =
        document.getElementById("redCount");

    blackCountElement =
        document.getElementById("blackCount");

    newGameButton =
        document.getElementById("newGameBtn");

    undoButton =
        document.getElementById("undoBtn");
}


/* =========================================================================
   BOARD CONTAINER
   ========================================================================= */

function setupBoardContainer() {

    /*
     * These properties guarantee that the board is actually rendered
     * as an 8 × 8 grid even if the external CSS has a problem.
     */

    boardElement.style.display = "grid";
    boardElement.style.gridTemplateColumns =
        "repeat(8, minmax(0, 1fr))";

    boardElement.style.gridTemplateRows =
        "repeat(8, minmax(0, 1fr))";

    boardElement.style.aspectRatio = "1 / 1";

    boardElement.style.width = "100%";

    boardElement.style.maxWidth = "720px";

    boardElement.style.margin =
        "0 auto";

    boardElement.style.position =
        "relative";

    boardElement.style.overflow =
        "hidden";

    boardElement.setAttribute(
        "role",
        "grid"
    );

    boardElement.setAttribute(
        "aria-label",
        "Checkers game board"
    );
}


/* =========================================================================
   EVENTS
   ========================================================================= */

function wireEvents() {

    boardElement.addEventListener(
        "click",
        handleBoardClick
    );

    boardElement.addEventListener(
        "keydown",
        handleBoardKeydown
    );

    if (newGameButton) {

        newGameButton.addEventListener(
            "click",
            newGame
        );
    }

    if (undoButton) {

        undoButton.addEventListener(
            "click",
            undo
        );
    }

    document.addEventListener(
        "keydown",
        handleGlobalKeydown
    );
}


/* =========================================================================
   BOARD CREATION
   ========================================================================= */

function createEmptyBoard() {

    return Array.from(
        { length: BOARD_SIZE },
        () =>
            Array(BOARD_SIZE).fill(EMPTY)
    );
}


function createPiece(player) {

    return {
        id:
            player +
            "-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2),

        player,

        type: PIECE_MAN
    };
}


function createInitialPosition() {

    const board =
        createEmptyBoard();


    /*
     * BLACK
     * Top three rows.
     */

    for (let row = 0; row < 3; row++) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            if (
                isDarkSquare(
                    row,
                    col
                )
            ) {

                board[row][col] =
                    createPiece(
                        PLAYER_BLACK
                    );
            }
        }
    }


    /*
     * RED
     * Bottom three rows.
     */

    for (let row = 5; row < 8; row++) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            if (
                isDarkSquare(
                    row,
                    col
                )
            ) {

                board[row][col] =
                    createPiece(
                        PLAYER_RED
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

    return (
        (row + col) % 2 === 1
    );
}


function getPiece(row, col) {

    if (
        !isInsideBoard(
            row,
            col
        )
    ) {
        return null;
    }

    return state.board[row][col];
}


function isEmpty(row, col) {

    return (
        isInsideBoard(
            row,
            col
        ) &&
        !state.board[row][col]
    );
}


function opponentOf(player) {

    return player === PLAYER_RED
        ? PLAYER_BLACK
        : PLAYER_RED;
}


/* =========================================================================
   DIRECTIONS
   ========================================================================= */

function getMoveDirections(piece) {

    if (
        piece.type === PIECE_KING
    ) {

        return [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1]
        ];
    }


    /*
     * RED moves upward.
     */

    if (
        piece.player === PLAYER_RED
    ) {

        return [
            [-1, -1],
            [-1, 1]
        ];
    }


    /*
     * BLACK moves downward.
     */

    return [
        [1, -1],
        [1, 1]
    ];
}


/* =========================================================================
   SIMPLE MOVES
   ========================================================================= */

function getSimpleMoves(row, col) {

    const piece =
        getPiece(row, col);

    if (!piece) {
        return [];
    }

    if (
        piece.player !==
        state.currentPlayer
    ) {
        return [];
    }

    const moves = [];

    const directions =
        getMoveDirections(piece);


    for (
        const [dr, dc]
        of directions
    ) {

        const newRow =
            row + dr;

        const newCol =
            col + dc;


        if (
            isInsideBoard(
                newRow,
                newCol
            ) &&
            isEmpty(
                newRow,
                newCol
            )
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


/* =========================================================================
   CAPTURE MOVES
   ========================================================================= */

function getCaptureMoves(row, col) {

    const piece =
        getPiece(row, col);

    if (!piece) {
        return [];
    }

    if (
        piece.player !==
        state.currentPlayer
    ) {
        return [];
    }


    const moves = [];

    const directions =
        getMoveDirections(piece);


    for (
        const [dr, dc]
        of directions
    ) {

        const middleRow =
            row + dr;

        const middleCol =
            col + dc;

        const landingRow =
            row + dr * 2;

        const landingCol =
            col + dc * 2;


        if (
            !isInsideBoard(
                landingRow,
                landingCol
            )
        ) {
            continue;
        }


        const jumpedPiece =
            getPiece(
                middleRow,
                middleCol
            );


        if (
            jumpedPiece &&
            jumpedPiece.player ===
                opponentOf(
                    piece.player
                ) &&
            isEmpty(
                landingRow,
                landingCol
            )
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
   GLOBAL MOVE SEARCH
   ========================================================================= */

function getAllCaptureMoves(player) {

    const captures = [];

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const piece =
                state.board[row][col];


            if (
                !piece ||
                piece.player !== player
            ) {
                continue;
            }


            /*
             * Temporarily use the requested player
             * for move generation.
             */

            const originalPlayer =
                state.currentPlayer;

            state.currentPlayer =
                player;

            captures.push(
                ...getCaptureMoves(
                    row,
                    col
                )
            );

            state.currentPlayer =
                originalPlayer;
        }
    }


    return captures;
}


function getAllSimpleMoves(player) {

    const moves = [];

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const piece =
                state.board[row][col];


            if (
                !piece ||
                piece.player !== player
            ) {
                continue;
            }


            const originalPlayer =
                state.currentPlayer;

            state.currentPlayer =
                player;

            moves.push(
                ...getSimpleMoves(
                    row,
                    col
                )
            );

            state.currentPlayer =
                originalPlayer;
        }
    }


    return moves;
}


function playerHasCapture(player) {

    return (
        getAllCaptureMoves(
            player
        ).length > 0
    );
}


function playerHasAnyMove(player) {

    return (
        getAllCaptureMoves(
            player
        ).length > 0 ||
        getAllSimpleMoves(
            player
        ).length > 0
    );
}


/* =========================================================================
   MOVE VALIDATION
   ========================================================================= */

function isMoveLegal(move) {

    if (!move) {
        return false;
    }


    const piece =
        getPiece(
            move.from.row,
            move.from.col
        );


    if (!piece) {
        return false;
    }


    if (
        piece.player !==
        state.currentPlayer
    ) {
        return false;
    }


    /*
     * Multi-jump restriction.
     */

    if (state.forcedPiece) {

        if (
            move.from.row !==
                state.forcedPiece.row ||
            move.from.col !==
                state.forcedPiece.col
        ) {
            return false;
        }
    }


    const captureRequired =
        playerHasCapture(
            state.currentPlayer
        );


    /*
     * Normal move forbidden when a capture exists.
     */

    if (
        captureRequired &&
        !move.capture
    ) {
        return false;
    }


    /*
     * Capture validation.
     */

    if (move.capture) {

        const captures =
            getCaptureMoves(
                move.from.row,
                move.from.col
            );


        return captures.some(
            candidate =>

                candidate.to.row ===
                    move.to.row &&

                candidate.to.col ===
                    move.to.col &&

                candidate.capture &&
                candidate.capture.row ===
                    move.capture.row &&

                candidate.capture.col ===
                    move.capture.col
        );
    }


    /*
     * Normal move validation.
     */

    const moves =
        getSimpleMoves(
            move.from.row,
            move.from.col
        );


    return moves.some(
        candidate =>

            candidate.to.row ===
                move.to.row &&

            candidate.to.col ===
                move.to.col
    );
}


/* =========================================================================
   HISTORY
   ========================================================================= */

function cloneBoard(board) {

    return board.map(
        row =>

            row.map(
                piece =>

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

        board:
            cloneBoard(
                state.board
            ),

        currentPlayer:
            state.currentPlayer,

        selected:
            state.selected
                ? {
                    ...state.selected
                }
                : null,

        forcedPiece:
            state.forcedPiece
                ? {
                    ...state.forcedPiece
                }
                : null,

        winner:
            state.winner,

        gameOver:
            state.gameOver,

        moves:
            state.moves,

        started:
            state.started,

        lastMove:
            state.lastMove
                ? JSON.parse(
                    JSON.stringify(
                        state.lastMove
                    )
                )
                : null
    };
}


function restoreSnapshot(snapshot) {

    state.board =
        cloneBoard(
            snapshot.board
        );

    state.currentPlayer =
        snapshot.currentPlayer;

    state.selected =
        snapshot.selected
            ? {
                ...snapshot.selected
            }
            : null;

    state.forcedPiece =
        snapshot.forcedPiece
            ? {
                ...snapshot.forcedPiece
            }
            : null;

    state.winner =
        snapshot.winner;

    state.gameOver =
        snapshot.gameOver;

    state.moves =
        snapshot.moves;

    state.started =
        snapshot.started;

    state.lastMove =
        snapshot.lastMove
            ? JSON.parse(
                JSON.stringify(
                    snapshot.lastMove
                )
            )
            : null;

    updatePieceCounts();

    render();
}


function pushHistory() {

    state.history.push(
        createSnapshot()
    );


    if (
        state.history.length >
        MAX_HISTORY
    ) {

        state.history.shift();
    }
}


/* =========================================================================
   UNDO
   ========================================================================= */

function undo() {

    if (
        state.history.length === 0
    ) {
        return;
    }


    const snapshot =
        state.history.pop();


    restoreSnapshot(
        snapshot
    );


    setStatus(
        "Move undone."
    );
}


/* =========================================================================
   EXECUTE MOVE
   ========================================================================= */

function executeMove(move) {

    if (
        !isMoveLegal(move)
    ) {
        return false;
    }


    pushHistory();


    const movingPiece =
        getPiece(
            move.from.row,
            move.from.col
        );


    if (!movingPiece) {
        return false;
    }


    /*
     * Remove from original square.
     */

    state.board[
        move.from.row
    ][
        move.from.col
    ] = EMPTY;


    /*
     * Remove captured piece.
     */

    if (move.capture) {

        state.board[
            move.capture.row
        ][
            move.capture.col
        ] = EMPTY;
    }


    /*
     * Move piece.
     */

    state.board[
        move.to.row
    ][
        move.to.col
    ] = movingPiece;


    /*
     * Promotion.
     */

    let promoted = false;


    if (
        movingPiece.type ===
            PIECE_MAN
    ) {

        if (
            movingPiece.player ===
                PLAYER_RED &&
            move.to.row === 0
        ) {

            movingPiece.type =
                PIECE_KING;

            promoted = true;
        }


        if (
            movingPiece.player ===
                PLAYER_BLACK &&
            move.to.row ===
                BOARD_SIZE - 1
        ) {

            movingPiece.type =
                PIECE_KING;

            promoted = true;
        }
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

        capture:
            move.capture
                ? {
                    ...move.capture
                }
                : null
    };


    state.selected = null;


    /*
     * Multi-jump.
     */

    if (move.capture) {

        const nextCaptures =
            getCaptureMoves(
                move.to.row,
                move.to.col
            );


        if (
            nextCaptures.length > 0
        ) {

            state.forcedPiece = {

                row:
                    move.to.row,

                col:
                    move.to.col
            };


            state.selected = {

                row:
                    move.to.row,

                col:
                    move.to.col
            };


            updatePieceCounts();

            render();


            setStatus(
                promoted
                    ? "King promoted! Continue capturing."
                    : "Continue capturing."
            );


            return true;
        }
    }


    state.forcedPiece = null;


    /*
     * Change player.
     */

    state.currentPlayer =
        opponentOf(
            state.currentPlayer
        );


    updatePieceCounts();


    /*
     * Check end game.
     */

    if (
        checkGameOver()
    ) {

        render();

        return true;
    }


    render();


    setStatus(
        state.currentPlayer ===
            PLAYER_RED
            ? "Red's turn."
            : "Black's turn."
    );


    return true;
}


/* =========================================================================
   GAME OVER
   ========================================================================= */

function checkGameOver() {

    const red =
        countPieces(
            PLAYER_RED
        );

    const black =
        countPieces(
            PLAYER_BLACK
        );


    if (red === 0) {

        state.winner =
            PLAYER_BLACK;

        state.gameOver = true;

        setStatus(
            "Black wins!"
        );

        return true;
    }


    if (black === 0) {

        state.winner =
            PLAYER_RED;

        state.gameOver = true;

        setStatus(
            "Red wins!"
        );

        return true;
    }


    if (
        !playerHasAnyMove(
            state.currentPlayer
        )
    ) {

        state.winner =
            opponentOf(
                state.currentPlayer
            );

        state.gameOver = true;


        setStatus(

            state.winner ===
                PLAYER_RED

                ? "Red wins — Black has no legal moves."

                : "Black wins — Red has no legal moves."
        );


        return true;
    }


    return false;
}


/* =========================================================================
   PIECE COUNT
   ========================================================================= */

function countPieces(player) {

    let count = 0;


    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const piece =
                state.board[row][col];


            if (
                piece &&
                piece.player === player
            ) {

                count++;
            }
        }
    }


    return count;
}


function updatePieceCounts() {

    state.redPieces =
        countPieces(
            PLAYER_RED
        );

    state.blackPieces =
        countPieces(
            PLAYER_BLACK
        );
}


/* =========================================================================
   PIECE SELECTION
   ========================================================================= */

function selectPiece(row, col) {

    if (state.gameOver) {
        return;
    }


    const piece =
        getPiece(
            row,
            col
        );


    if (!piece) {
        return;
    }


    if (
        piece.player !==
        state.currentPlayer
    ) {
        return;
    }


    /*
     * During multi-jump,
     * only the forced piece may move.
     */

    if (state.forcedPiece) {

        if (
            row !==
                state.forcedPiece.row ||
            col !==
                state.forcedPiece.col
        ) {
            return;
        }
    }


    const captures =
        getCaptureMoves(
            row,
            col
        );


    if (
        playerHasCapture(
            state.currentPlayer
        ) &&
        captures.length === 0
    ) {

        setStatus(
            "A capture is required."
        );

        return;
    }


    state.selected = {

        row,
        col
    };


    render();


    setStatus(

        captures.length > 0

            ? "Capture available — choose a highlighted square."

            : "Choose a highlighted destination."
    );
}


/* =========================================================================
   MOVE TO DESTINATION
   ========================================================================= */

function tryMoveTo(row, col) {

    if (!state.selected) {
        return;
    }


    const from = {

        row:
            state.selected.row,

        col:
            state.selected.col
    };


    const captures =
        getCaptureMoves(
            from.row,
            from.col
        );


    let move =
        captures.find(
            candidate =>

                candidate.to.row === row &&
                candidate.to.col === col
        );


    /*
     * If no capture selected,
     * try a normal move.
     */

    if (!move) {

        if (
            playerHasCapture(
                state.currentPlayer
            )
        ) {

            setStatus(
                "You must capture when possible."
            );

            return;
        }


        const normalMoves =
            getSimpleMoves(
                from.row,
                from.col
            );


        move =
            normalMoves.find(
                candidate =>

                    candidate.to.row === row &&
                    candidate.to.col === col
            );
    }


    if (!move) {

        setStatus(
            "That move is not legal."
        );

        return;
    }


    executeMove(
        move
    );
}


/* =========================================================================
   CLICK HANDLER
   ========================================================================= */

function handleBoardClick(event) {

    const square =
        event.target.closest(
            ".checkers-square"
        );


    if (
        !square ||
        !boardElement.contains(square)
    ) {
        return;
    }


    const row =
        Number(
            square.dataset.row
        );

    const col =
        Number(
            square.dataset.col
        );


    if (
        !Number.isInteger(row) ||
        !Number.isInteger(col)
    ) {
        return;
    }


    if (state.gameOver) {
        return;
    }


    /*
     * A piece is already selected.
     */

    if (state.selected) {


        /*
         * Clicking selected piece.
         */

        if (
            state.selected.row === row &&
            state.selected.col === col
        ) {

            if (
                !state.forcedPiece
            ) {

                state.selected = null;

                render();

                setTurnStatus();
            }

            return;
        }


        /*
         * Clicking another own piece.
         */

        const clickedPiece =
            getPiece(
                row,
                col
            );


        if (
            clickedPiece &&
            clickedPiece.player ===
                state.currentPlayer
        ) {

            selectPiece(
                row,
                col
            );

            return;
        }


        /*
         * Otherwise try destination.
         */

        tryMoveTo(
            row,
            col
        );

        return;
    }


    /*
     * Nothing selected.
     */

    selectPiece(
        row,
        col
    );
}


/* =========================================================================
   KEYBOARD
   ========================================================================= */

function handleBoardKeydown(event) {

    const square =
        event.target.closest(
            ".checkers-square"
        );


    if (!square) {
        return;
    }


    const row =
        Number(
            square.dataset.row
        );

    const col =
        Number(
            square.dataset.col
        );


    if (
        event.key === "Enter" ||
        event.key === " "
    ) {

        event.preventDefault();


        if (state.selected) {

            tryMoveTo(
                row,
                col
            );

        } else {

            selectPiece(
                row,
                col
            );
        }


        return;
    }


    let nextRow = row;
    let nextCol = col;


    if (
        event.key ===
        "ArrowUp"
    ) {

        nextRow--;

    } else if (
        event.key ===
        "ArrowDown"
    ) {

        nextRow++;

    } else if (
        event.key ===
        "ArrowLeft"
    ) {

        nextCol--;

    } else if (
        event.key ===
        "ArrowRight"
    ) {

        nextCol++;

    } else {

        return;
    }


    event.preventDefault();


    if (
        isInsideBoard(
            nextRow,
            nextCol
        )
    ) {

        const nextSquare =
            boardElement.querySelector(
                `.checkers-square[data-row="${nextRow}"][data-col="${nextCol}"]`
            );


        if (nextSquare) {

            nextSquare.focus();
        }
    }
}


/* =========================================================================
   GLOBAL KEYBOARD
   ========================================================================= */

function handleGlobalKeydown(event) {

    /*
     * CTRL/CMD + Z
     */

    if (
        (event.ctrlKey ||
            event.metaKey) &&
        event.key.toLowerCase() === "z"
    ) {

        event.preventDefault();

        undo();

        return;
    }


    /*
     * ESC
     */

    if (
        event.key ===
        "Escape"
    ) {

        if (
            state.selected &&
            !state.forcedPiece
        ) {

            state.selected = null;

            render();

            setTurnStatus();
        }

        return;
    }


    /*
     * N = New Game
     */

    if (
        event.key.toLowerCase() ===
        "n"
    ) {

        newGame();
    }
}


/* =========================================================================
   HIGHLIGHTS
   ========================================================================= */

function getHighlightedDestinations() {

    if (!state.selected) {
        return [];
    }


    const row =
        state.selected.row;

    const col =
        state.selected.col;


    const captures =
        getCaptureMoves(
            row,
            col
        );


    if (
        captures.length > 0
    ) {

        return captures.map(
            move => ({

                row:
                    move.to.row,

                col:
                    move.to.col
            })
        );
    }


    /*
     * If another capture exists elsewhere,
     * no normal move may be highlighted.
     */

    if (
        playerHasCapture(
            state.currentPlayer
        )
    ) {

        return [];
    }


    return getSimpleMoves(
        row,
        col
    ).map(
        move => ({

            row:
                move.to.row,

            col:
                move.to.col
        })
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


    const highlighted =
        getHighlightedDestinations();


    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {


            /*
             * Square
             */

            const square =
                document.createElement(
                    "button"
                );


            square.type =
                "button";


            square.className =
                "checkers-square " +
                (
                    isDarkSquare(
                        row,
                        col
                    )
                        ? "dark-square"
                        : "light-square"
                );


            square.dataset.row =
                String(row);

            square.dataset.col =
                String(col);


            square.setAttribute(
                "role",
                "gridcell"
            );


            square.setAttribute(
                "aria-label",
                `Checkers row ${row + 1}, column ${col + 1}`
            );


            /*
             * GUARANTEED SQUARE RENDERING
             */

            square.style.position =
                "relative";

            square.style.display =
                "flex";

            square.style.alignItems =
                "center";

            square.style.justifyContent =
                "center";

            square.style.padding =
                "0";

            square.style.margin =
                "0";

            square.style.border =
                "0";

            square.style.cursor =
                "pointer";

            square.style.aspectRatio =
                "1 / 1";


            /*
             * Board square colors.
             */

            if (
                isDarkSquare(
                    row,
                    col
                )
            ) {

                square.style.background =
                    "linear-gradient(145deg, #174c37, #0b3023)";

            } else {

                square.style.background =
                    "linear-gradient(145deg, #e5d7bd, #cdbd9e)";
            }


            /*
             * Piece.
             */

            const piece =
                state.board[row][col];


            if (piece) {

                square.appendChild(
                    createPieceElement(
                        piece
                    )
                );


                if (
                    piece.player ===
                    PLAYER_RED
                ) {

                    square.classList.add(
                        "red-square-piece"
                    );

                } else {

                    square.classList.add(
                        "black-square-piece"
                    );
                }
            }


            /*
             * Selected square.
             */

            if (
                state.selected &&
                state.selected.row === row &&
                state.selected.col === col
            ) {

                square.classList.add(
                    "selected-square"
                );

                square.style.boxShadow =
                    "inset 0 0 0 4px rgba(52, 211, 153, 0.95)";
            }


            /*
             * Forced multi-jump piece.
             */

            if (
                state.forcedPiece &&
                state.forcedPiece.row === row &&
                state.forcedPiece.col === col
            ) {

                square.classList.add(
                    "forced-square"
                );

                square.style.boxShadow =
                    "inset 0 0 0 4px rgba(250, 204, 21, 0.95)";
            }


            /*
             * Valid destination.
             */

            const isHighlighted =
                highlighted.some(
                    destination =>

                        destination.row === row &&
                        destination.col === col
                );


            if (isHighlighted) {

                square.classList.add(
                    "valid-destination"
                );


                square.style.boxShadow =
                    "inset 0 0 0 4px rgba(52, 211, 153, 0.95)";


                /*
                 * Add visible destination dot.
                 */

                const dot =
                    document.createElement(
                        "span"
                    );


                dot.style.position =
                    "absolute";

                dot.style.width =
                    "18%";

                dot.style.height =
                    "18%";

                dot.style.borderRadius =
                    "50%";

                dot.style.background =
                    "rgba(52, 211, 153, 0.85)";

                dot.style.boxShadow =
                    "0 0 12px rgba(52, 211, 153, 0.7)";

                dot.style.pointerEvents =
                    "none";


                square.appendChild(
                    dot
                );
            }


            /*
             * Last move.
             */

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


                if (
                    !isHighlighted
                ) {

                    square.style.boxShadow =
                        "inset 0 0 0 3px rgba(250, 204, 21, 0.55)";
                }
            }


            boardElement.appendChild(
                square
            );
        }
    }


    updateHUD();
}


/* =========================================================================
   CREATE PIECE
   ========================================================================= */

function createPieceElement(piece) {

    const element =
        document.createElement(
            "span"
        );


    element.className =
        "checkers-piece " +
        (
            piece.player ===
            PLAYER_RED
                ? "piece-red"
                : "piece-black"
        );


    if (
        piece.type ===
        PIECE_KING
    ) {

        element.classList.add(
            "piece-king"
        );
    }


    element.setAttribute(
        "aria-hidden",
        "true"
    );


    /*
     * IMPORTANT:
     * These styles guarantee that the balls are visible even if
     * style.css does not contain the expected piece CSS.
     */

    element.style.display =
        "block";

    element.style.width =
        "72%";

    element.style.height =
        "72%";

    element.style.aspectRatio =
        "1 / 1";

    element.style.borderRadius =
        "50%";

    element.style.position =
        "relative";

    element.style.zIndex =
        "5";

    element.style.pointerEvents =
        "none";

    element.style.boxSizing =
        "border-box";


    /*
     * RED PIECE
     */

    if (
        piece.player ===
        PLAYER_RED
    ) {

        element.style.background =
            "radial-gradient(circle at 32% 25%, #ffb4b4 0%, #ef5350 15%, #dc2626 45%, #991b1b 78%, #450a0a 100%)";

        element.style.border =
            "3px solid rgba(255,255,255,0.25)";

        element.style.boxShadow =
            "inset -8px -10px 15px rgba(0,0,0,0.38), inset 6px 6px 10px rgba(255,255,255,0.20), 0 7px 12px rgba(0,0,0,0.55)";

    } else {


        /*
         * BLACK PIECE
         */

        element.style.background =
            "radial-gradient(circle at 32% 25%, #7b8794 0%, #374151 18%, #111827 48%, #030712 80%, #000000 100%)";

        element.style.border =
            "3px solid rgba(255,255,255,0.18)";

        element.style.boxShadow =
            "inset -8px -10px 15px rgba(0,0,0,0.65), inset 6px 6px 10px rgba(255,255,255,0.16), 0 7px 12px rgba(0,0,0,0.65)";
    }


    /*
     * KING
     */

    if (
        piece.type ===
        PIECE_KING
    ) {

        element.textContent =
            "♛";

        element.style.display =
            "flex";

        element.style.alignItems =
            "center";

        element.style.justifyContent =
            "center";

        element.style.color =
            "#ffffff";

        element.style.fontSize =
            "42%";

        element.style.fontWeight =
            "900";

        element.style.textShadow =
            "0 2px 3px rgba(0,0,0,0.85)";
    }


    return element;
}


/* =========================================================================
   HUD
   ========================================================================= */

function updateHUD() {

    updatePieceCounts();


    /*
     * Turn.
     */

    if (turnElement) {

        if (state.gameOver) {

            turnElement.textContent =
                state.winner ===
                    PLAYER_RED
                    ? "Red Wins"
                    : "Black Wins";

        } else {

            turnElement.textContent =
                state.currentPlayer ===
                    PLAYER_RED
                    ? "Red"
                    : "Black";
        }
    }


    /*
     * Moves.
     */

    if (movesElement) {

        movesElement.textContent =
            String(
                state.moves
            );
    }


    /*
     * Red pieces.
     */

    if (redCountElement) {

        redCountElement.textContent =
            String(
                state.redPieces
            );
    }


    /*
     * Black pieces.
     */

    if (blackCountElement) {

        blackCountElement.textContent =
            String(
                state.blackPieces
            );
    }


    /*
     * Undo.
     */

    if (undoButton) {

        undoButton.disabled =
            state.history.length === 0;
    }
}


/* =========================================================================
   STATUS
   ========================================================================= */

function setStatus(message) {

    if (statusElement) {

        statusElement.textContent =
            message;
    }
}


function setTurnStatus() {

    setStatus(

        state.currentPlayer ===
            PLAYER_RED

            ? "Red's turn."

            : "Black's turn."
    );
}


/* =========================================================================
   NEW GAME
   ========================================================================= */

function newGame() {

    state.board =
        createInitialPosition();


    state.currentPlayer =
        PLAYER_RED;


    state.selected =
        null;


    state.forcedPiece =
        null;


    state.winner =
        null;


    state.gameOver =
        false;


    state.moves =
        0;


    state.redPieces =
        12;


    state.blackPieces =
        12;


    state.history =
        [];


    state.started =
        false;


    state.lastMove =
        null;


    updatePieceCounts();


    render();


    setStatus(
        "Red's turn."
    );
}


/* =========================================================================
   DEBUG
   ========================================================================= */

function getGameState() {

    return {

        board:
            cloneBoard(
                state.board
            ),

        currentPlayer:
            state.currentPlayer,

        selected:
            state.selected
                ? {
                    ...state.selected
                }
                : null,

        forcedPiece:
            state.forcedPiece
                ? {
                    ...state.forcedPiece
                }
                : null,

        winner:
            state.winner,

        gameOver:
            state.gameOver,

        moves:
            state.moves,

        redPieces:
            state.redPieces,

        blackPieces:
            state.blackPieces
    };
}


/* =========================================================================
   START
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
