# Filter-Studio

**Filter Lab** is a browser workbench for studying how image samples become patterns. This first volume contains halftone dots and 4 × 4 Bayer ordered dithering. Everything runs in plain JavaScript and Canvas 2D. Image processing stays in your browser.

## Run it

Clone this repository and serve the project directory:

```sh
git clone https://github.com/badabingbadaboom850/Filter-Studio.git
cd Filter-Studio
python3 -m http.server 8000
```

On Windows you can also use `py -m http.server 8000`. Open [localhost:8000](http://localhost:8000). The local server lets the browser load the JavaScript modules and sample SVG.

## Try it

1. Use **Source**, **Samples**, and **Result** to follow the three stages. The Samples view shows the raw brightness values, so it stays the same when you toggle **Invert brightness**.
2. Click a cell, or focus the canvas and use the arrow keys. **Cell probe** shows its brightness and how the filter interpreted it.
3. Switch to **Ordered dither** and probe a stretch of sky. Watch the highlighted position in the repeating Bayer matrix as you move.
4. Open your own image. **Export PNG** saves the current filter result, even while you're viewing Source or Samples. Inputs are processed at up to 1,200 pixels on the long edge. Transparent areas are composited on white.

## Read it in order

| File | What to look for |
| --- | --- |
| [src/image-sampling.js](src/image-sampling.js) | `makeGrid()` makes a grid of cells. Each cell stores a center, a brightness sample, and an ink value. |
| [src/halftone.js](src/halftone.js) | `dotRadius()` converts ink to a radius. Try changing `Math.sqrt(cell.ink)` to `cell.ink`. Reload and compare the midtones. |
| [src/ordered-dither.js](src/ordered-dither.js) | `ditherThreshold()` uses row and column modulo 4 to look up a threshold. Try swapping two ranks and compare the pattern. |
| [src/app.js](src/app.js) | Follow `loadImage()` → `currentGrid()` → `paintResult()`. This file connects the controls, preview, and cell probe to the algorithms above. |

The closest Houdini analogy is a grid of points sampling a texture. Halftone maps that sample to `pscale`. Dithering compares it with a repeating pattern to decide whether to keep each cell.

## Follow the commits

The prototype's three commits introduce halftone and the shared sampler, then ordered dithering, then the interactive workbench. Use `git log --oneline` to find a commit and `git show <commit>` to read its diff.

## Publish to GitHub Pages

Once the prototype is on `main`, open **Settings → Pages** on GitHub, choose **Deploy from a branch**, and select **main** and **/(root)**. The project paths are relative so the site works under the repository name.
