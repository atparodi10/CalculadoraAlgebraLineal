from ..utilidades.matrices import clonar_matriz
from ..utilidades.ecuaciones import matriz_a_ecuaciones

def resolver_gauss_jordan(A, b, m, n):
    M = [A[i][:] + [b[i]] for i in range(m)]
    pasos = []
    
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

    pasos_ecuaciones = ["Sistema Original:"] + ecuaciones_iniciales
    soluciones = []
    
    for i in range(m):
        todos_ceros = all(abs(M[i][j]) < 1e-10 for j in range(n))
        if todos_ceros and abs(M[i][n]) > 1e-10:
            pasos_ecuaciones.append("Sistema Final Simplificado:")
            pasos_ecuaciones.extend(matriz_a_ecuaciones(M, m, n))
            pasos_ecuaciones.append(f"Inconsistencia encontrada en Fila {i+1}: 0 = {round(M[i][n], 4)}")
            return M, pasos, "Sistema Inconsistente: Sin Solución", [], pasos_ecuaciones

    filas_no_nulas = sum(1 for i in range(m) if not all(abs(M[i][j]) < 1e-10 for j in range(n)))
    if filas_no_nulas < n:
        pasos_ecuaciones.append("Sistema Final Simplificado:")
        pasos_ecuaciones.extend(matriz_a_ecuaciones(M, m, n))
        return M, pasos, "Sistema Consistente Indeterminado: Presenta Infinitas Soluciones", [], pasos_ecuaciones

    tipo_sistema = "Sistema Consistente Determinado: Presenta Solución Única"
    pasos_ecuaciones.append("Sistema Final Simplificado:")
    pasos_ecuaciones.extend(matriz_a_ecuaciones(M, m, n))
    pasos_ecuaciones.append("Despeje Directo:")

    for i in range(n):
        soluciones.append(M[i][n])
        pasos_ecuaciones.append(f"x{i+1} = {round(M[i][n], 4)} / {round(M[i][i], 4)} = {round(soluciones[i], 4)}")

    return M, pasos, tipo_sistema, [round(s, 4) for s in soluciones], pasos_ecuaciones

