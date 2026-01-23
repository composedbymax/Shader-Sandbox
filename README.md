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

| Feature | Description | Source / URL |
|--------|------------|--------------|
| Real-Time GLSL Sandbox | Visualize GLSL fragment and vertex shaders live as you edit code. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/render.js |
| Real-Time WebGPU Sandbox | Live preview and editing of WebGPU shader pipelines. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/gpu.js |
| Real-Time JavaScript Sandbox | Execute and visualize JavaScript code in real time. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/js.js |
| Syntax Linting | Displays syntax errors with line numbers for quick debugging. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/syntax.js |
| Responsive Layout | Adjustable editor panels with drag-and-drop resizing. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/render.js |
| Public Shader Gallery | Browse, save, and load shaders publicly or locally via server or IndexedDB. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/save.js, https://github.com/composedbymax/Shader-Sandbox/blob/main/api/load.php, https://github.com/composedbymax/Shader-Sandbox/blob/main/api/save.php |
| Share Links | Compress shaders into shareable URLs; premium users can store and share short DB-backed strings. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/link.js, https://github.com/composedbymax/Shader-Sandbox/blob/main/api/link.php |
| File Upload & Export | Import and export `.vert`, `.frag`, `.vs`, `.fs`, `.txt`, `html`, `obj`, `ply`, `stl`, `off`, `mp3`, `mp4`, `wav`, `jpeg`, `png`, `heic`. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/drop.js |
| Record WebM / MP4 | Record animations (with audio) as video files with configurable quality and dimensions. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/recorder.js |
| Audio Reactive Support | Drive shader animations using microphone input, system audio, or uploaded audio files with frequency band separation. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/audio.js |
| Runtime Metrics | Monitor FPS, memory usage, GPU info, and draw calls in real time. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/performance.js |
| Autosave | Automatically saves editor code to IndexedDB every 30 seconds using a Web Worker, ensuring progress is preserved | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/utils/autosave.js |
| Theme Manager | Customize editor themes using presets or individual CSS variables. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/theme.js |
| Generative Reports | Generate shader flowcharts or analysis reports in `.json` or `.txt` format. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/flowchart.js |
| Color Adjustment Tools | Convert `vec3` / `vec4` values into RGB sliders for live color tuning. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/color.js |
| Code Formatting | Minify or format shader and JavaScript code instantly. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/format.js |
| Text Editor Tools | Context menu tools for line numbers, multi-edit, undo/redo, and numeric adjustments. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/right.js |
| GLSL Library Finder | Search and insert GLSL snippets from a server-hosted library. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/utils/find.js |
| WebRTC Collaboration | Real-time collaborative editing with remote shader compilation via Google STUN servers. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/utils/p2p.js |
| Image Editor | Apply JavaScript-driven GLSL effects directly to media. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/media.js |
| Quickload Animations | Navigate public animations with `P + ←/→` or local animations with `L + ←/→`. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/shuffle.js |
| Mouse Interaction Support | Pass mouse movement and click data as uniforms for interactive shaders. | https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/render.js |
| GLSL Sandbox API Support | Premium feature to load shaders and previews from GLSL Sandbox via cached proxy. | https://glslsandbox.com/, https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/utils/api.js, https://github.com/composedbymax/Shader-Sandbox/blob/main/api/proxy.php |
| AI OpenRouter Model Support | AI-assisted code edits and restructuring using free OpenRouter models. | https://openrouter.ai/, https://github.com/composedbymax/Shader-Sandbox/blob/main/scripts/utils/ai.js, https://github.com/composedbymax/Shader-Sandbox/blob/main/api/ai.php |


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

See the LICENSE file for full details.