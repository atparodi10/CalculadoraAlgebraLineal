# CONVERSIÓN DE BASES CON DESARROLLO PASO A PASO
# Flujo: validar texto -> obtener fracción exacta -> convertir parte entera y
# fraccionaria -> ensamblar signo, resultado y explicaciones.
# Se admiten bases 2,8,10,16, pero al menos una de las dos debe ser 10. Por ejemplo,
# 10->2 y 16->10 sí; 2->16 directamente no. También se admite 10->10.
# MAX_DECIMALES limita la cantidad de dígitos FRACCIONARIOS de salida a 32;
# no limita la parte entera ni equivale al máximo de 64 dígitos de entrada.
# Los cálculos se hacen con enteros; no se usan int(texto,base), bin, oct ni hex
# para resolver automáticamente la conversión.
from ..utilidades.numeros import (
    DIGITOS, validar_numero, obtener_valor, combinacion_lineal,
)

MAX_DECIMALES = 32


# convertir_entero(numero,base) -> (texto_convertido,lista_de_pasos).
# Espera magnitud entera no negativa y base válida; convertir_numero prepara eso.
# Divide sucesivamente por la base. // calcula el cociente entero y % el residuo.
# Los residuos se obtienen del dígito menos significativo al más significativo,
# por eso reversed los lee al revés. Ejemplo: 13->base 2 deja residuos 1,0,1,1;
# al invertirlos se obtiene '1101'. Si numero=0 retorna '0' y un paso explicativo.
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


# convertir_fraccion(resto,denominador,base) devuelve cuatro valores:
# (texto_fraccionario,pasos,aproximado,periodico). Se espera 0<=resto<denominador.
# Multiplica resto/denominador por la base. La parte entera es el próximo dígito;
# el nuevo resto permite continuar. Se conservan enteros para detectar repeticiones
# exactas, sin confundirlas con errores de coma flotante.
# Ejemplo: 1/2 en base 2 produce '1'; 1/10 en base 2 produce '0(0011)'.
def convertir_fraccion(resto, denominador, base):
    """Multiplica la fracción por la base; cada parte entera es el siguiente dígito."""
    digitos = []
    restos = []
    pasos = []
    # Tres formas de terminar:
    # 1. resto=0: expansión finita y exacta; ambas banderas son False.
    # 2. Se repite un resto: desde su primera posición empieza un período, que se
    #    encierra entre paréntesis; periodico=True y aproximado=False.
    # 3. Se alcanzan 32 dígitos sin terminar ni detectar período: aproximado=True;
    #    la salida se TRUNCA, no se redondea. convertir_numero añadirá '…'.
    # Se comprueba repetición antes del límite, por lo que un período que se detecta
    # justo en ese punto todavía se representa como exacto.
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


# convertir_numero(numero,base_origen,base_destino) es la función pública del módulo.
# Valida ambas bases y el formato; devuelve un diccionario listo para jsonify.
# Ejemplo: ('25.5',10,2) -> resultado '11001.1', aproximado=False, periodico=False.
# Los campos numero/base_origen/base_destino permiten a JS mostrar la equivalencia;
# pasos es una lista de {titulo,lineas}; aviso explica períodos o truncamiento.
# Aquí pasos NO tiene la estructura {mensaje,matriz} de los sistemas: conversion.js
# usa un renderizador propio, mostrarResultado, para este contrato.
def convertir_numero(numero, base_origen, base_destino):
    """Convierte pasando por el valor posicional exacto, sin conversiones de base integradas."""
    signo, entera, fraccionaria = validar_numero(numero, base_origen)
    if type(base_destino) is not int or base_destino not in (2, 8, 10, 16):
        raise ValueError('Seleccioná una base de destino válida: 2, 8, 10 o 16.')
    if base_origen != 10 and base_destino != 10:
        raise ValueError('Seleccioná una conversión desde decimal o hacia decimal.')
    # Divide la fracción exacta en entero y resto. Ambos se convierten por separado
    # a la base de destino. El desarrollo posicional describe la entrada, mientras
    # que divisiones y multiplicaciones describen cómo construir la salida.
    numerador, denominador = obtener_valor(entera, fraccionaria, base_origen)
    expresion, evaluacion = combinacion_lineal(entera, fraccionaria, base_origen, signo)
    entero = numerador // denominador
    resto = numerador % denominador
    resultado_entero, divisiones = convertir_entero(entero, base_destino)
    resultado_fraccion, multiplicaciones, aproximado, periodico = convertir_fraccion(
        resto, denominador, base_destino,
    )
    # Ensambla texto: parte entera, punto si hay fracción y signo si la magnitud no
    # es cero. Así evita mostrar '-0'. Los paréntesis del período ya vienen de la
    # función anterior; los puntos suspensivos solo se agregan si hubo truncamiento.
    resultado = resultado_entero
    if resultado_fraccion:
        resultado += '.' + resultado_fraccion
    if signo < 0 and numerador:
        resultado = '-' + resultado
    if aproximado:
        resultado += '…'

    # Prepara la explicación visual. Hacia decimal basta el desarrollo posicional;
    # hacia otras bases añade divisiones enteras y, si existen, multiplicaciones
    # fraccionarias. A..F se explican cuando el origen es hexadecimal.
    # numero en la respuesta conserva el texto sin espacios de extremos y en
    # mayúsculas; el resultado usa punto, aunque la entrada haya usado coma.
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
    
