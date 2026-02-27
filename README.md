```
░█▀▀░█░█░█▀█░█▀▄░█▀▀░█▀▄    
░▀▀█░█▀█░█▀█░█░█░█▀▀░█▀▄    
░▀▀▀░▀░▀░▀░▀░▀▀░░▀▀▀░▀░▀    
░█▀▀░█▀█░█▀█░█▀▄░█▀▄░█▀█░█░█
░▀▀█░█▀█░█░█░█░█░█▀▄░█░█░▄▀▄
░▀▀▀░▀░▀░▀░▀░▀▀░░▀▀░░▀▀▀░▀░▀

```

# Shader Sandbox - Created by Max Warren

A browser-based GLSL + WGSL + JS editor for writing, testing, recording, and exporting or loading animations. Users can interactively build shaders and preview them in real time.

[Go to App](https://max.x10.mx/shader)

---

## Purpose

While there are several WebGL, GLSL, and Three.js coding sandboxes available, I struggled to find audio-reactive capabilities within a web-based animation editor. It was also difficult to find existing tools that allow for clean WebGL animation exports in common video formats like MP4 (Although my implementation is still not cleanly supported in Webkit based browsers).

This application was developed to address those limitations. It provides a browser-based, open-source editor intended for users who need more control when creating audio-reactive visuals, without relying on proprietary software or paid platforms.

---

## Development

This application is built entirely with native PHP, HTML5, CSS, and JavaScript. It uses the WebGL and WebGPU API directly for rendering and shader compilation, without relying on any third-party libraries or frameworks. Aside from minimal server-side functionality for public posting and code retrieval, authentication and p2p signaling via PHP endpoints, the entire application runs client-side.

---

## Features

| Feature | Description | Source |
|--------|------------|--------|
| Real-Time GLSL Sandbox | Visualize GLSL fragment and vertex shaders live as you edit code | [render.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/render.js) |
| Real-Time WebGPU Sandbox | Live preview and editing of WebGPU WGSL shaders | [gpu.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/gpu.js) |
| Real-Time JavaScript Sandbox | Execute and visualize JavaScript code in real time | [js.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/js.js) |
| Syntax Linting | Identifies and colors code variables for easier reading | [syntax.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/syntax.js) |
| Public Shader Gallery | Browse, save, and load shaders publicly or locally via server or IndexedDB | [save.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/save.js), [load.php](https://github.com/composedbymax/Shader-Sandbox/blob/main/api/load.php), [save.php](https://github.com/composedbymax/Shader-Sandbox/blob/main/api/save.php) |
| Share Links | Compress shaders into shareable URLs; premium users can store and share short DB-backed strings | [link.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/link.js), [link.php](https://github.com/composedbymax/Shader-Sandbox/blob/main/api/link.php) |
| File Upload & Export | Import and export `.vert`, `.frag`, `.vs`, `.fs`, `.txt`, `html`, `obj`, `ply`, `stl`, `off`, `mp3`, `mp4`, `wav`, `jpeg`, `png`, `heic` | [drop.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/drop.js) |
| Record WebM / MP4 | Record animations (with audio) as video files with configurable quality and dimensions | [recorder.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/recorder.js) |
| Audio Reactive Support | Drive shader animations using microphone input, system audio, or uploaded audio files with frequency band separation | [audio.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/audio.js) |
| Runtime Metrics | Monitor FPS, memory usage, GPU info, and draw calls in real time | [performance.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/performance.js) |
| Autosave | Automatically saves editor code to IndexedDB every 30 seconds using a Web Worker | [autosave.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/utils/autosave.js) |
| Theme Manager | Customize editor themes using presets or individual CSS variables | [theme.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/theme.js) |
| Generative Reports | Generate shader flowcharts or analysis reports in `.json` or `.txt` format | [flowchart.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/flowchart.js) |
| Color Adjustment Tools | Convert `vec3` / `vec4` values into RGB sliders for live color tuning | [color.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/color.js) |
| Code Formatting | Minify or format shader and JavaScript code instantly | [format.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/format.js) |
| Text Editor Tools | Context menu tools for line numbers, multi-edit, undo/redo, and numeric adjustments | [right.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/right.js) |
| GLSL Library Finder | Search and insert GLSL snippets from a server-hosted library | [find.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/utils/find.js) |
| WebRTC Collaboration | Real-time collaborative editing with remote shader compilation via Google STUN servers | [p2p.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/utils/p2p.js) |
| Texture Manager | Upload images and videos to combine on a single canvas | [media.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/media.js) |
| Media Effects | Apply JavaScript-driven GLSL effects directly to media | [effects.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/effects.js) |
| Quickload Animations | Navigate public animations with `P + ←/→` or local animations with `L + ←/→` | [shuffle.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/shuffle.js) |
| Mouse Interaction Support | Pass mouse movement and click data as uniforms for interactive shaders | [render.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/render.js) |
| GLSL Sandbox API Support | Premium feature to load shaders and previews from GLSL Sandbox via cached proxy | [glslsandbox.com](https://glslsandbox.com/), [api.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/utils/api.js), [proxy.php](https://github.com/composedbymax/Shader-Sandbox/blob/main/api/proxy.php) |
| AI OpenRouter Model Support | AI-assisted code edits and restructuring using free OpenRouter models | [openrouter.ai](https://openrouter.ai/), [ai.js](https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/utils/ai.js), [ai.php](https://github.com/composedbymax/Shader-Sandbox/blob/main/api/ai.php) |



---

## Core Technologies

- **WebGL**: Rendering the shader preview on canvas.
- **WebGPU**: Render WGSL animations.
- **HTML5 & CSS3**: Structuring the UI and ensuring responsiveness.
- **JavaScript**: Shader compilation, rendering, file handling, and UI logic.  
- **PHP**: APIs for public posting, authentication, p2p connections, and code snippet retrevial

---

## Browser Support

For full functionality, this application requires browsers/browser preferences that include:

- Javascript (for main app functionality)
- WebGL (for rendering)
- WebGPU (for rendering)
- File API (for file upload)  
- Fullscreen API (for fullscreen support)
- MediaRecorder API (for recording WebM/MP4 videos)
- Media Capture API (`navigator.mediaDevices.getUserMedia`) for microphone and internal audio input
- WebRTC API (for live collaboration features)

---

## Inspirations

- https://glslsandbox.com/  
- https://shadertoy.com/  
- https://glsl.app/  
- https://kaleidosync.com/

---

## License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.

You may use, modify, and distribute this software, but **any derivative work
must also be licensed under GPLv3 and remain open-source**.

See the [LICENSE file](https://github.com/composedbymax/Shader-Sandbox/blob/main/LICENSE) for full details.