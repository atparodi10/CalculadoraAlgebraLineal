"""Arranque local de Lineal Tanix. Instala requirements.txt antes de ejecutarlo."""
import os
from calculadora import app

if __name__ == '__main__':
    # El depurador se activa solo cuando el desarrollador lo solicita.
    app.run(debug=os.environ.get('FLASK_DEBUG') == '1')
