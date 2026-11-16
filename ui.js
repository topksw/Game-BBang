// Original vector artwork, designed for Game BBang. No third-party card images.
function cardArt(c){const m=cm(c),k=ck(c),col=['','#275e36','#b83d5d','#ce5b80','#4e625f','#754c94','#c94143','#b84258','#746c3c','#c99028','#bd5228','#725688','#527b90'][m];
const flower=(x,y)=>'<g transform="translate('+x+' '+y+')">'+[0,72,144,216,288].map(a=>'<ellipse cx="0" cy="-5" rx="3.8" ry="6" transform="rotate('+a+')" fill="'+col+'"/>').join('')+'<circle r="2.8" fill="#efc86c"/></g>';
let scene='<path d="M6 56 Q27 39 30 14 M23 42 L43 25 M16 48 L7 29" stroke="'+col+'" stroke-width="3" fill="none"/>'+flower(30,17)+flower(43,27)+flower(9,31)+flower(22,40);
if([1,8,11].includes(m))scene='<path d="M2 59 Q18 31 34 56 L48 42 L57 62" fill="'+col+'"/>'+([1,11].includes(m)?'<path d="M28 59 L25 20 M25 32 L9 28 M26 26 L42 20" stroke="'+col+'" stroke-width="4"/><path d="M7 27 Q15 14 23 26 M29 20 Q39 8 48 20" fill="'+col+'"/>':'<circle cx="40" cy="17" r="11" fill="#edb645"/>');
if(k==='gwang')scene+='<circle cx="12" cy="12" r="8" fill="#d9443b"/><path d="M11 7 L13 12 L17 13 L12 15 L11 19 L9 14 L6 13 L10 11 Z" fill="#fff5d1"/>';
if(k==='yeol')scene+='<path d="M13 22 Q24 8 33 22 Q40 10 48 22 Q30 18 28 31 Q22 21 13 22" fill="#242c2c"/>';
return '<svg class="art" viewBox="0 0 58 64" aria-hidden="true">'+scene+'</svg>'}
// ===== 화면 =====
function cardHTML(c,cls='',extra=''){
  if(c===null||c===undefined)return `<div class="card back ${cls}"></div>`;
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
    t+=`<div class="stack">${months[m].map(c=>{let cls='';
      if(selM===m)cls='opt';else if(myTurn&&handMonths.has(m))cls='match';
      if(v.last&&v.last.flipped===c)cls+=' lastf';
      return cardHTML(c,cls,selM===m?`onclick="pickFloor(${c})"`:'')}).join('')}</div>`;
  }
  $('table').innerHTML=t;
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
  $('status').innerHTML=s;
  const available=myTurn?[...new Set(v.hand.map(cm))].filter(m=>v.hand.filter(c=>cm(c)===m).length===3&&!(v.shakes?.[me]||[]).includes(m)):[];
  $('shakeBar').innerHTML=available.map(m=>`<button class="btn2" onclick="act({type:'shake',m:${m}})">${m}월 흔들기 (승리 시 ×2)</button>`).join('');
  renderModal(v);
  if(v.toast&&v.toast.seq>lastToast){lastToast=v.toast.seq;showToast(`${esc(v.names[v.toast.p])}: ${esc(v.toast.text)}`)}
}
function renderModal(v){
  const me=v.me,op=1-me;let h='';
  if(v.phase==='chooseFlip'&&v.pending&&v.pending.p===me){
    h=`<h2>어느 패를 먹을까?</h2><div class="muted">뒤집은 패: ${MN[cm(v.pending.F)]}</div><div class="opts">${cardHTML(v.pending.F)}</div><div class="opts">${v.pending.opts.map(c=>cardHTML(c,'opt',`onclick="act({type:'flip',c:${c}})"`)).join('')}</div>`;
  }else if(v.phase==='goStop'&&v.turn===me){
    const sc=score(v.caps[me]);
    h=`<h2>${sc.total}점! 고? 스톱?</h2><div class="muted">${sc.items.map(x=>x[0]+' '+x[1]).join(' · ')}</div><div class="muted" style="margin-top:6px">지금 ${v.goCount[me]}고 · 상대 ${score(v.caps[op]).total}점 · 남은 패 ${v.hand.length}장</div>
      <div class="opts"><button class="btnr" style="font-size:20px;padding:14px 26px" onclick="act({type:'go'})">고!</button><button class="btn" style="font-size:20px;padding:14px 26px" onclick="act({type:'stop'})">스톱</button></div>`;
  }else if(v.phase==='end'&&v.result){
    const r=v.result;
    if(r.nagari)h=`<h2>나가리</h2><div>아무도 못 났어요. 다음 판은 점수 x${v.nagari}!</div>`;
    else{
      const win=r.w===me;
      h=`<h2>${win?'내가 이겼다!':esc(v.names[r.w])+' 승리'}</h2><table>${r.items.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}점</td></tr>`).join('')}${r.g?`<tr><td>${r.g}고 보너스</td><td>+${Math.min(r.g,2)}점</td></tr>`:''}<tr><td><b>기본</b></td><td><b>${r.base}점</b></td></tr>${r.mults.map(m=>`<tr><td>${m[0]}</td><td>x${m[1]}</td></tr>`).join('')}<tr><td><b>최종</b></td><td><b style="color:#f2c14e;font-size:20px">${r.total}점</b></td></tr></table>`;
    }
    const ready=v.ready||[false,false];
    h+=`<div class="muted">총점 ${esc(v.names[me])} ${v.totals[me]} : ${v.totals[op]} ${esc(v.names[op])}</div><div style="margin-top:10px">${esc(v.names[me])}: ${ready[me]?'준비 완료':'준비 전'} · ${esc(v.names[op])}: ${v.mode==='bot'?'자동 준비':(ready[op]?'준비 완료':'준비 전')}</div><div class="opts"><button class="btn" ${ready[me]?'disabled style="opacity:.6;cursor:default"':''} onclick="act({type:'next'})">${ready[me]?'상대 기다리는 중':'다음 판 준비'}</button></div>`;
  }
  if(h)h+=`<div class="modalActions"><button class="btn2" onclick="askExit()">게임방 나가기</button>${mode==='host'?'<button class="btn2" onclick="copyLink()">초대 링크 복사</button>':''}</div>`;
  $('mbox').innerHTML=h;$('modal').style.display=h?'flex':'none';
}
function pickHand(c){
  if(pendingSend||(mode!=='bot'&&!connected))return;
  if(!view||view.phase!=='play'||view.turn!==view.me)return;
  const fl=view.floor.filter(x=>cm(x)===cm(c));
  if(fl.length===2&&ck(fl[0])!==ck(fl[1])){selected=selected===c?null:c;render(view);return}
  act({type:'play',c,f:fl[0]});
}
function pickFloor(f){if(selected===null)return;const c=selected;act({type:'play',c,f})}
let toastT;function showToast(t){const e=$('toast');e.innerHTML=t;e.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>e.style.display='none',1400)}
