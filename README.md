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

A browser-based GLSL (OpenGL Shading Language) editor for writing, testing, and exporting vertex and fragment shaders. This tool allows users to interactively build shaders and preview them in real-time using WebGL.

---

## Features

- **Real-Time Shader Preview**: Visualize your GLSL code on a canvas as you write.
- **Vertex & Fragment Shaders**: Edit vertex and fragment shaders in separate panels.
- **File Support**: Load and edit `.vert`, `.frag`, `.vs`, `.fs`, and `.txt` files.
- **Fullscreen Preview**: Toggle fullscreen mode for a larger preview area.
- **Export Options**: Export your shaders as `.vert` or `.frag` files, or generate a full HTML file to run your shaders externally.
- **Syntax Linting**: View error messages for syntax issues in your shaders.
- **Responsive Layout**: Adjustable editor layout with drag-and-drop resizing for the panels.

---

## Usage

1. **Open the HTML file in your browser.**
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

This application is built using HTML5, CSS, and JavaScript, relying on the WebGL API for rendering and shader compilation. It is designed to be a simple, client-side tool with no server-side dependencies.

---

## Core Technologies

- **WebGL**: Used for rendering the shader preview on the canvas.
- **HTML5 & CSS3**: Structuring the user interface and ensuring responsiveness.
- **JavaScript**: Handling shader compilation, rendering logic, and file handling.

---

## How It Works

- **Shader Compilation**: The vertex and fragment shader code is compiled using WebGL. Errors are displayed in the "lint" panel.
- **Real-Time Preview**: The shaders are rendered on a quad (2D plane) in real-time using WebGL's draw calls.
- **Export Functionality**: Shaders can be saved to `.txt`, `.vert`, `.frag` files, or exported as a complete HTML page for external use.

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
