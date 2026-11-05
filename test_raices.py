"""Entrada histórica de las pruebas: usa la suite mantenida en tests/."""
import unittest

if __name__ == '__main__':
    suite = unittest.defaultTestLoader.discover('tests')
    resultado = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(not resultado.wasSuccessful())
