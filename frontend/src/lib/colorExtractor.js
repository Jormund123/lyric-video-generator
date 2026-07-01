// Extracts N dominant / distinct colors from an image URL using canvas
// Returns an array of "rgb(r,g,b)" strings.
export function extractColors(imgUrl, count = 5) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 64; // downscale for speed
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      // Bucket colors into a coarse grid (32-step) to find popular colors
      const buckets = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 200) continue;
        // Skip near-black / near-white to get vivid palette
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (max < 30) continue; // very dark
        if (sat < 0.15 && max > 220) continue; // washed out

        const key =
          (Math.floor(r / 32) << 10) |
          (Math.floor(g / 32) << 5) |
          Math.floor(b / 32);
        const entry = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
        entry.r += r;
        entry.g += g;
        entry.b += b;
        entry.n += 1;
        buckets.set(key, entry);
      }

      const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
      const picked = [];
      for (const bkt of sorted) {
        const r = Math.round(bkt.r / bkt.n);
        const g = Math.round(bkt.g / bkt.n);
        const b = Math.round(bkt.b / bkt.n);
        // Ensure distinct from previously picked
        const isDup = picked.some(
          ([pr, pg, pb]) =>
            Math.abs(pr - r) + Math.abs(pg - g) + Math.abs(pb - b) < 90,
        );
        if (!isDup) picked.push([r, g, b]);
        if (picked.length >= count) break;
      }

      // Pad with saturated fallbacks if not enough
      const fallbacks = [
        [180, 60, 200],
        [60, 120, 220],
        [230, 90, 120],
        [90, 200, 180],
        [240, 170, 80],
      ];
      let fi = 0;
      while (picked.length < count) {
        picked.push(fallbacks[fi++ % fallbacks.length]);
      }

      resolve(picked.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`));
    };
    img.onerror = reject;
    img.src = imgUrl;
  });
}
