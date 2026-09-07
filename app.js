const KEY='petanqueScore.v02';
let state={mode:'Tête-à-tête',nameA:'',nameB:'',scoreA:0,scoreB:0,history:[],startedAt:null,currentPending:null,running:false};
const $=id=>document.getElementById(id);
const saveLocal=()=>localStorage.setItem(KEY,JSON.stringify(state));
function loadLocal(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v)state={...state,...v};}catch(e){}}

function expectedLines(mode){if(mode==='Doublette')return 2;if(mode==='Triplette')return 3;return 1;}
function parseNames(value,mode){
  const parts=String(value||'').split(/\r?\n|\s*[\/,;|+]\s*/g).map(s=>s.trim()).filter(Boolean);
  return parts.slice(0, expectedLines(mode));
}
function formatDisplayName(value,fallback,mode){
  const lines=parseNames(value,mode);
  if(!lines.length) lines.push(fallback);
  while(lines.length<expectedLines(mode)) lines.push('');
  return lines.join('\n');
}
function firstDisplayName(value,fallback,mode){return parseNames(value,mode)[0]||fallback;}
function refreshPlaceholders(){
  const mode=document.querySelector('.mode.active')?.dataset.mode||state.mode||'Tête-à-tête';
  if(mode==='Doublette'){
    $('nameA').placeholder='Ex. Noah / Théo';
    $('nameB').placeholder='Ex. Marc / Luc';
  }else if(mode==='Triplette'){
    $('nameA').placeholder='Ex. Noah / Théo / Éric';
    $('nameB').placeholder='Ex. Marc / Luc / Paul';
  }else{
    $('nameA').placeholder='Ex. Noah';
    $('nameB').placeholder='Ex. Théo';
  }
}
function buildPads(){
  for(const side of ['A','B']){
    const box=$('pad'+side); box.innerHTML='';
    for(let i=1;i<=6;i++){
      const b=document.createElement('button');
      b.className='pt'; b.textContent='+'+i;
      b.onclick=()=>addPoints(side,i,b);
      box.appendChild(b);
    }
  }
}
function pulse(el, cls, ms=550){if(!el)return;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),ms)}
function cardForSide(side){return $(side==='A'?'cardA':'cardB')}
function pendingText(){
  if(!state.currentPending) return '';
  if(state.currentPending.type==='score'){
    const n=state.currentPending.side==='A'?firstDisplayName(state.nameA,'Joueur 1',state.mode):firstDisplayName(state.nameB,'Joueur 2',state.mode);
    return 'Mène en attente : ' + n + ' marque +' + state.currentPending.pts + '. Appuyez sur Enregistrer pour l’ajouter à l’historique.';
  }
  return '';
}
function updatePendingUI(){
  const box=$('pendingBox');
  const save=$('saveBtn');
  if(state.currentPending){
    box.classList.remove('empty');
    box.textContent=pendingText();
    save.classList.add('enabled');
  }else{
    box.classList.add('empty');
    box.innerHTML='Aucune mène en attente. Choisissez un score, puis appuyez sur <strong>&nbsp;Enregistrer&nbsp;</strong>.';
    save.classList.remove('enabled');
  }
}
function recalcScoreFromHistory(){
  let a=0,b=0;
  for(const h of state.history){
    if(h.type==='score'){a=h.a;b=h.b;}
  }
  state.scoreA=a; state.scoreB=b;
}
function addPoints(side,pts,btn){
  // Une seule mène peut être en attente : un nouveau choix remplace le précédent.
  // On repart donc toujours du dernier score réellement enregistré.
  if(state.currentPending){
    state.scoreA=state.currentPending.old.a;
    state.scoreB=state.currentPending.old.b;
  }

  const old={a:state.scoreA,b:state.scoreB};
  if(side==='A') state.scoreA=Math.min(13,state.scoreA+pts);
  else state.scoreB=Math.min(13,state.scoreB+pts);

  state.currentPending={type:'score',side,pts,old};
  pulse(btn, side==='A'?'flashA':'flashB');
  pulse(cardForSide(side), 'changed');
  render(); saveLocal();
}
function nullEnd(){
  // Si un score était seulement prévisualisé, on l'annule avant d'enregistrer la mène nulle.
  if(state.currentPending){
    state.scoreA=state.currentPending.old.a;
    state.scoreB=state.currentPending.old.b;
    state.currentPending=null;
  }
  state.history.push({type:'null',label:'Mène nulle',a:state.scoreA,b:state.scoreB});
  render(); saveLocal();
}
function saveEnd(){
  if(!state.currentPending) return;
  const p=state.currentPending;
  state.history.push({type:'score',side:p.side,pts:p.pts,a:state.scoreA,b:state.scoreB});
  state.currentPending=null;
  render(); saveLocal(); checkVictory();
}
function undo(){
  if(state.currentPending){
    state.scoreA=state.currentPending.old.a; state.scoreB=state.currentPending.old.b;
    state.currentPending=null;
  }else if(state.history.length){
    state.history.pop();
    recalcScoreFromHistory();
  }
  render(); saveLocal();
}
function resetGame(){
  if(!confirm('Réinitialiser complètement la partie ?')) return;
  state.scoreA=0; state.scoreB=0; state.history=[]; state.currentPending=null; state.startedAt=Date.now(); state.running=true;
  render(); saveLocal();
}
function startGame(){
  state.mode=document.querySelector('.mode.active').dataset.mode;
  state.nameA=$('nameA').value.trim()||'Joueur 1';
  state.nameB=$('nameB').value.trim()||'Joueur 2';
  state.scoreA=0; state.scoreB=0; state.history=[]; state.currentPending=null; state.startedAt=Date.now(); state.running=true;
  saveLocal(); show('game'); render();
}
function checkVictory(){
  if(state.scoreA>=13||state.scoreB>=13){
    state.running=false;
    const winner=state.scoreA>=13?state.nameA:state.nameB;
    $('winnerText').textContent='Victoire ' + firstDisplayName(winner, 'Gagnant', state.mode);
    $('finalNameA').textContent=formatDisplayName(state.nameA,'Joueur 1',state.mode);
    $('finalNameB').textContent=formatDisplayName(state.nameB,'Joueur 2',state.mode);
    $('finalScoreA').textContent=state.scoreA;
    $('finalScoreB').textContent=state.scoreB;
    $('finalEnds').textContent=state.history.length + (state.history.length>1?' mènes':' mène');
    $('finalTime').textContent=$('timer').textContent;
    show('victory'); saveLocal();
  }
}
function show(id){['setup','game','victory'].forEach(x=>$(x).classList.toggle('hidden',x!==id));}
function render(){
  const dispA=formatDisplayName(state.nameA,'Joueur 1',state.mode);
  const dispB=formatDisplayName(state.nameB,'Joueur 2',state.mode);
  $('liveNameA').textContent=dispA; $('padNameA').textContent=dispA;
  $('liveNameB').textContent=dispB; $('padNameB').textContent=dispB;
  $('scoreA').textContent=state.scoreA; $('scoreB').textContent=state.scoreB; $('modeText').textContent=state.mode;
  $('endCount').textContent=state.history.length + (state.history.length>1?' mènes':' mène');
  $('history').innerHTML='';
  state.history.forEach((h,idx)=>{
    const e=document.createElement('div');
    if(h.type==='null'){
      e.className='end null';
      e.textContent='M' + (idx+1) + ' • Mène nulle • ' + h.a + '-' + h.b;
    } else {
      e.className='end ' + (h.side==='A'?'a':'b');
      const n=h.side==='A'?firstDisplayName(state.nameA,'J1',state.mode):firstDisplayName(state.nameB,'J2',state.mode);
      e.textContent='M' + (idx+1) + ' • ' + n + ' +' + h.pts + ' • ' + h.a + '-' + h.b;
    }
    $('history').appendChild(e);
  });
  updatePendingUI();
}
function formatTime(ms){const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return[h,m,sec].map(x=>String(x).padStart(2,'0')).join(':')}
setInterval(()=>{if(state.running&&state.startedAt)$('timer').textContent=formatTime(Date.now()-state.startedAt)},1000);

document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{document.querySelectorAll('.mode').forEach(x=>x.classList.remove('active'));b.classList.add('active');refreshPlaceholders();});
$('startBtn').onclick=startGame;
$('undoBtn').onclick=undo;
$('nullBtn').onclick=nullEnd;
$('saveBtn').onclick=saveEnd;
$('resetBtn').onclick=resetGame;
$('rematchBtn').onclick=()=>{state.scoreA=0;state.scoreB=0;state.history=[];state.currentPending=null;state.startedAt=Date.now();state.running=true;saveLocal();show('game');render();};
$('newBtn').onclick=()=>{localStorage.removeItem(KEY);localStorage.removeItem('petanqueScore.v01');location.reload();};

buildPads(); loadLocal(); refreshPlaceholders();
if(state.startedAt && (state.running || state.scoreA || state.scoreB || state.history.length)){
  if(state.scoreA>=13 || state.scoreB>=13){show('victory'); checkVictory();}
  else {show('game'); render();}
}
if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').then(()=>{$('status').textContent='Installable • hors ligne';}).catch(()=>{});}