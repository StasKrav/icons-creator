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
  // ========== PATH (СОСТАВНОЙ КОНТУР) ==========
  pathSegments: [],          // временные сегменты при построении контура
  pathStartPoint: null,      // первая точка (для определения замыкания)
  isPathBuilding: false,     // идёт ли построение контура
  pathCurveStart: null,      // начальная точка текущей кривой (при Shift+click = начало curve-сегмента)
  pathCurveEnd: null,        // конечная точка текущей кривой (обновляется при drag)
};

// ========== ПРЕСЕТЫ ИКОНОК ==========
// Все значения толщины — в канвас-пикселях (канвас 512×512).
// realMin / realMax — в реальных пикселях целевого размера иконки.
// Сетка не привязана к режиму — пользователь выбирает её сам.
const iconPresets = {
  favicon:     { targetSize: 16,  blocksX: 16,  blocksY: 16,  minThickness: 32,  maxThickness: 192, realMin: 0, realMax: 6,  description: "Favicon (16×16)" },
  menu32:      { targetSize: 32,  blocksX: 32,  blocksY: 32,  minThickness: 16,  maxThickness: 128, realMin: 0, realMax: 8,  description: "Меню (32×32)" },
  standard64:  { targetSize: 64,  blocksX: 64,  blocksY: 64,  minThickness: 8,   maxThickness: 80,  realMin: 0, realMax: 10, description: "Стандартная (64×64)" },
  high128:     { targetSize: 128, blocksX: 128, blocksY: 128, minThickness: 4,   maxThickness: 48,  realMin: 0, realMax: 12, description: "Высокое разрешение (128×128)" },
  ultra256:    { targetSize: 256, blocksX: 256, blocksY: 256, minThickness: 2,   maxThickness: 32,  realMin: 0, realMax: 16, description: "Ультра HD (256×256)" },
  full512:     { targetSize: 512, blocksX: 512, blocksY: 512, minThickness: 1,   maxThickness: 20,  realMin: 0, realMax: 20, description: "Полное разрешение (512×512)" },
};

// Пересчёт реальных пикселей → канвас-пиксели (канвас всегда 512×512)
function realToCanvas(realPx, targetSize) {
  return Math.round(realPx * (512 / targetSize));
}

// Пересчёт канвас-пикселей → реальные пиксели
function canvasToReal(canvasPx, targetSize) {
  return canvasPx / (512 / targetSize);
}

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

  if (path.tool === "path") {
    const points = getAllPathPoints(path);
    points.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    return { minX, minY, maxX, maxY };
  }

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
  if (path.tool === "path") {
    const points = getAllPathPoints(path);
    if (points.length === 0) return { x: 0, y: 0 };
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    return { x: sumX / points.length, y: sumY / points.length };
  }
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

// ========== PATH (СОСТАВНОЙ КОНТУР) ==========

// Создаёт новый пустой path-объект
function createPathObject(startPoint) {
  return {
    tool: "path",
    segments: [],                    // массив сегментов
    closed: false,                   // замкнут ли контур
    startPoint: { x: startPoint.x, y: startPoint.y }, // начальная точка контура
    thickness: state.thickness,
    color: state.color,
    fillType: state.fillType,
    fillColor: state.fillColor,
    fillGradient: JSON.parse(JSON.stringify(state.fillGradient)),
  };
}

// Добавляет line-сегмент к path
function addLineSegment(pathObj, point) {
  pathObj.segments.push({ type: "line", x: point.x, y: point.y });
}

// Добавляет curve-сегмент к path
function addCurveSegment(pathObj, start, c1, c2, end) {
  pathObj.segments.push({
    type: "curve",
    c1: { x: c1.x, y: c1.y },
    c2: { x: c2.x, y: c2.y },
    x: end.x,
    y: end.y,
  });
}

// Получает массив всех точек сочленения из сегментов path
function getPathJoints(pathObj) {
  const joints = [];
  if (pathObj.segments.length === 0) return joints;

  // Первая точка — из первого сегмента
  const firstSeg = pathObj.segments[0];
  if (firstSeg.type === "line") {
    // Для line нужна предыдущая точка, которой нет — пропускаем
  } else if (firstSeg.type === "curve") {
    // Для curve первая точка — это начало кривой, но она не хранится в сегменте
  }

  // Собираем конечные точки всех сегментов
  for (let i = 0; i < pathObj.segments.length; i++) {
    const seg = pathObj.segments[i];
    joints.push({ x: seg.x, y: seg.y });
  }

  return joints;
}

// Получает все точки path (для bounds, center и т.д.)
function getAllPathPoints(pathObj) {
  const points = [];
  for (const seg of pathObj.segments) {
    points.push({ x: seg.x, y: seg.y });
    if (seg.type === "curve") {
      points.push({ x: seg.c1.x, y: seg.c1.y });
      points.push({ x: seg.c2.x, y: seg.c2.y });
    }
  }
  return points;
}