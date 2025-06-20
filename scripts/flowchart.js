(function() {
    'use strict';
    const flowchartCSS = `
        #flowchartWindow{position: fixed;top: 50%;left: 50%;transform: translate(-50%, -50%);width: 90vw;max-width: 1000px;height: 80vh;border-radius: 4px;z-index: 999999;display: none;flex-direction: column;}
        #flowchartWindow.show{display: flex;}
        .flowchart-header{background: var(--4);padding: 15px 20px;border-bottom: 1px solid var(--6);display: flex;justify-content: space-between;align-items: center;border-radius: 4px 4px 0 0;}
        .flowchart-header h3{margin: 0;color: var(--7);font-size: 18px;}
        .flowchart-controls{display: flex;gap: 10px;align-items: center;}
        .flowchart-controls button{padding: 8px 15px;background: var(--a);color: var(--0);border: none;border-radius: 2px;cursor: pointer;font-size: 14px;}
        .flowchart-controls button:hover{background: var(--ah);}
        .flowchart-controls .close-btn{background: var(--r);margin-left: 10px;}
        .flowchart-controls .close-btn:hover{background: var(--rh);}
        .flowchart-content{flex: 1;overflow: auto;display: flex;flex-direction: column;min-height: 0;}
        #flowchartSVG{flex: 1;width: 100%;background: var(--3);overflow: auto;min-height: 300px;}
        .flowchart-node{fill: var(--2);stroke: var(--3);stroke-width: 2px;filter: drop-shadow(2px 2px 4px var(--0));cursor: pointer;}
        .flowchart-node:hover{stroke-width: 3px;filter: drop-shadow(3px 3px 6px var(--1));}
        .flowchart-node.vertex{fill: var(--2);stroke: var(--a);}
        .flowchart-node.fragment{fill: var(--2);stroke: var(--m);}
        .flowchart-node.common{fill: var(--2);stroke: var(--b);}
        .flowchart-label{font-size: 11px;text-anchor: middle;dominant-baseline: middle;fill: var(--7);font-weight: 500;pointer-events: none;}
        .flowchart-line-number{font-size: 9px;text-anchor: middle;fill: var(--5);font-family: monospace;pointer-events: none;}
        .flowchart-arrow{stroke: var(--5);stroke-width: 2px;fill: none;marker-end: url(#flowchart-arrow-marker);}
        .flowchart-overlay{position: fixed;top: 0;left: 0;width: 100%;height: 100%;background: var(--0);z-index: 99999;display: none;}
        .flowchart-overlay.show{display: block;}
        .flowchart-tooltip{position: absolute;background: var(--4);color: var(--7);padding: 8px 12px;border-radius: 4px;font-size: 12px;font-family: monospace;white-space: pre-wrap;max-width: 300px;z-index: 9999999;pointer-events: none;opacity: 0;transition: opacity 0.2s;}
        .flowchart-tooltip.show{opacity: 1;}
    `;
    const style = document.createElement('style');
    style.textContent = flowchartCSS;
    document.head.appendChild(style);
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
        const vertexCode = document.getElementById('vertCode')?.value || '';
        const fragmentCode = document.getElementById('fragCode')?.value || '';
        const vertexStages = analyzeShaderCode(vertexCode, 'vertex');
        const fragmentStages = analyzeShaderCode(fragmentCode, 'fragment');
        createFlowchartSVG(vertexStages, fragmentStages);
    }
    function exportFlowchart() {
        const svg = document.getElementById('flowchartSVG');
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'flowchart.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
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
                <h3>Flowchart <span style="font-size: 12px; color: var(--a);">(Hover nodes for details)</span></h3>
                <div class="flowchart-controls">
                    <button onclick="glslFlowchart.generate()">Regenerate</button>
                    <button onclick="glslFlowchart.export()">Export SVG</button>
                    <button class="close-btn" onclick="glslFlowchart.close()">Close</button>
                </div>
            </div>
            <div class="flowchart-content">
                <svg id="flowchartSVG"></svg>
            </div>
        `;
        windowDiv.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        document.body.appendChild(overlay);
        document.body.appendChild(windowDiv);
    }
    function setupKeyboardListener() {
        document.addEventListener('keydown', function(e) {
            if (e.shiftKey && e.key === 'V') {
                e.preventDefault();
                const isVisible = document.getElementById('flowchartWindow').classList.contains('show');
                if (isVisible) {
                    closeFlowchartWindow();
                } else {
                    openFlowchartWindow();
                }
            }
            if (e.key === 'Escape' && document.getElementById('flowchartWindow').classList.contains('show')) {
                closeFlowchartWindow();
            }
        });
    }
    window.glslFlowchart = {
        open: openFlowchartWindow,
        close: closeFlowchartWindow,
        generate: generateFlowchart,
        export: exportFlowchart
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            createFlowchartWindow();
            setupKeyboardListener();
        });
    } else {
        createFlowchartWindow();
        setupKeyboardListener();
    }
})();