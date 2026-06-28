# Archy & Dad Cactus Co. — website

A multi-page static site with the **San Pedro Sprint** game on the home page.

## Files
- `index.html` — home: hero, banner, game, high-score board, reward cards
- `story.html` — your grow-from-seed journey
- `kit.html` — the kit; auto-applies game discounts to the price
- `contact.html` — waitlist / contact form
- `css/style.css` — all styling
- `js/game.js` — the game + reward logic
- `js/leaderboard.js` — high-score storage (local now, Supabase-ready)
- `assets/logo.png` — drop your logo here (falls back to an emoji if absent)

## Rewards (already wired)
- Grab the floating tag mid-run → **5% off**
- Collect **25 water + 15 suns** in a run → **+5% off**
- Discounts cap at **10%** and auto-apply on the Kit page
- **Beat the high score → free shipping**

## To go live
1. **Logo:** save your transparent logo as `assets/logo.png`.
2. **Price:** edit `KIT_PRICE` near the bottom of `kit.html`.
3. **Waitlist form:** create a free form at formspree.io and replace
   `your-form-id` in `contact.html` (action URL).
4. **Global leaderboard:** follow the setup steps at the top of
   `js/leaderboard.js` (free Supabase project) and paste in your URL + key.
   Until then, scores save per-device so the site still works.
5. **Hosting:** upload the whole folder to any static host (Netlify, Cloudflare
   Pages, GitHub Pages) and point archyanddad.com.au at it.
6. **ABN:** replace `[your ABN here]` in the footers when you have it.
