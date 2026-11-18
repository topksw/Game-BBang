'use strict';
const VERSION='1.0.0-beta.5.1', PROTOCOL=2, SAVE_FORMAT=2, RULESET='bbang-basic-1';
const APP_SCOPE=location.pathname.includes('/preview/')?'preview':'live';
const STORE_PREFIX=APP_SCOPE==='preview'?'bbang-preview-':'bbang-', SAVE_KEY=STORE_PREFIX+'save-v1';
let mode=null,st=null,view=null,peer=null,conn=null,roomCode=null,roomId='',selected=null,lastToast=0,botTimer=null;
let storageWarning='',lastSavedFingerprint='',lastSavedAt=0,rememberedGuest='',joinContext=null,newRoomAction='new';
let roomSecret='',seatToken='',guestSeat='',guestCode=null,connected=false,epoch=0,retryTimer=null,connectTimer=null,lastSeen=0,requestSeq=0,pendingSend=false,pendingRequest=null,retries=0,lastNotice='',lastError='',sessionReplaced=false;
const $=id=>document.getElementById(id);
const myName=()=>($('myname').value.trim().slice(0,8)||'나');
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
const isToken=x=>typeof x==='string'&&/^[a-f0-9]{32}$/.test(x);
const isRoom=x=>isToken(x)||typeof x==='string'&&/^legacy-[A-Z2-9]{6}$/.test(x);
function stored(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback}catch(e){return fallback}}
function storageStatus(text){storageWarning=text;if($('storageNotice'))$('storageNotice').textContent=text;}
function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){storageStatus('저장 공간을 쓸 수 없어 이어하기가 보장되지 않아요. 이 창을 닫기 전에 저장 상태를 확인해줘.');notice(storageWarning,'storage');return false}}
function notice(text,kind='info'){lastNotice=String(text);if(kind!=='info')lastError=kind;for(const id of ['joinMsg','hostMsg','globalNotice'])if($(id))$(id).textContent=lastNotice;}
function normalizeSave(x){
 if(!x||!validState(x.st)||!isToken(x.secret)||!(x.seat===''||isToken(x.seat))||!/^[A-Z2-9]{6}$/.test(x.code))return null;
 if(x.format===SAVE_FORMAT&&x.protocol===PROTOCOL&&x.rules===RULESET&&isRoom(x.roomId))return {...x,version:VERSION};
 if(x.version==='1.0.0-beta.1'&&x.protocol===1)return {...x,format:SAVE_FORMAT,protocol:PROTOCOL,rules:RULESET,version:VERSION,roomId:'legacy-'+x.code};
 return null;
}
function readSaved(){
 for(const key of [SAVE_KEY,SAVE_KEY+'-backup']){const raw=stored(key),x=normalizeSave(raw);if(!x)continue;
 if(raw.format!==SAVE_FORMAT){if(!stored(SAVE_KEY+'-before-v2'))persist(SAVE_KEY+'-before-v2',raw);persist(SAVE_KEY,x);notice('이전 저장을 새 형식으로 변환했어요. 원본도 보관했어요.');}
 if(key!==SAVE_KEY)notice('최근 저장이 손상되어 직전 정상 저장으로 복구해요.','save-backup');return x;
 }return null;
}
function saveHost(){if(mode!=='host'||!st)return true;if(!validState(st)){storageStatus('현재 상태를 저장하지 못했어요. 이 창을 닫지 말고 오류 진단을 복사해줘.');notice(storageWarning,'invalid-save');return false}const fingerprint=JSON.stringify([roomCode,roomId,roomSecret,seatToken,st]);const old=stored(SAVE_KEY),changed=fingerprint!==lastSavedFingerprint;const at=Date.now(),envelope={format:SAVE_FORMAT,version:VERSION,protocol:PROTOCOL,rules:RULESET,code:roomCode,roomId,secret:roomSecret,seat:seatToken,st,savedAt:at};if(changed&&normalizeSave(old)&&!persist(SAVE_KEY+'-backup',old))return false;if(!normalizeSave(old)&&!persist(SAVE_KEY+'-backup',envelope))return false;const ok=persist(SAVE_KEY,envelope);if(ok){lastSavedFingerprint=fingerprint;lastSavedAt=at;storageStatus('');if($('saveStatus'))$('saveStatus').textContent='이 기기에 저장됨 · '+new Date(at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});}return ok;}
function hasStored(key){try{return localStorage.getItem(key)!==null}catch(e){storageStatus('저장 공간 접근이 차단됐어요. 이어하기는 보장되지 않지만 연습은 할 수 있어요.');notice(storageWarning,'storage');return false}}
function refreshResume(){const x=readSaved();$('resumeBox').style.display=x?'block':'none';if(x)$('resumeCode').textContent=x.code;else if(stored(SAVE_KEY)||hasStored(SAVE_KEY))notice('저장을 읽지 못했어요. 원본은 보관해요. 새 방을 만들거나 오류 진단을 복사해줘.','save-invalid');}
$('myname').value=stored(STORE_PREFIX+'name','');$('myname').addEventListener('change',()=>persist(STORE_PREFIX+'name',myName()));
$('versionLabel').textContent=VERSION+(APP_SCOPE==='preview'?' · 테스트용':'');refreshResume();
const inviteRoom=new URLSearchParams(location.search).get('room'), inviteHash=new URLSearchParams(location.hash.slice(1));
if(inviteRoom){$('joinCode').value=inviteRoom.toUpperCase();const key=inviteHash.get('invite');if(key)$('joinSecret').value=key;notice('초대받은 방이에요. 이름을 쓰고 참가해줘.');}
function genCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:6},()=>A[rnd(A.length)]).join('')}
function pid(c){return 'game-bbang-v2-'+APP_SCOPE+'-'+c}
function cleanup(){epoch++;clearTimeout(botTimer);clearTimeout(retryTimer);clearTimeout(connectTimer);retryTimer=null;connectTimer=null;const c=conn,p=peer;conn=null;peer=null;connected=false;pendingSend=false;pendingRequest=null;if(c)c.close();if(p)p.destroy();}
function beginSession(nextMode){cleanup();mode=nextMode;st=null;view=null;selected=null;lastToast=0;retries=0;requestSeq=0;lastSavedFingerprint='';rememberedGuest='';if($('saveStatus'))$('saveStatus').textContent=nextMode==='host'?'게임이 시작되면 이 기기에 저장해요.':nextMode==='guest'?'게임 상태는 방장 기기에 저장해요.':'연습 판은 저장하지 않아요.';lastError='';sessionReplaced=false;notice('');setConn(false);}
function showGame(){$('lobby').style.display='none';$('game').style.display='block';if(typeof armGameNavigation==='function')armGameNavigation()}
function setConn(on){connected=on;if(on){if($('recoveryStatus'))$('recoveryStatus').textContent='';lastSeen=Date.now();retries=0;clearTimeout(retryTimer);retryTimer=null;notice('');}if($('conn'))$('conn').textContent=mode==='bot'?'연습 모드':on?'연결됨':'연결 끊김 · 복구 필요';if($('connectionHelp'))$('connectionHelp').hidden=on||mode==='bot';if(view)render(view);}
function viewFor(i){return {version:VERSION,protocol:PROTOCOL,rules:RULESET,roomId,revision:st.revision,me:i,code:roomCode,mode,phase:st.phase,turn:st.turn,floor:st.floor,hand:st.hands[i],oppN:st.hands[1-i].length,deckN:st.deck.length,caps:st.caps,names:st.names,goCount:st.goCount,shakes:st.shakes,totals:st.totals,pending:st.pending?{p:st.pending.p,F:st.pending.F,opts:st.pending.opts}:null,result:st.result,ready:st.ready,toast:st.toast,last:st.last,log:st.log,round:st.round,nagari:st.nagari}}
function sync(ack=null){if(!st)return;saveHost();view=viewFor(0);render(view);if(connected&&conn?.open)conn.send({t:'state',v:viewFor(1),ack});if(mode==='bot')scheduleBot();}
function scheduleBot(){clearTimeout(botTimer);if(st.phase==='end')return;const p=st.phase==='chooseFlip'?st.pending?.p:st.turn;if(p===1)botTimer=setTimeout(()=>{if(mode==='bot'&&botAct(st,1)){st.revision++;sync()}},850);}
function applyAct(p,a){if(!st)return false;const ok=reduceAction(st,p,a);if(ok){if(mode==='bot'&&st.phase==='end'&&a.type==='next')st.ready[1]=true;if(mode==='bot'&&st.phase==='end'&&st.ready.every(Boolean))deal(st);st.revision++;sync();}return ok;}
function act(a){if(pendingSend)return;selected=null;if(mode!=='bot'&&!connected){showToast('먼저 다시 연결해줘');return}if(mode==='guest'){if(conn?.open){pendingSend=true;pendingRequest={id:++requestSeq,rev:view.revision};const ep=epoch,id=requestSeq;conn.send({t:'act',id,rev:view.revision,round:view.round,a});render(view);setTimeout(()=>{if(epoch===ep&&pendingRequest?.id===id&&pendingSend)connectionFailed('응답이 늦어 다시 연결해요.','action-timeout');},6000);}}else applyAct(0,a);}
function createPeer(id){if(typeof Peer==='undefined'){notice('연결 모듈을 읽지 못했어요. 새로고침해줘.','module');return null}return id?new Peer(id):new Peer();}
function startBot(){beginSession('bot');roomCode=null;roomId='';st=newGame([myName(),'컴퓨터']);deal(st);showGame();setConn(true);sync();}
function startHost(resume=false,attempt=0){
 const old=resume?readSaved():null;if(resume&&!old){notice('이어할 정상 저장이 없어요.','resume');return}
 beginSession('host');const ep=epoch;persist(STORE_PREFIX+'name',myName());roomCode=old?old.code:genCode();roomId=old?old.roomId:token();roomSecret=old?old.secret:token();seatToken=old?old.seat:'';st=old?old.st:null;
 if(st)st.names[0]=myName();$('hostWait').style.display='block';$('hostCode').textContent=roomCode;notice(attempt?'새 코드로 이어 열고 있어요. 새 초대 링크를 보내줘.':'연결 서버 접속 중…');
 const p=createPeer(pid(roomCode));peer=p;if(!p)return;
 connectTimer=setTimeout(()=>{if(epoch===ep&&!p.open)notice('연결 서버에 닿지 못했어요. 다시 연결을 눌러줘.','host-timeout');},15000);
 p.on('open',()=>{if(epoch!==ep)return;clearTimeout(connectTimer);notice(attempt?'새 초대 링크를 상대에게 보내줘.':'상대 접속 기다리는 중…');saveHost();if(st){showGame();sync();}});
 p.on('disconnected',()=>{if(epoch===ep&&!p.destroyed){notice('연결 중개 서버에 다시 접속 중이에요.','signaling');try{p.reconnect()}catch(e){notice('중개 서버 재접속에 실패했어요. 다시 연결을 눌러줘.','signaling');}}});
 p.on('error',e=>{if(epoch!==ep)return;if(e.type==='unavailable-id'&&attempt<5){if(st){roomCode=genCode();saveHost();startHost(true,attempt+1);}else startHost(false,attempt+1);}else notice('방을 열지 못했어요. 다시 연결하거나 네트워크를 확인해줘.','peer-host');});
 p.on('connection',c=>{let authorized=false,lastId=0;const timer=setTimeout(()=>{if(!authorized)c.close()},8000);const deny=reason=>{c.send({t:'reject',reason});setTimeout(()=>c.close(),150)};
 c.on('data',d=>{if(epoch!==ep||!d||typeof d!=='object')return;
 if(d.t==='hello'){
 if(d.version!==VERSION||d.protocol!==PROTOCOL||d.rules!==RULESET){deny('버전이 달라요. 두 사람 모두 게임을 나간 뒤 새로고침해줘.');return}
 if(d.roomId!==roomId||d.secret!==roomSecret||!isToken(d.seat)){deny('초대 정보가 맞지 않아요. 최신 초대 링크를 받아줘.');return}
 if(seatToken&&seatToken!==d.seat){deny('다른 브라우저에 예약된 자리예요. 처음 참가한 브라우저로 돌아와줘.');return}
 seatToken=d.seat;authorized=true;clearTimeout(timer);const previous=conn;conn=c;if(previous&&previous!==c){if(previous.open)previous.send({t:'replaced'});setTimeout(()=>previous.close(),150);}
 if(!st){st=newGame([myName(),String(d.name||'상대').slice(0,8)]);deal(st);}else st.names[1]=String(d.name||'상대').slice(0,8);
 showGame();setConn(true);sync();return;}
 if(!authorized||conn!==c)return;lastSeen=Date.now();if(d.t==='ping'){c.send({t:'pong'});return}if(d.t==='pong')return;if(d.t==='sync'){sync();return}
 if(d.t==='act'){if(!Number.isSafeInteger(d.id)||d.id<=lastId||d.rev!==st.revision||d.round!==st.round){sync(d.id);return}lastId=d.id;applyAct(1,d.a);sync(d.id);}
 });c.on('close',()=>{clearTimeout(timer);if(epoch===ep&&conn===c){conn=null;pendingSend=false;setConn(false);notice('상대 연결이 끊겼어요. 돌아오면 같은 판으로 이어져요.','guest-left');}});c.on('error',()=>c.close());
 });
}
function seatFor(id,code){const current=stored(STORE_PREFIX+'seat-room-'+id);const legacy=id.startsWith('legacy-')?stored(STORE_PREFIX+'seat-'+id.slice(7)):null;const old=isToken(legacy)?legacy:stored(STORE_PREFIX+'seat-'+code);const seat=isToken(current)?current:isToken(old)?old:token();persist(STORE_PREFIX+'seat-room-'+id,seat);persist(STORE_PREFIX+'seat-'+code,seat);return seat;}
function startGuest(){const code=$('joinCode').value.trim().toUpperCase(),secret=$('joinSecret').value.trim(),id=joinContext&&joinContext.code===code&&joinContext.secret===secret?joinContext.roomId:inviteHash.get('game')||'legacy-'+code;if(!/^[A-Z2-9]{6}$/.test(code)){notice('방 코드 6자리를 확인해줘.');return}if(!isToken(secret)||!isRoom(id)){notice('방장에게 받은 최신 초대 링크로 열어줘.');return}
 beginSession('guest');const ep=epoch;guestCode=roomCode=code;roomId=id;roomSecret=secret;guestSeat=seatFor(roomId,code);persist(STORE_PREFIX+'name',myName());peer=createPeer();if(!peer)return;notice('방에 연결 중…');peer.on('open',()=>{if(epoch===ep)connectGuest();});peer.on('disconnected',()=>{if(epoch===ep&&!peer.destroyed){try{peer.reconnect()}catch(e){notice('중개 서버 접속을 다시 시도해줘.','signaling');}}});peer.on('error',()=>{if(epoch===ep)connectionFailed('방을 찾지 못했어요. 방장이 열었는지 확인해줘.','peer-guest');});connectTimer=setTimeout(()=>{if(epoch===ep&&!connected)connectionFailed('연결이 오래 걸려요. 방장 상태와 네트워크를 확인해줘.','peer-timeout');},15000);
}
function connectionFailed(text,kind){clearTimeout(connectTimer);const c=conn;conn=null;pendingSend=false;pendingRequest=null;if(c)c.close();setConn(false);notice(text,kind);scheduleRetry();}
function scheduleRetry(){if(mode!=='guest'||retryTimer||sessionReplaced)return;if(retries>=5){if($('recoveryStatus'))$('recoveryStatus').textContent='자동 시도 종료 · 수동 다시 연결 또는 최신 초대 링크';notice('자동 재접속 5회가 끝났어요. 다시 연결하거나 최신 초대 링크로 열어줘.','retry-exhausted');return}if($('recoveryStatus'))$('recoveryStatus').textContent='자동 다시 연결 '+(retries+1)+'/5 · 실패하면 최신 초대 링크를 받아줘.';const ep=epoch;retryTimer=setTimeout(()=>{retryTimer=null;if(epoch!==ep)return;retries++;if(peer?.open)connectGuest();else if(peer&&!peer.destroyed){try{peer.reconnect()}catch(e){}scheduleRetry();}else notice('다시 연결을 눌러 연결을 새로 시작해줘.','peer-closed');},Math.min(2000*2**retries,15000));}
function validView(v){try{
 const card=c=>Number.isInteger(c)&&c>=0&&c<48,cards=a=>Array.isArray(a)&&a.every(card),two=a=>Array.isArray(a)&&a.length===2,nn=n=>Number.isSafeInteger(n)&&n>=0,actor=p=>p===0||p===1;
 if(!v||v.version!==VERSION||v.protocol!==PROTOCOL||v.rules!==RULESET||v.roomId!==roomId||v.code!==guestCode||v.me!==1||!nn(v.revision)||!Number.isSafeInteger(v.round)||v.round<1||!['play','chooseFlip','goStop','end'].includes(v.phase)||!actor(v.turn))return false;
 if(!cards(v.hand)||v.hand.length>10||!cards(v.floor)||!two(v.caps)||!v.caps.every(cards)||!two(v.names)||!v.names.every(n=>typeof n==='string'&&n.length<=8)||!two(v.totals)||!v.totals.every(Number.isSafeInteger)||v.totals[0]+v.totals[1]!==0)return false;
 if(!two(v.goCount)||!v.goCount.every(n=>nn(n)&&n<=10)||!two(v.shakes)||!v.shakes.every(a=>Array.isArray(a)&&new Set(a).size===a.length&&a.every(m=>Number.isInteger(m)&&m>0&&m<13))||!two(v.ready)||!v.ready.every(b=>typeof b==='boolean'))return false;
 if(!Number.isInteger(v.deckN)||v.deckN<0||v.deckN>20||!Number.isInteger(v.oppN)||v.oppN<0||v.oppN>10||!nn(v.nagari)||v.nagari<1||!Number.isInteger(Math.log2(v.nagari)))return false;
 if(!Array.isArray(v.log)||v.log.length>100||!v.log.every(e=>e&&[null,0,1].includes(e.p)&&typeof e.text==='string'&&e.text.length<=500))return false;
 if(v.last!==null&&(!v.last||!actor(v.last.p)||!card(v.last.played)||(v.last.flipped!==null&&!card(v.last.flipped))))return false;
 if(v.toast!=null&&(!v.toast||!nn(v.toast.seq)||!actor(v.toast.p)||typeof v.toast.text!=='string'||v.toast.text.length>500))return false;
 if(v.phase==='chooseFlip'){const p=v.pending;if(!p||p.p!==v.turn||!card(p.F)||!cards(p.opts)||p.opts.length!==2||new Set(p.opts).size!==2||!p.opts.every(c=>v.floor.includes(c)&&cm(c)===cm(p.F)))return false;}else if(v.pending!==null)return false;
 if(v.phase==='end'){const r=v.result;if(!r)return false;if(r.nagari){if(r.mult!==v.nagari)return false;}else if(!actor(r.w)||!nn(r.g)||!nn(r.base)||!nn(r.total)||!Array.isArray(r.items)||!Array.isArray(r.mults)||![...r.items,...r.mults].every(a=>Array.isArray(a)&&a.length===2&&typeof a[0]==='string'&&a[0].length<=100&&nn(a[1])))return false;}else if(v.result!==null)return false;
 const known=[...v.hand,...v.floor,...v.caps.flat()];return new Set(known).size===known.length;
 }catch(e){return false}}
function connectGuest(){if(mode!=='guest'||!peer?.open)return;clearTimeout(connectTimer);const ep=epoch,old=conn;conn=null;if(old)old.close();pendingSend=false;pendingRequest=null;const c=peer.connect(pid(guestCode),{reliable:true});conn=c;
 connectTimer=setTimeout(()=>{if(epoch===ep&&conn===c)connectionFailed('상대 응답을 기다리다 시간이 지났어요. 다시 시도해요.','handshake-timeout');},12000);
 c.on('open',()=>{if(epoch!==ep||conn!==c)return;c.send({t:'hello',version:VERSION,protocol:PROTOCOL,rules:RULESET,roomId,secret:roomSecret,seat:guestSeat,name:myName()});});
 c.on('data',d=>{if(epoch!==ep||conn!==c||!d)return;lastSeen=Date.now();if(d.t==='replaced'){sessionReplaced=true;retries=5;clearTimeout(retryTimer);clearTimeout(connectTimer);retryTimer=null;pendingSend=false;pendingRequest=null;conn=null;c.close();setConn(false);notice('같은 자리의 새 연결이 열렸어요. 이 창은 멈춰요. 계속하려면 다시 연결을 눌러줘.','replaced');return}if(d.t==='reject'){retries=5;clearTimeout(retryTimer);clearTimeout(connectTimer);retryTimer=null;conn=null;c.close();setConn(false);notice(['버전이 달라요. 두 사람 모두 게임을 나간 뒤 새로고침해줘.','이미 두 사람이 연결된 방이에요.','초대 정보가 맞지 않아요. 최신 초대 링크를 받아줘.','다른 브라우저에 예약된 자리예요. 처음 참가한 브라우저로 돌아와줘.'].includes(d.reason)?d.reason:'참가를 거절했어요. 최신 초대 링크를 확인해줘.','rejected');return}
 if(d.t==='ping'){c.send({t:'pong'});return}if(d.t==='pong')return;
 if(d.t==='state'){if(!validView(d.v)){connectionFailed('받은 게임 상태를 확인하지 못했어요.','invalid-state');return}if(view&&d.v.revision<view.revision)return;
 if(!pendingRequest||d.ack===pendingRequest.id||d.v.revision>pendingRequest.rev){pendingSend=false;pendingRequest=null;}clearTimeout(connectTimer);view=d.v;selected=null;rememberGuest();showGame();setConn(true);render(view);}
 });c.on('close',()=>{if(epoch===ep&&conn===c){conn=null;clearTimeout(connectTimer);pendingSend=false;pendingRequest=null;setConn(false);notice('연결이 끊겨 다시 접속해요.','closed');scheduleRetry();}});c.on('error',()=>{if(epoch===ep&&conn===c)connectionFailed('연결 오류로 다시 접속해요.','connection-error');});
}
function reconnectNow(){sessionReplaced=false;retries=0;clearTimeout(retryTimer);retryTimer=null;if(mode==='guest'){if(peer?.open)connectGuest();else startGuest();}else if(mode==='host'){saveHost();startHost(!!st);}else notice('방 만들기나 참가를 선택해줘.');}
setInterval(()=>{if(mode==='bot'||!conn?.open||!connected)return;if(Date.now()-lastSeen>22000){connectionFailed(mode==='host'?'상대 응답이 없어 진행을 멈췄어요. 상대가 돌아오면 이어져요. 필요하면 다시 연결을 눌러줘.':'상대 응답이 없어 진행을 멈췄어요. 다시 연결 중이에요.','heartbeat');return}conn.send({t:'ping'});},5000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&mode==='guest'&&!sessionReplaced){retries=0;if(conn?.open)conn.send({t:'sync'});else reconnectNow();}else if(document.visibilityState==='hidden'&&mode==='host')saveHost();});
function inviteURL(){return location.origin+location.pathname+'?room='+roomCode+'#invite='+roomSecret+'&game='+roomId;}
async function copyLink(){const u=inviteURL();try{await navigator.clipboard.writeText(u);$('shareMessage').textContent='복사했어요. 상대에게만 보내줘.';}catch(e){$('shareMessage').textContent='아래 초대 주소를 길게 눌러 복사해줘.';$('inviteLink').value=u;$('inviteLink').hidden=false;}}
async function shareInvite(){if(navigator.share){try{await navigator.share({title:'Game BBang 맞고 초대',url:inviteURL()});return}catch(e){if(e.name==='AbortError')return}}await copyLink();}
function diagnostics(){return {app:'Game BBang',version:VERSION,protocol:PROTOCOL,scope:APP_SCOPE,rules:RULESET,saveFormat:SAVE_FORMAT,mode,connected,peerOpen:!!peer?.open,channelOpen:!!conn?.open,retries,pending:pendingSend,phase:view?.phase||st?.phase||null,round:view?.round||st?.round||null,revision:view?.revision??st?.revision??null,visibility:document.visibilityState,online:navigator.onLine!==false,error:lastError,storageOK:!storageWarning};}
async function copyDiagnostics(){const text=JSON.stringify(diagnostics(),null,2);$('diagnosticText').value=text;$('diagnosticDialog').showModal();try{await navigator.clipboard.writeText(text);$('diagnosticStatus').textContent='복사했어요. 이름·방 코드·초대 비밀값·손패는 포함하지 않아요.';}catch(e){$('diagnosticStatus').textContent='아래 내용을 직접 복사해줘. 개인정보와 손패는 제외했어요.';}}
function askExit(){$('exitMessage').textContent=mode==='bot'?'연습 판은 저장되지 않아요.':mode==='host'?'이 기기에 저장해요. 이어하기 후 새 초대 링크가 필요할 수 있어요.':'같은 브라우저에서 초대 링크로 돌아오면 같은 자리로 이어져요.';$('exitConfirm').showModal();}
function leaveGame(){saveHost();$('exitConfirm').close();cleanup();mode=null;st=null;view=null;if(typeof disarmGameNavigation==='function')disarmGameNavigation();selected=null;lastToast=0;$('modal').style.display='none';$('toast').style.display='none';if(typeof stopVisuals==='function')stopVisuals();if(typeof queuedVisual!=='undefined')queuedVisual=null;if(typeof visualFrame!=='undefined')visualFrame=null;for(const id of ['cardDetailDialog','captureDialog','diagnosticDialog'])if($(id)?.open)$(id).close();$('game').style.display='none';$('lobby').style.display='block';$('hostWait').style.display='none';refreshResume();}

// Full invitations are validated locally. No link is fetched or opened automatically.
function readInvite(text){try{if(typeof text!=='string'||text.length>2048)return null;const u=new URL(text.trim());if(u.origin!==location.origin||u.username||u.password||!['http:','https:'].includes(u.protocol))return null;const path=p=>(p.endsWith('index.html')?p.slice(0,-10):p).split('/').filter(Boolean).join('/');if(path(u.pathname)!==path(location.pathname))return null;const code=(u.searchParams.get('room')||'').toUpperCase(),q=new URLSearchParams(u.hash.slice(1)),secret=q.get('invite'),roomId=q.get('game')||'legacy-'+code;if(!/^[A-Z2-9]{6}$/.test(code)||!isToken(secret)||!isRoom(roomId))return null;return {code,secret,roomId};}catch(e){return null}}
function setJoinContext(x){joinContext=x;$('joinCode').value=x.code;$('joinSecret').value=x.secret;}
function joinPastedInvite(){const x=readInvite($('invitePaste').value);if(!x){notice('이 주소의 전체 초대 링크를 붙여넣어줘. 방 코드만으로는 참가할 수 없고, 실사용·미리보기 링크는 서로 달라요.','invite-invalid');return}setJoinContext(x);$('invitePaste').value='';startGuest();}
function recentInvite(){const r=stored(STORE_PREFIX+'recent-room');return r&&typeof r.url==='string'&&readInvite(r.url)?r:null;}
function refreshRecent(){const r=recentInvite();if($('recentBox'))$('recentBox').hidden=!r;if($('recentCode'))$('recentCode').textContent=r?readInvite(r.url).code:'';const a=normalizeSave(stored(SAVE_KEY+'-before-new'));if($('archiveBox'))$('archiveBox').hidden=!a;}
function rememberGuest(){const url=inviteURL();if(rememberedGuest===url)return;if(persist(STORE_PREFIX+'recent-room',{url,at:Date.now()})){rememberedGuest=url;refreshRecent();}}
function rejoinRecent(){const r=recentInvite();if(!r){notice('이 브라우저에 최근 초대 정보가 없어요. 새 초대 링크를 받아줘.');return}setJoinContext(readInvite(r.url));startGuest();}
function forgetRecent(){try{localStorage.removeItem(STORE_PREFIX+'recent-room');rememberedGuest='';refreshRecent();notice('최근 방의 초대 정보를 지웠어요. 자리 정보와 게임 저장은 유지해요.');}catch(e){storageStatus('최근 초대 정보를 지우지 못했어요. 브라우저 저장 권한을 확인해줘.');}}
function requestNewHost(){if(readSaved()){newRoomAction='new';$('newRoomMessage').textContent='현재 이어할 판이 있어요. 새 판이 시작되면 현재 저장을 교체해요. 기존 판은 이 브라우저의 이전 방 보관본으로 남겨요.';$('newRoomConfirmAction').textContent='새 방 시작';$('newRoomConfirm').showModal();}else startHost();}
function requestArchivedHost(){if(!normalizeSave(stored(SAVE_KEY+'-before-new'))){notice('정상 이전 방 보관본이 없어요.');return}newRoomAction='archive';$('newRoomMessage').textContent='이전 방 보관본을 현재 저장으로 되돌릴까요? 현재 판 저장은 직전 백업에 보관하지만, 여러 방을 계속 관리하는 기능은 아니에요.';$('newRoomConfirmAction').textContent='이전 방 복구';$('newRoomConfirm').showModal();}
function confirmNewRoom(){const current=readSaved();if(newRoomAction==='archive'){const old=normalizeSave(stored(SAVE_KEY+'-before-new'));if(!old)return;if(current&&!persist(SAVE_KEY+'-backup',current))return;if(!persist(SAVE_KEY,old))return;$('newRoomConfirm').close();startHost(true);}else{if(current&&!persist(SAVE_KEY+'-before-new',current))return;$('newRoomConfirm').close();startHost(false);}refreshRecent();}
const initialJoin=readInvite(location.origin+location.pathname+location.search+location.hash);if(initialJoin){setJoinContext(initialJoin);if($('directInviteBox'))$('directInviteBox').hidden=false;}else if(inviteRoom)notice('초대 정보가 부족해요. 방장에게 받은 전체 초대 링크로 다시 열어줘.','invite-invalid');refreshRecent();
