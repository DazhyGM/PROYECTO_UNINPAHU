<template>
  <div class="reportes-page">
    <header class="reportes-header">
      <h1>Reportes</h1>
    </header>

    <nav class="reportes-nav" aria-label="Tipo de reporte">
      <button type="button" :class="{ activo: vista === 'citas' }" @click="vista = 'citas'">Por citas</button>
      <button type="button" :class="{ activo: vista === 'calidad' }" @click="vista = 'calidad'">Por calidad del servicio</button>
    </nav>

    <section class="dashboard">
      <article class="torta-card">
        <h2>{{ tituloDashboard }}</h2>
        <p class="torta-rango">{{ textoRango }}</p>

        <div v-if="cargando" class="torta-vacio">Cargando reporte...</div>
        <div v-else-if="!segmentos.length" class="torta-vacio">No hay información para ese filtro.</div>
        <div v-else class="torta-cuerpo">
          <svg class="torta" viewBox="0 0 200 200" role="img" :aria-label="tituloDashboard">
            <path v-for="segmento in segmentos" :key="segmento.nombre" :d="segmento.d" :fill="segmento.color" />
            <circle cx="100" cy="100" r="46" fill="#0c0c0c" />
            <text x="100" y="96" text-anchor="middle" class="torta-total">{{ totalFiltrado }}</text>
            <text x="100" y="114" text-anchor="middle" class="torta-etiqueta">{{ etiquetaCentro }}</text>
          </svg>
          <ul class="torta-leyenda">
            <li v-for="segmento in segmentos" :key="`leyenda-${segmento.nombre}`">
              <span class="muestra" :style="{ background: segmento.color }"></span>
              <span>{{ segmento.nombre }}</span>
              <strong>{{ segmento.valor }}</strong>
            </li>
          </ul>
        </div>
      </article>

      <div class="dashboard-controles">
        <label class="control">
          <span>Rango de fechas</span>
          <div class="fecha-picker">
            <button class="fecha-trigger" type="button" @click.stop="calendarioAbierto = !calendarioAbierto">
              <span>{{ textoRango }}</span>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="2" y="3" width="12" height="11" rx="1.5" />
                <path d="M2 6.5h12M5.5 2v2.5M10.5 2v2.5" />
              </svg>
            </button>
            <div v-if="calendarioAbierto" class="calendario-pop" @click.stop>
              <div class="calendario-head">
                <button type="button" aria-label="Mes anterior" @click="cambiarMes(-1)">‹</button>
                <p>{{ tituloMes }}</p>
                <button type="button" aria-label="Mes siguiente" @click="cambiarMes(1)">›</button>
              </div>
              <div class="calendario-grid">
                <span v-for="dia in diasSemana" :key="dia" class="calendario-dow">{{ dia }}</span>
                <button
                  v-for="(celda, indice) in celdasCalendario"
                  :key="indice"
                  type="button"
                  class="calendario-dia"
                  :class="claseDia(celda)"
                  :disabled="!celda"
                  @click="elegirDia(celda)"
                >{{ celda ? celda.dia : '' }}</button>
              </div>
              <div class="calendario-foot">
                <button type="button" @click="elegirHoy">Hoy</button>
              </div>
            </div>
          </div>
        </label>

        <label class="control">
          <span>{{ vista === 'citas' ? 'Barbero' : 'Calificación' }}</span>
          <SelectCampo
            v-if="vista === 'citas'"
            v-model="barberoId"
            :options="opcionesBarbero"
            placeholder="Todos los barberos"
          />
          <SelectCampo
            v-else
            v-model="calificacion"
            :options="opcionesCalificacion"
            placeholder="Todas las calificaciones"
          />
        </label>

        <button class="btn-descarga" type="button" :disabled="!filasInforme.length" @click="descargarExcel">
          Descargar informe
        </button>
      </div>
    </section>

    <div class="text-center my-4">
      <button class="btn back-button" type="button" @click="$router.push('/Home')">Regresar</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { getReportQuotes } from '@/services/quotesApi';
import { getBarbers } from '@/services/api';
import SelectCampo from '@/components/ui/SelectCampo.vue';
import { crearInformeExcel } from '@/services/informeExcel';

const COLORES = ['#ccaf54', '#f4e7c4', '#8d7340', '#e8d5a3', '#5c4a28', '#fff6dc', '#a89060', '#6e5b34'];

function claveDe(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function arco(cx, cy, radio, inicio, fin) {
  if (fin - inicio >= Math.PI * 2 - 0.001) {
    return `M ${cx} ${cy - radio} A ${radio} ${radio} 0 1 1 ${cx - 0.01} ${cy - radio} Z`;
  }
  const x0 = cx + radio * Math.cos(inicio);
  const y0 = cy + radio * Math.sin(inicio);
  const x1 = cx + radio * Math.cos(fin);
  const y1 = cy + radio * Math.sin(fin);
  const grande = fin - inicio > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${radio} ${radio} 0 ${grande} 1 ${x1} ${y1} Z`;
}

export default {
  name: 'CitasReportes',
  components: { SelectCampo },
  data() {
    const hoy = claveDe(new Date());
    return {
      vista: 'citas',
      citas: [],
      barberos: [],
      barberoId: '',
      calificacion: '',
      fechaDesde: hoy,
      fechaHasta: hoy,
      fechaPendiente: '',
      calendarioAbierto: false,
      mesVista: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      diasSemana: ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'],
      cargando: true,
      opcionesCalificacion: [
        { value: '', label: 'Todas las calificaciones' },
        { value: '1', label: '1 estrella' },
        { value: '2', label: '2 estrellas' },
        { value: '3', label: '3 estrellas' },
        { value: '4', label: '4 estrellas' },
        { value: '5', label: '5 estrellas' },
      ],
    };
  },
  computed: {
    opcionesBarbero() {
      return [
        { value: '', label: 'Todos los barberos' },
        ...this.barberos.map((barbero) => ({ value: String(barbero.user_id), label: barbero.full_name })),
      ];
    },
    citasFiltradas() {
      return this.citas.filter((cita) => {
        if ((cita.state_quotes || '').toLowerCase() !== 'finalizada') return false;
        if (this.vista === 'citas' && this.barberoId && String(cita.barber_id) !== String(this.barberoId)) return false;
        if (this.vista === 'calidad') {
          const nota = Number(cita.calificacion_servicio);
          if (!nota) return false;
          if (this.calificacion && String(nota) !== String(this.calificacion)) return false;
        }
        return true;
      });
    },
    segmentos() {
      const grupos = new Map();
      this.citasFiltradas.forEach((cita) => {
        const nota = Number(cita.calificacion_servicio);
        const nombre = this.vista === 'calidad'
          ? `${nota} ${nota === 1 ? 'estrella' : 'estrellas'}`
          : (cita.name_service || 'Sin servicio');
        if (!grupos.has(nombre)) grupos.set(nombre, { nombre, valor: 0, clientes: new Set() });
        const actual = grupos.get(nombre);
        if (this.vista === 'calidad') actual.clientes.add(cita.user_id || cita.id_quotes);
        else actual.valor += 1;
      });
      if (this.vista === 'calidad') {
        grupos.forEach((grupo) => {
          grupo.valor = grupo.clientes.size;
        });
      }
      const lista = [...grupos.values()].sort((a, b) => b.valor - a.valor);
      const total = lista.reduce((suma, item) => suma + item.valor, 0);
      let angulo = -Math.PI / 2;
      return lista.map((item, indice) => {
        const porcion = total ? (item.valor / total) * Math.PI * 2 : 0;
        const inicio = angulo;
        angulo += porcion;
        return { ...item, color: COLORES[indice % COLORES.length], d: arco(100, 100, 78, inicio, angulo) };
      });
    },
    totalFiltrado() {
      if (this.vista === 'calidad') {
        return new Set(this.citasFiltradas.map((cita) => cita.user_id || cita.id_quotes)).size;
      }
      return this.citasFiltradas.length;
    },
    etiquetaCentro() {
      return this.vista === 'calidad' ? 'clientes' : 'servicios';
    },
    tituloDashboard() {
      if (this.vista === 'calidad') {
        return this.calificacion
          ? `Clientes con ${this.calificacion} ${this.calificacion === '1' ? 'estrella' : 'estrellas'}`
          : 'Calificaciones del servicio';
      }
      return this.esHoy ? 'Servicios del día' : 'Servicios del rango';
    },
    esHoy() {
      const hoy = claveDe(new Date());
      return this.fechaDesde === hoy && this.fechaHasta === hoy;
    },
    textoRango() {
      if (this.esHoy) return 'Hoy';
      if (this.fechaDesde === this.fechaHasta) return this.textoFecha(this.fechaDesde);
      return `${this.textoFecha(this.fechaDesde)} – ${this.textoFecha(this.fechaHasta)}`;
    },
    tituloMes() {
      const titulo = this.mesVista.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
      return titulo.charAt(0).toUpperCase() + titulo.slice(1);
    },
    celdasCalendario() {
      const year = this.mesVista.getFullYear();
      const month = this.mesVista.getMonth();
      const inicio = new Date(year, month, 1).getDay();
      const total = new Date(year, month + 1, 0).getDate();
      const celdas = Array.from({ length: inicio }, () => null);
      for (let dia = 1; dia <= total; dia += 1) {
        const clave = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        celdas.push({ dia, clave });
      }
      return celdas;
    },
    filasInforme() {
      return this.citasFiltradas.map((cita) => ({
        fecha: this.formatDate(cita.date_time),
        hora: this.formatTime(cita.date_time),
        cliente: cita.client_name || 'N/A',
        barbero: cita.barber_name || 'N/A',
        servicio: cita.name_service || 'No disponible',
        valor: Number(cita.price) || 0,
        calificacion: Number(cita.calificacion_servicio) || '',
      }));
    },
  },
  methods: {
    textoFecha(clave) {
      if (!clave) return '';
      const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const [year, month, day] = clave.split('-').map(Number);
      return `${day} ${meses[month - 1]} ${year}`;
    },
    claseDia(celda) {
      if (!celda) return 'vacio';
      const dentro = celda.clave >= this.fechaDesde && celda.clave <= this.fechaHasta;
      return {
        rango: dentro,
        extremo: celda.clave === this.fechaDesde || celda.clave === this.fechaHasta,
      };
    },
    cambiarMes(delta) {
      this.mesVista = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth() + delta, 1);
    },
    elegirDia(celda) {
      if (!celda) return;
      if (!this.fechaPendiente) {
        this.fechaPendiente = celda.clave;
        this.fechaDesde = celda.clave;
        this.fechaHasta = celda.clave;
        this.cargarCitas();
        return;
      }
      const inicio = this.fechaPendiente < celda.clave ? this.fechaPendiente : celda.clave;
      const fin = this.fechaPendiente < celda.clave ? celda.clave : this.fechaPendiente;
      this.fechaDesde = inicio;
      this.fechaHasta = fin;
      this.fechaPendiente = '';
      this.calendarioAbierto = false;
      this.cargarCitas();
    },
    elegirHoy() {
      const hoy = claveDe(new Date());
      this.fechaDesde = hoy;
      this.fechaHasta = hoy;
      this.fechaPendiente = '';
      this.mesVista = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      this.calendarioAbierto = false;
      this.cargarCitas();
    },
    cerrarCalendario(event) {
      if (!event.target.closest('.fecha-picker')) this.calendarioAbierto = false;
    },
    async cargarCitas() {
      this.cargando = true;
      try {
        this.citas = await getReportQuotes(this.fechaDesde, this.fechaHasta);
      } catch (error) {
        console.error('No se pudo cargar el reporte:', error);
        this.citas = [];
      } finally {
        this.cargando = false;
      }
    },
    async cargarBarberos() {
      try {
        this.barberos = await getBarbers();
      } catch (error) {
        console.error('No se pudieron cargar los barberos:', error);
        this.barberos = [];
      }
    },
    textoFiltro() {
      if (this.vista === 'citas') {
        const barbero = this.opcionesBarbero.find((opcion) => String(opcion.value) === String(this.barberoId));
        return barbero ? barbero.label : 'Todos los barberos';
      }
      const nota = this.opcionesCalificacion.find((opcion) => String(opcion.value) === String(this.calificacion));
      return nota ? nota.label : 'Todas las calificaciones';
    },
    async descargarExcel() {
      const encabezados = this.vista === 'citas'
        ? ['Fecha', 'Hora', 'Cliente', 'Barbero', 'Servicio', 'Valor']
        : ['Fecha', 'Cliente', 'Barbero', 'Servicio', 'Calificación'];
      const detalle = this.filasInforme.map((fila) => (
        this.vista === 'citas'
          ? [fila.fecha, fila.hora, fila.cliente, fila.barbero, fila.servicio, fila.valor]
          : [fila.fecha, fila.cliente, fila.barbero, fila.servicio, fila.calificacion]
      ));
      const logo = await this.logoInforme();
      const archivo = crearInformeExcel({
        titulo: this.tituloDashboard,
        filtros: [
          ['Rango', this.textoRango],
          [this.vista === 'citas' ? 'Barbero' : 'Calificación', this.textoFiltro()],
        ],
        resumen: this.segmentos.map((item) => [item.nombre, item.valor]),
        encabezados,
        detalle,
        totalDinero: this.vista === 'citas',
        logo,
      });
      const blob = new Blob([archivo], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(blob);
      enlace.download = `reporte-${this.vista}-${this.fechaDesde}-a-${this.fechaHasta}.xlsx`;
      enlace.click();
      URL.revokeObjectURL(enlace.href);
    },
    logoInforme() {
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
          let vacío = 0;
          let inicioVacío = 0;
          let mejorLargo = 0;
          let mejorInicio = altoCaja;
          for (let i = Math.floor(altoCaja * 0.35); i < altoCaja; i += 1) {
            if (filas[i] === 0) {
              if (vacío === 0) inicioVacío = i;
              vacío += 1;
              if (vacío > mejorLargo) {
                mejorLargo = vacío;
                mejorInicio = inicioVacío;
              }
            } else {
              vacío = 0;
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
    },
    formatDate(dateString) {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
    formatTime(dateString) {
      if (!dateString) return '';
      return new Date(dateString).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    },
    async checkUserRole() {
      const token = localStorage.getItem('token');
      if (!token) {
        this.$router.push('/');
        return false;
      }
      try {
        await axios.get('http://localhost:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        return true;
      } catch (error) {
        this.$router.push('/');
        return false;
      }
    },
  },
  async mounted() {
    const acceso = await this.checkUserRole();
    if (!acceso) return;
    document.addEventListener('click', this.cerrarCalendario);
    await Promise.all([this.cargarBarberos(), this.cargarCitas()]);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.cerrarCalendario);
  },
};
</script>

<style scoped>
@import '@/assets/css/services/reportes.css';
</style>
