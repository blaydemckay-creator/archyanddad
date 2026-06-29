/* Archy & Dad Mushroom Co. — Leaderboard (separate board from the cactus game)
   To enable the SHARED global board, in your Supabase SQL editor run:

     create table mushroom_highscores (
       id bigint generated always as identity primary key,
       name text not null, score int not null,
       created_at timestamptz default now()
     );
     alter table mushroom_highscores enable row level security;
     create policy "anyone can read"   on mushroom_highscores for select using (true);
     create policy "anyone can insert" on mushroom_highscores for insert with check (true);

   Until then it falls back to this browser's local storage. */
const MLEADERBOARD_CONFIG = {
  supabaseUrl: 'https://dvrrukhnzwcaqddijirx.supabase.co',
  supabaseAnonKey: 'sb_publishable_NXVogwBYIcfuJCps9bmd8g_x3aesZ51',
  table: 'mushroom_highscores'
};

const MLeaderboard = (function(){
  const LS_KEY = 'mush_leaderboard';
  const cfg = MLEADERBOARD_CONFIG;
  const online = () => cfg.supabaseUrl && cfg.supabaseAnonKey;
  function localTop(limit){ let a=[]; try{ a=JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){} a.sort((x,y)=>y.score-x.score); return a.slice(0,limit); }
  function localAdd(name,score){ let a=[]; try{ a=JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){} a.push({name,score,created_at:Date.now()}); a.sort((x,y)=>y.score-x.score); a=a.slice(0,50); try{ localStorage.setItem(LS_KEY, JSON.stringify(a)); }catch(e){} }
  async function top(limit){ limit=limit||10;
    if(online()){ try{ const url=`${cfg.supabaseUrl}/rest/v1/${cfg.table}?select=name,score&order=score.desc&limit=${limit}`;
      const r=await fetch(url,{headers:{apikey:cfg.supabaseAnonKey,Authorization:`Bearer ${cfg.supabaseAnonKey}`}}); if(r.ok) return await r.json(); }catch(e){} }
    return localTop(limit); }
  async function submit(name,score){ name=(name||'Anonymous').toString().slice(0,16); score=Math.max(0,parseInt(score,10)||0);
    if(online()){ try{ const url=`${cfg.supabaseUrl}/rest/v1/${cfg.table}`;
      const r=await fetch(url,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:`Bearer ${cfg.supabaseAnonKey}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify([{name,score}])});
      if(r.ok){ localAdd(name,score); return true; } }catch(e){} }
    localAdd(name,score); return true; }
  return { top, submit, isOnline:online };
})();
