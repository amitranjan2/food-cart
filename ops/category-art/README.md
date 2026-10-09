# Category art

Every category in the storefront's "What's on your mind?" row gets one icon in the same style: a single line
drawing of the dish on a round plate (or bowl), dark ink on white. Until a category has an approved icon, the
storefront draws a generic plate.

The work is: **generate → normalise → check → publish**. Generation can happen in Claude, ChatGPT, Gemini or Figma;
the normaliser makes the results match no matter which tool drew them.

## The style (what every icon must look like)

| Rule | Value |
|---|---|
| Canvas | square, 512 × 512 (`viewBox="0 0 512 512"`) |
| Frame | one round plate or bowl, centred, filling about 90 % of the canvas (rim from ~24 to ~488) |
| Lines | one colour `#30404E`, round ends and joins, even thickness (~10 px at 512) |
| Fill | none (white background only); no shading, gradients, shadows or texture |
| Detail | the dish only: 3–8 recognisable elements; no text, logo, hands, table or cutlery |
| View | top-down for plates and thalis, slight front view for bowls and glasses |

Reference images: the three samples (All-in-1, Basic Thali, Mini Rice Bowl) shared on Oct 10. Attach them to every
image-generation request.

## 1. Generate

Replace `{DISH}` with what the category contains, described plainly, e.g. "momos: six pleated dumplings and a small
bowl of red chutney", not just the category name.

### Claude (best: writes the SVG directly, so no tracing step)

Paste into Claude (any model, no attachments needed; attach the references if you have them):

```
You are drawing one icon for a food-ordering app's category row. Output only an SVG file, nothing else.

Subject: {DISH}

Rules (all of them are required):
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">, no width or height attributes.
- Draw a round plate (or a bowl if the dish is served in one) centred at 256,256; its outer rim spans about
  24 to 488.
- Use only stroke, never fill: every element has fill="none" stroke="#30404E" stroke-width="10"
  stroke-linecap="round" stroke-linejoin="round". Small dots for texture (rice grains, spices) may be short
  strokes of length 1.
- Monoline line art, the style of a clean food icon set: 3 to 8 recognisable elements of the dish, simple shapes,
  generous spacing, nothing touching the rim.
- No text, no <text>, <image>, <style>, <script>, gradients, filters, masks or embedded fonts.
- Under 8 KB. Use <path>, <circle>, <ellipse>, <line>, <polyline>, <g> only.

Return the SVG in one code block.
```

Save the code as `{name}.svg`.

### ChatGPT or Gemini (image generators: produce a PNG, then trace it)

Attach the three reference images, then:

```
Draw a single food icon in exactly the same style as the attached reference images.

Subject: {DISH}

- Square image, pure white background.
- One round plate (or bowl) centred, filling about 90% of the image.
- Monoline line art: thin, even, dark slate lines (#30404E), round line ends. No fill, no colour, no shading,
  no gradients, no shadows, no texture.
- Only the dish: 3 to 8 recognisable elements. No text, labels, logo, hands, table, cutlery or background objects.
- Same line thickness and level of detail as the references.
```

Ask for 3 variations and keep the best. Then trace the PNG to SVG with
[vtracer](https://github.com/visioncortex/vtracer) (free; `cargo install vtracer` or its web demo):

```
vtracer --input dish.png --output dish.svg --colormode bw --filter_speckle 8 --mode spline
```

### Figma

- **Figma AI ("Make an image")**: use the ChatGPT/Gemini prompt above, export the result as PNG and trace it as
  above. Or select the generated image, use a vectorise plugin (e.g. "Image Tracer"), and export as SVG.
- **By hand**: draw on a 512 × 512 frame with a 10 px stroke in `#30404E`, round caps, no fills; "Outline stroke"
  is not needed. Export the frame as SVG.

## 2. Normalise

```
node ops/category-art/normalize-svg.mjs dish.svg momos.svg
```

It recolours every line to `#30404E`, removes white backgrounds, and strips anything that could run code or load
other files (scripts, event handlers, links, embedded images, styles). It refuses files that aren't square or
are too large, and prints what it changed.

## 3. Check before publishing

Open the normalised file next to an approved icon (e.g. `momo.svg`) at the size customers see it (68 px):

- [ ] Recognisable at 68 px without the label
- [ ] Plate/bowl the same size and position as the other icons
- [ ] Lines look as thick as the other icons (not hairline, not bold)
- [ ] No text, shading or stray marks
- [ ] Not a near-copy of another category's icon

If two of these fail, regenerate rather than fix by hand.

## 4. Publish

```
MONGODB_URI='mongodb+srv://…' ops/category-art/publish.sh "Mini Rice Bowl" mini-rice-bowl.svg
```

It copies the file to `backend/src/main/resources/static/category-art/<key>.svg` (served by the API at
`/category-art/<key>.svg`) and sets the category's `imageUrl`. Commit the SVG and deploy the backend; until the
deploy, the storefront still shows the drawn plate (a missing file shows nothing broken, only the fallback).
