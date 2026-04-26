var Alap=(function(A){"use strict";var Fr=Object.defineProperty;var Ur=(A,$,B)=>$ in A?Fr(A,$,{enumerable:!0,configurable:!0,writable:!0,value:B}):A[$]=B;var h=(A,$,B)=>Ur(A,typeof $!="symbol"?$+"":$,B);var hn;const pn="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",gn="strict-origin-when-cross-origin",Ge="alap_embed_consent",fn=typeof process<"u"&&typeof process.env<"u"&&process.env.NODE_ENV!=="production";function w(s){fn&&console.warn(`[alap] ${s}`)}const re=new WeakMap;function Ye(s,t){re.set(s,t)}function mn(s){return re.get(s)}function Ze(s,t){const e=re.get(s);e!==void 0&&re.set(t,e)}function Ee(s){try{new RegExp(s)}catch{return{safe:!1,reason:"Invalid regex syntax"}}const t=/^(?:[?*+]|\{\d+(?:,\d*)?\})/,e=/[?*+]|\{\d+(?:,\d*)?\}/,n=[];for(let i=0;i<s.length;i++){const r=s[i];if(r==="\\"){i++;continue}if(r==="["){for(i++,i<s.length&&s[i]==="^"&&i++,i<s.length&&s[i]==="]"&&i++;i<s.length&&s[i]!=="]";)s[i]==="\\"&&i++,i++;continue}if(r==="("){n.push(i);continue}if(r===")"){if(n.length===0)continue;const a=n.pop(),o=s.slice(i+1);if(t.test(o)){const l=s.slice(a+1,i);if(e.test(vn(l)))return{safe:!1,reason:`Nested quantifier detected: group at position ${a} contains a quantifier and is itself quantified — this can cause catastrophic backtracking`}}continue}}return{safe:!0}}function vn(s){let t="",e=0;for(;e<s.length;){if(s[e]==="\\"){e+=2;continue}if(s[e]==="["){for(e++,e<s.length&&s[e]==="^"&&e++,e<s.length&&s[e]==="]"&&e++;e<s.length&&s[e]!=="]";)s[e]==="\\"&&e++,e++;e++;continue}t+=s[e],e++}return t}function xe(s){const t=s&&typeof s=="object"?s:{};return{get(e){return t[e]},has(e){return Object.prototype.hasOwnProperty.call(t,e)},*entries(){for(const e of Object.keys(t))yield[e,t[e]]}}}class Je{constructor(t,e){this.base=t,this.overlay=e}get(t){return Object.prototype.hasOwnProperty.call(this.base,t)?this.base[t]:this.overlay.get(t)}has(t){return Object.prototype.hasOwnProperty.call(this.base,t)||this.overlay.has(t)}*entries(){for(const t of Object.keys(this.base))yield[t,this.base[t]];for(const[t,e]of this.overlay)Object.prototype.hasOwnProperty.call(this.base,t)||(yield[t,e])}}const bn=(s,t,e,n,i)=>{var y;const r=s.split("|"),a=r[0],o=r.slice(1);if(n!=null&&n.has(s))return n.get(s);const l=(y=t.protocols)==null?void 0:y[a],c=i==null?void 0:i(a);if(!l&&!c)return w(`Protocol "${a}" not found in config.protocols`),[];const d=typeof(c==null?void 0:c.filter)=="function"?c.filter:void 0;if(!d)return c!=null&&c.generate||w(`Protocol "${a}" has no filter or generate handler`),[];const u=e??xe(t.allLinks),p=[];for(const[b,g]of u.entries())if(!(!g||typeof g!="object"))try{d(o,g,b)&&p.push(b)}catch{w(`Protocol "${a}" handler threw for item "${b}" — skipping`)}return p},yn=s=>{const t=s.split(":");return{name:t[0],args:t.slice(1)}},wn=(s,t)=>{let e=s;for(const n of t)switch(n.name){case"sort":{const i=n.args[0]||"label";e=[...e].sort((r,a)=>{const o=i==="id"?r.id:String(r[i]??""),l=i==="id"?a.id:String(a[i]??"");return o.localeCompare(l)});break}case"reverse":e=[...e].reverse();break;case"limit":{const i=parseInt(n.args[0],10);i>=0&&!isNaN(i)&&(e=e.slice(0,i));break}case"skip":{const i=parseInt(n.args[0],10);i>0&&(e=e.slice(i));break}case"shuffle":{e=[...e];for(let i=e.length-1;i>0;i--){const r=Math.floor(Math.random()*(i+1));[e[i],e[r]]=[e[r],e[i]]}break}case"unique":{const i=n.args[0]||"url",r=new Set;e=e.filter(a=>{const o=i==="id"?a.id:String(a[i]??"");return r.has(o)?!1:(r.add(o),!0)});break}default:w(`Unknown refiner "${n.name}" — skipping`)}return e};class Qe{constructor(t,e,n){h(this,"config");h(this,"catalog");h(this,"depth",0);h(this,"regexCount",0);h(this,"generatedIds",new Map);h(this,"getHandlers");this.config=t,this.getHandlers=e,this.catalog=n??xe(t.allLinks)}updateConfig(t,e){this.config=t,e?this.catalog=e:this.catalog=xe(t.allLinks)}setGeneratedIds(t){this.generatedIds=t}query(t,e){if(!t||typeof t!="string")return[];const n=t.trim();if(!n)return[];const i=this.expandMacros(n,e);if(!i)return[];const r=this.tokenize(i);if(r.length===0)return[];if(r.length>1024)return w(`Expression has ${r.length} tokens (max 1024). Ignoring: "${t.slice(0,60)}..."`),[];this.depth=0,this.regexCount=0;const a=this.parseQuery(r);return[...new Set(a)]}searchByClass(t){const e=[];for(const[n,i]of this.catalog.entries())!i||!Array.isArray(i.tags)||i.tags.includes(t)&&e.push(n);return e}searchByRegex(t,e){if(this.regexCount++,this.regexCount>5)return w(`Regex query limit exceeded (max 5 per expression). Skipping /${t}/`),[];const n=this.config.searchPatterns;if(!n||!(t in n))return w(`Search pattern "${t}" not found in config.searchPatterns`),[];const i=n[t],r=typeof i=="string"?{pattern:i}:i,a=Ee(r.pattern);if(!a.safe)return w(`Unsafe regex pattern "${r.pattern}" in searchPatterns["${t}"]: ${a.reason}`),[];let o;try{o=new RegExp(r.pattern,"i")}catch{return w(`Invalid regex pattern "${r.pattern}" in searchPatterns["${t}"]`),[]}const l=r.options??{},c=this.parseFieldCodes(e||l.fields||"a"),d=Date.now(),u=l.age?this.parseAge(l.age):0,p=l.limit??100,y=Date.now(),b=[];for(const[g,m]of this.catalog.entries())if(!(!m||typeof m!="object")){if(Date.now()-y>20){w(`Regex search /${t}/ timed out after 20ms — returning partial results`);break}if(u>0){const f=this.toTimestamp(m.createdAt);if(f===0||d-f>u)continue}if(this.matchesFields(o,g,m,c)){const f=m.createdAt?this.toTimestamp(m.createdAt):0;if(b.push({id:g,createdAt:f}),b.length>=100){w(`Regex search /${t}/ hit 100 result cap — truncating`);break}}}return l.sort==="alpha"?b.sort((g,m)=>g.id.localeCompare(m.id)):l.sort==="newest"?b.sort((g,m)=>m.createdAt-g.createdAt):l.sort==="oldest"&&b.sort((g,m)=>g.createdAt-m.createdAt),b.slice(0,p).map(g=>g.id)}resolveProtocol(t){return bn(t,this.config,this.catalog,this.generatedIds,this.getHandlers)}applyRefiners(t,e){if(e.length===0)return t;const n=t.map(a=>{const o=this.catalog.get(a);if(!o)return null;const l={id:a,...o};return Ze(o,l),l}).filter(a=>a!==null),i=e.map(a=>yn(a.value));return wn(n,i).map(a=>a.id)}parseFieldCodes(t){const e=new Set,n=t.replace(/[\s,]/g,"");for(const i of n)switch(i){case"l":e.add("label");break;case"u":e.add("url");break;case"t":e.add("tags");break;case"d":e.add("description");break;case"k":e.add("id");break;case"a":e.add("label"),e.add("url"),e.add("tags"),e.add("description"),e.add("id");break}return e.size>0?e:new Set(["label","url","tags","description","id"])}matchesFields(t,e,n,i){if(i.has("id")&&t.test(e)||i.has("label")&&n.label&&t.test(n.label)||i.has("url")&&t.test(n.url)||i.has("description")&&n.description&&t.test(n.description))return!0;if(i.has("tags")&&n.tags){for(const r of n.tags)if(t.test(r))return!0}return!1}parseAge(t){const e=t.match(/^(\d+)\s*([dhwm])$/i);if(!e)return 0;const n=parseInt(e[1],10);switch(e[2].toLowerCase()){case"h":return n*60*60*1e3;case"d":return n*24*60*60*1e3;case"w":return n*7*24*60*60*1e3;case"m":return n*30*24*60*60*1e3;default:return 0}}toTimestamp(t){if(t==null)return 0;if(typeof t=="number")return t;const e=new Date(t);return isNaN(e.getTime())?0:e.getTime()}expandMacros(t,e){let n=t,i=0;for(;n.includes("@")&&i<10;){const r=n;if(n=n.replace(/@(\w*)/g,(a,o)=>{var c;if(!o)return w('Bare "@" is no longer supported — use "@macroname" to reference a named macro in config.macros'),"";const l=(c=this.config.macros)==null?void 0:c[o];return!l||typeof l.linkItems!="string"?(w(`Macro "@${o}" not found in config.macros`),""):l.linkItems}),n===r)break;i++}return i>=10&&n.includes("@")&&w(`Macro expansion hit 10-round limit — possible circular reference in "${t.slice(0,60)}"`),n}tokenize(t){const e=[];let n=0;for(;n<t.length;){const i=t[n];if(/\s/.test(i)){n++;continue}if(i==="+"){e.push({type:"PLUS",value:"+"}),n++;continue}if(i==="|"){e.push({type:"PIPE",value:"|"}),n++;continue}if(i==="-"){e.push({type:"MINUS",value:"-"}),n++;continue}if(i===","){e.push({type:"COMMA",value:","}),n++;continue}if(i==="("){e.push({type:"LPAREN",value:"("}),n++;continue}if(i===")"){e.push({type:"RPAREN",value:")"}),n++;continue}if(i==="."){n++;let r="";for(;n<t.length&&/\w/.test(t[n]);)r+=t[n],n++;r&&e.push({type:"CLASS",value:r});continue}if(i==="#"){n++;let r="";for(;n<t.length&&/\w/.test(t[n]);)r+=t[n],n++;r&&e.push({type:"DOM_REF",value:r});continue}if(i==="/"){n++;let r="";for(;n<t.length&&t[n]!=="/";)r+=t[n],n++;let a="";if(n<t.length&&t[n]==="/")for(n++;n<t.length&&/[lutdka]/.test(t[n]);)a+=t[n],n++;r&&e.push({type:"REGEX",value:a?`${r}|${a}`:r});continue}if(i===":"){n++;let r="";for(;n<t.length&&t[n]!==":";)r+=t[n],n++;for(;n<t.length&&t[n]===":"&&(n++,!(n>=t.length||/[\s+|,()*/]/.test(t[n])));)for(r+="|";n<t.length&&t[n]!==":";)r+=t[n],n++;r&&e.push({type:"PROTOCOL",value:r});continue}if(i==="*"){n++;let r="";for(;n<t.length&&t[n]!=="*";)r+=t[n],n++;n<t.length&&t[n]==="*"&&n++,r&&e.push({type:"REFINER",value:r});continue}if(/\w/.test(i)){let r="";for(;n<t.length&&/\w/.test(t[n]);)r+=t[n],n++;e.push({type:"ITEM_ID",value:r});continue}n++}return e}parseQuery(t){let e=[],n=0;const i=this.parseSegment(t,n);for(e=i.ids,n=i.pos;n<t.length&&t[n].type==="COMMA"&&(n++,!(n>=t.length));){const r=this.parseSegment(t,n);e=[...e,...r.ids],n=r.pos}return e}parseSegment(t,e){if(e>=t.length)return{ids:[],pos:e};const n=e,i=this.parseTerm(t,e);let r=i.ids;e=i.pos;let a=e>n;for(;e<t.length;){const l=t[e];if(l.type!=="PLUS"&&l.type!=="PIPE"&&l.type!=="MINUS")break;const c=l.type;if(e++,e>=t.length)break;const d=this.parseTerm(t,e);if(e=d.pos,!a)r=d.ids,a=!0;else if(c==="PLUS"){const u=new Set(d.ids);r=r.filter(p=>u.has(p))}else if(c==="PIPE")r=[...new Set([...r,...d.ids])];else if(c==="MINUS"){const u=new Set(d.ids);r=r.filter(p=>!u.has(p))}}const o=[];for(;e<t.length&&t[e].type==="REFINER";){if(o.length>=10){w("Refiner limit exceeded (max 10 per expression). Skipping remaining refiners."),e++;continue}o.push(t[e]),e++}return o.length>0&&(r=this.applyRefiners(r,o)),{ids:r,pos:e}}parseTerm(t,e){if(e>=t.length)return{ids:[],pos:e};if(t[e].type==="LPAREN"){if(this.depth++,this.depth>32)return w("Parentheses nesting exceeds max depth (32). Ignoring nested group."),{ids:[],pos:t.length};e++;const n=this.parseSegment(t,e);return e=n.pos,e<t.length&&t[e].type==="RPAREN"&&e++,this.depth--,{ids:n.ids,pos:e}}return this.parseAtom(t,e)}parseAtom(t,e){if(e>=t.length)return{ids:[],pos:e};const n=t[e];switch(n.type){case"ITEM_ID":{const i=this.catalog.get(n.value);return(!i||typeof i!="object")&&w(`Item ID "${n.value}" not found in config.allLinks`),{ids:i&&typeof i=="object"?[n.value]:[],pos:e+1}}case"CLASS":return{ids:this.searchByClass(n.value),pos:e+1};case"REGEX":{const[i,r]=n.value.includes("|")?n.value.split("|",2):[n.value,void 0];return{ids:this.searchByRegex(i,r),pos:e+1}}case"PROTOCOL":return{ids:this.resolveProtocol(n.value),pos:e+1};case"DOM_REF":return{ids:[],pos:e+1};default:return{ids:[],pos:e}}}}class et{constructor(t=5){h(this,"entries",new Map);h(this,"defaultTTL");this.defaultTTL=t}get(t){const e=this.entries.get(t);return e?Date.now()>e.expiry?(this.entries.delete(t),null):e.links:null}set(t,e,n){const i=n??this.defaultTTL;if(!(i<=0)){if(this.entries.size>=50&&!this.entries.has(t)){let r,a=1/0;for(const[o,l]of this.entries)l.expiry<a&&(a=l.expiry,r=o);r&&this.entries.delete(r)}this.entries.set(t,{links:e,expiry:Date.now()+i*60*1e3})}}clear(){this.entries.clear()}}function D(s){if(!s)return s;const t=s.replace(/[\x00-\x1f\x7f]/g,"").trim();return/^(javascript|data|vbscript|blob)\s*:/i.test(t)?"about:blank":s}function En(s){return se(s,["http","https","mailto"])}function se(s,t){const e=D(s);if(e==="about:blank"||!e)return e;const n=t??["http","https"],i=e.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*)\s*:/);if(i){const r=i[1].toLowerCase();if(!n.includes(r))return"about:blank"}return e}function tt(s){if(s===null||typeof s!="object"||Object.isFrozen(s))return s;Object.freeze(s);for(const t of Object.getOwnPropertyNames(s)){const e=s[t];e!==null&&(typeof e=="object"||typeof e=="function")&&tt(e)}return s}const nt=64,it=1e4;class j extends Error{constructor(t){super(t),this.name="ConfigCloneError"}}const xn=new Set(["__proto__","constructor","prototype"]);function An(s){const t=new WeakSet;let e=0;function n(i,r,a){if(i==null)return i;const o=typeof i;if(o==="string"||o==="number"||o==="boolean"||o==="bigint"||o==="symbol")return i;if(o==="function")throw new j(`Functions are not allowed in config (at ${a||"<root>"}). Pass handlers via new AlapEngine(config, { handlers }) — see docs/handlers-out-of-config.md.`);if(r>nt)throw new j(`Config depth exceeds ${nt} (at ${a})`);if(++e>it)throw new j(`Config node count exceeds ${it}`);const l=i;if(t.has(l))throw new j(`Cycle detected in config (at ${a})`);if(t.add(l),Array.isArray(i)){const u=new Array(i.length);for(let p=0;p<i.length;p++)u[p]=n(i[p],r+1,`${a}[${p}]`);return u}const c=Object.getPrototypeOf(i);if(c!==Object.prototype&&c!==null){const u=c&&c.constructor&&c.constructor.name||"unknown";throw new j(`Unexpected object type in config at ${a||"<root>"}: ${u} (only plain objects, arrays, and primitives are allowed).`)}const d={};for(const u of Object.keys(l))xn.has(u)||(d[u]=n(l[u],r+1,a?`${a}.${u}`:u));return d}return n(s,0,"")}const F=new Set(["__proto__","constructor","prototype"]),rt=new WeakSet;class Cn extends Error{constructor(t){super(t),this.name="ConfigMigrationError"}}function Ae(s){const t=s.protocols;if(!(!t||typeof t!="object")){for(const[e,n]of Object.entries(t))if(!(!n||typeof n!="object")){for(const i of["generate","filter","handler"])if(typeof n[i]=="function")throw new Cn(`config.protocols.${e}.${i} is a function — handlers must be passed via new AlapEngine(config, { handlers: { ${e}: fn } }) instead. See docs/handlers-out-of-config.md.`)}}}function st(s){const t={...s,url:D(s.url)};if(typeof s.image=="string"&&(t.image=D(s.image)),typeof s.thumbnail=="string"&&(t.thumbnail=D(s.thumbnail)),s.meta&&typeof s.meta=="object"&&!Array.isArray(s.meta)){const e={};for(const[n,i]of Object.entries(s.meta))F.has(n)||(typeof i=="string"&&/url$/i.test(n)?e[n]=D(i):e[n]=i);t.meta=e}return t}function U(s,t={}){const e=t.provenance??"author";if(!s||typeof s!="object")throw new Error("Invalid config: expected an object");if(rt.has(s))return s;Ae(s);const i=An(s),r=i.settings,a=Array.isArray(r==null?void 0:r.hooks)?new Set(r.hooks.filter(g=>typeof g=="string")):null;if(!i.allLinks||typeof i.allLinks!="object"||Array.isArray(i.allLinks))throw new Error("Invalid config: allLinks must be a non-null object");const o=i.allLinks,l={};for(const g of Object.keys(o)){if(F.has(g))continue;if(g.includes("-")){w(`validateConfig: skipping allLinks["${g}"] — hyphens are not allowed in item IDs. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);continue}const m=o[g];if(!m||typeof m!="object"||Array.isArray(m)){w(`validateConfig: skipping allLinks["${g}"] — not a valid link object`);continue}const f=m;if(typeof f.url!="string"){w(`validateConfig: skipping allLinks["${g}"] — missing or invalid url`);continue}let x;f.tags!==void 0&&(Array.isArray(f.tags)?x=f.tags.filter(k=>typeof k!="string"?!1:k.includes("-")?(w(`validateConfig: allLinks["${g}"] — stripping tag "${k}" (hyphens not allowed in tags). Use underscores instead.`),!1):!0):w(`validateConfig: allLinks["${g}"].tags is not an array — ignoring`));const C={url:f.url};if(typeof f.label=="string"&&(C.label=f.label),x!==void 0&&(C.tags=x),typeof f.cssClass=="string"&&(C.cssClass=f.cssClass),typeof f.image=="string"&&(C.image=f.image),typeof f.altText=="string"&&(C.altText=f.altText),typeof f.targetWindow=="string"&&(C.targetWindow=f.targetWindow),typeof f.description=="string"&&(C.description=f.description),typeof f.thumbnail=="string"&&(C.thumbnail=f.thumbnail),Array.isArray(f.hooks)){const k=f.hooks.filter(L=>typeof L=="string");if(e==="author")C.hooks=k;else if(a){const L=[];for(const E of k)a.has(E)?L.push(E):w(`validateConfig: allLinks["${g}"] — stripping hook "${E}" not in settings.hooks allowlist (tier: ${e})`);L.length>0&&(C.hooks=L)}else k.length>0&&w(`validateConfig: allLinks["${g}"] — dropping ${k.length} hook(s) on ${e}-tier link; declare settings.hooks to allow specific keys`)}if(typeof f.guid=="string"&&(C.guid=f.guid),f.createdAt!==void 0&&(C.createdAt=f.createdAt),f.meta&&typeof f.meta=="object"&&!Array.isArray(f.meta)){const k=f.meta,L={};for(const E of Object.keys(k))F.has(E)||(L[E]=k[E]);C.meta=L}const T=st(C);Ye(T,e),l[g]=T}let c;if(i.settings&&typeof i.settings=="object"&&!Array.isArray(i.settings)){const g=i.settings;c={};for(const m of Object.keys(g))F.has(m)||(c[m]=g[m])}let d;if(i.macros&&typeof i.macros=="object"&&!Array.isArray(i.macros)){const g=i.macros;d={};for(const m of Object.keys(g)){if(F.has(m))continue;if(m.includes("-")){w(`validateConfig: skipping macro "${m}" — hyphens are not allowed in macro names. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);continue}const f=g[m];f&&typeof f=="object"&&typeof f.linkItems=="string"?d[m]=f:w(`validateConfig: skipping macro "${m}" — invalid shape`)}}let u;if(i.searchPatterns&&typeof i.searchPatterns=="object"&&!Array.isArray(i.searchPatterns)){const g=i.searchPatterns;u={};for(const m of Object.keys(g)){if(F.has(m))continue;if(m.includes("-")){w(`validateConfig: skipping searchPattern "${m}" — hyphens are not allowed in pattern keys. Use underscores instead. The "-" character is the WITHOUT operator in expressions.`);continue}const f=g[m];if(typeof f=="string"){const x=Ee(f);x.safe?u[m]=f:w(`validateConfig: removing searchPattern "${m}" — ${x.reason}`);continue}if(f&&typeof f=="object"&&typeof f.pattern=="string"){const x=f.pattern,C=Ee(x);C.safe?u[m]=f:w(`validateConfig: removing searchPattern "${m}" — ${C.reason}`);continue}w(`validateConfig: skipping searchPattern "${m}" — invalid shape`)}}let p;if(i.protocols&&typeof i.protocols=="object"&&!Array.isArray(i.protocols)){const g=i.protocols;p={};for(const m of Object.keys(g))F.has(m)||(p[m]=g[m])}const y={allLinks:l};c&&(y.settings=c),d&&(y.macros=d),u&&(y.searchPatterns=u),p&&(y.protocols=p);const b=tt(y);return rt.add(b),b}const at=/:([a-zA-Z]\w*(?::[^:\s+|,()*/]+)*):/g;let Tn=0;const kn=s=>`__alap_gen_${s}_${Tn++}_${Date.now().toString(36)}`;class K{constructor(t,e={}){h(this,"config");h(this,"parser");h(this,"cache");h(this,"generatedIds",new Map);h(this,"generatedLinks",new Map);h(this,"catalog");h(this,"inFlight",new Map);h(this,"fetchAborts",new Map);h(this,"fetchSubscribers",new Map);h(this,"errorCache",new Map);h(this,"activeFetchCount",0);h(this,"fetchQueue",[]);h(this,"handlers",new Map);Ae(t);const n=U(t,{provenance:e.provenance??"author"});if(this.config=n,this.cache=new et,e.handlers)for(const[i,r]of Object.entries(e.handlers))this.registerProtocol(i,r);this.catalog=new Je(n.allLinks??{},this.generatedLinks),this.parser=new Qe(n,i=>this.getProtocolEntry(i),this.catalog)}registerProtocol(t,e){if(this.handlers.has(t))throw new Error(`Protocol "${t}" already registered. Handlers are atomic — if you need both generate and filter, pass them together in one { generate, filter } entry.`);const n=typeof e=="function"?{generate:e}:e;this.handlers.set(t,n)}getProtocolEntry(t){return this.handlers.get(t)}get maxConcurrentFetches(){var e;const t=(e=this.config.settings)==null?void 0:e.maxConcurrentFetches;return typeof t=="number"&&t>0?t:6}get fetchTimeoutMs(){var e;const t=(e=this.config.settings)==null?void 0:e.fetchTimeout;return typeof t=="number"&&t>0?t:3e4}query(t,e){return this.parser.query(t,e)}getLinks(t){return t.map(e=>{const n=this.catalog.get(e);if(!n)return null;const i={id:e,...n};return Ze(n,i),i}).filter(e=>e!==null)}resolve(t,e){return this.getLinks(this.query(t,e))}async resolveAsync(t,e){return await this.preResolve([t]),this.getLinks(this.query(t,e))}resolveProgressive(t,e){const n=this.prepareProgressive(t);return{resolved:this.getLinks(this.query(t,e)),sources:n}}async preResolve(t){const e=[];for(const n of t)for(const i of this.extractAsyncTokens(n)){const r=this.ensureTokenResolution(i);r&&e.push(r)}await Promise.allSettled(e),this.parser.setGeneratedIds(this.generatedIds)}updateConfig(t){Ae(t);const e=U(t);this.config=e,this.catalog=new Je(e.allLinks??{},this.generatedLinks),this.parser.updateConfig(e,this.catalog),this.cleanupGenerated(),this.generatedIds.clear()}addLink(t,e){const n={...this.config.allLinks,[t]:e};this.updateConfig(U({...this.config,allLinks:n}))}removeLink(t){if(!this.config.allLinks||!(t in this.config.allLinks))return;const e={...this.config.allLinks};delete e[t],this.updateConfig(U({...this.config,allLinks:e}))}updateSettings(t){const e={...this.config.settings??{},...t};this.updateConfig(U({...this.config,settings:e}))}clearCache(){this.cache.clear(),this.errorCache.clear()}clearGenerated(){this.cleanupGenerated()}prepareProgressive(t){const e=[],n=this.extractAsyncTokens(t),i=a=>a.replace(/:/g,"|");let r=!1;for(const a of n){const o=a.split(":")[0],l=this.errorCache.get(a);if(l){e.push({token:a,status:"error",error:l});continue}const c=this.cache.get(a);if(c!==null){this.generatedIds.has(i(a))||(this.injectLinks(a,o,c),r=!0),c.length===0&&e.push({token:a,status:"empty"});continue}const d=this.inFlight.get(a);if(d){this.subscribeToken(a),e.push({token:a,status:"loading",promise:d});continue}const u=this.ensureTokenResolution(a);u&&e.push({token:a,status:"loading",promise:u})}return r&&this.parser.setGeneratedIds(this.generatedIds),e}ensureTokenResolution(t){var p;const e=t.split(":"),n=e[0],i=e.slice(1),r=(p=this.config.protocols)==null?void 0:p[n],a=this.getProtocolEntry(n);if(!r&&!a)return;const o=a==null?void 0:a.generate;if(typeof o!="function")return;const l=this.cache.get(t);if(l!==null){const y=t.replace(/:/g,"|");this.generatedIds.has(y)||this.injectLinks(t,n,l);return}if(this.errorCache.has(t))return;const c=this.inFlight.get(t);if(c)return this.subscribeToken(t),c;const d=this.getCacheTTL(r,i[0]),u=this.startFetch(o,i,n,t,d);return this.inFlight.set(t,u),this.subscribeToken(t),u}subscribeToken(t){this.fetchSubscribers.set(t,(this.fetchSubscribers.get(t)??0)+1)}abortInFlight(t){const e=this.fetchSubscribers.get(t)??0;if(e<=1){this.fetchSubscribers.delete(t);const n=this.fetchAborts.get(t);n&&n.abort()}else this.fetchSubscribers.set(t,e-1)}startFetch(t,e,n,i,r){return this.activeFetchCount<this.maxConcurrentFetches?(this.activeFetchCount++,this.runFetch(t,e,n,i,r)):new Promise(a=>{this.fetchQueue.push(()=>{this.activeFetchCount++,a(this.runFetch(t,e,n,i,r))})})}async runFetch(t,e,n,i,r){const a=new AbortController;this.fetchAborts.set(i,a);const o=this.fetchTimeoutMs,l=setTimeout(()=>{a.abort(new Error(`fetch timeout after ${o}ms`))},o),c=t(e,this.config,{signal:a.signal});try{const d=await this.raceWithAbort(c,a.signal),u=d.slice(0,200);d.length>2e3?w(`:${n}: returned ${d.length} links — >10× the 200-item cap. This is suspicious: a well-behaved handler should respect the cap internally. Capped at 200.`):d.length>200&&w(`:${n}: returned ${d.length} links, capped at 200`),this.cache.set(i,u,r),this.errorCache.delete(i),this.generatedIds.has(i.replace(/:/g,"|"))||(this.injectLinks(i,n,u),this.parser.setGeneratedIds(this.generatedIds))}catch(d){const u=d instanceof Error?d:new Error(String(d));w(`:${n}: generate handler failed: ${u.message}`),this.errorCache.set(i,u)}finally{clearTimeout(l),this.fetchAborts.delete(i),this.inFlight.delete(i),this.fetchSubscribers.delete(i),this.releaseFetchSlot()}}releaseFetchSlot(){this.activeFetchCount--;const t=this.fetchQueue.shift();t&&t()}raceWithAbort(t,e){return e.aborted?Promise.reject(e.reason??new Error("aborted")):new Promise((n,i)=>{const r=()=>{e.removeEventListener("abort",r),i(e.reason??new Error("aborted"))};e.addEventListener("abort",r),t.then(a=>{e.removeEventListener("abort",r),n(a)},a=>{e.removeEventListener("abort",r),i(a)})})}extractAsyncTokens(t){const e=new Set;at.lastIndex=0;let n;for(;(n=at.exec(t))!==null;)e.add(n[1]);return Array.from(e)}injectLinks(t,e,n){const i=[],r=`protocol:${e}`;for(const a of n){const o=kn(e),l=st(a);Ye(l,r),this.generatedLinks.set(o,l),i.push(o)}this.generatedIds.set(t.replace(/:/g,"|"),i)}cleanupGenerated(){this.generatedLinks.clear(),this.generatedIds.clear(),this.parser.setGeneratedIds(new Map)}getCacheTTL(t,e){if(t){if(e&&t.keys){const n=t.keys[e];if(n&&"cache"in n)return n.cache}if("cache"in t&&typeof t.cache=="number")return t.cache}}}const Ln=new Set(["__proto__","constructor","prototype"]);function ae(s,t){for(const e of Object.keys(t))Ln.has(e)||(s[e]=t[e]);return s}function Sn(...s){const t={allLinks:{}};for(const e of s)e.settings&&(t.settings=ae({...t.settings},e.settings)),e.macros&&(t.macros=ae({...t.macros},e.macros)),e.searchPatterns&&(t.searchPatterns=ae({...t.searchPatterns},e.searchPatterns)),ae(t.allLinks,e.allLinks);return t}const oe="menu",ot="lightbox",lt="lens";class _n{constructor(){h(this,"instances",new Map)}subscribe(t,e,n){return this.instances.set(t,{type:e,close:n}),()=>{this.instances.delete(t)}}notifyOpen(t){const e=this.instances.get(t);if(e)for(const[n,i]of this.instances)n!==t&&i.type===e.type&&i.close()}closeAll(t){for(const[,e]of this.instances)(!t||e.type===t)&&e.close()}get size(){return this.instances.size}has(t){return this.instances.has(t)}destroy(){this.instances.clear()}}let Ce=null;function H(){return Ce||(Ce=new _n),Ce}function Te(s){return mn(s)==="author"}function P(s,t){return Te(t)?D(s):En(s)}function In(s,t){if(s!==void 0)return Te(t)?s:void 0}function z(s,t){return Te(t)?s:"_blank"}function ke(s,t={}){const e=t.listType??"ul",n=document.createElement(e);if(t.listAttributes)for(const[r,a]of Object.entries(t.listAttributes))n.setAttribute(r,a);const i=t.maxVisibleItems??0;i>0&&s.length>i&&(n.style.maxHeight=`${i*2.25}rem`,n.style.overflowY="auto");for(const r of s){const a=document.createElement("li");a.setAttribute("role","none");const o=In(r.cssClass,r);if(a.className=o?`alapListElem ${o}`:"alapListElem",t.liAttributes)for(const[d,u]of Object.entries(t.liAttributes))a.setAttribute(d,u);const l=document.createElement("a");if(l.setAttribute("role","menuitem"),l.setAttribute("tabindex","-1"),l.rel="noopener noreferrer",l.href=P(r.url,r),l.target=z(r.targetWindow,r)??t.defaultTargetWindow??"fromAlap",t.aAttributes)for(const[d,u]of Object.entries(t.aAttributes))l.setAttribute(d,u);const c=r.hooks??t.globalHooks;if(c&&c.length>0&&l.setAttribute("data-alap-hooks",c.join(" ")),r.guid&&l.setAttribute("data-alap-guid",r.guid),r.thumbnail&&l.setAttribute("data-alap-thumbnail",r.thumbnail),r.image){const d=document.createElement("img");if(d.src=P(r.image,r),d.alt=r.altText??`image for ${r.id}`,t.imgAttributes)for(const[u,p]of Object.entries(t.imgAttributes))d.setAttribute(u,p);l.appendChild(d)}else l.textContent=r.label??r.id;a.appendChild(l),n.appendChild(a)}return n}function ct(s,t,e,n,i){if(t.length===0)return!1;const r=t.indexOf(e);switch(s.key){case"ArrowDown":{s.preventDefault();const a=r<t.length-1?r+1:0;return t[a].focus(),t[a].scrollIntoView({block:"nearest"}),!0}case"ArrowUp":{s.preventDefault();const a=r>0?r-1:t.length-1;return t[a].focus(),t[a].scrollIntoView({block:"nearest"}),!0}case"ArrowRight":{const a=e,o=a==null?void 0:a.getAttribute("data-alap-hooks");return o!=null&&o.split(" ").includes("item-context")&&(i!=null&&i.onItemContext),!1}case"ArrowLeft":{const a=e,o=a==null?void 0:a.getAttribute("data-alap-hooks");return o!=null&&o.split(" ").includes("item-context")&&(i!=null&&i.onItemContextDismiss),!1}case"Home":return s.preventDefault(),t[0].focus(),t[0].scrollIntoView({block:"nearest"}),!0;case"End":return s.preventDefault(),t[t.length-1].focus(),t[t.length-1].scrollIntoView({block:"nearest"}),!0;case"Escape":return n(),!0;case"Tab":return n(),!0;default:return!1}}class dt{constructor(t,e){h(this,"timerId",0);h(this,"timeout");h(this,"callback");this.timeout=t,this.callback=e}start(){this.stop(),this.timerId=window.setTimeout(this.callback,this.timeout)}stop(){this.timerId&&(clearTimeout(this.timerId),this.timerId=0)}setTimeout(t){this.timeout=t}}function Le(s,t){const e=s.getAttribute("data-alap-existing");return e==="prepend"||e==="append"||e==="ignore"?e:t??"prepend"}function Se(s,t,e){if(e==="ignore")return s;const n=t.getAttribute("href");if(!n||n==="#"||n==="")return s;let i;try{const a=new URL(n,window.location.href);i=a.hostname+(a.pathname!=="/"?a.pathname:"")}catch{i=n}const r={id:"_existing",label:i,url:n};return e==="prepend"?[r,...s]:[...s,r]}const Nn=new Set(["n","ne","e","se","s","sw","w","nw","c"]),Pn=new Set(["place","flip","clamp"]),ht={place:0,flip:1,clamp:2};function I(s){let t=null,e=null;for(const n of s.split(",")){const i=n.trim().toLowerCase().replace(/[^a-z]/g,"");if(i){if(Nn.has(i)&&!t)t=i.toUpperCase();else if(Pn.has(i)){const r=i;(!e||ht[r]>ht[e])&&(e=r)}}}return{compass:t??"SE",strategy:e??"flip"}}const _e={N:["S","NE","NW","SE","SW","E","W","C"],NE:["SW","SE","NW","S","N","E","W","C"],E:["W","SE","NE","SW","NW","S","N","C"],SE:["NW","NE","SW","S","N","E","W","C"],S:["N","SE","SW","NE","NW","E","W","C"],SW:["NE","NW","SE","S","N","W","E","C"],W:["E","NW","SW","NE","SE","N","S","C"],NW:["SE","SW","NE","N","S","W","E","C"],C:["SE","NE","SW","NW","S","N","E","W"]};function Ie(s,t,e,n){const i=t.left+t.width/2,r=t.top+t.height/2;switch(s){case"N":return{x:i-e.width/2,y:t.top-n-e.height};case"NE":return{x:t.left,y:t.top-n-e.height};case"E":return{x:t.right+n,y:r-e.height/2};case"SE":return{x:t.left,y:t.bottom+n};case"S":return{x:i-e.width/2,y:t.bottom+n};case"SW":return{x:t.right-e.width,y:t.bottom+n};case"W":return{x:t.left-n-e.width,y:r-e.height/2};case"NW":return{x:t.right-e.width,y:t.top-n-e.height};case"C":return{x:i-e.width/2,y:r-e.height/2}}}function ut(s,t,e,n,i){return s>=i&&t>=i&&s+e.width<=n.width-i&&t+e.height<=n.height-i}function Rn(s,t,e,n,i){const r=n.width-2*i,a=n.height-2*i,o=Math.min(e.width,r),l=Math.min(e.height,a),c=Math.max(i,Math.min(s,n.width-i-o)),d=Math.max(i,Math.min(t,n.height-i-l));return{x:c,y:d,effectiveWidth:o,effectiveHeight:l}}function q(s){const t=s.placement??"SE",e=s.strategy??"flip",n=s.gap??4,i=s.padding??8,{triggerRect:r,menuSize:a,viewport:o}=s,l=Ie(t,r,a,n);if(e==="place")return{placement:t,x:l.x,y:l.y,scrollY:!1};if(ut(l.x,l.y,a,o,i))return{placement:t,x:l.x,y:l.y,scrollY:!1};for(const p of _e[t]){const y=Ie(p,r,a,n);if(ut(y.x,y.y,a,o,i))return{placement:p,x:y.x,y:y.y,scrollY:!1}}if(e==="flip")return{placement:t,x:l.x,y:l.y,scrollY:!1};const c=[t,..._e[t]];let d=-1,u={placement:t,x:i,y:i,maxWidth:o.width-2*i,maxHeight:o.height-2*i,scrollY:!0};for(const p of c){const y=Ie(p,r,a,n),b=Rn(y.x,y.y,a,o,i),g=b.effectiveWidth*b.effectiveHeight;if(g>d){d=g;const m=b.effectiveWidth<a.width,f=b.effectiveHeight<a.height;u={placement:p,x:b.x,y:b.y,maxWidth:m?b.effectiveWidth:void 0,maxHeight:f?b.effectiveHeight:void 0,scrollY:f}}}return u}const $n={N:"flex-start",NE:"flex-start",NW:"flex-start",S:"flex-end",SE:"flex-end",SW:"flex-end",E:"center",W:"center",C:"center"},Mn={N:"center",S:"center",C:"center",NE:"flex-end",E:"flex-end",SE:"flex-end",NW:"flex-start",W:"flex-start",SW:"flex-start"};function le(s,t,e){const i={alignItems:$n[s.compass],justifyContent:Mn[s.compass]};return s.strategy==="clamp"&&(i.maxHeight=`${Math.max(0,t.height-16)}px`,i.maxWidth=`${Math.max(0,t.width-16)}px`),i}function ce(s,t){s.style.alignItems=t.alignItems,s.style.justifyContent=t.justifyContent,s.style.maxHeight=t.maxHeight??"",s.style.maxWidth=t.maxWidth??""}function pt(s){s.style.alignItems="",s.style.justifyContent="",s.style.maxHeight="",s.style.maxWidth=""}function de(){return{width:window.innerWidth,height:window.innerHeight}}const On=new Set(Object.keys(_e));function V(s,t){const e=t.toUpperCase();if(On.has(e)){for(const n of Array.from(s.classList))n.startsWith("alap-placed-")&&s.classList.remove(n);s.classList.add(`alap-placed-${e.toLowerCase()}`)}}function Ne(s){for(const t of Array.from(s.classList))t.startsWith("alap-placed-")&&s.classList.remove(t)}function he(s,t){const e=new IntersectionObserver(n=>{for(const i of n)i.intersectionRatio===0&&t()},{threshold:[0]});return e.observe(s),e}const Dn=3,Fn="Escape",Un="--alap-coordinator-transition",Hn=300,zn=100,gt="alap_content",ft="alap_thumbnail",Pe="alap_vt_back",Wn="(prefers-reduced-motion: reduce)";class Bn{constructor(t={}){h(this,"renderers",new Map);h(this,"stack",[]);h(this,"lastPayload",new Map);h(this,"transitioning",!1);h(this,"reduceMotion");h(this,"useViewTransitions");h(this,"motionQuery",null);h(this,"boundKeydown",null);this.reduceMotion=t.reduceMotion??!0,this.useViewTransitions=t.viewTransitions??!0,this.reduceMotion&&typeof window<"u"&&(this.motionQuery=window.matchMedia(Wn))}register(t){this.renderers.set(t.rendererType,t)}unregister(t){this.renderers.delete(t),this.lastPayload.delete(t)}transitionTo(t,e){if(this.transitioning)return;const n=this.renderers.get(t);if(!n)return;const i=this.snapshotCurrent();i&&(this.stack.length>=Dn&&this.stack.shift(),this.stack.push(i)),this.performTransition(n,e,!1)}back(){if(this.transitioning)return;const t=this.stack.pop();if(!t){this.closeAll();return}const e=this.renderers.get(t.renderer);if(!e){this.closeAll();return}const n={links:t.links,triggerElement:t.triggerElement??void 0,initialIndex:t.activeIndex};this.performTransition(e,n,!0)}closeAll(){for(const t of this.renderers.values())t.isOpen&&t.close();this.stack=[],this.lastPayload.clear()}get depth(){return this.stack.length}get isTransitioning(){return this.transitioning}hasOpenRenderer(){for(const t of this.renderers.values())if(t.isOpen)return!0;return!1}bindKeyboard(){this.boundKeydown||(this.boundKeydown=t=>this.onKeydown(t),document.addEventListener("keydown",this.boundKeydown,{capture:!0}))}unbindKeyboard(){this.boundKeydown&&(document.removeEventListener("keydown",this.boundKeydown,{capture:!0}),this.boundKeydown=null)}destroy(){this.closeAll(),this.unbindKeyboard(),this.renderers.clear()}onKeydown(t){t.key===Fn&&this.hasOpenRenderer()&&(t.preventDefault(),t.stopImmediatePropagation(),this.back())}snapshotCurrent(){for(const[t,e]of this.renderers)if(e.isOpen){const n=this.lastPayload.get(t);return{renderer:t,links:(n==null?void 0:n.links)??[],activeIndex:(n==null?void 0:n.initialIndex)??0,triggerElement:(n==null?void 0:n.triggerElement)??null}}return null}get shouldReduceMotion(){var t;return this.reduceMotion&&(((t=this.motionQuery)==null?void 0:t.matches)??!1)}supportsViewTransitions(){return this.useViewTransitions&&typeof document<"u"&&"startViewTransition"in document}performTransition(t,e,n){this.transitioning=!0,this.lastPayload.set(t.rendererType,e);const i=()=>{for(const a of this.renderers.values())a.isOpen&&a!==t&&a.close()},r=()=>{t.openWith(e)};if(this.shouldReduceMotion||!this.supportsViewTransitions()){i(),r(),this.transitioning=!1;return}this.performViewTransition(i,r,n)}performViewTransition(t,e,n){const i=this.getActiveContainer();if(i){i.style.viewTransitionName=gt;const l=i.querySelector("img");l&&(l.style.viewTransitionName=ft)}n?document.documentElement.classList.add(Pe):document.documentElement.classList.remove(Pe);const r=document.startViewTransition(()=>{t(),e();const l=this.getActiveContainer();if(l){l.style.viewTransitionName=gt;const c=l.querySelector("img");c&&(c.style.viewTransitionName=ft)}}),a=()=>{document.documentElement.classList.remove(Pe),this.transitioning=!1};r.finished.then(a).catch(a);const o=this.getViewTransitionDuration();setTimeout(()=>{this.transitioning&&a()},o+zn)}getActiveContainer(){return document.querySelector(".alap-lens-overlay")??document.querySelector(".alap-lightbox-overlay")??document.getElementById("alapelem")}getViewTransitionDuration(){const t=document.documentElement,e=getComputedStyle(t).getPropertyValue(Un),n=parseFloat(e)*1e3;return Number.isFinite(n)&&n>0?n:Hn}}const Re=new Map,$e=new Map,ue="_default";function mt(s,t,e){const{name:n,engineOptions:i}=vt(t,e);$e.set(n,s),Re.set(n,new K(s,i))}function jn(s,t,e){const{name:n,engineOptions:i}=vt(t,e),r=Re.get(n);if(r){r.updateConfig(s),$e.set(n,s);return}mt(s,n,i)}function vt(s,t){if(typeof s=="string")return{name:s,engineOptions:t};if(s&&typeof s=="object"){const{name:e=ue,...n}=s;return{name:e,engineOptions:n}}return{name:ue,engineOptions:void 0}}function X(s=ue){return Re.get(s)}function pe(s=ue){return $e.get(s)}const Kn="Loading…",qn="Couldn’t load",Vn="Nothing found";function bt(s){return s==="error"?qn:s==="empty"?Vn:Kn}function yt(s){s.style.opacity="0",s.style.transition="opacity var(--alap-transition-duration, 250ms) var(--alap-transition-easing, ease-out)";const t=()=>{s.style.opacity="1"};typeof requestAnimationFrame=="function"?requestAnimationFrame(()=>requestAnimationFrame(t)):t()}function wt(s){const t=document.createElement("li");t.setAttribute("role","none"),t.setAttribute("data-alap-placeholder",s.status),t.setAttribute("data-alap-placeholder-token",s.token),t.className=`alapListElem alap-placeholder alap-placeholder-${s.status}`,t.setAttribute("aria-live","polite");const e=document.createElement("a");return e.setAttribute("aria-disabled","true"),e.setAttribute("tabindex","-1"),e.textContent=bt(s.status),t.appendChild(e),yt(t),t}function Xn(s){const t=document.createElement("div");return t.setAttribute("data-alap-placeholder",s.status),t.setAttribute("data-alap-placeholder-token",s.token),t.className=`alap-placeholder alap-placeholder-${s.status}`,t.setAttribute("aria-live","polite"),t.textContent=bt(s.status),yt(t),t}function Et(s,t="li"){return t==="li"?wt(s):Xn(s)}function xt(s,t){for(const e of t)s.appendChild(wt(e))}function ge(s,t){if(!s)return;const e=s.getBoundingClientRect();if(e.width===0||e.height===0)return;const n=t.left-e.left,i=t.top-e.top,r=Math.max(.1,t.width/e.width),a=Math.max(.1,t.height/e.height);if(Math.abs(n)<.5&&Math.abs(i)<.5&&Math.abs(r-1)<.01&&Math.abs(a-1)<.01)return;const o=s.style.transition,l=s.style.transform,c=s.style.transformOrigin;s.style.transition="none",s.style.transformOrigin="top left",s.style.transform=`translate(${n}px, ${i}px) scale(${r}, ${a})`,s.offsetHeight,s.style.transition="transform var(--alap-transition-duration, 250ms) var(--alap-transition-easing, ease-out)",s.style.transform="none";let d=!1;const u=()=>{d||(d=!0,s.style.transition=o,s.style.transform=l,s.style.transformOrigin=c)};s.addEventListener("transitionend",u,{once:!0}),setTimeout(u,2e3)}const Gn="translate(-50%, -50%)",Yn="visible";function Zn(s,t,e,n){const i=Jn(t,e),r=i.left+i.width/2+window.scrollX,a=i.top+i.height/2+window.scrollY;s.style.cssText=`
    position: absolute;
    display: block;
    z-index: ${n};
    top: ${a}px;
    left: ${r}px;
    transform: var(--alap-loading-transform, ${Gn});
    overflow: var(--alap-loading-overflow, ${Yn});
    max-height: none;
    max-width: none;
  `}function Jn(s,t){if(s.tagName.toLowerCase()==="img"){let n=t.clientX,i=t.clientY;if(n===0&&i===0){const r=s.getBoundingClientRect();n=r.left+r.width/2,i=r.top+r.height/2}return{left:n,top:i,width:0,height:0}}const e=s.getBoundingClientRect();return{left:e.left,top:e.top,width:e.width,height:e.height}}class fe{constructor(t){h(this,"current",null);this.opts=t}get isActive(){return this.current!==null}get currentTrigger(){var t;return((t=this.current)==null?void 0:t.trigger)??null}start(t,e,n,i){if(this.current&&this.current.trigger===t&&this.current.expression===e)return;this.current&&this.abortCurrent();const r={trigger:t,expression:e,event:n,anchorId:i??t.id??void 0,abort:new AbortController,subscribed:new Set,firstPaintDone:!1,wasLoadingOnly:!1};this.current=r,this.renderPass(r)}stop(){this.current&&(this.abortCurrent(),this.current=null)}getEngine(){return typeof this.opts.engine=="function"?this.opts.engine():this.opts.engine}abortCurrent(){var t,e;if(this.current&&(this.current.abort.abort(),(e=(t=this.opts).cancelFetchOnDismiss)!=null&&e.call(t))){const n=this.getEngine();if(n)for(const i of this.current.subscribed)n.abortInFlight(i)}}renderPass(t){if(t.abort.signal.aborted||this.current!==t)return;const e=this.getEngine();if(!e)return;const n=e.resolveProgressive(t.expression,t.anchorId);if(n.resolved.length===0&&n.sources.length===0)return;const i=n.resolved.length===0&&n.sources.length>0,r=t.wasLoadingOnly&&!i;this.opts.onRender({trigger:t.trigger,expression:t.expression,event:t.event,anchorId:t.anchorId,state:n,isLoadingOnly:i,isUpdate:t.firstPaintDone,transitioningFromLoading:r}),t.firstPaintDone=!0,t.wasLoadingOnly=i;for(const a of n.sources)a.status!=="loading"||!a.promise||t.subscribed.has(a.token)||(t.subscribed.add(a.token),a.promise.then(()=>this.renderPass(t)))}}class Qn{constructor(t,e={}){h(this,"rendererType",oe);h(this,"engine");h(this,"config");h(this,"container",null);h(this,"timer");h(this,"selector");h(this,"activeTrigger",null);h(this,"hooks");h(this,"progressive");h(this,"handleBodyClick");h(this,"handleBodyKeydown");h(this,"handleMenuLeave");h(this,"handleMenuEnter");h(this,"handleMenuKeydown");h(this,"handleScroll",null);h(this,"lastPlacement",null);h(this,"menuNaturalSize",null);h(this,"intersectionObserver",null);h(this,"openedViaKeyboard",!1);h(this,"instanceId");h(this,"unsubscribeCoordinator",null);var i;this.config=t,this.engine=new K(t,{handlers:e.handlers}),this.selector=e.selector??".alap",this.hooks={onTriggerHover:e.onTriggerHover,onTriggerContext:e.onTriggerContext,onItemHover:e.onItemHover,onItemContext:e.onItemContext};const n=e.menuTimeout??((i=t.settings)==null?void 0:i.menuTimeout)??5e3;this.timer=new dt(n,()=>this.closeMenu()),this.instanceId=`alapui_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,this.progressive=new fe({engine:this.engine,cancelFetchOnDismiss:()=>{var r;return((r=this.config.settings)==null?void 0:r.cancelFetchOnDismiss)===!0},onRender:r=>this.onProgressiveRender(r)}),this.handleBodyClick=this.onBodyClick.bind(this),this.handleBodyKeydown=this.onBodyKeydown.bind(this),this.handleMenuLeave=()=>this.timer.start(),this.handleMenuEnter=()=>this.timer.stop(),this.handleMenuKeydown=this.onMenuKeydown.bind(this),this.init()}init(){this.createContainer(),this.bindTriggers(),this.bindGlobalEvents();const t=H();this.unsubscribeCoordinator=t.subscribe(this.instanceId,oe,()=>this.closeMenu())}createContainer(){const t=document.getElementById("alapelem");t&&t.remove(),this.container=document.createElement("div"),this.container.id="alapelem",this.container.setAttribute("role","menu"),this.container.style.display="none",document.body.appendChild(this.container)}bindTriggers(){const t=document.querySelectorAll(this.selector);t.length===0&&w(`No elements found for selector "${this.selector}"`);for(const e of t)e.removeEventListener("click",this.onTriggerClick),e.addEventListener("click",this.onTriggerClick.bind(this)),e.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),this.openedViaKeyboard=!0,e.click())}),this.hooks.onTriggerHover&&e.addEventListener("mouseenter",()=>{const i={query:e.getAttribute("data-alap-linkitems")??"",anchorId:e.id||void 0};this.hooks.onTriggerHover(i),e.dispatchEvent(new CustomEvent("alap:trigger-hover",{detail:i,bubbles:!0}))}),this.hooks.onTriggerContext&&e.addEventListener("contextmenu",n=>{const r={query:e.getAttribute("data-alap-linkitems")??"",anchorId:e.id||void 0,event:n};this.hooks.onTriggerContext(r),e.dispatchEvent(new CustomEvent("alap:trigger-context",{detail:r,bubbles:!0}))}),e.setAttribute("role","button"),e.setAttribute("aria-haspopup","true"),e.setAttribute("aria-expanded","false"),e.getAttribute("tabindex")||e.setAttribute("tabindex","0")}bindGlobalEvents(){document.addEventListener("click",this.handleBodyClick),document.addEventListener("keydown",this.handleBodyKeydown)}onTriggerClick(t){var a;t.preventDefault(),t.stopPropagation();const e=t.currentTarget,n=e.getAttribute("data-alap-linkitems");if(!n)return;const i=e.id||void 0,r=this.engine.resolveProgressive(n,i);if(r.resolved.length===0&&r.sources.length===0){const o=Le(e,(a=this.config.settings)==null?void 0:a.existingUrl),l=Se([],e,o);l.length>0&&(this.progressive.stop(),this.activeTrigger!==e&&(this.activeTrigger&&this.activeTrigger.setAttribute("aria-expanded","false"),this.activeTrigger=e,e.setAttribute("aria-expanded","true")),this.renderMenu(l,[],e,t,!1));return}this.progressive.start(e,n,t,i)}onProgressiveRender(t){var i;const e=Le(t.trigger,(i=this.config.settings)==null?void 0:i.existingUrl),n=Se(t.state.resolved,t.trigger,e);this.activeTrigger!==t.trigger&&(this.activeTrigger&&this.activeTrigger.setAttribute("aria-expanded","false"),this.activeTrigger=t.trigger,t.trigger.setAttribute("aria-expanded","true")),this.renderMenu(n,t.state.sources,t.trigger,t.event,t.isUpdate)}getTriggerRect(t,e){if(t.tagName.toLowerCase()==="img"){let n=e.clientX,i=e.clientY;if(n===0&&i===0){const r=t.getBoundingClientRect();n=r.left+r.width/2,i=r.top+r.height/2}return{top:i,left:n,bottom:i,right:n,width:0,height:0}}return t.getBoundingClientRect()}getPlacement(t){var i;const e=t.getAttribute("data-alap-placement");if(e)return I(e);const n=(i=this.config.settings)==null?void 0:i.placement;return I(typeof n=="string"?n:"SE")}renderMenu(t,e,n,i,r=!1){var y,b,g;if(!this.container)return;const a=n.id||"";this.container.className="alapelem",a&&this.container.classList.add(`alap_${a}`),a&&this.container.setAttribute("aria-labelledby",a);const o=((y=this.config.settings)==null?void 0:y.listType)??"ul",l=((b=this.config.settings)==null?void 0:b.maxVisibleItems)??10,c=ke(t,{listType:o,maxVisibleItems:l,defaultTargetWindow:(g=this.config.settings)==null?void 0:g.targetWindow});xt(c,e);const d=r?this.container.getBoundingClientRect():null,u=r&&this.container.hasAttribute("data-alap-loading-only"),p=t.length===0&&e.length>0;p?this.container.setAttribute("data-alap-loading-only",""):this.container.removeAttribute("data-alap-loading-only"),this.container.innerHTML="",this.container.appendChild(c);for(const m of c.querySelectorAll('a[role="menuitem"]'))m.addEventListener("click",()=>this.closeMenu());if(this.hooks.onItemHover||this.hooks.onItemContext){const m=n.getAttribute("data-alap-linkitems")??"";c.querySelectorAll('a[role="menuitem"]').forEach((x,C)=>{const T=t[C];this.hooks.onItemHover&&x.addEventListener("mouseenter",()=>{const k={id:T.id,link:T,query:m};this.hooks.onItemHover(k),x.dispatchEvent(new CustomEvent("alap:item-hover",{detail:k,bubbles:!0}))}),this.hooks.onItemContext&&x.addEventListener("contextmenu",k=>{const L={id:T.id,link:T,query:m,event:k};this.hooks.onItemContext(L),x.dispatchEvent(new CustomEvent("alap:item-context",{detail:L,bubbles:!0}))})})}if(r||(this.container.addEventListener("mouseleave",this.handleMenuLeave),this.container.addEventListener("mouseenter",this.handleMenuEnter),this.container.addEventListener("keydown",this.handleMenuKeydown)),p?(Zn(this.container,n,i,10),Ne(this.container),this.menuNaturalSize=null,this.lastPlacement=null):this.positionWithPlacement(n,i),r&&u&&!p&&d&&ge(this.container,d),this.stopIntersectionObserver(),this.activeTrigger&&!p&&(this.intersectionObserver=he(this.activeTrigger,()=>this.closeMenu())),r||H().notifyOpen(this.instanceId),this.openedViaKeyboard){const m=this.container.querySelector('a[role="menuitem"]');m&&m.focus()}this.openedViaKeyboard=!1,this.timer.stop(),this.timer.start()}positionWithPlacement(t,e){var i,r,a;if(!this.container)return;if(((i=this.config.settings)==null?void 0:i.viewportAdjust)!==!1){this.container.style.cssText=`
        position: fixed;
        visibility: hidden;
        top: -9999px;
        left: -9999px;
        z-index: 10;
        display: block;
        max-height: none;
        overflow: visible;
      `;const o=this.container.getBoundingClientRect();this.menuNaturalSize={width:o.width,height:o.height};const l=this.getTriggerRect(t,e),c=this.getPlacement(t),d=((r=this.config.settings)==null?void 0:r.placementGap)??4,u=((a=this.config.settings)==null?void 0:a.viewportPadding)??8,p=q({triggerRect:l,menuSize:this.menuNaturalSize,viewport:{width:window.innerWidth,height:window.innerHeight},placement:c.compass,strategy:c.strategy,gap:d,padding:u});if(this.lastPlacement=p,V(this.container,p.placement),this.container.style.cssText=`
        position: absolute;
        display: block;
        z-index: 10;
        top: ${p.y+window.scrollY}px;
        left: ${p.x+window.scrollX}px;
        overflow-x: clip;
      `,p.maxHeight!=null){this.container.style.maxHeight=`${p.maxHeight}px`,this.container.style.overflowY="auto";const y=this.container.querySelector("ul, ol");y&&(y.style.maxHeight="none",y.style.overflowY="")}p.maxWidth!=null&&(this.container.style.maxWidth=`${p.maxWidth}px`),p.scrollY&&this.startScrollTracking(t,e)}else{const o=this.getTriggerRect(t,e);this.container.style.cssText=`
        position: absolute;
        display: block;
        z-index: 10;
        top: ${o.bottom+window.scrollY}px;
        left: ${o.left+window.scrollX}px;
      `}if(this.stopIntersectionObserver(),this.activeTrigger&&(this.intersectionObserver=he(this.activeTrigger,()=>this.closeMenu())),H().notifyOpen(this.instanceId),this.openedViaKeyboard){const o=this.container.querySelector('a[role="menuitem"]');o&&o.focus()}this.openedViaKeyboard=!1,this.timer.stop(),this.timer.start()}startScrollTracking(t,e){var a,o;this.stopScrollTracking();const n=((a=this.config.settings)==null?void 0:a.placementGap)??4,i=((o=this.config.settings)==null?void 0:o.viewportPadding)??8,r=this.getPlacement(t);this.handleScroll=()=>{if(!this.container||this.container.style.display==="none"||!this.menuNaturalSize)return;const l=this.getTriggerRect(t,e),c=q({triggerRect:l,menuSize:this.menuNaturalSize,viewport:{width:window.innerWidth,height:window.innerHeight},placement:r.compass,strategy:r.strategy,gap:n,padding:i});this.lastPlacement=c,V(this.container,c.placement),this.container.style.top=`${c.y+window.scrollY}px`,this.container.style.left=`${c.x+window.scrollX}px`,c.maxHeight!=null?(this.container.style.maxHeight=`${c.maxHeight}px`,this.container.style.overflowY="auto"):(this.container.style.maxHeight="",this.container.style.overflowY="")},window.addEventListener("scroll",this.handleScroll,{passive:!0})}stopScrollTracking(){this.handleScroll&&(window.removeEventListener("scroll",this.handleScroll),this.handleScroll=null)}stopIntersectionObserver(){this.intersectionObserver&&(this.intersectionObserver.disconnect(),this.intersectionObserver=null)}onMenuKeydown(t){if(!this.container)return;const e=Array.from(this.container.querySelectorAll('a[role="menuitem"]'));ct(t,e,document.activeElement,()=>this.closeMenu())}onBodyClick(t){if(!this.container)return;t.target.closest("#alapelem")||this.closeMenu()}onBodyKeydown(t){t.key==="Escape"&&this.closeMenu()}closeMenu(){this.container&&(this.progressive.stop(),this.container.style.display="none",this.container.style.maxHeight="",this.container.style.maxWidth="",this.container.style.overflowY="",this.container.style.overflowX="",Ne(this.container),this.lastPlacement=null,this.menuNaturalSize=null,this.stopScrollTracking(),this.stopIntersectionObserver(),this.timer.stop(),this.activeTrigger&&(this.activeTrigger.setAttribute("aria-expanded","false"),this.activeTrigger.focus(),this.activeTrigger=null))}get isOpen(){var t;return((t=this.container)==null?void 0:t.style.display)!=="none"}close(){const t=this.activeTrigger;return this.closeMenu(),t}openWith(t){const e=t.links;if(e.length===0)return;this.activeTrigger&&this.activeTrigger.setAttribute("aria-expanded","false");const n=t.triggerElement??null;this.activeTrigger=n,n&&n.setAttribute("aria-expanded","true");const i=n==null?void 0:n.getBoundingClientRect(),r={clientX:(i==null?void 0:i.left)??0,clientY:(i==null?void 0:i.bottom)??0};this.renderMenu(e,[],n??document.body,r)}refresh(){this.bindTriggers()}getEngine(){return this.engine}updateConfig(t){var e;this.config=t,this.engine.updateConfig(t),this.timer.setTimeout(((e=t.settings)==null?void 0:e.menuTimeout)??5e3),this.refresh()}destroy(){this.closeMenu(),document.removeEventListener("click",this.handleBodyClick),document.removeEventListener("keydown",this.handleBodyKeydown),this.unsubscribeCoordinator&&(this.unsubscribeCoordinator(),this.unsubscribeCoordinator=null),this.container&&(this.container.remove(),this.container=null)}}const ei=`
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

  /* --- Progressive loading state --- */
  /* Async fetch is still in flight: center the small "Loading…" menu over
     the host rather than running the compass placement engine, since a tiny
     placeholder would flip direction differently than the full menu.
     Override the positioning variables from outside the shadow root:
       alap-link {
         --alap-loading-top: 0;
         --alap-loading-transform: none;
       } */
  .menu[data-alap-loading-only] {
    top: var(--alap-loading-top, 50%);
    left: var(--alap-loading-left, 50%);
    right: auto;
    bottom: auto;
    margin: 0;
    max-height: none;
    max-width: none;
    overflow: var(--alap-loading-overflow, visible);
    transform: var(--alap-loading-transform, translate(-50%, -50%));
  }

  /* Appear animation for placeholder rows — users override via CSS vars:
       alap-link {
         --alap-transition-duration: 400ms;
         --alap-transition-easing: cubic-bezier(0.2, 0, 0, 1);
       } */
  .menu [data-alap-placeholder] {
    animation: alap-placeholder-fade-in
               var(--alap-transition-duration, 250ms)
               var(--alap-transition-easing, ease-out);
  }

  @keyframes alap-placeholder-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
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
`;class At extends HTMLElement{constructor(){super();h(this,"menu",null);h(this,"timer",null);h(this,"isOpen",!1);h(this,"openedViaKeyboard",!1);h(this,"scrollHandler",null);h(this,"lastPlacement",null);h(this,"menuNaturalSize",null);h(this,"intersectionObserver",null);h(this,"instanceId");h(this,"unsubscribeCoordinator",null);h(this,"progressive",null);h(this,"loadingRect",null);h(this,"onTriggerClick",e=>{var a;const n=e.composedPath();if(this.menu&&n.includes(this.menu))return;if(e.preventDefault(),e.stopPropagation(),this.isOpen){this.closeMenu();return}const i=this.getAttribute("query");if(!i)return;if(!this.getEngine()){w(`<alap-link>: no config registered for "${this.getAttribute("config")??"_default"}". Call registerConfig() first.`);return}(a=this.progressive)==null||a.start(this,i,e)});h(this,"onTriggerKeydown",e=>{this.menu&&e.composedPath().includes(this.menu)||(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.openedViaKeyboard=!0,this.click())});h(this,"onMenuKeydown",e=>{var i;if(!this.menu)return;const n=Array.from(this.menu.querySelectorAll('a[role="menuitem"]'));ct(e,n,((i=this.shadowRoot)==null?void 0:i.activeElement)??null,()=>this.closeMenu())});h(this,"onTriggerHover",()=>{const n={query:this.getAttribute("query")??"",anchorId:this.id||void 0};this.dispatchEvent(new CustomEvent("alap:trigger-hover",{detail:n,bubbles:!0,composed:!0}))});h(this,"onTriggerContext",e=>{const i={query:this.getAttribute("query")??"",anchorId:this.id||void 0,event:e};this.dispatchEvent(new CustomEvent("alap:trigger-context",{detail:i,bubbles:!0,composed:!0}))});h(this,"onDocumentClick",e=>{this.isOpen&&(e.composedPath().includes(this)||this.closeMenu())});h(this,"onDocumentKeydown",e=>{e.key==="Escape"&&this.isOpen&&this.closeMenu()});h(this,"onMenuLeave",()=>{var e;(e=this.timer)==null||e.start()});h(this,"onMenuEnter",()=>{var e;(e=this.timer)==null||e.stop()});this.instanceId=`wc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;const e=this.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=ei,e.appendChild(n);const i=document.createElement("slot");e.appendChild(i),this.menu=document.createElement("div"),this.menu.classList.add("menu"),this.menu.setAttribute("role","menu"),this.menu.setAttribute("aria-hidden","true"),this.menu.setAttribute("part","menu"),e.appendChild(this.menu)}static get observedAttributes(){return["query","config","href","placement"]}connectedCallback(){this.timer=new dt(this.getMenuTimeout(),()=>this.closeMenu()),this.progressive=new fe({engine:()=>this.getEngine()??void 0,onRender:n=>this.onProgressiveRender(n),cancelFetchOnDismiss:()=>{var n,i;return((i=(n=this.getConfig())==null?void 0:n.settings)==null?void 0:i.cancelFetchOnDismiss)===!0}});const e=H();this.unsubscribeCoordinator=e.subscribe(this.instanceId,oe,()=>this.closeMenu()),this.getAttribute("role")||this.setAttribute("role","button"),this.setAttribute("aria-haspopup","true"),this.setAttribute("aria-expanded","false"),this.getAttribute("tabindex")||this.setAttribute("tabindex","0"),this.addEventListener("click",this.onTriggerClick),this.addEventListener("keydown",this.onTriggerKeydown),this.addEventListener("mouseenter",this.onTriggerHover),this.addEventListener("contextmenu",this.onTriggerContext),document.addEventListener("click",this.onDocumentClick),document.addEventListener("keydown",this.onDocumentKeydown),this.menu&&(this.menu.addEventListener("mouseleave",this.onMenuLeave),this.menu.addEventListener("mouseenter",this.onMenuEnter),this.menu.addEventListener("keydown",this.onMenuKeydown))}disconnectedCallback(){var e;(e=this.timer)==null||e.stop(),this.unsubscribeCoordinator&&(this.unsubscribeCoordinator(),this.unsubscribeCoordinator=null),this.removeEventListener("click",this.onTriggerClick),this.removeEventListener("keydown",this.onTriggerKeydown),this.removeEventListener("mouseenter",this.onTriggerHover),this.removeEventListener("contextmenu",this.onTriggerContext),document.removeEventListener("click",this.onDocumentClick),document.removeEventListener("keydown",this.onDocumentKeydown)}attributeChangedCallback(e,n,i){n!==i&&this.isOpen&&this.closeMenu()}getEngine(){const e=this.getAttribute("config")??"_default";return X(e)}getConfig(){const e=this.getAttribute("config")??"_default";return pe(e)}getMenuTimeout(){var n;const e=this.getConfig();return((n=e==null?void 0:e.settings)==null?void 0:n.menuTimeout)??5e3}onProgressiveRender(e){var l;if(!this.menu)return;const n=this.getConfig(),i=Le(this,(l=n==null?void 0:n.settings)==null?void 0:l.existingUrl),r=this.getAttribute("href")?this:this.querySelector("a[href]"),a=r?Se(e.state.resolved,r,i):e.state.resolved,o=e.transitioningFromLoading?this.menu.getBoundingClientRect():null;this.renderMenuWithPlaceholders(a,e.state.sources),this.bindItemHooks(a),e.isLoadingOnly?this.menu.setAttribute("data-alap-loading-only",""):this.menu.removeAttribute("data-alap-loading-only"),e.isUpdate?e.transitioningFromLoading&&this.applyComputedPlacement():this.openMenu(e.isLoadingOnly),e.transitioningFromLoading&&o&&ge(this.menu,o)}renderMenuWithPlaceholders(e,n){var l,c,d;if(!this.menu)return;const i=this.getConfig(),r=((l=i==null?void 0:i.settings)==null?void 0:l.listType)??"ul",a=((c=i==null?void 0:i.settings)==null?void 0:c.maxVisibleItems)??10,o=ke(e,{listType:r,maxVisibleItems:a,defaultTargetWindow:(d=i==null?void 0:i.settings)==null?void 0:d.targetWindow,listAttributes:{part:"list"},liAttributes:{part:"item"},aAttributes:{part:"link"},imgAttributes:{part:"image"}});xt(o,n),this.menu.innerHTML="",this.menu.appendChild(o)}renderMenu(e){var o,l,c;if(!this.menu)return;const n=this.getConfig(),i=((o=n==null?void 0:n.settings)==null?void 0:o.listType)??"ul",r=((l=n==null?void 0:n.settings)==null?void 0:l.maxVisibleItems)??10,a=ke(e,{listType:i,maxVisibleItems:r,defaultTargetWindow:(c=n==null?void 0:n.settings)==null?void 0:c.targetWindow,listAttributes:{part:"list"},liAttributes:{part:"item"},aAttributes:{part:"link"},imgAttributes:{part:"image"}});this.menu.innerHTML="",this.menu.appendChild(a)}getPlacement(){var r;const e=this.getAttribute("placement");if(e)return I(e);const n=this.getConfig(),i=(r=n==null?void 0:n.settings)==null?void 0:r.placement;return I(typeof i=="string"?i:"SE")}getGap(){var n;if(this.menu){const i=getComputedStyle(this.menu).getPropertyValue("--alap-gap").trim();if(i){const r=parseFloat(i);if(!Number.isNaN(r))return i.endsWith("rem")?r*parseFloat(getComputedStyle(document.documentElement).fontSize):r}}const e=this.getConfig();return((n=e==null?void 0:e.settings)==null?void 0:n.placementGap)??4}applyPlacement(e){if(!this.menu)return;const n=this.getBoundingClientRect(),i=e.x-n.left,r=e.y-n.top;if(this.menu.style.top=`${r}px`,this.menu.style.left=`${i}px`,this.menu.style.bottom="",this.menu.style.right="",this.menu.style.marginTop="0",this.menu.style.marginBottom="0",this.menu.style.overflowX="clip",e.maxHeight!=null){this.menu.style.maxHeight=`${e.maxHeight}px`,this.menu.style.overflowY="auto";const a=this.menu.querySelector("ul, ol");a&&(a.style.maxHeight="none",a.style.overflowY="")}else this.menu.style.maxHeight="",this.menu.style.overflowY="";e.maxWidth!=null?this.menu.style.maxWidth=`${e.maxWidth}px`:this.menu.style.maxWidth=""}openMenu(e=!1){var r,a,o,l;if(!this.menu)return;H().notifyOpen(this.instanceId);const n=this.getConfig(),i=((r=n==null?void 0:n.settings)==null?void 0:r.viewportAdjust)!==!1;if(this.isOpen=!0,this.setAttribute("aria-expanded","true"),e){this.menu.setAttribute("aria-hidden","false"),this.stopIntersectionObserver(),this.intersectionObserver=he(this,()=>this.closeMenu()),(a=this.timer)==null||a.start();return}if(i){this.menu.style.position="fixed",this.menu.style.visibility="hidden",this.menu.style.top="-9999px",this.menu.style.left="-9999px",this.menu.style.maxHeight="none",this.menu.style.overflow="visible",this.menu.setAttribute("aria-hidden","false");const c=this.menu.getBoundingClientRect();this.menuNaturalSize={width:c.width,height:c.height};const d=this.getBoundingClientRect(),u=this.getPlacement(),p=this.getGap(),y=((o=n==null?void 0:n.settings)==null?void 0:o.viewportPadding)??8,b=q({triggerRect:d,menuSize:this.menuNaturalSize,viewport:{width:window.innerWidth,height:window.innerHeight},placement:u.compass,strategy:u.strategy,gap:p,padding:y});this.lastPlacement=b,this.menu.style.position="",this.menu.style.visibility="",this.menu.style.overflow="",this.applyPlacement(b),V(this.menu,b.placement),b.scrollY&&this.startScrollTracking()}else this.menu.setAttribute("aria-hidden","false");if(this.stopIntersectionObserver(),this.intersectionObserver=he(this,()=>this.closeMenu()),this.openedViaKeyboard){const c=this.menu.querySelector('a[role="menuitem"]');c&&c.focus({preventScroll:!0})}this.openedViaKeyboard=!1,(l=this.timer)==null||l.start()}applyComputedPlacement(){var d,u;if(!this.menu)return;const e=this.getConfig();if(!(((d=e==null?void 0:e.settings)==null?void 0:d.viewportAdjust)!==!1))return;this.menu.style.position="fixed",this.menu.style.visibility="hidden",this.menu.style.top="-9999px",this.menu.style.left="-9999px",this.menu.style.transform="",this.menu.style.maxHeight="none",this.menu.style.overflow="visible";const i=this.menu.getBoundingClientRect();this.menuNaturalSize={width:i.width,height:i.height};const r=this.getBoundingClientRect(),a=this.getPlacement(),o=this.getGap(),l=((u=e==null?void 0:e.settings)==null?void 0:u.viewportPadding)??8,c=q({triggerRect:r,menuSize:this.menuNaturalSize,viewport:{width:window.innerWidth,height:window.innerHeight},placement:a.compass,strategy:a.strategy,gap:o,padding:l});this.lastPlacement=c,this.menu.style.position="",this.menu.style.visibility="",this.menu.style.overflow="",this.menu.style.transform="",this.applyPlacement(c),V(this.menu,c.placement),c.scrollY&&this.startScrollTracking()}startScrollTracking(){var a;this.stopScrollTracking();const e=this.getConfig(),n=this.getGap(),i=((a=e==null?void 0:e.settings)==null?void 0:a.viewportPadding)??8,r=this.getPlacement();this.scrollHandler=()=>{if(!this.menu||!this.isOpen||!this.menuNaturalSize)return;const o=this.getBoundingClientRect(),l=q({triggerRect:o,menuSize:this.menuNaturalSize,viewport:{width:window.innerWidth,height:window.innerHeight},placement:r.compass,strategy:r.strategy,gap:n,padding:i});this.lastPlacement=l,this.applyPlacement(l),V(this.menu,l.placement)},window.addEventListener("scroll",this.scrollHandler,{passive:!0})}stopScrollTracking(){this.scrollHandler&&(window.removeEventListener("scroll",this.scrollHandler),this.scrollHandler=null)}stopIntersectionObserver(){this.intersectionObserver&&(this.intersectionObserver.disconnect(),this.intersectionObserver=null)}closeMenu(){var n,i;if(!this.menu)return;const e=this.isOpen;this.isOpen=!1,(n=this.progressive)==null||n.stop(),this.menu.removeAttribute("data-alap-loading-only"),this.menu.setAttribute("aria-hidden","true"),this.menu.style.top="",this.menu.style.left="",this.menu.style.bottom="",this.menu.style.right="",this.menu.style.marginTop="",this.menu.style.marginBottom="",this.menu.style.maxHeight="",this.menu.style.maxWidth="",this.menu.style.overflowY="",this.menu.style.overflowX="",this.menu.style.transform="",Ne(this.menu),this.lastPlacement=null,this.menuNaturalSize=null,this.setAttribute("aria-expanded","false"),this.stopScrollTracking(),this.stopIntersectionObserver(),(i=this.timer)==null||i.stop(),e&&this.focus()}bindItemHooks(e){if(!this.menu)return;const n=this.getAttribute("query")??"";this.menu.querySelectorAll('a[role="menuitem"]').forEach((r,a)=>{const o=e[a];r.addEventListener("mouseenter",()=>{const l={id:o.id,link:o,query:n};this.dispatchEvent(new CustomEvent("alap:item-hover",{detail:l,bubbles:!0,composed:!0}))}),r.addEventListener("contextmenu",l=>{const c={id:o.id,link:o,query:n,event:l};this.dispatchEvent(new CustomEvent("alap:item-context",{detail:c,bubbles:!0,composed:!0}))})})}}function ti(s="alap-link"){customElements.get(s)||customElements.define(s,At)}function me(s,t){switch(s.key){case"Escape":return t.close(),!0;case"ArrowLeft":case"ArrowUp":return s.preventDefault(),t.prev(),!0;case"ArrowRight":case"ArrowDown":return s.preventDefault(),t.next(),!0;default:return!1}}let G=0,Ct="";function ni(){G===0&&(Ct=document.body.style.overflow,document.body.style.overflow="hidden"),G++}function Tt(){G--,G<=0&&(G=0,document.body.style.overflow=Ct)}function Y(s,t,e){ni(),t.appendChild(s),s.offsetHeight,s.classList.add(e)}function Z(s,t){s.classList.remove(t),parseFloat(getComputedStyle(s).transitionDuration)>0?s.addEventListener("transitionend",()=>{s.remove(),Tt()},{once:!0}):(s.remove(),Tt())}function ve(s){const{container:t,src:e,overlayClass:n,imageClass:i,visibleClass:r,overlayPart:a}=s,o=document.createElement("div");o.className=n,a&&o.setAttribute("part",a);const l=document.createElement("img");l.className=i,l.src=e;const c=()=>{document.removeEventListener("keydown",d,!0),Z(o,r)},d=u=>{u.key==="Escape"&&(u.stopPropagation(),c())};o.addEventListener("click",u=>{u.stopPropagation(),c()}),document.addEventListener("keydown",d,!0),o.appendChild(l),Y(o,t,r)}const ii=300,ri=250;function be(s){const{counterWrap:t,counterText:e,links:n,onJump:i,css:r,closeIcon:a,parts:o,hoverHint:l="swap",getActiveElement:c}=s;let{currentIndex:d}=s;const u=document.createElement("div");u.className=r.setnav,u.setAttribute("tabindex","-1"),o!=null&&o.setnav&&u.setAttribute("part",o.setnav);const p=document.createElement("ul");p.className=r.list,p.setAttribute("role","listbox");for(let E=0;E<n.length;E++){const S=n[E],_=document.createElement("li");_.className=r.item,_.setAttribute("role","option"),_.setAttribute("data-index",String(E)),_.textContent=S.label??S.id,E===d&&_.classList.add("active"),_.addEventListener("click",R=>{R.stopPropagation(),i(E)}),p.appendChild(_)}u.appendChild(p);const y=document.createElement("div");y.className=r.filterWrap;const b=document.createElement("input");b.className=r.filter,b.type="text",b.placeholder="Filter…",b.setAttribute("aria-label","Filter items"),o!=null&&o.filter&&b.setAttribute("part",o.filter),y.appendChild(b);const g=document.createElement("button");g.className=r.clear,g.setAttribute("aria-label","Clear filter"),g.textContent=a,g.style.display="none",g.addEventListener("click",E=>{E.stopPropagation(),b.value="",b.dispatchEvent(new Event("input")),b.focus()}),y.appendChild(g),u.appendChild(y),t.appendChild(u);const m=()=>`${d+1} / ${n.length}`;e.textContent=m();const f=()=>{u.classList.remove("open"),e.textContent=m(),b.value="",b.dispatchEvent(new Event("input"))};let x=-1;const C=()=>Array.from(p.querySelectorAll(`.${r.item}`)).filter(E=>E.style.display!=="none"),T=E=>{for(const S of p.querySelectorAll(`.${r.item}`))S.classList.remove("highlighted");x>=0&&x<E.length&&(E[x].classList.add("highlighted"),E[x].scrollIntoView({block:"nearest"}))},k=E=>{const S=C();if(E.key==="ArrowDown")return E.preventDefault(),x=Math.min(x+1,S.length-1),T(S),!0;if(E.key==="ArrowUp")return E.preventDefault(),x=Math.max(x-1,0),T(S),!0;if(E.key==="Enter"){E.preventDefault();const _=x>=0?x:S.length===1?0:-1;if(_>=0&&_<S.length){const R=Number(S[_].getAttribute("data-index"));i(R)}return!0}return!1};if(u.addEventListener("keydown",E=>{if(E.key==="Escape"){E.stopPropagation(),f();return}(c?c():document.activeElement)!==b&&(k(E)||E.key.length===1&&!E.ctrlKey&&!E.metaKey&&!E.altKey&&b.focus())}),e.style.cursor="pointer",l==="crossfade"){const E=S=>{e.style.opacity="0",setTimeout(()=>{e.textContent=S,e.style.opacity="1"},ri)};t.addEventListener("mouseenter",()=>{u.classList.contains("open")||E("Menu")}),t.addEventListener("mouseleave",()=>{u.classList.contains("open")||E(m())})}else t.addEventListener("mouseenter",()=>{u.classList.contains("open")||(e.textContent="menu…")}),t.addEventListener("mouseleave",()=>{u.classList.contains("open")||(e.textContent=m())});e.addEventListener("click",E=>{E.stopPropagation(),u.classList.contains("open")?f():(u.classList.add("open"),u.focus())});let L=null;return u.addEventListener("mouseleave",()=>{L&&clearTimeout(L),L=setTimeout(f,ii)}),u.addEventListener("mouseenter",()=>{L&&(clearTimeout(L),L=null)}),b.addEventListener("input",()=>{const E=b.value.trim();g.style.display=E?"":"none";const S=p.querySelectorAll(`.${r.item}`);if(!E){for(const R of S)R.style.display="";return}let _;try{_=new RegExp(E,"i")}catch{_=new RegExp(E.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i")}for(const R of S){const Or=Number(R.getAttribute("data-index")),un=n[Or],Dr=un.label??un.id;R.style.display=_.test(Dr)?"":"none"}}),b.addEventListener("input",()=>{x=-1}),b.addEventListener("keydown",E=>{E.stopPropagation(),!k(E)&&E.key==="Escape"&&f()}),{setActive(E){d=E;const S=p.querySelectorAll(`.${r.item}`);for(const _ of S){const R=Number(_.getAttribute("data-index"));_.classList.toggle("active",R===E)}},updateCounter(E,S){d=E,e.textContent=S>1?`${E+1} / ${S}`:""}}}const si=/(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;function ai(s){const t=s.match(si);return t?`https://www.youtube-nocookie.com/embed/${t[1]}`:null}const oi=/vimeo\.com\/(\d+)/;function li(s){const t=s.match(oi);return t?`https://player.vimeo.com/video/${t[1]}`:null}const kt=/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/;function ci(s){const t=s.match(kt);return t?`https://open.spotify.com/embed/${t[1]}/${t[2]}`:null}function di(s){const t=s.match(kt);if(!t)return 152;const e=t[1];return e==="playlist"||e==="album"?352:152}const hi=/codepen\.io\/([^/]+)\/(?:pen|full|details)\/([a-zA-Z0-9]+)/;function ui(s){const t=s.match(hi);return t?`https://codepen.io/${t[1]}/embed/${t[2]}?default-tab=result`:null}const pi=/codesandbox\.io\/(?:s|p)\/([a-zA-Z0-9-]+)/;function gi(s){const t=s.match(pi);return t?`https://codesandbox.io/embed/${t[1]}`:null}const fi=[{name:"YouTube",domains:["youtube.com","youtu.be"],transform:ai,defaultType:"video",defaultHeight:315},{name:"Vimeo",domains:["vimeo.com"],transform:li,defaultType:"video",defaultHeight:315},{name:"Spotify",domains:["open.spotify.com"],transform:ci,defaultType:"audio",defaultHeight:152},{name:"CodePen",domains:["codepen.io"],transform:ui,defaultType:"interactive",defaultHeight:400},{name:"CodeSandbox",domains:["codesandbox.io"],transform:gi,defaultType:"interactive",defaultHeight:400}];function Lt(s){try{const t=new URL(s).hostname.toLowerCase();return t.startsWith("www.")?t.slice(4):t}catch{return null}}function J(s){const t=Lt(s);if(!t)return null;for(const e of fi)if(e.domains.some(n=>t===n||t.endsWith("."+n)))return e;return null}function St(s){const t=J(s);return t?t.transform(s):null}function _t(s,t){if(!J(s))return!1;if(!t)return!0;const n=Lt(s);return n?t.some(i=>{const r=i.toLowerCase().replace(/^www\./,"");return n===r||n.endsWith("."+r)}):!1}function It(s){const t=J(s);return t?t.name==="Spotify"?di(s):t.defaultHeight:315}function Me(){try{const s=localStorage.getItem(Ge);if(!s)return new Set;const t=JSON.parse(s);return Array.isArray(t)?new Set(t.filter(e=>typeof e=="string")):new Set}catch{return new Set}}function Nt(s){try{localStorage.setItem(Ge,JSON.stringify([...s]))}catch{}}function Pt(s,t){return t==="block"?!1:t==="allow"?!0:$t(s)}function Rt(s){const t=Me();t.add(s.toLowerCase()),Nt(t)}function mi(s){const t=Me();t.delete(s.toLowerCase()),Nt(t)}function $t(s){return Me().has(s.toLowerCase())}function Oe(s,t,e){const n=(e==null?void 0:e.embedPolicy)??"prompt",i=(e==null?void 0:e.maxWidth)??560,r=J(s);if(!r||!_t(s,e==null?void 0:e.embedAllowlist))return Fe(s);const a=St(s);if(!a)return Fe(s);const o=t??r.defaultType,l=(e==null?void 0:e.maxHeight)??It(s),c=vi(s);return Pt(c,n)?Mt(a,l,i):n==="block"?Fe(s):bi(s,a,r.name,o,l,i,c)}function vi(s){try{const t=new URL(s).hostname.toLowerCase();return t.startsWith("www.")?t.slice(4):t}catch{return""}}function Mt(s,t,e){const n=document.createElement("div");n.className="alap-embed-wrap",n.style.maxWidth=`${e}px`;const i=document.createElement("iframe");return i.src=s,i.height=String(t),i.allow=pn,i.referrerPolicy=gn,i.loading="lazy",i.setAttribute("allowfullscreen",""),n.appendChild(i),n}function bi(s,t,e,n,i,r,a){const o=document.createElement("div");o.className="alap-embed-placeholder",o.style.minHeight=`${Math.min(i,160)}px`,o.style.maxWidth=`${r}px`;const l=document.createElement("span");l.className="alap-embed-placeholder-provider",l.textContent=e;const c=document.createElement("span");c.className="alap-embed-placeholder-label",c.textContent=`Load ${e} content`;const d=document.createElement("button");d.className="alap-embed-load-btn",d.textContent="Load",d.type="button";const u=document.createElement("button");return u.className="alap-embed-always-btn",u.textContent=`Always allow ${a}`,u.type="button",o.appendChild(l),o.appendChild(c),o.appendChild(d),o.appendChild(u),d.addEventListener("click",p=>{p.stopPropagation(),De(o,t,i,r)}),u.addEventListener("click",p=>{p.stopPropagation(),Rt(a),De(o,t,i,r)}),o.addEventListener("click",()=>{De(o,t,i,r)}),o}function De(s,t,e,n){const i=Mt(t,e,n);s.replaceWith(i)}function Fe(s){const t=document.createElement("a");return t.className="alap-embed-link",t.href=D(s),t.target="_blank",t.rel="noopener noreferrer",t.textContent=s,t}class yi{constructor(t,e={}){h(this,"rendererType",ot);h(this,"engine");h(this,"config");h(this,"selector");h(this,"placement");h(this,"overlay",null);h(this,"links",[]);h(this,"currentIndex",0);h(this,"activeTrigger",null);h(this,"setNavHandle",null);h(this,"transitioning",!1);h(this,"pendingDelta",null);h(this,"rapidMode",!1);h(this,"rapidResetTimer",null);h(this,"embedPolicy");h(this,"embedAllowlist");h(this,"currentSources",[]);h(this,"progressive");h(this,"handleKeydown");this.config=t,this.engine=new K(t,{handlers:e.handlers}),this.selector=e.selector??".alap",this.placement=e.placement?{compass:e.placement,strategy:"flip"}:null,this.embedPolicy=e.embedPolicy??"prompt",this.embedAllowlist=e.embedAllowlist,this.handleKeydown=this.onKeydown.bind(this),this.progressive=new fe({engine:this.engine,cancelFetchOnDismiss:()=>{var n;return((n=this.config.settings)==null?void 0:n.cancelFetchOnDismiss)===!0},onRender:n=>this.onProgressiveRender(n)}),this.init()}init(){const t=document.querySelectorAll(this.selector);for(const e of t)e.addEventListener("click",n=>this.onTriggerClick(n,e)),e.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),e.click())}),e.setAttribute("role","button"),e.setAttribute("tabindex",e.getAttribute("tabindex")??"0")}onTriggerClick(t,e){t.preventDefault(),t.stopPropagation();const n=e.getAttribute("data-alap-linkitems");n&&(this.activeTrigger=e,this.progressive.start(e,n,t,e.id||void 0))}onProgressiveRender(t){if(this.links=t.state.resolved,this.currentSources=t.state.sources,this.currentIndex=0,!this.overlay){this.open();return}if(t.transitioningFromLoading){const e=this.overlay.querySelector(".alap-lightbox-panel"),n=(e==null?void 0:e.getBoundingClientRect())??null;if(this.render(),n){const i=this.overlay.querySelector(".alap-lightbox-panel");i&&ge(i,n)}}else this.render()}get isOpen(){return this.overlay!==null}openWith(t){t.links.length!==0&&(this.links=t.links,this.currentIndex=t.initialIndex??0,this.open(),this.activeTrigger=t.triggerElement??null)}open(){this.teardownOverlay(),this.overlay=document.createElement("div"),this.overlay.className="alap-lightbox-overlay",this.overlay.setAttribute("role","dialog"),this.overlay.setAttribute("aria-modal","true"),this.overlay.setAttribute("aria-label","Link preview");const t=this.resolvePlacement();t&&ce(this.overlay,le(t,de())),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.close()}),this.render(),Y(this.overlay,document.body,"alap-lightbox-visible"),document.addEventListener("keydown",this.handleKeydown)}close(){const t=this.activeTrigger;return this.progressive.stop(),this.currentSources=[],this.teardownOverlay(),this.activeTrigger=null,t}teardownOverlay(){if(this.overlay){const t=this.overlay;this.overlay=null,Z(t,"alap-lightbox-visible")}document.removeEventListener("keydown",this.handleKeydown)}render(){if(!this.overlay)return;this.overlay.innerHTML="";const t=document.createElement("button");t.className="alap-lightbox-close",t.setAttribute("aria-label","Close"),t.textContent="×",t.addEventListener("click",()=>this.close()),this.overlay.appendChild(t);const e=document.createElement("div");if(e.className="alap-lightbox-panel",this.links.length===0&&this.currentSources.length>0){const y=this.currentSources.find(g=>g.status==="error")??this.currentSources.find(g=>g.status==="empty")??this.currentSources[0],b=Et(y,"div");e.appendChild(b),this.overlay.appendChild(e);return}const n=document.createElement("div");n.className="alap-lightbox-image-wrap";const i=document.createElement("img");i.className="alap-lightbox-image",i.style.cursor="zoom-in",i.addEventListener("click",y=>{y.stopPropagation(),i.src&&this.openZoom(i.src)}),n.appendChild(i),e.appendChild(n);const r=document.createElement("div");r.className="alap-lightbox-body";const a=document.createElement("div");a.className="alap-lightbox-label-row";const o=document.createElement("h2");o.className="alap-lightbox-label",a.appendChild(o);const l=document.createElement("span");l.className="alap-lightbox-credit",a.appendChild(l),r.appendChild(a);const c=document.createElement("p");c.className="alap-lightbox-description",r.appendChild(c);const d=document.createElement("a");d.rel="noopener noreferrer",d.className="alap-lightbox-visit",d.textContent="Visit",r.appendChild(d);const u=document.createElement("div");u.className="alap-lightbox-counter-wrap";const p=document.createElement("span");if(p.className="alap-lightbox-counter",u.appendChild(p),this.links.length>1&&(this.setNavHandle=be({counterWrap:u,counterText:p,links:this.links,currentIndex:this.currentIndex,onJump:y=>this.jumpTo(y),css:{setnav:"alap-lightbox-setnav",list:"alap-lightbox-setnav-list",item:"alap-lightbox-setnav-item",filterWrap:"alap-lightbox-setnav-filter-wrap",filter:"alap-lightbox-setnav-filter",clear:"alap-lightbox-setnav-clear"},closeIcon:"×",hoverHint:"swap"})),this.links.length>1){const y=document.createElement("div");y.className="alap-lightbox-nav";const b=document.createElement("button");b.className="alap-lightbox-nav-prev",b.setAttribute("aria-label","Previous"),b.textContent="‹",b.addEventListener("click",()=>this.navigate(-1)),y.appendChild(b),y.appendChild(u);const g=document.createElement("button");g.className="alap-lightbox-nav-next",g.setAttribute("aria-label","Next"),g.textContent="›",g.addEventListener("click",()=>this.navigate(1)),y.appendChild(g),r.appendChild(y)}else r.appendChild(u);e.appendChild(r),this.overlay.appendChild(e),this.update()}update(){var m,f,x,C;if(!this.overlay)return;const t=this.links[this.currentIndex],e=this.links.length,n=!!(t.image||t.thumbnail),i=this.overlay.querySelector(".alap-lightbox-panel"),r=i.querySelector(".alap-lightbox-image-wrap"),a=r.querySelector(".alap-lightbox-image"),o=i.querySelector(".alap-lightbox-label"),l=i.querySelector(".alap-lightbox-credit"),c=i.querySelector(".alap-lightbox-description"),d=i.querySelector(".alap-lightbox-visit"),u=i.querySelector(".alap-lightbox-counter"),p=r.querySelector(".alap-embed-wrap, .alap-embed-placeholder, .alap-embed-link");p&&p.remove();const y=(m=t.meta)==null?void 0:m.embed;if(n)a.src=t.image??t.thumbnail,a.alt=t.altText??t.label??"",a.style.display="",r.classList.remove("no-image"),i.style.background="";else if(typeof y=="string"&&y){a.style.display="none",r.classList.remove("no-image"),i.style.background="";const T=(f=t.meta)==null?void 0:f.embedType,k=Oe(y,T,{embedPolicy:this.embedPolicy,embedAllowlist:this.embedAllowlist});r.appendChild(k)}else a.style.display="none",r.classList.add("no-image"),i.style.background="transparent";o.textContent=t.label??"",o.title=t.label??"";const b=(x=t.meta)==null?void 0:x.photoCredit,g=(C=t.meta)==null?void 0:C.photoCreditUrl;if(l.innerHTML="",b&&n)if(g){const T=document.createElement("a");T.href=P(g,t),T.target="_blank",T.rel="noopener noreferrer",T.textContent=`Photo: ${b}`,l.appendChild(T)}else l.textContent=`Photo: ${b}`;c.textContent=t.description??"",c.style.display=t.description?"":"none",d.href=P(t.url,t),d.target=z(t.targetWindow,t)??"_blank",this.setNavHandle?(this.setNavHandle.updateCounter(this.currentIndex,e),this.setNavHandle.setActive(this.currentIndex)):u.textContent=e>1?`${this.currentIndex+1} / ${e}`:""}jumpTo(t){var i;if(t===this.currentIndex||this.transitioning)return;const e=(i=this.overlay)==null?void 0:i.querySelector(".alap-lightbox-panel");if(!e)return;this.transitioning=!0,e.classList.add("fading");const n=parseFloat(getComputedStyle(e).getPropertyValue("--alap-lightbox-transition"))*1e3;setTimeout(()=>{this.currentIndex=t,this.update(),e.classList.remove("fading"),this.transitioning=!1},n)}markRapid(){this.rapidResetTimer!==null&&clearTimeout(this.rapidResetTimer),this.rapidResetTimer=setTimeout(()=>{this.rapidMode=!1,this.rapidResetTimer=null},1e3)}navigate(t){var r;if(this.transitioning){this.pendingDelta=t,this.markRapid();return}this.markRapid();const e=(r=this.overlay)==null?void 0:r.querySelector(".alap-lightbox-panel");if(!e)return;this.transitioning=!0,e.classList.add("fading");const n=parseFloat(getComputedStyle(e).getPropertyValue("--alap-lightbox-transition"))*1e3,i=this.rapidMode?n/2:n;setTimeout(()=>{if(this.currentIndex=(this.currentIndex+t+this.links.length)%this.links.length,this.update(),e.classList.remove("fading"),this.transitioning=!1,this.rapidMode=!0,this.pendingDelta!==null){const a=this.pendingDelta;this.pendingDelta=null,this.navigate(a)}},i)}onKeydown(t){me(t,{close:()=>this.close(),prev:()=>this.navigate(-1),next:()=>this.navigate(1)})}openZoom(t){ve({container:document.body,src:t,overlayClass:"alap-lightbox-zoom-overlay",imageClass:"alap-lightbox-zoom-image",visibleClass:"alap-lightbox-zoom-visible"})}setPlacement(t){this.placement=t?{compass:t,strategy:"flip"}:null}resolvePlacement(){var n,i;const t=(n=this.activeTrigger)==null?void 0:n.getAttribute("data-alap-placement");if(t)return I(t);if(this.placement)return this.placement;const e=(i=this.config.settings)==null?void 0:i.placement;return typeof e=="string"?I(e):null}getEngine(){return this.engine}destroy(){this.close();const t=document.querySelectorAll(this.selector);for(const e of t)e.removeAttribute("role")}}const wi=`
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
`,Ot="_default",Ei="Visit",xi="Close",Dt="--alap-lightbox-transition",Ft=250,Ut="×",Ai="‹",Ci="›";class Ht extends HTMLElement{constructor(){super();h(this,"overlay",null);h(this,"links",[]);h(this,"currentIndex",0);h(this,"isOpen",!1);h(this,"justClosed",!1);h(this,"transitioning",!1);h(this,"pendingDelta",null);h(this,"rapidMode",!1);h(this,"rapidResetTimer",null);h(this,"setNavHandle",null);h(this,"handleKeydown");h(this,"handleDocumentClick");h(this,"onTriggerClick",e=>{if(this.overlay&&e.composedPath().includes(this.overlay))return;if(this.justClosed){this.justClosed=!1;return}e.preventDefault(),e.stopPropagation();const n=this.getAttribute("query");if(!n)return;const i=this.getAttribute("config")??Ot,r=X(i);if(!r){w(`<alap-lightbox>: no config registered for "${i}". Call registerConfig() first.`);return}const a=this.id||void 0;this.links=r.resolve(n,a),this.links.length!==0&&(this.currentIndex=0,this.open())});h(this,"onTriggerKeydown",e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.click())});const e=this.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=wi,e.appendChild(n);const i=document.createElement("slot");e.appendChild(i),this.handleKeydown=this.onKeydown.bind(this),this.handleDocumentClick=this.onDocumentClick.bind(this)}static get observedAttributes(){return["query","config","placement"]}connectedCallback(){this.getAttribute("role")||this.setAttribute("role","button"),this.setAttribute("aria-haspopup","dialog"),this.getAttribute("tabindex")||this.setAttribute("tabindex","0"),this.addEventListener("click",this.onTriggerClick),this.addEventListener("keydown",this.onTriggerKeydown)}disconnectedCallback(){this.close(),this.removeEventListener("click",this.onTriggerClick),this.removeEventListener("keydown",this.onTriggerKeydown)}attributeChangedCallback(e,n,i){if(n!==i){if(e==="placement"&&this.isOpen){this.applyPlacementStyles();return}this.isOpen&&this.close()}}resolvePlacement(){var a;const e=this.getAttribute("placement");if(e)return I(e);const n=this.getAttribute("config")??Ot,i=pe(n),r=(a=i==null?void 0:i.settings)==null?void 0:a.placement;return typeof r=="string"?I(r):null}applyPlacementStyles(){if(!this.overlay)return;const e=this.resolvePlacement();e?ce(this.overlay,le(e,de())):pt(this.overlay)}open(){this.close(),this.overlay=document.createElement("div"),this.overlay.className="overlay",this.overlay.setAttribute("part","overlay"),this.overlay.setAttribute("role","dialog"),this.overlay.setAttribute("aria-modal","true"),this.overlay.setAttribute("aria-label","Link preview"),this.applyPlacementStyles(),this.render(),Y(this.overlay,this.shadowRoot,"visible"),this.isOpen=!0,this.setAttribute("aria-expanded","true"),document.addEventListener("keydown",this.handleKeydown),document.addEventListener("click",this.handleDocumentClick)}close(){if(!this.overlay)return;const e=this.overlay;this.overlay=null,this.isOpen=!1,this.justClosed=!0,requestAnimationFrame(()=>{this.justClosed=!1}),Z(e,"visible"),this.setAttribute("aria-expanded","false"),document.removeEventListener("keydown",this.handleKeydown),document.removeEventListener("click",this.handleDocumentClick)}render(){if(!this.overlay)return;this.overlay.innerHTML="";const e=this.createButton("close-x",Ut,"Close",()=>this.close());e.setAttribute("part","close-x"),this.overlay.appendChild(e);const n=document.createElement("div");n.className="panel",n.setAttribute("part","panel");const i=document.createElement("div");i.className="image-wrap",i.setAttribute("part","image-wrap");const r=document.createElement("img");r.className="image",r.setAttribute("part","image"),r.style.cursor="zoom-in",r.addEventListener("click",g=>{g.stopPropagation(),r.src&&this.openZoom(r.src)}),i.appendChild(r),n.appendChild(i);const a=document.createElement("div");a.className="body",a.setAttribute("part","body");const o=document.createElement("div");o.className="label-row",o.setAttribute("part","label-row");const l=document.createElement("h2");l.className="label",l.setAttribute("part","label"),o.appendChild(l);const c=document.createElement("span");c.className="credit",c.setAttribute("part","credit"),o.appendChild(c),a.appendChild(o);const d=document.createElement("p");d.className="description",d.setAttribute("part","description"),a.appendChild(d);const u=document.createElement("a");u.className="visit",u.setAttribute("part","visit"),u.rel="noopener noreferrer",a.appendChild(u);const p=this.createButton("close-btn",xi,"Close",()=>this.close());p.setAttribute("part","close-btn"),a.appendChild(p);const y=document.createElement("div");y.className="counter-wrap",y.setAttribute("part","counter-wrap");const b=document.createElement("span");if(b.className="counter",b.setAttribute("part","counter"),y.appendChild(b),this.links.length>1&&(this.setNavHandle=be({counterWrap:y,counterText:b,links:this.links,currentIndex:this.currentIndex,onJump:g=>this.jumpTo(g),css:{setnav:"setnav",list:"setnav-list",item:"setnav-item",filterWrap:"setnav-filter-wrap",filter:"setnav-filter",clear:"setnav-clear"},closeIcon:Ut,hoverHint:"swap",parts:{setnav:"setnav",filter:"setnav-filter"},getActiveElement:()=>{var g;return((g=this.shadowRoot)==null?void 0:g.activeElement)??null}})),this.links.length>1){const g=document.createElement("div");g.className="nav",g.setAttribute("part","nav");const m=this.createButton("nav-prev",Ai,"Previous",()=>this.navigate(-1));m.setAttribute("part","nav-prev"),g.appendChild(m),g.appendChild(y);const f=this.createButton("nav-next",Ci,"Next",()=>this.navigate(1));f.setAttribute("part","nav-next"),g.appendChild(f),a.appendChild(g)}else a.appendChild(y);n.appendChild(a),this.overlay.appendChild(n),this.overlay.addEventListener("click",g=>{g.target===this.overlay&&this.close()}),this.update()}update(){var b,g;if(!this.overlay)return;const e=this.links[this.currentIndex],n=this.links.length,i=!!(e.image||e.thumbnail),r=this.overlay.querySelector(".panel"),a=r.querySelector(".image-wrap"),o=a.querySelector(".image"),l=r.querySelector(".label"),c=r.querySelector(".credit"),d=r.querySelector(".description"),u=r.querySelector(".visit");i?(o.src=e.image??e.thumbnail,o.alt=e.altText??e.label??"",o.style.display="",a.classList.remove("hidden"),r.classList.remove("no-image")):(o.style.display="none",a.classList.add("hidden"),r.classList.add("no-image")),l.textContent=e.label??"",l.title=e.label??"";const p=(b=e.meta)==null?void 0:b.photoCredit,y=(g=e.meta)==null?void 0:g.photoCreditUrl;if(c.innerHTML="",p&&i){if(y){const m=document.createElement("a");m.href=P(y,e),m.target="_blank",m.rel="noopener noreferrer",m.textContent=`Photo: ${p}`,c.appendChild(m)}else c.textContent=`Photo: ${p}`;c.classList.remove("hidden")}else c.classList.add("hidden");if(e.description?(d.textContent=e.description,d.classList.remove("hidden")):d.classList.add("hidden"),u.href=P(e.url,e),u.target=z(e.targetWindow,e)??"_blank",u.textContent=Ei,this.setNavHandle)this.setNavHandle.updateCounter(this.currentIndex,n),this.setNavHandle.setActive(this.currentIndex);else{const m=r.querySelector(".counter");n>1?(m.textContent=`${this.currentIndex+1} / ${n}`,m.classList.remove("hidden")):m.classList.add("hidden")}}jumpTo(e){var o;if(e===this.currentIndex||this.transitioning)return;const n=(o=this.overlay)==null?void 0:o.querySelector(".panel");if(!n)return;this.transitioning=!0,n.classList.add("fading");const i=getComputedStyle(n).getPropertyValue(Dt),r=parseFloat(i)*1e3,a=Number.isFinite(r)&&r>0?r:Ft;setTimeout(()=>{this.currentIndex=e,this.update(),n.classList.remove("fading"),this.transitioning=!1},a)}markRapid(){this.rapidResetTimer!==null&&clearTimeout(this.rapidResetTimer),this.rapidResetTimer=setTimeout(()=>{this.rapidMode=!1,this.rapidResetTimer=null},1e3)}navigate(e){var l;if(this.transitioning){this.pendingDelta=e,this.markRapid();return}this.markRapid();const n=(l=this.overlay)==null?void 0:l.querySelector(".panel");if(!n)return;this.transitioning=!0,n.classList.add("fading");const i=getComputedStyle(n).getPropertyValue(Dt),r=parseFloat(i)*1e3,a=Number.isFinite(r)&&r>0?r:Ft,o=this.rapidMode?a/2:a;setTimeout(()=>{if(this.currentIndex=(this.currentIndex+e+this.links.length)%this.links.length,this.update(),n.classList.remove("fading"),this.transitioning=!1,this.rapidMode=!0,this.pendingDelta!==null){const c=this.pendingDelta;this.pendingDelta=null,this.navigate(c)}},o)}onKeydown(e){me(e,{close:()=>this.close(),prev:()=>this.navigate(-1),next:()=>this.navigate(1)})}openZoom(e){ve({container:this.shadowRoot,src:e,overlayClass:"zoom-overlay",imageClass:"zoom-image",visibleClass:"visible",overlayPart:"zoom-overlay"})}onDocumentClick(e){}createButton(e,n,i,r){const a=document.createElement("button");return e&&(a.className=e),a.setAttribute("aria-label",i),a.textContent=n,a.addEventListener("click",r),a}}function Ti(s="alap-lightbox"){customElements.get(s)||customElements.define(s,Ht)}const ki=".alap",Li="Visit →",Si="Close",zt="_blank",_i=100,Ue=5,Ii="--alap-lens-transition",Ni=250,Pi="--alap-lens-resize-transition",Ri=350,$i=100,Mi=/^https?:\/\//,Oi=" · ",Di="Copied",Fi=1500,Ui=3e3,Wt="×",Hi="‹",zi="›",Bt="▲",jt="▼",Kt="⎘",Wi="fade",v={overlay:"alap-lens-overlay",overlayVisible:"alap-lens-overlay-visible",panel:"alap-lens-panel",panelFading:"alap-lens-panel-fading",closeX:"alap-lens-close-x",imageWrap:"alap-lens-image-wrap",imageWrapEmpty:"alap-lens-image-wrap-empty",image:"alap-lens-image",titleRow:"alap-lens-title-row",credit:"alap-lens-credit",label:"alap-lens-label",tags:"alap-lens-tags",tag:"alap-lens-tag",description:"alap-lens-description",separator:"alap-lens-separator",meta:"alap-lens-meta",metaRow:"alap-lens-meta-row",metaRowLinks:"alap-lens-meta-row-links",metaRowText:"alap-lens-meta-row-text",metaKey:"alap-lens-meta-key",metaValue:"alap-lens-meta-value",metaChips:"alap-lens-meta-chips",metaChip:"alap-lens-meta-chip",metaLinks:"alap-lens-meta-links",metaLink:"alap-lens-meta-link",metaMore:"alap-lens-meta-more",metaText:"alap-lens-meta-text",actions:"alap-lens-actions",visit:"alap-lens-visit",closeBtn:"alap-lens-close-btn",nav:"alap-lens-nav",navPrev:"alap-lens-nav-prev",navNext:"alap-lens-nav-next",counterWrap:"alap-lens-counter-wrap",counter:"alap-lens-counter",setnav:"alap-lens-setnav",setnavList:"alap-lens-setnav-list",setnavItem:"alap-lens-setnav-item",setnavFilterWrap:"alap-lens-setnav-filter-wrap",setnavFilter:"alap-lens-setnav-filter",setnavClear:"alap-lens-setnav-clear",drawer:"alap-lens-drawer",drawerExpanded:"alap-lens-drawer-expanded",drawerHandle:"alap-lens-drawer-handle",drawerToggle:"alap-lens-drawer-toggle",imageCollapsed:"alap-lens-image-collapsed",zoomOverlay:"alap-lens-zoom-overlay",zoomVisible:"alap-lens-zoom-visible",zoomImage:"alap-lens-zoom-image",copyBtn:"alap-lens-copy",copyDone:"alap-lens-copy-done"},M={role:"dialog",modal:"true",dialogLabel:"Item details",copyLabel:"Copy to clipboard",closeLabel:"Close",prevLabel:"Previous",nextLabel:"Next"},qt=new Set(["source","sourceLabel","updated","atUri","handle","did","photoCredit","photoCreditUrl","embed","embedType"]),Q="value",Vt="list",Xt="links",Gt="text",He="_display";class Bi{constructor(t,e={}){h(this,"rendererType",lt);h(this,"engine");h(this,"selector");h(this,"visitLabel");h(this,"closeLabel");h(this,"metaLabels");h(this,"copyable");h(this,"panelCloseButton");h(this,"tagSwitchTooltip");h(this,"placement");h(this,"transition");h(this,"overlay",null);h(this,"links",[]);h(this,"originalLinks",[]);h(this,"currentIndex",0);h(this,"transitioning",!1);h(this,"pendingDelta",null);h(this,"rapidMode",!1);h(this,"rapidResetTimer",null);h(this,"activeTrigger",null);h(this,"activeTag",null);h(this,"setNavHandle",null);h(this,"drawerExpanded",!1);h(this,"embedPolicy");h(this,"embedAllowlist");h(this,"config");h(this,"currentSources",[]);h(this,"progressive");h(this,"handleKeydown");this.config=t,this.engine=new K(t,{handlers:e.handlers}),this.selector=e.selector??ki,this.visitLabel=e.visitLabel??Li,this.closeLabel=e.closeLabel??Si,this.metaLabels=e.metaLabels??{},this.copyable=e.copyable??!0,this.panelCloseButton=e.panelCloseButton??!1,this.tagSwitchTooltip=e.tagSwitchTooltip??Ui,this.placement=e.placement?{compass:e.placement,strategy:"flip"}:null,this.transition=e.transition??Wi,this.embedPolicy=e.embedPolicy??"prompt",this.embedAllowlist=e.embedAllowlist,this.handleKeydown=this.onKeydown.bind(this),this.progressive=new fe({engine:this.engine,cancelFetchOnDismiss:()=>{var n;return((n=this.config.settings)==null?void 0:n.cancelFetchOnDismiss)===!0},onRender:n=>this.onProgressiveRender(n)}),this.init()}init(){const t=document.querySelectorAll(this.selector);for(const e of t)e.addEventListener("click",n=>this.onTriggerClick(n,e)),e.addEventListener("keydown",n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),e.click())}),e.setAttribute("role","button"),e.setAttribute("tabindex",e.getAttribute("tabindex")??"0")}onTriggerClick(t,e){t.preventDefault(),t.stopPropagation();const n=e.getAttribute("data-alap-linkitems");n&&(this.activeTrigger=e,this.progressive.start(e,n,t,e.id||void 0))}onProgressiveRender(t){if(this.links=t.state.resolved,this.originalLinks=[...t.state.resolved],this.currentSources=t.state.sources,this.currentIndex=0,this.activeTag=null,!this.overlay){this.open();return}if(t.transitioningFromLoading){const e=this.overlay.querySelector(`.${v.panel}`),n=(e==null?void 0:e.getBoundingClientRect())??null;if(this.render(),n){const i=this.overlay.querySelector(`.${v.panel}`);i&&ge(i,n)}}else this.render()}get isOpen(){return this.overlay!==null}openWith(t){t.links.length!==0&&(this.links=t.links,this.originalLinks=[...t.links],this.currentIndex=t.initialIndex??0,this.activeTag=null,this.open(),this.activeTrigger=t.triggerElement??null)}open(){this.teardownOverlay(),this.overlay=document.createElement("div"),this.overlay.className=v.overlay,this.overlay.setAttribute("role",M.role),this.overlay.setAttribute("aria-modal",M.modal),this.overlay.setAttribute("aria-label",M.dialogLabel);const t=this.resolvePlacement();t&&ce(this.overlay,le(t,de())),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.close()}),this.render(),Y(this.overlay,document.body,v.overlayVisible),document.addEventListener("keydown",this.handleKeydown)}close(){const t=this.activeTrigger;return this.progressive.stop(),this.currentSources=[],this.teardownOverlay(),this.activeTrigger=null,this.drawerExpanded=!1,t}teardownOverlay(){if(this.overlay){const t=this.overlay;this.overlay=null,Z(t,v.overlayVisible)}document.removeEventListener("keydown",this.handleKeydown)}render(){if(!this.overlay)return;this.overlay.innerHTML="";const t=this.createButton(v.closeX,Wt,M.closeLabel,()=>this.close());this.overlay.appendChild(t);const e=document.createElement("div");if(e.className=v.panel,this.links.length===0&&this.currentSources.length>0){const a=this.currentSources.find(l=>l.status==="error")??this.currentSources.find(l=>l.status==="empty")??this.currentSources[0],o=Et(a,"div");e.appendChild(o),this.overlay.appendChild(e);return}const n=this.links[this.currentIndex],i=this.links.length;this.renderImage(e,n),this.renderDrawerHandle(e);const r=document.createElement("div");r.className=this.drawerExpanded?`${v.drawer} ${v.drawerExpanded}`:v.drawer,this.renderDetails(r,n),this.renderMetaZone(r,n),e.appendChild(r),this.renderActions(e,n),i>1&&this.renderNav(e,i),this.overlay.appendChild(e)}renderImage(t,e){const n=e.thumbnail||e.image,i=document.createElement("div");let r=n?v.imageWrap:`${v.imageWrap} ${v.imageWrapEmpty}`;if(this.drawerExpanded&&(r+=` ${v.imageCollapsed}`),i.className=r,n){const a=document.createElement("img");a.className=v.image,a.src=n,a.alt=e.altText??e.label??"",a.style.cursor="zoom-in",a.addEventListener("load",()=>{a.naturalHeight>a.naturalWidth&&(a.style.objectFit="contain",i.style.maxHeight=this.drawerExpanded?"0":"var(--alap-lens-image-portrait-max-height)")}),a.addEventListener("click",o=>{o.stopPropagation(),a.src&&this.openZoom(a.src)}),i.appendChild(a)}t.appendChild(i)}renderDrawerHandle(t){const e=document.createElement("div");e.className=v.drawerHandle;const n=document.createElement("span");n.className=v.drawerToggle,n.textContent=this.drawerExpanded?jt:Bt,e.setAttribute("role","button"),e.setAttribute("aria-label",this.drawerExpanded?"Show image":"Expand details"),e.addEventListener("click",i=>{i.stopPropagation(),this.toggleDrawer()}),e.appendChild(n),t.appendChild(e)}renderDetails(t,e){var r,a;const n=e.thumbnail||e.image,i=(r=e.meta)==null?void 0:r.photoCredit;if(e.label||i&&n){const o=document.createElement("div");if(o.className=v.titleRow,e.label){const l=document.createElement("h2");l.className=v.label,l.textContent=e.label,o.appendChild(l)}if(i&&n){const l=document.createElement("span");l.className=v.credit;const c=(a=e.meta)==null?void 0:a.photoCreditUrl;if(c){const d=document.createElement("a");d.href=P(c,e),d.target="_blank",d.rel="noopener noreferrer",d.textContent=`Photo: ${i}`,l.appendChild(d)}else l.textContent=`Photo: ${i}`;o.appendChild(l)}t.appendChild(o)}if(e.tags&&e.tags.length>0||this.copyable){const o=document.createElement("div");if(o.className=v.tags,e.tags)for(const l of e.tags){const c=document.createElement("span");c.className=v.tag,this.activeTag===l&&c.classList.add("active"),c.textContent=l,c.style.cursor="pointer",c.addEventListener("click",d=>{if(d.stopPropagation(),this.activeTag===l){this.links=[...this.originalLinks],this.currentIndex=0,this.activeTag=null,this.render();return}const u=this.engine.resolve(`.${l}`);u.length!==0&&(this.links=u,this.currentIndex=0,this.activeTag=l,this.render(),this.tagSwitchTooltip>0&&this.showTagTooltip(l))}),o.appendChild(c)}this.copyable&&this.renderCopyButton(o,e),t.appendChild(o)}if(e.description){const o=document.createElement("p");o.className=v.description,o.textContent=e.description,t.appendChild(o)}}renderMetaZone(t,e){const n=e.meta;if(!n)return;const i=n.embed;if(typeof i=="string"&&i){const l=n.embedType,c=Oe(i,l,{embedPolicy:this.embedPolicy,embedAllowlist:this.embedAllowlist});t.appendChild(c)}const r=Object.entries(n).filter(([l])=>!qt.has(l)&&!l.startsWith("_")&&!l.endsWith(He));if(r.length===0)return;const a=document.createElement("hr");a.className=v.separator,t.appendChild(a);const o=document.createElement("dl");o.className=v.meta;for(const[l,c]of r){if(c==null||c==="")continue;const d=n[`${l}${He}`],u=this.renderMetaField(l,c,d,e);u&&o.appendChild(u)}o.children.length>0&&t.appendChild(o)}renderActions(t,e){const n=document.createElement("div");if(n.className=v.actions,e.url){const i=document.createElement("a");i.className=v.visit,i.href=P(e.url,e),i.target=z(e.targetWindow,e)??zt,i.rel="noopener noreferrer",i.textContent=this.visitLabel,n.appendChild(i)}if(this.panelCloseButton){const i=this.createButton(v.closeBtn,this.closeLabel,M.closeLabel,()=>this.close());n.appendChild(i)}t.appendChild(n)}renderNav(t,e){const n=document.createElement("div");n.className=v.nav;const i=this.createButton(v.navPrev,Hi,M.prevLabel,()=>{this.navigate(-1)});n.appendChild(i);const r=document.createElement("div");r.className=v.counterWrap;const a=document.createElement("span");a.className=v.counter,r.appendChild(a),this.setNavHandle=be({counterWrap:r,counterText:a,links:this.links,currentIndex:this.currentIndex,onJump:l=>this.jumpTo(l),css:{setnav:v.setnav,list:v.setnavList,item:v.setnavItem,filterWrap:v.setnavFilterWrap,filter:v.setnavFilter,clear:v.setnavClear},closeIcon:Wt,hoverHint:"crossfade"}),n.appendChild(r);const o=this.createButton(v.navNext,zi,M.nextLabel,()=>{this.navigate(1)});n.appendChild(o),t.appendChild(n)}getCssDuration(t,e,n){const i=getComputedStyle(t).getPropertyValue(e),r=parseFloat(i)*1e3;return Number.isFinite(r)&&r>0?r:n}navigate(t){if(this.links.length<=1)return;const e=(this.currentIndex+t+this.links.length)%this.links.length;if(this.transition==="none"){this.currentIndex=e,this.render();return}if(this.transition==="resize"){if(this.transitioning)return;this.navigateResize(e);return}if(this.transitioning){this.pendingDelta=t,this.markRapid();return}this.markRapid(),this.navigateFade(e)}markRapid(){this.rapidResetTimer!==null&&clearTimeout(this.rapidResetTimer),this.rapidResetTimer=setTimeout(()=>{this.rapidMode=!1,this.rapidResetTimer=null},1e3)}navigateFade(t){var r;const e=(r=this.overlay)==null?void 0:r.querySelector(`.${v.panel}`);if(!e)return;this.transitioning=!0,e.classList.add(v.panelFading);const n=this.getCssDuration(e,Ii,Ni),i=this.rapidMode?n/2:n;setTimeout(()=>{var o;this.currentIndex=t,this.render();const a=(o=this.overlay)==null?void 0:o.querySelector(`.${v.panel}`);a&&(a.classList.add(v.panelFading),a.offsetHeight,a.classList.remove(v.panelFading)),setTimeout(()=>{this.transitioning=!1,this.drainPending()},i)},i),this.rapidMode=!0}drainPending(){if(this.pendingDelta!==null){const t=this.pendingDelta;this.pendingDelta=null;const e=(this.currentIndex+t+this.links.length)%this.links.length;this.navigateFade(e)}}navigateResize(t){var a,o;const e=(a=this.overlay)==null?void 0:a.querySelector(`.${v.panel}`);if(!e)return;this.transitioning=!0;const n=this.getCssDuration(e,Pi,Ri),i=e.scrollHeight;e.style.height=`${i}px`,e.style.overflow="hidden",this.currentIndex=t,this.render();const r=(o=this.overlay)==null?void 0:o.querySelector(`.${v.panel}`);if(!r){this.transitioning=!1;return}r.style.height=`${i}px`,r.style.overflow="hidden",requestAnimationFrame(()=>{r.style.height="auto";const l=r.scrollHeight;r.style.height=`${i}px`,r.offsetHeight,r.style.height=`${l}px`;const c=()=>{r.removeEventListener("transitionend",c),r.style.height="",r.style.overflow="",this.transitioning=!1};r.addEventListener("transitionend",c,{once:!0}),setTimeout(()=>{this.transitioning&&c()},n+$i)})}renderMetaField(t,e,n,i){const r=this.formatMetaKey(t);switch(n??this.detectDisplayType(e)){case Vt:return this.renderChips(r,e);case Xt:return this.renderLinks(r,e,i);case Gt:return this.renderTextBlock(r,e);case Q:default:return this.renderKeyValue(r,this.formatMetaValue(e))}}detectDisplayType(t){return typeof t=="boolean"?Q:Array.isArray(t)?t.length===0?Q:t.every(e=>typeof e=="string"&&Mi.test(e))?Xt:t.every(e=>typeof e=="string")?Vt:Q:typeof t=="string"&&t.length>=_i?Gt:Q}formatMetaKey(t){return this.metaLabels[t]?this.metaLabels[t]:t.replace(/_/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,e=>e.toUpperCase())}formatMetaValue(t){return typeof t=="boolean"?t?"✓":"✗":Array.isArray(t)?t.join(", "):String(t)}renderKeyValue(t,e){const n=document.createElement("div");n.className=v.metaRow;const i=document.createElement("dt");i.className=v.metaKey,i.textContent=t,n.appendChild(i);const r=document.createElement("dd");return r.className=v.metaValue,r.textContent=e,n.appendChild(r),n}renderChips(t,e){const n=document.createElement("div");n.className=v.metaRow;const i=document.createElement("dt");i.className=v.metaKey,i.textContent=t,n.appendChild(i);const r=document.createElement("dd");r.className=v.metaChips;for(const a of e){const o=document.createElement("span");o.className=v.metaChip,o.textContent=a,r.appendChild(o)}return n.appendChild(r),n}renderLinks(t,e,n){const i=document.createElement("div");i.className=`${v.metaRow} ${v.metaRowLinks}`;const r=document.createElement("dt");r.className=v.metaKey,r.textContent=`${t} (${e.length})`,i.appendChild(r);const a=document.createElement("dd");a.className=v.metaLinks;const o=e.slice(0,Ue);for(const l of o){const c=document.createElement("a");c.className=v.metaLink,c.href=P(l,n),c.target=z(n.targetWindow,n)??zt,c.rel="noopener noreferrer";try{const d=new URL(l);c.textContent=d.pathname.length>1?d.pathname:d.hostname}catch{c.textContent=l}a.appendChild(c)}if(e.length>Ue){const l=document.createElement("span");l.className=v.metaMore,l.textContent=`+${e.length-Ue} more`,a.appendChild(l)}return i.appendChild(a),i}renderTextBlock(t,e){const n=document.createElement("div");n.className=`${v.metaRow} ${v.metaRowText}`;const i=document.createElement("dt");i.className=v.metaKey,i.textContent=t,n.appendChild(i);const r=document.createElement("dd");return r.className=v.metaText,r.textContent=e,n.appendChild(r),n}createButton(t,e,n,i){const r=document.createElement("button");return r.className=t,r.setAttribute("aria-label",n),r.textContent=e,r.addEventListener("click",i),r}renderCopyButton(t,e){const n=this.createButton(v.copyBtn,Kt,M.copyLabel,()=>{const i=this.buildClipboardText(e);navigator.clipboard.writeText(i).then(()=>{n.textContent=Di,n.classList.add(v.copyDone),setTimeout(()=>{n.textContent=Kt,n.classList.remove(v.copyDone)},Fi)})});t.appendChild(n)}buildClipboardText(t){const e=[];t.label&&e.push(t.label),t.tags&&t.tags.length>0&&e.push(t.tags.join(Oi)),t.url&&e.push(t.url),t.description&&(e.push(""),e.push(t.description));const n=t.meta;if(n){const i=Object.entries(n).filter(([r])=>!qt.has(r)&&!r.startsWith("_")&&!r.endsWith(He));if(i.length>0){e.push("");for(const[r,a]of i){if(a==null||a==="")continue;const o=this.formatMetaKey(r);e.push(`${o}: ${this.formatMetaValue(a)}`)}}}return e.join(`
`)}showTagTooltip(t){var r;const e=(r=this.overlay)==null?void 0:r.querySelector(`.${v.counter}`);if(!e)return;const n=500,i=e.textContent;e.style.opacity="0",setTimeout(()=>{e.isConnected&&(e.textContent=`switching to .${t}`,e.classList.add("tag-tooltip"),e.style.opacity="1",setTimeout(()=>{e.isConnected&&(e.style.opacity="0",setTimeout(()=>{e.isConnected&&(e.textContent=i,e.classList.remove("tag-tooltip"),e.style.opacity="1")},n))},this.tagSwitchTooltip))},n)}toggleDrawer(t){var a;if(t!==void 0&&t===this.drawerExpanded)return;this.drawerExpanded=t??!this.drawerExpanded;const e=(a=this.overlay)==null?void 0:a.querySelector(`.${v.panel}`);if(!e)return;const n=e.querySelector(`.${v.imageWrap}`);n&&n.classList.toggle(v.imageCollapsed,this.drawerExpanded);const i=e.querySelector(`.${v.drawer}`);i&&i.classList.toggle(v.drawerExpanded,this.drawerExpanded);const r=e.querySelector(`.${v.drawerHandle}`);if(r){const o=r.querySelector(`.${v.drawerToggle}`);o&&(o.textContent=this.drawerExpanded?jt:Bt),r.setAttribute("aria-label",this.drawerExpanded?"Show image":"Expand details")}}onKeydown(t){if(t.key==="ArrowUp"){t.preventDefault(),this.toggleDrawer(!0);return}if(t.key==="ArrowDown"){t.preventDefault(),this.toggleDrawer(!1);return}me(t,{close:()=>this.close(),prev:()=>this.navigate(-1),next:()=>this.navigate(1)})}jumpTo(t){if(t!==this.currentIndex){if(this.transition==="none"){this.currentIndex=t,this.render();return}if(this.transition==="resize"){if(this.transitioning)return;this.navigateResize(t);return}this.transitioning||this.navigateFade(t)}}openZoom(t){ve({container:document.body,src:t,overlayClass:v.zoomOverlay,imageClass:v.zoomImage,visibleClass:v.zoomVisible})}setPlacement(t){this.placement=t?{compass:t,strategy:"flip"}:null}resolvePlacement(){var n,i;const t=(n=this.activeTrigger)==null?void 0:n.getAttribute("data-alap-placement");if(t)return I(t);if(this.placement)return this.placement;const e=(i=this.config.settings)==null?void 0:i.placement;return typeof e=="string"?I(e):null}getEngine(){return this.engine}destroy(){this.close();const t=document.querySelectorAll(this.selector);for(const e of t)e.removeAttribute("role")}}const ji=`
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
`,ze="_default",Ki="Visit →",qi="Close",Vi=100,We=5,Xi="--alap-lens-transition",Gi=250,Yi="--alap-lens-resize-transition",Zi=350,Ji=100,Qi=/^https?:\/\//,er=" · ",tr="Copied",nr=1500,Yt=3e3,Zt="×",ir="‹",rr="›",Jt="⎘",Qt="▲",en="▼",ee="value",tn="list",nn="links",rn="text",Be="_display",sn=new Set(["source","sourceLabel","updated","atUri","handle","did","photoCredit","photoCreditUrl"]);class an extends HTMLElement{constructor(){super();h(this,"overlay",null);h(this,"links",[]);h(this,"originalLinks",[]);h(this,"currentIndex",0);h(this,"isOpen",!1);h(this,"justClosed",!1);h(this,"transitioning",!1);h(this,"pendingDelta",null);h(this,"rapidMode",!1);h(this,"rapidResetTimer",null);h(this,"activeTag",null);h(this,"setNavHandle",null);h(this,"drawerExpanded",!1);h(this,"handleKeydown");h(this,"onTriggerClick",e=>{if(this.overlay&&e.composedPath().includes(this.overlay))return;if(this.justClosed){this.justClosed=!1;return}e.preventDefault(),e.stopPropagation();const n=this.getAttribute("query");if(!n)return;const i=this.getAttribute("config")??ze,r=X(i);if(!r){w(`<alap-lens>: no config registered for "${i}". Call registerConfig() first.`);return}const a=this.id||void 0;this.links=r.resolve(n,a),this.links.length!==0&&(this.originalLinks=[...this.links],this.currentIndex=0,this.activeTag=null,this.open())});h(this,"onTriggerKeydown",e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.click())});const e=this.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=ji,e.appendChild(n);const i=document.createElement("slot");e.appendChild(i),this.handleKeydown=this.onKeydown.bind(this)}static get observedAttributes(){return["query","config","placement","transition","copyable","panel-close-button","tag-switch-tooltip"]}connectedCallback(){this.getAttribute("role")||this.setAttribute("role","button"),this.setAttribute("aria-haspopup","dialog"),this.getAttribute("tabindex")||this.setAttribute("tabindex","0"),this.addEventListener("click",this.onTriggerClick),this.addEventListener("keydown",this.onTriggerKeydown)}disconnectedCallback(){this.close(),this.removeEventListener("click",this.onTriggerClick),this.removeEventListener("keydown",this.onTriggerKeydown)}attributeChangedCallback(e,n,i){if(n!==i){if(e==="placement"&&this.isOpen){this.applyPlacementStyles();return}this.isOpen&&this.close()}}get visitLabel(){return this.getAttribute("visit-label")??Ki}get closeLabel(){return this.getAttribute("close-label")??qi}get copyable(){return this.getAttribute("copyable")!=="false"}get panelCloseButton(){return this.hasAttribute("panel-close-button")}get transitionMode(){const e=this.getAttribute("transition");return e==="fade"||e==="resize"||e==="none"?e:"fade"}get tagSwitchTooltip(){const e=this.getAttribute("tag-switch-tooltip");if(e!==null){const n=parseInt(e,10);return Number.isFinite(n)?n:Yt}return Yt}resolvePlacement(){var a;const e=this.getAttribute("placement");if(e)return I(e);const n=this.getAttribute("config")??ze,i=pe(n),r=(a=i==null?void 0:i.settings)==null?void 0:a.placement;return typeof r=="string"?I(r):null}applyPlacementStyles(){if(!this.overlay)return;const e=this.resolvePlacement();e?ce(this.overlay,le(e,de())):pt(this.overlay)}open(){this.close(),this.overlay=document.createElement("div"),this.overlay.className="overlay",this.overlay.setAttribute("part","overlay"),this.overlay.setAttribute("role","dialog"),this.overlay.setAttribute("aria-modal","true"),this.overlay.setAttribute("aria-label","Item details"),this.applyPlacementStyles(),this.overlay.addEventListener("click",e=>{e.target===this.overlay&&this.close()}),this.render(),Y(this.overlay,this.shadowRoot,"visible"),this.isOpen=!0,this.setAttribute("aria-expanded","true"),document.addEventListener("keydown",this.handleKeydown)}close(){if(!this.overlay)return;const e=this.overlay;this.overlay=null,this.isOpen=!1,this.justClosed=!0,this.drawerExpanded=!1,requestAnimationFrame(()=>{this.justClosed=!1}),Z(e,"visible"),this.setAttribute("aria-expanded","false"),document.removeEventListener("keydown",this.handleKeydown)}render(){if(!this.overlay)return;this.overlay.innerHTML="";const e=this.createButton("close-x",Zt,"Close",()=>this.close());e.setAttribute("part","close-x"),this.overlay.appendChild(e);const n=document.createElement("div");n.className="panel",n.setAttribute("part","panel");const i=this.links[this.currentIndex],r=this.links.length;this.renderImage(n,i);const a=document.createElement("div");a.className=this.drawerExpanded?"drawer drawer-expanded":"drawer",a.setAttribute("part","drawer"),this.renderDrawerHandle(n),this.renderDetails(a,i),this.renderMetaZone(a,i),n.appendChild(a),this.renderActions(n,i),r>1&&this.renderNav(n,r),this.overlay.appendChild(n)}renderImage(e,n){const i=n.thumbnail||n.image,r=document.createElement("div");let a=i?"image-wrap":"image-wrap image-wrap-empty";if(this.drawerExpanded&&(a+=" image-collapsed"),r.className=a,r.setAttribute("part","image-wrap"),i){const o=document.createElement("img");o.className="image",o.setAttribute("part","image"),o.src=i,o.alt=n.altText??n.label??"",o.style.cursor="zoom-in",o.addEventListener("load",()=>{o.naturalHeight>o.naturalWidth&&(o.style.objectFit="contain",r.style.maxHeight=this.drawerExpanded?"0":"var(--alap-lens-image-portrait-max-height, 420px)")}),o.addEventListener("click",l=>{l.stopPropagation(),o.src&&this.openZoom(o.src)}),r.appendChild(o)}e.appendChild(r)}renderDrawerHandle(e){const n=document.createElement("div");n.className="drawer-handle",n.setAttribute("part","drawer-handle");const i=document.createElement("span");i.className="drawer-toggle",i.setAttribute("part","drawer-toggle"),i.textContent=this.drawerExpanded?en:Qt,n.setAttribute("role","button"),n.setAttribute("aria-label",this.drawerExpanded?"Show image":"Expand details"),n.addEventListener("click",r=>{r.stopPropagation(),this.toggleDrawer()}),n.appendChild(i),e.appendChild(n)}renderDetails(e,n){var a,o;const i=n.thumbnail||n.image,r=(a=n.meta)==null?void 0:a.photoCredit;if(n.label||r&&i){const l=document.createElement("div");if(l.className="title-row",l.setAttribute("part","title-row"),n.label){const c=document.createElement("h2");c.className="label",c.setAttribute("part","label"),c.textContent=n.label,l.appendChild(c)}if(r&&i){const c=document.createElement("span");c.className="credit",c.setAttribute("part","credit");const d=(o=n.meta)==null?void 0:o.photoCreditUrl;if(d){const u=document.createElement("a");u.href=P(d,n),u.target="_blank",u.rel="noopener noreferrer",u.textContent=`Photo: ${r}`,c.appendChild(u)}else c.textContent=`Photo: ${r}`;l.appendChild(c)}e.appendChild(l)}if(n.tags&&n.tags.length>0||this.copyable){const l=document.createElement("div");if(l.className="tags",l.setAttribute("part","tags"),n.tags)for(const c of n.tags){const d=document.createElement("span");d.className="tag",this.activeTag===c&&d.classList.add("active"),d.textContent=c,d.addEventListener("click",u=>{if(u.stopPropagation(),this.activeTag===c){this.links=[...this.originalLinks],this.currentIndex=0,this.activeTag=null,this.render();return}const p=this.getAttribute("config")??ze,y=X(p);if(!y)return;const b=y.resolve(`.${c}`);b.length!==0&&(this.links=b,this.currentIndex=0,this.activeTag=c,this.render(),this.tagSwitchTooltip>0&&this.showTagTooltip(c))}),l.appendChild(d)}this.copyable&&this.renderCopyButton(l,n),e.appendChild(l)}if(n.description){const l=document.createElement("p");l.className="description",l.setAttribute("part","description"),l.textContent=n.description,e.appendChild(l)}}renderMetaZone(e,n){const i=n.meta;if(!i)return;const r=Object.entries(i).filter(([l])=>!sn.has(l)&&!l.startsWith("_")&&!l.endsWith(Be));if(r.length===0)return;const a=document.createElement("hr");a.className="separator",e.appendChild(a);const o=document.createElement("dl");o.className="meta",o.setAttribute("part","meta");for(const[l,c]of r){if(c==null||c==="")continue;const d=i[`${l}${Be}`],u=this.renderMetaField(l,c,d,n);u&&o.appendChild(u)}o.children.length>0&&e.appendChild(o)}renderActions(e,n){const i=document.createElement("div");if(i.className="actions",i.setAttribute("part","actions"),n.url){const r=document.createElement("a");r.className="visit",r.setAttribute("part","visit"),r.href=P(n.url,n),r.target=z(n.targetWindow,n)??"_blank",r.rel="noopener noreferrer",r.textContent=this.visitLabel,i.appendChild(r)}if(this.panelCloseButton){const r=this.createButton("close-btn",this.closeLabel,"Close",()=>this.close());r.setAttribute("part","close-btn"),i.appendChild(r)}e.appendChild(i)}renderNav(e,n){const i=document.createElement("div");i.className="nav",i.setAttribute("part","nav");const r=this.createButton("nav-prev",ir,"Previous",()=>this.navigate(-1));r.setAttribute("part","nav-prev"),i.appendChild(r);const a=document.createElement("div");a.className="counter-wrap",a.setAttribute("part","counter-wrap");const o=document.createElement("span");o.className="counter",o.setAttribute("part","counter"),a.appendChild(o),this.setNavHandle=be({counterWrap:a,counterText:o,links:this.links,currentIndex:this.currentIndex,onJump:c=>this.jumpTo(c),css:{setnav:"setnav",list:"setnav-list",item:"setnav-item",filterWrap:"setnav-filter-wrap",filter:"setnav-filter",clear:"setnav-clear"},closeIcon:Zt,hoverHint:"crossfade",parts:{setnav:"setnav",filter:"setnav-filter"},getActiveElement:()=>{var c;return((c=this.shadowRoot)==null?void 0:c.activeElement)??null}}),i.appendChild(a);const l=this.createButton("nav-next",rr,"Next",()=>this.navigate(1));l.setAttribute("part","nav-next"),i.appendChild(l),e.appendChild(i)}getCssDuration(e,n,i){const r=getComputedStyle(e).getPropertyValue(n),a=parseFloat(r)*1e3;return Number.isFinite(a)&&a>0?a:i}navigate(e){if(this.links.length<=1)return;const n=(this.currentIndex+e+this.links.length)%this.links.length;if(this.transitionMode==="none"){this.currentIndex=n,this.render();return}if(this.transitionMode==="resize"){if(this.transitioning)return;this.navigateResize(n);return}if(this.transitioning){this.pendingDelta=e,this.markRapid();return}this.markRapid(),this.navigateFade(n)}markRapid(){this.rapidResetTimer!==null&&clearTimeout(this.rapidResetTimer),this.rapidResetTimer=setTimeout(()=>{this.rapidMode=!1,this.rapidResetTimer=null},1e3)}navigateFade(e){var a;const n=(a=this.overlay)==null?void 0:a.querySelector(".panel");if(!n)return;this.transitioning=!0,n.classList.add("panel-fading");const i=this.getCssDuration(n,Xi,Gi),r=this.rapidMode?i/2:i;setTimeout(()=>{var l;this.currentIndex=e,this.render();const o=(l=this.overlay)==null?void 0:l.querySelector(".panel");o&&(o.classList.add("panel-fading"),o.offsetHeight,o.classList.remove("panel-fading")),setTimeout(()=>{this.transitioning=!1,this.drainPending()},r)},r),this.rapidMode=!0}drainPending(){if(this.pendingDelta!==null){const e=this.pendingDelta;this.pendingDelta=null;const n=(this.currentIndex+e+this.links.length)%this.links.length;this.navigateFade(n)}}navigateResize(e){var o,l;const n=(o=this.overlay)==null?void 0:o.querySelector(".panel");if(!n)return;this.transitioning=!0;const i=this.getCssDuration(n,Yi,Zi),r=n.scrollHeight;n.style.height=`${r}px`,n.style.overflow="hidden",this.currentIndex=e,this.render();const a=(l=this.overlay)==null?void 0:l.querySelector(".panel");if(!a){this.transitioning=!1;return}a.style.height=`${r}px`,a.style.overflow="hidden",requestAnimationFrame(()=>{a.style.height="auto";const c=a.scrollHeight;a.style.height=`${r}px`,a.offsetHeight,a.style.height=`${c}px`;const d=()=>{a.removeEventListener("transitionend",d),a.style.height="",a.style.overflow="",this.transitioning=!1};a.addEventListener("transitionend",d,{once:!0}),setTimeout(()=>{this.transitioning&&d()},i+Ji)})}jumpTo(e){if(e!==this.currentIndex){if(this.transitionMode==="none"){this.currentIndex=e,this.render();return}if(this.transitionMode==="resize"){if(this.transitioning)return;this.navigateResize(e);return}this.transitioning||this.navigateFade(e)}}renderMetaField(e,n,i,r){const a=this.formatMetaKey(e);switch(i??this.detectDisplayType(n)){case tn:return this.renderChips(a,n);case nn:return this.renderLinks(a,n,r);case rn:return this.renderTextBlock(a,n);case ee:default:return this.renderKeyValue(a,this.formatMetaValue(n))}}detectDisplayType(e){return typeof e=="boolean"?ee:Array.isArray(e)?e.length===0?ee:e.every(n=>typeof n=="string"&&Qi.test(n))?nn:e.every(n=>typeof n=="string")?tn:ee:typeof e=="string"&&e.length>=Vi?rn:ee}formatMetaKey(e){const n=this.getAttribute("meta-labels");if(n)try{const i=JSON.parse(n);if(i[e])return i[e]}catch{}return e.replace(/_/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,i=>i.toUpperCase())}formatMetaValue(e){return typeof e=="boolean"?e?"✓":"✗":Array.isArray(e)?e.join(", "):String(e)}renderKeyValue(e,n){const i=document.createElement("div");i.className="meta-row";const r=document.createElement("dt");r.className="meta-key",r.textContent=e,i.appendChild(r);const a=document.createElement("dd");return a.className="meta-value",a.textContent=n,i.appendChild(a),i}renderChips(e,n){const i=document.createElement("div");i.className="meta-row";const r=document.createElement("dt");r.className="meta-key",r.textContent=e,i.appendChild(r);const a=document.createElement("dd");a.className="meta-chips";for(const o of n){const l=document.createElement("span");l.className="meta-chip",l.textContent=o,a.appendChild(l)}return i.appendChild(a),i}renderLinks(e,n,i){const r=document.createElement("div");r.className="meta-row meta-row-links";const a=document.createElement("dt");a.className="meta-key",a.textContent=`${e} (${n.length})`,r.appendChild(a);const o=document.createElement("dd");o.className="meta-links";const l=n.slice(0,We);for(const c of l){const d=document.createElement("a");d.className="meta-link",d.href=P(c,i),d.target="_blank",d.rel="noopener noreferrer";try{const u=new URL(c);d.textContent=u.pathname.length>1?u.pathname:u.hostname}catch{d.textContent=c}o.appendChild(d)}if(n.length>We){const c=document.createElement("span");c.className="meta-more",c.textContent=`+${n.length-We} more`,o.appendChild(c)}return r.appendChild(o),r}renderTextBlock(e,n){const i=document.createElement("div");i.className="meta-row meta-row-text";const r=document.createElement("dt");r.className="meta-key",r.textContent=e,i.appendChild(r);const a=document.createElement("dd");return a.className="meta-text",a.textContent=n,i.appendChild(a),i}renderCopyButton(e,n){const i=this.createButton("copy-btn",Jt,"Copy to clipboard",()=>{const r=this.buildClipboardText(n);navigator.clipboard.writeText(r).then(()=>{i.textContent=tr,i.classList.add("done"),setTimeout(()=>{i.textContent=Jt,i.classList.remove("done")},nr)})});e.appendChild(i)}buildClipboardText(e){const n=[];e.label&&n.push(e.label),e.tags&&e.tags.length>0&&n.push(e.tags.join(er)),e.url&&n.push(e.url),e.description&&(n.push(""),n.push(e.description));const i=e.meta;if(i){const r=Object.entries(i).filter(([a])=>!sn.has(a)&&!a.startsWith("_")&&!a.endsWith(Be));if(r.length>0){n.push("");for(const[a,o]of r){if(o==null||o==="")continue;const l=this.formatMetaKey(a);n.push(`${l}: ${this.formatMetaValue(o)}`)}}}return n.join(`
`)}showTagTooltip(e){var a;const n=(a=this.overlay)==null?void 0:a.querySelector(".counter");if(!n)return;const i=500,r=n.textContent;n.style.opacity="0",setTimeout(()=>{n.isConnected&&(n.textContent=`switching to .${e}`,n.classList.add("tag-tooltip"),n.style.opacity="1",setTimeout(()=>{n.isConnected&&(n.style.opacity="0",setTimeout(()=>{n.isConnected&&(n.textContent=r,n.classList.remove("tag-tooltip"),n.style.opacity="1")},i))},this.tagSwitchTooltip))},i)}openZoom(e){ve({container:this.shadowRoot,src:e,overlayClass:"zoom-overlay",imageClass:"zoom-image",visibleClass:"visible",overlayPart:"zoom-overlay"})}toggleDrawer(e){var o;if(e!==void 0&&e===this.drawerExpanded)return;this.drawerExpanded=e??!this.drawerExpanded;const n=(o=this.overlay)==null?void 0:o.querySelector(".panel");if(!n)return;const i=n.querySelector(".image-wrap");i&&i.classList.toggle("image-collapsed",this.drawerExpanded);const r=n.querySelector(".drawer");r&&r.classList.toggle("drawer-expanded",this.drawerExpanded);const a=n.querySelector(".drawer-handle");if(a){const l=a.querySelector(".drawer-toggle");l&&(l.textContent=this.drawerExpanded?en:Qt),a.setAttribute("aria-label",this.drawerExpanded?"Show image":"Expand details")}}onKeydown(e){if(e.key==="ArrowUp"){e.preventDefault(),this.toggleDrawer(!0);return}if(e.key==="ArrowDown"){e.preventDefault(),this.toggleDrawer(!1);return}me(e,{close:()=>this.close(),prev:()=>this.navigate(-1),next:()=>this.navigate(1)})}createButton(e,n,i,r){const a=document.createElement("button");return e&&(a.className=e),a.setAttribute("aria-label",i),a.textContent=n,a.addEventListener("click",r),a}}function sr(s="alap-lens"){customElements.get(s)||customElements.define(s,an)}const ar=[[N("127.0.0.0"),8],[N("10.0.0.0"),8],[N("172.16.0.0"),12],[N("192.168.0.0"),16],[N("169.254.0.0"),16],[N("0.0.0.0"),8],[N("100.64.0.0"),10],[N("192.0.0.0"),24],[N("192.0.2.0"),24],[N("198.51.100.0"),24],[N("203.0.113.0"),24],[N("224.0.0.0"),4],[N("240.0.0.0"),4]];function N(s){const t=s.split(".");return(+t[0]<<24|+t[1]<<16|+t[2]<<8|+t[3])>>>0}function or(s){const t=N(s);for(const[e,n]of ar){const i=4294967295<<32-n>>>0;if((t&i)===(e&i))return!0}return!1}const lr=/^(::1|fe80:|fc00:|fd00:|::ffff:(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.))/i;function cr(s){let t;try{t=new URL(s).hostname}catch{return!0}const e=t.startsWith("[")?t.slice(1,-1):t;return e==="localhost"||e.endsWith(".localhost")?!0:/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(e)?or(e):!!lr.test(e)}if(typeof process<"u"&&!!((hn=process.versions)!=null&&hn.node))throw new Error('alap.iife.js is browser-only. In Node, import from "alap" (the ESM/CJS entry) to get the full DNS-rebinding guard.');async function je(s,t){const e=s.toString();if(cr(e))throw new Error(`SSRF guard: refusing ${e} (private address)`);return fetch(s,t)}const Ke=new Set(["__proto__","constructor","prototype"]),O=(s,t)=>{let e=s;for(const n of t.split(".")){if(Ke.has(n)||e==null)return;if(Array.isArray(e)){const i=parseInt(n,10);e=isNaN(i)?void 0:e[i]}else if(typeof e=="object")e=e[n];else return}return e},on=s=>s.replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#0?39;|&apos;/g,"'").replace(/&nbsp;/g," ").trim();async function qe(s,t=1048576){var c,d,u;const e=(d=(c=s.headers)==null?void 0:c.get)==null?void 0:d.call(c,"content-length");if(e){const p=parseInt(e,10);if(Number.isFinite(p)&&p>t)return null}if(!s.body){if(typeof s.arrayBuffer=="function"){const p=await s.arrayBuffer();if(p.byteLength>t)return null;const y=new TextDecoder("utf-8").decode(p);return JSON.parse(y)}return typeof s.json=="function"?await s.json():null}const n=s.body.getReader(),i=[];let r=0;try{for(;;){const{done:p,value:y}=await n.read();if(p)break;if(y){if(r+=y.byteLength,r>t)return n.cancel(),null;i.push(y)}}}finally{(u=n.releaseLock)==null||u.call(n)}const a=new Uint8Array(r);let o=0;for(const p of i)a.set(p,o),o+=p.byteLength;const l=new TextDecoder("utf-8").decode(a);return JSON.parse(l)}const dr=["name","title","full_name","label"],hr=["url","html_url","href","link","wiki"],ur=(s,t,e)=>{let n,i;if(t!=null&&t.label){const a=O(s,t.label);typeof a=="string"&&(n=a)}else for(const a of dr){const o=O(s,a);if(typeof o=="string"){n=o;break}}if(t!=null&&t.url){const a=O(s,t.url);typeof a=="string"?i=a:typeof a=="number"&&(i=String(a))}else for(const a of hr){const o=O(s,a);if(typeof o=="string"&&o.startsWith("http")){i=o;break}}if(!i)return null;if(e&&!i.startsWith("http")){const a=e.endsWith("/")?e:e+"/",o=i.startsWith("/")?i.slice(1):i;i=a+o}const r={url:i};if(n&&(r.label=n),t!=null&&t.meta){const a={};for(const[o,l]of Object.entries(t.meta)){const c=O(s,l);c!==void 0&&(a[o]=c)}Object.keys(a).length>0&&(r.meta=a)}return r},pr=s=>{const t=s[0],e=[],n={};for(const i of s.slice(1))if(i.includes("=")){const r=i.indexOf("=");n[i.slice(0,r)]=i.slice(r+1)}else e.push(i);return{key:t,positional:e,named:n}},gr=(s,t,e)=>{var r;const n=new URL(s.url),i=t[0];if(i&&((r=s.searches)!=null&&r[i])){const a=s.searches[i];for(const[o,l]of Object.entries(a))n.searchParams.set(o,String(l))}for(const[a,o]of Object.entries(e))n.searchParams.set(a,o);return n.toString()},fr=async(s,t)=>{var b,g,m;const{key:e,positional:n,named:i}=pr(s),r=(b=t.protocols)==null?void 0:b.web;if(!(r!=null&&r.keys))return w(":web: protocol has no keys configured"),[];const a=r.keys[e];if(!a)return w(`:web: key "${e}" not found in protocol keys`),[];let o;try{o=gr(a,n,i)}catch{return w(`:web: failed to build URL for key "${e}"`),[]}const l=r.allowedOrigins;let c=je;if(l&&l.length>0){const f=new URL(o).origin;if(!l.includes(f))return w(`:web: origin "${f}" not in allowedOrigins for key "${e}"`),[];c=fetch}let d;try{const f=new AbortController,x=setTimeout(()=>f.abort(),1e4),C=a.credentials?"include":"omit",T=await c(o,{signal:f.signal,credentials:C});if(clearTimeout(x),!T.ok)return w(`:web: fetch failed for "${e}": ${T.status} ${T.statusText}`),[];const k=(m=(g=T.headers)==null?void 0:g.get)==null?void 0:m.call(g,"content-type");if(k&&!k.includes("application/json"))return w(`:web: unexpected content-type for "${e}": ${k} (expected application/json)`),[];const L=await qe(T);if(L===null)return w(`:web: response exceeded 1048576 bytes for "${e}"`),[];d=L}catch(f){const x=f instanceof Error?f.message:String(f),C=f instanceof DOMException&&f.name==="AbortError"?"timeout after 10000ms":x;return w(`:web: network error for key "${e}": ${C}`),[]}const u=Array.isArray(d)?d:d&&typeof d=="object"&&!Array.isArray(d)?mr(d):[],p=[],y=Math.min(u.length,200);for(let f=0;f<y;f++){const x=ur(u[f],a.map,a.linkBase);x&&(x.cssClass=x.cssClass?`${x.cssClass} source_web`:"source_web",x.meta||(x.meta={}),x.meta.source="web",p.push(x))}return p},mr=s=>{for(const t of Object.values(s))if(Array.isArray(t))return t;return[]},vr=s=>{const t=s.match(/^([^[]+)\[(\d*)\]$/);if(!t)return{field:s,index:void 0};const e=t[2];return{field:t[1],index:e===""?-1:parseInt(e,10)}},ye=(s,t)=>{const e=t.split(".");let n=s;for(let i=0;i<e.length;i++){const r=e[i];if(Ke.has(r)||n==null)return;const{field:a,index:o}=vr(r);if(Ke.has(a))return;if(typeof n=="object"&&!Array.isArray(n))n=n[a];else if(Array.isArray(n)&&o===void 0){const l=parseInt(a,10);n=isNaN(l)?void 0:n[l]}else return;if(n==null)return;if(o!==void 0){if(!Array.isArray(n))return;if(o===-1){const l=e.slice(i+1).join(".");return l?n.filter(c=>c!==null&&typeof c=="object").map(c=>ye(c,l)).filter(c=>c!=null):n}n=n[o]}}return n},br=s=>s.includes("${"),yr=(s,t,e)=>{let n=!1;const i=s.replace(/\$\{([^}]+)\}/g,(r,a)=>{let o;return a.startsWith("_envelope.")&&e?o=O(e,a.slice(10)):o=ye(t,a),o==null?(n=!0,""):String(o)});return n?void 0:i},wr=s=>{const t=s[0],e=[],n={};for(const i of s.slice(1))if(i.includes("=")){const r=i.indexOf("=");n[i.slice(0,r)]=i.slice(r+1)}else e.push(i);return{source:t,positional:e,named:n}},Er=(s,t)=>{if(s.startsWith("$")){const e=s.slice(1),n=t==null?void 0:t[e];return n===void 0?(w(`:json: var "$${e}" not found in protocol vars`),s):n}return decodeURIComponent(s)},xr=(s,t,e)=>{let n=s.url;for(let i=0;i<t.length;i++){const r=Er(t[i],e);n=n.replace(`\${${i+1}}`,encodeURIComponent(r))}return n},Ar=(s,t)=>{const e={};for(const[n,i]of Object.entries(t)){const r=O(s,i);r!=null&&(e[n]=r)}return e},Cr=(s,t)=>{if(t){const e=O(s,t);return Array.isArray(e)?e:e&&typeof e=="object"&&!Array.isArray(e)?[e]:(w(`:json: root "${t}" did not resolve to an array or object`),null)}return Array.isArray(s)?s:(s&&typeof s=="object"&&w(":json: response is an object but no root path configured"),null)},Tr=s=>s.trim().replace(/\s+/g,"_"),kr=(s,t)=>{if(s==null)return;let e;if(typeof s=="string")e=s.split(",").map(n=>n.trim()).filter(Boolean);else if(Array.isArray(s)){if(s.length===0)return;if(s.every(n=>typeof n=="string"))e=s;else{const n=t.match(/\[\]\.(\w+)$/);if(n){const i=n[1];e=s.filter(r=>r!==null&&typeof r=="object").map(r=>r[i]).filter(r=>typeof r=="string")}}}if(!(!e||e.length===0))return e.map(Tr).filter(Boolean)},W=(s,t,e)=>br(s)?yr(s,t,e):ye(t,s),Lr=(s,t,e)=>{const{fieldMap:n,linkBase:i,allowedSchemes:r}=t;let a;if(n.label){const c=W(n.label,s,e);typeof c=="string"&&(a=on(c))}let o;if(n.url){const c=W(n.url,s,e);typeof c=="string"?o=c:typeof c=="number"&&(o=String(c))}if(!o)return null;if(i&&!o.match(/^[a-zA-Z][a-zA-Z0-9+\-.]*:/)){const c=i.endsWith("/")?i:i+"/",d=o.startsWith("/")?o.slice(1):o;o=c+d}if(o=se(o,r),o==="about:blank")return null;const l={url:o};if(a&&(l.label=a),n.tags){const c=ye(s,n.tags),d=kr(c,n.tags);d&&(l.tags=d)}if(n.description){const c=W(n.description,s,e);typeof c=="string"&&(l.description=on(c))}if(n.thumbnail){const c=W(n.thumbnail,s,e);if(typeof c=="string"){const d=se(c,r);d!=="about:blank"&&(l.thumbnail=d)}}if(n.image){const c=W(n.image,s,e);if(typeof c=="string"){const d=se(c,r);d!=="about:blank"&&(l.image=d)}}if(n.meta){const c={};for(const[d,u]of Object.entries(n.meta)){const p=W(u,s,e);p!=null&&(c[d]=p)}Object.keys(c).length>0&&(l.meta=c)}if(e&&Object.keys(e).length>0){l.meta||(l.meta={});for(const[c,d]of Object.entries(e))l.meta[c]=d}return l},Sr=async(s,t)=>{var b,g,m;const{source:e,positional:n}=wr(s),i=(b=t.protocols)==null?void 0:b.json;if(!i)return w(":json: protocol not configured"),[];const r=i.sources;if(!r)return w(":json: protocol has no sources configured"),[];const a=r[e];if(!a)return w(`:json: source "${e}" not found in protocol sources`),[];const o=i.vars;let l;try{l=xr(a,n,o)}catch{return w(`:json: failed to build URL for source "${e}"`),[]}let c;try{const f=new AbortController,x=setTimeout(()=>f.abort(),1e4),C={signal:f.signal,credentials:a.credentials?"include":"omit"};a.headers&&(C.headers={...a.headers});const T=await je(l,C);if(clearTimeout(x),!T.ok)return w(`:json: fetch failed for "${e}": ${T.status} ${T.statusText}`),[];const k=(m=(g=T.headers)==null?void 0:g.get)==null?void 0:m.call(g,"content-type");if(k&&!k.includes("application/json"))return w(`:json: unexpected content-type for "${e}": ${k} (expected application/json)`),[];const L=await qe(T);if(L===null)return w(`:json: response exceeded 1048576 bytes for "${e}"`),[];c=L}catch(f){const x=f instanceof Error?f.message:String(f),C=f instanceof DOMException&&f.name==="AbortError"?"timeout after 10000ms":x;return w(`:json: network error for source "${e}": ${C}`),[]}let d;a.envelope&&c&&typeof c=="object"&&!Array.isArray(c)&&(d=Ar(c,a.envelope));const u=Cr(c,a.root);if(!u)return[];const p=[],y=Math.min(u.length,200);for(let f=0;f<y;f++){const x=Lr(u[f],a,d);x&&(x.cssClass=x.cssClass?`${x.cssClass} source_json`:"source_json",x.meta||(x.meta={}),x.meta.source="json",p.push(x))}return p},te="https://public.api.bsky.app/xrpc",_r="https://bsky.social/xrpc",ne="https://bsky.app",we="https://pdsls.dev/at",Ve=10,Ir=80,ln=s=>{if(!s.startsWith("at://"))return null;const t=s.slice(5);if(!t)return null;const e=t.split("/"),n=e[0];return n?{authority:n,collection:e[1]||void 0,rkey:e[2]||void 0}:null},Nr=s=>{const{authority:t,collection:e,rkey:n}=s,i=[];if(e==="app.bsky.feed.post"&&n)i.push({label:"View on Bluesky",url:`${ne}/profile/${t}/post/${n}`,tags:["atproto","client"]}),i.push({label:"Inspect on pdsls.dev",url:`${we}/${t}/${e}/${n}`,tags:["atproto","devtool"]}),i.push({label:"Raw JSON (API)",url:`${te}/app.bsky.feed.getPostThread?uri=at://${t}/${e}/${n}&depth=0`,tags:["atproto","raw"]});else if(!e||e==="app.bsky.actor.profile")i.push({label:"View on Bluesky",url:`${ne}/profile/${t}`,tags:["atproto","client"]}),i.push({label:"Inspect on pdsls.dev",url:`${we}/${t}`,tags:["atproto","devtool"]}),i.push({label:"Raw JSON (API)",url:`${te}/app.bsky.actor.getProfile?actor=${t}`,tags:["atproto","raw"]});else{const r=n?`${t}/${e}/${n}`:`${t}/${e}`;i.push({label:"Inspect on pdsls.dev",url:`${we}/${r}`,tags:["atproto","devtool"]}),i.push({label:"Raw JSON (API)",url:`${te}/com.atproto.repo.getRecord?repo=${t}&collection=${e}${n?`&rkey=${n}`:""}`,tags:["atproto","raw"]})}return i},Pr=s=>{const t=s[0],e=[],n={};for(const i of s.slice(1))if(i.includes("=")){const r=i.indexOf("=");n[i.slice(0,r)]=i.slice(r+1)}else e.push(i);return{command:t,positional:e,named:n}},cn=(s,t)=>{var n,i;const e=(i=(n=t.protocols)==null?void 0:n.atproto)==null?void 0:i.searches;return e&&s in e?e[s]:s},Rr=(s,t)=>s.length<=t?s:s.slice(0,t-1)+"…",ie=async(s,t,e)=>{var l,c;const n=e?_r:te,i=new URL(`${n}/${s}`);for(const[d,u]of Object.entries(t))i.searchParams.set(d,u);const r=new AbortController,a=setTimeout(()=>r.abort(),1e4),o={};e&&(o.Authorization=`Bearer ${e}`);try{const d=await je(i.toString(),{signal:r.signal,credentials:"omit",headers:o});if(clearTimeout(a),!d.ok)return w(`:atproto: API error: ${d.status} ${d.statusText} for ${s}`),null;const u=(c=(l=d.headers)==null?void 0:l.get)==null?void 0:c.call(l,"content-type");if(u&&!u.includes("application/json"))return w(`:atproto: unexpected content-type: ${u}`),null;const p=await qe(d);return p===null?(w(":atproto: response exceeded 1048576 bytes"),null):p}catch(d){clearTimeout(a);const u=d instanceof Error?d.message:String(d),p=d instanceof DOMException&&d.name==="AbortError"?"timeout after 10000ms":u;return w(`:atproto: network error: ${p}`),null}},Xe=s=>{var a,o;const t=ln(s.uri);if(!t||!t.rkey)return null;const e=s.author,n=((a=s.record)==null?void 0:a.text)??"",i=e.displayName||e.handle;return{label:Rr(`${i}: ${n}`,Ir),url:`${ne}/profile/${e.handle}/post/${t.rkey}`,description:n,thumbnail:e.avatar,tags:["atproto","post"],createdAt:s.indexedAt||((o=s.record)==null?void 0:o.createdAt),meta:{handle:e.handle,did:e.did,atUri:s.uri}}},$r=s=>({label:s.displayName||s.handle,url:`${ne}/profile/${s.handle}`,description:s.description,thumbnail:s.avatar,tags:["atproto","profile"],meta:{handle:s.handle,did:s.did,followers:s.followersCount,following:s.followsCount,posts:s.postsCount}}),dn={profile:async(s,t,e)=>{const n=s[0];if(!n)return w(":atproto: profile command requires an actor (handle or DID)"),[];const i=await ie("app.bsky.actor.getProfile",{actor:n});if(!i)return[];const r=i,a=r.displayName||r.handle,o={handle:r.handle,did:r.did,followers:r.followersCount,following:r.followsCount,posts:r.postsCount};return[{label:`${a} — Bluesky`,url:`${ne}/profile/${r.handle}`,description:r.description,thumbnail:r.avatar,tags:["atproto","profile","client"],meta:o},{label:`${a} — pdsls.dev inspector`,url:`${we}/${r.did}`,tags:["atproto","profile","devtool"],meta:o},{label:`${a} — raw JSON`,url:`${te}/app.bsky.actor.getProfile?actor=${r.handle}`,tags:["atproto","profile","raw"],meta:o}]},feed:async(s,t,e)=>{const n=s[0];if(!n)return w(":atproto: feed command requires an actor (handle or DID)"),[];const i=t.limit||String(Ve),r=await ie("app.bsky.feed.getAuthorFeed",{actor:n,limit:i});if(!r)return[];const a=r.feed??[],o=[],l=Math.min(a.length,200);for(let c=0;c<l;c++){const d=Xe(a[c].post);d&&o.push(d)}return o},people:async(s,t,e,n)=>{const i=s[0];if(!i)return w(":atproto: people command requires a search query"),[];const r=n?cn(i,n):i,a=t.limit||String(Ve),o=await ie("app.bsky.actor.searchActors",{q:r,limit:a});if(!o)return[];const l=o.actors??[],c=Math.min(l.length,200),d=[];for(let u=0;u<c;u++)d.push($r(l[u]));return d},thread:async(s,t,e)=>{var l;const n=s[0];if(!n||!n.startsWith("at://"))return w(":atproto: thread command requires a valid AT URI"),[];const i=await ie("app.bsky.feed.getPostThread",{uri:n,depth:"0"});if(!i)return[];const a=(l=i.thread)==null?void 0:l.post;if(!a)return[];const o=Xe(a);return o?[o]:[]},search:async(s,t,e,n)=>{if(!e)return w(":atproto: search requires authentication (searchPosts is not public). Pass an accessJwt via protocol config."),[];const i=s[0];if(!i)return w(":atproto: search command requires a query"),[];const r=n?cn(i,n):i,a=t.limit||String(Ve),o=await ie("app.bsky.feed.searchPosts",{q:r,limit:a},e);if(!o)return[];const l=o.posts??[],c=Math.min(l.length,200),d=[];for(let u=0;u<c;u++){const p=Xe(l[u]);p&&d.push(p)}return d}},Mr=async(s,t)=>{var c;const{command:e,positional:n,named:i}=Pr(s),r=dn[e];if(!r)return w(`:atproto: unknown command "${e}". Available: ${Object.keys(dn).join(", ")}`),[];const a=(c=t.protocols)==null?void 0:c.atproto,o=a==null?void 0:a.accessJwt,l=await r(n,i,o,t);for(const d of l)d.cssClass=d.cssClass?`${d.cssClass} source_atproto`:"source_atproto",d.meta||(d.meta={}),d.meta.source="atproto";return l};return A.AlapEngine=K,A.AlapLens=Bi,A.AlapLensElement=an,A.AlapLightbox=yi,A.AlapLightboxElement=Ht,A.AlapLinkElement=At,A.AlapUI=Qn,A.ExpressionParser=Qe,A.ProtocolCache=et,A.RENDERER_LENS=lt,A.RENDERER_LIGHTBOX=ot,A.RENDERER_MENU=oe,A.RendererCoordinator=Bn,A.atUriToDestinations=Nr,A.atprotoHandler=Mr,A.createEmbed=Oe,A.defineAlapLens=sr,A.defineAlapLightbox=Ti,A.defineAlapLink=ti,A.getConfig=pe,A.getEmbedHeight=It,A.getEngine=X,A.getInstanceCoordinator=H,A.grantConsent=Rt,A.hasConsent=$t,A.isAllowlisted=_t,A.jsonHandler=Sr,A.matchProvider=J,A.mergeConfigs=Sn,A.parseAtUri=ln,A.registerConfig=mt,A.revokeConsent=mi,A.shouldLoadEmbed=Pt,A.transformUrl=St,A.updateRegisteredConfig=jn,A.validateConfig=U,A.webHandler=fr,Object.defineProperty(A,Symbol.toStringTag,{value:"Module"}),A})({});
