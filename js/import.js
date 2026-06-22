// ========== ИМПОРТ SVG ==========
function parseSVGToPaths(svgString) {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = svgDoc.querySelector("svg");

  if (!svgElement) {
    alert("Невалидный SVG файл");
    return [];
  }

  const paths = [];

  let viewBox = svgElement.getAttribute("viewBox");
  let svgWidth = parseFloat(svgElement.getAttribute("width")) || 512;
  let svgHeight = parseFloat(svgElement.getAttribute("height")) || 512;

  if (viewBox) {
    const parts = viewBox.split(/[ ,]+/);
    svgWidth = parseFloat(parts[2]);
    svgHeight = parseFloat(parts[3]);
  }

  const scaleX = 512 / svgWidth;
  const scaleY = 512 / svgHeight;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (512 - svgWidth * scale) / 2;
  const offsetY = (512 - svgHeight * scale) / 2;

  // Парсим path элементы
  const pathElements = svgDoc.querySelectorAll("path");
  pathElements.forEach((pathEl) => {
    const d = pathEl.getAttribute("d");
    const stroke = pathEl.getAttribute("stroke") || state.color;
    const strokeWidth = parseFloat(pathEl.getAttribute("stroke-width")) || state.thickness;
    const fill = pathEl.getAttribute("fill") || "none";

    const commands = d.match(/[MmLlCcQqZz][^MmLlCcQqZz]*/g);
    if (!commands) return;

    // Сначала собираем все команды, чтобы определить тип
    let hasCurve = false;
    let hasLine = false;
    let hasMultipleSegments = false;
    let segmentCount = 0;

    for (let cmd of commands) {
      const type = cmd[0];
      if (type === "C" || type === "c" || type === "Q" || type === "q") hasCurve = true;
      if (type === "L" || type === "l") hasLine = true;
      if (type === "M" || type === "m") segmentCount++;
    }

    // Если есть и линии, и кривые, или несколько M — используем path.tool="path"
    const usePathTool = (hasCurve && hasLine) || segmentCount > 1;

    if (usePathTool) {
      // Создаём path-объект с сегментами
      let currentPathObj = null;
      let startPoint = null;
      let prevPoint = null;
      let closed = false;

      for (let cmd of commands) {
        const type = cmd[0];
        const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

        if (type === "M" || type === "m") {
          // Если уже был path — сохраняем его
          if (currentPathObj && currentPathObj.segments.length > 0) {
            paths.push(currentPathObj);
          }
          const x = coords[0] * scale + offsetX;
          const y = coords[1] * scale + offsetY;
          currentPathObj = {
            tool: "path",
            segments: [],
            closed: false,
            startPoint: { x, y },
            thickness: strokeWidth,
            color: stroke,
            fillType: fill !== "none" ? "solid" : "none",
            fillColor: fill !== "none" ? fill : state.fillColor,
            fillGradient: JSON.parse(JSON.stringify(state.fillGradient)),
          };
          startPoint = { x, y };
          prevPoint = { x, y };
        } else if ((type === "L" || type === "l") && currentPathObj) {
          for (let i = 0; i < coords.length; i += 2) {
            const x = coords[i] * scale + offsetX;
            const y = coords[i + 1] * scale + offsetY;
            currentPathObj.segments.push({ type: "line", x, y });
            prevPoint = { x, y };
          }
        } else if ((type === "C" || type === "c") && currentPathObj) {
          for (let i = 0; i < coords.length; i += 6) {
            const c1 = { x: coords[i] * scale + offsetX, y: coords[i + 1] * scale + offsetY };
            const c2 = { x: coords[i + 2] * scale + offsetX, y: coords[i + 3] * scale + offsetY };
            const end = { x: coords[i + 4] * scale + offsetX, y: coords[i + 5] * scale + offsetY };
            currentPathObj.segments.push({ type: "curve", c1, c2, x: end.x, y: end.y });
            prevPoint = { x: end.x, y: end.y };
          }
        } else if ((type === "Q" || type === "q") && currentPathObj) {
          for (let i = 0; i < coords.length; i += 4) {
            const c1 = { x: coords[i] * scale + offsetX, y: coords[i + 1] * scale + offsetY };
            const end = { x: coords[i + 2] * scale + offsetX, y: coords[i + 3] * scale + offsetY };
            // Конвертируем квадратичную Безье в кубическую
            const p0 = prevPoint || startPoint;
            const cubicC1 = { x: p0.x + (c1.x - p0.x) * 2 / 3, y: p0.y + (c1.y - p0.y) * 2 / 3 };
            const cubicC2 = { x: end.x + (c1.x - end.x) * 2 / 3, y: end.y + (c1.y - end.y) * 2 / 3 };
            currentPathObj.segments.push({ type: "curve", c1: cubicC1, c2: cubicC2, x: end.x, y: end.y });
            prevPoint = { x: end.x, y: end.y };
          }
        } else if (type === "Z" || type === "z") {
          closed = true;
        }
      }

      if (currentPathObj && currentPathObj.segments.length > 0) {
        currentPathObj.closed = closed;
        paths.push(currentPathObj);
      }
    } else {
      // Старая логика для простых фигур
      let currentPath = null;
      let lastPoint = null;

      for (let cmd of commands) {
        const type = cmd[0];
        const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

        if (type === "M" || type === "m") {
          if (currentPath && currentPath.points.length >= 2) paths.push(currentPath);
          const x = coords[0] * scale + offsetX;
          const y = coords[1] * scale + offsetY;
          currentPath = { tool: "curve", points: [{ x, y }], thickness: strokeWidth, color: stroke, fillType: fill !== "none" ? "solid" : "none", fillColor: fill !== "none" ? fill : state.fillColor };
          lastPoint = { x, y };
        } else if ((type === "L" || type === "l") && currentPath) {
          for (let i = 0; i < coords.length; i += 2) {
            const x = coords[i] * scale + offsetX;
            const y = coords[i + 1] * scale + offsetY;
            currentPath.points.push({ x, y });
            lastPoint = { x, y };
          }
        } else if ((type === "C" || type === "c") && currentPath) {
          for (let i = 0; i < coords.length; i += 6) {
            const p1 = { x: coords[i] * scale + offsetX, y: coords[i + 1] * scale + offsetY };
            const p2 = { x: coords[i + 2] * scale + offsetX, y: coords[i + 3] * scale + offsetY };
            const p3 = { x: coords[i + 4] * scale + offsetX, y: coords[i + 5] * scale + offsetY };
            currentPath.points.push(p1, p2, p3);
            lastPoint = p3;
          }
        } else if ((type === "Q" || type === "q") && currentPath) {
          for (let i = 0; i < coords.length; i += 4) {
            const p1 = { x: coords[i] * scale + offsetX, y: coords[i + 1] * scale + offsetY };
            const p2 = { x: coords[i + 2] * scale + offsetX, y: coords[i + 3] * scale + offsetY };
            currentPath.points.push(p1, p2);
            lastPoint = p2;
          }
        } else if (type === "Z" || type === "z") {
          if (currentPath && currentPath.points.length > 0 && lastPoint) {
            currentPath.points.push({ x: currentPath.points[0].x, y: currentPath.points[0].y });
          }
        }
      }

      if (currentPath && currentPath.points.length >= 2) {
        if (currentPath.points.length === 4 && Math.abs(currentPath.points[0].x - currentPath.points[3].x) < 5 && Math.abs(currentPath.points[0].y - currentPath.points[3].y) < 5 && currentPath.points[1].x === currentPath.points[0].x) {
          currentPath.tool = "rectangle";
        } else if (currentPath.points.length === 2) {
          currentPath.tool = "line";
        } else {
          currentPath.tool = "curve";
        }
        paths.push(currentPath);
      }
    }
  });

  // Парсим circle элементы
  svgDoc.querySelectorAll("circle").forEach((circle) => {
    const cx = parseFloat(circle.getAttribute("cx")) * scale + offsetX;
    const cy = parseFloat(circle.getAttribute("cy")) * scale + offsetY;
    const r = parseFloat(circle.getAttribute("r")) * scale;
    const stroke = circle.getAttribute("stroke") || state.color;
    const strokeWidth = parseFloat(circle.getAttribute("stroke-width")) || state.thickness;
    const fill = circle.getAttribute("fill") || "none";

    paths.push({ tool: "circle", points: [{ x: cx, y: cy }, { x: cx + r, y: cy }], thickness: strokeWidth, color: stroke, fillType: fill !== "none" ? "solid" : "none", fillColor: fill !== "none" ? fill : state.fillColor });
  });

  // Парсим rect элементы
  svgDoc.querySelectorAll("rect").forEach((rect) => {
    const x = parseFloat(rect.getAttribute("x")) * scale + offsetX;
    const y = parseFloat(rect.getAttribute("y")) * scale + offsetY;
    const w = parseFloat(rect.getAttribute("width")) * scale;
    const h = parseFloat(rect.getAttribute("height")) * scale;
    const stroke = rect.getAttribute("stroke") || state.color;
    const strokeWidth = parseFloat(rect.getAttribute("stroke-width")) || state.thickness;
    const fill = rect.getAttribute("fill") || "none";

    paths.push({ tool: "rectangle", points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], thickness: strokeWidth, color: stroke, fillType: fill !== "none" ? "solid" : "none", fillColor: fill !== "none" ? fill : state.fillColor });
  });

  return paths;
}