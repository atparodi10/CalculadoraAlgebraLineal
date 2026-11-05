"""Métodos de raíces con parser común, residuos y diagnósticos verificables.

Los floats conservan su precisión completa. Ea es relativo porcentual; cuando
x=0 se informa Ea=None y se usa el error absoluto, sin dividir entre cero.
El muestreo detecta algunas discontinuidades, pero no demuestra continuidad.
"""
import math
import time
from ..utilidades.expresiones import compilar_expresion, normalizar_ecuacion

# Nombres históricos conservados; las variantes manuales viven en raices_educativas.
_abs, _sin, _cos, _tan = abs, math.sin, math.cos, math.tan
_exp, _ln, _log10, _sqrt, _pow_real = math.exp, math.log, math.log10, math.sqrt, math.pow
_PI = math.pi
MAX_ITERACIONES = 1000
MAX_PUNTOS = 1200


def evaluar_funcion(expresion, x_val):
    return compilar_expresion(expresion)(x_val)


def evaluar_seguro(expresion, x_val):
    """Sintaxis inválida se rechaza; fuera del dominio retorna NaN para la gráfica."""
    return compilar_expresion(expresion).seguro(x_val)


def _numero(valor, nombre):
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or abs(valor) > 1e12 or not math.isfinite(valor):
        raise ValueError(f'{nombre} debe ser un número finito de magnitud <= 1e12.')
    return float(valor)


def _parametros(error, max_iter):
    _numero(error, 'Ea')
    if not 0 < error <= 100: raise ValueError('Ea debe estar entre 0 y 100 por ciento.')
    if type(max_iter) is not int or not 1 <= max_iter <= MAX_ITERACIONES:
        raise ValueError(f'Las iteraciones deben estar entre 1 y {MAX_ITERACIONES}.')


def _derivada_numerica(expresion, x_val, h=None):
    """Diferencia central de cinco puntos; paso equilibrado con el redondeo float."""
    f = expresion if callable(expresion) else compilar_expresion(expresion)
    h = h or math.ulp(1.0) ** .2 * max(1., abs(x_val))
    return (f(x_val-2*h) - 8*f(x_val-h) + 8*f(x_val+h) - f(x_val+2*h)) / (12*h)


def _errores(x, previo):
    if previo is None: return None, None
    absoluto = abs(x - previo)
    relativo = absoluto / abs(x) * 100 if x != 0 else None
    return relativo, absoluto


def _terminar(x, fx, pasos, convergio, motivo, inicio, advertencias=None):
    ultimo = pasos[-1] if pasos else {}
    return {'resultado': x, 'convergencia': convergio, 'iteraciones': len(pasos),
            'pasos': pasos, 'error_final': ultimo.get('ea'),
            'error_absoluto': ultimo.get('error_absoluto'),
            'residuo': abs(fx) if fx is not None else None,
            'motivo': motivo, 'mensaje': motivo,
            'tiempo_s': time.perf_counter()-inicio,
            'advertencias': advertencias or []}


def _converge(x, fx, previo, ea_objetivo, escala):
    if fx == 0: return True
    if previo is None: return False
    relativo, absoluto = _errores(x, previo)
    paso_ok = relativo is not None and relativo <= ea_objetivo
    if x == 0: paso_ok = absoluto <= 1e-12
    # Se exige también residuo: evita aceptar una asíntota o estancamiento.
    return paso_ok and abs(fx) <= 1e-8 * min(1., escala)


def _muestrear_continuidad(f, xl, xu):
    for i in range(1, 64):
        if not math.isfinite(f.seguro(xl+(xu-xl)*i/64)):
            raise ValueError('El intervalo contiene un punto fuera del dominio o una discontinuidad. Selecciona otros límites.')


def _cerrado(expresion, xl, xu, error_esperado, max_iter, falsa):
    inicio = time.perf_counter(); pasos = []
    _parametros(error_esperado, max_iter)
    xl, xu = _numero(xl, 'xl'), _numero(xu, 'xu')
    if xl >= xu: raise ValueError('xl debe ser menor que xu.')
    f = compilar_expresion(expresion)
    fl, fu = f(xl), f(xu)
    aviso = ['La continuidad se ha muestreado; una cantidad finita de muestras no puede garantizarla.']
    if fl == 0: return _terminar(xl, fl, pasos, True, 'Raíz exacta en el límite inferior.', inicio)
    if fu == 0: return _terminar(xu, fu, pasos, True, 'Raíz exacta en el límite superior.', inicio)
    if (fl > 0) == (fu > 0): raise ValueError('No hay cambio de signo en el intervalo.')
    _muestrear_continuidad(f, xl, xu)
    escala = max(abs(fl), abs(fu)); previo = None; x = xl; fx = fl
    for i in range(1, max_iter+1):
        if falsa:
            # Escalar las ordenadas evita overflow y denominadores minúsculos.
            escala_f = max(abs(fl), abs(fu)); a, b = fl/escala_f, fu/escala_f
            denominador = b-a
            if abs(denominador) <= 16*math.ulp(1.):
                return _terminar(x, fx, pasos, False, 'Denominador numéricamente nulo.', inicio, aviso)
            x = xl - a*(xu-xl)/denominador
        else: x = xl + (xu-xl)/2
        fx = f(x)
        ea, absoluto = _errores(x, previo)
        pasos.append({'iteracion': i, 'xl': xl, 'xu': xu, 'xr': x,
                      'ea': ea, 'error_absoluto': absoluto, 'f_xl': fl, 'f_xu': fu, 'f_xr': fx,
                      'residuo': abs(fx)})
        if _converge(x, fx, previo, error_esperado, escala):
            return _terminar(x, fx, pasos, True, 'Raíz exacta.' if fx == 0 else 'Ea porcentual y residuo cumplen las tolerancias.', inicio, aviso)
        if x == previo or x in (xl, xu):
            return _terminar(x, fx, pasos, False, 'Estancamiento sin residuo suficientemente pequeño; posible discontinuidad o límite de precisión.', inicio, aviso)
        if (fl > 0) != (fx > 0): xu, fu = x, fx
        else: xl, fl = x, fx
        previo = x
    return _terminar(x, fx, pasos, False, 'Se alcanzó el límite de iteraciones sin convergencia.', inicio, aviso)


def biseccion(expresion, xl, xu, error_esperado, max_iter=100):
    return _cerrado(expresion, xl, xu, error_esperado, max_iter, False)


def regla_falsa(expresion, xl, xu, error_esperado, max_iter=100):
    return _cerrado(expresion, xl, xu, error_esperado, max_iter, True)


def newton_raphson(expresion, x0, error_esperado, max_iter=100):
    inicio = time.perf_counter(); pasos = []
    _parametros(error_esperado, max_iter); x = _numero(x0, 'x0')
    f = compilar_expresion(expresion); fx = f(x); escala = max(abs(fx), 1e-300)
    if fx == 0: return _terminar(x, fx, pasos, True, 'El valor inicial es una raíz exacta.', inicio)
    for i in range(1, max_iter+1):
        try: derivada = _derivada_numerica(f, x)
        except ValueError:
            return _terminar(x, fx, pasos, False, 'No se puede estimar la derivada dentro del dominio.', inicio)
        if not math.isfinite(derivada) or abs(derivada) <= 1e-14*escala/max(1., abs(x)):
            return _terminar(x, fx, pasos, False, 'Derivada cero o demasiado pequeña para continuar.', inicio)
        nuevo = x - fx/derivada
        if not math.isfinite(nuevo) or abs(nuevo) > 1e12:
            return _terminar(x, fx, pasos, False, 'Divergencia: aproximación fuera del rango permitido.', inicio)
        try: fn = f(nuevo)
        except ValueError:
            return _terminar(x, fx, pasos, False, 'La siguiente aproximación sale del dominio.', inicio)
        ea, absoluto = _errores(nuevo, x)
        pasos.append({'iteracion': i, 'xi': x, 'f_xi': fx, 'f_prima_xi': derivada,
                      'xi_nuevo': nuevo, 'f_nuevo': fn, 'ea': ea, 'error_absoluto': absoluto, 'residuo': abs(fn)})
        if _converge(nuevo, fn, x, error_esperado, escala):
            return _terminar(nuevo, fn, pasos, True, 'Raíz exacta.' if fn == 0 else 'Ea porcentual y residuo cumplen las tolerancias.', inicio)
        if nuevo == x:
            return _terminar(nuevo, fn, pasos, False, 'Estancamiento sin residuo suficientemente pequeño.', inicio)
        x, fx = nuevo, fn
    return _terminar(x, fx, pasos, False, 'Se alcanzó el límite de iteraciones sin convergencia.', inicio)


def secante(expresion, x_menos1, x0, error_esperado, max_iter=100):
    inicio = time.perf_counter(); pasos = []
    _parametros(error_esperado, max_iter)
    anterior, x = _numero(x_menos1, 'x_menos1'), _numero(x0, 'x0')
    f = compilar_expresion(expresion); fa, fx = f(anterior), f(x)
    for punto, valor in ((anterior, fa), (x, fx)):
        if valor == 0: return _terminar(punto, valor, pasos, True, 'Uno de los valores iniciales es una raíz exacta.', inicio)
    escala = max(abs(fa), abs(fx))
    for i in range(1, max_iter+1):
        factor = max(abs(fa), abs(fx)); a, b = fa/factor, fx/factor
        if abs(b-a) <= 16*math.ulp(1.):
            return _terminar(x, fx, pasos, False, 'Denominador cero o demasiado pequeño en la secante.', inicio)
        nuevo = x-b*(x-anterior)/(b-a)
        if not math.isfinite(nuevo) or abs(nuevo) > 1e12:
            return _terminar(x, fx, pasos, False, 'Divergencia: aproximación fuera del rango permitido.', inicio)
        try: fn = f(nuevo)
        except ValueError:
            return _terminar(x, fx, pasos, False, 'La siguiente aproximación sale del dominio.', inicio)
        ea, absoluto = _errores(nuevo, x)
        pasos.append({'iteracion': i, 'x_i_menos1': anterior, 'x_i': x,
                      'f_i_menos1': fa, 'f_i': fx, 'x_nuevo': nuevo, 'f_nuevo': fn,
                      'ea': ea, 'error_absoluto': absoluto, 'residuo': abs(fn)})
        if _converge(nuevo, fn, x, error_esperado, escala):
            return _terminar(nuevo, fn, pasos, True, 'Raíz exacta.' if fn == 0 else 'Ea porcentual y residuo cumplen las tolerancias.', inicio)
        if nuevo == x:
            return _terminar(nuevo, fn, pasos, False, 'Estancamiento sin residuo suficientemente pequeño.', inicio)
        anterior, fa, x, fx = x, fx, nuevo, fn
    return _terminar(x, fx, pasos, False, 'Se alcanzó el límite de iteraciones sin convergencia.', inicio)


def evaluar_rango(expresion, x_min, x_max, n_puntos=300):
    x_min, x_max = _numero(x_min, 'x_min'), _numero(x_max, 'x_max')
    if x_min >= x_max: raise ValueError('x_min debe ser menor que x_max.')
    if type(n_puntos) is not int or not 2 <= n_puntos <= MAX_PUNTOS:
        raise ValueError(f'La gráfica admite entre 2 y {MAX_PUNTOS} puntos.')
    f = compilar_expresion(expresion); puntos = []
    for i in range(n_puntos):
        x = x_min+(x_max-x_min)*i/(n_puntos-1); y = f.seguro(x)
        puntos.append({'x': x, 'y': y if math.isfinite(y) else None})
    return puntos


def buscar_cambios_signo(expresion, x_min, x_max, n_muestras=500):
    """Devuelve intervalos, sin refinar ni publicar una raíz antes del cálculo."""
    puntos = evaluar_rango(expresion, x_min, x_max, n_muestras)
    f = compilar_expresion(expresion); candidatos = []
    for a, b in zip(puntos, puntos[1:]):
        if a['y'] is None or b['y'] is None: continue
        if a['y'] != 0 and b['y'] != 0 and (a['y'] > 0) == (b['y'] > 0): continue
        xl, xu = a['x'], b['x']
        try:
            _muestrear_continuidad(f, xl, xu)
            # Refinamiento privado: una asíntota no debe aparecer como candidato válido.
            prueba = biseccion(expresion, xl, xu, .001, 100)
            if not prueba['convergencia']: continue
        except ValueError: continue
        candidatos.append({'xl': xl, 'xu': xu, 'f_xl': a['y'], 'f_xu': b['y']})
        if len(candidatos) >= 40: break
    return candidatos
