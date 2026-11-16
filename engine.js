// ===== 카드 정의 =====
const DEF={1:['gwang','hong','pi','pi'],2:['yeol','hong','pi','pi'],3:['gwang','hong','pi','pi'],4:['yeol','cho','pi','pi'],5:['yeol','cho','pi','pi'],6:['yeol','cheong','pi','pi'],7:['yeol','cho','pi','pi'],8:['gwang','yeol','pi','pi'],9:['yeol','cheong','pi','pi'],10:['yeol','cheong','pi','pi'],11:['gwang','ssang','pi','pi'],12:['gwang','yeol','tti','ssang']};
const MN=['','송학','매조','벚꽃','흑싸리','난초','모란','홍싸리','공산','국화','단풍','오동','비'];
const MCOL=['','#cfe6c8','#f6d1dc','#fbd4e4','#d6d6d6','#d9d0f0','#f7c9c9','#f3cfd8','#e8e0c2','#f6e3a8','#f6c7a0','#d8e8d0','#c8d8e8'];
const GODORI=[4,12,29],HONG=[1,5,9],CHEONG=[21,33,37],CHO=[13,17,25],BI=44;
const cm=c=>Math.floor(c/4)+1, ck=c=>DEF[cm(c)][c%4];
const grp=c=>{const k=ck(c);return k==='gwang'?'gwang':k==='yeol'?'yeol':(k==='pi'||k==='ssang')?'pi':'tti'};
const piv=c=>ck(c)==='ssang'?2:ck(c)==='pi'?1:0;

function score(caps){
  const items=[];let total=0;
  const gw=caps.filter(c=>ck(c)==='gwang'),n=gw.length,bi=gw.includes(BI);
  let gwangPts=0;
  if(n>=3){gwangPts=n===5?15:n===4?4:(bi?2:3);items.push([n===5?'오광':n===4?'사광':(bi?'비삼광':'삼광'),gwangPts]);}
  const ys=caps.filter(c=>ck(c)==='yeol');
  if(ys.length>=5)items.push([`열끗 ${ys.length}장`,ys.length-4]);
  if(GODORI.every(c=>caps.includes(c)))items.push(['고도리',5]);
  const ts=caps.filter(c=>grp(c)==='tti');
  if(ts.length>=5)items.push([`띠 ${ts.length}장`,ts.length-4]);
  if(HONG.every(c=>caps.includes(c)))items.push(['홍단',3]);
  if(CHEONG.every(c=>caps.includes(c)))items.push(['청단',3]);
  if(CHO.every(c=>caps.includes(c)))items.push(['초단',3]);
  const pv=caps.reduce((s,c)=>s+piv(c),0);let piPts=0;
  if(pv>=10){piPts=pv-9;items.push([`피 ${pv}장`,piPts]);}
  for(const it of items)total+=it[1];
  return {items,total,gwangN:n,gwangPts,yeolN:ys.length,ttiN:ts.length,piV:pv,piPts};
}

// ===== 게임 엔진 (방장이 진행) =====
function rnd(n){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function hasFour(cs){const c={};for(const x of cs){const m=cm(x);c[m]=(c[m]||0)+1;if(c[m]===4)return true}return false}
function rm(a,c){const i=a.indexOf(c);if(i>=0)a.splice(i,1)}
function newGame(names){return {revision:0,names,totals:[0,0],round:0,dealer:rnd(2),nagari:1,seq:0}}
function deal(st){
  let deck,hands,floor;
  do{deck=shuffle([...Array(48).keys()]);hands=[deck.splice(0,10),deck.splice(0,10)];floor=deck.splice(0,8);}
  while(hasFour(floor)||hasFour(hands[0])||hasFour(hands[1]));
  Object.assign(st,{deck,hands:hands.map(h=>h.sort((a,b)=>a-b)),floor,caps:[[],[]],turn:st.dealer,phase:'play',ready:[false,false],goCount:[0,0],lastGo:[0,0],shakes:[[],[]],pending:null,result:null,last:null});
  st.round++;st.log=[];record(st,null,`${st.round}판 시작`);
}
function record(st,p,text){st.log=st.log||[];st.log.push({p,text});if(st.log.length>100)st.log.shift()}
function sym(c){const k=ck(c);return {gwang:c===BI?'비광':'광',hong:'홍단',cheong:'청단',cho:'초단',tti:'띠',yeol:GODORI.includes(c)?'새':'열',ssang:'쌍피',pi:'피'}[k]}
function toast(st,text,p){st.seq++;st.toast={seq:st.seq,text,p}}
function stealPi(st,from,to){const c=st.caps[from];let i=c.findIndex(x=>ck(x)==='pi');if(i<0)i=c.findIndex(x=>ck(x)==='ssang');if(i<0)return null;const x=c.splice(i,1)[0];st.caps[to].push(x);return x}

function shake(st,p,m){
  if(st.phase!=='play'||st.turn!==p||!Number.isInteger(m)||m<1||m>12)return false;
  st.shakes=st.shakes||[[],[]];
  if(st.shakes[p].includes(m)||st.hands[p].filter(c=>cm(c)===m).length!==3)return false;
  st.shakes[p].push(m);record(st,p,`${m}월 흔들기 선언`);toast(st,`${m}월 흔들기!`,p);return true;
}

function playCard(st,p,c,choice){
  if(st.phase!=='play'||st.turn!==p||!Number.isInteger(c)||c<0||c>47)return false;
  const h=st.hands[p];if(!h.includes(c))return false;
  const options=st.floor.filter(x=>cm(x)===cm(c));
  if(options.length===2&&ck(options[0])!==ck(options[1])&&!options.includes(choice))return false;
  rm(h,c);
  const m=cm(c),fl=st.floor.filter(x=>cm(x)===m);
  const ctx={p,m,captured:[],pair:null,placed:false,steal:0,ev:[],flN:fl.length,played:c,flipped:null};
  if(fl.length===0){st.floor.push(c);ctx.placed=true}
  else if(fl.length===1){ctx.pair=[c,fl[0]];rm(st.floor,fl[0])}
  else if(fl.length===2){const f=fl.includes(choice)?choice:fl[0];ctx.pair=[c,f];rm(st.floor,f)}
  else{ctx.captured.push(c,...fl);fl.forEach(x=>rm(st.floor,x));ctx.steal++;ctx.ev.push('뻑 먹기!')}
  const F=st.deck.pop();ctx.flipped=F===undefined?null:F;
  if(F!==undefined){
    const n=cm(F);
    if(n===m&&ctx.flN<3){
      if(ctx.placed){rm(st.floor,c);ctx.captured.push(c,F);ctx.steal++;ctx.ev.push('쪽!')}
      else if(ctx.flN===1){st.floor.push(...ctx.pair,F);ctx.pair=null;ctx.ev.push('뻑!')}
      else{const g=st.floor.filter(x=>cm(x)===m);g.forEach(x=>rm(st.floor,x));ctx.captured.push(...ctx.pair,...g,F);ctx.pair=null;ctx.steal++;ctx.ev.push('따닥!')}
    }else{
      const ff=st.floor.filter(x=>cm(x)===n);
      if(ff.length===0)st.floor.push(F);
      else if(ff.length===1){rm(st.floor,ff[0]);ctx.captured.push(F,ff[0])}
      else if(ff.length===2){
        if(ck(ff[0])===ck(ff[1])){rm(st.floor,ff[0]);ctx.captured.push(F,ff[0])}
        else{st.pending={...ctx,F,opts:ff};st.phase='chooseFlip';st.last={p,played:c,flipped:F};return true}
      }else{ff.forEach(x=>rm(st.floor,x));ctx.captured.push(F,...ff);ctx.steal++;ctx.ev.push('뻑 먹기!')}
    }
  }
  finishTurn(st,ctx);return true;
}
function chooseFlip(st,p,f){
  const pd=st.pending;if(st.phase!=='chooseFlip'||!pd||pd.p!==p||!pd.opts.includes(f))return false;
  rm(st.floor,f);pd.captured.push(pd.F,f);st.pending=null;finishTurn(st,pd);return true;
}
function finishTurn(st,ctx){
  const p=ctx.p,o=1-p;
  if(ctx.pair)ctx.captured.push(...ctx.pair);
  st.caps[p].push(...ctx.captured);
  if(st.floor.length===0&&ctx.captured.length&&(st.hands[0].length+st.hands[1].length)>0){ctx.steal++;ctx.ev.push('싹쓸이!')}
  let stolen=0;for(let i=0;i<ctx.steal;i++)if(stealPi(st,o,p)!==null)stolen++;
  if(stolen)ctx.ev.push(`피 ${stolen}장 뺏기`);
  st.last={p,played:ctx.played,flipped:ctx.flipped};
  const describe=c=>`${cm(c)}월 ${sym(c)}`;
  record(st,p,`낸 패 ${describe(ctx.played)}${ctx.flipped!==null?` · 뒤집은 패 ${describe(ctx.flipped)}`:''}${ctx.ev.length?' · '+ctx.ev.join(' '):''}`);
  if(ctx.ev.length)toast(st,ctx.ev.join(' '),p);
  const s=score(st.caps[p]).total;
  if(s>=7&&s>st.lastGo[p]){
    if(st.hands[p].length===0){endRound(st,p);return}
    st.phase='goStop';st.turn=p;return;
  }
  if(st.hands[0].length===0&&st.hands[1].length===0){endRound(st,null);return}
  st.turn=o;st.phase='play';
}
function goStop(st,p,go){
  if(st.phase!=='goStop'||st.turn!==p)return false;
  record(st,p,go?`${st.goCount[p]+1}고 선언`:'스톱 선언');
  if(go){st.goCount[p]++;st.lastGo[p]=score(st.caps[p]).total;toast(st,`${st.goCount[p]}고!`,p);st.turn=1-p;st.phase='play';}
  else endRound(st,p);
}
function endRound(st,w){
  if(st.phase==='end')return;
  st.phase='end';st.ready=[false,false];
  if(w===null){st.result={nagari:true,mult:st.nagari*2};st.nagari*=2;record(st,null,`나가리 · 다음 판 ×${st.nagari}`);toast(st,'나가리',0);return}
  const l=1-w,sw=score(st.caps[w]),sl=score(st.caps[l]),g=st.goCount[w];
  const base=sw.total+Math.min(g,2),mults=[];
  if(g>=3)mults.push([`${g}고`,2**(g-2)]);
  if(sw.piPts>0&&sl.piV>0&&sl.piV<=5)mults.push(['피박',2]);
  if(sw.gwangPts>0&&sl.gwangN===0)mults.push(['광박',2]);
  if(sw.yeolN>=7)mults.push(['멍박',2]);
  if(st.goCount[l]>0)mults.push(['고박',2]);
  if(st.nagari>1)mults.push(['나가리 보너스',st.nagari]);
  const shakeN=(st.shakes?.[w]||[]).length;if(shakeN)mults.push([`흔들기 ${shakeN}회`,2**shakeN]);
  const total=mults.reduce((t,m)=>t*m[1],base);
  st.totals[w]+=total;st.totals[l]-=total;
  st.result={w,items:sw.items,g,base,mults,total};
  record(st,w,`승리 · 최종 ${total}점`);
  st.dealer=w;st.nagari=1;
}

// ===== 컴퓨터 =====
function val(c){const k=ck(c);if(k==='gwang')return c===BI?4:6;if(k==='yeol')return GODORI.includes(c)?5:3;if(k==='hong'||k==='cheong'||k==='cho')return 3.5;if(k==='tti')return 2;if(k==='ssang')return 2.5;return 1}
function botAct(st,p){
  if(st.phase==='goStop'&&st.turn===p){goStop(st,p,st.hands[p].length>=3&&score(st.caps[1-p]).total<4);return true}
  if(st.phase==='chooseFlip'&&st.pending&&st.pending.p===p){const b=[...st.pending.opts].sort((a,b)=>val(b)-val(a))[0];return chooseFlip(st,p,b)}
  if(st.phase==='play'&&st.turn===p){
    let best=null,bs=-1e9,bf=null;
    for(const c of st.hands[p]){
      const fl=st.floor.filter(x=>cm(x)===cm(c));let s,f=null;
      if(fl.length===0)s=-val(c)*.5;
      else if(fl.length===3)s=val(c)+fl.reduce((a,x)=>a+val(x),0)+2;
      else{const so=[...fl].sort((a,b)=>val(b)-val(a));f=so[0];s=val(c)+val(f)}
      s+=Math.random()*.3;
      if(s>bs){bs=s;best=c;bf=f}
    }
    return playCard(st,p,best,bf);
  }
  return false;
}


function reduceAction(s,p,a){
 if(!s||!a||![0,1].includes(p)||typeof a.type!=='string')return false;
 if(a.type==='shake')return shake(s,p,a.m);
 if(a.type==='play')return playCard(s,p,a.c,a.f);
 if(a.type==='flip')return chooseFlip(s,p,a.c);
 if((a.type==='go'||a.type==='stop')&&s.phase==='goStop'&&s.turn===p){goStop(s,p,a.type==='go');return true}
 if(a.type==='next'&&s.phase==='end'&&!s.ready[p]){s.ready[p]=true;if(s.ready.every(Boolean))deal(s);return true}
 return false;
}
function allCards(s){let a=[...s.deck,...s.floor,...s.hands.flat(),...s.caps.flat()];if(s.pending){a.push(...s.pending.captured,s.pending.F);if(s.pending.pair)a.push(...s.pending.pair)}return a}

function validState(s){try{
 const pair=(a,f)=>Array.isArray(a)&&a.length===2&&a.every(f), nonneg=n=>Number.isSafeInteger(n)&&n>=0;
 const card=c=>Number.isInteger(c)&&c>=0&&c<48, cards=a=>Array.isArray(a)&&a.every(card);
 const actor=p=>p===0||p===1;
 if(!s||!pair(s.names,n=>typeof n==='string'&&n.length<=8)||!pair(s.totals,Number.isSafeInteger)||s.totals[0]+s.totals[1]!==0)return false;
 if(!cards(s.deck)||!cards(s.floor)||!pair(s.hands,cards)||!pair(s.caps,cards)||!actor(s.turn)||!actor(s.dealer))return false;
 if(!pair(s.goCount,n=>nonneg(n)&&n<=10)||!pair(s.lastGo,n=>nonneg(n)&&n<=100)||!pair(s.shakes,a=>Array.isArray(a)&&new Set(a).size===a.length&&a.every(m=>Number.isInteger(m)&&m>=1&&m<=12)))return false;
 if(!nonneg(s.seq)||!nonneg(s.revision)||!Number.isSafeInteger(s.round)||s.round<1||!Number.isSafeInteger(s.nagari)||s.nagari<1||!Number.isInteger(Math.log2(s.nagari)))return false;
 if(!pair(s.ready,x=>typeof x==='boolean')||!Array.isArray(s.log)||s.log.length>100||!s.log.every(e=>e&&(e.p===null||actor(e.p))&&typeof e.text==='string'&&e.text.length<=500))return false;
 if(!['play','chooseFlip','goStop','end'].includes(s.phase))return false;
 if(s.last!==null&&(!s.last||!actor(s.last.p)||!card(s.last.played)||(s.last.flipped!==null&&!card(s.last.flipped))))return false;
 if(s.toast!==undefined&&(!s.toast||!nonneg(s.toast.seq)||s.toast.seq>s.seq||!actor(s.toast.p)||typeof s.toast.text!=='string'||s.toast.text.length>500))return false;
 if(s.phase==='chooseFlip'){
  const p=s.pending;if(!p||p.p!==s.turn||!card(p.F)||!card(p.played)||p.flipped!==p.F||!cards(p.captured)||!(p.pair===null||cards(p.pair)&&p.pair.length===2)||!Array.isArray(p.opts)||p.opts.length!==2||!p.opts.every(c=>card(c)&&s.floor.includes(c)&&cm(c)===cm(p.F))||new Set(p.opts).size!==2||!nonneg(p.steal)||p.steal>3||!Array.isArray(p.ev)||!p.ev.every(t=>typeof t==='string'&&t.length<100))return false;
 }else if(s.pending!==null)return false;
 if(s.phase==='end'){
  const r=s.result;if(!r||s.hands.some(h=>h.length>10))return false;
  if(r.nagari){if(r.mult!==s.nagari)return false;}
  else if(!actor(r.w)||!nonneg(r.base)||!nonneg(r.total)||!nonneg(r.g)||!Array.isArray(r.items)||!Array.isArray(r.mults)||![...r.items,...r.mults].every(a=>Array.isArray(a)&&a.length===2&&typeof a[0]==='string'&&a[0].length<=100&&nonneg(a[1])))return false;
 }else if(s.result!==null||s.ready.some(Boolean))return false;
 if(s.phase==='goStop'&&(s.hands[s.turn].length===0||score(s.caps[s.turn]).total<7))return false;
 const a=allCards(s);return a.length===48&&new Set(a).size===48&&a.every(card)&&s.hands.every(h=>h.length<=10);
 }catch(e){return false}}
