from flask import Flask
from .rutas import index, calcular
from .rutas_conversion import convertir

app = Flask(__name__)

app.add_url_rule('/', view_func=index)
app.add_url_rule('/calcular', view_func=calcular, methods=['POST'])

# El módulo numérico comparte la misma aplicación y sus recursos estáticos.
app.add_url_rule('/convertir', view_func=convertir, methods=['POST'])
