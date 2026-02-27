(function () {
  const toF = v => Number.isInteger(v) ? v.toFixed(1) : String(v);
  function detectMediaType() {
    const frag = document.getElementById('fragCode')?.value || '';
    if (frag.includes('u_video')) return 'video';
    if (frag.includes('u_image')) return 'image';
    return null;
  }
  function isPassthrough() {
    const vert = document.getElementById('vertCode')?.value || '';
    const frag = document.getElementById('fragCode')?.value || '';
    const vertOk =
      vert.includes('attribute vec2 a_position') &&
      vert.includes('varying') &&
      vert.includes('v_uv') &&
      vert.includes('gl_Position');
    const hasImage = frag.includes('u_image') || frag.includes('u_video');
    const hasTexture = frag.includes('texture2D');
    const hasMain = frag.includes('void main');
    const nonCommentLines = frag.split('\n').filter(l => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('//');
    });
    const fragOk = hasImage && hasTexture && hasMain &&
      !frag.includes('u_time') &&
      nonCommentLines.length < 14;
    return vertOk && fragOk;
  }
  const basicEffects = {
    blur: {
      name: 'Gaussian Blur',
      params: { strength: 0.5 },
      controls: [{ name: 'strength', label: 'Strength', type: 'range', min: 0, max: 2, step: 0.05 }],
      shader: `
vec4 fx_blur(vec4 color, vec2 uv, float strength) {
  vec4 sum = vec4(0.0);
  float off = strength * 0.008;
  for (int i = -2; i <= 2; i++)
    for (int j = -2; j <= 2; j++)
      sum += texture2D(u_src, uv + vec2(float(i), float(j)) * off);
  return mix(color, sum / 25.0, min(strength, 1.0));
}`,
      call: p => `color = fx_blur(color, uv, ${toF(p.strength)});`
    },
    sepia: {
      name: 'Sepia',
      params: { intensity: 0.8 },
      controls: [{ name: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 1, step: 0.05 }],
      shader: `
vec4 fx_sepia(vec4 color, float intensity) {
  float g = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 sep = vec3(g) * vec3(1.2, 1.0, 0.8);
  return vec4(mix(color.rgb, clamp(sep, 0.0, 1.0), intensity), color.a);
}`,
      call: p => `color = fx_sepia(color, ${toF(p.intensity)});`
    },
    vignette: {
      name: 'Vignette',
      params: { intensity: 0.6, radius: 0.75 },
      controls: [
        { name: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 1, step: 0.05 },
        { name: 'radius',    label: 'Radius',    type: 'range', min: 0.1, max: 1.2, step: 0.05 }
      ],
      shader: `
vec4 fx_vignette(vec4 color, vec2 uv, float intensity, float radius) {
  float d = distance(uv, vec2(0.5));
  float vig = smoothstep(radius, radius - 0.25, d);
  return vec4(color.rgb * mix(1.0, vig, intensity), color.a);
}`,
      call: p => `color = fx_vignette(color, uv, ${toF(p.intensity)}, ${toF(p.radius)});`
    },
    chromatic: {
      name: 'Chromatic Aberration',
      params: { strength: 0.008 },
      controls: [{ name: 'strength', label: 'Strength', type: 'range', min: 0, max: 0.05, step: 0.001 }],
      shader: `
vec4 fx_chromatic(vec2 uv, float strength) {
  float r = texture2D(u_src, uv - vec2(strength, 0.0)).r;
  float g = texture2D(u_src, uv).g;
  float b = texture2D(u_src, uv + vec2(strength, 0.0)).b;
  return vec4(r, g, b, 1.0);
}`,
      call: p => `color = fx_chromatic(uv, ${toF(p.strength)});`
    },
    contrast: {
      name: 'Contrast / Brightness',
      params: { contrast: 1.2, brightness: 1.0 },
      controls: [
        { name: 'contrast',   label: 'Contrast',   type: 'range', min: 0.5, max: 2.5, step: 0.05 },
        { name: 'brightness', label: 'Brightness',  type: 'range', min: 0.0, max: 2.0, step: 0.05 }
      ],
      shader: `
vec4 fx_contrast(vec4 color, float contrast, float brightness) {
  vec3 c = ((color.rgb - 0.5) * contrast + 0.5) * brightness;
  return vec4(clamp(c, 0.0, 1.0), color.a);
}`,
      call: p => `color = fx_contrast(color, ${toF(p.contrast)}, ${toF(p.brightness)});`
    },
    filmgrain: {
      name: 'Film Grain',
      params: { amount: 0.08, speed: 1.0 },
      controls: [
        { name: 'amount', label: 'Amount', type: 'range', min: 0, max: 0.4, step: 0.01 },
        { name: 'speed',  label: 'Speed',  type: 'range', min: 0.1, max: 5.0, step: 0.1 }
      ],
      shader: `
float fx_rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
vec4 fx_filmgrain(vec4 color, vec2 uv, float amount, float speed) {
  float noise = fx_rand(uv + fract(u_time * speed));
  return vec4(clamp(color.rgb + (noise - 0.5) * amount, 0.0, 1.0), color.a);
}`,
      call: p => `color = fx_filmgrain(color, uv, ${toF(p.amount)}, ${toF(p.speed)});`,
      needsTime: true
    },
    glitch: {
      name: 'Glitch Shift',
      params: { intensity: 0.03, speed: 2.0 },
      controls: [
        { name: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 0.15, step: 0.005 },
        { name: 'speed',     label: 'Speed',     type: 'range', min: 0.1, max: 8.0, step: 0.1 }
      ],
      shader: `
float fx_glrand(float x) { return fract(sin(x * 127.1) * 43758.5453); }
vec4 fx_glitch(vec2 uv, float intensity, float speed) {
  float t = floor(u_time * speed);
  float slice = floor(uv.y * 20.0);
  float shift = fx_glrand(slice + t) * intensity * step(0.85, fx_glrand(slice * 0.3 + t));
  return texture2D(u_src, vec2(uv.x + shift, uv.y));
}`,
      call: p => `color = fx_glitch(uv, ${toF(p.intensity)}, ${toF(p.speed)});`,
      needsTime: true
    }
  };
  const patternEffects = {
    pixelate: {
      name: 'Pixelate',
      params: { size: 64 },
      controls: [{ name: 'size', label: 'Pixel Size', type: 'range', min: 2, max: 256, step: 2 }],
      shader: `
vec4 fx_pixelate(vec2 uv, float sz) {
  vec2 g = floor(uv * sz) / sz;
  return texture2D(u_src, g + 0.5 / sz);
}`,
      call: p => `color = fx_pixelate(uv, ${toF(p.size)});`
    },
    stipple: {
      name: 'Stipple / Halftone',
      params: { size: 8.0, density: 1.0, randomness: 0.4 },
      controls: [
        { name: 'size',       label: 'Dot Size',   type: 'range', min: 2, max: 32, step: 0.5 },
        { name: 'density',    label: 'Density',    type: 'range', min: 0.1, max: 2.0, step: 0.05 },
        { name: 'randomness', label: 'Randomness', type: 'range', min: 0, max: 1, step: 0.05 }
      ],
      shader: `
float fx_srand(vec2 s) { return fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453); }
vec4 fx_stipple(vec4 color, vec2 uv, vec2 res, float sz, float density, float rnd) {
  vec2 px = uv * res;
  vec2 grid = floor(px / sz);
  vec2 off = (vec2(fx_srand(grid + 0.1), fx_srand(grid + 0.2)) - 0.5) * rnd;
  vec2 center = (grid + 0.5) * sz;
  float d = length(px - (center + off * sz));
  float bri = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float r = sz * 0.5 * (1.0 - bri) * density;
  float dot_ = 1.0 - step(r, d);
  return vec4(vec3(dot_), 1.0);
}`,
      call: p => `color = fx_stipple(color, uv, u_resolution, ${toF(p.size)}, ${toF(p.density)}, ${toF(p.randomness)});`,
      needsResolution: true
    },
    edge: {
      name: 'Edge Detect',
      params: { intensity: 1.5, invert: 0 },
      controls: [
        { name: 'intensity', label: 'Intensity', type: 'range', min: 0.1, max: 5.0, step: 0.1 },
        { name: 'invert',    label: 'Invert',    type: 'range', min: 0, max: 1, step: 1 }
      ],
      shader: `
vec4 fx_edge(vec2 uv, vec2 res, float intensity, float invert) {
  vec2 d = 1.0 / res;
  vec3 c = texture2D(u_src, uv).rgb;
  vec3 l = texture2D(u_src, uv - vec2(d.x, 0)).rgb;
  vec3 r = texture2D(u_src, uv + vec2(d.x, 0)).rgb;
  vec3 t = texture2D(u_src, uv - vec2(0, d.y)).rgb;
  vec3 b = texture2D(u_src, uv + vec2(0, d.y)).rgb;
  vec3 dx = r - l, dy = b - t;
  float e = clamp(sqrt(dot(dx, dx) + dot(dy, dy)) * intensity, 0.0, 1.0);
  float v = mix(e, 1.0 - e, invert);
  return vec4(vec3(v), 1.0);
}`,
      call: p => `color = fx_edge(uv, u_resolution, ${toF(p.intensity)}, ${toF(p.invert)});`,
      needsResolution: true
    },
    scanlines: {
      name: 'Scanlines',
      params: { frequency: 120.0, strength: 0.4, speed: 0.5 },
      controls: [
        { name: 'frequency', label: 'Frequency', type: 'range', min: 20, max: 400, step: 5 },
        { name: 'strength',  label: 'Strength',  type: 'range', min: 0, max: 1.0, step: 0.05 },
        { name: 'speed',     label: 'Speed',     type: 'range', min: 0, max: 4.0, step: 0.1 }
      ],
      shader: `
vec4 fx_scanlines(vec4 color, vec2 uv, float freq, float strength, float speed) {
  float line = sin((uv.y + u_time * speed) * freq * 3.14159) * 0.5 + 0.5;
  float mask = 1.0 - strength * (1.0 - line);
  return vec4(color.rgb * mask, color.a);
}`,
      call: p => `color = fx_scanlines(color, uv, ${toF(p.frequency)}, ${toF(p.strength)}, ${toF(p.speed)});`,
      needsTime: true
    },
    crosshatch: {
      name: 'Crosshatch',
      params: { scale: 12.0, threshold: 0.5 },
      controls: [
        { name: 'scale',     label: 'Scale',     type: 'range', min: 4, max: 40, step: 1 },
        { name: 'threshold', label: 'Threshold', type: 'range', min: 0.1, max: 0.9, step: 0.05 }
      ],
      shader: `
vec4 fx_crosshatch(vec4 color, vec2 uv, float scale, float thr) {
  float bri = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec2 p = uv * scale;
  float h1 = step(thr, mod(p.x + p.y, 1.0));
  float h2 = step(thr, mod(p.x - p.y + 1.0, 1.0));
  float hatch = mix(h1 * h2, 1.0, bri);
  return vec4(vec3(hatch), 1.0);
}`,
      call: p => `color = fx_crosshatch(color, uv, ${toF(p.scale)}, ${toF(p.threshold)});`
    },
    mosaic: {
      name: 'Mosaic / Tile',
      params: { tiles: 20.0, rotation: 0.0 },
      controls: [
        { name: 'tiles',    label: 'Tiles',    type: 'range', min: 4, max: 80, step: 1 },
        { name: 'rotation', label: 'Rotation', type: 'range', min: 0, max: 3.14159, step: 0.05 }
      ],
      shader: `
vec4 fx_mosaic(vec2 uv, float tiles, float rot) {
  float c = cos(rot), s = sin(rot);
  vec2 r = vec2(c * (uv.x - 0.5) - s * (uv.y - 0.5) + 0.5,
                s * (uv.x - 0.5) + c * (uv.y - 0.5) + 0.5);
  vec2 g = floor(r * tiles) / tiles + 0.5 / tiles;
  float c2 = cos(-rot), s2 = sin(-rot);
  vec2 back = vec2(c2 * (g.x - 0.5) - s2 * (g.y - 0.5) + 0.5,
                   s2 * (g.x - 0.5) + c2 * (g.y - 0.5) + 0.5);
  return texture2D(u_src, clamp(back, 0.0, 1.0));
}`,
      call: p => `color = fx_mosaic(uv, ${toF(p.tiles)}, ${toF(p.rotation)});`
    }
  };
  const colorEffects = {
    hsl_adjust: {
      name: 'HSL Adjust',
      params: { hue: 0.0, saturation: 1.0, lightness: 1.0 },
      controls: [
        { name: 'hue',        label: 'Hue Shift',    type: 'range', min: -180, max: 180, step: 1 },
        { name: 'saturation', label: 'Saturation',   type: 'range', min: 0, max: 3.0, step: 0.05 },
        { name: 'lightness',  label: 'Lightness',    type: 'range', min: 0, max: 2.0, step: 0.05 }
      ],
      shader: `
vec3 fx_rgb2hsl(vec3 c) {
  float mx=max(max(c.r,c.g),c.b), mn=min(min(c.r,c.g),c.b), d=mx-mn, l=(mx+mn)/2.0, h=0.0, s=0.0;
  if(d>0.0){ s=l>0.5?d/(2.0-mx-mn):d/(mx+mn);
    h=mx==c.r?(c.g-c.b)/d+(c.g<c.b?6.0:0.0):mx==c.g?(c.b-c.r)/d+2.0:(c.r-c.g)/d+4.0; h/=6.0;}
  return vec3(h,s,l);
}
float fx_hue2rgb(float p,float q,float t){if(t<0.0)t+=1.0;if(t>1.0)t-=1.0;
  return t<1.0/6.0?p+(q-p)*6.0*t:t<0.5?q:t<2.0/3.0?p+(q-p)*(2.0/3.0-t)*6.0:p;}
vec3 fx_hsl2rgb(vec3 hsl){if(hsl.y==0.0)return vec3(hsl.z);
  float q=hsl.z<0.5?hsl.z*(1.0+hsl.y):hsl.z+hsl.y-hsl.z*hsl.y,p=2.0*hsl.z-q;
  return vec3(fx_hue2rgb(p,q,hsl.x+1.0/3.0),fx_hue2rgb(p,q,hsl.x),fx_hue2rgb(p,q,hsl.x-1.0/3.0));}
vec4 fx_hsl_adjust(vec4 color, float hue, float sat, float lit) {
  vec3 hsl = fx_rgb2hsl(color.rgb);
  hsl.x = mod(hsl.x + hue / 360.0, 1.0);
  hsl.y = clamp(hsl.y * sat, 0.0, 1.0);
  hsl.z = clamp(hsl.z * lit, 0.0, 1.0);
  return vec4(fx_hsl2rgb(hsl), color.a);
}`,
      call: p => `color = fx_hsl_adjust(color, ${toF(p.hue)}, ${toF(p.saturation)}, ${toF(p.lightness)});`
    },
    grayscale_isolate: {
      name: 'Color Isolation',
      params: { target_h: 120.0, tolerance: 40.0, softness: 15.0 },
      controls: [
        { name: 'target_h',  label: 'Target Hue (°)',  type: 'range', min: 0, max: 360, step: 1 },
        { name: 'tolerance', label: 'Tolerance (°)',   type: 'range', min: 1, max: 90,  step: 1 },
        { name: 'softness',  label: 'Softness',        type: 'range', min: 0, max: 60,  step: 1 }
      ],
      shader: `
vec4 fx_isolate(vec4 color, float targetH, float tol, float soft) {
  vec3 hsl = fx_rgb2hsl(color.rgb);
  float h = hsl.x * 360.0;
  float diff = abs(mod(h - targetH + 180.0, 360.0) - 180.0);
  float mask = 1.0 - smoothstep(tol, tol + max(soft, 0.01), diff);
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  return vec4(mix(vec3(gray), color.rgb, mask), color.a);
}`,
      call: p => `color = fx_isolate(color, ${toF(p.target_h)}, ${toF(p.tolerance)}, ${toF(p.softness)});`,
      requires: ['hsl_adjust']
    },
    duotone: {
      name: 'Duotone',
      params: { shadow_r: 0.07, shadow_g: 0.04, shadow_b: 0.25, hi_r: 0.98, hi_g: 0.93, hi_b: 0.72 },
      controls: [
        { name: 'shadow_r', label: 'Shadow R', type: 'range', min: 0, max: 1, step: 0.01 },
        { name: 'shadow_g', label: 'Shadow G', type: 'range', min: 0, max: 1, step: 0.01 },
        { name: 'shadow_b', label: 'Shadow B', type: 'range', min: 0, max: 1, step: 0.01 },
        { name: 'hi_r',     label: 'High R',   type: 'range', min: 0, max: 1, step: 0.01 },
        { name: 'hi_g',     label: 'High G',   type: 'range', min: 0, max: 1, step: 0.01 },
        { name: 'hi_b',     label: 'High B',   type: 'range', min: 0, max: 1, step: 0.01 }
      ],
      shader: `
vec4 fx_duotone(vec4 color, vec3 shadow, vec3 hi) {
  float t = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  return vec4(mix(shadow, hi, t), color.a);
}`,
      call: p => `color = fx_duotone(color, vec3(${toF(p.shadow_r)},${toF(p.shadow_g)},${toF(p.shadow_b)}), vec3(${toF(p.hi_r)},${toF(p.hi_g)},${toF(p.hi_b)}));`
    },
    channel_shift: {
      name: 'Channel Mixer',
      params: { rr: 1.0, rg: 0.0, rb: 0.0, gr: 0.0, gg: 1.0, gb: 0.0, br: 0.0, bg: 0.0, bb: 1.0 },
      controls: [
        { name: 'rr', label: 'R→R', type: 'range', min: -1, max: 2, step: 0.05 },
        { name: 'rg', label: 'R→G', type: 'range', min: -1, max: 2, step: 0.05 },
        { name: 'rb', label: 'R→B', type: 'range', min: -1, max: 2, step: 0.05 },
        { name: 'gr', label: 'G→R', type: 'range', min: -1, max: 2, step: 0.05 },
        { name: 'gg', label: 'G→G', type: 'range', min: -1, max: 2, step: 0.05 },
        { name: 'gb', label: 'G→B', type: 'range', min: -1, max: 2, step: 0.05 },
        { name: 'br', label: 'B→R', type: 'range', min: -1, max: 2, step: 0.05 },
        { name: 'bg', label: 'B→G', type: 'range', min: -1, max: 2, step: 0.05 },
        { name: 'bb', label: 'B→B', type: 'range', min: -1, max: 2, step: 0.05 }
      ],
      shader: `
vec4 fx_channel_mix(vec4 color, mat3 mx) {
  return vec4(clamp(mx * color.rgb, 0.0, 1.0), color.a);
}`,
      call: p => `color = fx_channel_mix(color, mat3(${toF(p.rr)},${toF(p.gr)},${toF(p.br)},${toF(p.rg)},${toF(p.gg)},${toF(p.bg)},${toF(p.rb)},${toF(p.gb)},${toF(p.bb)}));`
    },
    lut_grade: {
      name: 'Cinematic Grade',
      params: { lift_r: 0.0, lift_g: 0.0, lift_b: 0.05, gamma: 1.0, gain: 1.0 },
      controls: [
        { name: 'lift_r', label: 'Lift R',  type: 'range', min: -0.2, max: 0.2, step: 0.01 },
        { name: 'lift_g', label: 'Lift G',  type: 'range', min: -0.2, max: 0.2, step: 0.01 },
        { name: 'lift_b', label: 'Lift B',  type: 'range', min: -0.2, max: 0.2, step: 0.01 },
        { name: 'gamma',  label: 'Gamma',   type: 'range', min: 0.3, max: 3.0, step: 0.05 },
        { name: 'gain',   label: 'Gain',    type: 'range', min: 0.3, max: 2.0, step: 0.05 }
      ],
      shader: `
vec4 fx_lut_grade(vec4 color, vec3 lift, float gamma, float gain) {
  vec3 c = pow(max(color.rgb * gain + lift, 0.0), vec3(1.0 / gamma));
  return vec4(clamp(c, 0.0, 1.0), color.a);
}`,
      call: p => `color = fx_lut_grade(color, vec3(${toF(p.lift_r)},${toF(p.lift_g)},${toF(p.lift_b)}), ${toF(p.gamma)}, ${toF(p.gain)});`
    }
  };
  const TABS = [
    { id: 'basic',   label: 'Basic',   defs: basicEffects   },
    { id: 'pattern', label: 'Pattern', defs: patternEffects },
    { id: 'color',   label: 'Color',   defs: colorEffects   }
  ];
  let activeTab = 'basic';
  let activeEffects = [];
  let modalOpen = false;
  let editingEnabled = false;
  function buildVertShader() {
    return `attribute vec2 a_position;
varying   vec2 v_uv;
void main() {
  v_uv        = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
  }
  function buildFragShader() {
    const mt = detectMediaType();
    if (!mt) return null;
    const uSampler = mt === 'video' ? 'u_video' : 'u_image';
    const needed = new Set();
    activeEffects.forEach(ae => {
      const def = getDef(ae.tabId, ae.type);
      if (!def) return;
      if (def.requires) def.requires.forEach(r => needed.add(ae.tabId + ':' + r));
      needed.add(ae.tabId + ':' + ae.type);
    });
    const needsTime = activeEffects.some(ae => {
      const def = getDef(ae.tabId, ae.type);
      return def && (def.needsTime || (def.requires && def.requires.some(r => {
        const rd = getDef(ae.tabId, r); return rd && rd.needsTime;
      })));
    });
    const needsRes = activeEffects.some(ae => {
      const def = getDef(ae.tabId, ae.type);
      return def && def.needsResolution;
    });
    let src = `precision mediump float;\n`;
    src += `uniform sampler2D ${uSampler};\n`;
    src += `#define u_src ${uSampler}\n`;
    if (needsTime) src += `uniform float u_time;\n`;
    if (needsRes)  src += `uniform vec2  u_resolution;\n`;
    src += `varying vec2 v_uv;\n\n`;
    needed.forEach(key => {
      const [tabId, type] = key.split(':');
      const def = getDef(tabId, type);
      if (def) src += def.shader + '\n';
    });
    src += `void main() {\n`;
    src += `  vec2 uv    = v_uv;\n`;
    src += `  vec4 color = texture2D(u_src, uv);\n`;
    activeEffects.forEach(ae => {
      const def = getDef(ae.tabId, ae.type);
      if (!def) return;
      src += `  ${def.call(ae.params)}\n`;
    });
    src += `  gl_FragColor = color;\n}\n`;
    return src;
  }
  function getDef(tabId, type) {
    const tab = TABS.find(t => t.id === tabId);
    return tab ? tab.defs[type] : null;
  }
  function liveApply() {
    if (!editingEnabled) return;
    const vertTA = document.getElementById('vertCode');
    const fragTA = document.getElementById('fragCode');
    if (!vertTA || !fragTA) return;
    const frag = buildFragShader();
    if (!frag) return;
    vertTA.value = buildVertShader();
    fragTA.value = frag;
    vertTA.dispatchEvent(new Event('input', { bubbles: true }));
    fragTA.dispatchEvent(new Event('input', { bubbles: true }));
    window.rebuildProgram?.();
  }
  function resetToPassthrough() {
    const vertTA = document.getElementById('vertCode');
    const fragTA = document.getElementById('fragCode');
    if (!vertTA || !fragTA) return;
    const mt = detectMediaType() || 'image';
    vertTA.value = buildVertShader();
    fragTA.value = `precision mediump float;
uniform sampler2D ${mt === 'video' ? 'u_video' : 'u_image'};
varying vec2 v_uv;
void main() {
  gl_FragColor = texture2D(${mt === 'video' ? 'u_video' : 'u_image'}, v_uv);
}`;
    vertTA.dispatchEvent(new Event('input', { bubbles: true }));
    fragTA.dispatchEvent(new Event('input', { bubbles: true }));
    window.rebuildProgram?.();
  }
  const modal = document.createElement('div');
  modal.id = 'effectsModal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div id="effectsPanel">
      <div id="effectsHeader">
        <span id="effectsTitle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          Effects
        </span>
        <div id="effectsHeaderRight">
          <button id="effectsClose" title="Close (Esc)">×</button>
        </div>
      </div>
      <div id="effectsTabs">
        ${TABS.map(t => `<button class="effects-tab${t.id === activeTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
      </div>
      <div id="effectsBody">
        <div id="effectsLibrary"></div>
        <div id="effectsQueue">
          <div id="effectsQueueHeader">
            <span>Active Stack</span>
            <button id="effectsClearAll" title="Clear all effects">clear</button>
          </div>
          <div id="effectsQueueList"></div>
          <div id="effectsApplyBar">
            <button id="effectsResetBtn" class="effects-reset-btn">Reset Passthrough</button>
          </div>
        </div>
      </div>
      <div id="effectsBlocker">
        <div id="effectsBlockerMsg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          <p>Import an image or video texture<br>to start adding effects.</p>
        </div>
      </div>
    </div>`;
  const editorsContainer = document.getElementById('editors');
  (editorsContainer || document.body).appendChild(modal);
  function updateBlocker() {
    const blocker = document.getElementById('effectsBlocker');
    if (!blocker) return;
    if (editingEnabled) {
      blocker.style.display = 'none';
    } else {
      blocker.style.display = 'flex';
    }
  }
  function renderLibrary() {
    const tab = TABS.find(t => t.id === activeTab);
    const lib = document.getElementById('effectsLibrary');
    if (!tab || !lib) return;
    lib.innerHTML = '';
    Object.entries(tab.defs).forEach(([type, def]) => {
      const card = document.createElement('div');
      card.className = 'effects-card';
      card.innerHTML = `
        <div class="effects-card-name">${def.name}</div>
        <button class="effects-card-add" data-type="${type}" data-tab="${activeTab}" title="Add to stack">＋</button>`;
      card.querySelector('.effects-card-add').addEventListener('click', () => {
        if (!editingEnabled) {
          window.showToast?.('Import an image or video texture first.', 'warning');
          return;
        }
        addEffect(activeTab, type);
      });
      lib.appendChild(card);
    });
  }
  function renderQueue() {
    const list = document.getElementById('effectsQueueList');
    if (!list) return;
    list.innerHTML = '';
    if (activeEffects.length === 0) {
      list.innerHTML = '<div class="effects-empty">No effects added yet.</div>';
      return;
    }
    activeEffects.forEach((ae, idx) => {
      const def = getDef(ae.tabId, ae.type);
      if (!def) return;
      const item = document.createElement('div');
      item.className = 'effects-queue-item';
      const controls = def.controls.map(ctrl => {
        const val = ae.params[ctrl.name] !== undefined ? ae.params[ctrl.name] : def.params[ctrl.name];
        return `
          <div class="effects-ctrl-row">
            <label class="effects-ctrl-label">${ctrl.label}</label>
            <input type="range" class="effects-ctrl-range"
              data-idx="${idx}" data-name="${ctrl.name}"
              min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}"
              value="${val}">
            <span class="effects-ctrl-val">${val}</span>
          </div>`;
      }).join('');
      item.innerHTML = `
        <div class="effects-qi-header">
          <span class="effects-qi-name">${def.name}</span>
          <div class="effects-qi-actions">
            <button class="effects-qi-btn effects-qi-up"   data-idx="${idx}" title="Move up">↑</button>
            <button class="effects-qi-btn effects-qi-down" data-idx="${idx}" title="Move down">↓</button>
            <button class="effects-qi-btn effects-qi-del"  data-idx="${idx}" title="Remove">✕</button>
          </div>
        </div>
        <div class="effects-ctrls">${controls}</div>`;
      item.querySelectorAll('.effects-ctrl-range').forEach(input => {
        input.addEventListener('input', e => {
          const i = +e.target.dataset.idx;
          const n = e.target.dataset.name;
          activeEffects[i].params[n] = parseFloat(e.target.value);
          e.target.nextElementSibling.textContent = e.target.value;
          liveApply();
        });
      });
      item.querySelector('.effects-qi-up')?.addEventListener('click', e => {
        const i = +e.target.dataset.idx;
        if (i > 0) {
          [activeEffects[i-1], activeEffects[i]] = [activeEffects[i], activeEffects[i-1]];
          renderQueue();
          liveApply();
        }
      });
      item.querySelector('.effects-qi-down')?.addEventListener('click', e => {
        const i = +e.target.dataset.idx;
        if (i < activeEffects.length - 1) {
          [activeEffects[i], activeEffects[i+1]] = [activeEffects[i+1], activeEffects[i]];
          renderQueue();
          liveApply();
        }
      });
      item.querySelector('.effects-qi-del')?.addEventListener('click', e => {
        activeEffects.splice(+e.target.dataset.idx, 1);
        renderQueue();
        liveApply();
      });

      list.appendChild(item);
    });
  }
  function addEffect(tabId, type) {
    const def = getDef(tabId, type);
    if (!def) return;
    activeEffects.push({ type, tabId, params: { ...def.params } });
    renderQueue();
    liveApply();
    window.showToast?.(`${def.name} added`, 'success');
  }
  function openModal() {
    editingEnabled = isPassthrough();
    modal.style.display = 'flex';
    modalOpen = true;
    renderLibrary();
    renderQueue();
    updateBlocker();
    if (!editingEnabled) {
      window.showToast?.('Import an image or video texture to enable effects.', 'info');
    }
  }
  function closeModal() {
    modal.style.display = 'none';
    modalOpen = false;
  }
  document.getElementById('effectsClose').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.code === 'KeyE') {
      e.preventDefault();
      modalOpen ? closeModal() : openModal();
      return;
    }
    if (e.key === 'Escape' && modalOpen) closeModal();
  });
  document.getElementById('effectsTabs').addEventListener('click', e => {
    const tab = e.target.closest('.effects-tab');
    if (!tab) return;
    activeTab = tab.dataset.tab;
    document.querySelectorAll('.effects-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
    renderLibrary();
  });
  document.getElementById('effectsClearAll').addEventListener('click', () => {
    if (!editingEnabled) return;
    activeEffects = [];
    renderQueue();
    liveApply();
    window.showToast?.('Stack cleared', 'info');
  });
  document.getElementById('effectsResetBtn').addEventListener('click', () => {
    activeEffects = [];
    renderQueue();
    resetToPassthrough();
    editingEnabled = true;
    updateBlocker();
    window.showToast?.('Reset to passthrough', 'info');
  });
  document.addEventListener('fullscreenchange', () => {
    (document.fullscreenElement || document.body).appendChild(modal);
  });
  window.openEffectsModal = openModal;
})();