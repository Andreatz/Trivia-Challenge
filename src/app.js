const KEY='trivia-challenge-v2';
const LEGACY_KEY='trivia-challenge-v1';
const ABC='ABCDEFGHILMNOPQRSTUVZ'.split('');
const TYPES={
  guess:'Indovina il personaggio',bomb:'Schiva la Bomba',said:"Chi l'ha detto",detail:'Occhio al dettaglio',quote:'Completa la Frase',chain:'Reazione a catena',labors:'Le Dieci Fatiche',guillotine:'Ghigliottina',pass:'Passaparola',jeopardy:'Jeopardy',sarabanda:'Sarabanda'
};
const MENU_ORDER=['guess','bomb','jeopardy','pass','said','detail','quote','chain','labors','guillotine','sarabanda'];
const REFERENCE_IMAGES=[
  '1. Schermata Principale.png','2. Lista Anime.png','3. Schermata Poteri.png','7. Punti.png','8. Schermata Minigioco 1.png','13. Schermata Minigioco 2.png','17. Schermata Minigioco 3.png','20. Schermata Minigioco 4.png','24. Schermata Minigioco 5.png','27. Schermata Minigioco 6.png','31. Schermata Minigioco 7.png','40. Schermata Minigioco 9.png','46. Schermata Minigioco 10.png','49. Schermata Minigioco 11.png'
];
const id=p=>`${p}-${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36)}`;
const clone=x=>JSON.parse(JSON.stringify(x));
const animeList=['Attack on Titans','Berserk','Bleach','Chainsaw Man','Code Geass','Death Note','Demon Slayer','Dragon Ball','Frieren','Hunter X Hunter','Jujutsu Kaisen','Made in Abyss','My Hero Academia','Naruto','One Piece','One Punch Man','Overlord','Pokemon','Seven Deadly Sins','Vinland Saga'];
const powers=[
  {player:'Livio',name:'Mussolivio non vuole',text:"Rendi nulla la risposta di un avversario e impediscigli di prendere punti. Massimo due utilizzi."},
  {player:'Livio',name:'The Wolf of Avezzano',text:'Se rispondi correttamente, ottieni un bonus extra deciso dal presentatore.'},
  {player:'Melia',name:'Don Meliadolf',text:'Puoi aiutare un avversario rispondendo al posto suo: se la risposta è corretta, entrambi prendete punti.'},
  {player:'Melia',name:'Bodyguard personale',text:'Una protezione speciale ti salva da una penalità o da un furto punti.'},
  {player:'Maggi',name:'In medio stat virtus',text:'Se al termine di un minigioco sei esattamente secondo, ottieni 200 punti.'},
  {player:'Maggi',name:'Freebooter',text:'Rubi una possibilità o un piccolo bonus a un avversario, a discrezione del presentatore.'}
];
const templates={
  guess:()=>({id:id('game'),type:'guess',title:'Indovina il personaggio',menuTitle:'INDOVINA IL PERSONAGGIO',rounds:[{answer:'Nome personaggio',points:[1000,500,250,50],clues:[{label:'1000',image:'public/assets/personaggio-1.jpg'},{label:'500',image:'public/assets/personaggio-2.jpg'},{label:'250',image:'public/assets/personaggio-3.jpg'},{label:'50',image:'public/assets/personaggio-4.jpg'}]}]}),
  bomb:()=>({id:id('game'),type:'bomb',title:'Schiva la Bomba',menuTitle:'SCHIVA LA BOMBA!',question:'Trova i 16 elementi collegati alla domanda ed evita le 4 bombe.',pointsPerCorrect:50,items:Array.from({length:20},(_,i)=>({label:`Elemento ${i+1}`,image:'',isBomb:i>=16}))}),
  said:()=>({id:id('game'),type:'said',title:"Chi l'ha detto",menuTitle:"CHI L'HA DETTO",points:100,questions:[{prompt:'Ascolta l audio e indovina il personaggio.',audio:'public/assets/frase-1.mp3',answer:'Personaggio',media:'public/assets/risposta.jpg'}]}),
  detail:()=>({id:id('game'),type:'detail',title:'Occhio al dettaglio',menuTitle:'OCCHIO AL DETTAGLIO',points:200,questions:[{detailImage:'public/assets/dettaglio.jpg',fullImage:'public/assets/scena-completa.jpg',answer:'Contesto completo della scena'}]}),
  quote:()=>({id:id('game'),type:'quote',title:'Completa la Frase',menuTitle:'COMPLETA LA FRASE',points:200,questions:[{partial:'Io sono tuo...',answer:'padre',source:'Star Wars'}]}),
  chain:()=>({id:id('game'),type:'chain',title:'Reazione a catena',menuTitle:'REAZIONE A CATENA',topic:'Argomento',points:50,questions:Array.from({length:20},(_,i)=>({question:`Domanda sequenziale ${i+1}`,answer:`Risposta ${i+1}`}))}),
  labors:()=>({id:id('game'),type:'labors',title:'Le Dieci Fatiche',menuTitle:'LE DIECI FATICHE',points:100,questions:Array.from({length:10},(_,i)=>({kind:['risposta secca','risposta multipla','elenco','spiegazione'][i%4],question:`Fatica ${i+1}`,options:i%4===1?['A','B','C','D']:[],answer:`Risposta ${i+1}`,explanation:'Spiegazione opzionale.'}))}),
  guillotine:()=>({id:id('game'),type:'guillotine',title:'Ghigliottina',menuTitle:'GHIGLIOTTINA',points:200,words:['parola 1','parola 2','parola 3','parola 4','parola 5'],answer:'Risposta collegata'}),
  pass:()=>({id:id('game'),type:'pass',title:'Passaparola',menuTitle:'PASSAPAROLA',difficulty:'facile',points:{facile:5,medio:10,difficile:20},bonus:{facile:200,medio:500,difficile:1000},questions:ABC.map(l=>({letter:l,question:`Con la ${l}: domanda`,answer:`Risposta con ${l}`,status:'pending'}))}),
  jeopardy:()=>({id:id('game'),type:'jeopardy',title:'Jeopardy',menuTitle:'JEOPARDY',categories:['Anime','Cinema','Serie TV','Musica','Gaming'].map(name=>({name,clues:[100,200,300,400,500].map(value=>({value,question:`Domanda ${name} da ${value}`,answer:`Risposta ${name} ${value}`,used:false}))}))}),
  sarabanda:()=>({id:id('game'),type:'sarabanda',title:'Sarabanda',menuTitle:'SARABANDA',pointsTitle:25,pointsArtist:25,songs:[{audio:'public/assets/canzone-1.mp3',title:'Titolo brano',artist:'Artista'}]})
};
const defaults=()=>({
  title:'TRIVIA CHALLENGE',
  subtitle:'ANIME EDITION',
  players:[{id:id('p'),name:'LIVIO',score:1560},{id:id('p'),name:'MELIA',score:980},{id:id('p'),name:'MAGGI',score:820}],
  games:Object.values(templates).map(f=>f()),
  library:animeList,
  powers,
  history:[]
});
let state=load(),view='show',gameId=state.games[0]?.id,playerId=state.players[0]?.id,cur={screen:'hub',i:0,revealed:0,answer:false,selected:[],jeo:null},editing='';
function load(){for(const key of [KEY,LEGACY_KEY]){try{const raw=localStorage.getItem(key);if(raw){const s=JSON.parse(raw);if(s.games?.length&&s.players?.length)return hydrate(s)}}catch(e){console.warn(e)}}return defaults()}
function hydrate(s){s.title=s.title||'TRIVIA CHALLENGE';s.subtitle=s.subtitle||'ANIME EDITION';s.library=s.library?.length?s.library:animeList;s.powers=s.powers?.length?s.powers:powers;s.history=s.history||[];s.games=(s.games||[]).map(g=>({...g,menuTitle:g.menuTitle||g.title||label(g.type)}));return s}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function $(tag,attrs={},...kids){const n=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(v===false||v==null)return;if(k==='class')n.className=v;else if(k==='html')n.innerHTML=v;else if(k==='style')n.setAttribute('style',v);else if(k.startsWith('on'))n.addEventListener(k.slice(2).toLowerCase(),v);else n.setAttribute(k,v===true?'':v)});kids.flat(Infinity).forEach(c=>{if(c!=null&&c!==false)n.append(c.nodeType?c:document.createTextNode(c))});return n}
function game(){return state.games.find(g=>g.id===gameId)||state.games[0]}
function player(){return state.players.find(p=>p.id===playerId)||state.players[0]}
function label(t){return TYPES[t]||t}
function toast(m){const t=$('div',{class:'toast'},m);document.body.append(t);requestAnimationFrame(()=>t.classList.add('show'));setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),220)},2200)}
function add(points,reason){const p=player();if(!p)return toast('Crea un giocatore.');p.score=Number(p.score||0)+Number(points||0);state.history.unshift({id:id('h'),playerName:p.name,points:Number(points||0),reason,at:new Date().toISOString()});state.history=state.history.slice(0,120);save();toast(`${p.name}: ${points>0?'+':''}${points}`);render()}
function media(src,alt='media'){if(!src)return $('span',{class:'muted'},'Media non configurato');if(/\.(mp4|webm|mov)$/i.test(src))return $('video',{src,controls:true,playsinline:true});return $('img',{src,alt,loading:'lazy'})}
function audio(src){return src?$('audio',{src,controls:true}):$('span',{class:'muted'},'Audio non configurato')}
function top(){return $('header',{class:'app-top'},$('div',{},$('div',{class:'kicker'},'PowerPoint-style game master'),$('h1',{},'Trivia Challenge Studio')),$('nav',{class:'app-nav'},nav('show','Show'),nav('admin','Admin'),nav('scores','Punteggi')))}
function nav(v,t){return $('button',{class:view===v?'active':'',onclick:()=>{view=v;if(v==='show'&&!cur.screen)cur.screen='hub';render()}},t)}
function render(){document.getElementById('app').replaceChildren(top(),view==='show'?show():view==='admin'?admin():scores())}
function resetStage(screen='hub'){cur={screen,i:0,revealed:0,answer:false,selected:[],jeo:null};render()}
function selectGame(){const s=$('select',{onchange:e=>{gameId=e.target.value;resetStage('game')}});state.games.forEach(g=>s.append($('option',{value:g.id,selected:g.id===gameId},`${g.title} · ${label(g.type)}`)));return s}
function selectPlayer(){const s=$('select',{onchange:e=>{playerId=e.target.value;render()}});state.players.forEach(p=>s.append($('option',{value:p.id,selected:p.id===playerId},`${p.name} (${p.score} pt)`)));return s}
function show(){
  const content=cur.screen==='hub'?hub():cur.screen==='points'?pointsScreen():cur.screen==='library'?libraryScreen():cur.screen==='powers'?powersScreen():gameScreen();
  return $('main',{class:'show-layout'},
    stage(content),
    $('aside',{class:'control-panel'},
      $('h2',{},'Console host'),
      $('label',{},'Giocatore attivo',selectPlayer()),
      $('label',{},'Minigioco selezionato',selectGame()),
      $('div',{class:'quick-grid'},...[-100,-50,50,100,200,500,1000].map(v=>$('button',{class:'btn small',onclick:()=>add(v,'correzione rapida')},v>0?`+${v}`:v))),
      $('button',{class:'btn primary',onclick:()=>resetStage('hub')},'Torna alla home'),
      $('button',{class:'btn',onclick:()=>resetStage('points')},'Apri Punti'),
      history()
    )
  );
}
function stage(content){return $('section',{class:'ppt-stage'},stageToolbar(),$('div',{class:'stage-content'},content),bottomScores())}
function stageToolbar(){return $('div',{class:'stage-toolbar'},$('button',{class:'icon-btn',title:'Home',onclick:()=>resetStage('hub')},'⌂'),$('div',{class:'stage-title'},state.title||'TRIVIA CHALLENGE'),$('div',{class:'stage-actions'},$('button',{class:'mini-tab',onclick:()=>resetStage('library')},'LISTA ANIME'),$('button',{class:'mini-tab',onclick:()=>resetStage('powers')},'POTERI'),$('button',{class:'mini-tab',onclick:()=>resetStage('points')},'PUNTI'),$('button',{class:'icon-btn',title:'Reset schermata',onclick:()=>{cur={...cur,i:0,revealed:0,answer:false,selected:[],jeo:null};render()}},'↻')))}
function bottomScores(){
  return $('div',{class:'bottom-scorebar'},
    ...state.players.map(p=>$('button',{class:`player-chip ${p.id===playerId?'selected':''}`,onclick:()=>{playerId=p.id;render()}},
      $('span',{},p.name),
      $('strong',{},p.score||0)
    ))
  );
}
function hub(){const groups=MENU_ORDER.map(t=>state.games.find(g=>g.type===t)).filter(Boolean);return $('div',{class:'hub-screen'},$('div',{class:'hero-title'},$('div',{class:'kicker'},state.subtitle||'Game edition'),$('h2',{},state.title||'TRIVIA CHALLENGE')), $('div',{class:'menu-board'},...groups.map(g=>$('button',{class:'ppt-button menu-button',onclick:()=>{gameId=g.id;resetStage('game')}},g.menuTitle||g.title))),$('button',{class:'floating-points',onclick:()=>resetStage('points')},'PUNTI'))}
function pointsScreen(){
  return $('div',{class:'points-screen'},
    $('h2',{},'PUNTI'),
    $('div',{class:'points-columns'},
      ...state.players.map(p=>$('div',{class:'points-card'},
        $('h3',{},p.name+':'),
        $('div',{class:'mega-score'},p.score||0),
        $('div',{class:'score-buttons'},
          ...[-200,-100,-50,50,100,200,500,1000].map(v=>$('button',{class:`score-btn ${v>0?'plus':'minus'}`,onclick:()=>{playerId=p.id;add(v,'pannello punti')}},v>0?`+ ${v}`:v))
        ),
        $('button',{class:'btn danger',onclick:()=>{p.score=0;state.history.unshift({id:id('h'),playerName:p.name,points:0,reason:'reset giocatore',at:new Date().toISOString()});save();render()}},`Reset ${p.name}`)
      ))
    )
  );
}
function libraryScreen(){return $('div',{class:'library-screen'},$('h2',{},'LISTA ANIME'),$('div',{class:'library-grid'},...state.library.map(x=>$('button',{class:'ppt-button library-tile'},x))))}
function powersScreen(){return $('div',{class:'powers-screen'},$('h2',{},'POTERI'),$('div',{class:'power-grid'},...state.powers.map(p=>$('article',{class:'power-card'},$('div',{class:'power-owner'},p.player),$('h3',{},p.name),$('p',{},p.text))))) }
function gameScreen(){const g=game();if(!g)return $('div',{class:'intro-screen'},$('h2',{},'Nessun minigioco'));return $('div',{class:'game-shell'},$('div',{class:'game-ribbon'},label(g.type)),renderGame(g))}
function scoreboardCompact(){return $('div',{class:'scorebar-inline'},...state.players.map(p=>$('span',{},`${p.name}: ${p.score||0}`)))}
function answer(text){return $('div',{class:`answer ${cur.answer?'on':''}`},cur.answer?$('strong',{},text||'Risposta non configurata'):'Risposta nascosta')}
function controls(g,ans,points,after){return $('div',{class:'host-actions'},$('button',{class:'btn success',onclick:()=>{after?.();add(points,`${g.title}: risposta corretta`)}},`Corretta · +${points}`),$('button',{class:'btn',onclick:()=>{cur.answer=!cur.answer;render()}},cur.answer?'Nascondi risposta':'Mostra risposta'),answer(ans))}
function pager(total){return $('div',{class:'pager'},$('button',{class:'btn',disabled:cur.i<=0,onclick:()=>{cur.i--;cur.answer=false;cur.revealed=0;cur.jeo=null;render()}},'←'),$('span',{},`${Math.min(cur.i+1,total||1)} / ${total||1}`),$('button',{class:'btn',disabled:cur.i>=total-1,onclick:()=>{cur.i++;cur.answer=false;cur.revealed=0;cur.jeo=null;render()}},'→'))}
function renderGame(g){return ({guess,bomb,said,detail,quote,chain,labors,guillotine,pass,jeopardy,sarabanda}[g.type]||unsupported)(g)}
function unsupported(g){return $('div',{class:'intro-screen'},$('h2',{},`Tipo non supportato: ${g.type}`))}
function guess(g){const rs=g.rounds||[],r=rs[cur.i]||rs[0];if(!r)return $('div',{class:'intro-screen'},'Nessun round.');const clues=(r.clues||[]).map(c=>typeof c==='string'?{label:'?',image:c}:c),shown=Math.min(cur.revealed,clues.length),pts=(r.points||[1000,500,250,50])[Math.max(0,shown-1)]||0;return $('div',{class:'guess-screen'},$('div',{class:'guess-grid'},...clues.map((c,i)=>$('button',{class:`guess-tile ${i<shown?'revealed':'covered'}`,onclick:()=>{if(i>=shown){cur.revealed=Math.max(cur.revealed,i+1);render()}}},i<shown?media(c.image,`Indizio ${i+1}`):$('span',{},c.label||r.points?.[i]||'?')))), $('div',{class:'host-actions'},$('button',{class:'btn primary',disabled:shown>=clues.length,onclick:()=>{cur.revealed++;render()}},'Rivela'),$('button',{class:'btn success',disabled:shown===0,onclick:()=>add(pts,`${g.title}: ${shown} indizi`)},`Corretta · +${pts}`),$('button',{class:'btn',onclick:()=>{cur.answer=!cur.answer;render()}},cur.answer?'Nascondi risposta':'Mostra risposta')),answer(r.answer),pager(rs.length))}
function bomb(g){const sel=new Set(cur.selected||[]),items=g.items||[],ok=items.filter((it,i)=>sel.has(i)&&!it.isBomb).length,bad=items.filter((it,i)=>sel.has(i)&&it.isBomb).length;return $('div',{class:'bomb-screen'},$('div',{class:'bomb-question'},g.question||'Evita le bombe.'),$('div',{class:'bomb-grid'},...items.map((it,i)=>$('button',{class:`bomb-tile ${sel.has(i)?(it.isBomb?'bomb':'ok'):''}`,onclick:()=>{sel.has(i)?sel.delete(i):sel.add(i);cur.selected=[...sel];render()}},it.image?media(it.image,it.label):$('span',{},it.label||`Elemento ${i+1}`)))), $('div',{class:'host-actions'},$('span',{class:'pill'},`Corrette ${ok}`),$('span',{class:'pill'},`Bombe ${bad}`),$('button',{class:'btn success',onclick:()=>add(ok*(g.pointsPerCorrect||50),`${g.title}: ${ok} elementi corretti`)},`Assegna ${ok*(g.pointsPerCorrect||50)} pt`),$('button',{class:'btn',onclick:()=>{cur.answer=!cur.answer;render()}},cur.answer?'Nascondi bombe':'Mostra bombe')),cur.answer?$('div',{class:'answer on'},'Bombe: '+items.filter(x=>x.isBomb).map(x=>x.label).join(', ')):null)}
function linear(g,list,fn){const q=list[cur.i]||list[0];return q?$('div',{class:'linear-screen'},fn(q),pager(list.length)):$('div',{class:'intro-screen'},'Nessun contenuto.')}
function said(g){return linear(g,g.questions||[],q=>$('div',{class:'audio-screen'},$('h2',{},q.prompt||'Ascolta e indovina'),audio(q.audio),cur.answer?$('div',{class:'answer-media'},media(q.media,q.answer)):null,controls(g,q.answer,g.points||100)))}
function detail(g){return linear(g,g.questions||[],q=>$('div',{class:'detail-screen'},$('h2',{},'OCCHIO AL DETTAGLIO'),$('div',{class:'detail-media'},media(cur.answer?q.fullImage:q.detailImage,q.answer)),controls(g,q.answer,g.points||200)))}
function quote(g){return linear(g,g.questions||[],q=>$('div',{class:'quote-screen'},$('div',{class:'quote-mark'},`“${q.partial||'Citazione parziale'}”`),q.source?$('p',{class:'muted'},q.source):null,controls(g,q.answer,g.points||200)))}
function chain(g){return linear(g,g.questions||[],q=>$('div',{class:'chain-screen'},$('div',{class:'topic'},g.topic||'Argomento'),$('h2',{},q.question),controls(g,q.answer,g.points||50)))}
function labors(g){return linear(g,g.questions||[],q=>$('div',{class:'labor-screen'},$('div',{class:'topic'},q.kind||'tipologia'),$('h2',{},q.question),q.options?.length?$('div',{class:'option-grid'},...q.options.map(o=>$('div',{class:'ppt-button'},o))):null,controls(g,`${q.answer||''}${q.explanation?' · '+q.explanation:''}`,g.points||100)))}
function guillotine(g){return $('div',{class:'guillotine-screen'},$('h2',{},'GHIGLIOTTINA'),$('div',{class:'word-cloud'},...(g.words||[]).map(w=>$('div',{class:'ppt-button word'},w))),controls(g,g.answer,g.points||200))}
function pass(g){
  const qs=g.questions||[];
  const q=qs[cur.i]||qs[0];
  const d=g.difficulty||'facile';
  const pts=g.points?.[d]??5;
  const bonus=g.bonus?.[d]??0;
  const all=qs.length&&qs.every(x=>x.status==='correct');
  if(!q)return $('div',{class:'intro-screen'},'Nessuna domanda.');
  return $('div',{class:'pass-screen'},
    $('div',{class:'pass-wheel'},
      ...qs.map((x,i)=>{
        const ang=(360/qs.length)*i-90;
        return $('button',{class:`pass-letter ${x.status==='correct'?'ok':x.status==='wrong'?'wrong':x.status==='pass'?'passed':''} ${i===cur.i?'current':''}`,style:`--angle:${ang}deg`,onclick:()=>{cur.i=i;cur.answer=false;render()}},x.letter);
      }),
      $('div',{class:'wheel-core'},$('strong',{},q.letter),$('span',{},d.toUpperCase()))
    ),
    $('div',{class:'pass-question'},
      $('div',{class:'timer-box'},'00:50'),
      $('h2',{},q.question),
      $('div',{class:'host-actions'},
        $('button',{class:'btn success',onclick:()=>{q.status='correct';add(pts,`${g.title}: lettera ${q.letter}`)}},`Corretta · +${pts}`),
        $('button',{class:'btn danger',onclick:()=>{q.status='wrong';save();render()}},'Sbagliata'),
        $('button',{class:'btn warn',onclick:()=>{q.status='pass';save();render()}},'Passo'),
        all ? $('button',{class:'btn primary',onclick:()=>add(bonus,`${g.title}: bonus ${d}`)},`Bonus · +${bonus}`) : null,
        $('button',{class:'btn',onclick:()=>{cur.answer=!cur.answer;render()}},cur.answer?'Nascondi':'Risposta')
      ),
      answer(q.answer)
    )
  );
}
function jeopardy(g){const cats=g.categories||[];if(cur.jeo){const c=cats[cur.jeo.c],cl=c?.clues?.[cur.jeo.q];if(cl)return $('div',{class:'jeopardy-question'},$('div',{class:'topic'},`${c.name} · ${cl.value} punti`),$('h2',{},cl.question),controls(g,cl.answer,cl.value,()=>{cl.used=true;cur.jeo=null;save()}),$('button',{class:'btn ghost',onclick:()=>{cur.jeo=null;render()}},'Torna al tabellone'))}return $('div',{class:'jeopardy-board'},...cats.map((c,ci)=>$('div',{class:'jeopardy-col'},$('div',{class:'jeopardy-cat'},c.name),...(c.clues||[]).map((cl,qi)=>$('button',{class:`jeopardy-cell ${cl.used?'used':''}`,disabled:cl.used,onclick:()=>{cur.jeo={c:ci,q:qi};cur.answer=false;render()}},cl.value))))) }
function sarabanda(g){return linear(g,g.songs||[],s=>$('div',{class:'sarabanda-screen'},$('h2',{},'SARABANDA'),audio(s.audio),$('div',{class:'host-actions'},$('button',{class:'btn success',onclick:()=>add(g.pointsTitle||25,`${g.title}: titolo`)},`Titolo · +${g.pointsTitle||25}`),$('button',{class:'btn success',onclick:()=>add(g.pointsArtist||25,`${g.title}: autore`)},`Autore · +${g.pointsArtist||25}`),$('button',{class:'btn primary',onclick:()=>add((g.pointsTitle||25)+(g.pointsArtist||25),`${g.title}: completa`)},'Completa · +50'),$('button',{class:'btn',onclick:()=>{cur.answer=!cur.answer;render()}},cur.answer?'Nascondi risposta':'Mostra risposta')),answer(`${s.title||'Titolo'} · ${s.artist||'Artista'}`)))}
function history(){return $('section',{class:'history-box'},$('h3',{},'Storico'),...(state.history.length?state.history.slice(0,7).map(h=>$('div',{class:'history-row'},$('span',{},h.playerName),$('small',{},h.reason),$('strong',{},`${h.points>0?'+':''}${h.points}`))):[$('p',{class:'muted'},'Nessun punto assegnato.')]))}
function admin(){const sel=$('select',{id:'type',onchange:preview});Object.entries(TYPES).forEach(([v,l])=>sel.append($('option',{value:v},l)));const title=$('input',{id:'title',value:'Nuovo minigioco',oninput:()=>{if(!editing)preview()}}),ta=$('textarea',{id:'json'});setTimeout(preview);return $('main',{class:'grid two'},$('section',{class:'panel stack'},$('h2',{},'Admin contenuti'),$('p',{class:'muted'},'Il gioco ora segue la struttura PowerPoint: home, schermate speciali, bottom scorebar e minigiochi in stile slide.'),$('div',{class:'grid two'},$('label',{},'Titolo evento',$('input',{value:state.title||'',onchange:e=>{state.title=e.target.value;save();render()}})),$('label',{},'Sottotitolo',$('input',{value:state.subtitle||'',onchange:e=>{state.subtitle=e.target.value;save();render()}}))),$('div',{class:'grid two'},$('label',{},'Tipo minigioco',sel),$('label',{},'Titolo',title)),$('label',{},'Contenuto JSON',ta),$('div',{class:'row'},$('button',{class:'btn primary',onclick:saveEditor},editing?'Salva modifiche':'Crea minigioco'),$('button',{class:'btn',onclick:()=>{editing='';preview()}},'Nuovo da template'),$('button',{class:'btn',onclick:exportData},'Esporta JSON'),$('label',{class:'btn ghost'},'Importa JSON',$('input',{type:'file',accept:'application/json',style:'display:none',onchange:importData}))),playersAdmin(),libraryAdmin(),powersAdmin()),$('aside',{class:'panel stack'},$('h3',{},'Minigiochi salvati'),...state.games.map(g=>$('div',{class:'saved-game'},$('div',{},$('strong',{},g.title),$('small',{},label(g.type))),$('div',{class:'row'},$('button',{class:'btn small',onclick:()=>edit(g.id)},'Modifica'),$('button',{class:'btn small',onclick:()=>dup(g.id)},'Duplica'),$('button',{class:'btn small danger',onclick:()=>del(g.id)},'Elimina')))),$('h3',{},'Immagini riferimento repo'),$('div',{class:'reference-grid'},...REFERENCE_IMAGES.map(name=>$('a',{href:`public/reference-images/${encodeURIComponent(name)}`,target:'_blank',class:'ref-thumb'},$('img',{src:`public/reference-images/${encodeURIComponent(name)}`,alt:name}),$('span',{},name.replace(/^\d+\.\s*/,'').replace('.png',''))))))) }
function preview(){const type=document.getElementById('type')?.value||'guess',title=document.getElementById('title')?.value||'Nuovo minigioco',ta=document.getElementById('json');if(!ta)return;const g=templates[type]();g.title=title;g.menuTitle=title.toUpperCase();ta.value=JSON.stringify(g,null,2)}
function saveEditor(){try{const g=JSON.parse(document.getElementById('json').value);g.id=g.id||id('game');g.title=document.getElementById('title').value.trim()||g.title;g.menuTitle=g.menuTitle||g.title?.toUpperCase();const i=state.games.findIndex(x=>x.id===(editing||g.id));i>=0?state.games[i]=g:state.games.unshift(g);gameId=g.id;editing='';save();toast('Minigioco salvato');render()}catch(e){toast('JSON non valido: '+e.message)}}
function edit(gid){const g=state.games.find(x=>x.id===gid);if(!g)return;editing=gid;render();document.getElementById('type').value=g.type;document.getElementById('title').value=g.title||'';document.getElementById('json').value=JSON.stringify(g,null,2)}
function dup(gid){const g=clone(state.games.find(x=>x.id===gid));g.id=id('game');g.title+=' copia';g.menuTitle=(g.menuTitle||g.title).replace(' COPIA','')+' COPIA';state.games.unshift(g);save();render()}
function del(gid){const g=state.games.find(x=>x.id===gid);if(!g||!confirm(`Eliminare “${g.title}”?`))return;state.games=state.games.filter(x=>x.id!==gid);gameId=state.games[0]?.id;save();render()}
function playersAdmin(){return $('section',{class:'stack'},$('h3',{},'Giocatori'),$('div',{class:'row'},$('input',{id:'pname',placeholder:'Nome squadra o giocatore'}),$('button',{class:'btn success',onclick:()=>{const v=document.getElementById('pname').value.trim();if(!v)return toast('Inserisci un nome.');const p={id:id('p'),name:v.toUpperCase(),score:0};state.players.push(p);playerId=p.id;save();render()}},'Aggiungi')),...state.players.map(p=>$('div',{class:'score-card'},$('input',{value:p.name,onchange:e=>{p.name=e.target.value.toUpperCase();save();render()}}),$('input',{type:'number',value:p.score||0,onchange:e=>{p.score=Number(e.target.value||0);save();render()}}),$('button',{class:'btn danger',onclick:()=>{if(state.players.length<2)return toast('Deve restare almeno un giocatore.');state.players=state.players.filter(x=>x.id!==p.id);playerId=state.players[0]?.id;save();render()}},'Rimuovi'))))}
function libraryAdmin(){return $('section',{class:'stack'},$('h3',{},'Lista Anime / Argomenti'),$('textarea',{value:state.library.join('\n'),style:'min-height:160px',onchange:e=>{state.library=e.target.value.split('\n').map(x=>x.trim()).filter(Boolean);save();render()}}))}
function powersAdmin(){return $('section',{class:'stack'},$('h3',{},'Poteri'),$('textarea',{value:JSON.stringify(state.powers,null,2),style:'min-height:180px',onchange:e=>{try{state.powers=JSON.parse(e.target.value);save();toast('Poteri aggiornati')}catch(err){toast('JSON poteri non valido')}}}))}
function scores(){return $('main',{class:'grid two'},$('section',{class:'panel stack'},$('h2',{},'Gestione manuale punteggi'),$('p',{class:'muted'},'Stessa logica della slide PUNTI originale, ma modificabile e con storico.'),pointsScreen(),$('div',{class:'row'},$('button',{class:'btn danger',onclick:()=>{if(confirm('Azzerare tutti i punteggi?')){state.players.forEach(p=>p.score=0);state.history=[];save();render()}}},'Azzera tutto'),$('button',{class:'btn',onclick:()=>{state.history=[];save();render()}},'Svuota storico'))),$('aside',{class:'panel'},history()))}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=$('a',{href:url,download:`trivia-challenge-${new Date().toISOString().slice(0,10)}.json`});document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url)}
function importData(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const s=hydrate(JSON.parse(r.result));if(!s.games?.length||!s.players?.length)throw Error('Il file deve contenere games e players.');state=s;gameId=state.games[0].id;playerId=state.players[0].id;save();render();toast('Dati importati')}catch(err){toast('Import fallito: '+err.message)}};r.readAsText(f)}
render();
