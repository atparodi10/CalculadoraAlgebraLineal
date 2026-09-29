from calculadora.utilidades.numeros import (
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
    """Convierte entre cualquier base (2, 8, 10, 16) usando Base 10 como pivote matemático."""
    
    # 1. Validar las bases
    if type(base_origen) is not int or base_origen not in (2, 8, 10, 16):
        raise ValueError('Base de origen inválida. Usa 2, 8, 10 o 16.')
    if type(base_destino) is not int or base_destino not in (2, 8, 10, 16):
        raise ValueError('Base de destino inválida. Usa 2, 8, 10 o 16.')
    if base_origen == base_destino:
        raise ValueError('La base de origen y de destino no pueden ser iguales.')

    # 2. Validar sintaxis y preparar (Acepta A-F gracias a base_origen)
    signo, entera, fraccionaria = validar_numero(numero.strip().upper(), base_origen)
    
    # 3. Transformación a DECIMAL (El Puente)
    numerador, denominador = obtener_valor(entera, fraccionaria, base_origen)
    expresion, evaluacion = combinacion_lineal(entera, fraccionaria, base_origen, signo)
    
    entero = numerador // denominador
    resto = numerador % denominador
    
    # 4. Transformación de DECIMAL a DESTINO
    resultado_entero, divisiones = convertir_entero(entero, base_destino)
    resultado_fraccion, multiplicaciones, aproximado, periodico = convertir_fraccion(resto, denominador, base_destino)
    
    # Ensamblar texto final
    resultado = resultado_entero
    if resultado_fraccion:
        resultado += '.' + resultado_fraccion
    if signo < 0 and numerador:
        resultado = '-' + resultado
    if aproximado:
        resultado += '…'

    # 5. Generar Explicación (Pasos Visuales)
    pasos = []
    
    # Paso A: Mostrar la Combinación Lineal (Origen -> Decimal)
    if base_origen != 10:
        titulo_p1 = f'Paso 1: Convertir de Base {base_origen} a Base 10 (Combinación Lineal)'
        lineas_p1 = [expresion, '= ' + evaluacion]
        
        if base_origen == 16:
            lineas_p1.insert(0, 'Valores hexadecimales: A=10, B=11, C=12, D=13, E=14, F=15.')
        if base_destino == 10:
            lineas_p1.append(f'= {resultado} (Resultado Final en Base 10)')
            
        pasos.append({'titulo': titulo_p1, 'lineas': lineas_p1})

    # Paso B: Mostrar Divisiones Sucesivas (Decimal -> Destino)
    if base_destino != 10:
        prefijo = "Paso 2: " if base_origen != 10 else ""
        pasos.append({
            'titulo': f'{prefijo}Convertir parte entera a Base {base_destino} (Divisiones Sucesivas)',
            'lineas': divisiones + [f'Leé los residuos de abajo hacia arriba: {resultado_entero}.']
        })
        if multiplicaciones:
            pasos.append({
                'titulo': f'{prefijo}Convertir parte fraccionaria a Base {base_destino}',
                'lineas': multiplicaciones + ['Leé los dígitos en el orden obtenido.']
            })
            
    if signo < 0 and numerador:
        pasos.append({'titulo': 'Signo', 'lineas': ['Se convierte la magnitud y se conserva el signo negativo.']})
        
    aviso = ''
    if periodico:
        aviso = 'Los dígitos entre paréntesis se repiten indefinidamente; el resultado es exacto.'
    elif aproximado:
        aviso = f'Resultado truncado a {MAX_DECIMALES} dígitos fraccionarios; los puntos suspensivos indican que continúa.'
        
    return {
        'numero': numero.strip().upper(), 
        'base_origen': base_origen,
        'base_destino': base_destino, 
        'resultado': resultado,
        'pasos': pasos, 
        'aproximado': aproximado, 
        'periodico': periodico, 
        'aviso': aviso
    }