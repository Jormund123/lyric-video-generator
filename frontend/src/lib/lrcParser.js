// Parse LRC text into array of { time (seconds), text }
// Handles both 2 and 3 digit millisecond formats and multi-timestamp lines
export function parseLRC(text) {
  const lines = text.split(/\r?\n/);
  const timeTagRe = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const results = [];

  for (const rawLine of lines) {
    // Skip metadata-only lines (e.g. [ar:...], [ti:...])
    if (/^\[[a-zA-Z]+:/.test(rawLine.trim())) continue;

    const tags = [];
    let match;
    timeTagRe.lastIndex = 0;
    while ((match = timeTagRe.exec(rawLine)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      let ms = 0;
      if (match[3]) {
        const digits = match[3];
        ms = parseInt(digits, 10);
        if (digits.length === 2) ms = ms * 10;
        if (digits.length === 1) ms = ms * 100;
      }
      tags.push(min * 60 + sec + ms / 1000);
    }
    if (tags.length === 0) continue;

    const lyricText = rawLine.replace(timeTagRe, "").trim();
    for (const t of tags) {
      results.push({ time: t, text: lyricText });
    }
  }

  results.sort((a, b) => a.time - b.time);
  return results;
}
