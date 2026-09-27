// Secrets stay in Chrome's in-memory session storage, never storage.local/sync.
export function createStorage(local,session){
 const ready=(async()=>{
  const old=await local.get(['auth','prefs']);
  if(old.auth){await session.set({auth:old.auth});await local.set({connection:{server:old.auth.server,username:old.auth.username}});}
  if(old.prefs&&Object.hasOwn(old.prefs,'discogsToken')){
   const {discogsToken,...prefs}=old.prefs;
   if(discogsToken)await session.set({discogsToken});
   await local.set({prefs});
  }
  await local.remove('auth');
 })();
 return {
  ready,
  async get(keys){
   await ready;const data=await local.get(keys.filter(k=>k!=='auth'));
   const secrets=await session.get(['auth','discogsToken']);
   if(keys.includes('auth'))data.auth=secrets.auth;
   if(keys.includes('prefs'))data.prefs={...data.prefs,discogsToken:secrets.discogsToken||''};
   return data;
  },
  async set(values){
   await ready;const persistent={...values};
   if(Object.hasOwn(persistent,'auth')){
    await session.set({auth:persistent.auth});
    persistent.connection={server:persistent.auth.server,username:persistent.auth.username};delete persistent.auth;
   }
   if(persistent.prefs){const {discogsToken,...prefs}=persistent.prefs;persistent.prefs=prefs;
    if(discogsToken!==undefined)await session.set({discogsToken});
   }
   await local.set(persistent);
  },
  async remove(keys){await ready;await local.remove(keys);await session.remove(keys);},
  async clear(){await ready;await session.clear();await local.clear();}
 };
}
