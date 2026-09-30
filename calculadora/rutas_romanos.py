# CONTROLADOR DE NÚMEROS ROMANOS — Lineal Tanix
# Frontera entre romanos.js y metodos/romanos.py. Se registra en
# calculadora/__init__.py como POST /api/romanos. No calcula directamente.
from flask import request, jsonify, render_template
from .metodos.romanos import convertir_romano


def page_romanos():
    """Página dedicada al conversor de números romanos."""
    return render_template('romanos.html', active_page='romanos')


def api_romanos():
    """
    Controlador para la conversión bidireccional de números romanos.
    Espera JSON con {numero: texto/entero, direccion: 'romano_a_arabigo' | 'arabigo_a_romano'}.
    Devuelve el resultado con los pasos detallados de la conversión.
    """
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({'error': 'Enviá un objeto JSON con el número y la dirección de conversión.'}), 400
    try:
        resultado = convertir_romano(datos.get('numero'), datos.get('direccion'))
    except ValueError as error:
        return jsonify({'error': str(error)}), 400
    return jsonify(resultado)
