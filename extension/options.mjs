import {send,$,message,albumID} from './shared.mjs';
import {serverURL} from './core.mjs';
async function status(){const s=await send('STATUS');$('server').value=s.server;$('username').value=s.username;$('quality').value=s.quality;$('connection').textContent=s.connected?`Connected as ${s.username}.`:'Sign in to connect this Chrome session.';}
async function run(button,action){button.disabled=true;message('Working…');try{await action();}catch(e){message(e.message,true);}finally{button.disabled=false;}}
$('login-form').addEventListener('submit',async e=>{
  e.preventDefault();
  let server;try{server=serverURL($('server').value);}catch(e){message(e.message,true);return;}
  const origin=`${new URL(server).origin}/*`;
  // Request host access directly from the user gesture, before any other awaits.
  const permission=chrome.permissions.request({origins:[origin]});
  $('connect').disabled=true;$('connection').classList.remove('error');$('connection').textContent='Connecting…';message('');
  try{
    if(!await permission)throw new Error('Server permission was not granted.');
    await send('LOGIN',{server,username:$('username').value.trim(),password:$('password').value});
    $('password').value='';await status();message('Connected. You can now open a Discogs release or test your album below.');
  }catch(error){$('connection').textContent=error.message;$('connection').classList.add('error');}
  finally{$('connect').disabled=false;}
});
$('logout').onclick=()=>run($('logout'),async()=>{await send('LOGOUT');await status();message('Disconnected. Session tokens, preferences, and remembered matches were removed. Reload open player tabs to stop existing streams.');});
$('preferences').onsubmit=e=>{e.preventDefault();run(e.submitter,async()=>{const data={quality:$('quality').value};if($('clear-token').checked)data.discogsToken='';else if($('discogs-token').value.trim())data.discogsToken=$('discogs-token').value.trim();await send('SAVE_PREFS',data);$('discogs-token').value='';$('clear-token').checked=false;message('Preferences saved. Reload an open player to apply them.');});};
$('album-form').onsubmit=e=>{e.preventDefault();run(e.submitter,async()=>{const a=await send('ALBUM',{id:albumID($('album').value)});$('diagnostics').textContent=`${a.artist} — ${a.title}\n${a.tracks.length} tracks\nCatalog tags: ${a.catalogs.join(', ')||'No catalog numbers found'}\nLabels: ${a.labels.join(', ')||'No label tags found'}`;message('Album API test passed. Use Open test player to check audio.');});};
$('open-player').onclick=()=>{if(!$('album').reportValidity())return;chrome.tabs.create({url:chrome.runtime.getURL(`player.html?album=${encodeURIComponent(albumID($('album').value))}`)});};
$('catalog-test-form').onsubmit=e=>{e.preventDefault();run(e.submitter,async()=>{const catalog=$('test-catalog').value.trim();const r=await send('LOOKUP',{catalog});$('diagnostics').textContent=r.groups.length?r.groups.map(g=>`${g.artist} — ${g.title}\n${g.tracks.length} tracks · ${g.catalogs.join(', ')}`).join('\n\n'):r.reason;message(r.groups.length?`Catalog test passed: ${r.diagnostics.matchedTracks} matching tracks.`:`No catalog match. Native API returned ${r.diagnostics.candidates} candidates. Test the album URL above to see its imported catalog value.`,!r.groups.length);});};
status().catch(e=>message(e.message,true));
