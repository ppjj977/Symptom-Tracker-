# 🩺 Daily Symptom Tracker

A simple, private web app for keeping track of how you feel each day — so you
can give your doctor an accurate picture, or just understand your own patterns
over time.

No accounts, no servers, no internet required. **All of your data stays in your
own browser** (via `localStorage`).

## Features

- **Quick daily log** — record your overall wellbeing (1–5), any symptoms with a
  severity rating (1–10), medications taken, and free-text notes.
- **History** — browse, edit, or delete past entries. Symptom tags are
  colour-coded by severity.
- **Doctor report** — pick a date range and get a clean summary table with
  average wellbeing and most frequent symptom. Print it, save it as a PDF, or
  download a CSV to hand to your clinician.
- **Backup & restore** — export all your data to a JSON file and restore it
  later or on another device.
- **Fully offline & private** — nothing leaves your device.

## How to use it

Just open `index.html` in any modern web browser. That's it.

To run it on a local web server instead (optional):

```bash
# from the project folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

| File         | Purpose                                  |
| ------------ | ---------------------------------------- |
| `index.html` | Page structure and the three tabs        |
| `style.css`  | Styling, responsive layout, print styles |
| `app.js`     | All logic and local storage              |

## A note on privacy & data

Because everything is stored in your browser's `localStorage`, clearing your
browser data will erase your entries. Use **Back up all data** regularly to keep
a copy.

## Disclaimer

This tool is for personal tracking only and does not provide medical advice.
Always consult a qualified healthcare professional about your symptoms.
