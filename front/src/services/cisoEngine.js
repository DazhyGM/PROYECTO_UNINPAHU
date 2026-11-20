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

export function sugerenciasDe(rol) {
  const papel = String(rol || '').toLowerCase();
  if (papel === 'admin') {
    return [
      { etiqueta: 'Reporte de citas', envio: 'Quiero el reporte de citas' },
      { etiqueta: 'Reporte de calidad', envio: 'Quiero el reporte de calidad' },
      { etiqueta: 'Citas de hoy', envio: 'Qué citas hay hoy' },
    ];
  }
  if (papel === 'employee' || papel === 'empleado') {
    return [
      { etiqueta: 'Mis citas de hoy', envio: 'Qué citas tengo hoy' },
      { etiqueta: 'Mi agenda de mañana', envio: 'Qué citas tengo mañana' },
    ];
  }
  return [
    { etiqueta: 'Agendar una cita', envio: 'Quiero agendar una cita' },
    { etiqueta: 'Ver mis citas', envio: 'Qué citas tengo' },
  ];
}

function intencionDe(texto) {
  const n = normalizar(texto);
  const reporte = /\b(reporte|informes?|excel|descarg\w*|estadistic\w*|calificacion\w*|calidad|estrella\w*)\b/.test(n)
    || (/\b(cuanto|cuanta)\b/.test(n) && /\b(vend\w*|hic\w*|factur\w*|ingres\w*|servicio\w*)\b/.test(n));
  if (reporte) return 'reporte';

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
  return decir(
    sesion,
    `Hola, ${nombre}. Soy ${NOMBRE_CISO}.\n¿En qué te puedo ayudar?`,
    sugerenciasDe(sesion.usuario.role),
  );
}

function cerrarCon(sesion, texto) {
  sesion.paso = 'inicio';
  sesion.cita = citaVacia();
  sesion.reporte = reporteVacio();
  sesion.horarios = [];
  return decir(sesion, texto, sugerenciasDe(sesion.usuario.role), true);
}

function esReinicio(texto) {
  return /^(cancelar|cancela|mejor no|dejalo|olvidalo|volver al inicio|menu|inicio|otra cosa|salir)$/.test(texto);
}

function esComandoNuevo(texto) {
  return Boolean(intencionDe(texto));
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
      sugerenciasDe(sesion.usuario.role),
    );
  }
  return decir(
    sesion,
    'Las citas las agenda el cliente desde su cuenta.\nPuedo mostrarte tu agenda.',
    sugerenciasDe(sesion.usuario.role),
  );
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
      ? 'Puedo agendarte una cita o mostrarte las que ya tienes.'
      : 'Puedo mostrarte tu agenda.';
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
    return 'Puedo decirte tu agenda. Por ejemplo: «qué citas tengo hoy», «mi agenda de mañana» o «quién viene el viernes».\n¿En qué te ayudo?';
  }
  return 'Puedo agendarte una cita o revisar las que ya tienes. Por ejemplo: «necesito un corte mañana a las 3» o «qué citas tengo el viernes».\n¿En qué te ayudo?';
}

function noEntendi(sesion) {
  if (esAdmin(sesion)) {
    return decir(
      sesion,
      'No me quedó claro. Puedes escribir, por ejemplo, «reporte de citas de hoy» o «qué citas hay esta semana».',
      sugerenciasDe(sesion.usuario.role),
    );
  }
  if (esEmpleado(sesion)) {
    return decir(
      sesion,
      'No me quedó claro. Puedes escribir, por ejemplo, «qué citas tengo hoy» o «mi agenda de mañana».',
      sugerenciasDe(sesion.usuario.role),
    );
  }
  return decir(
    sesion,
    'No me quedó claro. Puedes escribir, por ejemplo, «quiero un corte el viernes a las 4» o «qué citas tengo».',
    sugerenciasDe(sesion.usuario.role),
  );
}

async function atenderInicio(sesion, texto) {
  const intencion = intencionDe(texto);
  if (intencion === 'reporte') {
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
    return decir(sesion, textoAyuda(sesion), sugerenciasDe(sesion.usuario.role));
  }
  return noEntendi(sesion);
}

async function responderLocal(sesion, texto) {
  const n = normalizar(texto);
  if (sesion.paso !== 'inicio' && esComandoNuevo(n)) {
    sesion.cita = citaVacia();
    sesion.reporte = reporteVacio();
    sesion.horarios = [];
    sesion.paso = 'inicio';
  }
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
  if (esAdmin(sesion) || esCliente(sesion)) await asegurarBarberos(sesion);
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
  if (intencion === 'charla' || intencion === 'ayuda') {
    return decir(sesion, lectura.respuesta || textoAyuda(sesion), sugerenciasDe(sesion.usuario.role));
  }
  if (intencion === 'confirmar' && sesion.paso === 'cita_confirmar') return confirmarCita(sesion, 'si');
  if (intencion === 'rechazar' && sesion.paso === 'cita_confirmar') return confirmarCita(sesion, texto);

  if (String(sesion.paso).startsWith('reporte') && (intencion === 'reporte' || intencion === 'seguir')) {
    completarReporte(sesion, lectura);
    const resultado = await seguirReporte(sesion, texto);
    return vozDelModelo(lectura, resultado, sesion);
  }
  if (String(sesion.paso).startsWith('cita_') && (intencion === 'cita' || intencion === 'seguir')) {
    aplicarCitaModelo(sesion, lectura.cita);
    return responderLocal(sesion, texto);
  }

  const nueva = intencion === 'reporte' || intencion === 'cita' || intencion === 'citas';
  if (sesion.paso !== 'inicio' && !nueva) return responderLocal(sesion, texto);
  if (sesion.paso !== 'inicio' && nueva) {
    sesion.cita = citaVacia();
    sesion.reporte = reporteVacio();
    sesion.horarios = [];
    sesion.paso = 'inicio';
  }

  if (intencion === 'reporte') {
    if (!esAdmin(sesion)) return cerrarCon(sesion, lectura.respuesta || 'Los reportes los genera el administrador.');
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
  if (respuesta) sesion.historial.push({ rol: 'ciso', texto: String(respuesta).slice(0, 500) });
  if (sesion.historial.length > 12) sesion.historial = sesion.historial.slice(-12);
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
    const respuesta = lectura
      ? await responderConLectura(sesion, texto, lectura)
      : await responderLocal(sesion, texto);
    recordar(sesion, texto, respuesta?.texto);
    return respuesta;
  } catch (error) {
    console.error('Ciso:', error);
    return decir(
      sesion,
      'Se me atravesó un problema al consultar el sistema. Inténtalo otra vez.',
      sugerenciasDe(sesion.usuario.role),
    );
  }
}
