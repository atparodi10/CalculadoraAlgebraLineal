"""LU con pivoteo parcial y verificación PA≈LU, sin estados intermedios."""
import math
from ..utilidades.recursos import Presupuesto


def factorizar(A):
    n = len(A); U = [[float(x) for x in fila] for fila in A]
    L = [[float(i == j) for j in range(n)] for i in range(n)]
    perm = list(range(n)); swaps = 0; presupuesto = Presupuesto()
    for col in range(n):
        presupuesto.revisar()
        piv = max(range(col, n), key=lambda i: abs(U[i][col]))
        if U[piv][col] == 0: return 0., L, U, perm, swaps, 0.
        if piv != col:
            U[piv], U[col] = U[col], U[piv]; perm[piv], perm[col] = perm[col], perm[piv]
            L[col][:col], L[piv][:col] = L[piv][:col], L[col][:col]; swaps += 1
        for i in range(col+1, n):
            L[i][col] = U[i][col]/U[col][col]
            for j in range(col+1, n): U[i][j] -= L[i][col]*U[col][j]
            U[i][col] = 0.
    det = (-1.)**swaps * math.prod(U[i][i] for i in range(n))
    residuo = 0.
    for i in range(n):
        presupuesto.revisar()
        for j in range(n):
            valor = math.fsum(L[i][k]*U[k][j] for k in range(n))
            residuo = max(residuo, abs(A[perm[i]][j]-valor))
    return det, L, U, perm, swaps, residuo


def determinante_resumido(A):
    det, L, U, perm, swaps, residuo = factorizar(A)
    escala = max(max(abs(v) for v in fila) for fila in A)
    final = {'mensaje': 'Factorización completada: PA = LU', 'tipo': 'lu_final',
             'L_final': L, 'U_final': U,
             'P_final': [[int(perm[i] == j) for j in range(len(A))] for i in range(len(A))],
             'intercambios': swaps, 'signo': (-1)**swaps,
             'diag_U': [U[i][i] for i in range(len(A))],
             'producto_diag': math.prod(U[i][i] for i in range(len(A))), 'determinante': det,
             'residuo_factorizacion': residuo, 'verificacion_ok': residuo <= 1e-9*max(escala, 1e-300)}
    return det, [final], ['Método: LU con pivoteo parcial.',
                        f'Intercambios: {swaps}; det(A) = (-1)^{swaps} × producto de diag(U).',
                        f'Verificación PA≈LU: residuo máximo {residuo:.10g}.'], None
