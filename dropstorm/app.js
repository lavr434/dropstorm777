'use strict';
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const DB   = path.join(__dirname, 'db.json');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── helpers ── */
function readDB()       { return JSON.parse(fs.readFileSync(DB,'utf-8')); }
function writeDB(data)  { fs.writeFileSync(DB, JSON.stringify(data,null,2),'utf-8'); }
function getUser(db, id){ return db.users.find(u=>u.id===id); }
function getItem(db,id) { return db.items.find(i=>i.id===id); }
function fmtR(n)        { return Number(n).toLocaleString('ru-RU')+'₽'; }

/* ── session mock ── */
app.use((req,res,next)=>{
  const db   = readDB();
  const user = getUser(db,1);          // always demo user
  res.locals.user         = user;
  res.locals.fmtR         = fmtR;
  res.locals.onlineCount  = Math.floor(Math.random()*200+1300);
  res.locals.recentDrops  = db.recentDrops||[];
  res.locals.page         = '';
  next();
});

/* ════════════════════════════════
   PAGES
════════════════════════════════ */
app.get('/', (req,res)=>{
  const db=readDB();
  res.render('home',{ cases:db.cases, page:'home', pageTitle:'Кейсы CS2' });
});
app.get('/open/:id',(req,res)=>{
  const db=readDB();
  const caseData=db.cases.find(c=>String(c.id)===req.params.id)||null;
  if(!caseData) return res.redirect('/');
  const caseItems=caseData.items.map(id=>getItem(db,id)).filter(Boolean);
  res.render('open',{ caseData:{...caseData,items:caseItems}, page:'home', pageTitle:caseData.name });
});
app.get('/inventory', (req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  const items=user.inventory.map(id=>getItem(db,id)).filter(Boolean);
  res.render('inventory',{ items, page:'inventory', pageTitle:'Инвентарь' });
});
app.get('/contracts', (req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  const items=user.inventory.map(id=>getItem(db,id)).filter(Boolean);
  res.render('contracts',{ items, page:'contracts', pageTitle:'Контракты' });
});
app.get('/upgrade',  (req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  const items=user.inventory.map(id=>getItem(db,id)).filter(Boolean);
  res.render('upgrade',{ items, page:'upgrade', pageTitle:'Апгрейд' });
});
app.get('/wheel',    (req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  res.render('wheel',{ spinTokens:user.spinTokens||0, page:'wheel', pageTitle:'Колесо Фортуны' });
});
app.get('/quests',   (req,res)=>res.render('quests',  { page:'quests',   pageTitle:'Задания' }));
app.get('/history',  (req,res)=>{
  const db=readDB();
  res.render('history',{ history:db.history||[], page:'history', pageTitle:'История' });
});
app.get('/settings', (req,res)=>res.render('settings',{ page:'settings', pageTitle:'Настройки' }));
app.get('/login',    (req,res)=>res.render('login',   { error:null }));
app.get('/register', (req,res)=>res.render('register',{ error:null }));
app.get('/logout',   (req,res)=>res.redirect('/login'));
app.get('/demo',     (req,res)=>res.redirect('/'));
app.post('/login',   (req,res)=>{ const{username,password}=req.body; const db=readDB(); const u=db.users.find(u=>u.username===username&&u.password===password); if(!u) return res.render('login',{error:'Неверный логин или пароль'}); res.redirect('/'); });
app.post('/register',(req,res)=>{
  const{username,password,confirm_password}=req.body;
  if(!username||username.length<3) return res.render('register',{error:'Никнейм минимум 3 символа'});
  if(!password||password.length<6) return res.render('register',{error:'Пароль минимум 6 символов'});
  if(password!==confirm_password)  return res.render('register',{error:'Пароли не совпадают'});
  const db=readDB();
  if(db.users.find(u=>u.username===username)) return res.render('register',{error:'Никнейм уже занят'});
  const newUser={id:db.users.length+1,username,password,balance:500,avatar:null,usedPromos:[],lastBonus:null,spinTokens:3,inventory:[]};
  db.users.push(newUser); writeDB(db);
  res.redirect('/');
});

/* ════════════════════════════════
   API
════════════════════════════════ */

/* Open case */
app.post('/api/open/:caseId',(req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  const c=db.cases.find(c=>String(c.id)===req.params.caseId);
  if(!c) return res.json({success:false,error:'Кейс не найден'});
  if(user.balance<c.price) return res.json({success:false,error:'Недостаточно средств'});

  const qty=parseInt(req.body.qty)||1;
  const totalCost=c.price*qty;
  if(user.balance<totalCost) return res.json({success:false,error:'Недостаточно средств'});

  user.balance=parseFloat((user.balance-totalCost).toFixed(2));
  const caseItems=c.items.map(id=>getItem(db,id)).filter(Boolean);

  const winners=[];
  for(let i=0;i<qty;i++){
    const roll=Math.random()*100; let cum=0;
    let winner=caseItems[caseItems.length-1];
    for(const it of caseItems){ cum+=parseFloat(it.pct||5); if(roll<=cum){winner=it;break;} }
    winners.push(winner);
    user.inventory.push(winner.id);
    db.history.unshift({id:Date.now()+i,type:'open',icon:'📦',desc:`Открыт кейс «${c.name}»`,item:`${winner.gun} | ${winner.skin}`,val:`+${fmtR(winner.price)}`,valClass:'positive',time:new Date().toLocaleTimeString('ru-RU')});
  }
  if(db.history.length>200) db.history=db.history.slice(0,200);
  writeDB(db);
  res.json({success:true,items:winners,balance:user.balance,totalCost});
});

/* Sell item */
app.post('/api/sell/:itemId',(req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  const itemId=parseInt(req.params.itemId);
  const idx=user.inventory.indexOf(itemId);
  if(idx===-1) return res.json({success:false,error:'Предмет не найден'});
  const item=getItem(db,itemId);
  if(!item) return res.json({success:false,error:'Предмет не найден'});
  const sellPrice=Math.round(item.price*0.85);
  user.inventory.splice(idx,1);
  user.balance=parseFloat((user.balance+sellPrice).toFixed(2));
  db.history.unshift({id:Date.now(),type:'sell',icon:'🛒',desc:'Предмет продан',item:`${item.gun} | ${item.skin}`,val:`+${fmtR(sellPrice)}`,valClass:'positive',time:new Date().toLocaleTimeString('ru-RU')});
  writeDB(db);
  res.json({success:true,earned:sellPrice,balance:user.balance});
});

/* Daily bonus */
app.post('/api/bonus',(req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  const now=Date.now();
  if(user.lastBonus && now-user.lastBonus<86400000) return res.json({success:false,error:'Бонус уже получен'});
  const bonus=300;
  user.balance=parseFloat((user.balance+bonus).toFixed(2));
  user.lastBonus=now;
  db.history.unshift({id:Date.now(),type:'bonus',icon:'🎁',desc:'Ежедневный бонус',item:`+${bonus}₽`,val:`+${fmtR(bonus)}`,valClass:'positive',time:new Date().toLocaleTimeString('ru-RU')});
  writeDB(db);
  res.json({success:true,bonus,balance:user.balance});
});

/* Promo code */
app.post('/api/promo',(req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  const code=(req.body.code||'').trim().toUpperCase();
  if(!code) return res.json({success:false,error:'Введите промокод'});
  if(user.usedPromos.includes(code)) return res.json({success:false,error:'Промокод уже использован'});
  const promo=db.promoCodes[code];
  if(!promo) return res.json({success:false,error:'Неверный промокод'});
  user.usedPromos.push(code);
  user.balance=parseFloat((user.balance+promo.bonus).toFixed(2));
  db.promoCodes[code].uses=(promo.uses||0)+1;
  db.history.unshift({id:Date.now(),type:'bonus',icon:'🏷️',desc:`Промокод ${code}`,item:`+${fmtR(promo.bonus)}`,val:`+${fmtR(promo.bonus)}`,valClass:'positive',time:new Date().toLocaleTimeString('ru-RU')});
  writeDB(db);
  res.json({success:true,bonus:promo.bonus,balance:user.balance});
});

/* Upgrade */
app.post('/api/upgrade',(req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  const{sourceId,targetId,multiplier}=req.body;
  const srcItem=getItem(db,parseInt(sourceId));
  if(!srcItem) return res.json({success:false,error:'Предмет не найден'});
  const srcIdx=user.inventory.indexOf(parseInt(sourceId));
  if(srcIdx===-1) return res.json({success:false,error:'Предмет не в инвентаре'});

  const mult=parseFloat(multiplier)||2;
  const targetPrice=srcItem.price*mult;
  const chance=Math.min(92,Math.max(3,(srcItem.price/targetPrice)*100));
  const won=Math.random()*100<=chance;

  user.inventory.splice(srcIdx,1);
  let resultItem=null;
  if(won){
    let tgt=targetId?getItem(db,parseInt(targetId)):null;
    if(!tgt){ const pool=db.items.filter(i=>i.price>=targetPrice*0.85&&i.price<=targetPrice*1.2); tgt=pool[Math.floor(Math.random()*pool.length)]||srcItem; }
    resultItem=tgt;
    user.inventory.push(tgt.id);
    user.balance=parseFloat((user.balance).toFixed(2));
    db.history.unshift({id:Date.now(),type:'upgrade',icon:'⚡',desc:'Апгрейд успешен',item:`${tgt.gun} | ${tgt.skin}`,val:`+${fmtR(tgt.price)}`,valClass:'positive',time:new Date().toLocaleTimeString('ru-RU')});
  } else {
    db.history.unshift({id:Date.now(),type:'upgrade',icon:'⚡',desc:'Апгрейд провален',item:`${srcItem.gun} | ${srcItem.skin}`,val:`-${fmtR(srcItem.price)}`,valClass:'negative',time:new Date().toLocaleTimeString('ru-RU')});
  }
  writeDB(db);
  res.json({success:true,won,item:resultItem,balance:user.balance,chance:chance.toFixed(2)});
});

/* Contract */
app.post('/api/contract',(req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  const ids=(req.body.ids||[]).map(Number);
  if(ids.length<3||ids.length>10) return res.json({success:false,error:'Нужно от 3 до 10 предметов'});

  const items=ids.map(id=>getItem(db,id)).filter(Boolean);
  if(items.length!==ids.length) return res.json({success:false,error:'Предметы не найдены'});

  const rarities=[...new Set(items.map(i=>i.rarity))];
  if(rarities.length>1) return res.json({success:false,error:'Все предметы должны быть одной редкости'});

  // Check all in inventory
  for(const id of ids){
    if(!user.inventory.includes(id)) return res.json({success:false,error:'Предмет не в инвентаре'});
  }

  // Remove items
  for(const id of ids){
    const i=user.inventory.indexOf(id); if(i!==-1) user.inventory.splice(i,1);
  }

  const rarityUp={common:'uncommon',uncommon:'rare',rare:'epic',epic:'legendary'};
  const nextRarity=rarityUp[rarities[0]]||'legendary';
  const avgPrice=items.reduce((s,i)=>s+i.price,0)/items.length;
  const targetPrice=avgPrice*(0.8+items.length*0.08);
  const chance=Math.min(95,30+ids.length*6);
  const won=Math.random()*100<=chance;

  let resultItem=null;
  if(won){
    const pool=db.items.filter(i=>i.rarity===nextRarity);
    resultItem=pool.length?pool[Math.floor(Math.random()*pool.length)]:db.items.find(i=>i.rarity==='legendary');
    if(resultItem) user.inventory.push(resultItem.id);
    db.history.unshift({id:Date.now(),type:'open',icon:'📋',desc:'Контракт успешен',item:resultItem?`${resultItem.gun} | ${resultItem.skin}`:'Предмет получен',val:resultItem?`+${fmtR(resultItem.price)}`:'',valClass:'positive',time:new Date().toLocaleTimeString('ru-RU')});
  } else {
    db.history.unshift({id:Date.now(),type:'open',icon:'📋',desc:'Контракт провален',item:'Предметы утрачены',val:'',valClass:'negative',time:new Date().toLocaleTimeString('ru-RU')});
  }
  writeDB(db);
  res.json({success:true,won,item:resultItem,balance:user.balance,chance:chance.toFixed(0)});
});

/* Wheel spin */
app.post('/api/spin',(req,res)=>{
  const db=readDB(); const user=getUser(db,1);
  if((user.spinTokens||0)<1) return res.json({success:false,error:'Нет жетонов вращения'});
  const PRIZES=[
    {label:'5₽',    value:5,    type:'balance', weight:30},
    {label:'10₽',   value:10,   type:'balance', weight:25},
    {label:'15₽',   value:15,   type:'balance', weight:20},
    {label:'25₽',   value:25,   type:'balance', weight:12},
    {label:'35₽',   value:35,   type:'balance', weight:8 },
    {label:'50₽',   value:50,   type:'balance', weight:3 },
    {label:'Кейс',  value:'free_case', type:'case', weight:1.5},
    {label:'100₽',  value:100,  type:'balance', weight:0.5},
  ];
  const totalW=PRIZES.reduce((s,p)=>s+p.weight,0);
  let roll=Math.random()*totalW;
  let prize=PRIZES[0];
  for(const p of PRIZES){ roll-=p.weight; if(roll<=0){prize=p;break;} }

  user.spinTokens=(user.spinTokens||0)-1;
  if(prize.type==='balance') user.balance=parseFloat((user.balance+prize.value).toFixed(2));
  if(prize.type==='case'){
    // Add random free case open (just add item from case 1)
    const c=db.cases[0]; const ci=c.items.map(id=>getItem(db,id)).filter(Boolean);
    const wi=ci[Math.floor(Math.random()*ci.length)];
    if(wi) user.inventory.push(wi.id);
  }
  db.history.unshift({id:Date.now(),type:'wheel',icon:'🎡',desc:'Колесо фортуны',item:prize.label,val:prize.type==='balance'?`+${fmtR(prize.value)}`:'Бесплатный кейс',valClass:'positive',time:new Date().toLocaleTimeString('ru-RU')});
  writeDB(db);
  res.json({success:true,prize,balance:user.balance,spinTokens:user.spinTokens,prizeIndex:PRIZES.indexOf(prize)});
});

/* Balance */
app.get('/api/balance',(req,res)=>{ const db=readDB(); const u=getUser(db,1); res.json({balance:u.balance}); });

app.use((_req,res)=>res.status(404).redirect('/'));
app.listen(PORT,()=>console.log(`\x1b[33m⚡ DropStorm → http://localhost:${PORT}\x1b[0m`));
module.exports=app;
