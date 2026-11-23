import test from 'node:test';
import assert from 'node:assert/strict';
import {createKitchen,startKitchen,stepKitchen,stationAt,walkable,availableStationTiles,RECIPES} from '../apps/kitchen-chaos/shared/engine.mjs';

function fresh(coop=true){const game=createKitchen({seed:20261123,coop});startKitchen(game);return game;}
function station(game,id){const st=game.stations.find(s=>s.id===id);assert.ok(st,'missing station '+id);return st;}
function face(game,x,y,dir='up'){const p=game.players[0];p.x=x;p.y=y;p.face=dir;return p;}
function interact(game){stepKitchen(game,[{playerId:'p1',interact:true}]);}
function tick(game,seconds,inputs=[]){for(let i=0;i<Math.ceil(seconds/.05);i++)stepKitchen(game,inputs,.05);}

test('starts with two timed recipes, two chefs, and valid work stations',()=>{
 const game=createKitchen();
 assert.equal(game.phase,'ready');
 assert.deepEqual(game.orders.map(o=>o.recipeId),['salad','soup']);
 assert.equal(game.players.length,2);
 assert.equal(game.stations.length,15);
 assert.equal(game.remaining,150);
});
test('ingredient crates supply items, board requires 2 seconds to chop',()=>{
 const game=fresh(false);
 face(game,2,2,'up');interact(game);
 assert.equal(game.players[0].held.kind,'lettuce');
 face(game,3,4,'up');interact(game);
 assert.equal(game.players[0].held,null);
 assert.equal(station(game,'board1').slot.stage,'raw');
 tick(game,1,[{playerId:'p1',work:true}]);
 assert.equal(station(game,'board1').slot.stage,'raw');
 tick(game,1.1,[{playerId:'p1',work:true}]);
 assert.equal(station(game,'board1').slot.stage,'chopped');
 interact(game);
 assert.equal(game.players[0].held.stage,'chopped');
 assert.equal(station(game,'board1').slot,null);
});
test('salad has two distinct chopped vegetables and a plate, then scores on delivery',()=>{
 const game=fresh(false);
 const p=face(game,13,2,'up');
 interact(game);assert.equal(p.held.kind,'plate');
 face(game,5,4,'down');interact(game);assert.equal(station(game,'assemble').slot.kind,'plate');
 p.held={kind:'lettuce',stage:'chopped'};interact(game);
 assert.deepEqual(station(game,'assemble').slot.ingredients,['lettuce']);
 p.held={kind:'tomato',stage:'chopped'};interact(game);
 assert.equal(station(game,'assemble').slot.recipeId,'salad');
 interact(game);assert.equal(p.held.kind,'dish');
 face(game,13,4,'down');interact(game);
 assert.equal(p.held,null);
 assert.equal(game.delivered,1);
 assert.ok(game.score>=RECIPES.salad.base);
 assert.equal(game.orders.filter(o=>o.recipeId==='salad').length,0);
});
test('stew only cooks when both chopped inputs are supplied and can burn',()=>{
 const game=fresh(false);const p=face(game,11,4,'up');
 p.held={kind:'mushroom',stage:'chopped'};interact(game);
 assert.equal(station(game,'stove1').slot.kind,'pot');
 tick(game,7);
 assert.equal(station(game,'stove1').slot.kind,'pot','cannot cook one ingredient');
 p.held={kind:'onion',stage:'chopped'};interact(game);
 tick(game,6.2);
 assert.equal(station(game,'stove1').slot.kind,'soup');
 assert.equal(station(game,'stove1').slot.stage,'cooked');
 tick(game,8.2);
 assert.equal(station(game,'stove1').slot.stage,'burnt');
 interact(game);
 assert.equal(station(game,'stove1').slot,null);
 assert.equal(game.waste,1);
});
test('a completed soup can be plated and delivered',()=>{
 const game=fresh(false);
 const p=face(game,5,4,'down');
 p.held={kind:'plate',ingredients:[]};interact(game);
 p.held={kind:'soup',stage:'cooked'};interact(game);
 assert.equal(station(game,'assemble').slot.recipeId,'soup');
 interact(game);
 face(game,13,4,'down');interact(game);
 assert.equal(game.delivered,1);
 assert.equal(game.orders.some(o=>o.recipeId==='soup'),false);
});
test('two players cannot duplicate an item in the same counter',()=>{
 const game=fresh(true),counter=station(game,'counter1');
 counter.slot={kind:'lettuce',stage:'chopped'};
 Object.assign(game.players[0],{x:2,y:4,face:'down'});
 Object.assign(game.players[1],{x:2,y:6,face:'up'});
 stepKitchen(game,[{playerId:'p1',interact:true},{playerId:'p2',interact:true}]);
 assert.equal(game.players.filter(p=>p.held?.kind==='lettuce').length,1);
 assert.equal(counter.slot,null);
});
test('incorrect delivery costs ten, preserves the plate, and never consumes a ticket',()=>{
 const game=fresh(false),p=face(game,13,4,'down');
 p.held={kind:'dish',recipeId:'salad'};game.orders=game.orders.filter(o=>o.recipeId!=='salad');
 const count=game.orders.length;interact(game);
 assert.equal(game.score,-10);assert.equal(game.mistakes,1);
 assert.equal(game.orders.length,count);assert.equal(p.held.kind,'dish');
});
test('expired ticket is deducted once and game ends exactly once',()=>{
 const game=fresh();
 game.orders[0].remaining=.02;
 stepKitchen(game,[],.05);assert.equal(game.score,-20);assert.equal(game.expired,1);
 stepKitchen(game,[],.05);assert.equal(game.score,-20);
 game.duration=.2;tick(game,.25);
 assert.equal(game.phase,'finished');
 const score=game.score;
 tick(game,20);assert.equal(game.score,score);
});
test('all stations have reachable neighbor floor cells',()=>{
 const game=createKitchen();
 const frontier=[[game.players[0].x,game.players[0].y]];
 const seen=new Set(frontier.map(([x,y])=>x+','+y));
 for(let i=0;i<frontier.length;i++){
  const [x,y]=frontier[i];
  for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
   const a=x+dx,b=y+dy,k=a+','+b;
   if(walkable(game,a,b)&&!seen.has(k)){seen.add(k);frontier.push([a,b]);}
  }
 }
 for(const st of availableStationTiles(game)){
  assert.ok(st.neighbors.length>0,st.id+' has no adjacency');
  assert.ok(st.neighbors.some(([x,y])=>seen.has(x+','+y)),st.id+' inaccessible');
 }
 assert.equal(stationAt(game,5,5).type,'assembly');
});
test('fixed seed and identical input stream have identical simulation state',()=>{
 const a=fresh(),b=fresh();
 const moves=[{playerId:'p1',dx:1,dy:0},{playerId:'p2',dx:-1,dy:0}];
 for(let i=0;i<700;i++){stepKitchen(a,moves);stepKitchen(b,moves);}
 assert.deepEqual(a,b);
});
