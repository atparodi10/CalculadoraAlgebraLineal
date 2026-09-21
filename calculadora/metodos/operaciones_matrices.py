def validar_formato_matriz(matriz, nombre_matriz="Matriz"):
    """
    Función escudo que verifica la integridad estructural de los datos entrantes antes de operar.
    Paso 1: Valida que sea bidimensional. Paso 2: Confirma que sea un rectángulo perfecto (mxn).
    Paso 3: Asegura que todas las celdas contengan tipos de datos estrictamente numéricos.
    """
    if not matriz or not isinstance(matriz, list) or not isinstance(matriz[0], list):
        return False, f"Error: {nombre_matriz} no tiene un formato bidimensional válido."
    
    columnas_esperadas = len(matriz[0])
    
    for indice_fila, fila in enumerate(matriz):
        if len(fila) != columnas_esperadas:
            return False, f"Error en {nombre_matriz}: La fila {indice_fila + 1} tiene dimensiones irregulares."
        for elemento in fila:
            if not isinstance(elemento, (int, float)):
                return False, f"Error en {nombre_matriz}: Se encontró un valor no numérico ('{elemento}')."
                
    return True, "OK"


def suma_matrices(A, B):
    """
    Ejecuta la adición de dos matrices (C = A + B) tras comprobar que poseen dimensiones idénticas.
    El algoritmo recorre la estructura sumando las celdas homólogas (misma coordenada i, j).
    Almacena los estados matriciales y construye el texto de la ecuación de cada suma realizada.
    """
    valida_A, msj_A = validar_formato_matriz(A, "Matriz A")
    if not valida_A: return None, [], [], msj_A
    
    valida_B, msj_B = validar_formato_matriz(B, "Matriz B")
    if not valida_B: return None, [], [], msj_B

    filas_A, cols_A = len(A), len(A[0])
    filas_B, cols_B = len(B), len(B[0])
    
    if filas_A != filas_B or cols_A != cols_B:
        return None, [], [], f"Error: No se pueden sumar. Dimensiones incompatibles."
        
    resultado = []
    pasos = [
        {"mensaje": "Matriz A inicial:", "matriz": [fila[:] for fila in A]},
        {"mensaje": "Matriz B inicial:", "matriz": [fila[:] for fila in B]}
    ]
    pasos_ecuaciones = ["Desglose de Suma: C[i,j] = A[i,j] + B[i,j]"]
    
    for i in range(filas_A):
        fila_nueva = []
        for j in range(cols_A):
            suma_celda = A[i][j] + B[i][j]
            fila_nueva.append(suma_celda)
            pasos_ecuaciones.append(f"C[{i+1},{j+1}] = {A[i][j]} + ({B[i][j]}) = {suma_celda}")
        resultado.append(fila_nueva)
        
    pasos.append({"mensaje": "Matriz resultante (A + B):", "matriz": resultado})
    return resultado, pasos, pasos_ecuaciones, None


def resta_matrices(A, B):
    """
    Ejecuta la sustracción de dos matrices (C = A - B) tras verificar que sus dimensiones coinciden.
    El proceso itera sobre las coordenadas restando el valor del sustraendo (B) al minuendo (A).
    Registra el estado inicial, la matriz final resultante y el paso a paso algebraico con sus signos.
    """
    valida_A, msj_A = validar_formato_matriz(A, "Matriz A")
    if not valida_A: return None, [], [], msj_A
    
    valida_B, msj_B = validar_formato_matriz(B, "Matriz B")
    if not valida_B: return None, [], [], msj_B

    filas_A, cols_A = len(A), len(A[0])
    filas_B, cols_B = len(B), len(B[0])
    
    if filas_A != filas_B or cols_A != cols_B:
        return None, [], [], f"Error: No se pueden restar. Dimensiones incompatibles."
        
    resultado = []
    pasos = [
        {"mensaje": "Matriz A inicial:", "matriz": [fila[:] for fila in A]},
        {"mensaje": "Matriz B inicial:", "matriz": [fila[:] for fila in B]}
    ]
    pasos_ecuaciones = ["Desglose de Resta: C[i,j] = A[i,j] - B[i,j]"]
    
    for i in range(filas_A):
        fila_nueva = []
        for j in range(cols_A):
            resta_celda = A[i][j] - B[i][j]
            fila_nueva.append(resta_celda)
            pasos_ecuaciones.append(f"C[{i+1},{j+1}] = {A[i][j]} - ({B[i][j]}) = {resta_celda}")
        resultado.append(fila_nueva)
        
    pasos.append({"mensaje": "Matriz resultante (A - B):", "matriz": resultado})
    return resultado, pasos, pasos_ecuaciones, None


def mult_escalar_matriz(c, A):
    """
    Aplica un factor de escala (c) a una matriz (A), modificando su magnitud sin alterar su orden.
    Itera a través de todas las celdas multiplicando individualmente el escalar por el valor alojado.
    Devuelve la matriz transformada y documenta textualmente cada una de las operaciones ejecutadas.
    """
    valida_A, msj_A = validar_formato_matriz(A, "Matriz A")
    if not valida_A: return None, [], [], msj_A

    if not isinstance(c, (int, float)):
        return None, [], [], "Error: El escalar a multiplicar debe ser un número."

    resultado = []
    pasos = [{"mensaje": f"Matriz A original (Escalar c = {c}):", "matriz": [fila[:] for fila in A]}]
    pasos_ecuaciones = [f"Desglose de Multiplicación Escalar: C[i,j] = {c} * A[i,j]"]
    
    for i in range(len(A)):
        fila_nueva = []
        for j in range(len(A[0])):
            producto = c * A[i][j]
            fila_nueva.append(producto)
            pasos_ecuaciones.append(f"C[{i+1},{j+1}] = {c} * ({A[i][j]}) = {producto}")
        resultado.append(fila_nueva)
        
    pasos.append({"mensaje": f"Matriz resultante ({c} * A):", "matriz": resultado})
    return resultado, pasos, pasos_ecuaciones, None


def multiplicacion_matrices(A, B):
    """
    Calcula el producto matricial (C = A * B) garantizando que columnas de A igualen a filas de B.
    El algoritmo efectúa el producto punto cruzando cada fila del factor izquierdo con cada columna del derecho.
    Genera un registro detallado que muestra la sumatoria de productos parciales (ecuaciones) para cada celda.
    """
    valida_A, msj_A = validar_formato_matriz(A, "Matriz A")
    if not valida_A: return None, [], [], msj_A
    
    valida_B, msj_B = validar_formato_matriz(B, "Matriz B")
    if not valida_B: return None, [], [], msj_B

    filas_A, cols_A = len(A), len(A[0])
    filas_B, cols_B = len(B), len(B[0])
    
    if cols_A != filas_B:
        return None, [], [], f"Error matemático: Columnas de A ({cols_A}) no coinciden con filas de B ({filas_B})."
        
    resultado = []
    pasos = [
        {"mensaje": "Matriz A (Factor izquierdo):", "matriz": [fila[:] for fila in A]},
        {"mensaje": "Matriz B (Factor derecho):", "matriz": [fila[:] for fila in B]}
    ]
    pasos_ecuaciones = ["Ecuaciones de Producto Punto (Fila de A · Columna de B):"]
    
    for i in range(filas_A):
        fila_nueva = []
        for j in range(cols_B):
            suma_producto = 0
            detalles_operacion = []
            
            for k in range(cols_A):
                val_a = A[i][k]
                val_b = B[k][j]
                suma_producto += val_a * val_b
                detalles_operacion.append(f"({val_a})({val_b})")
            
            fila_nueva.append(suma_producto)
            ecuacion_str = " + ".join(detalles_operacion)
            pasos_ecuaciones.append(f"C[{i+1},{j+1}] = {ecuacion_str} = {suma_producto}")
            
        resultado.append(fila_nueva)
        
    pasos.append({"mensaje": "Matriz resultante del producto (A * B):", "matriz": resultado})
    return resultado, pasos, pasos_ecuaciones, None