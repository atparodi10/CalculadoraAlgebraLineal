"""API de raíces: todas las operaciones comparten parser y validaciones."""
from flask import request, jsonify, render_template
from .metodos.raices import biseccion, regla_falsa, newton_raphson, secante, evaluar_rango, buscar_cambios_signo
from .utilidades.expresiones import compilar_expresion
from .utilidades.validacion import numero, entero, texto

METODOS = {'biseccion': (biseccion, ('xl', 'xu')), 'regla_falsa': (regla_falsa, ('xl', 'xu')),
           'newton_raphson': (newton_raphson, ('x0',)), 'secante': (secante, ('x_menos1', 'x0'))}


def page_raices():
    return render_template('raices.html', active_page='raices')


def _funcion(datos):
    funcion = texto(datos.get('funcion'), 'funcion')
    compilar_expresion(funcion)
    return funcion


def _calcular(datos, metodo):
    if not isinstance(metodo, str) or metodo not in METODOS: raise ValueError('Método de raíces desconocido.')
    funcion = _funcion(datos)
    error = numero(datos.get('error_esperado'), 'error_esperado')
    if not 0 < error <= 100: raise ValueError('Ea debe ser mayor que cero y menor o igual a 100%.')
    max_iter = entero(datos.get('max_iter', 100), 'max_iter', 1, 1000)
    ejecutar, campos = METODOS[metodo]
    parametros = [numero(datos.get(campo), campo) for campo in campos]
    resultado = ejecutar(funcion, *parametros, error, max_iter)
    resultado['metodo'] = metodo
    resultado['tolerancia_porcentual'] = error
    resultado['criterio_residuo'] = 'Residuo <= 1e-8 × min(1, escala inicial de f), además del Ea solicitado; o raíz exacta.'
    return resultado


def api_raices():
    datos = request.get_json()
    return jsonify(_calcular(datos, datos.get('metodo')))


def api_comparar():
    """Se ejecuta únicamente tras una acción explícita del usuario."""
    datos = request.get_json(); _funcion(datos)
    error = numero(datos.get('error_esperado'), 'error_esperado')
    if not 0 < error <= 100: raise ValueError('Ea debe estar entre 0 y 100 por ciento.')
    entero(datos.get('max_iter', 100), 'max_iter', 1, 1000)
    resultados = []
    for metodo in METODOS:
        try:
            resultado = _calcular(datos, metodo)
            resultado.pop('pasos', None)
            resultado['estado'] = 'Convergió' if resultado['convergencia'] else 'No convergió'
        except ValueError as error:
            resultado = {'metodo': metodo, 'convergencia': False, 'resultado': None,
                         'estado': 'No aplicable', 'mensaje': str(error), 'iteraciones': 0,
                         'residuo': None, 'error_final': None, 'tiempo_s': None}
        resultados.append(resultado)
    return jsonify({'comparacion': resultados})


def _rango(datos):
    return (numero(datos.get('x_min', -10), 'x_min'), numero(datos.get('x_max', 10), 'x_max'))


def api_evaluar_rango():
    datos = request.get_json(); funcion = _funcion(datos)
    n = entero(datos.get('n_puntos', 400), 'n_puntos', 2, 1200)
    return jsonify({'puntos': evaluar_rango(funcion, *_rango(datos), n)})


def api_buscar_limites():
    datos = request.get_json(); funcion = _funcion(datos)
    return jsonify({'candidatos': buscar_cambios_signo(funcion, *_rango(datos))})
