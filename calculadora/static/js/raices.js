// RAÍCES DE ECUACIONES — Lineal Tanix
// Módulo JS: editor matemático, gráfica interactiva Canvas, selección de
// intervalos con marcadores arrastrables y cálculo de raíces.
//
// REGLA ESTRICTA: Antes de calcular la gráfica es 100% exploratoria.
// Los marcadores de raíz y resultados solo aparecen DESPUÉS de una
// respuesta exitosa del backend.  Si se muta función/método/límites
// se limpian inmediatamente marcadores y resultados previos.
//
// SEGURIDAD: No se usa eval() ni new Function() en frontend.
// El parseo y evaluación de la función se hace en el backend vía fetch.
// En frontend solo se parsea para la vista previa (highlighting).

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // =========================================
    // REFERENCIAS DOM
    // =========================================
    const funcionInput = document.getElementById('raices-funcion-raw');
    const previewRender = document.getElementById('math-preview-render');
    const metodoSelect = document.getElementById('raices-metodo');
    const errorInput = document.getElementById('raices-error');
    const maxIterInput = document.getElementById('raices-maxiter');
    const alertBox = document.getElementById('raices-alert');
    const warningBox = document.getElementById('raices-warning');
    const resultsContainer = document.getElementById('raices-results');
    const submitBtn = document.getElementById('raices-submit');

    // Contenedores de parámetros dinámicos
    const paramsCerrados = document.getElementById('raices-params-cerrados');
    const paramsNewton = document.getElementById('raices-params-newton');
    const paramsSecante = document.getElementById('raices-params-secante');
    const buscarLimitesWrap = document.getElementById('buscar-limites-wrapper');
    const buscarLimitesBtn = document.getElementById('buscar-limites-btn');
    const candidatosContainer = document.getElementById('candidatos-container');
    const intervaloStatus = document.getElementById('intervalo-status');
    const limitesTitulo = document.getElementById('limites-titulo');

    // Inputs específicos
    const xlInput = document.getElementById('raices-xl');
    const xuInput = document.getElementById('raices-xu');
    const x0NewtonInput = document.getElementById('raices-x0-newton');
    const xm1Input = document.getElementById('raices-xm1');
    const x0SecanteInput = document.getElementById('raices-x0-secante');

    // Gráfica
    const canvas = document.getElementById('graph-canvas');
    const ctx = canvas.getContext('2d');
    const graphCoords = document.getElementById('graph-coords');
    const graphStatus = document.getElementById('graph-status');
    const zoomInBtn = document.getElementById('graph-zoom-in');
    const zoomOutBtn = document.getElementById('graph-zoom-out');
    const resetBtn = document.getElementById('graph-reset');

    // =========================================
    // ESTADO
    // =========================================
    let revision = 0;             // Invalidation counter
    let graphData = null;         // {puntos: [{x,y},...]}
    let rootResult = null;        // Resultado del backend (post-cálculo)
    let debounceTimer = null;
    let fetchAbort = null;        // AbortController para fetch de gráfica

    let validacionAbort = null, limitesAbort = null, calculoAbort = null, compararAbort = null;
    let graficaPeticion = 0, validacionPeticion = 0, limitesPeticion = 0;
    let ultimoResultado = null, ultimaComparacion = null;
    const compararBtn = document.getElementById('tanix-comparar');
    const comparacionResultados = document.getElementById('tanix-comparacion-resultados');

    // Vista de la gráfica (coordenadas matemáticas)
    let viewXMin = -10, viewXMax = 10;
    let viewYMin = -10, viewYMax = 10;

    // Estado de interacción con la gráfica
    let isDragging = false;
    let dragStartMouse = null;    // {x, y} en px
    let dragStartView = null;     // {xMin, xMax, yMin, yMax}
    let draggingMarker = null;    // 'xl' | 'xu' | 'x0' | 'xm1' | null

    // Marcadores en eje X (posiciones matemáticas)
    const MARKER_SNAP_PX = 14;   // px de tolerancia para agarrar marcador

    // =========================================
    // UTILIDADES DE UI
    // =========================================
    function invalidarResultado() {
        revision += 1;
        Tanix.invalidar();
        [validacionAbort, limitesAbort, calculoAbort, compararAbort].forEach(c => c?.abort());
        ultimoResultado = null; ultimaComparacion = null;
        comparacionResultados.replaceChildren();
        rootResult = null;
        alertBox.classList.add('hidden');
        warningBox.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
        candidatosContainer.classList.add('hidden');
        candidatosContainer.innerHTML = '';
        intervaloStatus.classList.add('hidden');
        dibujarGrafica();
    }

    function mostrarError(msg) {
        alertBox.textContent = msg;
        alertBox.className = 'alert alert--error';
        alertBox.classList.remove('hidden');
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => alertBox.classList.add('hidden'), 10000);
    }

    function mostrarWarning(msg) {
        warningBox.textContent = msg;
        warningBox.className = 'alert alert--warning';
        warningBox.classList.remove('hidden');
    }

    // =========================================
    // VISTA PREVIA DEL EDITOR MATEMÁTICO
    // =========================================
    function renderizarPreview(expr) {
        if (!expr.trim()) {
            previewRender.innerHTML = '<span style="color:var(--text-muted)">Escribe una función…</span>';
            return;
        }

        // Normalizar ecuación para preview
        let display = expr;
        if (expr.includes('=')) {
            const parts = expr.split('=', 2);
            display = parts[0].trim() + ' − (' + parts[1].trim() + ')';
        }

        // Syntax highlighting (seguro, solo presentación)
        let html = '';
        const funcNames = ['sin', 'cos', 'tan', 'exp', 'ln', 'log', 'sqrt', 'abs'];
        const funcSet = new Set(funcNames);
        let i = 0;
        while (i < display.length) {
            const ch = display[i];

            // Funciones
            let matched = false;
            for (const fn of funcNames) {
                if (display.substring(i, i + fn.length) === fn &&
                    (i + fn.length >= display.length || !display[i + fn.length].match(/[a-zA-Z_]/))) {
                    html += `<span class="eq-fn">${fn}</span>`;
                    i += fn.length;
                    matched = true;
                    break;
                }
            }
            if (matched) continue;

            // Constantes pi, e
            if (display.substring(i, i + 2).toLowerCase() === 'pi' &&
                (i + 2 >= display.length || !display[i + 2].match(/[a-zA-Z_]/))) {
                html += '<span class="eq-fn">π</span>';
                i += 2;
                continue;
            }

            // Operadores
            if ('+-*/'.includes(ch)) {
                html += `<span class="eq-op">${ch === '*' ? '·' : ch}</span>`;
                i++;
                continue;
            }
            if (ch === '^') {
                html += '<span class="eq-op">^</span>';
                i++;
                continue;
            }
            // Variable
            if (ch === 'x' || ch === 'X') {
                if (i > 0 && display[i - 1].match(/[a-zA-Z_]/)) {
                    html += escapeHtml(ch);
                } else if (i + 1 < display.length && display[i + 1].match(/[a-zA-Z_]/)) {
                    html += escapeHtml(ch);
                } else {
                    html += '<strong>x</strong>';
                }
                i++;
                continue;
            }
            // Números
            if (ch.match(/[0-9.]/)) {
                let num = '';
                while (i < display.length && display[i].match(/[0-9.]/)) {
                    num += display[i];
                    i++;
                }
                html += `<span class="eq-num">${num}</span>`;
                continue;
            }
            // Default
            html += escapeHtml(ch);
            i++;
        }

        previewRender.innerHTML = html;
    }

    function escapeHtml(str) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return str.replace(/[&<>"']/g, c => map[c]);
    }

    // =========================================
    // GRÁFICA — CANVAS 2D
    // =========================================
    function getCanvasSize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = rect.width;
        const h = parseFloat(getComputedStyle(canvas).height);
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { w, h };
    }

    function mathToCanvas(mx, my, w, h) {
        const px = (mx - viewXMin) / (viewXMax - viewXMin) * w;
        const py = (1 - (my - viewYMin) / (viewYMax - viewYMin)) * h;
        return { px, py };
    }

    function canvasToMath(px, py, w, h) {
        const mx = viewXMin + px / w * (viewXMax - viewXMin);
        const my = viewYMax - py / h * (viewYMax - viewYMin);
        return { mx, my };
    }

    function dibujarGrafica() {
        const { w, h } = getCanvasSize();
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        // Colores del tema
        const colors = {
            bg: isDark ? '#1a2332' : '#f8fafc',
            grid: isDark ? 'rgba(71,85,105,0.25)' : 'rgba(203,213,225,0.5)',
            axis: isDark ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.7)',
            axisLabel: isDark ? '#64748b' : '#94a3b8',
            curve: isDark ? '#818cf8' : '#6366f1',
            yZero: isDark ? 'rgba(248,113,113,0.3)' : 'rgba(239,68,68,0.25)',
            markerXl: '#ef4444',
            markerXu: '#6366f1',
            markerX0: '#f59e0b',
            shade: isDark ? 'rgba(129,140,248,0.07)' : 'rgba(99,102,241,0.06)',
            root: '#10b981',
        };

        // Fondo
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, w, h);

        // Grid
        dibujarGrid(w, h, colors);

        // y=0 line
        const y0 = mathToCanvas(0, 0, w, h);
        ctx.strokeStyle = colors.yZero;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y0.py);
        ctx.lineTo(w, y0.py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ejes
        dibujarEjes(w, h, colors);

        // Sombreado del intervalo seleccionado (solo métodos cerrados, antes de la curva)
        const metodo = metodoSelect.value;
        if (metodo === 'biseccion' || metodo === 'regla_falsa') {
            const xlVal = parseFloat(xlInput.value);
            const xuVal = parseFloat(xuInput.value);
            if (!isNaN(xlVal) && !isNaN(xuVal) && xlVal < xuVal) {
                const p1 = mathToCanvas(xlVal, 0, w, h);
                const p2 = mathToCanvas(xuVal, 0, w, h);
                ctx.fillStyle = colors.shade;
                ctx.fillRect(p1.px, 0, p2.px - p1.px, h);
            }
        }

        // Curva f(x)
        if (graphData && graphData.puntos && graphData.puntos.length > 0) {
            dibujarCurva(w, h, colors);
        }

        // Marcadores de intervalo (arrastrables)
        dibujarMarcadores(w, h, colors);

        // Marcador de raíz (SOLO post-cálculo exitoso)
        if (rootResult && rootResult.convergencia && rootResult.resultado !== null) {
            dibujarRaiz(w, h, colors, rootResult.resultado);
        }
    }

    function dibujarGrid(w, h, colors) {
        const rangeX = viewXMax - viewXMin;
        const rangeY = viewYMax - viewYMin;
        const stepX = calcularPasoGrid(rangeX);
        const stepY = calcularPasoGrid(rangeY);

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 0.5;
        ctx.font = '10px "Fira Code", monospace';
        ctx.fillStyle = colors.axisLabel;
        ctx.textAlign = 'center';

        // Verticales
        let startX = Math.ceil(viewXMin / stepX) * stepX;
        for (let x = startX; x <= viewXMax; x += stepX) {
            const p = mathToCanvas(x, 0, w, h);
            ctx.beginPath();
            ctx.moveTo(p.px, 0);
            ctx.lineTo(p.px, h);
            ctx.stroke();
            // Label
            if (Math.abs(x) > stepX * 0.1) {
                const labelY = Math.min(Math.max(p.py + 14, 14), h - 4);
                ctx.fillText(formatNum(x), p.px, labelY);
            }
        }

        // Horizontales
        ctx.textAlign = 'right';
        let startY = Math.ceil(viewYMin / stepY) * stepY;
        for (let y = startY; y <= viewYMax; y += stepY) {
            const p = mathToCanvas(0, y, w, h);
            ctx.beginPath();
            ctx.moveTo(0, p.py);
            ctx.lineTo(w, p.py);
            ctx.stroke();
            if (Math.abs(y) > stepY * 0.1) {
                const labelX = Math.min(Math.max(p.px - 4, 30), w - 4);
                ctx.fillText(formatNum(y), labelX, p.py - 3);
            }
        }
    }

    function dibujarEjes(w, h, colors) {
        ctx.strokeStyle = colors.axis;
        ctx.lineWidth = 1.5;

        // Eje X
        const originY = mathToCanvas(0, 0, w, h).py;
        if (originY >= 0 && originY <= h) {
            ctx.beginPath();
            ctx.moveTo(0, originY);
            ctx.lineTo(w, originY);
            ctx.stroke();
        }

        // Eje Y
        const originX = mathToCanvas(0, 0, w, h).px;
        if (originX >= 0 && originX <= w) {
            ctx.beginPath();
            ctx.moveTo(originX, 0);
            ctx.lineTo(originX, h);
            ctx.stroke();
        }
    }

    function dibujarCurva(w, h, colors) {
        const puntos = graphData.puntos;
        ctx.strokeStyle = colors.curve;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        let drawing = false;
        ctx.beginPath();

        for (let i = 0; i < puntos.length; i++) {
            const p = puntos[i];
            if (p.y === null || p.y === undefined) {
                drawing = false;
                continue;
            }

            // Detectar discontinuidades (saltos grandes entre puntos consecutivos)
            if (drawing && i > 0) {
                const prev = puntos[i - 1];
                if (prev.y !== null && prev.y !== undefined) {
                    const dy = Math.abs(p.y - prev.y);
                    const rangeY = viewYMax - viewYMin;
                    if (dy > rangeY * 3) {
                        // Probable asíntota: cortar la línea
                        ctx.stroke();
                        ctx.beginPath();
                        drawing = false;
                    }
                }
            }

            const cp = mathToCanvas(p.x, p.y, w, h);

            // Recortar extremos verticales para no dibujar líneas fuera del canvas
            if (cp.py < -h * 2 || cp.py > h * 3) {
                if (drawing) {
                    ctx.stroke();
                    ctx.beginPath();
                    drawing = false;
                }
                continue;
            }

            if (!drawing) {
                ctx.moveTo(cp.px, cp.py);
                drawing = true;
            } else {
                ctx.lineTo(cp.px, cp.py);
            }
        }
        ctx.stroke();
    }

    function dibujarMarcadores(w, h, colors) {
        const metodo = metodoSelect.value;

        if (metodo === 'biseccion' || metodo === 'regla_falsa') {
            const xlVal = parseFloat(xlInput.value);
            const xuVal = parseFloat(xuInput.value);
            if (!isNaN(xlVal)) dibujarMarcadorVertical(xlVal, 'xl', colors.markerXl, w, h);
            if (!isNaN(xuVal)) dibujarMarcadorVertical(xuVal, 'xu', colors.markerXu, w, h);
        } else if (metodo === 'newton_raphson') {
            const x0Val = parseFloat(x0NewtonInput.value);
            if (!isNaN(x0Val)) dibujarMarcadorVertical(x0Val, 'x₀', colors.markerX0, w, h);
        } else if (metodo === 'secante') {
            const xm1Val = parseFloat(xm1Input.value);
            const x0Val = parseFloat(x0SecanteInput.value);
            if (!isNaN(xm1Val)) dibujarMarcadorVertical(xm1Val, 'x₋₁', colors.markerXl, w, h);
            if (!isNaN(x0Val)) dibujarMarcadorVertical(x0Val, 'x₀', colors.markerXu, w, h);
        }
    }

    function dibujarMarcadorVertical(xVal, label, color, w, h) {
        const p = mathToCanvas(xVal, 0, w, h);
        if (p.px < -20 || p.px > w + 20) return;

        ctx.save();
        // Línea vertical punteada
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(p.px, 0);
        ctx.lineTo(p.px, h);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Handle (triángulo arriba)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p.px - 7, 0);
        ctx.lineTo(p.px + 7, 0);
        ctx.lineTo(p.px, 12);
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.font = 'bold 11px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(label, p.px, 22);
        ctx.fillStyle = color;
        ctx.fillText(label, p.px, 22);

        ctx.restore();
    }

    function dibujarRaiz(w, h, colors, xRoot) {
        // Solo se llama DESPUÉS de calcular exitosamente
        const p = mathToCanvas(xRoot, 0, w, h);

        ctx.save();
        // Círculo
        ctx.beginPath();
        ctx.arc(p.px, p.py, 7, 0, Math.PI * 2);
        ctx.fillStyle = colors.root;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Label
        ctx.font = 'bold 11px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = colors.root;
        ctx.fillText('raíz', p.px, p.py - 14);
        ctx.fillText(formatNum(xRoot), p.px, p.py - 3 > 12 ? p.py + 22 : p.py + 22);
        ctx.restore();
    }

    function calcularPasoGrid(range) {
        const raw = range / 8;
        const mag = Math.pow(10, Math.floor(Math.log10(raw)));
        const norm = raw / mag;
        if (norm < 1.5) return mag;
        if (norm < 3.5) return 2 * mag;
        if (norm < 7.5) return 5 * mag;
        return 10 * mag;
    }

    function formatNum(n) {
        if (Math.abs(n) < 1e-10) return '0';
        if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.01 && Math.abs(n) > 0)) {
            return n.toExponential(1);
        }
        // Evitar trailing zeros
        return parseFloat(n.toPrecision(6)).toString();
    }

    // =========================================
    // GRÁFICA — ACTUALIZACIÓN REACTIVA
    // =========================================
    function solicitarDatosGrafica() {
        const funcion = funcionInput.value.trim();
        if (!funcion) {
            graphData = null;
            graphStatus.textContent = '';
            dibujarGrafica();
            return;
        }

        graphStatus.textContent = 'Cargando…';

        if (fetchAbort) fetchAbort.abort();
        fetchAbort = new AbortController();

        const currentRev = revision;
        const peticionGrafica = ++graficaPeticion;

        const currentRevision = revision;
        const peticionIntervalo = ++validacionPeticion;
        validacionAbort?.abort(); validacionAbort = new AbortController();
        fetch('/api/raices/evaluar', {
            signal: validacionAbort.signal,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                funcion: funcion,
                x_min: viewXMin,
                x_max: viewXMax,
                n_puntos: Math.min(Math.max(Math.round((viewXMax - viewXMin) * 30), 200), 800),
            }),
            signal: fetchAbort.signal,
        })
            .then(r => r.json())
            .then(data => {
                if (currentRev !== revision || peticionGrafica !== graficaPeticion) return;
                if (data.error) {
                    graphStatus.textContent = 'Error';
                    graphData = null;
                } else {
                    graphData = data;
                    graphStatus.textContent = '';
                    autoAjustarY();
                }
                dibujarGrafica();
            })
            .catch(err => {
                if (err.name === 'AbortError') return;
                if (currentRev !== revision || peticionGrafica !== graficaPeticion) return;
                graphStatus.textContent = 'Sin conexión';
                graphData = null;
                dibujarGrafica();
            });
    }

    function autoAjustarY() {
        if (!graphData || !graphData.puntos) return;
        let yMin = Infinity, yMax = -Infinity;
        for (const p of graphData.puntos) {
            if (p.y !== null && p.y !== undefined && isFinite(p.y)) {
                if (p.y < yMin) yMin = p.y;
                if (p.y > yMax) yMax = p.y;
            }
        }
        if (!isFinite(yMin) || !isFinite(yMax) || yMin === yMax) {
            viewYMin = -10;
            viewYMax = 10;
            return;
        }
        const pad = (yMax - yMin) * 0.15 || 1;
        viewYMin = yMin - pad;
        viewYMax = yMax + pad;

        // Clamp to reasonable range
        if (viewYMax - viewYMin > 1e6) {
            viewYMin = -100;
            viewYMax = 100;
        }
    }

    function debounceSolicitarDatos() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(solicitarDatosGrafica, 300);
    }

    // =========================================
    // GRÁFICA — INTERACCIÓN (Pan / Zoom / Drag)
    // =========================================
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function detectarMarcadorCercano(mouseX, w) {
        const metodo = metodoSelect.value;
        const candidates = [];

        if (metodo === 'biseccion' || metodo === 'regla_falsa') {
            const xlVal = parseFloat(xlInput.value);
            const xuVal = parseFloat(xuInput.value);
            if (!isNaN(xlVal)) {
                const p = mathToCanvas(xlVal, 0, w, 1);
                candidates.push({ id: 'xl', dist: Math.abs(p.px - mouseX) });
            }
            if (!isNaN(xuVal)) {
                const p = mathToCanvas(xuVal, 0, w, 1);
                candidates.push({ id: 'xu', dist: Math.abs(p.px - mouseX) });
            }
        } else if (metodo === 'newton_raphson') {
            const x0Val = parseFloat(x0NewtonInput.value);
            if (!isNaN(x0Val)) {
                const p = mathToCanvas(x0Val, 0, w, 1);
                candidates.push({ id: 'x0', dist: Math.abs(p.px - mouseX) });
            }
        } else if (metodo === 'secante') {
            const xm1Val = parseFloat(xm1Input.value);
            const x0Val = parseFloat(x0SecanteInput.value);
            if (!isNaN(xm1Val)) {
                const p = mathToCanvas(xm1Val, 0, w, 1);
                candidates.push({ id: 'xm1', dist: Math.abs(p.px - mouseX) });
            }
            if (!isNaN(x0Val)) {
                const p = mathToCanvas(x0Val, 0, w, 1);
                candidates.push({ id: 'x0s', dist: Math.abs(p.px - mouseX) });
            }
        }

        candidates.sort((a, b) => a.dist - b.dist);
        if (candidates.length > 0 && candidates[0].dist < MARKER_SNAP_PX) {
            return candidates[0].id;
        }
        return null;
    }

    function actualizarMarcadorPorDrag(markerId, mathX) {
        const rounded = Math.round(mathX * 1000) / 1000;
        if (markerId === 'xl') { xlInput.value = rounded; }
        if (markerId === 'xu') { xuInput.value = rounded; }
        if (markerId === 'x0') { x0NewtonInput.value = rounded; }
        if (markerId === 'xm1') { xm1Input.value = rounded; }
        if (markerId === 'x0s') { x0SecanteInput.value = rounded; }
        invalidarResultado();
        validarIntervalo();
    }

    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
        const pos = getMousePos(e);
        const { w } = getCanvasSize();
        const marker = detectarMarcadorCercano(pos.x, w);
        if (marker) {
            draggingMarker = marker;
            canvas.style.cursor = 'ew-resize';
            e.preventDefault();
            return;
        }
        isDragging = true;
        dragStartMouse = pos;
        dragStartView = { xMin: viewXMin, xMax: viewXMax, yMin: viewYMin, yMax: viewYMax };
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mousemove', (e) => {
        const pos = getMousePos(e);
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = parseFloat(getComputedStyle(canvas).height);

        // Coordenadas para tooltip
        const math = canvasToMath(pos.x, pos.y, w, h);
        graphCoords.textContent = `x: ${formatNum(math.mx)}, y: ${formatNum(math.my)}`;
        graphCoords.classList.add('visible');

        if (draggingMarker) {
            const mathPos = canvasToMath(pos.x, 0, w, h);
            actualizarMarcadorPorDrag(draggingMarker, mathPos.mx);
            dibujarGrafica();
            return;
        }

        if (isDragging && dragStartMouse) {
            const dx = (pos.x - dragStartMouse.x) / w * (dragStartView.xMax - dragStartView.xMin);
            const dy = (pos.y - dragStartMouse.y) / h * (dragStartView.yMax - dragStartView.yMin);
            viewXMin = dragStartView.xMin - dx;
            viewXMax = dragStartView.xMax - dx;
            viewYMin = dragStartView.yMin + dy;
            viewYMax = dragStartView.yMax + dy;
            dibujarGrafica();
            debounceSolicitarDatos();
            return;
        }

        // Cursor hint
        const marker = detectarMarcadorCercano(pos.x, w);
        canvas.style.cursor = marker ? 'ew-resize' : 'crosshair';
    });

    canvas.addEventListener('mouseup', () => {
        if (isDragging) {
            solicitarDatosGrafica();
        }
        isDragging = false;
        draggingMarker = null;
        dragStartMouse = null;
        canvas.style.cursor = 'crosshair';
    });

    canvas.addEventListener('mouseleave', () => {
        graphCoords.classList.remove('visible');
        isDragging = false;
        draggingMarker = null;
        canvas.style.cursor = 'crosshair';
    });

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const pos = getMousePos(e);
        const { w } = getCanvasSize();
        const marker = detectarMarcadorCercano(pos.x, w);
        if (marker) {
            draggingMarker = marker;
            return;
        }
        isDragging = true;
        dragStartMouse = pos;
        dragStartView = { xMin: viewXMin, xMax: viewXMax, yMin: viewYMin, yMax: viewYMax };
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const pos = getMousePos(e);
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = parseFloat(getComputedStyle(canvas).height);

        if (draggingMarker) {
            const mathPos = canvasToMath(pos.x, 0, w, h);
            actualizarMarcadorPorDrag(draggingMarker, mathPos.mx);
            dibujarGrafica();
            return;
        }

        if (isDragging && dragStartMouse) {
            const dx = (pos.x - dragStartMouse.x) / w * (dragStartView.xMax - dragStartView.xMin);
            const dy = (pos.y - dragStartMouse.y) / h * (dragStartView.yMax - dragStartView.yMin);
            viewXMin = dragStartView.xMin - dx;
            viewXMax = dragStartView.xMax - dx;
            viewYMin = dragStartView.yMin + dy;
            viewYMax = dragStartView.yMax + dy;
            dibujarGrafica();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        if (isDragging) solicitarDatosGrafica();
        isDragging = false;
        draggingMarker = null;
    });

    // Wheel zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const pos = getMousePos(e);
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = parseFloat(getComputedStyle(canvas).height);
        const math = canvasToMath(pos.x, pos.y, w, h);

        const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;

        viewXMin = math.mx - (math.mx - viewXMin) * factor;
        viewXMax = math.mx + (viewXMax - math.mx) * factor;
        viewYMin = math.my - (math.my - viewYMin) * factor;
        viewYMax = math.my + (viewYMax - math.my) * factor;

        dibujarGrafica();
        debounceSolicitarDatos();
    }, { passive: false });

    // Zoom buttons
    zoomInBtn.addEventListener('click', () => {
        const cx = (viewXMin + viewXMax) / 2;
        const cy = (viewYMin + viewYMax) / 2;
        const factor = 0.7;
        viewXMin = cx - (cx - viewXMin) * factor;
        viewXMax = cx + (viewXMax - cx) * factor;
        viewYMin = cy - (cy - viewYMin) * factor;
        viewYMax = cy + (viewYMax - cy) * factor;
        dibujarGrafica();
        debounceSolicitarDatos();
    });

    zoomOutBtn.addEventListener('click', () => {
        const cx = (viewXMin + viewXMax) / 2;
        const cy = (viewYMin + viewYMax) / 2;
        const factor = 1.4;
        viewXMin = cx - (cx - viewXMin) * factor;
        viewXMax = cx + (viewXMax - cx) * factor;
        viewYMin = cy - (cy - viewYMin) * factor;
        viewYMax = cy + (viewYMax - cy) * factor;
        dibujarGrafica();
        debounceSolicitarDatos();
    });

    resetBtn.addEventListener('click', () => {
        viewXMin = -10; viewXMax = 10;
        viewYMin = -10; viewYMax = 10;
        dibujarGrafica();
        solicitarDatosGrafica();
    });

    // Resize observer
    const resizeObs = new ResizeObserver(() => {
        dibujarGrafica();
    });
    resizeObs.observe(canvas.parentElement);

    // =========================================
    // GESTIÓN DE PARÁMETROS DINÁMICOS
    // =========================================
    function actualizarParametros() {
        const metodo = metodoSelect.value;

        paramsCerrados.classList.add('hidden');
        paramsNewton.classList.add('hidden');
        paramsSecante.classList.add('hidden');
        warningBox.classList.add('hidden');
        buscarLimitesWrap.classList.add('hidden');

        if (metodo === 'biseccion' || metodo === 'regla_falsa') {
            paramsCerrados.classList.remove('hidden');
            buscarLimitesWrap.classList.remove('hidden');
            limitesTitulo.textContent = 'Límites del Intervalo';
        } else if (metodo === 'newton_raphson') {
            paramsNewton.classList.remove('hidden');
            limitesTitulo.textContent = 'Valor Inicial';
        } else if (metodo === 'secante') {
            paramsSecante.classList.remove('hidden');
            limitesTitulo.textContent = 'Valores Iniciales';
        }

        dibujarGrafica();
    }

    // =========================================
    // VALIDACIÓN DE INTERVALO (2-way binding)
    // =========================================
    function validarIntervalo() {
        const metodo = metodoSelect.value;
        if (metodo !== 'biseccion' && metodo !== 'regla_falsa') {
            intervaloStatus.classList.add('hidden');
            return;
        }

        const xl = parseFloat(xlInput.value);
        const xu = parseFloat(xuInput.value);

        if (isNaN(xl) || isNaN(xu) || xlInput.value.trim() === '' || xuInput.value.trim() === '') {
            intervaloStatus.classList.add('hidden');
            return;
        }

        if (xl >= xu) {
            intervaloStatus.innerHTML = '<div class="intervalo-err">⚠ xl debe ser menor que xu</div>';
            intervaloStatus.classList.remove('hidden');
            return;
        }

        // Verificar cambio de signo vía backend (lightweight check)
        intervaloStatus.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">Verificando cambio de signo…</div>';
        intervaloStatus.classList.remove('hidden');

        const funcion = funcionInput.value.trim();
        if (!funcion) {
            intervaloStatus.innerHTML = '<div class="intervalo-err">Escribe la función primero</div>';
            return;
        }

        const currentRevision = revision;
        const peticionIntervalo = ++validacionPeticion;
        validacionAbort?.abort(); validacionAbort = new AbortController();
        fetch('/api/raices/evaluar', {
            signal: validacionAbort.signal,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ funcion, x_min: xl, x_max: xu, n_puntos: 65 }),
        })
            .then(r => r.json())
            .then(data => {
                if (currentRevision !== revision || peticionIntervalo !== validacionPeticion) return;
                if (data.error || !data.puntos || data.puntos.length < 2) {
                    intervaloStatus.innerHTML = '<div class="intervalo-err">No se pudo verificar</div>';
                    return;
                }
                const fxl = data.puntos[0].y;
                const fxu = data.puntos[data.puntos.length - 1].y;
                if (data.puntos.some(p => p.y === null)) {
                    intervaloStatus.innerHTML = '<div class="intervalo-err">El muestreo detectó un punto fuera del dominio o discontinuidad</div>';
                    return;
                }
                if (fxl === 0 || fxu === 0) {
                    intervaloStatus.textContent = 'Intervalo válido: contiene un extremo con f(x)=0. Calcula para obtener la raíz.';
                } else if ((fxl > 0) !== (fxu > 0)) {
                    intervaloStatus.innerHTML = `<div class="intervalo-ok">✓ Cambio de signo confirmado: f(${xl})≈${fxl.toFixed(4)}, f(${xu})≈${fxu.toFixed(4)}</div>`;
                } else {
                    intervaloStatus.innerHTML = `<div class="intervalo-err">✗ Sin cambio de signo: f(${xl})≈${fxl.toFixed(4)}, f(${xu})≈${fxu.toFixed(4)}</div>`;
                }
                intervaloStatus.classList.remove('hidden');
            })
            .catch(err => {
                if (err.name === 'AbortError' || currentRevision !== revision || peticionIntervalo !== validacionPeticion) return;
                intervaloStatus.innerHTML = '<div class="intervalo-err">Error de conexión</div>';
            });
    }

    // Debounced validation
    let validateTimer = null;
    function debounceValidar() {
        clearTimeout(validateTimer);
        validateTimer = setTimeout(validarIntervalo, 400);
    }

    // =========================================
    // BUSCAR LÍMITES AUTOMÁTICAMENTE
    // =========================================
    buscarLimitesBtn.addEventListener('click', () => {
        const funcion = funcionInput.value.trim();
        if (!funcion) {
            mostrarError('Escribe la función primero.');
            return;
        }

        buscarLimitesBtn.disabled = true;
        buscarLimitesBtn.innerHTML = '<span class="spinner"></span> Buscando…';

        const currentRevision = revision;
        const peticionLimites = ++limitesPeticion;
        limitesAbort?.abort(); limitesAbort = new AbortController();
        fetch('/api/raices/buscar-limites', {
            signal: limitesAbort.signal,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                funcion: funcion,
                x_min: viewXMin,
                x_max: viewXMax,
            }),
        })
            .then(r => r.json())
            .then(data => {
                if (currentRevision !== revision || peticionLimites !== limitesPeticion) return;
                buscarLimitesBtn.disabled = false;
                buscarLimitesBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Buscar Límites Automáticamente`;

                if (data.error) {
                    mostrarError(data.error);
                    return;
                }

                if (!data.candidatos || data.candidatos.length === 0) {
                    candidatosContainer.innerHTML = `
                    <div class="intervalo-err">
                        No se encontraron intervalos con cambio de signo en [${formatNum(viewXMin)}, ${formatNum(viewXMax)}].
                        Intenta hacer zoom out o desplazar la gráfica.
                    </div>`;
                    candidatosContainer.classList.remove('hidden');
                    return;
                }

                let html = `<p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:0.5rem;font-weight:600;">
                Se encontraron ${data.candidatos.length} intervalo(s) con cambio de signo. Selecciona uno:</p>
                <div class="candidatos-list">`;

                data.candidatos.forEach((c, idx) => {
                    html += `
                    <div class="candidato-item" data-xl="${c.xl}" data-xu="${c.xu}">
                        <span class="candidato-item__label">
                            [${c.xl}, ${c.xu}] → f(xl)≈${c.f_xl.toFixed(4)}, f(xu)≈${c.f_xu.toFixed(4)}
                        </span>
                        <button type="button" class="candidato-item__btn" data-xl="${c.xl}" data-xu="${c.xu}">
                            Usar
                        </button>
                    </div>`;
                });

                html += '</div>';
                candidatosContainer.innerHTML = html;
                candidatosContainer.classList.remove('hidden');

                // Event delegation for candidate buttons
                candidatosContainer.querySelectorAll('.candidato-item__btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const xl = parseFloat(e.target.dataset.xl);
                        const xu = parseFloat(e.target.dataset.xu);
                        xlInput.value = xl;
                        xuInput.value = xu;
                        candidatosContainer.classList.add('hidden');
                        invalidarResultado();
                        validarIntervalo();
                        dibujarGrafica();
                    });
                });

                candidatosContainer.querySelectorAll('.candidato-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const xl = parseFloat(item.dataset.xl);
                        const xu = parseFloat(item.dataset.xu);
                        xlInput.value = xl;
                        xuInput.value = xu;
                        candidatosContainer.classList.add('hidden');
                        invalidarResultado();
                        validarIntervalo();
                        dibujarGrafica();
                    });
                });
            })
            .catch(err => {
                buscarLimitesBtn.disabled = false;
                buscarLimitesBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Buscar Límites Automáticamente`;
                if (err.name !== 'AbortError' && currentRevision === revision) mostrarError('Error de conexión al buscar límites.');
            });
    });

    // =========================================
    // VALIDACIONES
    // =========================================
    function validarCampos() {
        const funcion = funcionInput.value.trim();
        const metodo = metodoSelect.value;
        const errorEa = parseFloat(errorInput.value);

        if (!funcion) {
            mostrarError('Por favor, ingresa la función f(x).');
            return null;
        }

        if (!Number.isFinite(errorEa) || errorEa <= 0 || errorEa > 100) {
            mostrarError('El error esperado (Ea) debe ser un número positivo.');
            return null;
        }

        const iteraciones = Number(maxIterInput.value);
        if (!Number.isInteger(iteraciones) || iteraciones < 1 || iteraciones > 1000) { mostrarError('Usa entre 1 y 1000 iteraciones.'); return null; }
        if (funcion.length > 1000) { mostrarError('La función admite hasta 1000 caracteres.'); return null; }
        const datos = {
            funcion: funcion,
            metodo: metodo,
            error_esperado: errorEa,
            max_iter: iteraciones,
        };

        if (metodo === 'biseccion' || metodo === 'regla_falsa') {
            const xl = parseFloat(xlInput.value);
            const xu = parseFloat(xuInput.value);

            if (isNaN(xl) || xlInput.value.trim() === '') {
                mostrarError('Ingresa un valor numérico para el límite inferior (xl).');
                return null;
            }
            if (isNaN(xu) || xuInput.value.trim() === '') {
                mostrarError('Ingresa un valor numérico para el límite superior (xu).');
                return null;
            }
            if (xl >= xu) {
                mostrarError('El límite inferior (xl) debe ser menor que el límite superior (xu).');
                return null;
            }

            datos.xl = xl;
            datos.xu = xu;

        } else if (metodo === 'newton_raphson') {
            const x0 = parseFloat(x0NewtonInput.value);
            if (isNaN(x0) || x0NewtonInput.value.trim() === '') {
                mostrarError('Ingresa un valor numérico para x₀ (valor inicial).');
                return null;
            }
            datos.x0 = x0;

        } else if (metodo === 'secante') {
            const xm1 = parseFloat(xm1Input.value);
            const x0 = parseFloat(x0SecanteInput.value);
            if (isNaN(xm1) || xm1Input.value.trim() === '') {
                mostrarError('Ingresa un valor numérico para x₋₁.');
                return null;
            }
            if (isNaN(x0) || x0SecanteInput.value.trim() === '') {
                mostrarError('Ingresa un valor numérico para x₀.');
                return null;
            }
            datos.x_menos1 = xm1;
            datos.x0 = x0;
        }

        return datos;
    }

    // =========================================
    // RENDERIZADO DE RESULTADOS (post-cálculo)
    // =========================================
    function renderizarResultado(data, metodo) {
        let html = '';

        // Banner de resultado principal
        const esExito = data.convergencia;
        const claseAlerta = esExito ? 'alert--success' : 'alert--warning';
        const iconoEstado = esExito
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

        html += `
            <div class="alert ${claseAlerta}" style="margin-bottom: 1.5rem;">
                ${iconoEstado}
                <span>${escapeHtml(data.mensaje || (esExito ? 'Raíz encontrada con éxito.' : 'No se alcanzó convergencia.'))}</span>
            </div>
        `;

        // Resumen numérico
        if (data.resultado !== null && data.resultado !== undefined) {
            html += `
                <div class="results__classification">
                    <span style="font-size: 0.9rem; color: var(--text-muted); display: block; margin-bottom: 5px;">
                        Raíz aproximada:
                    </span>
                    <span style="font-size: 1.8rem; letter-spacing: 0.02em; font-family: 'Fira Code', monospace;">
                        x ≈ ${Tanix.fmt(data.resultado)}
                    </span>
                    <span style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-top: 8px;">
                        Iteraciones: ${data.iteraciones} &nbsp;|&nbsp; Convergencia: ${esExito ? 'Sí ✓' : 'No ✗'}
                    </span>
                </div>
            `;
        }

        html += `<p>Residuo |f(x)|: ${Tanix.fmt(data.residuo)} · Error absoluto: ${Tanix.fmt(data.error_absoluto)} · Ea relativo: ${Tanix.fmt(data.error_final)}% · Tiempo: ${Tanix.fmt(data.tiempo_s)} s</p>`;
        html += `<p>Tolerancia Ea: ${Tanix.fmt(data.tolerancia_porcentual)}%. ${escapeHtml(data.criterio_residuo || '')}</p>`;
        if (data.advertencias?.length) html += `<p>${data.advertencias.map(escapeHtml).join(' ')}</p>`;
        // Tabla de iteraciones
        if (data.pasos && data.pasos.length > 0) {
            html += `
                <div class="results__step" style="text-align: left; overflow-x: auto;">
                    <h3 style="margin-bottom: 1rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                        Tabla de Iteraciones
                    </h3>
                    <div class="raices-table-wrapper">
                        ${generarTabla(data.pasos, metodo)}
                    </div>
                </div>
            `;
        }

        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function generarTabla(pasos, metodo) {
        if (metodo === 'biseccion' || metodo === 'regla_falsa') {
            return generarTablaCerrados(pasos);
        } else if (metodo === 'newton_raphson') {
            return generarTablaNewton(pasos);
        } else if (metodo === 'secante') {
            return generarTablaSecante(pasos);
        }
        return '';
    }

    function generarTablaCerrados(pasos) {
        let html = `
            <table class="raices-table">
                <thead>
                    <tr>
                        <th>Iteración</th>
                        <th>xl</th>
                        <th>xu</th>
                        <th>xr</th>
                        <th>f(xl)</th>
                        <th>f(xu)</th>
                        <th>f(xr)</th>
                        <th>Ea (%)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pasos.forEach((p, idx) => {
            const esUltimo = idx === pasos.length - 1;
            html += `
                <tr class="${esUltimo ? 'raices-table__row--final' : ''}">
                    <td>${p.iteracion}</td>
                    <td>${Tanix.fmt(p.xl)}</td>
                    <td>${Tanix.fmt(p.xu)}</td>
                    <td><strong>${Tanix.fmt(p.xr)}</strong></td>
                    <td>${Tanix.fmt(p.f_xl)}</td>
                    <td>${Tanix.fmt(p.f_xu)}</td>
                    <td>${Tanix.fmt(p.f_xr)}</td>
                    <td>${Tanix.fmt(p.ea)}%</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        return html;
    }

    function generarTablaNewton(pasos) {
        let html = `
            <table class="raices-table">
                <thead>
                    <tr>
                        <th>Iteración</th>
                        <th>xᵢ</th>
                        <th>f(xᵢ)</th>
                        <th>f'(xᵢ)</th>
                        <th>xᵢ₊₁</th>
                        <th>Ea (%)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pasos.forEach((p, idx) => {
            const esUltimo = idx === pasos.length - 1;
            html += `
                <tr class="${esUltimo ? 'raices-table__row--final' : ''}">
                    <td>${p.iteracion}</td>
                    <td>${Tanix.fmt(p.xi)}</td>
                    <td>${Tanix.fmt(p.f_xi)}</td>
                    <td>${Tanix.fmt(p.f_prima_xi)}</td>
                    <td><strong>${Tanix.fmt(p.xi_nuevo)}</strong></td>
                    <td>${Tanix.fmt(p.ea)}%</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        return html;
    }

    function generarTablaSecante(pasos) {
        let html = `
            <table class="raices-table">
                <thead>
                    <tr>
                        <th>Iteración</th>
                        <th>xᵢ₋₁</th>
                        <th>xᵢ</th>
                        <th>f(xᵢ₋₁)</th>
                        <th>f(xᵢ)</th>
                        <th>xᵢ₊₁</th>
                        <th>Ea (%)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pasos.forEach((p, idx) => {
            const esUltimo = idx === pasos.length - 1;
            html += `
                <tr class="${esUltimo ? 'raices-table__row--final' : ''}">
                    <td>${p.iteracion}</td>
                    <td>${Tanix.fmt(p.x_i_menos1)}</td>
                    <td>${Tanix.fmt(p.x_i)}</td>
                    <td>${Tanix.fmt(p.f_i_menos1)}</td>
                    <td>${Tanix.fmt(p.f_i)}</td>
                    <td><strong>${Tanix.fmt(p.x_nuevo)}</strong></td>
                    <td>${Tanix.fmt(p.ea)}%</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        return html;
    }

    // =========================================
    // ENVÍO AL BACKEND (CALCULAR)
    // =========================================
    async function calcularRaiz() {
        invalidarResultado();

        const currentRevision = revision;
        const datos = validarCampos();
        if (!datos) return;

        submitBtn.disabled = true;
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Calculando…';

        calculoAbort = new AbortController();
        try {
            const response = await fetch('/api/raices', {
                signal: calculoAbort.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos),
            });

            const data = await response.json();

            if (currentRevision !== revision) return;

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo completar el cálculo.');
            }

            // REGLA: Solo DESPUÉS de respuesta exitosa se marca la raíz
            if (data.convergencia && data.resultado !== null) {
                rootResult = data;
            }

            ultimoResultado = {data, metodo: datos.metodo};
            Tanix.registrar('/api/raices', datos, data);
            renderizarResultado(data, datos.metodo);
            dibujarGrafica();   // Redibuja con marcador de raíz si aplica

        } catch (error) {
            if (error.name === 'AbortError' || currentRevision !== revision) return;
            if (error instanceof TypeError) {
                mostrarError('Error de conexión con el servidor. Verifica que Flask esté ejecutándose.');
            } else {
                mostrarError(error.message);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    }

    function dibujarComparacion(data) {
        comparacionResultados.replaceChildren();
        const tabla=document.createElement('table');tabla.className='raices-table';
        const encabezado=document.createElement('tr');
        ['Método','Raíz aproximada','Iteraciones','Ea (%)','Residuo','Estado','Tiempo (s)'].forEach(t=>{const th=document.createElement('th');th.scope='col';th.textContent=t;encabezado.append(th);});
        tabla.append(encabezado);
        for (const r of data.comparacion) {
            const tr=document.createElement('tr');
            [r.metodo,Tanix.fmt(r.resultado),r.iteraciones,Tanix.fmt(r.error_final),Tanix.fmt(r.residuo),r.estado,Tanix.fmt(r.tiempo_s)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});
            tr.title=r.mensaje; tabla.append(tr);
            if (!r.convergencia) { const aviso=document.createElement('tr');const td=document.createElement('td');td.colSpan=7;td.textContent=r.mensaje;aviso.append(td);tabla.append(aviso); }
        }
        comparacionResultados.append(tabla);
    }
    compararBtn.addEventListener('click', async()=>{
        invalidarResultado();
        const actual=revision;
        const numeroCampo=id=>{ const input=document.getElementById(id);return input.value.trim()==='' ? null : Number(input.value); };
        const datos={funcion:funcionInput.value.trim(),error_esperado:Number(errorInput.value),max_iter:Number(maxIterInput.value),
            xl:numeroCampo('tanix-comparar-xl'),xu:numeroCampo('tanix-comparar-xu'),x0:numeroCampo('tanix-comparar-x0'),x_menos1:numeroCampo('tanix-comparar-xm1')};
        compararAbort=new AbortController();compararBtn.disabled=true;
        try {
            const response=await fetch('/api/raices/comparar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(datos),signal:compararAbort.signal});
            const data=await response.json();if(actual!==revision)return;
            if(!response.ok)throw new Error(data.error || 'No se pudo comparar.');
            ultimaComparacion=data;dibujarComparacion(data);Tanix.registrar('/api/raices/comparar',datos,data);
        } catch(error) {if(error.name!=='AbortError' && actual===revision)mostrarError(error.message);}
        finally {compararBtn.disabled=false;}
    });
    document.addEventListener('tanix:precision',()=>{
        if(ultimoResultado)renderizarResultado(ultimoResultado.data,ultimoResultado.metodo);
        if(ultimaComparacion)dibujarComparacion(ultimaComparacion);
        dibujarGrafica();
    });
    document.querySelectorAll('#tanix-comparacion-panel input').forEach(input=>input.addEventListener('input',invalidarResultado));
    canvas.tabIndex=0;canvas.setAttribute('aria-label','Gráfica exploratoria: + y - para zoom, flechas para desplazar.');
    canvas.addEventListener('keydown',e=>{
        if(e.key==='+' || e.key==='='){e.preventDefault();zoomInBtn.click();}
        else if(e.key==='-'){e.preventDefault();zoomOutBtn.click();}
        else if(['ArrowLeft','ArrowRight'].includes(e.key)){
            e.preventDefault();const delta=(viewXMax-viewXMin)*.1*(e.key==='ArrowRight'?1:-1);viewXMin+=delta;viewXMax+=delta;debounceSolicitarDatos();dibujarGrafica();
        }
    });
    document.addEventListener('keydown',e=>{if(e.key==='Enter' && e.target.matches('#raices-funcion-raw,#raices-params-cerrados input,#raices-params-newton input,#raices-params-secante input')){e.preventDefault();if(!submitBtn.disabled)calcularRaiz();}});

    // =========================================
    // EVENT LISTENERS
    // =========================================
    metodoSelect.addEventListener('change', () => {
        actualizarParametros();
        invalidarResultado();
    });

    funcionInput.addEventListener('input', () => {
        renderizarPreview(funcionInput.value);
        invalidarResultado();
        debounceSolicitarDatos();
    });

    // Inputs de intervalo → invalidar + redibujar + validar
    [xlInput, xuInput].forEach(input => {
        input.addEventListener('input', () => {
            invalidarResultado();
            dibujarGrafica();
            debounceValidar();
        });
    });

    [x0NewtonInput, xm1Input, x0SecanteInput].forEach(input => {
        input.addEventListener('input', () => {
            invalidarResultado();
            dibujarGrafica();
        });
    });

    errorInput.addEventListener('input', () => invalidarResultado());
    maxIterInput.addEventListener('input', () => invalidarResultado());

    submitBtn.addEventListener('click', calcularRaiz);

    // Observar cambios de tema para redibujar
    const themeObserver = new MutationObserver(() => dibujarGrafica());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // =========================================
    // INICIALIZACIÓN
    // =========================================
    actualizarParametros();
    renderizarPreview(funcionInput.value);
    dibujarGrafica();
});
