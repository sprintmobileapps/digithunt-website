# Digit Hunt — Official Website

GitHub Pages site for the **Digit Hunt** Android app (`com.sprintapps.digithunt`).

Serves as:
- Google Play developer website and marketing page
- Privacy Policy hosting (link it from Play Console → App content → Privacy policy)
- Terms of Service hosting (link it from Play Console → App-level trader status and Terms of Service)
- AdMob `app-ads.txt` (publisher `pub-7995936388116429`, same account as ShrinkIt)

## File structure

```
digithunt-website/
├── index.html            # Landing page with a playable practice puzzle
├── privacy-policy.html   # Privacy Policy (started from DigitHunt/store/privacy_policy.md; this page is now the newer one)
├── terms-of-service.html # Terms of Service (Pro, Digit packs, Digits, fair play, consumer rights)
├── delete-data.html      # Data deletion steps for the Play Data safety form
├── app-ads.txt           # AdMob verification
├── .nojekyll             # Serve files as-is on GitHub Pages
└── assets/
    ├── style.css         # "Arcade Pop": the Play Store screenshots' look, board colours from BoardColors.kt
    ├── main.js           # Nav, Daily Hunt number, practice puzzle, colorblind switch, screens rail
    ├── fonts/            # Lilita One + Fredoka (OFL), self-hosted, same files as store/screenshots/fonts
    ├── screens/          # App captures from store/screenshots/raw/phone, 540 px wide WebP
    ├── pro-icon.webp     # store/graphics/product-icon-pro-1080.png at 256 px
    ├── icon-512.png      # App icon rendered from ic_launcher_foreground.xml
    └── og-image.png      # 1200 × 630 social preview, the feature graphic's layout
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
| Tile, key and colorblind colours (`style.css`) | `BoardColors.kt`, `TileCorrectCB` / `TilePresentCB` in `Color.kt` |
| Theme swatches | `TileColorThemes` in `Color.kt` |
| Screens rail (`assets/screens/`) | `store/screenshots/raw/phone/` (re-export with `cwebp -q 82 -resize 540 0`) |
| Pro perks (index, FAQ, terms section 6) | Paywall strings (`paywall_perk_*`), `ShopItem.isProOnly` |
| Digit packs, sales (terms section 6) | `store/iap_products.md`, `BillingManager` |
| Free play needs a connection (FAQ, terms section 8) | RC `offline_restriction_mode`, `OfflineGate` |
| Achievements count (24), reminder times | `Achievement.kt`, `notifications_*` strings |
| Privacy policy | Permissions in the merged manifest, `TrustedClock` (the date check in section 6) |
