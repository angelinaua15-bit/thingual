import { CLUSTER_CSS, CLUSTER_JS, LEAFLET_CSS, LEAFLET_JS } from './leafletAssets';

export type MapPoint = { id: string; lat: number; lng: number; photo: string; label: string; sub?: string; highlight?: boolean };

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** Leaflet (bundled, no CDN) + MarkerCluster on a muted CARTO basemap, so photos are the colour on the map. */
export function buildMapHtml(points: MapPoint[], opts: { dark: boolean; wordsMode: boolean; center?: [number, number]; zoom?: number }) {
  const tiles = opts.dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const bg = opts.dark ? '#0E0E0E' : '#F2F1ED';
  const safe = points.map((p) => ({ ...p, label: esc(p.label), sub: p.sub ? esc(p.sub) : undefined, photo: encodeURI(p.photo) }));
  const data = JSON.stringify(safe).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>${LEAFLET_CSS}${CLUSTER_CSS}</style>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&family=Instrument+Serif&display=swap" rel="stylesheet">
<style>
html,body,#map{margin:0;height:100%;width:100%;background:${bg}}
.leaflet-container{background:${bg};font-family:Inter,system-ui,sans-serif}
${opts.dark ? '' : '.leaflet-tile-pane{filter:saturate(.35) brightness(1.03)}'}
.pin{width:48px;height:48px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.3);background-size:cover;background-position:center;background-color:#ddd;transition:transform .2s cubic-bezier(.2,.8,.2,1);cursor:pointer}
.pin:hover{transform:scale(1.12)}
.pin.hl{border-color:#FF6B35}
.word{padding:6px 11px;border-radius:999px;background:${opts.dark ? '#1A1A1A' : '#fff'};color:${opts.dark ? '#F2F2F0' : '#141414'};font-family:'Instrument Serif',serif;font-size:19px;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.18);transform:translate(-50%,-50%);display:inline-block;cursor:pointer}
.word small{font-family:Inter;font-size:10px;color:#9A9A9A;margin-left:6px;letter-spacing:.4px;text-transform:uppercase}
.cl{width:48px;height:48px;border-radius:50%;background:${opts.dark ? '#F2F2F0' : '#141414'};color:${opts.dark ? '#141414' : '#fff'};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,.25);border:3px solid ${opts.dark ? '#0E0E0E' : '#fff'}}
.leaflet-control-attribution{font-size:9px;background:rgba(255,255,255,.6)!important;color:#6B6B6B}
.leaflet-control-attribution a{color:#6B6B6B}
.leaflet-bar a{width:36px;height:36px;line-height:36px;font-size:18px;color:#141414}
.leaflet-bar{border:none!important;box-shadow:0 4px 14px rgba(0,0,0,.18)!important;border-radius:12px!important;overflow:hidden}
.leaflet-bottom{bottom:96px}
.pop{animation:pop .45s cubic-bezier(.2,.8,.2,1) both}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
</style></head><body><div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>${CLUSTER_JS}</script>
<script>
var pts=${data};var wordsMode=${opts.wordsMode ? 'true' : 'false'};
function send(m){var s=JSON.stringify(m);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s)}else{parent.postMessage(s,'*')}}
var map=L.map('map',{worldCopyJump:true,zoomSnap:.5,minZoom:2,maxZoom:15,zoomControl:false}).setView(${JSON.stringify(opts.center ?? [35, 15])},${opts.zoom ?? 2});
L.control.zoom({position:'bottomright'}).addTo(map);
L.tileLayer('${tiles}',{subdomains:'abcd',maxZoom:19,attribution:'© OpenStreetMap © CARTO'}).addTo(map);
var group=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:56,spiderfyOnMaxZoom:true,
 iconCreateFunction:function(c){return L.divIcon({html:'<div class="cl pop">'+c.getChildCount()+'</div>',className:'',iconSize:[48,48]})}});
pts.forEach(function(p,i){
  var html=wordsMode?'<div class="word pop" style="animation-delay:'+(i%20)*30+'ms">'+p.label+(p.sub?'<small>'+p.sub+'</small>':'')+'</div>'
    :'<div class="pin pop'+(p.highlight?' hl':'')+'" style="animation-delay:'+(i%20)*30+'ms;background-image:url(\\''+p.photo+'\\')"></div>';
  var m=L.marker([p.lat,p.lng],{icon:L.divIcon({html:html,className:'',iconSize:wordsMode?[0,0]:[48,48]})});
  m.on('click',function(){send({type:'select',id:p.id})});
  group.addLayer(m);
});
map.addLayer(group);
${opts.center ? '' : "if(pts.length){try{map.fitBounds(group.getBounds(),{padding:[60,60],maxZoom:6})}catch(e){}}"}
map.on('click',function(){send({type:'blank'})});
send({type:'ready'});
</script></body></html>`;
}
