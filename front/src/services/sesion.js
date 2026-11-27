import API from '@/services/api';
import {
  cerrarSesionLocal,
  confirmarSesionLocal,
  hayDatosDeSesion,
  leerUsuario,
  sesionConfirmada,
} from '@/services/sesionLocal';

let pendiente = null;

function sesionLocalCompleta() {
  return Boolean(localStorage.getItem('token') && leerUsuario());
}

export async function validarSesion() {
  const token = localStorage.getItem('token');
  if (!sesionLocalCompleta()) {
    if (hayDatosDeSesion()) cerrarSesionLocal();
    return false;
  }

  if (sesionConfirmada(token)) return true;

  if (!pendiente) {
    const tokenEnCurso = token;
    pendiente = API.get('/users/session', { timeout: 5000, skipAuthRedirect: true })
      .then(() => {
        if (localStorage.getItem('token') !== tokenEnCurso) return sesionLocalCompleta();
        confirmarSesionLocal(tokenEnCurso);
        return true;
      })
      .catch((error) => {
        if (localStorage.getItem('token') !== tokenEnCurso) return sesionLocalCompleta();
        const status = error.response?.status;
        const servidorCaido = !error.response;
        if (servidorCaido || status === 401) {
          cerrarSesionLocal();
          return false;
        }
        return sesionLocalCompleta();
      })
      .finally(() => {
        pendiente = null;
      });
  }

  return pendiente;
}

export async function cerrarSesion() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      await API.post('/users/logout', {}, { timeout: 5000, skipAuthRedirect: true });
    } catch (error) {
      // El servidor puede estar apagado o la sesión ya no existir.
    }
  }
  cerrarSesionLocal();
}
