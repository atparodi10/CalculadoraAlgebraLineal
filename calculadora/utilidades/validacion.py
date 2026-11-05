"""Límites comunes del servidor; los formularios no son una frontera de confianza."""
import math
from flask import request

MAX_DIMENSION = 50
MAX_MAGNITUD = 1e12


def numero(valor, nombre):
    if type(valor) not in (int, float) or abs(valor) > MAX_MAGNITUD or not math.isfinite(valor):
        raise ValueError(f'{nombre} debe ser un número finito de magnitud <= 1e12.')
    return valor


def entero(valor, nombre, minimo=1, maximo=MAX_DIMENSION):
    if type(valor) is not int or not minimo <= valor <= maximo:
        raise ValueError(f'{nombre} debe ser un entero entre {minimo} y {maximo}.')
    return valor


def texto(valor, nombre, maximo=1000):
    if not isinstance(valor, str) or not valor.strip() or len(valor) > maximo:
        raise ValueError(f'{nombre} debe ser texto no vacío de hasta {maximo} caracteres.')
    return valor.strip()


def matriz(valor, nombre='Matriz'):
    if not isinstance(valor, list) or not valor or len(valor) > MAX_DIMENSION:
        raise ValueError(f'{nombre} debe tener entre 1 y {MAX_DIMENSION} filas.')
    if not isinstance(valor[0], list) or not 1 <= len(valor[0]) <= MAX_DIMENSION:
        raise ValueError(f'{nombre} debe tener entre 1 y {MAX_DIMENSION} columnas.')
    columnas = len(valor[0])
    for i, fila in enumerate(valor):
        if not isinstance(fila, list) or len(fila) != columnas:
            raise ValueError(f'{nombre}: fila {i+1} irregular.')
        for j, v in enumerate(fila): numero(v, f'{nombre}[{i+1},{j+1}]')
    return valor


def vector(valor, n, nombre='Vector'):
    entero(n, 'dimensión')
    if not isinstance(valor, list) or len(valor) != n:
        raise ValueError(f'{nombre} debe contener exactamente {n} componentes.')
    for v in valor: numero(v, nombre)
    return valor


def validar_peticion():
    if request.method != 'POST': return
    try:
        datos = request.get_json(silent=True)
    except RecursionError:
        raise ValueError('El JSON tiene demasiados niveles de anidación.') from None
    if not isinstance(datos, dict) or not datos:
        raise ValueError('Se esperaba un objeto JSON no vacío y bien formado.')
    ruta = request.path
    if ruta == '/calcular':
        m = entero(datos.get('m'), 'm'); n = entero(datos.get('n'), 'n')
        ecuaciones = datos.get('ecuaciones')
        if not isinstance(ecuaciones, list) or len(ecuaciones) != m:
            raise ValueError('La cantidad de ecuaciones debe coincidir con m.')
        for i, eq in enumerate(ecuaciones): texto(eq, f'Ecuación {i+1}', 2000)
        if datos.get('metodo', 'gauss') not in ('gauss', 'gauss_jordan', 'pivote'):
            raise ValueError('Método de sistemas desconocido.')
    elif ruta == '/api/matrices':
        operacion = datos.get('operacion')
        if operacion not in ('suma', 'resta', 'multiplicacion', 'escalar', 'inversa', 'determinante'):
            raise ValueError('Operación matricial desconocida.')
        matriz(datos.get('A'), 'A')
        if operacion in ('suma', 'resta', 'multiplicacion'): matriz(datos.get('B'), 'B')
        if operacion == 'escalar': numero(datos.get('c'), 'c')
        if operacion == 'determinante' and datos.get('metodo', 'auto') not in ('auto', 'lu', 'sarrus', 'cofactores'):
            raise ValueError('Método de determinante desconocido.')
    elif ruta == '/api/vectores':
        operacion = datos.get('operacion')
        if operacion == 'combinacion':
            b = datos.get('vector_b'); vv = datos.get('vectores_v')
            if not isinstance(b, list): raise ValueError('vector_b debe ser una lista.')
            vector(b, len(b), 'vector_b')
            if not isinstance(vv, list) or not 1 <= len(vv) <= MAX_DIMENSION:
                raise ValueError('Incluye entre 1 y 50 vectores.')
            for v in vv: vector(v, len(b))
        elif operacion in ('suma', 'resta', 'escalar'):
            n = entero(datos.get('n'), 'n'); vector(datos.get('u'), n, 'u')
            if operacion == 'escalar': numero(datos.get('c'), 'c')
            else: vector(datos.get('v'), n, 'v')
        else: raise ValueError('Operación vectorial desconocida.')
    elif ruta == '/convertir':
        texto(datos.get('numero'), 'numero', 70)
        entero(datos.get('base_origen'), 'base_origen', 2, 16)
        entero(datos.get('base_destino'), 'base_destino', 2, 16)
    elif ruta == '/api/romanos':
        if isinstance(datos.get('numero'), str): texto(datos['numero'], 'numero', 32)
        elif type(datos.get('numero')) is not int: raise ValueError('numero debe ser un entero o texto.')
        texto(datos.get('direccion'), 'direccion', 30)
    if datos.get('modo') == 'educativo':
        if ruta == '/calcular' and max(datos['m'], datos['n']) > 6: raise ValueError('El modo educativo admite dimensiones hasta 6.')
        if ruta == '/api/matrices':
            tamano = max(len(datos['A']), len(datos['A'][0]))
            if datos['operacion'] in ('suma', 'resta', 'multiplicacion'):
                tamano = max(tamano, len(datos['B']), len(datos['B'][0]))
            if tamano > 6: raise ValueError('El modo educativo admite dimensiones hasta 6.')
    if 'modo' in datos and datos['modo'] not in ('auto', 'educativo', 'rapido'):
        raise ValueError('El modo debe ser auto, educativo o rapido.')
