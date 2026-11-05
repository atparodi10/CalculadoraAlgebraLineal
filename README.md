# Lineal Tanix

Calculadora educativa de álgebra lineal con Flask, HTML, CSS y JavaScript. Mantiene los módulos y procedimientos originales: sistemas, matrices, vectores, conversión de bases, números romanos y raíces de ecuaciones.

## Instalación

Requiere Python 3.10 o posterior.

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux / macOS:
# source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

Abrir http://127.0.0.1:5000. Se conserva `requeriments.txt` como entrada compatible para instalar dependencias. El depurador solo se activa si se establece `FLASK_DEBUG=1`.

## Funciones originales

| Página | Operaciones |
| --- | --- |
| `/ecuaciones` | Gauss, Gauss-Jordan y pivoteo en dos fases, clasificación y explicación |
| `/matrices` | Suma, resta, escalar, producto, inversa `[A | I]`, determinantes por cofactores, Sarrus y LU |
| `/vectores` | Suma, resta, escalar y combinación lineal |
| `/conversion` | Bases 2, 8, 10 y 16, signos y fracciones |
| `/romanos` | Conversión bidireccional entre 1 y 3999 |
| `/raices` | Bisección, Regla Falsa, Newton-Raphson y Secante, gráfica y búsqueda de intervalos |

La interfaz presenta los resultados y pasos de cada cálculo. Las solicitudes de entradas anteriores se cancelan o descartan para evitar mostrar resultados obsoletos. Se conservan la navegación, el tema claro/oscuro y las visualizaciones originales.

## Entradas y correcciones

**Raíces.** Gráfica y métodos utilizan el mismo parser seguro, sin ejecutar código. Admite `x`, `X`, `pi`, `π`, `e`, `sin`, `cos`, `tan`, `sqrt`, `ln`, `log` (base 10), `exp`, `abs`, `+ - * / ^ **` y una igualdad. Ejemplos: `2x (2)(x+1)`, `(x+1)2`, `3sin(x)`, `x^2=2`. La trigonometría usa radianes. Se respeta `-x^2=-(x^2)` y `2^3^2=2^(3^2)`.

El error solicitado es el relativo porcentual `Ea=|x_n-x_(n-1)|/|x_n|*100`. Una raíz exacta detiene el cálculo. En otros casos también se exige residuo pequeño: `|f(x)| <= 1e-8 * min(1, escala inicial de f)`. Si la aproximación es cero se informa el error absoluto sin dividir entre cero. Estancamiento, problemas de dominio y agotamiento de iteraciones se distinguen de convergencia.

Las funciones matemáticas de producción usan `math` de Python. Las implementaciones manuales se conservan como referencia académica en `raices_educativas.py`, con sus límites documentados.

**Sistemas.** Se acumulan coeficientes repetidos y se valida toda la ecuación. Ejemplos: `x1+x1=2`, `2x1+3=5-x1`, `-.5x1+2x2=-1.25`. Se admiten constantes en ambos miembros y notación científica. Variables fuera de `x1..xn`, texto desconocido, productos de variables y ecuaciones incompletas se rechazan. Para fracciones usar decimales: `0.5x1`.

Las soluciones conservan su precisión interna; la comprobación se realiza antes de redondear. Los sistemas indeterminados explican sus variables libres y parámetros. La inversa conserva la matriz aumentada y la comprobación `A·A⁻¹≈I`. En Sarrus las flechas verdes/rojas, coordenadas y productos representan las mismas diagonales. LU mantiene el signo de los intercambios.

## Validación y límites

- **Cofactores: máximo 10×10**, habilitado tanto en el selector como en el servidor. Se rechazan dimensiones superiores para este método.
- Matrices, sistemas y dimensiones vectoriales: máximo 50 filas/columnas.
- Entradas numéricas: finitas, sin booleanos y con magnitud máxima `1e12`.
- Expresiones de raíces: 1000 caracteres, 256 tokens y 32 niveles. Constantes hasta `1e100` y exponentes hasta 10000.
- Raíces: entre 1 y 1000 iteraciones; gráfica entre 2 y 1200 muestras.
- Peticiones JSON: 512 KiB. Respuestas: 2 MiB.
- Los registros internos rechazan procedimientos que excedan memoria; no omiten pasos para presentar un resultado incompleto como exitoso. Los cálculos matriciales/lineales y la recursión de cofactores comprueban un presupuesto temporal de 5 segundos.

Un tamaño permitido no garantiza que cualquier matriz densa de ese tamaño genere un procedimiento manejable: cofactores tiene crecimiento factorial. Si se supera un presupuesto de recursos se devuelve un mensaje controlado para reducir la complejidad. El límite dimensional de cofactores sigue siendo 10×10.

## Pruebas

```bash
python -m unittest discover -s tests -v
# Entrada histórica compatible:
python test_raices.py
```

La suite comprueba parser, seguridad, dominios, convergencia, sistemas, matrices, Sarrus, LU, vectores, conversiones, APIs y aceptación de cofactores hasta 10×10. Incluye comparaciones contra aritmética racional independiente y verifica que se conserven los pasos para dimensiones mayores a seis.

Para pruebas opcionales de interfaz:

```bash
npm install --no-save jsdom@26.1.0 playwright@1.56.1
node tests/ui_dom.cjs
npx playwright install chromium
# En otra terminal:
python -m flask --app calculadora run --port 5055
node tests/navegador.cjs
```

Las pruebas DOM ejecutan scripts y plantillas reales contra Flask mediante `tests/puente_ui.py`, simulando Canvas. No verifican diseño ni renderizado nativo. Las pruebas Chromium revisan la interacción y la vista móvil. El workflow usa Ubuntu 24.04 para Playwright 1.56.1.

## Limitaciones conocidas

Un muestreo finito no demuestra continuidad ni garantiza encontrar todas las raíces tangenciales o muy oscilatorias. Los cálculos float de matrices casi singulares y sistemas casi dependientes están sujetos a tolerancias; se mantienen comprobaciones numéricas y advertencias. Los presupuestos temporales son cooperativos y no sustituyen los límites de entrada. El navegador real debe poder ejecutarse para completar la revisión visual.
