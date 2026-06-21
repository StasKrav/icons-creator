// ========== ЭКСПОРТ SVG ==========
function exportSVG() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  state.paths.forEach((path) => {
    const pathThickness = path.thickness || state.thickness;
    const lineOffset = pathThickness / 2;
    path.points.forEach((point) => {
      minX = Math.min(minX, point.x - lineOffset);
      minY = Math.min(minY, point.y - lineOffset);
      maxX = Math.max(maxX, point.x + lineOffset);
      maxY = Math.max(maxY, point.y + lineOffset);
    });
    if (path.tool === "circle" && path.points.length === 2) {
      const center = path.points[0];
      const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
      minX = Math.min(minX, center.x - radius - lineOffset);
      minY = Math.min(minY, center.y - radius - lineOffset);
      maxX = Math.max(maxX, center.x + radius + lineOffset);
      maxY = Math.max(maxY, center.y + radius + lineOffset);
    }
    if (path.tool === "curve" && path.points.length === 4) {
      minX = Math.min(minX, path.points[1].x - lineOffset, path.points[2].x - lineOffset);
      minY = Math.min(minY, path.points[1].y - lineOffset, path.points[2].y - lineOffset);
      maxX = Math.max(maxX, path.points[1].x + lineOffset, path.points[2].x + lineOffset);
      maxY = Math.max(maxY, path.points[1].y + lineOffset, path.points[2].y + lineOffset);
    }
    if (path.tool === "curve" && path.points.length === 3) {
      minX = Math.min(minX, path.points[1].x - lineOffset);
      minY = Math.min(minY, path.points[1].y - lineOffset);
      maxX = Math.max(maxX, path.points[1].x + lineOffset);
      maxY = Math.max(maxY, path.points[1].y + lineOffset);
    }
  });

  if (minX === Infinity) { minX = minY = 0; maxX = maxY = 100; }

  const padding = Math.max(state.thickness * 2, 16);
  minX -= padding; minY -= padding; maxX += padding; maxY += padding;
  const width = maxX - minX, height = maxY - minY;
  const offsetX = -minX, offsetY = -minY;

  let paths = "", gradientsDefs = "", gradientCounter = 0;

  state.paths.forEach((path) => {
    const pathThickness = path.thickness || state.thickness;
    const pathColor = path.color || state.color;
    const fillType = (path.tool === "rectangle" || path.tool === "circle") ? (path.fillType || state.fillType) : "none";
    const fillColor = path.fillColor || state.fillColor;
    const fillGradient = path.fillGradient || state.fillGradient;

    let fillAttr = 'fill="none"';
    if (fillType === "solid") {
      fillAttr = `fill="${fillColor}"`;
    } else if (fillType === "gradient") {
      const gradId = `grad${gradientCounter++}`;
      fillAttr = `fill="url(#${gradId})"`;

      let gradientDef = "";
      if (fillGradient.type === "linear") {
        const angleRad = (fillGradient.angle * Math.PI) / 180;
        const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
        const x1 = 50 - 50 * cosA, y1 = 50 - 50 * sinA;
        const x2 = 50 + 50 * cosA, y2 = 50 + 50 * sinA;
        gradientDef = `<linearGradient id="${gradId}" x1="${x1.toFixed(2)}%" y1="${y1.toFixed(2)}%" x2="${x2.toFixed(2)}%" y2="${y2.toFixed(2)}%">`;
        gradientDef += `<stop offset="0%" stop-color="${fillGradient.color1}"/>`;
        gradientDef += `<stop offset="100%" stop-color="${fillGradient.color2}"/>`;
        gradientDef += `</linearGradient>`;
      } else {
        gradientDef = `<radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">`;
        gradientDef += `<stop offset="0%" stop-color="${fillGradient.color1}"/>`;
        gradientDef += `<stop offset="100%" stop-color="${fillGradient.color2}"/>`;
        gradientDef += `</radialGradient>`;
      }
      gradientsDefs += gradientDef;
    }

    if (path.tool === "circle" && path.points.length === 2) {
      const center = path.points[0];
      const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
      paths += `<circle cx="${center.x + offsetX}" cy="${center.y + offsetY}" r="${radius}" stroke="${pathColor}" stroke-width="${pathThickness}" ${fillAttr}/>\n`;
    } else if (path.tool === "rectangle" && path.points.length === 4) {
      const pts = path.points.map((p) => `${p.x + offsetX},${p.y + offsetY}`).join(" L");
      paths += `<path d="M${pts} Z" stroke="${pathColor}" stroke-width="${pathThickness}" ${fillAttr} stroke-linecap="round" stroke-linejoin="round"/>\n`;
    } else if (path.tool === "line" && path.points.length === 2) {
      const pts = path.points.map((p) => `${p.x + offsetX},${p.y + offsetY}`);
      paths += `<path d="M${pts[0]} L${pts[1]}" stroke="${pathColor}" stroke-width="${pathThickness}" fill="none" stroke-linecap="round"/>\n`;
    } else if (path.tool === "curve" && path.points.length === 4) {
      const p0 = path.points[0], p1 = path.points[1], p2 = path.points[2], p3 = path.points[3];
      paths += `<path d="M${p0.x + offsetX},${p0.y + offsetY} C${p1.x + offsetX},${p1.y + offsetY} ${p2.x + offsetX},${p2.y + offsetY} ${p3.x + offsetX},${p3.y + offsetY}" stroke="${pathColor}" stroke-width="${pathThickness}" fill="none" stroke-linecap="round"/>\n`;
    } else if (path.tool === "curve" && path.points.length === 3) {
      const p0 = path.points[0], p1 = path.points[1], p2 = path.points[2];
      paths += `<path d="M${p0.x + offsetX},${p0.y + offsetY} Q${p1.x + offsetX},${p1.y + offsetY} ${p2.x + offsetX},${p2.y + offsetY}" stroke="${pathColor}" stroke-width="${pathThickness}" fill="none" stroke-linecap="round"/>\n`;
    }
  });

  const svg = `<svg width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n${gradientsDefs ? `<defs>\n${gradientsDefs}</defs>\n` : ""}${paths}</svg>`;
  download(svg, "icon.svg");
}

// ========== ЭКСПОРТ PNG ==========
function exportPNG() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  state.paths.forEach((path) => {
    const pathThickness = path.thickness || state.thickness;
    const allPoints = [];
    if (path.tool === "circle" && path.points.length === 2) {
      const center = path.points[0];
      const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
      allPoints.push({ x: center.x, y: center.y - radius }, { x: center.x, y: center.y + radius }, { x: center.x - radius, y: center.y }, { x: center.x + radius, y: center.y });
    } else {
      allPoints.push(...path.points);
      if (path.tool === "curve" && path.points.length === 3) allPoints.push(path.points[1]);
    }
    const lineOffset = pathThickness / 2;
    allPoints.forEach((point) => {
      minX = Math.min(minX, point.x - lineOffset);
      minY = Math.min(minY, point.y - lineOffset);
      maxX = Math.max(maxX, point.x + lineOffset);
      maxY = Math.max(maxY, point.y + lineOffset);
    });
  });

  if (minX === Infinity) { minX = minY = 0; maxX = maxY = 100; }

  const padding = Math.max(16, state.thickness * 2);
  minX -= padding; minY -= padding; maxX += padding; maxY += padding;
  const baseWidth = Math.ceil(maxX - minX), baseHeight = Math.ceil(maxY - minY);
  const offsetX = -minX, offsetY = -minY;

  const scale = prompt("Выберите масштаб для PNG экспорта:\n\n1 - Обычный размер (1x)\n2 - Retina/HD размер (2x)\n3 - Super Retina размер (3x)\n\nВведите 1, 2 или 3:", "2");
  let selectedScale = 2;
  if (scale === "1") selectedScale = 1;
  else if (scale === "3") selectedScale = 3;

  const finalWidth = baseWidth * selectedScale, finalHeight = baseHeight * selectedScale;
  const scaleFactor = selectedScale;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = finalWidth;
  tempCanvas.height = finalHeight;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.imageSmoothingEnabled = false;

  // Фон
  if (state.background.type !== "none") {
    if (state.background.type === "solid") {
      tempCtx.fillStyle = state.background.solidColor;
      tempCtx.fillRect(0, 0, finalWidth, finalHeight);
    } else if (state.background.type === "gradient") {
      const grad = state.background.gradient;
      let gradient;
      if (grad.type === "linear") {
        const angleRad = (grad.angle * Math.PI) / 180;
        const x1 = finalWidth / 2 - (Math.cos(angleRad) * finalWidth) / 2;
        const y1 = finalHeight / 2 - (Math.sin(angleRad) * finalHeight) / 2;
        const x2 = finalWidth / 2 + (Math.cos(angleRad) * finalWidth) / 2;
        const y2 = finalHeight / 2 + (Math.sin(angleRad) * finalHeight) / 2;
        gradient = tempCtx.createLinearGradient(x1, y1, x2, y2);
      } else {
        gradient = tempCtx.createRadialGradient(finalWidth / 2, finalHeight / 2, 0, finalWidth / 2, finalHeight / 2, Math.max(finalWidth, finalHeight) / 2);
      }
      gradient.addColorStop(0, grad.color1);
      gradient.addColorStop(1, grad.color2);
      tempCtx.fillStyle = gradient;
      tempCtx.fillRect(0, 0, finalWidth, finalHeight);
    }
  }

  tempCtx.save();
  tempCtx.scale(scaleFactor, scaleFactor);
  tempCtx.translate(Math.round(offsetX), Math.round(offsetY));

  state.paths.forEach((path) => renderShape(tempCtx, path, true));

  tempCtx.restore();

  const link = document.createElement("a");
  link.download = `icon-${finalWidth}x${finalHeight}@${selectedScale}x.png`;
  link.href = tempCanvas.toDataURL("image/png");
  link.click();
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ЭКСПОРТА ==========
function download(content, filename) {
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dataURLToBlob(dataURL) {
  const parts = dataURL.split(";base64,");
  const contentType = parts[0].split(":")[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) uInt8Array[i] = raw.charCodeAt(i);
  return new Blob([uInt8Array], { type: contentType });
}

function generateSVGString() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  state.paths.forEach((path) => {
    const thickness = path.thickness || state.thickness;
    const offset = thickness / 2;
    if (path.tool === "circle") {
      const center = path.points[0];
      const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
      minX = Math.min(minX, center.x - radius - offset);
      minY = Math.min(minY, center.y - radius - offset);
      maxX = Math.max(maxX, center.x + radius + offset);
      maxY = Math.max(maxY, center.y + radius + offset);
    } else {
      path.points.forEach((p) => {
        minX = Math.min(minX, p.x - offset);
        minY = Math.min(minY, p.y - offset);
        maxX = Math.max(maxX, p.x + offset);
        maxY = Math.max(maxY, p.y + offset);
      });
    }
  });

  const padding = 20;
  minX -= padding; minY -= padding; maxX += padding; maxY += padding;
  const width = Math.ceil(maxX - minX), height = Math.ceil(maxY - minY);
  const offsetX = -minX, offsetY = -minY;

  let paths = "", gradientsDefs = "", gradientCounter = 0;

  state.paths.forEach((path) => {
    const thickness = path.thickness || state.thickness;
    const color = path.color || state.color;
    const fillType = (path.tool === "rectangle" || path.tool === "circle") ? (path.fillType || state.fillType) : "none";
    const fillColor = path.fillColor || state.fillColor;
    const fillGradient = path.fillGradient || state.fillGradient;

    let fillAttr = 'fill="none"';
    if (fillType === "solid") {
      fillAttr = `fill="${fillColor}"`;
    } else if (fillType === "gradient") {
      const gradId = `grad${gradientCounter++}`;
      fillAttr = `fill="url(#${gradId})"`;

      let gradientDef = "";
      if (fillGradient.type === "linear") {
        const angleRad = (fillGradient.angle * Math.PI) / 180;
        const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
        const x1 = 50 - 50 * cosA, y1 = 50 - 50 * sinA;
        const x2 = 50 + 50 * cosA, y2 = 50 + 50 * sinA;
        gradientDef = `<linearGradient id="${gradId}" x1="${x1.toFixed(2)}%" y1="${y1.toFixed(2)}%" x2="${x2.toFixed(2)}%" y2="${y2.toFixed(2)}%">`;
        gradientDef += `<stop offset="0%" stop-color="${fillGradient.color1}"/>`;
        gradientDef += `<stop offset="100%" stop-color="${fillGradient.color2}"/>`;
        gradientDef += `</linearGradient>`;
      } else {
        gradientDef = `<radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">`;
        gradientDef += `<stop offset="0%" stop-color="${fillGradient.color1}"/>`;
        gradientDef += `<stop offset="100%" stop-color="${fillGradient.color2}"/>`;
        gradientDef += `</radialGradient>`;
      }
      gradientsDefs += gradientDef;
    }

    if (path.tool === "circle") {
      const center = path.points[0];
      const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
      paths += `<circle cx="${center.x + offsetX}" cy="${center.y + offsetY}" r="${radius}" stroke="${color}" stroke-width="${thickness}" ${fillAttr} stroke-linecap="round"/>\n`;
    } else if (path.tool === "rectangle") {
      const pts = path.points.map((p) => `${p.x + offsetX},${p.y + offsetY}`).join(" L");
      paths += `<path d="M${pts} Z" stroke="${color}" stroke-width="${thickness}" ${fillAttr} stroke-linecap="round" stroke-linejoin="round"/>\n`;
    } else if (path.tool === "line") {
      paths += `<line x1="${path.points[0].x + offsetX}" y1="${path.points[0].y + offsetY}" x2="${path.points[1].x + offsetX}" y2="${path.points[1].y + offsetY}" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round"/>\n`;
    } else if (path.tool === "curve") {
      const p0 = path.points[0], p1 = path.points[1], p2 = path.points[2];
      paths += `<path d="M${p0.x + offsetX},${p0.y + offsetY} Q${p1.x + offsetX},${p1.y + offsetY} ${p2.x + offsetX},${p2.y + offsetY}" stroke="${color}" stroke-width="${thickness}" fill="none" stroke-linecap="round"/>\n`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">\n${gradientsDefs ? `<defs>\n${gradientsDefs}</defs>\n` : ""}${paths}</svg>`;
}

function generatePNGDataURL(targetSize) {
  return new Promise((resolve) => {
    const scale = targetSize / 512;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = targetSize;
    tempCanvas.height = targetSize;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.imageSmoothingEnabled = false;

    if (state.background.type !== "none") {
      if (state.background.type === "solid") {
        tempCtx.fillStyle = state.background.solidColor;
        tempCtx.fillRect(0, 0, targetSize, targetSize);
      } else if (state.background.type === "gradient") {
        const grad = state.background.gradient;
        let gradient;
        if (grad.type === "linear") {
          const angleRad = (grad.angle * Math.PI) / 180;
          const x1 = targetSize / 2 - (Math.cos(angleRad) * targetSize) / 2;
          const y1 = targetSize / 2 - (Math.sin(angleRad) * targetSize) / 2;
          const x2 = targetSize / 2 + (Math.cos(angleRad) * targetSize) / 2;
          const y2 = targetSize / 2 + (Math.sin(angleRad) * targetSize) / 2;
          gradient = tempCtx.createLinearGradient(x1, y1, x2, y2);
        } else {
          gradient = tempCtx.createRadialGradient(targetSize / 2, targetSize / 2, 0, targetSize / 2, targetSize / 2, targetSize / 2);
        }
        gradient.addColorStop(0, grad.color1);
        gradient.addColorStop(1, grad.color2);
        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(0, 0, targetSize, targetSize);
      }
    }

    tempCtx.save();
    tempCtx.scale(scale, scale);
    state.paths.forEach((path) => renderShape(tempCtx, path));
    tempCtx.restore();
    resolve(tempCanvas.toDataURL("image/png"));
  });
}

function exportPNGWithSize(size, filename) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  state.paths.forEach((path) => {
    const thickness = path.thickness || state.thickness;
    const offset = thickness / 2;
    if (path.tool === "circle") {
      const center = path.points[0];
      const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
      minX = Math.min(minX, center.x - radius - offset);
      minY = Math.min(minY, center.y - radius - offset);
      maxX = Math.max(maxX, center.x + radius + offset);
      maxY = Math.max(maxY, center.y + radius + offset);
    } else {
      path.points.forEach((p) => {
        minX = Math.min(minX, p.x - offset);
        minY = Math.min(minY, p.y - offset);
        maxX = Math.max(maxX, p.x + offset);
        maxY = Math.max(maxY, p.y + offset);
      });
    }
  });

  if (minX === Infinity) { minX = minY = 0; maxX = maxY = 100; }

  const padding = 10;
  minX -= padding; minY -= padding; maxX += padding; maxY += padding;
  const contentWidth = maxX - minX, contentHeight = maxY - minY;
  const scale = Math.min(size / contentWidth, size / contentHeight);
  const finalWidth = Math.round(contentWidth * scale), finalHeight = Math.round(contentHeight * scale);
  const offsetX = -minX, offsetY = -minY;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext("2d");

  if (state.background.type !== "none") {
    if (state.background.type === "solid") {
      tempCtx.fillStyle = state.background.solidColor;
      tempCtx.fillRect(0, 0, size, size);
    } else if (state.background.type === "gradient") {
      const grad = state.background.gradient;
      let gradient;
      if (grad.type === "linear") {
        const angleRad = (grad.angle * Math.PI) / 180;
        const x1 = size / 2 - (Math.cos(angleRad) * size) / 2;
        const y1 = size / 2 - (Math.sin(angleRad) * size) / 2;
        const x2 = size / 2 + (Math.cos(angleRad) * size) / 2;
        const y2 = size / 2 + (Math.sin(angleRad) * size) / 2;
        gradient = tempCtx.createLinearGradient(x1, y1, x2, y2);
      } else {
        gradient = tempCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      }
      gradient.addColorStop(0, grad.color1);
      gradient.addColorStop(1, grad.color2);
      tempCtx.fillStyle = gradient;
      tempCtx.fillRect(0, 0, size, size);
    }
  }

  const xOffset = (size - finalWidth) / 2, yOffset = (size - finalHeight) / 2;
  tempCtx.save();
  tempCtx.translate(xOffset, yOffset);
  tempCtx.scale(scale, scale);
  tempCtx.translate(offsetX, offsetY);

  state.paths.forEach((path) => renderShape(tempCtx, path));

  tempCtx.restore();

  const link = document.createElement("a");
  link.download = filename || `icon-${size}x${size}.png`;
  link.href = tempCanvas.toDataURL("image/png");
  link.click();
}

// ========== ВЕБ-ЭКСПОРТ ==========
async function exportAllWebSizes() {
  const zip = new JSZip();
  const sizes = [16, 32, 48, 64, 128, 256, 512];
  const folder = zip.folder("icons-all-sizes");
  folder.file("icon.svg", generateSVGString());

  for (const size of sizes) {
    const pngData = await generatePNGDataURL(size);
    folder.file(`icon-${size}x${size}.png`, dataURLToBlob(pngData));
  }

  const readme = `# Icons Pack\n\n## Размеры\n${sizes.map((s) => `- ${s}x${s}px`).join("\n")}\n\n## Файлы\n- icon.svg - исходный векторный файл\n- icon-{size}x{size}.png - растровые иконки\n\n## Использование\n\`\`\`html\n<img src="icon-64x64.png" alt="Icon">\n\`\`\`\n`;
  folder.file("README.txt", readme);

  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, "icons-all-sizes.zip");
  alert('✅ Все иконки сохранены в папку "icons-all-sizes" внутри ZIP архива');
}

async function exportFaviconPack() {
  const zip = new JSZip();
  const folder = zip.folder("favicon-pack");

  const faviconSizes = [16, 32, 48];
  for (const size of faviconSizes) {
    const pngData = await generatePNGDataURL(size);
    folder.file(`favicon-${size}x${size}.png`, dataURLToBlob(pngData));
  }

  const appleData = await generatePNGDataURL(180);
  folder.file("apple-touch-icon.png", dataURLToBlob(appleData));

  const android192 = await generatePNGDataURL(192);
  const android512 = await generatePNGDataURL(512);
  folder.file("android-chrome-192x192.png", dataURLToBlob(android192));
  folder.file("android-chrome-512x512.png", dataURLToBlob(android512));

  const manifest = { name: "My Icon", short_name: "Icon", icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }, { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }], theme_color: "#3b82f6", background_color: "#ffffff", display: "standalone" };
  folder.file("site.webmanifest", JSON.stringify(manifest, null, 2));

  const browserconfig = `<?xml version="1.0" encoding="utf-8"?>\n<browserconfig>\n    <msapplication>\n        <tile>\n            <square150x150logo src="/mstile-150x150.png"/>\n            <TileColor>#3b82f6</TileColor>\n        </tile>\n    </msapplication>\n</browserconfig>`;
  folder.file("browserconfig.xml", browserconfig);

  const htmlCode = `<!-- Favicon -->\n<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">\n<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="48x48" href="favicon-48x48.png">\n<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">\n<link rel="manifest" href="site.webmanifest">\n<meta name="msapplication-TileColor" content="#3b82f6">\n<meta name="theme-color" content="#3b82f6">`;
  folder.file("install-code.html", htmlCode);

  const readme = `# Favicon Pack\n\n## Структура папки\n- favicon-16x16.png\n- favicon-32x32.png\n- favicon-48x48.png\n- apple-touch-icon.png\n- android-chrome-192x192.png\n- android-chrome-512x512.png\n- site.webmanifest\n- browserconfig.xml\n- install-code.html - готовый код для вставки в ваш сайт\n\n## Установка\n1. Скопируйте все файлы в корень вашего сайта\n2. Вставьте код из install-code.html в <head> вашего HTML\n`;
  folder.file("README.txt", readme);

  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, "favicon-pack.zip");
  alert('✅ Favicon комплект сохранён в папку "favicon-pack" внутри ZIP архива');
}

async function exportSprite() {
  const zip = new JSZip();
  const folder = zip.folder("sprite-pack");

  let symbols = "";
  state.paths.forEach((path, idx) => {
    const thickness = path.thickness || state.thickness;
    const color = path.color || state.color;
    let pathData = "";

    if (path.tool === "circle") {
      const center = path.points[0];
      const radius = Math.hypot(path.points[1].x - center.x, path.points[1].y - center.y);
      pathData = `<circle cx="${center.x}" cy="${center.y}" r="${radius}" stroke="${color}" stroke-width="${thickness}" fill="none"/>`;
    } else if (path.tool === "line") {
      pathData = `<line x1="${path.points[0].x}" y1="${path.points[0].y}" x2="${path.points[1].x}" y2="${path.points[1].y}" stroke="${color}" stroke-width="${thickness}" fill="none"/>`;
    } else if (path.tool === "curve") {
      pathData = `<path d="M${path.points[0].x},${path.points[0].y} Q${path.points[1].x},${path.points[1].y} ${path.points[2].x},${path.points[2].y}" stroke="${color}" stroke-width="${thickness}" fill="none"/>`;
    } else if (path.tool === "rectangle") {
      const pts = path.points.map((p) => `${p.x},${p.y}`).join(" ");
      pathData = `<polygon points="${pts}" stroke="${color}" stroke-width="${thickness}" fill="none"/>`;
    }

    symbols += `  <symbol id="icon-${idx}" viewBox="0 0 ${canvas.width} ${canvas.height}">\n    ${pathData}\n  </symbol>\n`;
  });

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n${symbols}</svg>`;
  folder.file("sprite.svg", sprite);

  let css = `.icon {\n    width: 24px;\n    height: 24px;\n    display: inline-block;\n    background-color: currentColor;\n    mask-repeat: no-repeat;\n    mask-position: center;\n    mask-size: contain;\n}\n\n`;
  state.paths.forEach((_, idx) => { css += `.icon-${idx} { mask-image: url('sprite.svg#icon-${idx}'); }\n`; });
  folder.file("sprite.css", css);

  const example = `<!DOCTYPE html>\n<html>\n<head>\n    <link rel="stylesheet" href="sprite.css">\n    <style>\n        .demo { display: flex; gap: 20px; padding: 20px; }\n        .icon-demo { width: 48px; height: 48px; background-color: #3b82f6; }\n    </style>\n</head>\n<body>\n    <div class="demo">\n        ${state.paths.map((_, idx) => `<div class="icon icon-${idx} icon-demo"></div>`).join("\n        ")}\n    </div>\n</body>\n</html>`;
  folder.file("example.html", example);

  const readme = `# SVG Sprite Pack\n\n## Файлы\n- sprite.svg - основной SVG спрайт\n- sprite.css - CSS классы для использования\n- example.html - пример использования\n\n## Использование\n1. Подключите sprite.css\n2. Используйте классы .icon и .icon-{N}\n\n\`\`\`html\n<div class="icon icon-0"></div>\n\`\`\`\n`;
  folder.file("README.txt", readme);

  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, "sprite-pack.zip");
  alert('✅ SVG спрайт сохранён в папку "sprite-pack" внутри ZIP архива');
}