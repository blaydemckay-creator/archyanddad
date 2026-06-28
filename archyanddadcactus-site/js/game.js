/* Archy & Dad Cactus Co. — "San Pedro Sprint" runner
   Rewards: reward icon = 5% off · collect 25 water + 15 sun = +5% (10% max)
            beat the high score = free shipping. */
(function(){
  const canvas = document.getElementById('game');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 900, H = 506;
  function resize(){
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    canvas.width = W*dpr; canvas.height = H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize(); window.addEventListener('resize', resize);

  const C = {
    skyTop:'#fbe6cf', skyBot:'#bfe0e4', hillFar:'#cdb8d4', hillMid:'#9fb88f',
    sand:'#e7cf9f', sandDark:'#d8b87f', groundLine:'#b89a63',
    cactus:'#5a8a4e', cactusDark:'#3f6b3a', cactusLight:'#7aa86a', rib:'#436b3c',
    pot:'#c87a4e', potRim:'#b3683f', water:'#52b4e0', sun:'#f6cf57',
    flower:'#fbfaf4', flowerEdge:'#e6e2d2'
  };

  const FIVE_AT = 550, FLOWER_AT = 700, MOTH_AT = 900;
  const COMBO_WATER = 25, COMBO_SUN = 15, MAX_DISCOUNT = 10;
  const START_LINES = [
    "Press SPACE to begin! Collect 💧 & ☀️ for discounts.",
    "Grab the 🏷️ tag for 5% off — beat my score for free shipping!",
    "Press SPACE to play — jump the roos, emus & crocs!"
  ];
  const DIE_LINES = [
    "Try again — but watch out for the moths! 🦋",
    "The flower gives you flying powers — keep pressing the space bar to fly! 🕊️",
    "So close! Collect 25 💧 + 15 ☀️ in a run for another 5% off.",
    "Have another go — beat the high score for free shipping! 🚚",
    "Fly over the low moths and duck under the high ones!"
  ];

  const ground = H - 80;
  const state = { mode:'start', t:0, speed:300, dist:0, water:0, sun:0, score:0, speedLock:0, streak:0, mult:1, bonus:0, nextBonus:2000, bonusCount:0,
    fiveSpawned:false, fiveGot:false, comboGot:false, bloomed:false, hintShown:false, mothWarned:false };
  let best = 0;
  try{ best = parseInt(localStorage.getItem('sps_best')||'0',10)||0; }catch(e){}

  const player = { x:130, y:ground, vy:0, w:46, h:78, onGround:true, jumps:0, squash:0 };
  const GRAV = 1900, JUMP = 660;
  const OB_TYPES=[
    {type:'kangaroo', w:58, h:64},{type:'emu', w:46, h:74},{type:'croc', w:94, h:30},
    {type:'koala', w:48, h:46},{type:'ranger', w:42, h:70}
  ];
  let obstacles=[], collects=[], clouds=[], bgCacti=[], spawnT=0, collectT=0, mothT=0, tipT=0;
  let bannerTimer=null, bubbleTimer=null;
  let bBeams=[],bMoths=[],bParts=[],bStars=[],bTime=20,bFireCD=0,bMothT=0,bFiring=false,bTargetY=H/2;
  const DDIRS=['left','down','up','right'], DCOL={left:'#ff6b6b',down:'#4dabf7',up:'#51cf66',right:'#ffd43b'};
  const DLANEX=[330,420,510,600], DLANEW=86, DZONE=H-92, DWIN=50, DMISSY=H-42;
  let dArrows=[],dParts=[],dSpawnT=0,dTime=0,dStreak=0,dMult=1,dFlash={left:0,down:0,up:0,right:0};

  const $ = id => document.getElementById(id);
  function showBanner(text, ms){
    const el=$('banner'); if(!el) return;
    el.textContent=text; el.classList.add('show');
    if(bannerTimer) clearTimeout(bannerTimer);
    bannerTimer=setTimeout(()=>el.classList.remove('show'), ms||3500);
  }
  function showBubble(text, ms){
    const el=$('archyBubble'); if(!el) return;
    el.innerHTML='<span class="who">Archy:</span> '+text;
    el.classList.add('show');
    if(bubbleTimer) clearTimeout(bubbleTimer);
    if(ms) bubbleTimer=setTimeout(()=>el.classList.remove('show'), ms);
  }

  function reset(arm){
    Object.assign(state,{mode:'play',t:0,speed:300,dist:0,water:0,sun:0,score:0,armed:!!arm,speedLock:0,streak:0,mult:1,bonus:0,nextBonus:2000,bonusCount:0,
      fiveSpawned:false,fiveGot:false,comboGot:false,bloomed:false,hintShown:false,mothWarned:false});
    player.y=ground; player.vy=0; player.onGround=true; player.jumps=0; player.squash=0;
    obstacles=[]; collects=[]; spawnT=0.8; collectT=0.5; mothT=1.2; tipT=4.5;
    bgCacti=[]; for(let i=0;i<5;i++) bgCacti.push({x:Math.random()*W, s:0.5+Math.random()*0.5});
    clouds=[]; for(let i=0;i<4;i++) clouds.push({x:Math.random()*W, y:40+Math.random()*120, s:0.4+Math.random()*0.6});
    if($('banner')) $('banner').classList.remove('show');
    if($('archyBubble')) $('archyBubble').classList.remove('show');
    if($('startScreen')) $('startScreen').classList.toggle('hidden', !!arm);
    if($('overScreen')) $('overScreen').classList.add('hidden');
    if(!arm) showBubble(START_LINES[Math.floor(Math.random()*START_LINES.length)], 0);
  }

  function jump(){
    if(state.mode!=='play') return;
    if(!state.armed){ state.armed=true; if($('startScreen')) $('startScreen').classList.add('hidden'); if($('archyBubble')) $('archyBubble').classList.remove('show'); }
    if(state.bloomed){
      // flower power: flap to fly — every tap lifts the cactus
      player.vy = -JUMP*0.72; player.onGround=false; player.squash=-0.2;
      return;
    }
    if(player.onGround){ player.vy=-JUMP; player.onGround=false; player.jumps=1; player.squash=-0.25; }
    else if(player.jumps<2){ player.vy=-JUMP*0.85; player.jumps=2; player.squash=-0.25; }
  }

  function currentDiscount(){ return Math.min(MAX_DISCOUNT, (state.fiveGot?5:0)+(state.comboGot?5:0)); }

  function saveReward(discount, freeShipping){
    let prev={discount:0,freeShipping:false};
    try{ prev = JSON.parse(localStorage.getItem('sps_reward')||'{}'); }catch(e){}
    const merged = {
      discount: Math.max(prev.discount||0, discount),
      freeShipping: !!(prev.freeShipping || freeShipping),
      ts: Date.now()
    };
    try{ localStorage.setItem('sps_reward', JSON.stringify(merged)); }catch(e){}
  }

  function gameOver(){
    state.mode='over';
    const prevBest = best;
    const newRecord = state.score > prevBest && state.score>0;
    if(newRecord){ best=state.score; try{localStorage.setItem('sps_best',best);}catch(e){} }
    const discount = currentDiscount();
    const freeShip = newRecord;
    saveReward(discount, freeShip);

    if($('finalScore')) $('finalScore').textContent=state.score;
    if($('finalWater')) $('finalWater').textContent=state.water;
    if($('finalSun')) $('finalSun').textContent=state.sun;
    if($('bestLine')) $('bestLine').textContent=(newRecord?'🏆 New high score! Best: ':'Best: ')+best;

    let rewards=[];
    if(discount>0) rewards.push('🏷️ '+discount+'% off unlocked');
    if(freeShip)   rewards.push('🚚 Free shipping unlocked!');
    if(!rewards.length) rewards.push('Keep running to unlock rewards!');
    if($('rewardLine')) $('rewardLine').innerHTML = rewards.join('<br>');

    if($('overScreen')) $('overScreen').classList.remove('hidden');
    const sm=$('saveMsg'); if(sm) sm.textContent='';
    const ni=$('nameInput'); if(ni){ ni.value=ni.value||''; }
    if(window.SPS && typeof window.SPS.onGameOver==='function'){
      window.SPS.onGameOver({score:state.score, discount, freeShipping:freeShip, newRecord});
    }
    showBubble(DIE_LINES[Math.floor(Math.random()*DIE_LINES.length)], 0);
  }

  function press(e){
    if(e) e.preventDefault();
    if(state.mode==='over'){ reset(true); return; }
    if(state.mode==='bonus'){ bFiring=true; bonusFire(); return; }
    jump();
  }
  window.addEventListener('keydown', e=>{
    if(document.activeElement && document.activeElement.tagName==='INPUT') return;
    if(state.mode==='dance'){
      const dm={ArrowLeft:0,ArrowDown:1,ArrowUp:2,ArrowRight:3};
      if(e.code in dm){ e.preventDefault(); dancePress(dm[e.code]); }
      return;
    }
    if(state.mode==='bonus'){
      if(e.code==='ArrowUp'){ e.preventDefault(); bTargetY=Math.max(46,bTargetY-28); }
      else if(e.code==='ArrowDown'){ e.preventDefault(); bTargetY=Math.min(H-30,bTargetY+28); }
      else if(e.code==='Space'){ e.preventDefault(); bFiring=true; bonusFire(); }
      return;
    }
    if(e.code==='Space'||e.code==='ArrowUp'){ press(e); }
  });
  window.addEventListener('keyup', e=>{ if(e.code==='Space') bFiring=false; });
  canvas.addEventListener('mousedown', e=>{ if(state.mode==='dance'){ e.preventDefault(); danceTapX(e.clientX); } else press(e); });
  canvas.addEventListener('touchstart', e=>{ if(state.mode==='dance'){ e.preventDefault(); for(let i=0;i<e.changedTouches.length;i++) danceTapX(e.changedTouches[i].clientX); } else press(e); }, {passive:false});
  canvas.addEventListener('mousemove', e=>{ if(state.mode==='bonus') bAim(e); });
  canvas.addEventListener('touchmove', e=>{ if(state.mode==='bonus'){ e.preventDefault(); bAim(e); } }, {passive:false});
  window.addEventListener('mouseup', ()=>{ bFiring=false; });
  window.addEventListener('touchend', ()=>{ bFiring=false; });
  if($('startBtn')) $('startBtn').addEventListener('click', e=>{e.stopPropagation();reset(true);});
  if($('againBtn')) $('againBtn').addEventListener('click', e=>{e.stopPropagation();reset(true);});
  if($('startScreen')){
    $('startScreen').addEventListener('mousedown', e=>{ e.preventDefault(); jump(); });
    $('startScreen').addEventListener('touchstart', e=>{ e.preventDefault(); jump(); }, {passive:false});
  }

  function update(dt){
    if(state.mode!=='play') return;
    state.t+=dt;
    state.speed = state.speedLock ? state.speedLock : (300 + state.t*9);
    const move = state.speed*dt;

    // the cactus runs (and can jump) even before play begins
    player.vy += GRAV*dt; player.y += player.vy*dt;
    if(player.y<90){ player.y=90; if(player.vy<0) player.vy=0; }
    if(player.y>=ground){ player.y=ground; player.vy=0; if(!player.onGround){player.squash=0.3;} player.onGround=true; player.jumps=0; }
    player.squash += (0 - player.squash)*Math.min(1,dt*10);

    // scenery always scrolls so the screen feels alive on load
    bgCacti.forEach(c=>{ c.x-=move*0.35*c.s; if(c.x<-60){c.x=W+Math.random()*120; c.s=0.5+Math.random()*0.5;} });
    clouds.forEach(c=>{ c.x-=move*0.12*c.s; if(c.x<-120){c.x=W+80; c.y=40+Math.random()*120;} });

    if(!state.armed){ return; }   // waiting on the instructions screen

    state.dist += move/26;
    state.score = Math.floor(state.dist) + state.bonus;
    if(state.score>=state.nextBonus){ launchBonus(); return; }

    spawnT -= dt;
    if(spawnT<=0){
      const tp = OB_TYPES[Math.floor(Math.random()*OB_TYPES.length)];
      obstacles.push({x:W+40, w:tp.w, h:tp.h, type:tp.type});
      spawnT = (0.95 + Math.random()*0.85) * (300/state.speed) + 0.4;
    }
    collectT -= dt;
    if(collectT<=0){
      const isSun = Math.random()<0.4;
      collects.push({x:W+30, y:ground-(50+Math.random()*150), type:isSun?'sun':'water', r:14, got:false, bob:Math.random()*6});
      collectT = 0.6 + Math.random()*0.7;
    }
    if(!state.fiveSpawned && state.score>=FIVE_AT){
      state.fiveSpawned=true;
      collects.push({x:W+30, y:ground-58, type:'five', r:24, got:false, bob:0});
    }
    if(state.score>=MOTH_AT){
      if(!state.mothWarned){
        state.mothWarned=true;
        state.speedLock = state.speed*0.82;   // ease off, then hold constant
        showBanner('🦋 Angry cactus moths! Fly over the low ones, duck under the high ones.', 3800);
      }
      mothT -= dt;
      if(mothT<=0){
        obstacles.push({x:W+40, w:40, h:26, type:'moth', ay:25+Math.random()*(ground-95), bob:Math.random()*6});
        mothT = (1.5 + Math.random()*1.3) * (300/state.speed) + 0.5;
      }
    }

    obstacles.forEach(o=>o.x-=move);
    collects.forEach(c=>c.x-=move);
    obstacles=obstacles.filter(o=>o.x>-90);
    collects=collects.filter(c=>c.x>-50 && !c.got);

    const px=player.x-player.w/2+6, py=player.y-player.h, pw=player.w-12, ph=player.h;
    for(const o of obstacles){
      const oy=(o.type==='moth')?o.ay:ground-o.h;
      const pad=(o.type==='moth')?3:6;
      if(px<o.x+o.w-pad && px+pw>o.x+pad && py<oy+o.h && py+ph>oy+pad){ gameOver(); return; }
    }
    for(const c of collects){
      const dx=player.x-c.x, dy=(player.y-player.h/2)-c.y;
      if(Math.hypot(dx,dy)<c.r+30){
        c.got=true;
        if(c.type==='sun'||c.type==='water'){
          if(c.type==='sun') state.sun++; else state.water++;
          state.streak++;
          state.mult = Math.min(5, 1 + Math.floor(state.streak/4));   // x2 at 4, x3 at 8 ... cap x5
          state.bonus += 25 * state.mult;
        }
        else if(c.type==='five'){ state.fiveGot=true; showBanner('🏷️ 5% off unlocked! Collect '+COMBO_WATER+'💧 + '+COMBO_SUN+'☀️ for another 5%.', 4200); }
      } else if((c.type==='sun'||c.type==='water') && !c.missed && c.x < player.x-32){
        c.missed=true; state.streak=0; state.mult=1;   // let one slip past -> streak resets
      }
    }
    if(!state.comboGot && state.water>=COMBO_WATER && state.sun>=COMBO_SUN){
      state.comboGot=true;
      showBanner('🏷️ +5% off! You’ve maxed the 10% discount 🎉', 4200);
    }
    if(!state.bloomed && state.score>=FLOWER_AT){ state.bloomed=true; showBanner('🌼 Bloomed! Flower power — keep tapping to FLY! 🕊️', 3800); }

    if($('score')) $('score').textContent=state.score;
    if($('water')) $('water').textContent=state.water;
    if($('sun')) $('sun').textContent=state.sun;
  }

  function roundRect(x,y,w,h,r){
    ctx.beginPath(); ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }
  function drawCactus(){
    const bob = Math.sin(state.t*12)*(player.onGround?2.5:0);
    const sq = player.squash;
    const w = player.w*(1-sq*0.4), h=player.h*(1+sq*0.5);
    const cx = player.x, baseY=player.y+bob;
    ctx.save();
    const potW=w*1.05, potH=26;
    ctx.fillStyle=C.pot; roundRect(cx-potW/2, baseY-potH, potW, potH, 5); ctx.fill();
    ctx.fillStyle=C.potRim; roundRect(cx-potW/2-3, baseY-potH-7, potW+6, 10, 4); ctx.fill();
    const bodyH=h-potH+4, bodyY=baseY-potH-bodyH+6;
    ctx.fillStyle=C.cactus; roundRect(cx-w/2, bodyY, w, bodyH, w/2); ctx.fill();
    ctx.fillStyle=C.cactusDark; roundRect(cx+w*0.12, bodyY+4, w*0.3, bodyH-10, w*0.2); ctx.fill();
    ctx.fillStyle=C.cactusLight; roundRect(cx-w*0.42, bodyY+4, w*0.22, bodyH-10, w*0.18); ctx.fill();
    ctx.strokeStyle=C.rib; ctx.lineWidth=2; ctx.globalAlpha=.5;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(cx+i*w*0.22, bodyY+8); ctx.lineTo(cx+i*w*0.22, bodyY+bodyH-8); ctx.stroke(); }
    ctx.globalAlpha=1;
    ctx.fillStyle=C.cactus;
    roundRect(cx-w/2-12, bodyY+bodyH*0.45, 14, bodyH*0.32, 7); ctx.fill();
    roundRect(cx-w/2-12, bodyY+bodyH*0.18, 12, bodyH*0.32, 6); ctx.fill();
    roundRect(cx+w/2-2, bodyY+bodyH*0.3, 14, bodyH*0.34, 7); ctx.fill();
    roundRect(cx+w/2+0, bodyY+bodyH*0.05, 12, bodyH*0.3, 6); ctx.fill();
    if(state.score>=FLOWER_AT){
      const grow = Math.min(1,(state.score-FLOWER_AT)/40+0.2);
      const pr=8*grow, pw2=5*grow, ph2=9*grow;
      ctx.fillStyle=C.flower; ctx.strokeStyle=C.flowerEdge; ctx.lineWidth=1;
      for(let i=0;i<8;i++){ const a=i/8*Math.PI*2 + state.t*0.6; ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*pr, bodyY-2+Math.sin(a)*pr, pw2,ph2, a, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle='#f6cf57'; ctx.beginPath(); ctx.arc(cx, bodyY-2, 5.5*grow, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='#d9a93a'; ctx.beginPath(); ctx.arc(cx, bodyY-2, 2.5*grow, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='#2f3b30';
    const ey=bodyY+bodyH*0.4;
    ctx.beginPath(); ctx.arc(cx-9, ey, 3.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+9, ey, 3.2, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2f3b30'; ctx.lineWidth=2.4; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(cx, ey+6, 6, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
    ctx.fillStyle='rgba(244,155,193,.55)';
    ctx.beginPath(); ctx.arc(cx-13, ey+5, 3.5,0,Math.PI*2); ctx.arc(cx+13, ey+5, 3.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawBgCactus(x,s){
    const h=70*s, w=20*s, y=ground;
    ctx.fillStyle='rgba(95,130,100,.55)';
    roundRect(x-w/2, y-h, w, h, w/2); ctx.fill();
    roundRect(x-w/2-7*s, y-h*0.55, 8*s, h*0.4, 4); ctx.fill();
    roundRect(x+w/2-1, y-h*0.65, 8*s, h*0.4, 4); ctx.fill();
  }
  function drawKangaroo(x,w,h){
    const y=ground, col='#b97a45', dk='#8f5a30'; ctx.fillStyle=col;
    ctx.beginPath(); ctx.moveTo(x+w*0.55,y); ctx.quadraticCurveTo(x+w*1.08,y, x+w*0.92,y-h*0.22);
    ctx.quadraticCurveTo(x+w*0.72,y-h*0.12, x+w*0.55,y-h*0.18); ctx.closePath(); ctx.fill();
    roundRect(x+w*0.42,y-h*0.42,w*0.26,h*0.42,6); ctx.fill(); ctx.fillRect(x+w*0.3,y-9,w*0.34,9);
    ctx.beginPath(); ctx.ellipse(x+w*0.44,y-h*0.52,w*0.25,h*0.3,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.3,y-h*0.66,w*0.15,h*0.22,-0.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.2,y-h*0.82,w*0.14,h*0.12,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.07,y-h*0.8,w*0.08,h*0.06,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=dk;
    ctx.beginPath(); ctx.ellipse(x+w*0.22,y-h*0.97,w*0.035,h*0.09,0.15,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.29,y-h*0.97,w*0.035,h*0.09,0.15,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=col; roundRect(x+w*0.24,y-h*0.62,w*0.14,h*0.06,3); ctx.fill();
    ctx.fillStyle='#2f2a25'; ctx.beginPath(); ctx.arc(x+w*0.18,y-h*0.84,2.2,0,Math.PI*2); ctx.fill();
  }
  function drawEmu(x,w,h){
    const y=ground, col='#7d6450', dk='#5a4636', fluff='#9c8268';
    ctx.strokeStyle=dk; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x+w*0.46,y-h*0.42); ctx.lineTo(x+w*0.4,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w*0.62,y-h*0.42); ctx.lineTo(x+w*0.64,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w*0.4,y); ctx.lineTo(x+w*0.3,y); ctx.moveTo(x+w*0.64,y); ctx.lineTo(x+w*0.56,y); ctx.stroke();
    ctx.fillStyle=fluff; ctx.beginPath(); ctx.ellipse(x+w*0.56,y-h*0.54,w*0.32,h*0.26,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=col; roundRect(x+w*0.2,y-h*0.92,w*0.12,h*0.5,6); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.23,y-h*0.95,w*0.1,h*0.08,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=dk; ctx.beginPath(); ctx.moveTo(x+w*0.13,y-h*0.95); ctx.lineTo(x+w*0.02,y-h*0.93); ctx.lineTo(x+w*0.13,y-h*0.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#2f2a25'; ctx.beginPath(); ctx.arc(x+w*0.21,y-h*0.97,2,0,Math.PI*2); ctx.fill();
  }
  function drawCroc(x,w,h){
    const y=ground, col='#6e8a4f', dk='#54703c'; ctx.fillStyle=col;
    roundRect(x+w*0.12,y-h*0.6,w*0.66,h*0.6,7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+w*0.72,y); ctx.lineTo(x+w,y-h*0.55); ctx.lineTo(x+w*0.78,y-h*0.55); ctx.closePath(); ctx.fill();
    roundRect(x-w*0.02,y-h*0.46,w*0.34,h*0.36,5); ctx.fill();
    ctx.fillRect(x+w*0.2,y-7,w*0.08,9); ctx.fillRect(x+w*0.52,y-7,w*0.08,9);
    ctx.fillStyle=dk;
    for(let i=0;i<4;i++){ const bx=x+w*(0.22+i*0.13); ctx.beginPath(); ctx.moveTo(bx,y-h*0.6); ctx.lineTo(bx+w*0.04,y-h*0.82); ctx.lineTo(bx+w*0.08,y-h*0.6); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle='#fff';
    for(let i=0;i<5;i++){ const tx=x+w*0.02+i*w*0.055; ctx.beginPath(); ctx.moveTo(tx,y-h*0.12); ctx.lineTo(tx+w*0.03,y-h*0.12); ctx.lineTo(tx+w*0.015,y-h*0.02); ctx.closePath(); ctx.fill(); }
    ctx.beginPath(); ctx.arc(x+w*0.14,y-h*0.52,3.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2f2a25'; ctx.beginPath(); ctx.arc(x+w*0.14,y-h*0.52,1.7,0,Math.PI*2); ctx.fill();
  }
  function drawKoala(x,w,h){
    const y=ground, grey='#9aa1a8', dk='#7c838b', nose='#3a3530'; ctx.fillStyle=grey;
    ctx.beginPath(); ctx.ellipse(x+w*0.5,y-h*0.36,w*0.3,h*0.36,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w*0.3,y-h*0.72,w*0.16,0,Math.PI*2); ctx.arc(x+w*0.7,y-h*0.72,w*0.16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=dk; ctx.beginPath(); ctx.arc(x+w*0.3,y-h*0.72,w*0.08,0,Math.PI*2); ctx.arc(x+w*0.7,y-h*0.72,w*0.08,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=grey; ctx.beginPath(); ctx.arc(x+w*0.5,y-h*0.62,w*0.24,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=nose; ctx.beginPath(); ctx.ellipse(x+w*0.5,y-h*0.58,w*0.1,h*0.1,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2f2a25'; ctx.beginPath(); ctx.arc(x+w*0.39,y-h*0.7,2,0,Math.PI*2); ctx.arc(x+w*0.61,y-h*0.7,2,0,Math.PI*2); ctx.fill();
  }
  function drawRanger(x,w,h){
    const y=ground, khaki='#cabd83', dk='#a89a5f', skin='#e7b78d', hair='#e3cf86', boot='#5b4632';
    ctx.fillStyle=skin; ctx.fillRect(x+w*0.3,y-h*0.3,w*0.13,h*0.3); ctx.fillRect(x+w*0.57,y-h*0.3,w*0.13,h*0.3);
    ctx.fillStyle=boot; ctx.fillRect(x+w*0.27,y-7,w*0.19,9); ctx.fillRect(x+w*0.54,y-7,w*0.19,9);
    ctx.fillStyle=khaki; ctx.fillRect(x+w*0.26,y-h*0.45,w*0.48,h*0.18);
    roundRect(x+w*0.23,y-h*0.78,w*0.54,h*0.36,5); ctx.fill();
    ctx.fillStyle=skin; ctx.fillRect(x+w*0.13,y-h*0.7,w*0.12,h*0.28); ctx.fillRect(x+w*0.75,y-h*0.7,w*0.12,h*0.28);
    ctx.strokeStyle=dk; ctx.lineWidth=1.4; ctx.strokeRect(x+w*0.31,y-h*0.66,w*0.15,h*0.12); ctx.strokeRect(x+w*0.54,y-h*0.66,w*0.15,h*0.12);
    ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(x+w*0.5,y-h*0.86,w*0.16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=hair; ctx.beginPath(); ctx.arc(x+w*0.5,y-h*0.9,w*0.17,Math.PI,0); ctx.fill();
    ctx.fillStyle='#2f2a25'; ctx.beginPath(); ctx.arc(x+w*0.45,y-h*0.86,1.6,0,Math.PI*2); ctx.arc(x+w*0.55,y-h*0.86,1.6,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2f2a25'; ctx.lineWidth=1.4; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(x+w*0.5,y-h*0.83,3,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
  }
  function drawMoth(x,ay,w,h,bob){
    const cx=x+w/2, cy=ay+h/2 + Math.sin(state.t*6+(bob||0))*3;
    const flap=Math.sin(state.t*18)*0.4;
    ctx.save(); ctx.translate(cx,cy); ctx.fillStyle='#8a7d5e';
    ctx.save(); ctx.rotate(-0.5-flap); ctx.beginPath(); ctx.ellipse(-8,0,16,10,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(0.5+flap); ctx.beginPath(); ctx.ellipse(8,0,16,10,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.fillStyle='#6f6347';
    ctx.save(); ctx.rotate(-0.5-flap); ctx.beginPath(); ctx.ellipse(-13,0,5,6,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(0.5+flap); ctx.beginPath(); ctx.ellipse(13,0,5,6,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.restore();
    ctx.fillStyle='#4a4030'; ctx.beginPath(); ctx.ellipse(cx,cy,5,11,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy-11,4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#4a4030'; ctx.lineWidth=1.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(cx-1,cy-14); ctx.lineTo(cx-5,cy-20); ctx.moveTo(cx+1,cy-14); ctx.lineTo(cx+5,cy-20); ctx.stroke();
    ctx.fillStyle='#e23b3b'; ctx.beginPath(); ctx.arc(cx-2,cy-11,1.7,0,Math.PI*2); ctx.arc(cx+2,cy-11,1.7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2f2a25'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(cx-4.5,cy-14); ctx.lineTo(cx-1,cy-12); ctx.moveTo(cx+4.5,cy-14); ctx.lineTo(cx+1,cy-12); ctx.stroke();
  }
  function drawObstacle(o){
    const x=o.x;
    switch(o.type){
      case 'emu': drawEmu(x,o.w,o.h); break;
      case 'croc': drawCroc(x,o.w,o.h); break;
      case 'koala': drawKoala(x,o.w,o.h); break;
      case 'ranger': drawRanger(x,o.w,o.h); break;
      case 'moth': drawMoth(x,o.ay,o.w,o.h,o.bob); break;
      default: drawKangaroo(x,o.w,o.h);
    }
  }
  function drawFive(x,y){
    ctx.fillStyle='rgba(246,207,87,.3)'; ctx.beginPath(); ctx.arc(x,y,30,0,Math.PI*2); ctx.fill();
    ctx.save(); ctx.translate(x,y); ctx.rotate(-0.25); ctx.fillStyle='#f0a83d';
    ctx.beginPath(); ctx.moveTo(-20,-14); ctx.lineTo(10,-14); ctx.lineTo(22,0); ctx.lineTo(10,14); ctx.lineTo(-20,14); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(12,0,3.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 13px Quicksand,Segoe UI,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('5%', -6, 0); ctx.restore();
  }
  function draw(){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,C.skyTop); g.addColorStop(1,C.skyBot);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(246,207,87,.5)'; ctx.beginPath(); ctx.arc(W-120,90,55,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(246,207,87,.85)'; ctx.beginPath(); ctx.arc(W-120,90,38,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.7)';
    clouds.forEach(c=>{ const s=c.s*22; ctx.beginPath(); ctx.arc(c.x,c.y,s,0,Math.PI*2); ctx.arc(c.x+s,c.y+4,s*0.8,0,Math.PI*2); ctx.arc(c.x-s,c.y+5,s*0.7,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle=C.hillFar; ctx.beginPath(); ctx.moveTo(0,ground-30);
    for(let x=0;x<=W;x+=60){ ctx.lineTo(x, ground-30 - Math.sin((x+state.t*30)*0.01)*22 - 18); }
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.fill();
    ctx.fillStyle=C.hillMid; ctx.beginPath(); ctx.moveTo(0,ground-10);
    for(let x=0;x<=W;x+=50){ ctx.lineTo(x, ground-10 - Math.sin((x+state.t*55)*0.014)*16); }
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.fill();
    bgCacti.forEach(c=>drawBgCactus(c.x,c.s));
    const gg=ctx.createLinearGradient(0,ground,0,H); gg.addColorStop(0,C.sand); gg.addColorStop(1,C.sandDark);
    ctx.fillStyle=gg; ctx.fillRect(0,ground,W,H-ground);
    ctx.strokeStyle=C.groundLine; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,ground); ctx.lineTo(W,ground); ctx.stroke();
    ctx.strokeStyle='rgba(184,154,99,.5)'; ctx.lineWidth=2;
    const off=(state.dist*8)%40;
    for(let x=-off;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,ground+22); ctx.lineTo(x+14,ground+22); ctx.stroke(); }
    collects.forEach(c=>{
      const by=c.y+Math.sin(state.t*4+c.bob)*4;
      if(c.type==='sun'){
        ctx.fillStyle=C.sun; ctx.strokeStyle='#e8b836'; ctx.lineWidth=2;
        ctx.beginPath(); for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+state.t; ctx.lineTo(c.x+Math.cos(a)*c.r*1.5, by+Math.sin(a)*c.r*1.5); ctx.lineTo(c.x+Math.cos(a+0.39)*c.r, by+Math.sin(a+0.39)*c.r);} ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(c.x,by,c.r*0.7,0,Math.PI*2); ctx.fillStyle='#fbe08a'; ctx.fill();
      }else if(c.type==='water'){
        ctx.fillStyle=C.water; ctx.strokeStyle='#2e8fbf'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(c.x, by-c.r*1.3); ctx.bezierCurveTo(c.x+c.r, by-c.r*0.1, c.x+c.r, by+c.r, c.x, by+c.r); ctx.bezierCurveTo(c.x-c.r, by+c.r, c.x-c.r, by-c.r*0.1, c.x, by-c.r*1.3); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(c.x-c.r*0.3, by+c.r*0.2, 3,5,0,0,Math.PI*2); ctx.fill();
      }else if(c.type==='five'){ drawFive(c.x, by); }
    });
    obstacles.forEach(o=>drawObstacle(o));
    drawCactus();
    if(state.armed && state.mult>1){
      ctx.save();
      ctx.font='bold 24px Quicksand,Segoe UI,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#f0a83d'; ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=4;
      const txt='STREAK x'+state.mult;
      ctx.strokeText(txt, W/2, 66); ctx.fillText(txt, W/2, 66);
      ctx.restore();
    }
  }
  function startBonus(){
    state.mode='bonus';
    bTime=20; bBeams=[]; bMoths=[]; bParts=[]; bFireCD=0; bMothT=0.6; bFiring=false; bTargetY=H/2;
    player.y=H/2; player.vy=0; player.flash=0;
    if(!bStars.length){ for(let i=0;i<70;i++) bStars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.6+0.3,a:Math.random()*0.6+0.2}); }
    if($('archyBubble')) $('archyBubble').classList.remove('show');
    showBanner('⚡ BONUS ROUND! Aim & tap to blast the moths — +100 each! 🦋', 2800);
  }
  function bonusFire(){ if(bFireCD>0) return; bBeams.push({x:player.x+38,y:player.y,vx:1000}); bFireCD=0.14; player.flash=1; }
  function bAim(e){ const r=canvas.getBoundingClientRect(); const cy=(e.touches&&e.touches[0])?e.touches[0].clientY:e.clientY; bTargetY=Math.max(46,Math.min(H-30,(cy-r.top)/r.height*H)); }
  function endBonus(){
    state.nextBonus = (Math.floor(state.score/2000)+1)*2000;
    state.mode='play';
    obstacles=[]; collects=[]; spawnT=1.0; collectT=0.6; mothT=1.2; bFiring=false;
    player.y=ground; player.vy=0; player.onGround=true; player.jumps=0; player.squash=0;
    showBanner('Back to the sprint — keep running! 🌵', 2200);
  }
  function updateBonus(dt){
    state.t+=dt; bTime-=dt;
    if(bTime<=0){ endBonus(); return; }
    player.y += (bTargetY-player.y)*Math.min(1,dt*14);
    player.flash = Math.max(0, (player.flash||0)-dt*4);
    bFireCD-=dt; if(bFiring && bFireCD<=0) bonusFire();
    bMothT-=dt;
    if(bMothT<=0){
      bMoths.push({x:W+30, y:46+Math.random()*(H-90), r:17, bob:Math.random()*6, sp:150+Math.random()*120});
      bMothT = Math.max(0.25, 0.6-(20-bTime)*0.015) + Math.random()*0.25;
    }
    bBeams.forEach(b=>b.x+=b.vx*dt);
    bMoths.forEach(m=>m.x-=m.sp*dt);
    for(const b of bBeams){ for(const m of bMoths){ if(!m.dead&&!b.dead&&Math.hypot(b.x-m.x,b.y-m.y)<m.r+7){ m.dead=true; b.dead=true; state.bonus+=100; for(let i=0;i<10;i++) bParts.push({x:m.x,y:m.y,vx:(Math.random()-.5)*260,vy:(Math.random()-.5)*260,life:.5,c:Math.random()<.5?'#8effc0':'#ffd86b'}); } } }
    bBeams=bBeams.filter(b=>!b.dead&&b.x<W+30);
    bMoths=bMoths.filter(m=>!m.dead&&m.x>-40);
    for(const m of bMoths){ if(Math.hypot(m.x-player.x,m.y-player.y)<m.r+26){ endBonus(); return; } }
    bParts.forEach(p=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; });
    bParts=bParts.filter(p=>p.life>0);
    state.score = Math.floor(state.dist) + state.bonus;
    if($('score')) $('score').textContent=state.score;
  }
  function drawBonusMoth(m){
    const cx=m.x, cy=m.y+Math.sin(state.t*6+m.bob)*3, flap=Math.sin(state.t*20+m.bob)*0.45;
    ctx.save(); ctx.translate(cx,cy); ctx.fillStyle='#9a8bbf';
    ctx.save(); ctx.rotate(-0.5-flap); ctx.beginPath(); ctx.ellipse(-8,0,16,10,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(0.5+flap); ctx.beginPath(); ctx.ellipse(8,0,16,10,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.restore();
    ctx.fillStyle='#5e5280'; ctx.beginPath(); ctx.ellipse(cx,cy,5,11,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy-11,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ff5b5b'; ctx.beginPath(); ctx.arc(cx-2,cy-11,1.8,0,Math.PI*2); ctx.arc(cx+2,cy-11,1.8,0,Math.PI*2); ctx.fill();
  }
  function drawBonusPlayer(){
    const x=player.x, y=player.y;
    if(player.flash>0){ ctx.fillStyle='rgba(140,255,192,'+(player.flash*0.5)+')'; ctx.beginPath(); ctx.arc(x+44,y,18*player.flash+8,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle=C.cactus; roundRect(x-26,y-42,52,84,26); ctx.fill();
    ctx.fillStyle=C.cactusDark; roundRect(x+2,y-34,16,68,10); ctx.fill();
    ctx.fillStyle=C.cactusLight; roundRect(x-22,y-34,12,60,8); ctx.fill();
    ctx.fillStyle=C.cactus; roundRect(x-40,y-2,16,30,8); ctx.fill();
    ctx.fillStyle=C.cactusLight; roundRect(x+22,y-10,20,20,9); ctx.fill();
    ctx.fillStyle=C.flower; ctx.strokeStyle='#e6e2d2'; ctx.lineWidth=1;
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+state.t*0.6; ctx.beginPath(); ctx.ellipse(x+Math.cos(a)*8, y-46+Math.sin(a)*8, 5,9, a, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle='#f6cf57'; ctx.beginPath(); ctx.arc(x,y-46,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2f3b30';
    ctx.beginPath(); ctx.arc(x-4,y-6,3.2,0,Math.PI*2); ctx.arc(x+12,y-6,3.2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2f3b30'; ctx.lineWidth=2.2; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x-8,y-12); ctx.lineTo(x-1,y-9); ctx.moveTo(x+16,y-12); ctx.lineTo(x+8,y-9); ctx.stroke();
    ctx.beginPath(); ctx.arc(x+4,y+6,5,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
  }
  function drawBonus(){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#3a2a63'); g.addColorStop(1,'#6b4a86');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    bStars.forEach(s=>{ ctx.globalAlpha=s.a*(0.6+0.4*Math.sin(state.t*2+s.x)); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); });
    ctx.globalAlpha=1;
    ctx.fillStyle='rgba(255,245,210,.85)'; ctx.beginPath(); ctx.arc(W-110,90,40,0,Math.PI*2); ctx.fill();
    bBeams.forEach(b=>{ ctx.strokeStyle='#8effc0'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.shadowColor='#8effc0'; ctx.shadowBlur=12; ctx.beginPath(); ctx.moveTo(b.x-22,b.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.shadowBlur=0; });
    bMoths.forEach(drawBonusMoth);
    bParts.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life*2); ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); }); ctx.globalAlpha=1;
    drawBonusPlayer();
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#ffd86b';
    ctx.font='bold 22px Quicksand,Segoe UI,sans-serif';
    ctx.fillText('★ BONUS ★   '+Math.ceil(bTime)+'s', W/2, 66);
    ctx.restore();
  }
  function launchBonus(){ state.bonusCount=(state.bonusCount||0)+1; if(state.bonusCount%2===1) startBonus(); else startDance(); }
  function startDance(){
    state.mode='dance';
    dArrows=[]; dParts=[]; dSpawnT=0.8; dTime=20; dStreak=0; dMult=1; dFlash={left:0,down:0,up:0,right:0};
    if($('archyBubble')) $('archyBubble').classList.remove('show');
    showBanner('💃 DANCE BONUS! Hit the arrows in the zone — arrow keys or tap the lanes!', 2800);
  }
  function danceSpawn(){
    const elapsed=20-dTime, dbl=Math.random()<Math.min(0.55,elapsed*0.03), used=[], n=dbl?2:1;
    for(let k=0;k<n;k++){ let l; do{l=Math.floor(Math.random()*4);}while(used.indexOf(l)>=0); used.push(l); dArrows.push({lane:l,y:-30,hit:false,miss:false}); }
  }
  function dancePress(lane){
    if(state.mode!=='dance') return;
    let best=null,bd=1e9;
    for(const a of dArrows){ if(a.lane===lane&&!a.hit&&!a.miss){ const d=Math.abs(a.y-DZONE); if(d<=DWIN&&d<bd){bd=d;best=a;} } }
    if(best){ best.hit=true; dStreak++; dMult=Math.min(5,1+Math.floor(dStreak/4)); state.bonus+=50*dMult; dFlash[DDIRS[lane]]=1;
      for(let i=0;i<10;i++) dParts.push({x:DLANEX[lane],y:DZONE,vx:(Math.random()-.5)*260,vy:(Math.random()-.5)*260,life:.5,c:DCOL[DDIRS[lane]]}); }
    else { dFlash[DDIRS[lane]]=0.4; }
  }
  function danceTapX(clientX){ const r=canvas.getBoundingClientRect(); const cx=(clientX-r.left)/r.width*W; let best=0,bd=1e9; for(let i=0;i<4;i++){ const d=Math.abs(cx-DLANEX[i]); if(d<bd){bd=d;best=i;} } dancePress(best); }
  function updateDance(dt){
    state.t+=dt; dTime-=dt;
    if(dTime<=0){ endBonus(); return; }
    const elapsed=20-dTime, fall=230+elapsed*17;
    dSpawnT-=dt; if(dSpawnT<=0){ danceSpawn(); dSpawnT=Math.max(0.42,1.0-elapsed*0.028)+Math.random()*0.18; }
    dArrows.forEach(a=>{ if(!a.hit) a.y+=fall*dt; });
    for(const a of dArrows){ if(!a.hit&&!a.miss&&a.y>DMISSY){ a.miss=true; dStreak=0; dMult=1; } }
    dArrows=dArrows.filter(a=>a.y<H+40 && !a.hit);
    for(const k in dFlash) dFlash[k]=Math.max(0,dFlash[k]-dt*3);
    dParts.forEach(p=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; }); dParts=dParts.filter(p=>p.life>0);
    state.score=Math.floor(state.dist)+state.bonus;
    if($('score')) $('score').textContent=state.score;
  }
  function arrowPath(cx,cy,dir,s){
    ctx.beginPath();
    if(dir==='up'){ctx.moveTo(cx,cy-s);ctx.lineTo(cx+s,cy+s*0.4);ctx.lineTo(cx+s*0.45,cy+s*0.4);ctx.lineTo(cx+s*0.45,cy+s);ctx.lineTo(cx-s*0.45,cy+s);ctx.lineTo(cx-s*0.45,cy+s*0.4);ctx.lineTo(cx-s,cy+s*0.4);}
    else if(dir==='down'){ctx.moveTo(cx,cy+s);ctx.lineTo(cx+s,cy-s*0.4);ctx.lineTo(cx+s*0.45,cy-s*0.4);ctx.lineTo(cx+s*0.45,cy-s);ctx.lineTo(cx-s*0.45,cy-s);ctx.lineTo(cx-s*0.45,cy-s*0.4);ctx.lineTo(cx-s,cy-s*0.4);}
    else if(dir==='left'){ctx.moveTo(cx-s,cy);ctx.lineTo(cx+s*0.4,cy+s);ctx.lineTo(cx+s*0.4,cy+s*0.45);ctx.lineTo(cx+s,cy+s*0.45);ctx.lineTo(cx+s,cy-s*0.45);ctx.lineTo(cx+s*0.4,cy-s*0.45);ctx.lineTo(cx+s*0.4,cy-s);}
    else {ctx.moveTo(cx+s,cy);ctx.lineTo(cx-s*0.4,cy+s);ctx.lineTo(cx-s*0.4,cy+s*0.45);ctx.lineTo(cx-s,cy+s*0.45);ctx.lineTo(cx-s,cy-s*0.45);ctx.lineTo(cx-s*0.4,cy-s*0.45);ctx.lineTo(cx-s*0.4,cy-s);}
    ctx.closePath();
  }
  function star(cx,cy,r){ ctx.beginPath(); for(let i=0;i<5;i++){const a=-Math.PI/2+i*2*Math.PI/5; ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); const a2=a+Math.PI/5; ctx.lineTo(cx+Math.cos(a2)*r*0.45,cy+Math.sin(a2)*r*0.45);} ctx.closePath(); ctx.fill(); }
  function drawHat(cx,cy,w,sc){
    ctx.fillStyle='#c8a86a';
    ctx.beginPath(); ctx.ellipse(cx,cy+3*sc, w*0.95, 6*sc,0,0,Math.PI*2); ctx.fill();
    roundRect(cx-w*0.42, cy-12*sc, w*0.84, 15*sc, 6*sc); ctx.fill();
    ctx.fillStyle='#b3915a'; ctx.fillRect(cx-w*0.42, cy, w*0.84, 3*sc);
    ctx.strokeStyle='#c8a86a'; ctx.lineWidth=1.5*sc; ctx.fillStyle='#e6cf94';
    for(const dx of [-w*0.82, w*0.82]){ ctx.beginPath(); ctx.moveTo(cx+dx,cy+5*sc); ctx.lineTo(cx+dx,cy+12*sc); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx+dx,cy+14*sc,2.4*sc,3.4*sc,0,0,Math.PI*2); ctx.fill(); }
  }
  function drawDancer(x, baseY, sc, dad, phase){
    const bob=Math.sin(state.t*7+phase)*5, lean=Math.sin(state.t*3.4+phase)*0.09;
    ctx.save(); ctx.translate(x, baseY+bob); ctx.rotate(lean);
    const w=42*sc, h=78*sc, by=-h;
    ctx.fillStyle='#c87a4e'; roundRect(-w*0.58,0,w*1.16,22*sc,5); ctx.fill();
    ctx.fillStyle='#b3683f'; roundRect(-w*0.64,-6*sc,w*1.28,10*sc,4); ctx.fill();
    ctx.fillStyle='#5a8a4e'; roundRect(-w/2, by, w, h, w/2); ctx.fill();
    ctx.fillStyle='#3f6b3a'; roundRect(w*0.1, by+6, w*0.26, h-18, w*0.16); ctx.fill();
    ctx.fillStyle='#7aa86a'; roundRect(-w*0.4, by+6, w*0.16, h-20, w*0.12); ctx.fill();
    ctx.fillStyle = dad ? 'rgba(235,235,235,.92)' : '#f4c95d';
    star(-w*0.2, by+h*0.28, 3.2*sc); star(w*0.24, by+h*0.5, 3.2*sc); star(-w*0.05, by+h*0.68, 3*sc);
    if(dad){ drawHat(0, by+2*sc, w, sc); }
    else {
      ctx.fillStyle='#fbfaf4'; ctx.strokeStyle='#e6e2d2'; ctx.lineWidth=1;
      for(let i=0;i<7;i++){const a=i/7*Math.PI*2; ctx.beginPath(); ctx.ellipse(Math.cos(a)*6*sc, by-1*sc+Math.sin(a)*6*sc, 3.4*sc,6*sc, a,0,Math.PI*2); ctx.fill(); ctx.stroke();}
      ctx.fillStyle='#f6cf57'; ctx.beginPath(); ctx.arc(0, by-1*sc, 4*sc,0,Math.PI*2); ctx.fill();
    }
    const ey=by+h*0.44;
    ctx.fillStyle='rgba(244,155,193,.6)'; ctx.beginPath(); ctx.arc(-w*0.3,ey+5*sc,4.2*sc,0,Math.PI*2); ctx.arc(w*0.3,ey+5*sc,4.2*sc,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2f3b30'; ctx.beginPath(); ctx.arc(-w*0.18,ey,2.8*sc,0,Math.PI*2); ctx.arc(w*0.18,ey,2.8*sc,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2f3b30'; ctx.lineWidth=2.2*sc; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(0,ey+5*sc,5*sc,0.15*Math.PI,0.85*Math.PI); ctx.stroke();
    ctx.restore();
  }
  function drawDance(){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#3d1a5c');g.addColorStop(1,'#7a2d6b');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(let i=0;i<4;i++){ctx.fillStyle='rgba(255,255,255,'+(0.04+0.03*Math.sin(state.t*3+i))+')';ctx.fillRect(DLANEX[i]-DLANEW/2,0,DLANEW,H);}
    ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=2;
    for(let i=0;i<4;i++){ctx.strokeRect(DLANEX[i]-DLANEW/2,0,DLANEW,H);}
    ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(DLANEX[0]-DLANEW/2,DZONE-DWIN);ctx.lineTo(DLANEX[3]+DLANEW/2,DZONE-DWIN);
    ctx.moveTo(DLANEX[0]-DLANEW/2,DZONE+DWIN);ctx.lineTo(DLANEX[3]+DLANEW/2,DZONE+DWIN);ctx.stroke();
    for(let i=0;i<4;i++){const d=DDIRS[i]; ctx.globalAlpha=0.35+dFlash[d]*0.65; ctx.fillStyle=DCOL[d]; arrowPath(DLANEX[i],DZONE,d,20+dFlash[d]*6); ctx.fill(); ctx.globalAlpha=1;}
    dArrows.forEach(a=>{ const d=DDIRS[a.lane]; ctx.fillStyle=DCOL[d]; ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=2; arrowPath(DLANEX[a.lane],a.y,d,22); ctx.fill(); ctx.stroke(); });
    dParts.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    drawDancer(150,H-44,1.0,true,0); drawDancer(W-150,H-50,0.82,false,1.7);
    ctx.save();ctx.textAlign='center';ctx.fillStyle='#ffd86b';ctx.font='bold 22px Quicksand,Segoe UI,sans-serif';
    ctx.fillText('💃 DANCE   '+Math.ceil(dTime)+'s', W/2, 40);ctx.restore();
    if(dMult>1){ctx.save();ctx.textAlign='center';ctx.fillStyle='#ffe66d';ctx.font='bold 24px Quicksand,Segoe UI,sans-serif';ctx.fillText('STREAK x'+dMult,W/2,150);ctx.restore();}
  }
  let last=performance.now();
  function frame(now){
    let dt=(now-last)/1000; last=now; if(dt>0.05) dt=0.05;
    if(state.mode==='bonus'){ updateBonus(dt); drawBonus(); } else if(state.mode==='dance'){ updateDance(dt); drawDance(); } else { update(dt); draw(); }
    requestAnimationFrame(frame);
  }
  reset(false);  // open & running on load; first tap/space begins play
  requestAnimationFrame(frame);
})();
