from flask import render_template, request, jsonify
from .utilidades.ecuaciones import parsear_ecuacion
from .utilidades.verificacion import verificar_solucion
from .metodos.gauss import resolver_gauss
from .metodos.gauss_jordan import resolver_gauss_jordan
from .metodos.pivote import resolver_pivote

def index():
    return render_template('index.html')


def calcular():
    datos = request.json
    m, n = int(datos['m']), int(datos['n'])
    metodo = datos.get('metodo', 'gauss') 
    ecuaciones = datos['ecuaciones']
    
    A, b = [], []
    try:
        for eq in ecuaciones:
            A_row, b_val = parsear_ecuacion(eq, n)
            A.append(A_row)
            b.append(b_val)
    except Exception as e:
        return jsonify({"error": "Formato inválido. Asegúrate de incluir el '=' y nombrar las variables como x1, x2"}), 400
        
    if metodo == 'gauss_jordan':
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_gauss_jordan(A, b, m, n)
    elif metodo == 'pivote':
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_pivote(A, b, m, n)
    else:
        matriz_final, pasos, tipo, soluciones, pasos_ecuaciones = resolver_gauss(A, b, m, n)
        
    verificacion = verificar_solucion(A, b, soluciones) if soluciones else []

    return jsonify({
        "pasos": pasos,
        "tipo_sistema": tipo,
        "soluciones": soluciones,
        "pasos_ecuaciones": pasos_ecuaciones,
        "verificacion": verificacion
    })

