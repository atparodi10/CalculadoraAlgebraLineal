# Lineal Tanix

Calculadora educativa de álgebra lineal y métodos numéricos con Flask, HTML, CSS y JavaScript nativo. Conserva los procedimientos, visualizaciones y temas claro/oscuro del proyecto.

## Instalación y ejecución

Se requiere Python 3.10 o posterior.

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux / macOS:
# source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

Abrir http://127.0.0.1:5000. El archivo histórico `requeriments.txt` también instala las mismas dependencias. El depurador está desactivado por defecto; puede activarse expresamente con `FLASK_DEBUG=1`. Para un servicio público se debe usar un servidor WSGI apropiado.

## Módulos

| Página | Operaciones |
| --- | --- |
| `/ecuaciones` | Gauss, Gauss-Jordan y pivoteo en dos fases; clasificación y parametrización |
| `/matrices` | Suma, resta, escalar, producto, inversa `[A | I]`, determinantes por cofactores, Sarrus y LU |
| `/vectores` | Suma, resta, escalar y combinación lineal |
| `/conversion` | Bases 2, 8, 10 y 16, incluidos signos y fracciones |
| `/romanos` | Conversión bidireccional entre 1 y 3999 |
| `/raices` | Bisección, Regla Falsa, Newton-Raphson, Secante y comparación |

## Formatos de entrada

**Raíces.** El mismo parser se utiliza para calcular, graficar y buscar intervalos. Admite `x`, `X`, `pi`, `π`, `e`, `sin`, `cos`, `tan`, `sqrt`, `ln`, `log` (base 10), `exp`, `abs`, `+ - * / ^ **` y ecuaciones con una igualdad. Las funciones requieren paréntesis. La trigonometría usa radianes.

Ejemplos: `2x (2)(x+1)`, `(x+1)2`, `3sin(x)`, `x^2=2`. La precedencia es `-x^2=-(x^2)` y `2^3^2=2^(3^2)`. También se admite notación científica como `1e-3*x`. Los identificadores desconocidos, accesos a atributos y código se rechazan. Dos números separados necesitan un operador: `1 2` no es una expresión válida.

**Sistemas.** Usar variables `x1`…`xn`, coeficientes decimales o científicos y términos constantes a ambos lados: `x1+x1=2`, `2x1+3=5-x1`, `-.5x1+2x2=-1.25`. Se acumulan los coeficientes repetidos. No se admiten productos de variables, potencias, fracciones escritas como `1/2` ni paréntesis en el parser lineal: usar `0.5x1`.

**Matrices.** Una fila por línea, valores separados por espacios o comas. Las filas deben tener la misma longitud. **Bases:** el número se envía como texto; no usar prefijos `0x` o separadores de miles.

## Convergencia y precisión

El error solicitado es el **error aproximado relativo porcentual**, `Ea=|x_n-x_(n-1)|/|x_n|*100`. La primera iteración puede tener Ea indefinido; si la aproximación es cero se informa el error absoluto. Se exige además un residuo pequeño: `|f(x)| <= 1e-8 * min(1, escala inicial de f)`, o una raíz exactamente nula. Las raíces iniciales se detectan antes de dividir. Alcanzar el límite de iteraciones, salir del dominio o estancarse nunca se presenta como convergencia.

La opción 4/6/8/10 decimales modifica los valores estructurados visibles en resultados, matrices y tablas; conserva los floats internos, el historial y las tolerancias. Los valores muy pequeños usan notación científica. Los textos algebraicos compactos mantienen su propio formato explicativo.

Las funciones de producción usan `math` de Python. Las versiones manuales originales se conservan, con mejoras y límites, en `raices_educativas.py`, exclusivamente como referencia académica: sus series no sustituyen al motor de producción.

## Modos y límites del servidor

| Recurso | Límite |
| --- | --- |
| Matrices, sistemas y dimensiones vectoriales | 50 |
| Procedimiento educativo completo | Hasta 6 filas/columnas |
| Cofactores recursivos | Hasta 6×6, por crecimiento factorial |
| Modo rápido | Resultado, resumen, tiempo y comprobación; sin matrices intermedias |
| Cálculo matricial o lineal | Presupuesto de 5 segundos, revisado por filas/columnas |
| Magnitud de entradas numéricas | Hasta `1e12`, finitas; sin booleanos |
| Expresión de raíces | 1000 caracteres, 256 tokens, 32 niveles |
| Constantes del parser | Magnitud hasta `1e100`; exponente hasta 10000 |
| Iteraciones de raíces | 1…1000 |
| Gráfica | 2…1200 muestras |
| Cuerpo JSON | 512 KiB |
| Respuesta JSON | 2 MiB |
| Historial | 30 entradas; máximo 100000 caracteres por registro |

En modo automático se muestran todos los pasos hasta 6×6 y se usa el modo rápido en tamaños mayores. Pedir modo educativo por encima del límite devuelve un error claro. Sarrus conserva su matriz expandida y las diagonales verdes y rojas, con coordenadas y productos consistentes. LU conserva el signo de los intercambios y comprueba `PA≈LU` en el modo rápido. La inversa comprueba `A·A⁻¹≈I` e informa la condición estimada.

## Historial, comparación y exportación

Abrir **Historial, precisión y exportación** en cualquier módulo. El historial está en `localStorage`, incluye fecha local, entradas, método y resultado, y permite restaurar, repetir, eliminar y limpiar. Los errores de cuota no impiden calcular. Restaurar entradas no muestra resultados viejos como si acabaran de calcularse.

En raíces, abrir **Comparar los cuatro métodos**, indicar los parámetros iniciales y pulsar **Ejecutar comparación**. Cada método muestra estado, aproximación, iteraciones, Ea, residuo y tiempo; los casos no aplicables tienen su motivo. La gráfica exploratoria nunca añade un marcador de raíz antes de calcular. Los cambios de entrada invalidan resultados y las respuestas obsoletas se descartan.

Después de un cálculo se puede descargar CSV, copiar el procedimiento o imprimir/guardar PDF usando el navegador. El informe incluye Lineal Tanix, problema, parámetros, método, fecha y procedimiento. Los CSV incluyen las columnas completas de las iteraciones. No se usan cuentas, base de datos ni servicios externos para estas funciones.

## Pruebas

```bash
python -m unittest discover -s tests -v
# Entrada compatible con el comando anterior del proyecto:
python test_raices.py
```

Se verifican expresiones, seguridad, dominios, raíces, clasificación y parametrización, operaciones matriciales, determinantes con oráculos racionales, vectores, conversiones y APIs. Las comparaciones flotantes usan tolerancias.

Pruebas opcionales de interfaz, con dependencias solo de desarrollo:

```bash
npm install --no-save jsdom@26.1.0 playwright@1.56.1
node tests/ui_dom.cjs
npx playwright install chromium
# En otra terminal:
python -m flask --app calculadora run --port 5055
node tests/navegador.cjs
```

`ui_dom.cjs` ejecuta los scripts reales y un cliente Flask a través de un puente Python; simula Canvas, portapapeles e impresión y verifica las interacciones. **No verifica el diseño, la descarga nativa ni el renderizado real.** `navegador.cjs` cubre Chromium y la vista móvil. La integración continua está definida en `.github/workflows/tests.yml`; no se ha ejecutado remotamente desde este entorno.

## Limitaciones conocidas

- Un muestreo finito no demuestra continuidad ni encuentra todas las raíces. La búsqueda automática puede omitir raíces tangenciales no muestreadas, funciones oscilatorias y intervalos muy estrechos.
- Se utiliza aritmética float. El rango y la clasificación de sistemas casi dependientes dependen de tolerancias numéricas; matrices muy mal condicionadas pueden tener una comprobación fallida y se advierte al usuario.
- El presupuesto temporal es cooperativo; los límites de dimensiones, tokens y pasos acotan también el trabajo entre comprobaciones.
- Las entradas fuera de los límites antiguos de 200×200 o cofactores 10×10 ahora reciben HTTP 400. No se cambian silenciosamente de método.
- La copia requiere permiso del navegador. El almacenamiento local puede estar bloqueado y los datos no se sincronizan entre navegadores.
- La interfaz visual, el renderizado móvil y la impresión/descarga nativas necesitan una revisión en un navegador real. La ejecución local de Chromium fue bloqueada por la restricción del entorno sobre sockets Unix; no se declara aprobada esa revisión.
