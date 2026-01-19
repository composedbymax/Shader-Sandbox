<!-- 
░█▀▀░█░█░█▀█░█▀▄░█▀▀░█▀▄    
░▀▀█░█▀█░█▀█░█░█░█▀▀░█▀▄    
░▀▀▀░▀░▀░▀░▀░▀▀░░▀▀▀░▀░▀    
░█▀▀░█▀█░█▀█░█▀▄░█▀▄░█▀█░█░█
░▀▀█░█▀█░█░█░█░█░█▀▄░█░█░▄▀▄
░▀▀▀░▀░▀░▀░▀░▀▀░░▀▀░░▀▀▀░▀░▀

Copyright (C) 2026 Max Warren
SPDX-License-Identifier: GPL-3.0-or-later
https://max.x10.mx/
-->
<?php
ob_start();
require '../session.php'
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <title>MW - SHADER</title>
  <meta charset="UTF-8">
  <meta name="description" content="A browser-based animation editor for writing, previewing, recording, and exporting WebGL WebGPU and JS animations">
  <meta name="keywords" content="GLSL, WebGL, shader editor, live coding, Max, browser shader tool, WebGL editor, animation coding, audio reactive shader, WebGPU, Render, Coding Sandbox, animation, audio reactive, record">
  <meta name="author" content="github.com/composedbymax">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#252525">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Shader Sandbox">
  <meta name="format-detection" content="telephone=no">
  <meta name="application-name" content="Shader Sandbox">
  <meta name="HandheldFriendly" content="true">
  <meta name="apple-touch-fullscreen" content="yes">
  <link rel="icon" sizes="192x192" href="/_assets/img/icon-192.png">
  <link rel="icon" sizes="512x512" href="/_assets/img/icon-512.png">
  <link rel="apple-touch-icon" href="/_assets/img/icon-192.png">
  <link rel="apple-touch-startup-image" href="/_assets/img/icon-512.png">
  <meta name="msapplication-TileColor" content="#252525">
  <meta name="msapplication-TileImage" content="/_assets/img/icon-192.png">
  <meta name="robots" content="index, nofollow">
  <meta name="referrer" content="no-referrer">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Shader Sandbox">
  <meta name="twitter:description" content="A browser-based animation editor for writing, previewing, recording, and exporting WebGL WebGPU and JS animations">
  <meta name="twitter:image" content="https://max.x10.mx/_assets/img/shader.webp">
  <meta name="twitter:site" content="@composedbymax">
  <meta property="og:title" content="Shader Sandbox" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://max.x10.mx/shader" />
  <meta property="og:image" content="https://max.x10.mx/_assets/img/shader.webp" />
  <meta property="og:description" content=" browser-based animation editor for writing, previewing, recording, and exporting WebGL WebGPU and JS animations" />
  <meta property="og:site_name" content="Shader Sandbox" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self';script-src 'self' 'unsafe-inline' 'unsafe-eval';worker-src 'self' blob:;style-src 'self' 'unsafe-inline';img-src 'self' data:;connect-src 'self';font-src 'self';object-src 'none';media-src 'self' blob:;">
  <meta http-equiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains; preload">
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(self), camera=(self), fullscreen=(self), clipboard-read=(self), clipboard-write=(self)">
  <meta http-equiv="X-XSS-Protection" content="1; mode=block">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <link rel="preload" as="script" href="/auth/check.js.php">
  <script src="/auth/check.js.php"></script>
  <script>"serviceWorker"in navigator&&navigator.serviceWorker.register("/shader/sw.js",{scope:"/shader/"});</script>
  <link rel="preload" as="script" href="scripts/utils/cover.js">
  <link rel="preload" href="css/style.css" as="style">
  <link rel="preload" href="css/root.css" as="style">
  <script src="scripts/utils/cover.js"></script>
  <script src="scripts/utils/autosave.js"></script>
  <script src="scripts/utils/hidev.js" defer></script>
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/root.css">
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  <?php if (!isset($_SESSION['user'])) {require $_SERVER['DOCUMENT_ROOT'] . '/auth/modal.php';}?>
  <div id="app">
    <div id="editors">
      <button class="lbtn ellips" onclick="openShaderWindow()" title="Save shaders and browse public gallery">Save / Browse</button>
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
            <div id="fileName" class="ellips"></div>
          </div>
          <input type="text" id="shaderTitle" placeholder="Shader Title" class="saveinput"><br>
          <button class="sharebtn" onclick="saveLink()">Share Link</button>
          <button class="sharebtn" onclick="saveLocally()">Save Locally</button>
          <?php if (isset($_SESSION['user_role']) && ($_SESSION['user_role'] === 'admin' || $_SESSION['user_role'] === 'premium')): ?>
          <button class="sharebtn" onclick="savePublic()">Save Publicly</button>
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
          <button type="button" id="vertFileBtn" title="Upload a Vertex Shader (.frag,.fs,.txt)">Upload<span class="file-name" id="vertFileName"></span></button>
          <input type="file" id="vertFile" accept=".vert,.vs,.txt" />
        </div>
        <textarea spellcheck="false" id="vertCode">
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0., 1.);
}</textarea>
      </div>
      <div id="rowDivider"></div>
      <div id="fragPanel" class="editor-panel">
        <div class="panel-header">
          <span>Fragment Shader</span>
          <button type="button" id="fragFileBtn" title="Upload a Fragment Shader (.frag,.fs,.txt)">Upload<span class="file-name" id="fragFileName"></span></button>
          <input type="file" id="fragFile" accept=".frag,.fs,.txt" />
        </div>
        <textarea spellcheck="false" id="fragCode">
//WebGL editor - Created By: Max Warren
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_volume;
uniform float u_treble;
uniform float u_mid;
uniform float u_bass;
uniform vec2 u_scroll;
uniform vec2 mouse;
vec2 axel = vec2(1.0);
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
    float h = hash(gridPos) * 10.0 + u_volume;
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
    axel = mouse;
    vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0 + (axel * 0.1);
    uv.x *= u_resolution.x / u_resolution.y;
    vec3 ro = vec3(0.0, 2.0, u_time *5.0 - (0.1*u_scroll));
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
        float diff = clamp(dot(n, vec3(0.5, 1.0, 0.5)), u_treble, 1.0);
        float glow = u_bass;
        if(abs(mod(p.y, 2.0) - 1.0) < 0.1) {
            glow = 1.0;
        }
        col = mix(vec3(u_mid, 0.5, 1.0) * diff, vec3(0.8, 0.2, 1.0), glow);
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
        <div id="lint">
          <button id="copyErrorsBtn" style="display: none;">Copy All Errors</button>
          <button id="closeLintBtn" style="display: none;">✕</button>
          <div id="lintContent"></div>
        </div>
      </div>
    </div>
  <script src="scripts/utils/main.js"></script>
</body>
</html>