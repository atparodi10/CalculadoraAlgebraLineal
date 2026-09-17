# TEXTO DE ECUACIONES Y REPRESENTACIÓN ALGEBRAICA
# re es el módulo de expresiones regulares de Python. Un patrón describe qué
# fragmentos de texto buscar. Aquí reconoce términos como -3.5x2 o x1.
# Estas funciones son compartidas por los tres resolutores de sistemas.
import re

# parsear_ecuacion(ecuacion_str, n) -> (fila_de_coeficientes, termino_independiente).
# Entrada: '2x1 - x2 = 5', n=2. Salida: ([2.0, -1.0], 5.0).
# La posición 0 representa x1; la posición 1, x2. Una variable ausente queda en 0.
# Formato previsto: términos con x minúscula y número a la izquierda, un número
# a la derecha del '=' y punto decimal. No resuelve paréntesis ni despejes.
#
# Límites actuales del parser: finditer busca coincidencias, no valida que toda
# la izquierda sea válida. Texto sobrante puede ignorarse; variables fuera de
# 1..n se omiten; términos repetidos se sobrescriben, no se suman. Por ejemplo,
# 'x1+x1=2' queda con coeficiente 1 y 'basura=1' produce una fila de ceros.
# Fracciones '1/2x1', potencias y variables a la derecha no están implementadas.
# No interpretar la ausencia de una excepción como validación algebraica total.
def parsear_ecuacion(ecuacion_str, n):
    # Quita espacios literales. split('=') debe producir exactamente dos partes;
    # varios '=' provocan un ValueError al desempaquetar. float(lado_der) exige una
    # representación numérica aceptada por Python; no evalúa expresiones como '2+3'.
    eq = ecuacion_str.replace(" ", "")
    if "=" not in eq:
        raise ValueError("Falta el signo '='")
    
    lado_izq, lado_der = eq.split("=")
    b_val = float(lado_der)
    A_row = [0.0] * n
    
    # Grupos del patrón:
    # 1: ([+-]?) signo opcional. 2: ([0-9]*\.?[0-9]*) coeficiente decimal opcional.
    # 3: ([0-9]+) índice obligatorio después de x. El '?' permite omitir el signo;
    # '*' permite cero o más dígitos; '+' exige al menos uno. La barra ante el punto
    # hace que sea un punto literal. r'...' conserva las barras del patrón.
    patron = r'([+-]?)([0-9]*\.?[0-9]*)x([0-9]+)'
    coincidencias = re.finditer(patron, lado_izq)
    
    for m in coincidencias:
        signo = m.group(1)
        num_str = m.group(2)
        indice = int(m.group(3)) - 1
        
        # Si no aparece un número, el coeficiente implícito es 1: x2 equivale a 1x2 y
        # -x2 a -1x2. El índice escrito se reduce en 1 para acceder a una lista Python.
        coef = 1.0
        if num_str:
            coef = float(num_str)
        if signo == '-':
            coef = -coef
            
        if 0 <= indice < n:
            A_row[indice] = coef
            
    return A_row, b_val


# matriz_a_ecuaciones(M, m, n) -> lista de textos para mostrar, no para calcular.
# M es aumentada: n columnas de coeficientes y la última columna es b.
# Omite coeficientes casi cero y redondea los restantes a cuatro decimales.
# También omite filas cuyos coeficientes sean todos casi cero; por eso los
# resolutores añaden aparte el aviso de contradicción '0 = valor'.
def matriz_a_ecuaciones(M, m, n):
    ecuaciones = []
    for i in range(m):
        # 1e-10 significa 0.0000000001. Se usa como tolerancia al tratar números float:
        # una operación puede producir un residuo diminuto en vez de un cero exacto.
        # El criterio usa el valor absoluto para tratar igual números positivos y negativos.
        if not all(abs(M[i][j]) < 1e-10 for j in range(n)):
            terminos = []
            for j in range(n):
                if abs(M[i][j]) > 1e-10:
                    terminos.append(f"{round(M[i][j], 4)}x{j+1}")
            if terminos:
                eq_str = " + ".join(terminos).replace("+ -", "- ")
                ecuaciones.append(f"{eq_str} = {round(M[i][n], 4)}")
    return ecuaciones

