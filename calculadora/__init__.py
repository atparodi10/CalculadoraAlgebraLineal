# ENSAMBLAJE DE LA APLICACIÓN — Lineal Tanix
# Este __init__.py se ejecuta al importar el paquete calculadora. Une el servidor
# con las funciones controladoras. Las importaciones con punto son relativas a
# este paquete; no dependen de escribir una ruta absoluta del sistema operativo.
from flask import Flask
from .rutas import (
    index, page_ecuaciones, page_conversion, page_vectores, page_matrices,
    calcular, api_vectores, api_matrices
)
from .rutas_conversion import convertir
from .rutas_romanos import page_romanos, api_romanos
from .rutas_raices import page_raices, api_raices, api_evaluar_rango, api_buscar_limites

# Flask(__name__) toma este paquete como referencia para localizar templates/ y
# static/. Por eso ambas carpetas están dentro de calculadora.
app = Flask(__name__)

# =========================================
# RUTAS DE PÁGINAS
# =========================================
app.add_url_rule('/', view_func=index)
app.add_url_rule('/ecuaciones', view_func=page_ecuaciones, endpoint='page_ecuaciones')
app.add_url_rule('/conversion', view_func=page_conversion, endpoint='page_conversion')
app.add_url_rule('/vectores', view_func=page_vectores, endpoint='page_vectores')
app.add_url_rule('/matrices', view_func=page_matrices, endpoint='page_matrices')
app.add_url_rule('/romanos', view_func=page_romanos, endpoint='page_romanos')
app.add_url_rule('/raices', view_func=page_raices, endpoint='page_raices')

# =========================================
# API ENDPOINTS
# =========================================
app.add_url_rule('/calcular', view_func=calcular, methods=['POST'])
app.add_url_rule('/convertir', view_func=convertir, methods=['POST'])
app.add_url_rule('/api/vectores', view_func=api_vectores, methods=['POST'])
app.add_url_rule('/api/matrices', view_func=api_matrices, methods=['POST'])
app.add_url_rule('/api/romanos', view_func=api_romanos, methods=['POST'])
app.add_url_rule('/api/raices', view_func=api_raices, methods=['POST'])
app.add_url_rule('/api/raices/evaluar', view_func=api_evaluar_rango, methods=['POST'])
app.add_url_rule('/api/raices/buscar-limites', view_func=api_buscar_limites, methods=['POST'])

# Límite de cuerpo antes de leer JSON y errores controlados en todas las APIs.
from flask import jsonify, request, g
import time
from werkzeug.exceptions import HTTPException
from .utilidades.validacion import validar_peticion
app.config['MAX_CONTENT_LENGTH'] = 512 * 1024
@app.before_request
def iniciar_peticion():
    g.inicio = time.perf_counter()
    validar_peticion()

@app.errorhandler(ValueError)
def error_entrada(error):
    return jsonify({'error': str(error)}), 400

@app.errorhandler(HTTPException)
def error_http(error):
    if request.method == 'POST' or request.path.startswith('/api/'):
        return jsonify({'error': 'La petición excede el límite permitido.' if error.code == 413 else 'Petición HTTP inválida.'}), error.code
    return error

@app.errorhandler(Exception)
def error_interno(error):
    app.logger.exception('Fallo inesperado al procesar la petición')
    return jsonify({'error': 'No se pudo completar la operación. Revisa los datos o inténtalo nuevamente.'}), 500

from .utilidades.respuestas import preparar_respuesta
app.after_request(preparar_respuesta)
