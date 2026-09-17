# verificar_solucion(A, b, soluciones) -> lista de comprobaciones por ecuación.
# Calcula A[i][0]*x1 + A[i][1]*x2 + ... y compara esa suma con b[i].
# Se invoca desde calcular únicamente cuando hay soluciones explícitas.
# No resuelve el sistema otra vez: comprueba la solución obtenida sustituyéndola.
# Cada diccionario incluye ecuacion (numerada desde 1), calculado, esperado y
# valido. main.js convierte valido en una marca de Correcto o Error.
def verificar_solucion(A, b, soluciones):
    if not soluciones: return []
    verificacion = []
    for i in range(len(A)):
        # La comparación usa la suma antes del round, con diferencia estrictamente menor
        # que 1e-5 (0.00001); calculado y esperado se redondean solo para mostrarlos.
        # Sin embargo, soluciones ya llega redondeada por los resolutores. Ejemplo:
        # 3x1=1 devuelve x1=0.3333; al sustituir, 0.9999 difiere de 1 en 0.0001 y aparece
        # como inválida. Ese caso refleja la política de precisión, no un nuevo despeje.
        suma = sum(A[i][j] * soluciones[j] for j in range(len(soluciones)))
        verificacion.append({"ecuacion": i+1, "calculado": round(suma, 4), "esperado": round(b[i], 4), "valido": abs(suma - b[i]) < 1e-5})
    return verificacion

