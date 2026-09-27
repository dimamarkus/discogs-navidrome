import test from 'node:test';
import assert from 'node:assert/strict';
import {createStorage} from '../extension/storage.mjs';
import {serverURL,DEFAULT_SERVER} from '../extension/core.mjs';
function area(initial={}){let data=structuredClone(initial);return {async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(data[k])]));},async set(v){Object.assign(data,structuredClone(v));},async remove(keys){for(const k of Array.isArray(keys)?keys:[keys])delete data[k];},async clear(){data={};},snapshot:()=>structuredClone(data)};}
test('public build has no default server and only permits HTTPS',()=>{
 assert.equal(DEFAULT_SERVER,'');assert.throws(()=>serverURL(''));assert.throws(()=>serverURL('http://localhost:4533'));assert.throws(()=>serverURL('http://music.example.com'));
 assert.equal(serverURL('https://music.example.com/music/app/'),'https://music.example.com/music');
});
test('auth and Discogs tokens are session-only; preferences survive restart',async()=>{
 const local=area(),session=area(),store=createStorage(local,session);
 await store.set({auth:{server:'https://music.example.com',username:'user',token:'SECRET'},prefs:{quality:'original',discogsToken:'DISCOGS-SECRET'}});
 assert.ok(!JSON.stringify(local.snapshot()).includes('SECRET'));
 assert.equal((await store.get(['auth','prefs'])).auth.token,'SECRET');
 await session.clear();const fresh=createStorage(local,session);const result=await fresh.get(['auth','prefs']);
 assert.equal(result.auth,undefined);assert.equal(result.prefs.quality,'original');assert.equal(result.prefs.discogsToken,'');
});
test('upgrade moves old persistent secrets to memory and erases local copies',async()=>{
 const local=area({auth:{server:'https://music.example.com',username:'user',token:'OLD-SECRET'},prefs:{quality:'mp3',discogsToken:'OLD-DISCOGS'}}),session=area();
 const store=createStorage(local,session);await store.ready;
 assert.ok(!JSON.stringify(local.snapshot()).includes('OLD-'));assert.equal(session.snapshot().auth.token,'OLD-SECRET');assert.equal(local.snapshot().connection.username,'user');
});
test('logout removes both session secrets and persistent settings',async()=>{
 const local=area({manualMatches:{123:'album'}}),session=area(),store=createStorage(local,session);
 await store.set({auth:{server:'https://music.example.com',username:'user',token:'SECRET'}});await store.clear();
 assert.deepEqual(local.snapshot(),{});assert.deepEqual(session.snapshot(),{});
});
