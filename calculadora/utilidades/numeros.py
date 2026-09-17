# UTILIDADES DE REPRESENTACIÓN POSICIONAL
# Se usan desde metodos/conversiones.py. En base b cada dígito representa su
# valor multiplicado por b elevado a la posición. A la izquierda del separador
# los exponentes son 0,1,2,...; a la derecha son -1,-2,...
# Ejemplo: 10.1 en base 2 = 1*2^1 + 0*2^0 + 1*2^-1 = 2.5 en decimal.
# DIGITOS permite convertir valor<->símbolo: DIGITOS[10]='A'; index('A')=10.
# BASES enumera las bases admitidas; MAX_DIGITOS limita la longitud de la entrada,
# no el tamaño del resultado. Un hexadecimal de 64 dígitos puede dar más de 64
# caracteres al representarse en decimal.
DIGITOS = '0123456789ABCDEF'
BASES = (2, 8, 10, 16)
MAX_DIGITOS = 64


# validar_numero(numero,base) -> (signo, parte_entera, parte_fraccionaria).
# numero debe ser TEXTO para conservar letras hexadecimales, ceros y precisión.
# Ejemplo: ' -a,f ' en base 16 -> (-1,'A','F'). Acepta punto o coma decimal,
# un signo al inicio y dígitos válidos para la base; no acepta prefijos 0x/0b.
# Eleva ValueError con un mensaje para el usuario si encuentra un problema.
# La validación ocurre en servidor incluso si alguien omite el formulario.
def validar_numero(numero, base):
    """Valida cada dígito d con 0 <= d < base y separa signo y partes."""
    # type(base) is int excluye tanto textos como '2' y booleanos como True. Esta
    # comprobación es más estricta que isinstance(base,int). El JS usa Number(base.value)
    # para enviar un entero JSON, no el texto original del select.
    if type(base) is not int or base not in BASES:
        raise ValueError('Seleccioná una base válida: 2, 8, 10 o 16.')
    if not isinstance(numero, str):
        raise ValueError('Ingresá el número como texto.')
    texto = numero.strip().upper()
    if not texto:
        raise ValueError('Ingresá un número antes de convertir.')
    # El signo se separa de la magnitud. Reemplazar coma por punto significa que
    # '1,234' se interpreta como 1.234, nunca como mil doscientos treinta y cuatro.
    # Entradas '.5' y '5.' se permiten; '.' o '+' solas carecen de dígitos y se rechazan.
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
    # Cuenta únicamente dígitos; el signo y el separador no consumen el máximo 64.
    # DIGITOS[:base] da los símbolos válidos: base 2 permite 01; base 8 permite 0..7;
    # base 10 permite 0..9; base 16 añade A..F. Así se rechaza '102' en binario.
    # Esto comprueba pertenencia a la base, no solo que el texto parezca un número.
    if len(entera) + len(fraccionaria) > MAX_DIGITOS:
        raise ValueError(f'Ingresá como máximo {MAX_DIGITOS} dígitos.')
    for digito in entera + fraccionaria:
        if digito not in DIGITOS[:base]:
            raise ValueError(f"El dígito '{digito}' no pertenece a la base {base}. "
                             f'Usá solamente {DIGITOS[:base]}.')
    return signo, entera or '0', fraccionaria


# obtener_valor(entera,fraccionaria,base) -> (numerador,denominador) positivos.
# Recorre todos los dígitos como si no hubiera separador y aplica Horner:
# acumulado = acumulado*base + valor_del_siguiente_dígito.
# Luego divide conceptualmente por base^cantidad_de_dígitos_fraccionarios.
# '25.5' en base 10 se representa como 255/10. No simplifica la fracción ni
# utiliza float: ambos componentes son enteros Python y conservan el valor exacto.
# El signo se maneja fuera, en convertir_numero.
def obtener_valor(entera, fraccionaria, base):
    """Evalúa los dígitos por Horner y devuelve la fracción exacta N/base^k."""
    numerador = 0
    for digito in entera + fraccionaria:
        numerador = numerador * base + DIGITOS.index(digito)
    denominador = base ** len(fraccionaria)
    return numerador, denominador


# combinacion_lineal(entera,fraccionaria,base,signo) -> (expresion,evaluacion).
# Genera dos TEXTOS para explicar la notación posicional, no un sistema de vectores.
# Para '10.1' en base 2 produce términos 1 x 2^(1), 0 x 2^(0), 1 x 2^(-1),
# y sus valores 2, 0, 1/2. Los símbolos x aquí se presentan con el carácter ×.
# Si el número es negativo, envuelve toda la suma con un signo menos.
# Es distinta de verificar_combinacion_lineal, que busca coeficientes de vectores.
def combinacion_lineal(entera, fraccionaria, base, signo):
    """Expresa el valor posicional como suma de coeficientes d_i * base^i."""
    terminos = []
    valores = []
    for indice, digito in enumerate(entera + fraccionaria):
        valor = DIGITOS.index(digito)
        # len(entera)-indice-1 asigna los exponentes. Al atravesar el separador implícito
        # el exponente pasa a ser negativo. En esos casos la evaluación se expresa como
        # fracción valor/base^k para no introducir aproximaciones decimales.
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
