# Dead End Motel — Starter Scaffold

A clean, modular starter for the first playable prototype of **Dead End Motel**.

## What is included
- Main menu
- Front desk panel
- Guest queue + room assignment
- Camera scan system
- Power meter
- Incident log
- End-of-night summary
- Local save using `localStorage`

## Project structure
- `index.html`
- `styles/`
  - `base.css`
  - `theme.css`
  - `ui.css`
- `js/`
  - `main.js`
  - `state.js`
  - `ui.js`
  - `guests.js`
  - `rooms.js`
  - `cameras.js`
  - `power.js`
  - `events.js`
  - `night.js`
  - `save.js`

## Important rule
Do **not** create one giant `script.js` file.
Every new system should get its own file.

## How to run
### Option 1: VS Code Live Server
1. Open the folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html`.
4. Click **Open with Live Server**.

### Option 2: Python local server
If Python is installed:

```bash
cd dead-end-motel-starter
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## First development steps
1. Make the guest flow feel good.
2. Add one suspicious event system.
3. Improve the room states.
4. Add sound.
5. Improve camera tension.
6. Only then wrap it as desktop.

## Next recommended files later
Add these only when needed:
- `audio.js`
- `anomalies.js`
- `dialogue.js`
- `balance.js`
- `config.js`
- `debug.js`
