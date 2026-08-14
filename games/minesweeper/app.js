/**
 * ================================================================
 * PRASUN GAMES — MINESWEEPER
 * ================================================================
 *
 * Classic browser Minesweeper
 *
 * Features:
 * - Beginner / Intermediate / Expert
 * - First-click safety
 * - 3x3 protected first-click area when possible
 * - Fisher-Yates mine placement
 * - Flood-fill empty areas
 * - Right-click flagging
 * - Mobile flag mode
 * - Chording on revealed numbered cells
 * - Keyboard navigation
 * - Accessible ARIA labels
 * - Timer
 * - Win / loss modal
 *
 * ================================================================
 */

(() => {

    "use strict";


    /* =============================================================
       1. GAME CONFIGURATION
       ============================================================= */

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


    /* =============================================================
       2. DOM ELEMENTS
       ============================================================= */

    const elements = {

        difficulty:
            document.getElementById("difficultySelect"),

        newGame:
            document.getElementById("newGameBtn"),

        restart:
            document.getElementById("restartBtn"),

        flagMode:
            document.getElementById("flagModeBtn"),

        mineCount:
            document.getElementById("mineCount"),

        timer:
            document.getElementById("timerValue"),

        status:
            document.getElementById("gameStatus"),

        board:
            document.getElementById("minesweeperBoard"),

        modal:
            document.getElementById("gameModal"),

        modalTitle:
            document.getElementById("modalTitle"),

        modalMessage:
            document.getElementById("modalMessage"),

        modalTime:
            document.getElementById("modalTime"),

        modalMines:
            document.getElementById("modalMines"),

        modalNewGame:
            document.getElementById("modalNewGameBtn"),

        modalClose:
            document.getElementById("modalCloseBtn")

    };


    if (
        !elements.difficulty ||
        !elements.board ||
        !elements.newGame
    ) {

        console.error(
            "Minesweeper initialization failed: required elements are missing."
        );

        return;
    }


    /* =============================================================
       3. GAME STATE
       ============================================================= */

    const state = {

        difficulty: "beginner",

        rows: 9,

        cols: 9,

        totalMines: 10,

        board: [],

        domBoard: [],

        firstClick: true,

        gameStarted: false,

        gameOver: false,

        gameWon: false,

        flagsUsed: 0,

        revealedCount: 0,

        elapsedSeconds: 0,

        timerId: null,

        flagMode: false,

        focusedCell: {
            row: 0,
            col: 0
        },

        explodedMine: null

    };


    /* =============================================================
       4. FORMATTING
       ============================================================= */

    function formatMineCount(value) {

        if (value < 0) {

            return "-" +
                String(Math.abs(value)).padStart(2, "0");

        }

        return String(value).padStart(3, "0");

    }


    function formatTimer(seconds) {

        return String(seconds).padStart(3, "0");

    }


    /* =============================================================
       5. BOARD HELPERS
       ============================================================= */

    function isValidCell(row, col) {

        return (
            row >= 0 &&
            row < state.rows &&
            col >= 0 &&
            col < state.cols
        );

    }


    function getNeighbors(row, col) {

        const neighbors = [];

        for (let dr = -1; dr <= 1; dr++) {

            for (let dc = -1; dc <= 1; dc++) {

                if (dr === 0 && dc === 0) {
                    continue;
                }

                const newRow = row + dr;
                const newCol = col + dc;

                if (
                    isValidCell(newRow, newCol)
                ) {

                    neighbors.push([
                        newRow,
                        newCol
                    ]);

                }

            }

        }

        return neighbors;

    }


    function countAdjacentMines(row, col) {

        let count = 0;

        const neighbors =
            getNeighbors(row, col);

        for (const [r, c] of neighbors) {

            if (state.board[r][c].mine) {
                count++;
            }

        }

        return count;

    }


    /* =============================================================
       6. STATUS / HUD
       ============================================================= */

    function setStatus(message) {

        if (elements.status) {
            elements.status.textContent = message;
        }

    }


    function updateHUD() {

        const remaining =
            state.totalMines - state.flagsUsed;

        elements.mineCount.textContent =
            formatMineCount(remaining);

    }


    /* =============================================================
       7. TIMER
       ============================================================= */

    function stopTimer() {

        if (state.timerId !== null) {

            clearInterval(state.timerId);

            state.timerId = null;

        }

    }


    function resetTimer() {

        stopTimer();

        state.elapsedSeconds = 0;

        elements.timer.textContent =
            formatTimer(0);

    }


    function startTimer() {

        stopTimer();

        state.elapsedSeconds = 0;

        elements.timer.textContent =
            formatTimer(0);

        state.timerId = setInterval(() => {

            if (state.elapsedSeconds < 999) {

                state.elapsedSeconds++;

            }

            elements.timer.textContent =
                formatTimer(state.elapsedSeconds);

        }, 1000);

    }


    /* =============================================================
       8. MODAL
       ============================================================= */

    function showModal(won) {

        if (!elements.modal) {
            return;
        }


        elements.modalTitle.textContent =
            won ? "You Win!" : "Game Over";


        elements.modalMessage.textContent =
            won
                ? "Excellent! You successfully cleared the minefield."
                : "You detonated a mine. Better luck next time!";


        elements.modalTime.textContent =
            formatTimer(state.elapsedSeconds);


        elements.modalMines.textContent =
            state.flagsUsed;


        elements.modal.hidden = false;


        if (elements.modalNewGame) {

            setTimeout(() => {
                elements.modalNewGame.focus();
            }, 0);

        }

    }


    function hideModal() {

        if (elements.modal) {
            elements.modal.hidden = true;
        }

    }


    /* =============================================================
       9. DATA INITIALIZATION
       ============================================================= */

    function initializeDataModel() {

        state.board = [];

        state.domBoard = [];

        state.firstClick = true;

        state.gameStarted = false;

        state.gameOver = false;

        state.gameWon = false;

        state.flagsUsed = 0;

        state.revealedCount = 0;

        state.explodedMine = null;


        for (let row = 0; row < state.rows; row++) {

            const rowData = [];

            const domRow = [];


            for (
                let col = 0;
                col < state.cols;
                col++
            ) {

                rowData.push({

                    row,

                    col,

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


    /* =============================================================
       10. BUILD BOARD DOM
       ============================================================= */

    function buildDOMBoard() {

        elements.board.innerHTML = "";

        elements.board.style.gridTemplateColumns =
            `repeat(${state.cols}, 36px)`;


        const fragment =
            document.createDocumentFragment();


        for (let row = 0; row < state.rows; row++) {

            for (
                let col = 0;
                col < state.cols;
                col++
            ) {

                const button =
                    document.createElement("button");


                button.type = "button";

                button.className = "cell";

                button.setAttribute(
                    "role",
                    "gridcell"
                );

                button.dataset.row = row;

                button.dataset.col = col;

                button.tabIndex =
                    (
                        row === state.focusedCell.row &&
                        col === state.focusedCell.col
                    )
                        ? 0
                        : -1;


                button.setAttribute(
                    "aria-label",
                    `Row ${row + 1}, Column ${col + 1}, unrevealed`
                );


                state.domBoard[row][col] =
                    button;


                fragment.appendChild(button);

            }

        }


        elements.board.appendChild(fragment);

    }


    /* =============================================================
       11. MINE GENERATION
       ============================================================= */

    function generateMines(safeRow, safeCol) {

        const totalCells =
            state.rows * state.cols;


        const protectedIndices =
            new Set();


        /*
         * Protect the first-click cell and its
         * surrounding 3x3 area when possible.
         */

        if (
            totalCells - state.totalMines >= 9
        ) {

            for (let dr = -1; dr <= 1; dr++) {

                for (let dc = -1; dc <= 1; dc++) {

                    const row =
                        safeRow + dr;

                    const col =
                        safeCol + dc;


                    if (
                        isValidCell(row, col)
                    ) {

                        protectedIndices.add(
                            row * state.cols + col
                        );

                    }

                }

            }

        } else {

            protectedIndices.add(
                safeRow * state.cols + safeCol
            );

        }


        const available = [];


        for (
            let index = 0;
            index < totalCells;
            index++
        ) {

            if (
                !protectedIndices.has(index)
            ) {

                available.push(index);

            }

        }


        /*
         * Fisher-Yates shuffle.
         */

        for (
            let i = available.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(Math.random() * (i + 1));


            [
                available[i],
                available[j]
            ] = [
                available[j],
                available[i]
            ];

        }


        /*
         * Place mines.
         */

        const mineCount =
            Math.min(
                state.totalMines,
                available.length
            );


        for (
            let i = 0;
            i < mineCount;
            i++
        ) {

            const index =
                available[i];


            const row =
                Math.floor(index / state.cols);


            const col =
                index % state.cols;


            state.board[row][col].mine = true;

        }


        /*
         * Calculate number clues.
         */

        for (
            let row = 0;
            row < state.rows;
            row++
        ) {

            for (
                let col = 0;
                col < state.cols;
                col++
            ) {

                if (
                    !state.board[row][col].mine
                ) {

                    state.board[row][col].adjacentMines =
                        countAdjacentMines(row, col);

                }

            }

        }

    }


    /* =============================================================
       12. RENDER CELL
       ============================================================= */

    function updateCellDOM(row, col) {

        const cell =
            state.board[row][col];

        const button =
            state.domBoard[row][col];


        if (!button) {
            return;
        }


        button.className = "cell";


        if (cell.revealed) {

            button.classList.add(
                "cell-revealed"
            );


            if (cell.mine) {

                button.classList.add(
                    "cell-mine"
                );


                if (
                    state.explodedMine &&
                    state.explodedMine.row === row &&
                    state.explodedMine.col === col
                ) {

                    button.classList.add(
                        "cell-exploded"
                    );

                }


                button.textContent = "💣";


                button.setAttribute(
                    "aria-label",
                    `Row ${row + 1}, Column ${col + 1}, mine`
                );


                return;

            }


            if (cell.adjacentMines > 0) {

                button.classList.add(
                    `cell-number-${cell.adjacentMines}`
                );


                button.textContent =
                    cell.adjacentMines;


                button.setAttribute(
                    "aria-label",
                    `Row ${row + 1}, Column ${col + 1}, revealed, ${cell.adjacentMines} adjacent mines`
                );


                return;

            }


            button.textContent = "";

            button.setAttribute(
                "aria-label",
                `Row ${row + 1}, Column ${col + 1}, revealed, empty`
            );


            return;

        }


        if (cell.flagged) {

            button.classList.add(
                "cell-flagged"
            );


            if (
                state.gameOver &&
                !state.gameWon &&
                !cell.mine
            ) {

                button.classList.add(
                    "cell-wrong-flag"
                );

                button.textContent = "❌";

                button.setAttribute(
                    "aria-label",
                    `Row ${row + 1}, Column ${col + 1}, incorrect flag`
                );

            } else {

                button.textContent = "🚩";

                button.setAttribute(
                    "aria-label",
                    `Row ${row + 1}, Column ${col + 1}, flagged`
                );

            }


            return;

        }


        button.textContent = "";

        button.setAttribute(
            "aria-label",
            `Row ${row + 1}, Column ${col + 1}, unrevealed`
        );

    }


    /* =============================================================
       13. FLOOD FILL
       ============================================================= */

    function floodFill(startRow, startCol) {

        const queue = [
            [startRow, startCol]
        ];

        const visited = new Set();


        visited.add(
            `${startRow},${startCol}`
        );


        let index = 0;


        while (index < queue.length) {

            const [row, col] =
                queue[index++];


            const cell =
                state.board[row][col];


            if (cell.flagged) {
                continue;
            }


            if (!cell.revealed) {

                cell.revealed = true;

                state.revealedCount++;

                updateCellDOM(row, col);

            }


            if (
                cell.adjacentMines !== 0
            ) {

                continue;

            }


            for (
                const [nextRow, nextCol]
                of getNeighbors(row, col)
            ) {

                const nextCell =
                    state.board[nextRow][nextCol];


                const key =
                    `${nextRow},${nextCol}`;


                if (
                    !nextCell.revealed &&
                    !nextCell.flagged &&
                    !visited.has(key)
                ) {

                    visited.add(key);

                    queue.push([
                        nextRow,
                        nextCol
                    ]);

                }

            }

        }

    }


    /* =============================================================
       14. FLAGGING
       ============================================================= */

    function toggleFlag(row, col) {

        if (state.gameOver) {
            return;
        }


        const cell =
            state.board[row][col];


        if (cell.revealed) {
            return;
        }


        cell.flagged =
            !cell.flagged;


        state.flagsUsed +=
            cell.flagged ? 1 : -1;


        updateCellDOM(row, col);

        updateHUD();


        setStatus(
            cell.flagged
                ? "Flag placed."
                : "Flag removed."
        );

    }


    /* =============================================================
       15. CHORDING
       ============================================================= */

    function chordCell(row, col) {

        const cell =
            state.board[row][col];


        if (
            !cell.revealed ||
            cell.adjacentMines === 0
        ) {

            return;

        }


        const neighbors =
            getNeighbors(row, col);


        let flags = 0;


        for (
            const [r, c]
            of neighbors
        ) {

            if (
                state.board[r][c].flagged
            ) {

                flags++;

            }

        }


        if (
            flags !== cell.adjacentMines
        ) {

            return;

        }


        for (
            const [r, c]
            of neighbors
        ) {

            const neighbor =
                state.board[r][c];


            if (
                neighbor.revealed ||
                neighbor.flagged
            ) {

                continue;

            }


            if (neighbor.mine) {

                handleGameOver(
                    false,
                    r,
                    c
                );

                return;

            }

        }


        for (
            const [r, c]
            of neighbors
        ) {

            const neighbor =
                state.board[r][c];


            if (
                neighbor.revealed ||
                neighbor.flagged
            ) {

                continue;

            }


            if (
                neighbor.adjacentMines === 0
            ) {

                floodFill(r, c);

            } else {

                neighbor.revealed = true;

                state.revealedCount++;

                updateCellDOM(r, c);

            }

        }


        checkWinCondition();

    }


    /* =============================================================
       16. LEFT CLICK
       ============================================================= */

    function handleLeftClick(row, col) {

        if (state.gameOver) {
            return;
        }


        if (state.flagMode) {

            toggleFlag(row, col);

            return;

        }


        const cell =
            state.board[row][col];


        if (cell.flagged) {
            return;
        }


        if (cell.revealed) {

            chordCell(row, col);

            return;

        }


        /*
         * First click:
         * Generate mines only after the player chooses
         * the first square.
         */

        if (state.firstClick) {

            state.firstClick = false;

            state.gameStarted = true;

            generateMines(row, col);

            startTimer();

            setStatus(
                "Game in progress."
            );

        }


        if (cell.mine) {

            handleGameOver(
                false,
                row,
                col
            );

            return;

        }


        if (
            cell.adjacentMines === 0
        ) {

            floodFill(row, col);

        } else {

            cell.revealed = true;

            state.revealedCount++;

            updateCellDOM(row, col);

        }


        checkWinCondition();

    }


    /* =============================================================
       17. RIGHT CLICK
       ============================================================= */

    function handleRightClick(row, col) {

        toggleFlag(row, col);

    }


    /* =============================================================
       18. WIN CHECK
       ============================================================= */

    function checkWinCondition() {

        const safeCells =
            state.rows * state.cols -
            state.totalMines;


        if (
            state.revealedCount >= safeCells
        ) {

            handleGameOver(true);

        }

    }


    /* =============================================================
       19. GAME OVER
       ============================================================= */

    function handleGameOver(
        won,
        explodedRow = null,
        explodedCol = null
    ) {

        stopTimer();


        state.gameOver = true;

        state.gameWon = won;


        if (won) {

            setStatus(
                "You cleared the board! Victory!"
            );


            /*
             * Automatically flag remaining mines.
             */

            for (
                let row = 0;
                row < state.rows;
                row++
            ) {

                for (
                    let col = 0;
                    col < state.cols;
                    col++
                ) {

                    const cell =
                        state.board[row][col];


                    if (
                        cell.mine &&
                        !cell.flagged
                    ) {

                        cell.flagged = true;

                        updateCellDOM(
                            row,
                            col
                        );

                    }

                }

            }


            state.flagsUsed =
                state.totalMines;


            updateHUD();

            showModal(true);

            return;

        }


        state.explodedMine =
            explodedRow !== null
                ? {
                    row: explodedRow,
                    col: explodedCol
                }
                : null;


        setStatus(
            "Mine hit! Game over."
        );


        /*
         * Reveal mines and show incorrect flags.
         */

        for (
            let row = 0;
            row < state.rows;
            row++
        ) {

            for (
                let col = 0;
                col < state.cols;
                col++
            ) {

                const cell =
                    state.board[row][col];


                if (
                    cell.mine &&
                    !cell.flagged
                ) {

                    cell.revealed = true;

                }


                updateCellDOM(
                    row,
                    col
                );

            }

        }


        showModal(false);

    }


    /* =============================================================
       20. START NEW GAME
       ============================================================= */

    function startNewGame() {

        hideModal();

        resetTimer();


        const selected =
            elements.difficulty.value;


        const config =
            DIFFICULTIES[selected] ||
            DIFFICULTIES.beginner;


        state.difficulty =
            selected;


        state.rows =
            config.rows;


        state.cols =
            config.cols;


        state.totalMines =
            config.mines;


        state.focusedCell = {
            row: 0,
            col: 0
        };


        initializeDataModel();

        buildDOMBoard();

        updateHUD();

        setStatus(
            "Ready. Click a cell to begin."
        );


        /*
         * Ensure the first cell is keyboard accessible.
         */

        const firstCell =
            state.domBoard[0][0];


        if (firstCell) {
            firstCell.focus();
        }

    }


    /* =============================================================
       21. KEYBOARD FOCUS
       ============================================================= */

    function setFocusCell(row, col) {

        if (
            !isValidCell(row, col)
        ) {

            return;

        }


        const previous =
            state.domBoard[
                state.focusedCell.row
            ][
                state.focusedCell.col
            ];


        if (previous) {
            previous.tabIndex = -1;
        }


        state.focusedCell = {
            row,
            col
        };


        const next =
            state.domBoard[row][col];


        if (next) {

            next.tabIndex = 0;

            next.focus();

        }

    }


    function handleBoardKeyDown(event) {

        const {
            row,
            col
        } = state.focusedCell;


        switch (event.key) {

            case "ArrowUp":

                event.preventDefault();

                setFocusCell(
                    row - 1,
                    col
                );

                break;


            case "ArrowDown":

                event.preventDefault();

                setFocusCell(
                    row + 1,
                    col
                );

                break;


            case "ArrowLeft":

                event.preventDefault();

                setFocusCell(
                    row,
                    col - 1
                );

                break;


            case "ArrowRight":

                event.preventDefault();

                setFocusCell(
                    row,
                    col + 1
                );

                break;


            case "Enter":
            case " ":

                event.preventDefault();

                handleLeftClick(
                    row,
                    col
                );

                break;


            case "f":
            case "F":

                event.preventDefault();

                toggleFlag(
                    row,
                    col
                );

                break;

        }

    }


    /* =============================================================
       22. GLOBAL KEYBOARD
       ============================================================= */

    function handleGlobalKeyDown(event) {

        const active =
            document.activeElement;


        const tag =
            active
                ? active.tagName
                : "";


        if (
            tag === "INPUT" ||
            tag === "SELECT" ||
            tag === "TEXTAREA"
        ) {

            return;

        }


        if (
            event.key === "Escape"
        ) {

            hideModal();

        }


        else if (
            event.key === "r" ||
            event.key === "R"
        ) {

            startNewGame();

        }


        else if (
            event.key === "n" ||
            event.key === "N"
        ) {

            startNewGame();

        }

    }


    /* =============================================================
       23. EVENTS
       ============================================================= */

    function bindEvents() {

        /*
         * Difficulty
         */

        elements.difficulty.addEventListener(
            "change",
            startNewGame
        );


        /*
         * New Game
         */

        elements.newGame.addEventListener(
            "click",
            startNewGame
        );


        /*
         * Restart
         */

        if (elements.restart) {

            elements.restart.addEventListener(
                "click",
                startNewGame
            );

        }


        /*
         * Mobile flag mode
         */

        if (elements.flagMode) {

            elements.flagMode.addEventListener(
                "click",
                () => {

                    state.flagMode =
                        !state.flagMode;


                    elements.flagMode.classList.toggle(
                        "active",
                        state.flagMode
                    );


                    elements.flagMode.setAttribute(
                        "aria-pressed",
                        String(state.flagMode)
                    );


                    elements.flagMode.textContent =
                        state.flagMode
                            ? "🚩 Flag Mode: ON"
                            : "🚩 Flag Mode: OFF";


                    setStatus(
                        state.flagMode
                            ? "Flag mode enabled."
                            : "Flag mode disabled."
                    );

                }
            );

        }


        /*
         * Modal
         */

        if (elements.modalNewGame) {

            elements.modalNewGame.addEventListener(
                "click",
                startNewGame
            );

        }


        if (elements.modalClose) {

            elements.modalClose.addEventListener(
                "click",
                hideModal
            );

        }


        /*
         * Board left click
         */

        elements.board.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(".cell");


                if (!button) {
                    return;
                }


                const row =
                    Number(button.dataset.row);


                const col =
                    Number(button.dataset.col);


                state.focusedCell = {
                    row,
                    col
                };


                handleLeftClick(
                    row,
                    col
                );

            }
        );


        /*
         * Right click / flag
         */

        elements.board.addEventListener(
            "contextmenu",
            event => {

                const button =
                    event.target.closest(".cell");


                if (!button) {
                    return;
                }


                event.preventDefault();


                const row =
                    Number(button.dataset.row);


                const col =
                    Number(button.dataset.col);


                state.focusedCell = {
                    row,
                    col
                };


                handleRightClick(
                    row,
                    col
                );

            }
        );


        /*
         * Keyboard board navigation
         */

        elements.board.addEventListener(
            "keydown",
            handleBoardKeyDown
        );


        /*
         * Global keyboard shortcuts
         */

        document.addEventListener(
            "keydown",
            handleGlobalKeyDown
        );

    }


    /* =============================================================
       24. INITIALIZATION
       ============================================================= */

    function init() {

        bindEvents();

        startNewGame();

    }


    init();

})();
