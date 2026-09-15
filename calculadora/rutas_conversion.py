from flask import request, jsonify
from .metodos.conversiones import convertir_numero


def convertir():
    """Valida la petición y entrega el resultado y su desarrollo posicional."""
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({'error': 'Enviá un objeto JSON con el número y sus bases.'}), 400
    try:
        resultado = convertir_numero(datos.get('numero'), datos.get('base_origen'),
                                     datos.get('base_destino'))
    except ValueError as error:
        return jsonify({'error': str(error)}), 400
    return jsonify(resultado)
