const axios = require('axios');

const MODELOS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const INTENCIONES = new Set(['reporte', 'cita', 'citas', 'guia', 'ayuda', 'charla', 'cancelar', 'confirmar', 'rechazar', 'seguir', 'fuera']);

function fechaIso(valor) {
  const match = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return '';
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function leerJson(texto) {
  const limpio = String(texto || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio < 0 || fin <= inicio) return null;
  return JSON.parse(limpio.slice(inicio, fin + 1));
}

function normalizarLectura(dato) {
  if (!dato || typeof dato !== 'object') return null;
  const reporte = dato.reporte && typeof dato.reporte === 'object' ? dato.reporte : {};
  const cita = dato.cita && typeof dato.cita === 'object' ? dato.cita : {};
  const listar = dato.listar && typeof dato.listar === 'object' ? dato.listar : {};
  const desde = fechaIso(reporte.desde);
  const hasta = fechaIso(reporte.hasta) || desde;
  const listaDesde = fechaIso(listar.desde);
  const listaHasta = fechaIso(listar.hasta) || listaDesde;
  const vista = reporte.vista === 'calidad' || reporte.vista === 'citas' ? reporte.vista : '';
  const nota = String(reporte.calificacion || '').match(/^[1-5]$/) ? String(reporte.calificacion) : '';
  return {
    intencion: INTENCIONES.has(dato.intencion) ? dato.intencion : 'seguir',
    respuesta: String(dato.respuesta || '').replace(/\s+/g, ' ').trim().slice(0, 700),
    falta: Array.isArray(dato.falta) ? dato.falta.map((item) => String(item)).slice(0, 6) : [],
    reporte: {
      vista,
      desde,
      hasta: desde ? hasta : '',
      barbero: String(reporte.barbero || '').trim().slice(0, 80),
      calificacion: nota,
    },
    cita: {
      servicio: String(cita.servicio || '').trim().slice(0, 80),
      barbero: String(cita.barbero || '').trim().slice(0, 80),
      fecha: fechaIso(cita.fecha),
      hora: String(cita.hora || '').trim().slice(0, 20),
    },
    listar: {
      desde: listaDesde,
      hasta: listaDesde ? listaHasta : '',
    },
    sugerencias: limpiarSugerencias(dato.sugerencias),
    guia: ['recomendacion', 'servicios', 'barberos', 'calificacion'].includes(dato.guia) ? dato.guia : '',
    propuesta: limpiarSugerencias(dato.propuesta).slice(0, 3),
  };
}

function limpiarSugerencias(lista) {
  if (!Array.isArray(lista)) return [];
  const vistas = new Set();
  const sugerencias = [];
  lista.forEach((item) => {
    const texto = String(item || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const clave = texto.toLowerCase();
    if (texto.length < 2 || vistas.has(clave)) return;
    vistas.add(clave);
    sugerencias.push(texto);
  });
  return sugerencias.slice(0, 4);
}

function armarPrompt(datos) {
  const historial = (datos.historial || [])
    .map((turno) => `${turno.rol === 'ciso' ? 'Ciso' : 'Usuario'}: ${String(turno.texto || '').slice(0, 400)}`)
    .join('\n');
  const arranque = datos.arranque
    ? 'El usuario acaba de abrir el chat. intencion es "charla" y respuesta queda vacía. Las sugerencias son el primer paso según su rol, no un manual de todo lo que sabes hacer.\n'
    : '';
  return `Eres Ciso, el asistente de la barbería MysticalCut. Respondes en español, breve y natural. Sigues el mismo hilo hasta terminar la tarea. No inventes citas, totales, horarios ni archivos. Devuelve únicamente un JSON válido.

${arranque}

Hoy es ${datos.hoy}.
Usuario: ${datos.nombre || 'usuario'} (${datos.rol || 'desconocido'}).
Paso de la conversación: ${datos.paso || 'inicio'}.
Barberos reales: ${(datos.barberos || []).join(', ') || 'aún no cargados'}.
Servicios reales: ${(datos.servicios || []).join(', ') || 'aún no cargados'}.
Datos ya reunidos: ${JSON.stringify(datos.borrador || {})}.
${historial ? `Conversación reciente:\n${historial}\n` : ''}
Mensaje nuevo: ${datos.mensaje}

Reglas del sistema, que no puedes saltarte:
- Solo el rol Client agenda citas. Admin y Employee no pueden agendar.
- Solo Admin genera reportes en Excel. El reporte de servicios o ventas es vista "citas". El de calificaciones por fechas es vista "calidad". El archivo lo descarga el sistema, tú no digas que ya se descargó ni inventes cifras.
- Si un cliente pide un cambio de look, un estilo o qué le sugieres, la intencion es "guia" y guia es "recomendacion". No es una calificación ni un tema fuera de la barbería. En propuesta pon de 1 a 3 nombres copiados tal cual de Servicios reales. No inventes servicios.
- La calificación, las estrellas o qué tan bueno es un barbero es intencion "guia" y guia "calificacion". Precios o la lista de servicios es guia "servicios". Quiénes atienden es guia "barberos". No inventes promedios, precios ni nombres.
- Si dicen "reporte", "informe" o "excel", sigue siendo "reporte". Si solo quieren saber cómo está calificado un barbero, es "guia".
- Employee solo consulta su propia agenda. Admin puede consultar las citas de la barbería. Client consulta las suyas.
- Si piden el reporte de un barbero, copia el nombre exacto de la lista en reporte.barbero. Si piden uno solo y no dicen quién, deja barbero vacío, pon "barbero" en falta y pregunta quién en respuesta.
- Si piden todos los barberos, deja reporte.barbero vacío y no lo pongas en falta.
- Fechas en YYYY-MM-DD. "Este mes" es del día 1 al último día del mes de hoy. "Esta semana" es de lunes a domingo. Una cita es un solo día.
- Si falta un dato para ejecutar la tarea, la respuesta es la pregunta, no una confirmación.
- Si el rol no puede hacer lo que piden, explícalo con naturalidad y ofrece lo que sí puede hacer.
- Si el paso no es inicio, el mensaje continúa esa tarea. Usa "seguir" en nombres, fechas, horas, "ese", "sí" o "el primero". No borres los datos ya reunidos.
- Si en medio de una cita o un reporte preguntan una calificación, un precio o los barberos, la intencion es "guia". No borres lo que ya se estaba haciendo.
- Solo cambia a otra intencion si piden explícitamente otra cosa: otro reporte, agendar, ver la agenda o cancelar.
- Si el tema no es la barbería (tareas, noticias, chistes u otra cosa), intencion es "fuera". No respondas esa pregunta. Di que solo ayudas con citas, servicios, barberos, sus calificaciones y reportes de MysticalCut.
- Un saludo o un gracias, sin otra petición, es "charla".
- "sugerencias" son de 2 a 4 frases cortas, escritas como las diría el usuario. Siguen el hilo actual: si falta un dato, proponen ese dato (un servicio real, un barbero de la lista, mañana, una hora, este mes). Si la tarea ya terminó, proponen el siguiente paso natural de lo que acaban de hacer. No repitas siempre el mismo menú.
- No sugieras agendar si el rol no es Client. No sugieras reportes ni Excel si el rol no es Admin. No sugieras temas ajenos a la barbería.

Forma del JSON:
{"intencion":"reporte|cita|citas|guia|ayuda|charla|cancelar|confirmar|rechazar|seguir|fuera","respuesta":"","falta":[],"sugerencias":[],"guia":"recomendacion|servicios|barberos|calificacion|","propuesta":[],"reporte":{"vista":"","desde":"","hasta":"","barbero":"","calificacion":""},"cita":{"servicio":"","barbero":"","fecha":"","hora":""},"listar":{"desde":"","hasta":""}}`;
}

function textoDe(data) {
  const partes = data?.candidates?.[0]?.content?.parts || [];
  return partes.map((parte) => parte.text || '').join('');
}

async function llamarModelo(modelo, prompt, conPensamiento) {
  const generationConfig = {
    temperature: 0.4,
    maxOutputTokens: 1200,
    responseMimeType: 'application/json',
  };
  if (conPensamiento) generationConfig.thinkingConfig = { thinkingBudget: 0 };
  return axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      timeout: 20000,
      validateStatus: () => true,
    },
  );
}

async function entenderMensaje(datos) {
  const clave = String(process.env.GEMINI_API_KEY || '').trim();
  if (!clave) {
    const error = new Error('Sin clave de Gemini');
    error.code = 'SIN_CLAVE';
    throw error;
  }
  const preferido = String(process.env.GEMINI_MODEL || '').trim();
  const modelos = [preferido, ...MODELOS].filter((modelo, indice, lista) => modelo && lista.indexOf(modelo) === indice);
  const prompt = armarPrompt(datos);
  let ultimoEstado = 0;

  for (const modelo of modelos) {
    let respuesta = await llamarModelo(modelo, prompt, true);
    if (respuesta.status === 400) respuesta = await llamarModelo(modelo, prompt, false);
    ultimoEstado = respuesta.status;
    if (respuesta.status === 404) continue;
    if (respuesta.status !== 200) {
      console.error('Ciso IA:', modelo, respuesta.status, respuesta.data?.error?.message || '');
      return null;
    }
    try {
      return normalizarLectura(leerJson(textoDe(respuesta.data)));
    } catch (error) {
      console.error('Ciso IA: respuesta ilegible de', modelo, error.message);
      return null;
    }
  }

  console.error('Ciso IA: ningún modelo disponible', ultimoEstado);
  return null;
}

module.exports = { entenderMensaje };
