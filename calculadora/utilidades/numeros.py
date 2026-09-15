DIGITOS = '0123456789ABCDEF'
BASES = (2, 8, 10, 16)
MAX_DIGITOS = 64


def validar_numero(numero, base):
    """Valida cada dígito d con 0 <= d < base y separa signo y partes."""
    if type(base) is not int or base not in BASES:
        raise ValueError('Seleccioná una base válida: 2, 8, 10 o 16.')
    if not isinstance(numero, str):
        raise ValueError('Ingresá el número como texto.')
    texto = numero.strip().upper()
    if not texto:
        raise ValueError('Ingresá un número antes de convertir.')
    signo = -1 if texto.startswith('-') else 1
    if texto[0] in '+-':
        texto = texto[1:]
    # La coma también se admite como separador fraccionario, nunca de miles.
    texto = texto.replace(',', '.')
    if texto.count('.') > 1:
        raise ValueError('Usá un solo punto o coma como separador fraccionario.')
    partes = texto.split('.')
    entera = partes[0]
    fraccionaria = partes[1] if len(partes) == 2 else ''
    if not entera and not fraccionaria:
        raise ValueError('El número debe contener al menos un dígito.')
    if len(entera) + len(fraccionaria) > MAX_DIGITOS:
        raise ValueError(f'Ingresá como máximo {MAX_DIGITOS} dígitos.')
    for digito in entera + fraccionaria:
        if digito not in DIGITOS[:base]:
            raise ValueError(f"El dígito '{digito}' no pertenece a la base {base}. "
                             f'Usá solamente {DIGITOS[:base]}.')
    return signo, entera or '0', fraccionaria


def obtener_valor(entera, fraccionaria, base):
    """Evalúa los dígitos por Horner y devuelve la fracción exacta N/base^k."""
    numerador = 0
    for digito in entera + fraccionaria:
        numerador = numerador * base + DIGITOS.index(digito)
    denominador = base ** len(fraccionaria)
    return numerador, denominador


def combinacion_lineal(entera, fraccionaria, base, signo):
    """Expresa el valor posicional como suma de coeficientes d_i * base^i."""
    terminos = []
    valores = []
    for indice, digito in enumerate(entera + fraccionaria):
        valor = DIGITOS.index(digito)
        exponente = len(entera) - indice - 1
        terminos.append(f'{valor} × {base}^({exponente})')
        if exponente >= 0:
            valores.append(str(valor * base ** exponente))
        else:
            valores.append(f'{valor}/{base ** (-exponente)}')
    expresion = ' + '.join(terminos)
    evaluacion = ' + '.join(valores)
    if signo < 0:
        expresion = f'-({expresion})'
        evaluacion = f'-({evaluacion})'
    return expresion, evaluacion
