# Logotypes

## In use

| File             | Where                                                     |
| ---------------- | --------------------------------------------------------- |
| `mark-blue.svg`  | navbar, light theme — via `components/home/BrandLogo.tsx` |
| `mark-white.svg` | navbar in dark theme, and the footer in both              |

Both are the vectorised mark cropped to its artwork (viewBox `25 238 1026 607`)
so it fills its box; the 1081×1081 source floats it in a square of padding.
Neither carries a ground, so the mark takes the colour of the surface it sits
on. They are the same paths in two inks — an `<img>` cannot be recoloured from
CSS, and the mark has to read on white and on near-black alike.

## Full-square exports

| File                   |                                              |
| ---------------------- | -------------------------------------------- |
| `blue.svg`             | blue mark on white, 1081²                    |
| `blue-transparent.svg` | blue mark, no ground                         |
| `white-on-blue.svg`    | white mark on a blue field                   |
| `original.svg`         | as delivered by the vectoriser: red on white |

## Superseded, kept deliberately

`legacy/` holds the logotype the site used before the vectorised mark:

| File                          |                                           |
| ----------------------------- | ----------------------------------------- |
| `legacy/monogram-icon.svg`    | the three-bar monogram, still the favicon |
| `legacy/monogram-favicon.ico` | the same at 16/32/48/64 px                |

The coded lockup itself — the skewed monogram plus the shared-T `Ticket/out`
wordmark — is **not** a file: it lives in `components/home/Marks.tsx` as
`LogoMark` and `WordMark`, and is still what the credit card renders, because
the card's mark takes the employé's chosen ink and an image cannot. Nothing
about it has been deleted.

1081² rasters of it are in `~/Downloads/ticket-tout-logo/wordmark-coded-*.png`.
