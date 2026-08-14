/* =========================================================
   PRASUN GAMES — CLASSIC KLONDIKE SOLITAIRE
   Robust click + drag interaction
========================================================= */

"use strict";


/* =========================================================
   CONSTANTS
========================================================= */

const SUITS = [
    "spades",
    "hearts",
    "clubs",
    "diamonds"
];

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


/*
    Selection state.

    selectedCards = the cards currently selected
    selectedSource = where those cards came from
*/

let selectedCards = [];
let selectedSource = null;


/*
    Undo history
*/

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
   DECK
========================================================= */

function createDeck() {

    const deck = [];

    for (const suit of SUITS) {

        for (let rank = 1; rank <= 13; rank++) {

            deck.push({
                id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 8)}`,
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

    const deck = [...array];

    for (
        let i = deck.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(Math.random() * (i + 1));

        [
            deck[i],
            deck[j]
        ] = [
            deck[j],
            deck[i]
        ];
    }

    return deck;
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

    const deck =
        shuffle(createDeck());

    let index = 0;


    /*
        Deal tableau.

        Column 1 = 1 card
        Column 2 = 2 cards
        ...
        Column 7 = 7 cards
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

            const card =
                deck[index++];

            card.faceUp =
                row === column;

            tableau[column].push(card);
        }
    }


    /*
        Remaining 24 cards
        go to stock.
    */

    stock =
        deck.slice(index);


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

    timerInterval =
        setInterval(() => {

            if (
                !gameStarted ||
                gameWon
            ) {
                return;
            }

            seconds++;

            updateTimer();

        }, 1000);
}


function stopTimer() {

    if (timerInterval !== null) {

        clearInterval(
            timerInterval
        );

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

    movesElement.textContent =
        moves;

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
   STOCK
========================================================= */

function renderStock() {

    stockElement.innerHTML = "";

    if (stock.length === 0) {

        stockElement.classList.add(
            "empty-stock"
        );

        return;
    }

    stockElement.classList.remove(
        "empty-stock"
    );

    const card =
        stock[stock.length - 1];

    const element =
        createCardElement(
            card,
            "stock"
        );

    stockElement.appendChild(
        element
    );
}


/* =========================================================
   WASTE
========================================================= */

function renderWaste() {

    wasteElement.innerHTML = "";

    if (waste.length === 0) {
        return;
    }

    const card =
        waste[waste.length - 1];

    const element =
        createCardElement(
            card,
            "waste"
        );

    wasteElement.appendChild(
        element
    );
}


/* =========================================================
   FOUNDATIONS
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

            element.dataset.foundation =
                index;


            if (
                foundation.length === 0
            ) {

                element.dataset.suit =
                    SUITS[index];

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
                    "foundation",
                    null,
                    foundation.length - 1,
                    index
                );


            element.appendChild(
                cardElement
            );
        }
    );
}


/* =========================================================
   TABLEAU
========================================================= */

function renderTableau() {

    tableauElement.innerHTML = "";

    tableau.forEach(
        (column, columnIndex) => {

            const columnElement =
                document.createElement(
                    "div"
                );

            columnElement.className =
                "tableau-column";

            columnElement.dataset.column =
                columnIndex;


            if (column.length === 0) {

                const empty =
                    document.createElement(
                        "div"
                    );

                empty.className =
                    "tableau-empty";

                empty.dataset.column =
                    columnIndex;

                empty.textContent = "K";

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
   TABLEAU CARD OFFSET
========================================================= */

function getTableauOffset(
    column,
    index
) {

    let offset = 0;

    for (
        let i = 0;
        i < index;
        i++
    ) {

        offset +=
            column[i].faceUp
                ? 30
                : 20;
    }

    return offset;
}


/* =========================================================
   CREATE CARD
========================================================= */

function createCardElement(
    card,
    source,
    columnIndex = null,
    cardIndex = null,
    foundationIndex = null
) {

    const element =
        document.createElement("div");

    element.className =
        "card";

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


    if (foundationIndex !== null) {

        element.dataset.foundation =
            foundationIndex;
    }


    /*
        Face-down card
    */

    if (!card.faceUp) {

        element.classList.add(
            "face-down"
        );

        return element;
    }


    /*
        Face-up card
    */

    element.classList.add(
        "face-up"
    );


    if (isRed(card)) {

        element.classList.add(
            "red"
        );

    } else {

        element.classList.add(
            "black"
        );
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


    const center =
        document.createElement("span");

    center.className =
        "card-center-suit";

    center.textContent =
        SUIT_SYMBOLS[card.suit];


    element.appendChild(rank);
    element.appendChild(suit);
    element.appendChild(center);


    /*
        CLICK
    */

    element.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            handleCardClick(
                card,
                source,
                columnIndex,
                cardIndex,
                foundationIndex
            );
        }
    );


    /*
        DOUBLE CLICK

        Automatically send card
        to its foundation if legal.
    */

    element.addEventListener(
        "dblclick",
        event => {

            event.stopPropagation();

            ensureGameStarted();

            /*
                Double-click only makes
                sense for one card.
            */

            clearSelection();

            selectedCards = [card];

            selectedSource = {
                type: source,
                column: columnIndex,
                index: cardIndex,
                foundationIndex
            };

            autoMoveToFoundation();
        }
    );


    /*
        DRAG
    */

    element.draggable = true;

    element.addEventListener(
        "dragstart",
        event => {

            ensureGameStarted();

            /*
                Select the complete valid
                sequence starting here.
            */

            const sequence =
                getMovableSequence(
                    card,
                    source,
                    columnIndex,
                    cardIndex
                );


            if (
                sequence.length === 0
            ) {

                event.preventDefault();

                return;
            }


            clearSelection();

            selectedCards =
                sequence;

            selectedSource = {
                type: source,
                column: columnIndex,
                index: cardIndex,
                foundationIndex
            };


            highlightSelectedCards();


            event.dataTransfer.effectAllowed =
                "move";

            event.dataTransfer.setData(
                "text/plain",
                card.id
            );


            element.classList.add(
                "dragging"
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


    return element;
}


/* =========================================================
   CARD CLICK
========================================================= */

function handleCardClick(
    card,
    source,
    columnIndex,
    cardIndex,
    foundationIndex
) {

    ensureGameStarted();


    /*
        Face-down cards cannot be selected.
    */

    if (!card.faceUp) {
        return;
    }


    /*
        Nothing selected:
        select this card/stack.
    */

    if (
        selectedCards.length === 0
    ) {

        selectCards(
            card,
            source,
            columnIndex,
            cardIndex,
            foundationIndex
        );

        return;
    }


    /*
        Clicking the selected card
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
        If destination is a tableau card,
        try to move selected cards there.
    */

    if (
        source === "tableau"
    ) {

        const success =
            moveSelectedToTableau(
                columnIndex
            );

        if (success) {
            return;
        }
    }


    /*
        If destination is a foundation card,
        try foundation move.
    */

    if (
        source === "foundation"
    ) {

        const success =
            moveSelectedToFoundation(
                foundationIndex
            );

        if (success) {
            return;
        }
    }


    /*
        If destination is not valid,
        select the newly clicked card.
    */

    selectCards(
        card,
        source,
        columnIndex,
        cardIndex,
        foundationIndex
    );
}


/* =========================================================
   SELECT
========================================================= */

function selectCards(
    card,
    source,
    columnIndex,
    cardIndex,
    foundationIndex = null
) {

    const sequence =
        getMovableSequence(
            card,
            source,
            columnIndex,
            cardIndex
        );


    if (
        sequence.length === 0
    ) {

        clearSelection();

        return;
    }


    clearSelection();

    selectedCards =
        sequence;

    selectedSource = {
        type: source,
        column: columnIndex,
        index: cardIndex,
        foundationIndex
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
        .querySelectorAll(
            ".card.selected"
        )
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

    if (!card || !card.faceUp) {
        return [];
    }


    /*
        Waste and foundation:
        only the top card can move.
    */

    if (
        source === "waste"
    ) {

        if (
            waste.length === 0 ||
            waste[waste.length - 1].id !== card.id
        ) {

            return [];
        }

        return [card];
    }


    if (
        source === "foundation"
    ) {

        const foundation =
            foundations[
                SUITS.indexOf(card.suit)
            ];

        if (
            !foundation ||
            foundation.length === 0 ||
            foundation[
                foundation.length - 1
            ].id !== card.id
        ) {

            return [];
        }

        return [card];
    }


    /*
        Tableau
    */

    if (
        source !== "tableau" ||
        columnIndex === null ||
        cardIndex === null
    ) {

        return [];
    }


    const column =
        tableau[columnIndex];


    const sequence =
        column.slice(cardIndex);


    /*
        Every card must be face-up.
    */

    if (
        sequence.some(
            item => !item.faceUp
        )
    ) {

        return [];
    }


    /*
        Validate descending alternating
        sequence.
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
   MOVE SELECTED TO TABLEAU
========================================================= */

function moveSelectedToTableau(
    destinationColumn
) {

    if (
        selectedCards.length === 0 ||
        !selectedSource
    ) {

        return false;
    }


    const destination =
        tableau[destinationColumn];


    if (!destination) {
        return false;
    }


    const movingCard =
        selectedCards[0];


    /*
        Do not allow moving a stack
        onto itself.
    */

    if (
        selectedSource.type ===
            "tableau" &&
        selectedSource.column ===
            destinationColumn
    ) {

        return false;
    }


    /*
        Empty tableau:
        only King.
    */

    if (
        destination.length === 0
    ) {

        if (
            movingCard.rank !== 13
        ) {

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
            Descending order.
        */

        if (
            target.rank !==
            movingCard.rank + 1
        ) {

            return false;
        }


        /*
            Alternating colors.
        */

        if (
            isRed(target) ===
            isRed(movingCard)
        ) {

            return false;
        }
    }


    /*
        Save state BEFORE modifying.
    */

    saveHistory();


    /*
        Remove cards from source.
    */

    removeSelectedFromSource();


    /*
        Add them to destination.
    */

    destination.push(
        ...selectedCards
    );


    /*
        Reveal newly exposed card.
    */

    revealSourceTopCard();


    moves++;


    clearSelection();

    render();

    updateStats();

    checkWin();


    return true;
}


/* =========================================================
   MOVE SELECTED TO FOUNDATION
========================================================= */

function moveSelectedToFoundation(
    foundationIndex
) {

    if (
        selectedCards.length !== 1 ||
        !selectedSource
    ) {

        return false;
    }


    if (
        foundationIndex === null ||
        foundationIndex === undefined
    ) {

        return false;
    }


    const card =
        selectedCards[0];


    /*
        Card must belong to
        this foundation's suit.
    */

    if (
        SUITS[foundationIndex] !==
        card.suit
    ) {

        return false;
    }


    const foundation =
        foundations[foundationIndex];


    /*
        Empty foundation:
        only Ace.
    */

    if (
        foundation.length === 0
    ) {

        if (
            card.rank !== 1
        ) {

            return false;
        }

    } else {

        const top =
            foundation[
                foundation.length - 1
            ];


        if (
            top.rank + 1 !==
            card.rank
        ) {

            return false;
        }
    }


    /*
        Save state.
    */

    saveHistory();


    /*
        Remove card from source.
    */

    removeSelectedFromSource();


    /*
        Add to foundation.
    */

    foundation.push(card);


    /*
        Reveal source.
    */

    revealSourceTopCard();


    moves++;


    clearSelection();

    render();

    updateStats();

    checkWin();


    return true;
}


/* =========================================================
   AUTO FOUNDATION
========================================================= */

function autoMoveToFoundation() {

    if (
        selectedCards.length !== 1 ||
        !selectedSource
    ) {

        clearSelection();

        return;
    }


    const card =
        selectedCards[0];


    const foundationIndex =
        SUITS.indexOf(card.suit);


    const success =
        moveSelectedToFoundation(
            foundationIndex
        );


    if (!success) {

        clearSelection();
    }
}


/* =========================================================
   REMOVE SELECTED FROM SOURCE
========================================================= */

function removeSelectedFromSource() {

    if (!selectedSource) {
        return;
    }


    /*
        Tableau
    */

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


    /*
        Waste
    */

    if (
        selectedSource.type ===
        "waste"
    ) {

        waste.pop();

        return;
    }


    /*
        Foundation
    */

    if (
        selectedSource.type ===
        "foundation"
    ) {

        const foundationIndex =
            selectedSource.foundationIndex;


        if (
            foundationIndex !== null &&
            foundationIndex !== undefined
        ) {

            foundations[
                foundationIndex
            ].pop();
        }
    }
}


/* =========================================================
   REVEAL SOURCE TOP CARD
========================================================= */

function revealSourceTopCard() {

    if (
        !selectedSource ||
        selectedSource.type !==
            "tableau"
    ) {

        return;
    }


    const column =
        tableau[
            selectedSource.column
        ];


    if (
        column.length === 0
    ) {

        return;
    }


    const top =
        column[
            column.length - 1
        ];


    if (!top.faceUp) {

        top.faceUp = true;
    }
}


/* =========================================================
   DRAG AND DROP
========================================================= */

document.addEventListener(
    "dragover",
    event => {

        if (
            selectedCards.length === 0
        ) {

            return;
        }


        event.preventDefault();

        event.dataTransfer.dropEffect =
            "move";
    }
);


document.addEventListener(
    "drop",
    event => {

        if (
            selectedCards.length === 0
        ) {

            return;
        }


        event.preventDefault();


        /*
            Find destination card.
        */

        const cardElement =
            event.target.closest(
                ".card"
            );


        /*
            Drop onto another tableau card.
        */

        if (
            cardElement &&
            cardElement.dataset.source ===
                "tableau"
        ) {

            const column =
                Number(
                    cardElement.dataset.column
                );


            moveSelectedToTableau(
                column
            );

            return;
        }


        /*
            Drop onto foundation card.
        */

        if (
            cardElement &&
            cardElement.dataset.source ===
                "foundation"
        ) {

            const foundationIndex =
                Number(
                    cardElement.dataset.foundation
                );


            moveSelectedToFoundation(
                foundationIndex
            );

            return;
        }


        /*
            Empty tableau.
        */

        const empty =
            event.target.closest(
                ".tableau-empty"
            );


        if (empty) {

            const column =
                Number(
                    empty.dataset.column
                );


            moveSelectedToTableau(
                column
            );

            return;
        }


        /*
            Foundation pile itself.
        */

        const foundation =
            event.target.closest(
                ".foundation-pile"
            );


        if (foundation) {

            const foundationIndex =
                Number(
                    foundation.dataset.foundation
                );


            moveSelectedToFoundation(
                foundationIndex
            );

            return;
        }
    }
);


/* =========================================================
   STOCK
========================================================= */

stockElement.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        ensureGameStarted();

        clearSelection();


        /*
            Draw from stock.
        */

        if (
            stock.length > 0
        ) {

            saveHistory();


            const card =
                stock.pop();


            card.faceUp = true;


            waste.push(card);


            moves++;


            render();

            updateStats();

            return;
        }


        /*
            Recycle waste.
        */

        if (
            waste.length > 0
        ) {

            saveHistory();


            stock =
                [...waste].reverse();


            waste = [];


            stock.forEach(
                card => {

                    card.faceUp =
                        false;
                }
            );


            moves++;


            render();

            updateStats();
        }
    }
);


/* =========================================================
   WASTE
========================================================= */

wasteElement.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        ensureGameStarted();


        if (
            waste.length === 0
        ) {

            return;
        }


        const card =
            waste[
                waste.length - 1
            ];


        selectCards(
            card,
            "waste",
            null,
            waste.length - 1,
            null
        );
    }
);


/* =========================================================
   FOUNDATION
========================================================= */

document
    .querySelectorAll(
        ".foundation-pile"
    )
    .forEach(
        foundationElement => {

            foundationElement.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    ensureGameStarted();


                    const index =
                        Number(
                            foundationElement
                                .dataset
                                .foundation
                        );


                    /*
                        If cards are already
                        selected, try placing them.
                    */

                    if (
                        selectedCards.length > 0
                    ) {

                        moveSelectedToFoundation(
                            index
                        );

                        return;
                    }


                    /*
                        Otherwise select the
                        top foundation card.
                    */

                    const foundation =
                        foundations[index];


                    if (
                        foundation.length === 0
                    ) {

                        return;
                    }


                    const card =
                        foundation[
                            foundation.length - 1
                        ];


                    selectCards(
                        card,
                        "foundation",
                        null,
                        foundation.length - 1,
                        index
                    );
                }
            );
        }
    );


/* =========================================================
   TABLEAU EMPTY AREA
========================================================= */

tableauElement.addEventListener(
    "click",
    event => {

        const empty =
            event.target.closest(
                ".tableau-empty"
            );


        if (!empty) {
            return;
        }


        event.stopPropagation();

        ensureGameStarted();


        if (
            selectedCards.length === 0
        ) {

            return;
        }


        const column =
            Number(
                empty.dataset.column
            );


        moveSelectedToTableau(
            column
        );
    }
);


/* =========================================================
   TABLEAU COLUMN CLICK
========================================================= */

tableauElement.addEventListener(
    "click",
    event => {

        /*
            Clicking blank space inside
            a non-empty column should try
            to place the selected stack
            there.
        */

        if (
            event.target.closest(".card") ||
            event.target.closest(".tableau-empty")
        ) {

            return;
        }


        if (
            selectedCards.length === 0
        ) {

            return;
        }


        const columnElement =
            event.target.closest(
                ".tableau-column"
            );


        if (!columnElement) {
            return;
        }


        const column =
            Number(
                columnElement.dataset.column
            );


        moveSelectedToTableau(
            column
        );
    }
);


/* =========================================================
   UNDO
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


    if (
        history.length > 100
    ) {

        history.shift();
    }
}


function undo() {

    if (
        history.length === 0
    ) {

        return;
    }


    const state =
        JSON.parse(
            history.pop()
        );


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


    if (
        gameStarted &&
        !gameWon
    ) {

        startTimer();

    } else {

        stopTimer();
    }
}


/* =========================================================
   WIN
========================================================= */

function checkWin() {

    const total =
        foundations.reduce(
            (sum, foundation) =>
                sum + foundation.length,
            0
        );


    if (
        total !== 52
    ) {

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

function formatTime(
    totalSeconds
) {

    const minutes =
        Math.floor(
            totalSeconds / 60
        );

    const secs =
        totalSeconds % 60;


    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(secs).padStart(2, "0")}`
    );
}


/* =========================================================
   MODAL
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
   BUTTONS
========================================================= */

newGameButton.addEventListener(
    "click",
    () => {

        newGame();
    }
);


playAgainButton.addEventListener(
    "click",
    () => {

        newGame();
    }
);


undoButton.addEventListener(
    "click",
    () => {

        undo();
    }
);


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
            N = New game
        */

        if (
            event.key.toLowerCase() ===
            "n"
        ) {

            newGame();
        }


        /*
            Ctrl/Cmd + Z = Undo
        */

        if (
            (event.ctrlKey ||
             event.metaKey) &&
            event.key.toLowerCase() ===
                "z"
        ) {

            event.preventDefault();

            undo();
        }


        /*
            Escape = cancel selection
        */

        if (
            event.key === "Escape"
        ) {

            clearSelection();
        }
    }
);


/* =========================================================
   MOBILE / POINTER FALLBACK
========================================================= */

/*
    The game supports normal click interaction
    on touch devices.

    Tap card → select
    Tap destination → move
*/

document.addEventListener(
    "pointerdown",
    event => {

        if (
            event.pointerType !== "touch"
        ) {

            return;
        }


        /*
            Prevent accidental browser
            long-press selection.
        */

        const card =
            event.target.closest(
                ".card"
            );


        if (card) {

            event.preventDefault();
        }
    },
    {
        passive: false
    }
);


/* =========================================================
   COLOR HELPER
========================================================= */

function isRed(card) {

    return (
        card.suit === "hearts" ||
        card.suit === "diamonds"
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

newGame();
