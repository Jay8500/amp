const MAX_DATA_URL_CHARS = 40_000; // comfortably under the 50k Sheets cell limit with JSON overhead

/**
 * Center-crops an uploaded image to a square, scales it to `size`×`size` and encodes it
 * as WebP (JPEG fallback), lowering quality until it fits in one Sheet cell.
 */
export async function resizeToDataUrl(file: File, size = 128): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; // JPEG has no alpha — avoid black backgrounds on transparent logos
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    let url = canvas.toDataURL('image/webp', quality);
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= MAX_DATA_URL_CHARS) return url;
  }
  throw new Error('Image is too detailed to store — try a simpler logo.');
}
