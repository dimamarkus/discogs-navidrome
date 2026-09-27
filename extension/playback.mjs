// Keep the song timeline independent of a progressive stream's estimated duration.
export class Playback {
 constructor(audio,{fetcher=globalThis.fetch,urls=URL,onChange=()=>{},onStatus=()=>{}}={}){
  Object.assign(this,{audio,fetcher,urls,onChange,onStatus});this.generation=0;this.revision=0;this.total=0;this.pending=null;this.desiredPlaying=false;
  for(const event of ['timeupdate','durationchange','loadedmetadata','seeked','play','pause','ended'])audio.addEventListener(event,()=>onChange());
 }
 get duration(){return this.total>0?this.total:Number.isFinite(this.audio.duration)?this.audio.duration:0;}
 get position(){return Math.min(this.duration,Math.max(0,this.pending??this.audio.currentTime??0));}
 reset(){
  ++this.generation;++this.revision;this.abort?.abort();this.abort=new AbortController();
  this.desiredPlaying=false;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();
  if(this.objectURL)this.urls.revokeObjectURL(this.objectURL);
  this.objectURL=null;this.preparing=null;this.source='';this.total=0;this.pending=null;this.onChange();
 }
 load(source,total){this.reset();this.source=source;this.total=Number(total)||0;this.audio.src=source;this.onChange();}
 async play(){
  const generation=this.generation;this.desiredPlaying=true;this.onChange();
  try{if(!this.preparing)await this.audio.play();}
  catch(error){if(generation===this.generation){this.desiredPlaying=false;this.onChange();}throw error;}
 }
 pause(){this.desiredPlaying=false;this.audio.pause();this.onChange();}
 async toggle(){if(this.desiredPlaying&&!this.audio.ended)this.pause();else {if(this.audio.ended)this.audio.currentTime=0;await this.play();}}
 canSeek(target){
  if(this.objectURL)return true;
  // A growing MP3 often reports only the duration downloaded so far.
  if(!Number.isFinite(this.audio.duration)||Math.abs(this.audio.duration-this.duration)>2)return false;
  const ranges=this.audio.seekable;
  for(let i=0;i<ranges.length;i++)if(target>=ranges.start(i)&&target<=ranges.end(i))return true;
  return false;
 }
 async prepareLocal(){
  if(this.preparing)return this.preparing;
  const generation=this.generation,signal=this.abort.signal;
  this.preparing=(async()=>{
   // If HTTP seeking is unavailable, finish this one track before seeking. This
   // avoids relying on timeOffset, which raw streams may silently ignore.
   const response=await this.fetcher.call(globalThis,this.source,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok)throw new Error('Could not buffer the track for seeking.');
   if(/(?:xml|json|text\/html)/i.test(response.headers.get('content-type')||''))throw new Error('The server did not return audio. Reconnect in Settings.');
   const blob=await response.blob();
   if(generation!==this.generation||signal.aborted)return;
   const url=this.urls.createObjectURL(blob);this.objectURL=url;
   await new Promise((resolve,reject)=>{
    const done=error=>{clearTimeout(timer);this.audio.removeEventListener('loadedmetadata',ready);this.audio.removeEventListener('error',failed);signal.removeEventListener('abort',cancel);error?reject(error):resolve();};
    const ready=()=>done(),failed=()=>done(new Error('Could not decode the buffered audio. Try MP3 quality in Settings.')),cancel=()=>done(new DOMException('Cancelled','AbortError'));
    const timer=setTimeout(()=>done(new Error('Timed out loading buffered audio.')),30000);
    this.audio.addEventListener('loadedmetadata',ready,{once:true});this.audio.addEventListener('error',failed,{once:true});signal.addEventListener('abort',cancel,{once:true});
    this.audio.src=url;this.audio.load();
   });
  })();
  try{await this.preparing;}
  catch(error){
   if(generation===this.generation&&this.objectURL){this.urls.revokeObjectURL(this.objectURL);this.objectURL=null;this.audio.src=this.source;this.audio.load();}
   throw error;
  }finally{if(generation===this.generation)this.preparing=null;}
 }
 async seek(value){
  if(!this.source||this.duration<=0)return;
  const target=Math.max(0,Math.min(Number(value)||0,Math.max(0,this.duration-.05)));
  const generation=this.generation,revision=++this.revision;
  this.pending=target;this.audio.pause();this.onChange();
  try{
   if(this.preparing||!this.canSeek(target)){
    this.onStatus('Buffering this track for accurate seeking…');await this.prepareLocal();
   }
   if(generation!==this.generation||revision!==this.revision)return;
   this.audio.currentTime=target;this.pending=null;this.onStatus('');this.onChange();
   if(this.desiredPlaying)await this.audio.play();
  }catch(error){
   if(generation!==this.generation||revision!==this.revision)return;
   this.pending=null;this.desiredPlaying=false;this.onStatus(error.message||'Could not seek in this track.',true);this.onChange();
  }
 }
}
