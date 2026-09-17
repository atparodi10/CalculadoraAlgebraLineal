# CONTROLADOR DE CONVERSIÓN
# Es la frontera entre conversion.js y metodos/conversiones.py. Se registra en
# calculadora/__init__.py como POST /convertir. No calcula bases directamente.
from flask import request, jsonify
from .metodos.conversiones import convertir_numero


# convertir(): espera {numero: texto, base_origen: entero, base_destino: entero}.
# Ejemplo JSON: {"numero":"25.5","base_origen":10,"base_destino":2}.
# Devuelve resultado='11001.1' y las explicaciones construidas por convertir_numero.
# El nombre coincide con una función JS, pero son funciones distintas: se enlazan
# mediante HTTP /convertir, no mediante una llamada directa entre lenguajes.
def convertir():
    """Valida la petición y entrega el resultado y su desarrollo posicional."""
    # silent=True evita propagar el error de lectura del JSON y permite comprobar
    # su tipo explícitamente. Rechaza, por ejemplo, una lista o un cuerpo vacío.
    # El try transforma los ValueError de validación en mensajes HTTP 400 legibles.
    # No captura cualquier excepción: los fallos inesperados siguen siendo errores.
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({'error': 'Enviá un objeto JSON con el número y sus bases.'}), 400
    try:
        resultado = convertir_numero(datos.get('numero'), datos.get('base_origen'),
                                     datos.get('base_destino'))
    except ValueError as error:
        return jsonify({'error': str(error)}), 400
    return jsonify(resultado)
