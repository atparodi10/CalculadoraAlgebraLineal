"""Regresiones confirmadas durante la auditoría, con resultados conocidos."""
import math
import unittest
from calculadora import app
from calculadora.metodos.raices import evaluar_funcion, evaluar_seguro, biseccion, newton_raphson, secante
from calculadora.utilidades.ecuaciones import parsear_ecuacion
from calculadora.metodos.gauss import resolver_gauss
from calculadora.utilidades.verificacion import verificar_solucion
from calculadora.metodos.determinantes import determinante_sarrus

class Regresiones(unittest.TestCase):
    def test_motor_unificado(self):
        self.assertEqual(evaluar_funcion('x^2', -2), evaluar_seguro('x^2', -2))
    def test_precedencia(self):
        self.assertEqual(evaluar_seguro('-x^2', 2), -4)
    def test_multiplicacion_espaciada(self):
        self.assertEqual(evaluar_funcion('2x (2)(x+1)', 2), 24)
    def test_coeficientes_repetidos(self):
        self.assertEqual(parsear_ecuacion('x1+x1=2', 1), ([2.0], 2.0))
    def test_texto_desconocido(self):
        with self.assertRaises(ValueError): parsear_ecuacion('basura+x1=2', 1)
    def test_precision_verificacion(self):
        _, _, _, x, _ = resolver_gauss([[3.]], [1.], 1, 1)
        self.assertTrue(verificar_solucion([[3.]], [1.], x)[0]['valido'])
    def test_raiz_inicial_newton(self):
        self.assertTrue(newton_raphson('x^2', 0, .001)['convergencia'])
    def test_raiz_inicial_secante(self):
        self.assertEqual(secante('x', 0, 1, .001)['resultado'], 0)
    def test_sarrus_flechas(self):
        A = [[2,3,5],[7,11,13],[17,19,23]]
        _, pasos, _, _ = determinante_sarrus(A)
        visual = pasos[-1]; expandida = A + visual['filas_expandidas']
        for diag in visual['diagonales_principales'] + visual['diagonales_secundarias']:
            self.assertEqual(math.prod(expandida[i][j] for i,j in diag['coords']), diag['producto'])
    def test_json_vacio(self):
        response = app.test_client().post('/calcular', json={})
        self.assertEqual(response.status_code, 400)

if __name__ == '__main__': unittest.main()
