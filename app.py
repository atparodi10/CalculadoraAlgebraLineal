# GUÍA DE ENTRADA AL PROYECTO
# Esta aplicación web reúne cuatro herramientas: resolver sistemas lineales,
# convertir números entre bases, operar vectores y operar matrices. Su finalidad
# es mostrar tanto el resultado como el procedimiento matemático.
#
# Cómo recorrer el código por primera vez:
# 1. app.py: arranca el servidor.
# 2. calculadora/__init__.py: crea Flask y registra las direcciones o rutas.
# 3. templates/index.html: define los campos, botones y zonas de resultados.
# 4. static/js/: escucha acciones, valida entradas, envía JSON y muestra respuestas.
# 5. rutas.py y rutas_conversion.py: reciben peticiones y eligen la función Python.
# 6. metodos/: realiza los cálculos; utilidades/: comparte tareas pequeñas.
# 7. static/css/style.css: controla apariencia, tamaños y desplazamiento.
#
# Recorrido de una operación:
# El usuario pulsa un botón; JavaScript recoge los campos y hace fetch a una ruta.
# Flask convierte el JSON recibido a datos Python, llama al método matemático y
# responde con jsonify. JavaScript recibe ese JSON y actualiza el HTML existente.
# Los cálculos principales se ejecutan en Python, no en el navegador.
#
# Ejecución local: instalar Flask con `python -m pip install Flask` y ejecutar
# `python app.py` desde esta carpeta. Abrir en el navegador la dirección que
# muestre Flask. No abrir index.html directamente: contiene una plantilla Jinja
# y necesita las rutas del servidor para que funcionen los botones.
# requeriments.txt viene sin dependencias declaradas en la versión recibida.
#
# No hay base de datos, cuentas de usuario ni historial persistente en este código.
# Los campos/resultados viven en la página; las matrices y pasos se calculan por
# petición. Recargar la página reinicia el estado de la interfaz.
#
# Convención de esta documentación: las notas explican el comportamiento actual.
# Las notas de 'Límite actual' señalan casos no cubiertos; no son correcciones.
from calculadora import app

# __name__ vale '__main__' al ejecutar este archivo directamente. Este condicional
# impide arrancar el servidor por accidente cuando otro archivo importa app.py.
# app ya es la instancia Flask creada en calculadora/__init__.py.
if __name__ == '__main__':
    # debug=True facilita el desarrollo: activa el depurador y la recarga automática.
    # Es una configuración de desarrollo local; no define un despliegue de producción.
    app.run(debug=True)
