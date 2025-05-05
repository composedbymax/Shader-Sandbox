<!DOCTYPE html>
<html lang="en">
<head>
  <title>GLSL</title>
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
  <link rel="preload" href="style.css" as="style">
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="/assets/css/slider.css">
  <link rel="stylesheet" href="/assets/css/root.css">
</head>
<body>
  <div id="app">
    <div id="editors">
      <button class="expbtn" onclick="openShaderWindow()">Save / Browse</button>
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
        <textarea id="fragCode">precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0,2,4));
  gl_FragColor = vec4(col,1.0);
}</textarea>
      </div>
    </div>
    <div id="divider"></div>
    <div id="preview-panel">
      <canvas id="glcanvas"></canvas>
      <button id="fsBtn">⛶</button>
      <div id="lint"></div>
    </div>
  </div>
  <script src="script.js" async></script>
  <script src="recorder.js" async></script>
  <script src="save.js" defer></script>
  <script src="performance.js"></script>
</body>
</html>