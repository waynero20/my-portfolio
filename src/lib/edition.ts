// The <head> boot script. It runs before first paint and sets the html attributes that the
// `js`, `team` and `motion-off` CSS variants read, so neither edition nor motion mode ever flashes:
// - data-js="" always;
// - data-edition="team" for ?for=team (per visit, never stored);
// - data-motion="off" for ?motion=off (per visit, never stored), else the stored "on" | "off"
//   preference. Storage access is in try/catch because it throws in some private modes.
// It is a plain string, not a stringified function, so no bundler can rename or wrap it.

import { PREF_KEYS } from "@/lib/storage";

const MOTION_KEY = JSON.stringify(PREF_KEYS.motion);

export const BOOT_SCRIPT =
  "(function(){" +
  'var d=document.documentElement;d.dataset.js="";var q=new URLSearchParams(location.search),m=null;' +
  'if(q.get("for")==="team")d.dataset.edition="team";' +
  `if(q.get("motion")==="off")m="off";else try{m=localStorage.getItem(${MOTION_KEY})}catch(e){}` +
  'if(m==="on"||m==="off")d.dataset.motion=m' +
  "})();";
