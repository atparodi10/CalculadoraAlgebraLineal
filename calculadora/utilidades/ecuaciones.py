"""Lectura completa de ecuaciones lineales; nunca ignora texto sobrante."""
import math
import re

_NUM = r'(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?'
_TERMINO = re.compile(rf'(?P<signo>[+-]?)(?:(?:(?P<coef>{_NUM})\*?)?[xX×](?P<indice>[0-9]+)|(?P<constante>{_NUM}))')


def parsear_ecuacion(ecuacion_str, n):
    if type(n) is not int or not 1 <= n <= 50:
        raise ValueError('La cantidad de variables debe estar entre 1 y 50.')
    if not isinstance(ecuacion_str, str) or len(ecuacion_str) > 2000:
        raise ValueError('Cada ecuación debe ser texto de hasta 2000 caracteres.')
    # Se permiten espacios entre términos, pero no unir números o identificadores rotos.
    eq = re.sub(r'\s*([+=*\-])\s*', r'\1', ecuacion_str.strip())
    if eq.count('=') != 1: raise ValueError("Debe contener un único signo '='.")
    izquierda, derecha = eq.split('=')
    fila, constantes = [0.0] * n, 0.0
    for lado, factor in ((izquierda, 1), (derecha, -1)):
        if not lado: raise ValueError('La ecuación tiene un miembro vacío.')
        pos = 0
        while pos < len(lado):
            termino = _TERMINO.match(lado, pos)
            if not termino or (pos and not termino['signo']):
                raise ValueError(f'Término inválido cerca de: {lado[pos:pos+25]}.')
            signo = factor * (-1 if termino['signo'] == '-' else 1)
            valor = float(termino['constante'] or termino['coef'] or 1)
            if not math.isfinite(valor) or abs(valor) > 1e12:
                raise ValueError('Los coeficientes deben ser finitos y no superar 1e12.')
            if termino['indice']:
                indice = int(termino['indice'])
                if not 1 <= indice <= n: raise ValueError(f'x{indice} está fuera de x1..x{n}.')
                fila[indice-1] += signo * valor
            else: constantes += signo * valor
            pos = termino.end()
    if any(abs(v) > 1e12 for v in fila + [constantes]):
        raise ValueError('La suma de coeficientes supera el límite 1e12.')
    return fila, -constantes


# matriz_a_ecuaciones(M, m, n) -> lista de textos para mostrar, no para calcular.
# M es aumentada: n columnas de coeficientes y la última columna es b.
# Omite coeficientes casi cero y redondea los restantes a cuatro decimales.
# También omite filas cuyos coeficientes sean todos casi cero; por eso los
# resolutores añaden aparte el aviso de contradicción '0 = valor'.
def matriz_a_ecuaciones(M, m, n):
    ecuaciones = []
    for i in range(m):
        # 1e-10 significa 0.0000000001. Se usa como tolerancia al tratar números float:
        # una operación puede producir un residuo diminuto en vez de un cero exacto.
        # El criterio usa el valor absoluto para tratar igual números positivos y negativos.
        if not all(abs(M[i][j]) < 1e-10 for j in range(n)):
            terminos = []
            for j in range(n):
                if abs(M[i][j]) > 1e-10:
                    terminos.append(f"{round(M[i][j], 4)}x{j+1}")
            if terminos:
                eq_str = " + ".join(terminos).replace("+ -", "- ")
                ecuaciones.append(f"{eq_str} = {round(M[i][n], 4)}")
    return ecuaciones

