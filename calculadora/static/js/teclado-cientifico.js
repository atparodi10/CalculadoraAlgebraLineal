// Shared mathematical keyboard. All profiles describe syntax accepted by the current parsers.
(function () {
    'use strict';

    const pages = {
        ecuaciones: {
            '#input-m, #input-n': 'integer',
            '#equation-list input': 'equation'
        },
        matrices: { '#mat-a, #mat-b': 'matrix', '#mat-c': 'number' },
        vectores: {
            '#vec-dim': 'integer', '#vec-c': 'number',
            '#vec-u, #vec-v, #vec-b': 'vector', '#vec-conjunto': 'matrix'
        },
        conversion: { '#conversion-number': 'base' },
        romanos: { '#romanos-input': 'roman' },
        raices: {
            '#raices-funcion-raw, #raices-funcion-visual': 'function',
            '#raices-error, #raices-xl, #raices-xu, #raices-x0-newton, #raices-xm1, #raices-x0-secante': 'number',
            '#raices-maxiter': 'integer'
        }
    };

    const digits = '7894561230'.split('');
    const key = (label, insert = label, aria = label, offset = 0) => ({ label, insert, aria, offset });
    const structure = (label, insert, aria, action, offset = 0) => ({ ...key(label, insert, aria, offset), action });
    const numeric = digits.map(d => key(d));
    const edit = [key('←', null, 'Mover cursor a la izquierda'), key('→', null, 'Mover cursor a la derecha'),
        key('⌫', null, 'Retroceso'), key('AC', null, 'Limpiar campo')];
    const extra = {
        number: [key('.'), key('-')], integer: [],
        equation: [key('.'), key('+'), key('−', '-'), key('=', '='), key('*', '*', 'Multiplicar coeficiente por variable'),
            key('Espacio', ' ', 'Insertar espacio')],
        matrix: [key('.'), key('-'), key('Espacio', ' '), key(',', ','), key('Nueva fila', '\n')],
        vector: [key('.'), key('-'), key('Espacio', ' '), key(',', ',')],
        function: [key('.'), key('+'), key('−', '-'), key('×', '*'), key('÷', '/'), key('='),
            key('('), key(')'), key('x'),
            structure('a²', '^2', 'Elevar al cuadrado', 'square'),
            structure('a³', '^3', 'Elevar al cubo', 'cube'),
            structure('aᵇ', '^()', 'Potencia general', 'power', -1),
            structure('eˣ', 'e^()', 'Euler elevado a una potencia', 'euler', -1),
            structure('√', 'sqrt()', 'Raíz cuadrada', 'root', -1),
            structure('ⁿ√', '()^(1/())', 'Raíz de índice n', 'nthroot', -8),
            structure('a/b', '()/()', 'Fracción', 'fraction', -4),
            structure('|a|', 'abs()', 'Valor absoluto', 'abs', -1),
            ...['sin', 'cos', 'tan', 'ln', 'log', 'exp'].map(name => structure(name, `${name}()`, name, 'function', -1)),
            structure('π', 'pi', 'Pi', 'pi'), key('e')]
    };

    document.addEventListener('DOMContentLoaded', () => {
        const page = document.querySelector('#equation-list') ? 'ecuaciones'
            : document.querySelector('#mat-a') ? 'matrices'
            : document.querySelector('#vec-u') ? 'vectores'
            : document.querySelector('#conversion-number') ? 'conversion'
            : document.querySelector('#romanos-input') ? 'romanos'
            : document.querySelector('#raices-funcion-raw') ? 'raices' : null;
        if (!page) return;

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'math-keyboard-toggle';
        toggle.textContent = '⌨';
        toggle.title = 'Mostrar u ocultar teclado matemático';
        toggle.setAttribute('aria-label', 'Mostrar teclado matemático');
        toggle.setAttribute('aria-expanded', 'false');

        const panel = document.createElement('section');
        panel.className = 'math-keyboard';
        panel.id = 'math-keyboard';
        panel.hidden = true;
        panel.setAttribute('aria-label', 'Teclado matemático');
        panel.innerHTML = '<div class="math-keyboard__header"><div class="math-keyboard__title"><span class="math-keyboard__grip" aria-hidden="true">⠿</span><div><small>LINEAL TANIX</small><strong>Teclado matemático</strong></div></div>' +
            '<button class="math-keyboard__close" type="button" aria-label="Cerrar teclado">✕</button></div>' +
            '<div class="math-keyboard__tabs" aria-label="Tipo de teclado"><button type="button" data-tab="main" aria-pressed="true">Principal</button><button type="button" data-tab="functions" aria-pressed="false">Funciones</button></div>' +
            '<div class="math-keyboard__layout"><div class="math-keyboard__science"></div><div class="math-keyboard__keys"></div><div class="math-keyboard__actions"></div></div>' +
            '<div class="math-keyboard__variables" aria-label="Variables disponibles"></div><div class="math-keyboard__foot"><span>Arrastra la barra superior para mover el teclado</span><button type="button" class="math-keyboard__reset">Reubicar</button></div>';
        toggle.setAttribute('aria-controls', panel.id);
        document.body.append(toggle, panel);
        const keys = panel.querySelector('.math-keyboard__keys');
        const science = panel.querySelector('.math-keyboard__science');
        const actions = panel.querySelector('.math-keyboard__actions');
        const tabs = panel.querySelector('.math-keyboard__tabs');
        const variables = panel.querySelector('.math-keyboard__variables');
        let active = null;
        let buffer = new WeakMap();
        let virtualInput = false;
        let tab = 'main';
        let moved = null;
        let drag = null;

        function profileFor(field) {
            if (!(field instanceof HTMLElement) || field.disabled || field.readOnly) return null;
            field = field.closest('#raices-funcion-visual') || field;
            for (const [selector, profile] of Object.entries(pages[page])) {
                if (field.matches(selector)) return profile;
            }
            return null;
        }

        function currentKeys(profile) {
            if (profile === 'roman') {
                return document.querySelector('#romanos-direccion').value === 'romano_a_arabigo'
                    ? 'IVXLCDM'.split('').map(d => key(d)) : numeric;
            }
            if (profile === 'base') {
                const base = Number(document.querySelector('#conversion-origen').value);
                const chars = '0123456789ABCDEF'.slice(0, base);
                return [...chars].map(d => key(d)).concat([key('.'), key('-')]);
            }
            if (profile === 'equation') {
                const count = Math.max(1, Math.min(50, Number(document.querySelector('#input-n').value) || 1));
                return numeric.concat(extra.equation, Array.from({ length: count }, (_, i) => key(`x${i + 1}`)));
            }
            return numeric.concat(extra[profile]);
        }

        function render() {
            if (!active || !active.isConnected) { close(); return; }
            const profile = profileFor(active);
            const buttons = currentKeys(profile).concat(edit.filter(item =>
                active.type !== 'number' || !['←', '→'].includes(item.label)));
            const isScientific = profile === 'function';
            const visual = Boolean(active.mathEditor);
            panel.classList.toggle('math-keyboard--scientific', isScientific);
            tabs.hidden = !isScientific;
            for (const button of tabs.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.tab === tab));
            function buttonFor(item) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'math-keyboard__key' + (item.insert === null ? ' math-keyboard__key--edit' : '');
                if (/^[0-9]$/.test(item.label)) button.classList.add('math-keyboard__key--digit');
                if (['+','−','-','×','÷','*','=','(',')'].includes(item.label)) button.classList.add('math-keyboard__key--operator');
                if (item.action) button.classList.add('math-keyboard__key--science');
                button.textContent = item.label;
                if (item.action === 'fraction') {
                    button.classList.add('math-keyboard__key--fraction');
                    button.innerHTML = '<span>a</span><span>b</span>';
                }
                button.setAttribute('aria-label', item.aria);
                button._mathKey = item;
                return button;
            }
            if (isScientific) {
                const labels = tab === 'main' ? ['a²','aᵇ','a/b','√','ⁿ√','eˣ','sin','cos','tan','(',')','π']
                    : ['ln','log','exp','|a|','a³','e','sin','cos','tan','(',')','π'];
                science.replaceChildren(...labels.map(label => buttonFor(buttons.find(item => item.label === label))));
                keys.replaceChildren(...['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','x','+'].map(label => buttonFor(buttons.find(item => item.label === label))));
                actions.replaceChildren(...[key('←', null, 'Mover cursor a la izquierda'), key('→', null, 'Mover cursor a la derecha'),
                    ...(visual ? [key('↑', null, 'Subir al numerador'), key('↓', null, 'Bajar al denominador')] : []),
                    ...buttons.filter(item => ['=', '⌫', 'AC'].includes(item.label))].map(buttonFor));
            } else {
                science.replaceChildren();
                keys.replaceChildren(...buttons.filter(item => item.insert !== null && !/^x\d+$/.test(item.label)).map(buttonFor));
                actions.replaceChildren(...buttons.filter(item => item.insert === null).map(buttonFor));
            }
            variables.replaceChildren(...buttons.filter(item => /^x\d+$/.test(item.label)).map(buttonFor));
            variables.hidden = profile !== 'equation';
            panel.querySelector('strong').textContent = ({
                equation: 'Ecuaciones lineales', matrix: 'Matriz', vector: 'Vector',
                number: 'Número', integer: 'Entero', base: 'Base de origen',
                roman: 'Números romanos', function: 'Calculadora científica · f(x)'
            })[profile];
            position();
        }

        function position() {
            if (!active || !active.isConnected) return;
            if (panel.hidden) return;
            const rect = active.getBoundingClientRect();
            const width = panel.offsetWidth || Math.min(600, innerWidth - 16);
            const height = panel.offsetHeight || 350;
            const mobile = innerWidth <= 700;
            const left = moved?.left ?? (mobile ? (innerWidth - width) / 2 :
                rect.right + width + 16 < innerWidth ? rect.right + 12 : innerWidth - width - 18);
            const fitsBelow = rect.bottom + height + 12 < innerHeight;
            const fitsAbove = rect.top - height - 12 > 0;
            const top = moved?.top ?? (mobile && rect.bottom < innerHeight - height - 8 ? innerHeight - height - 8 :
                fitsBelow ? rect.bottom + 10 : fitsAbove ? rect.top - height - 10 : innerHeight - height - 8);
            panel.style.left = `${Math.max(8, Math.min(innerWidth - width - 8, left))}px`;
            panel.style.top = `${Math.max(8, Math.min(innerHeight - height - 8, top))}px`;
        }

        function close() {
            panel.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Mostrar teclado matemático');
            document.body.classList.remove('math-keyboard-open');
        }
        function open() {
            panel.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
            toggle.setAttribute('aria-label', 'Ocultar teclado matemático');
            document.body.classList.add('math-keyboard-open');
            render();
        }

        function emit(field) {
            virtualInput = true;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            virtualInput = false;
            // input is the application's live-update event; change remains a user commit.
        }

        function editField(item) {
            if (!active || !active.isConnected) { close(); return; }
            const field = active;
            if (field.mathEditor) { field.mathEditor.apply(item); position(); return; }
            const isNumber = field.type === 'number';
            const start = isNumber ? field.value.length : field.selectionStart;
            const end = isNumber ? start : field.selectionEnd;
            const oldValue = isNumber ? (buffer.get(field) ?? field.value) : field.value;
            const from = isNumber ? oldValue.length : start;
            const to = isNumber ? from : end;
            let insert = item.insert;
            let next = from;
            if (insert === null) {
                if (item.label === 'AC') {
                    if (isNumber) { buffer.delete(field); field.value = ''; }
                    else field.setRangeText('', 0, field.value.length, 'start');
                    next = 0;
                } else if (item.label === '⌫') {
                    if (isNumber) {
                        const candidate = oldValue.slice(0, -1);
                        buffer.set(field, candidate); field.value = candidate;
                    } else {
                        next = start === end ? Math.max(0, start - 1) : start;
                        field.setRangeText('', next, end, 'start');
                    }
                } else if (!isNumber) {
                    next = Math.max(0, Math.min(field.value.length, start + (item.label === '←' ? -1 : 1)));
                }
            } else if (isNumber) {
                const candidate = oldValue + insert;
                if (/^-?(?:\d+)?(?:\.\d*)?$/.test(candidate) &&
                    (field.maxLength < 0 || candidate.length <= field.maxLength)) {
                    buffer.set(field, candidate);
                    field.value = candidate;
                }
            } else if (field.maxLength < 0 || field.value.length - (to - from) + insert.length <= field.maxLength) {
                field.setRangeText(insert, from, to, 'end');
                next = from + insert.length + item.offset;
            }
            if (!isNumber) field.setSelectionRange(next, next);
            field.focus({ preventScroll: true });
            emit(field);
            position();
        }

        document.addEventListener('focusin', event => {
            const profile = profileFor(event.target);
            if (!profile) return;
            const target = event.target.closest('#raices-funcion-visual') || event.target;
            if (active !== target) {
                active = target;
                buffer = new WeakMap();
                tab = 'main';
            }
            toggle.hidden = false;
            open();
        });
        // Keep selection and the active field when a key or the toggle is pressed.
        panel.addEventListener('pointerdown', event => {
            if (event.target.closest('button') && event.cancelable) event.preventDefault();
        });
        toggle.addEventListener('pointerdown', event => { if (event.cancelable) event.preventDefault(); });
        panel.addEventListener('click', event => {
            if (event.target.closest('.math-keyboard__close')) { close(); return; }
            if (event.target.closest('.math-keyboard__reset')) { moved = null; position(); return; }
            const tabButton = event.target.closest('[data-tab]');
            if (tabButton) { tab = tabButton.dataset.tab; render(); return; }
            const button = event.target.closest('.math-keyboard__key');
            if (button) editField(button._mathKey);
        });
        panel.querySelector('.math-keyboard__header').addEventListener('pointerdown', event => {
            if (event.target.closest('button') || event.button !== 0) return;
            const rect = panel.getBoundingClientRect();
            drag = { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
            panel.classList.add('math-keyboard--dragging');
            event.preventDefault();
        });
        document.addEventListener('pointermove', event => {
            if (!drag || drag.id !== event.pointerId) return;
            moved = { left: event.clientX - drag.x, top: event.clientY - drag.y };
            position();
        });
        function endDrag(event) {
            if (!drag || drag.id !== event.pointerId) return;
            drag = null; panel.classList.remove('math-keyboard--dragging');
        }
        document.addEventListener('pointerup', endDrag);
        document.addEventListener('pointercancel', endDrag);
        toggle.addEventListener('click', () => { if (panel.hidden) open(); else close(); });
        document.addEventListener('pointerdown', event => {
            if (panel.contains(event.target) || event.target === toggle || profileFor(event.target)) return;
            close();
            // Leave the launcher available after closing; it reopens the last field.
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !panel.hidden) close();
        });
        ['#conversion-origen', '#romanos-direccion', '#input-n'].forEach(selector => {
            const control = document.querySelector(selector);
            for (const eventName of ['input', 'change']) {
                control?.addEventListener(eventName, () => { if (active) render(); });
            }
        });
        document.addEventListener('input', event => {
            if (event.target === active && active?.type === 'number' && !virtualInput) buffer.delete(active);
        });
        window.addEventListener('resize', position);
        window.addEventListener('scroll', position, true);
        toggle.hidden = true;
    });
})();
