from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import random
W,H=1080,1920
OUT=Path("output/images"); REF=Path("output/character-references")
OUT.mkdir(parents=True,exist_ok=True); REF.mkdir(parents=True,exist_ok=True)
def bg(seed):
 im=Image.new("RGB",(W,H)); p=im.load()
 for y in range(H):
  t=y/H
  c=(int(13-9*t),int(25-18*t),int(31-23*t))
  for x in range(W):
   v=.72+.28*min(1,min(x,W-x)/(W*.3))
   p[x,y]=tuple(int(z*v) for z in c)
 return im
def glow(im,x,y,r):
 l=Image.new("RGBA",(W,H)); d=ImageDraw.Draw(l); d.ellipse((x-r,y-r,x+r,y+r),fill=(255,190,112,65))
 return Image.alpha_composite(im.convert("RGBA"),l.filter(ImageFilter.GaussianBlur(r*.55)))
def tree(d,x,b,s=1,seed=1):
 q=random.Random(seed); w=int(62*s)
 d.polygon([(x-w//2,b),(x-w//3,b-600*s),(x+w//3,b-600*s),(x+w//2,b)],fill=(10,16,15))
 for k in range(5):
  yy=b-(160+k*95)*s; d.line((x,yy,x+q.randint(-300,300)*s,yy-q.randint(170,380)*s),fill=(10,18,16),width=max(8,int(32*s)))
 for k in range(35):
  xx=x+q.randint(-330,330)*s; yy=b-q.randint(400,850)*s; r=q.randint(45,125)*s
  d.ellipse((xx-r,yy-r*.65,xx+r,yy+r*.65),fill=q.choice([(7,17,16),(12,25,21),(17,30,24)]))
def human(d,x,y,s=1,coat=(28,34,36),preg=False,hair=False):
 d.ellipse((x-44*s,y-330*s,x+44*s,y-242*s),fill=(48,37,32))
 if hair:d.ellipse((x-65*s,y-350*s,x+65*s,y-170*s),fill=(3,5,6))
 d.polygon([(x-52*s,y-245*s),(x+52*s,y-245*s),(x+80*s,y-55*s),(x+60*s,y),(x-60*s,y),(x-80*s,y-55*s)],fill=coat)
 if preg:d.ellipse((x-95*s,y-170*s,x+95*s,y-2*s),fill=coat)
 d.polygon([(x-52*s,y),(x-8*s,y),(x-15*s,y+180*s),(x-70*s,y+180*s)],fill=(7,9,10))
 d.polygon([(x+8*s,y),(x+52*s,y),(x+70*s,y+180*s),(x+15*s,y+180*s)],fill=(7,9,10))
def bike(d,x,y,s=1):
 d.ellipse((x-150*s,y-15*s,x-55*s,y+80*s),outline=(2,3,4),width=max(6,int(14*s)))
 d.ellipse((x+60*s,y-15*s,x+155*s,y+80*s),outline=(2,3,4),width=max(6,int(14*s)))
 d.line((x-100*s,y+25*s,x-5*s,y-45*s,x+115*s,y+25*s,x+25*s,y+25*s,x-100*s,y+25*s),fill=(3,5,6),width=max(9,int(18*s)))
 d.ellipse((x+125*s,y-120*s,x+168*s,y-77*s),fill=(255,210,130))
def haze(im,n):
 q=random.Random(n); l=Image.new("RGBA",(W,H)); d=ImageDraw.Draw(l)
 for _ in range(20):
  x=q.randint(-150,900); y=q.randint(950,1780); r=q.randint(180,420)
  d.ellipse((x,y,x+r,y+q.randint(35,100)),fill=(170,180,170,13))
 return Image.alpha_composite(im.convert("RGBA"),l.filter(ImageFilter.GaussianBlur(42)))
def scene(n):
 im=bg(n); d=ImageDraw.Draw(im)
 if n==1:
  im=glow(im,790,600,350); d=ImageDraw.Draw(im)
  d.rounded_rectangle((70,270,1010,1240),radius=40,fill=(13,21,25),outline=(75,86,89),width=22)
  d.rectangle((110,320,970,850),fill=(19,35,42))
  for x in range(130,970,110):d.line((x,320,x,850),fill=(46,58,62),width=5)
  human(d,385,1280,.95,(34,39,42));human(d,690,1280,.95,(91,49,57),True)
 elif n==2:
  d.rectangle((0,1320,W,H),fill=(9,12,13))
  for x in range(120,1000,250):d.rectangle((x,500,x+18,1300),fill=(20,24,23));d.ellipse((x-50,440,x+70,580),fill=(155,105,54))
  human(d,350,1300,.95);human(d,700,1300,1.05,(28,37,34));bike(d,740,1450,.8)
 elif n in (3,5):
  tree(d,70,1530,1,n);tree(d,1010,1510,.9,n+2);im=glow(im,850,1180,260);d=ImageDraw.Draw(im)
  bike(d,520,1410,1);human(d,465,1190,.6);human(d,580,1200,.62,(92,48,57),True)
  if n==3:human(d,820,1120,.85,(5,7,8),False,True)
  else:
   bike(d,820,1540,.6);human(d,790,1330,.5,(5,7,8),False,True);human(d,880,1340,.48,(92,48,57),True)
  im=haze(im,n)
 elif n==4:
  tree(d,90,1540,1.1,n);tree(d,990,1530,1.1,n+1)
  d.polygon([(420,1920),(660,1920),(565,900),(520,900)],fill=(48,39,29))
  im=glow(im,540,1070,300);d=ImageDraw.Draw(im);bike(d,550,1510);human(d,520,1280,.55);human(d,570,1190,.5)
  im=haze(im,n)
 elif n in (6,7):
  tree(d,530,1740,1.55,n);im=glow(im,520,1200,460);d=ImageDraw.Draw(im)
  human(d,360,1510,.86,(73,78,48));d.ellipse((430,1320,470,1360),fill=(255,210,120))
  d.polygon([(450,1340),(650,1270),(650,1400)],fill=(255,205,120,60))
  if n==7:
   d.polygon([(615,1080),(735,1080),(755,1610),(690,1640)],fill=(2,3,4))
   d.polygon([(760,1070),(870,1080),(900,1610),(830,1640)],fill=(2,3,4))
   q=random.Random(70)
   for _ in range(180):
    x=q.randint(610,890);y=q.randint(1100,1590);d.line((x,y,x+q.randint(-18,18),y+q.randint(8,30)),fill=(28,27,25),width=2)
   d.ellipse((625,1570,770,1680),fill=(1,2,3));d.ellipse((780,1570,930,1680),fill=(1,2,3))
  im=haze(im,n)
 else:
  tree(d,130,1500,1,n);tree(d,960,1490,.9,n+1);im=glow(im,810,1140,300);d=ImageDraw.Draw(im)
  bike(d,560,1480,.95);human(d,540,1210,.52);d.ellipse((505,1035,590,1120),fill=(62,45,37));im=haze(im,n)
 # grain + vignette
 q=random.Random(n);g=Image.new("RGBA",(W,H));gd=ImageDraw.Draw(g)
 for _ in range(1400):
  x=q.randrange(W);y=q.randrange(H);gd.point((x,y),fill=(190,195,184,q.randrange(3,12)))
 im=Image.alpha_composite(im.convert("RGBA"),g)
 mask=Image.new("L",(W,H));ImageDraw.Draw(mask).ellipse((-220,-130,W+220,H+180),fill=180);mask=mask.filter(ImageFilter.GaussianBlur(170))
 shade=Image.new("RGBA",(W,H),(0,0,0,145));shade.putalpha(Image.eval(mask,lambda p:145-p))
 return Image.alpha_composite(im,shade).convert("RGB")
for name,col in [("Arya",(31,39,43)),("Nita",(104,59,67)),("KangBasir",(43,49,43)),("MysteriousLongHairedMan",(8,10,12)),("ElderlyWoman",(77,79,48))]:
 c=bg(sum(map(ord,name)));d=ImageDraw.Draw(c);d.ellipse((280,300,800,820),fill=(17,19,19))
 human(d,540,1320,1.65,col,name=="Nita",name=="MysteriousLongHairedMan")
 c.save(REF/(name.lower()+"-design.webp"),"WEBP",quality=88)
for i in range(1,9):
 scene(i).save(OUT/f"scene-{i:02d}.webp","WEBP",quality=91)
 print(f"Offline visual generated: scene-{i:02d}.webp")
print("8 scenes + 5 character design references created locally; no API credentials required.")
