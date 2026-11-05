"""Evita reintroducir funciones retiradas y verifica el límite solicitado."""
import unittest
from calculadora import app
from calculadora.metodos.determinantes import calcular_determinante, recomendar_metodo
from calculadora.metodos.inversa import inversa_matriz


def identidad(n): return [[int(i==j) for j in range(n)] for i in range(n)]

class AlcanceOriginal(unittest.TestCase):
    def test_cofactores_hasta_diez(self):
        for n in (6,7,8,9,10):
            with self.subTest(n=n):
                resultado,pasos,ecuaciones,error,*_=calcular_determinante(identidad(n),'cofactores')
                self.assertIsNone(error); self.assertEqual(resultado,1)
                self.assertTrue(pasos); self.assertTrue(ecuaciones)
    def test_cofactores_once_rechazado(self):
        resultado,_,_,error,*_=calcular_determinante(identidad(11),'cofactores')
        self.assertIsNone(resultado); self.assertIn('10×10',error)
    def test_api_cofactores_diez(self):
        r=app.test_client().post('/api/matrices',json={'operacion':'determinante','metodo':'cofactores','A':identidad(10)})
        self.assertEqual(r.status_code,200,r.text); self.assertEqual(r.get_json()['resultado'],1)
        self.assertTrue(r.get_json()['pasos'])
    def test_selector_backend_cofactores_diez(self):
        metodos=recomendar_metodo(identidad(10))['metodos_disponibles']
        cofactores=next(m for m in metodos if m['id']=='cofactores')
        self.assertTrue(cofactores['disponible'])
    def test_sin_paneles_ni_recursos_de_funciones_nuevas(self):
        for ruta in ('/raices','/matrices','/ecuaciones','/vectores','/conversion','/romanos'):
            with self.subTest(ruta=ruta):
                html=app.test_client().get(ruta).text
                for marca in ('tanix-historial','tanix-comparar','tanix-comparacion','tanix-csv','tanix-imprimir','tanix-precision','tanix-modo','herramientas.js','herramientas.css'):
                    self.assertNotIn(marca,html)
    def test_endpoint_comparacion_retirado(self):
        self.assertNotIn('/api/raices/comparar',{regla.rule for regla in app.url_map.iter_rules()})
        r=app.test_client().post('/api/raices/comparar',json={'funcion':'x'})
        self.assertEqual(r.status_code,404)
    def test_sin_modo_rapido_automatico(self):
        r=app.test_client().post('/api/matrices',json={'operacion':'suma','A':identidad(7),'B':identidad(7)})
        self.assertEqual(r.status_code,200)
        self.assertTrue(r.get_json()['pasos']); self.assertTrue(r.get_json()['pasos_ecuaciones'])
        self.assertNotIn('modo',r.get_json()); self.assertNotIn('comprobacion',r.get_json())
    def test_inversa_conserva_pasos_mayor_a_seis(self):
        resultado=inversa_matriz(identidad(7))
        self.assertIsNone(resultado[3]); self.assertTrue(resultado[1]); self.assertTrue(resultado[5]['verificacion_ok'])
