"""Validación y parametrización compartidas, sin redondear la solución interna."""
import math
from .validacion import matriz, vector


def validar_sistema(A, b, m, n):
    matriz(A, 'A'); vector(b, m, 'b')
    if len(A) != m or len(A[0]) != n:
        raise ValueError('Las dimensiones no coinciden con A y b.')


def parametrizar(M, m, n):
    # Copia escalonada: despeja de abajo hacia arriba. Los parámetros siguen
    # asociados a sus columnas, incluso cuando hay columnas iniciales sin pivote.
    expresiones = {}; pivotes = []
    for i in range(m):
        col = next((j for j in range(n) if abs(M[i][j]) > 1e-10), None)
        if col is not None: pivotes.append((i, col))
    libres = [j for j in range(n) if j not in {c for _, c in pivotes}]
    for k, j in enumerate(libres):
        coefs = [0.] * len(libres); coefs[k] = 1.
        expresiones[j] = (0., coefs)
    for i, col in reversed(pivotes):
        constante = M[i][n] / M[i][col]; coefs = [0.] * len(libres)
        for j in range(col+1, n):
            factor = M[i][j] / M[i][col]
            if j in expresiones:
                c, v = expresiones[j]; constante -= factor*c
                coefs = [a-factor*b for a, b in zip(coefs, v)]
        expresiones[col] = (constante, coefs)
    textos = ['Solución paramétrica: t1, t2, ... son números reales.']
    for j in range(n):
        c, v = expresiones[j]
        texto = f'x{j+1} = {c:.10g}'
        for k, a in enumerate(v):
            if abs(a) > 1e-10: texto += f" {'+' if a >= 0 else '-'} {abs(a):.10g}t{k+1}"
        if j in libres: texto += ' (variable libre)'
        textos.append(texto)
    return textos
