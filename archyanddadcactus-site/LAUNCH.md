# Launch checklist — archyanddad.com.au

## 1. High-score board (Supabase) — optional but recommended
In your Supabase project → SQL Editor, run:

    create table highscores (
      id bigint generated always as identity primary key,
      name text not null,
      score int not null,
      created_at timestamptz default now()
    );
    alter table highscores enable row level security;
    create policy "anyone can read"   on highscores for select using (true);
    create policy "anyone can insert" on highscores for insert with check (true);

Then Project Settings → API → copy **Project URL** + **anon public** key into the
top of `js/leaderboard.js` (supabaseUrl, supabaseAnonKey). Anon key is safe in site code.

## 2. Deploy to Vercel
- vercel.com → Add New → Project
- Drag-and-drop this `archyanddadcactus-site` folder (or push to GitHub and import)
- Framework preset: **Other** · no build command · output dir = root
- Deploy → test on the free `…vercel.app` URL

## 3. Connect the domain
- Vercel project → Settings → Domains → Add `archyanddad.com.au`
  (also add the `www.` version and the `.com` if you bought it — set one to redirect)
- Add the A/CNAME records Vercel shows you at your registrar's DNS panel
- HTTPS is automatic; propagation = minutes to a few hours

## 4. Content before launch
- [ ] Real ABN in the footers (replace `[your ABN here]`)
- [ ] Real kit price in `kit.html` (KIT_PRICE)
- [ ] Waitlist form: create a form at formspree.io, paste its ID into `contact.html`
- [ ] Add product photos when ready (kit.html, hero)
