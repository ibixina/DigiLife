# DigiLife

```
  ____  _      _   _     _  __     
 |  _ \(_)__ _(_) | |   (_)/ _|___ 
 | | | | / _\` | | | |   | |  _/ -_)
 | |_| | \__, |_| | |___| | | \___|
 |____/|_|___/    |_____|_|_|      
```

🎮 **[Play DigiLife Live! 🕹️](https://ibixina.github.io/DigiLife/)**

DigiLife is a web-based life simulation game inspired by BitLife with card-style yearly decisions and a brutalist retro interface.

## Current Status

- Runtime: vanilla TypeScript + Vite
- Architecture: single state atom + event bus + data-driven content
- **Implemented Systems (Phases 1-4 Complete)**:
  - ✅ **Phase 1**: Foundation (Core Engine & UI)
  - ✅ **Phase 2**: Core stats + passive yearly systems  
  - ✅ **Phase 3**: Activities + high-freedom relationship interactions
  - ✅ **Phase 4**: Education + career progression (Engineering + Law + Wrestling)
  - 🔄 **Phase 7 (partial)**: secret shadow-crime pathway (serial-killer loop)

See `PROGRESS.md` for the full phase checklist.

## Run

```bash
npm install
npm run dev
```

Dev server runs on port `5173`.

## GitHub Pages Deployment

This project can be deployed to GitHub Pages for free hosting:

### Quick Deploy (Manual)
```bash
# Install gh-pages if not already installed
npm install -g gh-pages

# Deploy to GitHub Pages (replace 'DigiLife' with your repo name)
npm run deploy
```

### Automatic Deployment (Recommended)
1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Set Source to "Deploy from a branch"
   - Select "gh-pages" branch, "/ (root)" folder

2. **Automatic builds** (add this to your workflow or use GitHub Actions):
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [ main ]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - uses: actions/setup-node@v2
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run build
         - run: cp dist/index.html dist/404.html
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

### Local Testing
```bash
# Test production build locally
npm run build
npm run preview
```

**Note**: Update `vite.config.ts` base path from `/DigiLife/` to match your repository name.

## Scripts

- `npm run dev` - start local dev server
- `npm test` - compile + run automated unit tests
- `npm run build` - typecheck + production build
- `npm run preview` - serve production build locally

## Core Gameplay Loop

1. Start a new life
2. Age up by one year
3. Process annual systems (education, career, relationships, shadow-risk)
4. Trigger weighted random event content
5. Pick actions (activities, relationships, education, career)
6. Apply effects to stats/flags/resources
7. Continue until death

## Implemented Systems

- Stats: health, happiness, smarts, looks, karma, athleticism, craziness, willpower, fertility
- Relationships:
  - familiarity decay + relationship strength
  - local and remote interactions with known NPCs
  - romance, marriage/divorce, child-rearing
  - violent pathways (plot/attempt/hire-hitman)
- Activities:
  - location + time budget model
  - diminishing returns + activity experience
  - pet adoption/training/care
- Education:
  - school stage progression
  - degree tracks (Engineering + Law)
  - tuition, scholarship, student debt
  - bar exam with annual attempt limit
- Careers:
  - data-driven catalog loading from `src/content/careers/*.json`
  - eligibility filters by age/stats/education/flags
  - hiring, performance, raises, promotions, firing, resignation
  - **Engineering**: software, electrical, molecular, nuclear engineer paths
  - **Law**: legal assistant → paralegal → attorney → prosecutor/public defender → judge
  - **Wrestling**: comprehensive wrestling career with promotions, contracts, storylines
  - indie circuit → major promotions (AEW, WWE) → global free agent
  - backstage roles: booker, promoter, writer, producer
  - contract negotiations, rival offers, fan base building
  - engineering startup path
- Law track:
  - legal assistant/paralegal/attorney/prosecutor/public defender/judge
  - judge requires licensed law-years
- Shadow crime pathway:
  - hidden unlock
  - double-life vs full-time modes
  - contract board + payout/risk
  - heat/notoriety/capture loop

- Events:
  - weighted random event system with conditional triggers
  - age-specific childhood/teen/adult events
  - multi-choice outcomes with stat changes and consequences
  - unique events (spelling bee, first crush, etc.)

## Content-Driven Expansion

The project is designed so most new gameplay is added through JSON, not engine rewrites.

- Careers: add JSON files under `src/content/careers/`
- Shadow contracts: edit `src/content/shadow/serial_contracts.json`
- Events: add JSON under `src/content/events/`

See `docs/CONTENT_AUTHORING.md` for practical schemas and examples.

## Tech and Constraints

- No frontend frameworks
- No backend required for current MVP
- Mobile-first SPA
- Local persistence target: `localStorage` (save/load system still pending)

## Testing

Automated tests currently cover:

- education and bar licensing rules
- career eligibility/progression rules
- law experience gating
- shadow pathway actions and yearly risk
- relationship freedom interactions

The agent workflow requires running:

1. `npm test`
2. `npm run build`

before finishing code changes.
