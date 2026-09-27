export const DEFAULT_SERVER = ''; 
export const normalizeCatalog = value => String(value || '').normalize('NFKC').toUpperCase().replace(/[\s\-‐‑–—._/]/g, '');
export const normalizeText = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s*\(\d+\)\s*$/g, '').replace(/[^\p{L}\p{N}]/gu, '');
export const usableCatalog = value => !!normalizeCatalog(value) && !['NONE','NA','NOTONLABEL','UNKNOWN'].includes(normalizeCatalog(value));
export const idOK = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
export function serverURL(value) {
  if(!String(value||'').trim())throw new Error('Enter your HTTPS Navidrome server address.');
  let url;try{url=new URL(String(value).trim());}catch{throw new Error('Enter a valid HTTPS Navidrome server address.');}
  if (url.username || url.password || !['https:','http:'].includes(url.protocol)) throw new Error('Enter a server URL without credentials.');
  if (url.protocol !== 'https:') throw new Error('Use your HTTPS Navidrome address.');
  url.hash = ''; url.search = '';
  url.pathname = url.pathname.replace(/\/app(?:\/.*)?$/, '').replace(/\/+$/, '');
  return url.href.replace(/\/$/, '');
}
export function releaseFromAPI(data) {
  const pairs = (data.labels || []).filter(x => usableCatalog(x.catno)).map(x => ({catalog: x.catno, label: x.name || ''}));
  return {id: String(data.id), title: data.title || '', artist: (data.artists || []).map(x => x.name).join(', '), pairs, year: data.year || null};
}
export function tagValues(song, name) {
  const values = song.tags?.[name];
  return (Array.isArray(values) ? values : values ? [values] : []).map(x => typeof x === 'string' ? x : x?.value || x?.tagValue || '').filter(Boolean);
}
export function songCatalogs(song) {
  return [...new Set([song.catalogNum, ...tagValues(song, 'catalognumber'), ...tagValues(song, 'labelno')].filter(Boolean))];
}
export function groupMatches(songs, release) {
  const groups = new Map();
  for (const song of songs) {
    if (!song.id || !song.albumId || song.missing) continue;
    const cats = songCatalogs(song);
    const pairs = release.pairs.filter(p => cats.some(c => normalizeCatalog(c) === normalizeCatalog(p.catalog)));
    if (!pairs.length) continue;
    if (!groups.has(song.albumId)) groups.set(song.albumId, {id:song.albumId,title:song.album || '',artist:song.albumArtist || song.artist || '',year:song.year,tracks:[],catalogs:[],labels:[],score:0,labelMatch:false,labelConflict:false});
    const g = groups.get(song.albumId);
    if (!g.tracks.some(t => t.id === song.id)) g.tracks.push(song);
    g.catalogs.push(...cats); g.labels.push(...tagValues(song,'recordlabel'),...tagValues(song,'label'),...tagValues(song,'organization'));
  }
  for (const g of groups.values()) {
    g.catalogs = [...new Set(g.catalogs)];g.labels = [...new Set(g.labels)];
    const applicable = release.pairs.filter(p => g.catalogs.some(c => normalizeCatalog(c) === normalizeCatalog(p.catalog)));
    const expectedLabels = applicable.map(p => p.label).filter(Boolean);
    g.labelMatch = expectedLabels.some(l => g.labels.some(x => normalizeText(l) === normalizeText(x)));
    g.labelConflict = !!(expectedLabels.length && g.labels.length && !g.labelMatch);
    const titleMatch = !!release.title && normalizeText(g.title) === normalizeText(release.title);
    const artistMatch = !!release.artist && normalizeText(g.artist) === normalizeText(release.artist);
    g.score = (g.labelMatch ? 6 : 0) + (titleMatch ? 4 : 0) + (artistMatch ? 2 : 0) - (g.labelConflict ? 8 : 0);
    g.match = g.labelConflict ? 'Catalog match · label differs' : g.labelMatch ? 'Catalog + label match' : 'Catalog match · check edition';
    g.tracks.sort((a,b) => (a.discNumber||1)-(b.discNumber||1) || (a.trackNumber||0)-(b.trackNumber||0) || a.title.localeCompare(b.title));
  }
  return [...groups.values()].sort((a,b) => b.score-a.score || a.title.localeCompare(b.title));
}
export const duration = secs => `${Math.floor((secs||0)/60)}:${String(Math.floor((secs||0)%60)).padStart(2,'0')}`;

export class Client {
  constructor(storage, fetcher = fetch) {this.storage=storage;this.fetcher=fetcher;}
  async state() {return this.storage.get(['auth','prefs','manualMatches']);}
  async json(url, options={}) {
    let response;
    // Browser fetch is a Web IDL method. Calling this.fetcher(...) binds `this`
    // to Client, which Chrome rejects with "Illegal invocation" before networking.
    // Node's fetch and ordinary arrow-function mocks do not enforce that receiver.
    try {response=await this.fetcher.call(globalThis,url,{...options,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(25000)});}
    catch(error) {
      if(error?.name==='TimeoutError'||error?.name==='AbortError')throw new Error('The server did not respond within 25 seconds. Check the server address and retry.');
      if(/illegal invocation|incompatible receiver/i.test(error?.message||''))throw new Error('Browser request initialization failed (Illegal invocation). Reload the updated extension in chrome://extensions and reopen Settings.');
      throw new Error(`The browser could not send the request (${error?.name||'Error'}). Check Chrome site permission, the server address, and any proxy redirects. Open the server in a normal tab to verify access.`);
    }
    if(response.status===401) throw new Error('Sign in again in extension settings. Your session may have expired.');
    if(response.status===403) throw new Error('Access denied (403). Check account permissions and any Cloudflare or reverse-proxy access rules.');
    if(response.status===429) throw new Error('Rate limit reached. Wait a minute and retry.');
    if(!response.ok) throw new Error(`Server returned HTTP ${response.status}.`);
    let data;try{data=await response.json();}catch{throw new Error('The server returned a web page instead of API data. Check the server URL and proxy login.');}
    return {data,response};
  }
  async login(server, username, password) {
    server=serverURL(server);
    let data;
    try{({data}=await this.json(`${server}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})}));}
    catch(error){if(error.message.startsWith('Sign in again'))throw new Error('Navidrome rejected the username or password (401). Use the same credentials as its web player.');throw error;}
    if(!data.token || !data.subsonicToken || !data.subsonicSalt) throw new Error('Navidrome did not return the expected login credentials.');
    await this.storage.remove(['catalogIndex','manualMatches']);
    await this.storage.set({auth:{server,username:data.username||username,token:data.token,salt:data.subsonicSalt,subsonicToken:data.subsonicToken}});
    return {username:data.username||username,server};
  }
  async native(path, params={}) {
    const {auth}=await this.state(); if(!auth) throw new Error('Connect Navidrome in extension settings first.');
    const url=new URL(`${auth.server}/api/${path}`);for(const [k,v] of Object.entries(params)) url.searchParams.set(k,String(v));
    const {data,response}=await this.json(url.href,{headers:{'X-ND-Authorization':`Bearer ${auth.token}`,'X-ND-Client-Unique-Id':'discogs-your-library','Accept':'application/json'}});
    const token=response.headers.get('X-ND-Authorization');
    if(token) {
      const latest=(await this.state()).auth;
      if(latest?.server===auth.server && latest?.username===auth.username) await this.storage.set({auth:{...latest,token:token.replace(/^Bearer /i,'')}});
    }
    return {data,total:Number(response.headers.get('X-Total-Count'))||0};
  }
  async list(path, params={}, limit=10000) {
    const rows=[];const pageSize=500;
    for(let start=0;start<limit;start+=pageSize){
      const {data,total}=await this.native(path,{...params,_start:start,_end:start+pageSize});
      if(data===null) return rows;
      if(!Array.isArray(data)) throw new Error('Unexpected Navidrome response. This build targets the 0.64 native API.');
      rows.push(...data);
      if(data.length<pageSize || (total && rows.length>=total)) return rows;
      if(start>0 && data[0]?.id===rows[0]?.id) throw new Error('The server did not paginate the results correctly.');
    }
    throw new Error('Result limit reached. Narrow the query or check the server API.');
  }
  async lookup(release) {
    if(!release.pairs.length) return {groups:[],reason:'This release has no usable catalog number. Use the manual catalog search below.'};
    // Navidrome promotes catalognumber to MediaFile.CatalogNum (catalog_num in
    // native filters), then removes it from Tags. /api/tag is not its index.
    const catalogs=[...new Set(release.pairs.map(p=>p.catalog).filter(usableCatalog))];
    if(catalogs.length>12)throw new Error('Too many catalog numbers. Search one catalog number manually.');
    const songs=[];
    let candidates=0;const queries=[];
    for(const catalog of catalogs){
      const normalized=normalizeCatalog(catalog);
      const variants=[...new Set([catalog.trim(),normalized])];
      const matches=[];
      const query=async value=>{
        const rows=await this.list('song',{catalog_num:value,missing:'false',_sort:'id',_order:'ASC'});
        candidates+=rows.length;queries.push(value);
        // Native string filters are prefix/LIKE matches; require an exact
        // normalized catalog match locally so ABC001 does not accept ABC001CD.
        matches.push(...rows.filter(s=>songCatalogs(s).some(c=>normalizeCatalog(c)===normalized)));
      };
      for(const value of variants){await query(value);if(matches.length)break;}
      // If spacing/hyphens differ inside the number, native LIKE can retrieve
      // candidates without loading the library. Validate each returned value.
      if(!matches.length && /^[A-Z0-9]{5,80}$/.test(normalized))await query([...normalized].join('%'));
      songs.push(...matches);
    }
    const groups=groupMatches(songs,release);
    return {groups,diagnostics:{queries,candidates,matchedTracks:new Set(songs.map(s=>s.id)).size},reason:groups.length?'':`No matching catalog number returned by Navidrome. Searched ${catalogs.join(', ')}. Try pasting the album URL below, then use Test album in Settings to check its imported catalog field.`};
  }
  async album(id) {
    if(!idOK(id)) throw new Error('Invalid album ID.');
    const {data:album}=await this.native(`album/${encodeURIComponent(id)}`);
    const songs=await this.list('song',{album_id:id,missing:'false',_sort:'id',_order:'ASC'});
    if(songs.some(s=>s.albumId!==id)) throw new Error('The server did not apply the album filter.');
    songs.sort((a,b)=>(a.discNumber||1)-(b.discNumber||1)||(a.trackNumber||0)-(b.trackNumber||0));
    return {id,title:album.name||songs[0]?.album||'Album',artist:album.albumArtist||album.artist||songs[0]?.albumArtist||'',tracks:songs,catalogs:[...new Set(songs.flatMap(songCatalogs))],labels:[...new Set(songs.flatMap(s=>tagValues(s,'recordlabel')))],match:'Selected album · edition not verified'};
  }
  async release(id) {
    if(!/^\d{1,12}$/.test(String(id))) throw new Error('Invalid Discogs release ID.');
    const {prefs}=await this.state();
    const headers={'Accept':'application/json'};
    if(prefs?.discogsToken) headers.Authorization=`Discogs token=${prefs.discogsToken}`;
    try {
      const {data}=await this.json(`https://api.discogs.com/releases/${id}`,{headers});
      return releaseFromAPI(data);
    } catch(e) {
      throw new Error(`Discogs release lookup failed. ${e.message.includes('Sign in again')?'Add your Discogs personal token in Settings.':e.message} You can still search a catalog number manually below.`);
    }
  }
  async media(id, kind='stream') {
    if(!idOK(id) || !['stream','getCoverArt'].includes(kind)) throw new Error('Invalid media request.');
    const {auth,prefs}=await this.state();if(!auth) throw new Error('Sign in in extension settings.');
    const url=new URL(`${auth.server}/rest/${kind}`);
    const params={u:auth.username,t:auth.subsonicToken,s:auth.salt,v:'1.16.1',c:'DiscogsYourLibrary',id};
    if(kind==='stream') Object.assign(params,prefs?.quality==='original'?{format:'raw'}:{format:'mp3',maxBitRate:320});
    else params.size=240;
    for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
    return url.href;
  }
}
