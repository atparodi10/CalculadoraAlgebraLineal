# MOTOR DE MATRIZ INVERSA — Lineal Tanix
# Calcula la inversa de una matriz cuadrada usando el método de Gauss-Jordan
# aplicado a la matriz aumentada [A | I]. Reutiliza funciones existentes del
# proyecto (validación de formato, clonación de matrices). No usa numpy ni
# librerías matemáticas externas: toda la aritmética es manual.

from .operaciones_matrices import validar_formato_matriz
from ..utilidades.matrices import clonar_matriz


def crear_identidad(n):
    """
    Genera una matriz identidad de tamaño n×n.
    Cada fila tiene un 1 en la posición diagonal y 0 en las demás.
    """
    identidad = []
    for i in range(n):
        fila = []
        for j in range(n):
            if i == j:
                fila.append(1.0)
            else:
                fila.append(0.0)
        identidad.append(fila)
    return identidad


def clonar_aumentada(M):
    """
    Crea una copia independiente de la matriz aumentada [A | I].
    Reusa el patrón de clonar_matriz pero aplicado a la estructura completa.
    """
    return [fila[:] for fila in M]


def inversa_matriz(A):
    """
    Calcula la inversa de la matriz A usando eliminación de Gauss-Jordan.
    Construye la matriz aumentada [A | I] y aplica operaciones de fila hasta
    transformar la parte izquierda en la identidad. La parte derecha será A⁻¹.

    Retorna: (resultado, pasos, pasos_ecuaciones, error)
    - resultado: la matriz inversa (lista de listas) o None si no es invertible.
    - pasos: historial visual de estados matriciales para el frontend.
    - pasos_ecuaciones: desglose textual de cada operación elemental realizada.
    - error: mensaje de error si la matriz no es invertible, o None si todo OK.
    """
    # === Validación estructural usando la función compartida ===
    valida, msj = validar_formato_matriz(A, "Matriz A")
    if not valida:
        return None, [], [], msj

    n = len(A)

    # Verificar que la matriz sea cuadrada
    if len(A[0]) != n:
        return None, [], [], f"Error: La matriz debe ser cuadrada para calcular su inversa. Dimensiones recibidas: {n}×{len(A[0])}."

    # === Construir la matriz aumentada [A | I] ===
    I = crear_identidad(n)
    M = []
    for i in range(n):
        # Fila de A seguida de fila de I, todo como float para precisión
        fila_aumentada = [float(x) for x in A[i]] + I[i][:]
        M.append(fila_aumentada)

    pasos = []
    pasos_ecuaciones = ["Método: Eliminación de Gauss-Jordan sobre la matriz aumentada [A | I]"]

    def guardar_paso(mensaje, matriz_actual):
        """Almacena un snapshot de la matriz aumentada para visualización."""
        pasos.append({"mensaje": mensaje, "matriz": clonar_aumentada(matriz_actual)})

    def extraer_A_actual(mat):
        """Extrae la parte izquierda (n×n) de la matriz aumentada."""
        return [fila[:n] for fila in mat]

    def extraer_I_actual(mat):
        """Extrae la parte derecha (n×n) de la matriz aumentada."""
        return [fila[n:] for fila in mat]

    guardar_paso("Matriz aumentada [A | I] inicial:", M)
    pasos_ecuaciones.append("Matriz A original con la identidad adjunta:")

    # Mostrar la representación textual de la matriz original
    for i in range(n):
        partes_A = [str(round(A[i][j], 4)) for j in range(n)]
        partes_I = [str(round(I[i][j], 4)) for j in range(n)]
        pasos_ecuaciones.append(f"  Fila {i+1}: [{', '.join(partes_A)} | {', '.join(partes_I)}]")

    # === Eliminación de Gauss-Jordan ===
    for col in range(n):
        # --- Pivoteo parcial: buscar el mayor valor absoluto en la columna ---
        pivote = col
        for i in range(col + 1, n):
            if abs(M[i][col]) > abs(M[pivote][col]):
                pivote = i

        # Si el pivote es (casi) cero, la matriz es singular
        if abs(M[pivote][col]) < 1e-10:
            return None, pasos, pasos_ecuaciones, (
                f"Error: La matriz es singular (no invertible). "
                f"La columna {col+1} se vuelve cero durante la eliminación, "
                f"indicando que el determinante es 0."
            )

        # Intercambiar filas si es necesario
        if pivote != col:
            M[col], M[pivote] = M[pivote], M[col]
            guardar_paso(f"Intercambio de Fila {col+1} con Fila {pivote+1}", M)
            pasos_ecuaciones.append(f"F{col+1} ↔ F{pivote+1}")

        # --- Normalizar la fila pivote ---
        pivote_val = M[col][col]
        for j in range(2 * n):
            M[col][j] /= pivote_val
        guardar_paso(f"Fila {col+1} = Fila {col+1} / {round(pivote_val, 4)}", M)
        pasos_ecuaciones.append(f"F{col+1} = F{col+1} / {round(pivote_val, 4)}  (Pivote a 1)")

        # --- Eliminar las demás entradas de la columna (arriba y abajo) ---
        for i in range(n):
            if i != col and abs(M[i][col]) > 1e-10:
                factor = M[i][col]
                for j in range(2 * n):
                    M[i][j] -= factor * M[col][j]
                guardar_paso(
                    f"Fila {i+1} = Fila {i+1} - ({round(factor, 4)}) × Fila {col+1}", M
                )
                pasos_ecuaciones.append(
                    f"F{i+1} = F{i+1} - ({round(factor, 4)}) × F{col+1}  (Eliminar columna {col+1})"
                )

    # === Extraer el resultado (parte derecha de la matriz aumentada) ===
    inversa = extraer_I_actual(M)

    # Redondear valores muy cercanos a 0 para limpieza visual
    for i in range(n):
        for j in range(n):
            if abs(inversa[i][j]) < 1e-10:
                inversa[i][j] = 0.0
            else:
                inversa[i][j] = round(inversa[i][j], 6)

    guardar_paso("Matriz aumentada final [I | A⁻¹]:", M)

    pasos_ecuaciones.append("Resultado: La parte derecha de la matriz aumentada es A⁻¹:")
    for i in range(n):
        vals = [str(round(inversa[i][j], 4)) for j in range(n)]
        pasos_ecuaciones.append(f"  Fila {i+1} de A⁻¹: [{', '.join(vals)}]")

    # === Verificación: A × A⁻¹ = I ===
    pasos_ecuaciones.append("Verificación: A × A⁻¹ debe ser la identidad:")
    verificacion_ok = True
    for i in range(n):
        for j in range(n):
            suma = 0.0
            for k in range(n):
                suma += A[i][k] * inversa[k][j]
            esperado = 1.0 if i == j else 0.0
            if abs(suma - esperado) > 1e-4:
                verificacion_ok = False
        fila_ver = [str(round(sum(A[i][k] * inversa[k][j] for k in range(n)), 4)) for j in range(n)]
        pasos_ecuaciones.append(f"  Fila {i+1} de (A × A⁻¹): [{', '.join(fila_ver)}]")

    if verificacion_ok:
        pasos_ecuaciones.append("✓ Verificación exitosa: A × A⁻¹ = I")
    else:
        pasos_ecuaciones.append("⚠ Advertencia: Posible error de precisión numérica en la verificación.")

    return inversa, pasos, pasos_ecuaciones, None
