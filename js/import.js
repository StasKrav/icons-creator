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