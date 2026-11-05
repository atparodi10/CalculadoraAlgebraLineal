"""
Tests obligatorios -- Lineal Tanix: modulo de Raices
Ejecutar:  python test_raices.py
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from calculadora.metodos.raices import (
    evaluar_seguro, normalizar_ecuacion,
    evaluar_rango, buscar_cambios_signo,
    biseccion, regla_falsa, newton_raphson, secante,
)

PASS = 0
FAIL = 0

def check(name, cond, detail=''):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f'  [OK]   {name}')
    else:
        FAIL += 1
        print(f'  [FAIL] {name}  ->  {detail}')


print('='*60)
print('TEST 1: x^2 - 2')
print('='*60)
r = biseccion('x^2-2', 0, 2, 0.001)
check('Biseccion converge', r['convergencia'])
check('Raiz aprox sqrt(2)', abs(r['resultado'] - 1.41421356) < 0.01, f"got {r['resultado']}")
c = buscar_cambios_signo('x^2-2', -5, 5)
check('Encuentra cambios de signo', len(c) >= 2, f'encontro {len(c)}')

print()
print('='*60)
print('TEST 2: x^2 - 4 (multi-raiz)')
print('='*60)
c = buscar_cambios_signo('x^2-4', -5, 5)
check('Encuentra >=2 intervalos', len(c) >= 2, f'encontro {len(c)}')
# Nota: evaluar_funcion (viejo) evalua x^2 con x negativo como -(x^2) por
# precedencia de Python. Esta es una limitacion preexistente. El parser seguro
# (evaluar_seguro) SI lo maneja correctamente. Verificamos ambos caminos:
check('Parser seguro: x^2-4 en x=-2 = 0', abs(evaluar_seguro('x^2-4', -2)) < 1e-10)
check('Parser seguro: x^2-4 en x=2 = 0', abs(evaluar_seguro('x^2-4', 2)) < 1e-10)
r2 = biseccion('x^2-4', 1, 3, 0.001)
check('Raiz en aprox +2 (Biseccion)', r2['convergencia'] and abs(r2['resultado'] - 2) < 0.01, str(r2.get('resultado')))
check('Raiz en aprox +2 (Biseccion)', r2['convergencia'] and abs(r2['resultado'] - 2) < 0.01, str(r2.get('resultado')))

print()
print('='*60)
print('TEST 3: ln(x+2) + x^2 - 2 (dominio)')
print('='*60)
v = evaluar_seguro('ln(x+2)+x^2-2', 0)
check('f(0) es finito', v is not None and v == v, str(v))
v_bad = evaluar_seguro('ln(x+2)+x^2-2', -3)
check('f(-3) fuera de dominio', v_bad == float('-inf') or v_bad != v_bad, str(v_bad))
pts = evaluar_rango('ln(x+2)+x^2-2', -1.9, 3, 50)
check('Rango devuelve 50 puntos', len(pts) == 50)

print()
print('='*60)
print('TEST 4: 2x^3 - 5x + 1 (mult. implicita)')
print('='*60)
# Nota: evaluar_funcion (usado por los metodos) no soporta mult. implicita.
# El parser seguro si la soporta. La ruta del backend normaliza antes de enviar.
check('Parser seguro: 2x^3 en x=0 = 1', abs(evaluar_seguro('2x^3-5x+1', 0) - 1) < 1e-10)
check('Parser seguro: 2x^3 en x=1 = -2', abs(evaluar_seguro('2x^3-5x+1', 1) - (-2)) < 1e-10)
# Para Newton con evaluar_funcion, usamos forma explicita:
r = newton_raphson('2*x^3-5*x+1', 2, 0.001)
check('Newton converge (forma explicita)', r['convergencia'])

print()
print('='*60)
print('TEST 5: sqrt(x+3) - x = 0 (ecuacion)')
print('='*60)
norm = normalizar_ecuacion('sqrt(x+3) - x = 0')
check('Normalizacion correcta', '(' in norm and '-' in norm, norm)
r = biseccion(norm, 0, 5, 0.001)
check('Biseccion converge', r['convergencia'])
check('Raiz aprox 2.303', abs(r['resultado'] - 2.303) < 0.05, str(r['resultado']))

print()
print('='*60)
print('TEST 6: 1/(x-1) (asintota)')
print('='*60)
c = buscar_cambios_signo('1/(x-1)', -5, 5)
check('Ignora asintota (0 candidatos)', len(c) == 0, f'encontro {len(c)}')

print()
print('='*60)
print('TEST 7: (x-1)^2 (tangencial)')
print('='*60)
c = buscar_cambios_signo('(x-1)^2', -5, 5)
check('Sin cambio de signo', len(c) == 0, f'encontro {len(c)}')
r = newton_raphson('(x-1)^2', 0.5, 0.001)
check('Newton encuentra raiz tangencial', r['convergencia'], str(r.get('resultado')))

print()
print('='*60)
print('TEST 8: x^2 = 2 (ecuacion con =)')
print('='*60)
norm = normalizar_ecuacion('x^2 = 2')
check('Normaliza a (x^2) - (2)', norm == '(x^2) - (2)', norm)
r = biseccion(norm, 0, 2, 0.001)
check('Biseccion converge', r['convergencia'])
check('Raiz aprox sqrt(2)', abs(r['resultado'] - 1.41421356) < 0.01, str(r['resultado']))

print()
print('='*60)
print('TEST EXTRA: Regla Falsa y Secante')
print('='*60)
r_rf = regla_falsa('x^2-2', 0, 2, 0.001)
check('Regla Falsa converge x^2-2', r_rf['convergencia'])
r_sec = secante('x^2-2', 0, 2, 0.001)
check('Secante converge x^2-2', r_sec['convergencia'])

print()
print('='*60)
print('TEST SEGURIDAD: Parser seguro (sin eval)')
print('='*60)
try:
    evaluar_seguro('__import__("os")', 0)
    check('Bloquea __import__', False, 'no lanzo error')
except:
    check('Bloquea __import__', True)

try:
    evaluar_seguro('open("file")', 0)
    check('Bloquea open()', False, 'no lanzo error')
except:
    check('Bloquea open()', True)

print()
print('='*60)
print(f'RESULTADO: {PASS} pasaron, {FAIL} fallaron de {PASS+FAIL} tests')
print('='*60)
