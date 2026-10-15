import type { Browser } from '@playwright/test';

export interface ImageComparison {
  /** Pixels that differ, counting area only one image covers. */
  changed: number;
  total: number;
  /** before | after | diff, side by side, when anything changed. */
  image?: Buffer;
}

/**
 * Compare two PNG screenshots in the browser `shoot` already has open, so there's no image
 * library to install. A pixel counts as changed when its RGBA channels differ by more than
 * `tolerance` in total, which ignores the odd anti-aliasing step.
 */
export async function compareImages(
  browser: Browser,
  before: Buffer,
  after: Buffer,
  tolerance = 48,
): Promise<ImageComparison> {
  const page = await browser.newPage();

  try {
    const result = await page.evaluate(async ({ before, after, tolerance }) => {
      const load = async (base64: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();

        return image;
      };

      const [a, b] = await Promise.all([load(before), load(after)]);
      const width = Math.max(a.width, b.width);
      const height = Math.max(a.height, b.height);

      const pixels = (image: HTMLImageElement) => {
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext('2d');

        if (!context) throw new Error('No 2D canvas');
        context.drawImage(image, 0, 0);

        return context.getImageData(0, 0, width, height).data;
      };

      const pa = pixels(a);
      const pb = pixels(b);
      const diff = new ImageData(width, height);
      let changed = 0;

      for (let i = 0; i < pa.length; i += 4) {
        const x = (i / 4) % width;
        const y = Math.floor(i / 4 / width);
        const outside = x >= a.width || y >= a.height || x >= b.width || y >= b.height;

        const distance = Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1])
          + Math.abs(pa[i + 2] - pb[i + 2]) + Math.abs(pa[i + 3] - pb[i + 3]);

        if (outside || distance > tolerance) {
          changed++;
          diff.data.set([255, 0, 64, 255], i);
        } else {
          // Unchanged pixels show faintly, so the red reads against the page.
          const grey = 255 - (255 - (pb[i] + pb[i + 1] + pb[i + 2]) / 3) * 0.2;
          diff.data.set([grey, grey, grey, 255], i);
        }
      }

      if (!changed) return { changed, total: width * height };

      const gap = 16;
      const label = 28;
      const sheet = new OffscreenCanvas(width * 3 + gap * 2, height + label);
      const context = sheet.getContext('2d');

      if (!context) throw new Error('No 2D canvas');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, sheet.width, sheet.height);
      context.fillStyle = '#111';
      context.font = '600 16px system-ui, sans-serif';

      for (const [i, text] of ['Before', 'After', 'Changed'].entries()) {
        context.fillText(text, i * (width + gap), 19);
      }

      context.drawImage(a, 0, label);
      context.drawImage(b, width + gap, label);
      context.putImageData(diff, (width + gap) * 2, label);

      const blob = await sheet.convertToBlob({ type: 'image/png' });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';

      for (const byte of bytes) binary += String.fromCharCode(byte);

      return { changed, total: width * height, image: btoa(binary) };
    }, { before: before.toString('base64'), after: after.toString('base64'), tolerance });

    return { ...result, image: result.image ? Buffer.from(result.image, 'base64') : undefined };
  } finally {
    await page.close();
  }
}
