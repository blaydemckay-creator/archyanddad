/* Archy & Dad Mushroom Co. — Match the Mushrooms (progressive memory + kit rewards) */
(function(){
  const board = document.getElementById('mgBoard');
  if(!board) return;
  const elRound = document.getElementById('mgRound');
  const elScore = document.getElementById('mgScore');
  const elBest  = document.getElementById('mgBest');
  const elLives = document.getElementById('mgLives');
  const overlay = document.getElementById('mgOverlay');
  const ov      = document.getElementById('mgOv');
  const toastEl = document.getElementById('mgToast');

  // ---- mushroom artwork (distinct picture per species) ----
  const SHADOW='<ellipse cx="50" cy="93" rx="24" ry="5" fill="rgba(0,0,0,.10)"/>';
  function spotsM(){ return '<ellipse cx="40" cy="42" rx="4.5" ry="3.5" fill="rgba(255,255,255,.85)"/><ellipse cx="59" cy="36" rx="5" ry="4" fill="rgba(255,255,255,.85)"/><ellipse cx="50" cy="50" rx="3.4" ry="2.8" fill="rgba(255,255,255,.8)"/>'; }
  function dome(sp,flat){
    const ry = flat?15:24;
    return SHADOW
      +'<rect x="43" y="50" width="14" height="40" rx="6" fill="'+sp.stem+'"/>'
      +'<path d="M22,58 A28,'+ry+' 0 0 1 78,58 Z" fill="'+sp.cap+'"/>'
      +(sp.spots?spotsM():'');
  }
  function fan(sp){
    function shell(cx,cy,r,rot){ return '<g transform="rotate('+rot+' '+cx+' '+cy+')"><path d="M'+(cx-r)+','+cy+' Q'+cx+','+(cy-r*0.95)+' '+(cx+r)+','+cy+' Q'+cx+','+(cy+r*0.5)+' '+(cx-r)+','+cy+' Z" fill="'+sp.cap+'" stroke="rgba(0,0,0,.06)"/></g>'; }
    return SHADOW+'<rect x="44" y="60" width="9" height="26" rx="4" fill="'+sp.stem+'"/>'+shell(44,58,20,-14)+shell(57,50,16,10)+shell(40,46,13,-4);
  }
  function pom(sp){
    let s=SHADOW+'<rect x="45" y="64" width="10" height="24" rx="5" fill="'+sp.stem+'"/>';
    s+='<circle cx="50" cy="50" r="25" fill="'+sp.cap+'"/>';
    [[34,44],[40,32],[52,28],[64,34],[70,46],[66,60],[36,60],[50,66],[60,62],[28,52]].forEach(b=> s+='<circle cx="'+b[0]+'" cy="'+b[1]+'" r="6" fill="'+sp.cap+'"/>');
    s+='<g stroke="rgba(0,0,0,.10)" stroke-width="1.3">';
    for(let x=40;x<=60;x+=5) s+='<line x1="'+x+'" y1="48" x2="'+x+'" y2="66"/>';
    return s+'</g>';
  }
  function enoki(sp){
    let s=SHADOW; [40,46,50,54,60].forEach((x,i)=>{ const top=26+(i%2)*4; s+='<rect x="'+(x-2.2)+'" y="'+top+'" width="4.4" height="'+(66-top)+'" rx="2.2" fill="'+sp.stem+'"/><circle cx="'+x+'" cy="'+top+'" r="4.2" fill="'+sp.cap+'"/>'; });
    return s;
  }
  function king(sp){
    return SHADOW+'<path d="M38,88 Q35,54 42,42 Q50,36 58,42 Q65,54 62,88 Z" fill="'+sp.stem+'"/>'
      +'<path d="M41,44 A11,8 0 0 1 59,44 Z" fill="'+sp.cap+'"/>';
  }
  function ruffle(sp){
    let s=SHADOW+'<rect x="45" y="66" width="10" height="22" rx="4" fill="'+sp.stem+'"/>';
    for(let i=0;i<3;i++){ const y=44+i*9; s+='<path d="M22,'+y+' Q36,'+(y-8)+' 50,'+y+' Q64,'+(y-8)+' 78,'+y+' Q80,'+(y+3)+' 74,'+(y+7)+' Q50,'+(y+11)+' 26,'+(y+7)+' Q20,'+(y+3)+' 22,'+y+' Z" fill="'+sp.cap+'" opacity="'+(0.72+i*0.09)+'"/>'; }
    return s;
  }
  function reishi(sp){
    return SHADOW+'<path d="M28,64 Q24,44 44,40 Q66,36 76,52 Q80,63 70,67 Q48,71 30,65 Z" fill="'+sp.cap+'"/>'
      +'<path d="M40,50 Q55,46 68,55" stroke="rgba(255,255,255,.35)" stroke-width="3" fill="none"/>';
  }
  function art(sp){
    let inner;
    switch(sp.shape){
      case 'fan': inner=fan(sp); break;
      case 'pom': inner=pom(sp); break;
      case 'enoki': inner=enoki(sp); break;
      case 'king': inner=king(sp); break;
      case 'ruffle': inner=ruffle(sp); break;
      case 'reishi': inner=reishi(sp); break;
      case 'flat': inner=dome(sp,true); break;
      default: inner=dome(sp,false);
    }
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'+inner+'</svg>';
  }

  const SPECIES = [
    {n:'Oyster',      shape:'fan',    cap:'#c4cec7', stem:'#e8e2d2', bg:'#eef2ef'},
    {n:'Lion’s Mane', shape:'pom',    cap:'#f1e6c8', stem:'#e3d4b4', bg:'#fbf5e6'},
    {n:'Shiitake',    shape:'dome',   cap:'#8a5a3b', stem:'#e7d6bf', bg:'#f3e7d6', spots:true},
    {n:'King Oyster', shape:'king',   cap:'#b98d5c', stem:'#ece3d2', bg:'#f4eddd'},
    {n:'Enoki',       shape:'enoki',  cap:'#efe6c7', stem:'#f3eee0', bg:'#f8f4ea'},
    {n:'Portobello',  shape:'flat',   cap:'#6b4a35', stem:'#d8c6ad', bg:'#ece0cf'},
    {n:'Chestnut',    shape:'dome',   cap:'#b5653f', stem:'#ecdcc6', bg:'#f5e3d4'},
    {n:'Pink Oyster', shape:'fan',    cap:'#ee9fb1', stem:'#f6e6ea', bg:'#fce8ee'},
    {n:'Golden',      shape:'fan',    cap:'#f0bf3c', stem:'#f4ebcf', bg:'#fbf2cf'},
    {n:'Maitake',     shape:'ruffle', cap:'#9a8158', stem:'#cdbf9e', bg:'#efe8d8'},
    {n:'Wine Cap',    shape:'dome',   cap:'#8a3a4b', stem:'#e6d2c2', bg:'#f3dde2'},
    {n:'Reishi',      shape:'reishi', cap:'#a4382a', stem:'#caa07a', bg:'#f5dcd6'}
  ];

  let best = 0;
  try{ best = parseInt(localStorage.getItem('adm_best')||'0',10)||0; }catch(e){}
  if(elBest) elBest.textContent = best;

  // ---- mushroom-kit rewards (separate from the cactus game) ----
  function loadReward(){ try{ return Object.assign({discount:0,freeShipping:false}, JSON.parse(localStorage.getItem('adm_reward')||'{}')); }catch(e){ return {discount:0,freeShipping:false}; } }
  function saveReward(r){ try{ localStorage.setItem('adm_reward', JSON.stringify(r)); }catch(e){} }
  function bankDiscount(p){ const r=loadReward(); r.discount=Math.min(10,(r.discount||0)+p); saveReward(r); updateRewardBadge(); return r.discount; }
  function shipUnlocked(){ try{ return localStorage.getItem('ad_freeship')==='1'; }catch(e){ return false; } }
  function bankShipping(){ if(shipUnlocked()) return false; try{ localStorage.setItem('ad_freeship','1'); }catch(e){} updateRewardBadge(); return true; }
  function updateRewardBadge(){
    const el=document.getElementById('mgReward'); if(!el) return;
    const r=loadReward(); const ship=shipUnlocked();
    if(!r.discount && !ship){ el.style.display='none'; return; }
    el.style.display='block';
    el.innerHTML='🏷️ Unlocked: '
      +(r.discount?('<strong>'+r.discount+'% off</strong> your mushroom kit'):'')
      +(r.discount&&ship?' &nbsp;·&nbsp; ':'')
      +(ship?'<strong>free shipping</strong> on your whole order':'')
      +' — applied when kits launch.';
  }

  function toast(msg){ if(!toastEl) return; toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),1700); }

  const M_START=[
    "Press Start — match the mushrooms! 🍄",
    "Match the 🏷️ card in round 4 for 5% off!",
    "Top the high score for free shipping! 🚚"
  ];
  const M_TIPS=[
    "Oyster mushrooms grow on used coffee grounds! ☕",
    "Lion’s Mane looks like a fuzzy white pom-pom!",
    "Mushrooms fruit in days — way faster than a cactus 🍄",
    "Mist them daily and they pop up almost overnight!",
    "Keep your grow jar out of direct sun.",
    "Some gourmet mushrooms double in size every day!",
    "Shiitake love a humid jar — but give ’em fresh air too.",
    "Find two of the same to clear them — you’ve got this!"
  ];
  const M_OVER=[
    "Good growing! Have another go 🍄",
    "Top the score for free shipping! 🚚",
    "Your memory gets sharper every run!"
  ];
  function showBubble(text, ms){
    const el=document.getElementById('mushBubble'); if(!el) return;
    el.innerHTML='<span class="who">Archy:</span> '+text;
    el.classList.add('show');
    if(showBubble._t) clearTimeout(showBubble._t);
    if(ms) showBubble._t=setTimeout(()=>el.classList.remove('show'), ms);
  }
  let tipTimer=null;
  function startTips(){ stopTips(); if(typeof setInterval!=='function') return; tipTimer=setInterval(()=>{ if(S.active && !S.busy) showBubble(M_TIPS[Math.floor(Math.random()*M_TIPS.length)], 4500); }, 6500); }
  function stopTips(){ if(tipTimer && typeof clearInterval==='function'){ clearInterval(tipTimer); } tipTimer=null; }

  const S = { round:1, score:0, lives:5, deck:[], flipped:[], busy:false,
              matched:0, boardsCleared:0, active:false, bestAtStart:0 };

  function pairsForRound(r){ return Math.min(8, 1 + r); }
  function revealMs(r){ return Math.max(1100, 2600 - (r-1)*180); }
  function colsFor(n){ return ({4:2,6:3,8:4,10:5,12:4,14:5,16:4})[n] || Math.ceil(Math.sqrt(n)); }
  function rewardForRound(r){ if(r===4||r===15) return 5; return 0; }

  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  function buildDeck(nPairs, rewardPts){
    const cards=[];
    let speciesNeeded=nPairs;
    if(rewardPts){ speciesNeeded=nPairs-1; cards.push({reward:rewardPts,sid:'RWD'}); cards.push({reward:rewardPts,sid:'RWD'}); }
    const ids = shuffle(SPECIES.map((_,i)=>i)).slice(0,speciesNeeded);
    ids.forEach(id=>{ cards.push({sid:id}); cards.push({sid:id}); });
    return shuffle(cards);
  }

  function setHud(){
    if(elRound) elRound.textContent = S.round;
    if(elScore) elScore.textContent = S.score;
    if(elLives) elLives.textContent = '❤️'.repeat(Math.max(0,S.lives)) || '—';
    if(S.score>best){ best=S.score; if(elBest)elBest.textContent=best; try{localStorage.setItem('adm_best',String(best));}catch(e){} }
  }

  function renderBoard(){
    const n = S.deck.length;
    board.style.gridTemplateColumns = 'repeat('+colsFor(n)+', minmax(58px, 104px))';
    board.innerHTML = '';
    S.deck.forEach((card,i)=>{
      const el = document.createElement('div');
      el.className = 'mg-card';
      let front;
      if(card.reward){
        front = '<div class="mg-face mg-front reward"><span class="rtag">🏷️</span><span class="nm">'+card.reward+'% OFF</span></div>';
      } else {
        const sp = SPECIES[card.sid];
        front = '<div class="mg-face mg-front" style="background:'+sp.bg+'"><div class="pic">'+art(sp)+'</div><span class="nm">'+sp.n+'</span></div>';
      }
      el.innerHTML = '<div class="mg-inner"><div class="mg-face mg-back">🍄</div>'+front+'</div>';
      el.addEventListener('click', ()=>onCard(i));
      card.el = el;
      board.appendChild(el);
    });
  }

  function newBoard(){
    S.deck = buildDeck(pairsForRound(S.round), rewardForRound(S.round));
    S.flipped = []; S.matched = 0; S.busy = true;
    renderBoard(); setHud();
    S.deck.forEach(c=>c.el.classList.add('show'));
    setTimeout(()=>{ S.deck.forEach(c=>{ if(!c.matched) c.el.classList.remove('show'); }); S.busy=false; }, revealMs(S.round));
  }

  function onCard(i){
    if(!S.active || S.busy) return;
    const card = S.deck[i];
    if(card.matched || S.flipped.indexOf(i)>=0) return;
    card.el.classList.add('show');
    S.flipped.push(i);
    if(S.flipped.length===2){
      S.busy = true;
      const [a,b] = S.flipped;
      const same = (S.deck[a].sid===S.deck[b].sid);
      if(same){
        setTimeout(()=>{
          S.deck[a].matched = S.deck[b].matched = true;
          S.deck[a].el.classList.add('matched'); S.deck[b].el.classList.add('matched');
          S.matched += 1; S.score += 50;
          if(S.deck[a].reward){ bankDiscount(S.deck[a].reward); toast('🏷️ '+S.deck[a].reward+'% off your mushroom kit unlocked!'); showBubble('🏷️ '+S.deck[a].reward+'% off your mushroom kit!', 3200); }
          else if(Math.random()<0.35){ showBubble('Nice pair! 🍄', 2200); }
          S.flipped = []; S.busy = false; setHud();
          if(S.matched === S.deck.length/2) boardClear();
        }, 360);
      } else {
        S.lives -= 1; setHud();
        S.deck[a].el.classList.add('bad'); S.deck[b].el.classList.add('bad');
        setTimeout(()=>{
          [a,b].forEach(k=>{ S.deck[k].el.classList.remove('show','bad'); });
          S.flipped = []; S.busy = false;
          if(S.lives<=0) gameOver();
        }, 720);
      }
    }
  }

  function boardClear(){
    S.boardsCleared += 1;
    S.score += S.round*40;
    S.lives = Math.min(9, S.lives+2);
    setHud();
    showBubble('Board cleared! Two more cards… 🍄', 2600);
    setTimeout(()=>{ S.round += 1; newBoard(); }, 700);
  }

  function showOverlay(html){ ov.innerHTML = html; overlay.classList.remove('hidden'); }
  function hideOverlay(){ overlay.classList.add('hidden'); }

  function startGame(){
    S.round=1; S.score=0; S.lives=5; S.boardsCleared=0; S.active=true; S.bestAtStart=best;
    hideOverlay(); newBoard();
    showBubble(M_START[Math.floor(Math.random()*M_START.length)], 0); startTips();
  }

  function gameOver(){
    S.active=false; setHud(); stopTips();
    let ship='';
    if(S.score>S.bestAtStart && S.score>0){ if(bankShipping()) ship='<br>🚚 New high score — <strong>free shipping on your whole order</strong> unlocked!'; }
    showBubble(M_OVER[Math.floor(Math.random()*M_OVER.length)], 0);
    showOverlay('<div class="mg-ovcard"><h3>Out of guesses! 🍄</h3>'+
      '<p>Round <strong>'+S.round+'</strong> &nbsp;·&nbsp; ⭐ <strong>'+S.score+'</strong> &nbsp;·&nbsp; Best '+best+ship+'</p>'+
      '<div class="namebox"><input id="mgName" maxlength="16" placeholder="Your name for the board"><button class="btn green" id="mgSave" style="padding:11px 20px">Save score</button></div>'+
      '<div class="hint" id="mgSaveMsg" style="opacity:.85"></div>'+
      '<button class="btn" id="mgPlay">Play again</button></div>');
    const pb=document.getElementById('mgPlay'); if(pb) pb.addEventListener('click', startGame);
    const sb=document.getElementById('mgSave');
    if(sb) sb.addEventListener('click', async ()=>{
      const nm=(document.getElementById('mgName').value||'').trim()||'Anonymous';
      const msg=document.getElementById('mgSaveMsg'); if(msg) msg.textContent='Saving…';
      try{ if(window.MLeaderboard) await window.MLeaderboard.submit(nm, S.score); }catch(e){}
      if(msg) msg.textContent='Saved! 🍄';
      if(window.renderMLB) window.renderMLB();
      sb.disabled=true;
    });
  }

  function startInput(e){
    if(S.active) return;
    if(e.type==='keydown' && e.code!=='Space') return;
    if(e.preventDefault) e.preventDefault();
    startGame();
  }
  window.addEventListener('keydown', startInput);
  if(overlay) overlay.addEventListener('pointerdown', (e)=>{ if(!S.active && e.target.id!=='mgPlay') startGame(); });

  updateRewardBadge();
  showOverlay('<div class="mg-ovcard"><h3>Match the Mushrooms 🍄</h3>'+
    '<p>The cards flash, then flip face-down — find every matching pair! Each round adds two more cards. Match the 🏷️ reward card in rounds 4 &amp; 15 for discounts, and set a high score for free shipping — all toward your mushroom kit.</p>'+
    '<button class="btn" id="mgStart">Start growing</button></div>');
  (function(){ const b=document.getElementById('mgStart'); if(b) b.addEventListener('click', startGame); })();
  showBubble(M_START[0], 0);
})();
