// ========== DOM-ССЫЛКИ ==========
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const toolbar = document.getElementById("toolbar");
const color = document.getElementById("color");
const thickness = document.getElementById("thickness");
const thickVal = document.getElementById("thickVal");
const snap = document.getElementById("snap");
const gridSize = document.getElementById("gridSize");
const gridBtn = document.getElementById("gridBtn");
const colorPreview = document.getElementById("colorPreview");

// ========== ПЕРЕКЛЮЧЕНИЕ РЕЖИМА ИКОНКИ ==========
function setIconMode(mode) {
  const preset = iconPresets[mode];
  if (!preset) return;

  // Сетка не привязана к режиму иконки — пользователь выбирает её сам

  if (thickness) {
    // Ползунок работает в реальных пикселях целевого размера
    thickness.min = preset.realMin;
    thickness.max = preset.realMax;
    thickness.step = 1;

    // Пересчитываем текущую толщину под новый режим
    const currentReal = canvasToReal(state.thickness, preset.targetSize);
    let newReal = Math.round(currentReal);

    // Если реальная толщина оказалась 0 — ставим 1 (минимальная видимая линия)
    if (newReal === 0) newReal = 1;

    if (newReal > preset.realMax) newReal = preset.realMax;

    const newCanvas = realToCanvas(newReal, preset.targetSize);
    state.thickness = newCanvas;
    thickness.value = newReal;
    if (thickVal) thickVal.textContent = newReal;
  }

  state.snap = true;
  if (snap) snap.checked = true;
  if (gridBtn) gridBtn.classList.add("active");

  draw();
}

// ========== ОБНОВЛЕНИЕ UI ИЗ СОСТОЯНИЯ ==========
function updateUI() {
  // Показываем толщину в реальных пикселях
  const iconMode = document.getElementById("iconMode");
  const preset = iconMode && iconMode.value ? iconPresets[iconMode.value] : null;
  const targetSize = preset ? preset.targetSize : 512;
  thickVal.textContent = Math.round(canvasToReal(state.thickness, targetSize));

  gridBtn.classList.toggle("active", state.snap);
  if (colorPreview) colorPreview.style.background = state.color;
}

function updatePanelFromSelected() {
  if (state.selectedPathIdx !== -1 && state.paths[state.selectedPathIdx]) {
    const selectedPath = state.paths[state.selectedPathIdx];
    const pathThickness = selectedPath.thickness !== undefined ? selectedPath.thickness : state.thickness;
    const pathColor = selectedPath.color || state.color;

    // Пересчитываем канвас-пиксели в реальные для отображения
    const iconMode = document.getElementById("iconMode");
    const preset = iconMode && iconMode.value ? iconPresets[iconMode.value] : null;
    const targetSize = preset ? preset.targetSize : 512;
    const realPx = Math.round(canvasToReal(pathThickness, targetSize));

    thickness.value = realPx;
    thickVal.textContent = realPx;
    state.thickness = pathThickness;

    color.value = pathColor;
    if (colorPreview) colorPreview.style.background = pathColor;
    state.color = pathColor;

    if (fillType) {
      state.fillType = selectedPath.fillType || "none";
      fillType.value = state.fillType;
      updateFillUI();
    }

    if (fillColor) {
      state.fillColor = selectedPath.fillColor || "#3b82f6";
      fillColor.value = state.fillColor;
      if (fillColorPreview) fillColorPreview.style.background = state.fillColor;
    }

    if (fillGradientColor1 && selectedPath.fillGradient) {
      state.fillGradient = JSON.parse(JSON.stringify(selectedPath.fillGradient));
      fillGradientColor1.value = state.fillGradient.color1;
      fillGradientColor2.value = state.fillGradient.color2;
      fillGradientType.value = state.fillGradient.type;
      fillGradientAngle.value = state.fillGradient.angle;
      if (fillAngleVal) fillAngleVal.textContent = `${state.fillGradient.angle}°`;
    }

    draw();
  }
}

function updateBackgroundUI() {
  if (bgType) bgType.value = state.background.type;
  if (bgColor) bgColor.value = state.background.solidColor;
  if (bgColorPreview) bgColorPreview.style.background = state.background.solidColor;
  if (gradientColor1) gradientColor1.value = state.background.gradient.color1;
  if (gradientColor1Preview) gradientColor1Preview.style.background = state.background.gradient.color1;
  if (gradientColor2) gradientColor2.value = state.background.gradient.color2;
  if (gradientColor2Preview) gradientColor2Preview.style.background = state.background.gradient.color2;
  if (gradientType) gradientType.value = state.background.gradient.type;
  if (gradientAngle) gradientAngle.value = state.background.gradient.angle;
  if (angleVal) angleVal.textContent = `${state.background.gradient.angle}°`;

  if (solidBgControl) solidBgControl.style.display = state.background.type === "solid" ? "flex" : "none";
  if (gradientBgControl) gradientBgControl.style.display = state.background.type === "gradient" ? "block" : "none";
}

function updateFillUI() {
  solidFillControl.style.display = state.fillType === "solid" ? "flex" : "none";
  gradientFillControl.style.display = state.fillType === "gradient" ? "block" : "none";
}

function updateGridUI() {
  if (state.gridMode === "square") {
    if (squareSizeRow) squareSizeRow.style.display = "flex";
    if (triSizeRow) triSizeRow.style.display = "none";
  } else if (state.gridMode === "triangular") {
    if (squareSizeRow) squareSizeRow.style.display = "none";
    if (triSizeRow) triSizeRow.style.display = "flex";
  } else if (state.gridMode === "isometric") {
    if (squareSizeRow) squareSizeRow.style.display = "none";
    if (triSizeRow) triSizeRow.style.display = "flex";
  }
}

// ========== КЛАВИАТУРА ==========
const toolHotkeys = {
  v: "select", V: "select",
  r: "rectangle", R: "rectangle",
  c: "circle", C: "circle",
  l: "line", L: "line",
  b: "curve", B: "curve",
  e: "erase", E: "erase",
};

function onKeyDown(e) {
  // Горячие клавиши переключения инструментов
  const tool = toolHotkeys[e.key];
  if (tool && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    state.tool = tool;
    state.selectedPathIdx = -1;
    state.showHandles = tool === "curve";
    document.querySelectorAll("[data-tool]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tool === tool);
    });
    draw();
    return;
  }

  if (e.key === "g" || e.key === "G") {
    state.snap = !state.snap;
    snap.checked = state.snap;
    gridBtn.classList.toggle("active", state.snap);
    draw();
  } else if (e.key === "Delete" && state.selectedPathIdx !== -1) {
    state.paths.splice(state.selectedPathIdx, 1);
    state.selectedPathIdx = -1;
    state.showHandles = false;
    saveState();
    draw();
  } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
    updateBackgroundUI();
    draw();
  } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
    e.preventDefault();
    redo();
    updateBackgroundUI();
    draw();
  }
}

// ========== ОЧИСТКА ==========
function clearCanvas() {
  state.paths = [];
  state.background = { type: "none", solidColor: "#ffffff", gradient: { type: "linear", color1: "#3b82f6", color2: "#8b5cf6", angle: 90 } };
  state.selectedPathIdx = -1;
  state.showHandles = false;
  state.isDrawing = false;
  state.isDragging = false;
  updateBackgroundUI();
  saveState();
  draw();
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function init() {
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseup", onMouseUp);
  document.addEventListener("keydown", onKeyDown);

  // Синхронизируем ползунок с выбранным режимом иконки при загрузке
  const iconModeSelect = document.getElementById("iconMode");
  if (iconModeSelect && iconModeSelect.value) {
    setIconMode(iconModeSelect.value);
  } else {
    updateUI();
  }

  draw();
  initHistory();
}

// ========== НАЗНАЧЕНИЕ ОБРАБОТЧИКОВ UI ==========
document.querySelectorAll("[data-tool]").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll("[data-tool]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.tool = btn.dataset.tool;
    state.selectedPathIdx = -1;
    state.showHandles = state.tool === "curve";
    draw();
  };
});

if (color) {
  color.onchange = (e) => {
    const newColor = e.target.value;
    state.color = newColor;
    if (colorPreview) colorPreview.style.background = newColor;
    if (state.selectedPathIdx !== -1 && state.paths[state.selectedPathIdx]) {
      state.paths[state.selectedPathIdx].color = newColor;
      saveState();
    }
    draw();
  };
}

if (thickness) {
  thickness.oninput = (e) => {
    const realPx = +e.target.value;
    thickVal.textContent = realPx;

    // Определяем текущий режим иконки для пересчёта
    const iconMode = document.getElementById("iconMode");
    const preset = iconMode && iconMode.value ? iconPresets[iconMode.value] : null;
    const targetSize = preset ? preset.targetSize : 512;

    const canvasPx = realToCanvas(realPx, targetSize);
    state.thickness = canvasPx;

    if (state.selectedPathIdx !== -1 && state.paths[state.selectedPathIdx]) {
      state.paths[state.selectedPathIdx].thickness = canvasPx;
      saveState();
    }
    draw();
  };
}

if (snap) {
  snap.onchange = (e) => {
    state.snap = e.target.checked;
    gridBtn.classList.toggle("active", state.snap);
    draw();
  };
}

if (gridSize) {
  gridSize.onchange = (e) => {
    state.gridSize = +e.target.value;
    draw();
  };
}

if (gridBtn) {
  gridBtn.onclick = () => {
    state.snap = !state.snap;
    if (snap) snap.checked = state.snap;
    gridBtn.classList.toggle("active", state.snap);
    draw();
  };
}

if (colorPreview) {
  colorPreview.onclick = () => { if (color) color.click(); };
}

// ========== ЗАЛИВКА ==========
const fillType = document.getElementById("fillType");
const solidFillControl = document.getElementById("solidFillControl");
const gradientFillControl = document.getElementById("gradientFillControl");
const fillColor = document.getElementById("fillColor");
const fillColorPreview = document.getElementById("fillColorPreview");
const fillGradientColor1 = document.getElementById("fillGradientColor1");
const fillGradientColor1Preview = document.getElementById("fillGradientColor1Preview");
const fillGradientColor2 = document.getElementById("fillGradientColor2");
const fillGradientColor2Preview = document.getElementById("fillGradientColor2Preview");
const fillGradientType = document.getElementById("fillGradientType");
const fillGradientAngle = document.getElementById("fillGradientAngle");
const fillAngleVal = document.getElementById("fillAngleVal");

if (fillType) {
  fillType.onchange = (e) => {
    state.fillType = e.target.value;
    updateFillUI();
    if (state.selectedPathIdx !== -1 && state.paths[state.selectedPathIdx]) {
      state.paths[state.selectedPathIdx].fillType = state.fillType;
      state.paths[state.selectedPathIdx].fillColor = state.fillColor;
      state.paths[state.selectedPathIdx].fillGradient = JSON.parse(JSON.stringify(state.fillGradient));
      saveState();
    }
    draw();
  };
}

if (fillColor) {
  fillColor.onchange = (e) => {
    state.fillColor = e.target.value;
    if (fillColorPreview) fillColorPreview.style.background = e.target.value;
    if (state.selectedPathIdx !== -1 && state.paths[state.selectedPathIdx]) {
      state.paths[state.selectedPathIdx].fillColor = state.fillColor;
      saveState();
    }
    draw();
  };
}

if (fillColorPreview) fillColorPreview.onclick = () => fillColor.click();

if (fillGradientColor1 && fillGradientColor1Preview) {
  fillGradientColor1.onchange = (e) => {
    state.fillGradient.color1 = e.target.value;
    fillGradientColor1Preview.style.background = e.target.value;
    if (state.selectedPathIdx !== -1 && state.paths[state.selectedPathIdx]) {
      state.paths[state.selectedPathIdx].fillGradient.color1 = state.fillGradient.color1;
      saveState();
    }
    draw();
  };
  fillGradientColor1Preview.onclick = () => fillGradientColor1.click();
}

if (fillGradientColor2 && fillGradientColor2Preview) {
  fillGradientColor2.onchange = (e) => {
    state.fillGradient.color2 = e.target.value;
    fillGradientColor2Preview.style.background = e.target.value;
    if (state.selectedPathIdx !== -1 && state.paths[state.selectedPathIdx]) {
      state.paths[state.selectedPathIdx].fillGradient.color2 = state.fillGradient.color2;
      saveState();
    }
    draw();
  };
  fillGradientColor2Preview.onclick = () => fillGradientColor2.click();
}

if (fillGradientType) {
  fillGradientType.onchange = (e) => {
    state.fillGradient.type = e.target.value;
    if (state.selectedPathIdx !== -1 && state.paths[state.selectedPathIdx]) {
      state.paths[state.selectedPathIdx].fillGradient.type = state.fillGradient.type;
      saveState();
    }
    draw();
  };
}

if (fillGradientAngle) {
  fillGradientAngle.oninput = (e) => {
    const angle = +e.target.value;
    state.fillGradient.angle = angle;
    if (fillAngleVal) fillAngleVal.textContent = `${angle}°`;
    if (state.selectedPathIdx !== -1 && state.paths[state.selectedPathIdx]) {
      state.paths[state.selectedPathIdx].fillGradient.angle = state.fillGradient.angle;
      saveState();
    }
    draw();
  };
}

updateFillUI();

// ========== КНОПКИ ДЕЙСТВИЙ ==========
const undoBtn = document.getElementById("undoBtn");
const clearBtn = document.getElementById("clearBtn");
const exportSVGBtn = document.getElementById("exportSVGBtn");
const exportPNGBtn = document.getElementById("exportPNGBtn");

if (undoBtn) undoBtn.onclick = () => { undo(); updateBackgroundUI(); draw(); };
if (clearBtn) clearBtn.onclick = clearCanvas;
if (exportSVGBtn) exportSVGBtn.onclick = exportSVG;
if (exportPNGBtn) exportPNGBtn.onclick = exportPNG;

// ========== ФОН ==========
const bgType = document.getElementById("bgType");
const solidBgControl = document.getElementById("solidBgControl");
const gradientBgControl = document.getElementById("gradientBgControl");
const bgColor = document.getElementById("bgColor");
const bgColorPreview = document.getElementById("bgColorPreview");
const gradientColor1 = document.getElementById("gradientColor1");
const gradientColor1Preview = document.getElementById("gradientColor1Preview");
const gradientColor2 = document.getElementById("gradientColor2");
const gradientColor2Preview = document.getElementById("gradientColor2Preview");
const gradientType = document.getElementById("gradientType");
const gradientAngle = document.getElementById("gradientAngle");
const angleVal = document.getElementById("angleVal");

if (bgType) {
  bgType.onchange = (e) => {
    state.background.type = e.target.value;
    solidBgControl.style.display = state.background.type === "solid" ? "flex" : "none";
    gradientBgControl.style.display = state.background.type === "gradient" ? "block" : "none";
    draw();
    saveState();
  };
}

if (bgColor) {
  bgColor.onchange = (e) => {
    state.background.solidColor = e.target.value;
    if (bgColorPreview) bgColorPreview.style.background = e.target.value;
    draw();
    saveState();
  };
}

if (bgColorPreview) bgColorPreview.onclick = () => bgColor.click();

if (gradientColor1 && gradientColor1Preview) {
  gradientColor1.onchange = (e) => {
    state.background.gradient.color1 = e.target.value;
    gradientColor1Preview.style.background = e.target.value;
    draw();
    saveState();
  };
  gradientColor1Preview.onclick = () => gradientColor1.click();
}

if (gradientColor2 && gradientColor2Preview) {
  gradientColor2.onchange = (e) => {
    state.background.gradient.color2 = e.target.value;
    gradientColor2Preview.style.background = e.target.value;
    draw();
    saveState();
  };
  gradientColor2Preview.onclick = () => gradientColor2.click();
}

if (gradientType) {
  gradientType.onchange = (e) => {
    state.background.gradient.type = e.target.value;
    draw();
    saveState();
  };
}

if (gradientAngle) {
  gradientAngle.oninput = (e) => {
    const angle = +e.target.value;
    state.background.gradient.angle = angle;
    if (angleVal) angleVal.textContent = `${angle}°`;
    draw();
    saveState();
  };
}

// ========== ПРАВАЯ ПАНЕЛЬ ==========
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabId = btn.dataset.tab;
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    tabContents.forEach((content) => content.classList.remove("active"));
    document.getElementById(`tab-${tabId}`).classList.add("active");
  });
});

const rightPanel = document.getElementById("rightPanel");
const panelToggle = document.getElementById("panelToggle");

if (panelToggle && rightPanel) {
  panelToggle.onclick = () => { rightPanel.classList.toggle("collapsed"); };
}

// ========== ИМПОРТ SVG ==========
const importSVGBtn = document.getElementById("importSVGBtn");
const svgFileInput = document.getElementById("svgFileInput");

if (importSVGBtn && svgFileInput) {
  importSVGBtn.onclick = () => { svgFileInput.click(); };
  svgFileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const newPaths = parseSVGToPaths(event.target.result);
      if (newPaths.length > 0) {
        state.paths.push(...newPaths);
        state.selectedPathIdx = state.paths.length - 1;
        saveState();
        draw();
        alert(`✅ Импортировано ${newPaths.length} фигур`);
      } else {
        alert("❌ Не удалось импортировать SVG. Проверьте формат файла.");
      }
      svgFileInput.value = "";
    };
    reader.readAsText(file);
  };
}

// ========== ВЕБ-ЭКСПОРТ ==========
const exportFaviconBtn = document.getElementById("exportFaviconBtn");
const exportSpriteBtn = document.getElementById("exportSpriteBtn");
const exportAllSizesBtn = document.getElementById("exportAllSizesBtn");

if (exportAllSizesBtn) exportAllSizesBtn.onclick = exportAllWebSizes;
if (exportFaviconBtn) exportFaviconBtn.onclick = exportFaviconPack;
if (exportSpriteBtn) exportSpriteBtn.onclick = exportSprite;

// ========== СЕТКА ==========
const gridModeSelect = document.getElementById("gridMode");
const squareSizeRow = document.getElementById("squareSizeRow");
const triSizeRow = document.getElementById("triSizeRow");
const triGridSizeInput = document.getElementById("triGridSize");
const triSizeVal = document.getElementById("triSizeVal");
const isoAngleRow = document.getElementById("isoAngleRow");
const isoAngleInput = document.getElementById("isoAngle");
const isoAngleVal = document.getElementById("isoAngleVal");

if (isoAngleInput) {
  isoAngleInput.oninput = (e) => {
    state.isoAngle = +e.target.value;
    if (isoAngleVal) isoAngleVal.textContent = `${state.isoAngle}°`;
    draw();
  };
}

if (gridModeSelect) {
  gridModeSelect.onchange = (e) => {
    state.gridMode = e.target.value;
    updateGridUI();
    draw();
  };
}

if (triGridSizeInput) {
  triGridSizeInput.oninput = (e) => {
    state.triGridSize = +e.target.value;
    if (triSizeVal) triSizeVal.textContent = state.triGridSize;
    draw();
  };
}

updateGridUI();

// ========== ПЕРЕКЛЮЧЕНИЕ РЕЖИМА ИКОНКИ ==========
const iconModeSelect = document.getElementById("iconMode");
if (iconModeSelect) {
  iconModeSelect.onchange = () => setIconMode(iconModeSelect.value);
}

// ========== МЕНЮ ПРИЛОЖЕНИЯ ==========
// Иконки для пунктов меню (SVG-строки)
var MENU_ICON_NEW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
var MENU_ICON_SAVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
var MENU_ICON_THEME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
var MENU_ICON_ABOUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';

// Структура пунктов меню. Легко добавлять новые:
// { id, label, icon, divider (опционально), action }
const appMenuItems = [
  { id: "new", label: "Создать", icon: MENU_ICON_NEW, action: function() { if (confirm("Очистить канвас?")) clearCanvas(); } },
  { id: "save", label: "Сохранить", icon: MENU_ICON_SAVE, action: function() { exportSVG(); } },
  { divider: true },
  { id: "theme", label: "Тема", icon: MENU_ICON_THEME, action: function() { document.body.style.background = document.body.style.background === "#0f172a" ? "#f1f5f9" : "#0f172a"; } },
  { divider: true },
  { id: "about", label: "О приложении", icon: MENU_ICON_ABOUT, action: function() { alert("ICONS CREATOR \u2014 векторный редактор иконок\nВерсия 2.0\nCanvas 2D \u2022 SVG/PNG экспорт"); } },
];

function initAppMenu() {
  const btn = document.getElementById("appMenuBtn");
  const dropdown = document.getElementById("appMenuDropdown");
  if (!btn || !dropdown) return;

  // Строим пункты меню из данных
  appMenuItems.forEach((item) => {
    if (item.divider) {
      const divider = document.createElement("div");
      divider.className = "app-menu-divider";
      dropdown.appendChild(divider);
      return;
    }
    const el = document.createElement("button");
    el.className = "app-menu-item";
    el.innerHTML = item.icon + `<span>${item.label}</span>`;
    el.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.remove("open");
      item.action();
    };
    dropdown.appendChild(el);
  });

  // Открытие/закрытие по кнопке
  btn.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  };

  // Закрытие по клику вне меню
  document.addEventListener("click", () => {
    dropdown.classList.remove("open");
  });
}

initAppMenu();

// ========== ЗАПУСК ==========
init();
console.log("Векторный редактор инициализирован");