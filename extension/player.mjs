import {send,$,message,albumID} from './shared.mjs';
import {duration} from './core.mjs';
import {Playback} from './playback.mjs';
const params=new URLSearchParams(location.search);const releaseId=params.get('release');const initialAlbum=params.get('album');
let groups=[],selected=null,trackIndex=-1,server='',loadVersion=0,playVersion=0;
const audio=$('audio');
let dragging=false;
const playback=new Playback(audio,{onChange:updateTimeline,onStatus:message});
function updateTimeline(){
 const total=playback.duration,position=playback.position;
 $('seek').max=String(total||1);$('seek').disabled=!playback.source||!total;
 if(!dragging){$('seek').value=String(position);$('elapsed').textContent=duration(position);}
 $('total').textContent=duration(total);$('seek').setAttribute('aria-valuetext',`${duration(dragging?Number($('seek').value):position)} of ${duration(total)}`);
 const playing=playback.desiredPlaying&&!audio.ended;
 $('transport-play').textContent=playing?'Ⅱ':'▶';$('transport-play').setAttribute('aria-label',playing?'Pause':'Play');
}
async function togglePlayback(){if(trackIndex<0)return play(0);try{await playback.toggle();}catch{message('Press Play to start playback.',true);}}
$('transport-play').onclick=togglePlayback;
$('seek').oninput=()=>{dragging=true;$('elapsed').textContent=duration(Number($('seek').value));$('seek').setAttribute('aria-valuetext',`${duration(Number($('seek').value))} of ${duration(playback.duration)}`);};
$('seek').onchange=()=>{const target=Number($('seek').value);dragging=false;playback.seek(target);};
$('seek').addEventListener('pointercancel',()=>{dragging=false;updateTimeline();});
$('volume').oninput=()=>{audio.volume=Number($('volume').value);};
let viewState='loading',collapseChoice=null,collapsed=true,sizeScheduled=false;
const collapseKey=`playerCollapsed:${releaseId||initialAlbum||'search'}`;
const parentOrigin=params.get('parent');
function resize(){
 if(sizeScheduled)return;sizeScheduled=true;
 requestAnimationFrame(()=>{sizeScheduled=false;if(parent===window||!['https://www.discogs.com','https://discogs.com'].includes(parentOrigin))return;
  parent.postMessage({type:'discogs-library-size',releaseId,height:Math.ceil($('player').getBoundingClientRect().height)+2},parentOrigin);
 });
}
function summary(){
 const playing=selected&&trackIndex>=0&&!audio.paused;
 const text=playing?`Playing · ${selected.tracks[trackIndex]?.title||''}`:viewState==='matched'?`${selected?.tracks.length||0} tracks · ${selected?.catalogs?.join(', ')||'In your library'}`:viewState==='empty'?'No match · expand to search':viewState==='error'?'Connection issue · expand for details':viewState==='search'?'Search your collection':'Finding this release…';
 $('summary').textContent=text;$('summary').title=text;
 $('mini-play').hidden=!selected?.tracks.length;
 $('mini-play').textContent=playing?'Ⅱ':'▶';
 const label=playing?'Pause':trackIndex>=0?'Resume playback':'Play album';$('mini-play').title=label;$('mini-play').setAttribute('aria-label',label);
 resize();
}
function setCollapsed(value){
 collapsed=value;$('player-body').hidden=value;$('player').classList.toggle('collapsed',value);
 $('toggle').setAttribute('aria-expanded',String(!value));$('toggle').title=value?'Expand your library player':'Collapse your library player';$('chevron').textContent=value?'⌄':'⌃';resize();
}
function setViewState(state){
 viewState=state;$('player').classList.toggle('has-match',state==='matched');
 setCollapsed(collapseChoice===null ? !!releaseId&&['loading','empty','error'].includes(state) : collapseChoice);summary();
}
$('toggle').onclick=()=>{collapseChoice=!collapsed;setCollapsed(collapseChoice);chrome.storage.local.set({[collapseKey]:collapseChoice}).catch(()=>{});};
$('mini-play').onclick=togglePlayback;
new ResizeObserver(resize).observe($('player'));
function stop(){playVersion++;playback.reset();dragging=false;trackIndex=-1;$('now-playing').textContent='Choose a track to start listening.';summary();}
async function choose(index){
 stop();selected=groups[index];if(!selected)return;
 $('album-title').textContent=selected.title;$('album-artist').textContent=selected.artist;
 $('match-badge').textContent=selected.match;$('match-badge').classList.toggle('warn',!!selected.labelConflict);
 $('open-album').href=`${server}/app/#/album/${encodeURIComponent(selected.id)}/show`;
 $('remember').hidden=!releaseId;$('cover').hidden=true;
 const coverFor=selected;
 if(selected.tracks[0]?.id){send('MEDIA',{id:selected.tracks[0].id,kind:'getCoverArt'}).then(src=>{if(selected===coverFor){$('cover').src=src;$('cover').hidden=false;}}).catch(()=>{});}
 $('tracks').replaceChildren();
 selected.tracks.forEach((track,i)=>{
  const row=document.createElement('li');row.className='track';row.dataset.index=String(i);
  const button=document.createElement('button');button.textContent='▶';button.setAttribute('aria-label',`Play ${track.title}`);button.onclick=()=>play(i);
  const title=document.createElement('div');title.className='track-title';title.textContent=track.title;
  const info=document.createElement('small');info.textContent=[track.artist,(track.suffix||'').toUpperCase(),track.bitDepth?`${track.bitDepth}-bit`:''].filter(Boolean).join(' · ');title.append(info);
  const time=document.createElement('span');time.className='time';time.textContent=duration(track.duration);
  row.append(button,title,time);$('tracks').append(row);
 });
 summary();
}
function showGroups(result){
 groups=result.groups||[];$('matches').hidden=!groups.length;$('choose').replaceChildren();
 if(!groups.length){stop();selected=null;message(result.reason||'No matching album found.');$('manual').open=true;setViewState('empty');return;}
 groups.forEach((g,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`${g.artist} — ${g.title}${g.year?' ('+g.year+')':''} · ${g.tracks.length} tracks`;$('choose').append(option);});
 const saved=groups.findIndex(g=>g.id===result.selected);const index=saved>=0?saved:0;
 $('choose').value=String(index);$('choose-label').hidden=groups.length===1;
 choose(index);$('manual').open=false;message(groups.length>1?'Choose your edition below.':'');setViewState('matched');
 if(result.savedMissing)message('Your saved album was not found after the upgrade. Choose and remember it again.');
}
async function load(){
 const version=++loadVersion;stop();selected=null;$('matches').hidden=true;setViewState('loading');message('Connecting to your library…');
 try{
  const state=await send('STATUS');server=state.server;
  if(!state.connected)throw new Error('Connect Navidrome in Settings to see your tracks.');
  if(initialAlbum&&!releaseId){const g=await send('ALBUM',{id:initialAlbum});if(version!==loadVersion)return;$('release-title').textContent='Test your library player';$('catalogs').textContent=g.catalogs.join(' · ');showGroups({groups:[g]});return;}
  if(!releaseId){$('release-title').textContent='Search your collection';message('Enter a catalog number below.');$('manual').open=true;setViewState('search');return;}
  message('Reading Discogs and looking up catalog tags…');
  const result=await send('RELEASE',{id:releaseId});if(version!==loadVersion)return;
  $('release-title').textContent=`${result.release.artist} — ${result.release.title}`;
  $('catalogs').textContent=result.release.pairs.map(p=>`${p.label} · ${p.catalog}`).join(' / ');
  $('catalog-input').value=result.release.pairs[0]?.catalog||'';$('forget').hidden=!result.selected;
  showGroups(result);
 }catch(e){if(version!==loadVersion)return;$('release-title').textContent=releaseId?`Discogs release ${releaseId}`:'Your library player';message(e.message,true);$('manual').open=true;setViewState('error');}
}
async function play(index){
 if(!selected||index<0||index>=selected.tracks.length)return;
 const version=++playVersion;const track=selected.tracks[index];
 playback.reset();dragging=false;trackIndex=index;$('now-playing').textContent=`Loading ${track.title}…`;
 try{
  const src=await send('MEDIA',{id:track.id});if(version!==playVersion)return;
  playback.load(src,track.duration);await playback.play();if(version!==playVersion)return;
  $('now-playing').textContent=`${track.title} · ${track.artist}`;message('');updateTrackState();
 }catch(e){if(version!==playVersion)return;message(e.name==='NotAllowedError'?'Press Play to start.':'Playback could not start. Try MP3 quality in Settings and verify that Navidrome can transcode this track.',true);}
}
function updateTrackState(){[...$('tracks').children].forEach((row,i)=>{row.classList.toggle('active',i===trackIndex);row.querySelector('button').textContent=i===trackIndex&&!audio.paused?'Ⅱ':'▶';row.querySelector('button').onclick=()=>{if(i===trackIndex&&audio.src)togglePlayback();else play(i);};});summary();}
audio.addEventListener('play',updateTrackState);audio.addEventListener('pause',updateTrackState);
audio.addEventListener('ended',()=>{if(selected&&trackIndex+1<selected.tracks.length)play(trackIndex+1);else $('now-playing').textContent='Album finished.';});
audio.addEventListener('error',()=>{if(audio.getAttribute('src'))message('Audio could not load. Check server access and try MP3 quality in Settings.',true);});
$('cover').onerror=()=>{$('cover').hidden=true;};
$('choose').onchange=()=>choose(Number($('choose').value));$('play-all').onclick=()=>play(0);
$('previous').onclick=()=>play(Math.max(0,trackIndex-1));$('next').onclick=()=>play(trackIndex+1);
$('settings').onclick=()=>send('OPEN_SETTINGS');$('retry').onclick=load;
async function action(button, fn){button.disabled=true;try{await fn();}catch(e){message(e.message,true);}finally{button.disabled=false;}}
$('catalog-form').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{++loadVersion;stop();message('Finding catalog number…');const r=await send('LOOKUP',{catalog:$('catalog-input').value});showGroups(r);});};
$('manual-album-form').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{++loadVersion;stop();message('Loading album…');showGroups({groups:[await send('ALBUM',{id:albumID($('manual-album').value)})]});});};
$('remember').onclick=()=>action($('remember'),async()=>{if(!selected)return;await send('REMEMBER',{releaseId,albumId:selected.id});$('forget').hidden=false;message('Saved this album for this Discogs release.');});
$('forget').onclick=()=>action($('forget'),async()=>{await send('FORGET',{releaseId});$('forget').hidden=true;message('Saved match removed.');});
chrome.storage.local.get(collapseKey).then(saved=>{if(typeof saved[collapseKey]==='boolean')collapseChoice=saved[collapseKey];}).catch(()=>{}).finally(load);
