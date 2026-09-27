import test from 'node:test';
import assert from 'node:assert/strict';
import {Client,normalizeCatalog,groupMatches,serverURL,releaseFromAPI} from '../extension/core.mjs';
// Real Navidrome shape: catalogNum is a first-class field, absent from tags.
const fixture={id:'track1',albumId:'album1',title:'Track 1',album:'Bedits Vol. 9',artist:'Example Artist',albumArtist:'Example Artist',trackNumber:1,catalogNum:'BDTS009',tags:{recordlabel:['BEDITS']}};
const release={id:'123',title:'Bedits Vol. 9',artist:'Example Artist',pairs:[{catalog:'BDTS-009',label:'BEDITS'}]};
test('catalog matching tolerates formatting but preserves edition suffixes',()=>{
 assert.equal(normalizeCatalog('bdts–009'),normalizeCatalog('BDTS 009'));
 assert.notEqual(normalizeCatalog('BDTS009CD'),normalizeCatalog('BDTS009LP'));
});
test('matches catalog with paired labels; ranks collisions and never asserts exact edition',()=>{
 const groups=groupMatches([fixture,{...fixture,id:'t2',albumId:'album2',tags:{recordlabel:['WRONG LABEL']}}],release);
 assert.equal(groups.length,2);assert.equal(groups[0].id,'album1');assert.equal(groups[0].labelMatch,true);assert.equal(groups[1].labelConflict,true);
 assert.ok(groups.every(g=>!g.match.includes('Exact')));
 assert.equal(groupMatches([{...fixture,catalogNum:'BDTS009CD',tags:{}}],release).length,0);
});
test('sorts multiple discs, removes duplicate song IDs, excludes missing tracks',()=>{
 const groups=groupMatches([{...fixture,id:'t3',discNumber:2,trackNumber:1},{...fixture,id:'t2',discNumber:1,trackNumber:2},fixture,fixture,{...fixture,id:'missing',missing:true}],release);
 assert.deepEqual(groups[0].tracks.map(t=>t.id),['track1','t2','t3']);
});
test('server input cannot include credentials or an unrelated protocol',()=>{
 assert.equal(serverURL('https://example.com/music/app/#/album/123/show'),'https://example.com/music');
 assert.throws(()=>serverURL('javascript:alert(1)'));assert.throws(()=>serverURL('https://me:pass@example.com'));
});
test('release maps all label/catalog pairs and excludes generic catnos',()=>{
 const r=releaseFromAPI({id:123,title:'Record',labels:[{name:'A',catno:'ABC001'},{name:'B',catno:'None'}]});
 assert.deepEqual(r.pairs,[{label:'A',catalog:'ABC001'}]);
});
function memory(){const data={};return {data,async get(keys){return Object.fromEntries(keys.map(k=>[k,data[k]]));},async set(v){Object.assign(data,v);},async remove(keys){for(const k of keys)delete data[k];}};}
test('login discards password; catalog field matching and streams use separate credentials',async()=>{
 const storage=memory(),requests=[];
 const fetcher=async(url,options)=>{
  const u=new URL(url);requests.push({u,options});
  const headers={'Content-Type':'application/json'};let data;
  if(u.pathname==='/auth/login')data={username:'dima',token:'JWT',subsonicToken:'TOKEN',subsonicSalt:'SALT'};
  else if(u.pathname==='/api/song'){assert.ok(u.searchParams.has('catalog_num'));assert.ok(!u.searchParams.has('catalognumber'));assert.equal(options.headers['X-ND-Authorization'],'Bearer JWT');data=u.searchParams.get('catalog_num')==='BDTS009'?[fixture]:[];}
  else throw Error('Unexpected URL');
  return new Response(JSON.stringify(data),{status:200,headers});
 };
 const c=new Client(storage,fetcher);await c.login('https://example.com','dima','private-password');
 assert.ok(!JSON.stringify(storage.data).includes('private-password'));
 const result=await c.lookup(release);assert.equal(result.groups.length,1);
 await c.lookup(release);assert.equal(requests.filter(r=>r.u.pathname==='/api/tag').length,0);
 const media=new URL(await c.media('track1'));assert.equal(media.searchParams.get('t'),'TOKEN');assert.equal(media.searchParams.get('format'),'mp3');assert.ok(!media.href.includes('JWT'));
});
test('prefix results or ignored filters cannot silently match another catalog or edition',async()=>{
 const storage=memory();await storage.set({auth:{server:'https://example.com',token:'JWT'}});
 const c=new Client(storage,async()=>new Response(JSON.stringify([{...fixture,catalogNum:'BDTS009CD'},{...fixture,id:'unrelated',catalogNum:'ABC999'}]),{headers:{'Content-Type':'application/json'}}));
 const r=await c.lookup(release);assert.equal(r.groups.length,0);assert.ok(r.diagnostics.candidates>0);
});
test('YOIONWAX003 is found with an empty old generic catalog index',async()=>{
 const storage=memory();await storage.set({auth:{server:'https://example.com',token:'JWT'},catalogIndex:{server:'https://example.com',time:Date.now(),rows:[]}});
 const tracks=['Space Funk','Dem Funk','Cuarzo','Space Trip'].map((title,i)=>({...fixture,id:'yoi'+i,title,trackNumber:i+1,album:'YOIONWAX003',albumArtist:'YOI',catalogNum:'YOIONWAX003',tags:{label:['YOI']}}));
 const c=new Client(storage,async(url)=>{const u=new URL(url);assert.equal(u.pathname,'/api/song');assert.equal(u.searchParams.get('catalog_num'),'YOIONWAX003');return new Response(JSON.stringify(tracks));});
 const r=await c.lookup({id:'123',title:'YOIONWAX003',artist:'Various',pairs:[{catalog:'YOIONWAX003',label:'YOI (良い)'}]});
 assert.equal(r.groups.length,1);assert.equal(r.groups[0].tracks.length,4);assert.equal(r.diagnostics.matchedTracks,4);
});
test('formatting fallback retrieves separated catalog values and validates them',async()=>{
 const storage=memory();await storage.set({auth:{server:'https://example.com',token:'JWT'}});const seen=[];
 const c=new Client(storage,async url=>{const value=new URL(url).searchParams.get('catalog_num');seen.push(value);return new Response(JSON.stringify(value.includes('%')?[{...fixture,catalogNum:'BDTS - 009'}]:[]));});
 const r=await c.lookup(release);assert.equal(r.groups.length,1);assert.deepEqual(seen,['BDTS-009','BDTS009','B%D%T%S%0%0%9']);
});
test('missing imported catalog metadata is reported without guessing from album title',async()=>{
 const storage=memory();await storage.set({auth:{server:'https://example.com',token:'JWT'}});
 const c=new Client(storage,async()=>new Response(JSON.stringify([{...fixture,catalogNum:undefined}])));
 const r=await c.lookup(release);assert.equal(r.groups.length,0);assert.match(r.reason,/imported catalog field/);
});
test('401 and HTML proxy responses produce actionable errors',async()=>{
 const storage=memory();let c=new Client(storage,async()=>new Response('',{status:401}));await assert.rejects(c.json('https://example.com'),/Sign in again/);
 c=new Client(storage,async()=>new Response('<html>Login</html>'));await assert.rejects(c.json('https://example.com'),/web page instead/);
});
test('browser fetch receives globalThis rather than the Client instance',async()=>{
 const storage=memory();let calls=0;
 function browserFetch(url,options){
  if(this!==globalThis)throw new TypeError('Illegal invocation');
  calls++;assert.equal(url,'https://example.com/auth/login');assert.equal(options.method,'POST');
  return Promise.resolve(new Response(JSON.stringify({username:'test',token:'JWT',subsonicToken:'TOKEN',subsonicSalt:'SALT'}),{headers:{'Content-Type':'application/json'}}));
 }
 // Demonstrate the exact failure the previous method-style invocation caused.
 const oldCall={fetcher:browserFetch};assert.throws(()=>oldCall.fetcher('https://example.com/auth/login',{}),/Illegal invocation/);
 const client=new Client(storage,browserFetch);await client.login('https://example.com','test','test-password');
 assert.equal(calls,1);assert.equal(storage.data.auth.username,'test');
});
test('login distinguishes rejected credentials from request setup and timeouts',async()=>{
 const storage=memory();let c=new Client(storage,async()=>new Response('',{status:401}));
 await assert.rejects(c.login('https://example.com','test','test'),/rejected the username or password/);
 c=new Client(storage,async()=>{throw new DOMException('timed out','TimeoutError');});
 await assert.rejects(c.json('https://example.com'),/25 seconds/);
 c=new Client(storage,async()=>{throw new TypeError('Illegal invocation');});
 await assert.rejects(c.json('https://example.com'),/initialization failed/);
});
