"""Política común: procedimiento completo hasta 6×6, resumen hasta 50×50."""
import time
from flask import has_request_context, request, g

LIMITE_EDUCATIVO = 6


def modo_educativo(tamano, modo=None):
    if modo is None and has_request_context():
        modo = (request.get_json(silent=True) or {}).get('modo', 'auto')
    modo = modo or 'auto'
    if modo == 'educativo' and tamano > LIMITE_EDUCATIVO:
        raise ValueError('El modo educativo admite hasta 6 filas/columnas; usa modo rápido para tamaños mayores.')
    return modo != 'rapido' and tamano <= LIMITE_EDUCATIVO


class Registro(list):
    """En modo rápido no retiene textos ni estados intermedios."""
    def __init__(self, valores=(), activo=True):
        self.activo = activo
        super().__init__(valores if activo else ())

    def append(self, valor):
        if self.activo: super().append(valor)

    def extend(self, valores):
        if self.activo: super().extend(valores)


class Presupuesto:
    def __init__(self, segundos=5):
        self.fin = min(time.perf_counter() + segundos, getattr(g, "inicio", time.perf_counter()) + segundos) if has_request_context() else time.perf_counter() + segundos

    def revisar(self):
        if time.perf_counter() > self.fin:
            raise ValueError('El cálculo superó el límite de 5 segundos; reduce el tamaño del problema.')
