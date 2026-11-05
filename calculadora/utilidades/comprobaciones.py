"""Comprobaciones numéricas compactas para las operaciones en modo rápido."""
import math


def comprobar_operacion(datos, resultado):
    op = datos['operacion']; matriz = 'A' in datos
    A = datos.get('A', [datos.get('u', [])]); B = datos.get('B', [datos.get('v', [])])
    R = resultado if matriz else [resultado]
    residuo = 0.; error_relativo = 0.
    for i, fila in enumerate(R):
        for j, observado in enumerate(fila):
            if op == 'multiplicacion':
                esperado = math.fsum(A[i][k]*B[k][j] for k in range(len(A[0])))
                escala = math.fsum(abs(A[i][k]*B[k][j]) for k in range(len(A[0])))
            elif op == 'suma':
                esperado = A[i][j]+B[i][j]; escala = abs(A[i][j])+abs(B[i][j])
            elif op == 'resta':
                esperado = A[i][j]-B[i][j]; escala = abs(A[i][j])+abs(B[i][j])
            else:
                esperado = datos['c']*A[i][j]; escala = abs(esperado)
            diferencia = abs(observado-esperado)
            residuo = max(residuo,diferencia)
            error_relativo = max(error_relativo,diferencia/max(escala,1e-300))
    return {'residuo_maximo':residuo, 'error_relativo_maximo':error_relativo,
            'verificacion_ok':error_relativo <= 1e-9}
