# Bracket of Death - Site Migration Plan

## Goal
Keep the modern tournament management app design/functionality, but add all public-facing content from bracketofdeath.net. The logo is incorporated — we just need to ensure FAQ, History, and other informational pages exist alongside the tournament management features.

---

## Color Palette (from logo & current site)

### Primary Colors
- **Black**: #000000 (logo text, primary brand color)
- **White/Off-White**: #FFFFFF / #F5F5F5 (backgrounds)
- **Gray**: #808080 (logo skull shading, secondary text)

### Accent Colors (from logo elements)
- **Dark Gray/Charcoal**: #333333 (text, borders)
- **Light Gray**: #E5E5E5 (borders, dividers)

### Current Site Analysis
- Predominantly black text on white background
- Clean, minimal design
- Logo uses skull + tennis rackets motif
- Tagline: "Because Tennis"

---

## Navigation Structure

### Current Site Pages (to migrate)
1. **Home** ✅ (partial - need stats)
   - Hero image with tournament photo
   - "By the Numbers" statistics section
   - Latest news/updates

2. **Events** ❌ (missing)
   - Upcoming tournaments
   - Registration links
   - Past event archive

3. **Rules** ❌ (missing)
   - Tournament format (11-game pro-sets)
   - Round-robin → single elimination
   - Special rules (let serves, late players, etc.)
   - "Don't Be A Jackass" philosophy

4. **FAQ** ❌ (missing)
   - Common questions
   - Contact info

5. **History** ❌ (missing)
   - Tournament archive
   - Past winners
   - Historical stats

6. **Merch** ❌ (WooCommerce shop)
   - T-shirts
   - Tournament gear

7. **Gallery** ❌ (missing)
   - Tournament photos
   - Player galleries

8. **Blog** ❌ (missing)
   - News updates
   - Tournament recaps

9. **My Account** ✅ (exists as profile)
   - User profile
   - Registration history
   - Account settings

---

## Content to Migrate

### Statistics (Home Page)
- 16 Years of Death (est 2009)
- 42 Tournaments
- 51: Average games (round-robin)
- 83: Average games per player
- 90: Avg minutes per 11-game pro-set
- 93.75% chance you won't win
- 117: Avg games (Champions)
- 118: Avg games (Finalists)
- 137: Most games in single BOD
- 147: Theoretical max games
- 480 Different players
- 25,020 Games played
- Link to Google Sheets stats

### Rules Content
```
- Regular scoring (deuce/ad)
- Play let serves (no penalty)
- 11-game pro-sets (first to 11 by 2)
- 11-point Coman tiebreaker at 10-10
- Round-robin (3 matches) → all advance to R16
- Seeding by games won/lost
- Single elimination after round-robin
- New balls each match
- "ACES OF DEATH!" (let cord aces)
- Don't be late / no refunds after drawing party
- Have Fun! Don't Be A Jackass.
```

### Tagline & Branding
- **Primary**: "Bracket of Death"
- **Tagline**: "Because Tennis"
- **Tone**: Competitive but fun, tongue-in-cheek humor

---

## Design System (Keep Existing)

**DO NOT CHANGE** the modern tournament app styling. Just add public content pages that match the existing design system.

### Components to Build (matching current app style)
1. **Statistics Panel** (home page "By the Numbers")
2. **Rules Page** (content-heavy, clean formatting)
3. **Events List** (upcoming tournaments)
4. **Tournament Card** (event display)
5. **Photo Gallery** (responsive grid)
6. **FAQ Accordion** (collapsible Q&A)
7. **History Timeline** (past tournaments)

---

## Technical Migration

### Current Stack (WordPress)
- PHP backend
- MySQL database
- WooCommerce for shop
- User accounts via WP

### New Stack (React + Node)
- ✅ React frontend
- ✅ Node.js/Express backend
- ✅ PostgreSQL database
- ✅ Keycloak auth
- ✅ Tournament bracket system
- ❌ E-commerce (TBD - maybe Stripe integration)
- ❌ Photo gallery
- ❌ Blog/news system

### Data Migration
- Export WordPress posts → migrate to new blog system
- Export WooCommerce products → new shop (if keeping merch)
- Export user accounts → Keycloak import
- Historical tournament data → PostgreSQL

---

## Phase 1: Styling & Branding ✅ (In Progress)
- [x] Add logo to header
- [x] Update favicon
- [ ] Update color scheme to black/white/gray
- [ ] Match typography to original
- [ ] Update gradient/accent colors

## Phase 2: Content Pages
- [ ] Rules page (static content)
- [ ] FAQ page (static content)
- [ ] Home page statistics section
- [ ] About/History page

## Phase 3: Dynamic Features
- [ ] Events listing (upcoming tournaments)
- [ ] Event registration (replace WP forms)
- [ ] Photo gallery
- [ ] Blog/news system

## Phase 4: E-commerce (Optional)
- [ ] Decide on merch strategy
- [ ] Stripe integration for payments
- [ ] Product listings
- [ ] Order management

## Phase 5: Migration
- [ ] Content export from WordPress
- [ ] User migration plan
- [ ] SEO preservation (redirects)
- [ ] DNS cutover plan

---

## Next Steps (Immediate)

1. **Update theme colors**:
   ```tsx
   // tailwind.config.js
   theme: {
     extend: {
       colors: {
         'bod-black': '#000000',
         'bod-gray': '#808080',
         'bod-charcoal': '#333333',
         'bod-light': '#F5F5F5',
       }
     }
   }
   ```

2. **Create Rules page** (high priority - critical content)
3. **Build Statistics component** (home page focal point)
4. **Design FAQ page** (user-facing info)

---

## Questions for Nate
- Keep WooCommerce/merch integration or drop it?
- Priority order for missing pages?
- Keep WordPress blog or build new CMS?
- Timeline for migration?
