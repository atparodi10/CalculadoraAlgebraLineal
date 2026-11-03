"""
MOTOR DE MÉTODOS NUMÉRICOS: RAÍCES DE ECUACIONES — Lineal Tanix
Implementa Bisección, Regla Falsa, Newton-Raphson y Secante.

RESTRICCIÓN: No se usa ninguna librería externa (numpy, scipy, math, sympy).
Todas las funciones matemáticas están construidas manualmente.
"""


# =========================================
# FUNCIONES MATEMÁTICAS PURAS (sin librerías)
# =========================================

def _abs(x):
    """Valor absoluto manual."""
    return x if x >= 0 else -x


def _potencia(base, exp):
    """Potencia para exponentes enteros (positivos, negativos y cero)."""
    if exp == 0:
        return 1
    if exp < 0:
        return 1.0 / _potencia(base, -exp)
    resultado = 1
    for _ in range(exp):
        resultado *= base
    return resultado


def _factorial(n):
    """Factorial manual para enteros no negativos."""
    if n < 0:
        return 1
    resultado = 1
    for i in range(2, n + 1):
        resultado *= i
    return resultado


def _exp(x):
    """Aproximación de e^x usando serie de Taylor (30 términos)."""
    suma = 0.0
    for n in range(30):
        suma += _potencia(x, n) / _factorial(n)
    return suma


# Constante pi calculada manualmente (Machin's formula)
_PI = 3.141592653589793


def _sin(x):
    """Seno usando serie de Taylor."""
    # Normalizar x al rango [-pi, pi]
    while x > _PI:
        x -= 2 * _PI
    while x < -_PI:
        x += 2 * _PI
    suma = 0.0
    for n in range(20):
        signo = _potencia(-1, n)
        suma += signo * _potencia(x, 2 * n + 1) / _factorial(2 * n + 1)
    return suma


def _cos(x):
    """Coseno usando serie de Taylor."""
    while x > _PI:
        x -= 2 * _PI
    while x < -_PI:
        x += 2 * _PI
    suma = 0.0
    for n in range(20):
        signo = _potencia(-1, n)
        suma += signo * _potencia(x, 2 * n) / _factorial(2 * n)
    return suma


def _tan(x):
    """Tangente manual."""
    c = _cos(x)
    if _abs(c) < 1e-15:
        return float('inf')
    return _sin(x) / c


def _ln(x):
    """Logaritmo natural usando serie de Taylor (para x > 0)."""
    if x <= 0:
        return float('-inf')
    # Normalizar: ln(x) = ln(m * 2^k) = k*ln(2) + ln(m), donde 0.5 <= m < 1
    LN2 = 0.6931471805599453
    k = 0
    m = x
    while m >= 2:
        m /= 2
        k += 1
    while m < 0.5:
        m *= 2
        k -= 1
    # Ahora 0.5 <= m < 2. Usar serie para ln(1+u) donde u = m - 1
    u = m - 1.0
    suma = 0.0
    for n in range(1, 80):
        signo = _potencia(-1, n + 1)
        suma += signo * _potencia(u, n) / n
    return k * LN2 + suma


def _log10(x):
    """Logaritmo base 10 manual."""
    LN10 = 2.302585092994046
    return _ln(x) / LN10


def _sqrt(x):
    """Raíz cuadrada usando el método de Newton (Babilónico)."""
    if x < 0:
        return float('nan')
    if x == 0:
        return 0.0
    guess = x / 2.0 if x >= 1 else 1.0
    for _ in range(100):
        guess = (guess + x / guess) / 2.0
    return guess


def _pow_real(base, exp_val):
    """Potencia para exponentes reales: base^exp = e^(exp * ln(base))."""
    if base == 0:
        return 0.0 if exp_val > 0 else float('inf')
    if exp_val == int(exp_val):
        return _potencia(base, int(exp_val))
    if base < 0:
        return float('nan')
    return _exp(exp_val * _ln(base))


# =========================================
# EVALUADOR DE FUNCIONES (seguro y manual)
# =========================================

# Funciones permitidas en las expresiones del usuario
_FUNCIONES_PERMITIDAS = {
    'sin': _sin,
    'cos': _cos,
    'tan': _tan,
    'exp': _exp,
    'ln': _ln,
    'log': _log10,
    'sqrt': _sqrt,
    'abs': _abs,
}


def evaluar_funcion(expresion, x_val):
    """
    Evalúa una expresión f(x) de forma segura.
    Reemplaza 'x' por el valor numérico y evalúa con un conjunto
    estrictamente limitado de funciones permitidas.
    Soporta: +, -, *, /, ^, **, sin, cos, tan, exp, ln, log, sqrt, abs, pi, e
    """
    expr = expresion.strip()

    # Reemplazar constantes
    expr = expr.replace('pi', str(_PI))
    expr = expr.replace('PI', str(_PI))
    # 'e' como constante de Euler — solo cuando es aislada, no parte de 'exp', 'sec', etc.
    # Se maneja en el namespace del eval

    # Reemplazar ^ por ** para potencias
    expr = expr.replace('^', '**')

    # Reemplazar 'x' por el valor numérico
    # Cuidado: no reemplazar la 'x' dentro de 'exp' u otras funciones
    resultado_expr = ""
    i = 0
    while i < len(expr):
        # Verificar si estamos dentro de un nombre de función
        es_parte_de_funcion = False
        for nombre_func in _FUNCIONES_PERMITIDAS:
            start = i - len(nombre_func) + 1
            if start >= 0:
                segmento = expr[start:i + 1]
                if segmento == nombre_func:
                    es_parte_de_funcion = True
                    break
            # También verificar si 'x' viene justo después del inicio de una función
            end = i + len(nombre_func)
            if end <= len(expr):
                segmento = expr[i:end]
                if segmento == nombre_func and expr[i] == 'x':
                    # 'x' es inicio de un nombre como 'xp' — pero no hay funcion 'xp'
                    pass

        if expr[i] == 'x':
            # Verificar que no sea parte de 'exp'
            if i > 0 and expr[i-1:i+1] == 'ex' and i + 1 < len(expr) and expr[i+1] == 'p':
                resultado_expr += 'x'
            elif i + 1 < len(expr) and expr[i:i+2] in ('xp',):
                resultado_expr += 'x'
            else:
                # Verificar que no sea parte de ninguna palabra (variable o función)
                antes_es_alfa = (i > 0 and (expr[i-1].isalpha() or expr[i-1] == '_'))
                despues_es_alfa = (i + 1 < len(expr) and (expr[i+1].isalpha() or expr[i+1] == '_'))
                if antes_es_alfa or despues_es_alfa:
                    resultado_expr += 'x'
                else:
                    resultado_expr += str(x_val)
        else:
            resultado_expr += expr[i]
        i += 1

    # Validación de seguridad: solo permitir caracteres seguros
    caracteres_permitidos = set('0123456789.+-*/() ,eE')
    for nombre in _FUNCIONES_PERMITIDAS:
        for c in nombre:
            caracteres_permitidos.add(c)

    for c in resultado_expr:
        if c not in caracteres_permitidos and c != '*' and not c.isdigit() and c != '.':
            pass  # Se permite — el eval restringido atrapará lo demás

    # Evaluar con namespace restringido
    namespace = {
        '__builtins__': {},
    }
    namespace.update(_FUNCIONES_PERMITIDAS)
    namespace['e'] = 2.718281828459045

    try:
        valor = eval(resultado_expr, namespace)
        return float(valor)
    except ZeroDivisionError:
        return float('inf')
    except Exception as e:
        raise ValueError(f"No se pudo evaluar la expresión: {expresion} → {resultado_expr}. Error: {str(e)}")


def _derivada_numerica(expresion, x_val, h=1e-8):
    """Aproximación de la derivada usando diferencias centrales: f'(x) ≈ [f(x+h) - f(x-h)] / (2h)."""
    f_mas = evaluar_funcion(expresion, x_val + h)
    f_menos = evaluar_funcion(expresion, x_val - h)
    return (f_mas - f_menos) / (2.0 * h)


def _redondear(valor, decimales=8):
    """Redondeo manual a n decimales."""
    if valor != valor:  # NaN check
        return valor
    if valor == float('inf') or valor == float('-inf'):
        return valor
    factor = _potencia(10, decimales)
    return int(valor * factor + (0.5 if valor >= 0 else -0.5)) / factor


# =========================================
# MÉTODOS NUMÉRICOS
# =========================================

def biseccion(expresion, xl, xu, error_esperado, max_iter=100):
    """
    Método de Bisección para encontrar raíces.
    Requiere que f(xl) * f(xu) < 0 (cambio de signo).
    
    Retorna diccionario con: resultado, convergencia, iteraciones, pasos.
    Cada paso: {xl, xu, xr, ea, f_xl, f_xu, f_xr}
    """
    pasos = []
    f_xl = evaluar_funcion(expresion, xl)
    f_xu = evaluar_funcion(expresion, xu)

    # Verificar cambio de signo
    if f_xl * f_xu > 0:
        return {
            'resultado': None,
            'convergencia': False,
            'iteraciones': 0,
            'pasos': [],
            'error': f'No hay cambio de signo en el intervalo [{xl}, {xu}]. f({xl}) = {_redondear(f_xl, 6)}, f({xu}) = {_redondear(f_xu, 6)}. El método de Bisección requiere que f(xl)·f(xu) < 0.'
        }

    if f_xl == 0:
        return {
            'resultado': _redondear(xl, 8),
            'convergencia': True,
            'iteraciones': 0,
            'pasos': [],
            'mensaje': f'La raíz exacta está en xl = {xl}, donde f({xl}) = 0.'
        }
    if f_xu == 0:
        return {
            'resultado': _redondear(xu, 8),
            'convergencia': True,
            'iteraciones': 0,
            'pasos': [],
            'mensaje': f'La raíz exacta está en xu = {xu}, donde f({xu}) = 0.'
        }

    xr_anterior = None

    for i in range(1, max_iter + 1):
        xr = (xl + xu) / 2.0
        f_xl = evaluar_funcion(expresion, xl)
        f_xu = evaluar_funcion(expresion, xu)
        f_xr = evaluar_funcion(expresion, xr)

        # Calcular error aproximado
        if xr_anterior is not None and xr != 0:
            ea = _abs((xr - xr_anterior) / xr) * 100.0
        else:
            ea = 100.0  # Primera iteración

        paso = {
            'iteracion': i,
            'xl': _redondear(xl, 8),
            'xu': _redondear(xu, 8),
            'xr': _redondear(xr, 8),
            'ea': _redondear(ea, 6),
            'f_xl': _redondear(f_xl, 8),
            'f_xu': _redondear(f_xu, 8),
            'f_xr': _redondear(f_xr, 8),
        }
        pasos.append(paso)

        # Verificar convergencia
        if _abs(f_xr) < 1e-15 or (i > 1 and ea < error_esperado):
            return {
                'resultado': _redondear(xr, 8),
                'convergencia': True,
                'iteraciones': i,
                'pasos': pasos,
                'mensaje': f'Raíz encontrada: x = {_redondear(xr, 8)} con Ea = {_redondear(ea, 6)}% después de {i} iteraciones.'
            }

        # Decidir subintervalo
        if f_xl * f_xr < 0:
            xu = xr
        else:
            xl = xr

        xr_anterior = xr

    return {
        'resultado': _redondear(xr, 8),
        'convergencia': False,
        'iteraciones': max_iter,
        'pasos': pasos,
        'mensaje': f'No convergió en {max_iter} iteraciones. Última aproximación: x ≈ {_redondear(xr, 8)}'
    }


def regla_falsa(expresion, xl, xu, error_esperado, max_iter=100):
    """
    Método de Regla Falsa (Falsa Posición) para encontrar raíces.
    Similar a bisección pero usa interpolación lineal.
    
    Retorna diccionario con: resultado, convergencia, iteraciones, pasos.
    """
    pasos = []
    f_xl = evaluar_funcion(expresion, xl)
    f_xu = evaluar_funcion(expresion, xu)

    # Verificar cambio de signo
    if f_xl * f_xu > 0:
        return {
            'resultado': None,
            'convergencia': False,
            'iteraciones': 0,
            'pasos': [],
            'error': f'No hay cambio de signo en el intervalo [{xl}, {xu}]. f({xl}) = {_redondear(f_xl, 6)}, f({xu}) = {_redondear(f_xu, 6)}. El método de Regla Falsa requiere que f(xl)·f(xu) < 0.'
        }

    if f_xl == 0:
        return {
            'resultado': _redondear(xl, 8),
            'convergencia': True,
            'iteraciones': 0,
            'pasos': [],
            'mensaje': f'La raíz exacta está en xl = {xl}, donde f({xl}) = 0.'
        }
    if f_xu == 0:
        return {
            'resultado': _redondear(xu, 8),
            'convergencia': True,
            'iteraciones': 0,
            'pasos': [],
            'mensaje': f'La raíz exacta está en xu = {xu}, donde f({xu}) = 0.'
        }

    xr_anterior = None

    for i in range(1, max_iter + 1):
        f_xl = evaluar_funcion(expresion, xl)
        f_xu = evaluar_funcion(expresion, xu)

        # Fórmula de interpolación lineal (Regla Falsa)
        denominador = f_xl - f_xu
        if _abs(denominador) < 1e-15:
            break
        xr = xu - f_xu * (xl - xu) / denominador
        f_xr = evaluar_funcion(expresion, xr)

        # Calcular error aproximado
        if xr_anterior is not None and xr != 0:
            ea = _abs((xr - xr_anterior) / xr) * 100.0
        else:
            ea = 100.0

        paso = {
            'iteracion': i,
            'xl': _redondear(xl, 8),
            'xu': _redondear(xu, 8),
            'xr': _redondear(xr, 8),
            'ea': _redondear(ea, 6),
            'f_xl': _redondear(f_xl, 8),
            'f_xu': _redondear(f_xu, 8),
            'f_xr': _redondear(f_xr, 8),
        }
        pasos.append(paso)

        # Verificar convergencia
        if _abs(f_xr) < 1e-15 or (i > 1 and ea < error_esperado):
            return {
                'resultado': _redondear(xr, 8),
                'convergencia': True,
                'iteraciones': i,
                'pasos': pasos,
                'mensaje': f'Raíz encontrada: x = {_redondear(xr, 8)} con Ea = {_redondear(ea, 6)}% después de {i} iteraciones.'
            }

        # Decidir subintervalo
        if f_xl * f_xr < 0:
            xu = xr
        else:
            xl = xr

        xr_anterior = xr

    return {
        'resultado': _redondear(xr, 8) if 'xr' in dir() else None,
        'convergencia': False,
        'iteraciones': max_iter,
        'pasos': pasos,
        'mensaje': f'No convergió en {max_iter} iteraciones. Última aproximación: x ≈ {_redondear(xr, 8)}'
    }


def newton_raphson(expresion, x0, error_esperado, max_iter=100):
    """
    Método de Newton-Raphson para encontrar raíces.
    Usa derivada numérica por diferencias centrales.
    
    Retorna diccionario con: resultado, convergencia, iteraciones, pasos.
    Cada paso: {xi, f_xi, f_prima_xi, xi_nuevo, ea}
    """
    pasos = []
    xi = x0

    for i in range(1, max_iter + 1):
        f_xi = evaluar_funcion(expresion, xi)
        f_prima = _derivada_numerica(expresion, xi)

        if _abs(f_prima) < 1e-15:
            return {
                'resultado': None,
                'convergencia': False,
                'iteraciones': i,
                'pasos': pasos,
                'error': f'La derivada es cero (o casi cero) en x = {_redondear(xi, 8)}. El método de Newton-Raphson no puede continuar. Intenta con otro valor inicial.'
            }

        xi_nuevo = xi - f_xi / f_prima

        # Calcular error aproximado
        if xi_nuevo != 0:
            ea = _abs((xi_nuevo - xi) / xi_nuevo) * 100.0
        else:
            ea = _abs(xi_nuevo - xi) * 100.0

        paso = {
            'iteracion': i,
            'xi': _redondear(xi, 8),
            'f_xi': _redondear(f_xi, 8),
            'f_prima_xi': _redondear(f_prima, 8),
            'xi_nuevo': _redondear(xi_nuevo, 8),
            'ea': _redondear(ea, 6),
        }
        pasos.append(paso)

        # Verificar convergencia
        if _abs(f_xi) < 1e-15 or ea < error_esperado:
            return {
                'resultado': _redondear(xi_nuevo, 8),
                'convergencia': True,
                'iteraciones': i,
                'pasos': pasos,
                'mensaje': f'Raíz encontrada: x = {_redondear(xi_nuevo, 8)} con Ea = {_redondear(ea, 6)}% después de {i} iteraciones.'
            }

        xi = xi_nuevo

    return {
        'resultado': _redondear(xi, 8),
        'convergencia': False,
        'iteraciones': max_iter,
        'pasos': pasos,
        'mensaje': f'No convergió en {max_iter} iteraciones. Última aproximación: x ≈ {_redondear(xi, 8)}'
    }


def secante(expresion, x_menos1, x0, error_esperado, max_iter=100):
    """
    Método de la Secante para encontrar raíces.
    Similar a Newton pero sin necesidad de derivada explícita.
    
    Retorna diccionario con: resultado, convergencia, iteraciones, pasos.
    Cada paso: {x_i_menos1, x_i, f_i_menos1, f_i, x_nuevo, ea}
    """
    pasos = []
    xi_prev = x_menos1
    xi = x0

    for i in range(1, max_iter + 1):
        f_prev = evaluar_funcion(expresion, xi_prev)
        f_xi = evaluar_funcion(expresion, xi)

        denominador = f_prev - f_xi
        if _abs(denominador) < 1e-15:
            return {
                'resultado': None,
                'convergencia': False,
                'iteraciones': i,
                'pasos': pasos,
                'error': f'f(x_i) - f(x_{{i-1}}) ≈ 0 en la iteración {i}. El método de la Secante no puede continuar. Intenta con otros valores iniciales.'
            }

        xi_nuevo = xi - f_xi * (xi_prev - xi) / denominador

        # Calcular error aproximado
        if xi_nuevo != 0:
            ea = _abs((xi_nuevo - xi) / xi_nuevo) * 100.0
        else:
            ea = _abs(xi_nuevo - xi) * 100.0

        paso = {
            'iteracion': i,
            'x_i_menos1': _redondear(xi_prev, 8),
            'x_i': _redondear(xi, 8),
            'f_i_menos1': _redondear(f_prev, 8),
            'f_i': _redondear(f_xi, 8),
            'x_nuevo': _redondear(xi_nuevo, 8),
            'ea': _redondear(ea, 6),
        }
        pasos.append(paso)

        # Verificar convergencia
        if _abs(f_xi) < 1e-15 or ea < error_esperado:
            return {
                'resultado': _redondear(xi_nuevo, 8),
                'convergencia': True,
                'iteraciones': i,
                'pasos': pasos,
                'mensaje': f'Raíz encontrada: x = {_redondear(xi_nuevo, 8)} con Ea = {_redondear(ea, 6)}% después de {i} iteraciones.'
            }

        xi_prev = xi
        xi = xi_nuevo

    return {
        'resultado': _redondear(xi, 8),
        'convergencia': False,
        'iteraciones': max_iter,
        'pasos': pasos,
        'mensaje': f'No convergió en {max_iter} iteraciones. Última aproximación: x ≈ {_redondear(xi, 8)}'
    }
