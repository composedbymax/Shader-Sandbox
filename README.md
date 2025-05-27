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

---

## Development

This application is built entirely with native PHP, HTML5, CSS, and JavaScript. It uses the WebGL API directly for rendering and shader compilation, without relying on any third-party libraries or frameworks. Aside from minimal server-side functionality for public posting and list retrieval via PHP endpoints, the entire application runs client-side.

---

## Features

- **Real-Time Shader Preview**: Visualize your GLSL code on a canvas as you write.  
- **Vertex & Fragment Shaders**: Edit vertex and fragment shaders in separate panels.  
- **File Support**: Load and edit `.vert`, `.frag`, `.vs`, `.fs`, and `.txt` files.  
- **Fullscreen Preview**: Toggle fullscreen mode for a larger preview area.  
- **Load & Export Options**: Load or export shaders as `.vert` or `.frag` files, or generate a full HTML file to run your shaders externally.  
- **Record WebM/MP4**: Record and preview your animation as a video file for easy sharing (MP4 or WEBM).  
- **Audio Reactive Support**: Make your animations react to mic input, internal system audio, or uploaded audio files, with adjustable levels.
- **Runtime Metrics**: Monitor WebGL canvas performance by tracking FPS, memory usage, GPU details, and draw calls.
- **Syntax Linting**: View error messages for syntax issues in your shaders.  
- **Responsive Layout**: Adjustable editor layout with drag-and-drop resizing for the panels.

---

## Core Technologies

- **WebGL**: Used for rendering the shader preview on the canvas.
- **HTML5 & CSS3**: Structuring the user interface and ensuring responsiveness.
- **JavaScript**: Handling shader compilation, rendering logic, and file handling.
- **PHP**: File Saving/Auth for Public Posting.
---

## Browser Support

This application requires browsers that support:

- WebGL (for rendering)
- File API (for file upload)
- Fullscreen API (for fullscreen support)
- MediaRecorder API (for recording WebM/MP4 videos)
- Media Capture API (navigator.mediaDevices.getUserMedia) for microphone and internal audio input

**Supported browsers include:**

- Chrome 47+
- Firefox 36+
- Edge 79+
- Safari 13+

---

## Limitations

- Requires a modern WebGL-capable browser.
- Some older/mobile browsers may not support full-screen functionality or WebGL.