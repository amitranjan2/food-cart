# Vendor app design rules

One scheme across every screen: **slate on sky**. Tokens live in `src/theme`, shared parts in `src/ui`. Screens use
those, not their own hex values, font sizes or buttons.

## Layers
| Layer | Token | Used for |
|---|---|---|
| Page | `colors.page` (sky) | Behind everything: login, orders, menu, settings |
| Surface | `colors.surface` (white) | Cards on the page, sheets, dialogs |
| Tint | `colors.tint` | Fields, rows and icon buttons **inside** a surface; photo placeholders |
| Panel | `Panel` (white + `colors.line` border) | A group inside a surface (a variant, the category list) |

A field on the bare page (login, menu search) uses `tone="surface"` instead of tint.

## Colour
- `primary` (slate) is the only action colour: header, primary buttons, selected chips, switches.
- `text` for titles and values, `muted` for hints and meta, `faint` for placeholders.
- `link` only for text links ("Check on map", "+ Add as a new category").
- Meaning colours (`success`, `danger`, `warning`, `info`, `orange`, `purple`) only in `Badge`s and errors.

## Type (`typography`)
`display` 24 page titles · `title` 18 sheet and dialog titles · `heading` 16 sections and card names · `body` 14 ·
`small` 13 hints · `caption` 12 meta · `overline` 11 caps, the only uppercase text. Nothing below 11 px.
Labels are **sentence case**: "Save order", "Mark ready", "Non-veg".

## Shape
Radius `sm` 8 (small buttons, icon buttons, time cells) · `md` 12 (buttons, fields, rows) · `lg` 16 (cards) ·
`sheet` 20 · `pill` (chips, badges). One card shadow (`shadow`).

## Parts
- `PageHeading`: overline + title + actions, top of every tab (Orders, Menu, Settings).
- `Button`: `primary` / `secondary` / `danger` / `quiet`, `md` (48) for main actions, `sm` (36) in cards and headings.
  `IconButton` for icon-only actions.
- `Badge` for states (order status, Pickup, Open); `Chip` for choices (filters, days, times).
- `Sheet` for every bottom sheet (title, close, optional back, hint, fixed footer); `ConfirmDialog` before anything
  that can't be undone.
- `Field` / `FieldButton` for every input and picker.
- `Icon` (line icons) instead of emoji or text arrows. The dish-action PNGs (edit, copy, pause, delete, add) stay.
