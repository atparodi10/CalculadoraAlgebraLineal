# OPERACIONES MATRICIALES
# Representación: [[1,2,3],[4,5,6]] tiene 2 filas y 3 columnas, es decir, orden 2x3.
# Las tres operaciones devuelven (resultado, pasos, pasos_ecuaciones, error).
# resultado es la matriz numérica; pasos contiene matrices iniciales/finales;
# pasos_ecuaciones explica cada celda. error=None indica éxito.
# No se guarda una matriz intermedia por cada celda: el detalle por celda es texto.
# Si falla una validación se retorna (None, [], [], mensaje).
def validar_formato_matriz(matriz, nombre_matriz="Matriz"):
    """
    Función escudo: Verifica que la entrada sea una lista bidimensional, perfectamente 
    rectangular (filas con igual número de columnas) y puramente numérica.
    """
    # validar_formato_matriz(matriz, nombre_matriz='Matriz') -> (bool, mensaje).
    # Comprueba entrada no vacía, lista exterior, primera fila como lista, filas de
    # igual longitud y elementos int/float. La rectangularidad evita accesos a una
    # columna que no existe; el tipo numérico permite sumar y multiplicar celdas.
    # Límites actuales: solo verifica el tipo lista de la PRIMERA fila; una fila
    # posterior no iterable puede lanzar excepción. Acepta [[]] (cero columnas),
    # booleanos y floats no finitos. Los comentarios originales de 'estrictamente'
    # no significan que estos casos queden cubiertos.
    # 1. Validación estructural de que sea una lista de listas (bidimensional)
    if not matriz or not isinstance(matriz, list) or not isinstance(matriz[0], list):
        return False, f"Error: {nombre_matriz} no tiene un formato bidimensional válido."
    
    # Inicialización del estándar de columnas basándose en la primera fila
    columnas_esperadas = len(matriz[0])
    
    # 2. Ciclo exterior: Recorre cada fila individualmente de la matriz
    for indice_fila, fila in enumerate(matriz):
        # Validación de regularidad dimensional (filas con longitudes desiguales)
        if len(fila) != columnas_esperadas:
            return False, f"Error en {nombre_matriz}: La fila {indice_fila + 1} tiene dimensiones irregulares."
        
        # 3. Ciclo interior: Revisa cada celda interna de la fila
        for elemento in fila:
            # Validación de tipo de dato numérico (entero o flotante estrictamente)
            if not isinstance(elemento, (int, float)):
                return False, f"Error en {nombre_matriz}: Se encontró un valor no numérico ('{elemento}')."
                
    return True, "OK"


# suma_matrices(A,B): requiere el mismo número de filas y columnas en ambas.
# Suma posiciones equivalentes: C[i][j]=A[i][j]+B[i][j].
# Ejemplo: [[1,2]] + [[3,4]] -> [[4,6]]. Su costo de cálculo crece con filas*columnas.
# Valida antes de construir resultados para evitar una suma parcial incompatible.
def suma_matrices(A, B):
    """
    Suma dos matrices A y B celda por celda, generando el registro de evolución 
    matricial y el desglose algebraico de ecuaciones para cada coordenada C[i, j].
    """
    # Validación de formato y seguridad para la Matriz A
    valida_A, msj_A = validar_formato_matriz(A, "Matriz A")
    if not valida_A: return None, [], [], msj_A
    
    # Validación de formato y seguridad para la Matriz B
    valida_B, msj_B = validar_formato_matriz(B, "Matriz B")
    if not valida_B: return None, [], [], msj_B

    # Inicialización de dimensiones (filas y columnas)
    filas_A, cols_A = len(A), len(A[0])
    filas_B, cols_B = len(B), len(B[0])
    
    # Validación estricta de orden matricial mxn (deben ser idénticas para sumarse)
    if filas_A != filas_B or cols_A != cols_B:
        return None, [], [], f"Error: No se pueden sumar. Matriz A es {filas_A}x{cols_A} y Matriz B es {filas_B}x{cols_B}."
        
    # Inicialización de estructuras para el resultado y el registro de pasos visuales
    # Las matrices iniciales se copian fila por fila para describir las entradas.
    # fila_nueva se crea en cada iteración exterior: cada fila del resultado debe ser
    # una lista distinta. Reutilizar una sola lista alteraría las filas anteriores.
    resultado = []
    pasos = [
        {"mensaje": "Matriz A inicial:", "matriz": [fila[:] for fila in A]},
        {"mensaje": "Matriz B inicial:", "matriz": [fila[:] for fila in B]}
    ]
    
    # Inicialización del registro de ecuaciones algebraicas explicativas
    pasos_ecuaciones = ["Desglose de Suma por Elemento C[i,j] = A[i,j] + B[i,j]:"]
    
    # Ciclo exterior: Recorre las filas de arriba hacia abajo
    for i in range(filas_A):
        fila_nueva = []
        # Ciclo interior: Recorre las columnas de izquierda a derecha
        for j in range(cols_A):
            # Operación algebraica por celda homóloga
            suma_celda = A[i][j] + B[i][j]
            fila_nueva.append(suma_celda)
            
            # Registro de la ecuación específica para esta coordenada
            pasos_ecuaciones.append(f"C[{i+1},{j+1}] = {A[i][j]} + ({B[i][j]}) = {suma_celda}")
            
        resultado.append(fila_nueva)
        
    pasos.append({"mensaje": "Matriz resultante de la suma (A + B):", "matriz": resultado})
    return resultado, pasos, pasos_ecuaciones, None


# mult_escalar_matriz(c,A): valida A y que c sea int/float; multiplica cada celda
# por el mismo escalar, conservando el orden de la matriz. c=2 y A=[[1,-3]] produce
# [[2,-6]]. No requiere B y no realiza el producto fila por columna.
# Retorna la matriz, los pasos visuales, el detalle por celda y el indicador de error.
def mult_escalar_matriz(c, A):
    """
    Multiplica un escalar 'c' por cada celda de la matriz, registrando 
    las ecuaciones de transformación celda por celda.
    """
    valida_A, msj_A = validar_formato_matriz(A, "Matriz A")
    if not valida_A: return None, [], [], msj_A

    # Validación de formato del escalar
    if not isinstance(c, (int, float)):
        return None, [], [], "Error: El escalar a multiplicar debe ser un número."

    resultado = []
    pasos = [{"mensaje": f"Matriz A original (Escalar c = {c}):", "matriz": [fila[:] for fila in A]}]
    pasos_ecuaciones = [f"Desglose de Multiplicación Escalar C[i,j] = {c} * A[i,j]:"]
    
    # Ciclo anidado para escalar cada elemento individual de la matriz
    for i in range(len(A)):
        fila_nueva = []
        for j in range(len(A[0])):
            producto = c * A[i][j]
            fila_nueva.append(producto)
            pasos_ecuaciones.append(f"C[{i+1},{j+1}] = {c} * ({A[i][j]}) = {producto}")
        resultado.append(fila_nueva)
        
    pasos.append({"mensaje": f"Matriz resultante de la multiplicación escalar ({c} * A):", "matriz": resultado})
    return resultado, pasos, pasos_ecuaciones, None


# multiplicacion_matrices(A,B): implementa A*B y el orden importa.
# Si A es de p x q y B es de q x r, C será de p x r. Solo deben coincidir las
# columnas de A con las filas de B; no se exige que ambas matrices sean cuadradas.
# Ejemplo: [[1,2,3]] * [[4],[5],[6]] -> [[32]], porque 1*4+2*5+3*6=32.
# El costo de cálculo es proporcional a p*q*r.
def multiplicacion_matrices(A, B):
    """
    Ejecuta el producto matricial calculando el producto punto (fila por columna) 
    y generando el desglose explícito de las ecuaciones operativas para cada celda.
    """
    valida_A, msj_A = validar_formato_matriz(A, "Matriz A")
    if not valida_A: return None, [], [], msj_A
    
    valida_B, msj_B = validar_formato_matriz(B, "Matriz B")
    if not valida_B: return None, [], [], msj_B

    filas_A, cols_A = len(A), len(A[0])
    filas_B, cols_B = len(B), len(B[0])
    
    # Validación matemática obligatoria: Columnas de A deben igualar filas de B
    if cols_A != filas_B:
        return None, [], [], f"Error matemático: Columnas de A ({cols_A}) no coinciden con filas de B ({filas_B})."
        
    resultado = []
    pasos = [
        {"mensaje": "Matriz A (Factor izquierdo):", "matriz": [fila[:] for fila in A]},
        {"mensaje": "Matriz B (Factor derecho):", "matriz": [fila[:] for fila in B]}
    ]
    pasos_ecuaciones = ["Ecuaciones de Producto Punto (Fila de A · Columna de B):"]
    
    # Papel de los tres índices: i elige la fila de A; j la columna de B; k recorre
    # sus elementos correspondientes. Cada C[i][j] acumula A[i][k]*B[k][j].
    # suma_producto se reinicia para cada celda, detalles_operacion reúne solo los
    # textos de esa celda y fila_nueva se reinicia para cada fila del resultado.
    # 1er Ciclo: Fija la fila 'i' de la matriz A
    for i in range(filas_A):
        fila_nueva = []
        # 2do Ciclo: Fija la columna 'j' de la matriz B
        for j in range(cols_B):
            suma_producto = 0
            detalles_operacion = []
            
            # 3er Ciclo: Realiza el producto punto multiplicando y sumando a lo largo de k
            for k in range(cols_A):
                val_a = A[i][k]
                val_b = B[k][j]
                suma_producto += val_a * val_b
                detalles_operacion.append(f"({val_a})({val_b})")
            
            fila_nueva.append(suma_producto)
            
            # Formatea y registra la ecuación completa del producto punto de la celda
            ecuacion_str = " + ".join(detalles_operacion)
            pasos_ecuaciones.append(f"C[{i+1},{j+1}] = {ecuacion_str} = {suma_producto}")
            
        resultado.append(fila_nueva)
        
    # resultado se añade al último paso cuando ya está completo. A partir de aquí
    # no se modifica, por eso esa referencia se puede usar como matriz final.
    # La ruta api_matrices convierte estas listas y diccionarios a JSON.
    pasos.append({"mensaje": "Matriz resultante del producto (A * B):", "matriz": resultado})
    return resultado, pasos, pasos_ecuaciones, None