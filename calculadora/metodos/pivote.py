# MOTOR DE SISTEMAS: PIVOTE
# Reducción en dos fases: primero hacia abajo y luego hacia arriba.
# Contrato compartido por resolver_gauss, resolver_gauss_jordan y resolver_pivote:
# A: lista de m filas y n coeficientes; b: lista de m términos independientes.
# m y n: dimensiones ya interpretadas por el controlador. Se supone que son
# coherentes con las listas; este motor no valida por sí mismo el formato.
# Retorna (M, pasos, tipo_sistema, soluciones, pasos_ecuaciones).
# M es la matriz aumentada transformada. pasos guarda matrices y mensajes;
# pasos_ecuaciones guarda texto algebraico. soluciones sigue el orden x1..xn
# y queda vacía cuando no existe una solución única.
#
# Las operaciones elementales conservan el conjunto de soluciones: intercambiar
# filas, dividir una fila por un número no nulo y restar un múltiplo de otra fila.
# A y b se conservan: se trabaja sobre filas copiadas en M. Se usa float, con
# tolerancia 1e-10 para decidir qué valores se tratan como cero.
from ..utilidades.matrices import clonar_matriz
from ..utilidades.ecuaciones import matriz_a_ecuaciones

def resolver_pivote(A, b, m, n):
    # Construye [A | b]: copia cada fila de A y añade el término independiente.
    # En M[i][j], i identifica la fila y j la columna; M[i][n] es el valor a la derecha
    # del '='. Los índices internos empiezan en 0 y los mensajes al usuario en 1.
    M = [A[i][:] + [b[i]] for i in range(m)]
    pasos = []
    # columnas_pivote conserva números de columna desde 1 para compararlos con x1..xn.
    # pivotes_pos conserva pares (fila, columna) desde 0 para operar con las listas.
    # No son dos matrices: son dos registros del lugar donde se encontraron pivotes.
    columnas_pivote = []
    pivotes_pos = [] 
    
    ecuaciones_iniciales = matriz_a_ecuaciones(M, m, n)
    
    # guardar_paso(mensaje, matriz_actual) es una función interna: solo se usa en
    # esta ejecución del resolutor y tiene acceso a la lista pasos de la función
    # externa (cierre o closure). No devuelve datos: añade un diccionario a pasos.
    # clonar_matriz evita que las siguientes operaciones alteren el historial.
    def guardar_paso(mensaje, matriz_actual):
        pasos.append({"mensaje": mensaje, "matriz": clonar_matriz(matriz_actual)})

    guardar_paso("Matriz aumentada inicial:", M)
    fila_actual = 0
    
    # col recorre las columnas de variables; fila_actual señala la próxima fila
    # que recibirá un pivote. Son contadores distintos porque una columna sin pivote
    # se salta sin consumir una fila. Si ya se usaron m filas, termina el recorrido.
    for col in range(n):
        if fila_actual >= m: break
        
        # Pivoteo parcial: busca el mayor valor absoluto de esta columna entre las filas
        # aún disponibles. Reduce la necesidad de dividir por cantidades muy pequeñas.
        # Si toda la columna disponible es casi cero, continue avanza a la siguiente.
        # Esta búsqueda no cambia el orden de las variables porque solo intercambia filas.
        pivote = fila_actual
        for i in range(fila_actual + 1, m):
            if abs(M[i][col]) > abs(M[pivote][col]):
                pivote = i

        if abs(M[pivote][col]) < 1e-10: continue 

        columnas_pivote.append(col + 1)

        if pivote != fila_actual:
            M[fila_actual], M[pivote] = M[pivote], M[fila_actual]
            guardar_paso(f"Intercambio de Fila {fila_actual+1} con Fila {pivote+1}", M)

        # Fase 1: hace que cada pivote valga 1 y elimina lo que tiene debajo.
        # Si el pivote ya es 1 dentro de la tolerancia, evita una división innecesaria.
        # Después guarda su posición para poder recorrerla en sentido inverso.
        pivote_val = M[fila_actual][col]
        if abs(pivote_val - 1.0) > 1e-10:
            for j in range(col, n + 1):
                M[fila_actual][j] /= pivote_val
            guardar_paso(f"Fila {fila_actual+1} = Fila {fila_actual+1} / {round(pivote_val, 3)} (Pivote a 1)", M)

        pivotes_pos.append((fila_actual, col))

        for i in range(fila_actual + 1, m):
            if abs(M[i][col]) > 1e-10:
                factor = M[i][col]
                for j in range(col, n + 1):
                    M[i][j] -= factor * M[fila_actual][j]
                guardar_paso(f"Fila {i+1} = Fila {i+1} - ({round(factor, 3)}) * Fila {fila_actual+1} (Limpieza inferior)", M)
        
        fila_actual += 1

    # Fase 2: reversed recorre los pivotes desde el último hasta el primero.
    # Para cada pivote se borran los coeficientes que tiene encima. El resultado
    # busca la forma reducida como Gauss-Jordan, pero separando ambos sentidos.
    # El mensaje que inicia esta fase guarda una copia aunque todavía no haya cambios.
    if pivotes_pos:
        guardar_paso("Iniciando Fase 2: Eliminación hacia arriba", M)
        for fila_piv, col_piv in reversed(pivotes_pos):
            for i in range(fila_piv - 1, -1, -1):
                if abs(M[i][col_piv]) > 1e-10:
                    factor = M[i][col_piv]
                    for j in range(col_piv, n + 1):
                        M[i][j] -= factor * M[fila_piv][j]
                    guardar_paso(f"Fila {i+1} = Fila {i+1} - ({round(factor, 3)}) * Fila {fila_piv+1} (Limpieza superior)", M)

    pasos_ecuaciones = ["Sistema Original:"] + ecuaciones_iniciales
    soluciones = []
    
    # Clasificación, primero la contradicción: si los coeficientes de una fila son
    # cero y su término independiente no, la ecuación exige 0 = un número no nulo.
    # Eso es imposible; se retorna 'Inconsistente' y no se intenta dividir ni despejar.
    for i in range(m):
        todos_ceros = all(abs(M[i][j]) < 1e-10 for j in range(n))
        if todos_ceros and abs(M[i][n]) > 1e-10:
            pasos_ecuaciones.append("Sistema Final Simplificado:")
            pasos_ecuaciones.extend(matriz_a_ecuaciones(M, m, n))
            pasos_ecuaciones.append(f"Inconsistencia encontrada en Fila {i+1}: 0 = {round(M[i][n], 4)}")
            return M, pasos, "Sistema Inconsistente: Sin Solución", [], pasos_ecuaciones

    tipo_sistema = "Sistema Consistente Determinado: Presenta Solución Única"
    # En la forma escalonada, cada fila no nula aporta un pivote. Su cantidad equivale
    # al rango de A bajo la tolerancia usada. Si no hubo contradicción y hay menos
    # pivotes que variables n, existen variables libres e infinitas soluciones.
    # Si hay n pivotes, cada variable queda determinada. m no tiene que ser igual a n:
    # pueden existir ecuaciones redundantes en un sistema con solución única.
    filas_no_nulas = sum(1 for i in range(m) if not all(abs(M[i][j]) < 1e-10 for j in range(n)))
    if filas_no_nulas < n:
        tipo_sistema = "Sistema Consistente Indeterminado: Presenta Infinitas Soluciones"

    # Explicación de variables básicas y libres: una columna sin pivote corresponde
    # a una variable libre. Para una columna con pivote se localiza su fila y se
    # pasan los demás términos al lado derecho, cambiándoles el signo.
    # Ejemplo: de x1 + 2x2 = 3 resulta 'x1 = 3.0 - 2.0x2' y 'x2 es libre'.
    # El programa no sustituye x2 por un parámetro t; conserva el nombre de variable.
    pasos_ecuaciones.append("Ecuaciones Paramétricas y Variables Libres:")

    for j in range(n):
        if (j + 1) not in columnas_pivote:
            pasos_ecuaciones.append(f"x{j+1} es libre")
        else:
            fila_piv = -1
            for i in range(m):
                if abs(M[i][j] - 1.0) < 1e-10:
                    fila_piv = i
                    break
            
            if fila_piv != -1:
                terminos_der = [str(round(M[fila_piv][n], 4))]
                for k in range(n):
                    if k != j and abs(M[fila_piv][k]) > 1e-10:
                        signo = "-" if M[fila_piv][k] > 0 else "+"
                        terminos_der.append(f"{signo} {abs(round(M[fila_piv][k], 4))}x{k+1}")
                
                ecuacion_despejada = f"x{j+1} = {' '.join(terminos_der)}"
                pasos_ecuaciones.append(ecuacion_despejada)
                # Solo incorpora valores a soluciones cuando todas las variables están fijadas.
                # En el caso indeterminado, la información útil está en las ecuaciones paramétricas,
                # no en una lista numérica única. Las posiciones de pivote no se envían como un
                # campo independiente de la API; se usan para construir el análisis textual.
                if tipo_sistema == "Sistema Consistente Determinado: Presenta Solución Única":
                    soluciones.append(M[fila_piv][n])

    return M, pasos, tipo_sistema, [round(s, 4) for s in soluciones] if soluciones else [], pasos_ecuaciones
