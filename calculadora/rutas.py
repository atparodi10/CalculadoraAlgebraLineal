# CÓMO LEER ESTE CONTROLADOR
# Una ruta es una dirección del servidor; una API es la interfaz de intercambio
# de datos. Aquí index devuelve HTML y las otras funciones devuelven JSON.
# JSON representa objetos, listas, números y textos que ambos lenguajes entienden:
# JSON.stringify convierte el objeto JS a texto; Flask lo interpreta; jsonify
# convierte la respuesta Python al formato que response.json() leerá en JS.
#
# Las funciones matemáticas no reciben request: reciben listas y números.
# Esta separación permite probar los algoritmos sin usar la pantalla.
# Un HTTP 400 significa que la petición no se pudo aceptar; un HTTP 200 es una
# respuesta procesada, incluso si la conclusión matemática es 'sin solución'.
"""
CONTROLADOR PRINCIPAL (rutas.py)
Este archivo actúa como el puente (API REST) entre la interfaz gráfica (HTML/JS) 
y la lógica matemática de la aplicación (Python). Recibe los datos del usuario, 
los procesa y devuelve los resultados en formato JSON.
"""

from flask import render_template, request, jsonify

# Importaciones de utilidades para procesar textos y verificar resultados
from .utilidades.ecuaciones import parsear_ecuacion
from .utilidades.verificacion import verificar_solucion

# Importaciones de los motores de resolución de sistemas de ecuaciones
from .metodos.gauss import resolver_gauss
from .metodos.gauss_jordan import resolver_gauss_jordan
from .metodos.pivote import resolver_pivote

# Importaciones de los nuevos módulos para Vectores y Matrices
from .metodos.vectores import suma_vectores, resta_vectores, mult_escalar_vector, verificar_combinacion_lineal
from .metodos.operaciones_matrices import suma_matrices, multiplicacion_matrices, mult_escalar_matriz


# index() no recibe argumentos ni procesa formularios.
# render_template busca index.html en templates y evalúa sus expresiones Jinja,
# por ejemplo url_for('static', filename='js/main.js'), antes de enviarlo.
def index():
    """
    Ruta raíz ('/'). 
    Su única función es renderizar y enviar el archivo HTML principal 
    cuando el usuario entra a la página web por primera vez.
    """
    return render_template('index.html')


# calcular(): contrato con main.js.
# Entrada esperada: {"m":2,"n":2,"metodo":"gauss","ecuaciones":["x1+x2=3","x1-x2=1"]}.
# m = cantidad de ecuaciones/filas; n = cantidad de variables/columnas de A.
# A contiene los coeficientes; b contiene los términos independientes. Para el
# ejemplo, A=[[1,1],[1,-1]] y b=[3,1]; la solución es [2,1].
# Salida: pasos matriciales, clasificación, soluciones, explicación y comprobación.
# No guarda la operación en disco ni modifica un estado global.
def calcular():
    """
    Endpoint para resolver Sistemas de Ecuaciones Lineales.
    Recibe un JSON con el tamaño del sistema, el método elegido y las ecuaciones en texto.
    """
    # Límite actual: estas lecturas están fuera del try. No se comprueba que datos
    # sea un objeto, que m/n sean positivos ni que len(ecuaciones)==m. Una petición
    # manual incompleta puede producir un error del servidor en vez de un JSON 400.
    # La interfaz reduce errores comunes, pero no sustituye la validación de la API.
    datos = request.json
    
    # Extraemos filas (m) y columnas (n)
    m, n = int(datos['m']), int(datos['n'])
    # Si no se especifica método, se usa 'gauss' por defecto
    metodo = datos.get('metodo', 'gauss') 
    ecuaciones = datos['ecuaciones']
    
    A, b = [], []
    
    # FASE DE PARSEO: Convierte el texto "2x1 + 3x2 = 5" en arreglos numéricos
    # El try solo cubre el parseo: si una ecuación no se puede separar o convertir,
    # se devuelve el mensaje genérico de formato. No cubre fallos del algoritmo.
    # parsear_ecuacion no es un analizador algebraico completo; revisar sus límites
    # en utilidades/ecuaciones.py antes de ampliar los formatos de entrada.
    try:
        for eq in ecuaciones:
            A_row, b_val = parsear_ecuacion(eq, n)
            A.append(A_row)
            b.append(b_val)
    except Exception as e:
        # Si el usuario metió texto inválido, aborta y devuelve error HTTP 400 (Bad Request)
        return jsonify({"error": "Formato inválido. Asegúrate de incluir el '=' y nombrar las variables como x1, x2"}), 400
        
    # FASE DE RESOLUCIÓN: Llama al algoritmo matemático correcto según lo elegido en el frontend
    # Cada resolver devuelve cinco elementos en el mismo orden. El desempaquetado
    # los separa en variables. matriz_final queda disponible localmente, pero no se
    # incluye como campo independiente en la respuesta: las matrices viajan en pasos.
    # Cualquier metodo distinto de los dos primeros cae en Gauss, incluso un nombre
    # desconocido; aquí no se rechaza explícitamente un método inválido.
    if metodo == 'gauss_jordan':
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_gauss_jordan(A, b, m, n)
    elif metodo == 'pivote':
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_pivote(A, b, m, n)
    else:
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_gauss(A, b, m, n)
        
    # FASE DE VERIFICACIÓN: Si el sistema tuvo solución única, evalúa que sea correcta
    # Los resolutores devuelven [] si no hay una solución única. Una lista no vacía
    # se considera verdadera aunque sus valores sean todos cero. La comprobación
    # sustituye las soluciones en A y b originales; no usa la matriz transformada.
    # Límite actual: recibe soluciones ya redondeadas a 4 decimales, de modo que una
    # solución correcta internamente puede fallar la tolerancia de la comprobación.
    verificacion = verificar_solucion(A, b, soluciones) if soluciones else []

    # Devuelve todos los cálculos empaquetados en un objeto JSON para que JavaScript los pinte
    # pasos: lista de {mensaje, matriz}, para dibujar cada operación por filas.
    # tipo_sistema: texto que distingue solución única, infinitas o ninguna.
    # soluciones: lista ordenada x1, x2, ...; vacía en los otros dos casos.
    # pasos_ecuaciones: lista de textos del procedimiento algebraico.
    # verificacion: lista de {ecuacion, calculado, esperado, valido}.
    # main.js renderResults depende de estos nombres exactos.
    return jsonify({
        "pasos": pasos,
        "tipo_sistema": tipo,
        "soluciones": soluciones,
        "pasos_ecuaciones": pasos_ecuaciones,
        "verificacion": verificacion
    })


# api_vectores(): recibe el JSON construido por los cuatro botones de vectores.
# Operación suma/resta: necesita u y v. Operación escalar: necesita c y u.
# Operación combinacion: necesita vectores_v (un vector por lista) y vector_b.
# get(clave, []) da un valor por defecto para que el validador detecte vacíos.
# Límite actual: request.json y datos.get presuponen un objeto JSON válido.
def api_vectores():
    """
    Endpoint para el módulo de Vectores en R^n y Combinación Lineal.
    Recibe la operación solicitada, extrae los datos y retorna un JSON con la respuesta o error.
    """
    datos = request.json
    operacion = datos.get('operacion')
    
    # Estructura de control tipo Switch para direccionar la operación de vectores
    # Las operaciones básicas devuelven (resultado, pasos, error). error es None
    # cuando el cálculo funciona. Los if/elif hacen la selección; no es un switch
    # literal de Python aunque el comentario original use esa analogía.
    if operacion == 'suma':
        res, pasos, err = suma_vectores(datos.get('u', []), datos.get('v', []))
    elif operacion == 'resta':
        res, pasos, err = resta_vectores(datos.get('u', []), datos.get('v', []))
    elif operacion == 'escalar':
        res, pasos, err = mult_escalar_vector(datos.get('c'), datos.get('u', []))
    elif operacion == 'combinacion':
        # Llamada al motor especializado de combinación lineal
        es_comb, msg, pasos_matriz, pasos_ecuaciones, sols = verificar_combinacion_lineal(
            datos.get('vectores_v', []), datos.get('vector_b', [])
        )
        # None significa entrada inválida y genera HTTP 400. False significa una entrada
        # válida cuyo vector b NO se puede generar: es una respuesta matemática normal.
        # sols contiene coeficientes si son únicos, pero esta ruta no los envía como campo
        # separado; el desarrollo de Gauss-Jordan los muestra en pasos_ecuaciones.
        if es_comb is None: 
            return jsonify({"error": msg}), 400
            
        return jsonify({
            "mensaje": msg, 
            "pasos": pasos_matriz,          # Matrices paso a paso de Gauss-Jordan
            "pasos_ecuaciones": pasos_ecuaciones # Desglose algebraico paso a paso
        })
    else:
        return jsonify({"error": "Operación no soportada"}), 400

    # Verificación de errores devueltos por las funciones de validación básica
    if err:
        return jsonify({"error": err}), 400
        
    # En operaciones básicas se extrae solo p['mensaje'] de cada paso. El cliente
    # recibe resultado y pasos_ecuaciones, sin la propiedad pasos. Esa diferencia
    # hace que fetchOperacion dibuje un vector final como una matriz de una fila.
    return jsonify({
        "resultado": res,
        "pasos_ecuaciones": [p["mensaje"] for p in pasos] # Textos descriptivos paso a paso
    })


# api_matrices(): contrato con los botones del módulo matricial.
# Suma/multiplicacion reciben A y B como listas de filas: [[1,2],[3,4]].
# Escalar recibe A y c. Cada método devuelve (resultado, pasos, pasos_eq, error).
# Las dimensiones se calculan desde las listas; el formulario no envía m ni n.
# La compatibilidad matemática se comprueba en operaciones_matrices.py.
def api_matrices():
    """
    Endpoint para el módulo de Operaciones Matriciales. 
    Recibe la operación y matrices mediante JSON, invoca los algoritmos y 
    empaqueta tanto las matrices visuales como las ecuaciones detalladas.
    """
    # Extracción de la carga JSON enviada por el frontend
    datos = request.json
    operacion = datos.get('operacion')
    
    # Estructura de control tipo Switch para direccionar la operación matricial
    if operacion == 'suma':
        res, pasos, pasos_eq, err = suma_matrices(datos.get('A', []), datos.get('B', []))
    elif operacion == 'multiplicacion':
        res, pasos, pasos_eq, err = multiplicacion_matrices(datos.get('A', []), datos.get('B', []))
    elif operacion == 'escalar':
        res, pasos, pasos_eq, err = mult_escalar_matriz(datos.get('c'), datos.get('A', []))
    else:
        return jsonify({"error": "Operación no soportada"}), 400

    # Si se detectó un error matemático o de formato, se retorna un código HTTP 400 con el mensaje
    if err:
        return jsonify({"error": err}), 400
        
    # Empaquetado final de la respuesta incluyendo los pasos matriciales y las ecuaciones
    # La respuesta incluye pasos para las matrices iniciales y la matriz final.
    # El JS usa esos pasos para mostrar el resultado, evitando dibujarlo dos veces.
    # Aquí tampoco se captura una excepción inesperada de las funciones matemáticas;
    # el contrato exige entradas con la estructura prevista.
    return jsonify({
        "resultado": res,
        "pasos": pasos,               # Evolución visual de las matrices (Paso 0, 1, 2...)
        "pasos_ecuaciones": pasos_eq  # Desglose de fórmulas algebraicas a la vista del usuario
    })