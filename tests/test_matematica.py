import math
import unittest
from calculadora.utilidades.expresiones import compilar_expresion
from calculadora.metodos.raices import *
from calculadora.utilidades.ecuaciones import parsear_ecuacion
from calculadora.metodos.gauss import resolver_gauss
from calculadora.metodos.gauss_jordan import resolver_gauss_jordan
from calculadora.metodos.pivote import resolver_pivote
from calculadora.metodos.inversa import inversa_matriz
from calculadora.metodos.determinantes import calcular_determinante
from calculadora.metodos.operaciones_matrices import *
from calculadora.metodos.vectores import suma_vectores, resta_vectores, mult_escalar_vector, verificar_combinacion_lineal
from calculadora.metodos.conversiones import convertir_numero
from calculadora.metodos.romanos import convertir_romano
from calculadora.utilidades.verificacion import verificar_solucion

class Expresiones(unittest.TestCase):
    def test_gramatica(self):
        casos = [('2x', 4), ('2(x+1)', 6), ('2x(2)(x+1)', 24), ('2x (2)(x+1)', 24),
                 ('(x+1)(x-1)', 3), ('3sin(x)', 3*math.sin(2)), ('2pi', 2*math.pi),
                 ('x(x+1)', 6), ('(x+1)2', 6), ('-x^2', -4), ('(-x)^2', 4),
                 ('2^3^2', 512), ('2*-3', -6), ('2^-3', .125), ('2**3', 8),
                 ('X^2=2', 2), ('π+e', math.pi+math.e), ('\t2 x\n+ 1', 5),
                 ('sqrt(4)+abs(-3)+ln(e)+log(100)+exp(0)', 9), ('1e-3*x', .002)]
        for expr, valor in casos:
            with self.subTest(expr=expr): self.assertAlmostEqual(evaluar_funcion(expr, 2), valor)
    def test_seguridad_sintaxis(self):
        for expr in ['__import__("os")', 'open(x)', 'x.__class__', 'x[0]', 'sinx', 'x;1',
                     'x=2=3', '=2', 'x=', '1.2.3', '1 2', 'sin x', 'x+', '()', '2,3',
                     '9^999999', '('*40+'x'+')'*40, 'x+'*300+'x', 'x'*1100]:
            with self.subTest(expr=expr):
                with self.assertRaises(ValueError): evaluar_funcion(expr, 2)
    def test_dominios(self):
        for expr in ['sqrt(-1)', 'ln(0)', '1/(x-2)', '(-1)^.5', 'exp(1000)']:
            with self.subTest(expr=expr):
                self.assertTrue(math.isnan(evaluar_seguro(expr, 2)))
                with self.assertRaises(ValueError): evaluar_funcion(expr, 2)
    def test_precision_funciones(self):
        for nombre, funcion, valores in [('sin', math.sin, [1e-10, -100, 1e12]), ('cos', math.cos, [-20, 1e10]),
                ('exp', math.exp, [-50, 20, 100]), ('ln', math.log, [1e-50, 1.99, 1e50]),
                ('sqrt', math.sqrt, [1e-100, 2, 1e100])]:
            for x in valores:
                with self.subTest(nombre=nombre, x=x):
                    self.assertAlmostEqual(evaluar_funcion(f'{nombre}(x)', x)/funcion(x), 1., places=12)
    def test_compila_una_vez(self):
        self.assertIs(compilar_expresion('x^2-2'), compilar_expresion('x^2-2'))

class Raices(unittest.TestCase):
    def test_cuatro_metodos(self):
        for metodo, iniciales in [(biseccion, (-2, 0)), (regla_falsa, (-2, 0)), (newton_raphson, (-2,)), (secante, (-2, 0))]:
            with self.subTest(metodo=metodo.__name__):
                r = metodo('x^2=2', *iniciales, .001)
                self.assertTrue(r['convergencia'], r)
                self.assertAlmostEqual(r['resultado'], -math.sqrt(2), places=7)
                self.assertLess(r['residuo'], 1e-8)
                self.assertEqual(r['iteraciones'], len(r['pasos']))
    def test_extremos_y_cero(self):
        for metodo, iniciales in [(biseccion, (0, 2)), (regla_falsa, (-2, 0)), (newton_raphson, (0,)), (secante, (2, 0))]:
            with self.subTest(metodo=metodo.__name__):
                r = metodo('x^2', *iniciales, .001)
                self.assertEqual(r['resultado'], 0); self.assertEqual(r['iteraciones'], 0)
    def test_limite_iteraciones(self):
        for metodo, iniciales in [(biseccion, (0,2)), (regla_falsa, (0,2)), (newton_raphson, (2,)), (secante, (0,2))]:
            with self.subTest(metodo=metodo.__name__):
                r = metodo('x^2-2', *iniciales, 1e-10, 1)
                self.assertFalse(r['convergencia']); self.assertEqual(r['iteraciones'], 1)
    def test_no_exito_falso(self):
        for metodo, args in [(biseccion, ('1/(x-.3)', 0, 1)), (regla_falsa, ('1/(x-.3)', 0, 1)),
                             (newton_raphson, ('x^2+1', 0)), (secante, ('x^2+1', -1, 1))]:
            with self.subTest(metodo=metodo.__name__):
                try: self.assertFalse(metodo(*args, .001)['convergencia'])
                except ValueError: pass
    def test_residuo_no_confunde_escala(self):
        r = biseccion('1e-30*(x^2-2)', 0, 2, .001)
        self.assertTrue(r['convergencia']); self.assertAlmostEqual(r['resultado'], math.sqrt(2), places=7)
    def test_grafica_y_busqueda(self):
        self.assertEqual(len(evaluar_rango('ln(x)', -1, 1, 11)), 11)
        self.assertIsNone(evaluar_rango('ln(x)', -1, 1, 11)[0]['y'])
        self.assertEqual(buscar_cambios_signo('1/(x-.3)', -2, 2), [])
        self.assertGreaterEqual(len(buscar_cambios_signo('x^2-4', -5, 5)), 2)
    def test_validaciones_directas(self):
        for args in [('x', 1, 0, .01, 100), ('x', 0, 1, 0, 100), ('x', 0, 1, .01, 0), ('x', 0, math.inf, .01, 100)]:
            with self.subTest(args=args):
                with self.assertRaises(ValueError): biseccion(*args)

class Sistemas(unittest.TestCase):
    def test_parser(self):
        for eq, n, A, b in [('x1+x1=2',1,[2],2), ('2x1+3=5-x1',1,[3],2),
                            ('-.5x1+2x2=-1.25',2,[-.5,2],-1.25), ('1e-3x1=2',1,[.001],2)]:
            with self.subTest(eq=eq): self.assertEqual(parsear_ecuacion(eq,n), (A,b))
    def test_parser_invalido(self):
        for eq in ['basura=2', 'x2=1', 'x0=1', 'x1+=2', 'x1=', 'x1^2=1', 'x1x1=1', 'x 1=2', 'x1=NaN']:
            with self.subTest(eq=eq):
                with self.assertRaises(ValueError): parsear_ecuacion(eq,1)
    def test_clasificaciones(self):
        casos = [([[0,1],[1,1]],[2,3],'Determinado',[1,2]),
                 ([[1,1],[2,2]],[3,6],'Indeterminado',[]),
                 ([[1,1],[2,2]],[3,7],'Inconsistente',[]),
                 ([[1,0],[0,1],[1,1]],[2,3,5],'Determinado',[2,3]),
                 ([[0,1,1]],[2],'Indeterminado',[]),
                 ([[0,0],[0,0]],[0,1],'Inconsistente',[]),
                 ([[1e-12]],[2e-12],'Determinado',[2]),
                 ([[0]],[1e-12],'Inconsistente',[])]
        for metodo in (resolver_gauss, resolver_gauss_jordan, resolver_pivote):
            for A,b,tipo,x in casos:
                with self.subTest(metodo=metodo.__name__, A=A, b=b):
                    _,pasos,t,sol,eq = metodo(A,b,len(A),len(A[0]))
                    self.assertIn(tipo,t); self.assertEqual(len(sol),len(x))
                    for a,v in zip(sol,x): self.assertAlmostEqual(a,v)
                    if x: self.assertTrue(all(v['valido'] for v in verificar_solucion(A,b,sol)))
                    if tipo=='Indeterminado': self.assertTrue(any('t1' in v for v in eq))
    def test_no_redondear(self):
        for metodo in (resolver_gauss, resolver_gauss_jordan, resolver_pivote):
            x=metodo([[3]],[1],1,1)[3][0]
            self.assertEqual(x,1/3)

class Matrices(unittest.TestCase):
    def test_operaciones(self):
        A=[[1,2],[3,4]]; B=[[2,0],[1,2]]
        self.assertEqual(suma_matrices(A,B)[0], [[3,2],[4,6]])
        self.assertEqual(resta_matrices(A,B)[0], [[-1,2],[2,2]])
        self.assertEqual(multiplicacion_matrices(A,B)[0], [[4,4],[10,8]])
        self.assertEqual(mult_escalar_matriz(2,A)[0], [[2,4],[6,8]])
    def test_invalidas(self):
        for A in [[], [[]], [[1],[]], [[1],2], [[True]], [[math.nan]], [[math.inf]], [[1e20]]]:
            with self.subTest(A=A): self.assertFalse(validar_formato_matriz(A)[0])
        self.assertIsNotNone(multiplicacion_matrices([[1,2]],[[1,2]])[-1])
    def test_inversa(self):
        for A in [[[3]], [[0,1],[2,3]], [[1e-12,0],[0,2e-12]], [[1,2],[3,4]]]:
            with self.subTest(A=A):
                inv,pasos,eq,err,tiempo,ver = inversa_matriz(A)
                self.assertIsNone(err); self.assertTrue(ver['verificacion_ok'])
                producto=multiplicacion_matrices(A,inv)[0]
                for i in range(len(A)):
                    for j in range(len(A)): self.assertAlmostEqual(producto[i][j], float(i==j), places=9)
        self.assertEqual(inversa_matriz([[3]])[0][0][0],1/3)
        self.assertIsNotNone(inversa_matriz([[1,2],[2,4]])[3])
    def test_mal_condicionada(self):
        A=[[1/(i+j+1) for j in range(10)] for i in range(10)]
        resultado=inversa_matriz(A)
        self.assertIsNone(resultado[3])
        self.assertGreater(resultado[5]['condicion_estimada'],1e10)
        self.assertIsNotNone(resultado[5]['advertencia'])

    def test_determinantes(self):
        for metodo in ['cofactores','sarrus','lu','auto']:
            with self.subTest(metodo=metodo):
                self.assertAlmostEqual(calcular_determinante([[2,3,5],[7,11,13],[17,19,23]],metodo)[0],-78)
        self.assertAlmostEqual(calcular_determinante([[0,2],[3,4]],'lu')[0],-6)
        self.assertAlmostEqual(calcular_determinante([[1e-12,0],[0,2e-12]],'lu')[0]/2e-24,1)
    def test_cofactores_pequenos(self):
        A=[[1e-12,2e-12,0],[0,3e-12,4e-12],[5e-12,0,6e-12]]
        self.assertAlmostEqual(calcular_determinante(A,'cofactores')[0]/58e-36,1)

    def test_lu_factorizacion(self):
        A=[[0,2,1],[1,1,1],[2,1,3]]
        det,pasos,*_ = calcular_determinante(A,'lu')
        final=next(p for p in pasos if p.get('tipo')=='lu_final')
        PA=multiplicacion_matrices(final['P_final'],A)[0]
        LU=multiplicacion_matrices(final['L_final'],final['U_final'])[0]
        for i in range(3):
            for j in range(3): self.assertAlmostEqual(PA[i][j],LU[i][j],places=12)

class OtrosModulos(unittest.TestCase):
    def test_vectores(self):
        self.assertEqual(suma_vectores([1,2],[2,3],2)[0],[3,5])
        self.assertEqual(resta_vectores([1,2],[2,3],2)[0],[-1,-1])
        self.assertEqual(mult_escalar_vector(3,[1,2],2)[0],[3,6])
        self.assertTrue(verificar_combinacion_lineal([[1,0],[0,1]],[2,3])[0])
        self.assertFalse(verificar_combinacion_lineal([[1,0]],[2,3])[0])
    def test_bases(self):
        for num,a,b,esperado in [('25.5',10,2,'11001.1'),('FF',16,10,'255'),('77',8,2,'111111'),('-.5',10,2,'-0.1')]:
            with self.subTest(num=num): self.assertEqual(convertir_numero(num,a,b)['resultado'],esperado)
        for num,a,b in [('102',2,10),(None,10,2),('NaN',10,2),('1',3,10),('1'*65,10,2)]:
            with self.subTest(num=num):
                with self.assertRaises(ValueError): convertir_numero(num,a,b)
    def test_romanos(self):
        self.assertEqual(convertir_romano('MCMXCIV','romano_a_arabigo')['resultado'],1994)
        self.assertEqual(convertir_romano(3999,'arabigo_a_romano')['resultado'],'MMMCMXCIX')
        for valor in ['IIII','IC','ABC']:
            with self.subTest(valor=valor):
                with self.assertRaises(ValueError): convertir_romano(valor,'romano_a_arabigo')
