import sys, numpy as np, potrace
from PIL import Image
from skimage import measure, morphology

def load_mask(path, fg_bright, up=4):
    im = Image.open(path).convert('L')
    w,h = im.size
    im = im.resize((w*up,h*up), Image.LANCZOS)
    a = np.asarray(im).astype(float)
    from scipy.ndimage import gaussian_filter
    a = gaussian_filter(a, 1.2*up)
    m = a > 128 if fg_bright else a < 128
    m = morphology.remove_small_objects(m, 64*up*up)
    m = morphology.remove_small_holes(m, 64*up*up)
    return m, up

def to_path(mask, scale):
    bm = potrace.Bitmap(~mask)  # potracer traza los False
    pl = bm.trace(turdsize=20, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.4)
    d=[]
    f=lambda p: f"{p.x/scale:.2f} {p.y/scale:.2f}"
    for c in pl:
        d.append("M"+f(c.start_point))
        for s in c.segments:
            if s.is_corner: d.append("L"+f(s.c)+"L"+f(s.end_point))
            else: d.append("C"+f(s.c1)+" "+f(s.c2)+" "+f(s.end_point))
        d.append("Z")
    return "".join(d)

def bbox(mask):
    ys,xs=np.nonzero(mask); return xs.min(),ys.min(),xs.max()+1,ys.max()+1

if __name__=='__main__':
    src, out, mode = sys.argv[1], sys.argv[2], sys.argv[3]
    mask, up = load_mask(src, mode=='bright')
    lab = measure.label(mask, connectivity=2)
    props = sorted(measure.regionprops(lab), key=lambda p:p.bbox[1])
    for p in props: print('comp', p.label, 'bbox', [v//up for v in p.bbox], 'area', p.area//(up*up))
    x0,y0,x1,y1 = bbox(mask)
    pad=0
    P=16
    sub = np.pad(mask[y0:y1, x0:x1], P)
    x0-=P; y0-=P; x1+=P; y1+=P
    np.save(out+'.npy', np.array([x0,y0,x1,y1,up]))
    d = to_path(sub, up)
    W,H=(x1-x0)/up,(y1-y0)/up
    open(out,'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.2f} {H:.2f}"><path fill="currentColor" fill-rule="evenodd" d="{d}"/></svg>')
    print('viewBox', W, H)
