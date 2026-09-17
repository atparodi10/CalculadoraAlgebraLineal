# ENSAMBLAJE DE LA APLICACIÓN
# Este __init__.py se ejecuta al importar el paquete calculadora. Une el servidor
# con las funciones controladoras. Las importaciones con punto son relativas a
# este paquete; no dependen de escribir una ruta absoluta del sistema operativo.
# No se usan decoradores @app.route: las rutas se registran con add_url_rule.
from flask import Flask
from .rutas import index, calcular, api_vectores, api_matrices
from .rutas_conversion import convertir

# Flask(__name__) toma este paquete como referencia para localizar templates/ y
# static/. Por eso ambas carpetas están dentro de calculadora. Flask incorpora
# la ruta /static/<archivo> para servir CSS y JavaScript.
app = Flask(__name__)

# MAPA DE RUTAS Y CLIENTES
# GET  /              -> index: entrega la página HTML completa.
# POST /calcular      -> calcular: main.js envía ecuaciones y dimensiones.
# POST /convertir     -> convertir: conversion.js envía un número y sus bases.
# POST /api/vectores  -> api_vectores: vectores_matrices.js envía la operación.
# POST /api/matrices  -> api_matrices: el mismo JS envía matrices y/o escalar.
# view_func es la función que Flask llamará al recibir esa dirección. methods
# limita los métodos HTTP admitidos: abrir /calcular en la barra del navegador
# hace GET y no equivale al POST que necesita la aplicación.
app.add_url_rule('/', view_func=index)
app.add_url_rule('/calcular', view_func=calcular, methods=['POST'])
app.add_url_rule('/convertir', view_func=convertir, methods=['POST'])

# --- ¡AGREGA ESTAS DOS LÍNEAS QUE FALTABAN! ---
app.add_url_rule('/api/vectores', view_func=api_vectores, methods=['POST'])
app.add_url_rule('/api/matrices', view_func=api_matrices, methods=['POST'])