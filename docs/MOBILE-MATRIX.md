# Gather — mobile device matrix

How we design and check the **web + PWA shell** on phones, tablets, foldables, and Linux browsers. Not a native App Store / Play Store app. **No service worker** caches bookings (stale Attend would be unsafe).

Colour and tokens stay blush / berry ([`DECISIONS.md`](../DECISIONS.md)). §16 boards are **flow only** — no teal chrome ([`context.md`](../context.md) §16 archive).

## Profiles

| Profile | Width × height (approx) | Engine | Notes |
| --- | --- | --- | --- |
| Candybar | 320×568, 360×640 | Chrome / Android WebView | Min supported width |
| Phone | 390×844, 428×926 | Mobile Safari, Chrome | Primary |
| Landscape phone | 844×390 | Both | Compact tab bar; week scroll height |
| Phablet | 412×915 | Samsung Internet | Slightly wider chips |
| Tablet | 768×1024, 820×1180 | Safari iPad, Chrome tablet | Month grid + day agenda side by side |
| Fold / Duo unfolded | ~717×512 or dual panes | Chrome | Optional `horizontal-viewport-segments` |
| Linux | 1280×800, 1366×768 | Firefox + Chromium | Desktop nav; no phone tab bar |

## Automated checks

Playwright projects in [`playwright.config.ts`](../playwright.config.ts):

| Project | What runs |
| --- | --- |
| `chromium-desktop` | Full e2e suite |
| `chromium-phone` | Full e2e suite |
| `webkit-phone` | Full e2e suite (real WebKit) |
| `chromium-candybar` | [`e2e/mobile-matrix.spec.ts`](../e2e/mobile-matrix.spec.ts) |
| `chromium-landscape` | mobile-matrix only |
| `chromium-tablet` | mobile-matrix only |
| `firefox-desktop` | mobile-matrix only |

Layout asserts: no horizontal overflow; month agenda present; day tap keeps `view=month`; week scroll allows pan-x; manifest linked.

UI stress seed: `SEED_UI_STRESS=1` (wired in e2e webServer and CI) adds long titles, a 12-event day, pending long URL, and a long member name.

```bash
npm run test:e2e
# Local Chromium-only (system Chrome), if WebKit/Firefox install is slow:
npx playwright test --project=chromium-desktop --project=chromium-phone \
  --project=chromium-candybar --project=chromium-landscape --project=chromium-tablet
```

CI installs Chromium + WebKit + Firefox and runs every project.

## Manual hardware gate (for ~9/10 UX score)

Optional but required before calling phone UX “done” for stakeholders:

1. [ ] iPhone Safari — Home, Calendar month (agenda), Attend, landscape once
2. [ ] Android Chrome — same paths; soft keyboard on login (no zoom)
3. [ ] One tablet — month grid + agenda side by side
4. [ ] Add to Home Screen once — blush theme-color; **no** offline booking cache expected
5. [ ] Linux Firefox — calendar month + map tiles load

## What “good” looks like on a phone

- Month cells: counts / category dots, not squashed titles
- Selected day: full-title list under the grid (`MonthDayAgenda`)
- Map starts collapsed on ≤700px so the agenda fits above the fold
- Tab bar clears the home indicator (`safe-area-inset-bottom`)
- Inputs stay ≥16px so iOS does not zoom
