# MOTOR DE MATRIZ INVERSA — Lineal Tanix
# Calcula la inversa de una matriz cuadrada usando el método de Gauss-Jordan
# aplicado a la matriz aumentada [A | I]. Reutiliza funciones existentes del
# proyecto (validación de formato, clonación de matrices). No usa numpy ni
# librerías matemáticas externas: toda la aritmética es manual.
#
# Cambios respecto a la versión anterior:
# - Cada paso almacena ambas mitades (parte_A y parte_I) por separado para
#   que el frontend pueda dibujar la aumentada con separación visual.
# - La verificación A × A⁻¹ ≈ I incluye el desarrollo celda a celda con
#   productos parciales y avance progresivo del resultado.
# - Se mide el tiempo real de cálculo con time.perf_counter().
# - Se recopila información de RAM del servidor (total y disponible).

import time
import os
import math

from .operaciones_matrices import validar_formato_matriz
from ..utilidades.matrices import clonar_matriz


# --- Límites de protección ---
# Se acepta hasta 200×200 como máximo; más allá, la eliminación O(n³) produce
# tiempos inaceptables en un servidor web sin caché. El pivoteo parcial puede
# amplificar errores de punto flotante en matrices mucho mayores, y la memoria
# para la aumentada crece como 2·n². Estos límites se validan también aquí en
# el servidor para no depender únicamente del frontend.
LIMITE_DIMENSION_MAXIMA = 200


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


def _obtener_info_ram_servidor():
    """
    Consulta la RAM total y disponible del servidor.
    Intenta primero con psutil (funciona en Windows, Linux, macOS).
    Si psutil no está disponible, intenta os.sysconf en sistemas POSIX.
    Devuelve un diccionario con 'total_gb' y 'disponible_gb', o None si no
    es posible obtener la información. No ejecuta comandos de shell.
    """
    # Intento 1: psutil (compatible con Windows y demás plataformas)
    try:
        import psutil
        mem = psutil.virtual_memory()
        return {
            "total_gb": round(mem.total / (1024 ** 3), 2),
            "disponible_gb": round(mem.available / (1024 ** 3), 2)
        }
    except ImportError:
        pass

    # Intento 2: os.sysconf (solo disponible en plataformas POSIX)
    if hasattr(os, 'sysconf'):
        try:
            paginas_totales = os.sysconf('SC_PHYS_PAGES')
            paginas_disp = os.sysconf('SC_AVPHYS_PAGES')
            tam_pagina = os.sysconf('SC_PAGE_SIZE')
            return {
                "total_gb": round((paginas_totales * tam_pagina) / (1024 ** 3), 2),
                "disponible_gb": round((paginas_disp * tam_pagina) / (1024 ** 3), 2)
            }
        except (ValueError, OSError):
            pass

    # No se pudo obtener la información
    return None


def _redondear_presentacion(val, decimales=4):
    """
    Redondea un valor para presentación visual.
    Valores muy cercanos a cero se convierten a 0.0 para legibilidad.
    """
    if abs(val) < 1e-10:
        return 0.0
    return round(val, decimales)


def inversa_matriz(A):
    """
    Calcula la inversa de la matriz A usando eliminación de Gauss-Jordan.
    Construye la matriz aumentada [A | I] y aplica operaciones de fila hasta
    transformar la parte izquierda en la identidad. La parte derecha será A⁻¹.

    Retorna: (resultado, pasos, pasos_ecuaciones, error, tiempo_info)
    - resultado: la matriz inversa (lista de listas) o None si no es invertible.
    - pasos: historial visual de estados matriciales para el frontend.
      Cada paso incluye 'parte_A', 'parte_I' y 'n' además de 'mensaje' y 'matriz'.
    - pasos_ecuaciones: desglose textual de cada operación elemental realizada.
    - error: mensaje de error si la matriz no es invertible, o None si todo OK.
    - tiempo_info: diccionario con duración medida y metadatos del servidor.
    """
    # Iniciar medición de tiempo de cálculo en el servidor
    t_inicio = time.perf_counter()

    # === Validación estructural usando la función compartida ===
    valida, msj = validar_formato_matriz(A, "Matriz A")
    if not valida:
        return None, [], [], msj, None

    n = len(A)

    # Verificar que la matriz sea cuadrada
    if len(A[0]) != n:
        return None, [], [], (
            f"Error: La matriz debe ser cuadrada para calcular su inversa. "
            f"Dimensiones recibidas: {n}×{len(A[0])}."
        ), None

    # Verificar límite de dimensión en el servidor
    if n > LIMITE_DIMENSION_MAXIMA:
        return None, [], [], (
            f"Error: Dimensión {n}×{n} excede el límite del servidor "
            f"({LIMITE_DIMENSION_MAXIMA}×{LIMITE_DIMENSION_MAXIMA}). "
            f"Reducí el tamaño de la matriz."
        ), None

    # Validar que todas las entradas sean finitas
    for i in range(n):
        for j in range(n):
            val = A[i][j]
            if not isinstance(val, (int, float)):
                return None, [], [], (
                    f"Error: Valor no numérico en la posición ({i+1},{j+1})."
                ), None
            if isinstance(val, float) and (math.isinf(val) or math.isnan(val)):
                return None, [], [], (
                    f"Error: Valor no finito ({val}) en la posición ({i+1},{j+1}). "
                    f"Solo se aceptan números reales finitos."
                ), None

    # === Construir la matriz aumentada [A | I] ===
    I_original = crear_identidad(n)
    M = []
    for i in range(n):
        # Fila de A seguida de fila de I, todo como float para precisión
        fila_aumentada = [float(x) for x in A[i]] + I_original[i][:]
        M.append(fila_aumentada)

    pasos = []
    pasos_ecuaciones = ["Método: Eliminación de Gauss-Jordan sobre la matriz aumentada [A | I]"]

    def extraer_A_actual(mat):
        """Extrae la parte izquierda (n×n) de la matriz aumentada."""
        return [fila[:n] for fila in mat]

    def extraer_I_actual(mat):
        """Extrae la parte derecha (n×n) de la matriz aumentada."""
        return [fila[n:] for fila in mat]

    def guardar_paso(mensaje, matriz_actual):
        """
        Almacena un snapshot de la matriz aumentada para visualización.
        Guarda ambas mitades por separado para que el frontend dibuje la
        aumentada con separación visual entre la parte de A y la de I.
        """
        snapshot = clonar_aumentada(matriz_actual)
        pasos.append({
            "mensaje": mensaje,
            "matriz": snapshot,
            "parte_A": extraer_A_actual(snapshot),
            "parte_I": extraer_I_actual(snapshot),
            "n": n
        })

    guardar_paso("Matriz aumentada [A | I] inicial:", M)
    pasos_ecuaciones.append("Matriz A original con la identidad adjunta:")

    # Mostrar la representación textual de la matriz original
    for i in range(n):
        partes_A = [str(round(A[i][j], 4)) for j in range(n)]
        partes_I = [str(round(I_original[i][j], 4)) for j in range(n)]
        pasos_ecuaciones.append(f"  Fila {i+1}: [{', '.join(partes_A)} | {', '.join(partes_I)}]")

    # === Eliminación de Gauss-Jordan ===
    # Pivoteo parcial: se selecciona como pivote la fila con el mayor valor
    # absoluto en la columna actual. Este criterio reduce la amplificación de
    # errores de redondeo al evitar dividir por valores muy pequeños (mejora
    # la estabilidad numérica sin costo computacional adicional significativo).
    for col in range(n):
        # --- Pivoteo parcial: buscar el mayor valor absoluto en la columna ---
        pivote = col
        for i in range(col + 1, n):
            if abs(M[i][col]) > abs(M[pivote][col]):
                pivote = i

        # Si el pivote es (casi) cero, la matriz es singular.
        # Tolerancia 1e-10: valores menores se tratan como cero numérico.
        # Se conservan los pasos alcanzados hasta aquí ante singularidad.
        if abs(M[pivote][col]) < 1e-10:
            t_fin = time.perf_counter()
            tiempo_info = {
                "duracion_calculo_s": round(t_fin - t_inicio, 6),
                "descripcion": "Tiempo de cálculo del servidor (incluye validación, eliminación y detección de singularidad)"
            }
            return None, pasos, pasos_ecuaciones, (
                f"Error: La matriz es singular (no invertible). "
                f"La columna {col+1} se vuelve cero durante la eliminación, "
                f"indicando que el determinante es 0."
            ), tiempo_info

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
    # Se guardan valores sin redondear para la verificación interna
    inversa_exacta = extraer_I_actual(M)

    # Versión redondeada para presentación
    inversa = []
    for i in range(n):
        fila_r = []
        for j in range(n):
            fila_r.append(_redondear_presentacion(inversa_exacta[i][j], 6))
        inversa.append(fila_r)

    guardar_paso("Matriz aumentada final [I | A⁻¹]:", M)

    pasos_ecuaciones.append("Resultado: La parte derecha de la matriz aumentada es A⁻¹:")
    for i in range(n):
        vals = [str(_redondear_presentacion(inversa[i][j], 4)) for j in range(n)]
        pasos_ecuaciones.append(f"  Fila {i+1} de A⁻¹: [{', '.join(vals)}]")

    # === Verificación visual desarrollada: A × A⁻¹ ≈ I ===
    # Se usa la inversa exacta (sin redondear) para la verificación numérica.
    # Solo se redondea la presentación.
    TOLERANCIA = 1e-6
    verificacion_ok = True
    producto_resultado = []
    verificacion_detalle = []  # Desglose celda a celda

    pasos_ecuaciones.append(f"Verificación: A × A⁻¹ ≈ I  (tolerancia: {TOLERANCIA})")

    for i in range(n):
        fila_producto = []
        for j in range(n):
            # Desarrollar la multiplicación fila×columna
            terminos = []
            suma = 0.0
            for k in range(n):
                producto_parcial = A[i][k] * inversa_exacta[k][j]
                suma += producto_parcial
                terminos.append({
                    "a": _redondear_presentacion(A[i][k], 4),
                    "b": _redondear_presentacion(inversa_exacta[k][j], 4),
                    "parcial": _redondear_presentacion(producto_parcial, 6)
                })

            valor_final = _redondear_presentacion(suma, 6)
            fila_producto.append(valor_final)

            esperado = 1.0 if i == j else 0.0
            if abs(suma - esperado) > TOLERANCIA:
                verificacion_ok = False

            # Construir la cadena de desglose para esta celda
            detalles_str = " + ".join(
                [f"({t['a']})·({t['b']})" for t in terminos]
            )
            verificacion_detalle.append({
                "fila": i + 1,
                "columna": j + 1,
                "desglose": detalles_str,
                "resultado": valor_final,
                "esperado": esperado,
                "correcto": abs(suma - esperado) <= TOLERANCIA
            })

            # Solo añadir al desglose textual para matrices ≤ 5×5
            # (para matrices grandes, el frontend usa los datos estructurados)
            if n <= 5:
                pasos_ecuaciones.append(
                    f"  (A×A⁻¹)[{i+1},{j+1}] = {detalles_str} = {valor_final}"
                )

        producto_resultado.append(fila_producto)

    if n > 5:
        pasos_ecuaciones.append(
            f"  (Desglose celda a celda omitido en texto por tamaño {n}×{n}; "
            f"ver visualización matricial)"
        )

    if verificacion_ok:
        pasos_ecuaciones.append(f"✓ Verificación exitosa: A × A⁻¹ ≈ I (tolerancia {TOLERANCIA})")
    else:
        pasos_ecuaciones.append(
            f"⚠ Advertencia: Posible error de precisión numérica en la verificación "
            f"(tolerancia {TOLERANCIA})."
        )

    # Fin de la medición de tiempo
    t_fin = time.perf_counter()

    # Recopilar información de RAM del servidor
    info_ram = _obtener_info_ram_servidor()

    tiempo_info = {
        "duracion_calculo_s": round(t_fin - t_inicio, 6),
        "descripcion": (
            "Tiempo de cálculo del servidor (incluye validación, "
            "eliminación Gauss-Jordan, extracción de inversa y verificación A×A⁻¹)"
        ),
        "ram_servidor": info_ram
    }

    # Datos de verificación estructurados para el frontend
    datos_verificacion = {
        "A_original": [[_redondear_presentacion(A[i][j], 4) for j in range(n)] for i in range(n)],
        "inversa": [[_redondear_presentacion(inversa[i][j], 4) for j in range(n)] for i in range(n)],
        "producto": producto_resultado,
        "identidad_esperada": [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)],
        "detalle_celdas": verificacion_detalle,
        "tolerancia": TOLERANCIA,
        "verificacion_ok": verificacion_ok
    }

    return inversa, pasos, pasos_ecuaciones, None, tiempo_info, datos_verificacion
