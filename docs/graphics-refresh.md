# Graphics refresh — 3 October 2026

Status: deployed to production on 3 October 2026; Vercel READY.

Production: https://www.smkajerlun.my/ and https://smkajerlun.my/

Deployment: `dpl_2jHdsLJWGFGAofKeNfNj27tZcCtr`

Rollback baseline: `dpl_BnC1RtnxjB2BYLvkPgh4uptsEQ1W`.

## Design and scope

- All 32 navigation SVG icons redrawn with consistent green outlines, mint layers, white surfaces and restrained gold accents.
- All 69 existing illustrations refreshed, including unused legacy vectors. Existing subjects and viewBoxes retained.
- Header geometric SVG patterns and three booking navigation SVGs updated.
- Shared `assets/graphics.css` loaded by 56 pages. Photo/poster media, article galleries, PSS content charts, legacy PSS cards and admin image previews receive matching presentation. Program media uses bounded `object-fit: contain` so entire images remain visible.
- Original raster files, official logo and PWA identity assets preserved. Photo content is not AI regenerated or retouched. Live statistics retain their existing data and rendering logic.
- SVG references and affected CSS/JS URLs have a graphics cache version, including dynamically constructed icon URLs.
- Existing PWA work is preserved. Production deployment was explicitly authorized after local review. No Git commit or push was made.

## Verification

- 101/101 SVG files changed, parse as XML and retain their original viewBox. No embedded raster or script content. Combined size: 83,530 bytes (previously 58,059 bytes).
- All 31 inventoried raster assets retain their original SHA-256 hashes.
- Build passed: JavaScript, HTML, routes, migrations, security and 18 health checks.
- End-to-end suite passed: 66 route/view checks, navigation, school destinations, 19 unit graphics, Asrama and JavaScript-disabled gateway.
- Interface suite passed: 20 routes at 3 widths, program cards, article image links, search and return navigation.
- Admin and shared-login suites passed.
- Graphics browser check passed: homepage, PSS, program, PSS organization and booking at 390 and 1440 pixels. Zero broken images, overflow or JavaScript exceptions; six program frames contain their complete image boxes at both widths.
- Gallery: all 132 images load, and before/after toggle works.
- Existing smoke tests now inspect SVG URL pathnames rather than rejecting valid cache query strings.
- Browser verification used desktop Chrome with responsive viewports; physical iOS/Android devices were not tested.

## Local review and evidence

Preview: http://127.0.0.1:4183/outputs/graphics-20261003/

Evidence directory: `outputs/graphics-20261003/` (ignored, local only).

- `index.html`: interactive before/after gallery.
- `before/`: original assets; `before-source/`: source snapshot before this graphics task.
- `asset-verification.json`: complete inventory, hashes, byte counts and scope.
- `graphics-manifest.json`: graphics-only changed-path hashes, separate from earlier PWA changes.
- `verify.log`: initial build and old SVG-selector failures; `e2e.log` records the corrected suite passing.
- `interface.log`, `admin.log`, `login.log`, `browser-check.log`: passing verification.
- `preview.png`, `home-390.png`, `pss-1440.png`, `program-1440.png` and other screenshots.

Any later production release should use the verified current production baseline plus the graphics manifest. Do not deploy the entire dirty working tree or the local preview/evidence directory.

## Production verification

346/346 deployed source hashes match. 149 public file byte matches, 16 redirects, both domain aliases, PWA headers and access restrictions verified. Live Chrome graphics checks and the 20-route, 3-width interface suite passed. No error entries in the checked 15-minute runtime log window. Evidence: `outputs/graphics-release-20261003/`.
