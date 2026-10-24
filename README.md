# Digit Hunt — Official Website

GitHub Pages site for the **Digit Hunt** Android app (`com.sprintapps.digithunt`).

Serves as:
- Google Play developer website and marketing page
- Privacy Policy hosting (link it from Play Console → App content → Privacy policy)
- AdMob `app-ads.txt` (publisher `pub-7995936388116429`, same account as ShrinkIt)

## File structure

```
digithunt-website/
├── index.html            # Landing page with a playable practice puzzle
├── privacy-policy.html   # Privacy Policy (from DigitHunt/store/privacy_policy.md)
├── app-ads.txt           # AdMob verification
├── .nojekyll             # Serve files as-is on GitHub Pages
└── assets/
    ├── style.css         # Colors from the app's Color.kt ("Electric Arcade", dark scheme)
    ├── main.js           # Nav, Daily Hunt number, practice puzzle
    ├── icon-512.png      # App icon rendered from ic_launcher_foreground.xml
    └── og-image.png      # 1200 × 630 social preview
```

## Deploying

1. Create the repo `sprintmobileapps/digithunt-website` and push this folder to `main`.
2. Settings → Pages → Deploy from a branch → `main`, `/ (root)`.
3. The site goes live at `https://sprintmobileapps.github.io/digithunt-website/`.

If you pick a different repo name, update the canonical, Open Graph and JSON-LD URLs in both HTML files.

## Keeping it in sync with the app

These pieces mirror app code. Update them when the app changes:

| Website | App source |
|---|---|
| Campaign world list (`index.html#modes`) | `LevelGenerator.WORLD_CONFIGS` and `world_N_name` strings |
| Daily Hunt number (`main.js`) | `LevelGenerator.DAILY_EPOCH` (9 Oct 2026) |
| Practice puzzle rules (4 digits, 6 guesses) | `DAILY_DIGIT_COUNT`, `DAILY_ATTEMPT_LIMIT` |
| Theme swatches | `TileColorThemes` in `Color.kt` |
| Privacy policy | `store/privacy_policy.md`, permissions in the merged manifest |
