// Extracts N vibrant, saturation-boosted colors from an image URL.
// Returns an array of "rgb(r,g,b)" strings.
export function extractColors(imgUrl, count = 5) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 80;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      // Bucket by coarse RGB (24-step) to find popular colors
      const buckets = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 200) continue;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (max < 25) continue;
        if (sat < 0.10 && max > 220) continue;

        const key =
          (Math.floor(r / 24) << 12) |
          (Math.floor(g / 24) << 6) |
          Math.floor(b / 24);
        const entry = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
        entry.r += r;
        entry.g += g;
        entry.b += b;
        entry.n += 1;
        buckets.set(key, entry);
      }

      // Convert bucket averages, then sort by (count × saturation) for vividness
      const candidates = [...buckets.values()].map((bkt) => {
        const r = Math.round(bkt.r / bkt.n);
        const g = Math.round(bkt.g / bkt.n);
        const b = Math.round(bkt.b / bkt.n);
        const [h, s, l] = rgbToHsl(r, g, b);
        return { r, g, b, h, s, l, n: bkt.n, score: bkt.n * (0.35 + s) };
      });
      candidates.sort((a, b) => b.score - a.score);

      // Pick colors preferring some hue variety, but staying true to the art.
      // Use a tight threshold (18°) so we keep close hues from the album.
      const picked = [];
      for (const c of candidates) {
        const hueClash = picked.some((p) => {
          const dh = Math.abs(p.h - c.h);
          const wrap = Math.min(dh, 360 - dh);
          return wrap < 18;
        });
        if (!hueClash) picked.push(c);
        if (picked.length >= count) break;
      }
      // Fill remaining slots from top candidates regardless
      let ci = 0;
      while (picked.length < count && ci < candidates.length) {
        if (!picked.includes(candidates[ci])) picked.push(candidates[ci]);
        ci++;
      }

      // Gentle saturation boost that keeps album-art identity intact
      const boosted = picked.map(({ h, s, l }) => {
        // Boost saturation modestly, floor at 0.55 for vividness but not neon
        const newS = Math.max(0.55, Math.min(0.95, s * 1.25));
        // Preserve original luminance — only clamp extremes
        let newL = l;
        if (newL < 0.32) newL = 0.32 + (newL / 0.32) * 0.12; // dark → 0.32-0.44
        if (newL > 0.7) newL = 0.7 - ((newL - 0.7) / 0.3) * 0.1; // very light → 0.60-0.70
        const [r, g, b] = hslToRgb(h, newS, newL);
        return `rgb(${r}, ${g}, ${b})`;
      });

      // Vibrant iconic fallbacks (sunset / synthwave palette)
      const fallbacks = [
        "rgb(255, 45, 165)",
        "rgb(120, 60, 255)",
        "rgb(65, 200, 255)",
        "rgb(255, 190, 60)",
        "rgb(255, 90, 90)",
      ];
      let fi = 0;
      while (boosted.length < count) {
        boosted.push(fallbacks[fi++ % fallbacks.length]);
      }

      resolve(boosted);
    };
    img.onerror = reject;
    img.src = imgUrl;
  });
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
      default:
        break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  h /= 360;
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
