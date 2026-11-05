"""Controles internos de tiempo y memoria: cada operación conserva sus pasos."""
import time
from flask import has_request_context, g


class Registro(list):
    """Conserva todos los pasos o rechaza un procedimiento excesivo explícitamente."""
    def __init__(self, valores=(), limite=10000):
        super().__init__()
        self.limite = limite
        self.elementos = 0
        self.extend(valores)

    @staticmethod
    def _peso(valor):
        if isinstance(valor, dict): return sum(Registro._peso(v) for v in valor.values())
        if isinstance(valor, (list, tuple)): return sum(Registro._peso(v) for v in valor)
        if isinstance(valor, str): return max(1, len(valor)//16)
        return 1

    def append(self, valor):
        peso = self._peso(valor)
        if len(self) >= self.limite or self.elementos+peso > 200000:
            raise ValueError('El procedimiento excede el límite de memoria. Reduce el tamaño o la complejidad de la entrada.')
        super().append(valor)
        self.elementos += peso

    def extend(self, valores):
        for valor in valores: self.append(valor)


class Presupuesto:
    def __init__(self, segundos=5):
        inicio = getattr(g, 'inicio', time.perf_counter()) if has_request_context() else time.perf_counter()
        self.fin = inicio + segundos

    def revisar(self):
        if time.perf_counter() > self.fin:
            raise ValueError('El cálculo superó el límite de 5 segundos; reduce la complejidad del problema.')
