const mapWorld = document.getElementById('map-world');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');
const mapMessage = document.getElementById('map-message');
const zoomValue = document.getElementById('zoom-value');
const navButtons = document.querySelectorAll('.nav-button');
const fileName = document.getElementById('file-name');

const SVG_URL = './2.2 Mapa conceptual.drawio.svg';

const viewPresets = {
  fit: { label: 'Vista general', scale: 0.42, center: { x: 2067, y: 1754 } },
  actual: { label: '100%', scale: 1, center: { x: 2067, y: 1754 } },
  section1: { label: 'Antenas WiFi', scale: 1.8, center: { x: 1180, y: 1020 } },
  section2: { label: 'Satelital', scale: 1.75, center: { x: 2720, y: 980 } },
  section3: { label: 'Aplicaciones', scale: 1.55, center: { x: 1650, y: 2200 } },
  section4: { label: 'Fenómenos', scale: 1.65, center: { x: 2760, y: 2750 } },
};

const state = {
  scale: viewPresets.fit.scale,
  x: 0,
  y: 0,
  center: { ...viewPresets.fit.center },
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
  const percent = Math.round(state.scale * 100);
  zoomValue.textContent = `${percent}%`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 1300);
}

function applyTransform() {
  if (!svgRoot) return;

  const width = mapWorld.clientWidth || 1200;
  const height = mapWorld.clientHeight || 700;
  state.x = (width / 2) - (state.center.x * state.scale);
  state.y = (height / 2) - (state.center.y * state.scale);

  svgRoot.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  updateZoomText();
}

function setView(key) {
  const preset = viewPresets[key];
  if (!preset) return;

  state.active = key;
  state.scale = preset.scale;
  state.center = { ...preset.center };

  navButtons.forEach((button) => {
    const buttonMatches = key === 'fit'
      ? button.dataset.action === 'fit'
      : Number(button.dataset.section) === Number(key.replace('section', ''));

    button.classList.toggle('is-active', Boolean(buttonMatches));
  });

  updateMessage(preset.label);
  applyTransform();
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
    state.scale = clamp(state.scale + 0.12, 0.4, 3.4);
    applyTransform();
  });

  document.querySelector('[data-action="zoom-out"]').addEventListener('click', () => {
    state.scale = clamp(state.scale - 0.12, 0.4, 3.4);
    applyTransform();
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
    state.x = originX + dx;
    state.y = originY + dy;
    state.center.x = (mapWorld.clientWidth / 2 - state.x) / state.scale;
    state.center.y = (mapWorld.clientHeight / 2 - state.y) / state.scale;
    applyTransform();
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
