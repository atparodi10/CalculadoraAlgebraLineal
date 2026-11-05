"""Rechaza resultados no finitos y procedimientos excesivos sin ocultar pasos."""
import json
from flask import jsonify


def preparar_respuesta(response):
    if response.is_json:
        try:
            contenido = json.dumps(response.get_json(), ensure_ascii=False, allow_nan=False)
            error = 'El procedimiento supera 2 MiB. Reduce el tamaño o complejidad de la entrada.' if len(contenido.encode('utf-8')) > 2*1024*1024 else None
        except (ValueError, OverflowError):
            error = 'El cálculo excede el rango numérico representable.'
        if error:
            response = jsonify({'error': error})
            response.status_code = 400
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response
