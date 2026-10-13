// Worker de módulo que ejecuta COBOL fuera del hilo de la página: un programa
// que no termina bloquea este Worker, no la lección, y `cobol-web.ts` lo
// reemplaza al vencer el tiempo límite.
import { crearMotorCobol } from './motor.mjs';

let motor = null;

self.onmessage = async ({ data }) => {
  if (data.tipo === 'preparar') {
    try {
      motor ??= await crearMotorCobol({ base: new URL('./', import.meta.url) });
      self.postMessage({ tipo: 'listo' });
    } catch (error) {
      self.postMessage({ tipo: 'fallo', mensaje: String(error?.message ?? error) });
    }
    return;
  }
  if (data.tipo === 'ejecutar') {
    try {
      const resultado = await motor.ejecutar(data.codigo, {
        entrada: data.entrada,
        archivos: data.archivos,
        formato: data.formato,
        alCambiarFase: (fase) => self.postMessage({ tipo: 'fase', id: data.id, fase }),
      });
      self.postMessage({ tipo: 'resultado', id: data.id, ...resultado });
    } catch (error) {
      self.postMessage({ tipo: 'resultado', id: data.id, compilo: false, salida: '', diagnosticos: String(error?.message ?? error), codigo: null, archivos: {} });
    }
  }
};
