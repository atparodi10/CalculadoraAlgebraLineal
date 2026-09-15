from ..utilidades.matrices import clonar_matriz
from ..utilidades.ecuaciones import matriz_a_ecuaciones

def resolver_pivote(A, b, m, n):
    M = [A[i][:] + [b[i]] for i in range(m)]
    pasos = []
    columnas_pivote = []
    pivotes_pos = [] 
    
    ecuaciones_iniciales = matriz_a_ecuaciones(M, m, n)
    
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

        columnas_pivote.append(col + 1)

        if pivote != fila_actual:
            M[fila_actual], M[pivote] = M[pivote], M[fila_actual]
            guardar_paso(f"Intercambio de Fila {fila_actual+1} con Fila {pivote+1}", M)

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
    
    for i in range(m):
        todos_ceros = all(abs(M[i][j]) < 1e-10 for j in range(n))
        if todos_ceros and abs(M[i][n]) > 1e-10:
            pasos_ecuaciones.append("Sistema Final Simplificado:")
            pasos_ecuaciones.extend(matriz_a_ecuaciones(M, m, n))
            pasos_ecuaciones.append(f"Inconsistencia encontrada en Fila {i+1}: 0 = {round(M[i][n], 4)}")
            return M, pasos, "Sistema Inconsistente: Sin Solución", [], pasos_ecuaciones

    tipo_sistema = "Sistema Consistente Determinado: Presenta Solución Única"
    filas_no_nulas = sum(1 for i in range(m) if not all(abs(M[i][j]) < 1e-10 for j in range(n)))
    if filas_no_nulas < n:
        tipo_sistema = "Sistema Consistente Indeterminado: Presenta Infinitas Soluciones"

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
                if tipo_sistema == "Sistema Consistente Determinado: Presenta Solución Única":
                    soluciones.append(M[fila_piv][n])

    return M, pasos, tipo_sistema, [round(s, 4) for s in soluciones] if soluciones else [], pasos_ecuaciones
