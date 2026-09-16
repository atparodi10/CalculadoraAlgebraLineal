from flask import Flask
from .rutas import index, calcular, api_vectores, api_matrices
from .rutas_conversion import convertir

app = Flask(__name__)

app.add_url_rule('/', view_func=index)
app.add_url_rule('/calcular', view_func=calcular, methods=['POST'])
app.add_url_rule('/convertir', view_func=convertir, methods=['POST'])

# --- ¡AGREGA ESTAS DOS LÍNEAS QUE FALTABAN! ---
app.add_url_rule('/api/vectores', view_func=api_vectores, methods=['POST'])
app.add_url_rule('/api/matrices', view_func=api_matrices, methods=['POST'])