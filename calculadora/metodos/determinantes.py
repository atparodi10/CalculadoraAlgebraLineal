# MOTOR DE DETERMINANTES — Lineal Tanix
# Calcula el determinante de una matriz cuadrada usando tres métodos:
#   1. Cofactores (expansión de Laplace con selección inteligente de fila/columna)
#   2. Regla de Sarrus (exclusivo para 3×3)
#   3. Factorización LU con pivoteo parcial
#
# Todos producen el mismo resultado dentro de tolerancias numéricas.
# No se modifica la matriz original. Se redondea solo para presentación.
#
# Cada método devuelve datos estructurados (coordenadas, índices, estados)
# para que el frontend dibuje transformaciones visuales paso a paso:
#   - Cofactores: pivote, fila/columna tachada, submatriz extraída
#   - Sarrus: matriz expandida, coordenadas de diagonales para flechas SVG
#   - LU: estados progresivos de L y U, intercambios de fila

import time
import math

from .operaciones_matrices import validar_formato_matriz

# --- Límites de protección ---
LIMITE_DIMENSION_MAXIMA = 200
LIMITE_COFACTORES = 10  # Cofactores recursivo es O(n!); limitar para evitar bloqueos


def _obtener_info_ram_servidor():
    """Consulta RAM del servidor. Reutiliza la misma lógica que inversa.py."""
    try:
        import psutil
        mem = psutil.virtual_memory()
        return {
            "total_gb": round(mem.total / (1024 ** 3), 2),
            "disponible_gb": round(mem.available / (1024 ** 3), 2)
        }
    except ImportError:
        pass
    import os
    if hasattr(os, 'sysconf'):
        try:
            return {
                "total_gb": round((os.sysconf('SC_PHYS_PAGES') * os.sysconf('SC_PAGE_SIZE')) / (1024 ** 3), 2),
                "disponible_gb": round((os.sysconf('SC_AVPHYS_PAGES') * os.sysconf('SC_PAGE_SIZE')) / (1024 ** 3), 2)
            }
        except (ValueError, OSError):
            pass
    return None


def _redondear(val, decimales=6):
    """Redondea para presentación. Valores ~0 se convierten a 0.0."""
    if abs(val) < 1e-10:
        return 0.0
    return round(val, decimales)


def _fmt(val):
    """Formatea un número para ecuaciones textuales."""
    r = _redondear(val, 4)
    if r == int(r):
        return str(int(r))
    return str(r)


def _contar_ceros_fila(matriz, fila):
    return sum(1 for v in matriz[fila] if abs(v) < 1e-10)


def _contar_ceros_columna(matriz, col):
    return sum(1 for fila in matriz if abs(fila[col]) < 1e-10)


def _menor(matriz, fila_excluida, col_excluida):
    """Devuelve la submatriz resultante de eliminar la fila y columna indicadas."""
    n = len(matriz)
    return [
        [matriz[i][j] for j in range(n) if j != col_excluida]
        for i in range(n) if i != fila_excluida
    ]


# =====================================================================
# MÉTODO 1: COFACTORES (Expansión de Laplace)
# =====================================================================

def determinante_cofactores(A):
    """
    Calcula det(A) por expansión de Laplace con selección de la fila o columna
    con más ceros para reducir operaciones. Recursivo con caso base 1×1 y 2×2.

    Retorna: (determinante, pasos, pasos_ecuaciones, error)

    Cada paso visual incluye:
    - tipo: 'cofactor_step'
    - matriz: la matriz completa actual
    - pivote: {fila, col} — coordenadas del elemento seleccionado
    - fila_tachada: índice de la fila tachada
    - col_tachada: índice de la columna tachada
    - submatriz: la menor extraída
    - signo: +1 o -1
    - elemento: valor numérico del pivote
    - cofactor_valor: resultado parcial de este cofactor
    """
    n = len(A)

    if n > LIMITE_COFACTORES:
        return None, [], [], (
            f"Error: Cofactores no disponible para {n}×{n} "
            f"(límite: {LIMITE_COFACTORES}×{LIMITE_COFACTORES}). "
            f"La complejidad factorial hace el cálculo inviable. "
            f"Usa Factorización LU para matrices grandes."
        )

    pasos = [{"mensaje": f"Matriz A original ({n}×{n}):", "matriz": [fila[:] for fila in A], "tipo": "matriz_original"}]
    pasos_ecuaciones = [f"Método: Expansión de Laplace (Cofactores) — Matriz {n}×{n}"]

    det, _ = _cofactores_recursivo(A, pasos, pasos_ecuaciones, nivel=0)

    pasos_ecuaciones.append(f"Determinante final: det(A) = {_fmt(det)}")

    # Paso final con resultado escalar
    pasos.append({
        "mensaje": f"Resultado: det(A) = {_fmt(det)}",
        "tipo": "resultado_final",
        "valor": _redondear(det, 6)
    })

    return det, pasos, pasos_ecuaciones, None


def _cofactores_recursivo(M, pasos, pasos_ecuaciones, nivel):
    """
    Calcula det(M) recursivamente. Retorna (determinante, pasos_count).
    Selecciona la fila o columna con más ceros para minimizar recursiones.
    Emite pasos visuales detallados con coordenadas de tachado y submatrices.
    """
    n = len(M)
    indent = "  " * nivel

    # Caso base 1×1
    if n == 1:
        det = M[0][0]
        pasos_ecuaciones.append(f"{indent}det([{_fmt(det)}]) = {_fmt(det)}")
        return det, 0

    # Caso base 2×2
    if n == 2:
        det = M[0][0] * M[1][1] - M[0][1] * M[1][0]
        pasos_ecuaciones.append(
            f"{indent}det 2×2: ({_fmt(M[0][0])}·{_fmt(M[1][1])}) − "
            f"({_fmt(M[0][1])}·{_fmt(M[1][0])}) = "
            f"{_fmt(M[0][0] * M[1][1])} − {_fmt(M[0][1] * M[1][0])} = {_fmt(det)}"
        )
        # Paso visual para la submatriz 2×2 (solo en nivel 0 o 1)
        if nivel <= 1:
            pasos.append({
                "mensaje": f"det 2×2 = ({_fmt(M[0][0])}·{_fmt(M[1][1])}) − ({_fmt(M[0][1])}·{_fmt(M[1][0])}) = {_fmt(det)}",
                "tipo": "det_2x2",
                "matriz": [fila[:] for fila in M],
                "diagonal_principal": [[0, 0], [1, 1]],
                "diagonal_secundaria": [[0, 1], [1, 0]],
                "valor": _redondear(det, 4)
            })
        return det, 0

    # Seleccionar fila o columna con más ceros
    mejor_tipo = "fila"
    mejor_idx = 0
    mejor_ceros = -1

    for i in range(n):
        c = _contar_ceros_fila(M, i)
        if c > mejor_ceros:
            mejor_ceros = c
            mejor_idx = i
            mejor_tipo = "fila"

    for j in range(n):
        c = _contar_ceros_columna(M, j)
        if c > mejor_ceros:
            mejor_ceros = c
            mejor_idx = j
            mejor_tipo = "columna"

    if mejor_tipo == "fila":
        fila = mejor_idx
        pasos_ecuaciones.append(
            f"{indent}Expandiendo por fila {fila + 1} ({mejor_ceros} ceros):"
        )

        # Paso visual: indicar cuál fila se expande
        if nivel == 0:
            pasos.append({
                "mensaje": f"Expansión por fila {fila + 1} (con {mejor_ceros} ceros):",
                "tipo": "expansion_info",
                "matriz": [fila_data[:] for fila_data in M],
                "expansion_tipo": "fila",
                "expansion_indice": fila
            })

        det = 0.0
        terminos = []

        for j in range(n):
            if abs(M[fila][j]) < 1e-10:
                terminos.append(f"0")
                continue

            signo = (-1) ** (fila + j)
            signo_str = "+" if signo > 0 else "−"
            menor_mat = _menor(M, fila, j)

            pasos_ecuaciones.append(
                f"{indent}  Cofactor C[{fila+1},{j+1}]: signo=({signo_str}1) × "
                f"a[{fila+1},{j+1}]={_fmt(M[fila][j])} × det(Menor {len(menor_mat)}×{len(menor_mat)})"
            )

            det_menor, _ = _cofactores_recursivo(menor_mat, pasos, pasos_ecuaciones, nivel + 1)
            contribucion = signo * M[fila][j] * det_menor
            det += contribucion

            # Paso visual de cofactor con coordenadas de tachado
            if nivel <= 1:
                pasos.append({
                    "mensaje": (
                        f"Cofactor C[{fila+1},{j+1}]: "
                        f"({signo_str}1) × {_fmt(M[fila][j])} × det(M') = "
                        f"{signo_str}{_fmt(abs(contribucion))}"
                    ),
                    "tipo": "cofactor_step",
                    "matriz": [fila_data[:] for fila_data in M],
                    "pivote": {"fila": fila, "col": j},
                    "fila_tachada": fila,
                    "col_tachada": j,
                    "submatriz": [fila_data[:] for fila_data in menor_mat],
                    "signo": signo,
                    "signo_str": signo_str,
                    "elemento": _redondear(M[fila][j], 4),
                    "det_menor": _redondear(det_menor, 4),
                    "cofactor_valor": _redondear(contribucion, 4),
                    "nivel": nivel,
                    "n_original": n
                })

            terminos.append(f"({signo_str}1)·{_fmt(M[fila][j])}·{_fmt(det_menor)}")
            pasos_ecuaciones.append(
                f"{indent}  → Cofactor C[{fila+1},{j+1}] = {signo_str}{_fmt(abs(contribucion))}"
            )

        pasos_ecuaciones.append(f"{indent}Σ = {' + '.join(terminos)} = {_fmt(det)}")
        return det, 0

    else:
        col = mejor_idx
        pasos_ecuaciones.append(
            f"{indent}Expandiendo por columna {col + 1} ({mejor_ceros} ceros):"
        )

        if nivel == 0:
            pasos.append({
                "mensaje": f"Expansión por columna {col + 1} (con {mejor_ceros} ceros):",
                "tipo": "expansion_info",
                "matriz": [fila_data[:] for fila_data in M],
                "expansion_tipo": "columna",
                "expansion_indice": col
            })

        det = 0.0
        terminos = []

        for i in range(n):
            if abs(M[i][col]) < 1e-10:
                terminos.append(f"0")
                continue

            signo = (-1) ** (i + col)
            signo_str = "+" if signo > 0 else "−"
            menor_mat = _menor(M, i, col)

            pasos_ecuaciones.append(
                f"{indent}  Cofactor C[{i+1},{col+1}]: signo=({signo_str}1) × "
                f"a[{i+1},{col+1}]={_fmt(M[i][col])} × det(Menor {len(menor_mat)}×{len(menor_mat)})"
            )

            det_menor, _ = _cofactores_recursivo(menor_mat, pasos, pasos_ecuaciones, nivel + 1)
            contribucion = signo * M[i][col] * det_menor
            det += contribucion

            if nivel <= 1:
                pasos.append({
                    "mensaje": (
                        f"Cofactor C[{i+1},{col+1}]: "
                        f"({signo_str}1) × {_fmt(M[i][col])} × det(M') = "
                        f"{signo_str}{_fmt(abs(contribucion))}"
                    ),
                    "tipo": "cofactor_step",
                    "matriz": [fila_data[:] for fila_data in M],
                    "pivote": {"fila": i, "col": col},
                    "fila_tachada": i,
                    "col_tachada": col,
                    "submatriz": [fila_data[:] for fila_data in menor_mat],
                    "signo": signo,
                    "signo_str": signo_str,
                    "elemento": _redondear(M[i][col], 4),
                    "det_menor": _redondear(det_menor, 4),
                    "cofactor_valor": _redondear(contribucion, 4),
                    "nivel": nivel,
                    "n_original": n
                })

            terminos.append(f"({signo_str}1)·{_fmt(M[i][col])}·{_fmt(det_menor)}")
            pasos_ecuaciones.append(
                f"{indent}  → Cofactor C[{i+1},{col+1}] = {signo_str}{_fmt(abs(contribucion))}"
            )

        pasos_ecuaciones.append(f"{indent}Σ = {' + '.join(terminos)} = {_fmt(det)}")
        return det, 0


# =====================================================================
# MÉTODO 2: REGLA DE SARRUS (exclusivo 3×3)
# =====================================================================

def determinante_sarrus(A):
    """
    Calcula det(A) por la regla de Sarrus. Solo para matrices 3×3.
    Muestra diagonales positivas, negativas, productos y resta.

    Retorna: (determinante, pasos, pasos_ecuaciones, error)

    Los pasos incluyen:
    - tipo: 'sarrus_visual' con:
      - matriz: la 3×3 original
      - filas_expandidas: las 2 primeras filas duplicadas debajo
      - diagonales_principales: lista de 3 diagonales, cada una con
        coordenadas [[fila, col], ...] en la cuadrícula expandida (5 filas)
      - diagonales_secundarias: ídem para las anti-diagonales
      - productos_pos/neg: los 6 productos individuales
      - ecuacion_final: string con la ecuación explícita
    """
    n = len(A)

    if n != 3:
        return None, [], [], (
            f"Error: La regla de Sarrus solo aplica a matrices 3×3. "
            f"Dimensiones recibidas: {n}×{n}."
        )

    pasos = [{"mensaje": "Matriz A original (3×3):", "matriz": [fila[:] for fila in A], "tipo": "matriz_original"}]
    pasos_ecuaciones = ["Método: Regla de Sarrus — Exclusivo para matrices 3×3"]

    a = A[0][0]; b = A[0][1]; c = A[0][2]
    d = A[1][0]; e = A[1][1]; f = A[1][2]
    g = A[2][0]; h = A[2][1]; k = A[2][2]

    # Diagonales positivas (izquierda a derecha)
    p1 = a * e * k
    p2 = b * f * g
    p3 = c * d * h

    # Diagonales negativas (derecha a izquierda)
    n1 = c * e * g
    n2 = b * d * k
    n3 = a * f * h

    suma_pos = p1 + p2 + p3
    suma_neg = n1 + n2 + n3
    det = suma_pos - suma_neg

    pasos_ecuaciones.append("Diagonales principales (positivas, de izquierda a derecha):")
    pasos_ecuaciones.append(f"  Diagonal 1: a₁₁·a₂₂·a₃₃ = {_fmt(a)}·{_fmt(e)}·{_fmt(k)} = {_fmt(p1)}")
    pasos_ecuaciones.append(f"  Diagonal 2: a₁₂·a₂₃·a₃₁ = {_fmt(b)}·{_fmt(f)}·{_fmt(g)} = {_fmt(p2)}")
    pasos_ecuaciones.append(f"  Diagonal 3: a₁₃·a₂₁·a₃₂ = {_fmt(c)}·{_fmt(d)}·{_fmt(h)} = {_fmt(p3)}")
    pasos_ecuaciones.append(f"  Suma positiva = {_fmt(p1)} + {_fmt(p2)} + {_fmt(p3)} = {_fmt(suma_pos)}")

    pasos_ecuaciones.append("Diagonales secundarias (negativas, de derecha a izquierda):")
    pasos_ecuaciones.append(f"  Diagonal 1: a₁₃·a₂₂·a₃₁ = {_fmt(c)}·{_fmt(e)}·{_fmt(g)} = {_fmt(n1)}")
    pasos_ecuaciones.append(f"  Diagonal 2: a₁₂·a₂₁·a₃₃ = {_fmt(b)}·{_fmt(d)}·{_fmt(k)} = {_fmt(n2)}")
    pasos_ecuaciones.append(f"  Diagonal 3: a₁₁·a₂₃·a₃₂ = {_fmt(a)}·{_fmt(f)}·{_fmt(h)} = {_fmt(n3)}")
    pasos_ecuaciones.append(f"  Suma negativa = {_fmt(n1)} + {_fmt(n2)} + {_fmt(n3)} = {_fmt(suma_neg)}")

    pasos_ecuaciones.append(f"det(A) = Σ positivas − Σ negativas = {_fmt(suma_pos)} − {_fmt(suma_neg)} = {_fmt(det)}")

    # Construir la "matriz expandida" (5 filas: original 3 + 2 filas duplicadas)
    # Las coordenadas de las diagonales se dan sobre esta cuadrícula de 5×3
    filas_expandidas = [A[0][:], A[1][:]]  # las 2 primeras filas duplicadas

    # Diagonales principales (↘) en la cuadrícula expandida 5×3
    # D1: (0,0) → (1,1) → (2,2)
    # D2: (1,0) → (2,1) → (3,2)  — fila 3 es A[0] duplicada
    # D3: (2,0) → (3,1) → (4,2)  — filas 3,4 son A[0],A[1] duplicadas
    diag_principales = [
        {"coords": [[0, 0], [1, 1], [2, 2]], "elementos": [_fmt(a), _fmt(e), _fmt(k)], "producto": _redondear(p1, 4)},
        {"coords": [[1, 0], [2, 1], [3, 2]], "elementos": [_fmt(d), _fmt(h), _fmt(c)], "producto": _redondear(p2, 4)},
        {"coords": [[2, 0], [3, 1], [4, 2]], "elementos": [_fmt(g), _fmt(b), _fmt(f)], "producto": _redondear(p3, 4)},
    ]

    # Diagonales secundarias (↙) en la cuadrícula expandida 5×3
    # D1: (0,2) → (1,1) → (2,0)
    # D2: (1,2) → (2,1) → (3,0)
    # D3: (2,2) → (3,1) → (4,0)
    diag_secundarias = [
        {"coords": [[0, 2], [1, 1], [2, 0]], "elementos": [_fmt(c), _fmt(e), _fmt(g)], "producto": _redondear(n1, 4)},
        {"coords": [[1, 2], [2, 1], [3, 0]], "elementos": [_fmt(f), _fmt(h), _fmt(a)], "producto": _redondear(n2, 4)},
        {"coords": [[2, 2], [3, 1], [4, 0]], "elementos": [_fmt(k), _fmt(b), _fmt(d)], "producto": _redondear(n3, 4)},
    ]

    # Paso visual completo con toda la información de Sarrus
    pasos.append({
        "mensaje": "Regla de Sarrus — Matriz expandida con diagonales:",
        "tipo": "sarrus_visual",
        "matriz": [fila[:] for fila in A],
        "filas_expandidas": filas_expandidas,
        "diagonales_principales": diag_principales,
        "diagonales_secundarias": diag_secundarias,
        "productos_pos": [_redondear(p1, 4), _redondear(p2, 4), _redondear(p3, 4)],
        "productos_neg": [_redondear(n1, 4), _redondear(n2, 4), _redondear(n3, 4)],
        "suma_pos": _redondear(suma_pos, 4),
        "suma_neg": _redondear(suma_neg, 4),
        "determinante": _redondear(det, 4),
        "ecuacion_final": (
            f"({_fmt(p1)} + {_fmt(p2)} + {_fmt(p3)}) − "
            f"({_fmt(n1)} + {_fmt(n2)} + {_fmt(n3)}) = {_fmt(det)}"
        ),
        "sarrus_info": {
            "positivas": [
                {"indices": [[0, 0], [1, 1], [2, 2]], "producto": _redondear(p1, 4)},
                {"indices": [[0, 1], [1, 2], [2, 0]], "producto": _redondear(p2, 4)},
                {"indices": [[0, 2], [1, 0], [2, 1]], "producto": _redondear(p3, 4)}
            ],
            "negativas": [
                {"indices": [[0, 2], [1, 1], [2, 0]], "producto": _redondear(n1, 4)},
                {"indices": [[0, 1], [1, 0], [2, 2]], "producto": _redondear(n2, 4)},
                {"indices": [[0, 0], [1, 2], [2, 1]], "producto": _redondear(n3, 4)}
            ],
            "suma_pos": _redondear(suma_pos, 4),
            "suma_neg": _redondear(suma_neg, 4),
            "determinante": _redondear(det, 4)
        }
    })

    return det, pasos, pasos_ecuaciones, None


# =====================================================================
# MÉTODO 3: FACTORIZACIÓN LU CON PIVOTEO PARCIAL
# =====================================================================

def determinante_lu(A):
    """
    Calcula det(A) mediante factorización PA = LU con pivoteo parcial.
    det(A) = (-1)^intercambios × producto(diagonal(U)).

    Retorna: (determinante, pasos, pasos_ecuaciones, error)

    Los pasos incluyen estados progresivos de L y U:
    - tipo: 'lu_step' con L_estado, U_estado, col_actual
    - tipo: 'lu_swap' con filas intercambiadas
    - tipo: 'lu_final' con L, U, P completas
    """
    n = len(A)

    pasos = [{"mensaje": f"Matriz A original ({n}×{n}):", "matriz": [fila[:] for fila in A], "tipo": "matriz_original"}]
    pasos_ecuaciones = [
        f"Método: Factorización LU con pivoteo parcial — Matriz {n}×{n}",
        "Se descompone PA = LU, donde P es la matriz de permutación, L es triangular inferior y U es triangular superior.",
        "det(A) = (−1)^(intercambios) × ∏ diagonal(U)"
    ]

    # Copiar A como float para trabajar
    U = [[float(A[i][j]) for j in range(n)] for i in range(n)]
    L = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    # Permutación como lista de índices
    perm = list(range(n))
    intercambios = 0

    # Paso visual: estado inicial de L y U
    pasos.append({
        "mensaje": "Estado inicial de L y U:",
        "tipo": "lu_step",
        "L_estado": [[_redondear(L[i][j], 4) for j in range(n)] for i in range(n)],
        "U_estado": [[_redondear(U[i][j], 4) for j in range(n)] for i in range(n)],
        "col_actual": -1,
        "celdas_nuevas_L": [],
        "celdas_nuevas_U": []
    })

    for col in range(n):
        # Pivoteo parcial: encontrar el mayor valor absoluto en la columna
        pivote_idx = col
        for i in range(col + 1, n):
            if abs(U[i][col]) > abs(U[pivote_idx][col]):
                pivote_idx = i

        if abs(U[pivote_idx][col]) < 1e-10:
            # Pivote cero → determinante es 0
            pasos_ecuaciones.append(
                f"Columna {col + 1}: pivote ≈ 0 → La matriz es singular, det(A) = 0"
            )
            pasos.append({
                "mensaje": f"Matriz U parcial (pivote cero en columna {col + 1}):",
                "tipo": "lu_step",
                "L_estado": [[_redondear(L[i][j], 4) for j in range(n)] for i in range(n)],
                "U_estado": [[_redondear(U[i][j], 4) for j in range(n)] for i in range(n)],
                "col_actual": col,
                "pivote_cero": True,
                "celdas_nuevas_L": [],
                "celdas_nuevas_U": []
            })
            return 0.0, pasos, pasos_ecuaciones, None

        # Intercambiar filas si es necesario
        if pivote_idx != col:
            U[col], U[pivote_idx] = U[pivote_idx], U[col]
            perm[col], perm[pivote_idx] = perm[pivote_idx], perm[col]
            # Intercambiar las partes ya calculadas de L
            for k in range(col):
                L[col][k], L[pivote_idx][k] = L[pivote_idx][k], L[col][k]
            intercambios += 1

            pasos_ecuaciones.append(
                f"Intercambio: F{col + 1} ↔ F{pivote_idx + 1} "
                f"(pivote {_fmt(U[col][col])} > {_fmt(U[pivote_idx][col])} en columna {col + 1})"
            )
            pasos.append({
                "mensaje": f"Intercambio F{col + 1} ↔ F{pivote_idx + 1}:",
                "tipo": "lu_swap",
                "fila_a": col,
                "fila_b": pivote_idx,
                "L_estado": [[_redondear(L[i][j], 4) for j in range(n)] for i in range(n)],
                "U_estado": [[_redondear(U[i][j], 4) for j in range(n)] for i in range(n)],
                "intercambio_num": intercambios,
                "celdas_nuevas_L": [],
                "celdas_nuevas_U": []
            })

        # Eliminación: calcular multiplicadores y actualizar U y L
        celdas_L_nuevas = []
        celdas_U_nuevas = []

        for i in range(col + 1, n):
            if abs(U[i][col]) < 1e-10:
                L[i][col] = 0.0
                continue
            factor = U[i][col] / U[col][col]
            L[i][col] = factor
            celdas_L_nuevas.append([i, col])
            for j in range(col, n):
                U[i][j] -= factor * U[col][j]
                celdas_U_nuevas.append([i, j])

            pasos_ecuaciones.append(
                f"F{i + 1} = F{i + 1} − ({_fmt(factor)}) × F{col + 1}"
            )

        # Mostrar estado de U después de eliminar columna (solo para matrices ≤ 10)
        if n <= 10:
            pasos.append({
                "mensaje": f"Eliminación columna {col + 1} completada:",
                "tipo": "lu_step",
                "L_estado": [[_redondear(L[i][j], 4) for j in range(n)] for i in range(n)],
                "U_estado": [[_redondear(U[i][j], 4) for j in range(n)] for i in range(n)],
                "col_actual": col,
                "celdas_nuevas_L": celdas_L_nuevas,
                "celdas_nuevas_U": celdas_U_nuevas
            })

    # Construir matriz de permutación P para presentación
    P = [[1.0 if perm[i] == j else 0.0 for j in range(n)] for i in range(n)]

    # Calcular determinante
    producto_diag = 1.0
    diag_vals = []
    for i in range(n):
        diag_vals.append(U[i][i])
        producto_diag *= U[i][i]

    signo = (-1) ** intercambios
    det = signo * producto_diag

    # Paso final con L, U, P
    pasos.append({
        "mensaje": "Factorización completada: PA = LU",
        "tipo": "lu_final",
        "L_final": [[_redondear(L[i][j], 4) for j in range(n)] for i in range(n)],
        "U_final": [[_redondear(U[i][j], 4) for j in range(n)] for i in range(n)],
        "P_final": [[int(P[i][j]) for j in range(n)] for i in range(n)] if intercambios > 0 else None,
        "intercambios": intercambios,
        "diag_U": [_redondear(v, 4) for v in diag_vals],
        "producto_diag": _redondear(producto_diag, 4),
        "signo": signo,
        "determinante": _redondear(det, 4)
    })

    # Ecuaciones finales
    pasos_ecuaciones.append("")
    pasos_ecuaciones.append("Diagonal de U:")
    diag_strs = [_fmt(v) for v in diag_vals]
    pasos_ecuaciones.append(f"  diag(U) = [{', '.join(diag_strs)}]")
    pasos_ecuaciones.append(f"  ∏ diag(U) = {'×'.join(diag_strs)} = {_fmt(producto_diag)}")
    pasos_ecuaciones.append(f"Intercambios de filas: {intercambios}")
    pasos_ecuaciones.append(f"Signo: (−1)^{intercambios} = {'+1' if signo > 0 else '−1'}")
    pasos_ecuaciones.append(f"det(A) = {'+1' if signo > 0 else '−1'} × {_fmt(producto_diag)} = {_fmt(det)}")

    return det, pasos, pasos_ecuaciones, None


# =====================================================================
# RECOMENDADOR INTELIGENTE DE MÉTODO
# =====================================================================

def recomendar_metodo(A):
    """
    Recomienda el método más eficiente basado en tamaño y esparsidad.
    Retorna: dict con 'metodo_recomendado', 'razon', 'metodos_disponibles'.
    """
    n = len(A)
    metodos_disponibles = []

    # Cofactores: siempre disponible si n <= LIMITE_COFACTORES
    if n <= LIMITE_COFACTORES:
        metodos_disponibles.append({
            "id": "cofactores",
            "nombre": "Cofactores (Laplace)",
            "disponible": True
        })
    else:
        metodos_disponibles.append({
            "id": "cofactores",
            "nombre": "Cofactores (Laplace)",
            "disponible": False,
            "razon_no_disponible": f"Deshabilitado para n>{LIMITE_COFACTORES} (complejidad factorial)"
        })

    # Sarrus: solo 3×3
    metodos_disponibles.append({
        "id": "sarrus",
        "nombre": "Regla de Sarrus",
        "disponible": n == 3,
        "razon_no_disponible": None if n == 3 else "Solo aplica a matrices 3×3"
    })

    # LU: siempre disponible
    metodos_disponibles.append({
        "id": "lu",
        "nombre": "Factorización LU",
        "disponible": True
    })

    # Lógica de recomendación
    if n <= 2:
        recomendado = "cofactores"
        razon = (
            f"Para matrices {n}×{n}, la expansión directa por cofactores es inmediata "
            f"y produce pocos pasos."
        )
    elif n == 3:
        # Verificar esparsidad: si hay muchos ceros, cofactores puede ser más eficiente
        total_ceros = sum(1 for i in range(n) for j in range(n) if abs(A[i][j]) < 1e-10)
        if total_ceros >= 5:
            recomendado = "cofactores"
            razon = (
                f"La matriz 3×3 tiene {total_ceros} ceros de 9 entradas. "
                f"Cofactores aprovecha los ceros para reducir cálculos. "
                f"Sarrus también es eficiente para 3×3."
            )
        else:
            recomendado = "sarrus"
            razon = (
                "Para matrices 3×3 densas, Sarrus calcula el determinante con exactamente "
                "6 productos y una resta, sin recursión ni eliminación."
            )
    else:
        # 4×4 en adelante
        if n <= LIMITE_COFACTORES:
            # Verificar si la matriz es muy dispersa
            total_celdas = n * n
            total_ceros = sum(1 for i in range(n) for j in range(n) if abs(A[i][j]) < 1e-10)
            ratio_ceros = total_ceros / total_celdas

            if ratio_ceros >= 0.6 and n <= 6:
                recomendado = "cofactores"
                razon = (
                    f"La matriz {n}×{n} es dispersa ({total_ceros}/{total_celdas} ceros, "
                    f"{ratio_ceros*100:.0f}%). Cofactores puede aprovechar los ceros para "
                    f"omitir ramas recursivas y reducir operaciones."
                )
            else:
                recomendado = "lu"
                razon = (
                    f"Para matrices {n}×{n}, la factorización LU tiene complejidad O(n³) "
                    f"frente a la complejidad factorial de cofactores, requiriendo "
                    f"generalmente menos operaciones aritméticas."
                )
        else:
            recomendado = "lu"
            razon = (
                f"Para matrices {n}×{n}, LU es el único método viable. "
                f"Cofactores está deshabilitado por complejidad factorial (n>{LIMITE_COFACTORES}). "
                f"LU opera en O(n³)."
            )

    return {
        "metodo_recomendado": recomendado,
        "razon": razon,
        "metodos_disponibles": metodos_disponibles,
        "dimension": n
    }


# =====================================================================
# FUNCIÓN PRINCIPAL DE CÁLCULO
# =====================================================================

def calcular_determinante(A, metodo="auto"):
    """
    Punto de entrada principal. Valida la matriz, selecciona el método y calcula.

    Args:
        A: Matriz cuadrada (lista de listas).
        metodo: 'cofactores', 'sarrus', 'lu' o 'auto' (usa recomendación).

    Retorna: (resultado_escalar, pasos, pasos_ecuaciones, error, tiempo_info, recomendacion)
    """
    t_inicio = time.perf_counter()

    # Validación estructural
    valida, msj = validar_formato_matriz(A, "Matriz A")
    if not valida:
        return None, [], [], msj, None, None

    n = len(A)

    # Verificar cuadrada
    if len(A[0]) != n:
        return None, [], [], (
            f"Error: El determinante requiere una matriz cuadrada. "
            f"Dimensiones recibidas: {n}×{len(A[0])}."
        ), None, None

    # Verificar límite
    if n > LIMITE_DIMENSION_MAXIMA:
        return None, [], [], (
            f"Error: Dimensión {n}×{n} excede el límite del servidor "
            f"({LIMITE_DIMENSION_MAXIMA}×{LIMITE_DIMENSION_MAXIMA})."
        ), None, None

    # Validar valores finitos
    for i in range(n):
        for j in range(n):
            val = A[i][j]
            if isinstance(val, float) and (math.isinf(val) or math.isnan(val)):
                return None, [], [], (
                    f"Error: Valor no finito ({val}) en la posición ({i+1},{j+1}). "
                    f"Solo se aceptan números reales finitos."
                ), None, None

    # Obtener recomendación
    recomendacion = recomendar_metodo(A)

    # Resolver método auto
    if metodo == "auto":
        metodo = recomendacion["metodo_recomendado"]

    # Ejecutar método seleccionado
    if metodo == "cofactores":
        det, pasos, pasos_eq, err = determinante_cofactores(A)
    elif metodo == "sarrus":
        det, pasos, pasos_eq, err = determinante_sarrus(A)
    elif metodo == "lu":
        det, pasos, pasos_eq, err = determinante_lu(A)
    else:
        return None, [], [], f"Error: Método '{metodo}' no reconocido.", None, None

    if err:
        t_fin = time.perf_counter()
        tiempo_info = {
            "duracion_calculo_s": round(t_fin - t_inicio, 6),
            "descripcion": "Tiempo de cálculo (validación + intento de cálculo)"
        }
        return None, pasos, pasos_eq, err, tiempo_info, recomendacion

    t_fin = time.perf_counter()
    info_ram = _obtener_info_ram_servidor()
    tiempo_info = {
        "duracion_calculo_s": round(t_fin - t_inicio, 6),
        "descripcion": (
            f"Tiempo de cálculo del servidor (validación + "
            f"determinante por {metodo})"
        ),
        "ram_servidor": info_ram
    }

    return det, pasos, pasos_eq, None, tiempo_info, recomendacion
