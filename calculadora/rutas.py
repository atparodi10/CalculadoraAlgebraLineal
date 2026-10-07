"""
CONTROLADOR PRINCIPAL (rutas.py)
Actúa como la capa de enrutamiento (API REST) que conecta la interfaz gráfica (HTML/JS) 
con los motores matemáticos del backend en Python. Recibe peticiones JSON, direcciona 
los datos hacia las funciones correspondientes y devuelve los resultados formateados.
"""

from flask import render_template, request, jsonify

# Importaciones de utilidades para parseo de texto y comprobación de resultados
from .utilidades.ecuaciones import parsear_ecuacion
from .utilidades.verificacion import verificar_solucion

# Importaciones de los motores de resolución para Sistemas de Ecuaciones Lineales
from .metodos.gauss import resolver_gauss
from .metodos.gauss_jordan import resolver_gauss_jordan
from .metodos.pivote import resolver_pivote

# Importaciones del módulo geométrico para Vectores en R^n y Combinación Lineal
from .metodos.vectores import suma_vectores, resta_vectores, mult_escalar_vector, verificar_combinacion_lineal

# Importaciones del módulo de Operaciones Matriciales Básicas (incluyendo la nueva resta)
from .metodos.operaciones_matrices import suma_matrices, resta_matrices, multiplicacion_matrices, mult_escalar_matriz

# Importación del motor de Matriz Inversa por Gauss-Jordan
from .metodos.inversa import inversa_matriz


# =========================================
# RUTAS DE PÁGINAS (cada módulo tiene su propia página)
# =========================================

def index():
    """Página principal con tarjetas de módulos."""
    return render_template('index.html', active_page='home')


def page_ecuaciones():
    """Página dedicada a sistemas de ecuaciones lineales."""
    return render_template('ecuaciones.html', active_page='ecuaciones')


def page_conversion():
    """Página dedicada a conversión de bases numéricas."""
    return render_template('conversion.html', active_page='conversion')


def page_vectores():
    """Página dedicada a operaciones con vectores y combinación lineal."""
    return render_template('vectores.html', active_page='vectores')


def page_matrices():
    """Página dedicada a operaciones matriciales."""
    return render_template('matrices.html', active_page='matrices')


# =========================================
# API ENDPOINTS
# =========================================

def calcular():
    """
    Controlador para resolver Sistemas de Ecuaciones Lineales.
    Paso 1: Extrae las dimensiones (m, n) y las ecuaciones textuales enviadas mediante JSON.
    Paso 2: Convierte las cadenas de texto en una matriz numérica A y un vector b (parseo).
    Paso 3: Invoca el algoritmo matemático seleccionado por el usuario (Gauss, Jordan o Pivote).
    Paso 4: Ejecuta la validación final del sistema y empaqueta la resolución en un JSON.
    """
    datos = request.json
    m, n = int(datos['m']), int(datos['n'])
    metodo = datos.get('metodo', 'gauss') 
    ecuaciones = datos['ecuaciones']
    
    A, b = [], []
    
    try:
        for eq in ecuaciones:
            A_row, b_val = parsear_ecuacion(eq, n)
            A.append(A_row)
            b.append(b_val)
    except Exception as e:
        return jsonify({"error": "Formato inválido. Asegúrate de incluir el '=' y nombrar las variables como x1, x2"}), 400
        
    if metodo == 'gauss_jordan':
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_gauss_jordan(A, b, m, n)
    elif metodo == 'pivote':
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_pivote(A, b, m, n)
    else:
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_gauss(A, b, m, n)
        
    verificacion = verificar_solucion(A, b, soluciones) if soluciones else []

    return jsonify({
        "pasos": pasos,
        "tipo_sistema": tipo,
        "soluciones": soluciones,
        "pasos_ecuaciones": pasos_ecuaciones,
        "verificacion": verificacion
    })


def api_vectores():
    """
    Controlador para el módulo de Vectores en R^n y Combinación Lineal. 
    Paso 1: Extrae la operación requerida y la dimensión geométrica 'n' enviada por el frontend.
    Paso 2: Direcciona el flujo a la función algebraica correspondiente inyectando la dimensión.
    Paso 3: Si detecta una combinación lineal, extrae las matrices intermedias de Gauss-Jordan.
    Paso 4: Envía el JSON con los textos paso a paso o notifica errores de inconsistencia.
    """
    datos = request.json
    operacion = datos.get('operacion')
    # Capturamos la dimensión n validada enviada por el usuario desde la UI
    n = int(datos.get('n', 0)) 
    
    if operacion == 'suma':
        res, pasos, err = suma_vectores(datos.get('u', []), datos.get('v', []), n)
    elif operacion == 'resta':
        res, pasos, err = resta_vectores(datos.get('u', []), datos.get('v', []), n)
    elif operacion == 'escalar':
        res, pasos, err = mult_escalar_vector(datos.get('c'), datos.get('u', []), n)
    elif operacion == 'combinacion':
        es_comb, msg, pasos_matriz, pasos_ecuaciones, sols = verificar_combinacion_lineal(
            datos.get('vectores_v', []), datos.get('vector_b', [])
        )
        if es_comb is None: 
            return jsonify({"error": msg}), 400
            
        return jsonify({
            "mensaje": msg, 
            "pasos": pasos_matriz,          
            "pasos_ecuaciones": pasos_ecuaciones 
        })
    else:
        return jsonify({"error": "Operación no soportada"}), 400

    if err:
        return jsonify({"error": err}), 400
        
    return jsonify({
        "resultado": res,
        "pasos_ecuaciones": [p["mensaje"] for p in pasos] 
    })


def api_matrices():
    """
    Controlador para el módulo de Operaciones Matriciales Básicas.
    Paso 1: Evalúa la operación solicitada (suma, resta, multiplicación o escalar).
    Paso 2: Desempaqueta las matrices de origen e invoca la lógica de cálculo puro.
    Paso 3: Atrapa el resultado, los historiales visuales de matriz (pasos) y el desglose de celdas (pasos_eq).
    Paso 4: Retorna la carga JSON formateada para el renderizado detallado en JavaScript.
    Para la inversa, incluye además tiempo real medido y datos de verificación A×A⁻¹.
    """
    datos = request.json
    operacion = datos.get('operacion')

    if operacion == 'suma':
        res, pasos, pasos_eq, err = suma_matrices(datos.get('A', []), datos.get('B', []))
    elif operacion == 'resta':
        res, pasos, pasos_eq, err = resta_matrices(datos.get('A', []), datos.get('B', []))
    elif operacion == 'multiplicacion':
        res, pasos, pasos_eq, err = multiplicacion_matrices(datos.get('A', []), datos.get('B', []))
    elif operacion == 'escalar':
        res, pasos, pasos_eq, err = mult_escalar_matriz(datos.get('c'), datos.get('A', []))
    elif operacion == 'inversa':
        # inversa_matriz devuelve 6 valores: resultado, pasos, ecuaciones, error, tiempo, verificación
        resultado_inv = inversa_matriz(datos.get('A', []))
        res = resultado_inv[0]
        pasos = resultado_inv[1]
        pasos_eq = resultado_inv[2]
        err = resultado_inv[3]
        tiempo_info = resultado_inv[4] if len(resultado_inv) > 4 else None
        verificacion_datos = resultado_inv[5] if len(resultado_inv) > 5 else None

        if err:
            # Ante singularidad, devolver los pasos alcanzados y el tiempo si existe
            respuesta_error = {"error": err}
            if pasos:
                respuesta_error["pasos"] = pasos
            if pasos_eq:
                respuesta_error["pasos_ecuaciones"] = pasos_eq
            if tiempo_info:
                respuesta_error["tiempo_info"] = tiempo_info
            return jsonify(respuesta_error), 400

        respuesta = {
            "resultado": res,
            "pasos": pasos,
            "pasos_ecuaciones": pasos_eq
        }
        if tiempo_info:
            respuesta["tiempo_info"] = tiempo_info
        if verificacion_datos:
            respuesta["verificacion_visual"] = verificacion_datos
        return jsonify(respuesta)
    else:
        return jsonify({"error": "Operación no soportada"}), 400

    if err:
        return jsonify({"error": err}), 400

    return jsonify({
        "resultado": res,
        "pasos": pasos,
        "pasos_ecuaciones": pasos_eq
    })

