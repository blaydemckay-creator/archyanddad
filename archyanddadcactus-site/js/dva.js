/* Archy & Dad — DAD VS ARCHY, a 2-player hotseat tank duel (just for fun) */
(function(){
  const cv = document.getElementById('dvaCanvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const W = 900, H = 506;
  cv.width = W; cv.height = H;

  const WIN_TO = 3;
  const ARCHY = { name:'Archy', x:120, body:'#e0473c', cap:'#2c2c2c', dir:1 };
  const DAD   = { name:'Dad',   x:W-120, body:'#f08a24', cap:'#e07b16', dir:-1 };

  let terrain = [];
  const S = {
    mode:'start',           // start | aim | fire | expl | over
    turn:'archy',
    angle:45, power:55, wind:0,
    scoreA:0, scoreD:0,
    proj:null, expl:null, msg:'', winner:'',
    aDir:0, pDir:0, weapon:'normal'
  };

  function genTerrain(){
    terrain = new Array(W);
    const base = H-70;
    const a1=18+Math.random()*14, a2=10+Math.random()*10;
    const p1=0.006+Math.random()*0.003, p2=0.013+Math.random()*0.004, ph=Math.random()*6;
    const hillH = 80+Math.random()*40;
    for(let x=0;x<W;x++){
      let y = base - Math.sin(x*p1+ph)*a1 - Math.sin(x*p2)*a2;
      // central hill to force arcing
      const d=(x-W/2)/150; y -= hillH*Math.exp(-d*d);
      terrain[x]=y;
    }
  }
  function groundY(x){ x=Math.max(0,Math.min(W-1,Math.round(x))); return terrain[x]; }
  function placeTanks(){ ARCHY.y=groundY(ARCHY.x); DAD.y=groundY(DAD.x); }
  function carveCrater(cx,cy,r){
    const x0=Math.max(0,Math.floor(cx-r)), x1=Math.min(W-1,Math.ceil(cx+r));
    for(let x=x0;x<=x1;x++){
      const dx=x-cx, dd=r*r-dx*dx; if(dd<=0) continue;
      const bottom=cy+Math.sqrt(dd);
      if(bottom>terrain[x]) terrain[x]=Math.min(H-4, bottom);
    }
  }
  function newWind(){ S.wind = Math.round((Math.random()*2-1)*90); }

  function activeTank(){ return S.turn==='archy'?ARCHY:DAD; }
  function enemyTank(){ return S.turn==='archy'?DAD:ARCHY; }

  function startMatch(){
    S.scoreA=0; S.scoreD=0; S.turn='archy'; S.winner='';
    genTerrain(); placeTanks(); newWind();
    S.angle=45; S.power=55; S.proj=null; S.expl=null;
    S.weapon='normal'; S.mode='aim'; S.msg='Archy starts!';
  }

  function barrelTip(t){
    const rad = S.angle*Math.PI/180;
    const len = 30;
    return { x: t.x + Math.cos(rad)*len*t.dir, y: t.y-22 - Math.sin(rad)*len,
             vx: Math.cos(rad)*t.dir, vy: -Math.sin(rad) };
  }

  function fire(){
    if(S.mode!=='aim') return;
    const t=activeTank(); const b=barrelTip(t);
    const v = S.power*9;
    S.proj = { x:b.x, y:b.y, vx:b.vx*v, vy:b.vy*v, bounce:(S.weapon==='bounce'), bounces:0 };
    S.mode='fire';
  }
  function boom(x,y,max,hit){ S.expl={x:x,y:y,r:4,max:max,hit:hit}; S.proj=null; S.mode='expl'; }
  function toggleWeapon(){ if(S.mode==='aim') S.weapon=(S.weapon==='normal'?'bounce':'normal'); }

  function endShot(hit){
    if(hit){
      if(S.turn==='archy') S.scoreA++; else S.scoreD++;
      if(S.scoreA>=WIN_TO || S.scoreD>=WIN_TO){
        S.winner = S.scoreA>S.scoreD?'Archy':'Dad';
        S.mode='over'; return;
      }
    }
    S.turn = S.turn==='archy'?'dad':'archy';
    newWind(); S.angle=45; S.power=55; S.proj=null;
    S.mode='aim'; S.msg=(S.turn==='archy'?'Archy':'Dad')+'’s turn';
  }

  // ---------- input ----------
  function press(code,down){
    if(code==='Space'){
      if(down){ if(S.mode==='start'||S.mode==='over') startMatch(); else if(S.mode==='aim') fire(); }
      return;
    }
    if(code==='KeyB'){ if(down) toggleWeapon(); return; }
    const v=down?1:0;
    if(code==='ArrowLeft'||code==='KeyA') S.aDir=down?-1:(S.aDir<0?0:S.aDir);
    else if(code==='ArrowRight'||code==='KeyD') S.aDir=down?1:(S.aDir>0?0:S.aDir);
    else if(code==='ArrowUp'||code==='KeyW') S.pDir=down?1:(S.pDir>0?0:S.pDir);
    else if(code==='ArrowDown'||code==='KeyS') S.pDir=down?-1:(S.pDir<0?0:S.pDir);
  }
  window.addEventListener('keydown', e=>{ if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.code)>=0) e.preventDefault(); press(e.code,true); });
  window.addEventListener('keyup', e=>press(e.code,false));
  cv.addEventListener('pointerdown', ()=>{ if(S.mode==='start'||S.mode==='over') startMatch(); else if(S.mode==='aim') fire(); });

  // expose for on-screen buttons
  window.DVA = {
    aim:d=>{ S.aDir=d; }, aimStop:()=>{ S.aDir=0; },
    pow:d=>{ S.pDir=d; }, powStop:()=>{ S.pDir=0; },
    fire:()=>{ if(S.mode==='start'||S.mode==='over') startMatch(); else fire(); },
    weapon:()=>{ toggleWeapon(); return S.weapon; }
  };

  // ---------- update ----------
  let last=performance.now();
  function step(now){
    const dt=Math.min(0.04,(now-last)/1000); last=now;
    if(S.mode==='aim'){
      S.angle=Math.max(15,Math.min(85,S.angle+S.aDir*55*dt));
      S.power=Math.max(10,Math.min(100,S.power+S.pDir*42*dt));
    } else if(S.mode==='fire' && S.proj){
      const p=S.proj;
      p.vy += 560*dt; p.vx += S.wind*dt;
      p.x += p.vx*dt; p.y += p.vy*dt;
      const en=enemyTank();
      const hitR = p.bounce ? (12 + p.bounces*5) : 24;
      if(Math.hypot(p.x-en.x, p.y-(en.y-14)) < hitR){
        const max = p.bounce ? Math.min(100, 22 + p.bounces*9) : 42;
        boom(p.x, p.y, max, true);
      } else if(p.x<-20 || p.x>W+20){
        endShot(false);
      } else if(p.y >= groundY(p.x)){
        if(!p.bounce){ boom(p.x, Math.min(p.y,groundY(p.x)), 42, false); }
        else {
          p.bounces++;
          const xi=Math.round(p.x);
          let nx=(groundY(Math.min(W-1,xi+3))-groundY(Math.max(0,xi-3)))/6, ny=-1;
          const nl=Math.hypot(nx,ny)||1; nx/=nl; ny/=nl;
          const dot=p.vx*nx+p.vy*ny;
          p.vx=(p.vx-2*dot*nx)*0.68; p.vy=(p.vy-2*dot*ny)*0.68;
          p.y=groundY(p.x)-4;
          if(Math.hypot(p.vx,p.vy)<60 || p.bounces>16){ boom(p.x, groundY(p.x), 16, false); }
        }
      }
    } else if(S.mode==='expl' && S.expl){
      S.expl.r += 150*dt;
      if(S.expl.r>=S.expl.max){ const hit=S.expl.hit; carveCrater(S.expl.x, S.expl.y, S.expl.max); placeTanks(); S.expl=null; endShot(hit); }
    }
    draw();
    requestAnimationFrame(step);
  }

  // ---------- draw ----------
  function sky(){ const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#bfe0f5'); g.addColorStop(1,'#e9f6ff'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.85)'; cloud(180,80,1); cloud(680,60,.8); }
  function cloud(x,y,s){ ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.beginPath();ctx.arc(0,0,22,0,7);ctx.arc(26,5,18,0,7);ctx.arc(-22,6,15,0,7);ctx.fill();ctx.restore(); }
  function drawTerrain(){ ctx.beginPath(); ctx.moveTo(0,H); for(let x=0;x<W;x++) ctx.lineTo(x,terrain[x]); ctx.lineTo(W,H); ctx.closePath();
    ctx.fillStyle='#7fb86a'; ctx.fill(); ctx.fillStyle='#6fa85c'; ctx.fillRect(0,0,0,0);
    // grass top line
    ctx.strokeStyle='#5f9a4e'; ctx.lineWidth=4; ctx.beginPath(); for(let x=0;x<W;x++){ if(x===0)ctx.moveTo(x,terrain[x]); else ctx.lineTo(x,terrain[x]); } ctx.stroke(); }
  function drawTank(t,active){
    ctx.save();
    // body
    ctx.fillStyle=t.body; ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=3;
    roundRect(t.x-22,t.y-18,44,18,7); ctx.fill(); ctx.stroke();
    // tracks
    ctx.fillStyle='#444'; roundRect(t.x-24,t.y-6,48,8,4); ctx.fill();
    // turret
    ctx.fillStyle=t.cap; ctx.beginPath(); ctx.arc(t.x,t.y-20,11,Math.PI,0); ctx.fill();
    // barrel (active aims; idle points roughly at foe)
    const ang = active ? S.angle : 30;
    const rad = ang*Math.PI/180;
    ctx.strokeStyle=t.cap; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(t.x,t.y-22); ctx.lineTo(t.x+Math.cos(rad)*26*t.dir, t.y-22-Math.sin(rad)*26); ctx.stroke();
    // name
    ctx.fillStyle='#33402e'; ctx.font='800 13px Quicksand, sans-serif'; ctx.textAlign='center';
    ctx.fillText(t.name, t.x, t.y+16);
    ctx.restore();
  }
  function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  function drawAimPreview(){
    const t=activeTank(); const b=barrelTip(t); const v=S.power*9;
    let x=b.x,y=b.y,vx=b.vx*v,vy=b.vy*v; const dt=0.03;
    ctx.fillStyle='rgba(51,64,46,.5)';
    for(let i=0;i<40;i++){ vy+=560*dt; vx+=S.wind*dt; x+=vx*dt; y+=vy*dt; if(x<0||x>W||y>groundY(x))break; if(i%2===0){ ctx.beginPath(); ctx.arc(x,y,2.4,0,7); ctx.fill(); } }
  }

  function hud(){
    ctx.textAlign='left'; ctx.font='800 16px Quicksand, sans-serif';
    ctx.fillStyle=ARCHY.body; ctx.fillText('Archy  '+S.scoreA, 16, 26);
    ctx.textAlign='right'; ctx.fillStyle=DAD.body; ctx.fillText(S.scoreD+'  Dad', W-16, 26);
    // turn + wind centre
    ctx.textAlign='center';
    ctx.fillStyle='#33402e'; ctx.font='800 15px Quicksand, sans-serif';
    if(S.mode==='aim'||S.mode==='fire'||S.mode==='expl'){
      ctx.fillText((S.turn==='archy'?'Archy':'Dad')+'’s turn', W/2, 22);
      // wind
      const dir=S.wind>0?'→':(S.wind<0?'←':'·'); 
      ctx.fillText('Wind '+dir+' '+Math.abs(S.wind), W/2, 42);
      ctx.fillStyle=S.weapon==='bounce'?'#2f6fb0':'#33402e';
      ctx.fillText('Shot: '+(S.weapon==='bounce'?'💣 Bouncy Bomb':'Normal'), W/2, 60);
    }
    if(S.mode==='aim'){
      // angle + power readout near active tank
      const t=activeTank();
      ctx.fillStyle='#33402e'; ctx.font='800 13px Quicksand, sans-serif'; ctx.textAlign='center';
      ctx.fillText('Angle '+Math.round(S.angle)+'°  ·  Power '+Math.round(S.power), t.x, t.y-44);
      // power bar
      ctx.fillStyle='rgba(0,0,0,.15)'; roundRect(t.x-30,t.y-38,60,7,3); ctx.fill();
      ctx.fillStyle='#f4c95d'; roundRect(t.x-30,t.y-38,60*(S.power/100),7,3); ctx.fill();
    }
  }

  function overlayPanel(title, lines){
    ctx.fillStyle='rgba(40,55,46,.78)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.fillStyle='#fff'; ctx.font='800 40px Quicksand, sans-serif'; ctx.fillText(title, W/2, H/2-40);
    ctx.font='600 18px Quicksand, sans-serif';
    lines.forEach((l,i)=> ctx.fillText(l, W/2, H/2+6+i*26));
  }

  function draw(){
    sky(); drawTerrain();
    drawTank(ARCHY, S.turn==='archy' && (S.mode==='aim'));
    drawTank(DAD,   S.turn==='dad'   && (S.mode==='aim'));
    if(S.proj){
      if(S.proj.bounce){ ctx.fillStyle='#3a7bd5'; ctx.beginPath(); ctx.arc(S.proj.x,S.proj.y,6,0,7); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle='#2f6fb0'; ctx.font='800 12px Quicksand,sans-serif'; ctx.textAlign='center'; ctx.fillText('×'+S.proj.bounces, S.proj.x, S.proj.y-12); }
      else { ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(S.proj.x,S.proj.y,5,0,7); ctx.fill(); }
    }
    if(S.expl){ ctx.fillStyle='rgba(244,140,40,.85)'; ctx.beginPath(); ctx.arc(S.expl.x,S.expl.y,S.expl.r,0,7); ctx.fill();
      ctx.fillStyle='rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(S.expl.x,S.expl.y,S.expl.r*0.5,0,7); ctx.fill(); }
    hud();
    if(S.mode==='start') overlayPanel('DAD vs ARCHY', ['Take turns — first to '+WIN_TO+' hits wins!','← → aim · ↑ ↓ power · SPACE fire · B = 💣 Bouncy Bomb','The Bouncy Bomb bounces off the ground, growing stronger each bounce!','Press SPACE or tap to start']);
    if(S.mode==='over') overlayPanel((S.winner==='Archy'?'🏆 Archy wins!':'🏆 Dad wins!'), ['Final: Archy '+S.scoreA+' — '+S.scoreD+' Dad','Press SPACE or tap to play again']);
  }

  requestAnimationFrame(step);
})();
