"""
CONTROLADOR PRINCIPAL (rutas.py)
Este archivo actúa como el puente (API REST) entre la interfaz gráfica (HTML/JS) 
y la lógica matemática de la aplicación (Python). Recibe los datos del usuario, 
los procesa y devuelve los resultados en formato JSON.
"""

from flask import render_template, request, jsonify

# Importaciones de utilidades para procesar textos y verificar resultados
from .utilidades.ecuaciones import parsear_ecuacion
from .utilidades.verificacion import verificar_solucion

# Importaciones de los motores de resolución de sistemas de ecuaciones
from .metodos.gauss import resolver_gauss
from .metodos.gauss_jordan import resolver_gauss_jordan
from .metodos.pivote import resolver_pivote

# Importaciones de los nuevos módulos para Vectores y Matrices
from .metodos.vectores import suma_vectores, resta_vectores, mult_escalar_vector, verificar_combinacion_lineal
from .metodos.operaciones_matrices import suma_matrices, multiplicacion_matrices, mult_escalar_matriz


def index():
    """
    Ruta raíz ('/'). 
    Su única función es renderizar y enviar el archivo HTML principal 
    cuando el usuario entra a la página web por primera vez.
    """
    return render_template('index.html')


def calcular():
    """
    Endpoint para resolver Sistemas de Ecuaciones Lineales.
    Recibe un JSON con el tamaño del sistema, el método elegido y las ecuaciones en texto.
    """
    datos = request.json
    
    # Extraemos filas (m) y columnas (n)
    m, n = int(datos['m']), int(datos['n'])
    # Si no se especifica método, se usa 'gauss' por defecto
    metodo = datos.get('metodo', 'gauss') 
    ecuaciones = datos['ecuaciones']
    
    A, b = [], []
    
    # FASE DE PARSEO: Convierte el texto "2x1 + 3x2 = 5" en arreglos numéricos
    try:
        for eq in ecuaciones:
            A_row, b_val = parsear_ecuacion(eq, n)
            A.append(A_row)
            b.append(b_val)
    except Exception as e:
        # Si el usuario metió texto inválido, aborta y devuelve error HTTP 400 (Bad Request)
        return jsonify({"error": "Formato inválido. Asegúrate de incluir el '=' y nombrar las variables como x1, x2"}), 400
        
    # FASE DE RESOLUCIÓN: Llama al algoritmo matemático correcto según lo elegido en el frontend
    if metodo == 'gauss_jordan':
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_gauss_jordan(A, b, m, n)
    elif metodo == 'pivote':
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_pivote(A, b, m, n)
    else:
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_gauss(A, b, m, n)
        
    # FASE DE VERIFICACIÓN: Si el sistema tuvo solución única, evalúa que sea correcta
    verificacion = verificar_solucion(A, b, soluciones) if soluciones else []

    # Devuelve todos los cálculos empaquetados en un objeto JSON para que JavaScript los pinte
    return jsonify({
        "pasos": pasos,
        "tipo_sistema": tipo,
        "soluciones": soluciones,
        "pasos_ecuaciones": pasos_ecuaciones,
        "verificacion": verificacion
    })


def api_vectores():
    """
    Endpoint para el módulo de Vectores en R^n y Combinación Lineal.
    Recibe la operación solicitada, extrae los datos y retorna un JSON con la respuesta o error.
    """
    datos = request.json
    operacion = datos.get('operacion')
    
    # Estructura de control tipo Switch para direccionar la operación de vectores
    if operacion == 'suma':
        res, pasos, err = suma_vectores(datos.get('u', []), datos.get('v', []))
    elif operacion == 'resta':
        res, pasos, err = resta_vectores(datos.get('u', []), datos.get('v', []))
    elif operacion == 'escalar':
        res, pasos, err = mult_escalar_vector(datos.get('c'), datos.get('u', []))
    elif operacion == 'combinacion':
        # Llamada al motor especializado de combinación lineal
        es_comb, msg, pasos_matriz, pasos_ecuaciones, sols = verificar_combinacion_lineal(
            datos.get('vectores_v', []), datos.get('vector_b', [])
        )
        if es_comb is None: 
            return jsonify({"error": msg}), 400
            
        return jsonify({
            "mensaje": msg, 
            "pasos": pasos_matriz,          # Matrices paso a paso de Gauss-Jordan
            "pasos_ecuaciones": pasos_ecuaciones # Desglose algebraico paso a paso
        })
    else:
        return jsonify({"error": "Operación no soportada"}), 400

    # Verificación de errores devueltos por las funciones de validación básica
    if err:
        return jsonify({"error": err}), 400
        
    return jsonify({
        "resultado": res,
        "pasos_ecuaciones": [p["mensaje"] for p in pasos] # Textos descriptivos paso a paso
    })


def api_matrices():
    """
    Endpoint para el módulo de Operaciones Matriciales. 
    Recibe la operación y matrices mediante JSON, invoca los algoritmos y 
    empaqueta tanto las matrices visuales como las ecuaciones detalladas.
    """
    # Extracción de la carga JSON enviada por el frontend
    datos = request.json
    operacion = datos.get('operacion')
    
    # Estructura de control tipo Switch para direccionar la operación matricial
    if operacion == 'suma':
        res, pasos, pasos_eq, err = suma_matrices(datos.get('A', []), datos.get('B', []))
    elif operacion == 'multiplicacion':
        res, pasos, pasos_eq, err = multiplicacion_matrices(datos.get('A', []), datos.get('B', []))
    elif operacion == 'escalar':
        res, pasos, pasos_eq, err = mult_escalar_matriz(datos.get('c'), datos.get('A', []))
    else:
        return jsonify({"error": "Operación no soportada"}), 400

    # Si se detectó un error matemático o de formato, se retorna un código HTTP 400 con el mensaje
    if err:
        return jsonify({"error": err}), 400
        
    # Empaquetado final de la respuesta incluyendo los pasos matriciales y las ecuaciones
    return jsonify({
        "resultado": res,
        "pasos": pasos,               # Evolución visual de las matrices (Paso 0, 1, 2...)
        "pasos_ecuaciones": pasos_eq  # Desglose de fórmulas algebraicas a la vista del usuario
    })