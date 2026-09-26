const mapWorld = document.getElementById('map-world');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');
const mapMessage = document.getElementById('map-message');
const zoomValue = document.getElementById('zoom-value');
const navButtons = document.querySelectorAll('.nav-button');
const fileName = document.getElementById('file-name');

const SVG_URL = './2.2 Mapa conceptual.drawio.svg';
const MAP_WIDTH = 4135;
const MAP_HEIGHT = 3508;

const viewPresets = {
  fit: { label: 'Vista general', target: { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT } },
  actual: { label: '100%', target: { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT } },
  section1: { label: 'Antenas WiFi', target: { x: 300, y: 300, w: 1800, h: 1200 } },
  section2: { label: 'Satelital', target: { x: 1800, y: 220, w: 1700, h: 1300 } },
  section3: { label: 'Aplicaciones', target: { x: 450, y: 1600, w: 2100, h: 1200 } },
  section4: { label: 'Fenómenos', target: { x: 1850, y: 1950, w: 1700, h: 1100 } },
};

const state = {
  x: 0,
  y: 0,
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  active: 'fit',
};

let svgRoot = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateMessage(label) {
  mapMessage.textContent = label;
  const title = label === 'Vista general' ? 'Mapa original' : label;
  fileName.textContent = title;
}

function updateZoomText() {
  const ratio = MAP_WIDTH / state.width;
  const percent = Math.round(ratio * 100);
  zoomValue.textContent = `${percent}%`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 1300);
}

function applyViewBox() {
  if (!svgRoot) return;

  svgRoot.setAttribute('viewBox', `${state.x} ${state.y} ${state.width} ${state.height}`);
  updateZoomText();
}

function setView(key) {
  const preset = viewPresets[key];
  if (!preset) return;

  state.active = key;
  state.x = preset.target.x;
  state.y = preset.target.y;
  state.width = preset.target.w;
  state.height = preset.target.h;

  navButtons.forEach((button) => {
    const buttonMatches = key === 'fit'
      ? button.dataset.action === 'fit'
      : Number(button.dataset.section) === Number(key.replace('section', ''));

    button.classList.toggle('is-active', Boolean(buttonMatches));
  });

  updateMessage(preset.label);
  applyViewBox();
}

function setupZoomControls() {
  document.querySelector('[data-action="fit"]').addEventListener('click', () => {
    setView('fit');
    showToast('Vista general');
  });

  document.querySelectorAll('[data-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionKey = `section${button.dataset.section}`;
      setView(sectionKey);
      showToast(button.textContent.trim());
    });
  });

  document.querySelector('[data-action="zoom-in"]').addEventListener('click', () => {
    const factor = 1.18;
    const centerX = state.x + state.width / 2;
    const centerY = state.y + state.height / 2;
    const newWidth = clamp(state.width / factor, 700, MAP_WIDTH);
    const newHeight = clamp(state.height / factor, 600, MAP_HEIGHT);
    state.width = newWidth;
    state.height = newHeight;
    state.x = centerX - newWidth / 2;
    state.y = centerY - newHeight / 2;
    state.x = clamp(state.x, 0, MAP_WIDTH - newWidth);
    state.y = clamp(state.y, 0, MAP_HEIGHT - newHeight);
    applyViewBox();
  });

  document.querySelector('[data-action="zoom-out"]').addEventListener('click', () => {
    const factor = 1.18;
    const centerX = state.x + state.width / 2;
    const centerY = state.y + state.height / 2;
    const newWidth = clamp(state.width * factor, 700, MAP_WIDTH);
    const newHeight = clamp(state.height * factor, 600, MAP_HEIGHT);
    state.width = newWidth;
    state.height = newHeight;
    state.x = centerX - newWidth / 2;
    state.y = centerY - newHeight / 2;
    state.x = clamp(state.x, 0, MAP_WIDTH - newWidth);
    state.y = clamp(state.y, 0, MAP_HEIGHT - newHeight);
    applyViewBox();
  });

  document.querySelector('[data-action="actual-size"]').addEventListener('click', () => {
    setView('actual');
    showToast('100%');
  });
}

function attachPointerDrag() {
  if (!svgRoot) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  mapWorld.addEventListener('pointerdown', (event) => {
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    originX = state.x;
    originY = state.y;
    mapWorld.setPointerCapture(event.pointerId);
  });

  mapWorld.addEventListener('pointermove', (event) => {
    if (!isDragging) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const scaleX = state.width / (mapWorld.clientWidth || 1);
    const scaleY = state.height / (mapWorld.clientHeight || 1);

    state.x = clamp(originX - dx * scaleX, 0, MAP_WIDTH - state.width);
    state.y = clamp(originY - dy * scaleY, 0, MAP_HEIGHT - state.height);
    applyViewBox();
  });

  mapWorld.addEventListener('pointerup', () => {
    isDragging = false;
  });

  mapWorld.addEventListener('pointerleave', () => {
    isDragging = false;
  });
}

async function loadMap() {
  try {
    const response = await fetch(SVG_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`No se pudo cargar el SVG (${response.status})`);
    }

    const svgText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
      throw new Error('No se encontró un elemento <svg> válido en el archivo.');
    }

    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Mapa conceptual interactivo');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    svg.style.opacity = '0';

    mapWorld.innerHTML = '';
    mapWorld.appendChild(svg);
    svgRoot = svg;

    requestAnimationFrame(() => {
      svg.style.opacity = '1';
      setView('fit');
      loading.classList.add('is-hidden');
    });
  } catch (error) {
    console.error(error);
    loading.textContent = 'No se pudo cargar el SVG';
    showToast('Error al cargar el mapa');
  }
}

setupZoomControls();
attachPointerDrag();
loadMap();
updateZoomText();
