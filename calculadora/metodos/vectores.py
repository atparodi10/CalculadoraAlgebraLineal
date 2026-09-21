from calculadora.metodos.gauss_jordan import resolver_gauss_jordan
from calculadora.utilidades.matrices import clonar_matriz

def validar_formato_vector(vector, n, nombre_vector="Vector"):
    """
    Función escudo que verifica la integridad estructural y la dimensión geométrica del vector.
    Paso 1: Confirma que la longitud del vector coincida exactamente con la dimensión 'n' exigida por el usuario.
    Paso 2: Itera sobre cada componente para asegurar que contenga estrictamente valores numéricos, bloqueando letras o nulos.
    """
    if not vector or not isinstance(vector, list):
        return False, f"Error: {nombre_vector} no tiene un formato de lista válido."
    
    if len(vector) != n:
        return False, f"Error dimensional: {nombre_vector} debe tener exactamente {n} componentes (R^{n})."
    
    for indice, elemento in enumerate(vector):
        if not isinstance(elemento, (int, float)):
            return False, f"Error en {nombre_vector}: La componente {indice + 1} no es numérica ('{elemento}')."
            
    return True, "OK"


def suma_vectores(u, v, n):
    """
    Ejecuta la adición de dos vectores en R^n garantizando que ambos pertenezcan al mismo espacio dimensional.
    El algoritmo recorre las posiciones desde 1 hasta n, sumando las componentes homólogas (u_i + v_i).
    Registra detalladamente cada paso algebraico y devuelve el vector resultante listo para la interfaz.
    """
    valida_u, msj_u = validar_formato_vector(u, n, "Vector u")
    if not valida_u: return None, [], msj_u
    
    valida_v, msj_v = validar_formato_vector(v, n, "Vector v")
    if not valida_v: return None, [], msj_v

    resultado = []
    pasos = []
    
    for i in range(n):
        suma_componentes = u[i] + v[i]
        resultado.append(suma_componentes)
        pasos.append({"mensaje": f"Componente {i+1}: {u[i]} + ({v[i]}) = {suma_componentes}"})
        
    return resultado, pasos, None


def resta_vectores(u, v, n):
    """
    Ejecuta la sustracción de dos vectores en R^n validando su compatibilidad dimensional previa.
    El proceso itera sobre las coordenadas, restando la componente del sustraendo a la del minuendo (u_i - v_i).
    Genera el vector resultante junto con el desglose del manejo de signos en cada paso.
    """
    valida_u, msj_u = validar_formato_vector(u, n, "Vector u")
    if not valida_u: return None, [], msj_u
    
    valida_v, msj_v = validar_formato_vector(v, n, "Vector v")
    if not valida_v: return None, [], msj_v

    resultado = []
    pasos = []
    
    for i in range(n):
        resta_componentes = u[i] - v[i]
        resultado.append(resta_componentes)
        pasos.append({"mensaje": f"Componente {i+1}: {u[i]} - ({v[i]}) = {resta_componentes}"})
        
    return resultado, pasos, None


def mult_escalar_vector(c, v, n):
    """
    Aplica un factor de escala (c) a un vector en R^n modificando su magnitud sin alterar la base dimensional.
    Itera a través de todas las componentes multiplicando el escalar por el valor de cada coordenada.
    Devuelve el vector transformado y documenta la ecuación lineal ejecutada en cada posición.
    """
    if not isinstance(c, (int, float)):
        return None, [], "Error: El escalar debe ser numérico."
        
    valida_v, msj_v = validar_formato_vector(v, n, "Vector v")
    if not valida_v: return None, [], msj_v

    resultado = []
    pasos = []
    
    for i in range(n):
        producto = c * v[i]
        resultado.append(producto)
        pasos.append({"mensaje": f"Componente {i+1}: {c} * ({v[i]}) = {producto}"})
        
    return resultado, pasos, None


def verificar_combinacion_lineal(vectores_v, vector_b):
    """
    Analiza si un vector b pertenece al espacio generado por un conjunto de vectores transponiéndolos a una matriz.
    Paso 1: Valida que todos los vectores pertenezcan al mismo espacio R^m dictado por el vector resultado 'b'.
    Paso 2: Envía la matriz al motor de Gauss-Jordan y traduce su veredicto (Consistente/Inconsistente) a un análisis lógico.
    """
    m = len(vector_b)
    n = len(vectores_v)
    
    # Aquí reutilizamos la validación usando 'm' como la dimensión obligatoria
    valida_b, msj_b = validar_formato_vector(vector_b, m, "Vector b (resultado)")
    if not valida_b: return None, msj_b, [], [], []
    
    for indice, v in enumerate(vectores_v):
        valida_v, msj_v = validar_formato_vector(v, m, f"Vector v{indice+1}")
        if not valida_v: return None, msj_v, [], [], []
            
    A = []
    for i in range(m):
        fila = []
        for j in range(n):
            fila.append(vectores_v[j][i])
        A.append(fila)
        
    M, pasos_matriz, tipo_sistema, soluciones, pasos_ecuaciones = resolver_gauss_jordan(A, vector_b, m, n)
    
    es_combinacion = "Inconsistente" not in tipo_sistema
    mensaje = "Análisis concluido: El vector b SÍ es combinación lineal." if es_combinacion else "Análisis concluido: El vector b NO es combinación lineal; sistema inconsistente."
    
    return es_combinacion, mensaje, pasos_matriz, pasos_ecuaciones, soluciones