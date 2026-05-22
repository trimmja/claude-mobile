// Turn plain-English durations into milliseconds for the game engine.
// Examples: "30 seconds", "1 minute", "1.5 minutes", "90 sec", "2 min"
export function parseDuration(value) {
  if (value == null) return 0;
  if (typeof value === 'number') {
    // Bare numbers are treated as seconds (easier than milliseconds).
    return Math.round(value * 1000);
  }

  const text = String(value).trim().toLowerCase();
  if (!text) return 0;

  const match = text.match(/^([\d.]+)\s*(seconds?|secs?|s|minutes?|mins?|m)$/);
  if (!match) {
    console.warn(`Could not parse duration "${value}" — using 30 seconds`);
    return 30000;
  }

  const amount = parseFloat(match[1]);
  const unit = match[2];
  const ms = unit.startsWith('m') ? amount * 60 * 1000 : amount * 1000;
  return Math.round(ms);
}
