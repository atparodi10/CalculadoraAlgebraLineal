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

# =========================================
# API ENDPOINTS
# =========================================
app.add_url_rule('/calcular', view_func=calcular, methods=['POST'])
app.add_url_rule('/convertir', view_func=convertir, methods=['POST'])
app.add_url_rule('/api/vectores', view_func=api_vectores, methods=['POST'])
app.add_url_rule('/api/matrices', view_func=api_matrices, methods=['POST'])