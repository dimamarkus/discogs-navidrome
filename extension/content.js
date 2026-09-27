(() => {
  const containerId='discogs-your-library-player';
  let current='',scheduled=false;
  const extensionOrigin=chrome.runtime.getURL('').replace(/\/$/,'');
  function releaseId(){return location.pathname.match(/\/release\/(\d+)(?:[-/]|$)/)?.[1]||'';}
  function videoAnchor(){
    const named=document.querySelector('#release-videos, #videos, [data-testid="release-videos"], [data-testid="videos"]');
    if(named)return named;
    const heading=[...document.querySelectorAll('h2,h3,h4,[role="heading"]')].find(el=>/^videos\b/i.test(el.textContent.trim()));
    if(!heading)return null;
    const section=heading.closest('section');
    if(section && section.querySelector('h2,h3,h4,[role="heading"]')===heading)return section;
    const parent=heading.parentElement;
    if(parent && (parent.tagName==='HEADER'||/heading|header/i.test(parent.className)) && !parent.querySelector('iframe,video'))return parent;
    return heading;
  }
  function sidebar(){return document.querySelector('aside, [class*="rightSidebar"], [class*="right_sidebar"], [class*="sidebar"]');}
  function position(host){
    const anchor=videoAnchor();
    if(anchor && !host.contains(anchor)){
      if(host.parentElement!==anchor.parentElement || host.nextElementSibling!==anchor){
        // moveBefore preserves an already-playing iframe on modern Chrome.
        if(host.isConnected && typeof anchor.parentElement.moveBefore==='function')anchor.parentElement.moveBefore(host,anchor);
        else anchor.before(host);
      }
      host.dataset.placement='videos';return;
    }
    if(host.isConnected)return;
    const side=sidebar();
    if(side){side.append(host);host.dataset.placement='sidebar';return;}
    const main=document.querySelector('main')||document.body;const h1=main.querySelector('h1');
    if(h1)h1.after(host);else main.prepend(host);host.dataset.placement='fallback';
  }
  function mount(){
    scheduled=false;const id=releaseId();let host=document.getElementById(containerId);
    if(id===current && host){position(host);return;}
    if(host)host.remove();current=id;if(!id)return;
    host=document.createElement('section');host.id=containerId;
    // Discogs' sidebar sits beside floated main-column articles. Clearing here
    // clears those external floats too, pushing the player below the left column.
    host.style.cssText='display:block;clear:none;margin:14px 0;width:100%;min-width:0;box-sizing:border-box;';
    const frame=document.createElement('iframe');frame.src=chrome.runtime.getURL(`player.html?release=${id}&parent=${encodeURIComponent(location.origin)}`);
    frame.title='Play this release from your Navidrome library';frame.allow='autoplay';frame.referrerPolicy='no-referrer';
    frame.style.cssText='display:block;width:100%;height:58px;border:1px solid #d9e4e1;border-radius:8px;background:#f8faf9;color-scheme:light;box-sizing:border-box;';
    host.append(frame);position(host);
  }
  addEventListener('message',event=>{
    const frame=document.getElementById(containerId)?.querySelector('iframe');
    // Only this extension's current player can resize its own container.
    if(!frame || event.source!==frame.contentWindow || event.origin!==extensionOrigin)return;
    const data=event.data;
    if(data?.type!=='discogs-library-size' || data.releaseId!==current || !Number.isFinite(data.height))return;
    const height=Math.max(54,Math.min(1100,Math.ceil(data.height)));
    if(frame.style.height!==`${height}px`)frame.style.height=`${height}px`;
  });
  new MutationObserver(()=>{if(!scheduled){scheduled=true;setTimeout(mount,200);}}).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('popstate',mount);mount();
})();
