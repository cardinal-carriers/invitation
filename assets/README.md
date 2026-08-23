# Card artwork

Drop a card template in here and the invitation paints it behind the text.

    assets/card.png        (or .jpg / .webp — any name, it is referenced by
                            the CSS variable below, not by convention)

Then switch it on by adding a `:root` block to the `<style>` in `index.html`:

```css
:root{
  --card-art: url('assets/card.png');
  --card-art-size: cover;    /* or 100% 100% to stretch to the sheet exactly */
  --card-art-pos: center;
  --card-art-rule: none;     /* drop vellum's dashed inset border — most
                                templates bring a frame of their own */
}
```

Until `--card-art` is set nothing is requested, so an empty `assets/` costs a
guest nothing. That matters here: this page is opened on phones over cellular
inside WhatsApp's in-app browser, and the whole page is budgeted at 300KB.

## What makes a good file

- **Portrait**, and roughly the shape of the sheet — it is about 3:4 on a
  phone and taller on a desktop. `cover` crops the overflow from the centre.
- **Under ~150KB.** Export as WebP if you can; the three fonts already spend
  170KB of the budget. A 2MB PNG will be the slowest thing on the page by an
  order of magnitude.
- **Quiet in the middle.** The occasion, the honouree's name and the details
  all sit centred over it. Artwork with a busy centre will fight the text and
  the text will lose.
- **No text of its own.** The card prints the real date and address from
  Firestore; a template with dates baked in will contradict them.

Send the file over and the padding and crop can be tuned to it — the defaults
above are a starting point, not a fit.
