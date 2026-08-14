"use strict";

/* =========================================================================
   PRASUN GAMES — CHECKERS
   =========================================================================

   Professional local 2-player Checkers engine

   Features
   -------------------------------------------------------------------------
   • Standard 8 × 8 American Checkers
   • Local 2-player gameplay
   • Mandatory captures
   • Multi-jump captures
   • King promotion
   • Kings move in both directions
   • Win detection
   • Stalemate / no-legal-move detection
   • Undo
   • New Game
   • Move counter
   • Piece counters
   • Turn indicator
   • Last-move highlighting
   • Valid-move highlighting
   • Keyboard accessibility
   • Escape to deselect
   • N = New Game
   • Ctrl/Cmd + Z = Undo
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
   DIRECTIONS
   ========================================================================= */

const DIAGONAL_DIRECTIONS = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1]
];


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

    wireEvents();

    newGame();

}


/* =========================================================================
   CACHE DOM
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
   EVENT WIRING
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
        {
            length: BOARD_SIZE
        },
        () =>
            Array(BOARD_SIZE).fill(EMPTY)
    );

}


/* =========================================================================
   PIECE CREATION
   ========================================================================= */

function createPiece(player, row, col) {

    return {

        id:
            player +
            "-" +
            row +
            "-" +
            col +
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


/* =========================================================================
   INITIAL POSITION
   ========================================================================= */

function createInitialPosition() {

    const board =
        createEmptyBoard();


    /*
       BLACK

       Black starts at the top of the board.
    */

    for (
        let row = 0;
        row < 3;
        row++
    ) {

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
                        PLAYER_BLACK,
                        row,
                        col
                    );

            }

        }

    }


    /*
       RED

       Red starts at the bottom.
    */

    for (
        let row = 5;
        row < BOARD_SIZE;
        row++
    ) {

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
        state.board[row][col] === EMPTY
    );

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
       Kings can move in both directions.
    */

    if (
        piece.type === PIECE_KING
    ) {

        return DIAGONAL_DIRECTIONS;

    }


    /*
       Red moves upward.
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
       Black moves downward.
    */

    return [
        [1, -1],
        [1, 1]
    ];

}


/* =========================================================================
   SIMPLE MOVE GENERATION
   ========================================================================= */

function getSimpleMoves(
    row,
    col,
    playerOverride = null
) {

    const piece =
        getPiece(
            row,
            col
        );

    if (!piece) {

        return [];

    }


    const player =
        playerOverride ||
        state.currentPlayer;


    if (
        piece.player !== player
    ) {

        return [];

    }


    const moves = [];

    const directions =
        getMoveDirections(
            piece
        );


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
   CAPTURE MOVE GENERATION
   ========================================================================= */

function getCaptureMoves(
    row,
    col,
    playerOverride = null
) {

    const piece =
        getPiece(
            row,
            col
        );

    if (!piece) {

        return [];

    }


    const player =
        playerOverride ||
        state.currentPlayer;


    if (
        piece.player !== player
    ) {

        return [];

    }


    const moves = [];

    const directions =
        getMoveDirections(
            piece
        );


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
                opponentOf(piece.player) &&
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
   GLOBAL MOVE CHECKING
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
                getPiece(
                    row,
                    col
                );


            if (
                !piece ||
                piece.player !== player
            ) {

                continue;

            }


            captures.push(
                ...getCaptureMoves(
                    row,
                    col,
                    player
                )
            );

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
                getPiece(
                    row,
                    col
                );


            if (
                !piece ||
                piece.player !== player
            ) {

                continue;

            }


            moves.push(
                ...getSimpleMoves(
                    row,
                    col,
                    player
                )
            );

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
       Multi-jump restriction.
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


    /*
       Captures are mandatory.
    */

    const mandatoryCapture =
        playerHasCapture(
            state.currentPlayer
        );


    if (
        mandatoryCapture &&
        !move.capture
    ) {

        return false;

    }


    /*
       Capture validation.
    */

    if (move.capture) {

        const legalCaptures =
            getCaptureMoves(
                move.from.row,
                move.from.col
            );


        return legalCaptures.some(
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
       Normal move validation.
    */

    const legalMoves =
        getSimpleMoves(
            move.from.row,
            move.from.col
        );


    return legalMoves.some(
        candidate =>

            candidate.to.row ===
                move.to.row &&

            candidate.to.col ===
                move.to.col
    );

}


/* =========================================================================
   SNAPSHOT / UNDO
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

        setStatus(
            "There is no move to undo."
        );

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


    /*
       Save state before changing it.
    */

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
       Store whether the piece was a man
       before the move.
    */

    const wasMan =
        movingPiece.type ===
        PIECE_MAN;


    /*
       Remove piece from origin.
    */

    state.board[
        move.from.row
    ][
        move.from.col
    ] = EMPTY;


    /*
       Remove captured piece.
    */

    if (move.capture) {

        state.board[
            move.capture.row
        ][
            move.capture.col
        ] = EMPTY;

    }


    /*
       Place moving piece.
    */

    state.board[
        move.to.row
    ][
        move.to.col
    ] = movingPiece;


    /*
       Promotion.
    */

    let promoted = false;


    if (
        wasMan &&
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
                : null,

        promoted

    };


    state.selected = null;


    /* ---------------------------------------------------------------------
       MULTI-JUMP
       --------------------------------------------------------------------- */

    if (
        move.capture &&
        !promoted
    ) {

        const nextCaptures =
            getCaptureMoves(
                move.to.row,
                move.to.col
            );


        if (
            nextCaptures.length > 0
        ) {

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
                "Continue capturing with the selected piece."
            );


            return true;

        }

    }


    /*
       No more captures.
       Clear forced-piece state.
    */

    state.forcedPiece = null;


    /*
       Switch player.
    */

    state.currentPlayer =
        opponentOf(
            state.currentPlayer
        );


    updatePieceCounts();


    /*
       Check whether the game has ended.
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

    const redPieces =
        countPieces(
            PLAYER_RED
        );

    const blackPieces =
        countPieces(
            PLAYER_BLACK
        );


    /*
       No red pieces.
    */

    if (
        redPieces === 0
    ) {

        state.winner =
            PLAYER_BLACK;

        state.gameOver = true;

        setStatus(
            "Black wins!"
        );

        return true;

    }


    /*
       No black pieces.
    */

    if (
        blackPieces === 0
    ) {

        state.winner =
            PLAYER_RED;

        state.gameOver = true;

        setStatus(
            "Red wins!"
        );

        return true;

    }


    /*
       Current player has no legal move.
    */

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


        if (
            state.winner ===
                PLAYER_RED
        ) {

            setStatus(
                "Red wins — Black has no legal moves."
            );

        } else {

            setStatus(
                "Black wins — Red has no legal moves."
            );

        }


        return true;

    }


    return false;

}


/* =========================================================================
   PIECE COUNTING
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

    if (
        state.gameOver
    ) {

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

        setStatus(
            state.currentPlayer ===
                PLAYER_RED
                ? "It is Red's turn."
                : "It is Black's turn."
        );

        return;

    }


    /*
       During a multi-jump only
       the forced piece is allowed.
    */

    if (
        state.forcedPiece
    ) {

        if (
            row !==
                state.forcedPiece.row ||
            col !==
                state.forcedPiece.col
        ) {

            setStatus(
                "Continue the capture with the selected piece."
            );

            return;

        }

    }


    const captures =
        getCaptureMoves(
            row,
            col
        );


    const globalCaptureRequired =
        playerHasCapture(
            state.currentPlayer
        );


    /*
       Mandatory capture rule.
    */

    if (
        globalCaptureRequired &&
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


    if (
        captures.length > 0
    ) {

        setStatus(
            "Capture available. Choose a highlighted square."
        );

    } else {

        setStatus(
            "Choose a highlighted destination."
        );

    }

}


/* =========================================================================
   MOVE TO DESTINATION
   ========================================================================= */

function tryMoveTo(row, col) {

    if (
        !state.selected ||
        state.gameOver
    ) {

        return;

    }


    const from = {

        row:
            state.selected.row,

        col:
            state.selected.col

    };


    /*
       First check captures.
    */

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
       If no capture destination exists,
       normal movement may be considered.
    */

    if (!move) {

        const globalCaptureRequired =
            playerHasCapture(
                state.currentPlayer
            );


        if (
            globalCaptureRequired
        ) {

            setStatus(
                "You must capture when possible."
            );

            return;

        }


        const simpleMoves =
            getSimpleMoves(
                from.row,
                from.col
            );


        move =
            simpleMoves.find(
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


    if (
        state.gameOver
    ) {

        return;

    }


    /*
       If there is a selected piece:
       - Own piece = change selection
       - Destination = attempt move
       - Same piece = deselect
    */

    if (
        state.selected
    ) {

        if (
            state.selected.row === row &&
            state.selected.col === col
        ) {

            /*
               Cannot deselect during
               a mandatory multi-jump.
            */

            if (
                !state.forcedPiece
            ) {

                state.selected =
                    null;

                render();

                setStatus(
                    state.currentPlayer ===
                        PLAYER_RED
                        ? "Red's turn."
                        : "Black's turn."
                );

            }

            return;

        }


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


        tryMoveTo(
            row,
            col
        );

        return;

    }


    /*
       No current selection.
    */

    selectPiece(
        row,
        col
    );

}


/* =========================================================================
   KEYBOARD SUPPORT
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


    /*
       Enter / Space
    */

    if (
        event.key === "Enter" ||
        event.key === " "
    ) {

        event.preventDefault();


        if (
            state.selected
        ) {

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
        event.key === "ArrowUp"
    ) {

        nextRow--;

    } else if (
        event.key === "ArrowDown"
    ) {

        nextRow++;

    } else if (
        event.key === "ArrowLeft"
    ) {

        nextCol--;

    } else if (
        event.key === "ArrowRight"
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
                '.checkers-square[data-row="' +
                nextRow +
                '"][data-col="' +
                nextCol +
                '"]'
            );


        if (
            nextSquare
        ) {

            nextSquare.focus();

        }

    }

}


/* =========================================================================
   GLOBAL KEYBOARD SHORTCUTS
   ========================================================================= */

function handleGlobalKeydown(event) {

    /*
       Ctrl/Cmd + Z
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
       Escape
    */

    if (
        event.key === "Escape"
    ) {

        if (
            state.selected &&
            !state.forcedPiece
        ) {

            state.selected =
                null;

            render();

            setStatus(
                state.currentPlayer ===
                    PLAYER_RED
                    ? "Red's turn."
                    : "Black's turn."
            );

        }

        return;

    }


    /*
       N = New Game
    */

    if (
        event.key.toLowerCase() === "n"
    ) {

        /*
           Don't trigger while typing.
        */

        const tag =
            document.activeElement
                ?.tagName
                ?.toLowerCase();


        if (
            tag === "input" ||
            tag === "textarea" ||
            tag === "select"
        ) {

            return;

        }


        newGame();

    }

}


/* =========================================================================
   HIGHLIGHTED DESTINATIONS
   ========================================================================= */

function getHighlightedDestinations() {

    if (
        !state.selected
    ) {

        return [];

    }


    const row =
        state.selected.row;

    const col =
        state.selected.col;


    /*
       Captures always take priority.
    */

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
       If another piece can capture,
       normal moves are not allowed.
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
   BOARD RENDERING
   ========================================================================= */

function render() {

    if (!boardElement) {

        return;

    }


    /*
       Clear existing board.
    */

    boardElement.innerHTML = "";


    const highlighted =
        getHighlightedDestinations();


    /*
       Build all 64 squares.
    */

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

            const square =
                document.createElement(
                    "button"
                );


            square.type =
                "button";


            /*
               Base classes.
            */

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


            /*
               Keyboard accessibility.
            */

            square.setAttribute(
                "aria-label",
                getSquareAriaLabel(
                    row,
                    col
                )
            );


            square.setAttribute(
                "role",
                "gridcell"
            );


            square.tabIndex =
                0;


            /*
               Piece.
            */

            const piece =
                state.board[row][col];


            if (piece) {

                const pieceElement =
                    createPieceElement(
                        piece
                    );


                square.appendChild(
                    pieceElement
                );


                square.classList.add(
                    piece.player ===
                        PLAYER_RED
                        ? "red-square-piece"
                        : "black-square-piece"
                );


                /*
                   Selected piece.
                */

                if (
                    state.selected &&
                    state.selected.row === row &&
                    state.selected.col === col
                ) {

                    square.classList.add(
                        "selected-square"
                    );

                }


                /*
                   Forced multi-jump piece.
                */

                if (
                    state.forcedPiece &&
                    state.forcedPiece.row === row &&
                    state.forcedPiece.col === col
                ) {

                    square.classList.add(
                        "forced-square"
                    );

                }

            }


            /*
               Valid destination.
            */

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

                square.setAttribute(
                    "aria-label",
                    getDestinationAriaLabel(
                        row,
                        col
                    )
                );

            }


            /*
               Last move.
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

            }


            boardElement.appendChild(
                square
            );

        }

    }


    /*
       Update HUD after board rendering.
    */

    updateHUD();

}


/* =========================================================================
   PIECE DOM
   ========================================================================= */

function createPieceElement(piece) {

    /*
       IMPORTANT:
       This element is intentionally empty for normal pieces.

       The CSS creates the actual circular checker piece.

       King pieces receive a crown symbol.
    */

    const element =
        document.createElement(
            "span"
        );


    /*
       Base piece class.
    */

    element.classList.add(
        "checkers-piece"
    );


    /*
       Player class.
    */

    if (
        piece.player === PLAYER_RED
    ) {

        element.classList.add(
            "piece-red"
        );

    } else {

        element.classList.add(
            "piece-black"
        );

    }


    /*
       King class.
    */

    if (
        piece.type === PIECE_KING
    ) {

        element.classList.add(
            "piece-king"
        );

    }


    /*
       Data attributes.

       These are useful for CSS,
       debugging and future enhancements.
    */

    element.dataset.player =
        piece.player;

    element.dataset.type =
        piece.type;


    /*
       Accessibility.

       The parent square contains the
       meaningful accessible label.
    */

    element.setAttribute(
        "aria-hidden",
        "true"
    );


    /*
       King symbol.

       Normal pieces remain empty so
       CSS can render the circular piece.
    */

    if (
        piece.type === PIECE_KING
    ) {

        element.textContent =
            "♛";

    } else {

        element.textContent =
            "";

    }


    return element;

}


/* =========================================================================
   ACCESSIBILITY LABELS
   ========================================================================= */

function getSquareAriaLabel(row, col) {

    const piece =
        getPiece(
            row,
            col
        );


    const coordinate =
        getBoardCoordinate(
            row,
            col
        );


    if (!piece) {

        return (
            coordinate +
            ", empty square"
        );

    }


    const playerName =
        piece.player ===
            PLAYER_RED
            ? "Red"
            : "Black";


    const pieceName =
        piece.type ===
            PIECE_KING
            ? "king"
            : "piece";


    return (
        coordinate +
        ", " +
        playerName +
        " " +
        pieceName
    );

}


function getDestinationAriaLabel(row, col) {

    return (
        getBoardCoordinate(
            row,
            col
        ) +
        ", valid move destination"
    );

}


function getBoardCoordinate(row, col) {

    const files =
        "ABCDEFGH";

    return (
        files[col] +
        (BOARD_SIZE - row)
    );

}


/* =========================================================================
   HUD
   ========================================================================= */

function updateHUD() {

    updatePieceCounts();


    /*
       Turn.
    */

    if (turnElement) {

        if (
            state.gameOver
        ) {

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
       Moves.
    */

    if (movesElement) {

        movesElement.textContent =
            String(
                state.moves
            );

    }


    /*
       Red pieces.
    */

    if (redCountElement) {

        redCountElement.textContent =
            String(
                state.redPieces
            );

    }


    /*
       Black pieces.
    */

    if (blackCountElement) {

        blackCountElement.textContent =
            String(
                state.blackPieces
            );

    }


    /*
       Undo button.
    */

    if (undoButton) {

        undoButton.disabled =
            state.history.length === 0;

    }


    /*
       Default status.

       Don't overwrite explicit game-over messages.
    */

    if (
        statusElement &&
        !state.gameOver
    ) {

        if (
            state.forcedPiece
        ) {

            statusElement.textContent =
                "Continue capturing.";

        } else {

            statusElement.textContent =
                state.currentPlayer ===
                    PLAYER_RED
                    ? "Red's turn"
                    : "Black's turn";

        }

    }

}


/* =========================================================================
   STATUS
   ========================================================================= */

function setStatus(message) {

    if (
        statusElement
    ) {

        statusElement.textContent =
            message;

    }

}


/* =========================================================================
   NEW GAME
   ========================================================================= */

function newGame() {

    /*
       Reset board.
    */

    state.board =
        createInitialPosition();


    /*
       Red starts.
    */

    state.currentPlayer =
        PLAYER_RED;


    /*
       Clear selection.
    */

    state.selected =
        null;


    /*
       Clear forced capture.
    */

    state.forcedPiece =
        null;


    /*
       Clear winner.
    */

    state.winner =
        null;


    /*
       Game active.
    */

    state.gameOver =
        false;


    /*
       Reset move counter.
    */

    state.moves =
        0;


    /*
       Reset counts.
    */

    state.redPieces =
        12;

    state.blackPieces =
        12;


    /*
       Clear undo history.
    */

    state.history =
        [];


    /*
       Game has not started.
    */

    state.started =
        false;


    /*
       Clear last move.
    */

    state.lastMove =
        null;


    /*
       Update counts.
    */

    updatePieceCounts();


    /*
       Render initial position.
    */

    render();


    /*
       Status.
    */

    setStatus(
        "Red's turn."
    );


    /*
       Focus the first playable red piece
       for keyboard users.
    */

    focusFirstPlayerPiece(
        PLAYER_RED
    );

}


/* =========================================================================
   FOCUS FIRST PLAYER PIECE
   ========================================================================= */

function focusFirstPlayerPiece(player) {

    if (!boardElement) {

        return;

    }


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
                getPiece(
                    row,
                    col
                );


            if (
                piece &&
                piece.player === player
            ) {

                const square =
                    boardElement.querySelector(
                        '.checkers-square[data-row="' +
                        row +
                        '"][data-col="' +
                        col +
                        '"]'
                    );


                if (square) {

                    square.focus();

                }


                return;

            }

        }

    }

}


/* =========================================================================
   DEVELOPMENT / DEBUG HELPER
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
            state.blackPieces,

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


/* =========================================================================
   OPTIONAL DEBUG ACCESS
   ========================================================================= */

/*
   Expose a read-only style debugging function.

   Example from browser console:

       getCheckersState()

*/

window.getCheckersState =
    getGameState;


/* =========================================================================
   START APPLICATION
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
