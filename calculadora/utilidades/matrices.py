# clonar_matriz(matriz) -> nueva lista con una copia independiente de cada fila.
# Los resolutores cambian M continuamente. guardar_paso necesita una fotografía
# numérica del momento; si guardara M directamente, todos los pasos terminarían
# mostrando la misma matriz final. fila[:] copia cada lista de números.
# Es suficiente para matrices numéricas bidimensionales; no es una copia profunda
# de objetos anidados arbitrariamente. No modifica la matriz recibida.
def clonar_matriz(matriz):
    return [fila[:] for fila in matriz]

