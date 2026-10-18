const app = document.querySelector('#app');
const panel = document.querySelector('#panel');
const status = document.querySelector('#status');
function setStatus(action) { status.textContent=`[${action}]`; }
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const settings = { high: 'gpt-6.1-sol', low: 'gpt-6.1-luna', budget: 75000, endpoint: '{\n  "baseURL": "https://api.openai.com/v1"\n}', whitelist: '', blacklist: '' };
const games = [{name:'The city beneath the signal',mode:'STANDARD',summary:'Urban fantasy / a missing signal / an unlikely courier'},{name:'A stranger in orbit',mode:'ISEKAI',summary:'Unknown origin / orbital station / first contact'}];
let current = 0;
let messages = [{role:'narrator',text:'Rain ticks against the station windows. Below, the city is a grid of red antenna lights and silent streets.\n\nThe package in your coat vibrates once. Across the platform, a woman in a blue maintenance jacket looks up from a dead terminal.\n\n“You heard it too,” she says. It is not a question.'}];
let busy = false;
let timer;
let branch = 0;
let draft = '';
let lore = 'Northline station lies above a city of silent streets and red antenna lights. An unidentified signal has drawn a courier and a station technician together.';
let character = {name:'Alex Vale',race:'Human',gender:'Unspecified',age:'28',bio:'A courier with a talent for finding trouble.',inventory:'Sealed package, transit pass',extra:'{}'};
let history = [];
let gameState = {location:'Northline station',time:'02:14',open_threads:['The unidentified signal']};
const trayState = {left:false,right:false};
const sessions = new Map();
const defaultCharacter={...character};
const opening = messages[0].text;
function selectGame(index) {
 sessions.set(current, {messages, branch, draft, lore, character, history, gameState});
 current = index;
 const saved = sessions.get(index);
 if (saved) ({messages, branch, draft, lore, character, history, gameState} = saved);
 else {
  const game=games[index];
  messages=[{role:'narrator',text:game.opening || (game.mode==='ISEKAI'?'You wake to the hum of ventilation. Beyond the glass, a planet you do not recognize fills the sky. A voice from the ceiling asks you to state your name.':opening)}];
  branch=0;draft='';history=[];
  character={...(game.characters?.[0] || defaultCharacter)};
  lore=Object.entries(game.world || {}).map(([key,value])=>`${key.toUpperCase()}\n${value}`).join('\n\n');
  gameState=structuredClone(game.initialState || {location:'Unknown',time:'Unknown',open_threads:[]});
 }
}
function startIsekai(){
 // Fresh offline setup per click; provider generation will replace this fixture.
 const number=games.filter(game=>game.mode==='ISEKAI').length+1;
 const card={...defaultCharacter,name:'Unknown traveler',bio:'You have awakened in an unfamiliar world.',inventory:'Unmarked identity card'};
 games.push({id:crypto.randomUUID(),name:`Unknown orbit / ${String(number).padStart(2,'0')}`,mode:'ISEKAI',summary:'A new arrival in an unfamiliar orbital station.',characters:[card],world:{premise:'An unknown traveler awakens aboard an orbital station.',setting:'An unfamiliar orbital station.'},opening:'You wake to the hum of ventilation. Beyond the glass, a planet you do not recognize fills the sky. A voice from the ceiling asks you to state your name.',initialState:{location:'Unidentified orbital station',time:'Unknown',open_threads:['Discover where you are']}});
 selectGame(games.length-1);
 play();
}
function modal(title, html) { if(!busy)setStatus(title); document.querySelector('#character-hover')?.hidePopover(); panel.classList.remove('setup-panel', 'final-review-panel', 'library-panel', 'editor-panel', 'pause-panel'); document.querySelector('#panel-title').textContent=title; document.querySelector('#panel-body').innerHTML=html; if(!panel.open) panel.showModal(); }
function field(label,name,value='',type='text') { return `<label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${escape(value)}">`; }
function home() {
 setStatus('Awaiting user input');
 app.innerHTML=`<section class="main-menu" aria-labelledby="menu-title"><h1 id="menu-title">&gt;./solo-adventure<span class="title-cursor" aria-hidden="true">_</span></h1><div class="menu-column"><nav class="menu-options" aria-label="Main menu"><button class="menu-option" data-action="library">Library</button><button class="menu-option" data-action="new">New Adventure</button><button class="menu-option" data-action="isekai">Isekai</button><button class="menu-option" data-action="settings">Settings</button><button class="menu-option" data-action="quit">Quit</button></nav></div></section>`;
}
const npc = {kind:'NPC',name:'Station technician',race:'Human',gender:'Female',age:'Unknown',bio:'A woman in a blue maintenance jacket who recognizes the signal.',inventory:'Maintenance terminal',extra:'{}'};
messages[0].speakers=[npc];
const cardIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="20"/><circle cx="12" cy="9" r="3"/><path d="M8 17h8 M9 19h6"/></svg>';
function storyCard(game, actions='') {
 const world=game.world || {};
 return `<article class="story-card"><div class="card-nameplate"><h2>${escape(game.name)}</h2></div><div class="world-art" aria-hidden="true"><svg viewBox="0 0 240 160"><circle cx="120" cy="73" r="48"/><ellipse cx="120" cy="73" rx="48" ry="18"/><ellipse cx="120" cy="73" rx="20" ry="48"/><path d="M20 135h200 M35 145h170 M15 35V15h30 M195 15h30v20"/></svg><span>WORLD RECORD</span></div><div class="card-type">${escape(game.mode || 'STANDARD')} / ADVENTURE</div><div class="story-card-copy"><h3>Premise</h3><p>${escape(world.premise || game.summary || '')}</p>${Object.entries(world).filter(([key])=>key!=='premise').map(([key,value])=>`<h3>${escape(key)}</h3><p>${escape(value)}</p>`).join('')}</div>${actions?`<div class="card-actions">${actions}</div>`:''}</article>`;
}
function speakerControls(message,index) {
 const speakers=message.speakers || (message.role==='player'?[character]:[]);
 return speakers.length?`<div class="speaker-controls">${speakers.map((card,i)=>`<button class="card-icon-button speaker-icon" data-index="${index}" data-speaker="${i}" aria-label="Preview ${escape(card.name)} character card" aria-controls="character-hover">${cardIcon}</button>`).join('')}</div>`:'';
}
function actingCharacterPicker(cards,activeIndex) {
 return `<details class="actor-picker"><summary class="card-icon-button" aria-label="Choose acting character" title="Choose acting character">${cardIcon}</summary><div class="actor-dropdown"><label for="acting-character">Acting character</label><select id="acting-character">${cards.map((card,i)=>`<option value="${i}" ${i===activeIndex?'selected':''}>${escape(card.name)}</option>`).join('')}</select></div></details>`;
}
function characterCard(card, index=0, compact=false) {
 return `<article class="character-card ${compact?'compact-card':''}" aria-label="${escape(card.name || 'Unnamed character')}"><div class="card-nameplate"><h2>${escape(card.name || 'Unnamed character')}</h2><span>${String(index+1).padStart(2,'0')}</span></div><div class="card-portrait" aria-hidden="true"><span class="portrait-label">CHARACTER / ${String(index+1).padStart(2,'0')}</span><svg viewBox="0 0 200 140"><path d="M15 35V15h30 M155 15h30v20 M15 105v20h30 M155 125h30v-20"/><circle cx="100" cy="49" r="23"/><path d="M52 119v-10c0-35 96-35 96 0v10Z M88 78l12 16 12-16"/></svg><span class="portrait-caption">IDENTITY RECORD</span></div><div class="card-type">${escape(card.race || 'Unknown species')} / ${escape(card.gender || 'Unspecified')}</div><div class="card-description"><p>${escape(card.bio || 'No biography recorded.')}</p>${!compact && card.extra && card.extra!=='{}'?`<p class="card-extra">${escape(card.extra)}</p>`:''}</div><div class="card-bottom"><span>AGE / ${escape(card.age || '?')}</span><span>${card.kind==='NPC'?'NPC':'PLAYER CHARACTER'}</span></div></article>`;
}
let characterTab='players';
function editorModal(title,html){modal(title,html);panel.classList.add('editor-panel');}
function editorCards(group=characterTab){
 const game=games[current];
 if(!game.characters)game.characters=[{...character}];
 if(!game.npcs)game.npcs=[{...npc}];
 return group==='npcs'?game.npcs:game.characters;
}
function characterLibrary(group='players'){
 characterTab=group;
 const cards=editorCards(group);
 editorModal('Character cards',`<div class="editor-tabs" role="tablist" aria-label="Character types"><button role="tab" aria-selected="${group==='players'}" data-action="player-cards">Your characters</button><button role="tab" aria-selected="${group==='npcs'}" data-action="npc-cards">NPC characters</button></div><div class="character-library-grid" role="tabpanel" aria-label="${group==='players'?'Your characters':'NPC characters'}">${cards.map((card,i)=>`<section class="editable-card">${characterCard(card,i)}<button class="edit-card-icon" data-action="edit-card" data-index="${i}" aria-label="Edit ${escape(card.name || 'character')}" title="Edit card"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M13 6l5 5"/></svg></button></section>`).join('')}</div><div class="editor-bottom"><button data-action="add-character">+ New ${group==='npcs'?'NPC':'character'}</button></div>`);
}
function cardEditor(index=-1){
 const card=index<0?Object.fromEntries(characterFields.map(key=>[key,key==='extra'?'{}':''])):editorCards()[index];
 editorModal(index<0?'New character card':`Edit / ${card.name}`,`<form id="card-editor" data-index="${index}" data-group="${characterTab}"><div class="card-editor-columns"><section class="card-editor-fields"><div class="eyebrow">CHARACTER INFORMATION</div>${characterFields.map(key=>['bio','inventory','extra'].includes(key)?`<label for="edit-${key}">${key}</label><textarea id="edit-${key}" name="${key}">${escape(card[key] || '')}</textarea>`:field(key,key,card[key] || '')).join('')}</section><section class="card-editor-preview" aria-label="Live card preview">${characterCard({...card,kind:characterTab==='npcs'?'NPC':undefined},Math.max(index,0))}</section></div><div class="editor-bottom"><button type="button" data-action="back-cards">Cancel</button><button class="primary">Save card</button></div></form>`);
}
function inventoryItems(value) {
 if(Array.isArray(value)) return value.map(item=>typeof item==='string'?item:JSON.stringify(item));
 if(value && typeof value==='object') return Object.entries(value).map(([key,count])=>`${key} × ${typeof count==='object'?JSON.stringify(count):count}`);
 return String(value || '').split(/[,;\n]/).map(item=>item.trim()).filter(Boolean);
}
function play() {
 setStatus(busy?'Awaiting agent response':'Awaiting user input');
 document.querySelector('#character-hover')?.hidePopover();
 const lastAI=messages.findLastIndex(message=>message.role==='narrator');
 const cards=games[current].characters || [character];
 const activeIndex=Math.min(games[current].activeCharacter || 0,cards.length-1);
 const active=cards[activeIndex];
 const items=inventoryItems(active.inventory);
 app.innerHTML=`<section class="game-screen" aria-label="Adventure"><header class="story-header"><span class="story-title">${escape(games[current].name)}</span><button class="pause-trigger" data-action="pause" aria-label="Open pause menu" title="Pause menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3 1-2h4l1 2 2 1 2 0 2 4-1 2v4l1 2-2 4h-2l-2 1-1 2h-4l-1-2-2-1H5l-2-4 1-2v-4L3 8l2-4h2Z" transform="translate(0 1) scale(1 .9)"/><circle cx="12" cy="12" r="3"/></svg></button></header><div class="game-workspace"><aside class="game-tray left-tray ${trayState.left?'is-open':''}"><button class="tray-toggle" data-action="toggle-left" aria-expanded="${trayState.left}" aria-controls="information-tray" aria-label="Toggle information tray" title="Information">${trayState.left?'‹':'›'}</button><div class="tray-content information-layout" id="information-tray" ${trayState.left?'':'hidden'}><section class="active-character"><label for="active-character">Active character</label>${cards.length>1?`<select id="active-character" aria-label="Active player character">${cards.map((card,i)=>`<option value="${i}" ${i===activeIndex?'selected':''}>${escape(card.name)}</option>`).join('')}</select>`:''}${characterCard(active,activeIndex,true)}</section><section class="inventory-section"><h3>Inventory <span>${items.length}</span></h3><div class="inventory-grid" tabindex="0" aria-label="Active character inventory">${items.length?items.map((item,i)=>`<div class="inventory-slot"><span class="slot-number">${String(i+1).padStart(2,'0')}</span><span>${escape(item)}</span></div>`).join(''):'<p class="muted">Inventory empty</p>'}</div></section><section class="location-summary"><h3>Location</h3><p>${escape(gameState.location || 'Unknown')}</p><small>LOCAL TIME / ${escape(gameState.time || 'Unknown')}</small></section></div></aside><section class="story story-chat"><div class="chat-log" role="log" aria-label="Story messages">${messages.map((m,i)=>`<article class="message ${m.role==='player'?'player':'narrator'}" aria-label="${m.role==='player'?'You':'Game master'}">${speakerControls(m,i)}<div class="message-block"><p>${escape(m.text)}</p></div><div class="message-tools">${i===lastAI?`<button data-action="reroll" aria-label="Reroll latest AI message" title="Reroll latest AI message" ${busy?'disabled':''}>↻</button>`:''}<button data-action="edit" data-index="${i}" aria-label="Edit message" title="Edit message" ${busy?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M13 6l5 5"/></svg></button><button data-action="delete" data-index="${i}" aria-label="Delete message" title="Delete message" ${busy?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7"/></svg></button></div></article>`).join('')}${busy?'<article class="message narrator"><div class="message-block"><p aria-live="polite">…</p></div></article>':''}</div><div class="story-input ${busy?'is-waiting':''}">${busy?'<div class="response-wait" role="status" aria-label="Awaiting agent response"><span aria-hidden="true">...</span></div>':`${actingCharacterPicker(cards,activeIndex)}<div class="choices">${['Ask what she knows about the signal.','Keep your distance and inspect the package.','Leave the platform before the next train.'].map((c,i)=>`<button class="choice" data-action="choose" data-value="${escape(c)}"><span>0${i+1}</span>${c}</button>`).join('')}</div><form id="custom" class="custom"><input name="action" aria-label="Custom action" placeholder="Or take your own action…" required><button>Send →</button></form>`}</div></section><aside class="game-tray right-tray ${trayState.right?'is-open':''}"><button class="tray-toggle" data-action="toggle-right" aria-expanded="${trayState.right}" aria-controls="tools-tray" aria-label="Toggle tools tray" title="Tools">${trayState.right?'›':'‹'}</button><div class="tray-content" id="tools-tray" ${trayState.right?'':'hidden'}><h2>Tools / editors</h2><button data-action="character" ${busy?'disabled':''}>Character cards</button><button data-action="lore" ${busy?'disabled':''}>Lore</button><button data-action="state" ${busy?'disabled':''}>Game state</button><button disabled title="Available after the MVP">Timelines</button>${busy?'<button data-action="cancel">Cancel generation</button>':''}${draft&&!busy?'<button data-action="recover">Interrupted draft</button>':''}</div></aside></div></section>`;
 const log=app.querySelector('.chat-log');
 log.scrollTop=log.scrollHeight;
}

function generate(action, reroll=false) {
 if(busy) return;
 if(action){const cards=games[current].characters || [character];const actor=cards[games[current].activeCharacter || 0] || cards[0];messages.push({role:'player',text:action,speakers:[{...actor}]});}
 busy=true;play();
 const text='The woman turns the terminal toward you. A single line repeats across its screen: NORTHLINE IS LISTENING.\n\n“That package is a receiver,” she says. “The question is who you want answering it.”';
 let progress=0;
 timer=setInterval(()=>{ progress=Math.min(progress+15,text.length); draft=text.slice(0,progress); const p=app.querySelector('[aria-live]');if(p){const log=p.closest('.chat-log');const nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<64;p.textContent=draft;if(nearBottom)log.scrollTop=log.scrollHeight;}
 if(progress===text.length){clearInterval(timer);if(reroll){branch++;const last=messages.findLastIndex(m=>m.role==='narrator');if(last>=0)messages.splice(last,1);}messages.push({role:'narrator',text,speakers:[{...npc}]});history.push('Completed simulated turn · narration + state committed together');draft='';busy=false;play();}},35);
}
function pauseMenu(){
 modal('Pause menu', `<nav class="pause-options" aria-label="Pause menu"><button class="primary" data-action="close" autofocus>Resume</button><button data-action="settings">Settings</button><button data-action="export">Export Save</button><button data-action="home" ${busy?'disabled':''}>Main Menu</button></nav>`);
 panel.classList.add('pause-panel');
}
function settingsPanel(tab='api') {
 const content=tab==='api'?`<p class="notice">Prototype settings stay in memory. API credentials belong in your environment or project-local .env, never in saves.</p><label for="endpoint">OpenAI-compatible endpoint JSON</label><textarea id="endpoint" name="endpoint">${escape(settings.endpoint)}</textarea><button type="button" data-action="fetch">Fetch models (preview)</button>${field('High model','high',settings.high)}${field('Low model','low',settings.low)}${field('Context budget / tokens','budget',settings.budget,'number')}<p class="muted">API key: backend not connected · storage: ./saves</p>`:`<p class="muted">Applied to one-click Isekai starts.</p>${field('Whitelist tags / comma-separated','whitelist',settings.whitelist)}${field('Blacklist tags / comma-separated','blacklist',settings.blacklist)}<label for="gender">Starting character gender</label><select id="gender" name="gender"><option>Any</option><option>Male</option><option>Female</option><option>Nonbinary</option></select><label><input type="checkbox" name="intro">Include an explicit Isekai arrival in the narrative</label><p class="notice">The high model creates the setup; the low model checks preferences. One validation retry, then ask whether to continue.</p>`;
 modal('Settings',`<div class="tabs"><button data-action="api-settings" aria-pressed="${tab==='api'}">Connection / models</button><button data-action="isekai-settings" aria-pressed="${tab==='isekai'}">Isekai preferences</button></div><form id="settings-form">${content}<div class="actions"><button class="primary">Save settings</button></div></form>${app.querySelector('.game-screen')?'<div class="actions"><button data-action="pause">← Pause menu</button></div>':''}`);
}
let setupDraft;
const characterFields = ['name','race','gender','age','bio','inventory','extra'];
function setupModal(title, html) {
 modal(title, html);
 panel.classList.add('setup-panel');
 const form = panel.querySelector('form');
 if (form) {
  const actions = [...form.children].findLast(child => child.classList.contains('actions'));
  const content = document.createElement('div');
  content.className = 'setup-content';
  for (const child of [...form.childNodes]) if (child !== actions) content.append(child);
  form.append(content);
  if (actions) { actions.classList.add('setup-footer'); form.append(actions); }
 }
 document.querySelector('#panel-body').scrollTop = 0;
}
function reviewSetup(premise) {
 if (!setupDraft) setupDraft = {title:'A signal in the dark',world:{premise,setting:'A remote station at the edge of inhabited space.',tone:'Quiet, mysterious science fiction.',opening:'An unexpected transmission interrupts an otherwise ordinary night.'},characters:[{...character}]};
 setupModal('01 / World — review your adventure', `<form id="world-review" class="setup-review"><section class="world-card"><div class="eyebrow">WORLD CARD / STANDARD ADVENTURE</div>${field('World / adventure name','title',setupDraft.title)}<p class="muted">Refine your world, then create its starting characters.</p>${Object.entries(setupDraft.world).map(([key,value])=>`<label for="world-${key}">${key}</label><textarea class="card-text" id="world-${key}" name="world-${key}">${escape(value)}</textarea>`).join('')}</section>${jsonControl()}<div class="actions"><button class="primary">Next: starting characters →</button></div></form>`);
}
function jsonControl() { return '<div class="actions"><button type="button" data-action="setup-json" aria-expanded="false" aria-controls="setup-json">View JSON</button></div><pre id="setup-json" class="record" hidden></pre>'; }
function captureSetup(form) {
 const data=Object.fromEntries(new FormData(form));
 if(form.id==='world-review') {
  setupDraft.title=data.title;
  for(const key of Object.keys(setupDraft.world)) setupDraft.world[key]=data[`world-${key}`];
 } else if(form.id==='begin') {
  setupDraft.characters=setupDraft.characters.map((card,i)=>Object.fromEntries(characterFields.map(key=>[key,data[`character-${i}-${key}`]])));
 }
 return setupDraft;
}
function characterSetup() {
 setupModal('02 / Characters — build your starting cast', `<form id="begin" class="setup-review"><div class="eyebrow">${escape(setupDraft.title)} / STARTING CHARACTERS</div><h2>Who begins this story?</h2><p class="muted">Create one to four starting characters. Generation is simulated in this preview.</p>${setupDraft.characters.map((card,i)=>`<section class="starting-card"><div class="row spread"><h3>Character ${i+1}</h3><button type="button" data-action="remove-starting" data-index="${i}" ${setupDraft.characters.length===1?'disabled':''}>Remove</button></div><label for="character-prompt-${i}">Describe this character</label><textarea id="character-prompt-${i}" name="character-prompt-${i}" placeholder="Their role, background, or anything you have in mind…">${escape(setupDraft.prompts?.[i] || '')}</textarea>${characterFields.map(key=>key==='bio'||key==='extra'?`<label for="character-${i}-${key}">${key}</label><textarea id="character-${i}-${key}" name="character-${i}-${key}">${escape(card[key] || '')}</textarea>`:field(key,`character-${i}-${key}`,card[key] || '')).join('')}</section>`).join('')}${jsonControl()}<div class="actions"><button type="button" data-action="back-world">← World</button><button type="button" data-action="add-starting" ${setupDraft.characters.length>=4?'disabled':''}>+ Character</button><select name="generation-target" aria-label="Character to generate">${setupDraft.characters.map((_,i)=>`<option value="${i}">Character ${i+1}</option>`).join('')}</select><button type="button" data-action="generate-starting">Generate</button><button class="primary">Review adventure →</button></div></form>`);
}
function finalReview() {
 const readable = value => escape(value || 'Not specified');
 setupModal('03 / Review — ready to begin', `<form id="start-adventure" class="final-review"><div class="review-columns"><section class="review-world" aria-label="World overview">${storyCard({name:setupDraft.title,mode:'STANDARD',world:setupDraft.world})}</section><section class="review-cast" aria-label="Starting characters" tabindex="0"><div class="eyebrow">STARTING CAST / ${setupDraft.characters.length}</div>${setupDraft.characters.map((card,i)=>characterCard(card,i)).join('')}</section></div><div class="actions"><button type="button" data-action="back-characters">← Characters</button><button class="primary">Start adventure →</button></div></form>`);
 panel.classList.add('final-review-panel');
}
function saveCharacterDraft(form) {
 captureSetup(form);
 const data=new FormData(form);
 setupDraft.prompts=setupDraft.characters.map((_,i)=>data.get(`character-prompt-${i}`)||'');
}
function newGame(){setupDraft=null;setupModal('01 / World — describe your adventure',`<form id="setup"><label for="premise">What kind of story do you want?</label><textarea id="premise" name="premise" required placeholder="A quiet science-fiction mystery on a station at the edge of inhabited space…"></textarea><div class="actions"><button class="primary">Generate world preview →</button></div><p class="muted">Review the world first. Starting characters come next.</p></form>`);}
function setTray(side,open){
 const tray=app.querySelector(`.${side}-tray`);
 if(!tray)return;
 trayState[side]=open;
 tray.classList.toggle('is-open',open);
 tray.querySelector('.tray-content').hidden=!open;
 const toggle=tray.querySelector('.tray-toggle');
 toggle.setAttribute('aria-expanded',String(open));
 toggle.textContent=side==='left'?(open?'‹':'›'):(open?'›':'‹');
}
function closePanel(){panel.close();setStatus(busy?'Awaiting agent response':'Awaiting user input');}
document.querySelector('#close-panel').onclick=closePanel;
panel.addEventListener('cancel',()=>setStatus(busy?'Awaiting agent response':'Awaiting user input'));
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button)return;
 const a=button.dataset.action;const index=Number(button.dataset.index);
 if(a==='toggle-left'||a==='toggle-right') {
  const side=a==='toggle-left'?'left':'right';
  if(side==='right'&&!trayState.right){
   modal('Spoiler warning', '<p>The editors can reveal undiscovered characters, world lore, and game state. Do you want to proceed?</p><div class="actions"><button data-action="close" autofocus>Cancel</button><button class="primary" data-action="proceed-editors">Proceed</button></div>');
  }else setTray(side,!trayState[side]);
 }
 if(a==='proceed-editors'){panel.close();setTray('right',true);}
 if(a==='state')editorModal('Game state',`<form id="state-form"><label for="state">State / JSON</label><textarea id="state" name="state" rows="12">${escape(JSON.stringify(gameState,null,2))}</textarea><div class="actions"><button class="primary">Save state</button></div></form>`);
 if(a==='home'){if(busy){setStatus('Cancel the current generation before leaving.');return;}panel.close();home();}
 if(a==='play'){selectGame(index);play();}
 if(a==='pause')pauseMenu();
 if(a==='settings'||a==='api-settings')settingsPanel();
 if(a==='isekai-settings')settingsPanel('isekai');
 if(a==='library'){
  modal('Library', `<div class="library-toolbar"><button data-action="import">Import .zip</button></div><div class="library-grid">${games.map((game,i)=>storyCard(game,`<button class="primary" data-action="load-save" data-index="${i}">Play →</button><button data-action="export">Export .zip</button>`)).join('')}</div>`);
  panel.classList.add('library-panel');
 }
 if(a==='load-save'){panel.close();selectGame(index);play();}
 if(a==='setup-json'){
  const preview=document.querySelector('#setup-json');
  preview.hidden=!preview.hidden;
  button.setAttribute('aria-expanded',String(!preview.hidden));
  button.textContent=preview.hidden?'View JSON':'Hide JSON';
  preview.textContent=JSON.stringify(captureSetup(button.closest('form')),null,2);
 }
 if(['add-starting','remove-starting','generate-starting','back-world'].includes(a)) {
  saveCharacterDraft(button.closest('form'));
  if(a==='add-starting' && setupDraft.characters.length<4) setupDraft.characters.push(Object.fromEntries(characterFields.map(key=>[key,key==='extra'?'{}':''])));
  if(a==='remove-starting' && setupDraft.characters.length>1){setupDraft.characters.splice(index,1);setupDraft.prompts.splice(index,1);}
  if(a==='generate-starting') { const target=Number(button.closest('form').elements['generation-target'].value); setupDraft.characters[target]={name:`Traveler ${target+1}`,race:'Human',gender:'Unspecified',age:'28',bio:setupDraft.prompts[target] || 'A traveler drawn into the mystery of the station.',inventory:'Travel bag, identity card',extra:'{}'}; }
  if(a==='back-world')reviewSetup();else characterSetup();
 }
 if(a==='back-characters')characterSetup();
 if(a==='quit'){if(window.desktop)window.desktop.quit();else setStatus('Quit is available in the desktop app.');}
 if(a==='new')newGame();
 if(a==='isekai')startIsekai();
 if(a==='choose')generate(button.dataset.value);
 if(a==='reroll')generate(null,true);
 if(a==='cancel'){clearInterval(timer);busy=false;history.push('Generation cancelled · draft retained, no state committed');play();setStatus('Generation Cancelled · draft retained');}
 if(a==='recover')modal('Interrupted generation',`<p class="notice">Draft only. No state updates committed.</p><pre>${escape(draft)}</pre><div class="actions"><button data-action="retry">Retry manually</button><button data-action="discard">Discard draft</button></div>`);
 if(a==='retry'){panel.close();generate();}
 if(a==='discard'){draft='';panel.close();play();}
 if(a==='character'||a==='player-cards')characterLibrary('players');
 if(a==='npc-cards')characterLibrary('npcs');
 if(a==='edit-card')cardEditor(index);
 if(a==='add-character')cardEditor();
 if(a==='back-cards')characterLibrary(characterTab);
 if(a==='lore')editorModal('Lore',`<form id="lore-form"><label for="lore">World lore</label><textarea id="lore" name="lore" rows="12">${escape(lore)}</textarea><div class="actions"><button class="primary">Save lore</button></div></form>`);

 if(a==='edit')editorModal('Edit message / new branch',`<form id="edit-form" data-index="${index}"><label for="message">Message</label><textarea id="message" name="message" rows="8">${escape(messages[index].text)}</textarea><p class="muted">Creates one branch. Later messages and game state stay unchanged.</p><div class="actions"><button class="primary">Save edit</button><button type="button" data-action="close">Cancel</button></div></form>`);
 if(a==='delete'){messages.splice(index,1);branch++;history.push('Message deleted · state unchanged');play();}
 if(a==='close')closePanel();
 if(a==='fetch')setStatus('Model fetching preview · configure backend integration next');
 if(a==='export'||a==='import')modal(a==='export'?'Export save / .zip':'Import save / .zip',`<p>Archive ${a} will include story messages, cards, lore, state and history.</p><p class="notice">UI preview: file operations are not connected. Credentials are excluded from archives.</p>${a==='import'?'<label for="archive">Select archive (preview only)</label><input id="archive" type="file" accept=".zip">':''}`);
});
document.addEventListener('submit',event=>{
 event.preventDefault();const form=event.target;const data=Object.fromEntries(new FormData(form));
 if(form.id==='custom'){generate(data.action);return;}
 if(form.id==='setup'){reviewSetup(data.premise);return;}
 if(form.id==='world-review'){captureSetup(form);characterSetup();return;}
 if(form.id==='begin'){saveCharacterDraft(form);finalReview();return;}
 if(form.id==='start-adventure'){
  const setup=setupDraft;
  games.push({name:setup.title,mode:'STANDARD',summary:setup.world.premise,world:setup.world,characters:setup.characters.map(card=>({...card}))});
  selectGame(games.length-1);
  character={...setup.characters[0]};
  lore=Object.entries(setup.world).map(([key,value])=>`${key.toUpperCase()}\n${value}`).join('\n\n');
  panel.close();play();return;
 }
 if(form.id==='settings-form'){if(data.endpoint){try{JSON.parse(data.endpoint);}catch{setStatus('Endpoint must be valid JSON.');return;}}Object.assign(settings,data);if(!app.querySelector('.game-screen')){panel.close();setStatus('Settings Saved');return;}if(app.querySelector('.game-screen')){pauseMenu();setStatus('Settings Saved');return;}}
 if(form.id==='card-editor'){
  const group=form.dataset.group;
  const cards=editorCards(group);
  const index=Number(form.dataset.index);
  const card={...data,...(group==='npcs'?{kind:'NPC'}:{})};
  if(index<0)cards.push(card);else cards[index]=card;
  if(group==='players')character={...cards[0]};
  branch++;history.push('Character card edited');
  play();characterLibrary(group);setStatus('Character Card Saved');return;
 }
 if(form.id==='state-form'){
  try {const next=JSON.parse(data.state);if(!next||Array.isArray(next)||typeof next!=='object')throw new Error();gameState=next;}
  catch{setStatus('State must be a JSON object.');return;}
  branch++;history.push('Manual game-state correction');
 }
 if(form.id==='lore-form'){lore=data.lore;branch++;history.push('Manual lore correction');}
 if(form.id==='edit-form'){messages[Number(form.dataset.index)].text=data.message;branch++;history.push('Message edited · later messages preserved · state unchanged');play();}
 panel.close();if(app.querySelector('.game-screen'))play();setStatus(form.id==='lore-form'?'Lore Saved':form.id==='state-form'?'Game State Saved':form.id==='edit-form'?'Message Saved':'Changes Saved');
});
home();

document.addEventListener('input', event => {
 const editor=event.target.closest('#card-editor');
 if(editor){
  const data=Object.fromEntries(new FormData(editor));
  if(editor.dataset.group==='npcs')data.kind='NPC';
  editor.querySelector('.card-editor-preview').innerHTML=characterCard(data,Math.max(Number(editor.dataset.index),0));
 }

 const form=event.target.closest('#begin, #world-review');
 const preview=document.querySelector('#setup-json');
 if(form && preview && !preview.hidden) preview.textContent=JSON.stringify(captureSetup(form),null,2);

});

document.addEventListener('change', event => {
 if(event.target.id==='active-character'||event.target.id==='acting-character') {
  games[current].activeCharacter=Number(event.target.value);
  play();
 }
});

// A top-layer preview avoids clipping against the scrolling transcript.
const characterHover=document.createElement('div');
characterHover.id='character-hover';
characterHover.setAttribute('popover','manual');
characterHover.setAttribute('role','region');
characterHover.setAttribute('aria-label','Character card preview');
document.body.append(characterHover);
let hoverTimer;
function hideCharacterHover(){clearTimeout(hoverTimer);characterHover.hidePopover();}
function showCharacterHover(icon){
 clearTimeout(hoverTimer);
 const message=messages[Number(icon.dataset.index)];
 const card=(message?.speakers || [character])[Number(icon.dataset.speaker)];
 if(!card)return;
 characterHover.innerHTML=characterCard(card);
 characterHover.showPopover();
 const rect=icon.getBoundingClientRect();
 const width=characterHover.offsetWidth;
 const height=characterHover.offsetHeight;
 const player=Boolean(icon.closest('.player'));
 const left=player?rect.right-width:rect.left;
 characterHover.style.left=`${Math.max(8,Math.min(left,innerWidth-width-8))}px`;
 const below=rect.bottom+6;
 characterHover.style.top=`${Math.max(8,Math.min(below,innerHeight-height-8))}px`;
}
document.addEventListener('pointerover',event=>{
 const icon=event.target.closest('.speaker-icon');
 if(icon)showCharacterHover(icon);
 if(characterHover.contains(event.target))clearTimeout(hoverTimer);
});
document.addEventListener('pointerout',event=>{
 if(event.target.closest('.speaker-icon') || characterHover.contains(event.target)){
  clearTimeout(hoverTimer);hoverTimer=setTimeout(hideCharacterHover,120);
 }
});
document.addEventListener('focusin',event=>{if(event.target.matches('.speaker-icon'))showCharacterHover(event.target);});
document.addEventListener('focusout',event=>{if(event.target.matches('.speaker-icon'))hideCharacterHover();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideCharacterHover();});
document.addEventListener('scroll',event=>{if(!characterHover.contains(event.target))hideCharacterHover();},true);
window.addEventListener('resize',hideCharacterHover);
