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
    width: 46, height: 84,
    glyph: drawBatteryGlyph,
  },
  lampe: {
    label: 'Lampe',
    imageSrc: '',
    width: 52, height: 72,
    glyph: drawLampGlyph,
  },
  interrupteur: {
    label: 'Interrupteur',
    imageSrc: '',
    width: 96, height: 46,
    glyph: drawSwitchGlyph,
  },
  generateur: {
    label: 'Générateur',
    imageSrc: '',
    width: 80, height: 64,
    glyph: drawGeneratorGlyph,
  },
  moteur: {
    label: 'Moteur',
    imageSrc: '',
    width: 64, height: 64,
    glyph: drawMotorGlyph,
  },
  diode: {
    label: 'Diode',
    imageSrc: '',
    width: 70, height: 32,
    glyph: drawDiodeGlyph,
  },
  led: {
    label: 'Diode électroluminescente',
    imageSrc: '',
    width: 60, height: 46,
    glyph: drawLedGlyph,
  },
  resistance: {
    label: 'Résistance',
    imageSrc: '',
    width: 72, height: 30,
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
  // Pile rectangulaire verticale (façon pile plate/AA), isolée du reste du montage.
  g.appendChild(svgEl('rect', {
    class: 'comp-body', x: 4, y: 8, width: w - 8, height: h - 16, rx: 7,
    fill: '#3fae76', stroke: '#1f6b47', 'stroke-width': 2,
  }));
  g.appendChild(svgEl('rect', { x: w / 2 - 8, y: 0, width: 16, height: 10, rx: 2, fill: '#444', stroke: '#222' }));
  g.appendChild(svgEl('rect', { x: 8, y: h / 2 - 10, width: w - 16, height: 20, rx: 3, fill: '#f4fbf6', stroke: '#1f6b47', 'stroke-width': 1 }));
  const plus = svgEl('text', { x: w / 2, y: h / 2 - 15, class: 'comp-label', style: 'font-size:13px;font-weight:bold;' });
  plus.textContent = '+';
  g.appendChild(plus);
  const minus = svgEl('text', { x: w / 2, y: h / 2 + 24, class: 'comp-label', style: 'font-size:13px;font-weight:bold;' });
  minus.textContent = '−';
  g.appendChild(minus);
  g.appendChild(svgEl('rect', { x: 8, y: 12, width: 4, height: h - 24, fill: '#ffffff', opacity: 0.35 }));
}

function drawLampGlyph(g, w, h) {
  // Ampoule à vis sur son culot, façon lampe de schéma scolaire.
  const cx = w / 2, bulbCy = h * 0.36, r = w * 0.42;
  g.appendChild(svgEl('ellipse', {
    class: 'comp-body', cx, cy: bulbCy, rx: r, ry: h * 0.34,
    fill: '#fdf6d8', stroke: '#8a8a8a', 'stroke-width': 2,
  }));
  g.appendChild(svgEl('path', {
    d: `M ${cx - r * 0.4} ${bulbCy + r * 0.25} q ${r * 0.2} ${-r * 0.5} ${r * 0.4} 0 q ${r * 0.2} ${r * 0.5} ${r * 0.4} 0`,
    fill: 'none', stroke: '#e0a800', 'stroke-width': 1.5,
  }));
  g.appendChild(svgEl('ellipse', { cx: cx - r * 0.35, cy: bulbCy - r * 0.35, rx: r * 0.22, ry: r * 0.14, fill: '#ffffff', opacity: 0.6 }));
  g.appendChild(svgEl('rect', { x: cx - w * 0.24, y: h * 0.62, width: w * 0.48, height: h * 0.3, fill: '#8c8c8c', stroke: '#555', 'stroke-width': 1.5 }));
  for (let i = 0; i < 3; i++) {
    const ly = h * 0.68 + i * (h * 0.09);
    g.appendChild(svgEl('line', { x1: cx - w * 0.24, y1: ly, x2: cx + w * 0.24, y2: ly, stroke: '#555', 'stroke-width': 1 }));
  }
}

function drawSwitchGlyph(g, w, h) {
  // Interrupteur à couteau sur socle, en position ouverte — isolé du montage.
  const baseY = h - 16;
  g.appendChild(svgEl('rect', {
    class: 'comp-body', x: 4, y: baseY, width: w - 8, height: 16, rx: 4,
    fill: '#f2d94e', stroke: '#a68f2a', 'stroke-width': 2,
  }));
  const leftX = 22, rightX = w - 22;
  g.appendChild(svgEl('circle', { cx: leftX, cy: baseY, r: 6, fill: '#9a9a9a', stroke: '#555', 'stroke-width': 1.5 }));
  g.appendChild(svgEl('circle', { cx: rightX, cy: baseY, r: 6, fill: '#9a9a9a', stroke: '#555', 'stroke-width': 1.5 }));
  g.appendChild(svgEl('line', {
    x1: leftX, y1: baseY, x2: rightX - 14, y2: baseY - 22,
    stroke: '#666', 'stroke-width': 5, 'stroke-linecap': 'round',
  }));
  g.appendChild(svgEl('circle', { cx: rightX - 14, cy: baseY - 22, r: 5, fill: 'none', stroke: '#555', 'stroke-width': 2.5 }));
  g.appendChild(svgEl('circle', { cx: leftX, cy: baseY, r: 3, fill: '#555' }));
}

function drawGeneratorGlyph(g, w, h) {
  // Boîtier de générateur (façon générateur basse tension de labo).
  g.appendChild(svgEl('rect', {
    class: 'comp-body', x: 2, y: 2, width: w - 4, height: h - 4, rx: 8,
    fill: '#2f6fed', stroke: '#1c4fb0', 'stroke-width': 2,
  }));
  g.appendChild(svgEl('rect', { x: 8, y: 8, width: w - 16, height: h * 0.42, rx: 4, fill: '#5c8ff2', stroke: '#1c4fb0', 'stroke-width': 1 }));
  g.appendChild(svgEl('circle', { cx: w - 20, cy: h * 0.28, r: 7, fill: '#d63333', stroke: '#8f1616', 'stroke-width': 1.5 }));
  g.appendChild(svgEl('circle', { cx: 22, cy: h * 0.28, r: 9, fill: '#fff', stroke: '#333', 'stroke-width': 1.5 }));
  g.appendChild(svgEl('line', { x1: 22, y1: h * 0.28, x2: 27, y2: h * 0.22, stroke: '#333', 'stroke-width': 1.5 }));
  g.appendChild(svgEl('circle', { cx: w / 2 - 14, cy: h - 12, r: 5, fill: '#d63333', stroke: '#8f1616' }));
  g.appendChild(svgEl('circle', { cx: w / 2 + 14, cy: h - 12, r: 5, fill: '#222', stroke: '#000' }));
}

function drawMotorGlyph(g, w, h) {
  // Petit moteur électrique cylindrique sur pieds.
  g.appendChild(svgEl('rect', {
    class: 'comp-body', x: w * 0.14, y: h * 0.12, width: w * 0.72, height: h * 0.66, rx: w * 0.2,
    fill: '#a3a9af', stroke: '#5b6066', 'stroke-width': 2,
  }));
  g.appendChild(svgEl('circle', { cx: w / 2, cy: h * 0.16, r: w * 0.09, fill: '#d63333', stroke: '#8f1616', 'stroke-width': 1.5 }));
  g.appendChild(svgEl('rect', { x: w * 0.78, y: h * 0.42, width: w * 0.14, height: h * 0.12, fill: '#555' }));
  g.appendChild(svgEl('rect', { x: w * 0.18, y: h * 0.78, width: w * 0.14, height: h * 0.12, rx: 2, fill: '#555' }));
  g.appendChild(svgEl('rect', { x: w * 0.68, y: h * 0.78, width: w * 0.14, height: h * 0.12, rx: 2, fill: '#555' }));
}

function drawDiodeGlyph(g, w, h) {
  // Diode : petit cylindre sombre avec bague marquant la cathode.
  const cy = h / 2, bodyW = w * 0.68, x0 = (w - bodyW) / 2;
  g.appendChild(svgEl('rect', {
    class: 'comp-body', x: x0, y: cy - h * 0.32, width: bodyW, height: h * 0.64, rx: h * 0.3,
    fill: '#3a3a3a', stroke: '#111', 'stroke-width': 1.5,
  }));
  g.appendChild(svgEl('rect', { x: x0 + bodyW * 0.7, y: cy - h * 0.32, width: bodyW * 0.12, height: h * 0.64, fill: '#ddd' }));
}

function drawLedGlyph(g, w, h) {
  // DEL : dôme translucide rouge avec deux pattes vers les bornes.
  const cx = w / 2, domeCy = h * 0.34, domeR = w * 0.32;
  g.appendChild(svgEl('line', { x1: cx - domeR * 0.6, y1: domeCy + domeR * 0.7, x2: 0, y2: h / 2, stroke: '#888', 'stroke-width': 2 }));
  g.appendChild(svgEl('line', { x1: cx + domeR * 0.6, y1: domeCy + domeR * 0.7, x2: w, y2: h / 2, stroke: '#888', 'stroke-width': 2 }));
  g.appendChild(svgEl('path', {
    class: 'comp-body',
    d: `M ${cx - domeR} ${domeCy + domeR * 0.6} L ${cx - domeR} ${domeCy} a ${domeR} ${domeR} 0 0 1 ${domeR * 2} 0 L ${cx + domeR} ${domeCy + domeR * 0.6} Z`,
    fill: '#e6392b', stroke: '#8f1616', 'stroke-width': 1.5,
  }));
  g.appendChild(svgEl('ellipse', { cx: cx - domeR * 0.35, cy: domeCy - domeR * 0.1, rx: domeR * 0.25, ry: domeR * 0.35, fill: '#ffffff', opacity: 0.5 }));
}

function drawResistorGlyph(g, w, h) {
  // Résistance : corps beige avec bagues de couleur.
  const cy = h / 2, bodyW = w * 0.72, x0 = (w - bodyW) / 2;
  g.appendChild(svgEl('rect', {
    class: 'comp-body', x: x0, y: cy - h * 0.27, width: bodyW, height: h * 0.54, rx: h * 0.18,
    fill: '#e3c894', stroke: '#a9885a', 'stroke-width': 1.5,
  }));
  const bands = ['#7a4a1e', '#d63333', '#d4af37'];
  bands.forEach((color, i) => {
    g.appendChild(svgEl('rect', {
      x: x0 + bodyW * (0.22 + i * 0.18), y: cy - h * 0.27, width: bodyW * 0.08, height: h * 0.54, fill: color,
    }));
  });
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
