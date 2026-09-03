import re

def parsear_ecuacion(ecuacion_str, n):
    eq = ecuacion_str.replace(" ", "")
    if "=" not in eq:
        raise ValueError("Falta el signo '='")
    
    lado_izq, lado_der = eq.split("=")
    b_val = float(lado_der)
    A_row = [0.0] * n
    
    patron = r'([+-]?)([0-9]*\.?[0-9]*)x([0-9]+)'
    coincidencias = re.finditer(patron, lado_izq)
    
    for m in coincidencias:
        signo = m.group(1)
        num_str = m.group(2)
        indice = int(m.group(3)) - 1
        
        coef = 1.0
        if num_str:
            coef = float(num_str)
        if signo == '-':
            coef = -coef
            
        if 0 <= indice < n:
            A_row[indice] = coef
            
    return A_row, b_val

def clonar_matriz(matriz):
    return [fila[:] for fila in matriz]

def verificar_solucion(A, b, soluciones):
    if not soluciones: return []
    verificacion = []
    for i in range(len(A)):
        suma = sum(A[i][j] * soluciones[j] for j in range(len(soluciones)))
        verificacion.append({"ecuacion": i+1, "calculado": round(suma, 4), "esperado": round(b[i], 4), "valido": abs(suma - b[i]) < 1e-5})
    return verificacion

def resolver_gauss(A, b, m, n):
    M = [A[i][:] + [b[i]] for i in range(m)]
    pasos = []
    
    def guardar_paso(mensaje, matriz_actual):
        pasos.append({"mensaje": mensaje, "matriz": clonar_matriz(matriz_actual)})

    guardar_paso("Matriz aumentada inicial:", M)
    fila_actual = 0
    
    for col in range(n):
        if fila_actual >= m: break
        
        pivote = fila_actual
        for i in range(fila_actual + 1, m):
            if abs(M[i][col]) > abs(M[pivote][col]):
                pivote = i

        if abs(M[pivote][col]) < 1e-10: continue 

        if pivote != fila_actual:
            M[fila_actual], M[pivote] = M[pivote], M[fila_actual]
            guardar_paso(f"Intercambio de Fila {fila_actual+1} con Fila {pivote+1}", M)

        for i in range(fila_actual + 1, m):
            if abs(M[i][col]) > 1e-10:
                factor = M[i][col] / M[fila_actual][col]
                for j in range(col, n + 1):
                    M[i][j] -= factor * M[fila_actual][j]
                guardar_paso(f"Fila {i+1} = Fila {i+1} - ({factor:.3f}) * Fila {fila_actual+1}", M)
        
        fila_actual += 1

    tipo_sistema = "Sistema Consistente Determinado: Presenta Solución Única"
    soluciones = []
    pasos_ecuaciones = []

    for i in range(m):
        todos_ceros = all(abs(M[i][j]) < 1e-10 for j in range(n))
        if todos_ceros and abs(M[i][n]) > 1e-10:
            return M, pasos, "Sistema Inconsistente: Sin Solución", [], []

    filas_no_nulas = sum(1 for i in range(m) if not all(abs(M[i][j]) < 1e-10 for j in range(n)))
    if filas_no_nulas < n:
        return M, pasos, "Sistema Consistente Indeterminado: Presenta Infinitas Soluciones", [], []

    pasos_ecuaciones.append("Despeje de variables (Sustitución hacia atrás):")
    soluciones = [0] * n
    for i in range(n - 1, -1, -1):
        suma_conocida = sum(M[i][j] * soluciones[j] for j in range(i + 1, n))
        soluciones[i] = (M[i][n] - suma_conocida) / M[i][i]
        
        if i == n - 1:
            pasos_ecuaciones.append(f"x{i+1} = {round(M[i][n], 4)} / {round(M[i][i], 4)} = {round(soluciones[i], 4)}")
        else:
            pasos_ecuaciones.append(f"x{i+1} = ({round(M[i][n], 4)} - ({round(suma_conocida, 4)})) / {round(M[i][i], 4)} = {round(soluciones[i], 4)}")

    return M, pasos, tipo_sistema, [round(s, 4) for s in soluciones], pasos_ecuaciones

def resolver_gauss_jordan(A, b, m, n):
    M = [A[i][:] + [b[i]] for i in range(m)]
    pasos = []
    
    def guardar_paso(mensaje, matriz_actual):
        pasos.append({"mensaje": mensaje, "matriz": clonar_matriz(matriz_actual)})

    guardar_paso("Matriz aumentada inicial:", M)
    fila_actual = 0
    
    for col in range(n):
        if fila_actual >= m: break
        
        pivote = fila_actual
        for i in range(fila_actual + 1, m):
            if abs(M[i][col]) > abs(M[pivote][col]):
                pivote = i

        if abs(M[pivote][col]) < 1e-10: continue 

        if pivote != fila_actual:
            M[fila_actual], M[pivote] = M[pivote], M[fila_actual]
            guardar_paso(f"Intercambio de Fila {fila_actual+1} con Fila {pivote+1}", M)

        pivote_val = M[fila_actual][col]
        for j in range(col, n + 1):
            M[fila_actual][j] /= pivote_val
        guardar_paso(f"Fila {fila_actual+1} = Fila {fila_actual+1} / {round(pivote_val, 3)}", M)

        for i in range(m):
            if i != fila_actual and abs(M[i][col]) > 1e-10:
                factor = M[i][col]
                for j in range(col, n + 1):
                    M[i][j] -= factor * M[fila_actual][j]
                guardar_paso(f"Fila {i+1} = Fila {i+1} - ({round(factor, 3)}) * Fila {fila_actual+1}", M)
        
        fila_actual += 1

    tipo_sistema = "Sistema Consistente Determinado: Presenta Solución Única"
    soluciones = []
    pasos_ecuaciones = ["En Gauss-Jordan las soluciones se obtienen directamente de la última columna:"]

    for i in range(m):
        todos_ceros = all(abs(M[i][j]) < 1e-10 for j in range(n))
        if todos_ceros and abs(M[i][n]) > 1e-10:
            return M, pasos, "Sistema Inconsistente: Sin Solución", [], []

    filas_no_nulas = sum(1 for i in range(m) if not all(abs(M[i][j]) < 1e-10 for j in range(n)))
    if filas_no_nulas < n:
        return M, pasos, "Sistema Consistente Indeterminado: Presenta Infinitas Soluciones", [], []

    for i in range(n):
        soluciones.append(M[i][n])
        pasos_ecuaciones.append(f"x{i+1} = {round(M[i][n], 4)}")

    return M, pasos, tipo_sistema, [round(s, 4) for s in soluciones], pasos_ecuaciones