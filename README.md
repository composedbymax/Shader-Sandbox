```
   _____ _   ______ _
  / ____| | / ____ | |
 | |  __| || (___  | |
 | | |_ | | \__  \ | |
 | |__| | |____) | | |___ 
  \_____|_______/  |_____|
                            
       G   L   S   L 

```

# GLSL Editor - Max Warren

A browser-based GLSL (OpenGL Shading Language) editor for writing, testing, recording, and exporting or loading vertex and fragment shaders, as well as standalone .html animations. Users can interactively build shaders and preview them in real time using WebGL.

[Go to App](https://max.wuaze.com/glsl)

---

## Purpose

While there are several WebGL, GLSL, and Three.js coding sandboxes available, I struggled to find audio-reactive capabilities within a web-based GLSL editor. It was also difficult to find existing tools that allow for clean WebGL animation exports in common video formats like MP4.

This application was developed to address those limitations. It provides a browser-based, open-source editor intended for users who need more control when creating audio-reactive visuals, without relying on proprietary software or paid platforms.

---

## Development

This application is built entirely with native PHP, HTML5, CSS, and JavaScript. It uses the WebGL API directly for rendering and shader compilation, without relying on any third-party libraries or frameworks. Aside from minimal server-side functionality for public posting and list retrieval via PHP endpoints, the entire application runs client-side.

---

## Features

- **Real-Time Shader Preview**: Visualize your GLSL code on a canvas as you write.
- **Vertex & Fragment Shaders**: Edit vertex and fragment shaders in separate panels.
- **File Support**: Load and edit `.vert`, `.frag`, `.vs`, `.fs`, and `.txt` files, including full HTML animations.
- **Fullscreen Preview**: Toggle fullscreen mode for a larger preview area.
- **Load & Export Options**: Load or export shaders as `.vert` or `.frag` files, or generate a full HTML file to run your shaders externally.
- **Record WebM/MP4**: Record and preview your animation as a video file including audio, with adjustable dimensions and quality.
- **Audio Reactive Support**: React animations to microphone input, internal system audio, or uploaded audio files, with adjustable sensitivity and separated frequency bands.
- **Runtime Metrics**: Monitor WebGL canvas performance by tracking FPS, memory usage, GPU details, and draw calls.
- **Syntax Linting**: View and copy error messages with line numbers to catch syntax issues.
- **Responsive Layout**: Adjustable editor layout with drag-and-drop resizing for the panels.
- **Generative Reports**: Generate flowchart visualizations or reports (`.json` or `.txt`) for shader analysis and export.
- **Color Adjustment**: Use a modal slider to convert vec3/vec4 values into RGB sliders for real-time color control.
- **Theme Manager**: Customize editor colors with presets or individual color variables.  
- **Code Formatting**: Minify or format your code easily.
- **Text Editor Tools**: Context menu via right-click or mobile long-hold for line numbering, change all occurrences, undo/redo, etc.
- **GLSL Library Finder**: Search and insert code snippets from a server-hosted GLSL snippet library by keyword.
- **Flowchart Modal**: Visualize shader code flow with exportable PNG, JSON, or TXT packages.
- **WebRTC Collaboration**: Real-time text editor collaboration and animation sharing using Google STUN servers.
- **Image Editor**: Apply custom JavaScript GLSL effects to images inside the editor.
- **Hotkeys**: Navigate public animations with P + ←/→ or switch local animations using L + ←/→ .
- **Mouse Support**: Mouse movement uniforms to influence animation interactively.
- **Public Shader Gallery**: Browse, save publicly or locally (via server or IndexedDB).
- **Share Links**: Compress shader code into shareable URLs without requiring server storage.

---

## Core Technologies

- **WebGL**: Rendering the shader preview on canvas.  
- **HTML5 & CSS3**: Structuring the UI and ensuring responsiveness.  
- **JavaScript**: Shader compilation, rendering, file handling, and UI logic.  
- **PHP**: APIs for public posting, authentication, p2p connections, and code snippet retrevial

---

## Browser Support

For full functionality, this application requires browsers that support:

- WebGL (for rendering)  
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