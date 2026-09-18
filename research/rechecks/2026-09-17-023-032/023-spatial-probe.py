"""Read-only OSM research probe. Does not alter source points or project map."""
from pathlib import Path
import json, math, time, hashlib, urllib.request, xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
D=Path(__file__).resolve().parent
c=json.loads((D/'023-context.json').read_text()); members={m['IDBAT']:m for r in c['records'] for m in r['fullGroupMembers']}
def distseg(p,a,b):
    scale=math.cos(math.radians(p[1])); A=((a[0]-p[0])*111320*scale,(a[1]-p[1])*111320); B=((b[0]-p[0])*111320*scale,(b[1]-p[1])*111320)
    dx,dy=B[0]-A[0],B[1]-A[1]; t=max(0,min(1,-(A[0]*dx+A[1]*dy)/(dx*dx+dy*dy))) if dx*dx+dy*dy else 0
    return math.hypot(A[0]+t*dx,A[1]+t*dy)
def inside(p,poly):
    result=False
    for a,b in zip(poly,poly[1:]):
        if (a[1]>p[1])!=(b[1]>p[1]) and p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]:result=not result
    return result
def probe(item):
    ident,m=item;w=m['coordinates']['wgs84'];p=[w['longitude'],w['latitude']]; bbox=[p[0]-.0012,p[1]-.0012,p[0]+.0012,p[1]+.0012];url='https://www.openstreetmap.org/api/0.6/map?bbox='+','.join(f'{x:.7f}' for x in bbox)
    out={'IDBAT':ident,'originalWgs84':w,'queriedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'queryUrl':url,'comparisonCrs':'EPSG:4326','bbox':bbox,'method':'Every member independently measured; complete closed area geometries only. Boundary distance local equirectangular approximation; no candidate identity inferred from proximity.'}
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'Shanghai historical-landmark research/1.0'});response=urllib.request.urlopen(req,timeout=30);raw=response.read();root=ET.fromstring(raw);out['httpStatus']=response.status;out['responseSha256']=hashlib.sha256(raw).hexdigest();nodes={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in root.findall('node')};out['nearby']=[]
        for el in root.findall('way'):
            tags={t.attrib['k']:t.attrib['v'] for t in el.findall('tag')};refs=[n.attrib['ref'] for n in el.findall('nd')];geometry=[nodes.get(k) for k in refs]
            if not any(k in tags for k in ['name','building','amenity','landuse','leisure','tourism']):continue
            if len(geometry)<2 or any(g is None for g in geometry):continue
            distance=min(distseg(p,a,b) for a,b in zip(geometry,geometry[1:]));closed=refs[0]==refs[-1];area=closed and any(k in tags for k in ['building','landuse','leisure','amenity','tourism']) and tags.get('area')!='no';contained=inside(p,geometry) if area else None
            if distance>180 and not contained:continue
            out['nearby'].append({'osmType':'way','osmId':int(el.attrib['id']),'sourceUrl':'https://www.openstreetmap.org/way/'+el.attrib['id'],'tags':tags,'completeGeometry':True,'areaSemantics':area,'pointInsideClosedArea':contained,'boundaryDistanceMeters':round(distance,2),'distanceToGeometryMeters':0 if contained else round(distance,2),'geometry':geometry})
        out['nearby'].sort(key=lambda x:x['distanceToGeometryMeters']);out['status']='ok'
    except Exception as e:out.update(status='failed',error=str(e),nearby=[])
    return out
results=[]
with ThreadPoolExecutor(max_workers=4) as pool:
    for x in pool.map(probe,members.items()):
        results.append(x);print(x['IDBAT'],x['status'],len(x['nearby']),flush=True);(D/'023-spatial-recheck.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
