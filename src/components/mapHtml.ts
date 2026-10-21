export type MapPoint = { id: string; lat: number; lng: number; photo: string; label: string; sub?: string; highlight?: boolean };

/** Leaflet + MarkerCluster with a monochrome CARTO basemap, so photos are the only colour on the map. */
export function buildMapHtml(points: MapPoint[], opts: { dark: boolean; wordsMode: boolean; center?: [number, number]; zoom?: number }) {
  const tiles = opts.dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
  const bg = opts.dark ? '#0E0E0E' : '#F2F1ED';
  const data = JSON.stringify(points);
  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&family=Instrument+Serif&display=swap" rel="stylesheet">
<style>
html,body,#map{margin:0;height:100%;width:100%;background:${bg}}
.leaflet-container{background:${bg};font-family:Inter,system-ui,sans-serif}
.pin{width:46px;height:46px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.28);background-size:cover;background-position:center;transition:transform .2s cubic-bezier(.2,.8,.2,1)}
.pin:hover{transform:scale(1.12)}
.pin.hl{border-color:#FF6B35}
.word{padding:6px 11px;border-radius:999px;background:${opts.dark ? '#1A1A1A' : '#fff'};color:${opts.dark ? '#F2F2F0' : '#141414'};font-family:'Instrument Serif',serif;font-size:19px;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.18);transform:translate(-50%,-50%);display:inline-block}
.word small{font-family:Inter;font-size:10px;color:#9A9A9A;margin-left:6px;letter-spacing:.4px;text-transform:uppercase}
.cl{width:46px;height:46px;border-radius:50%;background:${opts.dark ? '#F2F2F0' : '#141414'};color:${opts.dark ? '#141414' : '#fff'};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,.25);border:2.5px solid ${opts.dark ? '#0E0E0E' : '#fff'}}
.leaflet-control-attribution{font-size:9px;background:transparent!important;color:#9A9A9A}
.leaflet-control-attribution a{color:#9A9A9A}
.leaflet-control-zoom{display:none}
.pop{opacity:0;animation:pop .45s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
if(typeof L==='undefined'){document.getElementById('map').innerHTML='<div style="display:flex;height:100%;align-items:center;justify-content:center;font:14px Inter,sans-serif;color:#9A9A9A">Map is offline</div>';throw new Error('leaflet offline')}
var pts=${data};var wordsMode=${opts.wordsMode ? 'true' : 'false'};
function send(m){var s=JSON.stringify(m);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s)}else{parent.postMessage(s,'*')}}
var map=L.map('map',{worldCopyJump:true,zoomSnap:.5,minZoom:1.5,maxZoom:12,attributionControl:true}).setView(${JSON.stringify(opts.center ?? [30, 10])},${opts.zoom ?? 1.5});
L.tileLayer('${tiles}',{subdomains:'abcd',maxZoom:12,attribution:'© OpenStreetMap © CARTO'}).addTo(map);
var group=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:52,spiderfyOnMaxZoom:true,
 iconCreateFunction:function(c){return L.divIcon({html:'<div class="cl pop">'+c.getChildCount()+'</div>',className:'',iconSize:[46,46]})}});
pts.forEach(function(p,i){
  var html=wordsMode?'<div class="word pop" style="animation-delay:'+(i%20)*30+'ms">'+p.label+(p.sub?'<small>'+p.sub+'</small>':'')+'</div>'
    :'<div class="pin pop'+(p.highlight?' hl':'')+'" style="animation-delay:'+(i%20)*30+'ms;background-image:url('+p.photo+')"></div>';
  var m=L.marker([p.lat,p.lng],{icon:L.divIcon({html:html,className:'',iconSize:wordsMode?[0,0]:[46,46]})});
  m.on('click',function(){send({type:'select',id:p.id})});
  group.addLayer(m);
});
map.addLayer(group);
send({type:'ready'});
</script></body></html>`;
}
