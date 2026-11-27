import Swal from 'sweetalert2';

const aviso = Swal.mixin({
  background: '#141414',
  color: '#f4e7c4',
  confirmButtonColor: '#CCAF54',
  cancelButtonColor: '#2c2c2c',
  confirmButtonText: 'Aceptar',
  cancelButtonText: 'Cancelar',
  heightAuto: false,
});

function limpiar(texto) {
  return String(texto ?? '')
    .replace(/\u2705/g, '')
    .replace(/\u274C/g, '')
    .replace(/\u26A0\uFE0F?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tipoDe(texto, tipo) {
  if (tipo) return tipo;
  const t = texto.toLowerCase();
  if (/(éxito|exitos|correctamente|actualizad|eliminad|cread|enviad|confirmad|agregad|hasta pronto|cambiada)/.test(t)) {
    return 'success';
  }
  if (/(error|no se pudo|no pud|hubo|inválid|problema|no tienes|no se encontr|no fue posible|permiso)/.test(t)) {
    return 'error';
  }
  if (/(faltan|selecciona|obligatori|no coinciden|advertencia|revisa|cantidad|completa|formato|debe |escribe)/.test(t)) {
    return 'warning';
  }
  return 'info';
}

const titulos = {
  success: 'Listo',
  error: 'No se pudo completar',
  warning: 'Revisa la información',
  info: 'Aviso',
};

export function notificar(texto, tipo) {
  const limpio = limpiar(texto) || 'Ocurrió un aviso.';
  const icon = tipoDe(limpio, tipo);

  return aviso.fire({
    icon,
    title: titulos[icon] || 'Aviso',
    text: limpio,
    timer: icon === 'success' ? 2200 : undefined,
    timerProgressBar: icon === 'success',
    showConfirmButton: icon !== 'success',
  });
}

export function confirmar(texto, titulo = '¿Confirmas esta acción?') {
  return aviso.fire({
    icon: 'question',
    title: titulo,
    text: limpiar(texto),
    showCancelButton: true,
    confirmButtonText: 'Sí, continuar',
    focusCancel: true,
  }).then((resultado) => resultado.isConfirmed);
}
