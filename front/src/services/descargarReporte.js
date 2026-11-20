import { getReportQuotes } from '@/services/quotesApi';
import { crearInformeExcel } from '@/services/informeExcel';

const OPCIONES_CALIFICACION = [
  { value: '', label: 'Todas las calificaciones' },
  { value: '1', label: '1 estrella' },
  { value: '2', label: '2 estrellas' },
  { value: '3', label: '3 estrellas' },
  { value: '4', label: '4 estrellas' },
  { value: '5', label: '5 estrellas' },
];

export function claveDe(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function textoFecha(clave) {
  if (!clave) return '';
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const [year, month, day] = clave.split('-').map(Number);
  return `${day} ${meses[month - 1]} ${year}`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export function filtrarCitasReporte(citas, { vista, barberoId, calificacion }) {
  return (citas || []).filter((cita) => {
    if ((cita.state_quotes || '').toLowerCase() !== 'finalizada') return false;
    if (vista === 'citas' && barberoId && String(cita.barber_id) !== String(barberoId)) return false;
    if (vista === 'calidad') {
      const nota = Number(cita.calificacion_servicio);
      if (!nota) return false;
      if (calificacion && String(nota) !== String(calificacion)) return false;
    }
    return true;
  });
}

export function resumenReporte(citasFiltradas, vista) {
  const grupos = new Map();
  citasFiltradas.forEach((cita) => {
    const nota = Number(cita.calificacion_servicio);
    const nombre = vista === 'calidad'
      ? `${nota} ${nota === 1 ? 'estrella' : 'estrellas'}`
      : (cita.name_service || 'Sin servicio');
    if (!grupos.has(nombre)) grupos.set(nombre, { nombre, valor: 0, clientes: new Set() });
    const actual = grupos.get(nombre);
    if (vista === 'calidad') actual.clientes.add(cita.user_id || cita.id_quotes);
    else actual.valor += 1;
  });
  if (vista === 'calidad') {
    grupos.forEach((grupo) => {
      grupo.valor = grupo.clientes.size;
    });
  }
  return [...grupos.values()]
    .sort((a, b) => b.valor - a.valor)
    .map(({ nombre, valor }) => ({ nombre, valor }));
}

export function filasDelInforme(citasFiltradas) {
  return citasFiltradas.map((cita) => ({
    fecha: formatDate(cita.date_time),
    hora: formatTime(cita.date_time),
    cliente: cita.client_name || 'N/A',
    barbero: cita.barber_name || 'N/A',
    servicio: cita.name_service || 'No disponible',
    valor: Number(cita.price) || 0,
    calificacion: Number(cita.calificacion_servicio) || '',
  }));
}

export function textoRangoInforme(fechaDesde, fechaHasta) {
  const hoy = claveDe(new Date());
  if (fechaDesde === hoy && fechaHasta === hoy) return 'Hoy';
  if (fechaDesde === fechaHasta) return textoFecha(fechaDesde);
  return `${textoFecha(fechaDesde)} – ${textoFecha(fechaHasta)}`;
}

export function tituloInforme({ vista, calificacion, fechaDesde, fechaHasta }) {
  if (vista === 'calidad') {
    return calificacion
      ? `Clientes con ${calificacion} ${String(calificacion) === '1' ? 'estrella' : 'estrellas'}`
      : 'Calificaciones del servicio';
  }
  const hoy = claveDe(new Date());
  return fechaDesde === hoy && fechaHasta === hoy ? 'Servicios del día' : 'Servicios del rango';
}

function etiquetaFiltro({ vista, barberoId, barberos, calificacion }) {
  if (vista === 'citas') {
    const barbero = (barberos || []).find((item) => String(item.user_id) === String(barberoId));
    return barbero ? barbero.full_name : 'Todos los barberos';
  }
  const nota = OPCIONES_CALIFICACION.find((opcion) => String(opcion.value) === String(calificacion));
  return nota ? nota.label : 'Todas las calificaciones';
}

function logoInforme() {
  return new Promise((resolve) => {
    const imagen = new Image();
    imagen.onload = () => {
      const lienzo = document.createElement('canvas');
      lienzo.width = imagen.width;
      lienzo.height = imagen.height;
      const contexto = lienzo.getContext('2d');
      contexto.drawImage(imagen, 0, 0);
      const pixeles = contexto.getImageData(0, 0, lienzo.width, lienzo.height).data;
      let minX = lienzo.width;
      let minY = lienzo.height;
      let maxX = 0;
      let maxY = 0;
      for (let y = 0; y < lienzo.height; y += 1) {
        for (let x = 0; x < lienzo.width; x += 1) {
          const i = (y * lienzo.width + x) * 4;
          if (pixeles[i + 3] < 20 || (pixeles[i] < 40 && pixeles[i + 1] < 40 && pixeles[i + 2] < 40)) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
      if (maxX <= minX) {
        resolve(null);
        return;
      }
      const altoCaja = maxY - minY + 1;
      const filas = new Array(altoCaja).fill(0);
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const i = (y * lienzo.width + x) * 4;
          if (pixeles[i + 3] < 20 || (pixeles[i] < 40 && pixeles[i + 1] < 40 && pixeles[i + 2] < 40)) continue;
          filas[y - minY] += 1;
        }
      }
      let vacio = 0;
      let inicioVacio = 0;
      let mejorLargo = 0;
      let mejorInicio = altoCaja;
      for (let i = Math.floor(altoCaja * 0.35); i < altoCaja; i += 1) {
        if (filas[i] === 0) {
          if (vacio === 0) inicioVacio = i;
          vacio += 1;
          if (vacio > mejorLargo) {
            mejorLargo = vacio;
            mejorInicio = inicioVacio;
          }
        } else {
          vacio = 0;
        }
      }
      const corte = mejorLargo > 6 ? minY + mejorInicio : minY + Math.round(altoCaja * 0.62);
      const margen = 16;
      const origenX = Math.max(0, minX - margen);
      const origenY = Math.max(0, minY - margen);
      const ancho = Math.min(lienzo.width - origenX, maxX - minX + 1 + margen * 2);
      const recorte = document.createElement('canvas');
      recorte.width = ancho;
      recorte.height = Math.max(1, Math.min(lienzo.height - origenY, corte - origenY));
      recorte.getContext('2d').drawImage(lienzo, origenX, origenY, recorte.width, recorte.height, 0, 0, recorte.width, recorte.height);
      recorte.toBlob(async (blob) => {
        resolve(blob ? new Uint8Array(await blob.arrayBuffer()) : null);
      }, 'image/png');
    };
    imagen.onerror = () => resolve(null);
    imagen.src = '/img/background/LOGO.png';
  });
}

export async function descargarInforme({
  vista,
  citas,
  fechaDesde,
  fechaHasta,
  barberoId = '',
  barberos = [],
  calificacion = '',
}) {
  const citasFiltradas = filtrarCitasReporte(citas, { vista, barberoId, calificacion });
  const filas = filasDelInforme(citasFiltradas);
  const titulo = tituloInforme({ vista, calificacion, fechaDesde, fechaHasta });
  const rango = textoRangoInforme(fechaDesde, fechaHasta);
  const filtro = etiquetaFiltro({ vista, barberoId, barberos, calificacion });
  const resumen = resumenReporte(citasFiltradas, vista).map((item) => [item.nombre, item.valor]);

  if (!filas.length) {
    return {
      descargado: false,
      vista,
      titulo,
      rango,
      filtro,
      filas: 0,
      totalDinero: 0,
    };
  }

  const encabezados = vista === 'citas'
    ? ['Fecha', 'Hora', 'Cliente', 'Barbero', 'Servicio', 'Valor']
    : ['Fecha', 'Cliente', 'Barbero', 'Servicio', 'Calificación'];
  const detalle = filas.map((fila) => (
    vista === 'citas'
      ? [fila.fecha, fila.hora, fila.cliente, fila.barbero, fila.servicio, fila.valor]
      : [fila.fecha, fila.cliente, fila.barbero, fila.servicio, fila.calificacion]
  ));
  const totalDinero = vista === 'citas'
    ? detalle.reduce((suma, fila) => suma + (Number(fila[fila.length - 1]) || 0), 0)
    : 0;
  const logo = await logoInforme();
  const archivo = crearInformeExcel({
    titulo,
    filtros: [
      ['Rango', rango],
      [vista === 'citas' ? 'Barbero' : 'Calificación', filtro],
    ],
    resumen,
    encabezados,
    detalle,
    totalDinero: vista === 'citas',
    logo,
  });
  const blob = new Blob([archivo], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `reporte-${vista}-${fechaDesde}-a-${fechaHasta}.xlsx`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);

  return {
    descargado: true,
    vista,
    titulo,
    rango,
    filtro,
    filas: detalle.length,
    totalDinero,
  };
}

export async function consultarYDescargarInforme({
  vista,
  fechaDesde,
  fechaHasta,
  barberoId = '',
  barberos = [],
  calificacion = '',
}) {
  const citas = await getReportQuotes(fechaDesde, fechaHasta);
  return descargarInforme({
    vista,
    citas,
    fechaDesde,
    fechaHasta,
    barberoId,
    barberos,
    calificacion,
  });
}
