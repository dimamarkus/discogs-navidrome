const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const os=require('node:os');

// Browser test copies the real extension and adds permission for a local fixture server.
// This test-only permission is never put into the distributed extension.
const fixture={id:'track1',albumId:'album1',title:'Midnight Motion',album:'Bedits Vol. 9',artist:'Example Artist',albumArtist:'Example Artist',trackNumber:1,discNumber:1,duration:3,suffix:'wav',catalogNum:'BDTS009',tags:{recordlabel:['BEDITS']}};
const requests=[];
function wav(){const n=44100*3,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(88200,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);return b;}
const audio=wav();
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');requests.push(u.pathname);
 const json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
 if(u.pathname==='/auth/login'){let body='';for await(const c of req)body+=c;assert.equal(JSON.parse(body).password,'local-test-password');return json({username:'test',token:'PRIVATE-JWT',subsonicToken:'PRIVATE-TOKEN',subsonicSalt:'SALT'});}
 if(u.pathname.startsWith('/api/'))assert.equal(req.headers['x-nd-authorization'],'Bearer PRIVATE-JWT');
 if(u.pathname==='/api/tag')return json([]);
 if(u.pathname==='/api/album/album1')return json({id:'album1',name:'Bedits Vol. 9',albumArtist:'Example Artist'});
 if(u.pathname==='/api/song'){assert.ok(u.searchParams.get('catalog_num')==='BDTS009'||u.searchParams.get('album_id')==='album1');return json([fixture,{...fixture,id:'track2',title:'After Hours',trackNumber:2}]);}
 if(u.pathname==='/rest/getCoverArt'){res.statusCode=404;return res.end();}
 if(u.pathname==='/rest/stream'){
  assert.equal(u.searchParams.get('t'),'PRIVATE-TOKEN');res.setHeader('Content-Type','audio/wav');res.setHeader('Accept-Ranges','bytes');
  const range=req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  if(range){const start=+range[1],end=range[2]?+range[2]:audio.length-1;res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${audio.length}`);res.end(audio.subarray(start,end+1));}else res.end(audio);return;
 }
 res.statusCode=404;res.end();
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'discogs-test-'));const extension=path.join(temp,'extension');fs.cpSync(path.join(__dirname,'../extension'),extension,{recursive:true});
 // Local HTTP fixture only: production remains HTTPS-only.
 const corePath=path.join(extension,'core.mjs');fs.writeFileSync(corePath,fs.readFileSync(corePath,'utf8').replace("if (url.protocol !== 'https:')","if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1')"));
 const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json')));manifest.host_permissions.push('http://127.0.0.1/*');fs.writeFileSync(path.join(extension,'manifest.json'),JSON.stringify(manifest));
 const context=await chromium.launchPersistentContext(path.join(temp,'profile'),{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--no-sandbox'],viewport:{width:1100,height:1000}});
 try{
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const id=new URL(worker.url()).hostname;
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  await context.route('https://api.discogs.com/releases/123',route=>route.fulfill({json:{id:123,title:'Bedits Vol. 9',artists:[{name:'Example Artist'}],labels:[{name:'BEDITS',catno:'BDTS009'}]}}));
  await context.route('https://www.discogs.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; frame-src \'self\'; style-src \'unsafe-inline\'"></head><body><main style="max-width:750px;margin:25px auto;font-family:Arial"><h1>Example Artist – Bedits Vol. 9</h1><section id="release-tracklist"><h2>Tracklist</h2><p>A1. Midnight Motion</p><p>B1. After Hours</p></section><aside style="width:360px;margin-left:auto"><section id="release-videos"><h2>Videos</h2></section></aside></main></body></html>'}));
  const settings=await context.newPage();await settings.goto(`chrome-extension://${id}/options.html`);
  await settings.locator('#server').fill(origin);await settings.locator('#username').fill('test');await settings.locator('#password').fill('local-test-password');await settings.locator('#connect').click();
  await settings.locator('#connection').filter({hasText:'Connected as test'}).waitFor();
  await settings.locator('#album').fill('album1');await settings.getByRole('button',{name:'Test album',exact:true}).click();await settings.locator('#diagnostics').filter({hasText:'BDTS009'}).waitFor();
  fs.mkdirSync(path.join(__dirname,'../../test-output'),{recursive:true});await settings.screenshot({path:path.join(__dirname,'../../test-output/settings.png'),fullPage:true});
  const page=await context.newPage();await page.goto('https://www.discogs.com/release/123-example');
  const frame=page.frameLocator('iframe[title="Play this release from your Navidrome library"]');
  await frame.locator('#album-title').filter({hasText:'Bedits Vol. 9'}).waitFor({timeout:20000});
  assert.equal(await page.locator('#discogs-your-library-player').evaluate(el=>el.nextElementSibling?.id),'release-videos');
  await frame.locator('#play-all').click();await page.waitForTimeout(600);
  assert.equal(await frame.locator('#audio').evaluate(a=>a.paused),false);
  assert.ok(await frame.locator('#audio').evaluate(a=>a.currentTime)>0);
  await frame.locator('#seek').evaluate(el=>{el.value='1.5';el.dispatchEvent(new Event('input'));el.dispatchEvent(new Event('change'));});await page.waitForTimeout(150);assert.ok(await frame.locator('#audio').evaluate(a=>a.currentTime)>=1.5);
  await frame.locator('#next').click();await frame.locator('#now-playing').filter({hasText:'After Hours'}).waitFor();
  await frame.locator('#toggle').click();assert.equal(await frame.locator('#toggle').getAttribute('aria-expanded'),'false');
  assert.equal(await frame.locator('#audio').evaluate(a=>a.paused),false);
  await frame.locator('#toggle').click();await frame.locator('#manual > summary').click();
  await frame.locator('#remember').click();await frame.locator('#status').filter({hasText:'Saved this album'}).waitFor();
  assert.ok(!await page.content().then(s=>/PRIVATE-TOKEN|PRIVATE-JWT/.test(s)));
  const secrets=await settings.evaluate(async()=>({local:await chrome.storage.local.get(null),session:await chrome.storage.session.get(null)}));assert.ok(!JSON.stringify(secrets).includes('local-test-password'));assert.ok(!JSON.stringify(secrets.local).includes('PRIVATE-JWT'));assert.equal(secrets.session.auth.token,'PRIVATE-JWT');
  await page.screenshot({path:path.join(__dirname,'../../test-output/embedded-player.png'),fullPage:true});
  await page.reload();await frame.locator('#album-title').waitFor();await frame.locator('#manual > summary').click();await frame.locator('#forget').waitFor({state:'visible'});
  await page.goto('https://www.discogs.com/master/456-example');assert.equal(await page.locator('#discogs-your-library-player').count(),0);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify({passed:true,checks:['settings login','album diagnostics','Discogs injection under CSP','release API lookup','catalog matching','audio playback','audio seek','next track','remember after reload','no credentials in parent DOM','password not persisted','master pages excluded'],requests:requests.length}));
 }finally{await context.close();await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
