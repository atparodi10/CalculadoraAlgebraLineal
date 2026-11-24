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
            '#raices-funcion-raw': 'function',
            '#raices-error, #raices-xl, #raices-xu, #raices-x0-newton, #raices-xm1, #raices-x0-secante': 'number',
            '#raices-maxiter': 'integer'
        }
    };

    const digits = '7894561230'.split('');
    const key = (label, insert = label, aria = label, offset = 0) => ({ label, insert, aria, offset });
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
            key('('), key(')'), key('x'), key('x²', '^2'), key('x³', '^3'), key('xʸ', '^'),
            key('√', 'sqrt()', 'Raíz cuadrada', -1),
            ...['sin', 'cos', 'tan', 'ln', 'log', 'exp', 'abs'].map(name => key(name, `${name}()`, name, -1)),
            key('π', 'pi'), key('e')]
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
        panel.innerHTML = '<div class="math-keyboard__header"><strong>Teclado matemático</strong>' +
            '<button class="math-keyboard__close" type="button" aria-label="Cerrar teclado">✕</button></div>' +
            '<div class="math-keyboard__keys"></div><div class="math-keyboard__variables" aria-label="Variables disponibles"></div>';
        toggle.setAttribute('aria-controls', panel.id);
        document.body.append(toggle, panel);
        const keys = panel.querySelector('.math-keyboard__keys');
        const variables = panel.querySelector('.math-keyboard__variables');
        let active = null;
        let buffer = new WeakMap();
        let virtualInput = false;

        function profileFor(field) {
            if (!(field instanceof HTMLElement) || field.disabled || field.readOnly) return null;
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
            function buttonFor(item) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'math-keyboard__key' + (item.insert === null ? ' math-keyboard__key--edit' : '');
                button.textContent = item.label;
                button.setAttribute('aria-label', item.aria);
                button._mathKey = item;
                return button;
            }
            keys.replaceChildren(...buttons.filter(item => !/^x\d+$/.test(item.label)).map(buttonFor));
            variables.replaceChildren(...buttons.filter(item => /^x\d+$/.test(item.label)).map(buttonFor));
            variables.hidden = profile !== 'equation';
            panel.querySelector('strong').textContent = ({
                equation: 'Ecuaciones lineales', matrix: 'Matriz', vector: 'Vector',
                number: 'Número', integer: 'Entero', base: 'Base de origen',
                roman: 'Números romanos', function: 'Función f(x)'
            })[profile];
            position();
        }

        function position() {
            if (!active || !active.isConnected) return;
            const rect = active.getBoundingClientRect();
            if (matchMedia('(max-width: 700px)').matches) {
                toggle.style.left = `${Math.max(8, Math.min(innerWidth - 50, rect.right - 43))}px`;
                toggle.style.top = `${Math.max(8, Math.min(innerHeight - 50, rect.top + 4))}px`;
                panel.style.left = '';
                panel.style.top = '';
            } else {
                toggle.style.left = `${Math.max(8, Math.min(innerWidth - 48, rect.right + 8))}px`;
                toggle.style.top = `${Math.max(8, rect.top)}px`;
                const width = Math.min(380, innerWidth - 16);
                const fitsRight = rect.right + width + 60 < innerWidth;
                const fitsLeft = rect.left - width - 8 > 0;
                panel.style.left = `${fitsRight ? rect.right + 52 : fitsLeft ? rect.left - width - 8 : Math.max(8, (innerWidth - width) / 2)}px`;
                const height = Math.min(panel.offsetHeight || 350, innerHeight - 16);
                panel.style.top = `${fitsRight || fitsLeft ? Math.max(8, Math.min(innerHeight - height - 8, rect.top)) :
                    rect.bottom + height + 8 < innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - height - 8)}px`;
            }
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
            if (active !== event.target) {
                active = event.target;
                buffer = new WeakMap();
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
            if (event.target.closest('.math-keyboard__close')) { close(); active?.focus({ preventScroll: true }); return; }
            const button = event.target.closest('.math-keyboard__key');
            if (button) editField(button._mathKey);
        });
        toggle.addEventListener('click', () => { if (panel.hidden) open(); else close(); });
        document.addEventListener('pointerdown', event => {
            if (panel.contains(event.target) || event.target === toggle || profileFor(event.target)) return;
            close();
            toggle.hidden = true;
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
