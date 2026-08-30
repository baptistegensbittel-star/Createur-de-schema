// Créateur de schéma électrique — logique de l'application
//
// Chaque composant affiche l'image réelle fournie (assets/images/*.png).
// `terminals` donne, pour chaque borne, sa position en fraction (0 à 1) de
// la largeur/hauteur de l'image — c'est là que les fils s'accrochent et que
// le petit rond cliquable apparaît. Une fraction peut dépasser [0, 1] pour
// placer une borne juste à côté de l'image (ex: sous une ampoule qui n'a
// pas de patte dessinée) ; `stubFrom` dessine alors un petit trait entre le
// bord de l'image et la borne pour que ça reste lisible.

const COMPONENT_TYPES = {
  pile: {
    label: 'Pile',
    imageSrc: 'assets/images/pile.png',
    width: 59, height: 90,
    terminals: [
      { x: 0.15, y: 0.08 },
      { x: 0.85, y: 0.08 },
    ],
  },
  lampe: {
    label: 'Lampe',
    imageSrc: 'assets/images/lampe.png',
    width: 42, height: 70,
    terminals: [
      { x: 0.35, y: 1.12, stubFrom: { x: 0.35, y: 1 } },
      { x: 0.65, y: 1.12, stubFrom: { x: 0.65, y: 1 } },
    ],
  },
  interrupteur: {
    label: 'Interrupteur (ouvert)',
    imageSrc: 'assets/images/interrupteur.png',
    width: 110, height: 53,
    terminals: [
      { x: 0.15, y: 0.97 },
      { x: 0.85, y: 0.97 },
    ],
  },
  interrupteurFerme: {
    label: 'Interrupteur (fermé)',
    imageSrc: 'assets/images/interrupteur-ferme.png',
    width: 100, height: 35,
    terminals: [
      { x: 0.08, y: 0.8 },
      { x: 0.92, y: 0.8 },
    ],
  },
  generateur: {
    label: 'Générateur',
    imageSrc: 'assets/images/generateur.png',
    width: 100, height: 66,
    terminals: [
      { x: 0.15, y: 0.82 },
      { x: 0.32, y: 0.9 },
    ],
  },
  moteur: {
    label: 'Moteur',
    imageSrc: 'assets/images/moteur.png',
    width: 100, height: 61,
    terminals: [
      { x: 0.16, y: 0.85 },
      { x: 0.5, y: 0.88 },
    ],
  },
  diode: {
    label: 'Diode',
    imageSrc: 'assets/images/diode.png',
    width: 90, height: 74,
    terminals: [
      { x: 0, y: 0.45 },
      { x: 1, y: 0.45 },
    ],
  },
  led: {
    label: 'Diode électroluminescente',
    imageSrc: 'assets/images/led.png',
    width: 20, height: 80,
    terminals: [
      { x: 0.2, y: 1 },
      { x: 0.57, y: 0.9 },
    ],
  },
  resistance: {
    label: 'Résistance',
    imageSrc: 'assets/images/resistance.png',
    width: 70, height: 32,
    terminals: [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
    ],
  },
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const STORAGE_KEY = 'circuit-schema-v1';

let components = []; // {id, type, x, y, rotation}
let wires = [];       // {id, from:{compId, term}, to:{compId, term}}
let nextId = 1;

let selection = null; // {kind:'component'|'wire', id}
let dragState = null; // pour déplacer un composant
let wireDraw = null;  // pour tracer un fil en cours

const svg = document.getElementById('canvas');
const componentsLayer = document.getElementById('components-layer');
const wiresLayer = document.getElementById('wires-layer');
const paletteEl = document.getElementById('palette');

init();

function init() {
  buildPalette();
  attachCanvasEvents();
  attachToolbar();
  render();
}

// ---------- Palette ----------

function buildPalette() {
  Object.entries(COMPONENT_TYPES).forEach(([type, def]) => {
    const item = document.createElement('div');
    item.className = 'palette-item';
    item.draggable = true;
    item.dataset.type = type;

    const iconSvg = document.createElementNS(SVG_NS, 'svg');
    iconSvg.setAttribute('width', '60');
    iconSvg.setAttribute('height', '48');
    iconSvg.setAttribute('viewBox', `0 0 ${def.width} ${def.height}`);
    const g = document.createElementNS(SVG_NS, 'g');
    renderComponentBody(g, type, def, false);
    iconSvg.appendChild(g);

    const span = document.createElement('span');
    span.textContent = def.label;

    item.appendChild(iconSvg);
    item.appendChild(span);
    paletteEl.appendChild(item);

    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', type);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
}

// ---------- Rendu des composants ----------

function renderComponentBody(g, type, def, withStubs) {
  const img = document.createElementNS(SVG_NS, 'image');
  img.setAttribute('class', 'comp-body');
  img.setAttribute('href', def.imageSrc);
  img.setAttribute('x', 0);
  img.setAttribute('y', 0);
  img.setAttribute('width', def.width);
  img.setAttribute('height', def.height);
  g.appendChild(img);

  if (withStubs) {
    def.terminals.forEach((t) => {
      if (!t.stubFrom) return;
      g.appendChild(makeLine(t.stubFrom.x * def.width, t.stubFrom.y * def.height, t.x * def.width, t.y * def.height));
    });
  }
}

function makeLine(x1, y1, x2, y2) {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.setAttribute('stroke', '#333');
  line.setAttribute('stroke-width', 2);
  return line;
}

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// ---------- Placement / rendu des composants sur le canevas ----------

function addComponent(type, x, y) {
  const def = COMPONENT_TYPES[type];
  components.push({
    id: nextId++,
    type,
    x: x - def.width / 2,
    y: y - def.height / 2,
    rotation: 0,
  });
  render();
}

function getTerminalPositions(comp) {
  const def = COMPONENT_TYPES[comp.type];
  const cx = comp.x + def.width / 2;
  const cy = comp.y + def.height / 2;
  const rad = (comp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);

  return def.terminals.map((t) => {
    const lx = t.x * def.width - def.width / 2;
    const ly = t.y * def.height - def.height / 2;
    return {
      x: cx + lx * cos - ly * sin,
      y: cy + lx * sin + ly * cos,
    };
  });
}

function render() {
  componentsLayer.innerHTML = '';
  wiresLayer.innerHTML = '';

  wires.forEach((wire) => {
    const path = svgEl('path', { class: 'wire', 'data-id': wire.id });
    path.classList.toggle('selected', selection && selection.kind === 'wire' && selection.id === wire.id);
    updateWirePath(path, wire);
    path.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      selection = { kind: 'wire', id: wire.id };
      render();
    });
    wiresLayer.appendChild(path);
  });

  components.forEach((comp) => {
    const def = COMPONENT_TYPES[comp.type];
    const g = svgEl('g', {
      class: 'component' + (selection && selection.kind === 'component' && selection.id === comp.id ? ' selected' : ''),
      transform: `translate(${comp.x}, ${comp.y}) rotate(${comp.rotation}, ${def.width / 2}, ${def.height / 2})`,
      'data-id': comp.id,
    });
    renderComponentBody(g, comp.type, def, true);

    def.terminals.forEach((t, i) => {
      const circle = svgEl('circle', {
        class: 'terminal', cx: t.x * def.width, cy: t.y * def.height, r: 5,
        'data-comp': comp.id, 'data-term': i,
      });
      circle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startWire(comp.id, i);
      });
      circle.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        finishWire(comp.id, i);
      });
      g.appendChild(circle);
    });

    g.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('terminal')) return;
      e.stopPropagation();
      selection = { kind: 'component', id: comp.id };
      const pt = clientToSvgPoint(e.clientX, e.clientY);
      dragState = { id: comp.id, offsetX: pt.x - comp.x, offsetY: pt.y - comp.y };
      g.classList.add('dragging');
      render();
    });

    componentsLayer.appendChild(g);
  });
}

function updateWirePath(path, wire) {
  const from = resolveTerminal(wire.from);
  const to = resolveTerminal(wire.to);
  if (!from || !to) return;
  const dx = (to.x - from.x) * 0.4;
  path.setAttribute('d', `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`);
}

function resolveTerminal(ref) {
  const comp = components.find((c) => c.id === ref.compId);
  if (!comp) return null;
  return getTerminalPositions(comp)[ref.term];
}

// ---------- Interaction: glisser-déposer depuis la palette ----------

function attachCanvasEvents() {
  const container = document.getElementById('canvas-container');

  container.addEventListener('dragover', (e) => e.preventDefault());
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!COMPONENT_TYPES[type]) return;
    const pt = clientToSvgPoint(e.clientX, e.clientY);
    addComponent(type, pt.x, pt.y);
  });

  svg.addEventListener('mousemove', (e) => {
    const pt = clientToSvgPoint(e.clientX, e.clientY);

    if (dragState) {
      const comp = components.find((c) => c.id === dragState.id);
      comp.x = pt.x - dragState.offsetX;
      comp.y = pt.y - dragState.offsetY;
      render();
    }

    if (wireDraw) {
      let preview = document.getElementById('wire-preview');
      if (!preview) {
        preview = svgEl('path', { class: 'wire-preview', id: 'wire-preview' });
        wiresLayer.appendChild(preview);
      }
      const from = resolveTerminal(wireDraw);
      if (from) preview.setAttribute('d', `M ${from.x} ${from.y} L ${pt.x} ${pt.y}`);
    }
  });

  window.addEventListener('mouseup', () => {
    dragState = null;
    document.querySelectorAll('.component.dragging').forEach((el) => el.classList.remove('dragging'));
  });

  svg.addEventListener('mousedown', (e) => {
    if (e.target === svg || e.target.id === 'grid-bg') {
      selection = null;
      cancelWire();
      render();
    }
  });
}

function clientToSvgPoint(clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM().inverse();
  return pt.matrixTransform(ctm);
}

// ---------- Interaction: tracer un fil ----------

function startWire(compId, term) {
  wireDraw = { compId, term };
}

function finishWire(compId, term) {
  if (!wireDraw) return;
  if (wireDraw.compId === compId && wireDraw.term === term) {
    cancelWire();
    return;
  }
  wires.push({ id: nextId++, from: wireDraw, to: { compId, term } });
  cancelWire();
  render();
}

function cancelWire() {
  wireDraw = null;
  const preview = document.getElementById('wire-preview');
  if (preview) preview.remove();
}

// ---------- Barre d'outils ----------

function attachToolbar() {
  document.getElementById('btn-rotate').addEventListener('click', () => {
    if (!selection || selection.kind !== 'component') return;
    const comp = components.find((c) => c.id === selection.id);
    comp.rotation = (comp.rotation + 90) % 360;
    render();
  });

  document.getElementById('btn-delete').addEventListener('click', deleteSelection);

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement === document.body) {
      deleteSelection();
    }
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    if (components.length === 0 && wires.length === 0) return;
    if (!confirm('Effacer tout le schéma ?')) return;
    components = [];
    wires = [];
    selection = null;
    render();
  });

  document.getElementById('btn-save').addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ components, wires, nextId }));
    alert('Schéma enregistré dans ce navigateur.');
  });

  document.getElementById('btn-load').addEventListener('click', () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { alert('Aucun schéma enregistré.'); return; }
    const data = JSON.parse(raw);
    components = data.components || [];
    wires = data.wires || [];
    nextId = data.nextId || nextId;
    selection = null;
    render();
  });

  document.getElementById('btn-export').addEventListener('click', exportPng);
}

function deleteSelection() {
  if (!selection) return;
  if (selection.kind === 'component') {
    components = components.filter((c) => c.id !== selection.id);
    wires = wires.filter((w) => w.from.compId !== selection.id && w.to.compId !== selection.id);
  } else if (selection.kind === 'wire') {
    wires = wires.filter((w) => w.id !== selection.id);
  }
  selection = null;
  render();
}

function exportPng() {
  const clone = svg.cloneNode(true);
  clone.querySelectorAll('.wire-preview').forEach((el) => el.remove());
  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.download = 'schema-electrique.png';
      link.href = URL.createObjectURL(blob);
      link.click();
    });
  };
  img.src = url;
}
