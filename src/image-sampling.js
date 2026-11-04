// Canvas exposes pixels as a flat list: red, green, blue, alpha, then the
// next pixel. The alpha channel has already been composited over white.
export function sampleBrightness(image, x, y) {
  const column = Math.min(image.width - 1, Math.max(0, Math.floor(x)));
  const row = Math.min(image.height - 1, Math.max(0, Math.floor(y)));
  const index = (row * image.width + column) * 4;
  const [red, green, blue] = image.data.subarray(index, index + 3);

  // Weighted brightness in the image's RGB encoding. Green contributes
  // more than blue, so equally intense colors can produce different tones.
  return (2126 * red + 7152 * green + 722 * blue) / (255 * 10_000);
}

export function makeGrid(image, size, invert) {
  // Both filters receive the same cell structure. We sample the center of
  // each cell once, including partial cells at the right and bottom edges.
  const cells = [];
  for (let top = 0, row = 0; top < image.height; top += size, row++) {
    for (let left = 0, column = 0; left < image.width; left += size, column++) {
      const width = Math.min(size, image.width - left);
      const height = Math.min(size, image.height - top);
      const x = left + width / 2;
      const y = top + height / 2;
      const brightness = sampleBrightness(image, x, y);

      // Ink coverage runs in the opposite direction from brightness.
      const ink = invert ? brightness : 1 - brightness;
      cells.push({ column, row, left, top, width, height, x, y, brightness, ink });
    }
  }
  return cells;
}
