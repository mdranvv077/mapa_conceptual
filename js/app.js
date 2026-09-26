const mapWorld = document.getElementById('map-world');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');
const mapMessage = document.getElementById('map-message');
const zoomValue = document.getElementById('zoom-value');
const navButtons = document.querySelectorAll('.nav-button');
const fileName = document.getElementById('file-name');

const SVG_URLS = [
  './assets/mapa-conceptual.svg',
  './2.2%20Mapa%20conceptual.drawio.svg',
];
const MAP_WIDTH = 4135;
const MAP_HEIGHT = 3508;

const viewPresets = {
  fit: { label: 'Vista general', target: { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT } },
  actual: { label: '100%', target: { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT } },
  section1: { label: 'Antenas WiFi', target: { x: 5, y: 200, w: 1440, h: 900 } },
  section2: { label: 'Satelital', target: { x: 2380, y: 210, w: 1400, h: 1140 } },
  section3: { label: 'Aplicaciones', target: { x: 40, y: 1440, w: 1370, h: 860 } },
  section4: { label: 'Fenómenos', target: { x: 2200, y: 1480, w: 1800, h: 1050 } },
};

const state = {
  x: 0,
  y: 0,
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  active: 'fit',
};

let svgRoot = null;
let cameraAnimationFrame = null;

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

function stopCameraAnimation() {
  if (cameraAnimationFrame !== null) {
    cancelAnimationFrame(cameraAnimationFrame);
    cameraAnimationFrame = null;
  }
}

function animateCamera(target, duration = 950) {
  stopCameraAnimation();

  const start = { x: state.x, y: state.y, width: state.width, height: state.height };
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    Object.assign(state, target);
    applyViewBox();
    return;
  }

  const startedAt = performance.now();
  const animate = (now) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = progress * progress * (3 - 2 * progress);

    state.x = start.x + (target.x - start.x) * eased;
    state.y = start.y + (target.y - start.y) * eased;
    state.width = start.width + (target.width - start.width) * eased;
    state.height = start.height + (target.height - start.height) * eased;
    applyViewBox();

    if (progress < 1) {
      cameraAnimationFrame = requestAnimationFrame(animate);
    } else {
      cameraAnimationFrame = null;
      Object.assign(state, target);
      applyViewBox();
    }
  };

  cameraAnimationFrame = requestAnimationFrame(animate);
}

function setView(key) {
  const preset = viewPresets[key];
  if (!preset) return;

  if (!svgRoot) {
    return;
  }

  state.active = key;
  const target = {
    x: clamp(preset.target.x, 0, MAP_WIDTH - preset.target.w),
    y: clamp(preset.target.y, 0, MAP_HEIGHT - preset.target.h),
    width: preset.target.w,
    height: preset.target.h,
  };

  navButtons.forEach((button) => {
    const buttonMatches = key === 'fit'
      ? button.dataset.action === 'fit'
      : Number(button.dataset.section) === Number(key.replace('section', ''));

    button.classList.toggle('is-active', Boolean(buttonMatches));
    if (button.matches('[data-section]')) {
      button.setAttribute('aria-pressed', String(Boolean(buttonMatches)));
    }
  });

  updateMessage(preset.label);
  animateCamera(target);
}

function zoomAt(
  factor,
  anchorX = state.x + state.width / 2,
  anchorY = state.y + state.height / 2,
  duration = 360,
  anchorRatioX = 0.5,
  anchorRatioY = 0.5,
) {
  const nextWidth = clamp(state.width * factor, 700, MAP_WIDTH);
  const nextHeight = clamp(state.height * factor, 600, MAP_HEIGHT);
  const nextX = clamp(anchorX - nextWidth * anchorRatioX, 0, MAP_WIDTH - nextWidth);
  const nextY = clamp(anchorY - nextHeight * anchorRatioY, 0, MAP_HEIGHT - nextHeight);

  animateCamera({ x: nextX, y: nextY, width: nextWidth, height: nextHeight }, duration);
}

function runTour() {
  const steps = ['section1', 'section2', 'section3', 'section4'];
  let index = 0;
  const progress = document.getElementById('tour-progress');
  const fill = progress?.querySelector('i');

  if (!progress || !fill) {
    setView('section1');
    return;
  }

  const tick = () => {
    if (index >= steps.length) {
      progress.style.opacity = '0';
      setView('fit');
      return;
    }

    const step = steps[index];
    setView(step);
    const value = ((index + 1) / steps.length) * 100;
    fill.style.width = `${value}%`;
    progress.style.opacity = '1';

    index += 1;
    setTimeout(tick, 1400);
  };

  tick();
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
    zoomAt(1 / 1.18);
  });

  document.querySelector('[data-action="zoom-out"]').addEventListener('click', () => {
    zoomAt(1.18);
  });

  document.querySelector('[data-action="actual-size"]').addEventListener('click', () => {
    setView('actual');
    showToast('100%');
  });

  document.querySelector('[data-action="tour"]').addEventListener('click', () => {
    runTour();
  });
}

function attachWheelZoom() {
  mapWorld.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? event.deltaY * 40
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? event.deltaY * mapWorld.clientHeight
        : event.deltaY;
    const factor = Math.exp(delta * 0.0018);
    const cursor = svgRoot.createSVGPoint();
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    const mapPoint = cursor.matrixTransform(svgRoot.getScreenCTM().inverse());
    const anchorRatioX = clamp((mapPoint.x - state.x) / state.width, 0, 1);
    const anchorRatioY = clamp((mapPoint.y - state.y) / state.height, 0, 1);

    zoomAt(factor, mapPoint.x, mapPoint.y, 130, anchorRatioX, anchorRatioY);
  }, { passive: false });
}

function attachPointerDrag() {
  if (!svgRoot) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  mapWorld.addEventListener('pointerdown', (event) => {
    stopCameraAnimation();
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
    let response;
    let lastError = null;

    for (const url of SVG_URLS) {
      try {
        response = await fetch(url, { cache: 'no-store' });
        if (response.ok) break;
        lastError = new Error(`No se pudo cargar el SVG (${response.status}) en ${url}`);
      } catch (error) {
        lastError = error;
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('No se pudo cargar el SVG.');
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
attachWheelZoom();
loadMap();
updateZoomText();
