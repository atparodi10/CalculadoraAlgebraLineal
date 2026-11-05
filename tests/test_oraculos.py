"""Oráculos racionales e invariantes: contrastan algoritmos independientes."""
from fractions import Fraction
import math
import random
import unittest
from calculadora.metodos.determinantes import calcular_determinante
from calculadora.metodos.gauss import resolver_gauss
from calculadora.metodos.gauss_jordan import resolver_gauss_jordan
from calculadora.metodos.pivote import resolver_pivote
from calculadora.metodos.inversa import inversa_matriz


def det_racional(A):
    M=[[Fraction(v) for v in fila] for fila in A];det=Fraction(1)
    for j in range(len(M)):
        piv=next((i for i in range(j,len(M)) if M[i][j]),None)
        if piv is None:return Fraction(0)
        if piv!=j:M[j],M[piv]=M[piv],M[j];det=-det
        v=M[j][j];det*=v
        for i in range(j+1,len(M)):
            factor=M[i][j]/v
            M[i]=[a-factor*b for a,b in zip(M[i],M[j])]
    return det

class Oraculos(unittest.TestCase):
    def test_determinantes_con_aritmetica_exacta(self):
        rng=random.Random(24013713)
        for n in range(1,6):
            for caso in range(8):
                A=[[rng.randint(-5,5) for _ in range(n)] for _ in range(n)]
                esperado=float(det_racional(A))
                for metodo in ['lu','cofactores']+(['sarrus'] if n==3 else []):
                    with self.subTest(n=n,caso=caso,metodo=metodo):
                        self.assertTrue(math.isclose(calcular_determinante(A,metodo)[0],esperado,rel_tol=1e-10,abs_tol=1e-9))
    def test_sistemas_con_solucion_conocida(self):
        rng=random.Random(42)
        for n in range(1,6):
            for caso in range(6):
                A=[[rng.randint(-4,4) for _ in range(n)] for _ in range(n)]
                if det_racional(A)==0:continue
                x=[rng.randint(-3,3)/3 for _ in range(n)]
                b=[sum(a*v for a,v in zip(fila,x)) for fila in A]
                for metodo in (resolver_gauss,resolver_gauss_jordan,resolver_pivote):
                    with self.subTest(n=n,caso=caso,metodo=metodo.__name__):
                        sol=metodo(A,b,n,n)[3]
                        self.assertEqual(len(sol),n)
                        for a,v in zip(sol,x):self.assertAlmostEqual(a,v,places=9)
    def test_inversa_preserva_datos(self):
        A=[[2,1],[3,4]];original=[fila[:] for fila in A]
        inversa_matriz(A);self.assertEqual(A,original)
    def test_parametrizacion_no_pierde_columnas_libres(self):
        A=[[0,2,4,6],[0,0,3,9]];b=[10,12]
        for metodo in (resolver_gauss,resolver_gauss_jordan,resolver_pivote):
            with self.subTest(metodo=metodo.__name__):
                _,_,tipo,sol,explicaciones=metodo(A,b,2,4)
                self.assertIn('Indeterminado',tipo);self.assertEqual(sol,[])
                self.assertIn('x1 = 0 + 1t1 (variable libre)',explicaciones)
                self.assertIn('x3 = 4 - 3t2',explicaciones)
                self.assertIn('x2 = -3 + 3t2',explicaciones)
