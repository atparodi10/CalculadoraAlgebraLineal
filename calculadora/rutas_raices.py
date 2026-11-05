# CONTROLADOR DE RAÍCES DE ECUACIONES — Lineal Tanix
# Frontera entre raices.js y metodos/raices.py. Se registra en
# calculadora/__init__.py como GET /raices y POST /api/raices.
import re
from flask import request, jsonify, render_template
from .metodos.raices import (
    biseccion, regla_falsa, newton_raphson, secante,
    normalizar_ecuacion, evaluar_rango, buscar_cambios_signo, evaluar_seguro
)


def _explicitar_multiplicacion(expr):
    """
    Convierte multiplicación implícita a explícita para compatibilidad con
    evaluar_funcion (que es usado internamente por los métodos numéricos).
    Ejemplos: '2x' → '2*x', '2sin(x)' → '2*sin(x)', 'x(' → 'x*(',
              ')x' → ')*x', ')2' → ')*2', ')(' → ')*('.
    No modifica nombres de funciones (sin, cos, tan, exp, ln, log, sqrt, abs).
    """
    if not expr:
        return expr

    # Paso 1: dígito seguido de 'x' (no parte de exp/max, etc.)
    # Ej: 2x → 2*x, 5x → 5*x  (pero no 'exp')
    expr = re.sub(r'(\d)([x])\b', r'\1*\2', expr)

    # Paso 2: dígito seguido de función
    for fn in ('sin', 'cos', 'tan', 'exp', 'ln', 'log', 'sqrt', 'abs'):
        expr = re.sub(r'(\d)(' + fn + r')\b', r'\1*\2', expr)

    # Paso 3: dígito seguido de '('
    expr = re.sub(r'(\d)\(', r'\1*(', expr)

    # Paso 4: ')' seguido de dígito, variable o '('
    expr = re.sub(r'\)(\d)', r')*\1', expr)
    expr = re.sub(r'\)([x])\b', r')*\1', expr)
    expr = re.sub(r'\)\(', r')*(', expr)

    # Paso 5: 'x' seguido de '(' o función
    expr = re.sub(r'\bx\(', r'x*(', expr)
    for fn in ('sin', 'cos', 'tan', 'exp', 'ln', 'log', 'sqrt', 'abs'):
        expr = re.sub(r'\bx(' + fn + r')\b', r'x*\1', expr)

    # Paso 6: ')' seguido de función
    for fn in ('sin', 'cos', 'tan', 'exp', 'ln', 'log', 'sqrt', 'abs'):
        expr = re.sub(r'\)(' + fn + r')\b', r')*\1', expr)

    return expr


def page_raices():
    """Página dedicada al módulo de Raíces de Ecuaciones (Métodos Numéricos)."""
    return render_template('raices.html', active_page='raices')


def api_raices():
    """
    Controlador para el módulo de Raíces de Ecuaciones.
    Paso 1: Extrae la función f(x), el método y los parámetros del JSON.
    Paso 2: Valida los datos recibidos.
    Paso 3: Invoca el método numérico seleccionado.
    Paso 4: Retorna el JSON con resultados, pasos e información de convergencia.
    """
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({'error': 'Se esperaba un objeto JSON con los datos del problema.'}), 400

    funcion = datos.get('funcion', '').strip()
    metodo = datos.get('metodo', '').strip()
    error_esperado = datos.get('error_esperado')

    # Validaciones básicas
    if not funcion:
        return jsonify({'error': 'La función f(x) es obligatoria.'}), 400

    if not metodo:
        return jsonify({'error': 'Debes seleccionar un método numérico.'}), 400

    # Normalizar ecuación: si contiene '=', transformar A(x) = B(x) → A(x) - (B(x))
    funcion = normalizar_ecuacion(funcion)

    # Convertir multiplicación implícita a explícita para evaluar_funcion
    funcion = _explicitar_multiplicacion(funcion)

    try:
        error_esperado = float(error_esperado)
        if error_esperado <= 0:
            return jsonify({'error': 'El error esperado (Ea) debe ser un número positivo.'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'El error esperado (Ea) debe ser un número válido.'}), 400

    max_iter = datos.get('max_iter', 100)
    try:
        max_iter = int(max_iter)
        if max_iter < 1:
            max_iter = 100
    except (TypeError, ValueError):
        max_iter = 100

    try:
        if metodo == 'biseccion':
            xl = float(datos.get('xl', 0))
            xu = float(datos.get('xu', 0))
            resultado = biseccion(funcion, xl, xu, error_esperado, max_iter)

        elif metodo == 'regla_falsa':
            xl = float(datos.get('xl', 0))
            xu = float(datos.get('xu', 0))
            resultado = regla_falsa(funcion, xl, xu, error_esperado, max_iter)

        elif metodo == 'newton_raphson':
            x0 = float(datos.get('x0', 0))
            resultado = newton_raphson(funcion, x0, error_esperado, max_iter)

        elif metodo == 'secante':
            x_menos1 = float(datos.get('x_menos1', 0))
            x0 = float(datos.get('x0', 0))
            resultado = secante(funcion, x_menos1, x0, error_esperado, max_iter)

        else:
            return jsonify({'error': f'Método "{metodo}" no reconocido. Usa: biseccion, regla_falsa, newton_raphson o secante.'}), 400

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error al ejecutar el cálculo: {str(e)}'}), 500

    # Si el resultado contiene un error del método (ej: no cambio de signo)
    if resultado.get('error'):
        return jsonify(resultado), 400

    return jsonify(resultado)


def api_evaluar_rango():
    """
    Evalúa f(x) en un rango de puntos para la gráfica exploratoria.
    POST /api/raices/evaluar
    Body JSON: {funcion, x_min, x_max, n_puntos?}
    Respuesta: {puntos: [{x, y}, ...]}
    """
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({'error': 'JSON inválido.'}), 400

    funcion = datos.get('funcion', '').strip()
    if not funcion:
        return jsonify({'error': 'La función es obligatoria.'}), 400

    # Normalizar ecuación
    funcion = normalizar_ecuacion(funcion)

    try:
        x_min = float(datos.get('x_min', -10))
        x_max = float(datos.get('x_max', 10))
        n_puntos = int(datos.get('n_puntos', 400))
    except (TypeError, ValueError):
        return jsonify({'error': 'Parámetros numéricos inválidos.'}), 400

    if x_min >= x_max:
        return jsonify({'error': 'x_min debe ser menor que x_max.'}), 400

    try:
        puntos = evaluar_rango(funcion, x_min, x_max, n_puntos)
        return jsonify({'puntos': puntos})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error al evaluar: {str(e)}'}), 500


def api_buscar_limites():
    """
    Busca intervalos con cambio de signo para métodos cerrados.
    POST /api/raices/buscar-limites
    Body JSON: {funcion, x_min, x_max}
    Respuesta: {candidatos: [{xl, xu, f_xl, f_xu}, ...]}
    """
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({'error': 'JSON inválido.'}), 400

    funcion = datos.get('funcion', '').strip()
    if not funcion:
        return jsonify({'error': 'La función es obligatoria.'}), 400

    # Normalizar ecuación
    funcion = normalizar_ecuacion(funcion)

    try:
        x_min = float(datos.get('x_min', -10))
        x_max = float(datos.get('x_max', 10))
    except (TypeError, ValueError):
        return jsonify({'error': 'Parámetros numéricos inválidos.'}), 400

    if x_min >= x_max:
        return jsonify({'error': 'x_min debe ser menor que x_max.'}), 400

    try:
        candidatos = buscar_cambios_signo(funcion, x_min, x_max)
        return jsonify({'candidatos': candidatos})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error en búsqueda: {str(e)}'}), 500
