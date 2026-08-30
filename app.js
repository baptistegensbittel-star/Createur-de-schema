// Créateur de schéma électrique — logique de l'application
//
// Chaque type de composant peut soit dessiner une icône vectorielle de
// remplacement (placeholder), soit afficher une vraie image si `imageSrc`
// est renseigné dans COMPONENT_TYPES. Pour utiliser tes propres images :
// dépose le fichier dans assets/images/ et renseigne son chemin dans
// `imageSrc` ci-dessous (ex: 'assets/images/pile.png'). Rien d'autre à
// changer, le placeholder disparaît automatiquement.

const COMPONENT_TYPES = {
  pile: {
    label: 'Pile',
    imageSrc: '',
    width: 74, height: 44,
    glyph: drawBatteryGlyph,
  },
  lampe: {
    label: 'Lampe',
    imageSrc: '',
    width: 60, height: 60,
    glyph: drawLampGlyph,
  },
  interrupteur: {
    label: 'Interrupteur',
    imageSrc: '',
    width: 74, height: 44,
    glyph: drawSwitchGlyph,
  },
  generateur: {
    label: 'Générateur',
    imageSrc: '',
    width: 70, height: 70,
    glyph: drawGeneratorGlyph,
  },
  moteur: {
    label: 'Moteur',
    imageSrc: '',
    width: 70, height: 70,
    glyph: drawMotorGlyph,
  },
  diode: {
    label: 'Diode',
    imageSrc: '',
    width: 74, height: 40,
    glyph: drawDiodeGlyph,
  },
  led: {
    label: 'Diode électroluminescente',
    imageSrc: '',
    width: 74, height: 40,
    glyph: drawLedGlyph,
  },
  resistance: {
    label: 'Résistance',
    imageSrc: '',
    width: 74, height: 40,
    glyph: drawResistorGlyph,
  },
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const LEAD = 16; // longueur des pattes de connexion de part et d'autre du composant
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

// ---------- Rendu des composants (image réelle ou glyphe de remplacement) ----------

function renderComponentBody(g, type, def, withLeads) {
  if (withLeads) {
    const leadY = def.height / 2;
    g.appendChild(makeLine(-LEAD, leadY, 0, leadY));
    g.appendChild(makeLine(def.width, leadY, def.width + LEAD, leadY));
  }

  if (def.imageSrc) {
    const img = document.createElementNS(SVG_NS, 'image');
    img.setAttribute('href', def.imageSrc);
    img.setAttribute('x', 0);
    img.setAttribute('y', 0);
    img.setAttribute('width', def.width);
    img.setAttribute('height', def.height);
    g.appendChild(img);
  } else {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'comp-body');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', def.width);
    rect.setAttribute('height', def.height);
    rect.setAttribute('rx', 8);
    rect.setAttribute('fill', '#fdfdfd');
    rect.setAttribute('stroke', '#333');
    rect.setAttribute('stroke-width', 1.5);
    g.appendChild(rect);
    def.glyph(g, def.width, def.height);
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

function drawBatteryGlyph(g, w, h) {
  const cx = w / 2;
  g.appendChild(svgEl('line', { x1: cx - 10, y1: h / 2 - 12, x2: cx - 10, y2: h / 2 + 12, stroke: '#333', 'stroke-width': 3 }));
  g.appendChild(svgEl('line', { x1: cx + 6, y1: h / 2 - 6, x2: cx + 6, y2: h / 2 + 6, stroke: '#333', 'stroke-width': 3 }));
  g.appendChild(svgEl('text', { x: cx - 10, y: h / 2 - 16, class: 'comp-label' })).textContent = '+';
  g.appendChild(svgEl('text', { x: cx + 6, y: h / 2 - 16, class: 'comp-label' })).textContent = '-';
}

function drawLampGlyph(g, w, h) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 6;
  g.appendChild(svgEl('circle', { cx, cy, r, fill: 'none', stroke: '#333', 'stroke-width': 2 }));
  g.appendChild(svgEl('line', { x1: cx - r * 0.7, y1: cy - r * 0.7, x2: cx + r * 0.7, y2: cy + r * 0.7, stroke: '#333', 'stroke-width': 2 }));
  g.appendChild(svgEl('line', { x1: cx - r * 0.7, y1: cy + r * 0.7, x2: cx + r * 0.7, y2: cy - r * 0.7, stroke: '#333', 'stroke-width': 2 }));
}

function drawSwitchGlyph(g, w, h) {
  const cy = h / 2;
  g.appendChild(svgEl('circle', { cx: 14, cy, r: 3, fill: '#333' }));
  g.appendChild(svgEl('circle', { cx: w - 14, cy, r: 3, fill: '#333' }));
  g.appendChild(svgEl('line', { x1: 14, y1: cy, x2: w - 20, y2: cy - 14, stroke: '#333', 'stroke-width': 2 }));
}

function drawGeneratorGlyph(g, w, h) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 6;
  g.appendChild(svgEl('circle', { cx, cy, r, fill: 'none', stroke: '#333', 'stroke-width': 2 }));
  const path = svgEl('path', {
    d: `M ${cx - r * 0.55} ${cy} q ${r * 0.28} ${-r * 0.5} ${r * 0.55} 0 q ${r * 0.28} ${r * 0.5} ${r * 0.55} 0`,
    fill: 'none', stroke: '#333', 'stroke-width': 2,
  });
  g.appendChild(path);
}

function drawMotorGlyph(g, w, h) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 6;
  g.appendChild(svgEl('circle', { cx, cy, r, fill: 'none', stroke: '#333', 'stroke-width': 2 }));
  const t = svgEl('text', { x: cx, y: cy + 5, class: 'comp-label', style: 'font-size:16px;' });
  t.textContent = 'M';
  g.appendChild(t);
}

function drawDiodeGlyph(g, w, h) {
  const cy = h / 2, cx = w / 2;
  g.appendChild(svgEl('polygon', { points: `${cx - 14},${cy - 10} ${cx - 14},${cy + 10} ${cx + 10},${cy}`, fill: 'none', stroke: '#333', 'stroke-width': 2 }));
  g.appendChild(svgEl('line', { x1: cx + 10, y1: cy - 10, x2: cx + 10, y2: cy + 10, stroke: '#333', 'stroke-width': 2 }));
}

function drawLedGlyph(g, w, h) {
  drawDiodeGlyph(g, w, h);
  const cy = h / 2, cx = w / 2;
  [[-4, -18], [4, -10]].forEach(([dx, dy]) => {
    g.appendChild(svgEl('line', { x1: cx + 14 + dx, y1: cy - 10 + dy, x2: cx + 20 + dx, y2: cy - 16 + dy, stroke: '#333', 'stroke-width': 1.5 }));
  });
}

function drawResistorGlyph(g, w, h) {
  const cy = h / 2;
  g.appendChild(svgEl('rect', { x: w / 2 - 20, y: cy - 8, width: 40, height: 16, fill: 'none', stroke: '#333', 'stroke-width': 2 }));
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

  const localPoints = [
    { x: -LEAD, y: def.height / 2 },
    { x: def.width + LEAD, y: def.height / 2 },
  ];

  return localPoints.map((p) => {
    const lx = p.x - def.width / 2;
    const ly = p.y - def.height / 2;
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

    [0, 1].forEach((i) => {
      const p = i === 0 ? { x: -LEAD, y: def.height / 2 } : { x: def.width + LEAD, y: def.height / 2 };
      const circle = svgEl('circle', {
        class: 'terminal', cx: p.x, cy: p.y, r: 5,
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
