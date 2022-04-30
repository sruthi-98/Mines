const currentFlagCount = document.querySelector("[data-current-flag-count]");
const totalFlagCount = document.querySelector("[data-total-flag-count]");

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
    cell.setAttribute("data-type", "new");
    cell.addEventListener(
      "click",
      () => {
        const cellDataType = cell.getAttribute("data-type");
        if (cellDataType && cellDataType.startsWith("flag")) return;

        this.open = true;
        if (this.#isMine) {
          cell.setAttribute("data-type", "mine-opened");
          grid.gameLost();
          return;
        }

        if (this.#mineCount === 0) {
          cell.setAttribute("data-type", "empty");
          grid.openSurroundingCells(this);
          return;
        }

        cell.innerText = this.#mineCount;
        cell.setAttribute("data-type", "count");
        cell.setAttribute("data-number", this.#mineCount);

        if (grid.checkIfWon()) grid.gameWon();
      },
      { once: true }
    );

    cell.addEventListener("contextmenu", (event) => {
      event.preventDefault();

      if (["empty", "count"].includes(cell.getAttribute("data-type"))) return;

      const cellDataType = cell.getAttribute("data-type");
      const flagCellsCount = [
        ...document.querySelectorAll('.cell[data-type="flag"]'),
      ].length;

      if (cellDataType && cellDataType === "flag") {
        cell.setAttribute("data-type", "flag-doubt");
        currentFlagCount.innerText = Number(currentFlagCount.innerText) - 1;
      } else if (cellDataType && cellDataType === "flag-doubt") {
        cell.removeAttribute("data-type");
      } else {
        cell.setAttribute(
          "data-type",
          flagCellsCount < grid.mines ? "flag" : "flag-doubt"
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

  initialSetup() {
    this.initialize();
    this.placeMines();
    this.calculateMineCount();
  }

  createGrid() {
    const grid = document.createElement("div");
    grid.classList.add("cell-grid");
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
        if (cellElement.getAttribute("data-type") === "flag")
          cellElement.setAttribute("data-type", "flag-mine");
        else cellElement.setAttribute("data-type", "mine");
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

let cellGrid = new CellGrid(8, 8, difficulty.value);

difficulty.addEventListener("change", (event) =>
  cellGrid.remove(event.target.value)
);
