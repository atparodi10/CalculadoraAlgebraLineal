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
        if (!raw || !visual || !window.MathQuill) return;
        let syncing = false;
        let field;
        function update() {
            if (syncing || !field) return;
            try { raw.value = toExpression(field.latex()); status.textContent = ''; }
            catch (_) { raw.value = field.latex(); status.textContent = 'Hay símbolos sin equivalencia en el formato de cálculo.'; }
            syncing = true;
            raw.dispatchEvent(new Event('input', { bubbles: true }));
            syncing = false;
        }
        field = MathQuill.getInterface(2).MathField(visual, {
            autoCommands: 'pi sqrt', autoOperatorNames: 'sin cos tan ln log exp abs',
            restrictMismatchedBrackets: true,
            handlers: { edit: update, enter: () => document.getElementById('raices-submit').click() }
        });
        visual.querySelector('textarea')?.setAttribute('aria-label', 'Expresión matemática: usa las flechas para recorrer los exponentes y fracciones');
        function syncFromRaw() {
            if (syncing) return true;
            try {
                const latex = toLatex(raw.value);
                syncing = true; field.latex(latex); syncing = false;
                return true;
            } catch (_) { syncing = false; return false; }
        }
        raw.addEventListener('input', syncFromRaw);
        function sourceMode(showRaw) {
            raw.hidden = !showRaw; visual.hidden = showRaw;
            switcher.textContent = showRaw ? 'Editor visual' : 'Editar texto';
            switcher.setAttribute('aria-pressed', String(showRaw));
            if (showRaw) raw.focus(); else { field.reflow(); field.focus(); }
        }
        switcher.addEventListener('click', () => {
            if (!raw.hidden && !syncFromRaw()) { status.textContent = 'Completa la expresión antes de volver al editor visual.'; return; }
            status.textContent = '';
            sourceMode(raw.hidden);
        });
        raw.hidden = true; visual.hidden = false; switcher.hidden = false;
        field.reflow();
        visual.mathEditor = {
            focus: () => field.focus(),
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
    });
})();
