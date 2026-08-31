from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

def clonar_matriz(matriz):
    return [fila[:] for fila in matriz]

def verificar_solucion(A, b, soluciones):
    if not soluciones: return []
    verificacion = []
    for i in range(len(A)):
        suma = sum(A[i][j] * soluciones[j] for j in range(len(soluciones)))
        verificacion.append({"ecuacion": i+1, "calculado": round(suma, 4), "esperado": round(b[i], 4), "valido": abs(suma - b[i]) < 1e-5})
    return verificacion

def resolver_sistema(A, b, m, n):
    # Crear matriz aumentada [A | b]
    M = [A[i][:] + [b[i]] for i in range(m)]
    pasos = []
    
    def guardar_paso(mensaje, matriz_actual):
        pasos.append({"mensaje": mensaje, "matriz": clonar_matriz(matriz_actual)})

    guardar_paso("Matriz aumentada inicial:", M)

    fila_actual = 0
    for col in range(n):
        if fila_actual >= m: break

        # Buscar pivote con el mayor valor absoluto para estabilidad numérica
        pivote = fila_actual
        for i in range(fila_actual + 1, m):
            if abs(M[i][col]) > abs(M[pivote][col]):
                pivote = i

        if abs(M[pivote][col]) < 1e-10:
            continue # Variable libre, pasar a la siguiente columna

        # Intercambiar filas si el pivote no está en la fila actual
        if pivote != fila_actual:
            M[fila_actual], M[pivote] = M[pivote], M[fila_actual]
            guardar_paso(f"Intercambio de Fila {fila_actual+1} con Fila {pivote+1}", M)

        # Eliminación hacia abajo
        for i in range(fila_actual + 1, m):
            if abs(M[i][col]) > 1e-10:
                factor = M[i][col] / M[fila_actual][col]
                for j in range(col, n + 1):
                    M[i][j] -= factor * M[fila_actual][j]
                guardar_paso(f"Fila {i+1} = Fila {i+1} - ({factor:.3f}) * Fila {fila_actual+1}", M)
        
        fila_actual += 1

    # Clasificación del sistema
    tipo_sistema = "Sistema Consistente Determinado: Presenta Solución Única"
    soluciones = []

    for i in range(m):
        todos_ceros = all(abs(M[i][j]) < 1e-10 for j in range(n))
        if todos_ceros and abs(M[i][n]) > 1e-10:
            return M, pasos, "Sistema Inconsistente: Sin Solución", []

    filas_no_nulas = sum(1 for i in range(m) if not all(abs(M[i][j]) < 1e-10 for j in range(n)))
    if filas_no_nulas < n:
        return M, pasos, "Sistema Consistente Indeterminado: Presenta Infinitas Soluciones", []

    # Sustitución hacia atrás (Solo para solución única)
    soluciones = [0] * n
    for i in range(n - 1, -1, -1):
        suma_conocida = sum(M[i][j] * soluciones[j] for j in range(i + 1, n))
        soluciones[i] = (M[i][n] - suma_conocida) / M[i][i]

    return M, pasos, tipo_sistema, [round(s, 4) for s in soluciones]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calcular', methods=['POST'])
def calcular():
    datos = request.json
    m, n = int(datos['m']), int(datos['n'])
    A, b = datos['A'], datos['b']
    
    matriz_final, pasos, tipo, soluciones = resolver_sistema(A, b, m, n)
    verificacion = verificar_solucion(A, b, soluciones) if soluciones else []

    return jsonify({
        "pasos": pasos,
        "tipo_sistema": tipo,
        "soluciones": soluciones,
        "verificacion": verificacion
    })

if __name__ == '__main__':
    app.run(debug=True)