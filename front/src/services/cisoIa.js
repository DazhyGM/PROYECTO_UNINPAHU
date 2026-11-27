import axios from 'axios';

export async function leerConModelo(sesion, texto) {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const { data } = await axios.post('http://localhost:5000/api/assistant/entender', {
      mensaje: texto,
      historial: (sesion.historial || []).slice(-8),
      rol: sesion.usuario?.role || '',
      nombre: sesion.usuario?.full_name || '',
      paso: sesion.paso || 'inicio',
      borrador: {
        reporte: {
          vista: sesion.reporte?.vista || '',
          desde: sesion.reporte?.desde || '',
          hasta: sesion.reporte?.hasta || '',
          barbero: sesion.reporte?.nombreBarbero || '',
        },
        cita: {
          servicio: sesion.cita?.servicio?.name_service || sesion.cita?.servicio?.name || '',
          barbero: sesion.cita?.barbero?.full_name || '',
          fecha: sesion.cita?.fecha || '',
        },
      },
      barberos: (sesion.barberos || []).map((barbero) => barbero.full_name).filter(Boolean),
      servicios: (sesion.servicios || []).map((servicio) => servicio.name_service || servicio.name).filter(Boolean),
    }, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20000,
    });
    if (!data?.ok || !data.lectura?.intencion) return null;
    return data.lectura;
  } catch (fallo) {
    console.warn('Ciso IA no disponible:', fallo?.message || 'sin respuesta');
    return null;
  }
}
