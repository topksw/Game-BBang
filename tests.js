function runTests(){const results=[];function test(name,f){try{f();results.push({name,ok:true})}catch(e){results.push({name,ok:false,error:e.message})}}function eq(a,b){if(JSON.stringify(a)!==JSON.stringify(b))throw Error(JSON.stringify(a)+' != '+JSON.stringify(b))}function yes(x){if(!x)throw Error('assertion failed')}function fixture(hand,floor,deck){let g=newGame(['a','b']);deal(g);Object.assign(g,{hands:[hand,[43]],floor,deck,caps:[[],[]],turn:0,phase:'play'});return g}
test('삼광 3점',()=>eq(score([0,8,28]).total,3));test('비삼광 2점',()=>eq(score([0,8,44]).total,2));test('사광 4점',()=>eq(score([0,8,28,40]).total,4));test('오광 15점',()=>eq(score([0,8,28,40,44]).total,15));test('고도리 5점',()=>eq(score([4,12,29]).total,5));test('홍단 3점',()=>eq(score([1,5,9]).total,3));test('청단 3점',()=>eq(score([21,33,37]).total,3));test('초단 3점',()=>eq(score([13,17,25]).total,3));test('열끗 다섯 1점',()=>eq(score([4,16,20,24,32]).total,1));test('띠 여섯 2점',()=>eq(score([1,5,13,17,21,33]).total,2));test('피 아홉 0점',()=>eq(score([2,3,6,7,10,11,14,15,18]).total,0));test('피 열 1점',()=>eq(score([2,3,6,7,10,11,14,15,18,19]).total,1));test('쌍피 2장',()=>eq(score([2,3,6,7,10,11,14,15,41]).piV,10));
test('일반 패 먹기',()=>{let g=fixture([0,20],[1,8],[12]);yes(playCard(g,0,0));eq(g.caps[0],[0,1]);eq(g.hands[0],[20])});
test('쪽',()=>{let g=fixture([0,20],[8],[1]);g.caps[1]=[2];yes(playCard(g,0,0));yes(g.caps[0].includes(2));yes(g.toast.text.includes('쪽'))});
test('뻑: 바닥 세 장',()=>{let g=fixture([0,20],[1,8],[2]);yes(playCard(g,0,0));eq(g.floor.filter(c=>cm(c)===1).sort(),[0,1,2]);eq(g.caps[0],[])});
test('따닥: 네 장 수거',()=>{let g=fixture([0,20],[1,2,8],[3]);yes(playCard(g,0,0,1));yes([0,1,2,3].every(c=>g.caps[0].includes(c)));yes(g.toast.text.includes('따닥'))});
test('바닥 세 장 수거',()=>{let g=fixture([0,20],[1,2,3,8],[12]);yes(playCard(g,0,0));yes([0,1,2,3].every(c=>g.caps[0].includes(c)))});
test('선택 없는 두 장 먹기 거절',()=>{let g=fixture([0,20],[1,2],[12]);const b=JSON.stringify(g);yes(!playCard(g,0,0));eq(JSON.stringify(g),b)});
test('뒤집기 선택 보류·선택',()=>{let g=fixture([0,20],[4,5,8],[6]);yes(playCard(g,0,0));eq(g.phase,'chooseFlip');yes(!chooseFlip(g,1,4));yes(!chooseFlip(g,0,8));yes(chooseFlip(g,0,4));yes(g.caps[0].includes(6)&&g.caps[0].includes(4))});
test('싹쓸이 피 수거',()=>{let g=fixture([0,20],[1,4],[5]);g.caps[1]=[2];yes(playCard(g,0,0));yes(g.caps[0].includes(2));yes(g.toast.text.includes('싹쓸이'))});
test('마지막 전체 차례 싹쓸이 없음',()=>{let g=fixture([0],[1,4],[5]);g.hands[1]=[];g.caps[1]=[2];yes(playCard(g,0,0));yes(g.caps[1].includes(2))});
test('흔들기 중복 거절',()=>{let g=fixture([0,1,2],[8],[12]);yes(shake(g,0,1));yes(!shake(g,0,1));yes(!shake(g,1,1))});
test('잘못된 차례·패 거절',()=>{let g=fixture([0],[1],[12]);yes(!playCard(g,1,0));yes(!playCard(g,0,49));yes(!playCard(g,0,2))});
for(let n=0;n<=4;n++)test(n+'고 정답 배율',()=>{let g=fixture([20],[8],[12]);g.caps=[[0,8,28],[40]];g.goCount=[n,0];endRound(g,0);eq(g.result.total,(3+Math.min(n,2))*(n>=3?2**(n-2):1))});
test('광박 ×2',()=>{let g=fixture([20],[8],[12]);g.caps=[[0,8,28],[]];endRound(g,0);eq(g.result.total,6)});
test('피박 ×2',()=>{let g=fixture([20],[8],[12]);g.caps=[[2,3,6,7,10,11,14,15,18,19],[22]];endRound(g,0);eq(g.result.total,2)});
test('피 0은 피박 없음',()=>{let g=fixture([20],[8],[12]);g.caps=[[2,3,6,7,10,11,14,15,18,19],[]];endRound(g,0);eq(g.result.total,1)});
test('고박+흔들기+나가리',()=>{let g=fixture([20],[8],[12]);g.caps=[[0,8,28],[40]];g.goCount=[0,1];g.shakes=[[1],[]];g.nagari=2;endRound(g,0);eq(g.result.total,24);endRound(g,0);eq(g.totals,[24,-24])});
test('멍박',()=>{let g=fixture([20],[8],[12]);g.caps=[[4,12,16,20,24,32,36],[]];endRound(g,0);eq(g.result.total,6)});
test('나가리 다음 배율',()=>{let g=fixture([20],[8],[12]);endRound(g,null);eq(g.nagari,2);deal(g);eq(g.nagari,2);eq(g.ready,[false,false])});
test('양쪽 준비·중복 준비',()=>{let g=fixture([20],[8],[12]);endRound(g,null);let n=g.round;yes(reduceAction(g,0,{type:'next'}));eq(g.round,n);yes(!reduceAction(g,0,{type:'next'}));yes(reduceAction(g,1,{type:'next'}));eq(g.round,n+1)});
test('고점수 고/스톱 진입',()=>{let g=fixture([0,20],[1,8],[12]);g.caps[0]=[2,3,6,7,10,11,14,15,18,19,22,23,26,27,30,31];playCard(g,0,0);eq(g.phase,'goStop')});
test('손패 마지막 자동 스톱',()=>{let g=fixture([0],[1,8],[12]);g.caps[0]=[2,3,6,7,10,11,14,15,18,19,22,23,26,27,30,31];playCard(g,0,0);eq(g.phase,'end');eq(g.result.w,0)});
test('고정 seed 1000판 전체·선택 중 카드 보존',()=>{const oldRnd=rnd,oldRandom=Math.random;let seed=20261116;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};rnd=n=>Math.floor(next()*n);Math.random=next;try{for(let j=0;j<1000;j++){let g=newGame(['a','b']);deal(g);let n=0;while(g.phase!=='end'&&n++<100){yes(validState(g));let p=g.phase==='chooseFlip'?g.pending.p:g.turn;yes(botAct(g,p))}eq(g.phase,'end');yes(validState(g));deal(g);eq(g.log.length,1)}}finally{rnd=oldRnd;Math.random=oldRandom}});
test('저장 손상 거절',()=>{let s=newGame(['a','b']);deal(s);yes(validState(s));s.names=null;yes(!validState(s));s.names=['a','b'];s.deck.push(s.deck[0]);yes(!validState(s))});

test('7점 미만이면 고/스톱을 묻지 않음',()=>{let g=fixture([0,20],[1,8],[12]);g.caps[0]=[2,3,6,7,10,11,14,15,18,19,22,23,26,27,30];playCard(g,0,0);eq(score(g.caps[0]).total,6);eq(g.phase,'play')});
test('고 선언은 현재 기본 점수를 기준으로 기록',()=>{let g=fixture([0,20],[1,8],[12]);g.caps[0]=[2,3,6,7,10,11,14,15,18,19,22,23,26,27,30,31];g.phase='goStop';goStop(g,0,true);eq(g.goCount[0],1);eq(g.lastGo[0],7);eq(g.turn,1);eq(g.phase,'play')});
test('고 후 점수 불변으로 마지막 패 소진 시 나가리',()=>{let g=fixture([],[8],[]);g.hands[1]=[];g.caps[0]=[2,3,6,7,10,11,14,15,18,19,22,23,26,27,30,31];g.goCount[0]=1;g.lastGo[0]=7;finishTurn(g,{p:0,captured:[],pair:null,steal:0,ev:[],played:0,flipped:null});yes(g.result.nagari)});
test('고 후 마지막 패로 점수 증가 시 자동 스톱',()=>{let g=fixture([],[8],[]);g.hands[1]=[];g.caps[0]=[2,3,6,7,10,11,14,15,18,19,22,23,26,27,30,31,34];g.goCount[0]=1;g.lastGo[0]=7;finishTurn(g,{p:0,captured:[],pair:null,steal:0,ev:[],played:0,flipped:null});eq(g.result.w,0);eq(g.result.base,9)});
test('피 뺏기는 일반 피가 쌍피보다 우선',()=>{let g=fixture([0],[1],[12]);g.caps[1]=[41,2];eq(stealPi(g,1,0),2);eq(g.caps[1],[41])});
test('쌍피만 있으면 카드 한 장을 가져옴',()=>{let g=fixture([0],[1],[12]);g.caps[1]=[41];eq(stealPi(g,1,0),41);eq(score(g.caps[0]).piV,2)});
test('상대 피가 없으면 다른 종류를 가져오지 않음',()=>{let g=fixture([0],[1],[12]);g.caps[1]=[8,4];eq(stealPi(g,1,0),null);eq(g.caps[1],[8,4])});
test('고·박·흔들기·나가리 복합 배율 정답',()=>{let g=fixture([20],[8],[12]);g.caps=[[0,8,28,4,12,16,20,24,32,36,2,3,6,7,10,11,14,15,18,19],[22]];g.goCount=[3,1];g.shakes=[[1],[]];g.nagari=2;endRound(g,0);eq(g.result.total,1152);eq(g.totals,[1152,-1152])});
test('연속 나가리 배율은 다음 승리 후 초기화',()=>{let g=fixture([20],[8],[12]);endRound(g,null);deal(g);endRound(g,null);eq(g.nagari,4);deal(g);g.caps=[[0,8,28],[40]];endRound(g,0);eq(g.result.total,12);eq(g.nagari,1)});
test('같은 종류 두 바닥 패는 자동 선택 가능',()=>{let g=fixture([0,20],[2,3,8],[12]);yes(playCard(g,0,0));yes(g.caps[0].includes(0));eq(g.phase,'play')});
test('동일 월 중복 흔들기는 배율 중복 없음',()=>{let g=fixture([0,1,2],[8],[12]);yes(shake(g,0,1));yes(!shake(g,0,1));g.caps=[[0,8,28],[40]];endRound(g,0);eq(g.result.total,6)});
test('뒤집기 선택 중복 요청 거절',()=>{let g=fixture([0,20],[4,5,8],[6]);playCard(g,0,0);yes(chooseFlip(g,0,4));const after=JSON.stringify(g);yes(!chooseFlip(g,0,4));eq(JSON.stringify(g),after)});
test('종료 후 손패 요청은 상태를 바꾸지 않음',()=>{let g=fixture([0],[1],[12]);endRound(g,null);const after=JSON.stringify(g);yes(!reduceAction(g,0,{type:'play',c:0}));eq(JSON.stringify(g),after)});
for(const [field,value]of [['dealer',3],['nagari',3],['nagari',null],['revision',-1],['totals',[2,0]],['goCount',[-1,0]],['lastGo',[null,0]],['shakes',[[1,1],[]]],['pending',{}],['last',{p:2,played:0,flipped:null}],['log',[{p:8,text:'bad'}]],['ready',[true,false]]])test('저장 필드 손상 거절 '+field+' '+JSON.stringify(value),()=>{let g=newGame(['a','b']);deal(g);yes(validState(g));g[field]=value;yes(!validState(g))});

return {total:results.length,passed:results.filter(x=>x.ok).length,results}}
if(typeof document!=='undefined'&&document.getElementById('testResults')){const r=runTests();document.getElementById('testResults').textContent=JSON.stringify(r,null,2)}
