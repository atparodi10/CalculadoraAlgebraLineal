from flask import Flask
from .rutas import index, calcular

app = Flask(__name__)

app.add_url_rule('/', view_func=index)
app.add_url_rule('/calcular', view_func=calcular, methods=['POST'])
