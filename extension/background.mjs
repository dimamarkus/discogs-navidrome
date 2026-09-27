import {Client, DEFAULT_SERVER, idOK} from './core.mjs';

import {createStorage} from './storage.mjs';
const storage=createStorage(chrome.storage.local,chrome.storage.session);
const client = new Client(storage);
chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
chrome.action.onClicked.addListener(()=>chrome.runtime.openOptionsPage());
chrome.runtime.onInstalled.addListener(({reason})=>{chrome.storage.local.remove('catalogIndex');if(reason==='install') chrome.runtime.openOptionsPage();});

function trustedPage(sender, page) {
  if(sender.id!==chrome.runtime.id) return false;
  try{const url=new URL(sender.url);return url.protocol==='chrome-extension:' && url.hostname===chrome.runtime.id && url.pathname===`/${page}`;}catch{return false;}
}
async function handle(m,sender) {
  await storage.ready;
  const options=trustedPage(sender,'options.html');const player=trustedPage(sender,'player.html');
  if(!options&&!player) throw new Error('Request not allowed.');
  const optionsOnly=['LOGIN','SAVE_PREFS','LOGOUT'];
  if(optionsOnly.includes(m.type)&&!options) throw new Error('Open settings to make this change.');
  switch(m.type) {
    case 'STATUS': {
      const {auth,prefs}=await client.state();const {connection}=await chrome.storage.local.get('connection');
      return {connected:!!auth,server:auth?.server||connection?.server||DEFAULT_SERVER,username:auth?.username||connection?.username||'',quality:prefs?.quality||'mp3',hasDiscogsToken:!!prefs?.discogsToken};
    }
    case 'LOGIN':return client.login(m.server,String(m.username||'').slice(0,200),String(m.password||''));
    case 'SAVE_PREFS': {
      const {prefs}=await client.state();
      const next={...prefs,quality:m.quality==='original'?'original':'mp3'};
      if(typeof m.discogsToken==='string')next.discogsToken=m.discogsToken.trim();
      await storage.set({prefs:next});return true;
    }
    case 'LOGOUT':await storage.clear();return true;
    case 'ALBUM':return client.album(String(m.id||''));
    case 'LOOKUP': {
      const catalog=String(m.catalog||'').trim().slice(0,160);
      if(!catalog)throw new Error('Enter a catalog number.');
      const release={id:'',title:'',artist:'',pairs:[{catalog,label:String(m.label||'').slice(0,200)}]};
      return {release,...await client.lookup(release)};
    }
    case 'RELEASE': {
      const release=await client.release(String(m.id||''));
      const {manualMatches}=await client.state();const selected=manualMatches?.[release.id];
      const result=await client.lookup(release);
      if(selected && !result.groups.some(g=>g.id===selected)) {
        try{result.groups.unshift({...await client.album(selected),match:'Your saved match · edition not verified'});}catch{result.savedMissing=true;}
      }
      return {release,...result,selected};
    }
    case 'REMEMBER': {
      if(!/^\d{1,12}$/.test(String(m.releaseId)) || !idOK(m.albumId))throw new Error('Invalid release or album ID.');
      const {manualMatches}=await client.state();await chrome.storage.local.set({manualMatches:{...manualMatches,[m.releaseId]:m.albumId}});return true;
    }
    case 'FORGET': {
      if(!/^\d{1,12}$/.test(String(m.releaseId)))throw new Error('Invalid release ID.');
      const {manualMatches={}}=await client.state();delete manualMatches[m.releaseId];await chrome.storage.local.set({manualMatches});return true;
    }
    case 'MEDIA':return client.media(String(m.id||''),m.kind||'stream');
    case 'OPEN_SETTINGS':await chrome.runtime.openOptionsPage();return true;
    default:throw new Error('Unknown request.');
  }
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  handle(message||{},sender).then(data=>sendResponse({ok:true,data}),error=>sendResponse({ok:false,error:error.message||'Request failed.'}));
  return true;
});
