# VECTORES Y COMBINACIÓN LINEAL
# Un vector es una lista ordenada de coordenadas: [1,-2,3] pertenece a R^3.
# Los botones envían datos a api_vectores; esa ruta llama a estas funciones.
# Las operaciones básicas retornan (resultado, pasos, error), con error=None si
# funcionan. Los pasos son diccionarios con mensaje, sin matrices en este caso.
# La combinación lineal tiene un contrato distinto porque resuelve un sistema.
# La importación clonar_matriz del archivo original no se utiliza en este módulo;
# las copias del historial las realiza el motor Gauss-Jordan.
# Importamos el motor de Gauss-Jordan para resolver el sistema de ecuaciones asociado
from calculadora.metodos.gauss_jordan import resolver_gauss_jordan
from calculadora.utilidades.matrices import clonar_matriz


# validar_formato_vector(vector, nombre_vector='Vector') -> (es_valido, mensaje).
# Rechaza una lista vacía, una entrada que no sea lista y componentes no numéricas.
# Ejemplo: [1,2.5] pasa; [1,'hola'] falla indicando la posición 2. nombre_vector
# solo personaliza el mensaje: 'Vector u', 'Vector v' o un generador concreto.
# Límite actual: isinstance(...,(int,float)) también acepta bool en Python y
# no comprueba que el número sea finito. No equivale a validación numérica estricta.
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


# suma_vectores(u,v): primero valida ambos formatos y luego exige igual dimensión.
# No se puede sumar un vector de dos coordenadas con uno de tres en esta operación.
# Recorre i y calcula u[i]+v[i]; [1,2]+[3,4] produce [4,6].
# Ante error devuelve (None, [], mensaje), para que la ruta conteste HTTP 400.
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


# resta_vectores(u,v): aplica las mismas condiciones de formato y longitud.
# Calcula u[i]-v[i] respetando el orden; [1,2]-[3,4] produce [-2,-2].
# Los paréntesis en los mensajes ayudan a distinguir restar una coordenada negativa.
# Devuelve resultado, explicaciones por componente y None, o el contrato de error.
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


# mult_escalar_vector(c,v): c es un solo número que multiplica todas las posiciones.
# Ejemplo: c=3, v=[1,-2] -> [3,-6]. No necesita un segundo vector ni comparar largos.
# Aunque el parámetro se llame v aquí, api_vectores pasa el campo u del formulario.
# Si el escalar o el vector es inválido, se detiene antes del ciclo.
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


# verificar_combinacion_lineal(vectores_v, vector_b) busca coeficientes c1..cn
# que satisfagan c1*v1 + c2*v2 + ... + cn*vn = b. Ser combinación significa que
# existe al menos una elección de coeficientes; no hace falta que sea única.
# Entrada de ejemplo: vectores_v=[[1,0],[0,1]], vector_b=[3,4]. Los coeficientes
# son 3 y 4, por lo que la respuesta es afirmativa.
# Salida: (es_combinacion, mensaje, pasos_matriz, pasos_ecuaciones, soluciones).
# es_combinacion es True/False para un cálculo válido, y None para entrada inválida.
# Límite actual: valida cada vector, pero no valida explícitamente que vectores_v
# sea una lista no vacía antes de usar len y recorrerla. El frontend sí bloquea
# un conjunto vacío en el uso normal; la API por sí sola no cubre todos esos casos.
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
            
    # En el textarea se escribe un vector por línea, pero en la matriz A cada vector
    # debe ocupar una COLUMNA: los coeficientes desconocidos multiplican vectores.
    # Ejemplo: [[1,2],[3,4]] se transforma en A=[[1,3],[2,4]].
    # Hay m ecuaciones (coordenadas de b) y n incógnitas (número de generadores).
    # No confundir estas incógnitas con las coordenadas originales de cada vector.
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
    # La decisión depende de que el texto tipo_sistema contenga 'Inconsistente'.
    # Por eso cambiar ese texto en el resolutor también puede afectar esta función.
    # Tanto una solución única como infinitas soluciones producen True. La ruta
    # no incluye soluciones como campo separado, pero conserva el desarrollo algebraico.
    es_combinacion = "Inconsistente" not in tipo_sistema
    
    if es_combinacion:
        mensaje = "Análisis concluido: El vector b SÍ es combinación lineal del conjunto de vectores dados."
    else:
        mensaje = "Análisis concluido: El vector b NO es combinación lineal; sistema inconsistente."
    
    return es_combinacion, mensaje, pasos_matriz, pasos_ecuaciones, soluciones