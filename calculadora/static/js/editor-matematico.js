// MathQuill edits layout; Flask remains the only mathematical evaluator.
(function () {
    'use strict';
    const names = { sen: 'sin', seno: 'sin', coseno: 'cos', tangente: 'tan', raiz: 'sqrt',
        exponencial: 'exp', absoluto: 'abs', sin: 'sin', cos: 'cos', tan: 'tan', sqrt: 'sqrt',
        ln: 'ln', log: 'log', exp: 'exp', abs: 'abs' };

    // Serialize the supported subset of LaTeX without evaluating it. In particular, a
    // multi-token exponent and both sides of a fraction retain their grouping.
    function toExpression(latex) {
        let i = 0;
        function group(open = '{', close = '}') {
            if (latex[i++] !== open) throw Error('Falta un grupo');
            const value = sequence(close);
            if (latex[i++] !== close) throw Error('Grupo incompleto');
            return value;
        }
        function argument() {
            return latex[i] === '{' ? group() : atom();
        }
        function atom() {
            if (i >= latex.length) throw Error('Falta un argumento');
            const c = latex[i++];
            if (c === '^') return '^(' + argument() + ')';
            if (c === '{') { i--; return '(' + group() + ')'; }
            if (c === '\\') {
                const match = /^[a-zA-Z]+/.exec(latex.slice(i));
                const command = match ? match[0] : latex[i++];
                if (match) i += command.length;
                while (latex[i] === ' ') i++;
                if (command === 'frac') return '((' + group() + ')/(' + group() + '))';
                if (command === 'sqrt') {
                    if (latex[i] === '[') { const n = group('[', ']'); return '((' + group() + ')^(1/(' + n + ')))'; }
                    return 'sqrt(' + group() + ')';
                }
                if (command === 'left' || command === 'right') {
                    const delimiter = latex[i++];
                    if (delimiter === '|') return command === 'left' ? 'abs(' : ')';
                    if (delimiter === '(' || delimiter === ')') return delimiter;
                    if (delimiter === '[' || delimiter === ']') return delimiter === '[' ? '(' : ')';
                    throw Error('Delimitador no soportado');
                }
                if (command === 'pi') return ' pi ';
                if (command === 'cdot' || command === 'times') return '*';
                if (command === 'div') return '/';
                if (Object.hasOwn(names, command)) return ' ' + names[command] + ' ';
                if (command === 'operatorname') {
                    const end = latex.indexOf('}', i);
                    const word = latex.slice(i + 1, end);
                    if (latex[i] !== '{' || !Object.hasOwn(names, word)) throw Error('Función no soportada');
                    i = end + 1;
                    return ' ' + names[word] + ' ';
                }
                if (command === ' ' || command === ',') return ' ';
                throw Error('Símbolo no admitido: ' + command);
            }
            if (c === 'x' || c === 'X' || c === 'e') return ' ' + c.toLowerCase() + ' ';
            if (/[0-9.+\-*/=()\s]/.test(c)) return c;
            throw Error('Símbolo no admitido: ' + c);
        }
        function sequence(close) {
            let result = '';
            while (i < latex.length && latex[i] !== close) result += atom();
            return result.trim();
        }
        return sequence().replace(/\s+/g, ' ').replace(/\s*([+\-*/^=()])\s*/g, '$1').trim();
    }

    // Convert a complete plain-text expression on switching modes. Parse precedence
    // before building LaTeX so division and right-associative powers keep their meaning.
    function toLatex(source) {
        if (!source.trim()) return '';
        const tokens = [];
        let rest = source.trim();
        while (rest) {
            const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|^[a-zA-Z]+|^π|^\*\*|^[+\-*/^=()]/.exec(rest);
            if (!match) throw Error('Entrada no reconocida');
            const value = match[0];
            tokens.push(value === '**' ? '^' : value);
            rest = rest.slice(value.length).trimStart();
        }
        let p = 0, depth = 0;
        const take = value => tokens[p] === value && (++p, true);
        const number = value => value !== undefined && /^(?:\d|\.\d)/.test(value);
        const startsAtom = value => value === '(' || number(value) || /^[a-zA-Zπ]+$/.test(value || '');
        const wrapped = node => '\\left(' + node + '\\right)';
        function primary() {
            const value = tokens[p++];
            if (value === '(') { const body = sum(); if (!take(')')) throw Error('Falta cerrar paréntesis'); return wrapped(body); }
            if (number(value)) {
                const scientific = value.match(/^(.+)[eE]([+-]?\d+)$/);
                return scientific ? wrapped(scientific[1] + '\\cdot 10^{' + scientific[2] + '}') : value;
            }
            const lower = (value || '').toLowerCase();
            if (lower === 'x' || lower === 'e') return lower;
            if (lower === 'pi' || lower === 'π') return '\\pi ';
            if (Object.hasOwn(names, lower)) {
                if (!take('(')) throw Error('Falta argumento');
                const body = sum();
                if (!take(')')) throw Error('Falta cerrar función');
                if (names[lower] === 'sqrt') return '\\sqrt{' + body + '}';
                if (names[lower] === 'abs') return '\\left|' + body + '\\right|';
                return '\\' + names[lower] + wrapped(body);
            }
            throw Error('Falta expresión');
        }
        function unary() {
            if (++depth > 64) throw Error('Expresión demasiado anidada');
            try {
                if (take('+')) return '+' + unary();
                if (take('-')) return '-' + unary();
                let node = primary();
                if (take('^')) node += '^{' + unary() + '}';
                return node;
            } finally { depth--; }
        }
        function product() {
            let node = unary();
            while (p < tokens.length) {
                if (take('*')) node += '\\cdot ' + unary();
                else if (take('/')) node = '\\frac{' + node + '}{' + unary() + '}';
                else if (startsAtom(tokens[p])) {
                    if (number(tokens[p - 1]) && number(tokens[p])) throw Error('Falta operador');
                    node += '\\cdot ' + unary();
                } else break;
            }
            return node;
        }
        function sum() {
            let node = product();
            while (tokens[p] === '+' || tokens[p] === '-') node += tokens[p++] + product();
            return node;
        }
        let latex = sum();
        if (take('=')) latex += '=' + sum();
        if (p !== tokens.length) throw Error('Expresión incompleta');
        return latex;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const raw = document.getElementById('raices-funcion-raw');
        const visual = document.getElementById('raices-funcion-visual');
        const switcher = document.getElementById('math-source-toggle');
        const status = document.getElementById('math-source-status');
        const location = document.getElementById('math-location');
        const locationPath = document.getElementById('math-location-path');
        const locationHint = document.getElementById('math-location-hint');
        if (!raw || !visual || !window.MathQuill) return;
        let syncing = false;
        let field;
        // These tree references belong to the locally pinned MathQuill version.
        // They let us mark an actual editable block, including nested fractions.
        function blockName(block) {
            const el = block?.jQ?.[0];
            if (!el || block.ctrlSeq !== undefined) return '';
            const cls = el.classList;
            if (cls.contains('mq-root-block')) return 'Expresión principal';
            if (cls.contains('mq-numerator')) return 'Numerador';
            if (cls.contains('mq-denominator')) return 'Denominador';
            if (cls.contains('mq-sup')) return 'Exponente';
            if (cls.contains('mq-nthroot')) return 'Índice de raíz';
            if (cls.contains('mq-sqrt-stem')) return 'Radicando';
            if (block.parent?.ctrlSeq === '\\left|') return 'Valor absoluto';
            if (block.parent?.ctrlSeq?.startsWith('\\left')) return 'Interior de paréntesis';
            return '';
        }
        function emptySlots() {
            const slots = [];
            if (!field) return slots;
            field.__controller.root.postOrder(node => {
                const name = blockName(node);
                if (name && name !== 'Expresión principal' && node.isEmpty()) slots.push({ node, name });
            });
            return slots;
        }
        function refreshLocation() {
            if (!field) return;
            const { cursor, root } = field.__controller;
            visual.querySelectorAll('.math-active-slot,.math-empty-slot').forEach(el => el.classList.remove('math-active-slot','math-empty-slot'));
            for (const slot of emptySlots()) slot.node.jQ[0].classList.add('math-empty-slot');
            const names = [];
            for (let node = cursor.parent; node && node.jQ; node = node.parent) {
                const name = blockName(node);
                if (name && node !== root) names.unshift(name);
            }
            const path = names.length ? names.join(' › ') : 'Expresión principal';
            if (cursor.parent !== root) cursor.parent.jQ[0].classList.add('math-active-slot');
            if (locationPath.textContent !== path) locationPath.textContent = path;
            locationHint.textContent = names.length ? 'Tab: siguiente · Esc: salir del nivel · Fin: al final de la función' : 'Flechas para moverte · haz clic en cualquier parte';
            visual.dispatchEvent(new CustomEvent('math-location-change', { bubbles: true, detail: { path, nested: cursor.parent !== root } }));
        }
        function reportValidation(message) {
            status.textContent = message;
            raw.dataset.mathError = message;
            visual.setAttribute('aria-invalid', String(Boolean(message)));
            raw.setAttribute('aria-invalid', String(Boolean(message)));
        }
        function validateText(value, slots = []) {
            if (!value.trim()) return '';
            if (slots.length) return 'Completa: ' + [...new Set(slots.map(slot => slot.name.toLowerCase()))].join(', ') + '.';
            if (/\^\s*\(\s*\)/.test(value)) return 'Completa el exponente: hay una potencia sin valor.';
            try { toLatex(value); return ''; }
            catch (_) { return 'Completa la expresión: revisa los operadores, paréntesis y argumentos de las funciones.'; }
        }
        function update() {
            if (syncing || !field) return;
            const previous = raw.value, previousError = raw.dataset.mathError;
            try {
                raw.value = toExpression(field.latex());
                reportValidation(validateText(raw.value, emptySlots()));
            } catch (_) { raw.value = field.latex(); reportValidation('Hay símbolos sin equivalencia en el formato de cálculo.'); }
            refreshLocation();
            // Moving the caret must not reset the graph or a previously computed result.
            if (previous === raw.value && previousError === raw.dataset.mathError) return;
            syncing = true;
            raw.dispatchEvent(new Event('input', { bubbles: true }));
            syncing = false;
        }
        field = MathQuill.getInterface(2).MathField(visual, {
            autoCommands: 'pi sqrt', autoOperatorNames: 'sin cos tan ln log exp abs',
            restrictMismatchedBrackets: true,
            handlers: { edit: update, enter: () => {
                if (field && field.__controller.cursor.parent !== field.__controller.root) { leaveLevel(); return; }
                document.getElementById('raices-submit').click();
            } }
        });
        visual.querySelector('textarea')?.setAttribute('aria-label', 'Expresión matemática: usa las flechas para recorrer los exponentes y fracciones');
        function syncFromRaw() {
            if (syncing) return true;
            try {
                const latex = toLatex(raw.value);
                syncing = true; field.latex(latex); syncing = false;
                reportValidation(''); refreshLocation();
                return true;
            } catch (_) { syncing = false; reportValidation(validateText(raw.value)); return false; }
        }
        raw.addEventListener('input', syncFromRaw);
        function sourceMode(showRaw) {
            raw.hidden = !showRaw; visual.hidden = showRaw;
            location.hidden = showRaw;
            switcher.textContent = showRaw ? 'Editor visual' : 'Editar texto';
            switcher.setAttribute('aria-pressed', String(showRaw));
            if (showRaw) raw.focus(); else { field.reflow(); field.focus(); refreshLocation(); }
        }
        switcher.addEventListener('click', () => {
            if (!raw.hidden && !syncFromRaw()) { status.textContent = 'Completa la expresión antes de volver al editor visual.'; return; }
            sourceMode(raw.hidden);
        });
        raw.hidden = true; visual.hidden = false; switcher.hidden = false;
        field.reflow();
        location.hidden = false;
        reportValidation('');
        function leaveLevel() {
            const ctrl = field.__controller;
            if (ctrl.cursor.parent !== ctrl.root) {
                ctrl.notify('move').cursor.insRightOf(ctrl.cursor.parent.parent);
                ctrl.scrollHoriz();
            }
            refreshLocation();
        }
        function focusMissing() {
            field.focus();
            const slot = emptySlots()[0];
            if (slot) {
                field.__controller.notify('move').cursor.insAtLeftEnd(slot.node);
                field.__controller.scrollHoriz();
            }
            refreshLocation();
        }
        // MathQuill moves the cursor during keydown/mousedown; inspect the resulting
        // position after the event, regardless of whether the expression changed.
        for (const eventName of ['keyup','pointerup','mouseup','focusin']) {
            visual.addEventListener(eventName, () => queueMicrotask(refreshLocation));
        }
        visual.addEventListener('keydown', event => {
            if (event.key === 'Escape' && field.__controller.cursor.parent !== field.__controller.root) {
                event.preventDefault(); event.stopImmediatePropagation(); leaveLevel();
            } else if (event.key === 'End' && !event.ctrlKey && !event.shiftKey) {
                event.preventDefault(); event.stopImmediatePropagation(); field.moveToRightEnd(); refreshLocation();
            } else queueMicrotask(refreshLocation);
        }, true);
        visual.mathEditor = {
            focus: () => { field.focus(); refreshLocation(); },
            focusMissing,
            location: () => locationPath.textContent,
            apply(item) {
                field.focus();
                if (item.action === 'fraction') field.cmd('\\frac');
                else if (item.action === 'root') field.cmd('\\sqrt');
                else if (item.action === 'nthroot') field.cmd('\\nthroot');
                else if (item.action === 'square') field.typedText('^2').keystroke('Right');
                else if (item.action === 'cube') field.typedText('^3').keystroke('Right');
                else if (item.action === 'power') field.typedText('^');
                else if (item.action === 'euler') field.typedText('e^');
                else if (item.action === 'abs') field.typedText('|');
                else if (item.action === 'function') field.typedText(item.insert.slice(0, -1));
                else if (item.action === 'pi') field.cmd('\\pi');
                else if (item.action === 'next') field.keystroke('Tab');
                else if (item.action === 'previous') field.keystroke('Shift-Tab');
                else if (item.action === 'exit') leaveLevel();
                else if (item.action === 'end') field.moveToRightEnd();
                else if (item.label === '←') field.keystroke('Left');
                else if (item.label === '→') field.keystroke('Right');
                else if (item.label === '↑') field.keystroke('Up');
                else if (item.label === '↓') field.keystroke('Down');
                else if (item.label === '⌫') field.keystroke('Backspace');
                else if (item.label === 'AC') field.latex('');
                else if (item.insert !== null) field.typedText(item.insert);
                update();
            }
        };
        refreshLocation();
    });
})();
