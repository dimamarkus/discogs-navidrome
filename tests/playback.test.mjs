import test from 'node:test';
import assert from 'node:assert/strict';
import {Playback} from '../extension/playback.mjs';
class Audio extends EventTarget{
 constructor(){super();this.currentTime=0;this.duration=40;this.paused=true;this.ended=false;this.src='';this.seekable={length:1,start:()=>0,end:()=>40};}
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
 async play(){this.paused=false;this.dispatchEvent(new Event('play'));}
 removeAttribute(){this.src='';}
 load(){this.currentTime=0;if(this.src.startsWith('blob:'))queueMicrotask(()=>{this.duration=495;this.dispatchEvent(new Event('loadedmetadata'));});}
}
function fixture(fetcher=async()=>new Response(new Blob(['audio']),{headers:{'content-type':'audio/mpeg'}})){
 const audio=new Audio(),revoked=[],status=[];let requests=0;
 const p=new Playback(audio,{fetcher:(...args)=>{requests++;return fetcher(...args);},urls:{createObjectURL:()=> 'blob:track',revokeObjectURL:url=>revoked.push(url)},onStatus:(...s)=>status.push(s)});
 p.load('https://music.example/rest/stream',495);
 return {p,audio,revoked,status,requests:()=>requests};
}
test('34 seconds of an 8:15 track uses full catalog duration despite short media estimate',()=>{
 const {p,audio}=fixture();audio.currentTime=34;
 assert.equal(p.duration,495);assert.equal(p.position,34);assert.ok(p.position/p.duration<.07);
 audio.duration=Infinity;assert.equal(p.duration,495);
});
test('unbuffered seek loads full audio, seeks to requested time and resumes; reuse for backward seek',async()=>{
 const {p,audio,requests,revoked}=fixture();await p.play();await p.seek(240);
 assert.equal(audio.currentTime,240);assert.equal(p.position,240);assert.equal(audio.paused,false);assert.equal(requests(),1);
 await p.seek(15);assert.equal(audio.currentTime,15);assert.equal(requests(),1);
 p.reset();assert.deepEqual(revoked,['blob:track']);
});
test('seeking while paused stays paused',async()=>{
 const {p,audio}=fixture();await p.seek(250);assert.equal(audio.currentTime,250);assert.equal(audio.paused,true);
});
test('native full-length range seeking does not download a duplicate file',async()=>{
 const {p,audio,requests}=fixture();audio.duration=495;audio.seekable.end=()=>495;
 await p.seek(250);assert.equal(audio.currentTime,250);assert.equal(requests(),0);
});
test('rapid seeks share a download and only the last target wins',async()=>{
 let resolve;const response=new Promise(r=>resolve=r);const {p,audio,requests}=fixture(()=>response);
 await p.play();const first=p.seek(100),last=p.seek(300);resolve(new Response('audio'));
 await Promise.all([first,last]);assert.equal(audio.currentTime,300);assert.equal(requests(),1);assert.equal(audio.paused,false);
});
test('changing tracks during a seek cancels it and cannot replace the new source',async()=>{
 let resolve,signal;const response=new Promise(r=>resolve=r);const {p,audio}=fixture((_,options)=>{signal=options.signal;return response;});
 const seek=p.seek(300);p.load('https://music.example/second',200);resolve(new Response('audio'));await seek;
 assert.equal(signal.aborted,true);assert.equal(audio.src,'https://music.example/second');assert.equal(p.duration,200);assert.equal(audio.currentTime,0);
});
test('pause during buffering is honored after seek completes',async()=>{
 let resolve;const response=new Promise(r=>resolve=r);const {p,audio}=fixture(()=>response);
 await p.play();const seek=p.seek(300);p.pause();resolve(new Response('audio'));await seek;
 assert.equal(audio.currentTime,300);assert.equal(audio.paused,true);
});
test('HTTP errors clear pending seek and report failure',async()=>{
 const {p,status}=fixture(async()=>new Response('',{status:403}));await p.seek(300);
 assert.equal(p.pending,null);assert.equal(p.desiredPlaying,false);assert.equal(status.at(-1)[1],true);
});
