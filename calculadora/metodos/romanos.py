# CONVERSOR DE NÚMEROS ROMANOS — Lineal Tanix
# Implementa la conversión bidireccional entre números romanos y arábigos.
# No usa librerías externas: toda la lógica es manual con estructuras de Python.
# El rango válido para romanos es 1–3999 (limitación histórica del sistema romano).


# Mapa ordenado de valores romanos de mayor a menor, incluyendo formas sustractivas.
# Se usa para ambas direcciones de conversión.
VALORES_ROMANOS = [
    (1000, 'M'), (900, 'CM'), (500, 'D'), (400, 'CD'),
    (100, 'C'), (90, 'XC'), (50, 'L'), (40, 'XL'),
    (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'),
    (1, 'I')
]

# Mapa inverso para decodificar símbolos individuales al parsear cadenas romanas.
SIMBOLO_A_VALOR = {
    'I': 1, 'V': 5, 'X': 10, 'L': 50,
    'C': 100, 'D': 500, 'M': 1000
}


def arabigo_a_romano(numero):
    """
    Convierte un número arábigo (entero entre 1 y 3999) a su representación romana.
    Algoritmo: resta sucesivamente el mayor valor romano posible del número,
    acumulando los símbolos correspondientes. Genera un desglose paso a paso.
    """
    if not isinstance(numero, int) or numero < 1 or numero > 3999:
        raise ValueError("El número arábigo debe ser un entero entre 1 y 3999.")

    pasos = []
    resultado = ''
    restante = numero

    pasos.append(f"Número original: {numero}")
    pasos.append("Proceso: Se resta sucesivamente el mayor valor romano posible.")

    for valor, simbolo in VALORES_ROMANOS:
        while restante >= valor:
            resultado += simbolo
            restante -= valor
            pasos.append(f"  {simbolo} ({valor}) → Restante: {restante}, Acumulado: '{resultado}'")

    pasos.append(f"Resultado final: {numero} → {resultado}")

    return {
        'resultado': resultado,
        'numero_original': numero,
        'direccion': 'Arábigo → Romano',
        'pasos': [{
            'titulo': f'Conversión de {numero} a Romano',
            'lineas': pasos
        }]
    }


def romano_a_arabigo(texto_romano):
    """
    Convierte una cadena de números romanos a su equivalente arábigo (entero).
    Algoritmo: recorre la cadena de izquierda a derecha. Si el valor del símbolo
    actual es menor que el siguiente, se resta (notación sustractiva: IV=4, IX=9).
    En caso contrario, se suma. Valida que la cadena contenga solo símbolos válidos.
    """
    texto = texto_romano.strip().upper()

    if not texto:
        raise ValueError("La cadena romana no puede estar vacía.")

    # Validar que solo contenga símbolos romanos válidos
    for caracter in texto:
        if caracter not in SIMBOLO_A_VALOR:
            raise ValueError(f"Carácter inválido '{caracter}'. Solo se permiten: I, V, X, L, C, D, M.")

    pasos = []
    total = 0

    pasos.append(f"Cadena romana: {texto}")
    pasos.append("Proceso: Se recorre de izquierda a derecha. Si un valor es menor que el siguiente, se resta.")

    for i in range(len(texto)):
        valor_actual = SIMBOLO_A_VALOR[texto[i]]

        if i + 1 < len(texto):
            valor_siguiente = SIMBOLO_A_VALOR[texto[i + 1]]
        else:
            valor_siguiente = 0

        if valor_actual < valor_siguiente:
            total -= valor_actual
            pasos.append(f"  '{texto[i]}' ({valor_actual}) < '{texto[i+1]}' ({valor_siguiente}) → RESTA → Total parcial: {total}")
        else:
            total += valor_actual
            detalle_sig = f" (último símbolo)" if i + 1 >= len(texto) else f" >= '{texto[i+1]}' ({valor_siguiente})"
            pasos.append(f"  '{texto[i]}' ({valor_actual}){detalle_sig} → SUMA → Total parcial: {total}")

    if total < 1 or total > 3999:
        raise ValueError(f"El resultado ({total}) está fuera del rango válido (1–3999).")

    # Verificación de validez: reconvertir el resultado a romano debe dar la misma cadena
    reconversion = arabigo_a_romano(total)['resultado']
    if reconversion != texto:
        raise ValueError(f"'{texto}' no es una forma romana válida. La forma correcta de {total} es '{reconversion}'.")

    pasos.append(f"Resultado final: {texto} → {total}")

    return {
        'resultado': total,
        'numero_original': texto,
        'direccion': 'Romano → Arábigo',
        'pasos': [{
            'titulo': f'Conversión de {texto} a Arábigo',
            'lineas': pasos
        }]
    }


def convertir_romano(numero, direccion):
    """
    Función puente que invoca la conversión correspondiente según la dirección.
    Es llamada por rutas_romanos.py para despachar la solicitud del frontend.
    """
    if direccion == 'romano_a_arabigo':
        if not isinstance(numero, str):
            raise ValueError("Para convertir de Romano a Arábigo, envía una cadena de texto.")
        return romano_a_arabigo(numero)
    elif direccion == 'arabigo_a_romano':
        # Intentar convertir a entero si llega como cadena numérica
        if isinstance(numero, str):
            try:
                numero = int(numero)
            except (ValueError, TypeError):
                raise ValueError("Para convertir de Arábigo a Romano, envía un número entero válido.")
        if not isinstance(numero, int):
            # Podría llegar como float desde el JSON
            if isinstance(numero, float) and numero == int(numero):
                numero = int(numero)
            else:
                raise ValueError("Para convertir de Arábigo a Romano, envía un número entero válido.")
        return arabigo_a_romano(numero)
    else:
        raise ValueError("Dirección inválida. Usa 'romano_a_arabigo' o 'arabigo_a_romano'.")
