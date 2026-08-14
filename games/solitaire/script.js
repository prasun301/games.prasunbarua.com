/* =========================================================
   PRASUN GAMES — CLASSIC KLONDIKE SOLITAIRE
========================================================= */

"use strict";


/* =========================================================
   CONSTANTS
========================================================= */

const SUITS = ["spades", "hearts", "clubs", "diamonds"];

const SUIT_SYMBOLS = {
    spades: "♠",
    hearts: "♥",
    clubs: "♣",
    diamonds: "♦"
};

const RANK_NAMES = {
    1: "A",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "10",
    11: "J",
    12: "Q",
    13: "K"
};


/* =========================================================
   GAME STATE
========================================================= */

let tableau = [];

let stock = [];

let waste = [];

let foundations = [
    [],
    [],
    [],
    []
];

let moves = 0;

let seconds = 0;

let timerInterval = null;

let gameStarted = false;

let gameWon = false;

let selectedCards = [];

let selectedSource = null;

let history = [];


/* =========================================================
   DOM
========================================================= */

const tableauElement =
    document.getElementById("tableau");

const stockElement =
    document.getElementById("stock");

const wasteElement =
    document.getElementById("waste");

const movesElement =
    document.getElementById("moves");

const timerElement =
    document.getElementById("timer");

const newGameButton =
    document.getElementById("newGameBtn");

const undoButton =
    document.getElementById("undoBtn");

const winModal =
    document.getElementById("winModal");

const finalMoves =
    document.getElementById("finalMoves");

const finalTime =
    document.getElementById("finalTime");

const playAgainButton =
    document.getElementById("playAgainBtn");


/* =========================================================
   CARD CREATION
========================================================= */

function createDeck() {

    const deck = [];

    for (const suit of SUITS) {

        for (let rank = 1; rank <= 13; rank++) {

            deck.push({
                id: `${suit}-${rank}`,
                suit,
                rank,
                faceUp: false
            });
        }
    }

    return deck;
}


/* =========================================================
   SHUFFLE
========================================================= */

function shuffle(array) {

    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {

        const j =
            Math.floor(Math.random() * (i + 1));

        [copy[i], copy[j]] =
            [copy[j], copy[i]];
    }

    return copy;
}


/* =========================================================
   NEW GAME
========================================================= */

function newGame() {

    stopTimer();

    tableau = Array.from(
        { length: 7 },
        () => []
    );

    stock = [];

    waste = [];

    foundations = [
        [],
        [],
        [],
        []
    ];

    moves = 0;

    seconds = 0;

    gameStarted = false;

    gameWon = false;

    selectedCards = [];

    selectedSource = null;

    history = [];

    hideWinModal();

    const deck = shuffle(createDeck());

    let cardIndex = 0;


    /*
        Deal the seven tableau columns.

        Column 0 = 1 card
        Column 1 = 2 cards
        ...
        Column 6 = 7 cards
    */

    for (
        let column = 0;
        column < 7;
        column++
    ) {

        for (
            let row = 0;
            row <= column;
            row++
        ) {

            const card = deck[cardIndex++];

            card.faceUp =
                row === column;

            tableau[column].push(card);
        }
    }


    /* Remaining cards go into stock */

    stock = deck.slice(cardIndex);

    render();

    updateStats();
}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    if (timerInterval !== null) {
        return;
    }

    timerInterval = setInterval(() => {

        if (!gameStarted || gameWon) {
            return;
        }

        seconds++;

        updateTimer();

    }, 1000);
}


function stopTimer() {

    if (timerInterval !== null) {

        clearInterval(timerInterval);

        timerInterval = null;
    }
}


function updateTimer() {

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        seconds % 60;

    timerElement.textContent =
        `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}


/* =========================================================
   GAME START
========================================================= */

function ensureGameStarted() {

    if (!gameStarted) {

        gameStarted = true;

        startTimer();
    }
}


/* =========================================================
   STATS
========================================================= */

function updateStats() {

    movesElement.textContent = moves;

    updateTimer();
}


/* =========================================================
   RENDER
========================================================= */

function render() {

    renderStock();

    renderWaste();

    renderFoundations();

    renderTableau();
}


/* =========================================================
   RENDER STOCK
========================================================= */

function renderStock() {

    stockElement.innerHTML = "";

    if (stock.length === 0) {

        stockElement.classList.add("empty-stock");

        return;
    }

    stockElement.classList.remove("empty-stock");

    const card =
        stock[stock.length - 1];

    const element =
        createCardElement(
            card,
            "stock"
        );

    stockElement.appendChild(element);
}


/* =========================================================
   RENDER WASTE
========================================================= */

function renderWaste() {

    wasteElement.innerHTML = "";

    if (waste.length === 0) {
        return;
    }

    /*
        Show only the top waste card.
    */

    const card =
        waste[waste.length - 1];

    const element =
        createCardElement(
            card,
            "waste"
        );

    wasteElement.appendChild(element);
}


/* =========================================================
   RENDER FOUNDATIONS
========================================================= */

function renderFoundations() {

    foundations.forEach(
        (foundation, index) => {

            const element =
                document.getElementById(
                    `foundation-${index}`
                );

            if (!element) {
                return;
            }

            element.innerHTML = "";

            if (foundation.length === 0) {

                const suit =
                    SUITS[index];

                element.setAttribute(
                    "data-suit",
                    SUIT_SYMBOLS[suit]
                );

                return;
            }

            element.removeAttribute(
                "data-suit"
            );

            const card =
                foundation[
                    foundation.length - 1
                ];

            const cardElement =
                createCardElement(
                    card,
                    "foundation"
                );

            element.appendChild(
                cardElement
            );
        }
    );
}


/* =========================================================
   RENDER TABLEAU
========================================================= */

function renderTableau() {

    tableauElement.innerHTML = "";

    tableau.forEach(
        (column, columnIndex) => {

            const columnElement =
                document.createElement("div");

            columnElement.className =
                "tableau-column";

            columnElement.dataset.column =
                columnIndex;


            if (column.length === 0) {

                const empty =
                    document.createElement("div");

                empty.className =
                    "tableau-empty";

                empty.textContent = "K";

                empty.dataset.column =
                    columnIndex;

                columnElement.appendChild(
                    empty
                );

            } else {

                column.forEach(
                    (card, cardIndex) => {

                        const element =
                            createCardElement(
                                card,
                                "tableau",
                                columnIndex,
                                cardIndex
                            );

                        element.style.top =
                            `${getTableauOffset(column, cardIndex)}px`;

                        columnElement.appendChild(
                            element
                        );
                    }
                );
            }

            tableauElement.appendChild(
                columnElement
            );
        }
    );
}


/* =========================================================
   TABLEAU CARD SPACING
========================================================= */

function getTableauOffset(
    column,
    index
) {

    let offset = 0;

    for (let i = 0; i < index; i++) {

        /*
            Face-down cards are kept compact.
        */

        if (column[i].faceUp) {
            offset += 30;
        } else {
            offset += 20;
        }
    }

    return offset;
}


/* =========================================================
   CREATE CARD ELEMENT
========================================================= */

function createCardElement(
    card,
    source,
    columnIndex = null,
    cardIndex = null
) {

    const element =
        document.createElement("div");

    element.classList.add("card");

    element.dataset.cardId =
        card.id;

    element.dataset.source =
        source;

    if (columnIndex !== null) {

        element.dataset.column =
            columnIndex;
    }

    if (cardIndex !== null) {

        element.dataset.cardIndex =
            cardIndex;
    }


    if (!card.faceUp) {

        element.classList.add(
            "face-down"
        );

        attachCardEvents(
            element,
            card,
            source,
            columnIndex,
            cardIndex
        );

        return element;
    }


    element.classList.add(
        "face-up"
    );


    if (
        card.suit === "hearts" ||
        card.suit === "diamonds"
    ) {

        element.classList.add("red");

    } else {

        element.classList.add("black");
    }


    const rank =
        document.createElement("span");

    rank.className =
        "card-rank";

    rank.textContent =
        RANK_NAMES[card.rank];


    const suit =
        document.createElement("span");

    suit.className =
        "card-suit";

    suit.textContent =
        SUIT_SYMBOLS[card.suit];


    const centerSuit =
        document.createElement("span");

    centerSuit.className =
        "card-center-suit";

    centerSuit.textContent =
        SUIT_SYMBOLS[card.suit];


    element.appendChild(rank);

    element.appendChild(suit);

    element.appendChild(centerSuit);


    attachCardEvents(
        element,
        card,
        source,
        columnIndex,
        cardIndex
    );


    return element;
}


/* =========================================================
   CARD EVENTS
========================================================= */

function attachCardEvents(
    element,
    card,
    source,
    columnIndex,
    cardIndex
) {

    element.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            handleCardClick(
                card,
                source,
                columnIndex,
                cardIndex
            );
        }
    );


    if (card.faceUp) {

        element.draggable = true;

        element.addEventListener(
            "dragstart",
            event => {

                ensureGameStarted();

                clearSelection();

                selectedCards =
                    getMovableSequence(
                        card,
                        source,
                        columnIndex,
                        cardIndex
                    );

                selectedSource = {
                    type: source,
                    column: columnIndex,
                    index: cardIndex
                };

                element.classList.add(
                    "dragging"
                );

                event.dataTransfer.effectAllowed =
                    "move";

                event.dataTransfer.setData(
                    "text/plain",
                    card.id
                );
            }
        );


        element.addEventListener(
            "dragend",
            () => {

                element.classList.remove(
                    "dragging"
                );
            }
        );
    }
}


/* =========================================================
   CLICK HANDLING
========================================================= */

function handleCardClick(
    card,
    source,
    columnIndex,
    cardIndex
) {

    ensureGameStarted();


    /*
        Face-down cards:
        clicking them only works if
        they are the top hidden card
        and can be revealed.
    */

    if (!card.faceUp) {

        if (
            source === "tableau" &&
            isTopCard(
                columnIndex,
                cardIndex
            )
        ) {

            revealCard(
                columnIndex,
                cardIndex
            );
        }

        return;
    }


    /*
        If nothing is selected,
        select this card.
    */

    if (selectedCards.length === 0) {

        selectCards(
            card,
            source,
            columnIndex,
            cardIndex
        );

        return;
    }


    /*
        Clicking selected card again
        cancels selection.
    */

    if (
        selectedCards.some(
            selected =>
                selected.id === card.id
        )
    ) {

        clearSelection();

        return;
    }


    /*
        Try to move selected cards
        onto clicked card.
    */

    const destination = {
        type: source,
        column: columnIndex,
        card
    };

    if (
        tryMoveSelectedCards(
            destination
        )
    ) {

        clearSelection();

        return;
    }


    /*
        If move isn't possible,
        select the newly clicked card.
    */

    selectCards(
        card,
        source,
        columnIndex,
        cardIndex
    );
}


/* =========================================================
   SELECT CARDS
========================================================= */

function selectCards(
    card,
    source,
    columnIndex,
    cardIndex
) {

    clearSelection();

    selectedCards =
        getMovableSequence(
            card,
            source,
            columnIndex,
            cardIndex
        );

    selectedSource = {
        type: source,
        column: columnIndex,
        index: cardIndex
    };

    highlightSelectedCards();
}


/* =========================================================
   HIGHLIGHT
========================================================= */

function highlightSelectedCards() {

    selectedCards.forEach(
        card => {

            const element =
                document.querySelector(
                    `[data-card-id="${card.id}"]`
                );

            if (element) {

                element.classList.add(
                    "selected"
                );
            }
        }
    );
}


/* =========================================================
   CLEAR SELECTION
========================================================= */

function clearSelection() {

    document
        .querySelectorAll(".card.selected")
        .forEach(
            element => {

                element.classList.remove(
                    "selected"
                );
            }
        );

    selectedCards = [];

    selectedSource = null;
}


/* =========================================================
   GET MOVABLE SEQUENCE
========================================================= */

function getMovableSequence(
    card,
    source,
    columnIndex,
    cardIndex
) {

    if (!card.faceUp) {
        return [];
    }


    /*
        Waste and foundation can only
        move their top card.
    */

    if (
        source === "waste" ||
        source === "foundation"
    ) {

        return [card];
    }


    if (source !== "tableau") {
        return [];
    }


    const column =
        tableau[columnIndex];


    const sequence =
        column.slice(cardIndex);


    /*
        Every card in the moving sequence
        must be face-up.
    */

    if (
        sequence.some(
            item => !item.faceUp
        )
    ) {

        return [];
    }


    /*
        Sequence must be correctly ordered.
    */

    for (
        let i = 0;
        i < sequence.length - 1;
        i++
    ) {

        const current =
            sequence[i];

        const next =
            sequence[i + 1];

        if (
            current.rank !==
            next.rank + 1
        ) {

            return [];
        }

        if (
            isRed(current) ===
            isRed(next)
        ) {

            return [];
        }
    }


    return sequence;
}


/* =========================================================
   TRY MOVE
========================================================= */

function tryMoveSelectedCards(
    destination
) {

    if (
        selectedCards.length === 0 ||
        !selectedSource
    ) {

        return false;
    }


    /*
        Tableau destination
    */

    if (
        destination.type === "tableau"
    ) {

        return moveToTableau(
            destination.column
        );
    }


    /*
        Foundation destination
    */

    if (
        destination.type === "foundation"
    ) {

        return moveToFoundation(
            destination
        );
    }


    return false;
}


/* =========================================================
   MOVE TO TABLEAU
========================================================= */

function moveToTableau(
    destinationColumn
) {

    const movingCard =
        selectedCards[0];

    const destination =
        tableau[destinationColumn];


    if (destination.length === 0) {

        /*
            Only a King can enter
            an empty tableau.
        */

        if (movingCard.rank !== 13) {
            return false;
        }

    } else {

        const target =
            destination[
                destination.length - 1
            ];


        if (!target.faceUp) {
            return false;
        }


        /*
            Tableau requires:
            descending rank
            alternating colors
        */

        if (
            target.rank !==
            movingCard.rank + 1
        ) {

            return false;
        }

        if (
            isRed(target) ===
            isRed(movingCard)
        ) {

            return false;
        }
    }


    saveHistory();


    removeSelectedCards();


    destination.push(
        ...selectedCards
    );


    revealTopCardIfNeeded(
        selectedSource
    );


    moves++;

    clearSelection();

    render();

    updateStats();

    checkWin();

    return true;
}


/* =========================================================
   MOVE TO FOUNDATION
========================================================= */

function moveToFoundation(
    destination
) {

    /*
        Only one card can be moved
        to a foundation.
    */

    if (selectedCards.length !== 1) {
        return false;
    }


    const card =
        selectedCards[0];

    const foundationIndex =
        Number(
            destination.element
                ?.dataset.foundation
        );


    let index =
        destination.foundationIndex;


    if (
        Number.isNaN(index) ||
        index === undefined
    ) {

        index =
            SUITS.indexOf(card.suit);
    }


    if (index < 0) {
        return false;
    }


    const foundation =
        foundations[index];


    /*
        Foundation must use
        same suit.
    */

    if (
        foundation.length > 0
    ) {

        const top =
            foundation[
                foundation.length - 1
            ];

        if (
            top.suit !== card.suit ||
            card.rank !== top.rank + 1
        ) {

            return false;
        }

    } else {

        /*
            Foundation must start
            with an Ace.
        */

        if (card.rank !== 1) {
            return false;
        }
    }


    saveHistory();

    removeSelectedCards();

    foundation.push(card);

    revealTopCardIfNeeded(
        selectedSource
    );

    moves++;

    clearSelection();

    render();

    updateStats();

    checkWin();

    return true;
}


/* =========================================================
   DRAG AND DROP
========================================================= */

document.addEventListener(
    "dragover",
    event => {

        event.preventDefault();

        const cardElement =
            event.target.closest(".card");

        const emptyColumn =
            event.target.closest(
                ".tableau-empty"
            );

        const foundation =
            event.target.closest(
                ".foundation-pile"
            );

        if (
            cardElement ||
            emptyColumn ||
            foundation
        ) {

            event.dataTransfer.dropEffect =
                "move";
        }
    }
);


document.addEventListener(
    "drop",
    event => {

        event.preventDefault();

        if (
            selectedCards.length === 0
        ) {

            return;
        }


        const cardElement =
            event.target.closest(".card");


        const emptyColumn =
            event.target.closest(
                ".tableau-empty"
            );


        const foundation =
            event.target.closest(
                ".foundation-pile"
            );


        /*
            Drop onto another card
        */

        if (cardElement) {

            const destinationSource =
                cardElement.dataset.source;


            if (
                destinationSource ===
                "tableau"
            ) {

                const column =
                    Number(
                        cardElement.dataset.column
                    );

                if (
                    tryMoveSelectedCards({
                        type: "tableau",
                        column
                    })
                ) {

                    clearSelection();
                }

                return;
            }


            if (
                destinationSource ===
                "foundation"
            ) {

                const foundationIndex =
                    SUITS.indexOf(
                        cardElement
                            .dataset.suit
                    );

                if (
                    tryMoveSelectedCards({
                        type: "foundation",
                        foundationIndex
                    })
                ) {

                    clearSelection();
                }

                return;
            }
        }


        /*
            Drop onto empty tableau
        */

        if (emptyColumn) {

            const column =
                Number(
                    emptyColumn.dataset.column
                );

            if (
                moveToTableau(column)
            ) {

                clearSelection();
            }

            return;
        }


        /*
            Drop onto foundation pile
        */

        if (foundation) {

            const foundationIndex =
                Number(
                    foundation.dataset.foundation
                );

            if (
                moveToFoundation({
                    foundationIndex
                })
            ) {

                clearSelection();
            }
        }
    }
);


/* =========================================================
   STOCK CLICK
========================================================= */

stockElement.addEventListener(
    "click",
    () => {

        ensureGameStarted();

        clearSelection();


        if (stock.length > 0) {

            saveHistory();

            const card =
                stock.pop();

            card.faceUp = true;

            waste.push(card);

            moves++;

        } else {

            /*
                Recycle waste into stock.
            */

            if (waste.length === 0) {
                return;
            }

            saveHistory();

            stock =
                waste.reverse();

            waste = [];

            stock.forEach(
                card => {
                    card.faceUp = false;
                }
            );

            moves++;
        }


        render();

        updateStats();

        checkWin();
    }
);


/* =========================================================
   WASTE CLICK
========================================================= */

wasteElement.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        ensureGameStarted();

        if (waste.length === 0) {
            return;
        }

        const card =
            waste[waste.length - 1];

        selectCards(
            card,
            "waste",
            null,
            waste.length - 1
        );
    }
);


/* =========================================================
   FOUNDATION CLICK
========================================================= */

document
    .querySelectorAll(".foundation-pile")
    .forEach(
        foundation => {

            foundation.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    ensureGameStarted();

                    const index =
                        Number(
                            foundation.dataset
                                .foundation
                        );


                    if (
                        selectedCards.length === 0
                    ) {

                        /*
                            Select the top
                            foundation card.
                        */

                        const pile =
                            foundations[index];

                        if (
                            pile.length === 0
                        ) {
                            return;
                        }

                        const card =
                            pile[pile.length - 1];

                        selectCards(
                            card,
                            "foundation",
                            null,
                            pile.length - 1
                        );

                        return;
                    }


                    moveToFoundation({
                        foundationIndex: index
                    });
                }
            );
        }
    );


/* =========================================================
   TABLEAU COLUMN CLICK
========================================================= */

tableauElement.addEventListener(
    "click",
    event => {

        if (
            event.target.closest(".card")
        ) {

            return;
        }


        const empty =
            event.target.closest(
                ".tableau-empty"
            );

        if (!empty) {
            return;
        }


        ensureGameStarted();

        const column =
            Number(
                empty.dataset.column
            );


        if (
            selectedCards.length > 0
        ) {

            moveToTableau(
                column
            );
        }
    }
);


/* =========================================================
   REVEAL CARD
========================================================= */

function revealCard(
    columnIndex,
    cardIndex
) {

    const column =
        tableau[columnIndex];

    const card =
        column[cardIndex];


    if (
        !card ||
        card.faceUp
    ) {

        return;
    }


    if (
        cardIndex !==
        column.length - 1
    ) {

        return;
    }


    saveHistory();

    card.faceUp = true;

    moves++;

    render();

    updateStats();
}


/* =========================================================
   REVEAL TOP CARD IF NEEDED
========================================================= */

function revealTopCardIfNeeded(
    source
) {

    if (
        !source ||
        source.type !== "tableau"
    ) {

        return;
    }


    const column =
        tableau[source.column];


    if (
        column.length === 0
    ) {

        return;
    }


    const top =
        column[column.length - 1];


    if (!top.faceUp) {

        top.faceUp = true;
    }
}


/* =========================================================
   REMOVE SELECTED CARDS
========================================================= */

function removeSelectedCards() {

    if (!selectedSource) {
        return;
    }


    if (
        selectedSource.type ===
        "tableau"
    ) {

        const column =
            tableau[
                selectedSource.column
            ];


        column.splice(
            selectedSource.index,
            selectedCards.length
        );

        return;
    }


    if (
        selectedSource.type ===
        "waste"
    ) {

        waste.pop();

        return;
    }


    if (
        selectedSource.type ===
        "foundation"
    ) {

        const foundationIndex =
            SUITS.indexOf(
                selectedCards[0].suit
            );

        if (foundationIndex >= 0) {

            foundations[
                foundationIndex
            ].pop();
        }
    }
}


/* =========================================================
   REVEAL HELPER
========================================================= */

function isTopCard(
    columnIndex,
    cardIndex
) {

    return (
        tableau[columnIndex].length - 1 ===
        cardIndex
    );
}


/* =========================================================
   COLOR
========================================================= */

function isRed(card) {

    return (
        card.suit === "hearts" ||
        card.suit === "diamonds"
    );
}


/* =========================================================
   HISTORY
========================================================= */

function saveHistory() {

    history.push(
        JSON.stringify({
            tableau,
            stock,
            waste,
            foundations,
            moves,
            seconds,
            gameStarted,
            gameWon
        })
    );


    /*
        Keep memory reasonable.
    */

    if (history.length > 100) {

        history.shift();
    }
}


/* =========================================================
   UNDO
========================================================= */

function undo() {

    if (history.length === 0) {
        return;
    }


    const previous =
        history.pop();


    const state =
        JSON.parse(previous);


    tableau =
        state.tableau;

    stock =
        state.stock;

    waste =
        state.waste;

    foundations =
        state.foundations;

    moves =
        state.moves;

    seconds =
        state.seconds;

    gameStarted =
        state.gameStarted;

    gameWon =
        state.gameWon;


    clearSelection();

    render();

    updateStats();
}


/* =========================================================
   WIN CHECK
========================================================= */

function checkWin() {

    const total =
        foundations.reduce(
            (sum, foundation) =>
                sum + foundation.length,
            0
        );


    if (total !== 52) {
        return;
    }


    gameWon = true;

    stopTimer();

    finalMoves.textContent =
        moves;

    finalTime.textContent =
        formatTime(seconds);

    showWinModal();
}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(totalSeconds) {

    const minutes =
        Math.floor(totalSeconds / 60);

    const secondsPart =
        totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}`;
}


/* =========================================================
   WIN MODAL
========================================================= */

function showWinModal() {

    winModal.classList.remove(
        "hidden"
    );
}


function hideWinModal() {

    winModal.classList.add(
        "hidden"
    );
}


/* =========================================================
   BUTTON EVENTS
========================================================= */

newGameButton.addEventListener(
    "click",
    newGame
);


playAgainButton.addEventListener(
    "click",
    newGame
);


undoButton.addEventListener(
    "click",
    () => {

        undo();
    }
);


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
            N = New Game
        */

        if (
            event.key.toLowerCase() === "n"
        ) {

            newGame();
        }


        /*
            Ctrl/Cmd + Z = Undo
        */

        if (
            (event.ctrlKey ||
             event.metaKey) &&
            event.key.toLowerCase() === "z"
        ) {

            event.preventDefault();

            undo();
        }


        /*
            Escape = clear selection
        */

        if (
            event.key === "Escape"
        ) {

            clearSelection();
        }
    }
);


/* =========================================================
   INITIALIZE
========================================================= */

newGame();
