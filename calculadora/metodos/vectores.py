# Importamos el motor de Gauss-Jordan para resolver el sistema de ecuaciones asociado
from calculadora.metodos.gauss_jordan import resolver_gauss_jordan
from calculadora.utilidades.matrices import clonar_matriz


def validar_formato_vector(vector, nombre_vector="Vector"):
    """
    Función escudo: Revisa que la entrada sea una lista unidimensional 
    válida y que contenga exclusivamente datos numéricos (enteros o flotantes).
    """
    # 1. Validación de tipo y contenido nulo
    if not vector or not isinstance(vector, list):
        return False, f"Error: {nombre_vector} no tiene un formato de lista válido."
    
    # 2. Ciclo para evaluar individualmente cada componente del vector
    for indice, elemento in enumerate(vector):
        # Validación de tipo de dato: si hay un texto o símbolo inválido, se bloquea
        if not isinstance(elemento, (int, float)):
            return False, f"Error en {nombre_vector}: La componente en la posición {indice + 1} no es un número ('{elemento}')."
            
    return True, "OK"


def suma_vectores(u, v):
    """
    Suma componente a componente dos vectores en R^n y genera un registro 
    detallado paso a paso para la interfaz gráfica.
    """
    # Inicialización y validación del vector u
    valida_u, msj_u = validar_formato_vector(u, "Vector u")
    if not valida_u: return None, [], msj_u
    
    # Inicialización y validación del vector v
    valida_v, msj_v = validar_formato_vector(v, "Vector v")
    if not valida_v: return None, [], msj_v

    # Validación matemática: Las dimensiones (longitudes) deben ser idénticas
    if len(u) != len(v):
        return None, [], f"Error matemático: Los vectores deben tener la misma dimensión. u es {len(u)}D y v es {len(v)}D."
    
    # Inicialización de estructuras para el resultado y el registro de pasos
    resultado = []
    pasos = []
    
    # Ciclo para recorrer cada posición homóloga de los vectores
    for i in range(len(u)):
        # Operación algebraica por componente
        suma_componentes = u[i] + v[i]
        resultado.append(suma_componentes)
        
        # Registro detallado del paso para la interfaz
        pasos.append({
            "mensaje": f"Componente u{i+1} + v{i+1}: {u[i]} + {v[i]} = {suma_componentes}"
        })
        
    return resultado, pasos, None


def resta_vectores(u, v):
    """
    Resta componente a componente dos vectores en R^n paso a paso.
    """
    valida_u, msj_u = validar_formato_vector(u, "Vector u")
    if not valida_u: return None, [], msj_u
    
    valida_v, msj_v = validar_formato_vector(v, "Vector v")
    if not valida_v: return None, [], msj_v

    if len(u) != len(v):
        return None, [], "Error matemático: Los vectores deben tener la misma dimensión para restarse."
    
    resultado = []
    pasos = []
    
    # Ciclo para restar componente por componente
    for i in range(len(u)):
        resta_componentes = u[i] - v[i]
        resultado.append(resta_componentes)
        pasos.append({
            "mensaje": f"Componente u{i+1} - v{i+1}: {u[i]} - ({v[i]}) = {resta_componentes}"
        })
        
    return resultado, pasos, None


def mult_escalar_vector(c, v):
    """
    Multiplica un escalar 'c' por cada una de las componentes de un vector 'v'.
    """
    # Validación de formato del escalar
    if not isinstance(c, (int, float)):
        return None, [], "Error: El escalar debe ser un valor numérico."
        
    valida_v, msj_v = validar_formato_vector(v, "Vector v")
    if not valida_v: return None, [], msj_v

    resultado = []
    pasos = []
    
    # Ciclo para aplicar el factor escalar a cada coordenada
    for i in range(len(v)):
        producto = c * v[i]
        resultado.append(producto)
        pasos.append({
            "mensaje": f"Escalar por coordenada v{i+1}: {c} * {v[i]} = {producto}"
        })
        
    return resultado, pasos, None


def verificar_combinacion_lineal(vectores_v, vector_b):
    """
    Transforma un conjunto de vectores y un vector b en una matriz aumentada 
    para evaluar si b es combinación lineal mediante el método de Gauss-Jordan.
    """
    # Validación del vector objetivo b
    valida_b, msj_b = validar_formato_vector(vector_b, "Vector b (resultado)")
    if not valida_b: return None, msj_b, [], [], []
    
    # Inicialización de dimensiones: m (ecuaciones/filas), n (incógnitas/vectores)
    m = len(vector_b) 
    n = len(vectores_v) 
    
    # Ciclo para validar cada vector generador del conjunto
    for indice, v in enumerate(vectores_v):
        valida_v, msj_v = validar_formato_vector(v, f"Vector v{indice+1}")
        if not valida_v: return None, msj_v, [], [], []
        
        # Validación dimensional: todos los vectores deben pertenecer al mismo espacio R^m
        if len(v) != m:
            return None, f"Error: El Vector v{indice+1} tiene dimensión {len(v)}, pero se esperaba dimensión {m}.", [], [], []
            
    # Construcción de la matriz A (transponiendo los vectores para colocarlos como columnas)
    A = []
    for i in range(m): # Ciclo exterior para las filas
        fila = []
        for j in range(n): # Ciclo interior para las columnas
            fila.append(vectores_v[j][i])
        A.append(fila)
        
    # Invocación del motor de Gauss-Jordan para obtener la evolución matricial y algebraica
    M, pasos_matriz, tipo_sistema, soluciones, pasos_ecuaciones = resolver_gauss_jordan(A, vector_b, m, n)
    
    # Análisis lógico del resultado: si no hay inconsistencias, SÍ es combinación lineal
    es_combinacion = "Inconsistente" not in tipo_sistema
    
    if es_combinacion:
        mensaje = "Análisis concluido: El vector b SÍ es combinación lineal del conjunto de vectores dados."
    else:
        mensaje = "Análisis concluido: El vector b NO es combinación lineal; sistema inconsistente."
    
    return es_combinacion, mensaje, pasos_matriz, pasos_ecuaciones, soluciones