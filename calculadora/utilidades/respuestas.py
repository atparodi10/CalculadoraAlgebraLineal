"""Metadatos y límites de las respuestas, separados del ensamblaje Flask."""
import time
from flask import jsonify, request, g

def preparar_respuesta(response):
    import json
    if response.is_json:
        if response.status_code < 400 and request.path in ('/api/matrices', '/calcular', '/api/vectores') and not (request.get_json(silent=True) or {}).get('solo_recomendacion'):
            datos = request.get_json(silent=True) or {}
            if request.path == '/api/matrices':
                A = datos.get('A', [])
                tamano = max(len(A), len(A[0]) if A else 0)
                if datos.get('operacion') in ('suma', 'resta', 'multiplicacion'):
                    B = datos['B']
                    tamano = max(tamano, len(B), len(B[0]))
            else:
                tamano = max(datos.get('m', 1), datos.get('n', 1), len(datos.get('vector_b', [])), len(datos.get('vectores_v', [])))
            # El modo ya se validó en la entrada; no se generan excepciones al cerrar.
            educativo = datos.get('modo') != 'rapido' and tamano <= 6
            cuerpo = response.get_json()
            cuerpo['modo'] = 'educativo' if educativo else 'rapido'
            cuerpo['tiempo_s'] = time.perf_counter() - g.inicio
            cuerpo['metodo_utilizado'] = datos.get('metodo', datos.get('operacion', 'gauss'))
            if cuerpo['metodo_utilizado'] == 'auto' and 'recomendacion' in cuerpo:
                cuerpo['metodo_utilizado'] = cuerpo['recomendacion']['metodo_recomendado']
            if not educativo:
                parametricas = []
                if 'Indeterminado' in cuerpo.get('tipo_sistema', ''):
                    eq = cuerpo.get('pasos_ecuaciones', [])
                    indice = next((i for i, texto in enumerate(eq) if texto.startswith('Solución paramétrica:')), len(eq))
                    parametricas = eq[indice:]
                    cuerpo['solucion_parametrica'] = parametricas
                cuerpo['pasos'] = []
                cuerpo['pasos_ecuaciones'] = ['Modo rápido: se omiten los estados intermedios para limitar memoria.',
                                              f"Método: {cuerpo['metodo_utilizado']}; tiempo: {cuerpo['tiempo_s']:.6f} s."] + parametricas
                if 'verificacion' in cuerpo:
                    cuerpo['comprobacion'] = cuerpo['verificacion']
                elif 'verificacion_visual' in cuerpo:
                    cuerpo['comprobacion'] = {k: cuerpo['verificacion_visual'].get(k) for k in ('verificacion_ok', 'residuo_maximo', 'condicion_estimada', 'advertencia')}
                elif datos.get('operacion') == 'determinante':
                    from ..metodos.lu_rapido import factorizar
                    det_ref, _, _, _, _, residuo = factorizar(datos['A'])
                    cuerpo['comprobacion'] = {'determinante_lu': det_ref, 'residuo_factorizacion': residuo,
                                             'verificacion_ok': abs(cuerpo['resultado']-det_ref) <= 1e-8*max(abs(det_ref), 1e-300)}
                elif 'resultado' in cuerpo:
                    from .comprobaciones import comprobar_operacion
                    cuerpo['comprobacion'] = comprobar_operacion(datos, cuerpo['resultado'])
            response.set_data(json.dumps(cuerpo, ensure_ascii=False))
        try:
            contenido = json.dumps(response.get_json(), ensure_ascii=False, allow_nan=False)
        except (ValueError, OverflowError):
            respuesta = jsonify({'error': 'El cálculo excede el rango numérico representable.'}); respuesta.status_code = 400; return respuesta
        if len(contenido.encode('utf-8')) > 2 * 1024 * 1024:
            respuesta = jsonify({'error': 'El procedimiento supera 2 MiB. Selecciona modo rápido.'}); respuesta.status_code = 400; return respuesta
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response
