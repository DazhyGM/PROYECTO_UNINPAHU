const CLAVES = [
  'token',
  'user',
  'roleModules',
  'userName',
  'userId',
  'userEmail',
  'selectedService',
  'selectedServices',
  'barberId',
  'barberName',
  'facturaData',
];

let tokenConfirmado = null;
let confirmadaHasta = 0;

export function leerUsuario() {
  try {
    const crudo = localStorage.getItem('user');
    if (!crudo) return null;
    const usuario = JSON.parse(crudo);
    if (!usuario || typeof usuario !== 'object') return null;
    return usuario;
  } catch (error) {
    return null;
  }
}

export function hayDatosDeSesion() {
  return CLAVES.some((clave) => localStorage.getItem(clave))
    || Boolean(sessionStorage.getItem('barberCitasModal'));
}

export function sesionConfirmada(token) {
  return Boolean(token) && tokenConfirmado === token && Date.now() < confirmadaHasta;
}

export function invalidarConfirmacion() {
  confirmadaHasta = 0;
}

export function confirmarSesionLocal(token) {
  tokenConfirmado = token || null;
  confirmadaHasta = Date.now() + 2000;
  window.dispatchEvent(new Event('sesion-cambiada'));
}

export function cerrarSesionLocal() {
  tokenConfirmado = null;
  confirmadaHasta = 0;
  CLAVES.forEach((clave) => localStorage.removeItem(clave));
  sessionStorage.removeItem('barberCitasModal');
  window.dispatchEvent(new Event('sesion-cambiada'));
}
