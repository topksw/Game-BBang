'use strict';
const VERSION='1.0.0-beta.1', PROTOCOL=1, SAVE_KEY='bbang-save-v1';
let mode=null,st=null,view=null,peer=null,conn=null,roomCode=null,selected=null,lastToast=0,botTimer=null,guestCode=null;
let roomSecret='',seatToken='',guestSeat='',connected=false,epoch=0,retryTimer=null,connectTimer=null,lastSeen=0,requestSeq=0,pendingSend=false,retries=0;
const $=id=>document.getElementById(id);
const myName=()=>($('myname').value.trim().slice(0,8)||'나');
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
function stored(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback}catch(e){return fallback}}
function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){notice('저장 공간을 쓸 수 없어 이어하기가 보장되지 않아요.');return false}}
function notice(t){$('joinMsg').textContent=t;$('hostMsg').textContent=t;}
function readSaved(){const x=stored(SAVE_KEY);return x?.version===VERSION&&x?.protocol===PROTOCOL&&validState(x.st)&&typeof x.secret==='string'&&typeof x.seat==='string'&&/^[A-Z2-9]{6}$/.test(x.code)?x:null}
function saveHost(){if(mode==='host'&&st)persist(SAVE_KEY,{version:VERSION,protocol:PROTOCOL,code:roomCode,secret:roomSecret,seat:seatToken,st})}
function refreshResume(){const x=readSaved();$('resumeBox').style.display=x?'block':'none';if(x)$('resumeCode').textContent=x.code;else if(stored(SAVE_KEY))notice('저장 데이터가 손상되었거나 다른 버전이에요. 새 방을 만들어줘.');}
$('myname').value=stored('bbang-name','');$('myname').addEventListener('change',()=>persist('bbang-name',myName()));
$('versionLabel').textContent=VERSION;refreshResume();
const inviteRoom=new URLSearchParams(location.search).get('room');
if(inviteRoom){$('joinCode').value=inviteRoom.toUpperCase();const key=new URLSearchParams(location.hash.slice(1)).get('invite');if(key)$('joinSecret').value=key;notice('초대받은 방이에요. 이름을 쓰고 참가해줘.');}
function genCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:6},()=>A[rnd(A.length)]).join('')}
function pid(c){return 'game-bbang-v1-'+c}
function cleanup(){epoch++;clearTimeout(botTimer);clearTimeout(retryTimer);clearTimeout(connectTimer);const c=conn,p=peer;conn=null;peer=null;connected=false;pendingSend=false;if(c)c.close();if(p)p.destroy();}
function showGame(){$('lobby').style.display='none';$('game').style.display='block'}
function setConn(on){connected=on;if(on){lastSeen=Date.now();retries=0}$('conn').textContent=mode==='bot'?'연습 모드':on?'연결됨':'연결 대기 / 복구 중';$('connectionHelp').hidden=on||mode==='bot';if(view)render(view)}
function viewFor(i){return {version:VERSION,revision:st.revision,me:i,code:roomCode,mode,phase:st.phase,turn:st.turn,floor:st.floor,hand:st.hands[i],oppN:st.hands[1-i].length,deckN:st.deck.length,caps:st.caps,names:st.names,goCount:st.goCount,shakes:st.shakes,totals:st.totals,pending:st.pending?{p:st.pending.p,F:st.pending.F,opts:st.pending.opts}:null,result:st.result,ready:st.ready,toast:st.toast,last:st.last,log:st.log,round:st.round,nagari:st.nagari}}
function sync(){if(!st)return;saveHost();view=viewFor(0);render(view);if(connected&&conn?.open)conn.send({t:'state',v:viewFor(1)});if(mode==='bot')scheduleBot()}
function scheduleBot(){clearTimeout(botTimer);if(st.phase==='end')return;const p=st.phase==='chooseFlip'?st.pending?.p:st.turn;if(p===1)botTimer=setTimeout(()=>{if(mode==='bot'&&botAct(st,1)){st.revision++;sync()}},850)}
function applyAct(p,a){if(!st)return false;const ok=reduceAction(st,p,a);if(ok){if(mode==='bot'&&st.phase==='end'&&a.type==='next')st.ready[1]=true;if(mode==='bot'&&st.phase==='end'&&st.ready.every(Boolean))deal(st);st.revision++;sync()}return ok}
function act(a){if(pendingSend)return;selected=null;if(mode!=='bot'&&!connected){showToast('먼저 다시 연결해줘');return}if(mode==='guest'){if(conn?.open){pendingSend=true;const sendingEpoch=epoch,sendingId=requestSeq+1;conn.send({t:'act',id:++requestSeq,rev:view.revision,round:view.round,a});render(view);setTimeout(()=>{if(epoch===sendingEpoch&&requestSeq===sendingId&&pendingSend){pendingSend=false;setConn(false);scheduleRetry()}},6000)}}else applyAct(0,a)}
function createPeer(id){if(typeof Peer==='undefined'){notice('연결 모듈을 읽지 못했어요. 새로고침해줘.');return null}return id?new Peer(id):new Peer()}
function startBot(){cleanup();mode='bot';st=newGame([myName(),'컴퓨터']);deal(st);lastToast=0;showGame();setConn(true);sync()}
function startHost(resume=false,attempt=0){
 const old=resume?readSaved():null;if(resume&&!old){notice('이 버전에서 이어할 저장 데이터가 없어요.');return}
 cleanup();mode='host';const ep=epoch;persist('bbang-name',myName());
 roomCode=old?old.code:genCode();roomSecret=old?old.secret:token();seatToken=old?old.seat:'';st=old?old.st:null;
 if(st)st.names[0]=myName();$('hostWait').style.display='block';$('hostCode').textContent=roomCode;$('hostMsg').textContent=attempt?'새 방 코드로 이어 열고 있어요. 새 초대 링크를 보내줘.':'연결 서버 접속 중…';
 const p=createPeer(pid(roomCode));peer=p;if(!p)return;
 connectTimer=setTimeout(()=>{if(epoch===ep&&!p.open)notice('연결 서버에 닿지 못했어요. 네트워크를 확인하고 다시 시도해줘.')},15000);
 p.on('open',()=>{if(epoch!==ep)return;clearTimeout(connectTimer);$('hostMsg').textContent=attempt?'새 초대 링크를 상대에게 보내줘.':'상대 접속 기다리는 중…';saveHost();if(st){showGame();sync()}});
 p.on('disconnected',()=>{if(epoch===ep&&!p.destroyed)p.reconnect()});
 p.on('error',e=>{if(epoch!==ep)return;if(e.type==='unavailable-id'&&attempt<3){if(st){roomCode=genCode();saveHost();startHost(true,attempt+1)}else startHost(false,attempt+1)}else notice('방을 열지 못했어요: '+e.type+' · 다시 시도해줘.')});
 p.on('connection',c=>{let authorized=false,lastId=0;const timer=setTimeout(()=>{if(!authorized)c.close()},8000);const deny=reason=>{c.send({t:'reject',reason});setTimeout(()=>c.close(),150)};
 c.on('data',d=>{if(epoch!==ep||!d||typeof d!=='object')return;
 if(d.t==='hello'){if(d.version!==VERSION||d.protocol!==PROTOCOL){deny('버전이 달라요. 두 사람 모두 새로고침해줘.');return}
 if(connected&&conn!==c){deny('이미 두 사람이 연결된 방이에요.');return}
 if(d.secret!==roomSecret||typeof d.seat!=='string'||!/^[a-f0-9]{32}$/.test(d.seat)){deny('초대 정보가 맞지 않아요. 방장에게 새 초대 링크를 받아줘.');return}
 if(seatToken&&seatToken!==d.seat){deny('다른 기기에 예약된 자리예요. 처음 참가했던 브라우저로 돌아와줘.');return}
 seatToken=d.seat;authorized=true;clearTimeout(timer);if(conn&&conn!==c)conn.close();conn=c;
 if(!st){st=newGame([myName(),String(d.name||'상대').slice(0,8)]);deal(st)}else st.names[1]=String(d.name||'상대').slice(0,8);
 showGame();setConn(true);sync();return}
 if(!authorized||conn!==c)return;lastSeen=Date.now();if(d.t==='ping'){c.send({t:'pong'});return}if(d.t==='pong')return;
 if(d.t==='sync'){sync();return}
 if(d.t==='act'){if(!Number.isSafeInteger(d.id)||d.id<=lastId||d.rev!==st.revision||d.round!==st.round){sync();return}lastId=d.id;applyAct(1,d.a);sync()}
 });c.on('close',()=>{clearTimeout(timer);if(epoch===ep&&conn===c){conn=null;setConn(false)}});c.on('error',()=>c.close());
 });
}
function startGuest(){const code=$('joinCode').value.trim().toUpperCase(),secret=$('joinSecret').value.trim();if(!/^[A-Z2-9]{6}$/.test(code)){notice('방 코드 6자리를 확인해줘.');return}if(!/^[a-f0-9]{32}$/.test(secret)){notice('초대 링크로 열거나 방장에게 받은 초대 비밀값을 입력해줘.');return}
 cleanup();mode='guest';const ep=epoch;guestCode=roomCode=code;roomSecret=secret;guestSeat=stored('bbang-seat-'+code)||token();persist('bbang-seat-'+code,guestSeat);persist('bbang-name',myName());peer=createPeer();if(!peer)return;notice('방에 연결 중…');peer.on('open',()=>{if(epoch===ep)connectGuest()});peer.on('disconnected',()=>{if(epoch===ep&&!peer.destroyed)peer.reconnect()});peer.on('error',e=>{if(epoch===ep){notice('접속 실패: '+e.type+' · 방장이 방을 열었는지 확인해줘.');setConn(false);scheduleRetry()}});connectTimer=setTimeout(()=>{if(epoch===ep&&!connected){notice('연결이 오래 걸려요. 외부 브라우저로 열거나 다른 네트워크를 시험해줘.');setConn(false);scheduleRetry()}},15000)}
function scheduleRetry(){if(mode!=='guest'||retries>=5||retryTimer)return;retryTimer=setTimeout(()=>{retryTimer=null;retries++;connectGuest()},Math.min(2000*2**retries,15000))}
function connectGuest(){if(mode!=='guest'||!peer?.open)return;const ep=epoch;const old=conn;conn=null;if(old)old.close();const c=peer.connect(pid(guestCode),{reliable:true});conn=c;
 c.on('open',()=>{if(epoch!==ep||conn!==c)return;c.send({t:'hello',version:VERSION,protocol:PROTOCOL,secret:roomSecret,seat:guestSeat,name:myName()})});
 c.on('data',d=>{if(epoch!==ep||conn!==c||!d)return;lastSeen=Date.now();if(d.t==='reject'){retries=5;clearTimeout(retryTimer);retryTimer=null;notice(d.reason);setConn(false);return}if(d.t==='ping'){c.send({t:'pong'});return}if(d.t==='pong')return;
 if(d.t==='state'){if(d.v?.version!==VERSION||d.v.me!==1)return;if(view&&view.code===d.v.code&&d.v.revision<view.revision)return;pendingSend=false;clearTimeout(connectTimer);view=d.v;selected=null;showGame();setConn(true);render(view)}});
 c.on('close',()=>{if(epoch===ep&&conn===c){conn=null;pendingSend=false;setConn(false);scheduleRetry()}});c.on('error',()=>{if(epoch===ep&&conn===c){setConn(false);scheduleRetry()}});
}
setInterval(()=>{if(mode==='bot'||!conn?.open||!connected)return;if(Date.now()-lastSeen>22000){const c=conn;conn=null;c.close();setConn(false);scheduleRetry();return}conn.send({t:'ping'})},5000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&mode==='guest'){if(conn?.open)conn.send({t:'sync'});else{retries=0;connectGuest()}}});
async function copyLink(){const u=location.origin+location.pathname+'?room='+roomCode+'#invite='+roomSecret;try{await navigator.clipboard.writeText(u);$('shareMessage').textContent='복사했어요. 상대에게만 보내줘.'}catch(e){$('shareMessage').textContent='아래 초대 주소를 직접 복사해줘.';$('inviteLink').value=u;$('inviteLink').hidden=false}}
function askExit(){$('exitMessage').textContent=mode==='bot'?'연습 판은 저장되지 않아요.':mode==='host'?'이 기기에 저장해요. 이어하기 후 새 초대 링크가 필요할 수 있어요.':'같은 브라우저로 다시 들어오면 예약된 자리로 복귀해요.';$('exitConfirm').showModal()}
function leaveGame(){saveHost();$('exitConfirm').close();cleanup();mode=null;st=null;view=null;selected=null;lastToast=0;$('modal').style.display='none';$('toast').style.display='none';$('game').style.display='none';$('lobby').style.display='block';$('hostWait').style.display='none';refreshResume()}
