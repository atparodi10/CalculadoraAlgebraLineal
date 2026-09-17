# MOTOR DE SISTEMAS: GAUSS
# Eliminación hacia abajo y sustitución hacia atrás.
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

def resolver_gauss(A, b, m, n):
    # Construye [A | b]: copia cada fila de A y añade el término independiente.
    # En M[i][j], i identifica la fila y j la columna; M[i][n] es el valor a la derecha
    # del '='. Los índices internos empiezan en 0 y los mensajes al usuario en 1.
    M = [A[i][:] + [b[i]] for i in range(m)]
    pasos = []
    
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

        if pivote != fila_actual:
            M[fila_actual], M[pivote] = M[pivote], M[fila_actual]
            guardar_paso(f"Intercambio de Fila {fila_actual+1} con Fila {pivote+1}", M)

        # Elimina únicamente entradas debajo del pivote. factor = entrada / pivote,
        # así la nueva entrada es entrada - factor*pivote = 0. j llega hasta n para
        # aplicar la misma operación al término independiente, preservando la igualdad.
        # El mensaje muestra el factor con tres decimales, pero el cálculo usa el float
        # completo. Gauss no convierte obligatoriamente los pivotes a 1.
        for i in range(fila_actual + 1, m):
            if abs(M[i][col]) > 1e-10:
                factor = M[i][col] / M[fila_actual][col]
                for j in range(col, n + 1):
                    M[i][j] -= factor * M[fila_actual][j]
                guardar_paso(f"Fila {i+1} = Fila {i+1} - ({factor:.3f}) * Fila {fila_actual+1}", M)
        
        fila_actual += 1

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

    # En la forma escalonada, cada fila no nula aporta un pivote. Su cantidad equivale
    # al rango de A bajo la tolerancia usada. Si no hubo contradicción y hay menos
    # pivotes que variables n, existen variables libres e infinitas soluciones.
    # Si hay n pivotes, cada variable queda determinada. m no tiene que ser igual a n:
    # pueden existir ecuaciones redundantes en un sistema con solución única.
    filas_no_nulas = sum(1 for i in range(m) if not all(abs(M[i][j]) < 1e-10 for j in range(n)))
    if filas_no_nulas < n:
        pasos_ecuaciones.append("Sistema Final Simplificado:")
        pasos_ecuaciones.extend(matriz_a_ecuaciones(M, m, n))
        return M, pasos, "Sistema Consistente Indeterminado: Presenta Infinitas Soluciones", [], pasos_ecuaciones

    tipo_sistema = "Sistema Consistente Determinado: Presenta Solución Única"
    pasos_ecuaciones.append("Sistema Final Simplificado:")
    pasos_ecuaciones.extend(matriz_a_ecuaciones(M, m, n))
    pasos_ecuaciones.append("Despeje y Sustitución Hacia Atrás:")
    
    # Sustitución hacia atrás: se empieza en la última variable y se asciende.
    # suma_conocida suma los coeficientes por las variables ya despejadas.
    # Después x_i = (término independiente - suma_conocida) / coeficiente diagonal.
    # Ejemplo: de x1+x2=3 y -2x2=-2 sale primero x2=1 y después x1=2.
    # La diagonal se usa aquí porque este bloque solo se alcanza con rango n.
    soluciones = [0] * n
    for i in range(n - 1, -1, -1):
        suma_conocida = sum(M[i][j] * soluciones[j] for j in range(i + 1, n))
        soluciones[i] = (M[i][n] - suma_conocida) / M[i][i]
        
        # Estas ramas solo cambian cómo se explica el despeje. Si existen términos ya
        # conocidos, se muestran entre corchetes; si no, se presenta una división simple.
        # Las cadenas construidas no vuelven a evaluarse como código ni como matemáticas.
        if i == n - 1:
            pasos_ecuaciones.append(f"x{i+1} = {round(M[i][n], 4)} / {round(M[i][i], 4)} = {round(soluciones[i], 4)}")
        else:
            sust_str = []
            for j in range(i + 1, n):
                if abs(M[i][j]) > 1e-10:
                    sust_str.append(f"{round(M[i][j], 4)}({round(soluciones[j], 4)})")
            
            if sust_str:
                sust_unida = " + ".join(sust_str).replace("+ -", "- ")
                pasos_ecuaciones.append(f"x{i+1} = ({round(M[i][n], 4)} - [{sust_unida}]) / {round(M[i][i], 4)} = {round(soluciones[i], 4)}")
            else:
                pasos_ecuaciones.append(f"x{i+1} = {round(M[i][n], 4)} / {round(M[i][i], 4)} = {round(soluciones[i], 4)}")

    # El redondeo final facilita la lectura, pero también afecta a las soluciones
    # que recibirá verificar_solucion. Con infinitas soluciones este método muestra
    # el sistema simplificado, sin construir una parametrización completa.
    return M, pasos, tipo_sistema, [round(s, 4) for s in soluciones], pasos_ecuaciones

