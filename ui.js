// ===== 화면 =====
function cardHTML(c,cls='',extra=''){
  if(c===null||c===undefined)return `<div class="card back ${cls}">${cardBackArt()}</div>`;
  const m=cm(c),interactive=extra.includes('onclick='),tag=interactive?'button':'div';
  return `<${tag} ${interactive?`type="button" aria-label="${m}월 ${MN[m]} ${sym(c)}"`:""} class="card k-${ck(c)} ${cls}" style="--mc:${MCOL[m]}" data-id="${c}" ${extra}><span class="mo">${m}</span><span class="sym">${sym(c)}</span>${cardArt(c)}<span class="nm">${MN[m]}</span></${tag}>`;
}
function capsHTML(caps){
  const G=[['gwang','광'],['yeol','열끗'],['tti','띠'],['pi','피']];
  return G.map(([g,l])=>{const cs=caps.filter(c=>grp(c)===g).sort((a,b)=>a-b);if(!cs.length)return '';
    const n=g==='pi'?cs.reduce((s,c)=>s+piv(c),0):cs.length;
    return `<div class="cg"><div class="cards">${cs.map(c=>cardHTML(c)).join('')}</div><span class="cnt">${l} ${n}</span></div>`}).join('');
}
function playerHTML(v,i,isMe){
  const sc=score(v.caps[i]);const isTurn=v.turn===i&&v.phase!=='end';
  const backs=isMe?'':`<div class="backs">${Array(v.oppN).fill(0).map(()=>cardHTML(null)).join('')}</div>`;
  return `<div class="phead"><span>${isMe?'나':''} <b>${esc(v.names[i])}</b>${isTurn?'<span class="turnmark">차례</span>':''}${v.goCount[i]?` <span class="turnmark" style="background:#d9443b;color:#fff">${v.goCount[i]}고</span>`:''}${v.shakes?.[i]?.length?` <span class="turnmark">흔들기 ${v.shakes[i].map(m=>m+'월').join(', ')}</span>`:''}</span>${backs}<span class="sc">${sc.total}점</span></div>
  <div class="caps">${capsHTML(v.caps[i])}</div><div class="items">${sc.items.map(x=>x[0]+' '+x[1]).join(' · ')}</div>`;
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function render(v){
  applyPreferences();if($('inGameShare'))$('inGameShare').hidden=mode!=='host';
  if(v.last&&v.revision!==lastSoundRevision){if(lastSoundRevision>=0)playTone();lastSoundRevision=v.revision;}
  const me=v.me,op=1-me;
  $('topL').innerHTML=`${v.code?`방 <b>${v.code}</b> · `:'연습 · '}${v.round}판${v.nagari>1?` · 나가리 x${v.nagari}`:''} · 총점 <b>${esc(v.names[me])} ${v.totals[me]}</b> : ${v.totals[op]} ${esc(v.names[op])}`;
  $('oppBox').innerHTML=playerHTML(v,op,false);
  $('meBox').innerHTML=playerHTML(v,me,true);
  const myTurn=v.phase==='play'&&v.turn===me&&(mode==='bot'||connected)&&!pendingSend;
  const selM=selected!==null?cm(selected):null;
  const months={};for(const c of v.floor)(months[cm(c)]=months[cm(c)]||[]).push(c);
  const handMonths=new Set(v.hand.map(cm));
  let t=`<div class="deck">${v.deckN?cardHTML(null):''}<span>${v.deckN}장</span></div>`;
  for(const m of Object.keys(months).map(Number).sort((a,b)=>a-b)){
    t+=`<div class="stack" data-month="${m}">${months[m].map(c=>{let cls='';
      if(selM===m)cls='opt';else if(myTurn&&handMonths.has(m))cls='match';
      if(v.last&&v.last.flipped===c)cls+=' lastf';
      return cardHTML(c,cls,selM===m?`onclick="pickFloor(${c})"`:'')}).join('')}</div>`;
  }
  $('table').innerHTML=t;$('table').style.setProperty('--groups',String(Object.keys(months).length+1));
  $('lastPlay').innerHTML=v.last?`<span>${esc(v.names[v.last.p])}의 마지막 차례</span><span>낸 패</span>${cardHTML(v.last.played)}${v.last.flipped!==null?`<span>뒤집은 패</span>${cardHTML(v.last.flipped)}`:''}`:'';
  const entries=v.log||[];
  $('historyCount').textContent=`(${entries.length}건)`;
  $('historyList').innerHTML=entries.length?[...entries].reverse().map(e=>`<p>${e.p===null?'':`<b>${esc(v.names[e.p])}</b> · `}${esc(e.text)}</p>`).join(''):'아직 기록이 없어요.';
  const floorMonths=new Set(v.floor.map(cm));
  $('hand').innerHTML=v.hand.map(c=>{let cls=myTurn?'playable':'';if(myTurn&&floorMonths.has(cm(c)))cls+=' match';if(selected===c)cls+=' sel';
    return cardHTML(c,cls,myTurn?`onclick="pickHand(${c})"`:'')}).join('');
  let s='';
  if(v.phase==='play')s=myTurn?(selected!==null?'바닥에서 먹을 패를 골라줘 (파란 테두리)':'내 차례! 낼 패를 골라줘'):`${esc(v.names[op])} 차례...`;
  else if(v.phase==='chooseFlip')s=v.pending&&v.pending.p===me?'뒤집은 패로 먹을 카드를 골라줘':`${esc(v.names[op])}가 고르는 중...`;
  else if(v.phase==='goStop')s=v.turn===me?'고? 스톱?':`${esc(v.names[op])}가 고/스톱 고민 중...`;
  else s='판 끝!';
  if(v.last&&v.phase!=='end'){s+=` <span class="muted">(${esc(v.names[v.last.p])}: ${MN[cm(v.last.played)]} 냄${v.last.flipped!==null?', '+MN[cm(v.last.flipped)]+' 뒤집음':''})</span>`}
  if(mode!=='bot'&&!connected)s='연결이 끊겨 진행을 멈췄어요. 다시 연결해줘.';else if(pendingSend)s='상대 기기의 응답을 확인 중이에요…';$('status').innerHTML=s;const sk=$('lastPlay');sk.hidden=!v.last;
  const available=myTurn?[...new Set(v.hand.map(cm))].filter(m=>v.hand.filter(c=>cm(c)===m).length===3&&!(v.shakes?.[me]||[]).includes(m)):[];
  $('shakeBar').innerHTML=available.map(m=>`<button class="btn2" onclick="act({type:'shake',m:${m}})">${m}월 흔들기 (승리 시 ×2)</button>`).join('');
  renderModal(v);
  if(v.toast&&v.toast.seq>lastToast){lastToast=v.toast.seq;showToast(`${esc(v.names[v.toast.p])}: ${esc(v.toast.text)}`,v.toast.text)}
}
function renderModal(v){
  const modalWasOpen=$('modal').style.display==='flex',modalHadFocus=$('modal').contains(document.activeElement);const me=v.me,op=1-me;let h='';const blocked=pendingSend||(mode!=='bot'&&!connected);const disabled=blocked?'disabled':'';
  if(v.phase==='chooseFlip'&&v.pending&&v.pending.p===me){
    h=`<h2>어느 패를 먹을까?</h2><div class="muted">뒤집은 패: ${MN[cm(v.pending.F)]}</div><div class="opts">${cardHTML(v.pending.F)}</div><div class="opts">${v.pending.opts.map(c=>cardHTML(c,'opt',blocked?'':`onclick="act({type:'flip',c:${c}})"`)).join('')}</div>`;
  }else if(v.phase==='goStop'&&v.turn===me){
    const sc=score(v.caps[me]);
    h=`<h2>${sc.total}점! 고? 스톱?</h2><div class="muted">${sc.items.map(x=>x[0]+' '+x[1]).join(' · ')}</div><div class="muted" style="margin-top:6px">지금 ${v.goCount[me]}고 · 상대 ${score(v.caps[op]).total}점 · 남은 패 ${v.hand.length}장</div>
      <div class="opts"><button class="btnr" style="font-size:20px;padding:14px 26px" ${disabled} onclick="act({type:'go'})" aria-label="고 계속하기">고!<small style="display:block;font-size:11px;margin-top:5px">계속 도전</small></button><button class="btn" style="font-size:20px;padding:14px 26px" ${disabled} onclick="act({type:'stop'})" aria-label="스톱 점수 확정">스톱<small style="display:block;font-size:11px;margin-top:5px">점수 확정</small></button></div>`;
  }else if(v.phase==='end'&&v.result){
    const r=v.result;
    if(r.nagari)h=`<h2>나가리</h2><div>아무도 못 났어요. 다음 판은 점수 x${v.nagari}!</div>`;
    else{
      const win=r.w===me;
      h=`<h2>${win?'내가 이겼다!':esc(v.names[r.w])+' 승리'}</h2><div class="resultScore">${r.total}<small>점</small></div><div class="muted">이번 판 획득 점수</div><table>${r.items.map(x=>`<tr><td>${esc(x[0])}</td><td>${x[1]}점</td></tr>`).join('')}${r.g?`<tr><td>${r.g}고 보너스</td><td>+${Math.min(r.g,2)}점</td></tr>`:''}<tr><td><b>기본</b></td><td><b>${r.base}점</b></td></tr>${r.mults.map(m=>`<tr><td>${esc(m[0])}</td><td>x${m[1]}</td></tr>`).join('')}<tr><td><b>최종</b></td><td><b style="color:#f2c14e;font-size:20px">${r.total}점</b></td></tr></table>`;
    }
    const ready=v.ready||[false,false];
    h+=`<div class="muted">총점 ${esc(v.names[me])} ${v.totals[me]} : ${v.totals[op]} ${esc(v.names[op])}</div><div style="margin-top:10px">${esc(v.names[me])}: ${ready[me]?'준비 완료':'준비 전'} · ${esc(v.names[op])}: ${v.mode==='bot'?'자동 준비':(ready[op]?'준비 완료':'준비 전')}</div><div class="opts"><button class="btn" ${ready[me]||blocked?'disabled style="opacity:.6;cursor:default"':''} onclick="act({type:'next'})">${ready[me]?'상대 기다리는 중':'다음 판 준비'}</button></div>`;
  }
  if(h&&blocked)h+=`<p class="connectionWarning">${pendingSend?'응답을 확인 중이에요.':'연결이 끊겨 진행을 멈췄어요.'}</p><button class="btn2" onclick="reconnectNow()">다시 연결</button>`;
  if(h)h+=`<div class="modalActions"><button class="btn2" onclick="askExit()">게임방 나가기</button><button class="btn2" onclick="copyDiagnostics()">오류 진단</button>${mode==='host'?'<button class="btn2" onclick="copyLink()">초대 링크 복사</button>':''}</div>`;
  $('mbox').innerHTML=h;$('modal').style.display=h?'flex':'none';if(h&&(!modalWasOpen||modalHadFocus))queueMicrotask(()=>{if($('modal').style.display==='flex'&&!$('modal').contains(document.activeElement))$('modal').querySelector('button:not(:disabled)')?.focus()});
}
function pickHand(c){
  if(pendingSend||(mode!=='bot'&&!connected))return;
  if(!view||view.phase!=='play'||view.turn!==view.me)return;
  const fl=view.floor.filter(x=>cm(x)===cm(c));
  if(fl.length===2&&ck(fl[0])!==ck(fl[1])){selected=selected===c?null:c;render(view);return}
  act({type:'play',c,f:fl[0]});
}
function pickFloor(f){if(selected===null)return;const c=selected;act({type:'play',c,f})}
let toastT;function showToast(t,eventText=''){const e=$('toast');if(/싹쓸이|따닥|쪽/.test(eventText)&&!matchMedia('(prefers-reduced-motion: reduce)').matches){e.style.display='none';return;}e.innerHTML=t;e.style.display='block';if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&e.animate)e.animate([{opacity:0,transform:'translate(-50%,-35%) scale(.94)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)'}],{duration:180,easing:'ease-out'});clearTimeout(toastT);toastT=setTimeout(()=>e.style.display='none',1400)}

let cardsLarge=stored(STORE_PREFIX+'large-cards',false),beginnerMode=stored(STORE_PREFIX+'beginner',false),soundEnabled=stored(STORE_PREFIX+'sound',false),audioContext=null,lastSoundRevision=-1;
function applyPreferences(){document.body.classList.toggle('beginner',!!beginnerMode);if($('beginnerButton')){$('beginnerButton').setAttribute('aria-pressed',String(!!beginnerMode));$('beginnerButton').textContent=beginnerMode?'기본 그림 모드':'초보자 설명 켜기';}$('game').classList.toggle('largeCards',!!cardsLarge);$('zoomButton').setAttribute('aria-pressed',String(!!cardsLarge));$('zoomButton').textContent=cardsLarge?'패 기본 크기':'패 크게';$('soundButton').setAttribute('aria-pressed',String(!!soundEnabled));$('soundButton').textContent=soundEnabled?'소리 끄기':'소리 켜기';}
function toggleCardZoom(){cardsLarge=!cardsLarge;persist(STORE_PREFIX+'large-cards',cardsLarge);applyPreferences();}
async function toggleSound(){soundEnabled=!soundEnabled;persist(STORE_PREFIX+'sound',soundEnabled);if(soundEnabled){try{const C=window.AudioContext||window.webkitAudioContext;if(C&&!audioContext)audioContext=new C();await audioContext?.resume();playTone();}catch(e){soundEnabled=false;notice('이 브라우저에서 소리를 켜지 못했어요.');}}applyPreferences();}
function playTone(){if(!soundEnabled||!audioContext||audioContext.state!=='running')return;try{const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.value=660;g.gain.setValueAtTime(.035,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.09);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.1);}catch(e){}}
function showCaptures(){if(!view)return;$('captureContents').innerHTML=[0,1].map(i=>'<h3>'+esc(view.names[i])+'</h3>'+capsHTML(view.caps[i])).join('');$('captureDialog').showModal();}
applyPreferences();

async function checkForUpdate(){try{const r=await fetch('build.json',{cache:'no-store'});if(!r.ok)return;const b=await r.json();if(typeof b.version==='string'&&b.version!==VERSION)$('updateNotice').textContent='새 버전이 있어요. 현재 판을 마치고 게임을 나간 뒤 두 사람 모두 새로고침해줘.';}catch(e){}}
setInterval(checkForUpdate,60000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkForUpdate();});checkForUpdate();

if($('lobbyMark'))$('lobbyMark').innerHTML=[0,8,28].map(c=>cardHTML(c)).join('');

// Presentation only: authoritative state, clocks, transport, and actions never wait on these effects.
let queuedVisual=null,visualRAF=0;
let visualFrame=null,visualJobs=[],motionStats={batches:0,skipped:0};
function stopVisuals(){for(const a of visualJobs)a.cancel();visualJobs=[];document.querySelectorAll('.fx-layer,.fx-event').forEach(e=>e.remove());document.querySelectorAll('.fx-pending').forEach(e=>e.classList.remove('fx-pending'));}
function visualSnapshot(v){return {key:[mode,v.roomId,v.code,v.round,v.me].join(':'),revision:v.revision,phase:v.phase,connected:mode==='bot'||connected,visible:document.visibilityState==='visible',last:v.last?{...v.last}:null,caps:v.caps.map(a=>[...a]),scores:v.caps.map(a=>score(a).total),toastSeq:v.toast?.seq||0};}
function cardPositions(){const map=new Map();for(const e of document.querySelectorAll('#hand .card[data-id],#table .card[data-id],#oppBox .card[data-id],#meBox .card[data-id]')){const r=e.getBoundingClientRect();if(r.width&&r.height)map.set(Number(e.dataset.id),{r:{x:r.x,y:r.y,width:r.width,height:r.height},html:e.outerHTML});}return map;}
const paintGame=render;
render=function(v){
 const before=visualFrame,positions=cardPositions(),deckRect=$('table').querySelector('.deck .card')?.getBoundingClientRect(),opRect=$('oppBox').getBoundingClientRect();stopVisuals();paintGame(v);const after=visualSnapshot(v);visualFrame=after;
 const eligible=before&&before.key===after.key&&after.revision===before.revision+1&&before.connected&&after.connected&&before.visible&&after.visible&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&typeof Element.prototype.animate==='function';
 if(eligible)queuedVisual={v:{...v,caps:v.caps.map(a=>[...a]),last:v.last?{...v.last}:null},before,positions,deckRect,opRect};else if(!queuedVisual||queuedVisual.v.revision!==after.revision||queuedVisual.before.key!==after.key||!after.connected||!after.visible){queuedVisual=null;motionStats.skipped++;}
 if(queuedVisual&&!visualRAF)visualRAF=requestAnimationFrame(()=>{visualRAF=0;const q=queuedVisual;queuedVisual=null;if(q&&document.visibilityState==='visible')animateVisualTransition(q.v,q.before,q.positions,q.deckRect,q.opRect);});
};
function animateVisualTransition(v,before,positions,deckRect,opRect){
 for(let i=0;i<2;i++){const el=$(i===v.me?'meBox':'oppBox').querySelector('.sc');if(el&&score(v.caps[i]).total!==before.scores[i]){const a=el.animate([{transform:'scale(1)',color:'#e1bd72'},{transform:'scale(1.18)',color:'#fff2c6'},{transform:'scale(1)',color:'#e1bd72'}],{duration:280});a.finished.catch(()=>{});visualJobs.push(a);}}
 if(v.toast&&v.toast.seq>before.toastSeq){const text=String(v.toast.text),kind=/싹쓸이/.test(text)?'sweep':/따닥/.test(text)?'ttadak':/쪽/.test(text)?'jjok':null;if(kind){const e=document.createElement('div');e.className='fx-event';e.dataset.kind=kind;e.textContent=kind==='sweep'?'싹쓸이':kind==='ttadak'?'따닥':'쪽';document.body.append(e);const frames=kind==='sweep'?[{opacity:0,transform:'translate(-90%,-50%)'},{opacity:1,transform:'translate(-50%,-50%)',offset:.4},{opacity:0,transform:'translate(-10%,-50%)'}]:kind==='ttadak'?[{opacity:0,transform:'translate(-50%,-50%) scale(.8)'},{opacity:1,transform:'translate(-53%,-50%) scale(1.1)',offset:.3},{opacity:1,transform:'translate(-47%,-50%) scale(1)',offset:.55},{opacity:0,transform:'translate(-50%,-50%) scale(1)'}]:[{opacity:0,transform:'translate(-50%,-40%) scale(.9)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.4},{opacity:0,transform:'translate(-50%,-60%) scale(1)'}];const a=e.animate(frames,{duration:480,easing:'ease-out'});visualJobs.push(a);a.finished.catch(()=>{}).finally(()=>e.remove());}}
 let jobs=[];const nextPositions=cardPositions();const tableRect=$('table').getBoundingClientRect();const mid={x:tableRect.x+tableRect.width/2-24,y:tableRect.y+tableRect.height/2-37,width:48,height:74};
 const played=v.last&&v.last.played,flipped=v.last&&v.last.flipped;
 if(v.last&&(!before.last||before.last.played!==played)){const from=positions.get(played)?.r||{x:opRect.x+opRect.width/2-24,y:opRect.y,width:48,height:74};jobs.push({c:played,from,to:nextPositions.get(played)?.r||mid,via:mid});}
 if(flipped!=null&&(!before.last||before.last.flipped!==flipped)){const from=deckRect?{x:deckRect.x,y:deckRect.y,width:deckRect.width,height:deckRect.height}:mid;jobs.push({c:flipped,from,to:nextPositions.get(flipped)?.r||mid,flip:true});}
 for(let i=0;i<2;i++)for(const c of v.caps[i])if(!before.caps[i].includes(c)&&!jobs.some(j=>j.c===c)){const from=positions.get(c)?.r,to=nextPositions.get(c)?.r;if(from&&to)jobs.push({c,from,to,capture:true});}
 jobs=jobs.slice(0,7);if(!jobs.length)return;motionStats.batches++;const layer=document.createElement('div');layer.className='fx-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
 for(const j of jobs){const ghost=document.createElement('div');ghost.innerHTML=cardHTML(j.c);const e=ghost.firstElementChild;e.classList.add('fx-card');e.style.setProperty('--w',j.from.width+'px');e.style.left='0';e.style.top='0';layer.append(e);const transform=r=>'translate('+r.x+'px,'+r.y+'px) scale('+(r.width/j.from.width)+')';let frames=[{transform:transform(j.from),opacity:.98},{transform:transform(j.to),opacity:1}];if(j.via)frames.splice(1,0,{transform:transform(j.via)+' rotate(-3deg)',offset:.42,opacity:1},{transform:transform(j.via)+' scale(.96)',offset:.53,opacity:1},{transform:transform(j.via),offset:.65,opacity:1});if(j.flip)frames=[{transform:transform(j.from)+' rotateY(80deg)',opacity:.4},{transform:transform(mid)+' rotateY(0deg)',opacity:1,offset:.55},{transform:transform(mid)+' scale(.96)',opacity:1,offset:.66},{transform:transform(j.to),opacity:1}];if(j.capture)frames=[{transform:transform(j.from),offset:0,opacity:1},{transform:transform(j.from),offset:.32,opacity:1},{transform:transform(mid),offset:.6,opacity:1},{transform:transform(j.to),offset:1,opacity:1}];const target=document.querySelector('#table .card[data-id="'+j.c+'"],#meBox .card[data-id="'+j.c+'"],#oppBox .card[data-id="'+j.c+'"]');target?.classList.add('fx-pending');const a=e.animate(frames,{duration:j.flip?300:260,easing:'cubic-bezier(.2,.65,.3,1)',fill:'forwards'});visualJobs.push(a);a.finished.catch(()=>{}).finally(()=>{e.remove();target?.classList.remove('fx-pending');if(!layer.children.length)layer.remove();});}
};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'){stopVisuals();queuedVisual=null;visualFrame=null;}});

$('modal').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const a=[...$('modal').querySelectorAll('button:not(:disabled)')];if(!a.length)return;const first=a[0],last=a[a.length-1];if(e.shiftKey&&(document.activeElement===first||!a.includes(document.activeElement))){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||!a.includes(document.activeElement))){e.preventDefault();first.focus()}});

function toggleBeginner(){beginnerMode=!beginnerMode;persist(STORE_PREFIX+'beginner',beginnerMode);applyPreferences();}
function inspectableCards(){if(!view)return [];return [...new Set([...view.hand,...view.floor,...view.caps[0],...view.caps[1]])];}
function showCardPicker(){if(!view)return;const group=(title,cards)=>'<h3>'+title+'</h3><div class="inspectGrid">'+cards.map(c=>cardHTML(c,'', 'onclick="inspectCard('+c+')"')).join('')+'</div>';$('cardDetailContents').innerHTML='<p class="muted">패를 눌러 크게 볼 수 있어요. 여기서는 패를 내지 않아요.</p>'+group('내 손패',view.hand)+group('바닥패',view.floor)+group('공개된 획득 패',[...view.caps[0],...view.caps[1]]);if(!$('cardDetailDialog').open)$('cardDetailDialog').showModal();$('cardDetailContents').querySelector('button')?.focus();}
function inspectCard(c){if(!Number.isInteger(c)||!inspectableCards().includes(c))return;const descriptions={gwang:'광 점수에 포함되는 패예요.',yeol:'열끗 점수에 포함되는 패예요.',hong:'홍단에 포함되는 띠예요.',cheong:'청단에 포함되는 띠예요.',cho:'초단에 포함되는 띠예요.',tti:'띠 점수에 포함되는 패예요.',pi:'피 1장으로 계산해요.',ssang:'피 2장으로 계산해요.'};$('cardDetailContents').innerHTML='<div class="cardPortrait">'+cardHTML(c)+'</div><h3>'+cm(c)+'월 '+MN[cm(c)]+' · '+sym(c)+'</h3><p>'+descriptions[ck(c)]+'</p><p class="muted">그림은 식별을 돕기 위한 표현이며 점수는 고정 규칙으로 계산해요.</p><button class="btn2" onclick="showCardPicker()">패 목록으로</button>';$('cardDetailContents').querySelector('button')?.focus();}
