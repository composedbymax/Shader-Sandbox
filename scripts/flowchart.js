(function() {
    'use strict';
    const flowchartCSS = `
        #flowchartWindow { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90vw; max-width: 1000px; height: 80vh; border-radius: 4px; z-index: 999999; display: none; flex-direction: column; }
        #flowchartWindow.show { display: flex; }
        .flowchart-header { background: var(--4); padding: 15px 20px; border-bottom: 1px solid var(--6); display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0; }
        .flowchart-header h3 { margin: 0; color: var(--7); font-size: 18px; }
        .flowchart-controls { display: flex; gap: 10px; align-items: center; }
        .flowchart-controls button { padding: 8px 15px; background: var(--a); color: var(--0); border: none; border-radius: 2px; cursor: pointer; font-size: 14px; }
        .flowchart-controls button:hover { background: var(--ah); }
        .flowchart-controls .close-btn { background: var(--r); margin-left: 10px; }
        .flowchart-controls .close-btn:hover { background: var(--rh); }
        .export-dropdown { position: relative; display: inline-block; }
        .export-dropdown-content { display: none; position: absolute; right: 0; background-color: var(--4); min-width: 120px; box-shadow: 0px 8px 16px rgba(0,0,0,0.2); z-index: 1; border-radius: 4px; overflow: hidden; }
        .export-dropdown-content button { display: block; width: 100%; text-align: left; padding: 8px 12px; border: none; background: var(--4); color: var(--7); cursor: pointer; font-size: 14px; }
        .export-dropdown-content button:hover { background: var(--5); }
        .export-dropdown.show .export-dropdown-content { display: block; }
        .flowchart-content { flex: 1; overflow: auto; display: flex; flex-direction: column; min-height: 0; }
        #flowchartSVG { flex: 1; width: 100%; background: var(--3); overflow: auto; min-height: 300px; }
        .flowchart-node { fill: var(--2); stroke: var(--3); stroke-width: 2px; filter: drop-shadow(2px 2px 4px var(--0)); cursor: pointer; }
        .flowchart-node:hover { stroke-width: 3px; filter: drop-shadow(3px 3px 6px var(--1)); }
        .flowchart-node.vertex { stroke: var(--a); }
        .flowchart-node.fragment { stroke: var(--m); }
        .flowchart-node.common { stroke: var(--b); }
        .flowchart-label { font-size: 11px; text-anchor: middle; dominant-baseline: middle; fill: var(--7); font-weight: 500; pointer-events: none; }
        .flowchart-line-number { font-size: 9px; text-anchor: middle; fill: var(--5); font-family: monospace; pointer-events: none; }
        .flowchart-arrow { stroke: var(--5); stroke-width: 2px; fill: none; marker-end: url(#flowchart-arrow-marker); }
        .flowchart-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--0); z-index: 99999; display: none; }
        .flowchart-overlay.show { display: block; }
        .flowchart-tooltip { position: absolute; background: var(--4); color: var(--7); padding: 8px 12px; border-radius: 4px; font-size: 12px; font-family: monospace; white-space: pre-wrap; max-width: 300px; z-index: 9999999; pointer-events: none; opacity: 0; transition: opacity 0.2s; }
        .flowchart-tooltip.show { opacity: 1; }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = flowchartCSS;
    document.head.appendChild(styleEl);
    let currentFlowchartData = null;
    const shaderPatterns = {
        vertex: {
            'Vertex Input': { pattern: /attribute\s+\w+\s+\w+|in\s+\w+\s+\w+/, priority: 1 },
            'Position Transform': { pattern: /gl_Position\s*=|mvp|modelViewProjection/, priority: 8 },
            'Vertex Output': { pattern: /varying\s+\w+\s+\w+|out\s+\w+\s+\w+/, priority: 7 },
            'Matrix Operations': { pattern: /mat[2-4]|transpose|inverse/, priority: 5 },
            'Vertex Lighting': { pattern: /dot\s*\(.*normal|reflect\s*\(/, priority: 6 }
        },
        fragment: {
            'Fragment Input': { pattern: /varying\s+\w+\s+\w+|in\s+\w+\s+\w+/, priority: 1 },
            'Screen Coordinates': { pattern: /gl_FragCoord/, priority: 2 },
            'UV Mapping': { pattern: /uv\s*=|texCoord/, priority: 2 },
            'Texture Sampling': { pattern: /texture2D|texture|sampler/, priority: 4 },
            'Coordinate Transform': { pattern: /atan|length|normalize/, priority: 3 },
            'Polar Coordinates': { pattern: /atan\s*\(|polar|radius|angle/, priority: 3 },
            'Mathematical Operations': { pattern: /mod\s*\(|fract\s*\(|step\s*\(/, priority: 5 },
            'Fractal Iteration': { pattern: /z\s*=\s*z.*\+|mandelbrot|julia/, priority: 6 },
            'Shape Functions': { pattern: /circle|rectangle|superformula|pow\s*\(/, priority: 5 },
            'Rotation': { pattern: /rot2|cos\s*\(.*sin\s*\(|rotation/, priority: 4 },
            'Time Animation': { pattern: /u_time|time|iTime/, priority: 3 },
            'Color Generation': { pattern: /vec3\s*\(.*,.*,.*\)|rgb|hsv/, priority: 7 },
            'Color Mixing': { pattern: /mix\s*\(|lerp\s*\(/, priority: 8 },
            'Lighting': { pattern: /dot\s*\(.*normal|specular|diffuse/, priority: 6 },
            'Distance Fields': { pattern: /length\s*\(|distance\s*\(|sdf/, priority: 5 },
            'Noise Functions': { pattern: /noise\s*\(|random\s*\(|perlin/, priority: 4 },
            'Fragment Output': { pattern: /gl_FragColor\s*=|FragColor\s*=/, priority: 9 }
        },
        common: {
            'Conditionals': { pattern: /if\s*\(|else|switch/, priority: 0 },
            'Loops': { pattern: /for\s*\(|while\s*\(/, priority: 0 },
            'Functions': { pattern: /\w+\s*\([^)]*\)\s*{/, priority: 0 },
            'Constants': { pattern: /const\s+\w+|#define/, priority: 0 },
            'Uniforms': { pattern: /uniform\s+\w+\s+\w+/, priority: 0 }
        }
    };
    function findPatternInCode(code, pattern) {
        const lines = code.split('\n');
        const matches = [];
        lines.forEach((line, index) => {
            if (pattern.test(line)) {
                matches.push({
                    lineNumber: index + 1,
                    lineContent: line.trim(),
                    match: line.match(pattern)?.[0] || ''
                });
            }
        });
        return matches;
    }
    function analyzeShaderCode(code, type) {
        const stages = [];
        const patterns = { ...shaderPatterns.common, ...shaderPatterns[type] };
        for (const [stageName, patternInfo] of Object.entries(patterns)) {
            const matches = findPatternInCode(code, patternInfo.pattern);
            if (matches.length > 0) {
                stages.push({
                    name: stageName,
                    type: type === 'vertex' ? 'vertex' : type === 'fragment' ? 'fragment' : 'common',
                    priority: patternInfo.priority || 0,
                    matches: matches
                });
            }
        }
        stages.sort((a, b) => a.priority - b.priority);
        return stages;
    }
    function createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'flowchart-tooltip';
        tooltip.id = 'flowchartTooltip';
        document.body.appendChild(tooltip);
        return tooltip;
    }
    function showTooltip(event, stage) {
        const tooltip = document.getElementById('flowchartTooltip') || createTooltip();
        let content = `${stage.name}\n\nFound on lines:\n`;
        stage.matches.forEach(match => {
            content += `Line ${match.lineNumber}: ${match.lineContent}\n`;
        });
        tooltip.textContent = content;
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        let left = event.pageX + 10;
        let top = event.pageY + 10;
        if (left + tooltipRect.width > viewportWidth) {
            left = event.pageX - tooltipRect.width - 10;
        }
        if (top + tooltipRect.height > viewportHeight) {
            top = event.pageY - tooltipRect.height - 10;
        }
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.classList.add('show');
    }
    function hideTooltip() {
        const tooltip = document.getElementById('flowchartTooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }
    function wrapText(text, maxWidth, fontSize = 9) {
        const words = text.split(/,\s*/);
        const lines = [];
        let currentLine = '';
        const charWidth = fontSize * 0.6;
        const maxChars = Math.floor(maxWidth / charWidth);
        for (let word of words) {
            if (currentLine.length + word.length + 2 <= maxChars) {
                if (currentLine) currentLine += ', ';
                currentLine += word;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }
    function createFlowchartSVG(vertexStages, fragmentStages) {
        const svg = document.getElementById('flowchartSVG');
        svg.innerHTML = '';
        const boxWidth = 200;
        const baseBoxHeight = 50;
        const gap = 15;
        const columnGap = 100;
        const topPadding = 50;
        const bottomPadding = 30;
        const lineHeight = 12;
        const calculateStageHeight = (stage) => {
            const lineNumbers = stage.matches.map(m => `L${m.lineNumber}`).join(', ');
            const wrappedLines = wrapText(lineNumbers, boxWidth - 20);
            return Math.max(baseBoxHeight, baseBoxHeight + (wrappedLines.length - 1) * lineHeight);
        };
        const vertexHeights = vertexStages.map(calculateStageHeight);
        const fragmentHeights = fragmentStages.map(calculateStageHeight);
        const totalVertexHeight = vertexHeights.reduce((sum, height) => sum + height + gap, 0) - gap;
        const totalFragmentHeight = fragmentHeights.reduce((sum, height) => sum + height + gap, 0) - gap;
        const maxContentHeight = Math.max(totalVertexHeight, totalFragmentHeight);
        const totalHeight = topPadding + maxContentHeight + bottomPadding;
        const totalWidth = boxWidth * 2 + columnGap + 50;
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', totalHeight);
        svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
        svg.style.minHeight = totalHeight + 'px';
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `
            <marker id="flowchart-arrow-marker" viewBox="0 0 10 10" refX="9" refY="3"
                    markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#666"/>
            </marker>
        `;
        svg.appendChild(defs);
        const vertexHeader = document.createElementNS("http://www.w3.org/2000/svg", "text");
        vertexHeader.setAttribute("x", boxWidth / 2 + 25);
        vertexHeader.setAttribute("y", 25);
        vertexHeader.setAttribute("class", "flowchart-label");
        vertexHeader.setAttribute("font-size", "16");
        vertexHeader.setAttribute("font-weight", "bold");
        vertexHeader.textContent = "Vertex Shader";
        svg.appendChild(vertexHeader);
        const fragmentHeader = document.createElementNS("http://www.w3.org/2000/svg", "text");
        fragmentHeader.setAttribute("x", boxWidth + columnGap + boxWidth / 2 + 25);
        fragmentHeader.setAttribute("y", 25);
        fragmentHeader.setAttribute("class", "flowchart-label");
        fragmentHeader.setAttribute("font-size", "16");
        fragmentHeader.setAttribute("font-weight", "bold");
        fragmentHeader.textContent = "Fragment Shader";
        svg.appendChild(fragmentHeader);
        let currentY = topPadding;
        vertexStages.forEach((stage, i) => {
            const boxHeight = vertexHeights[i];
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", 25);
            rect.setAttribute("y", currentY);
            rect.setAttribute("width", boxWidth);
            rect.setAttribute("height", boxHeight);
            rect.setAttribute("rx", 6);
            rect.setAttribute("class", `flowchart-node ${stage.type}`);
            rect.addEventListener('mouseenter', (e) => showTooltip(e, stage));
            rect.addEventListener('mouseleave', hideTooltip);
            rect.addEventListener('mousemove', (e) => {
                const tooltip = document.getElementById('flowchartTooltip');
                if (tooltip && tooltip.classList.contains('show')) {
                    showTooltip(e, stage);
                }
            });
            svg.appendChild(rect);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", 25 + boxWidth / 2);
            text.setAttribute("y", currentY + boxHeight / 2 - 10);
            text.setAttribute("class", "flowchart-label");
            text.textContent = stage.name;
            svg.appendChild(text);
            const lineNumbers = stage.matches.map(m => `L${m.lineNumber}`).join(', ');
            const wrappedLines = wrapText(lineNumbers, boxWidth - 20);
            wrappedLines.forEach((line, lineIndex) => {
                const lineText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                lineText.setAttribute("x", 25 + boxWidth / 2);
                lineText.setAttribute("y", currentY + boxHeight / 2 + 5 + (lineIndex * lineHeight));
                lineText.setAttribute("class", "flowchart-line-number");
                lineText.textContent = line;
                svg.appendChild(lineText);
            });
            if (i < vertexStages.length - 1) {
                const arrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
                arrow.setAttribute("x1", 25 + boxWidth / 2);
                arrow.setAttribute("y1", currentY + boxHeight);
                arrow.setAttribute("x2", 25 + boxWidth / 2);
                arrow.setAttribute("y2", currentY + boxHeight + gap);
                arrow.setAttribute("class", "flowchart-arrow");
                svg.appendChild(arrow);
            }
            currentY += boxHeight + gap;
        });
        currentY = topPadding;
        fragmentStages.forEach((stage, i) => {
            const boxHeight = fragmentHeights[i];
            const x = boxWidth + columnGap + 25;
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", x);
            rect.setAttribute("y", currentY);
            rect.setAttribute("width", boxWidth);
            rect.setAttribute("height", boxHeight);
            rect.setAttribute("rx", 6);
            rect.setAttribute("class", `flowchart-node ${stage.type}`);
            rect.addEventListener('mouseenter', (e) => showTooltip(e, stage));
            rect.addEventListener('mouseleave', hideTooltip);
            rect.addEventListener('mousemove', (e) => {
                const tooltip = document.getElementById('flowchartTooltip');
                if (tooltip && tooltip.classList.contains('show')) {
                    showTooltip(e, stage);
                }
            });
            svg.appendChild(rect);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x + boxWidth / 2);
            text.setAttribute("y", currentY + boxHeight / 2 - 10);
            text.setAttribute("class", "flowchart-label");
            text.textContent = stage.name;
            svg.appendChild(text);
            const lineNumbers = stage.matches.map(m => `L${m.lineNumber}`).join(', ');
            const wrappedLines = wrapText(lineNumbers, boxWidth - 20);
            wrappedLines.forEach((line, lineIndex) => {
                const lineText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                lineText.setAttribute("x", x + boxWidth / 2);
                lineText.setAttribute("y", currentY + boxHeight / 2 + 5 + (lineIndex * lineHeight));
                lineText.setAttribute("class", "flowchart-line-number");
                lineText.textContent = line;
                svg.appendChild(lineText);
            });
            if (i < fragmentStages.length - 1) {
                const arrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
                arrow.setAttribute("x1", x + boxWidth / 2);
                arrow.setAttribute("y1", currentY + boxHeight);
                arrow.setAttribute("x2", x + boxWidth / 2);
                arrow.setAttribute("y2", currentY + boxHeight + gap);
                arrow.setAttribute("class", "flowchart-arrow");
                svg.appendChild(arrow);
            }
            currentY += boxHeight + gap;
        });
        if (vertexStages.length > 0 && fragmentStages.length > 0) {
            const vertexEndY = topPadding + totalVertexHeight / 2;
            const fragmentStartY = topPadding + fragmentHeights[0] / 2;
            const midY = Math.max(vertexEndY, fragmentStartY);
            const connector = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const startX = 25 + boxWidth;
            const endX = boxWidth + columnGap + 25;
            connector.setAttribute("d", `M ${startX} ${midY} L ${endX} ${midY}`);
            connector.setAttribute("class", "flowchart-arrow");
            connector.setAttribute("stroke-dasharray", "5,5");
            svg.appendChild(connector);
        }
    }
    function generateFlowchart() {
        const vert = document.getElementById('vertCode')?.value || '';
        const frag = document.getElementById('fragCode')?.value || '';
        const vStages = analyzeShaderCode(vert, 'vertex');
        const fStages = analyzeShaderCode(frag, 'fragment');
        currentFlowchartData = { vertexStages: vStages, fragmentStages: fStages, vertexCode: vert, fragmentCode: frag, timestamp: new Date().toISOString() };
        createFlowchartSVG(vStages, fStages);
    }
    function exportAsPNG() {
        const svg = document.getElementById('flowchartSVG');
        if (!svg) return;
        const svgClone = svg.cloneNode(true);
        const computedStyle = window.getComputedStyle(document.documentElement);
        const cssVarMap = {
            '--0': 'rgba(0,0,0,0.3)',
            '--1': 'rgba(0,0,0,0.1)',
            '--2': '#1a1a1a',
            '--3': '#333333',
            '--4': '#2a2a2a',
            '--5': '#666666',
            '--6': '#444444',
            '--7': '#ffffff',
            '--a': '#4a9eff',
            '--b': '#ff6b6b',
            '--m': '#ff9f43',
            '--r': '#ee5a52',
            '--ah': '#357abd',
            '--rh': '#d63031'
        };
        function resolveCSSVars(element) {
            ['fill', 'stroke'].forEach(attr => {
                const value = element.getAttribute(attr);
                if (value && value.startsWith('var(')) {
                    const varName = value.match(/var\((--[^)]+)\)/)?.[1];
                    if (varName && cssVarMap[varName]) {
                        element.setAttribute(attr, cssVarMap[varName]);
                    }
                }
            });
            const style = element.getAttribute('style');
            if (style) {
                let newStyle = style;
                Object.entries(cssVarMap).forEach(([varName, value]) => {
                    newStyle = newStyle.replace(new RegExp(`var\\(${varName}\\)`, 'g'), value);
                });
                element.setAttribute('style', newStyle);
            }
            Array.from(element.children).forEach(child => resolveCSSVars(child));
        }
        resolveCSSVars(svgClone);
        const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
        styleElement.textContent = `
            .flowchart-node { fill: #1a1a1a; stroke: #333333; stroke-width: 2px; }
            .flowchart-node.vertex { fill: #1a1a1a; stroke: #4a9eff; }
            .flowchart-node.fragment { fill: #1a1a1a; stroke: #ff9f43; }
            .flowchart-node.common { fill: #1a1a1a; stroke: #ff6b6b; }
            .flowchart-label { font-family: Arial, sans-serif; fill: #ffffff; text-anchor: middle; dominant-baseline: middle; }
            .flowchart-line-number { font-family: monospace; fill: #666666; text-anchor: middle; }
            .flowchart-arrow { stroke: #666666; stroke-width: 2px; fill: none; }
        `;
        svgClone.insertBefore(styleElement, svgClone.firstChild);
        const defs = svgClone.querySelector('defs');
        if (defs) {
            const marker = defs.querySelector('#flowchart-arrow-marker path');
            if (marker) {
                marker.setAttribute('fill', '#666666');
            }
        }
        const rect = svg.getBoundingClientRect();
        svgClone.setAttribute('width', rect.width);
        svgClone.setAttribute('height', rect.height);
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const scale = 2;
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        img.onload = function() {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(function(blob) {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'glsl-flowchart.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }
            }, 'image/png');
            URL.revokeObjectURL(img.src);
        };
        img.onerror = function() {
            console.error('Failed to load SVG for PNG conversion');
            alert('Failed to export PNG. Try the SVG export instead.');
            URL.revokeObjectURL(img.src);
        };
        const url = URL.createObjectURL(svgBlob);
        img.src = url;
    }
    function exportAsJSON() {
        if (!currentFlowchartData) {
            alert('Please generate a flowchart first');
            return;
        }
        const jsonData = JSON.stringify(currentFlowchartData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'glsl-flowchart.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    function exportAsTXT() {
        if (!currentFlowchartData) {
            alert('Please generate a flowchart first');
            return;
        }
        let txtContent = `GLSL Shader Flowchart Analysis\n`;
        txtContent += `Generated: ${currentFlowchartData.timestamp}\n\n`;
        txtContent += `=== VERTEX SHADER STAGES ===\n`;
        currentFlowchartData.vertexStages.forEach((stage, i) => {
            txtContent += `\n${i + 1}. ${stage.name} (${stage.type})\n`;
            txtContent += `   Priority: ${stage.priority}\n`;
            txtContent += `   Found on lines:\n`;
            stage.matches.forEach(match => {
                txtContent += `     Line ${match.lineNumber}: ${match.lineContent}\n`;
            });
        });
        txtContent += `\n=== FRAGMENT SHADER STAGES ===\n`;
        currentFlowchartData.fragmentStages.forEach((stage, i) => {
            txtContent += `\n${i + 1}. ${stage.name} (${stage.type})\n`;
            txtContent += `   Priority: ${stage.priority}\n`;
            txtContent += `   Found on lines:\n`;
            stage.matches.forEach(match => {
                txtContent += `     Line ${match.lineNumber}: ${match.lineContent}\n`;
            });
        });
        txtContent += `\n=== ORIGINAL CODE ===\n\n`;
        txtContent += `--- Vertex Shader ---\n${currentFlowchartData.vertexCode}\n\n`;
        txtContent += `--- Fragment Shader ---\n${currentFlowchartData.fragmentCode}\n`;
        const blob = new Blob([txtContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'glsl-flowchart.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    function toggleExportDropdown() {
        const dropdown = document.getElementById('exportDropdown');
        dropdown.classList.toggle('show');
    }
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('exportDropdown');
        if (dropdown && !dropdown.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
    function openFlowchartWindow() {
        document.getElementById('flowchartOverlay').classList.add('show');
        document.getElementById('flowchartWindow').classList.add('show');
        generateFlowchart();
    }
    function closeFlowchartWindow() {
        document.getElementById('flowchartOverlay').classList.remove('show');
        document.getElementById('flowchartWindow').classList.remove('show');
        hideTooltip();
    }
    function createFlowchartWindow() {
        const overlay = document.createElement('div');
        overlay.id = 'flowchartOverlay';
        overlay.className = 'flowchart-overlay';
        overlay.addEventListener('click', closeFlowchartWindow);
        const windowDiv = document.createElement('div');
        windowDiv.id = 'flowchartWindow';
        windowDiv.innerHTML = `
            <div class="flowchart-header">
                <h3>Flowchart <span style="font-size:12px;color:var(--a)">(Hover nodes for details)</span></h3>
                <div class="flowchart-controls">
                    <div class="export-dropdown" id="exportDropdown">
                        <button onclick="glslFlowchart.toggleExport()">Export ▼</button>
                        <div class="export-dropdown-content">
                            <button onclick="glslFlowchart.exportPNG()">PNG Image</button>
                            <button onclick="glslFlowchart.exportJSON()">JSON Data</button>
                            <button onclick="glslFlowchart.exportTXT()">Text Report</button>
                        </div>
                    </div>
                    <button class="close-btn" onclick="glslFlowchart.close()">Close</button>
                </div>
            </div>
            <div class="flowchart-content">
                <svg id="flowchartSVG"></svg>
            </div>
        `;
        windowDiv.addEventListener('click', e => e.stopPropagation());
        document.body.appendChild(overlay);
        document.body.appendChild(windowDiv);
    }
    function setupKeyboardListener() {
        document.addEventListener('keydown', e => {
            if (e.shiftKey && e.key === 'V') {
                e.preventDefault();
                const win = document.getElementById('flowchartWindow');
                if (win.classList.contains('show')) closeFlowchartWindow();
                else openFlowchartWindow();
            }
            if (e.key === 'Escape' && document.getElementById('flowchartWindow').classList.contains('show')) {
                closeFlowchartWindow();
            }
        });
    }
    window.glslFlowchart = {
        open: openFlowchartWindow,
        close: closeFlowchartWindow,
        exportPNG: exportAsPNG,
        exportJSON: exportAsJSON,
        exportTXT: exportAsTXT,
        toggleExport: toggleExportDropdown
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createFlowchartWindow();
            setupKeyboardListener();
        });
    } else {
        createFlowchartWindow();
        setupKeyboardListener();
        document.addEventListener('fullscreenchange', () => {
            const overlay = document.getElementById('flowchartOverlay');
            const win     = document.getElementById('flowchartWindow');
            if (document.fullscreenElement) {
                document.fullscreenElement.appendChild(overlay);
                document.fullscreenElement.appendChild(win);
            } else {
                document.body.appendChild(overlay);
                document.body.appendChild(win);
            }
        });
    }
})();