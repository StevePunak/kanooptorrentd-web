# Image slots

Drop replacement files in this directory using the filenames below. Vite serves
`public/` as-is from the site root, so no rebuild is needed in dev — refresh
the browser. Production: rerun `npm run build`.

## Slots

| Filename             | Slot                  | Notes |
|----------------------|-----------------------|-------|
| `brand.svg`          | Header brand mark     | Square SVG, ~32x32, single-color (uses `currentColor` for theme tinting). Replace freely. |
| `dashboard-hero.jpg` | Dashboard top banner  | Wide atmospheric image. Recommended ~2400x800. JPG preferred for size. If absent, the page falls back to a CSS gradient. |
| `background.jpg`     | Site-wide background  | Optional. Subtle desert texture, dark. Recommended ~1920x1080. If absent, the body uses the token-based `--color-bg`. |

## Adding new slots

When a page wants a new image slot, follow the pattern:
1. Reference it as `/images/<slot>.<ext>` from CSS or a component
2. Provide a sensible fallback (gradient, color, hidden) when the file is missing
3. Document the filename + recommended dimensions in this table
