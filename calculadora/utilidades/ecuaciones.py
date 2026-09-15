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


def matriz_a_ecuaciones(M, m, n):
    ecuaciones = []
    for i in range(m):
        if not all(abs(M[i][j]) < 1e-10 for j in range(n)):
            terminos = []
            for j in range(n):
                if abs(M[i][j]) > 1e-10:
                    terminos.append(f"{round(M[i][j], 4)}x{j+1}")
            if terminos:
                eq_str = " + ".join(terminos).replace("+ -", "- ")
                ecuaciones.append(f"{eq_str} = {round(M[i][n], 4)}")
    return ecuaciones

