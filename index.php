<!-- 
  ____   _       ____    _      
 / ___| | |     / ___|  | |     
| |  _  | |___  \___ \  | |___  
 \____| |_____| |____/  |_____|
created by Max Warren
 -->
<?php require '../session.php' ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <title>CODEVANILLA</title>
  <meta charset="UTF-8">
  <meta name="description" content="A web app to share/store/preview GLSL shaders">
  <meta name="author" content="github.com/composedbymax">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#252525">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <link rel="apple-touch-icon" href="/assets/img/icon-192.png">
  <link rel="icon" href="/favicon.ico" type="image/x-icon">
  <meta name="robots" content="noindex, nofollow">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains; preload">
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(self), camera=(self)">
  <meta http-equiv="X-XSS-Protection" content="1; mode=block">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <script>window.userLoggedIn = <?php echo isset($_SESSION['user']) ? 'true' : 'false'; ?>;window.userRole = <?php echo isset($_SESSION['user_role']) ? json_encode($_SESSION['user_role']) : 'null'; ?>;</script>
  <script>"serviceWorker"in navigator&&navigator.serviceWorker.register("/glsl/sw.js",{scope:"/glsl/"});</script>
  <link rel="preload" href="css/style.css" as="style">
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="/assets/css/slider.css">
  <link rel="stylesheet" href="/assets/css/root.css">
</head>
<body>
  <div id="app">
    <div id="editors">
      <button class="lbtn" onclick="openShaderWindow()">Save / Browse</button>
      <div id="shaderWindow" class="savew">
        <div class="toggles">
          <button id="tabSaveBtn" onclick="showTab('save')" class="togbtn">Save</button>
          <button id="tabPublicBtn" onclick="showTab('public')" class="togbtn">Public</button>
          <button id="tabLocalBtn" onclick="showTab('local')" class="togbtn">Local</button>
        </div>
        <div id="tabSave" class="savesct">
          <h3>Save</h3>
          <div id="uploadZone" class="upldzone">
            <p>Drag & Drop Image Here<br>or</p>
            <button id="chooseFileBtn" class="savebtn">Choose File</button>
            <input type="file" id="shaderImage" accept="image/*" style="display:none;">
            <div id="fileName"></div>
          </div>
          <input type="text" id="shaderTitle" placeholder="Shader Title" class="saveinput"><br>
          <button class="savebtn" onclick="saveLocally()">Save Locally</button>
          <?php if (isset($_SESSION['user_role']) && ($_SESSION['user_role'] === 'admin' || $_SESSION['user_role'] === 'premium')): ?>
          <button class="savebtn" onclick="savePublic()">Save Publicly</button>
          <?php endif; ?>
        </div>
        <div id="tabPublic" class="savesct">
          <h3>Public</h3>
          <div id="publicShaderList"></div>
        </div>
        <div id="tabLocal" class="savesct">
          <h3>Local</h3>
          <div id="localShaderList"></div>
        </div>
        <button class="closebtn" onclick="closeShaderWindow()">Close</button>
      </div>
      <div id="vertPanel" class="editor-panel">
        <div class="panel-header">
          <span>Vertex Shader</span>
          <button type="button" id="vertFileBtn">Upload<span class="file-name" id="vertFileName"></span></button>
          <input type="file" id="vertFile" accept=".vert,.vs,.txt" />
        </div>
        <textarea id="vertCode">
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0., 1.);
}</textarea>
      </div>
      <div id="rowDivider"></div>
      <div id="fragPanel" class="editor-panel">
        <div class="panel-header">
          <span>Fragment Shader</span>
          <button type="button" id="fragFileBtn">Upload<span class="file-name" id="fragFileName"></span></button>
          <input type="file" id="fragFile" accept=".frag,.fs,.txt" />
        </div>
        <textarea id="fragCode">
//WebGL editor - Created By: Max Warren
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 78.23);
    return fract(p.x * p.y);
}
float boxSDF(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}
float sceneSDF(vec3 p) {
    vec2 gridPos = floor(p.xz / 4.0);
    vec2 localPos = mod(p.xz, 4.0) - 2.0;
    float h = hash(gridPos) * 10.0 + 2.0;
    float d = boxSDF(vec3(localPos.x, p.y, localPos.y), vec3(1.0, h, 1.0));
    return d;
}
float raymarch(vec3 ro, vec3 rd, float maxDist) {
    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);
        if(d < 0.001 || t > maxDist) break;
        t += d * 0.1;
    }
    return t;
}
vec3 getNormal(vec3 p) {
    float e = 0.001;
    return normalize(vec3(
        sceneSDF(p + vec3(e, 0, 0)) - sceneSDF(p - vec3(e, 0, 0)),
        sceneSDF(p + vec3(0, e, 0)) - sceneSDF(p - vec3(0, e, 0)),
        sceneSDF(p + vec3(0, 0, e)) - sceneSDF(p - vec3(0, 0, e))
    ));
}
void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    vec3 ro = vec3(0.0, 2.0, u_time * 5.0);
    vec3 lookAt = vec3(0.0, 2.0, ro.z + 5.0);
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0.0,1.0,0.0), forward));
    vec3 up = cross(forward, right);
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);
    float t = raymarch(ro, rd, 100.0);
    vec3 col = vec3(0.0);
    if(t < 100.0) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        float diff = clamp(dot(n, vec3(0.5, 1.0, 0.5)), 0.0, 1.0);
        float glow = 0.0;
        if(abs(mod(p.y, 2.0) - 1.0) < 0.1) {
            glow = 1.0;
        }
        col = mix(vec3(0.0, 0.5, 1.0) * diff, vec3(0.8, 0.2, 1.0), glow);
        col = mix(col, vec3(0.0), 1.0 - exp(-0.02 * t * t));
    }
    gl_FragColor = vec4(col, 1.0);
}
</textarea>
      </div>
    </div>
    <div id="divider"></div>
    <div id="preview-panel">
      <canvas id="glcanvas"></canvas>
      <button id="fsBtn">⛶</button>
      <div id="lint"></div>
    </div>
  </div>
  <script src="scripts/main.js"></script>
  <script src="/assets/js/hidev.js"></script>
</body>
</html>