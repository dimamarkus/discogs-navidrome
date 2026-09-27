from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
R=Path(__file__).resolve().parents[1]
DARK='#153d32';GREEN='#416b5b';PALE='#d9eee3'
def mark(n):
 s=4;im=Image.new('RGBA',(n*s,n*s));d=ImageDraw.Draw(im)
 for radius,color in [(56,DARK),(51,GREEN),(47,DARK),(41,GREEN),(38,DARK),(31,GREEN),(28,DARK),(19,'#7ca58f'),(13,PALE)]:
  r=radius*n*s/128;c=n*s/2;d.ellipse((c-r,c-r,c+r,c+r),fill=color)
 return im.resize((n,n),Image.Resampling.LANCZOS)
for n in [16,32,48,128]:mark(n).save(R/f'extension/icons/icon-{n}.png')
mark(128).save(R/'store/assets/store-icon-128.png')
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def promo(w,h,name):
 scale=3;im=Image.new('RGB',(w*scale,h*scale),PALE);d=ImageDraw.Draw(im)
 def txt(x,y,text,size,b=False,color=DARK):d.text((x*scale,y*scale),text,font=ImageFont.truetype(bold if b else font,size*scale),fill=color)
 if w==440:
  im.paste(mark(65*scale),(29*scale,23*scale),mark(65*scale));txt(110,36,'YOUR LIBRARY',17,True);txt(110,61,'for Discogs',15)
  txt(28,110,'Your records.',36,True);txt(28,154,'Ready to play.',36,True);txt(30,227,'Connect your own Navidrome library.',16)
 else:
  im.paste(mark(290*scale),(72*scale,135*scale),mark(290*scale));txt(422,117,'YOUR LIBRARY FOR DISCOGS',24,True)
  txt(418,178,'Your records.',72,True);txt(418,262,'Ready to play.',72,True);txt(424,391,'Connect your own Navidrome library.',26)
 im.resize((w,h),Image.Resampling.LANCZOS).save(R/'store/assets'/name)
promo(440,280,'promo-440x280.png');promo(1400,560,'marquee-1400x560.png')
