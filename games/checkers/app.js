/**
 * PRASUN GAMES - CHECKERS (AMERICAN CHECKERS / ENGLISH DRAUGHTS)
 * Standard Rules Implementation with Mandatory Captures & Multi-Jumps
 * Author: Prasun Barua
 */

'use strict';

(function () {
    /* ==========================================================================
       1. CONSTANTS & CONFIGURATION
       ========================================================================== */
    const BOARD_SIZE = 8;
    const PLAYER_RED = 'red';
    const PLAYER_BLACK = 'black';

    // SVG Crown graphic string for Kings
    const CROWN_SVG_HTML = `
        <svg class="crown-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path fill="currentColor" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
        </svg>
    `;

    /* ==========================================================================
       2. APPLICATION STATE
       ========================================================================== */
    const state = {
        board: [],            // 8x8 matrix holding piece objects or null
        currentPlayer: PLAYER_RED,
        selectedPiece: null,  // { row, col } or null
        validMoves: [],       // Array of valid move objects for selected piece
        allLegalMoves: [],    // Array of all legal moves for current player
        forcedPiece: null,    // { row, col } during multi-jump sequence
        movesCount: 0,
        redCount: 12,
        blackCount: 12,
        gameOver: false,
        winner: null,
        history: [],          // Undo stack storing deep state snapshots
        lastMove: null,       // { from: {r,c}, to: {r,c} } for visual highlighting
        keyboardFocus: { row: 5, col: 1 } // Focused square for keyboard navigation
    };

    /* ==========================================================================
       3. DOM ELEMENTS CACHE
       ========================================================================== */
    const dom = {};

    function cacheDOMElements() {
        dom.board = document.getElementById('checkersBoard');
        dom.turnValue = document.getElementById('turnValue');
        dom.turnText = document.getElementById('turnText');
        dom.gameStatus = document.getElementById('gameStatus');
        dom.movesValue = document.getElementById('movesValue');
        dom.redCount = document.getElementById('redCount');
        dom.blackCount = document.getElementById('blackCount');
        dom.newGameBtn = document.getElementById('newGameBtn');
        dom.undoBtn = document.getElementById('undoBtn');

        // Rules and Game Over Modals
        dom.gameOverModal = document.getElementById('gameOverModal');
        dom.winnerText = document.getElementById('winnerText');
        dom.finalMoves = document.getElementById('finalMoves');
        dom.finalRed = document.getElementById('finalRed');
        dom.finalBlack = document.getElementById('finalBlack');
        dom.playAgainBtn = document.getElementById('playAgainBtn');
        dom.closeModalBtn = document.getElementById('closeModalBtn');

        dom.rulesBtn = document.getElementById('rulesBtn');
        dom.rulesModal = document.getElementById('rulesModal');
        dom.closeRulesBtn = document.getElementById('closeRulesBtn');
        dom.gotItRulesBtn = document.getElementById('gotItRulesBtn');

        // Verify required DOM elements exist
        const requiredIDs = ['checkersBoard', 'turnValue', 'gameStatus', 'movesValue', 'redCount', 'blackCount', 'newGameBtn', 'undoBtn'];
        for (const id of requiredIDs) {
            if (!document.getElementById(id)) {
                console.error(`Checkers Initialization Error: Missing required DOM element #${id}`);
                return false;
            }
        }
        return true;
    }

    /* ==========================================================================
       4. INITIALIZATION & RESTART
       ========================================================================== */
    function init() {
        if (!cacheDOMElements()) return;

        attachEventListeners();
        resetGame();
    }

    function resetGame() {
        // Build 8x8 Board Data Structure
        state.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if ((r + c) % 2 === 1) { // Dark playable square
                    if (r < 3) {
                        state.board[r][c] = { player: PLAYER_BLACK, isKing: false };
                    } else if (r > 4) {
                        state.board[r][c] = { player: PLAYER_RED, isKing: false };
                    }
                }
            }
        }

        // Reset game state metadata
        state.currentPlayer = PLAYER_RED;
        state.selectedPiece = null;
        state.validMoves = [];
        state.forcedPiece = null;
        state.movesCount = 0;
        state.redCount = 12;
        state.blackCount = 12;
        state.gameOver = false;
        state.winner = null;
        state.history = [];
        state.lastMove = null;
        state.keyboardFocus = { row: 5, col: 1 };

        // Calculate legal moves for starting player
        state.allLegalMoves = calculateLegalMoves(state.currentPlayer, state.board, state.forcedPiece);

        // Hide modals & update UI
        hideModal(dom.gameOverModal);
        renderBoard();
        updateHUD();
        setStatus("Red's turn. Select a piece to move.");
    }

    /* ==========================================================================
       5. BOARD & PIECE RENDERING
       ========================================================================== */
    function renderBoard() {
        dom.board.innerHTML = '';

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.dataset.row = r;
                square.dataset.col = c;

                const isDark = (r + c) % 2 === 1;
                if (isDark) {
                    square.classList.add('square-dark', 'playable');
                } else {
                    square.classList.add('square-light');
                }

                // Keyboard focus indicator
                if (state.keyboardFocus.row === r && state.keyboardFocus.col === c) {
                    square.classList.add('keyboard-focused');
                }

                // Selected square state
                if (state.selectedPiece && state.selectedPiece.row === r && state.selectedPiece.col === c) {
                    square.classList.add('selected');
                }

                // Highlight last move squares
                if (state.lastMove) {
                    if (state.lastMove.from.row === r && state.lastMove.from.col === c) {
                        square.classList.add('last-move-origin');
                    } else if (state.lastMove.to.row === r && state.lastMove.to.col === c) {
                        square.classList.add('last-move-target');
                    }
                }

                // Render legal destinations if a piece is selected
                if (state.selectedPiece) {
                    const moveOption = state.validMoves.find(m => m.to.row === r && m.to.col === c);
                    if (moveOption) {
                        if (moveOption.isCapture) {
                            square.classList.add('legal-capture');
                        } else {
                            square.classList.add('legal-move');
                        }
                    }
                }

                // Render Checkers Piece
                const pieceData = state.board[r][c];
                if (pieceData) {
                    const pieceEl = document.createElement('div');
                    pieceEl.classList.add('checkers-piece');
                    pieceEl.classList.add(pieceData.player === PLAYER_RED ? 'piece-red' : 'piece-black');

                    if (pieceData.isKing) {
                        pieceEl.classList.add('piece-king');
                        pieceEl.innerHTML = CROWN_SVG_HTML;
                    }

                    // Accessibility labels
                    const kingStatus = pieceData.isKing ? 'King' : 'Man';
                    const colorStatus = pieceData.player === PLAYER_RED ? 'Red' : 'Black';
                    square.setAttribute('aria-label', `Square ${getColumnName(c)}${8 - r}, ${colorStatus} ${kingStatus}`);

                    square.appendChild(pieceEl);
                } else {
                    square.setAttribute('aria-label', `Square ${getColumnName(c)}${8 - r}, Empty`);
                }

                dom.board.appendChild(square);
            }
        }
    }

    function getColumnName(col) {
        return String.fromCharCode(65 + col);
    }

    /* ==========================================================================
       6. GAME RULES & MOVE GENERATION ENGINE
       ========================================================================== */
    function getPieceMoves(r, c, board, player) {
        const piece = board[r][c];
        if (!piece || piece.player !== player) return { simple: [], jumps: [] };

        const jumps = [];
        const simple = [];

        // Determine movement directions
        let directions = [];
        if (piece.isKing) {
            directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        } else if (player === PLAYER_RED) {
            directions = [[-1, -1], [-1, 1]]; // Red moves UP
        } else {
            directions = [[1, -1], [1, 1]];   // Black moves DOWN
        }

        for (const [dr, dc] of directions) {
            // Check standard move (1 square diagonal)
            const targetR = r + dr;
            const targetC = c + dc;

            if (isInBounds(targetR, targetC)) {
                if (board[targetR][targetC] === null) {
                    simple.push({
                        from: { row: r, col: c },
                        to: { row: targetR, col: targetC },
                        isCapture: false
                    });
                } else if (board[targetR][targetC].player !== player) {
                    // Check jump move (2 squares diagonal)
                    const jumpR = r + dr * 2;
                    const jumpC = c + dc * 2;

                    if (isInBounds(jumpR, jumpC) && board[jumpR][jumpC] === null) {
                        jumps.push({
                            from: { row: r, col: c },
                            to: { row: jumpR, col: jumpC },
                            isCapture: true,
                            captured: { row: targetR, col: targetC }
                        });
                    }
                }
            }
        }

        return { simple, jumps };
    }

    function calculateLegalMoves(player, board, forcedPiece = null) {
        let allJumps = [];
        let allSimple = [];

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] && board[r][c].player === player) {
                    // If mid-multi-jump, restrict checks strictly to the forced piece
                    if (forcedPiece && (forcedPiece.row !== r || forcedPiece.col !== c)) {
                        continue;
                    }

                    const { simple, jumps } = getPieceMoves(r, c, board, player);
                    allJumps.push(...jumps);
                    allSimple.push(...simple);
                }
            }
        }

        // Mandatory Capture Rule: If jumps are available, simple moves are prohibited!
        return allJumps.length > 0 ? allJumps : allSimple;
    }

    function isInBounds(r, c) {
        return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
    }

    /* ==========================================================================
       7. SELECTION & MOVE EXECUTION
       ========================================================================== */
    function handleSquareClick(r, c) {
        if (state.gameOver) return;

        const piece = state.board[r][c];

        // 1. If user clicks one of their own pieces
        if (piece && piece.player === state.currentPlayer) {
            // If in mid multi-jump, player cannot select a different piece
            if (state.forcedPiece && (state.forcedPiece.row !== r || state.forcedPiece.col !== c)) {
                setStatus("Multi-jump required! You must continue capturing with the highlighted piece.");
                return;
            }

            // Find available legal moves for this specific piece
            const pieceMoves = state.allLegalMoves.filter(m => m.from.row === r && m.from.col === c);

            if (pieceMoves.length > 0) {
                state.selectedPiece = { row: r, col: c };
                state.validMoves = pieceMoves;
                state.keyboardFocus = { row: r, col: c };
                renderBoard();

                const hasCaptures = pieceMoves.some(m => m.isCapture);
                if (hasCaptures) {
                    setStatus("Capture available — select a highlighted destination.");
                } else {
                    setStatus(`Selected ${piece.isKing ? 'King' : 'piece'} at ${getColumnName(c)}${8 - r}. Select destination.`);
                }
            } else {
                if (state.allLegalMoves.some(m => m.isCapture)) {
                    setStatus("Mandatory capture rule! You must select a piece that can capture.");
                } else {
                    setStatus("That piece has no legal moves.");
                }
            }
            return;
        }

        // 2. If a piece is already selected and user clicks a destination square
        if (state.selectedPiece) {
            const chosenMove = state.validMoves.find(m => m.to.row === r && m.to.col === c);

            if (chosenMove) {
                executeMove(chosenMove);
            } else {
                // Clicked an invalid destination square
                if (!state.forcedPiece) {
                    state.selectedPiece = null;
                    state.validMoves = [];
                    renderBoard();
                    setStatus(`${state.currentPlayer === PLAYER_RED ? "Red" : "Black"}'s turn. Select a piece.`);
                } else {
                    setStatus("You must complete the capture jump!");
                }
            }
        }
    }

    function executeMove(move) {
        saveHistorySnapshot();

        const { from, to, isCapture, captured } = move;
        const piece = state.board[from.row][from.col];

        // Update board array positions
        state.board[to.row][to.col] = piece;
        state.board[from.row][from.col] = null;
        state.lastMove = { from, to };

        // Handle capture removal
        if (isCapture && captured) {
            const capturedPiece = state.board[captured.row][captured.col];
            state.board[captured.row][captured.col] = null;

            if (capturedPiece.player === PLAYER_RED) {
                state.redCount--;
            } else {
                state.blackCount--;
            }
        }

        // Handle King Promotion
        let promoted = false;
        if (!piece.isKing) {
            if ((piece.player === PLAYER_RED && to.row === 0) || (piece.player === PLAYER_BLACK && to.row === BOARD_SIZE - 1)) {
                piece.isKing = true;
                promoted = true;
            }
        }

        // Multi-Jump Verification:
        // Under standard rules, if piece promotes upon landing, the turn ends immediately.
        if (isCapture && !promoted) {
            const { jumps: furtherJumps } = getPieceMoves(to.row, to.col, state.board, state.currentPlayer);

            if (furtherJumps.length > 0) {
                state.forcedPiece = { row: to.row, col: to.col };
                state.selectedPiece = { row: to.row, col: to.col };
                state.validMoves = furtherJumps;
                state.allLegalMoves = furtherJumps;
                state.keyboardFocus = { row: to.row, col: to.col };

                renderBoard();
                updateHUD();
                setStatus("Multi-jump available! Continue capturing with the same piece.");
                return; // Do NOT switch turn
            }
        }

        // Turn Completion
        state.forcedPiece = null;
        state.selectedPiece = null;
        state.validMoves = [];
        state.movesCount++;

        // Switch active player
        state.currentPlayer = state.currentPlayer === PLAYER_RED ? PLAYER_BLACK : PLAYER_RED;

        // Calculate legal moves for new player
        state.allLegalMoves = calculateLegalMoves(state.currentPlayer, state.board, state.forcedPiece);

        // Check Win/Loss/No-Move Condition
        if (state.allLegalMoves.length === 0) {
            state.gameOver = true;
            state.winner = state.currentPlayer === PLAYER_RED ? PLAYER_BLACK : PLAYER_RED;
            renderBoard();
            updateHUD();
            showGameOverModal();
            return;
        }

        renderBoard();
        updateHUD();

        const activeName = state.currentPlayer === PLAYER_RED ? "Red" : "Black";
        if (state.allLegalMoves.some(m => m.isCapture)) {
            setStatus(`${activeName}'s turn. Capture is mandatory! Select a highlighted piece.`);
        } else {
            setStatus(`${activeName}'s turn.`);
        }
    }

    /* ==========================================================================
       8. UNDO SYSTEM
       ========================================================================== */
    function saveHistorySnapshot() {
        const snapshot = {
            board: state.board.map(row => row.map(cell => cell ? { ...cell } : null)),
            currentPlayer: state.currentPlayer,
            movesCount: state.movesCount,
            redCount: state.redCount,
            blackCount: state.blackCount,
            forcedPiece: state.forcedPiece ? { ...state.forcedPiece } : null,
            lastMove: state.lastMove ? JSON.parse(JSON.stringify(state.lastMove)) : null,
            gameOver: state.gameOver,
            winner: state.winner
        };

        state.history.push(snapshot);
        if (state.history.length > 200) {
            state.history.shift();
        }
    }

    function undoMove() {
        if (state.history.length === 0) {
            setStatus("No moves to undo.");
            return;
        }

        const snapshot = state.history.pop();
        state.board = snapshot.board;
        state.currentPlayer = snapshot.currentPlayer;
        state.movesCount = snapshot.movesCount;
        state.redCount = snapshot.redCount;
        state.blackCount = snapshot.blackCount;
        state.forcedPiece = snapshot.forcedPiece;
        state.lastMove = snapshot.lastMove;
        state.gameOver = snapshot.gameOver;
        state.winner = snapshot.winner;

        state.selectedPiece = null;
        state.validMoves = [];
        state.allLegalMoves = calculateLegalMoves(state.currentPlayer, state.board, state.forcedPiece);

        hideModal(dom.gameOverModal);
        renderBoard();
        updateHUD();
        setStatus(`Move undone. ${state.currentPlayer === PLAYER_RED ? "Red" : "Black"}'s turn.`);
    }

    /* ==========================================================================
       9. HUD & STATUS UPDATES
       ========================================================================== */
    function updateHUD() {
        dom.movesValue.textContent = state.movesCount;
        dom.redCount.textContent = state.redCount;
        dom.blackCount.textContent = state.blackCount;

        const isRed = state.currentPlayer === PLAYER_RED;
        dom.turnText.textContent = isRed ? "Red" : "Black";
        dom.turnValue.className = `hud-value ${isRed ? 'turn-red' : 'turn-black'}`;

        dom.undoBtn.disabled = state.history.length === 0;
    }

    function setStatus(msg) {
        dom.gameStatus.textContent = msg;
    }

    /* ==========================================================================
       10. KEYBOARD NAVIGATION & ACCESSIBILITY
       ========================================================================== */
    function handleKeyDown(e) {
        // Global Keyboard Shortcuts
        if (e.key === 'n' || e.key === 'N') {
            if (!isModalOpen()) {
                resetGame();
                return;
            }
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            if (!isModalOpen()) undoMove();
            return;
        }

        if (e.key === 'Escape') {
            if (isModalOpen()) {
                hideModal(dom.gameOverModal);
                hideModal(dom.rulesModal);
            } else if (state.selectedPiece && !state.forcedPiece) {
                state.selectedPiece = null;
                state.validMoves = [];
                renderBoard();
                setStatus(`${state.currentPlayer === PLAYER_RED ? "Red" : "Black"}'s turn.`);
            }
            return;
        }

        if (isModalOpen()) return;

        // Board Navigation via Arrow Keys
        let { row, col } = state.keyboardFocus;
        let moved = false;

        switch (e.key) {
            case 'ArrowUp':
                row = Math.max(0, row - 1);
                moved = true;
                break;
            case 'ArrowDown':
                row = Math.min(BOARD_SIZE - 1, row + 1);
                moved = true;
                break;
            case 'ArrowLeft':
                col = Math.max(0, col - 1);
                moved = true;
                break;
            case 'ArrowRight':
                col = Math.min(BOARD_SIZE - 1, col + 1);
                moved = true;
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                handleSquareClick(row, col);
                return;
        }

        if (moved) {
            e.preventDefault();
            state.keyboardFocus = { row, col };
            renderBoard();
        }
    }

    /* ==========================================================================
       11. MODAL MANAGEMENT
       ========================================================================== */
    function showGameOverModal() {
        const winnerName = state.winner === PLAYER_RED ? "Red Wins!" : "Black Wins!";
        dom.winnerText.textContent = winnerName;
        dom.finalMoves.textContent = state.movesCount;
        dom.finalRed.textContent = state.redCount;
        dom.finalBlack.textContent = state.blackCount;

        showModal(dom.gameOverModal);
    }

    function showModal(modalEl) {
        modalEl.classList.remove('hidden');
    }

    function hideModal(modalEl) {
        modalEl.classList.add('hidden');
    }

    function isModalOpen() {
        return !dom.gameOverModal.classList.contains('hidden') || !dom.rulesModal.classList.contains('hidden');
    }

    /* ==========================================================================
       12. EVENT LISTENERS ATTACHMENT
       ========================================================================== */
    function attachEventListeners() {
        // Board Square Click Delegation
        dom.board.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (!square) return;

            const r = parseInt(square.dataset.row, 10);
            const c = parseInt(square.dataset.col, 10);

            if (!isNaN(r) && !isNaN(c)) {
                handleSquareClick(r, c);
            }
        });

        // Top Toolbar Controls
        dom.newGameBtn.addEventListener('click', resetGame);
        dom.undoBtn.addEventListener('click', undoMove);

        // Modals Controls
        dom.playAgainBtn.addEventListener('click', () => {
            hideModal(dom.gameOverModal);
            resetGame();
        });

        dom.closeModalBtn.addEventListener('click', () => {
            hideModal(dom.gameOverModal);
        });

        dom.rulesBtn.addEventListener('click', () => {
            showModal(dom.rulesModal);
        });

        dom.closeRulesBtn.addEventListener('click', () => {
            hideModal(dom.rulesModal);
        });

        dom.gotItRulesBtn.addEventListener('click', () => {
            hideModal(dom.rulesModal);
        });

        // Global Keyboard Handler
        window.addEventListener('keydown', handleKeyDown);
    }

    /* ==========================================================================
       13. APPLICATION DOM BOOTSTRAP
       ========================================================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
