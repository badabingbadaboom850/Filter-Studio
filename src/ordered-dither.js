// The numbers are ranks, not pixel colors. Modulo wraps this 4×4 tile over
// the whole image. Low ranks receive ink first as the image gets darker.
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function ditherThreshold(cell) {
  const rank = BAYER[cell.row % 4][cell.column % 4];
  // Midpoints leave room for both extremes: zero ink turns every cell
  // off and full ink turns every cell on.
  return (rank + 0.5) / 16;
}

export function ditherDecision(cell, bias) {
  const ink = Math.min(1, Math.max(0, cell.ink + bias));
  const threshold = ditherThreshold(cell);
  return { ink, threshold, marked: ink >= threshold };
}

export function drawDither(context, cells, settings) {
  context.fillStyle = settings.ink;
  for (const cell of cells) {
    if (ditherDecision(cell, settings.bias).marked) {
      context.fillRect(cell.left, cell.top, cell.width, cell.height);
    }
  }
}
