// This is the filter's main rule. Circle area grows with radius squared,
// so the square root makes the *area* respond linearly to darkness.
// Try removing Math.sqrt() and look at what happens to the midtones.
export function dotRadius(cell, amount) {
  const maxRadius = Math.min(cell.width, cell.height) / 2;
  return maxRadius * amount * Math.sqrt(cell.ink);
}

export function drawHalftone(context, cells, settings) {
  context.fillStyle = settings.ink;
  context.beginPath();
  for (const cell of cells) {
    const radius = dotRadius(cell, settings.amount);
    if (radius === 0) continue;
    // Start a new subpath so Canvas doesn't join neighboring circles.
    context.moveTo(cell.x + radius, cell.y);
    context.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
  }
  context.fill();
}
