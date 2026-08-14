/**
 * PRASUN GAMES — MINESWEEPER
 * https://games.prasunbarua.com/
 * 
 * Production-ready client-side game engine.
 * Features:
 * - First-click safety with 3x3 neighborhood protection
 * - Unbiased Fisher-Yates mine generation
 * - Flood-fill reveal algorithm
 * - Chording (dual/number click) support
 * - Mobile flag mode toggle
 * - Full WCAG-compliant keyboard navigation & ARIA updates
 * - Custom timer and mine counter formatting
 */

(() => {
    "use strict";

    // ============================================================
    // 1. CONFIGURATION & CONSTANTS
    // ============================================================
    const DIFFICULTIES = {
        beginner: {
            rows: 9,
            cols: 9,
            mines: 10
        },
        intermediate: {
            rows: 16,
            cols: 16,
            mines: 40
        },
        expert: {
            rows: 16,
            cols: 30,
            mines: 99
        }
    };

    // ============================================================
    // 2. DOM CACHE
    // ============================================================
    const elements = {
        app: document.getElementById("minesweeperApp"),
        difficulty: document.getElementById("difficultySelect"),
        newGame: document.getElementById("newGameBtn"),
        restart: document.getElementById("restartBtn"),
        flagMode: document.getElementById("flagModeBtn"),
        mineCount: document.getElementById("mineCount"),
        timer: document.getElementById("timerValue"),
        status: document.getElementById("gameStatus"),
        board: document.getElementById("minesweeperBoard"),
        modal: document.getElementById("gameModal"),
        modalTitle: document.getElementById("modalTitle"),
        modalMessage: document.getElementById("modalMessage"),
        modalTime: document.getElementById("modalTime"),
        modalMines: document.getElementById("modalMines"),
        modalNewGame: document.getElementById("modalNewGameBtn"),
        modalClose: document.getElementById("modalCloseBtn")
    };

    // Verify required critical DOM elements
    if (!elements.board || !elements.difficulty || !elements.newGame) {
        console.error("Minesweeper initialization failed: Required DOM elements are missing.");
        return;
    }

    // ============================================================
    // 3. GAME STATE
    // ============================================================
    const state = {
        difficulty: "beginner",
        rows: 9,
        cols: 9,
        totalMines: 10,
        board: [],          // 2D Array of cell objects
        domBoard: [],       // 2D Array of button DOM elements
        firstClick: true,
        gameStarted: false,
        gameOver: false,
        gameWon: false,
        flagsUsed: 0,
        revealedCount: 0,
        elapsedSeconds: 0,
        timerId: null,
        flagMode: false,
        focusedCell: { row: 0, col: 0 },
        explodedMine: null  // { row, col }
    };

    // ============================================================
    // 4. HELPER FUNCTIONS
    // ============================================================
    function formatMineCount(count) {
        if (count < 0) {
            const abs = Math.abs(count);
            return "-" + String(abs).padStart(2, "0");
        }
        return String(count).padStart(3, "0");
    }

    function formatTimer(seconds) {
        if (seconds > 999) return String(seconds);
        return String(seconds).padStart(3, "0");
    }

    function isValidCell(r, c) {
        return r >= 0 && r < state.rows && c >= 0 && c < state.cols;
    }

    function getNeighbors(r, c) {
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (isValidCell(nr, nc)) {
                    neighbors.push([nr, nc]);
                }
            }
        }
        return neighbors;
    }

    function countAdjacentMines(r, c) {
        let count = 0;
        const neighbors = getNeighbors(r, c);
        for (let i = 0; i < neighbors.length; i++) {
            const [nr, nc] = neighbors[i];
            if (state.board[nr][nc].mine) {
                count++;
            }
        }
        return count;
    }

    function setStatus(message) {
        if (elements.status) {
            elements.status.textContent = message;
        }
    }

    // ============================================================
    // 5. TIMER MANAGEMENT
    // ============================================================
    function startTimer() {
        stopTimer();
        state.elapsedSeconds = 0;
        if (elements.timer) {
            elements.timer.textContent = formatTimer(0);
        }
        state.timerId = setInterval(() => {
            state.elapsedSeconds++;
            if (elements.timer) {
                elements.timer.textContent = formatTimer(state.elapsedSeconds);
            }
        }, 1000);
    }

    function stopTimer() {
        if (state.timerId !== null) {
            clearInterval(state.timerId);
            state.timerId = null;
        }
    }

    function resetTimer() {
        stopTimer();
        state.elapsedSeconds = 0;
        if (elements.timer) {
            elements.timer.textContent = formatTimer(0);
        }
    }

    // ============================================================
    // 6. HUD & MODAL UPDATES
    // ============================================================
    function updateHUD() {
        if (elements.mineCount) {
            const remaining = state.totalMines - state.flagsUsed;
            elements.mineCount.textContent = formatMineCount(remaining);
        }
    }

    function showModal(won) {
        if (!elements.modal) return;

        if (elements.modalTitle) {
            elements.modalTitle.textContent = won ? "You Win!" : "Game Over";
        }
        if (elements.modalMessage) {
            elements.modalMessage.textContent = won
                ? "Excellent! You successfully cleared the minefield."
                : "You detonated a mine. Better luck next time!";
        }
        if (elements.modalTime) {
            elements.modalTime.textContent = formatTimer(state.elapsedSeconds);
        }
        if (elements.modalMines) {
            elements.modalMines.textContent = state.flagsUsed;
        }

        elements.modal.hidden = false;
        if (elements.modalNewGame) {
            elements.modalNewGame.focus();
        }
    }

    function hideModal() {
        if (elements.modal) {
            elements.modal.hidden = true;
        }
    }

    // ============================================================
    // 7. BOARD INITIALIZATION & MINE PLACEMENT
    // ============================================================
    function initializeDataModel() {
        state.board = [];
        state.domBoard = [];
        state.flagsUsed = 0;
        state.revealedCount = 0;
        state.firstClick = true;
        state.gameStarted = false;
        state.gameOver = false;
        state.gameWon = false;
        state.explodedMine = null;

        for (let r = 0; r < state.rows; r++) {
            const rowData = [];
            const domRow = [];
            for (let c = 0; c < state.cols; c++) {
                rowData.push({
                    row: r,
                    col: c,
                    mine: false,
                    revealed: false,
                    flagged: false,
                    adjacentMines: 0
                });
                domRow.push(null);
            }
            state.board.push(rowData);
            state.domBoard.push(domRow);
        }
    }

    function buildDOMBoard() {
        elements.board.innerHTML = "";
        elements.board.style.gridTemplateColumns = `repeat(${state.cols}, minmax(0, 1fr))`;

        const fragment = document.createDocumentFragment();

        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "cell";
                btn.setAttribute("role", "gridcell");
                btn.setAttribute("data-row", r);
                btn.setAttribute("data-col", c);
                btn.setAttribute("tabindex", (r === state.focusedCell.row && c === state.focusedCell.col) ? "0" : "-1");
                btn.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}, unrevealed`);

                state.domBoard[r][c] = btn;
                fragment.appendChild(btn);
            }
        }

        elements.board.appendChild(fragment);
    }

    function generateMines(safeRow, safeCol) {
        const totalCells = state.rows * state.cols;
        const protectedIndices = new Set();

        // Protect clicked cell and adjacent cells if room permits
        if (totalCells - state.totalMines >= 9) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const pr = safeRow + dr;
                    const pc = safeCol + dc;
                    if (isValidCell(pr, pc)) {
                        protectedIndices.add(pr * state.cols + pc);
                    }
                }
            }
        } else {
            protectedIndices.add(safeRow * state.cols + safeCol);
        }

        const validIndices = [];
        for (let i = 0; i < totalCells; i++) {
            if (!protectedIndices.has(i)) {
                validIndices.push(i);
            }
        }

        // Fisher-Yates unbiased shuffle
        for (let i = validIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
        }

        // Place mines
        const countToPlace = Math.min(state.totalMines, validIndices.length);
        for (let i = 0; i < countToPlace; i++) {
            const idx = validIndices[i];
            const r = Math.floor(idx / state.cols);
            const c = idx % state.cols;
            state.board[r][c].mine = true;
        }

        // Calculate adjacent mine counts
        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                if (!state.board[r][c].mine) {
                    state.board[r][c].adjacentMines = countAdjacentMines(r, c);
                }
            }
        }
    }

    // ============================================================
    // 8. CELL DOM RENDERER
    // ============================================================
    function updateCellDOM(r, c) {
        const cell = state.board[r][c];
        const btn = state.domBoard[r][c];
        if (!btn) return;

        btn.className = "cell";

        if (cell.revealed) {
            btn.classList.add("cell-revealed");
            if (cell.mine) {
                btn.classList.add("cell-mine");
                if (state.explodedMine && state.explodedMine.row === r && state.explodedMine.col === c) {
                    btn.classList.add("cell-exploded");
                }
                btn.textContent = "💣";
                btn.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}, mine`);
            } else if (cell.adjacentMines > 0) {
                btn.classList.add(`cell-number-${cell.adjacentMines}`);
                btn.textContent = cell.adjacentMines;
                btn.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}, revealed, ${cell.adjacentMines} adjacent mine${cell.adjacentMines > 1 ? "s" : ""}`);
            } else {
                btn.textContent = "";
                btn.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}, revealed, empty`);
            }
        } else if (cell.flagged) {
            btn.classList.add("cell-flagged");
            if (state.gameOver && !state.gameWon && !cell.mine) {
                btn.classList.add("cell-wrong-flag");
                btn.textContent = "❌";
                btn.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}, incorrectly flagged mine`);
            } else {
                btn.textContent = "🚩";
                btn.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}, flagged`);
            }
        } else {
            btn.textContent = "";
            btn.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}, unrevealed`);
        }
    }

    // ============================================================
    // 9. GAMEPLAY LOGIC & REVEAL ALGORITHMS
    // ============================================================
    function floodFill(startRow, startCol) {
        const queue = [[startRow, startCol]];
        const visited = new Set();
        visited.add(`${startRow},${startCol}`);

        while (queue.length > 0) {
            const [r, c] = queue.shift();
            const cell = state.board[r][c];

            if (cell.flagged) continue;

            if (!cell.revealed) {
                cell.revealed = true;
                state.revealedCount++;
                updateCellDOM(r, c);
            }

            if (cell.adjacentMines === 0) {
                const neighbors = getNeighbors(r, c);
                for (let i = 0; i < neighbors.length; i++) {
                    const [nr, nc] = neighbors[i];
                    const key = `${nr},${nc}`;
                    const nCell = state.board[nr][nc];

                    if (!nCell.revealed && !nCell.flagged && !visited.has(key)) {
                        visited.add(key);
                        queue.push([nr, nc]);
                    }
                }
            }
        }
    }

    function chordCell(r, c) {
        const cell = state.board[r][c];
        if (!cell.revealed || cell.adjacentMines === 0) return;

        const neighbors = getNeighbors(r, c);
        let flaggedCount = 0;
        for (let i = 0; i < neighbors.length; i++) {
            const [nr, nc] = neighbors[i];
            if (state.board[nr][nc].flagged) flaggedCount++;
        }

        if (flaggedCount === cell.adjacentMines) {
            let hitMine = false;
            let explodedPos = null;

            // Check for wrong flags leading to detonation
            for (let i = 0; i < neighbors.length; i++) {
                const [nr, nc] = neighbors[i];
                const nCell = state.board[nr][nc];
                if (!nCell.revealed && !nCell.flagged) {
                    if (nCell.mine) {
                        hitMine = true;
                        explodedPos = [nr, nc];
                        break;
                    }
                }
            }

            if (hitMine) {
                handleGameOver(false, explodedPos[0], explodedPos[1]);
                return;
            }

            // Reveal all safe surrounding cells
            for (let i = 0; i < neighbors.length; i++) {
                const [nr, nc] = neighbors[i];
                const nCell = state.board[nr][nc];
                if (!nCell.revealed && !nCell.flagged) {
                    if (nCell.adjacentMines === 0) {
                        floodFill(nr, nc);
                    } else {
                        nCell.revealed = true;
                        state.revealedCount++;
                        updateCellDOM(nr, nc);
                    }
                }
            }

            checkWinCondition();
        }
    }

    function toggleFlag(r, c) {
        if (state.gameOver) return;
        const cell = state.board[r][c];
        if (cell.revealed) return;

        cell.flagged = !cell.flagged;
        state.flagsUsed += cell.flagged ? 1 : -1;

        updateCellDOM(r, c);
        updateHUD();
        setStatus(cell.flagged ? "Flag placed." : "Flag removed.");
    }

    function handleLeftClick(r, c) {
        if (state.gameOver) return;

        // Support mobile flag toggle mode
        if (state.flagMode) {
            toggleFlag(r, c);
            return;
        }

        const cell = state.board[r][c];

        if (cell.flagged) return;

        if (cell.revealed) {
            chordCell(r, c);
            return;
        }

        // First-click safety execution
        if (state.firstClick) {
            state.firstClick = false;
            state.gameStarted = true;
            generateMines(r, c);
            startTimer();
            setStatus("Game in progress.");
        }

        if (cell.mine) {
            handleGameOver(false, r, c);
            return;
        }

        if (cell.adjacentMines === 0) {
            floodFill(r, c);
        } else {
            cell.revealed = true;
            state.revealedCount++;
            updateCellDOM(r, c);
        }

        checkWinCondition();
    }

    function handleRightClick(r, c) {
        if (state.gameOver) return;
        toggleFlag(r, c);
    }

    function checkWinCondition() {
        const totalSafeCells = (state.rows * state.cols) - state.totalMines;
        if (state.revealedCount === totalSafeCells) {
            handleGameOver(true);
        }
    }

    function handleGameOver(won, expRow = null, expCol = null) {
        stopTimer();
        state.gameOver = true;
        state.gameWon = won;

        if (won) {
            setStatus("You cleared the board! Victory!");
            // Auto-flag all remaining unflagged mines
            for (let r = 0; r < state.rows; r++) {
                for (let c = 0; c < state.cols; c++) {
                    const cell = state.board[r][c];
                    if (cell.mine && !cell.flagged) {
                        cell.flagged = true;
                        updateCellDOM(r, c);
                    }
                }
            }
            state.flagsUsed = state.totalMines;
            updateHUD();
            showModal(true);
        } else {
            state.explodedMine = expRow !== null ? { row: expRow, col: expCol } : null;
            setStatus("Mine hit! Game over.");

            // Reveal all mines and mark incorrect flags
            for (let r = 0; r < state.rows; r++) {
                for (let c = 0; c < state.cols; c++) {
                    const cell = state.board[r][c];
                    if (cell.mine && !cell.flagged) {
                        cell.revealed = true;
                    }
                    updateCellDOM(r, c);
                }
            }
            showModal(false);
        }
    }

    // ============================================================
    // 10. LIFECYCLE & RESET
    // ============================================================
    function startNewGame() {
        hideModal();
        resetTimer();

        const selectedKey = elements.difficulty.value;
        const config = DIFFICULTIES[selectedKey] || DIFFICULTIES.beginner;

        state.difficulty = selectedKey;
        state.rows = config.rows;
        state.cols = config.cols;
        state.totalMines = config.mines;
        state.focusedCell = { row: 0, col: 0 };

        initializeDataModel();
        buildDOMBoard();
        updateHUD();
        setStatus("Ready. Click a cell to begin.");
    }

    function restartCurrentGame() {
        startNewGame();
    }

    function changeDifficulty() {
        startNewGame();
    }

    // ============================================================
    // 11. KEYBOARD NAVIGATION & FOCUS CONTROL
    // ============================================================
    function setFocusCell(r, c) {
        if (!isValidCell(r, c)) return;

        const prevBtn = state.domBoard[state.focusedCell.row][state.focusedCell.col];
        if (prevBtn) prevBtn.setAttribute("tabindex", "-1");

        state.focusedCell = { row: r, col: c };

        const nextBtn = state.domBoard[r][c];
        if (nextBtn) {
            nextBtn.setAttribute("tabindex", "0");
            nextBtn.focus();
        }
    }

    function handleBoardKeyDown(e) {
        const { row, col } = state.focusedCell;

        switch (e.key) {
            case "ArrowUp":
                e.preventDefault();
                setFocusCell(row - 1, col);
                break;
            case "ArrowDown":
                e.preventDefault();
                setFocusCell(row + 1, col);
                break;
            case "ArrowLeft":
                e.preventDefault();
                setFocusCell(row, col - 1);
                break;
            case "ArrowRight":
                e.preventDefault();
                setFocusCell(row, col + 1);
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                handleLeftClick(row, col);
                break;
            case "f":
            case "F":
                e.preventDefault();
                toggleFlag(row, col);
                break;
        }
    }

    function handleGlobalKeyDown(e) {
        // Do not intercept input typing
        const activeTag = document.activeElement ? document.activeElement.tagName : "";
        if (activeTag === "INPUT" || activeTag === "SELECT" || activeTag === "TEXTAREA") {
            return;
        }

        if (e.key === "Escape") {
            hideModal();
        } else if (e.key === "r" || e.key === "R") {
            restartCurrentGame();
        } else if (e.key === "n" || e.key === "N") {
            startNewGame();
        }
    }

    // ============================================================
    // 12. EVENT BINDING
    // ============================================================
    function bindEvents() {
        // Difficulty Select
        elements.difficulty.addEventListener("change", changeDifficulty);

        // Control Buttons
        if (elements.newGame) {
            elements.newGame.addEventListener("click", startNewGame);
        }
        if (elements.restart) {
            elements.restart.addEventListener("click", restartCurrentGame);
        }

        // Mobile Flag Mode Toggle
        if (elements.flagMode) {
            elements.flagMode.addEventListener("click", () => {
                state.flagMode = !state.flagMode;
                elements.flagMode.classList.toggle("active", state.flagMode);
                elements.flagMode.setAttribute("aria-pressed", state.flagMode ? "true" : "false");
                elements.flagMode.textContent = state.flagMode ? "🚩 Flag Mode: ON" : "🚩 Flag Mode: OFF";
                setStatus(state.flagMode ? "Flag mode enabled." : "Flag mode disabled.");
            });
        }

        // Modal Buttons
        if (elements.modalNewGame) {
            elements.modalNewGame.addEventListener("click", startNewGame);
        }
        if (elements.modalClose) {
            elements.modalClose.addEventListener("click", hideModal);
        }

        // Board Event Delegation
        elements.board.addEventListener("click", (e) => {
            const btn = e.target.closest(".cell");
            if (!btn) return;
            const r = parseInt(btn.dataset.row, 10);
            const c = parseInt(btn.dataset.col, 10);
            if (!isNaN(r) && !isNaN(c)) {
                state.focusedCell = { row: r, col: c };
                handleLeftClick(r, c);
            }
        });

        elements.board.addEventListener("contextmenu", (e) => {
            const btn = e.target.closest(".cell");
            if (!btn) return;
            e.preventDefault();
            const r = parseInt(btn.dataset.row, 10);
            const c = parseInt(btn.dataset.col, 10);
            if (!isNaN(r) && !isNaN(c)) {
                state.focusedCell = { row: r, col: c };
                handleRightClick(r, c);
            }
        });

        // Board Focus Management & Keyboard Navigation
        elements.board.addEventListener("keydown", handleBoardKeyDown);
        document.addEventListener("keydown", handleGlobalKeyDown);
    }

    // ============================================================
    // 13. INITIALIZATION ENTRY POINT
    // ============================================================
    function init() {
        bindEvents();
        startNewGame();
    }

    // Run initialization directly (script loaded with defer)
    init();

})();
