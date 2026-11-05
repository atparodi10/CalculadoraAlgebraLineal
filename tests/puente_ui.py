"""Puente de pruebas DOM: recibe JSON por stdin y utiliza Flask test_client."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from calculadora import app

peticion=json.load(sys.stdin)
with app.test_client() as cliente:
    if peticion.get('method') == 'GET':
        respuesta=cliente.get(peticion['url'])
    else:
        respuesta=cliente.post(peticion['url'],json=peticion.get('datos'))
    print(json.dumps({'status':respuesta.status_code,'body':respuesta.get_json() if respuesta.is_json else respuesta.text},ensure_ascii=False))
