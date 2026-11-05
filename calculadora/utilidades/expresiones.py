"""Parser descendente único: construye un árbol acotado y nunca ejecuta código.

Gramática: suma → producto → unario → potencia → átomo. La potencia es
asociativa a la derecha y tiene prioridad sobre el signo: -x^2 = -(x^2).
La biblioteca estándar math evita las pérdidas de precisión de series truncadas.
"""
import math
import re
from functools import lru_cache

MAX_LONGITUD = 1000
MAX_TOKENS = 256
MAX_PROFUNDIDAD = 32
FUNCIONES = {'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
             'sqrt': math.sqrt, 'ln': math.log, 'log': math.log10,
             'exp': math.exp, 'abs': abs}
_NUMERO = re.compile(r'(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?')
_PALABRA = re.compile(r'[a-zA-Z_]+')


def normalizar_ecuacion(expresion):
    if not isinstance(expresion, str) or not expresion.strip():
        raise ValueError('La función debe ser un texto no vacío.')
    if len(expresion) > MAX_LONGITUD:
        raise ValueError(f'La expresión admite como máximo {MAX_LONGITUD} caracteres.')
    partes = expresion.strip().split('=')
    if len(partes) > 2 or any(not p.strip() for p in partes):
        raise ValueError('La ecuación debe tener dos miembros y un único signo =.')
    return f'({partes[0].strip()}) - ({partes[1].strip()})' if len(partes) == 2 else partes[0]


def _tokenizar(expr):
    tokens = []
    pos = 0
    while pos < len(expr):
        c = expr[pos]
        if c.isspace():
            pos += 1
            continue
        numero = _NUMERO.match(expr, pos)
        palabra = _PALABRA.match(expr, pos)
        if numero:
            token = ('num', float(numero[0])); pos = numero.end()
            if not math.isfinite(token[1]) or abs(token[1]) > 1e100:
                raise ValueError('Constante numérica fuera del rango permitido (1e100).')
        elif c == 'π':
            token = ('const', math.pi); pos += 1
        elif palabra:
            valor = palabra[0].lower(); pos = palabra.end()
            if valor == 'x': token = ('var', 'x')
            elif valor in ('pi', 'e'): token = ('const', math.pi if valor == 'pi' else math.e)
            elif valor in FUNCIONES: token = ('func', valor)
            else: raise ValueError(f'Identificador no reconocido: {palabra[0]}.')
        elif expr.startswith('**', pos):
            token = ('op', '^'); pos += 2
        elif c in '+-*/^()':
            token = (c if c in '()' else 'op', c); pos += 1
        else:
            raise ValueError(f'Carácter no permitido en posición {pos+1}: {c}.')
        if tokens:
            anterior = tokens[-1][0]
            if anterior in ('num', 'const', 'var', ')') and token[0] in ('num', 'const', 'var', 'func', '('):
                if anterior == 'num' and token[0] == 'num':
                    raise ValueError('Dos números consecutivos requieren un operador.')
                tokens.append(('op', '*'))
        tokens.append(token)
        if len(tokens) > MAX_TOKENS:
            raise ValueError(f'Expresión demasiado compleja (máximo {MAX_TOKENS} tokens).')
    return tokens


class _Parser:
    """Analiza una sola vez; los nodos son tuplas inmutables reutilizables."""
    def __init__(self, tokens):
        self.tokens, self.pos, self.nivel = tokens, 0, 0

    def tomar(self, valor):
        if self.pos < len(self.tokens) and self.tokens[self.pos][1] == valor:
            self.pos += 1
            return True
        return False

    def parse(self):
        nodo = self.suma()
        if self.pos != len(self.tokens): raise ValueError('Operador o paréntesis inesperado.')
        return nodo

    def suma(self):
        nodo = self.producto()
        while self.pos < len(self.tokens) and self.tokens[self.pos][1] in ('+', '-'):
            op = self.tokens[self.pos][1]; self.pos += 1
            nodo = (op, nodo, self.producto())
        return nodo

    def producto(self):
        nodo = self.unario()
        while self.pos < len(self.tokens) and self.tokens[self.pos][1] in ('*', '/'):
            op = self.tokens[self.pos][1]; self.pos += 1
            nodo = (op, nodo, self.unario())
        return nodo

    def unario(self):
        self.nivel += 1
        if self.nivel > MAX_PROFUNDIDAD: raise ValueError('Demasiados niveles de anidación.')
        try:
            if self.tomar('+'): return ('pos', self.unario())
            if self.tomar('-'): return ('neg', self.unario())
            nodo = self.atomo()
            if self.tomar('^'): nodo = ('^', nodo, self.unario())
            return nodo
        finally:
            self.nivel -= 1

    def atomo(self):
        if self.pos == len(self.tokens): raise ValueError('Expresión incompleta.')
        tipo, valor = self.tokens[self.pos]; self.pos += 1
        if tipo in ('num', 'const'): return ('num', valor)
        if tipo == 'var': return ('var',)
        if tipo == 'func':
            if not self.tomar('('): raise ValueError(f'La función {valor} requiere paréntesis.')
            nodo = ('func', valor, self.suma())
            if not self.tomar(')'): raise ValueError('Falta cerrar un paréntesis.')
            return nodo
        if tipo == '(':
            nodo = self.suma()
            if not self.tomar(')'): raise ValueError('Falta cerrar un paréntesis.')
            return nodo
        raise ValueError('Se esperaba un número, x, una función o un paréntesis.')


def _evaluar(nodo, x):
    tipo = nodo[0]
    if tipo == 'num': return nodo[1]
    if tipo == 'var': return x
    if tipo == 'pos': return _evaluar(nodo[1], x)
    if tipo == 'neg': return -_evaluar(nodo[1], x)
    if tipo == 'func':
        argumento = _evaluar(nodo[2], x)
        if nodo[1] == 'tan' and abs(math.cos(argumento)) < 1e-14:
            raise ValueError('Tangente no definida cerca de una asíntota.')
        valor = FUNCIONES[nodo[1]](argumento)
    else:
        a, b = _evaluar(nodo[1], x), _evaluar(nodo[2], x)
        if tipo == '+': valor = a + b
        elif tipo == '-': valor = a - b
        elif tipo == '*': valor = a * b
        elif tipo == '/': valor = a / b
        else:
            if abs(b) > 10000: raise ValueError('Exponente fuera del límite (10000).')
            valor = math.pow(a, b)
    if not math.isfinite(valor): raise ValueError('La evaluación produjo un valor no finito.')
    return valor


class Expresion:
    def __init__(self, texto):
        self.texto = normalizar_ecuacion(texto)
        self.arbol = _Parser(_tokenizar(self.texto)).parse()

    def __call__(self, x):
        try:
            if isinstance(x, bool) or not math.isfinite(x): raise ValueError('x debe ser finito.')
            return float(_evaluar(self.arbol, float(x)))
        except (ArithmeticError, ValueError) as error:
            raise ValueError(f'Función no definida o fuera de rango en x={x}: {error}') from None

    def seguro(self, x):
        try: return self(x)
        except ValueError: return float('nan')


@lru_cache(maxsize=128)
def _compilar(texto):
    return Expresion(texto)


def compilar_expresion(texto):
    if not isinstance(texto, str): raise ValueError("La función debe ser texto.")
    return _compilar(texto)
