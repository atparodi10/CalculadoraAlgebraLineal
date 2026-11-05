"""
MOTOR DE MÉTODOS NUMÉRICOS: RAÍCES DE ECUACIONES — Lineal Tanix
Implementa Bisección, Regla Falsa, Newton-Raphson y Secante.

Versiones educativas manuales conservadas como referencia académica.
No se utilizan para cálculos de producción: sus series tienen precisión limitada.
Las entradas de demostración deben ser finitas y moderadas (|x| <= 20).
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
    if exp > 10000:
        raise ValueError("Exponente educativo fuera de rango.")
    resultado = 1
    while exp:
        if exp % 2:
            resultado *= base
        base *= base
        exp //= 2
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
    if not -20 <= x <= 20:
        raise ValueError("Demostración de Taylor limitada a |x| <= 20.")
    if x < 0:
        return 1 / _exp(-x)
    suma = termino = 1.0
    for n in range(1, 100):
        termino *= x / n
        suma += termino
    return suma


# Constante pi calculada manualmente (Machin's formula)
_PI = 3.141592653589793


def _sin(x):
    """Seno usando serie de Taylor."""
    # Normalizar x al rango [-pi, pi]
    x = (x + _PI) % (2 * _PI) - _PI
    suma = 0.0
    for n in range(20):
        signo = _potencia(-1, n)
        suma += signo * _potencia(x, 2 * n + 1) / _factorial(2 * n + 1)
    return suma


def _cos(x):
    """Coseno usando serie de Taylor."""
    x = (x + _PI) % (2 * _PI) - _PI
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
    if x != x or x in (float("inf"), float("-inf")):
        raise ValueError("La demostración requiere un valor finito.")
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
    u = (m - 1) / (m + 1)
    suma = 0.0
    for n in range(1, 120, 2):
        suma += _potencia(u, n) / n
    return k * LN2 + 2 * suma



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


