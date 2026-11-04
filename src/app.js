import { makeGrid } from './image-sampling.js';
import { dotRadius, drawHalftone } from './halftone.js';
import { BAYER, ditherDecision, drawDither } from './ordered-dither.js';

const byId = (id) => document.getElementById(id);
const preview = byId('preview');
const previewContext = preview.getContext('2d');
const sourceCanvas = document.createElement('canvas');
const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
const filterButtons = document.querySelectorAll('[data-filter]');
const viewButtons = document.querySelectorAll('[data-view]');

// Each filter keeps its own settings when you switch between them.
const defaults = {
  halftone: { size: 10, amount: 1, ink: '#19332e', paper: '#f2e9d0', invert: false },
  dither: { size: 4, bias: 0, ink: '#271e42', paper: '#f4dbb8', invert: false },
};
const settings = {
  halftone: { ...defaults.halftone },
  dither: { ...defaults.dither },
};
const lessons = {
  halftone: {
    title: 'Tone becomes area',
    copy: 'Take one brightness sample per cell. Dark cells get larger dots. The square root makes the area covered by ink follow the sample.',
    formula: 'radius = max radius × scale × √ink',
    experiment: 'Try raising Cell size. The preview uses fewer samples, so small features can disappear.',
  },
  dither: {
    title: 'Tone becomes a decision',
    copy: 'Lay a repeating 4 × 4 grid over the image. Each cell has its own threshold. Paint the whole cell when its ink value reaches that threshold.',
    formula: 'paint when ink + bias ≥ threshold',
    experiment: 'Use the arrow keys across a smooth patch. The thresholds change even when neighboring brightness values are almost identical.',
  },
};
const sampleURL = new URL('../assets/moonrise.svg', import.meta.url);

let filter = 'halftone';
let view = 'result';
let pixels;
let gridCache;
let probePoint;
let frame = 0;
let imageRequest = 0;

// The image is decoded in the browser. Rasterize it once, with a white
// backing for transparent pixels, and keep the raw RGBA data for sampling.
async function loadImage(url, name) {
  const request = ++imageRequest;
  byId('status').textContent = 'Loading image…';
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    // A newer upload or restore wins if it finishes before this one.
    if (request !== imageRequest) return;
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    sourceCanvas.width = preview.width = width;
    sourceCanvas.height = preview.height = height;
    sourceContext.fillStyle = '#ffffff';
    sourceContext.fillRect(0, 0, width, height);
    sourceContext.drawImage(image, 0, 0, width, height);
    pixels = sourceContext.getImageData(0, 0, width, height);
    gridCache = undefined;
    probePoint = { x: width / 2, y: height / 2 };

    byId('canvas-wrap').style.setProperty('--image-ratio', width / height);
    byId('image-name').textContent = name;
    byId('dimensions').textContent = `${width} × ${height}`;
    byId('export').disabled = false;
    byId('status').textContent = '';
    requestRender();
  } catch {
    if (request === imageRequest) {
      byId('status').textContent = 'Could not read this image. Try a PNG, JPEG, or WebP.';
    }
  }
}

function currentGrid() {
  const { size, invert } = settings[filter];
  // Changing a palette or threshold only changes how the grid is drawn.
  // Cache the sampling pass until cell size, inversion, or the source changes.
  if (!gridCache || gridCache.size !== size || gridCache.invert !== invert) {
    gridCache = { size, invert, cells: makeGrid(pixels, size, invert) };
  }
  return gridCache.cells;
}

function paintResult(context, cells) {
  const options = settings[filter];
  context.fillStyle = options.paper;
  context.fillRect(0, 0, pixels.width, pixels.height);
  if (filter === 'halftone') {
    drawHalftone(context, cells, options);
  } else {
    drawDither(context, cells, options);
  }
}

function paintSamples(cells) {
  // Fill each cell with its single brightness sample. This is what either
  // filter knows about the source before it makes any drawing decisions.
  for (const cell of cells) {
    const gray = Math.round(cell.brightness * 255);
    previewContext.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    previewContext.fillRect(cell.left, cell.top, cell.width, cell.height);
  }
}

function updateProbe(cells) {
  const { size, amount, bias } = settings[filter];
  const column = Math.floor(probePoint.x / size);
  const row = Math.floor(probePoint.y / size);
  const columns = Math.ceil(pixels.width / size);
  const cell = cells[row * columns + column];
  const items = [
    ['Cell (x, y)', `${column}, ${row}`],
    ['Brightness', cell.brightness.toFixed(3)],
    ['Ink coverage', cell.ink.toFixed(3)],
  ];

  if (filter === 'halftone') {
    items.push(['Dot radius', `${dotRadius(cell, amount).toFixed(2)} px`]);
  } else {
    const { ink, threshold, marked } = ditherDecision(cell, bias);
    items.push(
      ['Ink after bias', ink.toFixed(3)],
      ['Bayer threshold', threshold.toFixed(3)],
      ['Decision', marked ? 'Ink' : 'Paper'],
    );
  }

  // All values here come from the sampler or algorithm. The image filename
  // is user input and is separately rendered through textContent.
  byId('probe').innerHTML = items.map(([label, value]) =>
    `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  const marker = byId('marker');
  marker.hidden = false;
  marker.style.left = `${cell.left / pixels.width * 100}%`;
  marker.style.top = `${cell.top / pixels.height * 100}%`;
  marker.style.width = `${cell.width / pixels.width * 100}%`;
  marker.style.height = `${cell.height / pixels.height * 100}%`;

  const activeRank = (row % 4) * 4 + column % 4;
  for (const [index, square] of [...byId('bayer').children].entries()) {
    square.classList.toggle('active', index === activeRank);
  }
}

function render() {
  frame = 0;
  const options = settings[filter];
  byId('size-value').value = `${options.size} px`;
  byId('strength-value').value = filter === 'halftone'
    ? options.amount.toFixed(2) + '×'
    : (options.bias >= 0 ? '+' : '') + options.bias.toFixed(2);
  if (!pixels) return;

  const cells = currentGrid();
  if (view === 'source') {
    previewContext.drawImage(sourceCanvas, 0, 0);
  } else if (view === 'samples') {
    paintSamples(cells);
  } else {
    paintResult(previewContext, cells);
  }
  updateProbe(cells);
}

function requestRender() {
  // A slider can emit more than one event per display frame. Draw only the
  // most recent state once per frame so the controls stay responsive.
  if (!frame) frame = requestAnimationFrame(render);
}

function setFilter(next) {
  filter = next;
  const options = settings[filter];
  const isHalftone = filter === 'halftone';
  for (const button of filterButtons) {
    button.setAttribute('aria-pressed', button.dataset.filter === filter);
  }
  byId('cell-size').value = options.size;
  const strength = byId('strength');
  strength.min = isHalftone ? 0.1 : -0.5;
  strength.max = isHalftone ? 1 : 0.5;
  strength.step = 0.01;
  strength.value = isHalftone ? options.amount : options.bias;
  byId('strength-label').textContent = isHalftone ? 'Dot scale' : 'Ink bias';
  byId('ink').value = options.ink;
  byId('paper').value = options.paper;
  byId('invert').checked = options.invert;

  const lesson = lessons[filter];
  byId('study-title').textContent = lesson.title;
  byId('study-copy').textContent = lesson.copy;
  byId('formula').textContent = lesson.formula;
  byId('experiment').textContent = lesson.experiment;
  byId('bayer').hidden = isHalftone;
  requestRender();
}

for (const button of filterButtons) {
  button.addEventListener('click', () => setFilter(button.dataset.filter));
}
for (const button of viewButtons) {
  button.addEventListener('click', () => {
    view = button.dataset.view;
    for (const option of viewButtons) {
      option.setAttribute('aria-pressed', option === button);
    }
    requestRender();
  });
}
for (const id of ['cell-size', 'strength', 'ink', 'paper', 'invert']) {
  byId(id).addEventListener('input', (event) => {
    const input = event.currentTarget;
    const options = settings[filter];
    if (id === 'cell-size') options.size = input.valueAsNumber;
    if (id === 'strength') options[filter === 'halftone' ? 'amount' : 'bias'] = input.valueAsNumber;
    if (id === 'ink' || id === 'paper') options[id] = input.value;
    if (id === 'invert') options.invert = input.checked;
    requestRender();
  });
}
byId('reset').addEventListener('click', () => {
  settings[filter] = { ...defaults[filter] };
  setFilter(filter);
});
byId('upload').addEventListener('change', async (event) => {
  const input = event.currentTarget;
  const [file] = input.files;
  if (!file) return;
  input.value = '';
  const url = URL.createObjectURL(file);
  try {
    await loadImage(url, file.name);
  } finally {
    URL.revokeObjectURL(url);
  }
});
byId('sample').addEventListener('click', () => loadImage(sampleURL, 'Moonrise Valley'));

function selectPoint(x, y) {
  probePoint = {
    x: Math.max(0, Math.min(pixels.width - 1, x)),
    y: Math.max(0, Math.min(pixels.height - 1, y)),
  };
  updateProbe(currentGrid());
}

preview.addEventListener('click', (event) => {
  if (!pixels) return;
  // Pointer coordinates are in CSS pixels. Convert them back into image
  // pixels before looking up the cell, even when the canvas is scaled down.
  const box = preview.getBoundingClientRect();
  selectPoint((event.clientX - box.left) / box.width * pixels.width,
    (event.clientY - box.top) / box.height * pixels.height);
});
const directions = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};
preview.addEventListener('keydown', (event) => {
  if (!pixels || !Object.hasOwn(directions, event.key)) return;
  event.preventDefault();
  const [dx, dy] = directions[event.key];
  const { size } = settings[filter];
  selectPoint(probePoint.x + dx * size, probePoint.y + dy * size);
});

byId('export').addEventListener('click', () => {
  if (!pixels) return;
  // Export a fresh result even if the inspector is currently showing the
  // source or samples. The selection outline is HTML, so it stays off the PNG.
  const output = document.createElement('canvas');
  output.width = pixels.width;
  output.height = pixels.height;
  paintResult(output.getContext('2d'), currentGrid());
  const filename = `filter-lab-${filter}.png`;
  output.toBlob((blob) => {
    if (!blob) {
      byId('status').textContent = 'Could not export this image.';
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, 'image/png');
});

for (const rank of BAYER.flat()) {
  const square = document.createElement('span');
  square.textContent = rank;
  byId('bayer').append(square);
}
setFilter(filter);
loadImage(sampleURL, 'Moonrise Valley');
