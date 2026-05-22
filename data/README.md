# Game data (edit in plain English)

These JSON files control balance numbers. **Save the file, then refresh the game** in your browser (or reload the PWA).

## `actions.json` — tasks / actions

Each action has:

| Field | What it does |
|-------|----------------|
| `duration` | How long the task takes. Use phrases like `"30 seconds"`, `"1 minute"`, `"1.5 minutes"`, `"2 min"`. |
| `cost` | Resources spent when you **start** the action (`faith`, `money`, `wisdom`). |
| `reward` | Resources gained when the action **finishes**. |
| `npcChance` | Optional — `{ "id": "kenji", "chance": 0.3 }` means 30% meet chance on complete. |

**Example — make prayer faster and stronger:**

```json
"pray": {
  "duration": "15 seconds",
  "reward": { "faith": 25, "wisdom": 2 }
}
```

Unlock rules (e.g. “needs Japanese level 1”) stay in code — only numbers and hints are here.

## `timing.json` — clock and resources

| Field | What it does |
|-------|----------------|
| `faithRegenPerSecond` | How fast faith refills while you play (default `0.08` ≈ 5 per minute). |
| `dayLength` | Real time for one in-game day, e.g. `"60 seconds"` or `"2 minutes"`. |
| `paydayAmount` | Money from home church each payday (default `500`). |
| `paydayEveryDays` | In-game days between paydays (default `30`). |

## Tips

- Use a `.` for decimals: `"1.5 minutes"`.
- Keys starting with `_` (like `_readme`) are ignored — notes for you only.
- Invalid duration text falls back to 30 seconds and logs a warning in the browser console (Developer tools).
