const currentFlagCount = document.querySelector("[data-current-flag-count]");
const totalFlagCount = document.querySelector("[data-total-flag-count]");

const GRID_STATE = {
  INITIAL: "initial",
  PLAY: "play",
  PAUSE: "pause",
};

const CELL_TYPE = {
  COUNT: "count",
  EMPTY: "empty",
  FLAG: "flag",
  FLAGDOUBT: "flag-doubt",
  FLAGMINE: "flag-mine",
  MINE: "mine",
  MINEOPENED: "mine-opened",
  NEW: "new",
};

class Cell {
  #row;
  #column;
  #isMine;
  #cell;
  #mineCount;
  constructor(row, column) {
    this.open = false;
    this.#row = row;
    this.#column = column;
    this.#isMine = false;
    this.#mineCount = 0;

    this.createCell = this.createCell.bind(this);
  }

  get row() {
    return this.#row;
  }

  get column() {
    return this.#column;
  }

  get isMine() {
    return this.#isMine;
  }

  get mineCount() {
    return this.#mineCount;
  }

  set isMine(value) {
    this.#isMine = value;
  }

  set mineCount(value) {
    this.#mineCount = value;
  }

  getCellElement() {
    return this.#cell;
  }

  createCell(grid) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.setAttribute("data-type", CELL_TYPE.NEW);

    cell.addEventListener(
      "click",
      () => {
        // Start timer for initial click on the cell
        if (grid.element.dataset.state === GRID_STATE.INITIAL) {
          grid.element.dataset.state = GRID_STATE.PLAY;
          startTimer();
          pauseButton.disabled = false;
        }

        // Do nothing for flagged cells
        const cellDataType = cell.getAttribute("data-type");
        if (cellDataType && cellDataType.startsWith("flag")) return;

        // Game is lost when a mine cell is opened
        this.open = true;
        if (this.#isMine) {
          cell.setAttribute("data-type", CELL_TYPE.MINEOPENED);
          grid.gameLost();
          return;
        }

        // Recursively opening surrounding empty cells
        if (this.#mineCount === 0) {
          cell.setAttribute("data-type", CELL_TYPE.EMPTY);
          grid.openSurroundingCells(this);
          return;
        }

        // Cells with surrounding mines
        cell.innerText = this.#mineCount;
        cell.setAttribute("data-type", CELL_TYPE.COUNT);
        cell.setAttribute("data-number", this.#mineCount);

        if (grid.checkIfWon()) grid.gameWon();
      },
      { once: true }
    );

    // For flagging a cell
    cell.addEventListener("contextmenu", (event) => {
      event.preventDefault();

      // Prevent flagging for an opened empty and count cell
      if (
        [CELL_TYPE.EMPTY, CELL_TYPE.COUNT].includes(
          cell.getAttribute("data-type")
        )
      )
        return;

      const cellDataType = cell.getAttribute("data-type");
      const flagCellsCount = [
        ...document.querySelectorAll(`.cell[data-type="${CELL_TYPE.FLAG}"]`),
      ].length;

      // Flag doubt an already flagged cell
      if (cellDataType && cellDataType === CELL_TYPE.FLAG) {
        cell.setAttribute("data-type", CELL_TYPE.FLAGDOUBT);
        currentFlagCount.innerText = Number(currentFlagCount.innerText) - 1;
      }
      // Remove flag doubt
      else if (cellDataType && cellDataType === CELL_TYPE.FLAGDOUBT) {
        cell.removeAttribute("data-type");
      }
      // Set flag or flag doubt based on total flag count
      else {
        cell.setAttribute(
          "data-type",
          flagCellsCount < grid.mines ? CELL_TYPE.FLAG : CELL_TYPE.FLAGDOUBT
        );
        currentFlagCount.innerText =
          Number(currentFlagCount.innerText) +
          (flagCellsCount < grid.mines ? 1 : 0);
      }
    });

    this.#cell = cell;
    return cell;
  }
}

class CellGrid {
  #rows;
  #columns;
  #mines;
  #grid;
  #cells;

  constructor(rows, columns, mines) {
    this.#rows = rows;
    this.#columns = columns;
    this.#mines = mines;
    this.#grid = this.createGrid();
    this.#cells = [];

    currentFlagCount.innerText = 0;
    totalFlagCount.innerText = mines;

    this.initialize = this.initialize.bind(this);
    this.openSurroundingCells = this.openSurroundingCells.bind(this);

    this.initialSetup();
  }

  get mines() {
    return this.#mines;
  }

  set mines(mines) {
    this.#mines = mines;
    totalFlagCount.innerText = mines;
  }

  get element() {
    return this.#grid;
  }

  initialSetup() {
    this.initialize();
    this.placeMines();
    this.calculateMineCount();
  }

  createGrid() {
    const grid = document.createElement("div");
    grid.classList.add("cell-grid");
    grid.dataset.state = GRID_STATE.INITIAL;
    grid.style.setProperty("--rows", this.#rows);
    grid.style.setProperty("--columns", this.#columns);
    document.body.append(grid);
    return grid;
  }

  initialize() {
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < this.#rows; row++) {
      this.#cells.push([]);
      for (let column = 0; column < this.#columns; column++) {
        const cell = new Cell(row, column);
        fragment.appendChild(cell.createCell(this));
        this.#cells[row].push(cell);
      }
    }

    this.#grid.appendChild(fragment);
  }

  placeMines() {
    let mineCount = this.#mines;
    while (mineCount > 0) {
      let x = generateRandomPosition(0, this.#rows - 1),
        y = generateRandomPosition(0, this.#columns - 1);

      if (!this.#cells[x][y].isMine) {
        this.#cells[x][y].isMine = true;
        mineCount--;
      }
    }
  }

  getAllCells() {
    return this.#cells.flat(1);
  }

  calculateMineCount() {
    this.getAllCells().map((cell) => {
      if (!cell.isMine) {
        let mineCount = this.getSurroundingCellsMineCount(cell);
        cell.mineCount = mineCount;
      }
    });
  }

  getSurroundingCells(cell) {
    let row = cell.row,
      col = cell.column,
      surroundingCells = [
        [row - 1, col - 1],
        [row - 1, col],
        [row - 1, col + 1],
        [row, col - 1],
        [row, col + 1],
        [row + 1, col - 1],
        [row + 1, col],
        [row + 1, col + 1],
      ];

    surroundingCells = surroundingCells
      .filter(
        ([x, y]) => !(x < 0 || x >= this.#rows || y < 0 || y >= this.#columns)
      )
      .map(([x, y]) => this.#cells[x][y]);

    return surroundingCells;
  }

  getSurroundingCellsMineCount(cell) {
    let mineCount = 0,
      surroundingCells = this.getSurroundingCells(cell);

    surroundingCells.forEach((cell) => {
      if (cell.isMine) mineCount += 1;
    });

    return mineCount;
  }

  openSurroundingCells(cell) {
    let surroundingCells = this.getSurroundingCells(cell);
    surroundingCells.forEach((surroundingCell) => {
      surroundingCell.getCellElement().click();
    });
  }

  remove(mines) {
    this.removeAllCells();
    currentFlagCount.innerText = 0;
    if (mines) this.mines = mines;
    this.initialSetup();
    resetTimer();
  }

  gameLost() {
    this.openAllMineCells();
    setTimeout(() => {
      alert("GAME LOST!");
      this.remove();
    }, 500);
  }

  openAllMineCells() {
    this.getAllCells().map((cell) => {
      if (cell.isMine && !cell.open) {
        const cellElement = cell.getCellElement();
        if (cellElement.getAttribute("data-type") === CELL_TYPE.FLAG)
          cellElement.setAttribute("data-type", CELL_TYPE.FLAGMINE);
        else cellElement.setAttribute("data-type", CELL_TYPE.MINE);
      }
    });
  }

  removeAllCells() {
    this.getAllCells().map((cell) => cell.getCellElement().remove());
    this.#cells = [];
  }

  checkIfWon() {
    const isAllMinesUnopened = this.getAllCells()
      .filter((cell) => cell.isMine)
      .every((cell) => !cell.open);
    const isAllOtherCellsOpened = this.getAllCells()
      .filter((cell) => !cell.isMine)
      .every((cell) => cell.open);
    return isAllMinesUnopened && isAllOtherCellsOpened;
  }

  gameWon() {
    setTimeout(() => {
      alert("YOU WON!");
      this.remove();
    }, 500);
  }
}

function generateRandomPosition(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

const difficulty = document.querySelector("[data-difficulty]");
const pauseButton = document.querySelector("[data-pause-button]");
const minutes = document.querySelector("[data-minutes]");
const seconds = document.querySelector("[data-seconds]");
let timer;

let cellGrid = new CellGrid(8, 8, difficulty.value);

difficulty.addEventListener("change", (event) =>
  cellGrid.remove(event.target.value)
);

function addZeroPadding(value) {
  return value.toString().padStart(2, "0");
}

// Timer
function startTimer() {
  timer = setInterval(() => {
    if (seconds.textContent === "59")
      minutes.textContent = addZeroPadding(Number(minutes.textContent) + 1);

    seconds.textContent = addZeroPadding(
      (Number(seconds.textContent) + 1) % 60
    );
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);
}

function resetTimer() {
  pauseTimer();
  minutes.textContent = "00";
  seconds.textContent = "00";
  cellGrid.element.dataset.state = GRID_STATE.INITIAL;
}

// Pause / play
function pauseGame() {
  cellGrid.element.classList.add("paused");
  pauseButton.textContent = GRID_STATE.PLAY;
  cellGrid.element.dataset.state = GRID_STATE.PAUSE;
  pauseTimer();
}

function playGame() {
  cellGrid.element.classList.remove("paused");
  pauseButton.textContent = GRID_STATE.PAUSE;
  cellGrid.element.dataset.state = GRID_STATE.PLAY;
  startTimer();
}

function handlePause() {
  if (cellGrid.element.dataset.state === GRID_STATE.PLAY) pauseGame();
  else playGame();
}

pauseButton.addEventListener("click", handlePause);

// Detetct active tab change
function handleTabInactivity() {
  const visibility = document.visibilityState;
  const gridState = cellGrid.element.dataset.state;

  if (gridState === GRID_STATE.PLAY) {
    if (visibility === "hidden") pauseTimer();
    if (visibility === "visible") startTimer();
  }
}

document.addEventListener("visibilitychange", handleTabInactivity);
