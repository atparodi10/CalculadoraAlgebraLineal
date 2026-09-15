from ..utilidades.numeros import (
    DIGITOS, validar_numero, obtener_valor, combinacion_lineal,
)

MAX_DECIMALES = 32


def convertir_entero(numero, base):
    """Aplica N = base * cociente + residuo y lee residuos en orden inverso."""
    if numero == 0:
        return '0', [f'0 ÷ {base} = 0; residuo 0.']
    digitos = []
    pasos = []
    while numero > 0:
        cociente = numero // base
        residuo = numero % base
        simbolo = DIGITOS[residuo]
        equivalencia = f' ({simbolo})' if residuo >= 10 else ''
        pasos.append(f'{numero} ÷ {base} = {cociente}; residuo {residuo}{equivalencia}.')
        digitos.append(simbolo)
        numero = cociente
    return ''.join(reversed(digitos)), pasos


def convertir_fraccion(resto, denominador, base):
    """Multiplica la fracción por la base; cada parte entera es el siguiente dígito."""
    digitos = []
    restos = []
    pasos = []
    while resto:
        # Un resto repetido inicia un período; no se pierde precisión usando enteros.
        if resto in restos:
            inicio = restos.index(resto)
            texto = ''.join(digitos[:inicio]) + '(' + ''.join(digitos[inicio:]) + ')'
            return texto, pasos, False, True
        if len(digitos) == MAX_DECIMALES:
            return ''.join(digitos), pasos, True, False
        restos.append(resto)
        producto = resto * base
        digito = producto // denominador
        nuevo_resto = producto % denominador
        pasos.append(f'({resto}/{denominador}) × {base} = {digito} + '
                     f'{nuevo_resto}/{denominador}; dígito {DIGITOS[digito]}.')
        digitos.append(DIGITOS[digito])
        resto = nuevo_resto
    return ''.join(digitos), pasos, False, False


def convertir_numero(numero, base_origen, base_destino):
    """Convierte pasando por el valor posicional exacto, sin conversiones de base integradas."""
    signo, entera, fraccionaria = validar_numero(numero, base_origen)
    if type(base_destino) is not int or base_destino not in (2, 8, 10, 16):
        raise ValueError('Seleccioná una base de destino válida: 2, 8, 10 o 16.')
    if base_origen != 10 and base_destino != 10:
        raise ValueError('Seleccioná una conversión desde decimal o hacia decimal.')
    numerador, denominador = obtener_valor(entera, fraccionaria, base_origen)
    expresion, evaluacion = combinacion_lineal(entera, fraccionaria, base_origen, signo)
    entero = numerador // denominador
    resto = numerador % denominador
    resultado_entero, divisiones = convertir_entero(entero, base_destino)
    resultado_fraccion, multiplicaciones, aproximado, periodico = convertir_fraccion(
        resto, denominador, base_destino,
    )
    resultado = resultado_entero
    if resultado_fraccion:
        resultado += '.' + resultado_fraccion
    if signo < 0 and numerador:
        resultado = '-' + resultado
    if aproximado:
        resultado += '…'

    pasos = [
        {'titulo': 'Combinación lineal del número de entrada',
         'lineas': [expresion, '= ' + evaluacion]},
    ]
    if base_origen == 16:
        pasos[0]['lineas'].insert(0, 'Valores hexadecimales: A=10, B=11, C=12, D=13, E=14, F=15.')
    if base_destino == 10:
        pasos[0]['lineas'].append('= ' + resultado + ' (base 10)')
    else:
        pasos.append({'titulo': 'Divisiones sucesivas de la parte entera',
                      'lineas': divisiones + ['Leé los residuos de abajo hacia arriba: ' + resultado_entero + '.']})
        if multiplicaciones:
            pasos.append({'titulo': 'Multiplicaciones sucesivas de la parte fraccionaria',
                          'lineas': multiplicaciones + ['Leé los dígitos en el orden obtenido.']})
    if signo < 0 and numerador:
        pasos.append({'titulo': 'Signo', 'lineas': ['Se convierte la magnitud y se conserva el signo negativo.']})
    aviso = ''
    if periodico:
        aviso = 'Los dígitos entre paréntesis se repiten indefinidamente; el resultado es exacto.'
    elif aproximado:
        aviso = f'Resultado truncado a {MAX_DECIMALES} dígitos fraccionarios; los puntos suspensivos indican que continúa.'
    return {'numero': numero.strip().upper(), 'base_origen': base_origen,
            'base_destino': base_destino, 'resultado': resultado,
            'pasos': pasos, 'aproximado': aproximado, 'periodico': periodico, 'aviso': aviso}
