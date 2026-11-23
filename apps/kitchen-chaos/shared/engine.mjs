// Kitchen Chaos Lab: dependency-free, deterministic local cooking rules.
// Inspired by the cooperative cooking genre; no third-party game assets or code.
export const WIDTH = 16;
export const HEIGHT = 11;
export const TICK = 0.05;
export const RECIPES = Object.freeze({
  salad: { id: 'salad', name: '双蔬沙拉', icon: '🥗', base: 100, limit: 50, needs: ['lettuce', 'tomato'] },
  soup: { id: 'soup', name: '蘑菇汤', icon: '🍲', base: 140, limit: 70, needs: ['mushroom', 'onion'] },
});
export const INGREDIENTS = Object.freeze({
  lettuce: { name: '生菜', icon: '🥬' },
  tomato: { name: '番茄', icon: '🍅' },
  mushroom: { name: '蘑菇', icon: '🍄' },
  onion: { name: '洋葱', icon: '🧅' },
});
export const STATION_CONFIG = Object.freeze([
  ['lettuce','crate',2,1,'lettuce'], ['tomato','crate',5,1,'tomato'],
  ['mushroom','crate',8,1,'mushroom'], ['onion','crate',11,1,'onion'],
  ['plates','plates',13,1],
  ['board1','board',3,3], ['board2','board',7,3],
  ['stove1','stove',11,3], ['stove2','stove',13,3],
  ['counter1','counter',2,5], ['assemble','assembly',5,5],
  ['counter2','counter',8,5], ['pass','pass',11,5],
  ['serve','serve',13,5], ['trash','trash',3,8],
]);
const directions = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
export const stationAt = (state,x,y) => state.stations.find(p=>p.x===x&&p.y===y) ?? null;
export const walkable = (state,x,y) =>
  x>=1 && x<WIDTH-1 && y>=1 && y<HEIGHT-1 && !stationAt(state,x,y);
function rand(state) { state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0; return state.seed/4294967296; }
function notify(state,text){state.message=text;state.messageTime=3.3;state.events.push(text);if(state.events.length>12)state.events.shift();}
function nextOrder(state,recipeId){
  const recipe=RECIPES[recipeId];
  state.orders.push({id:++state.orderSequence,recipeId,remaining:recipe.limit,limit:recipe.limit});
}
export function createKitchen({seed=20261123,duration=150,coop=true}={}){
  const state={
    phase:'ready',seed:seed>>>0,duration,remaining:duration,elapsed:0,spawnClock:0,
    score:0,combo:0,delivered:0,expired:0,mistakes:0,waste:0,
    orderSequence:0,events:[],message:'点击开始，接单做菜！',messageTime:5,
    coop,players:[
      {id:'p1',x:4,y:4,face:'up',held:null,walkDelay:0,distance:0},
      {id:'p2',x:9,y:4,face:'up',held:null,walkDelay:0,distance:0},
    ],
    stations:STATION_CONFIG.map(([id,type,x,y,ingredient])=>({id,type,x,y,ingredient,slot:null,progress:0})),
    orders:[],
  };
  nextOrder(state,'salad');
  nextOrder(state,'soup');
  return state;
}
export function startKitchen(state){if(state.phase==='ready'||state.phase==='paused')state.phase='running';return state;}
export function togglePause(state){if(state.phase==='running')state.phase='paused';else if(state.phase==='paused')state.phase='running';return state;}
export function stationFacing(state,player) {
  const [dx,dy]=directions[player.face];
  return stationAt(state,player.x+dx,player.y+dy);
}
function canTake(player,station,state){
  if(station.slot && !player.held){
    player.held=station.slot;station.slot=null;station.progress=0;
    notify(state,'拾取 '+itemName(player.held));return true;
  }
  return false;
}
export function itemName(item) {
  if(!item)return '空手';
  if(item.kind==='plate')return '空盘';
  if(item.kind==='dish')return RECIPES[item.recipeId].name;
  if(item.kind==='soup')return '煮好的汤';
  if(item.kind==='pot')return '炖煮中的食材';
  return (INGREDIENTS[item.kind]?.name??item.kind)+(item.stage==='chopped'?'（已切）':'');
}
function interact(state,player){
  const station=stationFacing(state,player);
  if(!station){notify(state,'面向工作台，靠近一格操作');return;}
  let item=player.held;
  if(station.type==='crate'){
    if(!item){player.held={kind:station.ingredient,stage:'raw'};notify(state,'取得 '+itemName(player.held));}
    else notify(state,'双手已满，先放下食材');
    return;
  }
  if(station.type==='plates'){
    if(!item){player.held={kind:'plate',ingredients:[]};notify(state,'拿到干净餐盘');}
    else notify(state,'先放下手里的东西');
    return;
  }
  if(station.type==='trash'){
    if(item){notify(state,'丢弃 '+itemName(item));player.held=null;state.waste++;}
    else notify(state,'拿着不要的物品再来');
    return;
  }
  if(station.type==='serve'){
    if(item?.kind!=='dish'){notify(state,'必须拿着完成的料理才能上菜');return;}
    const order=state.orders.find(o=>o.recipeId===item.recipeId);
    if(!order){state.score-=10;state.mistakes++;state.combo=0;notify(state,'当前没有这道菜的订单 -10');return;}
    const recipe=RECIPES[item.recipeId];
    const bonus=Math.floor(40*Math.max(0,order.remaining)/order.limit);
    state.combo++;const points=recipe.base+bonus+10*Math.min(3,state.combo);
    state.score+=points;state.delivered++;state.orders=state.orders.filter(o=>o.id!==order.id);
    player.held=null;notify(state,'上菜成功！ +'+points+' 分');
    return;
  }
  if(station.type==='counter'||station.type==='pass'){
    if(canTake(player,station,state))return;
    if(item&&!station.slot){station.slot=item;player.held=null;notify(state,'放在'+(station.type==='pass'?'传菜台':'台面'));return;}
    notify(state,'台面已占用，腾出空手才能取物');return;
  }
  if(station.type==='board'){
    if(canTake(player,station,state))return;
    if(item&&!station.slot&&INGREDIENTS[item.kind]&&item.stage==='raw'){
      station.slot=item;station.progress=0;player.held=null;notify(state,'放好食材，按住切菜键 2 秒');return;
    }
    notify(state,station.slot?'按住切菜键加工；空手可取走':'只能放入未处理的食材');return;
  }
  if(station.type==='stove'){
    if(station.slot?.kind==='soup'&&station.slot.stage==='cooked'&&!item){return void canTake(player,station,state);}
    if(station.slot?.kind==='soup'&&station.slot.stage==='burnt'&&!item){
      station.slot=null;station.progress=0;state.waste++;notify(state,'焦糊汤已清理');return;
    }
    if(item?.stage==='chopped'&&['mushroom','onion'].includes(item.kind)){
      if(!station.slot){station.slot={kind:'pot',ingredients:[item.kind]};station.progress=0;player.held=null;notify(state,'加入锅中：'+itemName(item));return;}
      if(station.slot.kind==='pot'&&!station.slot.ingredients.includes(item.kind)){
        station.slot.ingredients.push(item.kind);player.held=null;station.progress=0;notify(state,'材料齐了，开始炖汤！');return;
      }
    }
    notify(state,'汤需要已切好的蘑菇和洋葱');return;
  }
  if(station.type==='assembly'){
    if(!station.slot){
      if(item?.kind==='plate'){station.slot=item;player.held=null;notify(state,'放上餐盘，加入食材');}
      else notify(state,'先放一个空盘到装盘台');
      return;
    }
    if(item&&station.slot.kind==='plate'){
      const plate=station.slot;
      if(item.kind==='soup'&&item.stage==='cooked'&&plate.ingredients.length===0){
        station.slot={kind:'dish',recipeId:'soup'};player.held=null;notify(state,'蘑菇汤装盘完成！');return;
      }
      if(item.stage==='chopped'&&['lettuce','tomato'].includes(item.kind)&&!plate.ingredients.includes(item.kind)){
        plate.ingredients.push(item.kind);player.held=null;
        if(plate.ingredients.includes('lettuce')&&plate.ingredients.includes('tomato')){
          station.slot={kind:'dish',recipeId:'salad'};notify(state,'双蔬沙拉装盘完成！');
        } else notify(state,'已加 '+itemName(item)+'，还需另一种蔬菜');
        return;
      }
    }
    if(!item){canTake(player,station,state);return;}
    notify(state,'配方不匹配，检查菜谱');return;
  }
}
export function stepKitchen(state,inputs=[],dt=TICK){
  if(state.phase!=='running')return state;
  const delta=Math.min(0.1,Math.max(0,Number(dt)||0));
  for(const player of state.players){
    if(player.id==='p2'&&!state.coop)continue;
    const input=inputs.find(i=>i.playerId===player.id)||{};
    player.walkDelay=Math.max(0,player.walkDelay-delta);
    let dx=Math.sign(input.dx||0),dy=Math.sign(input.dy||0);
    if(dx&&dy)dy=0;
    if(dx||dy){
      player.face=dx>0?'right':dx<0?'left':dy>0?'down':'up';
      if(player.walkDelay<=0){
        const nx=player.x+dx,ny=player.y+dy;
        const occupied=state.players.some(other=>other!==player&&(other.id!=='p2'||state.coop)&&other.x===nx&&other.y===ny);
        if(walkable(state,nx,ny)&&!occupied){player.x=nx;player.y=ny;player.distance++;player.walkDelay=0.165;}
      }
    }
    if(input.interact)interact(state,player);
    if(input.work){
      const st=stationFacing(state,player);
      if(st?.type==='board'&&st.slot?.stage==='raw'){
        st.progress=Math.min(2,st.progress+delta);
        if(st.progress>=2){st.slot.stage='chopped';notify(state,'切菜完成！按交互键取走');}
      }
    }
  }
  for(const st of state.stations){
    if(st.type!=='stove'||!st.slot)continue;
    if(st.slot.kind==='pot'&&st.slot.ingredients.length===2){
      st.progress+=delta;
      if(st.progress>=6){st.slot={kind:'soup',stage:'cooked'};st.progress=0;notify(state,'汤煮好啦！尽快取锅');}
    }else if(st.slot.kind==='soup'&&st.slot.stage==='cooked'){
      st.progress+=delta;
      if(st.progress>=8){st.slot.stage='burnt';st.progress=0;notify(state,'汤烧焦了！请清理灶台');}
    }
  }
  state.elapsed+=delta;state.remaining=Math.max(0,state.duration-state.elapsed);
  state.spawnClock+=delta;
  for(const order of [...state.orders]){
    order.remaining-=delta;
    if(order.remaining<=0){
      state.orders=state.orders.filter(o=>o.id!==order.id);
      state.score-=20;state.expired++;state.combo=0;notify(state,'订单超时 -20 分');
    }
  }
  if(state.spawnClock>=22){
    state.spawnClock-=22;
    if(state.orders.length<3)nextOrder(state,rand(state)<0.52?'salad':'soup');
  }
  state.messageTime=Math.max(0,state.messageTime-delta);
  if(state.remaining<=0){state.phase='finished';notify(state,'营业结束，查看战绩！');}
  return state;
}
export function availableStationTiles(state){
  return state.stations.map(st=>({id:st.id,x:st.x,y:st.y,neighbors:Object.values(directions).map(([dx,dy])=>[st.x+dx,st.y+dy]).filter(([x,y])=>walkable(state,x,y))}));
}
