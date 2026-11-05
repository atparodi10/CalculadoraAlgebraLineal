"""Integración Flask con entradas hostiles, contratos originales y límites."""
import json
import math
import unittest
from calculadora import app

VALIDOS = {
    '/calcular': {'m':1,'n':1,'metodo':'gauss','ecuaciones':['x1+x1=2']},
    '/api/matrices': {'operacion':'multiplicacion','A':[[1,2]],'B':[[3],[4]]},
    '/api/vectores': {'operacion':'suma','n':2,'u':[1,2],'v':[3,4]},
    '/convertir': {'numero':'25.5','base_origen':10,'base_destino':2},
    '/api/romanos': {'numero':1994,'direccion':'arabigo_a_romano'},
    '/api/raices': {'funcion':'x^2=2','metodo':'biseccion','xl':0,'xu':2,'error_esperado':.001},
    '/api/raices/evaluar': {'funcion':'2x (2)(x+1)','x_min':-2,'x_max':2,'n_puntos':5},
    '/api/raices/buscar-limites': {'funcion':'x^2-2','x_min':-2,'x_max':2},
    '/api/raices/comparar': {'funcion':'x^2-2','xl':0,'xu':2,'x0':1,'x_menos1':0,'error_esperado':.001},
}

class API(unittest.TestCase):
    def setUp(self): self.client=app.test_client()
    def test_paginas(self):
        for path in ['/','/ecuaciones','/matrices','/vectores','/conversion','/romanos','/raices']:
            with self.subTest(path=path):
                r=self.client.get(path);self.assertEqual(r.status_code,200);self.assertIn('Lineal Tanix',r.text)
    def test_contratos_validos(self):
        for ruta,datos in VALIDOS.items():
            with self.subTest(ruta=ruta):
                r=self.client.post(ruta,json=datos)
                self.assertEqual(r.status_code,200,r.text)
                self.assertIsInstance(r.get_json(),dict)
                self.assertEqual(r.headers.get('X-Content-Type-Options'),'nosniff')
    def test_json_invalido(self):
        for ruta in VALIDOS:
            for contenido in ['', '{', 'null', '[]', '{}', 'true', '"texto"']:
                with self.subTest(ruta=ruta,contenido=contenido):
                    r=self.client.post(ruta,data=contenido,content_type='application/json')
                    self.assertEqual(r.status_code,400,r.text);self.assertIn('error',r.get_json())
    def test_tipos_y_limites(self):
        casos=[('/calcular',{'m':0}),('/calcular',{'n':-1}),('/calcular',{'m':1.5}),('/calcular',{'m':51}),
               ('/calcular',{'ecuaciones':[]}),('/calcular',{'ecuaciones':['x2=1']}),('/calcular',{'metodo':'basura'}),
               ('/calcular',{'ecuaciones':['basura+x1=1']}),
               ('/api/matrices',{'A':[[1],2]}),('/api/matrices',{'A':[[]]}),('/api/matrices',{'A':[[math.nan]]}),
               ('/api/matrices',{'A':[[math.inf]]}),('/api/matrices',{'A':[[True]]}),('/api/matrices',{'A':[[1e13]]}),('/api/matrices',{'A':[[10**1000]]}),
               ('/api/matrices',{'operacion':'otra'}),('/api/matrices',{'A':[[1]*51]}),
               ('/api/vectores',{'n':False}),('/api/vectores',{'u':[1]}),('/api/vectores',{'v':[1,math.inf]}),
               ('/convertir',{'numero':23}),('/convertir',{'base_origen':3}),('/convertir',{'numero':'1'*65}),
               ('/api/romanos',{'numero':True}),('/api/romanos',{'numero':math.nan}),('/api/romanos',{'direccion':'otra'}),
               ('/api/raices',{'funcion':123}),('/api/raices',{'funcion':'x+'}),('/api/raices',{'funcion':'x'*1001}),
               ('/api/raices',{'max_iter':1001}),('/api/raices',{'max_iter':0}),('/api/raices',{'max_iter':2.5}),
               ('/api/raices',{'error_esperado':math.nan}),('/api/raices',{'error_esperado':0}),
               ('/api/raices',{'metodo':[]}),('/api/raices',{'metodo':'desconocido'}),('/api/raices',{'xl':'0'}),
               ('/api/raices',{'xu':math.inf}),('/api/raices',{'xl':2}),
               ('/api/raices/evaluar',{'n_puntos':1201}),('/api/raices/evaluar',{'n_puntos':1}),
               ('/api/raices/evaluar',{'x_min':2}),('/api/raices/evaluar',{'x_max':math.nan}),
               ('/api/raices/buscar-limites',{'funcion':'__import__(x)'}),
               ('/api/raices/comparar',{'max_iter':1001})]
        for ruta,cambios in casos:
            with self.subTest(ruta=ruta,cambios=cambios):
                r=self.client.post(ruta,json={**VALIDOS[ruta],**cambios})
                self.assertEqual(r.status_code,400,r.text);self.assertIn('error',r.get_json())
    def test_campos_ausentes(self):
        obligatorios={'/calcular':['m','n','ecuaciones'],'/api/matrices':['operacion','A','B'],
            '/api/vectores':['n','u','v'],'/convertir':['numero','base_origen','base_destino'],
            '/api/romanos':['numero','direccion'],'/api/raices':['funcion','metodo','xl','xu','error_esperado'],
            '/api/raices/evaluar':['funcion'],'/api/raices/buscar-limites':['funcion']}
        for ruta,campos in obligatorios.items():
            for campo in campos:
                with self.subTest(ruta=ruta,campo=campo):
                    datos=VALIDOS[ruta].copy();datos.pop(campo)
                    self.assertEqual(self.client.post(ruta,json=datos).status_code,400)
    def test_comparacion(self):
        r=self.client.post('/api/raices/comparar',json=VALIDOS['/api/raices/comparar']).get_json()
        self.assertEqual(len(r['comparacion']),4)
        self.assertTrue(all(x['convergencia'] for x in r['comparacion']))
        datos={**VALIDOS['/api/raices/comparar'],'xl':2,'xu':3,'x0':0,'x_menos1':0}
        r=self.client.post('/api/raices/comparar',json=datos).get_json()
        self.assertFalse(any(x['convergencia'] for x in r['comparacion']))
    def test_no_revela_raiz_exploratoria(self):
        for ruta in ['/api/raices/evaluar','/api/raices/buscar-limites']:
            r=self.client.post(ruta,json=VALIDOS[ruta]).get_json()
            self.assertNotIn('resultado',r);self.assertNotIn('raiz',r)
    def test_error_por_ecuacion(self):
        r=self.client.post('/calcular',json={'m':2,'n':1,'ecuaciones':['x1=1','basura=2']})
        self.assertEqual(r.status_code,400);self.assertIn('Ecuación 2',r.get_json()['error'])
    def test_modo_rapido(self):
        A=[[float(i==j) for j in range(20)] for i in range(20)]
        for operacion in ['inversa','determinante','multiplicacion','suma','escalar']:
            with self.subTest(operacion=operacion):
                r=self.client.post('/api/matrices',json={'A':A,'B':A,'c':2,'operacion':operacion,'metodo':'lu'})
                self.assertEqual(r.status_code,200,r.text)
                datos=r.get_json();self.assertEqual(datos['modo'],'rapido');self.assertEqual(datos['pasos'],[])
                self.assertIn('comprobacion',datos);self.assertLess(len(r.data),100000)
    def test_rectangular_grande(self):
        r=self.client.post('/api/matrices',json={'operacion':'multiplicacion','A':[[2]],'B':[[1]*50]})
        self.assertEqual(r.status_code,200)
        self.assertEqual(r.get_json()['modo'],'rapido')
        self.assertEqual(r.get_json()['resultado'],[[2]*50])

    def test_modo_explicito(self):
        r=self.client.post('/api/matrices',json={**VALIDOS['/api/matrices'],'modo':'rapido'})
        self.assertEqual(r.get_json()['modo'],'rapido')
        A=[[1]*7 for _ in range(7)]
        self.assertEqual(self.client.post('/api/matrices',json={'A':A,'B':A,'operacion':'suma','modo':'educativo'}).status_code,400)
    def test_json_anidado(self):
        r=self.client.post('/calcular',data='{"x":'+ '['*1100 + '0' + ']'*1100 + '}',content_type='application/json')
        self.assertEqual(r.status_code,400)

    def test_cuerpo_excesivo(self):
        r=self.client.post('/calcular',data=' '*524289,content_type='application/json')
        self.assertEqual(r.status_code,413);self.assertIn('error',r.get_json())
    def test_recomendacion_grande(self):
        r=self.client.post('/api/matrices',json={'operacion':'determinante','A':[[int(i==j) for j in range(20)] for i in range(20)],'solo_recomendacion':True})
        self.assertEqual(r.status_code,200);self.assertNotIn('resultado',r.get_json())

    def test_recomendacion_no_calcula(self):
        r=self.client.post('/api/matrices',json={'operacion':'determinante','A':[[1,2],[3,4]],'solo_recomendacion':True})
        self.assertEqual(r.status_code,200);self.assertIn('recomendacion',r.get_json());self.assertNotIn('resultado',r.get_json())
