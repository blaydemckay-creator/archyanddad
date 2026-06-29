/* Archy & Dad Mushroom Co. — Match the Mushrooms (progressive memory + bonus rounds) */
(function(){
  const board = document.getElementById('mgBoard');
  if(!board) return;
  const elRound = document.getElementById('mgRound');
  const elScore = document.getElementById('mgScore');
  const elBest  = document.getElementById('mgBest');
  const elLives = document.getElementById('mgLives');
  const overlay = document.getElementById('mgOverlay');
  const ov      = document.getElementById('mgOv');

  const SPECIES = [
    {n:'Oyster',      c:'#cfd8d3', t:'#33402e'},
    {n:'Lion’s Mane', c:'#f3ead0', t:'#5a4a2a'},
    {n:'Shiitake',    c:'#8a5a3b', t:'#fff'},
    {n:'King Oyster', c:'#d8c39a', t:'#4a3a1f'},
    {n:'Enoki',       c:'#f2f0e6', t:'#5a5a4a'},
    {n:'Portobello',  c:'#6b4a35', t:'#fff'},
    {n:'Chestnut',    c:'#b5653f', t:'#fff'},
    {n:'Pink Oyster', c:'#f3b6c2', t:'#7a3b46'},
    {n:'Golden',      c:'#f3cf52', t:'#5a4310'},
    {n:'Maitake',     c:'#9a8a6b', t:'#fff'},
    {n:'Wine Cap',    c:'#7c3b4a', t:'#fff'},
    {n:'Reishi',      c:'#a33b2a', t:'#fff'}
  ];

  let best = 0;
  try{ best = parseInt(localStorage.getItem('adm_best')||'0',10)||0; }catch(e){}
  if(elBest) elBest.textContent = best;

  const S = { round:1, score:0, lives:5, deck:[], flipped:[], busy:false,
              matched:0, boardsCleared:0, bonusIdx:0, active:false };

  function pairsForRound(r){ return Math.min(8, 1 + r); }       // r1=2 pairs (4 cards)
  function revealMs(r){ return Math.max(1100, 2600 - (r-1)*180); }
  function colsFor(n){ return ({4:2,6:3,8:4,10:5,12:4,14:5,16:4})[n] || Math.ceil(Math.sqrt(n)); }

  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  function buildDeck(nPairs){
    const ids = shuffle(SPECIES.map((_,i)=>i)).slice(0,nPairs);
    const cards = [];
    ids.forEach(id=>{ cards.push({sid:id,matched:false}); cards.push({sid:id,matched:false}); });
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
    board.style.gridTemplateColumns = 'repeat('+colsFor(n)+',1fr)';
    board.innerHTML = '';
    S.deck.forEach((card,i)=>{
      const sp = SPECIES[card.sid];
      const el = document.createElement('div');
      el.className = 'mg-card';
      el.innerHTML =
        '<div class="mg-inner">'+
          '<div class="mg-face mg-back">🍄</div>'+
          '<div class="mg-face mg-front" style="background:'+sp.c+';color:'+sp.t+'">'+
            '<span class="gl">🍄</span><span>'+sp.n+'</span>'+
          '</div>'+
        '</div>';
      el.addEventListener('click', ()=>onCard(i));
      card.el = el;
      board.appendChild(el);
    });
  }

  function newBoard(){
    S.deck = buildDeck(pairsForRound(S.round));
    S.flipped = []; S.matched = 0; S.busy = true;
    renderBoard();
    setHud();
    S.deck.forEach(c=>c.el.classList.add('show'));     // reveal all
    setTimeout(()=>{
      S.deck.forEach(c=>{ if(!c.matched) c.el.classList.remove('show'); });
      S.busy = false;
    }, revealMs(S.round));
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
      if(S.deck[a].sid===S.deck[b].sid){
        setTimeout(()=>{
          S.deck[a].matched = S.deck[b].matched = true;
          S.deck[a].el.classList.add('matched'); S.deck[b].el.classList.add('matched');
          S.matched += 1; S.score += 50; S.flipped = []; S.busy = false; setHud();
          if(S.matched === S.deck.length/2) boardClear();
        }, 380);
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
    if(S.boardsCleared % 3 === 0){
      setTimeout(()=>startBonus(), 500);
    } else {
      setTimeout(()=>{ S.round += 1; newBoard(); }, 700);
    }
  }

  function nextAfterBonus(){ S.round += 1; newBoard(); }

  // ---------- overlays ----------
  function showOverlay(html){ ov.innerHTML = html; overlay.classList.remove('hidden'); }
  function hideOverlay(){ overlay.classList.add('hidden'); }

  function startGame(){
    S.round=1; S.score=0; S.lives=5; S.boardsCleared=0; S.bonusIdx=0; S.active=true;
    hideOverlay(); newBoard();
  }

  function gameOver(){
    S.active=false;
    setHud();
    showOverlay('<div class="mg-ovcard"><h3>Out of guesses! 🍄</h3>'+
      '<p>You reached <strong>round '+S.round+'</strong> and scored <strong>'+S.score+'</strong>.<br>Best: '+best+'</p>'+
      '<button class="btn" id="mgPlay">Play again</button></div>');
    const b=document.getElementById('mgPlay'); if(b) b.addEventListener('click', startGame);
  }

  // ---------- BONUS ROUNDS (alternating) ----------
  function startBonus(){
    const kind = (S.bonusIdx++ % 2); // 0 = Harvest Timing, 1 = Catch the Spores
    if(kind===0) bonusHarvest(); else bonusSpores();
  }

  function bonusIntro(title, desc, go){
    showOverlay('<div class="mg-ovcard"><h3>⭐ Bonus: '+title+'</h3><p>'+desc+'</p>'+
      '<button class="btn" id="mgGo">Start bonus</button></div>');
    document.getElementById('mgGo').addEventListener('click', go);
  }

  function bonusOutro(points){
    S.score += points; setHud();
    showOverlay('<div class="mg-ovcard"><h3>Bonus done! 🎉</h3>'+
      '<p>+'+points+' points</p><button class="btn" id="mgCont">Next round</button></div>');
    document.getElementById('mgCont').addEventListener('click', ()=>{ hideOverlay(); nextAfterBonus(); });
  }

  // ---- Harvest Timing ----
  function bonusHarvest(){
    bonusIntro('Harvest Timing',
      'A mushroom grows — press <strong>SPACE</strong> or tap when it hits the ripe ring. 3 mushrooms!',
      runHarvest);
  }
  function runHarvest(){
    showOverlay('<div class="mg-ovcard"><h3>Harvest! 🍄</h3>'+
      '<canvas id="mgBonusC" class="mg-bonusC" width="440" height="240"></canvas>'+
      '<p id="mgHmsg" style="min-height:24px">Get ready…</p></div>');
    const cv=document.getElementById('mgBonusC'), ctx=cv.getContext('2d');
    const W=cv.width,H=cv.height; const msg=document.getElementById('mgHmsg');
    let scale=0.3, growing=true, idx=0, total=0, harvested=false, done=false;
    const RIPE_LO=0.92, RIPE_HI=1.12, MAXS=1.45, rate=0.42;
    let last=performance.now();
    function harvest(){
      if(done||harvested||!growing) return;
      harvested=true;
      let pts=0, label='Too '+(scale<RIPE_LO?'early':'late')+'!';
      if(scale>=RIPE_LO && scale<=RIPE_HI){
        const perfect = Math.abs(scale-1.0)<0.06;
        pts = perfect?100:60; label = perfect?'PERFECT! +'+pts:'Ripe! +'+pts;
      }
      total+=pts; msg.textContent=label;
      setTimeout(nextMush, 700);
    }
    function nextMush(){
      idx++;
      if(idx>=3){ cleanup(); bonusOutro(total); return; }
      scale=0.3; growing=true; harvested=false; msg.textContent='Mushroom '+(idx+1)+' of 3';
    }
    function key(e){ if(e.code==='Space'){ e.preventDefault(); harvest(); } }
    function tap(){ harvest(); }
    window.addEventListener('keydown', key);
    cv.addEventListener('pointerdown', tap);
    function cleanup(){ done=true; window.removeEventListener('keydown',key); cv.removeEventListener('pointerdown',tap); }
    msg.textContent='Mushroom 1 of 3';
    (function loop(now){
      if(done) return;
      const dt=Math.min(0.05,(now-last)/1000); last=now;
      if(growing && !harvested){ scale+=dt*rate; if(scale>=MAXS){ growing=false; harvested=true; msg.textContent='Missed it! 😟'; total+=0; setTimeout(nextMush,700);} }
      ctx.clearRect(0,0,W,H);
      // ripe ring (target size)
      const cx=W/2, baseY=H-30;
      ctx.strokeStyle='rgba(90,138,78,.8)'; ctx.lineWidth=3; ctx.setLineDash([6,5]);
      const ringR=58; ctx.beginPath(); ctx.ellipse(cx,baseY-58,ringR,ringR*0.9,0,0,7); ctx.stroke(); ctx.setLineDash([]);
      // mushroom
      const s=scale;
      ctx.fillStyle='#caa07a'; ctx.fillRect(cx-9*s, baseY-46*s, 18*s, 46*s); // stem
      ctx.fillStyle='#8a5a3b'; ctx.beginPath(); ctx.ellipse(cx, baseY-46*s, 40*s, 26*s, 0, Math.PI,0); ctx.fill(); // cap
      ctx.fillStyle='rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(cx-14*s,baseY-50*s,4*s,0,7); ctx.arc(cx+12*s,baseY-56*s,5*s,0,7); ctx.fill();
      requestAnimationFrame(loop);
    })(last);
  }

  // ---- Catch the Spores ----
  function bonusSpores(){
    bonusIntro('Catch the Spores',
      'Move the jar with ← → (or drag) to catch good spores 🟡 and dodge mould 🟣. 12 seconds!',
      runSpores);
  }
  function runSpores(){
    showOverlay('<div class="mg-ovcard"><h3>Catch the Spores! 🫙</h3>'+
      '<canvas id="mgBonusC" class="mg-bonusC" width="440" height="260"></canvas>'+
      '<p id="mgSmsg" style="min-height:24px">Caught: 0</p></div>');
    const cv=document.getElementById('mgBonusC'), ctx=cv.getContext('2d');
    const W=cv.width,H=cv.height; const msg=document.getElementById('mgSmsg');
    let jarX=W/2, caught=0, pts=0, t=0, done=false, last=performance.now();
    const drops=[]; let spawn=0; let left=false,right=false;
    function key(e,v){ if(e.code==='ArrowLeft'){left=v;e.preventDefault();} if(e.code==='ArrowRight'){right=v;e.preventDefault();} }
    const kd=e=>key(e,true), ku=e=>key(e,false);
    function move(e){ const r=cv.getBoundingClientRect(); jarX=Math.max(24,Math.min(W-24,(e.clientX-r.left)*(W/r.width))); }
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku); cv.addEventListener('pointermove',move);
    function cleanup(){ done=true; window.removeEventListener('keydown',kd); window.removeEventListener('keyup',ku); cv.removeEventListener('pointermove',move); }
    (function loop(now){
      if(done) return;
      const dt=Math.min(0.05,(now-last)/1000); last=now; t+=dt; spawn-=dt;
      if(left) jarX-=260*dt; if(right) jarX+=260*dt; jarX=Math.max(24,Math.min(W-24,jarX));
      if(spawn<=0){ spawn=0.55+Math.random()*0.4; drops.push({x:30+Math.random()*(W-60),y:-12,bad:Math.random()<0.28,v:90+Math.random()*70}); }
      for(let i=drops.length-1;i>=0;i--){ const d=drops[i]; d.y+=d.v*dt;
        if(d.y>H-34 && Math.abs(d.x-jarX)<30){ if(d.bad){pts=Math.max(0,pts-15);} else {caught++;pts+=15;} drops.splice(i,1); msg.textContent='Caught: '+caught; continue; }
        if(d.y>H+14) drops.splice(i,1);
      }
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#7fb86a'; ctx.fillRect(0,H-10,W,10);
      drops.forEach(d=>{ ctx.font='20px sans-serif'; ctx.textAlign='center'; ctx.fillText(d.bad?'🟣':'🟡', d.x, d.y); });
      // jar
      ctx.fillStyle='#b5764a'; ctx.strokeStyle='#7a4a28'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(jarX-26,H-34); ctx.lineTo(jarX+26,H-34); ctx.lineTo(jarX+20,H-10); ctx.lineTo(jarX-20,H-10); ctx.closePath(); ctx.fill(); ctx.stroke();
      // timer bar
      ctx.fillStyle='rgba(122,74,40,.25)'; ctx.fillRect(0,0,W,6);
      ctx.fillStyle='#7a4a28'; ctx.fillRect(0,0,W*(1-t/12),6);
      if(t>=12){ cleanup(); bonusOutro(pts); return; }
      requestAnimationFrame(loop);
    })(last);
  }

  // ---------- input to start ----------
  function startInput(e){
    if(S.active) return;
    if(e.type==='keydown' && e.code!=='Space') return;
    if(e.preventDefault) e.preventDefault();
    startGame();
  }
  window.addEventListener('keydown', startInput);
  if(overlay) overlay.addEventListener('pointerdown', (e)=>{ if(!S.active && e.target.id!=='mgPlay' && e.target.id!=='mgGo' && e.target.id!=='mgCont') startGame(); });

  // initial start overlay
  showOverlay('<div class="mg-ovcard"><h3>Match the Mushrooms 🍄</h3>'+
    '<p>Cards flash, then flip. Find every pair! Each round adds two more cards — and every 3 boards triggers a bonus round.</p>'+
    '<button class="btn" id="mgStart">Start growing</button></div>');
  (function(){ const b=document.getElementById('mgStart'); if(b) b.addEventListener('click', startGame); })();
})();
