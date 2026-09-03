from flask import Flask, render_template, request, jsonify
from matematicas import parsear_ecuacion, resolver_gauss, resolver_gauss_jordan, verificar_solucion

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calcular', methods=['POST'])
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

if __name__ == '__main__':
    app.run(debug=True)