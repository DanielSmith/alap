var Alap=(function(C){"use strict";var Bi=Object.defineProperty;var ji=(C,N,U)=>N in C?Bi(C,N,{enumerable:!0,configurable:!0,writable:!0,value:U}):C[N]=U;var u=(C,N,U)=>ji(C,typeof N!="symbol"?N+"":N,U);const Mt="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",Dt="strict-origin-when-cross-origin",Le="alap_embed_consent",Pt=typeof process<"u"&&typeof process.env<"u"&&process.env.NODE_ENV!=="production";function b(s){Pt&&console.warn(`[alap] ${s}`)}function le(s){try{new RegExp(s)}catch{return{safe:!1,reason:"Invalid regex syntax"}}const t=/^(?:[?*+]|\{\d+(?:,\d*)?\})/,e=/[?*+]|\{\d+(?:,\d*)?\}/,n=[];for(let i=0;i<s.length;i++){const a=s[i];if(a==="\\"){i++;continue}if(a==="["){for(i++,i<s.length&&s[i]==="^"&&i++,i<s.length&&s[i]==="]"&&i++;i<s.length&&s[i]!=="]";)s[i]==="\\"&&i++,i++;continue}if(a==="("){n.push(i);continue}if(a===")"){if(n.length===0)continue;const r=n.pop(),o=s.slice(i+1);if(t.test(o)){const l=s.slice(r+1,i);if(e.test(Ot(l)))return{safe:!1,reason:`Nested quantifier detected: group at position ${r} contains a quantifier and is itself quantified — this can cause catastrophic backtracking`}}continue}}return{safe:!0}}function Ot(s){let t="",e=0;for(;e<s.length;){if(s[e]==="\\"){e+=2;continue}if(s[e]==="["){for(e++,e<s.length&&s[e]==="^"&&e++,e<s.length&&s[e]==="]"&&e++;e<s.length&&s[e]!=="]";)s[e]==="\\"&&e++,e++;e++;continue}t+=s[e],e++}return t}const Ut=(s,t,e)=>{var d;const n=s.split("|"),i=n[0],a=n.slice(1);if(e!=null&&e.has(s))return e.get(s);const r=(d=t.protocols)==null?void 0:d[i];if(!r)return b(`Protocol "${i}" not found in config.protocols`),[];const o=typeof r.filter=="function"?r.filter:typeof r.handler=="function"?r.handler:void 0;if(!o)return r.generate?b(`Protocol "${i}" is a generate protocol but preResolve was not called. Use engine.resolveAsync() for external protocols.`):b(`Protocol "${i}" has no filter or generate handler`),[];const l=t.allLinks;if(!l||typeof l!="object")return[];const c=[];for(const[h,p]of Object.entries(l))if(!(!p||typeof p!="object"))try{o(a,p,h)&&c.push(h)}catch{b(`Protocol "${i}" handler threw for item "${h}" — skipping`)}return c},Ht=s=>{const t=s.split(":");return{name:t[0],args:t.slice(1)}},zt=(s,t)=>{let e=s;for(const n of t)switch(n.name){case"sort":{const i=n.args[0]||"label";e=[...e].sort((a,r)=>{const o=i==="id"?a.id:String(a[i]??""),l=i==="id"?r.id:String(r[i]??"");return o.localeCompare(l)});break}case"reverse":e=[...e].reverse();break;case"limit":{const i=parseInt(n.args[0],10);i>=0&&!isNaN(i)&&(e=e.slice(0,i));break}case"skip":{const i=parseInt(n.args[0],10);i>0&&(e=e.slice(i));break}case"shuffle":{e=[...e];for(let i=e.length-1;i>0;i--){const a=Math.floor(Math.random()*(i+1));[e[i],e[a]]=[e[a],e[i]]}break}case"unique":{const i=n.args[0]||"url",a=new Set;e=e.filter(r=>{const o=i==="id"?r.id:String(r[i]??"");return a.has(o)?!1:(a.add(o),!0)});break}default:b(`Unknown refiner "${n.name}" — skipping`)}return e};class _e{constructor(t){u(this,"config");u(this,"depth",0);u(this,"regexCount",0);u(this,"generatedIds",new Map);this.config=t}updateConfig(t){this.config=t}setGeneratedIds(t){this.generatedIds=t}query(t,e){if(!t||typeof t!="string")return[];const n=t.trim();if(!n)return[];if(!this.config.allLinks||typeof this.config.allLinks!="object")return[];const i=this.expandMacros(n,e);if(!i)return[];const a=this.tokenize(i);if(a.length===0)return[];if(a.length>1024)return b(`Expression has ${a.length} tokens (max 1024). Ignoring: "${t.slice(0,60)}..."`),[];this.depth=0,this.regexCount=0;const r=this.parseQuery(a);return[...new Set(r)]}searchByClass(t){const e=this.config.allLinks;if(!e||typeof e!="object")return[];const n=[];for(const[i,a]of Object.entries(e))!a||!Array.isArray(a.tags)||a.tags.includes(t)&&n.push(i);return n}searchByRegex(t,e){if(this.regexCount++,this.regexCount>5)return b(`Regex query limit exceeded (max 5 per expression). Skipping /${t}/`),[];const n=this.config.searchPatterns;if(!n||!(t in n))return b(`Search pattern "${t}" not found in config.searchPatterns`),[];const i=n[t],a=typeof i=="string"?{pattern:i}:i,r=le(a.pattern);if(!r.safe)return b(`Unsafe regex pattern "${a.pattern}" in searchPatterns["${t}"]: ${r.reason}`),[];let o;try{o=new RegExp(a.pattern,"i")}catch{return b(`Invalid regex pattern "${a.pattern}" in searchPatterns["${t}"]`),[]}const l=a.options??{},c=this.parseFieldCodes(e||l.fields||"a"),d=this.config.allLinks;if(!d||typeof d!="object")return[];const h=Date.now(),p=l.age?this.parseAge(l.age):0,v=l.limit??100,f=Date.now(),m=[];for(const[E,w]of Object.entries(d))if(!(!w||typeof w!="object")){if(Date.now()-f>20){b(`Regex search /${t}/ timed out after 20ms — returning partial results`);break}if(p>0){const x=this.toTimestamp(w.createdAt);if(x===0||h-x>p)continue}if(this.matchesFields(o,E,w,c)){const x=w.createdAt?this.toTimestamp(w.createdAt):0;if(m.push({id:E,createdAt:x}),m.length>=100){b(`Regex search /${t}/ hit 100 result cap — truncating`);break}}}return l.sort==="alpha"?m.sort((E,w)=>E.id.localeCompare(w.id)):l.sort==="newest"?m.sort((E,w)=>w.createdAt-E.createdAt):l.sort==="oldest"&&m.sort((E,w)=>E.createdAt-w.createdAt),m.slice(0,v).map(E=>E.id)}resolveProtocol(t){return Ut(t,this.config,this.generatedIds)}applyRefiners(t,e){if(e.length===0)return t;const n=this.config.allLinks,i=t.map(o=>{const l=n[o];return l?{id:o,...l}:null}).filter(o=>o!==null),a=e.map(o=>Ht(o.value));return zt(i,a).map(o=>o.id)}parseFieldCodes(t){const e=new Set,n=t.replace(/[\s,]/g,"");for(const i of n)switch(i){case"l":e.add("label");break;case"u":e.add("url");break;case"t":e.add("tags");break;case"d":e.add("description");break;case"k":e.add("id");break;case"a":e.add("label"),e.add("url"),e.add("tags"),e.add("description"),e.add("id");break}return e.size>0?e:new Set(["label","url","tags","description","id"])}matchesFields(t,e,n,i){if(i.has("id")&&t.test(e)||i.has("label")&&n.label&&t.test(n.label)||i.has("url")&&t.test(n.url)||i.has("description")&&n.description&&t.test(n.description))return!0;if(i.has("tags")&&n.tags){for(const a of n.tags)if(t.test(a))return!0}return!1}parseAge(t){const e=t.match(/^(\d+)\s*([dhwm])$/i);if(!e)return 0;const n=parseInt(e[1],10);switch(e[2].toLowerCase()){case"h":return n*60*60*1e3;case"d":return n*24*60*60*1e3;case"w":return n*7*24*60*60*1e3;case"m":return n*30*24*60*60*1e3;default:return 0}}toTimestamp(t){if(t==null)return 0;if(typeof t=="number")return t;const e=new Date(t);return isNaN(e.getTime())?0:e.getTime()}expandMacros(t,e){let n=t,i=0;for(;n.includes("@")&&i<10;){const a=n;if(n=n.replace(/@(\w*)/g,(r,o)=>{var d;const l=o||e||"";if(!l)return"";const c=(d=this.config.macros)==null?void 0:d[l];return!c||typeof c.linkItems!="string"?(b(`Macro "@${l}" not found in config.macros`),""):c.linkItems}),n===a)break;i++}return i>=10&&n.includes("@")&&b(`Macro expansion hit 10-round limit — possible circular reference in "${t.slice(0,60)}"`),n}tokenize(t){const e=[];let n=0;for(;n<t.length;){const i=t[n];if(/\s/.test(i)){n++;continue}if(i==="+"){e.push({type:"PLUS",value:"+"}),n++;continue}if(i==="|"){e.push({type:"PIPE",value:"|"}),n++;continue}if(i==="-"){e.push({type:"MINUS",value:"-"}),n++;continue}if(i===","){e.push({type:"COMMA",value:","}),n++;continue}if(i==="("){e.push({type:"LPAREN",value:"("}),n++;continue}if(i===")"){e.push({type:"RPAREN",value:")"}),n++;continue}if(i==="."){n++;let a="";for(;n<t.length&&/\w/.test(t[n]);)a+=t[n],n++;a&&e.push({type:"CLASS",value:a});continue}if(i==="#"){n++;let a="";for(;n<t.length&&/\w/.test(t[n]);)a+=t[n],n++;a&&e.push({type:"DOM_REF",value:a});continue}if(i==="/"){n++;let a="";for(;n<t.length&&t[n]!=="/";)a+=t[n],n++;let r="";if(n<t.length&&t[n]==="/")for(n++;n<t.length&&/[lutdka]/.test(t[n]);)r+=t[n],n++;a&&e.push({type:"REGEX",value:r?`${a}|${r}`:a});continue}if(i===":"){n++;let a="";for(;n<t.length&&t[n]!==":";)a+=t[n],n++;for(;n<t.length&&t[n]===":"&&(n++,!(n>=t.length||/[\s+|,()*/]/.test(t[n])));)for(a+="|";n<t.length&&t[n]!==":";)a+=t[n],n++;a&&e.push({type:"PROTOCOL",value:a});continue}if(i==="*"){n++;let a="";for(;n<t.length&&t[n]!=="*";)a+=t[n],n++;n<t.length&&t[n]==="*"&&n++,a&&e.push({type:"REFINER",value:a});continue}if(/\w/.test(i)){let a="";for(;n<t.length&&/\w/.test(t[n]);)a+=t[n],n++;e.push({type:"ITEM_ID",value:a});continue}n++}return e}parseQuery(t){let e=[],n=0;const i=this.parseSegment(t,n);for(e=i.ids,n=i.pos;n<t.length&&t[n].type==="COMMA"&&(n++,!(n>=t.length));){const a=this.parseSegment(t,n);e=[...e,...a.ids],n=a.pos}return e}parseSegment(t,e){if(e>=t.length)return{ids:[],pos:e};const n=e,i=this.parseTerm(t,e);let a=i.ids;e=i.pos;let r=e>n;for(;e<t.length;){const l=t[e];if(l.type!=="PLUS"&&l.type!=="PIPE"&&l.type!=="MINUS")break;const c=l.type;if(e++,e>=t.length)break;const d=this.parseTerm(t,e);if(e=d.pos,!r)a=d.ids,r=!0;else if(c==="PLUS"){const h=new Set(d.ids);a=a.filter(p=>h.has(p))}else if(c==="PIPE")a=[...new Set([...a,...d.ids])];else if(c==="MINUS"){const h=new Set(d.ids);a=a.filter(p=>!h.has(p))}}const o=[];for(;e<t.length&&t[e].type==="REFINER";){if(o.length>=10){b("Refiner limit exceeded (max 10 per expression). Skipping remaining refiners."),e++;continue}o.push(t[e]),e++}return o.length>0&&(a=this.applyRefiners(a,o)),{ids:a,pos:e}}parseTerm(t,e){if(e>=t.length)return{ids:[],pos:e};if(t[e].type==="LPAREN"){if(this.depth++,this.depth>32)return b("Parentheses nesting exceeds max depth (32). Ignoring nested group."),{ids:[],pos:t.length};e++;const n=this.parseSegment(t,e);return e=n.pos,e<t.length&&t[e].type==="RPAREN"&&e++,this.depth--,{ids:n.ids,pos:e}}return this.parseAtom(t,e)}parseAtom(t,e){if(e>=t.length)return{ids:[],pos:e};const n=t[e];switch(n.type){case"ITEM_ID":{const i=this.config.allLinks[n.value];return(!i||typeof i!="object")&&b(`Item ID "${n.value}" not found in config.allLinks`),{ids:i&&typeof i=="object"?[n.value]:[],pos:e+1}}case"CLASS":return{ids:this.searchByClass(n.value),pos:e+1};case"REGEX":{const[i,a]=n.value.includes("|")?n.value.split("|",2):[n.value,void 0];return{ids:this.searchByRegex(i,a),pos:e+1}}case"PROTOCOL":return{ids:this.resolveProtocol(n.value),pos:e+1};case"DOM_REF":return{ids:[],pos:e+1};default:return{ids:[],pos:e}}}}class Ie{constructor(t=5){u(this,"entries",new Map);u(this,"defaultTTL");this.defaultTTL=t}get(t){const e=this.entries.get(t);return e?Date.now()>e.expiry?(this.entries.delete(t),null):e.links:null}set(t,e,n){const i=n??this.defaultTTL;if(!(i<=0)){if(this.entries.size>=50&&!this.entries.has(t)){let a,r=1/0;for(const[o,l]of this.entries)l.expiry<r&&(r=l.expiry,a=o);a&&this.entries.delete(a)}this.entries.set(t,{links:e,expiry:Date.now()+i*60*1e3})}}clear(){this.entries.clear()}}const Se=/:([a-zA-Z]\w*(?::[^:\s+|,()*/]+)*):/g;let Wt=0;const Bt=s=>`__alap_gen_${s}_${Wt++}_${Date.now().toString(36)}`;class H{constructor(t){u(this,"config");u(this,"parser");u(this,"cache");u(this,"generatedIds",new Map);u(this,"injectedIds",new Set);this.config=t,this.parser=new _e(t),this.cache=new Ie}query(t,e){return this.parser.query(t,e)}getLinks(t){return t.map(e=>{const n=this.config.allLinks[e];return n?{id:e,...n}:null}).filter(e=>e!==null)}resolve(t,e){return this.getLinks(this.query(t,e))}async resolveAsync(t,e){await this.preResolve([t]);try{return this.getLinks(this.query(t,e))}finally{this.cleanupGenerated()}}async preResolve(t){var a;const e=new Set;for(const r of t){Se.lastIndex=0;let o;for(;(o=Se.exec(r))!==null;)e.add(o[1])}const n=[];for(const r of e){const o=r.split(":"),l=o[0],c=o.slice(1),d=(a=this.config.protocols)==null?void 0:a[l];if(!d)continue;const h=d.generate;if(typeof h!="function")continue;const p=this.getCacheTTL(d,c[0]),v=this.cache.get(r);if(v){this.injectLinks(r,l,v);continue}n.push({tokenValue:r,promise:this.callGenerate(h,c,l,r,p)})}const i=await Promise.allSettled(n.map(async({tokenValue:r,promise:o})=>{const l=await o;return{tokenValue:r,links:l}}));for(const r of i)if(r.status==="fulfilled"){const{tokenValue:o,links:l}=r.value,c=o.split(":")[0];this.injectLinks(o,c,l)}this.parser.setGeneratedIds(this.generatedIds)}updateConfig(t){this.config=t,this.parser.updateConfig(t),this.cleanupGenerated(),this.generatedIds.clear()}clearCache(){this.cache.clear()}async callGenerate(t,e,n,i,a){try{const r=await t(e,this.config),o=r.slice(0,200);return r.length>200&&b(`:${n}: returned ${r.length} links, capped at 200`),this.cache.set(i,o,a),o}catch(r){return b(`:${n}: generate handler failed: ${r instanceof Error?r.message:String(r)}`),[]}}injectLinks(t,e,n){const i=[];for(const a of n){const r=Bt(e);this.config.allLinks[r]=a,this.injectedIds.add(r),i.push(r)}this.generatedIds.set(t.replace(/:/g,"|"),i)}cleanupGenerated(){for(const t of this.injectedIds)delete this.config.allLinks[t];this.injectedIds.clear(),this.generatedIds.clear(),this.parser.setGeneratedIds(new Map)}getCacheTTL(t,e){if(e&&t.keys){const n=t.keys[e];if(n&&"cache"in n)return n.cache}if("cache"in t&&typeof t.cache=="number")return t.cache}}const jt=new Set(["__proto__","constructor","prototype"]);function Z(s,t){for(const e of Object.keys(t))jt.has(e)||(s[e]=t[e]);return s}function Ft(...s){const t={allLinks:{}};for(const e of s)e.settings&&(t.settings=Z({...t.settings},e.settings)),e.macros&&(t.macros=Z({...t.macros},e.macros)),e.searchPatterns&&(t.searchPatterns=Z({...t.searchPatterns},e.searchPatterns)),Z(t.allLinks,e.allLinks);return t}function M(s){if(!s)return s;const t=s.replace(/[\x00-\x1f\x7f]/g,"").trim();return/^(javascript|data|vbscript|blob)\s*:/i.test(t)?"about:blank":s}function ce(s,t){const e=M(s);if(e==="about:blank"||!e)return e;const n=t??["http","https"],i=e.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*)\s*:/);if(i){const a=i[1].toLowerCase();if(!n.includes(a))return"about:blank"}return e}function Kt(s){if(!s||typeof s!="object")throw new Error("Invalid config: expected an object");const t=s;if(!t.allLinks||typeof t.allLinks!="object"||Array.isArray(t.allLinks))throw new Error("Invalid config: allLinks must be a non-null object");const e=new Set(["__proto__","constructor","prototype"]),n=t.allLinks,i={};for(const c of Object.keys(n)){if(e.has(c))continue;if(c.includes("-")){b(`validateConfig: skipping allLinks["${c}"] — hyphens are not allowed in item IDs. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);continue}const d=n[c];if(!d||typeof d!="object"||Array.isArray(d)){b(`validateConfig: skipping allLinks["${c}"] — not a valid link object`);continue}const h=d;if(typeof h.url!="string"){b(`validateConfig: skipping allLinks["${c}"] — missing or invalid url`);continue}const p=M(h.url),v=typeof h.image=="string"?M(h.image):void 0;let f;h.tags!==void 0&&(Array.isArray(h.tags)?f=h.tags.filter(E=>typeof E!="string"?!1:E.includes("-")?(b(`validateConfig: allLinks["${c}"] — stripping tag "${E}" (hyphens not allowed in tags). Use underscores instead.`),!1):!0):b(`validateConfig: allLinks["${c}"].tags is not an array — ignoring`));const m={url:p};if(typeof h.label=="string"&&(m.label=h.label),f!==void 0&&(m.tags=f),typeof h.cssClass=="string"&&(m.cssClass=h.cssClass),v!==void 0?m.image=v:typeof h.image=="string"&&(m.image=h.image),typeof h.altText=="string"&&(m.altText=h.altText),typeof h.targetWindow=="string"&&(m.targetWindow=h.targetWindow),typeof h.description=="string"&&(m.description=h.description),typeof h.thumbnail=="string"&&(m.thumbnail=M(h.thumbnail)),Array.isArray(h.hooks)&&(m.hooks=h.hooks.filter(E=>typeof E=="string")),typeof h.guid=="string"&&(m.guid=h.guid),h.createdAt!==void 0&&(m.createdAt=h.createdAt),h.meta&&typeof h.meta=="object"&&!Array.isArray(h.meta)){const E=h.meta,w={};for(const[x,T]of Object.entries(E))typeof T=="string"&&/url$/i.test(x)?w[x]=M(T):w[x]=T;m.meta=w}i[c]=m}let a;if(t.settings&&typeof t.settings=="object"&&!Array.isArray(t.settings)){const c=t.settings;a={};for(const d of Object.keys(c))e.has(d)||(a[d]=c[d])}let r;if(t.macros&&typeof t.macros=="object"&&!Array.isArray(t.macros)){const c=t.macros;r={};for(const d of Object.keys(c)){if(e.has(d))continue;if(d.includes("-")){b(`validateConfig: skipping macro "${d}" — hyphens are not allowed in macro names. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);continue}const h=c[d];h&&typeof h=="object"&&typeof h.linkItems=="string"?r[d]=h:b(`validateConfig: skipping macro "${d}" — invalid shape`)}}let o;if(t.searchPatterns&&typeof t.searchPatterns=="object"&&!Array.isArray(t.searchPatterns)){const c=t.searchPatterns;o={};for(const d of Object.keys(c)){if(e.has(d))continue;if(d.includes("-")){b(`validateConfig: skipping searchPattern "${d}" — hyphens are not allowed in pattern keys. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);continue}const h=c[d];if(typeof h=="string"){const p=le(h);p.safe?o[d]=h:b(`validateConfig: removing searchPattern "${d}" — ${p.reason}`);continue}if(h&&typeof h=="object"&&typeof h.pattern=="string"){const p=h.pattern,v=le(p);v.safe?o[d]=h:b(`validateConfig: removing searchPattern "${d}" — ${v.reason}`);continue}b(`validateConfig: skipping searchPattern "${d}" — invalid shape`)}}const l={allLinks:i};return a&&(l.settings=a),r&&(l.macros=r),o&&(l.searchPatterns=o),l}const J="menu",Ne="lightbox",$e="lens";class qt{constructor(){u(this,"instances",new Map)}subscribe(t,e,n){return this.instances.set(t,{type:e,close:n}),()=>{this.instances.delete(t)}}notifyOpen(t){const e=this.instances.get(t);if(e)for(const[n,i]of this.instances)n!==t&&i.type===e.type&&i.close()}closeAll(t){for(const[,e]of this.instances)(!t||e.type===t)&&e.close()}get size(){return this.instances.size}has(t){return this.instances.has(t)}destroy(){this.instances.clear()}}let de=null;function z(){return de||(de=new qt),de}function Re(s,t={}){const e=t.listType??"ul",n=document.createElement(e);if(t.listAttributes)for(const[a,r]of Object.entries(t.listAttributes))n.setAttribute(a,r);const i=t.maxVisibleItems??0;i>0&&s.length>i&&(n.style.maxHeight=`${i*2.25}rem`,n.style.overflowY="auto");for(const a of s){const r=document.createElement("li");r.setAttribute("role","none");const o=a.cssClass?`alapListElem ${a.cssClass}`:"alapListElem";if(r.className=o,t.liAttributes)for(const[d,h]of Object.entries(t.liAttributes))r.setAttribute(d,h);const l=document.createElement("a");if(l.setAttribute("role","menuitem"),l.setAttribute("tabindex","-1"),l.href=M(a.url),l.target=a.targetWindow??t.defaultTargetWindow??"fromAlap",t.aAttributes)for(const[d,h]of Object.entries(t.aAttributes))l.setAttribute(d,h);const c=a.hooks??t.globalHooks;if(c&&c.length>0&&l.setAttribute("data-alap-hooks",c.join(" ")),a.guid&&l.setAttribute("data-alap-guid",a.guid),a.thumbnail&&l.setAttribute("data-alap-thumbnail",a.thumbnail),a.image){const d=document.createElement("img");if(d.src=M(a.image),d.alt=a.altText??`image for ${a.id}`,t.imgAttributes)for(const[h,p]of Object.entries(t.imgAttributes))d.setAttribute(h,p);l.appendChild(d)}else l.textContent=a.label??a.id;r.appendChild(l),n.appendChild(r)}return n}function Me(s,t,e,n,i){if(t.length===0)return!1;const a=t.indexOf(e);switch(s.key){case"ArrowDown":{s.preventDefault();const r=a<t.length-1?a+1:0;return t[r].focus(),t[r].scrollIntoView({block:"nearest"}),!0}case"ArrowUp":{s.preventDefault();const r=a>0?a-1:t.length-1;return t[r].focus(),t[r].scrollIntoView({block:"nearest"}),!0}case"ArrowRight":{const r=e,o=r==null?void 0:r.getAttribute("data-alap-hooks");return o!=null&&o.split(" ").includes("item-context")&&(i!=null&&i.onItemContext),!1}case"ArrowLeft":{const r=e,o=r==null?void 0:r.getAttribute("data-alap-hooks");return o!=null&&o.split(" ").includes("item-context")&&(i!=null&&i.onItemContextDismiss),!1}case"Home":return s.preventDefault(),t[0].focus(),t[0].scrollIntoView({block:"nearest"}),!0;case"End":return s.preventDefault(),t[t.length-1].focus(),t[t.length-1].scrollIntoView({block:"nearest"}),!0;case"Escape":return n(),!0;case"Tab":return n(),!0;default:return!1}}class De{constructor(t,e){u(this,"timerId",0);u(this,"timeout");u(this,"callback");this.timeout=t,this.callback=e}start(){this.stop(),this.timerId=window.setTimeout(this.callback,this.timeout)}stop(){this.timerId&&(clearTimeout(this.timerId),this.timerId=0)}setTimeout(t){this.timeout=t}}function Pe(s,t){const e=s.getAttribute("data-alap-existing");return e==="prepend"||e==="append"||e==="ignore"?e:t??"prepend"}function Oe(s,t,e){if(e==="ignore")return s;const n=t.getAttribute("href");if(!n||n==="#"||n==="")return s;let i;try{const r=new URL(n,window.location.href);i=r.hostname+(r.pathname!=="/"?r.pathname:"")}catch{i=n}const a={id:"_existing",label:i,url:n};return e==="prepend"?[a,...s]:[...s,a]}const Vt=new Set(["n","ne","e","se","s","sw","w","nw","c"]),Xt=new Set(["place","flip","clamp"]),Ue={place:0,flip:1,clamp:2};function D(s){let t=null,e=null;for(const n of s.split(",")){const i=n.trim().toLowerCase().replace(/[^a-z]/g,"");if(i){if(Vt.has(i)&&!t)t=i.toUpperCase();else if(Xt.has(i)){const a=i;(!e||Ue[a]>Ue[e])&&(e=a)}}}return{compass:t??"SE",strategy:e??"flip"}}const he={N:["S","NE","NW","SE","SW","E","W","C"],NE:["SW","SE","NW","S","N","E","W","C"],E:["W","SE","NE","SW","NW","S","N","C"],SE:["NW","NE","SW","S","N","E","W","C"],S:["N","SE","SW","NE","NW","E","W","C"],SW:["NE","NW","SE","S","N","W","E","C"],W:["E","NW","SW","NE","SE","N","S","C"],NW:["SE","SW","NE","N","S","W","E","C"],C:["SE","NE","SW","NW","S","N","E","W"]};function ue(s,t,e,n){const i=t.left+t.width/2,a=t.top+t.height/2;switch(s){case"N":return{x:i-e.width/2,y:t.top-n-e.height};case"NE":return{x:t.left,y:t.top-n-e.height};case"E":return{x:t.right+n,y:a-e.height/2};case"SE":return{x:t.left,y:t.bottom+n};case"S":return{x:i-e.width/2,y:t.bottom+n};case"SW":return{x:t.right-e.width,y:t.bottom+n};case"W":return{x:t.left-n-e.width,y:a-e.height/2};case"NW":return{x:t.right-e.width,y:t.top-n-e.height};case"C":return{x:i-e.width/2,y:a-e.height/2}}}function He(s,t,e,n,i){return s>=i&&t>=i&&s+e.width<=n.width-i&&t+e.height<=n.height-i}function Yt(s,t,e,n,i){const a=n.width-2*i,r=n.height-2*i,o=Math.min(e.width,a),l=Math.min(e.height,r),c=Math.max(i,Math.min(s,n.width-i-o)),d=Math.max(i,Math.min(t,n.height-i-l));return{x:c,y:d,effectiveWidth:o,effectiveHeight:l}}function Q(s){const t=s.placement??"SE",e=s.strategy??"flip",n=s.gap??4,i=s.padding??8,{triggerRect:a,menuSize:r,viewport:o}=s,l=ue(t,a,r,n);if(e==="place")return{placement:t,x:l.x,y:l.y,scrollY:!1};if(He(l.x,l.y,r,o,i))return{placement:t,x:l.x,y:l.y,scrollY:!1};for(const p of he[t]){const v=ue(p,a,r,n);if(He(v.x,v.y,r,o,i))return{placement:p,x:v.x,y:v.y,scrollY:!1}}if(e==="flip")return{placement:t,x:l.x,y:l.y,scrollY:!1};const c=[t,...he[t]];let d=-1,h={placement:t,x:i,y:i,maxWidth:o.width-2*i,maxHeight:o.height-2*i,scrollY:!0};for(const p of c){const v=ue(p,a,r,n),f=Yt(v.x,v.y,r,o,i),m=f.effectiveWidth*f.effectiveHeight;if(m>d){d=m;const E=f.effectiveWidth<r.width,w=f.effectiveHeight<r.height;h={placement:p,x:f.x,y:f.y,maxWidth:E?f.effectiveWidth:void 0,maxHeight:w?f.effectiveHeight:void 0,scrollY:w}}}return h}const Gt=new Set(Object.keys(he));function ee(s,t){const e=t.toUpperCase();if(Gt.has(e)){for(const n of Array.from(s.classList))n.startsWith("alap-placed-")&&s.classList.remove(n);s.classList.add(`alap-placed-${e.toLowerCase()}`)}}function ze(s){for(const t of Array.from(s.classList))t.startsWith("alap-placed-")&&s.classList.remove(t)}function We(s,t){const e=new IntersectionObserver(n=>{for(const i of n)i.intersectionRatio===0&&t()},{threshold:[0]});return e.observe(s),e}const Zt=3,Jt="Escape",Qt="--alap-coordinator-transition",en=300,tn=100,Be="alap_content",je="alap_thumbnail",pe="alap_vt_back",nn="(prefers-reduced-motion: reduce)";class an{constructor(t={}){u(this,"renderers",new Map);u(this,"stack",[]);u(this,"lastPayload",new Map);u(this,"transitioning",!1);u(this,"reduceMotion");u(this,"useViewTransitions");u(this,"motionQuery",null);u(this,"boundKeydown",null);this.reduceMotion=t.reduceMotion??!0,this.useViewTransitions=t.viewTransitions??!0,this.reduceMotion&&typeof window<"u"&&(this.motionQuery=window.matchMedia(nn))}register(t){this.renderers.set(t.rendererType,t)}unregister(t){this.renderers.delete(t),this.lastPayload.delete(t)}transitionTo(t,e){if(this.transitioning)return;const n=this.renderers.get(t);if(!n)return;const i=this.snapshotCurrent();i&&(this.stack.length>=Zt&&this.stack.shift(),this.stack.push(i)),this.performTransition(n,e,!1)}back(){if(this.transitioning)return;const t=this.stack.pop();if(!t){this.closeAll();return}const e=this.renderers.get(t.renderer);if(!e){this.closeAll();return}const n={links:t.links,triggerElement:t.triggerElement??void 0,initialIndex:t.activeIndex};this.performTransition(e,n,!0)}closeAll(){for(const t of this.renderers.values())t.isOpen&&t.close();this.stack=[],this.lastPayload.clear()}get depth(){return this.stack.length}get isTransitioning(){return this.transitioning}hasOpenRenderer(){for(const t of this.renderers.values())if(t.isOpen)return!0;return!1}bindKeyboard(){this.boundKeydown||(this.boundKeydown=t=>this.onKeydown(t),document.addEventListener("keydown",this.boundKeydown,{capture:!0}))}unbindKeyboard(){this.boundKeydown&&(document.removeEventListener("keydown",this.boundKeydown,{capture:!0}),this.boundKeydown=null)}destroy(){this.closeAll(),this.unbindKeyboard(),this.renderers.clear()}onKeydown(t){t.key===Jt&&this.hasOpenRenderer()&&(t.preventDefault(),t.stopImmediatePropagation(),this.back())}snapshotCurrent(){for(const[t,e]of this.renderers)if(e.isOpen){const n=this.lastPayload.get(t);return{renderer:t,links:(n==null?void 0:n.links)??[],activeIndex:(n==null?void 0:n.initialIndex)??0,triggerElement:(n==null?void 0:n.triggerElement)??null}}return null}get shouldReduceMotion(){var t;return this.reduceMotion&&(((t=this.motionQuery)==null?void 0:t.matches)??!1)}supportsViewTransitions(){return this.useViewTransitions&&typeof document<"u"&&"startViewTransition"in document}performTransition(t,e,n){this.transitioning=!0,this.lastPayload.set(t.rendererType,e);const i=()=>{for(const r of this.renderers.values())r.isOpen&&r!==t&&r.close()},a=()=>{t.openWith(e)};if(this.shouldReduceMotion||!this.supportsViewTransitions()){i(),a(),this.transitioning=!1;return}this.performViewTransition(i,a,n)}performViewTransition(t,e,n){const i=this.getActiveContainer();if(i){i.style.viewTransitionName=Be;const l=i.querySelector("img");l&&(l.style.viewTransitionName=je)}n?document.documentElement.classList.add(pe):document.documentElement.classList.remove(pe);const a=document.startViewTransition(()=>{t(),e();const l=this.getActiveContainer();if(l){l.style.viewTransitionName=Be;const c=l.querySelector("img");c&&(c.style.viewTransitionName=je)}}),r=()=>{document.documentElement.classList.remove(pe),this.transitioning=!1};a.finished.then(r).catch(r);const o=this.getViewTransitionDuration();setTimeout(()=>{this.transitioning&&r()},o+tn)}getActiveContainer(){return document.querySelector(".alap-lens-overlay")??document.querySelector(".alap-lightbox-overlay")??document.getElementById("alapelem")}getViewTransitionDuration(){const t=document.documentElement,e=getComputedStyle(t).getPropertyValue(Qt),n=parseFloat(e)*1e3;return Number.isFinite(n)&&n>0?n:en}}const me=new Map,ge=new Map,te="_default";function Fe(s,t=te){ge.set(t,s),me.set(t,new H(s))}function rn(s,t=te){const e=me.get(t);e?(e.updateConfig(s),ge.set(t,s)):Fe(s,t)}function W(s=te){return me.get(s)}function Ke(s=te){return ge.get(s)}class sn{constructor(t,e={}){u(this,"rendererType",J);u(this,"engine");u(this,"config");u(this,"container",null);u(this,"timer");u(this,"selector");u(this,"activeTrigger",null);u(this,"hooks");u(this,"handleBodyClick");u(this,"handleBodyKeydown");u(this,"handleMenuLeave");u(this,"handleMenuEnter");u(this,"handleMenuKeydown");u(this,"handleScroll",null);u(this,"lastPlacement",null);u(this,"menuNaturalSize",null);u(this,"intersectionObserver",null);u(this,"openedViaKeyboard",!1);u(this,"instanceId");u(this,"unsubscribeCoordinator",null);var i;this.config=t,this.engine=new H(t),this.selector=e.selector??".alap",this.hooks={onTriggerHover:e.onTriggerHover,onTriggerContext:e.onTriggerContext,onItemHover:e.onItemHover,onItemContext:e.onItemContext};const n=e.menuTimeout??((i=t.settings)==null?void 0:i.menuTimeout)??5e3;this.timer=new De(n,()=>this.closeMenu()),this.instanceId=`alapui_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,this.handleBodyClick=this.onBodyClick.bind(this),this.handleBodyKeydown=this.onBodyKeydown.bind(this),this.handleMenuLeave=()=>this.timer.start(),this.handleMenuEnter=()=>this.timer.stop(),this.handleMenuKeydown=this.onMenuKeydown.bind(this),this.init()}init(){this.createContainer(),this.bindTriggers(),this.bindGlobalEvents();const t=z();this.unsubscribeCoordinator=t.subscribe(this.instanceId,J,()=>this.closeMenu())}createContainer(){const t=document.getElementById("alapelem");t&&t.remove(),this.container=document.createElement("div"),this.container.id="alapelem",this.container.setAttribute("role","menu"),this.container.style.display="none",document.body.appendChild(this.container)}bindTriggers(){const t=document.querySelectorAll(this.selector);t.length===0&&b(`No elements found for selector "${this.selector}"`);for(const e of t)e.removeEventListener("click",this.onTriggerClick),e.addEventListener("click",this.onTriggerClick.bind(this)),e.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),this.openedViaKeyboard=!0,e.click())}),this.hooks.onTriggerHover&&e.addEventListener("mouseenter",()=>{const i={query:e.getAttribute("data-alap-linkitems")??"",anchorId:e.id||void 0};this.hooks.onTriggerHover(i),e.dispatchEvent(new CustomEvent("alap:trigger-hover",{detail:i,bubbles:!0}))}),this.hooks.onTriggerContext&&e.addEventListener("contextmenu",n=>{const a={query:e.getAttribute("data-alap-linkitems")??"",anchorId:e.id||void 0,event:n};this.hooks.onTriggerContext(a),e.dispatchEvent(new CustomEvent("alap:trigger-context",{detail:a,bubbles:!0}))}),e.setAttribute("role","button"),e.setAttribute("aria-haspopup","true"),e.setAttribute("aria-expanded","false"),e.getAttribute("tabindex")||e.setAttribute("tabindex","0")}bindGlobalEvents(){document.addEventListener("click",this.handleBodyClick),document.addEventListener("keydown",this.handleBodyKeydown)}onTriggerClick(t){var o;t.preventDefault(),t.stopPropagation();const e=t.currentTarget,n=e.getAttribute("data-alap-linkitems");if(!n)return;const i=e.id||void 0;let a=this.engine.resolve(n,i);if(a.length===0)return;const r=Pe(e,(o=this.config.settings)==null?void 0:o.existingUrl);a=Oe(a,e,r),this.activeTrigger&&this.activeTrigger.setAttribute("aria-expanded","false"),this.activeTrigger=e,e.setAttribute("aria-expanded","true"),this.renderMenu(a,e,t)}getTriggerRect(t,e){if(t.tagName.toLowerCase()==="img"){let n=e.clientX,i=e.clientY;if(n===0&&i===0){const a=t.getBoundingClientRect();n=a.left+a.width/2,i=a.top+a.height/2}return{top:i,left:n,bottom:i,right:n,width:0,height:0}}return t.getBoundingClientRect()}getPlacement(t){var i;const e=t.getAttribute("data-alap-placement");if(e)return D(e);const n=(i=this.config.settings)==null?void 0:i.placement;return D(typeof n=="string"?n:"SE")}renderMenu(t,e,n){var c,d,h,p,v,f;if(!this.container)return;const i=e.id||"";this.container.className="alapelem",i&&this.container.classList.add(`alap_${i}`),i&&this.container.setAttribute("aria-labelledby",i);const a=((c=this.config.settings)==null?void 0:c.listType)??"ul",r=((d=this.config.settings)==null?void 0:d.maxVisibleItems)??10,o=Re(t,{listType:a,maxVisibleItems:r,defaultTargetWindow:(h=this.config.settings)==null?void 0:h.targetWindow});if(this.container.innerHTML="",this.container.appendChild(o),this.hooks.onItemHover||this.hooks.onItemContext){const m=e.getAttribute("data-alap-linkitems")??"";o.querySelectorAll('a[role="menuitem"]').forEach((w,x)=>{const T=t[x];this.hooks.onItemHover&&w.addEventListener("mouseenter",()=>{const A={id:T.id,link:T,query:m};this.hooks.onItemHover(A),w.dispatchEvent(new CustomEvent("alap:item-hover",{detail:A,bubbles:!0}))}),this.hooks.onItemContext&&w.addEventListener("contextmenu",A=>{const L={id:T.id,link:T,query:m,event:A};this.hooks.onItemContext(L),w.dispatchEvent(new CustomEvent("alap:item-context",{detail:L,bubbles:!0}))})})}if(this.container.addEventListener("mouseleave",this.handleMenuLeave),this.container.addEventListener("mouseenter",this.handleMenuEnter),this.container.addEventListener("keydown",this.handleMenuKeydown),((p=this.config.settings)==null?void 0:p.viewportAdjust)!==!1){this.container.style.cssText=`
        position: fixed;
        visibility: hidden;
        top: -9999px;
        left: -9999px;
        z-index: 10;
        display: block;
        max-height: none;
        overflow: visible;
      `;const m=this.container.getBoundingClientRect();this.menuNaturalSize={width:m.width,height:m.height};const E=this.getTriggerRect(e,n),w=this.getPlacement(e),x=((v=this.config.settings)==null?void 0:v.placementGap)??4,T=((f=this.config.settings)==null?void 0:f.viewportPadding)??8,A=Q({triggerRect:E,menuSize:this.menuNaturalSize,viewport:{width:window.innerWidth,height:window.innerHeight},placement:w.compass,strategy:w.strategy,gap:x,padding:T});if(this.lastPlacement=A,ee(this.container,A.placement),this.container.style.cssText=`
        position: absolute;
        display: block;
        z-index: 10;
        top: ${A.y+window.scrollY}px;
        left: ${A.x+window.scrollX}px;
        overflow-x: clip;
      `,A.maxHeight!=null){this.container.style.maxHeight=`${A.maxHeight}px`,this.container.style.overflowY="auto";const L=this.container.querySelector("ul, ol");L&&(L.style.maxHeight="none",L.style.overflowY="")}A.maxWidth!=null&&(this.container.style.maxWidth=`${A.maxWidth}px`),A.scrollY&&this.startScrollTracking(e,n)}else{const m=this.getTriggerRect(e,n);this.container.style.cssText=`
        position: absolute;
        display: block;
        z-index: 10;
        top: ${m.bottom+window.scrollY}px;
        left: ${m.left+window.scrollX}px;
      `}if(this.stopIntersectionObserver(),this.activeTrigger&&(this.intersectionObserver=We(this.activeTrigger,()=>this.closeMenu())),z().notifyOpen(this.instanceId),this.openedViaKeyboard){const m=this.container.querySelector('a[role="menuitem"]');m&&m.focus()}this.openedViaKeyboard=!1,this.timer.stop(),this.timer.start()}startScrollTracking(t,e){var r,o;this.stopScrollTracking();const n=((r=this.config.settings)==null?void 0:r.placementGap)??4,i=((o=this.config.settings)==null?void 0:o.viewportPadding)??8,a=this.getPlacement(t);this.handleScroll=()=>{if(!this.container||this.container.style.display==="none"||!this.menuNaturalSize)return;const l=this.getTriggerRect(t,e),c=Q({triggerRect:l,menuSize:this.menuNaturalSize,viewport:{width:window.innerWidth,height:window.innerHeight},placement:a.compass,strategy:a.strategy,gap:n,padding:i});this.lastPlacement=c,ee(this.container,c.placement),this.container.style.top=`${c.y+window.scrollY}px`,this.container.style.left=`${c.x+window.scrollX}px`,c.maxHeight!=null?(this.container.style.maxHeight=`${c.maxHeight}px`,this.container.style.overflowY="auto"):(this.container.style.maxHeight="",this.container.style.overflowY="")},window.addEventListener("scroll",this.handleScroll,{passive:!0})}stopScrollTracking(){this.handleScroll&&(window.removeEventListener("scroll",this.handleScroll),this.handleScroll=null)}stopIntersectionObserver(){this.intersectionObserver&&(this.intersectionObserver.disconnect(),this.intersectionObserver=null)}onMenuKeydown(t){if(!this.container)return;const e=Array.from(this.container.querySelectorAll('a[role="menuitem"]'));Me(t,e,document.activeElement,()=>this.closeMenu())}onBodyClick(t){if(!this.container)return;t.target.closest("#alapelem")||this.closeMenu()}onBodyKeydown(t){t.key==="Escape"&&this.closeMenu()}closeMenu(){this.container&&(this.container.style.display="none",this.container.style.maxHeight="",this.container.style.maxWidth="",this.container.style.overflowY="",this.container.style.overflowX="",ze(this.container),this.lastPlacement=null,this.menuNaturalSize=null,this.stopScrollTracking(),this.stopIntersectionObserver(),this.timer.stop(),this.activeTrigger&&(this.activeTrigger.setAttribute("aria-expanded","false"),this.activeTrigger.focus(),this.activeTrigger=null))}get isOpen(){var t;return((t=this.container)==null?void 0:t.style.display)!=="none"}close(){const t=this.activeTrigger;return this.closeMenu(),t}openWith(t){const e=t.links;if(e.length===0)return;this.activeTrigger&&this.activeTrigger.setAttribute("aria-expanded","false");const n=t.triggerElement??null;this.activeTrigger=n,n&&n.setAttribute("aria-expanded","true");const i=n==null?void 0:n.getBoundingClientRect(),a={clientX:(i==null?void 0:i.left)??0,clientY:(i==null?void 0:i.bottom)??0};this.renderMenu(e,n??document.body,a)}refresh(){this.bindTriggers()}getEngine(){return this.engine}updateConfig(t){var e;this.config=t,this.engine.updateConfig(t),this.timer.setTimeout(((e=t.settings)==null?void 0:e.menuTimeout)??5e3),this.refresh()}destroy(){this.closeMenu(),document.removeEventListener("click",this.handleBodyClick),document.removeEventListener("keydown",this.handleBodyKeydown),this.unsubscribeCoordinator&&(this.unsubscribeCoordinator(),this.unsubscribeCoordinator=null),this.container&&(this.container.remove(),this.container=null)}}const on=`
  :host {
    display: inline;
    position: relative;
  }

  ::slotted(*) {
    cursor: pointer;
  }

  /* --- Menu container --- */

  .menu {
    display: none;
    position: absolute;
    z-index: var(--alap-z-index, 10);
    top: 100%;
    left: 0;
    margin-top: var(--alap-gap, 0.5rem);
    min-width: var(--alap-min-width, 200px);
    max-width: var(--alap-max-width, none);
    background: var(--alap-bg, #ffffff);
    border: var(--alap-border-width, 1px) solid var(--alap-border, #e5e7eb);
    border-radius: var(--alap-radius, 6px);
    font-family: var(--alap-font, inherit);

    /* Corner shape — shorthand (1–4 values, like border-radius) */
    corner-shape: var(--alap-corner-shape, round);

    /* Shadows & filters */
    box-shadow: var(--alap-shadow, 0 4px 12px rgba(0, 0, 0, 0.1));
    filter: var(--alap-drop-shadow);

    /* Appearance */
    opacity: var(--alap-opacity, 1);
    backdrop-filter: var(--alap-backdrop);
    transition: var(--alap-menu-transition);
  }

  .menu[aria-hidden="false"] {
    display: block;
  }

  .menu:hover {
    box-shadow: var(--alap-menu-hover-shadow, var(--alap-shadow, 0 4px 12px rgba(0, 0, 0, 0.1)));
    filter: var(--alap-menu-hover-drop-shadow, var(--alap-drop-shadow));
  }

  /* --- List --- */

  ul, ol {
    list-style: none;
    margin: 0;
    padding: var(--alap-menu-padding, 0.25rem 0);
    /* Inherit the menu's shape so hover backgrounds clip to corners.
       overflow:hidden here clips child content (hover bg) without
       affecting .menu's own box-shadow. */
    border-radius: inherit;
    corner-shape: inherit;
    overflow: hidden;
    scrollbar-width: var(--alap-scrollbar-width, thin);
    scrollbar-color: var(--alap-scrollbar-color, #cbd5e1 transparent);
  }

  ul::-webkit-scrollbar, ol::-webkit-scrollbar {
    width: 6px;
  }

  ul::-webkit-scrollbar-thumb, ol::-webkit-scrollbar-thumb {
    background: var(--alap-scrollbar-thumb, #cbd5e1);
    border-radius: 3px;
  }

  ul::-webkit-scrollbar-track, ol::-webkit-scrollbar-track {
    background: var(--alap-scrollbar-track, transparent);
  }

  /* --- Items --- */

  li {
    margin: 0;
    padding: 0;
    border: var(--alap-item-border);
    border-radius: var(--alap-item-border-radius);
  }

  li + li {
    margin-top: var(--alap-item-gap, 0);
  }

  /* --- Links — base --- */

  a {
    display: block;
    padding: var(--alap-padding, 0.5rem 1rem);
    color: var(--alap-text, #1a1a1a);
    font-size: var(--alap-font-size, 0.9rem);
    font-family: var(--alap-font, inherit);
    font-weight: var(--alap-font-weight);
    letter-spacing: var(--alap-letter-spacing);
    line-height: var(--alap-line-height);
    text-decoration: var(--alap-text-decoration, none);
    text-transform: var(--alap-text-transform);
    text-align: var(--alap-text-align);
    text-shadow: var(--alap-text-shadow);
    text-overflow: var(--alap-text-overflow);
    overflow: var(--alap-overflow);
    white-space: var(--alap-white-space);
    cursor: var(--alap-cursor, pointer);
    transition: var(--alap-transition);
  }

  /* --- Links — hover --- */

  a:hover {
    background: var(--alap-hover-bg, #eff6ff);
    color: var(--alap-hover-text, #2563eb);
    box-shadow: var(--alap-hover-shadow);
    text-shadow: var(--alap-hover-text-shadow, var(--alap-text-shadow));
    text-decoration: var(--alap-hover-text-decoration, var(--alap-text-decoration, none));
    font-weight: var(--alap-hover-font-weight, var(--alap-font-weight));
    opacity: var(--alap-hover-opacity);
    transform: var(--alap-hover-transform);
    border: var(--alap-hover-border);
  }

  /* Dim non-hovered items when --alap-dim-unhovered is set */
  ul:hover a:not(:hover):not(:focus-visible),
  ol:hover a:not(:hover):not(:focus-visible) {
    opacity: var(--alap-dim-unhovered);
  }

  /* TODO: --alap-dim-adjacent — dim only the items immediately before
     and after the hovered item. Needs investigation — :has() with
     adjacent combinators targeting nested elements in shadow DOM
     is not working as expected. */


  /* --- Links — focus --- */

  a:focus-visible {
    background: var(--alap-focus-bg, var(--alap-hover-bg, #eff6ff));
    color: var(--alap-focus-text, var(--alap-hover-text, #2563eb));
    outline: 2px solid var(--alap-focus-ring, #2563eb);
    outline-offset: -2px;
    box-shadow: var(--alap-focus-shadow);
    text-shadow: var(--alap-focus-text-shadow, var(--alap-text-shadow));
    border: var(--alap-focus-border);
  }

  a:focus:not(:focus-visible) {
    outline: none;
  }

  /* --- Images --- */

  img {
    max-height: var(--alap-img-max-height, 4rem);
    border-radius: var(--alap-img-radius, 3px);
  }
`;class qe extends HTMLElement{constructor(){super();u(this,"menu",null);u(this,"timer",null);u(this,"isOpen",!1);u(this,"openedViaKeyboard",!1);u(this,"scrollHandler",null);u(this,"lastPlacement",null);u(this,"menuNaturalSize",null);u(this,"intersectionObserver",null);u(this,"instanceId");u(this,"unsubscribeCoordinator",null);u(this,"onTriggerClick",e=>{var h;const n=e.composedPath();if(this.menu&&n.includes(this.menu))return;if(e.preventDefault(),e.stopPropagation(),this.isOpen){this.closeMenu();return}const i=this.getAttribute("query");if(!i)return;const a=this.getEngine();if(!a){b(`<alap-link>: no config registered for "${this.getAttribute("config")??"_default"}". Call registerConfig() first.`);return}const r=this.id||void 0;let o=a.resolve(i,r);if(o.length===0)return;const l=this.getConfig(),c=Pe(this,(h=l==null?void 0:l.settings)==null?void 0:h.existingUrl),d=this.getAttribute("href")?this:this.querySelector("a[href]");d&&(o=Oe(o,d,c)),this.renderMenu(o),this.bindItemHooks(o),this.openMenu()});u(this,"onTriggerKeydown",e=>{this.menu&&e.composedPath().includes(this.menu)||(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.openedViaKeyboard=!0,this.click())});u(this,"onMenuKeydown",e=>{var i;if(!this.menu)return;const n=Array.from(this.menu.querySelectorAll('a[role="menuitem"]'));Me(e,n,((i=this.shadowRoot)==null?void 0:i.activeElement)??null,()=>this.closeMenu())});u(this,"onTriggerHover",()=>{const n={query:this.getAttribute("query")??"",anchorId:this.id||void 0};this.dispatchEvent(new CustomEvent("alap:trigger-hover",{detail:n,bubbles:!0,composed:!0}))});u(this,"onTriggerContext",e=>{const i={query:this.getAttribute("query")??"",anchorId:this.id||void 0,event:e};this.dispatchEvent(new CustomEvent("alap:trigger-context",{detail:i,bubbles:!0,composed:!0}))});u(this,"onDocumentClick",e=>{this.isOpen&&(e.composedPath().includes(this)||this.closeMenu())});u(this,"onDocumentKeydown",e=>{e.key==="Escape"&&this.isOpen&&this.closeMenu()});u(this,"onMenuLeave",()=>{var e;(e=this.timer)==null||e.start()});u(this,"onMenuEnter",()=>{var e;(e=this.timer)==null||e.stop()});this.instanceId=`wc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;const e=this.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=on,e.appendChild(n);const i=document.createElement("slot");e.appendChild(i),this.menu=document.createElement("div"),this.menu.classList.add("menu"),this.menu.setAttribute("role","menu"),this.menu.setAttribute("aria-hidden","true"),this.menu.setAttribute("part","menu"),e.appendChild(this.menu)}static get observedAttributes(){return["query","config","href","placement"]}connectedCallback(){this.timer=new De(this.getMenuTimeout(),()=>this.closeMenu());const e=z();this.unsubscribeCoordinator=e.subscribe(this.instanceId,J,()=>this.closeMenu()),this.getAttribute("role")||this.setAttribute("role","button"),this.setAttribute("aria-haspopup","true"),this.setAttribute("aria-expanded","false"),this.getAttribute("tabindex")||this.setAttribute("tabindex","0"),this.addEventListener("click",this.onTriggerClick),this.addEventListener("keydown",this.onTriggerKeydown),this.addEventListener("mouseenter",this.onTriggerHover),this.addEventListener("contextmenu",this.onTriggerContext),document.addEventListener("click",this.onDocumentClick),document.addEventListener("keydown",this.onDocumentKeydown),this.menu&&(this.menu.addEventListener("mouseleave",this.onMenuLeave),this.menu.addEventListener("mouseenter",this.onMenuEnter),this.menu.addEventListener("keydown",this.onMenuKeydown))}disconnectedCallback(){var e;(e=this.timer)==null||e.stop(),this.unsubscribeCoordinator&&(this.unsubscribeCoordinator(),this.unsubscribeCoordinator=null),this.removeEventListener("click",this.onTriggerClick),this.removeEventListener("keydown",this.onTriggerKeydown),this.removeEventListener("mouseenter",this.onTriggerHover),this.removeEventListener("contextmenu",this.onTriggerContext),document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onDocumentKeydown)}attributeChangedCallback(e,n,i){n!==i&&this.isOpen&&this.closeMenu()}getEngine(){const e=this.getAttribute("config")??"_default";return W(e)}getConfig(){const e=this.getAttribute("config")??"_default";return Ke(e)}getMenuTimeout(){var n;const e=this.getConfig();return((n=e==null?void 0:e.settings)==null?void 0:n.menuTimeout)??5e3}renderMenu(e){var o,l,c;if(!this.menu)return;const n=this.getConfig(),i=((o=n==null?void 0:n.settings)==null?void 0:o.listType)??"ul",a=((l=n==null?void 0:n.settings)==null?void 0:l.maxVisibleItems)??10,r=Re(e,{listType:i,maxVisibleItems:a,defaultTargetWindow:(c=n==null?void 0:n.settings)==null?void 0:c.targetWindow,listAttributes:{part:"list"},liAttributes:{part:"item"},aAttributes:{part:"link"},imgAttributes:{part:"image"}});this.menu.innerHTML="",this.menu.appendChild(r)}getPlacement(){var a;const e=this.getAttribute("placement");if(e)return D(e);const n=this.getConfig(),i=(a=n==null?void 0:n.settings)==null?void 0:a.placement;return D(typeof i=="string"?i:"SE")}getGap(){var n;if(this.menu){const i=getComputedStyle(this.menu).getPropertyValue("--alap-gap").trim();if(i){const a=parseFloat(i);if(!Number.isNaN(a))return i.endsWith("rem")?a*parseFloat(getComputedStyle(document.documentElement).fontSize):a}}const e=this.getConfig();return((n=e==null?void 0:e.settings)==null?void 0:n.placementGap)??4}applyPlacement(e){if(!this.menu)return;const n=this.getBoundingClientRect(),i=e.x-n.left,a=e.y-n.top;if(this.menu.style.top=`${a}px`,this.menu.style.left=`${i}px`,this.menu.style.bottom="",this.menu.style.right="",this.menu.style.marginTop="0",this.menu.style.marginBottom="0",this.menu.style.overflowX="clip",e.maxHeight!=null){this.menu.style.maxHeight=`${e.maxHeight}px`,this.menu.style.overflowY="auto";const r=this.menu.querySelector("ul, ol");r&&(r.style.maxHeight="none",r.style.overflowY="")}else this.menu.style.maxHeight="",this.menu.style.overflowY="";e.maxWidth!=null?this.menu.style.maxWidth=`${e.maxWidth}px`:this.menu.style.maxWidth=""}openMenu(){var i,a,r;if(!this.menu)return;z().notifyOpen(this.instanceId);const e=this.getConfig(),n=((i=e==null?void 0:e.settings)==null?void 0:i.viewportAdjust)!==!1;if(this.isOpen=!0,this.setAttribute("aria-expanded","true"),n){this.menu.style.position="fixed",this.menu.style.visibility="hidden",this.menu.style.top="-9999px",this.menu.style.left="-9999px",this.menu.style.maxHeight="none",this.menu.style.overflow="visible",this.menu.setAttribute("aria-hidden","false");const o=this.menu.getBoundingClientRect();this.menuNaturalSize={width:o.width,height:o.height};const l=this.getBoundingClientRect(),c=this.getPlacement(),d=this.getGap(),h=((a=e==null?void 0:e.settings)==null?void 0:a.viewportPadding)??8,p=Q({triggerRect:l,menuSize:this.menuNaturalSize,viewport:{width:window.innerWidth,height:window.innerHeight},placement:c.compass,strategy:c.strategy,gap:d,padding:h});this.lastPlacement=p,this.menu.style.position="",this.menu.style.visibility="",this.menu.style.overflow="",this.applyPlacement(p),ee(this.menu,p.placement),p.scrollY&&this.startScrollTracking()}else this.menu.setAttribute("aria-hidden","false");if(this.stopIntersectionObserver(),this.intersectionObserver=We(this,()=>this.closeMenu()),this.openedViaKeyboard){const o=this.menu.querySelector('a[role="menuitem"]');o&&o.focus({preventScroll:!0})}this.openedViaKeyboard=!1,(r=this.timer)==null||r.start()}startScrollTracking(){var r;this.stopScrollTracking();const e=this.getConfig(),n=this.getGap(),i=((r=e==null?void 0:e.settings)==null?void 0:r.viewportPadding)??8,a=this.getPlacement();this.scrollHandler=()=>{if(!this.menu||!this.isOpen||!this.menuNaturalSize)return;const o=this.getBoundingClientRect(),l=Q({triggerRect:o,menuSize:this.menuNaturalSize,viewport:{width:window.innerWidth,height:window.innerHeight},placement:a.compass,strategy:a.strategy,gap:n,padding:i});this.lastPlacement=l,this.applyPlacement(l),ee(this.menu,l.placement)},window.addEventListener("scroll",this.scrollHandler,{passive:!0})}stopScrollTracking(){this.scrollHandler&&(window.removeEventListener("scroll",this.scrollHandler),this.scrollHandler=null)}stopIntersectionObserver(){this.intersectionObserver&&(this.intersectionObserver.disconnect(),this.intersectionObserver=null)}closeMenu(){var n;if(!this.menu)return;const e=this.isOpen;this.isOpen=!1,this.menu.setAttribute("aria-hidden","true"),this.menu.style.top="",this.menu.style.left="",this.menu.style.bottom="",this.menu.style.right="",this.menu.style.marginTop="",this.menu.style.marginBottom="",this.menu.style.maxHeight="",this.menu.style.maxWidth="",this.menu.style.overflowY="",this.menu.style.overflowX="",ze(this.menu),this.lastPlacement=null,this.menuNaturalSize=null,this.setAttribute("aria-expanded","false"),this.stopScrollTracking(),this.stopIntersectionObserver(),(n=this.timer)==null||n.stop(),e&&this.focus()}bindItemHooks(e){if(!this.menu)return;const n=this.getAttribute("query")??"";this.menu.querySelectorAll('a[role="menuitem"]').forEach((a,r)=>{const o=e[r];a.addEventListener("mouseenter",()=>{const l={id:o.id,link:o,query:n};this.dispatchEvent(new CustomEvent("alap:item-hover",{detail:l,bubbles:!0,composed:!0}))}),a.addEventListener("contextmenu",l=>{const c={id:o.id,link:o,query:n,event:l};this.dispatchEvent(new CustomEvent("alap:item-context",{detail:c,bubbles:!0,composed:!0}))})})}}function ln(s="alap-link"){customElements.get(s)||customElements.define(s,qe)}function ne(s,t){switch(s.key){case"Escape":return t.close(),!0;case"ArrowLeft":case"ArrowUp":return s.preventDefault(),t.prev(),!0;case"ArrowRight":case"ArrowDown":return s.preventDefault(),t.next(),!0;default:return!1}}let B=0,Ve="";function cn(){B===0&&(Ve=document.body.style.overflow,document.body.style.overflow="hidden"),B++}function Xe(){B--,B<=0&&(B=0,document.body.style.overflow=Ve)}function j(s,t,e){cn(),t.appendChild(s),s.offsetHeight,s.classList.add(e)}function F(s,t){s.classList.remove(t),parseFloat(getComputedStyle(s).transitionDuration)>0?s.addEventListener("transitionend",()=>{s.remove(),Xe()},{once:!0}):(s.remove(),Xe())}function ie(s){const{container:t,src:e,overlayClass:n,imageClass:i,visibleClass:a,overlayPart:r}=s,o=document.createElement("div");o.className=n,r&&o.setAttribute("part",r);const l=document.createElement("img");l.className=i,l.src=e;const c=()=>{document.removeEventListener("keydown",d,!0),F(o,a)},d=h=>{h.key==="Escape"&&(h.stopPropagation(),c())};o.addEventListener("click",h=>{h.stopPropagation(),c()}),document.addEventListener("keydown",d,!0),o.appendChild(l),j(o,t,a)}const P={N:"flex-start",NE:"flex-start",NW:"flex-start",S:"flex-end",SE:"flex-end",SW:"flex-end",E:"center",W:"center",C:"center"},ae={N:"center",S:"center",C:"center",NE:"flex-end",E:"flex-end",SE:"flex-end",NW:"flex-start",W:"flex-start",SW:"flex-start"},dn=300,hn=250;function re(s){const{counterWrap:t,counterText:e,links:n,onJump:i,css:a,closeIcon:r,parts:o,hoverHint:l="swap",getActiveElement:c}=s;let{currentIndex:d}=s;const h=document.createElement("div");h.className=a.setnav,h.setAttribute("tabindex","-1"),o!=null&&o.setnav&&h.setAttribute("part",o.setnav);const p=document.createElement("ul");p.className=a.list,p.setAttribute("role","listbox");for(let y=0;y<n.length;y++){const k=n[y],_=document.createElement("li");_.className=a.item,_.setAttribute("role","option"),_.setAttribute("data-index",String(y)),_.textContent=k.label??k.id,y===d&&_.classList.add("active"),_.addEventListener("click",S=>{S.stopPropagation(),i(y)}),p.appendChild(_)}h.appendChild(p);const v=document.createElement("div");v.className=a.filterWrap;const f=document.createElement("input");f.className=a.filter,f.type="text",f.placeholder="Filter…",f.setAttribute("aria-label","Filter items"),o!=null&&o.filter&&f.setAttribute("part",o.filter),v.appendChild(f);const m=document.createElement("button");m.className=a.clear,m.setAttribute("aria-label","Clear filter"),m.textContent=r,m.style.display="none",m.addEventListener("click",y=>{y.stopPropagation(),f.value="",f.dispatchEvent(new Event("input")),f.focus()}),v.appendChild(m),h.appendChild(v),t.appendChild(h);const E=()=>`${d+1} / ${n.length}`;e.textContent=E();const w=()=>{h.classList.remove("open"),e.textContent=E(),f.value="",f.dispatchEvent(new Event("input"))};let x=-1;const T=()=>Array.from(p.querySelectorAll(`.${a.item}`)).filter(y=>y.style.display!=="none"),A=y=>{for(const k of p.querySelectorAll(`.${a.item}`))k.classList.remove("highlighted");x>=0&&x<y.length&&(y[x].classList.add("highlighted"),y[x].scrollIntoView({block:"nearest"}))},L=y=>{const k=T();if(y.key==="ArrowDown")return y.preventDefault(),x=Math.min(x+1,k.length-1),A(k),!0;if(y.key==="ArrowUp")return y.preventDefault(),x=Math.max(x-1,0),A(k),!0;if(y.key==="Enter"){y.preventDefault();const _=x>=0?x:k.length===1?0:-1;if(_>=0&&_<k.length){const S=Number(k[_].getAttribute("data-index"));i(S)}return!0}return!1};if(h.addEventListener("keydown",y=>{if(y.key==="Escape"){y.stopPropagation(),w();return}(c?c():document.activeElement)!==f&&(L(y)||y.key.length===1&&!y.ctrlKey&&!y.metaKey&&!y.altKey&&f.focus())}),e.style.cursor="pointer",l==="crossfade"){const y=k=>{e.style.opacity="0",setTimeout(()=>{e.textContent=k,e.style.opacity="1"},hn)};t.addEventListener("mouseenter",()=>{h.classList.contains("open")||y("Menu")}),t.addEventListener("mouseleave",()=>{h.classList.contains("open")||y(E())})}else t.addEventListener("mouseenter",()=>{h.classList.contains("open")||(e.textContent="menu…")}),t.addEventListener("mouseleave",()=>{h.classList.contains("open")||(e.textContent=E())});e.addEventListener("click",y=>{y.stopPropagation(),h.classList.contains("open")?w():(h.classList.add("open"),h.focus())});let I=null;return h.addEventListener("mouseleave",()=>{I&&clearTimeout(I),I=setTimeout(w,dn)}),h.addEventListener("mouseenter",()=>{I&&(clearTimeout(I),I=null)}),f.addEventListener("input",()=>{const y=f.value.trim();m.style.display=y?"":"none";const k=p.querySelectorAll(`.${a.item}`);if(!y){for(const S of k)S.style.display="";return}let _;try{_=new RegExp(y,"i")}catch{_=new RegExp(y.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i")}for(const S of k){const zi=Number(S.getAttribute("data-index")),Rt=n[zi],Wi=Rt.label??Rt.id;S.style.display=_.test(Wi)?"":"none"}}),f.addEventListener("input",()=>{x=-1}),f.addEventListener("keydown",y=>{y.stopPropagation(),!L(y)&&y.key==="Escape"&&w()}),{setActive(y){d=y;const k=p.querySelectorAll(`.${a.item}`);for(const _ of k){const S=Number(_.getAttribute("data-index"));_.classList.toggle("active",S===y)}},updateCounter(y,k){d=y,e.textContent=k>1?`${y+1} / ${k}`:""}}}const un=/(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;function pn(s){const t=s.match(un);return t?`https://www.youtube-nocookie.com/embed/${t[1]}`:null}const mn=/vimeo\.com\/(\d+)/;function gn(s){const t=s.match(mn);return t?`https://player.vimeo.com/video/${t[1]}`:null}const Ye=/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/;function fn(s){const t=s.match(Ye);return t?`https://open.spotify.com/embed/${t[1]}/${t[2]}`:null}function vn(s){const t=s.match(Ye);if(!t)return 152;const e=t[1];return e==="playlist"||e==="album"?352:152}const bn=/codepen\.io\/([^/]+)\/(?:pen|full|details)\/([a-zA-Z0-9]+)/;function yn(s){const t=s.match(bn);return t?`https://codepen.io/${t[1]}/embed/${t[2]}?default-tab=result`:null}const En=/codesandbox\.io\/(?:s|p)\/([a-zA-Z0-9-]+)/;function wn(s){const t=s.match(En);return t?`https://codesandbox.io/embed/${t[1]}`:null}const xn=[{name:"YouTube",domains:["youtube.com","youtu.be"],transform:pn,defaultType:"video",defaultHeight:315},{name:"Vimeo",domains:["vimeo.com"],transform:gn,defaultType:"video",defaultHeight:315},{name:"Spotify",domains:["open.spotify.com"],transform:fn,defaultType:"audio",defaultHeight:152},{name:"CodePen",domains:["codepen.io"],transform:yn,defaultType:"interactive",defaultHeight:400},{name:"CodeSandbox",domains:["codesandbox.io"],transform:wn,defaultType:"interactive",defaultHeight:400}];function Ge(s){try{const t=new URL(s).hostname.toLowerCase();return t.startsWith("www.")?t.slice(4):t}catch{return null}}function K(s){const t=Ge(s);if(!t)return null;for(const e of xn)if(e.domains.some(n=>t===n||t.endsWith("."+n)))return e;return null}function Ze(s){const t=K(s);return t?t.transform(s):null}function Je(s,t){if(!K(s))return!1;if(!t)return!0;const n=Ge(s);return n?t.some(i=>{const a=i.toLowerCase().replace(/^www\./,"");return n===a||n.endsWith("."+a)}):!1}function Qe(s){const t=K(s);return t?t.name==="Spotify"?vn(s):t.defaultHeight:315}function fe(){try{const s=localStorage.getItem(Le);if(!s)return new Set;const t=JSON.parse(s);return Array.isArray(t)?new Set(t.filter(e=>typeof e=="string")):new Set}catch{return new Set}}function et(s){try{localStorage.setItem(Le,JSON.stringify([...s]))}catch{}}function tt(s,t){return t==="block"?!1:t==="allow"?!0:it(s)}function nt(s){const t=fe();t.add(s.toLowerCase()),et(t)}function Cn(s){const t=fe();t.delete(s.toLowerCase()),et(t)}function it(s){return fe().has(s.toLowerCase())}function ve(s,t,e){const n=(e==null?void 0:e.embedPolicy)??"prompt",i=(e==null?void 0:e.maxWidth)??560,a=K(s);if(!a||!Je(s,e==null?void 0:e.embedAllowlist))return ye(s);const r=Ze(s);if(!r)return ye(s);const o=t??a.defaultType,l=(e==null?void 0:e.maxHeight)??Qe(s),c=An(s);return tt(c,n)?at(r,l,i):n==="block"?ye(s):Tn(s,r,a.name,o,l,i,c)}function An(s){try{const t=new URL(s).hostname.toLowerCase();return t.startsWith("www.")?t.slice(4):t}catch{return""}}function at(s,t,e){const n=document.createElement("div");n.className="alap-embed-wrap",n.style.maxWidth=`${e}px`;const i=document.createElement("iframe");return i.src=s,i.height=String(t),i.allow=Mt,i.referrerPolicy=Dt,i.loading="lazy",i.setAttribute("allowfullscreen",""),n.appendChild(i),n}function Tn(s,t,e,n,i,a,r){const o=document.createElement("div");o.className="alap-embed-placeholder",o.style.minHeight=`${Math.min(i,160)}px`,o.style.maxWidth=`${a}px`;const l=document.createElement("span");l.className="alap-embed-placeholder-provider",l.textContent=e;const c=document.createElement("span");c.className="alap-embed-placeholder-label",c.textContent=`Load ${e} content`;const d=document.createElement("button");d.className="alap-embed-load-btn",d.textContent="Load",d.type="button";const h=document.createElement("button");return h.className="alap-embed-always-btn",h.textContent=`Always allow ${r}`,h.type="button",o.appendChild(l),o.appendChild(c),o.appendChild(d),o.appendChild(h),d.addEventListener("click",p=>{p.stopPropagation(),be(o,t,i,a)}),h.addEventListener("click",p=>{p.stopPropagation(),nt(r),be(o,t,i,a)}),o.addEventListener("click",()=>{be(o,t,i,a)}),o}function be(s,t,e,n){const i=at(t,e,n);s.replaceWith(i)}function ye(s){const t=document.createElement("a");return t.className="alap-embed-link",t.href=s,t.target="_blank",t.rel="noopener noreferrer",t.textContent=s,t}class kn{constructor(t,e={}){u(this,"rendererType",Ne);u(this,"engine");u(this,"selector");u(this,"placement");u(this,"overlay",null);u(this,"links",[]);u(this,"currentIndex",0);u(this,"activeTrigger",null);u(this,"setNavHandle",null);u(this,"transitioning",!1);u(this,"pendingDelta",null);u(this,"rapidMode",!1);u(this,"rapidResetTimer",null);u(this,"embedPolicy");u(this,"embedAllowlist");u(this,"handleKeydown");this.engine=new H(t),this.selector=e.selector??".alap",this.placement=e.placement??null,this.embedPolicy=e.embedPolicy??"prompt",this.embedAllowlist=e.embedAllowlist,this.handleKeydown=this.onKeydown.bind(this),this.init()}init(){const t=document.querySelectorAll(this.selector);for(const e of t)e.addEventListener("click",n=>this.onTriggerClick(n,e)),e.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),e.click())}),e.setAttribute("role","button"),e.setAttribute("tabindex",e.getAttribute("tabindex")??"0")}onTriggerClick(t,e){t.preventDefault(),t.stopPropagation();const n=e.getAttribute("data-alap-linkitems");if(!n)return;const i=e.id||void 0;this.links=this.engine.resolve(n,i),this.links.length!==0&&(this.currentIndex=0,this.open(),this.activeTrigger=e)}get isOpen(){return this.overlay!==null}openWith(t){t.links.length!==0&&(this.links=t.links,this.currentIndex=t.initialIndex??0,this.open(),this.activeTrigger=t.triggerElement??null)}open(){this.close(),this.overlay=document.createElement("div"),this.overlay.className="alap-lightbox-overlay",this.overlay.setAttribute("role","dialog"),this.overlay.setAttribute("aria-modal","true"),this.overlay.setAttribute("aria-label","Link preview"),this.placement&&(this.overlay.style.alignItems=P[this.placement],this.overlay.style.justifyContent=ae[this.placement]),this.overlay.addEventListener("click",t=>{t.target===this.overlay&&this.close()}),this.render(),j(this.overlay,document.body,"alap-lightbox-visible"),document.addEventListener("keydown",this.handleKeydown)}close(){const t=this.activeTrigger;if(this.overlay){const e=this.overlay;this.overlay=null,F(e,"alap-lightbox-visible")}return document.removeEventListener("keydown",this.handleKeydown),this.activeTrigger=null,t}render(){if(!this.overlay)return;this.overlay.innerHTML="";const t=document.createElement("button");t.className="alap-lightbox-close",t.setAttribute("aria-label","Close"),t.textContent="×",t.addEventListener("click",()=>this.close()),this.overlay.appendChild(t);const e=document.createElement("div");e.className="alap-lightbox-panel";const n=document.createElement("div");n.className="alap-lightbox-image-wrap";const i=document.createElement("img");i.className="alap-lightbox-image",i.style.cursor="zoom-in",i.addEventListener("click",v=>{v.stopPropagation(),i.src&&this.openZoom(i.src)}),n.appendChild(i),e.appendChild(n);const a=document.createElement("div");a.className="alap-lightbox-body";const r=document.createElement("div");r.className="alap-lightbox-label-row";const o=document.createElement("h2");o.className="alap-lightbox-label",r.appendChild(o);const l=document.createElement("span");l.className="alap-lightbox-credit",r.appendChild(l),a.appendChild(r);const c=document.createElement("p");c.className="alap-lightbox-description",a.appendChild(c);const d=document.createElement("a");d.rel="noopener noreferrer",d.className="alap-lightbox-visit",d.textContent="Visit",a.appendChild(d);const h=document.createElement("div");h.className="alap-lightbox-counter-wrap";const p=document.createElement("span");if(p.className="alap-lightbox-counter",h.appendChild(p),this.links.length>1&&(this.setNavHandle=re({counterWrap:h,counterText:p,links:this.links,currentIndex:this.currentIndex,onJump:v=>this.jumpTo(v),css:{setnav:"alap-lightbox-setnav",list:"alap-lightbox-setnav-list",item:"alap-lightbox-setnav-item",filterWrap:"alap-lightbox-setnav-filter-wrap",filter:"alap-lightbox-setnav-filter",clear:"alap-lightbox-setnav-clear"},closeIcon:"×",hoverHint:"swap"})),this.links.length>1){const v=document.createElement("div");v.className="alap-lightbox-nav";const f=document.createElement("button");f.className="alap-lightbox-nav-prev",f.setAttribute("aria-label","Previous"),f.textContent="‹",f.addEventListener("click",()=>this.navigate(-1)),v.appendChild(f),v.appendChild(h);const m=document.createElement("button");m.className="alap-lightbox-nav-next",m.setAttribute("aria-label","Next"),m.textContent="›",m.addEventListener("click",()=>this.navigate(1)),v.appendChild(m),a.appendChild(v)}else a.appendChild(h);e.appendChild(a),this.overlay.appendChild(e),this.update()}update(){var E,w,x,T;if(!this.overlay)return;const t=this.links[this.currentIndex],e=this.links.length,n=!!(t.image||t.thumbnail),i=this.overlay.querySelector(".alap-lightbox-panel"),a=i.querySelector(".alap-lightbox-image-wrap"),r=a.querySelector(".alap-lightbox-image"),o=i.querySelector(".alap-lightbox-label"),l=i.querySelector(".alap-lightbox-credit"),c=i.querySelector(".alap-lightbox-description"),d=i.querySelector(".alap-lightbox-visit"),h=i.querySelector(".alap-lightbox-counter"),p=a.querySelector(".alap-embed-wrap, .alap-embed-placeholder, .alap-embed-link");p&&p.remove();const v=(E=t.meta)==null?void 0:E.embed;if(n)r.src=t.image??t.thumbnail,r.alt=t.altText??t.label??"",r.style.display="",a.classList.remove("no-image"),i.style.background="";else if(typeof v=="string"&&v){r.style.display="none",a.classList.remove("no-image"),i.style.background="";const A=(w=t.meta)==null?void 0:w.embedType,L=ve(v,A,{embedPolicy:this.embedPolicy,embedAllowlist:this.embedAllowlist});a.appendChild(L)}else r.style.display="none",a.classList.add("no-image"),i.style.background="transparent";o.textContent=t.label??"",o.title=t.label??"";const f=(x=t.meta)==null?void 0:x.photoCredit,m=(T=t.meta)==null?void 0:T.photoCreditUrl;if(l.innerHTML="",f&&n)if(m){const A=document.createElement("a");A.href=m,A.target="_blank",A.rel="noopener noreferrer",A.textContent=`Photo: ${f}`,l.appendChild(A)}else l.textContent=`Photo: ${f}`;c.textContent=t.description??"",c.style.display=t.description?"":"none",d.href=t.url,d.target=t.targetWindow??"_blank",this.setNavHandle?(this.setNavHandle.updateCounter(this.currentIndex,e),this.setNavHandle.setActive(this.currentIndex)):h.textContent=e>1?`${this.currentIndex+1} / ${e}`:""}jumpTo(t){var i;if(t===this.currentIndex||this.transitioning)return;const e=(i=this.overlay)==null?void 0:i.querySelector(".alap-lightbox-panel");if(!e)return;this.transitioning=!0,e.classList.add("fading");const n=parseFloat(getComputedStyle(e).getPropertyValue("--alap-lightbox-transition"))*1e3;setTimeout(()=>{this.currentIndex=t,this.update(),e.classList.remove("fading"),this.transitioning=!1},n)}markRapid(){this.rapidResetTimer!==null&&clearTimeout(this.rapidResetTimer),this.rapidResetTimer=setTimeout(()=>{this.rapidMode=!1,this.rapidResetTimer=null},1e3)}navigate(t){var a;if(this.transitioning){this.pendingDelta=t,this.markRapid();return}this.markRapid();const e=(a=this.overlay)==null?void 0:a.querySelector(".alap-lightbox-panel");if(!e)return;this.transitioning=!0,e.classList.add("fading");const n=parseFloat(getComputedStyle(e).getPropertyValue("--alap-lightbox-transition"))*1e3,i=this.rapidMode?n/2:n;setTimeout(()=>{if(this.currentIndex=(this.currentIndex+t+this.links.length)%this.links.length,this.update(),e.classList.remove("fading"),this.transitioning=!1,this.rapidMode=!0,this.pendingDelta!==null){const r=this.pendingDelta;this.pendingDelta=null,this.navigate(r)}},i)}onKeydown(t){ne(t,{close:()=>this.close(),prev:()=>this.navigate(-1),next:()=>this.navigate(1)})}openZoom(t){ie({container:document.body,src:t,overlayClass:"alap-lightbox-zoom-overlay",imageClass:"alap-lightbox-zoom-image",visibleClass:"alap-lightbox-zoom-visible"})}setPlacement(t){this.placement=t}getEngine(){return this.engine}destroy(){this.close();const t=document.querySelectorAll(this.selector);for(const e of t)e.removeAttribute("role")}}const Ln=`
  :host {
    display: inline;
  }

  /* --- Overlay --- */

  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--alap-lightbox-z-index, 10000);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--alap-lightbox-overlay-padding, 2rem);
    background: var(--alap-lightbox-overlay-bg, rgba(0, 0, 0, 0.85));
    backdrop-filter: blur(var(--alap-lightbox-overlay-blur, 4px));
    opacity: 0;
    transition: opacity var(--alap-lightbox-fade, 0.5s) ease;
  }

  .overlay.visible {
    opacity: 1;
  }

  /* --- Close X --- */

  .close-x {
    position: absolute;
    top: 1rem;
    right: 1.5rem;
    background: none;
    border: none;
    color: var(--alap-lightbox-close-x-color, #fff);
    font-size: var(--alap-lightbox-close-x-size, 2rem);
    cursor: pointer;
    line-height: 1;
    opacity: var(--alap-lightbox-close-x-opacity, 0.7);
    transition: opacity var(--alap-lightbox-transition, 0.25s);
  }

  .close-x:hover {
    opacity: 1;
  }

  /* --- Panel --- */

  .panel {
    background: var(--alap-lightbox-bg, #1a1a2e);
    border-radius: var(--alap-lightbox-radius, 12px);
    max-width: var(--alap-lightbox-max-width, 600px);
    width: 90vw;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--alap-lightbox-shadow, 0 24px 80px rgba(0, 0, 0, 0.5));
  }

  .panel.no-image {
    background: transparent;
    box-shadow: none;
  }

  /* --- Body --- */

  .body {
    display: flex;
    flex-direction: column;
    padding: var(--alap-lightbox-body-padding, 0.75rem 1.5rem 1.5rem);
  }

  .panel.no-image .body {
    background: var(--alap-lightbox-bg, #1a1a2e);
    border-radius: 0 0 var(--alap-lightbox-radius, 12px) var(--alap-lightbox-radius, 12px);
  }

  /* --- Image --- */

  .image-wrap {
    width: 100%;
    height: var(--alap-lightbox-image-height, 350px);
    overflow: hidden;
    position: relative;
    background: var(--alap-lightbox-image-bg, #111);
  }

  .image-wrap.hidden {
    background: transparent;
  }

  .image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  /* --- Content parts — direct children of panel --- */

  .label-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .label {
    margin: 0;
    font-size: var(--alap-lightbox-label-size, 1.4rem);
    font-weight: var(--alap-lightbox-label-weight, 600);
    color: var(--alap-lightbox-label-color, #fff);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .label:hover {
    white-space: normal;
    overflow: visible;
  }

  .credit {
    font-size: var(--alap-lightbox-credit-size, 0.75rem);
    color: var(--alap-lightbox-credit-color, rgba(255, 255, 255, 0.4));
    white-space: nowrap;
    flex-shrink: 0;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .credit.hidden {
    display: none;
  }

  .credit a {
    color: var(--alap-lightbox-credit-link-color, rgba(255, 255, 255, 0.5));
    text-decoration: none;
  }

  .credit a:hover {
    color: var(--alap-lightbox-credit-link-hover, #fff);
    text-decoration: underline;
  }

  .description {
    margin: var(--alap-lightbox-desc-margin, 0.5rem 0 0);
    color: var(--alap-lightbox-desc-color, #aaa);
    font-size: var(--alap-lightbox-desc-size, 0.95rem);
    line-height: var(--alap-lightbox-desc-line-height, 1.5);
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .description.hidden {
    display: none;
  }

  .visit {
    display: block;
    width: fit-content;
    margin: var(--alap-lightbox-visit-margin, 1rem auto 0);
    padding: var(--alap-lightbox-visit-padding, 0.5rem 1.25rem);
    background: var(--alap-lightbox-visit-bg, #3a86ff);
    color: var(--alap-lightbox-visit-color, #fff);
    text-decoration: none;
    border-radius: var(--alap-lightbox-visit-radius, 6px);
    font-size: var(--alap-lightbox-visit-size, 0.9rem);
    font-weight: var(--alap-lightbox-visit-weight, 500);
    transition: background var(--alap-lightbox-transition, 0.25s);
  }

  .visit:hover {
    background: var(--alap-lightbox-visit-bg-hover, #2d6fdb);
  }

  .close-btn {
    display: none;
    width: fit-content;
    margin: var(--alap-lightbox-close-margin, 0.5rem auto 0);
    padding: var(--alap-lightbox-visit-padding, 0.5rem 1.25rem);
    background: var(--alap-lightbox-close-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lightbox-close-color, #b8c4e8);
    border: none;
    border-radius: var(--alap-lightbox-visit-radius, 6px);
    font-size: var(--alap-lightbox-visit-size, 0.9rem);
    cursor: pointer;
    transition: background var(--alap-lightbox-transition, 0.25s), color var(--alap-lightbox-transition, 0.25s);
  }

  .close-btn:hover {
    background: var(--alap-lightbox-close-bg-hover, rgba(255, 255, 255, 0.15));
    color: var(--alap-lightbox-close-color-hover, #fff);
  }

  .counter-wrap {
    position: relative;
    text-align: center;
    z-index: 2;
  }

  .counter {
    display: block;
    color: var(--alap-lightbox-counter-color, #666);
    font-size: var(--alap-lightbox-counter-size, 0.85rem);
    cursor: default;
    white-space: nowrap;
    min-width: var(--alap-lightbox-counter-min-width, 7em);
    text-align: center;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .counter-wrap:hover .counter {
    color: var(--alap-lightbox-counter-hover-color, #aac4f0);
  }

  .counter.hidden {
    display: none;
  }

  /* --- Set navigator popup --- */

  .setnav {
    display: none;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 0.25rem;
    min-width: var(--alap-lightbox-setnav-min-width, 220px);
    max-width: var(--alap-lightbox-setnav-max-width, 320px);
    background: var(--alap-lightbox-setnav-bg, #1e1e3a);
    border: 1px solid var(--alap-lightbox-setnav-border, rgba(255, 255, 255, 0.1));
    border-radius: var(--alap-lightbox-setnav-radius, 8px);
    box-shadow: var(--alap-lightbox-setnav-shadow, 0 8px 32px rgba(0, 0, 0, 0.4));
    overflow: hidden;
    flex-direction: column;
    z-index: 10;
  }

  .setnav.open {
    display: flex;
  }

  .setnav:focus {
    outline: none;
  }

  .setnav-list {
    list-style: none;
    margin: 0;
    padding: var(--alap-lightbox-setnav-list-padding, 0.25rem 0);
    max-height: var(--alap-lightbox-setnav-max-height, 240px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #444 transparent;
  }

  .setnav-item {
    padding: var(--alap-lightbox-setnav-item-padding, 0.4rem 0.75rem);
    color: var(--alap-lightbox-setnav-item-color, #d0d7e5);
    font-size: var(--alap-lightbox-setnav-item-size, 0.85rem);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.1s, color 0.1s;
  }

  .setnav-item:hover {
    background: var(--alap-lightbox-setnav-item-hover-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lightbox-setnav-item-hover-color, #fff);
  }

  .setnav-item.active {
    background: var(--alap-lightbox-setnav-item-active-bg, rgba(58, 134, 255, 0.2));
    color: var(--alap-lightbox-setnav-item-active-color, #88bbff);
    font-weight: var(--alap-lightbox-setnav-item-active-weight, 600);
  }

  .setnav-item.highlighted {
    background: var(--alap-lightbox-setnav-item-highlight-bg, rgba(255, 255, 255, 0.15));
    color: var(--alap-lightbox-setnav-item-highlight-color, #fff);
  }

  .setnav-filter-wrap {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--alap-lightbox-setnav-border, rgba(255, 255, 255, 0.1));
    flex-shrink: 0;
  }

  .setnav-filter {
    flex: 1;
    padding: var(--alap-lightbox-setnav-filter-padding, 0.5rem 0.75rem);
    background: var(--alap-lightbox-setnav-filter-bg, rgba(255, 255, 255, 0.05));
    border: none;
    color: var(--alap-lightbox-setnav-filter-color, #fff);
    font-size: var(--alap-lightbox-setnav-filter-size, 0.8rem);
    outline: none;
  }

  .setnav-filter::placeholder {
    color: var(--alap-lightbox-setnav-placeholder-color, rgba(255, 255, 255, 0.3));
  }

  .setnav-clear {
    background: none;
    border: none;
    color: var(--alap-lightbox-setnav-clear-color, rgba(255, 255, 255, 0.4));
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    line-height: 1;
    transition: color 0.1s;
  }

  .setnav-clear:hover {
    color: var(--alap-lightbox-setnav-clear-hover-color, #fff);
  }

  /* --- Image zoom popup --- */

  .zoom-overlay {
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
    opacity: 0;
    transition: opacity 0.2s ease;
    cursor: zoom-out;
  }

  .zoom-overlay.visible {
    opacity: 1;
  }

  .zoom-image {
    max-width: 95vw;
    max-height: 95vh;
    object-fit: contain;
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.8);
  }

  /* --- Navigation --- */

  .nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--alap-lightbox-nav-gap, 1rem);
    margin-top: 1rem;
    flex-shrink: 0;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .nav-prev,
  .nav-next {
    background: var(--alap-lightbox-nav-bg, rgba(255, 255, 255, 0.1));
    border: none;
    color: var(--alap-lightbox-nav-color, #fff);
    font-size: var(--alap-lightbox-nav-icon-size, 1.5rem);
    width: var(--alap-lightbox-nav-btn-size, 36px);
    height: var(--alap-lightbox-nav-btn-size, 36px);
    border-radius: 50%;
    cursor: pointer;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.25;
    transition: background var(--alap-lightbox-transition, 0.25s), opacity 0.4s ease;
  }

  .nav:hover .nav-prev,
  .nav:hover .nav-next {
    opacity: 1;
  }

  .nav-prev:hover,
  .nav-next:hover {
    background: var(--alap-lightbox-nav-bg-hover, rgba(255, 255, 255, 0.2));
  }

  /* --- Fade transition --- */

  .fading .image,
  .fading .label,
  .fading .credit,
  .fading .description,
  .fading .counter {
    opacity: 0;
  }
`,_n="_default",In="Visit",Sn="Close",rt="--alap-lightbox-transition",st=250,ot="×",Nn="‹",$n="›";class lt extends HTMLElement{constructor(){super();u(this,"overlay",null);u(this,"links",[]);u(this,"currentIndex",0);u(this,"isOpen",!1);u(this,"justClosed",!1);u(this,"transitioning",!1);u(this,"pendingDelta",null);u(this,"rapidMode",!1);u(this,"rapidResetTimer",null);u(this,"setNavHandle",null);u(this,"handleKeydown");u(this,"handleDocumentClick");u(this,"onTriggerClick",e=>{if(this.overlay&&e.composedPath().includes(this.overlay))return;if(this.justClosed){this.justClosed=!1;return}e.preventDefault(),e.stopPropagation();const n=this.getAttribute("query");if(!n)return;const i=this.getAttribute("config")??_n,a=W(i);if(!a){b(`<alap-lightbox>: no config registered for "${i}". Call registerConfig() first.`);return}const r=this.id||void 0;this.links=a.resolve(n,r),this.links.length!==0&&(this.currentIndex=0,this.open())});u(this,"onTriggerKeydown",e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.click())});const e=this.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=Ln,e.appendChild(n);const i=document.createElement("slot");e.appendChild(i),this.handleKeydown=this.onKeydown.bind(this),this.handleDocumentClick=this.onDocumentClick.bind(this)}static get observedAttributes(){return["query","config","placement"]}connectedCallback(){this.getAttribute("role")||this.setAttribute("role","button"),this.setAttribute("aria-haspopup","dialog"),this.getAttribute("tabindex")||this.setAttribute("tabindex","0"),this.addEventListener("click",this.onTriggerClick),this.addEventListener("keydown",this.onTriggerKeydown)}disconnectedCallback(){this.close(),this.removeEventListener("click",this.onTriggerClick),this.removeEventListener("keydown",this.onTriggerKeydown)}attributeChangedCallback(e,n,i){n!==i&&this.isOpen&&this.close()}get placement(){return this.getAttribute("placement")}open(){this.close(),this.overlay=document.createElement("div"),this.overlay.className="overlay",this.overlay.setAttribute("part","overlay"),this.overlay.setAttribute("role","dialog"),this.overlay.setAttribute("aria-modal","true"),this.overlay.setAttribute("aria-label","Link preview");const e=this.placement;e&&e in P&&(this.overlay.style.alignItems=P[e],this.overlay.style.justifyContent=ae[e]),this.render(),j(this.overlay,this.shadowRoot,"visible"),this.isOpen=!0,this.setAttribute("aria-expanded","true"),document.addEventListener("keydown",this.handleKeydown),document.addEventListener("click",this.handleDocumentClick)}close(){if(!this.overlay)return;const e=this.overlay;this.overlay=null,this.isOpen=!1,this.justClosed=!0,requestAnimationFrame(()=>{this.justClosed=!1}),F(e,"visible"),this.setAttribute("aria-expanded","false"),document.removeEventListener("keydown",this.handleKeydown),document.removeEventListener("click",this.handleDocumentClick)}render(){if(!this.overlay)return;this.overlay.innerHTML="";const e=this.createButton("close-x",ot,"Close",()=>this.close());e.setAttribute("part","close-x"),this.overlay.appendChild(e);const n=document.createElement("div");n.className="panel",n.setAttribute("part","panel");const i=document.createElement("div");i.className="image-wrap",i.setAttribute("part","image-wrap");const a=document.createElement("img");a.className="image",a.setAttribute("part","image"),a.style.cursor="zoom-in",a.addEventListener("click",m=>{m.stopPropagation(),a.src&&this.openZoom(a.src)}),i.appendChild(a),n.appendChild(i);const r=document.createElement("div");r.className="body",r.setAttribute("part","body");const o=document.createElement("div");o.className="label-row",o.setAttribute("part","label-row");const l=document.createElement("h2");l.className="label",l.setAttribute("part","label"),o.appendChild(l);const c=document.createElement("span");c.className="credit",c.setAttribute("part","credit"),o.appendChild(c),r.appendChild(o);const d=document.createElement("p");d.className="description",d.setAttribute("part","description"),r.appendChild(d);const h=document.createElement("a");h.className="visit",h.setAttribute("part","visit"),h.rel="noopener noreferrer",r.appendChild(h);const p=this.createButton("close-btn",Sn,"Close",()=>this.close());p.setAttribute("part","close-btn"),r.appendChild(p);const v=document.createElement("div");v.className="counter-wrap",v.setAttribute("part","counter-wrap");const f=document.createElement("span");if(f.className="counter",f.setAttribute("part","counter"),v.appendChild(f),this.links.length>1&&(this.setNavHandle=re({counterWrap:v,counterText:f,links:this.links,currentIndex:this.currentIndex,onJump:m=>this.jumpTo(m),css:{setnav:"setnav",list:"setnav-list",item:"setnav-item",filterWrap:"setnav-filter-wrap",filter:"setnav-filter",clear:"setnav-clear"},closeIcon:ot,hoverHint:"swap",parts:{setnav:"setnav",filter:"setnav-filter"},getActiveElement:()=>{var m;return((m=this.shadowRoot)==null?void 0:m.activeElement)??null}})),this.links.length>1){const m=document.createElement("div");m.className="nav",m.setAttribute("part","nav");const E=this.createButton("nav-prev",Nn,"Previous",()=>this.navigate(-1));E.setAttribute("part","nav-prev"),m.appendChild(E),m.appendChild(v);const w=this.createButton("nav-next",$n,"Next",()=>this.navigate(1));w.setAttribute("part","nav-next"),m.appendChild(w),r.appendChild(m)}else r.appendChild(v);n.appendChild(r),this.overlay.appendChild(n),this.overlay.addEventListener("click",m=>{m.target===this.overlay&&this.close()}),this.update()}update(){var f,m;if(!this.overlay)return;const e=this.links[this.currentIndex],n=this.links.length,i=!!(e.image||e.thumbnail),a=this.overlay.querySelector(".panel"),r=a.querySelector(".image-wrap"),o=r.querySelector(".image"),l=a.querySelector(".label"),c=a.querySelector(".credit"),d=a.querySelector(".description"),h=a.querySelector(".visit");i?(o.src=e.image??e.thumbnail,o.alt=e.altText??e.label??"",o.style.display="",r.classList.remove("hidden"),a.classList.remove("no-image")):(o.style.display="none",r.classList.add("hidden"),a.classList.add("no-image")),l.textContent=e.label??"",l.title=e.label??"";const p=(f=e.meta)==null?void 0:f.photoCredit,v=(m=e.meta)==null?void 0:m.photoCreditUrl;if(c.innerHTML="",p&&i){if(v){const E=document.createElement("a");E.href=v,E.target="_blank",E.rel="noopener noreferrer",E.textContent=`Photo: ${p}`,c.appendChild(E)}else c.textContent=`Photo: ${p}`;c.classList.remove("hidden")}else c.classList.add("hidden");if(e.description?(d.textContent=e.description,d.classList.remove("hidden")):d.classList.add("hidden"),h.href=e.url,h.target=e.targetWindow??"_blank",h.textContent=In,this.setNavHandle)this.setNavHandle.updateCounter(this.currentIndex,n),this.setNavHandle.setActive(this.currentIndex);else{const E=a.querySelector(".counter");n>1?(E.textContent=`${this.currentIndex+1} / ${n}`,E.classList.remove("hidden")):E.classList.add("hidden")}}jumpTo(e){var o;if(e===this.currentIndex||this.transitioning)return;const n=(o=this.overlay)==null?void 0:o.querySelector(".panel");if(!n)return;this.transitioning=!0,n.classList.add("fading");const i=getComputedStyle(n).getPropertyValue(rt),a=parseFloat(i)*1e3,r=Number.isFinite(a)&&a>0?a:st;setTimeout(()=>{this.currentIndex=e,this.update(),n.classList.remove("fading"),this.transitioning=!1},r)}markRapid(){this.rapidResetTimer!==null&&clearTimeout(this.rapidResetTimer),this.rapidResetTimer=setTimeout(()=>{this.rapidMode=!1,this.rapidResetTimer=null},1e3)}navigate(e){var l;if(this.transitioning){this.pendingDelta=e,this.markRapid();return}this.markRapid();const n=(l=this.overlay)==null?void 0:l.querySelector(".panel");if(!n)return;this.transitioning=!0,n.classList.add("fading");const i=getComputedStyle(n).getPropertyValue(rt),a=parseFloat(i)*1e3,r=Number.isFinite(a)&&a>0?a:st,o=this.rapidMode?r/2:r;setTimeout(()=>{if(this.currentIndex=(this.currentIndex+e+this.links.length)%this.links.length,this.update(),n.classList.remove("fading"),this.transitioning=!1,this.rapidMode=!0,this.pendingDelta!==null){const c=this.pendingDelta;this.pendingDelta=null,this.navigate(c)}},o)}onKeydown(e){ne(e,{close:()=>this.close(),prev:()=>this.navigate(-1),next:()=>this.navigate(1)})}openZoom(e){ie({container:this.shadowRoot,src:e,overlayClass:"zoom-overlay",imageClass:"zoom-image",visibleClass:"visible",overlayPart:"zoom-overlay"})}onDocumentClick(e){}createButton(e,n,i,a){const r=document.createElement("button");return e&&(r.className=e),r.setAttribute("aria-label",i),r.textContent=n,r.addEventListener("click",a),r}}function Rn(s="alap-lightbox"){customElements.get(s)||customElements.define(s,lt)}const Mn=".alap",Dn="Visit →",Pn="Close",ct="_blank",On=100,Ee=5,Un="--alap-lens-transition",Hn=250,zn="--alap-lens-resize-transition",Wn=350,Bn=100,jn=/^https?:\/\//,Fn=" · ",Kn="Copied",qn=1500,Vn=3e3,dt="×",Xn="‹",Yn="›",ht="▲",ut="▼",pt="⎘",Gn="fade",g={overlay:"alap-lens-overlay",overlayVisible:"alap-lens-overlay-visible",panel:"alap-lens-panel",panelFading:"alap-lens-panel-fading",closeX:"alap-lens-close-x",imageWrap:"alap-lens-image-wrap",imageWrapEmpty:"alap-lens-image-wrap-empty",image:"alap-lens-image",titleRow:"alap-lens-title-row",credit:"alap-lens-credit",label:"alap-lens-label",tags:"alap-lens-tags",tag:"alap-lens-tag",description:"alap-lens-description",separator:"alap-lens-separator",meta:"alap-lens-meta",metaRow:"alap-lens-meta-row",metaRowLinks:"alap-lens-meta-row-links",metaRowText:"alap-lens-meta-row-text",metaKey:"alap-lens-meta-key",metaValue:"alap-lens-meta-value",metaChips:"alap-lens-meta-chips",metaChip:"alap-lens-meta-chip",metaLinks:"alap-lens-meta-links",metaLink:"alap-lens-meta-link",metaMore:"alap-lens-meta-more",metaText:"alap-lens-meta-text",actions:"alap-lens-actions",visit:"alap-lens-visit",closeBtn:"alap-lens-close-btn",nav:"alap-lens-nav",navPrev:"alap-lens-nav-prev",navNext:"alap-lens-nav-next",counterWrap:"alap-lens-counter-wrap",counter:"alap-lens-counter",setnav:"alap-lens-setnav",setnavList:"alap-lens-setnav-list",setnavItem:"alap-lens-setnav-item",setnavFilterWrap:"alap-lens-setnav-filter-wrap",setnavFilter:"alap-lens-setnav-filter",setnavClear:"alap-lens-setnav-clear",drawer:"alap-lens-drawer",drawerExpanded:"alap-lens-drawer-expanded",drawerHandle:"alap-lens-drawer-handle",drawerToggle:"alap-lens-drawer-toggle",imageCollapsed:"alap-lens-image-collapsed",zoomOverlay:"alap-lens-zoom-overlay",zoomVisible:"alap-lens-zoom-visible",zoomImage:"alap-lens-zoom-image",copyBtn:"alap-lens-copy",copyDone:"alap-lens-copy-done"},$={role:"dialog",modal:"true",dialogLabel:"Item details",copyLabel:"Copy to clipboard",closeLabel:"Close",prevLabel:"Previous",nextLabel:"Next"},mt=new Set(["source","sourceLabel","updated","atUri","handle","did","photoCredit","photoCreditUrl","embed","embedType"]),q="value",gt="list",ft="links",vt="text",we="_display";class Zn{constructor(t,e={}){u(this,"rendererType",$e);u(this,"engine");u(this,"selector");u(this,"visitLabel");u(this,"closeLabel");u(this,"metaLabels");u(this,"copyable");u(this,"panelCloseButton");u(this,"tagSwitchTooltip");u(this,"placement");u(this,"transition");u(this,"overlay",null);u(this,"links",[]);u(this,"originalLinks",[]);u(this,"currentIndex",0);u(this,"transitioning",!1);u(this,"pendingDelta",null);u(this,"rapidMode",!1);u(this,"rapidResetTimer",null);u(this,"activeTrigger",null);u(this,"activeTag",null);u(this,"setNavHandle",null);u(this,"drawerExpanded",!1);u(this,"embedPolicy");u(this,"embedAllowlist");u(this,"handleKeydown");this.engine=new H(t),this.selector=e.selector??Mn,this.visitLabel=e.visitLabel??Dn,this.closeLabel=e.closeLabel??Pn,this.metaLabels=e.metaLabels??{},this.copyable=e.copyable??!0,this.panelCloseButton=e.panelCloseButton??!1,this.tagSwitchTooltip=e.tagSwitchTooltip??Vn,this.placement=e.placement??null,this.transition=e.transition??Gn,this.embedPolicy=e.embedPolicy??"prompt",this.embedAllowlist=e.embedAllowlist,this.handleKeydown=this.onKeydown.bind(this),this.init()}init(){const t=document.querySelectorAll(this.selector);for(const e of t)e.addEventListener("click",n=>this.onTriggerClick(n,e)),e.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),e.click())}),e.setAttribute("role","button"),e.setAttribute("tabindex",e.getAttribute("tabindex")??"0")}onTriggerClick(t,e){t.preventDefault(),t.stopPropagation();const n=e.getAttribute("data-alap-linkitems");if(!n)return;const i=e.id||void 0;this.links=this.engine.resolve(n,i),this.links.length!==0&&(this.originalLinks=[...this.links],this.currentIndex=0,this.activeTag=null,this.open(),this.activeTrigger=e)}get isOpen(){return this.overlay!==null}openWith(t){t.links.length!==0&&(this.links=t.links,this.originalLinks=[...t.links],this.currentIndex=t.initialIndex??0,this.activeTag=null,this.open(),this.activeTrigger=t.triggerElement??null)}open(){this.close(),this.overlay=document.createElement("div"),this.overlay.className=g.overlay,this.overlay.setAttribute("role",$.role),this.overlay.setAttribute("aria-modal",$.modal),this.overlay.setAttribute("aria-label",$.dialogLabel),this.placement&&(this.overlay.style.alignItems=P[this.placement],this.overlay.style.justifyContent=ae[this.placement]),this.overlay.addEventListener("click",t=>{t.target===this.overlay&&this.close()}),this.render(),j(this.overlay,document.body,g.overlayVisible),document.addEventListener("keydown",this.handleKeydown)}close(){const t=this.activeTrigger;if(this.overlay){const e=this.overlay;this.overlay=null,F(e,g.overlayVisible)}return document.removeEventListener("keydown",this.handleKeydown),this.activeTrigger=null,this.drawerExpanded=!1,t}render(){if(!this.overlay)return;const t=this.links[this.currentIndex],e=this.links.length;this.overlay.innerHTML="";const n=this.createButton(g.closeX,dt,$.closeLabel,()=>this.close());this.overlay.appendChild(n);const i=document.createElement("div");i.className=g.panel,this.renderImage(i,t),this.renderDrawerHandle(i);const a=document.createElement("div");a.className=this.drawerExpanded?`${g.drawer} ${g.drawerExpanded}`:g.drawer,this.renderDetails(a,t),this.renderMetaZone(a,t),i.appendChild(a),this.renderActions(i,t),e>1&&this.renderNav(i,e),this.overlay.appendChild(i)}renderImage(t,e){const n=e.thumbnail||e.image,i=document.createElement("div");let a=n?g.imageWrap:`${g.imageWrap} ${g.imageWrapEmpty}`;if(this.drawerExpanded&&(a+=` ${g.imageCollapsed}`),i.className=a,n){const r=document.createElement("img");r.className=g.image,r.src=n,r.alt=e.altText??e.label??"",r.style.cursor="zoom-in",r.addEventListener("load",()=>{r.naturalHeight>r.naturalWidth&&(r.style.objectFit="contain",i.style.maxHeight=this.drawerExpanded?"0":"var(--alap-lens-image-portrait-max-height)")}),r.addEventListener("click",o=>{o.stopPropagation(),r.src&&this.openZoom(r.src)}),i.appendChild(r)}t.appendChild(i)}renderDrawerHandle(t){const e=document.createElement("div");e.className=g.drawerHandle;const n=document.createElement("span");n.className=g.drawerToggle,n.textContent=this.drawerExpanded?ut:ht,e.setAttribute("role","button"),e.setAttribute("aria-label",this.drawerExpanded?"Show image":"Expand details"),e.addEventListener("click",i=>{i.stopPropagation(),this.toggleDrawer()}),e.appendChild(n),t.appendChild(e)}renderDetails(t,e){var a,r;const n=e.thumbnail||e.image,i=(a=e.meta)==null?void 0:a.photoCredit;if(e.label||i&&n){const o=document.createElement("div");if(o.className=g.titleRow,e.label){const l=document.createElement("h2");l.className=g.label,l.textContent=e.label,o.appendChild(l)}if(i&&n){const l=document.createElement("span");l.className=g.credit;const c=(r=e.meta)==null?void 0:r.photoCreditUrl;if(c){const d=document.createElement("a");d.href=c,d.target="_blank",d.rel="noopener noreferrer",d.textContent=`Photo: ${i}`,l.appendChild(d)}else l.textContent=`Photo: ${i}`;o.appendChild(l)}t.appendChild(o)}if(e.tags&&e.tags.length>0||this.copyable){const o=document.createElement("div");if(o.className=g.tags,e.tags)for(const l of e.tags){const c=document.createElement("span");c.className=g.tag,this.activeTag===l&&c.classList.add("active"),c.textContent=l,c.style.cursor="pointer",c.addEventListener("click",d=>{if(d.stopPropagation(),this.activeTag===l){this.links=[...this.originalLinks],this.currentIndex=0,this.activeTag=null,this.render();return}const h=this.engine.resolve(`.${l}`);h.length!==0&&(this.links=h,this.currentIndex=0,this.activeTag=l,this.render(),this.tagSwitchTooltip>0&&this.showTagTooltip(l))}),o.appendChild(c)}this.copyable&&this.renderCopyButton(o,e),t.appendChild(o)}if(e.description){const o=document.createElement("p");o.className=g.description,o.textContent=e.description,t.appendChild(o)}}renderMetaZone(t,e){const n=e.meta;if(!n)return;const i=n.embed;if(typeof i=="string"&&i){const l=n.embedType,c=ve(i,l,{embedPolicy:this.embedPolicy,embedAllowlist:this.embedAllowlist});t.appendChild(c)}const a=Object.entries(n).filter(([l])=>!mt.has(l)&&!l.startsWith("_")&&!l.endsWith(we));if(a.length===0)return;const r=document.createElement("hr");r.className=g.separator,t.appendChild(r);const o=document.createElement("dl");o.className=g.meta;for(const[l,c]of a){if(c==null||c==="")continue;const d=n[`${l}${we}`],h=this.renderMetaField(l,c,d);h&&o.appendChild(h)}o.children.length>0&&t.appendChild(o)}renderActions(t,e){const n=document.createElement("div");if(n.className=g.actions,e.url){const i=document.createElement("a");i.className=g.visit,i.href=e.url,i.target=e.targetWindow??ct,i.rel="noopener noreferrer",i.textContent=this.visitLabel,n.appendChild(i)}if(this.panelCloseButton){const i=this.createButton(g.closeBtn,this.closeLabel,$.closeLabel,()=>this.close());n.appendChild(i)}t.appendChild(n)}renderNav(t,e){const n=document.createElement("div");n.className=g.nav;const i=this.createButton(g.navPrev,Xn,$.prevLabel,()=>{this.navigate(-1)});n.appendChild(i);const a=document.createElement("div");a.className=g.counterWrap;const r=document.createElement("span");r.className=g.counter,a.appendChild(r),this.setNavHandle=re({counterWrap:a,counterText:r,links:this.links,currentIndex:this.currentIndex,onJump:l=>this.jumpTo(l),css:{setnav:g.setnav,list:g.setnavList,item:g.setnavItem,filterWrap:g.setnavFilterWrap,filter:g.setnavFilter,clear:g.setnavClear},closeIcon:dt,hoverHint:"crossfade"}),n.appendChild(a);const o=this.createButton(g.navNext,Yn,$.nextLabel,()=>{this.navigate(1)});n.appendChild(o),t.appendChild(n)}getCssDuration(t,e,n){const i=getComputedStyle(t).getPropertyValue(e),a=parseFloat(i)*1e3;return Number.isFinite(a)&&a>0?a:n}navigate(t){if(this.links.length<=1)return;const e=(this.currentIndex+t+this.links.length)%this.links.length;if(this.transition==="none"){this.currentIndex=e,this.render();return}if(this.transition==="resize"){if(this.transitioning)return;this.navigateResize(e);return}if(this.transitioning){this.pendingDelta=t,this.markRapid();return}this.markRapid(),this.navigateFade(e)}markRapid(){this.rapidResetTimer!==null&&clearTimeout(this.rapidResetTimer),this.rapidResetTimer=setTimeout(()=>{this.rapidMode=!1,this.rapidResetTimer=null},1e3)}navigateFade(t){var a;const e=(a=this.overlay)==null?void 0:a.querySelector(`.${g.panel}`);if(!e)return;this.transitioning=!0,e.classList.add(g.panelFading);const n=this.getCssDuration(e,Un,Hn),i=this.rapidMode?n/2:n;setTimeout(()=>{var o;this.currentIndex=t,this.render();const r=(o=this.overlay)==null?void 0:o.querySelector(`.${g.panel}`);r&&(r.classList.add(g.panelFading),r.offsetHeight,r.classList.remove(g.panelFading)),setTimeout(()=>{this.transitioning=!1,this.drainPending()},i)},i),this.rapidMode=!0}drainPending(){if(this.pendingDelta!==null){const t=this.pendingDelta;this.pendingDelta=null;const e=(this.currentIndex+t+this.links.length)%this.links.length;this.navigateFade(e)}}navigateResize(t){var r,o;const e=(r=this.overlay)==null?void 0:r.querySelector(`.${g.panel}`);if(!e)return;this.transitioning=!0;const n=this.getCssDuration(e,zn,Wn),i=e.scrollHeight;e.style.height=`${i}px`,e.style.overflow="hidden",this.currentIndex=t,this.render();const a=(o=this.overlay)==null?void 0:o.querySelector(`.${g.panel}`);if(!a){this.transitioning=!1;return}a.style.height=`${i}px`,a.style.overflow="hidden",requestAnimationFrame(()=>{a.style.height="auto";const l=a.scrollHeight;a.style.height=`${i}px`,a.offsetHeight,a.style.height=`${l}px`;const c=()=>{a.removeEventListener("transitionend",c),a.style.height="",a.style.overflow="",this.transitioning=!1};a.addEventListener("transitionend",c,{once:!0}),setTimeout(()=>{this.transitioning&&c()},n+Bn)})}renderMetaField(t,e,n){const i=this.formatMetaKey(t);switch(n??this.detectDisplayType(e)){case gt:return this.renderChips(i,e);case ft:return this.renderLinks(i,e);case vt:return this.renderTextBlock(i,e);case q:default:return this.renderKeyValue(i,this.formatMetaValue(e))}}detectDisplayType(t){return typeof t=="boolean"?q:Array.isArray(t)?t.length===0?q:t.every(e=>typeof e=="string"&&jn.test(e))?ft:t.every(e=>typeof e=="string")?gt:q:typeof t=="string"&&t.length>=On?vt:q}formatMetaKey(t){return this.metaLabels[t]?this.metaLabels[t]:t.replace(/_/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,e=>e.toUpperCase())}formatMetaValue(t){return typeof t=="boolean"?t?"✓":"✗":Array.isArray(t)?t.join(", "):String(t)}renderKeyValue(t,e){const n=document.createElement("div");n.className=g.metaRow;const i=document.createElement("dt");i.className=g.metaKey,i.textContent=t,n.appendChild(i);const a=document.createElement("dd");return a.className=g.metaValue,a.textContent=e,n.appendChild(a),n}renderChips(t,e){const n=document.createElement("div");n.className=g.metaRow;const i=document.createElement("dt");i.className=g.metaKey,i.textContent=t,n.appendChild(i);const a=document.createElement("dd");a.className=g.metaChips;for(const r of e){const o=document.createElement("span");o.className=g.metaChip,o.textContent=r,a.appendChild(o)}return n.appendChild(a),n}renderLinks(t,e){const n=document.createElement("div");n.className=`${g.metaRow} ${g.metaRowLinks}`;const i=document.createElement("dt");i.className=g.metaKey,i.textContent=`${t} (${e.length})`,n.appendChild(i);const a=document.createElement("dd");a.className=g.metaLinks;const r=e.slice(0,Ee);for(const o of r){const l=document.createElement("a");l.className=g.metaLink,l.href=o,l.target=ct,l.rel="noopener noreferrer";try{const c=new URL(o);l.textContent=c.pathname.length>1?c.pathname:c.hostname}catch{l.textContent=o}a.appendChild(l)}if(e.length>Ee){const o=document.createElement("span");o.className=g.metaMore,o.textContent=`+${e.length-Ee} more`,a.appendChild(o)}return n.appendChild(a),n}renderTextBlock(t,e){const n=document.createElement("div");n.className=`${g.metaRow} ${g.metaRowText}`;const i=document.createElement("dt");i.className=g.metaKey,i.textContent=t,n.appendChild(i);const a=document.createElement("dd");return a.className=g.metaText,a.textContent=e,n.appendChild(a),n}createButton(t,e,n,i){const a=document.createElement("button");return a.className=t,a.setAttribute("aria-label",n),a.textContent=e,a.addEventListener("click",i),a}renderCopyButton(t,e){const n=this.createButton(g.copyBtn,pt,$.copyLabel,()=>{const i=this.buildClipboardText(e);navigator.clipboard.writeText(i).then(()=>{n.textContent=Kn,n.classList.add(g.copyDone),setTimeout(()=>{n.textContent=pt,n.classList.remove(g.copyDone)},qn)})});t.appendChild(n)}buildClipboardText(t){const e=[];t.label&&e.push(t.label),t.tags&&t.tags.length>0&&e.push(t.tags.join(Fn)),t.url&&e.push(t.url),t.description&&(e.push(""),e.push(t.description));const n=t.meta;if(n){const i=Object.entries(n).filter(([a])=>!mt.has(a)&&!a.startsWith("_")&&!a.endsWith(we));if(i.length>0){e.push("");for(const[a,r]of i){if(r==null||r==="")continue;const o=this.formatMetaKey(a);e.push(`${o}: ${this.formatMetaValue(r)}`)}}}return e.join(`
`)}showTagTooltip(t){var a;const e=(a=this.overlay)==null?void 0:a.querySelector(`.${g.counter}`);if(!e)return;const n=500,i=e.textContent;e.style.opacity="0",setTimeout(()=>{e.isConnected&&(e.textContent=`switching to .${t}`,e.classList.add("tag-tooltip"),e.style.opacity="1",setTimeout(()=>{e.isConnected&&(e.style.opacity="0",setTimeout(()=>{e.isConnected&&(e.textContent=i,e.classList.remove("tag-tooltip"),e.style.opacity="1")},n))},this.tagSwitchTooltip))},n)}toggleDrawer(t){var r;if(t!==void 0&&t===this.drawerExpanded)return;this.drawerExpanded=t??!this.drawerExpanded;const e=(r=this.overlay)==null?void 0:r.querySelector(`.${g.panel}`);if(!e)return;const n=e.querySelector(`.${g.imageWrap}`);n&&n.classList.toggle(g.imageCollapsed,this.drawerExpanded);const i=e.querySelector(`.${g.drawer}`);i&&i.classList.toggle(g.drawerExpanded,this.drawerExpanded);const a=e.querySelector(`.${g.drawerHandle}`);if(a){const o=a.querySelector(`.${g.drawerToggle}`);o&&(o.textContent=this.drawerExpanded?ut:ht),a.setAttribute("aria-label",this.drawerExpanded?"Show image":"Expand details")}}onKeydown(t){if(t.key==="ArrowUp"){t.preventDefault(),this.toggleDrawer(!0);return}if(t.key==="ArrowDown"){t.preventDefault(),this.toggleDrawer(!1);return}ne(t,{close:()=>this.close(),prev:()=>this.navigate(-1),next:()=>this.navigate(1)})}jumpTo(t){if(t!==this.currentIndex){if(this.transition==="none"){this.currentIndex=t,this.render();return}if(this.transition==="resize"){if(this.transitioning)return;this.navigateResize(t);return}this.transitioning||this.navigateFade(t)}}openZoom(t){ie({container:document.body,src:t,overlayClass:g.zoomOverlay,imageClass:g.zoomImage,visibleClass:g.zoomVisible})}setPlacement(t){this.placement=t}getEngine(){return this.engine}destroy(){this.close();const t=document.querySelectorAll(this.selector);for(const e of t)e.removeAttribute("role")}}const Jn=`
  :host {
    display: inline;
  }

  /* --- Overlay --- */

  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--alap-lens-z-index, 10000);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--alap-lens-overlay-padding, 2rem);
    background: var(--alap-lens-overlay-bg, rgba(0, 0, 0, 0.85));
    backdrop-filter: blur(var(--alap-lens-overlay-blur, 4px));
    opacity: 0;
    transition: opacity var(--alap-lens-fade, 0.5s) ease;
    overflow-y: auto;
  }

  .overlay.visible {
    opacity: 1;
  }

  /* --- Close X --- */

  .close-x {
    position: absolute;
    top: 1rem;
    right: 1.5rem;
    background: none;
    border: none;
    color: var(--alap-lens-close-x-color, #fff);
    font-size: var(--alap-lens-close-x-size, 2rem);
    cursor: pointer;
    line-height: 1;
    opacity: var(--alap-lens-close-x-opacity, 0.7);
    transition: opacity var(--alap-lens-transition, 0.25s);
  }

  .close-x:hover {
    opacity: 1;
  }

  /* --- Panel --- */

  .panel {
    position: relative;
    background: var(--alap-lens-bg, #1a1a2e);
    border-radius: var(--alap-lens-radius, 12px);
    max-width: var(--alap-lens-max-width, 520px);
    width: 90vw;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--alap-lens-shadow, 0 24px 80px rgba(0, 0, 0, 0.5));
    padding: var(--alap-lens-padding, 1.5rem);
    transition: height var(--alap-lens-resize-transition, 0.35s) ease-in-out;
  }

  /* Fade transition — content fades out/in, panel stays put */

  .panel-fading .image-wrap,
  .panel-fading .drawer,
  .panel-fading .actions,
  .panel-fading .nav,
  .panel-fading .counter {
    opacity: 0;
  }

  /* opacity transition for fade is merged into each element's own transition rule */

  /* --- Drawer (scrollable details container) --- */

  .drawer {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: opacity var(--alap-lens-transition, 0.25s) ease,
                flex var(--alap-lens-resize-transition, 0.35s) ease-in-out,
                scrollbar-color 0.3s ease;
  }

  .drawer::-webkit-scrollbar {
    width: 6px;
  }

  .drawer::-webkit-scrollbar-track {
    background: transparent;
  }

  .drawer::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 3px;
    transition: background 0.3s ease;
  }

  .panel:hover .drawer {
    scrollbar-color: var(--alap-lens-drawer-scrollbar-color, rgba(255, 255, 255, 0.2)) transparent;
  }

  .panel:hover .drawer::-webkit-scrollbar-thumb {
    background: var(--alap-lens-drawer-scrollbar-color, rgba(255, 255, 255, 0.2));
  }

  .drawer-expanded {
    flex: 1 1 100%;
  }

  .drawer-handle {
    display: flex;
    justify-content: center;
    cursor: pointer;
    padding: 0.5rem 0;
    margin-top: -1.5rem;
    position: relative;
    z-index: 1;
    opacity: 0;
    text-decoration: none;
    outline: none;
    -webkit-text-decoration: none;
    transition: opacity var(--alap-lens-transition, 0.25s), background 0.25s ease-in-out;
  }

  .drawer-handle:hover {
    opacity: 1;
  }

  .drawer-toggle {
    background: none;
    border: none;
    color: var(--alap-lens-drawer-toggle-color, rgba(255, 255, 255, 0.4));
    font-size: 0.65rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    pointer-events: none;
    text-decoration: none;
    transition: color var(--alap-lens-transition, 0.25s);
  }

  .drawer-handle:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .drawer-handle:hover .drawer-toggle {
    color: var(--alap-lens-drawer-toggle-hover, rgba(255, 255, 255, 0.8));
  }

  /* Image collapse when drawer is expanded */

  .image-collapsed {
    max-height: 0 !important;
    margin-bottom: 0;
    overflow: hidden;
  }

  /* --- Top zone --- */

  .image-wrap {
    width: 100%;
    max-height: var(--alap-lens-image-max-height, 280px);
    overflow: hidden;
    border-radius: var(--alap-lens-image-radius, 8px);
    margin-bottom: 1rem;
    background: #111;
    transition: opacity var(--alap-lens-transition, 0.25s) ease,
                max-height var(--alap-lens-resize-transition, 0.35s) ease-in-out,
                margin-bottom var(--alap-lens-resize-transition, 0.35s) ease-in-out;
  }

  .image-wrap-empty {
    height: 0;
    margin-bottom: 0;
    background: transparent;
  }

  .image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .title-row {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin: 0 0 0.5rem;
  }

  .title-row .label {
    margin: 0;
  }

  .credit {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    flex-shrink: 0;
    margin-left: auto;
  }

  .credit a {
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
  }

  .credit a:hover {
    color: #fff;
    text-decoration: underline;
  }

  .label {
    margin: 0 0 0.5rem;
    font-size: var(--alap-lens-label-size, 1.4rem);
    font-weight: var(--alap-lens-label-weight, 600);
    color: var(--alap-lens-label-color, #fff);
    line-height: 1.3;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--alap-lens-tag-gap, 0.35rem);
    margin-bottom: 0.75rem;
  }

  .tag {
    display: inline-block;
    padding: var(--alap-lens-tag-padding, 0.15rem 0.6rem);
    background: var(--alap-lens-tag-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lens-tag-color, #aac4f0);
    border-radius: var(--alap-lens-tag-radius, 12px);
    font-size: var(--alap-lens-tag-size, 0.8rem);
    cursor: pointer;
    transition: background 0.5s ease, color 0.5s ease;
  }

  .tag:hover {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
  }

  .tag.active {
    background: rgba(58, 134, 255, 0.3);
    color: #88bbff;
  }

  .description {
    margin: 0 0 0.75rem;
    color: var(--alap-lens-desc-color, #aaa);
    font-size: var(--alap-lens-desc-size, 0.95rem);
    line-height: var(--alap-lens-desc-line-height, 1.5);
  }

  /* --- Meta zone --- */

  .separator {
    border: none;
    border-top: 1px solid var(--alap-lens-separator-color, rgba(255, 255, 255, 0.1));
    margin: 0.5rem 0 0.75rem;
  }

  .meta {
    margin: 0;
  }

  .meta-row {
    display: flex;
    gap: var(--alap-lens-meta-row-gap, 1rem);
    padding: var(--alap-lens-meta-row-padding, 0.3rem 0);
    align-items: baseline;
  }

  .meta-row-text,
  .meta-row-links {
    flex-direction: column;
    gap: 0.25rem;
  }

  .meta-key {
    color: var(--alap-lens-meta-key-color, #7888b8);
    font-size: var(--alap-lens-meta-key-size, 0.85rem);
    min-width: var(--alap-lens-meta-key-width, 100px);
    flex-shrink: 0;
  }

  .meta-value {
    color: var(--alap-lens-meta-value-color, #d0d7e5);
    font-size: var(--alap-lens-meta-value-size, 0.9rem);
    margin: 0;
  }

  .meta-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin: 0;
  }

  .meta-chip {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    background: var(--alap-lens-meta-chip-bg, rgba(255, 255, 255, 0.08));
    color: var(--alap-lens-meta-chip-color, #aac4f0);
    border-radius: var(--alap-lens-meta-chip-radius, 10px);
    font-size: var(--alap-lens-tag-size, 0.8rem);
  }

  .meta-links {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin: 0;
  }

  .meta-link {
    color: var(--alap-lens-meta-link-color, #88bbff);
    font-size: var(--alap-lens-meta-link-size, 0.85rem);
    text-decoration: none;
    transition: color var(--alap-lens-transition, 0.25s);
  }

  .meta-link:hover {
    color: var(--alap-lens-meta-link-hover, #ffd666);
    text-decoration: underline;
  }

  .meta-more {
    color: var(--alap-lens-meta-muted-color, #5a6a9a);
    font-size: 0.8rem;
  }

  .meta-text {
    color: var(--alap-lens-meta-text-color, #b8c4e8);
    font-size: var(--alap-lens-meta-value-size, 0.9rem);
    line-height: var(--alap-lens-desc-line-height, 1.5);
    margin: 0;
  }

  /* --- Actions --- */

  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1.25rem;
    flex-shrink: 0;
    transition: opacity var(--alap-lens-transition, 0.25s) ease;
  }

  .visit {
    display: inline-block;
    padding: var(--alap-lens-visit-padding, 0.5rem 1.25rem);
    background: var(--alap-lens-visit-bg, #3a86ff);
    color: var(--alap-lens-visit-color, #fff);
    border-radius: var(--alap-lens-visit-radius, 6px);
    font-size: var(--alap-lens-visit-size, 0.9rem);
    font-weight: var(--alap-lens-visit-weight, 500);
    text-decoration: none;
    transition: background var(--alap-lens-transition, 0.25s);
  }

  .visit:hover {
    background: var(--alap-lens-visit-bg-hover, #2d6fdb);
  }

  .close-btn {
    padding: var(--alap-lens-visit-padding, 0.5rem 1.25rem);
    background: var(--alap-lens-close-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lens-close-color, #b8c4e8);
    border: none;
    border-radius: var(--alap-lens-visit-radius, 6px);
    font-size: var(--alap-lens-visit-size, 0.9rem);
    cursor: pointer;
    transition: background var(--alap-lens-transition, 0.25s), color var(--alap-lens-transition, 0.25s);
  }

  .close-btn:hover {
    background: var(--alap-lens-close-bg-hover, rgba(255, 255, 255, 0.15));
    color: var(--alap-lens-close-color-hover, #fff);
  }

  /* --- Navigation --- */

  .nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--alap-lens-meta-row-gap, 1rem);
    margin-top: 1rem;
    flex-shrink: 0;
    transition: opacity var(--alap-lens-transition, 0.25s) ease;
  }

  .nav-prev,
  .nav-next {
    background: var(--alap-lens-nav-bg, rgba(255, 255, 255, 0.1));
    border: none;
    color: var(--alap-lens-nav-color, #fff);
    font-size: var(--alap-lens-nav-icon-size, 1.5rem);
    width: var(--alap-lens-nav-btn-size, 36px);
    height: var(--alap-lens-nav-btn-size, 36px);
    border-radius: 50%;
    cursor: pointer;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.25;
    transition: background var(--alap-lens-transition, 0.25s), opacity 0.4s ease;
  }

  .nav:hover .nav-prev,
  .nav:hover .nav-next {
    opacity: 1;
  }

  .nav-prev:hover,
  .nav-next:hover {
    background: var(--alap-lens-nav-bg-hover, rgba(255, 255, 255, 0.2));
  }

  .counter-wrap {
    position: relative;
    z-index: 2;
  }

  .counter {
    display: block;
    color: var(--alap-lens-counter-color, #666);
    font-size: var(--alap-lens-counter-size, 0.85rem);
    cursor: default;
    white-space: nowrap;
    min-width: var(--alap-lens-counter-min-width, 7em);
    text-align: center;
    transition: color var(--alap-lens-counter-transition, 500ms) ease-in-out,
                opacity 500ms ease-in-out;
  }

  .counter-wrap:hover .counter {
    color: var(--alap-lens-counter-hover-color, #aac4f0);
  }

  .counter.tag-tooltip {
    color: var(--alap-lens-tag-tooltip-color, #88bbff);
    font-size: var(--alap-lens-tag-tooltip-size, 0.85rem);
    font-weight: var(--alap-lens-tag-tooltip-weight, 500);
  }

  /* --- Set navigator popup --- */

  .setnav {
    display: none;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 0.25rem;
    min-width: var(--alap-lens-setnav-min-width, 220px);
    max-width: var(--alap-lens-setnav-max-width, 320px);
    background: var(--alap-lens-setnav-bg, #1e1e3a);
    border: 1px solid var(--alap-lens-setnav-border, rgba(255, 255, 255, 0.1));
    border-radius: var(--alap-lens-setnav-radius, 8px);
    box-shadow: var(--alap-lens-setnav-shadow, 0 8px 32px rgba(0, 0, 0, 0.4));
    overflow: hidden;
    flex-direction: column;
    z-index: 10;
  }

  .setnav.open {
    display: flex;
  }

  .setnav:focus {
    outline: none;
  }

  .setnav-list {
    list-style: none;
    margin: 0;
    padding: var(--alap-lens-setnav-list-padding, 0.25rem 0);
    max-height: var(--alap-lens-setnav-max-height, 240px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #444 transparent;
  }

  .setnav-item {
    padding: var(--alap-lens-setnav-item-padding, 0.4rem 0.75rem);
    color: var(--alap-lens-setnav-item-color, #d0d7e5);
    font-size: var(--alap-lens-setnav-item-size, 0.85rem);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.1s, color 0.1s;
  }

  .setnav-item:hover {
    background: var(--alap-lens-setnav-item-hover-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lens-setnav-item-hover-color, #fff);
  }

  .setnav-item.active {
    background: var(--alap-lens-setnav-item-active-bg, rgba(58, 134, 255, 0.2));
    color: var(--alap-lens-setnav-item-active-color, #88bbff);
    font-weight: var(--alap-lens-setnav-item-active-weight, 600);
  }

  .setnav-item.highlighted {
    background: var(--alap-lens-setnav-item-highlight-bg, rgba(255, 255, 255, 0.15));
    color: var(--alap-lens-setnav-item-highlight-color, #fff);
  }

  .setnav-filter-wrap {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--alap-lens-setnav-border, rgba(255, 255, 255, 0.1));
    flex-shrink: 0;
  }

  .setnav-filter {
    flex: 1;
    padding: var(--alap-lens-setnav-filter-padding, 0.5rem 0.75rem);
    background: var(--alap-lens-setnav-filter-bg, rgba(255, 255, 255, 0.05));
    border: none;
    color: var(--alap-lens-setnav-filter-color, #fff);
    font-size: var(--alap-lens-setnav-filter-size, 0.8rem);
    outline: none;
  }

  .setnav-filter::placeholder {
    color: var(--alap-lens-setnav-placeholder-color, rgba(255, 255, 255, 0.3));
  }

  .setnav-clear {
    background: none;
    border: none;
    color: var(--alap-lens-setnav-clear-color, rgba(255, 255, 255, 0.4));
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    line-height: 1;
    transition: color 0.1s;
  }

  .setnav-clear:hover {
    color: var(--alap-lens-setnav-clear-hover-color, #fff);
  }

  /* --- Image zoom popup --- */

  .zoom-overlay {
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
    opacity: 0;
    transition: opacity 0.2s ease;
    cursor: zoom-out;
  }

  .zoom-overlay.visible {
    opacity: 1;
  }

  .zoom-image {
    max-width: 95vw;
    max-height: 95vh;
    object-fit: contain;
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.8);
  }

  /* --- Copy button --- */

  .copy-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--alap-lens-copy-color, rgba(255, 255, 255, 0.3));
    font-size: var(--alap-lens-copy-size, 1.2rem);
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--alap-lens-transition, 0.25s), color var(--alap-lens-transition, 0.25s);
  }

  .panel:hover .copy-btn {
    opacity: 1;
  }

  .copy-btn:hover {
    color: var(--alap-lens-copy-color-hover, rgba(255, 255, 255, 0.7));
  }

  .copy-btn.done {
    color: var(--alap-lens-copy-done-color, #4ade80);
    opacity: 1;
  }
`,bt="_default",Qn="Visit →",ei="Close",ti=100,xe=5,ni="--alap-lens-transition",ii=250,ai="--alap-lens-resize-transition",ri=350,si=100,oi=/^https?:\/\//,li=" · ",ci="Copied",di=1500,yt=3e3,Et="×",hi="‹",ui="›",wt="⎘",xt="▲",Ct="▼",V="value",At="list",Tt="links",kt="text",Ce="_display",Lt=new Set(["source","sourceLabel","updated","atUri","handle","did","photoCredit","photoCreditUrl"]);class _t extends HTMLElement{constructor(){super();u(this,"overlay",null);u(this,"links",[]);u(this,"originalLinks",[]);u(this,"currentIndex",0);u(this,"isOpen",!1);u(this,"justClosed",!1);u(this,"transitioning",!1);u(this,"pendingDelta",null);u(this,"rapidMode",!1);u(this,"rapidResetTimer",null);u(this,"activeTag",null);u(this,"setNavHandle",null);u(this,"drawerExpanded",!1);u(this,"handleKeydown");u(this,"onTriggerClick",e=>{if(this.overlay&&e.composedPath().includes(this.overlay))return;if(this.justClosed){this.justClosed=!1;return}e.preventDefault(),e.stopPropagation();const n=this.getAttribute("query");if(!n)return;const i=this.getAttribute("config")??bt,a=W(i);if(!a){b(`<alap-lens>: no config registered for "${i}". Call registerConfig() first.`);return}const r=this.id||void 0;this.links=a.resolve(n,r),this.links.length!==0&&(this.originalLinks=[...this.links],this.currentIndex=0,this.activeTag=null,this.open())});u(this,"onTriggerKeydown",e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.click())});const e=this.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=Jn,e.appendChild(n);const i=document.createElement("slot");e.appendChild(i),this.handleKeydown=this.onKeydown.bind(this)}static get observedAttributes(){return["query","config","placement","transition","copyable","panel-close-button","tag-switch-tooltip"]}connectedCallback(){this.getAttribute("role")||this.setAttribute("role","button"),this.setAttribute("aria-haspopup","dialog"),this.getAttribute("tabindex")||this.setAttribute("tabindex","0"),this.addEventListener("click",this.onTriggerClick),this.addEventListener("keydown",this.onTriggerKeydown)}disconnectedCallback(){this.close(),this.removeEventListener("click",this.onTriggerClick),this.removeEventListener("keydown",this.onTriggerKeydown)}attributeChangedCallback(e,n,i){n!==i&&this.isOpen&&this.close()}get visitLabel(){return this.getAttribute("visit-label")??Qn}get closeLabel(){return this.getAttribute("close-label")??ei}get copyable(){return this.getAttribute("copyable")!=="false"}get panelCloseButton(){return this.hasAttribute("panel-close-button")}get transitionMode(){const e=this.getAttribute("transition");return e==="fade"||e==="resize"||e==="none"?e:"fade"}get tagSwitchTooltip(){const e=this.getAttribute("tag-switch-tooltip");if(e!==null){const n=parseInt(e,10);return Number.isFinite(n)?n:yt}return yt}get placement(){return this.getAttribute("placement")}open(){this.close(),this.overlay=document.createElement("div"),this.overlay.className="overlay",this.overlay.setAttribute("part","overlay"),this.overlay.setAttribute("role","dialog"),this.overlay.setAttribute("aria-modal","true"),this.overlay.setAttribute("aria-label","Item details");const e=this.placement;e&&e in P&&(this.overlay.style.alignItems=P[e],this.overlay.style.justifyContent=ae[e]),this.overlay.addEventListener("click",n=>{n.target===this.overlay&&this.close()}),this.render(),j(this.overlay,this.shadowRoot,"visible"),this.isOpen=!0,this.setAttribute("aria-expanded","true"),document.addEventListener("keydown",this.handleKeydown)}close(){if(!this.overlay)return;const e=this.overlay;this.overlay=null,this.isOpen=!1,this.justClosed=!0,this.drawerExpanded=!1,requestAnimationFrame(()=>{this.justClosed=!1}),F(e,"visible"),this.setAttribute("aria-expanded","false"),document.removeEventListener("keydown",this.handleKeydown)}render(){if(!this.overlay)return;this.overlay.innerHTML="";const e=this.createButton("close-x",Et,"Close",()=>this.close());e.setAttribute("part","close-x"),this.overlay.appendChild(e);const n=document.createElement("div");n.className="panel",n.setAttribute("part","panel");const i=this.links[this.currentIndex],a=this.links.length;this.renderImage(n,i);const r=document.createElement("div");r.className=this.drawerExpanded?"drawer drawer-expanded":"drawer",r.setAttribute("part","drawer"),this.renderDrawerHandle(n),this.renderDetails(r,i),this.renderMetaZone(r,i),n.appendChild(r),this.renderActions(n,i),a>1&&this.renderNav(n,a),this.overlay.appendChild(n)}renderImage(e,n){const i=n.thumbnail||n.image,a=document.createElement("div");let r=i?"image-wrap":"image-wrap image-wrap-empty";if(this.drawerExpanded&&(r+=" image-collapsed"),a.className=r,a.setAttribute("part","image-wrap"),i){const o=document.createElement("img");o.className="image",o.setAttribute("part","image"),o.src=i,o.alt=n.altText??n.label??"",o.style.cursor="zoom-in",o.addEventListener("load",()=>{o.naturalHeight>o.naturalWidth&&(o.style.objectFit="contain",a.style.maxHeight=this.drawerExpanded?"0":"var(--alap-lens-image-portrait-max-height, 420px)")}),o.addEventListener("click",l=>{l.stopPropagation(),o.src&&this.openZoom(o.src)}),a.appendChild(o)}e.appendChild(a)}renderDrawerHandle(e){const n=document.createElement("div");n.className="drawer-handle",n.setAttribute("part","drawer-handle");const i=document.createElement("span");i.className="drawer-toggle",i.setAttribute("part","drawer-toggle"),i.textContent=this.drawerExpanded?Ct:xt,n.setAttribute("role","button"),n.setAttribute("aria-label",this.drawerExpanded?"Show image":"Expand details"),n.addEventListener("click",a=>{a.stopPropagation(),this.toggleDrawer()}),n.appendChild(i),e.appendChild(n)}renderDetails(e,n){var r,o;const i=n.thumbnail||n.image,a=(r=n.meta)==null?void 0:r.photoCredit;if(n.label||a&&i){const l=document.createElement("div");if(l.className="title-row",l.setAttribute("part","title-row"),n.label){const c=document.createElement("h2");c.className="label",c.setAttribute("part","label"),c.textContent=n.label,l.appendChild(c)}if(a&&i){const c=document.createElement("span");c.className="credit",c.setAttribute("part","credit");const d=(o=n.meta)==null?void 0:o.photoCreditUrl;if(d){const h=document.createElement("a");h.href=d,h.target="_blank",h.rel="noopener noreferrer",h.textContent=`Photo: ${a}`,c.appendChild(h)}else c.textContent=`Photo: ${a}`;l.appendChild(c)}e.appendChild(l)}if(n.tags&&n.tags.length>0||this.copyable){const l=document.createElement("div");if(l.className="tags",l.setAttribute("part","tags"),n.tags)for(const c of n.tags){const d=document.createElement("span");d.className="tag",this.activeTag===c&&d.classList.add("active"),d.textContent=c,d.addEventListener("click",h=>{if(h.stopPropagation(),this.activeTag===c){this.links=[...this.originalLinks],this.currentIndex=0,this.activeTag=null,this.render();return}const p=this.getAttribute("config")??bt,v=W(p);if(!v)return;const f=v.resolve(`.${c}`);f.length!==0&&(this.links=f,this.currentIndex=0,this.activeTag=c,this.render(),this.tagSwitchTooltip>0&&this.showTagTooltip(c))}),l.appendChild(d)}this.copyable&&this.renderCopyButton(l,n),e.appendChild(l)}if(n.description){const l=document.createElement("p");l.className="description",l.setAttribute("part","description"),l.textContent=n.description,e.appendChild(l)}}renderMetaZone(e,n){const i=n.meta;if(!i)return;const a=Object.entries(i).filter(([l])=>!Lt.has(l)&&!l.startsWith("_")&&!l.endsWith(Ce));if(a.length===0)return;const r=document.createElement("hr");r.className="separator",e.appendChild(r);const o=document.createElement("dl");o.className="meta",o.setAttribute("part","meta");for(const[l,c]of a){if(c==null||c==="")continue;const d=i[`${l}${Ce}`],h=this.renderMetaField(l,c,d);h&&o.appendChild(h)}o.children.length>0&&e.appendChild(o)}renderActions(e,n){const i=document.createElement("div");if(i.className="actions",i.setAttribute("part","actions"),n.url){const a=document.createElement("a");a.className="visit",a.setAttribute("part","visit"),a.href=n.url,a.target=n.targetWindow??"_blank",a.rel="noopener noreferrer",a.textContent=this.visitLabel,i.appendChild(a)}if(this.panelCloseButton){const a=this.createButton("close-btn",this.closeLabel,"Close",()=>this.close());a.setAttribute("part","close-btn"),i.appendChild(a)}e.appendChild(i)}renderNav(e,n){const i=document.createElement("div");i.className="nav",i.setAttribute("part","nav");const a=this.createButton("nav-prev",hi,"Previous",()=>this.navigate(-1));a.setAttribute("part","nav-prev"),i.appendChild(a);const r=document.createElement("div");r.className="counter-wrap",r.setAttribute("part","counter-wrap");const o=document.createElement("span");o.className="counter",o.setAttribute("part","counter"),r.appendChild(o),this.setNavHandle=re({counterWrap:r,counterText:o,links:this.links,currentIndex:this.currentIndex,onJump:c=>this.jumpTo(c),css:{setnav:"setnav",list:"setnav-list",item:"setnav-item",filterWrap:"setnav-filter-wrap",filter:"setnav-filter",clear:"setnav-clear"},closeIcon:Et,hoverHint:"crossfade",parts:{setnav:"setnav",filter:"setnav-filter"},getActiveElement:()=>{var c;return((c=this.shadowRoot)==null?void 0:c.activeElement)??null}}),i.appendChild(r);const l=this.createButton("nav-next",ui,"Next",()=>this.navigate(1));l.setAttribute("part","nav-next"),i.appendChild(l),e.appendChild(i)}getCssDuration(e,n,i){const a=getComputedStyle(e).getPropertyValue(n),r=parseFloat(a)*1e3;return Number.isFinite(r)&&r>0?r:i}navigate(e){if(this.links.length<=1)return;const n=(this.currentIndex+e+this.links.length)%this.links.length;if(this.transitionMode==="none"){this.currentIndex=n,this.render();return}if(this.transitionMode==="resize"){if(this.transitioning)return;this.navigateResize(n);return}if(this.transitioning){this.pendingDelta=e,this.markRapid();return}this.markRapid(),this.navigateFade(n)}markRapid(){this.rapidResetTimer!==null&&clearTimeout(this.rapidResetTimer),this.rapidResetTimer=setTimeout(()=>{this.rapidMode=!1,this.rapidResetTimer=null},1e3)}navigateFade(e){var r;const n=(r=this.overlay)==null?void 0:r.querySelector(".panel");if(!n)return;this.transitioning=!0,n.classList.add("panel-fading");const i=this.getCssDuration(n,ni,ii),a=this.rapidMode?i/2:i;setTimeout(()=>{var l;this.currentIndex=e,this.render();const o=(l=this.overlay)==null?void 0:l.querySelector(".panel");o&&(o.classList.add("panel-fading"),o.offsetHeight,o.classList.remove("panel-fading")),setTimeout(()=>{this.transitioning=!1,this.drainPending()},a)},a),this.rapidMode=!0}drainPending(){if(this.pendingDelta!==null){const e=this.pendingDelta;this.pendingDelta=null;const n=(this.currentIndex+e+this.links.length)%this.links.length;this.navigateFade(n)}}navigateResize(e){var o,l;const n=(o=this.overlay)==null?void 0:o.querySelector(".panel");if(!n)return;this.transitioning=!0;const i=this.getCssDuration(n,ai,ri),a=n.scrollHeight;n.style.height=`${a}px`,n.style.overflow="hidden",this.currentIndex=e,this.render();const r=(l=this.overlay)==null?void 0:l.querySelector(".panel");if(!r){this.transitioning=!1;return}r.style.height=`${a}px`,r.style.overflow="hidden",requestAnimationFrame(()=>{r.style.height="auto";const c=r.scrollHeight;r.style.height=`${a}px`,r.offsetHeight,r.style.height=`${c}px`;const d=()=>{r.removeEventListener("transitionend",d),r.style.height="",r.style.overflow="",this.transitioning=!1};r.addEventListener("transitionend",d,{once:!0}),setTimeout(()=>{this.transitioning&&d()},i+si)})}jumpTo(e){if(e!==this.currentIndex){if(this.transitionMode==="none"){this.currentIndex=e,this.render();return}if(this.transitionMode==="resize"){if(this.transitioning)return;this.navigateResize(e);return}this.transitioning||this.navigateFade(e)}}renderMetaField(e,n,i){const a=this.formatMetaKey(e);switch(i??this.detectDisplayType(n)){case At:return this.renderChips(a,n);case Tt:return this.renderLinks(a,n);case kt:return this.renderTextBlock(a,n);case V:default:return this.renderKeyValue(a,this.formatMetaValue(n))}}detectDisplayType(e){return typeof e=="boolean"?V:Array.isArray(e)?e.length===0?V:e.every(n=>typeof n=="string"&&oi.test(n))?Tt:e.every(n=>typeof n=="string")?At:V:typeof e=="string"&&e.length>=ti?kt:V}formatMetaKey(e){const n=this.getAttribute("meta-labels");if(n)try{const i=JSON.parse(n);if(i[e])return i[e]}catch{}return e.replace(/_/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,i=>i.toUpperCase())}formatMetaValue(e){return typeof e=="boolean"?e?"✓":"✗":Array.isArray(e)?e.join(", "):String(e)}renderKeyValue(e,n){const i=document.createElement("div");i.className="meta-row";const a=document.createElement("dt");a.className="meta-key",a.textContent=e,i.appendChild(a);const r=document.createElement("dd");return r.className="meta-value",r.textContent=n,i.appendChild(r),i}renderChips(e,n){const i=document.createElement("div");i.className="meta-row";const a=document.createElement("dt");a.className="meta-key",a.textContent=e,i.appendChild(a);const r=document.createElement("dd");r.className="meta-chips";for(const o of n){const l=document.createElement("span");l.className="meta-chip",l.textContent=o,r.appendChild(l)}return i.appendChild(r),i}renderLinks(e,n){const i=document.createElement("div");i.className="meta-row meta-row-links";const a=document.createElement("dt");a.className="meta-key",a.textContent=`${e} (${n.length})`,i.appendChild(a);const r=document.createElement("dd");r.className="meta-links";const o=n.slice(0,xe);for(const l of o){const c=document.createElement("a");c.className="meta-link",c.href=l,c.target="_blank",c.rel="noopener noreferrer";try{const d=new URL(l);c.textContent=d.pathname.length>1?d.pathname:d.hostname}catch{c.textContent=l}r.appendChild(c)}if(n.length>xe){const l=document.createElement("span");l.className="meta-more",l.textContent=`+${n.length-xe} more`,r.appendChild(l)}return i.appendChild(r),i}renderTextBlock(e,n){const i=document.createElement("div");i.className="meta-row meta-row-text";const a=document.createElement("dt");a.className="meta-key",a.textContent=e,i.appendChild(a);const r=document.createElement("dd");return r.className="meta-text",r.textContent=n,i.appendChild(r),i}renderCopyButton(e,n){const i=this.createButton("copy-btn",wt,"Copy to clipboard",()=>{const a=this.buildClipboardText(n);navigator.clipboard.writeText(a).then(()=>{i.textContent=ci,i.classList.add("done"),setTimeout(()=>{i.textContent=wt,i.classList.remove("done")},di)})});e.appendChild(i)}buildClipboardText(e){const n=[];e.label&&n.push(e.label),e.tags&&e.tags.length>0&&n.push(e.tags.join(li)),e.url&&n.push(e.url),e.description&&(n.push(""),n.push(e.description));const i=e.meta;if(i){const a=Object.entries(i).filter(([r])=>!Lt.has(r)&&!r.startsWith("_")&&!r.endsWith(Ce));if(a.length>0){n.push("");for(const[r,o]of a){if(o==null||o==="")continue;const l=this.formatMetaKey(r);n.push(`${l}: ${this.formatMetaValue(o)}`)}}}return n.join(`
`)}showTagTooltip(e){var r;const n=(r=this.overlay)==null?void 0:r.querySelector(".counter");if(!n)return;const i=500,a=n.textContent;n.style.opacity="0",setTimeout(()=>{n.isConnected&&(n.textContent=`switching to .${e}`,n.classList.add("tag-tooltip"),n.style.opacity="1",setTimeout(()=>{n.isConnected&&(n.style.opacity="0",setTimeout(()=>{n.isConnected&&(n.textContent=a,n.classList.remove("tag-tooltip"),n.style.opacity="1")},i))},this.tagSwitchTooltip))},i)}openZoom(e){ie({container:this.shadowRoot,src:e,overlayClass:"zoom-overlay",imageClass:"zoom-image",visibleClass:"visible",overlayPart:"zoom-overlay"})}toggleDrawer(e){var o;if(e!==void 0&&e===this.drawerExpanded)return;this.drawerExpanded=e??!this.drawerExpanded;const n=(o=this.overlay)==null?void 0:o.querySelector(".panel");if(!n)return;const i=n.querySelector(".image-wrap");i&&i.classList.toggle("image-collapsed",this.drawerExpanded);const a=n.querySelector(".drawer");a&&a.classList.toggle("drawer-expanded",this.drawerExpanded);const r=n.querySelector(".drawer-handle");if(r){const l=r.querySelector(".drawer-toggle");l&&(l.textContent=this.drawerExpanded?Ct:xt),r.setAttribute("aria-label",this.drawerExpanded?"Show image":"Expand details")}}onKeydown(e){if(e.key==="ArrowUp"){e.preventDefault(),this.toggleDrawer(!0);return}if(e.key==="ArrowDown"){e.preventDefault(),this.toggleDrawer(!1);return}ne(e,{close:()=>this.close(),prev:()=>this.navigate(-1),next:()=>this.navigate(1)})}createButton(e,n,i,a){const r=document.createElement("button");return e&&(r.className=e),r.setAttribute("aria-label",i),r.textContent=n,r.addEventListener("click",a),r}}function pi(s="alap-lens"){customElements.get(s)||customElements.define(s,_t)}const Ae=new Set(["__proto__","constructor","prototype"]),R=(s,t)=>{let e=s;for(const n of t.split(".")){if(Ae.has(n)||e==null)return;if(Array.isArray(e)){const i=parseInt(n,10);e=isNaN(i)?void 0:e[i]}else if(typeof e=="object")e=e[n];else return}return e},It=s=>s.replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#0?39;|&apos;/g,"'").replace(/&nbsp;/g," ").trim(),mi=["name","title","full_name","label"],gi=["url","html_url","href","link","wiki"],fi=(s,t,e)=>{let n,i;if(t!=null&&t.label){const r=R(s,t.label);typeof r=="string"&&(n=r)}else for(const r of mi){const o=R(s,r);if(typeof o=="string"){n=o;break}}if(t!=null&&t.url){const r=R(s,t.url);typeof r=="string"?i=r:typeof r=="number"&&(i=String(r))}else for(const r of gi){const o=R(s,r);if(typeof o=="string"&&o.startsWith("http")){i=o;break}}if(!i)return null;if(e&&!i.startsWith("http")){const r=e.endsWith("/")?e:e+"/",o=i.startsWith("/")?i.slice(1):i;i=r+o}const a={url:i};if(n&&(a.label=n),t!=null&&t.meta){const r={};for(const[o,l]of Object.entries(t.meta)){const c=R(s,l);c!==void 0&&(r[o]=c)}Object.keys(r).length>0&&(a.meta=r)}return a},vi=s=>{const t=s[0],e=[],n={};for(const i of s.slice(1))if(i.includes("=")){const a=i.indexOf("=");n[i.slice(0,a)]=i.slice(a+1)}else e.push(i);return{key:t,positional:e,named:n}},bi=(s,t,e)=>{var a;const n=new URL(s.url),i=t[0];if(i&&((a=s.searches)!=null&&a[i])){const r=s.searches[i];for(const[o,l]of Object.entries(r))n.searchParams.set(o,String(l))}for(const[r,o]of Object.entries(e))n.searchParams.set(r,o);return n.toString()},yi=async(s,t)=>{var v,f,m,E,w;const{key:e,positional:n,named:i}=vi(s),a=(v=t.protocols)==null?void 0:v.web;if(!(a!=null&&a.keys))return b(":web: protocol has no keys configured"),[];const r=a.keys[e];if(!r)return b(`:web: key "${e}" not found in protocol keys`),[];let o;try{o=bi(r,n,i)}catch{return b(`:web: failed to build URL for key "${e}"`),[]}const l=a.allowedOrigins;if(l&&l.length>0){const x=new URL(o).origin;if(!l.includes(x))return b(`:web: origin "${x}" not in allowedOrigins for key "${e}"`),[]}let c;try{const x=new AbortController,T=setTimeout(()=>x.abort(),1e4),A=r.credentials?"include":"omit",L=await fetch(o,{signal:x.signal,credentials:A});if(clearTimeout(T),!L.ok)return b(`:web: fetch failed for "${e}": ${L.status} ${L.statusText}`),[];const I=(m=(f=L.headers)==null?void 0:f.get)==null?void 0:m.call(f,"content-type");if(I&&!I.includes("application/json"))return b(`:web: unexpected content-type for "${e}": ${I} (expected application/json)`),[];const y=(w=(E=L.headers)==null?void 0:E.get)==null?void 0:w.call(E,"content-length");if(y&&parseInt(y,10)>1048576)return b(`:web: response too large for "${e}": ${y} bytes (max 1048576)`),[];c=await L.json()}catch(x){const T=x instanceof Error?x.message:String(x),A=x instanceof DOMException&&x.name==="AbortError"?"timeout after 10000ms":T;return b(`:web: network error for key "${e}": ${A}`),[]}const d=Array.isArray(c)?c:c&&typeof c=="object"&&!Array.isArray(c)?Ei(c):[],h=[],p=Math.min(d.length,200);for(let x=0;x<p;x++){const T=fi(d[x],r.map,r.linkBase);T&&(T.cssClass=T.cssClass?`${T.cssClass} source_web`:"source_web",T.meta||(T.meta={}),T.meta.source="web",h.push(T))}return h},Ei=s=>{for(const t of Object.values(s))if(Array.isArray(t))return t;return[]},wi=s=>{const t=s.match(/^([^[]+)\[(\d*)\]$/);if(!t)return{field:s,index:void 0};const e=t[2];return{field:t[1],index:e===""?-1:parseInt(e,10)}},se=(s,t)=>{const e=t.split(".");let n=s;for(let i=0;i<e.length;i++){const a=e[i];if(Ae.has(a)||n==null)return;const{field:r,index:o}=wi(a);if(Ae.has(r))return;if(typeof n=="object"&&!Array.isArray(n))n=n[r];else if(Array.isArray(n)&&o===void 0){const l=parseInt(r,10);n=isNaN(l)?void 0:n[l]}else return;if(n==null)return;if(o!==void 0){if(!Array.isArray(n))return;if(o===-1){const l=e.slice(i+1).join(".");return l?n.filter(c=>c!==null&&typeof c=="object").map(c=>se(c,l)).filter(c=>c!=null):n}n=n[o]}}return n},xi=s=>s.includes("${"),Ci=(s,t,e)=>{let n=!1;const i=s.replace(/\$\{([^}]+)\}/g,(a,r)=>{let o;return r.startsWith("_envelope.")&&e?o=R(e,r.slice(10)):o=se(t,r),o==null?(n=!0,""):String(o)});return n?void 0:i},Ai=s=>{const t=s[0],e=[],n={};for(const i of s.slice(1))if(i.includes("=")){const a=i.indexOf("=");n[i.slice(0,a)]=i.slice(a+1)}else e.push(i);return{source:t,positional:e,named:n}},Ti=(s,t)=>{if(s.startsWith("$")){const e=s.slice(1),n=t==null?void 0:t[e];return n===void 0?(b(`:json: var "$${e}" not found in protocol vars`),s):n}return decodeURIComponent(s)},ki=(s,t,e)=>{let n=s.url;for(let i=0;i<t.length;i++){const a=Ti(t[i],e);n=n.replace(`\${${i+1}}`,encodeURIComponent(a))}return n},Li=(s,t)=>{const e={};for(const[n,i]of Object.entries(t)){const a=R(s,i);a!=null&&(e[n]=a)}return e},_i=(s,t)=>{if(t){const e=R(s,t);return Array.isArray(e)?e:e&&typeof e=="object"&&!Array.isArray(e)?[e]:(b(`:json: root "${t}" did not resolve to an array or object`),null)}return Array.isArray(s)?s:(s&&typeof s=="object"&&b(":json: response is an object but no root path configured"),null)},Ii=s=>s.trim().replace(/\s+/g,"_"),Si=(s,t)=>{if(s==null)return;let e;if(typeof s=="string")e=s.split(",").map(n=>n.trim()).filter(Boolean);else if(Array.isArray(s)){if(s.length===0)return;if(s.every(n=>typeof n=="string"))e=s;else{const n=t.match(/\[\]\.(\w+)$/);if(n){const i=n[1];e=s.filter(a=>a!==null&&typeof a=="object").map(a=>a[i]).filter(a=>typeof a=="string")}}}if(!(!e||e.length===0))return e.map(Ii).filter(Boolean)},O=(s,t,e)=>xi(s)?Ci(s,t,e):se(t,s),Ni=(s,t,e)=>{const{fieldMap:n,linkBase:i,allowedSchemes:a}=t;let r;if(n.label){const c=O(n.label,s,e);typeof c=="string"&&(r=It(c))}let o;if(n.url){const c=O(n.url,s,e);typeof c=="string"?o=c:typeof c=="number"&&(o=String(c))}if(!o)return null;if(i&&!o.match(/^[a-zA-Z][a-zA-Z0-9+\-.]*:/)){const c=i.endsWith("/")?i:i+"/",d=o.startsWith("/")?o.slice(1):o;o=c+d}if(o=ce(o,a),o==="about:blank")return null;const l={url:o};if(r&&(l.label=r),n.tags){const c=se(s,n.tags),d=Si(c,n.tags);d&&(l.tags=d)}if(n.description){const c=O(n.description,s,e);typeof c=="string"&&(l.description=It(c))}if(n.thumbnail){const c=O(n.thumbnail,s,e);if(typeof c=="string"){const d=ce(c,a);d!=="about:blank"&&(l.thumbnail=d)}}if(n.image){const c=O(n.image,s,e);if(typeof c=="string"){const d=ce(c,a);d!=="about:blank"&&(l.image=d)}}if(n.meta){const c={};for(const[d,h]of Object.entries(n.meta)){const p=O(h,s,e);p!=null&&(c[d]=p)}Object.keys(c).length>0&&(l.meta=c)}if(e&&Object.keys(e).length>0){l.meta||(l.meta={});for(const[c,d]of Object.entries(e))l.meta[c]=d}return l},$i=async(s,t)=>{var f,m,E,w,x;const{source:e,positional:n}=Ai(s),i=(f=t.protocols)==null?void 0:f.json;if(!i)return b(":json: protocol not configured"),[];const a=i.sources;if(!a)return b(":json: protocol has no sources configured"),[];const r=a[e];if(!r)return b(`:json: source "${e}" not found in protocol sources`),[];const o=i.vars;let l;try{l=ki(r,n,o)}catch{return b(`:json: failed to build URL for source "${e}"`),[]}let c;try{const T=new AbortController,A=setTimeout(()=>T.abort(),1e4),L={signal:T.signal,credentials:r.credentials?"include":"omit"};r.headers&&(L.headers={...r.headers});const I=await fetch(l,L);if(clearTimeout(A),!I.ok)return b(`:json: fetch failed for "${e}": ${I.status} ${I.statusText}`),[];const y=(E=(m=I.headers)==null?void 0:m.get)==null?void 0:E.call(m,"content-type");if(y&&!y.includes("application/json"))return b(`:json: unexpected content-type for "${e}": ${y} (expected application/json)`),[];const k=(x=(w=I.headers)==null?void 0:w.get)==null?void 0:x.call(w,"content-length");if(k&&parseInt(k,10)>1048576)return b(`:json: response too large for "${e}": ${k} bytes (max 1048576)`),[];c=await I.json()}catch(T){const A=T instanceof Error?T.message:String(T),L=T instanceof DOMException&&T.name==="AbortError"?"timeout after 10000ms":A;return b(`:json: network error for source "${e}": ${L}`),[]}let d;r.envelope&&c&&typeof c=="object"&&!Array.isArray(c)&&(d=Li(c,r.envelope));const h=_i(c,r.root);if(!h)return[];const p=[],v=Math.min(h.length,200);for(let T=0;T<v;T++){const A=Ni(h[T],r,d);A&&(A.cssClass=A.cssClass?`${A.cssClass} source_json`:"source_json",A.meta||(A.meta={}),A.meta.source="json",p.push(A))}return p},X="https://public.api.bsky.app/xrpc",Ri="https://bsky.social/xrpc",Y="https://bsky.app",oe="https://pdsls.dev/at",Te=10,Mi=80,St=s=>{if(!s.startsWith("at://"))return null;const t=s.slice(5);if(!t)return null;const e=t.split("/"),n=e[0];return n?{authority:n,collection:e[1]||void 0,rkey:e[2]||void 0}:null},Di=s=>{const{authority:t,collection:e,rkey:n}=s,i=[];if(e==="app.bsky.feed.post"&&n)i.push({label:"View on Bluesky",url:`${Y}/profile/${t}/post/${n}`,tags:["atproto","client"]}),i.push({label:"Inspect on pdsls.dev",url:`${oe}/${t}/${e}/${n}`,tags:["atproto","devtool"]}),i.push({label:"Raw JSON (API)",url:`${X}/app.bsky.feed.getPostThread?uri=at://${t}/${e}/${n}&depth=0`,tags:["atproto","raw"]});else if(!e||e==="app.bsky.actor.profile")i.push({label:"View on Bluesky",url:`${Y}/profile/${t}`,tags:["atproto","client"]}),i.push({label:"Inspect on pdsls.dev",url:`${oe}/${t}`,tags:["atproto","devtool"]}),i.push({label:"Raw JSON (API)",url:`${X}/app.bsky.actor.getProfile?actor=${t}`,tags:["atproto","raw"]});else{const a=n?`${t}/${e}/${n}`:`${t}/${e}`;i.push({label:"Inspect on pdsls.dev",url:`${oe}/${a}`,tags:["atproto","devtool"]}),i.push({label:"Raw JSON (API)",url:`${X}/com.atproto.repo.getRecord?repo=${t}&collection=${e}${n?`&rkey=${n}`:""}`,tags:["atproto","raw"]})}return i},Pi=s=>{const t=s[0],e=[],n={};for(const i of s.slice(1))if(i.includes("=")){const a=i.indexOf("=");n[i.slice(0,a)]=i.slice(a+1)}else e.push(i);return{command:t,positional:e,named:n}},Nt=(s,t)=>{var n,i;const e=(i=(n=t.protocols)==null?void 0:n.atproto)==null?void 0:i.searches;return e&&s in e?e[s]:s},Oi=(s,t)=>s.length<=t?s:s.slice(0,t-1)+"…",G=async(s,t,e)=>{var l,c,d,h;const n=e?Ri:X,i=new URL(`${n}/${s}`);for(const[p,v]of Object.entries(t))i.searchParams.set(p,v);const a=new AbortController,r=setTimeout(()=>a.abort(),1e4),o={};e&&(o.Authorization=`Bearer ${e}`);try{const p=await fetch(i.toString(),{signal:a.signal,credentials:"omit",headers:o});if(clearTimeout(r),!p.ok)return b(`:atproto: API error: ${p.status} ${p.statusText} for ${s}`),null;const v=(c=(l=p.headers)==null?void 0:l.get)==null?void 0:c.call(l,"content-type");if(v&&!v.includes("application/json"))return b(`:atproto: unexpected content-type: ${v}`),null;const f=(h=(d=p.headers)==null?void 0:d.get)==null?void 0:h.call(d,"content-length");return f&&parseInt(f,10)>1048576?(b(`:atproto: response too large: ${f} bytes`),null):await p.json()}catch(p){clearTimeout(r);const v=p instanceof Error?p.message:String(p),f=p instanceof DOMException&&p.name==="AbortError"?"timeout after 10000ms":v;return b(`:atproto: network error: ${f}`),null}},ke=s=>{var r,o;const t=St(s.uri);if(!t||!t.rkey)return null;const e=s.author,n=((r=s.record)==null?void 0:r.text)??"",i=e.displayName||e.handle;return{label:Oi(`${i}: ${n}`,Mi),url:`${Y}/profile/${e.handle}/post/${t.rkey}`,description:n,thumbnail:e.avatar,tags:["atproto","post"],createdAt:s.indexedAt||((o=s.record)==null?void 0:o.createdAt),meta:{handle:e.handle,did:e.did,atUri:s.uri}}},Ui=s=>({label:s.displayName||s.handle,url:`${Y}/profile/${s.handle}`,description:s.description,thumbnail:s.avatar,tags:["atproto","profile"],meta:{handle:s.handle,did:s.did,followers:s.followersCount,following:s.followsCount,posts:s.postsCount}}),$t={profile:async(s,t,e)=>{const n=s[0];if(!n)return b(":atproto: profile command requires an actor (handle or DID)"),[];const i=await G("app.bsky.actor.getProfile",{actor:n});if(!i)return[];const a=i,r=a.displayName||a.handle,o={handle:a.handle,did:a.did,followers:a.followersCount,following:a.followsCount,posts:a.postsCount};return[{label:`${r} — Bluesky`,url:`${Y}/profile/${a.handle}`,description:a.description,thumbnail:a.avatar,tags:["atproto","profile","client"],meta:o},{label:`${r} — pdsls.dev inspector`,url:`${oe}/${a.did}`,tags:["atproto","profile","devtool"],meta:o},{label:`${r} — raw JSON`,url:`${X}/app.bsky.actor.getProfile?actor=${a.handle}`,tags:["atproto","profile","raw"],meta:o}]},feed:async(s,t,e)=>{const n=s[0];if(!n)return b(":atproto: feed command requires an actor (handle or DID)"),[];const i=t.limit||String(Te),a=await G("app.bsky.feed.getAuthorFeed",{actor:n,limit:i});if(!a)return[];const r=a.feed??[],o=[],l=Math.min(r.length,200);for(let c=0;c<l;c++){const d=ke(r[c].post);d&&o.push(d)}return o},people:async(s,t,e,n)=>{const i=s[0];if(!i)return b(":atproto: people command requires a search query"),[];const a=n?Nt(i,n):i,r=t.limit||String(Te),o=await G("app.bsky.actor.searchActors",{q:a,limit:r});if(!o)return[];const l=o.actors??[],c=Math.min(l.length,200),d=[];for(let h=0;h<c;h++)d.push(Ui(l[h]));return d},thread:async(s,t,e)=>{var l;const n=s[0];if(!n||!n.startsWith("at://"))return b(":atproto: thread command requires a valid AT URI"),[];const i=await G("app.bsky.feed.getPostThread",{uri:n,depth:"0"});if(!i)return[];const r=(l=i.thread)==null?void 0:l.post;if(!r)return[];const o=ke(r);return o?[o]:[]},search:async(s,t,e,n)=>{if(!e)return b(":atproto: search requires authentication (searchPosts is not public). Pass an accessJwt via protocol config."),[];const i=s[0];if(!i)return b(":atproto: search command requires a query"),[];const a=n?Nt(i,n):i,r=t.limit||String(Te),o=await G("app.bsky.feed.searchPosts",{q:a,limit:r},e);if(!o)return[];const l=o.posts??[],c=Math.min(l.length,200),d=[];for(let h=0;h<c;h++){const p=ke(l[h]);p&&d.push(p)}return d}},Hi=async(s,t)=>{var c;const{command:e,positional:n,named:i}=Pi(s),a=$t[e];if(!a)return b(`:atproto: unknown command "${e}". Available: ${Object.keys($t).join(", ")}`),[];const r=(c=t.protocols)==null?void 0:c.atproto,o=r==null?void 0:r.accessJwt,l=await a(n,i,o,t);for(const d of l)d.cssClass=d.cssClass?`${d.cssClass} source_atproto`:"source_atproto",d.meta||(d.meta={}),d.meta.source="atproto";return l};return C.AlapEngine=H,C.AlapLens=Zn,C.AlapLensElement=_t,C.AlapLightbox=kn,C.AlapLightboxElement=lt,C.AlapLinkElement=qe,C.AlapUI=sn,C.ExpressionParser=_e,C.ProtocolCache=Ie,C.RENDERER_LENS=$e,C.RENDERER_LIGHTBOX=Ne,C.RENDERER_MENU=J,C.RendererCoordinator=an,C.atUriToDestinations=Di,C.atprotoHandler=Hi,C.createEmbed=ve,C.defineAlapLens=pi,C.defineAlapLightbox=Rn,C.defineAlapLink=ln,C.getConfig=Ke,C.getEmbedHeight=Qe,C.getEngine=W,C.getInstanceCoordinator=z,C.grantConsent=nt,C.hasConsent=it,C.isAllowlisted=Je,C.jsonHandler=$i,C.matchProvider=K,C.mergeConfigs=Ft,C.parseAtUri=St,C.registerConfig=Fe,C.revokeConsent=Cn,C.shouldLoadEmbed=tt,C.transformUrl=Ze,C.updateRegisteredConfig=rn,C.validateConfig=Kt,C.webHandler=yi,Object.defineProperty(C,Symbol.toStringTag,{value:"Module"}),C})({});
