import numpy as np
from PIL import Image, ImageFilter
D='x/package/example/img/'
day=np.asarray(Image.open(D+'earth-blue-marble.jpg').convert('RGB'),dtype=np.float32)/255
night=np.asarray(Image.open(D+'earth-night.jpg').convert('RGB'),dtype=np.float32)/255
_c=Image.open('x/package/example/clouds/clouds.png').convert('RGBA').resize((4096,2048)); clouds=np.asarray(_c.split()[3],dtype=np.float32)/255
H,W=day.shape[:2]
S=1400; R=S/2-2
yy,xx=np.mgrid[0:S,0:S].astype(np.float32)
x=(xx-S/2)/R; y=-(yy-S/2)/R
r2=x*x+y*y; m=r2<=1
z=np.sqrt(np.clip(1-r2,0,1))
# rotate: center at lon0, lat0
lon0,lat0=np.radians(28),np.radians(32)
# view vector -> world: rotate around x by lat0 then around y by lon0
X,Y,Z=x,y,z
Y2=Y*np.cos(lat0)+Z*np.sin(lat0); Z2=-Y*np.sin(lat0)+Z*np.cos(lat0)
lat=np.arcsin(np.clip(Y2,-1,1)); lon=np.arctan2(X,Z2)+lon0
u=((lon/(2*np.pi)+0.5)%1)*(W-1); v=(0.5-lat/np.pi)*(H-1)
ui=u.astype(int); vi=np.clip(v.astype(int),0,H-1)
d=day[vi,ui]; n=night[vi,ui]; c=clouds[vi,ui][...,None]
# light from upper-left-front
L=np.array([-0.8,0.35,0.45]); L/=np.linalg.norm(L)
lam=x*L[0]+y*L[1]+z*L[2]
dayw=np.clip((lam+0.05)/0.28,0,1)[...,None]
dcol=d*1.05*(1-c*0.55)+c*0.55
dcol=dcol*(0.35+0.75*np.clip(lam,0,1)[...,None])
lum=np.clip(n.mean(axis=2,keepdims=True)-0.08,0,1)
ncol=(lum**1.2)*np.array([1.9,1.35,0.6])*2.4 + d*0.04
col=dcol*dayw+ncol*(1-dayw)
# limb darkening + rim
col*= (0.55+0.45*z[...,None]**0.6)
rim=np.clip(1-z,0,1)**3
col+= rim[...,None]*np.array([0.25,0.55,1.0])*0.6*np.clip(lam+0.3,0,1)[...,None]
# specular ocean glint
oce=(d[...,2]>d[...,0]+0.05).astype(np.float32)
H_=L+np.array([0,0,1]); H_/=np.linalg.norm(H_)
spec=np.clip(x*H_[0]+y*H_[1]+z*H_[2],0,1)**140*oce*(1-c[...,0])
col+=spec[...,None]*0.6
col=np.clip(col,0,1)
a=(m*255).astype(np.uint8)
img=np.dstack([(col*255).astype(np.uint8),a])
im=Image.fromarray(img,'RGBA').resize((700,700),Image.LANCZOS)
im.save('earth-sphere.png'); print('ok')
