let LINES = [];

export function initReflectionsFromData(data) {
  LINES = Array.isArray(data?.lines) ? data.lines : [];
}

export function pickReflection() {
  if (LINES.length === 0) return '';
  return LINES[Math.floor(Math.random() * LINES.length)];
}
