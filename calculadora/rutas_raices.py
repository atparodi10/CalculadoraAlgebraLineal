# CONTROLADOR DE RAÍCES DE ECUACIONES — Lineal Tanix
# Frontera entre raices.js y metodos/raices.py. Se registra en
# calculadora/__init__.py como GET /raices y POST /api/raices.
from flask import request, jsonify, render_template
from .metodos.raices import biseccion, regla_falsa, newton_raphson, secante


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

