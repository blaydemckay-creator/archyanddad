/* ============================================================
   Archy & Dad Cactus Co. — Leaderboard
   ------------------------------------------------------------
   Works out of the box using this browser's local storage.
   To make it a SHARED, global leaderboard everyone can see,
   fill in the Supabase settings below (free tier is plenty).

   Setup (about 5 minutes):
   1. Create a free project at https://supabase.com
   2. In the SQL editor, run:

        create table highscores (
          id bigint generated always as identity primary key,
          name text not null,
          score int not null,
          created_at timestamptz default now()
        );
        alter table highscores enable row level security;
        create policy "anyone can read"  on highscores for select using (true);
        create policy "anyone can insert" on highscores for insert with check (true);

   3. In Project Settings > API, copy the Project URL and the
      "anon public" key, and paste them below.
   ============================================================ */
const LEADERBOARD_CONFIG = {
  supabaseUrl: 'https://dvrrukhnzwcaqddijirx.supabase.co',
  supabaseAnonKey: 'sb_publishable_NXVogwBYIcfuJCps9bmd8g_x3aesZ51',
  table: 'highscores'
};

const Leaderboard = (function(){
  const LS_KEY = 'sps_leaderboard';
  const cfg = LEADERBOARD_CONFIG;
  const online = () => cfg.supabaseUrl && cfg.supabaseAnonKey;

  function localTop(limit){
    let arr=[];
    try{ arr = JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){}
    arr.sort((a,b)=>b.score-a.score);
    return arr.slice(0,limit);
  }
  function localAdd(name,score){
    let arr=[];
    try{ arr = JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){}
    arr.push({name:name, score:score, created_at:Date.now()});
    arr.sort((a,b)=>b.score-a.score);
    arr = arr.slice(0,50);
    try{ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }catch(e){}
  }

  async function top(limit){
    limit = limit||10;
    if(online()){
      try{
        const url = `${cfg.supabaseUrl}/rest/v1/${cfg.table}?select=name,score&order=score.desc&limit=${limit}`;
        const r = await fetch(url, { headers:{ apikey:cfg.supabaseAnonKey, Authorization:`Bearer ${cfg.supabaseAnonKey}` }});
        if(r.ok) return await r.json();
      }catch(e){ /* fall through to local */ }
    }
    return localTop(limit);
  }

  async function submit(name, score){
    name = (name||'Anonymous').toString().slice(0,16);
    score = Math.max(0, parseInt(score,10)||0);
    if(online()){
      try{
        const url = `${cfg.supabaseUrl}/rest/v1/${cfg.table}`;
        const r = await fetch(url, {
          method:'POST',
          headers:{ apikey:cfg.supabaseAnonKey, Authorization:`Bearer ${cfg.supabaseAnonKey}`,
                    'Content-Type':'application/json', Prefer:'return=minimal' },
          body: JSON.stringify([{ name, score }])
        });
        if(r.ok){ localAdd(name,score); return true; }
      }catch(e){ /* fall through */ }
    }
    localAdd(name, score);
    return true;
  }

  return { top, submit, isOnline:online };
})();
