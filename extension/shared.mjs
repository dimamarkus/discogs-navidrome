export async function send(type, data={}) {
  const response=await chrome.runtime.sendMessage({type,...data});
  if(!response?.ok)throw new Error(response?.error||'Extension unavailable. Reload this tab.');
  return response.data;
}
export const $=id=>document.getElementById(id);
export function message(text,error=false){const e=$('status');e.textContent=text;e.classList.toggle('error',error);}
export function albumID(value){
  const input=value.trim();const match=input.match(/\/#?\/album\/([a-zA-Z0-9_-]+)/)||input.match(/#\/album\/([a-zA-Z0-9_-]+)/);
  return match?match[1]:input;
}
