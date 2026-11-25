# Subhrajit Mukherjee — personal site

Live at **https://subhrajitmkj04.github.io**

Two versions of the same site:

- **Résumé** (`/#hire`): experience, research, projects, skills and education on one page.
- **Play** (`/#play`): five small games (platformer, tower stacker, maze chase, road brawl, drift rally). Each game walks through the same stages and reveals one entry per collectible.

## Editing

All content lives in [`content.js`](content.js). Both versions read from it, so update it in one place and push.
Replace [`cv.pdf`](cv.pdf) to update the downloadable CV.

## Running locally

No build step. Serve the folder with any static server, for example:

```bash
python -m http.server 5173
```

then open http://localhost:5173.
