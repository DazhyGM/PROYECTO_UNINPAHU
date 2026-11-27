import axios from 'axios';
import { getBarbers } from '@/services/api';
import { getAllServices } from '@/services/servicesApi';
import {
  createQuote,
  getAvailability,
  getQuotesWithServiceDetails,
  sendQuoteEmail,
} from '@/services/quotesApi';
import { claveDe, consultarYDescargarInforme } from '@/services/descargarReporte';
import { leerConModelo } from '@/services/cisoIa';
import { getBarberRatings } from '@/services/ratingsApi';

export const NOMBRE_CISO = 'Ciso';

const MESES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';
const INDICE_MES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7,
  septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};
const DIAS = [
  ['domingo', 0], ['lunes', 1], ['martes', 2], ['miercoles', 3],
  ['jueves', 4], ['viernes', 5], ['sabado', 6],
];

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inicioDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function sumarDias(fecha, dias) {
  const copia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function fechaValida(anio, mes, dia) {
  const fecha = new Date(anio, mes, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes || fecha.getDate() !== dia) return null;
  return fecha;
}

function decir(sesion, texto, opciones = [], listo = false) {
  sesion.opciones = opciones;
  return { texto, opciones, listo };
}

function citaVacia() {
  return {
    servicio: null,
    barbero: null,
    fecha: '',
    slot: null,
    horaDeseada: null,
    serviciosCandidatos: null,
  };
}

function reporteVacio() {
  return {
    vista: '',
    desde: '',
    hasta: '',
    barberoId: '',
    calificacion: '',
    nombreBarbero: '',
    pedirBarbero: false,
  };
}

function rolDe(sesion) {
  return String(sesion.usuario?.role || '').toLowerCase();
}

function esAdmin(sesion) {
  return rolDe(sesion) === 'admin';
}

function esCliente(sesion) {
  const rol = rolDe(sesion);
  return rol === 'client' || rol === 'cliente';
}

function esEmpleado(sesion) {
  const rol = rolDe(sesion);
  return rol === 'employee' || rol === 'empleado';
}

function pideInforme(n) {
  if (/\b(reporte|informes?|excel|descarg\w*|estadistic\w*)\b/.test(n)) return true;
  if (/\b(cuesta|vale|precio|precios)\b/.test(n)) return false;
  return /\b(cuanto|cuanta)\b/.test(n) && /\b(vend\w*|hic\w*|factur\w*|ingres\w*|servicio\w*)\b/.test(n);
}

function esCalificacionHablada(texto) {
  const n = normalizar(texto);
  if (/\b(reporte|informes?|excel|descarg\w*)\b/.test(n)) return false;
  return /\b(calificacion\w*|estrellas?|puntaje|recomend\w*|calidad)\b/.test(n);
}

function pideRecomendacion(n) {
  if (/\b(calificacion\w*|estrellas?|puntaje|mejor barbero)\b/.test(n)) return false;
  return /\b(sugier\w*|recomend\w*|look|estilo|cambio de|que me conviene|que me queda|no se que|que puedo hacerme|asesor\w*)\b/.test(n);
}

function pideGuia(n) {
  if (/\b(reporte|informes?|excel|descarg\w*)\b/.test(n)) return false;
  if (/\b(mi calificacion|mis estrellas|mi puntaje|como estoy)\b/.test(n)) return true;
  if (/\b(que servicios|cuales servicios|servicios hay|servicios tienes|servicios ofrecen|cuanto cuesta|cuanto vale|precio|precios)\b/.test(n)) return true;
  if (/\b(quienes son|que barberos|barberos hay|lista de barberos|barberos tienen|barberos trabajan)\b/.test(n)) return true;
  if (!/\b(calificacion\w*|estrellas?|puntaje|recomend\w*|mejor barbero)\b/.test(n)) return false;
  const preguntaPersona = /\b(barbero|barberos|tiene|tienen|esta|estan|mejor|peor|quien|quienes|recomiend)\b/.test(n);
  const periodo = /\b(hoy|ayer|semana|mes|desde|hasta|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.test(n);
  if (periodo && !preguntaPersona) return false;
  return true;
}

function intencionDe(texto) {
  const n = normalizar(texto);
  if (pideInforme(n)) return 'reporte';
  if (pideRecomendacion(n) || pideGuia(n)) return 'guia';
  if (/\b(calidad|calificacion\w*|estrella\w*)\b/.test(n)) return 'reporte';

  const agendar = /\b(agendar|agendame|agendeme|reserv\w*|nueva cita|sacar una cita|pedir una cita|programar)\b/.test(n)
    || (/\b(quiero|necesito|busco|hazme|haceme)\b/.test(n) && /\b(cita|corte|barba|ceja\w*|tinte\w*|fade|afeit\w*|perfil\w*|combo)\b/.test(n))
    || /\b(cortarme|afeitarme|perfilarme)\b/.test(n);
  const consultar = /\b(mis citas|mi agenda|que tengo|quien viene|quienes vienen|proxima cita|proximas citas|agenda de|citas de|cita de)\b/.test(n)
    || (/\bcitas?\b/.test(n) && !agendar);
  if (agendar) return 'cita';
  if (consultar) return 'citas';

  const hablaDeServicio = /\b(corte|barba|ceja\w*|tinte\w*|fade|afeit\w*|perfil\w*|combo)\b/.test(n);
  if (hablaDeServicio && interpretarFechas(texto, 'cita')) return 'cita';
  return '';
}

export function crearSesionCiso(usuario = {}) {
  return {
    usuario: {
      full_name: usuario.full_name || '',
      email: usuario.email || usuario.user_email || '',
      role: usuario.role || '',
      user_id: usuario.user_id || null,
    },
    paso: 'inicio',
    cita: citaVacia(),
    reporte: reporteVacio(),
    opciones: [],
    servicios: [],
    barberos: [],
    horarios: [],
    historial: [],
  };
}

export function saludoCiso(sesion) {
  const nombre = sesion.usuario.full_name || 'bienvenido';
  return decir(sesion, `Hola, ${nombre}. Soy ${NOMBRE_CISO}.\n¿En qué te puedo ayudar?`);
}

function cerrarCon(sesion, texto) {
  sesion.paso = 'inicio';
  sesion.cita = citaVacia();
  sesion.reporte = reporteVacio();
  sesion.horarios = [];
  return decir(sesion, texto, [], true);
}

function esReinicio(texto) {
  return /^(cancelar|cancela|mejor no|dejalo|olvidalo|volver al inicio|menu|inicio|otra cosa|salir)$/.test(texto);
}

function tareaActual(paso) {
  if (String(paso).startsWith('cita')) return 'cita';
  if (String(paso).startsWith('reporte')) return 'reporte';
  if (String(paso).startsWith('guia')) return 'guia';
  return '';
}

function esOtraTarea(paso, intencion) {
  const actual = tareaActual(paso);
  if (!actual || (intencion !== 'reporte' && intencion !== 'cita' && intencion !== 'citas' && intencion !== 'guia')) return false;
  if (intencion === 'guia') return false;
  if (actual === 'cita' && intencion === 'cita') return false;
  if (actual === 'reporte' && intencion === 'reporte') return false;
  if (actual === 'guia' && intencion === 'guia') return false;
  return true;
}

function pareceDeLaBarberia(texto) {
  const n = normalizar(texto);
  return /\b(cita|citas|agenda|reporte|informe|excel|servicio|barber|corte|barba|ceja|tinte|fade|afeit|perfil|combo|horario|hora|hoy|manana|semana|mes|calidad|calificacion|estrella|agendar|reserv|precio|cuesta|puntaje|recomiend|sugier|look|estilo)\b/.test(n)
    || Boolean(interpretarFechas(texto, 'reporte'));
}

function opcionPorTexto(sesion, texto) {
  const n = normalizar(texto);
  const lista = sesion.opciones || [];
  const exacta = lista.find((opcion) => normalizar(opcion.envio || opcion.etiqueta) === n || normalizar(opcion.etiqueta) === n);
  if (exacta) return exacta;
  const numero = n.match(/^(?:la |el |opcion )?(\d{1,2})$/);
  if (!numero) return null;
  return lista[Number(numero[1]) - 1] || null;
}

function mejorCoincidencia(lista, texto, nombreDe) {
  const n = normalizar(texto);
  if (n.length < 2) return [];
  const exactas = lista.filter((item) => normalizar(nombreDe(item)) === n);
  if (exactas.length) return exactas;
  const incluidas = lista.filter((item) => {
    const nombre = normalizar(nombreDe(item));
    return nombre.length > 2 && n.includes(nombre);
  });
  if (incluidas.length) {
    const mayor = Math.max(...incluidas.map((item) => normalizar(nombreDe(item)).length));
    return incluidas.filter((item) => normalizar(nombreDe(item)).length === mayor);
  }
  if (n.length < 3) return [];
  return lista.filter((item) => normalizar(nombreDe(item)).includes(n));
}

const PALABRAS_DE_CITA = new Set([
  'cita', 'citas', 'hoy', 'manana', 'pasado', 'ayer', 'reporte', 'informe', 'servicio',
  'servicios', 'barbero', 'quiero', 'necesito', 'busco', 'agendar', 'agendame', 'agendeme',
  'para', 'con', 'las', 'los', 'una', 'uno', 'del', 'dia', 'hora', 'favor', 'puedes',
  'podrias', 'haceme', 'hazme', 'reservar', 'nueva', 'sacar', 'pedir', 'programar',
]);

function serviciosMencionados(servicios, texto) {
  const nombreDe = (servicio) => servicio.name_service || servicio.name || '';
  const directos = mejorCoincidencia(servicios, texto, nombreDe);
  if (directos.length) return directos;
  const palabras = normalizar(texto).split(' ').filter((palabra) => (
    palabra.length > 3 && !PALABRAS_DE_CITA.has(palabra)
  ));
  const utiles = palabras.filter((palabra) => servicios.some((servicio) => normalizar(nombreDe(servicio)).includes(palabra)));
  if (!utiles.length) return [];
  return servicios.filter((servicio) => {
    const nombre = normalizar(nombreDe(servicio));
    return utiles.some((palabra) => nombre.includes(palabra));
  });
}

function textoCuando(sesion) {
  const partes = [];
  if (sesion.cita.fecha) partes.push(fechaLegible(sesion.cita.fecha).toLowerCase());
  const hora = sesion.cita.horaDeseada;
  if (hora) {
    const marca = hora.marca === 'pm' ? ' p.m.' : hora.marca === 'am' ? ' a.m.' : '';
    partes.push(`a las ${hora.h}:${String(hora.m).padStart(2, '0')}${marca}`);
  }
  return partes.join(' ');
}

function mejorBarbero(barberos, texto) {
  const directos = mejorCoincidencia(barberos, texto, (barbero) => barbero.full_name);
  if (directos.length) return directos;
  const n = normalizar(texto);
  const ignorar = new Set(['cita', 'citas', 'hoy', 'manana', 'ayer', 'reporte', 'informe', 'servicio', 'barbero', 'quiero', 'agendar']);
  return barberos.filter((barbero) => normalizar(barbero.full_name).split(' ').some((parte) => (
    parte.length > 2 && !ignorar.has(parte) && new RegExp(`\\b${parte}\\b`).test(n)
  )));
}

function marcar(fecha, hasta = fecha) {
  const hoy = inicioDia(new Date());
  const inicio = inicioDia(fecha);
  const fin = inicioDia(hasta);
  const desdeFecha = inicio <= fin ? inicio : fin;
  const hastaFecha = inicio <= fin ? fin : inicio;
  return {
    desde: claveDe(desdeFecha),
    hasta: claveDe(hastaFecha),
    pasada: hastaFecha < hoy,
  };
}

function resolverDiaMes(dia, mes, anio, modo) {
  const hoy = inicioDia(new Date());
  if (anio) return fechaValida(anio, mes, dia);
  const fecha = fechaValida(hoy.getFullYear(), mes, dia);
  if (!fecha) return null;
  if (modo === 'cita' && fecha < hoy) return fechaValida(hoy.getFullYear() + 1, mes, dia);
  return fecha;
}

function resolverDia(dia, modo) {
  const hoy = inicioDia(new Date());
  const fecha = fechaValida(hoy.getFullYear(), hoy.getMonth(), dia);
  if (!fecha) return null;
  if (modo === 'cita' && fecha < hoy) return fechaValida(hoy.getFullYear(), hoy.getMonth() + 1, dia);
  return fecha;
}

function anioCorto(valor) {
  if (!valor) return null;
  const numero = Number(valor);
  if (numero < 100) return 2000 + numero;
  return numero;
}

function interpretarFechas(texto, modo) {
  const n = normalizar(texto);
  const hoy = inicioDia(new Date());

  if (/\bsemana pasada\b/.test(n)) {
    const esta = rangoSemana(hoy);
    const lunes = sumarDias(new Date(`${esta.desde}T00:00:00`), -7);
    return marcar(lunes, sumarDias(lunes, 6));
  }
  if (/\bmes pasado\b/.test(n)) {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    return marcar(inicio, fin);
  }
  if (/\besta semana\b/.test(n)) return rangoSemana(hoy);
  if (/\beste mes\b/.test(n)) {
    return marcar(new Date(hoy.getFullYear(), hoy.getMonth(), 1), new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
  }
  if (/\bpasado manana\b/.test(n)) return marcar(sumarDias(hoy, 2));
  if (/\bmanana\b/.test(n)) return marcar(sumarDias(hoy, 1));
  if (/\bayer\b/.test(n)) return marcar(sumarDias(hoy, -1));
  if (/\bhoy\b/.test(n)) return marcar(hoy);

  for (let i = 0; i < DIAS.length; i += 1) {
    const [nombre, indice] = DIAS[i];
    if (!new RegExp(`\\b${nombre}\\b`).test(n)) continue;
    const incluirHoy = !new RegExp(`\\bproximo ${nombre}\\b`).test(n);
    let delta = (indice - hoy.getDay() + 7) % 7;
    if (delta === 0 && !incluirHoy) delta = 7;
    return marcar(sumarDias(hoy, delta));
  }

  const isoRango = n.match(/(\d{4}-\d{2}-\d{2})\s*(?:al|hasta|a)\s*(\d{4}-\d{2}-\d{2})/);
  if (isoRango) {
    const [anio1, mes1, dia1] = isoRango[1].split('-').map(Number);
    const [anio2, mes2, dia2] = isoRango[2].split('-').map(Number);
    const a = fechaValida(anio1, mes1 - 1, dia1);
    const b = fechaValida(anio2, mes2 - 1, dia2);
    if (a && b) return marcar(a, b);
  }

  const numerico = n.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s*(?:al|hasta|a)\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (numerico) {
    const a = resolverDiaMes(Number(numerico[1]), Number(numerico[2]) - 1, anioCorto(numerico[3]), modo);
    const b = resolverDiaMes(Number(numerico[4]), Number(numerico[5]) - 1, anioCorto(numerico[6] || numerico[3]), modo);
    if (a && b) return marcar(a, b);
  }

  const verbal = n.match(new RegExp(`(\\d{1,2})(?:\\s+de\\s+(${MESES}))?(?:\\s+de\\s+(\\d{4}))?\\s+(?:al|hasta el|y el|hasta|a)\\s+(?:el\\s+)?(\\d{1,2})(?:\\s+de\\s+(${MESES}))?(?:\\s+de\\s+(\\d{4}))?`));
  if (verbal) {
    const mes2 = verbal[5] ? INDICE_MES[verbal[5]] : null;
    const mes1 = verbal[2] ? INDICE_MES[verbal[2]] : mes2;
    const mes = mes1 == null ? hoy.getMonth() : mes1;
    const a = resolverDiaMes(Number(verbal[1]), mes, verbal[3] ? Number(verbal[3]) : null, modo);
    const b = resolverDiaMes(Number(verbal[4]), mes2 == null ? mes : mes2, verbal[6] ? Number(verbal[6]) : (verbal[3] ? Number(verbal[3]) : null), modo);
    if (a && b) return marcar(a, b);
  }

  const iso = n.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const fecha = fechaValida(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (fecha) return marcar(fecha);
  }

  const frase = n.match(new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${MESES})(?:\\s+de\\s+(\\d{4}))?`));
  if (frase) {
    const fecha = resolverDiaMes(Number(frase[1]), INDICE_MES[frase[2]], frase[3] ? Number(frase[3]) : null, modo);
    if (fecha) return marcar(fecha);
  }

  const corta = n.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (corta) {
    const fecha = resolverDiaMes(Number(corta[1]), Number(corta[2]) - 1, anioCorto(corta[3]), modo);
    if (fecha) return marcar(fecha);
  }

  const suelto = n.match(/^(?:el\s+)?(\d{1,2})$/);
  if (suelto) {
    const fecha = resolverDia(Number(suelto[1]), modo);
    if (fecha) return marcar(fecha);
  }

  return null;
}

function rangoSemana(base) {
  const dia = base.getDay();
  const hastaLunes = dia === 0 ? -6 : 1 - dia;
  const lunes = sumarDias(base, hastaLunes);
  return marcar(lunes, sumarDias(lunes, 6));
}

function etiquetaHora(hhmm) {
  const match = String(hhmm || '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return '';
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'p.m.' : 'a.m.';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${match[2]} ${suffix}`;
}

function etiquetaRango(slot) {
  return `${etiquetaHora(slot.start)} – ${etiquetaHora(slot.end)}`;
}

function fechaLegible(clave) {
  if (!clave) return '';
  const [year, month, day] = clave.split('-').map(Number);
  const texto = new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function pesos(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(Number(valor) || 0);
}

function sufijo(token) {
  if (!token) return '';
  if (/pm|tarde|noche/.test(token)) return 'pm';
  if (/am|manana/.test(token)) return 'am';
  return '';
}

function aReloj(hora, minuto, marca) {
  let h = Number(hora);
  const m = Number(minuto || 0);
  if (!Number.isFinite(h) || !Number.isFinite(m) || m > 59 || h > 23) return null;
  if (marca === 'pm' && h < 12) h += 12;
  if (marca === 'am' && h === 12) h = 0;
  if (h > 23) return null;
  return { h, m, marca };
}

function extraerHoraExplicita(texto) {
  const n = normalizar(texto);
  let match = n.match(/(?:a las|las)\s+(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm|de la manana|de la tarde|de la noche))?/);
  if (match) return aReloj(match[1], match[2] || 0, sufijo(match[3]));
  match = n.match(/\b(\d{1,2}):(\d{2})\s*(am|pm|de la manana|de la tarde|de la noche)?\b/);
  if (match) return aReloj(match[1], match[2], sufijo(match[3]));
  match = n.match(/\b(\d{1,2})\s*(am|pm|de la manana|de la tarde|de la noche)\b/);
  if (match) return aReloj(match[1], 0, sufijo(match[2]));
  return null;
}

function extraerHoraLibre(texto) {
  const explicita = extraerHoraExplicita(texto);
  if (explicita) return explicita;
  const n = normalizar(texto);
  if (/^\d{1,2}:\d{2}$/.test(n)) {
    const [hora, minuto] = n.split(':');
    return aReloj(hora, minuto, '');
  }
  if (/^\d{1,2}$/.test(n)) return aReloj(n, 0, '');
  return null;
}

function minutosDeReloj(valor) {
  const match = String(valor || '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function buscarHorario(horarios, reloj) {
  if (!reloj) return [];
  const objetivo = (reloj.h * 60) + reloj.m;
  const exactos = horarios.filter((slot) => minutosDeReloj(slot.start) === objetivo);
  if (exactos.length || reloj.marca || reloj.m !== 0) return exactos;
  const alternativas = [reloj.h, reloj.h + 12].filter((hora, indice, lista) => hora < 24 && lista.indexOf(hora) === indice);
  return horarios.filter((slot) => alternativas.includes(Math.floor(minutosDeReloj(slot.start) / 60)) && minutosDeReloj(slot.start) % 60 === 0);
}

function opcionesDe(lista, tipo, etiquetaDe, valorDe = (item) => item) {
  return lista.map((item) => {
    const etiqueta = etiquetaDe(item);
    return { etiqueta, envio: etiqueta, tipo, valor: valorDe(item) };
  });
}

function opcionesFecha() {
  return [
    { etiqueta: 'Hoy', envio: 'Hoy' },
    { etiqueta: 'Mañana', envio: 'Mañana' },
  ];
}

async function cargarPerfil(sesion) {
  if (sesion.usuario.user_id) return sesion.usuario;
  const token = localStorage.getItem('token');
  const { data } = await axios.get('http://localhost:5000/api/users/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  sesion.usuario = {
    full_name: data.full_name || sesion.usuario.full_name,
    email: data.user_email || sesion.usuario.email,
    role: data.role || sesion.usuario.role,
    user_id: data.user_id,
  };
  return sesion.usuario;
}

async function asegurarServicios(sesion) {
  if (sesion.servicios.length) return sesion.servicios;
  const data = await getAllServices();
  sesion.servicios = Array.isArray(data) ? data : [];
  return sesion.servicios;
}

async function asegurarBarberos(sesion) {
  if (sesion.barberos.length) return sesion.barberos;
  const data = await getBarbers();
  sesion.barberos = Array.isArray(data) ? data : [];
  return sesion.barberos;
}

function preguntarServicio(sesion, intro) {
  sesion.paso = 'cita_servicio';
  const lista = sesion.cita.serviciosCandidatos?.length ? sesion.cita.serviciosCandidatos : sesion.servicios;
  const cuando = textoCuando(sesion);
  const reducido = lista.length < sesion.servicios.length;
  const pregunta = cuando
    ? `Entendí ${cuando}. ${reducido ? 'Hay varios que coinciden. ' : ''}¿Cuál agendamos?`
    : (reducido ? 'Hay varios servicios que coinciden. ¿Cuál agendamos?' : '¿Qué servicio quieres agendar?');
  return decir(
    sesion,
    intro || pregunta,
    opcionesDe(lista, 'servicio', (servicio) => servicio.name_service || servicio.name),
  );
}

function preguntarBarbero(sesion, intro) {
  sesion.paso = 'cita_barbero';
  return decir(
    sesion,
    intro || '¿Con qué barbero?',
    opcionesDe(sesion.barberos, 'barbero', (barbero) => barbero.full_name),
  );
}

function preguntarFecha(sesion, intro) {
  sesion.paso = 'cita_fecha';
  const servicio = sesion.cita.servicio?.name_service || 'la cita';
  const barbero = sesion.cita.barbero?.full_name || 'el barbero';
  return decir(
    sesion,
    intro || `¿Qué día agendamos ${servicio} con ${barbero}?`,
    opcionesFecha(),
  );
}

function preguntarHora(sesion, intro) {
  sesion.paso = 'cita_hora';
  const opciones = opcionesDe(sesion.horarios, 'hora', etiquetaRango);
  const texto = intro || `El ${fechaLegible(sesion.cita.fecha)} estos son los horarios libres con ${sesion.cita.barbero.full_name}.\n¿A qué hora la agendamos?`;
  return decir(sesion, texto, opciones);
}

function pedirConfirmacion(sesion) {
  sesion.paso = 'cita_confirmar';
  const { servicio, barbero, fecha, slot } = sesion.cita;
  return decir(sesion, [
    'Así queda la cita:',
    `Servicio: ${servicio.name_service} (${pesos(servicio.price)})`,
    `Barbero: ${barbero.full_name}`,
    `Día: ${fechaLegible(fecha)}`,
    `Hora: ${etiquetaRango(slot)}`,
    '¿La confirmo?',
  ].join('\n'), [
    { etiqueta: 'Sí, confirmar', envio: 'Sí, confirmar' },
    { etiqueta: 'Otra hora', envio: 'Otra hora' },
    { etiqueta: 'Cancelar', envio: 'Cancelar' },
  ]);
}

async function cargarHorarios(sesion) {
  sesion.horarios = [];
  sesion.cita.slot = null;
  const servicioId = sesion.cita.servicio.id_services || sesion.cita.servicio.id;
  const availability = await getAvailability(sesion.cita.barbero.user_id, sesion.cita.fecha, servicioId);
  if (!availability.works) {
    const razones = {
      past: 'Ese día ya pasó.',
      finished: 'La jornada de ese barbero ya terminó hoy.',
      closed: 'El barbero no atiende ese día.',
    };
    sesion.cita.fecha = '';
    sesion.paso = 'cita_fecha';
    return decir(sesion, `${razones[availability.reason] || 'No hay atención ese día.'} ¿Qué otro día te sirve?`, opcionesFecha());
  }
  sesion.horarios = availability.slots || [];
  if (!sesion.horarios.length) {
    sesion.cita.fecha = '';
    sesion.paso = 'cita_fecha';
    return decir(sesion, 'No hay horarios libres ese día. Las horas ocupadas, de descanso o que ya pasaron no se pueden agendar. ¿Probamos con otra fecha?', opcionesFecha());
  }
  return null;
}

async function seguirCita(sesion) {
  if (!sesion.cita.servicio) return preguntarServicio(sesion);
  if (!sesion.cita.barbero) return preguntarBarbero(sesion);
  if (!sesion.cita.fecha) return preguntarFecha(sesion);
  if (!sesion.horarios.length) {
    try {
      const aviso = await cargarHorarios(sesion);
      if (aviso) return aviso;
    } catch (error) {
      sesion.cita.fecha = '';
      sesion.paso = 'cita_fecha';
      return decir(
        sesion,
        error?.response?.data?.message || 'No pude consultar los horarios. ¿Intentamos con otra fecha?',
        opcionesFecha(),
      );
    }
  }
  if (!sesion.cita.slot && sesion.cita.horaDeseada) {
    const hallados = buscarHorario(sesion.horarios, sesion.cita.horaDeseada);
    sesion.cita.horaDeseada = null;
    if (hallados.length === 1) sesion.cita.slot = hallados[0];
    if (hallados.length > 1) {
      sesion.paso = 'cita_hora';
      return decir(sesion, 'Hay más de un horario a esa hora. ¿Cuál dejo?', opcionesDe(hallados, 'hora', etiquetaRango));
    }
  }
  if (!sesion.cita.slot) return preguntarHora(sesion);
  return pedirConfirmacion(sesion);
}

async function rellenarCita(sesion, texto) {
  await asegurarServicios(sesion);
  await asegurarBarberos(sesion);
  const servicios = serviciosMencionados(sesion.servicios, texto);
  if (servicios.length === 1) {
    sesion.cita.servicio = servicios[0];
    sesion.cita.serviciosCandidatos = null;
  } else if (servicios.length > 1 && !sesion.cita.servicio) {
    sesion.cita.serviciosCandidatos = servicios;
  }
  const barberos = mejorBarbero(sesion.barberos, texto);
  if (barberos.length === 1) sesion.cita.barbero = barberos[0];
  const fechas = interpretarFechas(texto, 'cita');
  if (fechas && fechas.desde === fechas.hasta && !fechas.pasada && sesion.cita.fecha !== fechas.desde) {
    sesion.cita.fecha = fechas.desde;
    sesion.cita.slot = null;
    sesion.horarios = [];
  }
  const hora = extraerHoraExplicita(texto);
  if (hora) sesion.cita.horaDeseada = hora;
}

function sinPermisoCita(sesion) {
  if (esAdmin(sesion)) {
    return decir(
      sesion,
      'El administrador no agenda citas. Ese proceso lo hace el cliente.\nPuedo generarte un reporte o mostrarte las citas.',
    );
  }
  return decir(sesion, 'Las citas las agenda el cliente desde su cuenta.\nPuedo mostrarte tu agenda.');
}

function aplicarCitaModelo(sesion, extra) {
  if (!extra) return;
  if (!sesion.cita.servicio && extra.servicio) {
    const hallados = serviciosMencionados(sesion.servicios, extra.servicio);
    if (hallados.length === 1) sesion.cita.servicio = hallados[0];
    else if (hallados.length > 1) sesion.cita.serviciosCandidatos = hallados;
  }
  if (!sesion.cita.barbero && extra.barbero) {
    const hallados = mejorBarbero(sesion.barberos, extra.barbero);
    if (hallados.length === 1) sesion.cita.barbero = hallados[0];
  }
  if (!sesion.cita.fecha && extra.fecha) sesion.cita.fecha = extra.fecha;
  if (!sesion.cita.horaDeseada && extra.hora) {
    const reloj = extraerHoraExplicita(extra.hora) || extraerHoraLibre(extra.hora);
    if (reloj) sesion.cita.horaDeseada = reloj;
  }
}

async function empezarCita(sesion, texto, extra = null) {
  await cargarPerfil(sesion);
  if (!esCliente(sesion)) return sinPermisoCita(sesion);
  sesion.cita = citaVacia();
  sesion.horarios = [];
  if (!sesion.usuario.user_id) {
    return decir(sesion, 'No pude identificar tu usuario. Vuelve a iniciar sesión e inténtalo otra vez.');
  }
  await rellenarCita(sesion, texto);
  aplicarCitaModelo(sesion, extra);
  if (!sesion.servicios.length) return decir(sesion, 'Ahora no hay servicios activos para agendar.');
  if (!sesion.barberos.length) return decir(sesion, 'Ahora no hay barberos disponibles para agendar.');
  return seguirCita(sesion);
}

async function elegirServicio(sesion, texto) {
  await rellenarCita(sesion, texto);
  const opcion = opcionPorTexto(sesion, texto);
  if (opcion?.tipo === 'servicio') sesion.cita.servicio = opcion.valor;
  if (sesion.cita.servicio) return seguirCita(sesion);
  const hallados = mejorCoincidencia(sesion.servicios, texto, (servicio) => servicio.name_service || servicio.name || '');
  if (hallados.length > 1) {
    sesion.paso = 'cita_servicio';
    return decir(sesion, 'Encontré varios servicios parecidos. ¿Cuál es?', opcionesDe(hallados, 'servicio', (servicio) => servicio.name_service || servicio.name));
  }
  return preguntarServicio(sesion, 'No reconocí el servicio en lo que escribiste. Dime el nombre o elige uno.');
}

async function elegirBarbero(sesion, texto) {
  await rellenarCita(sesion, texto);
  const opcion = opcionPorTexto(sesion, texto);
  if (opcion?.tipo === 'barbero') sesion.cita.barbero = opcion.valor;
  if (sesion.cita.barbero) return seguirCita(sesion);
  const hallados = mejorBarbero(sesion.barberos, texto);
  if (hallados.length > 1) {
    sesion.paso = 'cita_barbero';
    return decir(sesion, 'Encontré varios barberos. ¿Con cuál?', opcionesDe(hallados, 'barbero', (barbero) => barbero.full_name));
  }
  return preguntarBarbero(sesion, 'No reconocí el barbero en lo que escribiste. Dime el nombre o elige uno.');
}

async function elegirFecha(sesion, texto) {
  await rellenarCita(sesion, texto);
  if (!sesion.cita.fecha) {
    const opcion = opcionPorTexto(sesion, texto);
    const fechas = interpretarFechas(opcion ? (opcion.envio || opcion.etiqueta) : texto, 'cita');
    if (!fechas) {
      sesion.paso = 'cita_fecha';
      return decir(sesion, 'Dime el día. Puede ser hoy, mañana, un día de la semana o una fecha como 21 de noviembre.', opcionesFecha());
    }
    if (fechas.desde !== fechas.hasta) {
      sesion.paso = 'cita_fecha';
      return decir(sesion, 'Para la cita necesito un solo día. ¿Cuál eliges?', opcionesFecha());
    }
    if (fechas.pasada) {
      sesion.paso = 'cita_fecha';
      return decir(sesion, 'Ese día ya pasó. Elige hoy o una fecha más adelante.', opcionesFecha());
    }
    sesion.cita.fecha = fechas.desde;
    sesion.cita.slot = null;
    sesion.horarios = [];
  }
  return seguirCita(sesion);
}

async function elegirHora(sesion, texto) {
  const fechaAntes = sesion.cita.fecha;
  const servicioAntes = sesion.cita.servicio;
  const barberoAntes = sesion.cita.barbero;
  await rellenarCita(sesion, texto);
  if (sesion.cita.fecha !== fechaAntes || sesion.cita.servicio !== servicioAntes || sesion.cita.barbero !== barberoAntes) {
    return seguirCita(sesion);
  }
  const opcion = opcionPorTexto(sesion, texto);
  if (opcion?.tipo === 'hora') {
    sesion.cita.slot = opcion.valor;
    return pedirConfirmacion(sesion);
  }
  const hallados = buscarHorario(sesion.horarios, extraerHoraLibre(texto));
  if (hallados.length === 1) {
    sesion.cita.slot = hallados[0];
    return pedirConfirmacion(sesion);
  }
  if (hallados.length > 1) {
    sesion.paso = 'cita_hora';
    return decir(sesion, 'Hay más de un horario a esa hora. ¿Cuál dejo?', opcionesDe(hallados, 'hora', etiquetaRango));
  }
  return preguntarHora(sesion, 'No encontré ese horario entre los disponibles. Elige uno de la lista.');
}

async function enviarCorreoCita(sesion) {
  if (!sesion.usuario.email) return false;
  const [year, month, day] = sesion.cita.fecha.split('-');
  await sendQuoteEmail({
    email: sesion.usuario.email,
    servicio: sesion.cita.servicio.name_service || sesion.cita.servicio.name,
    fecha: `${day}/${month}/${year}`,
    hora: etiquetaHora(sesion.cita.slot.start),
    barbero: sesion.cita.barbero.full_name,
    total: Number(sesion.cita.servicio.price) || 0,
  });
  return true;
}

async function crearLaCita(sesion) {
  await cargarPerfil(sesion);
  if (!esCliente(sesion)) return sinPermisoCita(sesion);
  const servicio = sesion.cita.servicio;
  const hora = String(sesion.cita.slot.start).match(/(\d{1,2}):(\d{2})/);
  await createQuote({
    user_id: sesion.usuario.user_id,
    barber_id: sesion.cita.barbero.user_id,
    date_time: `${sesion.cita.fecha} ${hora[1].padStart(2, '0')}:${hora[2]}:00`,
    state_quotes: 'pendiente',
    id_services: servicio.id_services || servicio.id,
  });
  let correoOk = false;
  try {
    correoOk = await enviarCorreoCita(sesion);
  } catch (error) {
    correoOk = false;
  }
  const detalle = `${servicio.name_service} con ${sesion.cita.barbero.full_name}, el ${fechaLegible(sesion.cita.fecha)} a las ${etiquetaHora(sesion.cita.slot.start)}.`;
  const aviso = correoOk
    ? `Listo. La cita quedó agendada y envié el correo de confirmación. ${detalle}`
    : `La cita quedó agendada. ${detalle} No pude enviar el correo de confirmación.`;
  return cerrarCon(sesion, aviso);
}

async function confirmarCita(sesion, texto) {
  const n = normalizar(texto);
  if (n.includes('otra hora') || n.includes('cambiar hora')) {
    sesion.cita.slot = null;
    return preguntarHora(sesion, '¿Qué otro horario prefieres?');
  }
  if (n.includes('otra fecha') || n.includes('otro dia')) {
    sesion.cita.slot = null;
    sesion.cita.fecha = '';
    sesion.horarios = [];
    return preguntarFecha(sesion, '¿Qué día la movemos?');
  }
  if (/^(si|confirmo|confirmar|dale|ok|listo|correcto|adelante)\b/.test(n) || n.includes('confirmar')) {
    try {
      return await crearLaCita(sesion);
    } catch (error) {
      const mensaje = error?.response?.data?.message || 'No pude agendar la cita.';
      sesion.paso = 'cita_confirmar';
      return decir(sesion, `${mensaje} ¿Quieres intentar con otra hora?`, [
        { etiqueta: 'Otra hora', envio: 'Otra hora' },
        { etiqueta: 'Cancelar', envio: 'Cancelar' },
      ]);
    }
  }
  if (/^no\b/.test(n)) {
    sesion.paso = 'cita_confirmar';
    return decir(sesion, 'Sin problema. ¿Qué quieres cambiar?', [
      { etiqueta: 'Otra hora', envio: 'Otra hora' },
      { etiqueta: 'Otra fecha', envio: 'Otra fecha' },
      { etiqueta: 'Cancelar', envio: 'Cancelar' },
    ]);
  }
  return pedirConfirmacion(sesion);
}

function fechaClaveCita(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return claveDe(fecha);
}

function horaDeCita(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return etiquetaHora(`${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`);
}

async function citasDeTodos() {
  const token = localStorage.getItem('token');
  const response = await axios.get('http://localhost:5000/api/quotes/detalles', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function listarCitas(sesion, texto, fechasModelo = null) {
  const perfil = await cargarPerfil(sesion);
  const admin = esAdmin(sesion);
  const empleado = esEmpleado(sesion);
  const citas = admin ? await citasDeTodos() : await getQuotesWithServiceDetails(perfil.user_id);
  const hoy = claveDe(new Date());
  const fechas = interpretarFechas(texto, 'reporte') || fechasModelo;
  let visibles = (Array.isArray(citas) ? citas : []).filter((cita) => (cita.state_quotes || '').toLowerCase() === 'pendiente');
  if (empleado) visibles = visibles.filter((cita) => Number(cita.barber_id) === Number(perfil.user_id));
  if (!admin && !empleado) visibles = visibles.filter((cita) => Number(cita.user_id) === Number(perfil.user_id));
  visibles = visibles.filter((cita) => {
    const clave = fechaClaveCita(cita.date_time);
    if (fechas) return clave >= fechas.desde && clave <= fechas.hasta;
    return clave >= hoy;
  });
  visibles.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
  const periodo = !fechas
    ? ''
    : fechas.desde === fechas.hasta
      ? ` del ${fechaLegible(fechas.desde)}`
      : ` del ${fechaLegible(fechas.desde)} al ${fechaLegible(fechas.hasta)}`;
  if (!visibles.length) {
    const frase = admin ? 'No hay citas pendientes' : 'No tienes citas pendientes';
    return cerrarCon(sesion, `${frase}${periodo || ' por ahora'}.`);
  }
  const top = visibles.slice(0, 6);
  const lineas = top.map((cita, indice) => {
    const quien = admin || empleado ? (cita.client_name || 'Sin cliente') : (cita.barber_name || 'Sin barbero');
    const papel = admin || empleado ? 'Cliente' : 'Barbero';
    return `${indice + 1}. ${fechaLegible(fechaClaveCita(cita.date_time))} · ${horaDeCita(cita.date_time)} · ${cita.name_service || 'Servicio'} · ${papel}: ${quien}`;
  });
  const titulo = admin
    ? `Citas pendientes${periodo || ' próximas'}:`
    : empleado
      ? `Tu agenda${periodo || ' próxima'}:`
      : `Tus citas${periodo || ' próximas'}:`;
  const resto = visibles.length > top.length ? `\nY ${visibles.length - top.length} más en el módulo de citas.` : '';
  return cerrarCon(sesion, `${titulo}\n${lineas.join('\n')}${resto}`);
}

function leerReporte(texto) {
  const n = normalizar(texto);
  const parcial = {};
  const estrellas = n.match(/\b([1-5])\s*estrella/);
  if (estrellas) {
    parcial.vista = 'calidad';
    parcial.calificacion = estrellas[1];
  } else if (/\bcalidad\b|\bcalificacion\b|\bestrella/.test(n)) parcial.vista = 'calidad';
  else if (/\bcitas\b|\bservicios\b|\bvend\w*|\bingres\w*|\bfactur\w*|\bcuanto\b|\bcuanta\b/.test(n)) parcial.vista = 'citas';

  const fechas = interpretarFechas(texto, 'reporte');
  if (fechas) {
    parcial.desde = fechas.desde;
    parcial.hasta = fechas.hasta;
  }
  const barbero = n.match(/\bbarbero\s+([a-z]+(?:\s+[a-z]+){0,3})/);
  if (barbero) {
    const nombre = barbero[1]
      .replace(/\b(de|del|hoy|ayer|este|esta|semana|mes|pasado|pasada|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b.*$/, '')
      .trim();
    if (nombre && !/^(todos|todas|el|la)$/.test(nombre)) parcial.nombreBarbero = nombre;
  }
  return parcial;
}

function aplicarReporte(sesion, texto) {
  const leido = leerReporte(texto);
  if (leido.vista) sesion.reporte.vista = leido.vista;
  if (leido.desde) {
    sesion.reporte.desde = leido.desde;
    sesion.reporte.hasta = leido.hasta;
  }
  if (leido.calificacion) sesion.reporte.calificacion = leido.calificacion;
  if (leido.nombreBarbero) sesion.reporte.nombreBarbero = leido.nombreBarbero;
}

async function resolverEleccionBarbero(sesion, texto) {
  const n = normalizar(texto);
  if (/\btodos\b/.test(n)) {
    sesion.reporte.barberoId = '';
    sesion.reporte.nombreBarbero = '';
    return null;
  }
  const opcion = opcionPorTexto(sesion, texto);
  if (opcion?.tipo === 'barbero') {
    sesion.reporte.barberoId = opcion.valor ? opcion.valor.user_id : '';
    sesion.reporte.nombreBarbero = '';
    return null;
  }
  const hallados = mejorBarbero(sesion.barberos, texto);
  if (hallados.length === 1) {
    sesion.reporte.barberoId = hallados[0].user_id;
    sesion.reporte.nombreBarbero = '';
    return null;
  }
  return decir(sesion, 'Elige el barbero de la lista, o dime que sea con todos.', sesion.opciones);
}

async function resolverNombreBarbero(sesion) {
  await asegurarBarberos(sesion);
  const nombre = sesion.reporte.nombreBarbero;
  const hallados = mejorBarbero(sesion.barberos, nombre);
  sesion.reporte.nombreBarbero = '';
  if (hallados.length === 1) {
    sesion.reporte.barberoId = hallados[0].user_id;
    return null;
  }
  const lista = hallados.length ? hallados : sesion.barberos;
  sesion.paso = 'reporte_barbero';
  const opciones = opcionesDe(lista, 'barbero', (barbero) => barbero.full_name);
  opciones.push({ etiqueta: 'Todos los barberos', envio: 'Todos los barberos', tipo: 'barbero', valor: null });
  const aviso = hallados.length
    ? `Encontré varios barberos para "${nombre}". ¿Cuál incluyo en el reporte?`
    : `No encontré un barbero llamado "${nombre}". ¿Cuál uso, o lo dejo con todos?`;
  return decir(sesion, aviso, opciones);
}

async function ejecutarReporte(sesion) {
  await asegurarBarberos(sesion);
  const resultado = await consultarYDescargarInforme({
    vista: sesion.reporte.vista,
    fechaDesde: sesion.reporte.desde,
    fechaHasta: sesion.reporte.hasta,
    barberoId: sesion.reporte.barberoId,
    barberos: sesion.barberos,
    calificacion: sesion.reporte.calificacion,
  });
  if (!resultado.descargado) {
    sesion.reporte.desde = '';
    sesion.reporte.hasta = '';
    sesion.paso = 'reporte_fechas';
    return decir(
      sesion,
      `No hay información para ese filtro: ${resultado.titulo}, ${resultado.rango}, ${resultado.filtro}. Prueba con otras fechas.`,
      [
        { etiqueta: 'Hoy', envio: 'Hoy' },
        { etiqueta: 'Esta semana', envio: 'Esta semana' },
        { etiqueta: 'Este mes', envio: 'Este mes' },
      ],
    );
  }
  const extra = resultado.vista === 'citas'
    ? ` Son ${resultado.filas} servicios, por ${pesos(resultado.totalDinero)}.`
    : ` Quedaron ${resultado.filas} registros.`;
  return cerrarCon(
    sesion,
    `Listo. Descargué el mismo informe del módulo de reportes: ${resultado.titulo}, ${resultado.rango}, ${resultado.filtro}.${extra}`,
  );
}

async function seguirReporte(sesion, texto) {
  if (texto) aplicarReporte(sesion, texto);
  if (sesion.paso === 'reporte_barbero') {
    const elegido = await resolverEleccionBarbero(sesion, texto);
    if (elegido) return elegido;
  }
  if (!esAdmin(sesion)) {
    const alternativa = esCliente(sesion)
      ? 'Puedo agendarte una cita, mostrarte las que ya tienes o decirte la calificación de un barbero.'
      : 'Puedo mostrarte tu agenda o la calificación de los barberos.';
    return cerrarCon(sesion, `Los reportes los genera el administrador. ${alternativa}`);
  }
  if (!sesion.reporte.vista) {
    sesion.paso = 'reporte_tipo';
    return decir(sesion, '¿Qué informe quieres? Es el mismo que se descarga en el módulo de reportes.', [
      { etiqueta: 'Por citas', envio: 'Por citas' },
      { etiqueta: 'Por calidad del servicio', envio: 'Por calidad' },
    ]);
  }
  if (!sesion.reporte.desde || !sesion.reporte.hasta) {
    sesion.paso = 'reporte_fechas';
    return decir(sesion, '¿De qué fechas lo genero? También puedes escribir un rango, por ejemplo: del 1 al 15 de noviembre.', [
      { etiqueta: 'Hoy', envio: 'Hoy' },
      { etiqueta: 'Esta semana', envio: 'Esta semana' },
      { etiqueta: 'Este mes', envio: 'Este mes' },
    ]);
  }
  const eleccion = await cerrarBarberoReporte(sesion, texto);
  if (eleccion) return eleccion;
  return ejecutarReporte(sesion);
}

const PIDE_TODOS_LOS_BARBEROS = /\b(todos los barberos|de todos los barberos|con todos)\b/;

function quiereUnBarbero(texto) {
  const n = normalizar(texto);
  if (PIDE_TODOS_LOS_BARBEROS.test(n)) return false;
  if (/\b(barber[oa]s?|estilista)\b/.test(n)) return true;
  return /\bsolo (de|del|con)\s+(?!este\b|esta\b|hoy\b|ayer\b|el\b|la\b)/.test(n);
}

function preguntarBarberoReporte(sesion, texto) {
  sesion.paso = 'reporte_barbero';
  const opciones = opcionesDe(sesion.barberos, 'barbero', (barbero) => barbero.full_name);
  opciones.push({ etiqueta: 'Todos los barberos', envio: 'Todos los barberos', tipo: 'barbero', valor: null });
  return decir(sesion, texto, opciones);
}

async function cerrarBarberoReporte(sesion, texto) {
  if (sesion.reporte.barberoId) return null;
  await asegurarBarberos(sesion);
  if (sesion.reporte.nombreBarbero) return resolverNombreBarbero(sesion);
  const n = normalizar(texto);
  if (PIDE_TODOS_LOS_BARBEROS.test(n)) return null;
  const hallados = mejorBarbero(sesion.barberos, texto);
  if (hallados.length === 1) {
    sesion.reporte.barberoId = hallados[0].user_id;
    return null;
  }
  if (hallados.length > 1) {
    sesion.reporte.nombreBarbero = texto;
    return resolverNombreBarbero(sesion);
  }
  if (sesion.reporte.pedirBarbero || quiereUnBarbero(texto)) {
    return preguntarBarberoReporte(sesion, '¿De qué barbero quieres el reporte? Dime el nombre.');
  }
  return null;
}

function textoAyuda(sesion) {
  if (esAdmin(sesion)) {
    return 'Puedo armarte el reporte de servicios o el de calidad, de las fechas que escribas y de un barbero si lo nombras. Por ejemplo: «reporte de servicios de este mes de Alberto Díaz» o «calificaciones de la semana pasada».\nTambién te digo qué citas hay un día.\n¿En qué te ayudo?';
  }
  if (esEmpleado(sesion)) {
    return 'Puedo decirte tu agenda y tu calificación. Por ejemplo: «qué citas tengo hoy», «mi agenda de mañana» o «cuál es mi calificación».\n¿En qué te ayudo?';
  }
  return 'Puedo agendarte una cita, revisar las que ya tienes, contarte los servicios y decirte la calificación de un barbero. Por ejemplo: «necesito un corte mañana a las 3», «qué citas tengo el viernes» o «qué calificación tiene Alberto Díaz».\n¿En qué te ayudo?';
}

const LIMITE_TEMA = 'Solo puedo ayudarte con lo de MysticalCut: citas, servicios, barberos, sus calificaciones y reportes.';

function recordarHilo(sesion, aviso) {
  const opciones = [...(sesion.opciones || [])];
  if (sesion.paso === 'inicio' || !opciones.length) {
    return decir(sesion, aviso);
  }
  return decir(sesion, `${aviso}\nSeguimos con lo que estábamos haciendo.`, opciones);
}

function noEntendi(sesion) {
  return recordarHilo(sesion, 'No me quedó claro, pero sigo en lo de la barbería. Dime la cita, el servicio, la calificación o el reporte que necesitas.');
}

async function atenderInicio(sesion, texto) {
  const intencion = intencionDe(texto);
  if (intencion === 'reporte') {
    if (!esAdmin(sesion) && esCalificacionHablada(texto)) return responderGuia(sesion, texto);
    sesion.reporte = reporteVacio();
    sesion.paso = 'reporte_tipo';
    return seguirReporte(sesion, texto);
  }
  if (intencion === 'cita') {
    if (!esCliente(sesion)) return sinPermisoCita(sesion);
    return empezarCita(sesion, texto);
  }
  if (intencion === 'citas') return listarCitas(sesion, texto);
  if (/\b(hola|ayuda|que puedes|que haces|menu)\b/.test(normalizar(texto))) {
    return decir(sesion, textoAyuda(sesion));
  }
  if (/^(gracias|ok|vale|perfecto|listo|bueno|dale)$/.test(normalizar(texto))) {
    return recordarHilo(sesion, 'Cuando quieras seguimos con tus citas, servicios o reportes.');
  }
  if (!pareceDeLaBarberia(texto)) return recordarHilo(sesion, LIMITE_TEMA);
  return noEntendi(sesion);
}

function soltarTarea(sesion) {
  sesion.cita = citaVacia();
  sesion.reporte = reporteVacio();
  sesion.horarios = [];
  sesion.paso = 'inicio';
}

function notaCorta(fila) {
  const nota = Number(fila.promedio).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const veces = fila.total === 1 ? '1 calificación' : `${fila.total} calificaciones`;
  return `${nota} de 5 (${veces})`;
}

function textoNota(fila) {
  if (!fila || !fila.total || fila.promedio == null) {
    return `${fila?.full_name || 'Ese barbero'} todavía no tiene calificaciones de clientes.`;
  }
  return `${fila.full_name} tiene ${notaCorta(fila)}.`;
}

function textoRanking(filas) {
  const conNota = filas
    .filter((fila) => fila.total > 0 && fila.promedio != null)
    .sort((a, b) => b.promedio - a.promedio || a.full_name.localeCompare(b.full_name, 'es'));
  const sinNota = filas.filter((fila) => !fila.total);
  if (!conNota.length) return 'Todavía no hay calificaciones de los barberos.';
  const lineas = conNota.map((fila, indice) => `${indice + 1}. ${fila.full_name}: ${notaCorta(fila)}`);
  const extra = sinNota.length
    ? `\nSin calificaciones todavía: ${sinNota.map((fila) => fila.full_name).join(', ')}.`
    : '';
  return `Así van las calificaciones de los barberos:\n${lineas.join('\n')}${extra}`;
}

function avisoDeFechas(texto) {
  if (!interpretarFechas(texto, 'reporte')) return '';
  return '\nEse promedio junta todas las calificaciones, no solo las de esas fechas. El informe por fechas lo genera el administrador.';
}

function pideLaPropia(texto) {
  return /\b(mi calificacion|mis estrellas|mi puntaje|como estoy)\b/.test(normalizar(texto));
}

function pideRanking(texto) {
  return /\b(todos|todas|el mejor|la mejor|mejor barbero|mejor calificad\w*|quien tiene|quienes tienen|ranking)\b/.test(normalizar(texto));
}

function tipoGuia(texto, paso, lectura) {
  const n = normalizar(texto);
  if (pideRecomendacion(n)) return 'recomendacion';
  if (paso === 'guia_barbero') return 'calificacion';
  if (/\b(calificacion\w*|estrellas?|puntaje|mejor barbero|como estoy)\b/.test(n)) return 'calificacion';
  if (/\b(cuesta|vale|precio|precios|que servicios|servicios hay|servicios tienes)\b/.test(n)) return 'servicios';
  if (/\b(quienes son|que barberos|barberos hay|lista de barberos)\b/.test(n)) return 'barberos';
  const tema = lectura?.guia;
  if (tema === 'recomendacion' || tema === 'servicios' || tema === 'barberos' || tema === 'calificacion') return tema;
  if (paso === 'guia_servicio') return 'recomendacion';
  return 'servicios';
}

async function notasDeBarberos(sesion) {
  await asegurarBarberos(sesion);
  const notas = await getBarberRatings();
  const porId = new Map((Array.isArray(notas) ? notas : []).map((fila) => [Number(fila.id_barbero), fila]));
  return sesion.barberos.map((barbero) => {
    const fila = porId.get(Number(barbero.user_id));
    return {
      user_id: barbero.user_id,
      full_name: barbero.full_name,
      promedio: fila ? fila.promedio : null,
      total: fila ? fila.total : 0,
    };
  });
}

function opcionesDeNotas(filas) {
  const opciones = opcionesDe(filas, 'barbero', (fila) => fila.full_name);
  opciones.push({ etiqueta: 'El mejor calificado', envio: 'El mejor calificado', tipo: 'barbero', valor: null });
  return opciones;
}

function entregarGuia(sesion, texto, opciones, listo, abierta) {
  if (abierta) return { texto };
  if (listo) return cerrarCon(sesion, texto);
  return decir(sesion, texto, opciones);
}

function recortar(texto, limite) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= limite) return limpio;
  return `${limpio.slice(0, limite - 1).trim()}…`;
}

function sumarServicios(destino, vistos, lista) {
  lista.forEach((servicio) => {
    const id = servicio.id_services || servicio.id || servicio.name_service;
    if (vistos.has(id) || destino.length >= 4) return;
    vistos.add(id);
    destino.push(servicio);
  });
}

function serviciosParaProponer(servicios, texto, propuesta) {
  const elegidos = [];
  const vistos = new Set();
  const nombrados = (propuesta || []).flatMap((nombre) => serviciosMencionados(servicios, nombre));
  sumarServicios(elegidos, vistos, nombrados);
  sumarServicios(elegidos, vistos, serviciosMencionados(servicios, texto));
  if (elegidos.length) return elegidos;
  const porCategoria = [];
  const categorias = new Set();
  servicios.forEach((servicio) => {
    const clave = servicio.category_name || 'general';
    if (categorias.has(clave)) return;
    categorias.add(clave);
    porCategoria.push(servicio);
  });
  sumarServicios(elegidos, vistos, porCategoria);
  sumarServicios(elegidos, vistos, servicios);
  return elegidos;
}

async function textoRecomendacion(sesion, texto, lectura) {
  await asegurarServicios(sesion);
  const lista = serviciosParaProponer(sesion.servicios, texto, lectura?.propuesta);
  if (!lista.length) return { texto: 'Ahora no hay servicios activos para proponerte.', opciones: [] };
  const lineas = lista.map((servicio) => {
    const nombre = servicio.name_service || servicio.name;
    const detalle = recortar(servicio.description, 90);
    return `• ${nombre}: ${pesos(servicio.price)}${detalle ? `. ${detalle}` : ''}`;
  });
  const intro = pideRecomendacion(normalizar(texto))
    ? 'Para un cambio de look, con lo que hay en la barbería te propongo:'
    : 'Te propongo estos servicios:';
  const cierre = esCliente(sesion) ? '\nElige uno y te lo agendo.' : '';
  const opciones = esCliente(sesion)
    ? lista.map((servicio) => {
      const nombre = servicio.name_service || servicio.name;
      return { etiqueta: nombre, envio: `Quiero agendar ${nombre}` };
    })
    : [];
  return { texto: `${intro}\n${lineas.join('\n')}${cierre}`, opciones };
}

async function textoServicios(sesion, texto) {
  await asegurarServicios(sesion);
  const mencionados = serviciosMencionados(sesion.servicios, texto);
  const lista = mencionados.length ? mencionados : sesion.servicios;
  if (!lista.length) return 'Ahora no hay servicios activos.';
  const lineas = lista.slice(0, 8).map((servicio) => `• ${servicio.name_service || servicio.name}: ${pesos(servicio.price)}`);
  const resto = lista.length > 8 ? `\nY ${lista.length - 8} más en el módulo de servicios.` : '';
  const titulo = mencionados.length ? 'Esto es lo que coincide:' : 'Estos son los servicios:';
  const cierre = esCliente(sesion) ? '\nSi quieres, te agendo uno.' : '';
  return `${titulo}\n${lineas.join('\n')}${resto}${cierre}`;
}

async function textoBarberos(sesion) {
  await asegurarBarberos(sesion);
  if (!sesion.barberos.length) return 'Ahora no hay barberos disponibles.';
  const nombres = sesion.barberos.map((barbero) => barbero.full_name).join(', ');
  return `Los barberos son: ${nombres}.\nPuedo decirte la calificación de cualquiera.`;
}

async function guiaCalificacion(sesion, texto, abierta) {
  const notas = await notasDeBarberos(sesion);
  if (!notas.length) return entregarGuia(sesion, 'Ahora no hay barberos para consultar.', [], true, abierta);
  const cierreCliente = !abierta && esCliente(sesion) ? '\nSi te gusta alguno, te agendo la cita.' : '';

  if (pideLaPropia(texto)) {
    if (esEmpleado(sesion)) {
      await cargarPerfil(sesion);
      const propia = notas.find((fila) => Number(fila.user_id) === Number(sesion.usuario.user_id));
      const frase = propia ? textoNota(propia) : 'No encontré tu perfil entre los barberos activos.';
      return entregarGuia(sesion, frase, [], true, abierta);
    }
    if (abierta) return entregarGuia(sesion, `${textoRanking(notas)}${cierreCliente}`, [], true, true);
    sesion.paso = 'guia_barbero';
    return entregarGuia(sesion, 'Las calificaciones que puedo contarte son las de los barberos. ¿De cuál quieres saber?', opcionesDeNotas(notas), false, false);
  }

  if (pideRanking(texto)) {
    return entregarGuia(sesion, `${textoRanking(notas)}${avisoDeFechas(texto)}${cierreCliente}`, [], true, abierta);
  }

  const opcion = opcionPorTexto(sesion, texto);
  if (opcion?.tipo === 'barbero' && !opcion.valor) {
    return entregarGuia(sesion, `${textoRanking(notas)}${cierreCliente}`, [], true, abierta);
  }
  if (opcion?.tipo === 'barbero' && opcion.valor) {
    const fila = notas.find((item) => Number(item.user_id) === Number(opcion.valor.user_id))
      || { full_name: opcion.etiqueta, promedio: null, total: 0 };
    return entregarGuia(sesion, `${textoNota(fila)}${avisoDeFechas(texto)}`, [], true, abierta);
  }

  const hallados = mejorBarbero(notas, texto);
  if (hallados.length === 1) {
    return entregarGuia(sesion, `${textoNota(hallados[0])}${avisoDeFechas(texto)}`, [], true, abierta);
  }
  if (hallados.length > 1) {
    if (abierta) {
      return entregarGuia(sesion, hallados.map((fila) => textoNota(fila)).join('\n'), [], true, true);
    }
    sesion.paso = 'guia_barbero';
    return entregarGuia(sesion, 'Encontré varios barberos. ¿De cuál quieres la calificación?', opcionesDe(hallados, 'barbero', (fila) => fila.full_name), false, false);
  }
  if (abierta) return entregarGuia(sesion, `${textoRanking(notas)}${cierreCliente}`, [], true, true);
  sesion.paso = 'guia_barbero';
  return entregarGuia(sesion, '¿De qué barbero quieres la calificación?', opcionesDeNotas(notas), false, false);
}

async function guiaRecomendacion(sesion, texto, lectura, abierta) {
  const cuerpo = await textoRecomendacion(sesion, texto, lectura);
  if (!abierta) sesion.paso = 'guia_servicio';
  return entregarGuia(sesion, cuerpo.texto, cuerpo.opciones, false, abierta);
}

async function armarGuia(sesion, texto, abierta, lectura) {
  const tipo = tipoGuia(texto, sesion.paso, lectura);
  if (tipo === 'recomendacion') return guiaRecomendacion(sesion, texto, lectura, abierta);
  if (tipo === 'servicios') return entregarGuia(sesion, await textoServicios(sesion, texto), [], true, abierta);
  if (tipo === 'barberos') return entregarGuia(sesion, await textoBarberos(sesion), [], true, abierta);
  return guiaCalificacion(sesion, texto, abierta);
}

async function responderGuia(sesion, texto, lectura = null) {
  const abierta = sesion.paso !== 'inicio' && !String(sesion.paso).startsWith('guia');
  const opcionesAbiertas = abierta ? [...(sesion.opciones || [])] : null;
  const resultado = await armarGuia(sesion, texto, abierta, lectura);
  if (!abierta) return resultado;
  return decir(sesion, `${resultado.texto}\nSeguimos con lo que estábamos haciendo.`, opcionesAbiertas);
}

async function responderLocal(sesion, texto) {
  const intencion = intencionDe(texto);
  if (intencion === 'guia') return responderGuia(sesion, texto);
  if (String(sesion.paso).startsWith('guia') && !intencion) return responderGuia(sesion, texto);
  if (esOtraTarea(sesion.paso, intencion)) soltarTarea(sesion);
  if (sesion.paso === 'inicio') return atenderInicio(sesion, texto);
  if (sesion.paso === 'cita_servicio') return elegirServicio(sesion, texto);
  if (sesion.paso === 'cita_barbero') return elegirBarbero(sesion, texto);
  if (sesion.paso === 'cita_fecha') return elegirFecha(sesion, texto);
  if (sesion.paso === 'cita_hora') return elegirHora(sesion, texto);
  if (sesion.paso === 'cita_confirmar') return confirmarCita(sesion, texto);
  if (sesion.paso === 'reporte_tipo' || sesion.paso === 'reporte_fechas' || sesion.paso === 'reporte_barbero') {
    return seguirReporte(sesion, texto);
  }
  return atenderInicio(sesion, texto);
}

function vozDelModelo(lectura, resultado, sesion) {
  if (!lectura?.respuesta || !resultado) return resultado;
  if (!String(sesion.paso || '').startsWith('reporte')) return resultado;
  if (String(resultado.texto || '').startsWith('No hay')) return resultado;
  return { ...resultado, texto: lectura.respuesta };
}

function fechasDeLista(listar) {
  if (!listar?.desde) return null;
  return { desde: listar.desde, hasta: listar.hasta || listar.desde };
}

async function prepararContexto(sesion) {
  if (esAdmin(sesion) || esCliente(sesion) || esEmpleado(sesion)) await asegurarBarberos(sesion);
  if (esCliente(sesion)) await asegurarServicios(sesion);
}

function completarReporte(sesion, lectura) {
  const pedido = lectura.reporte || {};
  if (pedido.vista) sesion.reporte.vista = pedido.vista;
  if (pedido.desde) {
    sesion.reporte.desde = pedido.desde;
    sesion.reporte.hasta = pedido.hasta || pedido.desde;
  }
  if (pedido.calificacion) sesion.reporte.calificacion = pedido.calificacion;
  if (pedido.barbero) sesion.reporte.nombreBarbero = pedido.barbero;
  if ((lectura.falta || []).includes('barbero') && !pedido.barbero && !sesion.reporte.barberoId) {
    sesion.reporte.pedirBarbero = true;
  }
}

async function responderConLectura(sesion, texto, lectura) {
  const intencion = lectura.intencion;
  if (intencion === 'cancelar') return cerrarCon(sesion, lectura.respuesta || 'Listo. ¿En qué más te ayudo?');
  if (intencion === 'fuera' && !pideRecomendacion(normalizar(texto))) return recordarHilo(sesion, LIMITE_TEMA);
  if ((intencion === 'charla' || intencion === 'ayuda') && !pideRecomendacion(normalizar(texto)) && sesion.paso !== 'inicio') {
    return recordarHilo(sesion, lectura.respuesta || textoAyuda(sesion));
  }
  if ((intencion === 'charla' || intencion === 'ayuda') && !pideRecomendacion(normalizar(texto))) {
    return decir(sesion, lectura.respuesta || textoAyuda(sesion));
  }
  if (intencion === 'confirmar' && sesion.paso === 'cita_confirmar') return confirmarCita(sesion, 'si');
  if (intencion === 'rechazar' && sesion.paso === 'cita_confirmar') return confirmarCita(sesion, texto);
  if (pideRecomendacion(normalizar(texto)) || intencionDe(texto) === 'guia' || (intencion === 'guia' && (sesion.paso === 'inicio' || String(sesion.paso).startsWith('guia')))) {
    return responderGuia(sesion, texto, lectura);
  }

  if (String(sesion.paso).startsWith('reporte') && (intencion === 'reporte' || intencion === 'seguir')) {
    completarReporte(sesion, lectura);
    const resultado = await seguirReporte(sesion, texto);
    return vozDelModelo(lectura, resultado, sesion);
  }
  if (String(sesion.paso).startsWith('cita_') && (intencion === 'cita' || intencion === 'seguir')) {
    aplicarCitaModelo(sesion, lectura.cita);
    return responderLocal(sesion, texto);
  }

  if (sesion.paso !== 'inicio' && !esOtraTarea(sesion.paso, intencion)) return responderLocal(sesion, texto);
  if (esOtraTarea(sesion.paso, intencion)) soltarTarea(sesion);

  if (intencion === 'reporte') {
    if (!esAdmin(sesion)) {
      if (pideGuia(normalizar(texto)) || esCalificacionHablada(texto)) return responderGuia(sesion, texto);
      const alternativa = esCliente(sesion)
        ? 'Puedo agendarte una cita, mostrarte las que ya tienes o decirte la calificación de un barbero.'
        : 'Puedo mostrarte tu agenda o la calificación de los barberos.';
      return cerrarCon(sesion, `Los reportes los genera el administrador. ${alternativa}`);
    }
    sesion.reporte = reporteVacio();
    sesion.paso = 'reporte_tipo';
    completarReporte(sesion, lectura);
    const resultado = await seguirReporte(sesion, texto);
    return vozDelModelo(lectura, resultado, sesion);
  }
  if (intencion === 'cita') {
    if (!esCliente(sesion)) return cerrarCon(sesion, lectura.respuesta || 'Ese proceso lo hace el cliente desde su cuenta.');
    return empezarCita(sesion, texto, lectura.cita);
  }
  if (intencion === 'citas') return listarCitas(sesion, texto, fechasDeLista(lectura.listar));
  return responderLocal(sesion, texto);
}

function recordar(sesion, usuario, respuesta) {
  if (!sesion.historial) sesion.historial = [];
  sesion.historial.push({ rol: 'usuario', texto: usuario });
  if (respuesta) sesion.historial.push({ rol: 'ciso', texto: String(respuesta).slice(0, 700) });
  if (sesion.historial.length > 16) sesion.historial = sesion.historial.slice(-16);
}

export async function responderCiso(sesion, texto) {
  try {
    const n = normalizar(texto);
    if (!n) return decir(sesion, 'Escribe lo que necesitas o elige una opción.', sesion.opciones);
    if (esReinicio(n)) {
      const reinicio = cerrarCon(sesion, 'Listo. ¿En qué más te ayudo?');
      recordar(sesion, texto, reinicio.texto);
      return reinicio;
    }
    await prepararContexto(sesion);
    const lectura = await leerConModelo(sesion, texto);
    const cruda = lectura
      ? await responderConLectura(sesion, texto, lectura)
      : await responderLocal(sesion, texto);
    const respuesta = vestirSugerencias(sesion, cruda, lectura);
    recordar(sesion, texto, respuesta?.texto);
    return respuesta;
  } catch (error) {
    console.error('Ciso:', error);
    return decir(sesion, 'Se me atravesó un problema al consultar el sistema. Inténtalo otra vez.');
  }
}

function sugerenciaPermitida(texto, sesion) {
  const n = normalizar(texto);
  if (/\b(agendar|reserv\w*|nueva cita|sacar una cita)\b/.test(n) && !esCliente(sesion)) return false;
  if (/\b(reporte|informes?|excel)\b/.test(n) && !esAdmin(sesion)) return false;
  if (pareceDeLaBarberia(texto)) return true;
  if (mejorBarbero(sesion.barberos || [], texto).length) return true;
  return serviciosMencionados(sesion.servicios || [], texto).length > 0;
}

function chipsDeLectura(lectura, sesion) {
  return (lectura?.sugerencias || [])
    .filter((texto) => sugerenciaPermitida(texto, sesion))
    .slice(0, 4)
    .map((etiqueta) => ({ etiqueta, envio: etiqueta }));
}

function vestirSugerencias(sesion, respuesta, lectura) {
  if (!respuesta) return respuesta;
  const enCurso = sesion.paso !== 'inicio' && !respuesta.listo && (respuesta.opciones || []).length > 0;
  if (enCurso) return respuesta;
  const chips = chipsDeLectura(lectura, sesion);
  if (!chips.length) {
    if (respuesta.listo) return { ...respuesta, opciones: [] };
    return respuesta;
  }
  sesion.opciones = chips;
  return { ...respuesta, opciones: chips };
}

export async function sugerenciasIniciales(sesion) {
  try {
    await prepararContexto(sesion);
    const lectura = await leerConModelo(sesion, '', { arranque: true });
    return chipsDeLectura(lectura, sesion);
  } catch (error) {
    return [];
  }
}
