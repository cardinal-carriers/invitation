# Card artwork

    card-band.webp    1080 × 747, 52 KB

The botanical footer on the invitation. Cropped from the host's own template
(`docs/Jillian & Derrick's Baby Shower.pdf`, gitignored — 721KB and not
needed to build anything).

## How it was made

`pdftoppm -r 300` to render, then in Pillow:

1. **Find the card.** The template is an A4 landscape print-to-PDF with the
   card sitting in the left half. Located by colour: the card body is cream
   (#FEF7EE) against a pure white page.
2. **Crop to rows 715–1462.** Above 715 are the template's own address lines
   — cropped away, not faded, because the page prints the real address from
   Firestore and two addresses on one card is worse than none. Below 1462 is
   the baked-in ©Disney line, which is set as real text in `index.html`
   instead; at card width the printed version is about 8px and illegible.
3. **Fade the top fifth** to alpha, so the band dissolves into the card. The
   artwork's cream is a few points warmer than vellum's `--paper` (#FFFDF8)
   and a hard cut shows that seam.
4. **WebP, quality 86** — 52 KB. PNG was 694 KB.

## How it is switched on

Three variables at the end of the `<style>` in `index.html`:

```css
:root{
  --card-art: url('assets/card-band.webp');
  --card-art-size: 100% auto;
  --card-art-pos: bottom center;
  --card-art-rule: none;   /* drop vellum's dashed inset border */
}
.sheet{padding-bottom:58%}
```

`.sheet::before` paints it as its own layer rather than a fifth entry in
`.paper`'s four-deep background stack. Unset `--card-art` and nothing is
requested at all — no 404, no download.

The `58%` is the one number to re-tune if the art changes. The band is 69% as
tall as the card is wide, and both `background-size:100% auto` and percentage
padding resolve against width — so a single figure clears the artwork at every
screen size with no media query. It is deliberately short of 69% so the last
line settles into the faded top of the band, rather than the card reading as
two stacked panels.

## Replacing it

Portrait or a wide band, under ~150KB, quiet where text sits, and **no text of
its own** — the card prints the real date and address from Firestore, so a
template with details baked in will contradict them.

Current page weight is 255 KB served against a 300 KB budget. The three fonts
are 170 KB of that, so there is roughly 45 KB of headroom for a larger image.
