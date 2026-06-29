/* Archy & Dad — Perfect Kick streak game */
(function(){
  const cv = document.getElementById('kgame');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const W = 960, H = 540;
  cv.width = W; cv.height = H;
  const GROUND = 432;
  const KX = 175;                       // ball start / Archy kick spot

  const scoreEl = document.getElementById('kStreak');
  const bestEl  = document.getElementById('kBest');
  const banner  = document.getElementById('kBanner');
  const meterFill = document.getElementById('kMeterFill');
  const meterWrap = document.getElementById('kMeter');
  const startScreen = document.getElementById('kStart');
  const overScreen  = document.getElementById('kOver');
  const overText    = document.getElementById('kOverText');
  const overBest    = document.getElementById('kOverBest');

  let best = 0;
  try{ best = parseInt(localStorage.getItem('adk_best')||'0',10)||0; }catch(e){}
  if(bestEl) bestEl.textContent = best;

  const state = {
    mode:'start',      // start | aim | charging | flying | result | over
    streak:0,
    power:0,
    charging:false,
    dadX:560,
    ball:{x:KX,y:GROUND-14,vx:0,vy:0,t:0,land:0,dur:0,arc:0},
    window:34,
    chargeRate:0.95,
    resultT:0,
    dadHop:0,
    bob:0,
    wind:0,
    WIND_AT:4
  };

  function roundParams(){
    // difficulty ramps with streak
    const s = state.streak;
    state.window = Math.max(16, 34 - s*1.3);
    state.chargeRate = 0.95 + Math.min(0.9, s*0.06);
    const minX = 380, maxX = 860;
    state.dadX = minX + Math.random()*(maxX-minX);
    if(state.streak >= state.WIND_AT){
      const strength = 40 + Math.random()*70 + Math.min(40,(state.streak-state.WIND_AT)*5);
      state.wind = (Math.random()<0.5?-1:1) * strength;   // +ve blows ball further (rightward)
    } else {
      state.wind = 0;
    }
  }

  function newRound(){
    roundParams();
    state.power = 0; state.charging = false;
    state.ball.x = KX; state.ball.y = GROUND-14;
    state.mode = 'aim';
    if(meterFill) meterFill.style.width = '0%';
  }

  function startGame(){
    state.streak = 0;
    updateHud();
    overScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    newRound();
  }

  function updateHud(){
    if(scoreEl) scoreEl.textContent = state.streak;
  }

  function showBanner(txt, color){
    if(!banner) return;
    banner.textContent = txt;
    banner.style.background = color || 'rgba(122,74,40,.96)';
    banner.classList.add('show');
    clearTimeout(banner._t);
    banner._t = setTimeout(()=>banner.classList.remove('show'), 1100);
  }

  function beginCharge(){
    if(state.mode!=='aim') return;
    state.mode = 'charging';
    state.charging = true;
    state.power = 0;
  }

  function releaseKick(){
    if(state.mode!=='charging') return;
    state.charging = false;
    state.mode = 'flying';
    const RANGE = 740;
    const land = KX + state.power*RANGE + state.wind;
    const b = state.ball;
    b.x = KX; b.y = GROUND-14;
    b.land = land;
    b.start = KX;
    b.t = 0;
    b.dur = 0.45 + state.power*0.7;          // longer kicks take longer
    b.arc = 70 + state.power*150;            // higher with power
  }

  // input
  function down(e){
    if(state.mode==='start'){ startGame(); return; }
    if(state.mode==='over'){ startGame(); return; }
    if(state.mode==='aim'){ beginCharge(); }
  }
  function up(e){
    if(state.mode==='charging'){ releaseKick(); }
  }
  window.addEventListener('keydown', e=>{
    if(e.code==='Space'){ e.preventDefault(); if(!e.repeat) down(e); }
  });
  window.addEventListener('keyup', e=>{
    if(e.code==='Space'){ e.preventDefault(); up(e); }
  });
  cv.addEventListener('pointerdown', e=>{ e.preventDefault(); down(e); });
  window.addEventListener('pointerup', e=>{ up(e); });

  function evaluate(){
    const diff = Math.abs(state.ball.land - state.dadX);
    if(diff <= state.window){
      state.streak++;
      updateHud();
      state.dadHop = 1;
      if(state.streak > best){ best = state.streak; try{localStorage.setItem('adk_best',String(best));}catch(e){} if(bestEl)bestEl.textContent=best; }
      showBanner(perfectMsg(state.streak), 'rgba(90,138,78,.96)');
      state.mode = 'result'; state.resultT = 0;
    } else {
      const msg = state.ball.land < state.dadX ? 'Too short! 🦵' : 'Too far! 💨';
      showBanner(msg, 'rgba(176,104,63,.96)');
      gameOver();
    }
  }

  function perfectMsg(s){
    if(s>=15) return 'UNREAL! ⚽ '+s+' in a row!';
    if(s>=10) return 'On fire! 🔥 '+s+' perfect!';
    if(s>=5)  return 'Beauty! ⚽ '+s+' in a row!';
    return 'PERFECT! ⚽';
  }

  function gameOver(){
    state.mode = 'over';
    const s = state.streak;
    overText.innerHTML = s===0
      ? 'No perfect kicks that time!<br>Judge how far Dad is and hold to power up.'
      : '⚽ <strong>'+s+'</strong> perfect kick'+(s===1?'':'s')+' in a row!';
    overBest.textContent = 'Best streak: '+best;
    overScreen.classList.remove('hidden');
  }

  // ---------- drawing ----------
  function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  function drawBg(){
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#cfeafe'); g.addColorStop(1,'#eaf7ff');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // sun
    ctx.fillStyle='#ffe49a'; ctx.beginPath(); ctx.arc(110,90,46,0,7); ctx.fill();
    // clouds
    ctx.fillStyle='rgba(255,255,255,.9)';
    cloud(720,90,1); cloud(470,60,.7);
    // grass
    ctx.fillStyle='#7fb86a'; ctx.fillRect(0,GROUND,W,H-GROUND);
    ctx.fillStyle='#6fa85c'; ctx.fillRect(0,GROUND,W,8);
  }
  function cloud(x,y,s){ ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.beginPath();
    ctx.arc(0,0,26,0,7); ctx.arc(30,4,22,0,7); ctx.arc(-26,6,18,0,7); ctx.fill(); ctx.restore(); }

  function drawPerson(x, scale, opts){
    // simple cute person; opts: hatColor, hatType('bucket'|'cap'), shirt, catching
    ctx.save();
    ctx.translate(x, GROUND);
    ctx.scale(scale, scale);
    const skin='#f2c8a0', line='#3a2a1c';
    ctx.lineWidth=4; ctx.strokeStyle=line; ctx.lineJoin='round';
    // legs
    ctx.fillStyle='#41607a';
    rr(-16,-46,14,46,6); ctx.fill(); ctx.stroke();
    rr(4,-46,14,46,6); ctx.fill(); ctx.stroke();
    // body / shirt
    ctx.fillStyle=opts.shirt;
    rr(-22,-92,44,50,14); ctx.fill(); ctx.stroke();
    // arms
    ctx.fillStyle=opts.shirt;
    if(opts.catching){
      rr(-34,-92,16,30,8); ctx.fill(); ctx.stroke();   // arms up to catch
      rr(18,-92,16,30,8); ctx.fill(); ctx.stroke();
    } else {
      rr(-32,-86,14,30,7); ctx.fill(); ctx.stroke();
      rr(18,-86,14,30,7); ctx.fill(); ctx.stroke();
    }
    // head
    ctx.fillStyle=skin;
    ctx.beginPath(); ctx.arc(0,-112,22,0,7); ctx.fill(); ctx.stroke();
    // cheeks
    ctx.fillStyle='#f1a3a0'; ctx.beginPath(); ctx.arc(-12,-106,4,0,7); ctx.arc(12,-106,4,0,7); ctx.fill();
    // eyes
    ctx.fillStyle=line; ctx.beginPath(); ctx.arc(-7,-114,2.6,0,7); ctx.arc(7,-114,2.6,0,7); ctx.fill();
    // smile
    ctx.beginPath(); ctx.arc(0,-110,7,0.15*Math.PI,0.85*Math.PI); ctx.stroke();
    // hat
    ctx.fillStyle=opts.hatColor;
    if(opts.hatType==='bucket'){
      rr(-26,-122,52,10,5); ctx.fill(); ctx.stroke();          // brim
      rr(-19,-140,38,22,8); ctx.fill(); ctx.stroke();          // crown
    } else { // cap
      rr(-20,-134,40,16,8); ctx.fill(); ctx.stroke();          // crown
      rr(-44,-124,30,8,4); ctx.fill(); ctx.stroke();           // peak (facing left)
    }
    ctx.restore();
  }

  function drawBall(x,y,r){
    ctx.save();
    ctx.fillStyle='#fff'; ctx.strokeStyle='#2a2a2a'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#2a2a2a';
    ctx.beginPath(); ctx.arc(x,y,r*0.34,0,7); ctx.fill();
    ctx.restore();
  }

  function drawMeter(){ /* DOM meter handled separately */ }

  function drawWind(){
    if(!state.wind) return;
    if(!(state.mode==='aim'||state.mode==='charging'||state.mode==='flying')) return;
    const dir = state.wind>0?1:-1;                 // 1 = blowing right, -1 = left
    const n = Math.max(1, Math.min(4, Math.round(Math.abs(state.wind)/30)));
    ctx.save();
    ctx.translate(W/2, 64);
    ctx.fillStyle='rgba(255,255,255,.9)';
    rr(-96,-20,192,40,20); ctx.fill();
    ctx.strokeStyle='rgba(58,110,165,.25)'; ctx.lineWidth=2; rr(-96,-20,192,40,20); ctx.stroke();
    ctx.fillStyle='#2f6fb0'; ctx.textBaseline='middle';
    ctx.font='800 16px Quicksand, system-ui, sans-serif'; ctx.textAlign='center';
    ctx.fillText('WIND', 0, 0);
    // chevrons pointing the way the wind blows
    ctx.strokeStyle='#2f6fb0'; ctx.lineWidth=4; ctx.lineCap='round';
    for(let i=0;i<n;i++){
      const cx = dir>0 ? (44 + i*16) : (-44 - i*16);
      ctx.beginPath();
      ctx.moveTo(cx - dir*6, -7); ctx.lineTo(cx + dir*6, 0); ctx.lineTo(cx - dir*6, 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  let lastT = performance.now();
  function loop(now){
    const dt = Math.min(0.05, (now-lastT)/1000); lastT = now;
    state.bob += dt;

    if(state.mode==='charging'){
      state.power += dt*state.chargeRate;
      if(state.power>=1){ state.power=1; releaseKick(); }   // overcharge auto-fires (risk)
      if(meterFill) meterFill.style.width = (state.power*100).toFixed(1)+'%';
    }

    if(state.mode==='flying'){
      const b = state.ball;
      b.t += dt;
      const p = Math.min(1, b.t/b.dur);
      b.x = b.start + (b.land-b.start)*p;
      b.y = (GROUND-14) - Math.sin(p*Math.PI)*b.arc;
      if(p>=1){ b.y=GROUND-14; evaluate(); }
    }

    if(state.mode==='result'){
      state.resultT += dt;
      state.dadHop = Math.max(0, state.dadHop - dt*2);
      if(state.resultT>0.8){ newRound(); }
    }
    if(state.dadHop>0 && state.mode!=='result') state.dadHop=Math.max(0,state.dadHop-dt*2);

    // ---- render ----
    drawBg();

    // target pad at Dad's feet (shows the perfect window)
    if(state.mode==='aim' || state.mode==='charging' || state.mode==='flying'){
      ctx.save();
      ctx.fillStyle='rgba(90,138,78,.28)';
      ctx.strokeStyle='rgba(90,138,78,.7)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.ellipse(state.dadX, GROUND+2, state.window, 9, 0,0,7); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // Dad (orange bucket hat, orange shirt), faces left, catching
    const hop = state.dadHop>0 ? Math.sin((1-state.dadHop)*Math.PI)*-10 : 0;
    ctx.save(); ctx.translate(0,hop);
    drawPerson(state.dadX, 1.0, {hatColor:'#f08a24', hatType:'bucket', shirt:'#f08a24', catching:true});
    ctx.restore();

    // Archy (black cap, red shirt), smaller, near left
    const abob = Math.sin(state.bob*3)*1.5;
    drawPerson(KX-30, 0.72, {hatColor:'#2c2c2c', hatType:'cap', shirt:'#e0473c', catching:false});

    // Wind indicator
    drawWind();

    // Ball
    if(state.mode==='aim' || state.mode==='charging'){
      drawBall(KX, GROUND-14, 13);
    } else if(state.mode==='flying'){
      drawBall(state.ball.x, state.ball.y, 13);
    } else if(state.mode==='result'){
      drawBall(state.dadX, GROUND-58, 13);   // in Dad's hands
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
