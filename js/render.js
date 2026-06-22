// ========== ЕДИНАЯ ФУНКЦИЯ ПОСТРОЕНИЯ КОНТУРА ФИГУРЫ ==========
function buildShapePath(ctx, path, roundCoords = false) {
  const r = roundCoords ? (v) => Math.round(v) : (v) => v;

  ctx.beginPath();

  if (path.tool === "path") {
    buildPathSegments(ctx, path.segments, path.closed, r, path.startPoint);
    return;
  }

  if (path.tool === "curve" && path.points.length === 4) {
    ctx.moveTo(r(path.points[0].x), r(path.points[0].y));
    ctx.bezierCurveTo(
      r(path.points[1].x), r(path.points[1].y),
      r(path.points[2].x), r(path.points[2].y),
      r(path.points[3].x), r(path.points[3].y),
    );
  } else if (path.tool === "curve" && path.points.length === 3) {
    ctx.moveTo(r(path.points[0].x), r(path.points[0].y));
    ctx.quadraticCurveTo(
      r(path.points[1].x), r(path.points[1].y),
      r(path.points[2].x), r(path.points[2].y),
    );
  } else if (path.tool === "line" && path.points.length === 2) {
    ctx.moveTo(r(path.points[0].x), r(path.points[0].y));
    ctx.lineTo(r(path.points[1].x), r(path.points[1].y));
  } else if (path.tool === "rectangle" && path.points.length === 4) {
    ctx.moveTo(r(path.points[0].x), r(path.points[0].y));
    for (let i = 1; i < 4; i++) {
      ctx.lineTo(r(path.points[i].x), r(path.points[i].y));
    }
    ctx.closePath();
  } else if (path.tool === "circle" && path.points.length === 2) {
    const center = path.points[0];
    const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
    ctx.arc(r(center.x), r(center.y), radius, 0, Math.PI * 2);
  }
}

// Строит контур из сегментов path
// startPoint — начальная точка контура (не хранится в сегментах)
function buildPathSegments(ctx, segments, closed, r, startPoint) {
  if (segments.length === 0) return;

  // Если startPoint не передан, используем первый сегмент как начальную точку
  const start = startPoint || (segments.length > 0 ? { x: segments[0].x, y: segments[0].y } : null);
  if (!start) return;

  let prevPoint = start;

  for (const seg of segments) {
    if (seg.type === "line") {
      ctx.lineTo(r(seg.x), r(seg.y));
      prevPoint = { x: seg.x, y: seg.y };
    } else if (seg.type === "curve") {
      ctx.bezierCurveTo(r(seg.c1.x), r(seg.c1.y), r(seg.c2.x), r(seg.c2.y), r(seg.x), r(seg.y));
      prevPoint = { x: seg.x, y: seg.y };
    }
  }

  if (closed) {
    ctx.closePath();
  }
}

// ========== ЕДИНАЯ ФУНКЦИЯ РЕНДЕРА ФИГУРЫ (заливка + обводка) ==========
function renderShape(ctx, path, roundCoords = false) {
  const fillType = path.fillType || state.fillType;
  const fillColor = path.fillColor || state.fillColor;
  const fillGradient = path.fillGradient || state.fillGradient;
  const pathColor = path.color || state.color;
  const pathThickness = path.thickness !== undefined ? path.thickness : state.thickness;

  // Заливка (для rectangle, circle и path)
  if (fillType !== "none" && (path.tool === "rectangle" || path.tool === "circle" || path.tool === "path")) {
    ctx.save();

    if (fillType === "solid") {
      ctx.fillStyle = fillColor;
    } else if (fillType === "gradient") {
      let gradient;
      const bounds = getPathBounds(path);

      if (fillGradient.type === "linear") {
        const angleRad = (fillGradient.angle * Math.PI) / 180;
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const radius = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2;
        const x1 = centerX - Math.cos(angleRad) * radius;
        const y1 = centerY - Math.sin(angleRad) * radius;
        const x2 = centerX + Math.cos(angleRad) * radius;
        const y2 = centerY + Math.sin(angleRad) * radius;
        gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      } else {
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const radius = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2;
        gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      }

      gradient.addColorStop(0, fillGradient.color1);
      gradient.addColorStop(1, fillGradient.color2);
      ctx.fillStyle = gradient;
    }

    buildShapePath(ctx, path, roundCoords);
    ctx.fill();
    ctx.restore();
  }

  // Обводка (только если толщина > 0)
  if (pathThickness > 0) {
    ctx.save();
    ctx.strokeStyle = pathColor;
    ctx.lineWidth = pathThickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    buildShapePath(ctx, path, roundCoords);
    ctx.stroke();
    ctx.restore();
  }
}

// ========== ОТРИСОВКА СЕТКИ ==========
function drawTriangularGrid() {
  const w = canvas.width;
  const h = canvas.height;
  const side = state.triGridSize;
  const height = (side * Math.sqrt(3)) / 2;

  ctx.save();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 0.8;

  for (let y = 0; y <= h + height; y += height) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  for (let row = 0; row <= h / height + 1; row++) {
    const y = row * height;
    const offsetX = row % 2 === 0 ? 0 : side / 2;

    for (let x = offsetX; x <= w + side; x += side) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + side / 2, y - height);
      ctx.stroke();
    }

    for (let x = offsetX; x <= w + side; x += side) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - side / 2, y - height);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawIsometricGrid() {
  const size = state.triGridSize;
  const angleRad = ((state.isoAngle || 30) * Math.PI) / 180;

  ctx.save();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 0.8;

  const w = canvas.width;
  const h = canvas.height;
  const dx1 = Math.cos(angleRad), dy1 = Math.sin(angleRad);
  const dx2 = Math.cos(-angleRad), dy2 = Math.sin(-angleRad);
  const dx3 = 0, dy3 = 1;
  const lines = Math.ceil(Math.max(w, h) / size) + 10;
  const centerX = w / 2, centerY = h / 2;

  const directions = [
    { dx: dx1, dy: dy1 },
    { dx: dx2, dy: dy2 },
    { dx: dx3, dy: dy3 },
  ];

  for (let dirIdx = 0; dirIdx < directions.length; dirIdx++) {
    const dir = directions[dirIdx];
    const perpX = -dir.dy, perpY = dir.dx;

    for (let i = -lines; i <= lines; i++) {
      const offset = i * size;
      const startX = centerX + offset * perpX - lines * size * dir.dx;
      const startY = centerY + offset * perpY - lines * size * dir.dy;
      const endX = centerX + offset * perpX + lines * size * dir.dx;
      const endY = centerY + offset * perpY + lines * size * dir.dy;

      if (startX > w && endX > w) continue;
      if (startX < 0 && endX < 0) continue;
      if (startY > h && endY > h) continue;
      if (startY < 0 && endY < 0) continue;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawGrid() {
  if (!state.snap) return;

  if (state.gridMode === "square") {
    ctx.save();
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += state.gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= canvas.height; i += state.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
    ctx.restore();
  } else if (state.gridMode === "triangular") {
    drawTriangularGrid();
  } else if (state.gridMode === "isometric") {
    drawIsometricGrid();
  }
}

// ========== ОТРИСОВКА РУЧЕК КРИВЫХ БЕЗЬЕ ==========
function drawHandles(ctx, path, idx) {
  if (path.tool === "curve" && path.points.length === 4) {
    const start = path.points[0];
    const handle1 = path.points[1];
    const handle2 = path.points[2];
    const end = path.points[3];
    const pathColor = path.color || state.color;
    const pathThickness = path.thickness || state.thickness;
    const pointSize = Math.max(4, Math.min(6, Math.floor(pathThickness / 2)));
    const handleSize = Math.max(5, pointSize + 1);

    const isDraggingHandle1 = state.isDragging && state.dragType === "handle" && state.dragData?.pathIdx === idx && state.dragData?.handleIdx === 1;
    const isDraggingHandle2 = state.isDragging && state.dragType === "handle" && state.dragData?.pathIdx === idx && state.dragData?.handleIdx === 2;

    // Вспомогательные линии
    ctx.save();
    ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(handle1.x, handle1.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(handle2.x, handle2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const drawHandle = (x, y, size, isDragging) => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, size + 3, 0, Math.PI * 2);
      ctx.fill();

      const handleColor = "#ff6600";
      ctx.fillStyle = isDragging ? "#ff6600" : handleColor;
      ctx.beginPath();
      ctx.arc(x, y, size + 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, size / 2), 0, Math.PI * 2);
      ctx.fill();
    };

    drawHandle(handle1.x, handle1.y, handleSize, isDraggingHandle1);
    drawHandle(handle2.x, handle2.y, handleSize, isDraggingHandle2);

    const drawPoint = (x, y, size, color) => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, size + 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      ctx.strokeStyle = brightness > 128 ? "#000000" : "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };

    drawPoint(start.x, start.y, pointSize, pathColor);
    drawPoint(end.x, end.y, pointSize, pathColor);
    ctx.restore();
  }
}

// ========== ПРИЗРАЧНЫЙ КОНТУР ==========
function drawGhostOutline(ctx, path) {
  ctx.save();
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  buildShapePath(ctx, path);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ========== ОСНОВНАЯ ОТРИСОВКА ==========
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Фон
  if (state.background.type !== "none") {
    if (state.background.type === "solid") {
      ctx.fillStyle = state.background.solidColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (state.background.type === "gradient") {
      const grad = state.background.gradient;
      let gradient;

      if (grad.type === "linear") {
        const angleRad = (grad.angle * Math.PI) / 180;
        const x1 = canvas.width / 2 - (Math.cos(angleRad) * canvas.width) / 2;
        const y1 = canvas.height / 2 - (Math.sin(angleRad) * canvas.height) / 2;
        const x2 = canvas.width / 2 + (Math.cos(angleRad) * canvas.width) / 2;
        const y2 = canvas.height / 2 + (Math.sin(angleRad) * canvas.height) / 2;
        gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      } else {
        gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2,
          Math.max(canvas.width, canvas.height) / 2,
        );
      }

      gradient.addColorStop(0, grad.color1);
      gradient.addColorStop(1, grad.color2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  drawGrid();

  // Фигуры
  state.paths.forEach((path) => {
    renderShape(ctx, path);
  });

  // Подсветка выделенного пути
  if (state.tool === "select") {
    state.paths.forEach((path, idx) => {
      if (idx === state.selectedPathIdx) {
        const pathThickness = path.thickness !== undefined ? path.thickness : state.thickness;
        const glowWidth = pathThickness > 0 ? pathThickness + 8 : 6;

        ctx.save();
        ctx.strokeStyle = "rgba(66, 133, 244, 0.5)";
        ctx.lineWidth = glowWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        buildShapePath(ctx, path);
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  // Ручки и точки
  state.paths.forEach((path, idx) => {
    const shouldShowHandles =
      (state.tool === "curve" || state.tool === "select" || state.tool === "path") &&
      (idx === state.selectedPathIdx || idx === state.hoveredPathIdx) &&
      (path.tool === "curve" || path.tool === "path");

    if (shouldShowHandles) {
      if (path.tool === "curve" && path.points.length === 4) {
        drawHandles(ctx, path, idx);
      } else if (path.tool === "curve" && path.points.length === 3) {
        const handle = path.points[1];
        const isDraggingThisHandle = state.isDragging && state.dragType === "handle" && state.dragData?.pathIdx === idx;

        ctx.fillStyle = isDraggingThisHandle ? "rgba(255, 50, 50, 0.95)" : "rgba(255, 100, 100, 0.9)";
        ctx.strokeStyle = isDraggingThisHandle ? "#ff0000" : "#ff4444";
        ctx.lineWidth = isDraggingThisHandle ? 3 : 2;
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, isDraggingThisHandle ? 12 : 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        ctx.lineTo(handle.x, handle.y);
        ctx.lineTo(path.points[2].x, path.points[2].y);
        ctx.stroke();
      } else if (path.tool === "path") {
        drawPathHandles(ctx, path, idx);
      }
    }
  });

  // Точки для выбранного пути
  state.paths.forEach((path, idx) => {
    if ((state.tool === "select" || state.tool === "path") && idx === state.selectedPathIdx) {
      ctx.fillStyle = "rgba(66, 133, 244, 0.9)";
      ctx.strokeStyle = "#4285F4";
      ctx.lineWidth = 2;

      if (path.tool === "path") {
        // Для path-объектов рисуем начальную точку и точки сочленения сегментов
        if (path.startPoint) {
          ctx.beginPath();
          ctx.arc(path.startPoint.x, path.startPoint.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        path.segments.forEach((seg) => {
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      } else if (path.points) {
        path.points.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }
    }
  });

  // Призрачные контуры
  // — для выбранной фигуры (сразу после создания видно границы)
  // — для фигур без видимого представления (толщина 0 и нет заливки)
  if (state.ghostStroke !== false) {
    state.paths.forEach((path, idx) => {
      const isSelected = idx === state.selectedPathIdx;
      const isInvisible = !hasVisibleAppearance(path);
      if (isSelected || isInvisible) {
        drawGhostOutline(ctx, path);
      }
    });
  }

  // Зелёная точка начала контура при построении path
  if (state.tool === "path" && state.isPathBuilding && state.pathStartPoint && state.pathSegments.length > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 200, 0, 0.5)";
    ctx.strokeStyle = "rgba(0, 150, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.pathStartPoint.x, state.pathStartPoint.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function hasVisibleAppearance(path) {
  const fillType = path.fillType !== undefined ? path.fillType : state.fillType;
  const thickness = path.thickness !== undefined ? path.thickness : state.thickness;
  return fillType !== "none" || thickness > 0;
}

// ========== РУЧКИ ДЛЯ PATH (СОСТАВНОЙ КОНТУР) ==========
function drawPathHandles(ctx, path, idx) {
  if (path.tool !== "path") return;

  const pathColor = path.color || state.color;
  const pathThickness = path.thickness || state.thickness;
  const pointSize = Math.max(4, Math.min(6, Math.floor(pathThickness / 2)));
  const handleSize = Math.max(5, pointSize + 1);

  ctx.save();

  // Рисуем начальную точку (startPoint)
  if (path.startPoint) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(path.startPoint.x, path.startPoint.y, pointSize + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pathColor;
    ctx.beginPath();
    ctx.arc(path.startPoint.x, path.startPoint.y, pointSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Рисуем ручки для curve-сегментов и точки сочленения
  let prevPoint = path.startPoint || null;
  for (let j = 0; j < path.segments.length; j++) {
    const seg = path.segments[j];

    // Точка сочленения (конец сегмента)
    const isDraggingPoint = state.isDragging && state.dragType === "point" && state.dragData?.pathIdx === idx && state.dragData?.pointIdx === j;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(seg.x, seg.y, pointSize + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isDraggingPoint ? "#ff6600" : pathColor;
    ctx.beginPath();
    ctx.arc(seg.x, seg.y, pointSize, 0, Math.PI * 2);
    ctx.fill();

    // Если это curve-сегмент — рисуем ручки
    if (seg.type === "curve") {
      const isDraggingC1 = state.isDragging && state.dragType === "handle" && state.dragData?.pathIdx === idx && state.dragData?.segIdx === j && state.dragData?.handleType === "c1";
      const isDraggingC2 = state.isDragging && state.dragType === "handle" && state.dragData?.pathIdx === idx && state.dragData?.segIdx === j && state.dragData?.handleType === "c2";

      // Вспомогательные линии к ручкам
      ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      if (prevPoint) {
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(seg.c1.x, seg.c1.y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(seg.x, seg.y);
      ctx.lineTo(seg.c2.x, seg.c2.y);
      ctx.stroke();

      ctx.setLineDash([]);

      // Ручка c1
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(seg.c1.x, seg.c1.y, handleSize + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isDraggingC1 ? "#ff6600" : "#ff6600";
      ctx.beginPath();
      ctx.arc(seg.c1.x, seg.c1.y, handleSize + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(seg.c1.x, seg.c1.y, Math.max(2, handleSize / 2), 0, Math.PI * 2);
      ctx.fill();

      // Ручка c2
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(seg.c2.x, seg.c2.y, handleSize + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isDraggingC2 ? "#ff6600" : "#ff6600";
      ctx.beginPath();
      ctx.arc(seg.c2.x, seg.c2.y, handleSize + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(seg.c2.x, seg.c2.y, Math.max(2, handleSize / 2), 0, Math.PI * 2);
      ctx.fill();
    }

    prevPoint = { x: seg.x, y: seg.y };
  }

  ctx.restore();
}