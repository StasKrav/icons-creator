// ========== СОСТОЯНИЕ ПРИЛОЖЕНИЯ ==========
const state = {
  tool: "select",
  paths: [],
  history: [[]],
  redoHistory: [],
  currentPath: [],
  isDrawing: false,
  isDragging: false,
  dragType: null,
  dragData: null,
  selectedPathIdx: -1,
  color: "#3b82f6",
  thickness: 3,
  snap: true,
  gridSize: 32,
  gridMode: "square",
  triGridSize: 32,
  showHandles: false,
  lastCreatedCurveIdx: -1,
  ghostStroke: true,
  fillType: "none",
  fillColor: "#3b82f6",
  fillGradient: {
    type: "linear",
    color1: "#3b82f6",
    color2: "#8b5cf6",
    angle: 90,
  },
  background: {
    type: "none",
    solidColor: "#ffffff",
    gradient: {
      type: "linear",
      color1: "#3b82f6",
      color2: "#8b5cf6",
      angle: 90,
    },
  },
};

// ========== ПРЕСЕТЫ ИКОНОК ==========
const iconPresets = {
  favicon:     { targetSize: 16,  gridSize: 32,  blocksX: 16,  blocksY: 16,  minThickness: 32,  description: "Favicon (16×16)" },
  menu32:      { targetSize: 32,  gridSize: 16,  blocksX: 32,  blocksY: 32,  minThickness: 16,  description: "Меню (32×32)" },
  standard64:  { targetSize: 64,  gridSize: 8,   blocksX: 64,  blocksY: 64,  minThickness: 8,   description: "Стандартная (64×64)" },
  high128:     { targetSize: 128, gridSize: 4,   blocksX: 128, blocksY: 128, minThickness: 4,   description: "Высокое разрешение (128×128)" },
  ultra256:    { targetSize: 256, gridSize: 2,   blocksX: 256, blocksY: 256, minThickness: 2,   description: "Ультра HD (256×256)" },
  full512:     { targetSize: 512, gridSize: 1,   blocksX: 512, blocksY: 512, minThickness: 1,   description: "Полное разрешение (512×512)" },
};

// ========== ИСТОРИЯ ДЕЙСТВИЙ ==========
function initHistory() {
  state.history = [];
  const fullState = {
    paths: JSON.parse(JSON.stringify(state.paths)),
    background: JSON.parse(JSON.stringify(state.background)),
  };
  state.history.push(fullState);
}

function saveState() {
  const fullState = {
    paths: JSON.parse(JSON.stringify(state.paths)),
    background: JSON.parse(JSON.stringify(state.background)),
  };
  state.history.push(fullState);
  state.redoHistory = [];
  while (state.history.length > 50) {
    state.history.shift();
  }
}

function undo() {
  if (state.history.length <= 1) return false;

  const currentState = {
    paths: JSON.parse(JSON.stringify(state.paths)),
    background: JSON.parse(JSON.stringify(state.background)),
  };
  state.redoHistory.push(currentState);
  state.history.pop();

  const lastState = state.history[state.history.length - 1];
  state.paths = JSON.parse(JSON.stringify(lastState.paths));
  state.background = JSON.parse(JSON.stringify(lastState.background));

  state.selectedPathIdx = -1;
  state.showHandles = false;
  state.isDrawing = false;
  state.isDragging = false;

  return true;
}

function redo() {
  if (state.redoHistory.length === 0) return false;

  const currentState = {
    paths: JSON.parse(JSON.stringify(state.paths)),
    background: JSON.parse(JSON.stringify(state.background)),
  };
  state.history.push(currentState);

  const redoState = state.redoHistory.pop();
  state.paths = JSON.parse(JSON.stringify(redoState.paths));
  state.background = JSON.parse(JSON.stringify(redoState.background));

  state.selectedPathIdx = -1;
  state.showHandles = false;
  state.isDrawing = false;
  state.isDragging = false;

  return true;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function getPathBounds(path) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  if (path.tool === "circle" && path.points.length === 2) {
    const center = path.points[0];
    const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
    minX = center.x - radius;
    minY = center.y - radius;
    maxX = center.x + radius;
    maxY = center.y + radius;
  } else {
    path.points.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
  }
  return { minX, minY, maxX, maxY };
}

function getPathCenter(path) {
  if (path.tool === "circle" && path.points.length === 2) return path.points[0];
  const sumX = path.points.reduce((sum, p) => sum + p.x, 0);
  const sumY = path.points.reduce((sum, p) => sum + p.y, 0);
  return { x: sumX / path.points.length, y: sumY / path.points.length };
}

function distanceToLine(x, y, p1, p2) {
  const A = y - p1.y;
  const B = p1.x - x;
  const C = x * p1.y - p1.x * y;
  return Math.abs(A * p2.x + B * p2.y + C) / Math.sqrt(A * A + B * B);
}

function getPointOnCurve(p0, p1, p2, t) {
  return {
    x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
    y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
  };
}