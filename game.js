// ---- State ----
let board, score, prevBoard, prevScore;

// ---- Helpers ----
function cellSize() {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 100;
}

function gapSize() {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 12;
}

function pos(r, c) {
  const cs = cellSize(), gs = gapSize();
  return {
    top:  r * (cs + gs),
    left: c * (cs + gs)
  };
}

function newBoard() {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function copyBoard(b) {
  return b.map(row => [...row]);
}

// ---- Initialise grid background ----
function init() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell-bg';
    grid.appendChild(cell);
  }
}

// ---- Add a random tile (2 or 4) ----
function addRandom() {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (board[r][c] === 0) empty.push([r, c]);

  if (!empty.length) return null;

  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  return [r, c];
}

// ---- Render tiles ----
function render(newTilePos) {
  const layer = document.getElementById('tiles');
  const cs = cellSize();
  layer.innerHTML = '';

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!board[r][c]) continue;

      const p = pos(r, c);
      const el = document.createElement('div');
      el.className = 'tile';
      el.setAttribute('data-val', board[r][c]);
      el.style.top    = p.top  + 'px';
      el.style.left   = p.left + 'px';
      el.style.width  = cs + 'px';
      el.style.height = cs + 'px';
      el.textContent  = board[r][c];
      layer.appendChild(el);
    }
  }

  // Animate the newly spawned tile
  if (newTilePos) {
    const [nr, nc] = newTilePos;
    const expected = pos(nr, nc);
    layer.querySelectorAll('.tile').forEach(t => {
      if (
        parseInt(t.style.top)  === expected.top &&
        parseInt(t.style.left) === expected.left
      ) {
        t.classList.add('new');
      }
    });
  }

  // Update score display
  document.getElementById('score').textContent = score;
  const savedBest = parseInt(localStorage.getItem('best2048') || '0');
  const best = Math.max(score, savedBest);
  if (score > savedBest) localStorage.setItem('best2048', score);
  document.getElementById('best').textContent = best;
}

// ---- Slide & merge one row to the left ----
function slideRow(row) {
  let r = row.filter(x => x !== 0);
  let gained = 0;

  for (let i = 0; i < r.length - 1; i++) {
    if (r[i] === r[i + 1]) {
      r[i] *= 2;
      gained += r[i];
      r[i + 1] = 0;
      i++; // skip merged tile
    }
  }

  r = r.filter(x => x !== 0);
  while (r.length < 4) r.push(0);
  return { row: r, gained };
}

// ---- Apply left slide to entire board ----
function moveLeft() {
  let changed = false;
  let gained  = 0;

  for (let r = 0; r < 4; r++) {
    const { row, gained: g } = slideRow(board[r]);
    if (row.join() !== board[r].join()) changed = true;
    board[r] = row;
    gained += g;
  }

  return { changed, gained };
}

// ---- Rotate board 90° clockwise ----
function rotateRight(b) {
  const n = newBoard();
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      n[c][3 - r] = b[r][c];
  return n;
}

// ---- Handle a move in any direction ----
function move(dir) {
  // Save state for undo
  prevBoard = copyBoard(board);
  prevScore = score;

  // Rotate so we always slide left, then rotate back
  const rotations = { left: 0, up: 3, right: 2, down: 1 }[dir];
  for (let i = 0; i < rotations; i++) board = rotateRight(board);

  const { changed, gained } = moveLeft();

  const backRotations = (4 - rotations) % 4;
  for (let i = 0; i < backRotations; i++) board = rotateRight(board);

  if (!changed) return; // nothing moved

  score += gained;
  const newTilePos = addRandom();
  render(newTilePos);
  checkState();
}

// ---- Undo last move ----
function undoMove() {
  if (!prevBoard) return;
  board = prevBoard;
  score = prevScore;
  prevBoard = null;
  document.getElementById('overlay').classList.remove('show');
  render();
}

// ---- Start / restart ----
function restartGame() {
  board     = newBoard();
  score     = 0;
  prevBoard = null;
  prevScore = 0;
  addRandom();
  addRandom();
  document.getElementById('overlay').classList.remove('show');
  render();
}

// ---- Check win / game over ----
function checkState() {
  // Win check
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (board[r][c] === 2048) {
        showOverlay('You Win! 🎉', 'You reached 2048!');
        return;
      }

  // Any moves remaining?
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return;
      if (c < 3 && board[r][c] === board[r][c + 1]) return;
      if (r < 3 && board[r][c] === board[r + 1][c]) return;
    }

  showOverlay('Game Over', 'No moves left.');
}

function showOverlay(title, sub) {
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-sub').textContent   = sub;
  document.getElementById('overlay').classList.add('show');
}

// ---- Keyboard input ----
document.addEventListener('keydown', e => {
  const map = {
    ArrowLeft:  'left',
    ArrowRight: 'right',
    ArrowUp:    'up',
    ArrowDown:  'down'
  };
  if (map[e.key]) {
    e.preventDefault();
    move(map[e.key]);
  }
});

// ---- Touch / swipe input ----
let touchStartX = 0;
let touchStartY = 0;

document.getElementById('grid').addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.getElementById('grid').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return; // too small

  if (Math.abs(dx) > Math.abs(dy))
    move(dx > 0 ? 'right' : 'left');
  else
    move(dy > 0 ? 'down' : 'up');
}, { passive: true });

// ---- Boot ----
init();
restartGame();
