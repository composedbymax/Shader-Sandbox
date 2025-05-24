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

A browser-based GLSL (OpenGL Shading Language) editor for writing, testing, recording and exporting or loading vertex and fragment shaders or standalone .html animations. Users can interactively build shaders and preview them in real-time using WebGL.

---

## Features

- **Real-Time Shader Preview**: Visualize your GLSL code on a canvas as you write.
- **Vertex & Fragment Shaders**: Edit vertex and fragment shaders in separate panels.
- **File Support**: Load and edit `.vert`, `.frag`, `.vs`, `.fs`, and `.txt` files.
- **Fullscreen Preview**: Toggle fullscreen mode for a larger preview area.
- **Export Options**: Export your shaders as `.vert` or `.frag` files, or generate a full HTML file to run your shaders externally.
- **Record Webm/MP4**: Record your animaiton as a video file for easy sharing.
- **Runtime Metrics**: Monitors WebGL canvas performance by tracking FPS, memory usage, GPU details, and draw calls.
- **Syntax Linting**: View error messages for syntax issues in your shaders.
- **Responsive Layout**: Adjustable editor layout with drag-and-drop resizing for the panels.

---

## Usage

1. **Run With MAMP or Similar PHP Local Server Equivalent**
2. **Edit Shaders:**
   - Write your vertex and fragment shaders directly in the provided text areas.
   - Alternatively, load shader files by clicking on the "Choose File" buttons or dragging files into the text areas.
3. **Preview Shader:**
   - The real-time preview will automatically update as you modify the code.
4. **Fullscreen Mode:**
   - Click the fullscreen button (⛶) to expand the preview to full screen.
5. **Export Shaders:**
   - Click the "Export" button in the shader panels to save individual vertex or fragment shader files.
   - Click "Export Full" to generate an HTML file that includes your shader code.

---

## Development

This application is built using PHP, HTML5, CSS, and JavaScript, relying on the WebGL API for rendering and shader compilation. It is designed to be a simple, client-side tool with no server-side dependencies, external frameworks or libraries.

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

**Supported browsers include:**

- Chrome 47+
- Firefox 36+
- Edge 79+
- Safari 13+

---

## Limitations

- Requires a modern WebGL-capable browser.
- Some older browsers may not support full-screen functionality or WebGL.




## Future Updates

- base64 images are large and should be saved and accessed from the best place to put them (local storage, indexedDB, possibly session storage), 

only fetch the base64+name preview list from fetch.php on initial fetch (first time user hits 'public' button)
then on subsequent times, it should be accessed from where its saved via the browser

the exception is if the operating user saves something publicly, then it should fetch the preview list fresh