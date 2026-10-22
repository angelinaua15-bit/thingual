import { CLUSTER_CSS, CLUSTER_JS, LEAFLET_CSS, LEAFLET_JS } from './leafletAssets';

export type MapKind = 'post' | 'drop' | 'word' | 'friend' | 'mine';
export type MapPoint = { id: string; lat: number; lng: number; photo: string; label: string; sub?: string; highlight?: boolean; kind?: MapKind };
export type MapStyle = 'color' | 'satellite' | 'minimal';

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** Escaped points, safe to inject into the map page (initially or via postMessage). */
export const safePoints = (points: MapPoint[]) => points.map((p) => ({ ...p, label: esc(p.label), sub: p.sub ? esc(p.sub) : undefined, photo: encodeURI(p.photo) }));

const ESRI = (svc: string) => `https://server.arcgisonline.com/ArcGIS/rest/services/${svc}/MapServer/tile/{z}/{y}/{x}`;
/** Keyless basemaps (Esri). Each style = base layer + optional labels on top. */
export const MAP_LAYERS: Record<MapStyle, { light: [string, string?]; dark: [string, string?] }> = {
  color: { light: [ESRI('World_Street_Map')], dark: [ESRI('World_Street_Map')] },
  satellite: { light: [ESRI('World_Imagery'), ESRI('Reference/World_Boundaries_and_Places')], dark: [ESRI('World_Imagery'), ESRI('Reference/World_Boundaries_and_Places')] },
  minimal: {
    light: [ESRI('Canvas/World_Light_Gray_Base'), ESRI('Canvas/World_Light_Gray_Reference')],
    dark: [ESRI('Canvas/World_Dark_Gray_Base'), ESRI('Canvas/World_Dark_Gray_Reference')],
  },
};

/**
 * Leaflet (bundled, no CDN) + MarkerCluster. Photo pins with a coloured ring per kind
 * (Daily Drop coral, words blue, friends green, mine gold) and a small word label underneath.
 */
export function buildMapHtml(points: MapPoint[], opts: { dark: boolean; wordsMode: boolean; center?: [number, number]; zoom?: number; style?: MapStyle }) {
  const style = opts.style ?? 'color';
  const layers = JSON.stringify(MAP_LAYERS);
  const bg = opts.dark ? '#0B2129' : '#E8EEF0';
  const data = JSON.stringify(safePoints(points)).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>${LEAFLET_CSS}${CLUSTER_CSS}</style>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&family=Instrument+Serif&display=swap" rel="stylesheet">
<style>
html,body,#map{margin:0;height:100%;width:100%;background:${bg}}
.leaflet-container{background:${bg};font-family:Inter,system-ui,sans-serif}
.night .leaflet-tile-pane{filter:brightness(.78) saturate(1.15) contrast(1.05)}
.pinw{display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);cursor:pointer}
.pin{width:52px;height:52px;border-radius:50%;padding:3px;background:var(--ring);box-shadow:0 6px 18px rgba(0,0,0,.35);transition:transform .25s cubic-bezier(.2,.8,.2,1)}
.pin i{display:block;width:100%;height:100%;border-radius:50%;background-size:cover;background-position:center;background-color:#ddd;border:2px solid #fff;box-sizing:border-box}
.pinw:hover .pin{transform:scale(1.12) translateY(-3px)}
.tail{width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid var(--tail);margin-top:-2px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
.lbl{margin-bottom:4px;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.95);color:#141414;font-weight:600;font-size:11px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.18);max-width:120px;overflow:hidden;text-overflow:ellipsis}
.k-post{--ring:linear-gradient(135deg,#7C9BFF,#3B5BDB);--tail:#3B5BDB}
.k-word{--ring:linear-gradient(135deg,#5EEAD4,#0E9F7E);--tail:#0E9F7E}
.k-drop{--ring:linear-gradient(135deg,#FFB27E,#FF5A2E);--tail:#FF5A2E}
.k-friend{--ring:linear-gradient(135deg,#B9F27C,#2F9E44);--tail:#2F9E44}
.k-mine{--ring:linear-gradient(135deg,#FFE08A,#E8A10C);--tail:#E8A10C}
.word{padding:7px 12px;border-radius:999px;background:${opts.dark ? '#112E36' : '#fff'};color:${opts.dark ? '#EEF4F1' : '#141414'};font-family:'Instrument Serif',serif;font-size:20px;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.25);transform:translate(-50%,-50%);display:inline-block;cursor:pointer;border:2px solid #0E9F7E}
.word small{font-family:Inter;font-size:10px;color:#6D8682;margin-left:6px;letter-spacing:.4px;text-transform:uppercase}
.cl{width:54px;height:54px;border-radius:50%;background:conic-gradient(from 210deg,#FF8A55,#FFC94D,#5EEAD4,#7C9BFF,#FF8A55);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.3)}
.cl b{width:42px;height:42px;border-radius:50%;background:${opts.dark ? '#0B2129' : '#fff'};color:${opts.dark ? '#EEF4F1' : '#141414'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}
.me{width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 0 rgba(59,130,246,.6);animation:ping 2s infinite;transform:translate(-50%,-50%)}
@keyframes ping{0%{box-shadow:0 0 0 0 rgba(59,130,246,.55)}80%{box-shadow:0 0 0 22px rgba(59,130,246,0)}100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}}
.leaflet-control-attribution{font-size:9px;background:rgba(255,255,255,.65)!important;color:#555}
.leaflet-control-attribution a{color:#555}
.leaflet-bar a{width:38px;height:38px;line-height:38px;font-size:18px;color:#141414}
.leaflet-bar{border:none!important;box-shadow:0 6px 18px rgba(0,0,0,.2)!important;border-radius:14px!important;overflow:hidden}
.leaflet-bottom{bottom:96px}
.pop{animation:pop .5s cubic-bezier(.2,.8,.2,1) both}
@keyframes pop{from{opacity:0;transform:translate(-50%,-100%) scale(.5)}to{opacity:1;transform:translate(-50%,-100%) scale(1)}}
.cl.pop{animation:popc .45s cubic-bezier(.2,.8,.2,1) both}
@keyframes popc{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
</style></head><body class="${opts.dark ? 'night' : ''}"><div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>${CLUSTER_JS}</script>
<script>
var pts=${data};var wordsMode=${opts.wordsMode ? 'true' : 'false'};var LAYERS=${layers};var dark=${opts.dark ? 'true' : 'false'};
function send(m){var s=JSON.stringify(m);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s)}else{parent.postMessage(s,'*')}}
var map=L.map('map',{worldCopyJump:true,zoomSnap:.5,minZoom:2,maxZoom:18,zoomControl:false}).setView(${JSON.stringify(opts.center ?? [35, 15])},${opts.zoom ?? 2});
L.control.zoom({position:'bottomright'}).addTo(map);
var base=null,labels=null;
function setStyle(st){
  var def=(LAYERS[st]||LAYERS.color)[dark?'dark':'light'];
  if(base)map.removeLayer(base);if(labels)map.removeLayer(labels);labels=null;
  base=L.tileLayer(def[0],{maxZoom:19,attribution:'Tiles © Esri — Esri, HERE, Garmin, USGS, © OpenStreetMap contributors'}).addTo(map);
  if(def[1])labels=L.tileLayer(def[1],{maxZoom:19,pane:'overlayPane'}).addTo(map);
  document.body.classList.toggle('night',dark&&st!=='satellite');
}
setStyle(${JSON.stringify(style)});
var group=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:60,spiderfyOnMaxZoom:true,
 iconCreateFunction:function(c){return L.divIcon({html:'<div class="cl pop"><b>'+c.getChildCount()+'</b></div>',className:'',iconSize:[54,54]})}});
function render(list){
 group.clearLayers();
 list.forEach(function(p,i){
  var k=p.kind||(p.highlight?'mine':'post');
  var html=wordsMode?'<div class="word">'+p.label+(p.sub?'<small>'+p.sub+'</small>':'')+'</div>'
    :'<div class="pinw pop k-'+k+'" style="animation-delay:'+(i%20)*35+'ms">'+(p.label?'<div class="lbl">'+p.label+'</div>':'')+'<div class="pin"><i style="background-image:url(\\''+p.photo+'\\')"></i></div><div class="tail"></div></div>';
  var m=L.marker([p.lat,p.lng],{icon:L.divIcon({html:html,className:'',iconSize:[0,0]})});
  m.on('click',function(){send({type:'select',id:p.id});map.flyTo([p.lat,p.lng],Math.max(map.getZoom(),6),{duration:.8})});
  group.addLayer(m);
 });
}
render(pts);
map.addLayer(group);
var meMarker=null;
var hasCenter=${opts.center ? 'true' : 'false'};var fitted=false;
window.addEventListener('message',function(e){try{var m=typeof e.data==='string'?JSON.parse(e.data):e.data;
 if(m&&m.type==='points'){render(m.pts);if(!fitted&&!hasCenter&&m.pts.length){fitted=true;try{map.flyToBounds(group.getBounds(),{padding:[70,70],maxZoom:6,duration:1})}catch(e2){}}}
 if(m&&m.type==='view'&&m.center){map.flyTo(m.center,m.zoom||map.getZoom(),{duration:1.2})}
 if(m&&m.type==='style'){setStyle(m.style)}
 if(m&&m.type==='me'&&m.center){if(meMarker)map.removeLayer(meMarker);meMarker=L.marker(m.center,{icon:L.divIcon({html:'<div class="me"></div>',className:'',iconSize:[0,0]}),interactive:false}).addTo(map);map.flyTo(m.center,Math.max(map.getZoom(),9),{duration:1.4})}
}catch(err){}});
document.addEventListener('message',function(e){window.dispatchEvent(new MessageEvent('message',{data:e.data}))});
${opts.center ? '' : "if(pts.length){fitted=true;try{map.fitBounds(group.getBounds(),{padding:[70,70],maxZoom:6})}catch(e){}}"}
map.on('click',function(){send({type:'blank'})});
send({type:'ready'});
</script></body></html>`;
}
