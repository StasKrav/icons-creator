// ========== ПРИВЯЗКА К СЕТКЕ ==========
function snapXY(x, y) {
  if (!state.snap) return { x, y };
  if (state.gridMode === "triangular") return snapToTriangular(x, y);
  if (state.gridMode === "isometric") return snapToIsometric(x, y);
  return {
    x: Math.round(x / state.gridSize) * state.gridSize,
    y: Math.round(y / state.gridSize) * state.gridSize,
  };
}

function snapToTriangular(x, y) {
  const side = state.triGridSize;
  const height = (side * Math.sqrt(3)) / 2;
  const row = Math.round(y / height);
  const col = Math.round(x / side);
  const offsetX = row % 2 === 0 ? 0 : side / 2;
  return { x: col * side + offsetX, y: row * height };
}

function snapToIsometric(x, y) {
  const size = state.triGridSize;
  const angleRad = ((state.isoAngle || 30) * Math.PI) / 180;
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
  const maxI = Math.ceil(Math.max(canvas.width, canvas.height) / size) + 5;

  let bestX = x, bestY = y, bestDist = Infinity;

  for (let iX = -maxI; iX <= maxI; iX++) {
    const px = cx + iX * size * -sinA, py = cy + iX * size * cosA;
    for (let iY = -maxI; iY <= maxI; iY++) {
      const qx = cx + iY * size * sinA, qy = cy + iY * size * cosA;
      const dpx = qx - px, dpy = qy - py;
      if (Math.abs(cosA) > 1e-10 && Math.abs(sinA) > 1e-10) {
        const t = (dpx / cosA + dpy / sinA) / 2;
        const nx = px + t * cosA, ny = py + t * sinA;
        const dist = Math.hypot(nx - x, ny - y);
        if (dist < bestDist) { bestDist = dist; bestX = nx; bestY = ny; }
      }
    }
    for (let iZ = -maxI; iZ <= maxI; iZ++) {
      const rz = cx + iZ * size;
      if (Math.abs(cosA) > 1e-10) {
        const tz = (rz - px) / cosA;
        const nzx = px + tz * cosA, nzy = py + tz * sinA;
        const distZ = Math.hypot(nzx - x, nzy - y);
        if (distZ < bestDist) { bestDist = distZ; bestX = nzx; bestY = nzy; }
      }
    }
  }

  for (let iY = -maxI; iY <= maxI; iY++) {
    const qx = cx + iY * size * sinA, qy = cy + iY * size * cosA;
    for (let iZ = -maxI; iZ <= maxI; iZ++) {
      const rz = cx + iZ * size;
      if (Math.abs(cosA) > 1e-10) {
        const sz = (rz - qx) / cosA;
        const nzx = qx + sz * cosA, nzy = qy - sz * sinA;
        const distZ = Math.hypot(nzx - x, nzy - y);
        if (distZ < bestDist) { bestDist = distZ; bestX = nzx; bestY = nzy; }
      }
    }
  }

  return { x: bestX, y: bestY };
}

// ========== ПОЗИЦИЯ МЫШИ ==========
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const rawX = (e.clientX - rect.left) * scaleX;
  const rawY = (e.clientY - rect.top) * scaleY;

  if (!state.snap) return { x: rawX, y: rawY };
  if (state.gridMode === "triangular") return snapToTriangular(rawX, rawY);
  if (state.gridMode === "isometric") return snapToIsometric(rawX, rawY);
  return snapXY(rawX, rawY);
}

// ========== HIT-TESTING ==========
function findPoint(x, y) {
  const threshold = 15;
  for (let i = 0; i < state.paths.length; i++) {
    const path = state.paths[i];
    for (let j = 0; j < path.points.length; j++) {
      if (Math.hypot(path.points[j].x - x, path.points[j].y - y) < threshold) {
        return { pathIdx: i, pointIdx: j };
      }
    }
  }
  return null;
}

function findHandle(x, y) {
  const threshold = 20;
  for (let i = 0; i < state.paths.length; i++) {
    const path = state.paths[i];
    if (path.tool === "curve" && path.points.length === 4) {
      if (Math.hypot(path.points[1].x - x, path.points[1].y - y) < threshold) return { pathIdx: i, handleIdx: 1 };
      if (Math.hypot(path.points[2].x - x, path.points[2].y - y) < threshold) return { pathIdx: i, handleIdx: 2 };
      if (Math.hypot(path.points[0].x - x, path.points[0].y - y) < threshold) return { pathIdx: i, pointIdx: 0 };
      if (Math.hypot(path.points[3].x - x, path.points[3].y - y) < threshold) return { pathIdx: i, pointIdx: 3 };
    }
    if (path.tool === "curve" && path.points.length === 3) {
      if (Math.hypot(path.points[1].x - x, path.points[1].y - y) < threshold) return { pathIdx: i, handleIdx: 1, isQuadratic: true };
    }
  }
  return null;
}

function isPointOnPath(x, y, path) {
  const thickness = path.thickness !== undefined ? path.thickness : state.thickness;
  const hitMargin = Math.max(8, thickness + 5);

  if (path.tool === "rectangle" && path.points.length === 4) {
    const xs = path.points.map((p) => p.x);
    const ys = path.points.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    if (x >= minX - hitMargin && x <= maxX + hitMargin && y >= minY - hitMargin && y <= maxY + hitMargin) return true;
  } else if (path.tool === "circle" && path.points.length === 2) {
    const center = path.points[0];
    const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
    const dist = Math.hypot(x - center.x, y - center.y);
    if (Math.abs(dist - radius) <= hitMargin) return true;
    if (path.fillType !== "none" && dist <= radius + hitMargin) return true;
  } else if (path.tool === "line" && path.points.length === 2) {
    const dist = distanceToLine(x, y, path.points[0], path.points[1]);
    if (dist <= hitMargin) {
      const dot1 = (x - path.points[0].x) * (path.points[1].x - path.points[0].x) + (y - path.points[0].y) * (path.points[1].y - path.points[0].y);
      const dot2 = (x - path.points[1].x) * (path.points[0].x - path.points[1].x) + (y - path.points[1].y) * (path.points[0].y - path.points[1].y);
      if (dot1 >= -hitMargin && dot2 >= -hitMargin) return true;
    }
  } else if (path.tool === "curve" && path.points.length === 4) {
    for (let t = 0; t <= 1; t += 0.05) {
      const t1 = 1 - t;
      const px = t1 * t1 * t1 * path.points[0].x + 3 * t1 * t1 * t * path.points[1].x + 3 * t1 * t * t * path.points[2].x + t * t * t * path.points[3].x;
      const py = t1 * t1 * t1 * path.points[0].y + 3 * t1 * t1 * t * path.points[1].y + 3 * t1 * t * t * path.points[2].y + t * t * t * path.points[3].y;
      if (Math.hypot(px - x, py - y) <= hitMargin) return true;
    }
  }
  return false;
}

function isPointNearPath(x, y, path) {
  const pathThickness = path.thickness || state.thickness;
  const threshold = Math.max(10, pathThickness + 5);
  const sizeThreshold = threshold;

  if (path.tool === "curve" && path.points.length === 4) {
    for (let t = 0; t <= 1; t += 0.01) {
      const t1 = 1 - t;
      const px = t1 * t1 * t1 * path.points[0].x + 3 * t1 * t1 * t * path.points[1].x + 3 * t1 * t * t * path.points[2].x + t * t * t * path.points[3].x;
      const py = t1 * t1 * t1 * path.points[0].y + 3 * t1 * t1 * t * path.points[1].y + 3 * t1 * t * t * path.points[2].y + t * t * t * path.points[3].y;
      if (Math.hypot(px - x, py - y) < threshold) return true;
    }
    if (Math.hypot(path.points[1].x - x, path.points[1].y - y) < threshold + 5 || Math.hypot(path.points[2].x - x, path.points[2].y - y) < threshold + 5) return true;
  } else if (path.tool === "line" && path.points.length === 2) {
    const dist = distanceToLine(x, y, path.points[0], path.points[1]);
    const lineLength = Math.hypot(path.points[1].x - path.points[0].x, path.points[1].y - path.points[0].y);
    const adjustedThreshold = lineLength < 30 ? sizeThreshold + 5 : sizeThreshold;
    if (dist < adjustedThreshold) {
      const dot1 = (x - path.points[0].x) * (path.points[1].x - path.points[0].x) + (y - path.points[0].y) * (path.points[1].y - path.points[0].y);
      const dot2 = (x - path.points[1].x) * (path.points[0].x - path.points[1].x) + (y - path.points[1].y) * (path.points[0].y - path.points[1].y);
      if (dot1 >= 0 && dot2 >= 0) return true;
    }
  } else if (path.tool === "rectangle" && path.points.length === 4) {
    const minX = Math.min(...path.points.map((p) => p.x));
    const maxX = Math.max(...path.points.map((p) => p.x));
    const minY = Math.min(...path.points.map((p) => p.y));
    const maxY = Math.max(...path.points.map((p) => p.y));
    if (maxX - minX < 30 && maxY - minY < 30) {
      if (x >= minX - sizeThreshold && x <= maxX + sizeThreshold && y >= minY - sizeThreshold && y <= maxY + sizeThreshold) return true;
    }
    for (let i = 0; i < 4; i++) {
      const p1 = path.points[i], p2 = path.points[(i + 1) % 4];
      if (distanceToLine(x, y, p1, p2) < sizeThreshold) return true;
    }
  } else if (path.tool === "circle" && path.points.length === 2) {
    const center = path.points[0];
    const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
    const distance = Math.hypot(x - center.x, y - center.y);
    const adjustedThreshold = radius < 15 ? sizeThreshold + 5 : sizeThreshold;
    if (Math.abs(distance - radius) < adjustedThreshold) return true;
    if (radius < 5 && distance < 15) return true;
  }
  return false;
}

function findPathAt(x, y) {
  for (let i = state.paths.length - 1; i >= 0; i--) {
    if (isPointOnPath(x, y, state.paths[i])) return i;
  }
  return -1;
}

// ========== ОБРАБОТЧИКИ МЫШИ ==========
function onMouseDown(e) {
  const pos = getMousePos(e);

  if (e.detail === 2 && state.tool === "select") {
    const pathIdx = findPathAt(pos.x, pos.y);
    if (pathIdx !== -1) {
      state.selectedPathIdx = pathIdx;
      state.showHandles = true;
      updatePanelFromSelected();
      saveState();
      draw();
      return;
    }
  }

  if (state.tool === "curve") {
    state.selectedPathIdx = -1;
    state.currentPath = [{ x: pos.x, y: pos.y }];
    state.isDrawing = true;
    state.showHandles = false;
    return;
  }

  if (state.tool === "select") {
    const point = findPoint(pos.x, pos.y);
    if (point) {
      state.dragType = "point";
      state.dragData = { pathIdx: point.pathIdx, pointIdx: point.pointIdx, startX: pos.x, startY: pos.y };
      state.isDragging = true;
      state.selectedPathIdx = point.pathIdx;
      state.showHandles = true;
      updatePanelFromSelected();
      draw();
      return;
    }

    const handle = findHandle(pos.x, pos.y);
    if (handle) {
      state.dragType = "handle";
      state.dragData = handle;
      state.isDragging = true;
      state.selectedPathIdx = handle.pathIdx;
      state.showHandles = true;
      draw();
      return;
    }

    const pathIdx = findPathAt(pos.x, pos.y);
    if (pathIdx !== -1) {
      state.selectedPathIdx = pathIdx;
      state.dragType = "path";
      const center = getPathCenter(state.paths[pathIdx]);
      state.dragData = { pathIdx, offsetX: pos.x - center.x, offsetY: pos.y - center.y };
      state.isDragging = true;
      state.showHandles = state.paths[pathIdx]?.tool === "curve";
      updatePanelFromSelected();
      draw();
      return;
    } else {
      state.selectedPathIdx = -1;
      state.showHandles = false;
      draw();
    }
  }

  if (state.tool === "erase") {
    eraseAt(pos.x, pos.y);
    return;
  }

  if (["line", "rectangle", "circle"].includes(state.tool)) {
    state.selectedPathIdx = -1;
    state.currentPath = [{ x: pos.x, y: pos.y }];
    state.isDrawing = true;
  }
}

function onMouseMove(e) {
  const pos = getMousePos(e);
  updateCursor(pos.x, pos.y);

  if (state.isDrawing && state.tool === "curve" && state.currentPath.length === 1) {
    draw();
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.thickness;
    const start = state.currentPath[0], end = pos;
    const dx = end.x - start.x, dy = end.y - start.y;
    const control1 = { x: start.x + dx / 3, y: start.y + dy / 3 };
    const control2 = { x: start.x + (dx * 2) / 3, y: start.y + (dy * 2) / 3 };
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  if (state.isDragging && state.dragType === "handle") {
    const path = state.paths[state.dragData.pathIdx];
    const handleIdx = state.dragData.handleIdx;
    if (path.tool === "curve" && path.points.length === 4) {
      path.points[handleIdx] = { x: pos.x, y: pos.y };
    } else if (path.points.length === 3) {
      path.points[1] = { x: pos.x, y: pos.y };
    }
    draw();
    return;
  }

  if (state.isDragging && state.dragType === "point") {
    const { pathIdx, pointIdx } = state.dragData;
    const path = state.paths[pathIdx];
    path.points[pointIdx] = { x: pos.x, y: pos.y };
    if (path.tool === "rectangle" && path.points.length === 4) {
      updateRectanglePoints(path, pointIdx, pos);
    }
    draw();
    return;
  }

  if (state.isDragging && state.dragType === "path") {
    const { pathIdx, offsetX, offsetY } = state.dragData;
    const center = getPathCenter(state.paths[pathIdx]);
    const dx = pos.x - center.x - offsetX;
    const dy = pos.y - center.y - offsetY;
    state.paths[pathIdx].points = state.paths[pathIdx].points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    const newCenter = getPathCenter(state.paths[pathIdx]);
    state.dragData.offsetX = pos.x - newCenter.x;
    state.dragData.offsetY = pos.y - newCenter.y;
    draw();
    return;
  }

  if (state.isDrawing && state.currentPath.length === 1) {
    draw();
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.thickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const start = state.currentPath[0], end = pos;

    if (state.tool === "curve") {
      const midX = (start.x + end.x) / 2, midY = (start.y + end.y) / 2;
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(midX + 30, midY - 30, end.x, end.y);
    } else if (state.tool === "line") {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    } else if (state.tool === "rectangle") {
      ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (state.tool === "circle") {
      ctx.arc(start.x, start.y, Math.hypot(end.x - start.x, end.y - start.y), 0, Math.PI * 2);
    }
    ctx.stroke();
  }
}

function onMouseUp(e) {
  if (state.isDragging) {
    if (["handle", "point", "path"].includes(state.dragType)) saveState();
    state.isDragging = false;
    state.dragType = null;
    state.dragData = null;
    draw();
    return;
  }

  if (!state.isDrawing) return;
  const pos = getMousePos(e);

  if (state.currentPath.length === 1) {
    let newPath;

    if (state.tool === "line") {
      newPath = { tool: "line", points: [{ x: state.currentPath[0].x, y: state.currentPath[0].y }, { x: pos.x, y: pos.y }], thickness: state.thickness, color: state.color };
    } else if (state.tool === "curve") {
      const start = state.currentPath[0], end = pos;
      const dx = end.x - start.x, dy = end.y - start.y;
      newPath = { tool: "curve", points: [{ x: start.x, y: start.y }, { x: start.x + dx / 3, y: start.y + dy / 3 }, { x: start.x + (dx * 2) / 3, y: start.y + (dy * 2) / 3 }, { x: end.x, y: end.y }], thickness: state.thickness, color: state.color };
      state.showHandles = true;
    } else if (state.tool === "rectangle") {
      newPath = { tool: "rectangle", points: [{ x: state.currentPath[0].x, y: state.currentPath[0].y }, { x: pos.x, y: state.currentPath[0].y }, { x: pos.x, y: pos.y }, { x: state.currentPath[0].x, y: pos.y }], thickness: state.thickness, color: state.color };
    } else if (state.tool === "circle") {
      newPath = { tool: "circle", points: [{ x: state.currentPath[0].x, y: state.currentPath[0].y }, { x: pos.x, y: pos.y }], thickness: state.thickness, color: state.color };
    }

    if (newPath) {
      newPath.fillType = state.fillType;
      newPath.fillColor = state.fillColor;
      newPath.fillGradient = JSON.parse(JSON.stringify(state.fillGradient));
      state.paths.push(newPath);
      state.selectedPathIdx = state.paths.length - 1;
      updatePanelFromSelected();
      saveState();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw();
    }
  }

  state.currentPath = [];
  state.isDrawing = false;
  draw();
}

function updateRectanglePoints(rect, changedPointIdx, newPos) {
  const points = rect.points;
  if (changedPointIdx === 0) { points[1].y = newPos.y; points[3].x = newPos.x; }
  else if (changedPointIdx === 1) { points[0].y = newPos.y; points[2].x = newPos.x; }
  else if (changedPointIdx === 2) { points[1].x = newPos.x; points[3].y = newPos.y; }
  else if (changedPointIdx === 3) { points[0].x = newPos.x; points[2].y = newPos.y; }
}

function updateCursor(x, y) {
  if (state.tool === "select") {
    const handle = findHandle(x, y);
    const point = findPoint(x, y);
    if (handle || point) canvas.style.cursor = "move";
    else if (findPathAt(x, y) !== -1) canvas.style.cursor = "grab";
    else canvas.style.cursor = "default";
  } else if (state.tool === "curve") {
    canvas.style.cursor = findHandle(x, y) ? "move" : "crosshair";
  } else if (state.tool === "erase") {
    canvas.style.cursor = "pointer";
  } else {
    canvas.style.cursor = "crosshair";
  }
}

function eraseAt(x, y) {
  let deleted = false;
  state.paths = state.paths.filter((path, idx) => {
    if (idx === state.selectedPathIdx) state.selectedPathIdx = -1;
    const willDelete = isPointNearPath(x, y, path);
    if (willDelete) deleted = true;
    return !willDelete;
  });
  if (deleted) saveState();
  state.showHandles = false;
  draw();
}

function createBezierCurve(start, end) {
  const dx = end.x - start.x, dy = end.y - start.y;
  return { tool: "curve", points: [{ x: start.x, y: start.y }, { x: start.x + dx * 0.33, y: start.y + dy * 0.33 }, { x: start.x + dx * 0.66, y: start.y + dy * 0.66 }, { x: end.x, y: end.y }], thickness: state.thickness, color: state.color };
}