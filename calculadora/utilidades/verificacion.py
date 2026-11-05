"""Sustituye la solución completa; el redondeo solo pertenece a la interfaz."""
import math

def verificar_solucion(A, b, soluciones):
    if not soluciones: return []
    verificacion = []
    for i, fila in enumerate(A):
        terminos = [a*x for a, x in zip(fila, soluciones)]
        suma = math.fsum(terminos)
        escala = max(abs(b[i]), math.fsum(abs(t) for t in terminos), 1e-300)
        residuo = abs(suma-b[i])
        verificacion.append({'ecuacion': i+1, 'calculado': suma, 'esperado': b[i],
                             'residuo': residuo, 'valido': residuo <= 1e-9*escala})
    return verificacion
