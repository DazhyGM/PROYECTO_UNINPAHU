<template>
  <div class="reportes-page">
    <header class="reportes-header page-top">
      <button class="page-back" type="button" @click="$router.push('/Home')">Regresar</button>
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
        <div class="atajos" aria-label="Rangos rápidos">
          <button
            v-for="atajo in atajos"
            :key="atajo.id"
            type="button"
            :class="{ activo: atajoActivo === atajo.id }"
            @click="aplicarAtajo(atajo.id)"
          >{{ atajo.label }}</button>
        </div>

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

        <label class="control" for="busqueda-reporte">
          <span>Buscar por texto</span>
          <input
            id="busqueda-reporte"
            v-model="busqueda"
            class="busqueda-reporte"
            type="search"
            placeholder="Barbero, cliente, servicio..."
          />
        </label>

        <button class="btn-descarga" type="button" :disabled="!filasInforme.length" @click="descargarExcel">
          Descargar informe
        </button>
      </div>
    </section>

    <section class="tabla-reporte">
      <SkeletonCarga v-if="cargando" tipo="filas" :cantidad="5" />
      <p v-else-if="!citasTabla.length" class="tabla-vacia">
        No hay citas registradas para los criterios seleccionados.
      </p>
      <div v-else class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Barbero</th>
              <th>Servicio</th>
              <th>Valor</th>
              <th>Estado</th>
              <th>Calificación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(cita, index) in citasTabla" :key="cita.id_quotes || index">
              <td>{{ index + 1 }}</td>
              <td>{{ formatDate(cita.date_time) }}</td>
              <td>{{ formatTime(cita.date_time) }}</td>
              <td>{{ cita.client_name || 'N/A' }}</td>
              <td>{{ cita.barber_name || 'N/A' }}</td>
              <td>{{ cita.name_service || 'No disponible' }}</td>
              <td>${{ cita.price ? Number(cita.price).toLocaleString('es-CO') : 'N/A' }}</td>
              <td>{{ cita.state_quotes }}</td>
              <td>{{ cita.calificacion_servicio || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import axios from 'axios';
import { getReportQuotes } from '@/services/quotesApi';
import { getBarbers } from '@/services/api';
import SelectCampo from '@/components/ui/SelectCampo.vue';
import SkeletonCarga from '@/components/ui/SkeletonCarga.vue';
import { notificar } from '@/utils/alerts';
import {
  claveDe,
  filtrarCitasReporte,
  resumenReporte,
  filasDelInforme,
  textoRangoInforme,
  tituloInforme,
  descargarInforme,
} from '@/services/descargarReporte';

const COLORES = ['#ccaf54', '#f4e7c4', '#8d7340', '#e8d5a3', '#5c4a28', '#fff6dc', '#a89060', '#6e5b34'];

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

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default {
  name: 'CitasReportes',
  components: { SelectCampo, SkeletonCarga },
  data() {
    const hoy = claveDe(new Date());
    return {
      vista: 'citas',
      citas: [],
      barberos: [],
      barberoId: '',
      calificacion: '',
      busqueda: '',
      atajoActivo: 'daily',
      atajos: [
        { id: 'daily', label: 'Hoy' },
        { id: 'weekly', label: 'Esta semana' },
        { id: 'monthly', label: 'Este mes' },
        { id: 'custom', label: 'Todas las citas' },
      ],
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
    citasBuscadas() {
      const consulta = normalizar(this.busqueda);
      if (!consulta) return this.citas;
      return this.citas.filter((cita) => {
        return [cita.client_name, cita.barber_name, cita.name_service]
          .some((campo) => normalizar(campo).includes(consulta));
      });
    },
    citasTabla() {
      return this.citasBuscadas.filter((cita) => {
        if (this.vista === 'citas' && this.barberoId && String(cita.barber_id) !== String(this.barberoId)) {
          return false;
        }
        if (this.vista === 'calidad') {
          const nota = Number(cita.calificacion_servicio);
          if (!nota) return false;
          if (this.calificacion && String(nota) !== String(this.calificacion)) return false;
        }
        return true;
      });
    },
    citasFiltradas() {
      return filtrarCitasReporte(this.citasBuscadas, {
        vista: this.vista,
        barberoId: this.barberoId,
        calificacion: this.calificacion,
      });
    },
    segmentos() {
      const lista = resumenReporte(this.citasFiltradas, this.vista);
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
      return tituloInforme({
        vista: this.vista,
        calificacion: this.calificacion,
        fechaDesde: this.fechaDesde,
        fechaHasta: this.fechaHasta,
      });
    },
    textoRango() {
      if (this.fechaDesde === '2000-01-01' && this.fechaHasta === '2099-12-31') return 'Todas las citas';
      return textoRangoInforme(this.fechaDesde, this.fechaHasta);
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
      return filasDelInforme(this.citasFiltradas);
    },
  },
  methods: {
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
      this.atajoActivo = '';
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
      this.aplicarAtajo('daily');
      this.calendarioAbierto = false;
    },
    aplicarAtajo(tipo) {
      const hoy = new Date();
      this.atajoActivo = tipo;
      this.fechaPendiente = '';
      this.calendarioAbierto = false;

      if (tipo === 'weekly') {
        const day = hoy.getDay();
        const diff = hoy.getDate() - day + (day === 0 ? -6 : 1);
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), diff);
        const fin = new Date(inicio);
        fin.setDate(inicio.getDate() + 6);
        this.fechaDesde = claveDe(inicio);
        this.fechaHasta = claveDe(fin);
      } else if (tipo === 'monthly') {
        this.fechaDesde = claveDe(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
        this.fechaHasta = claveDe(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
      } else if (tipo === 'custom') {
        this.fechaDesde = '2000-01-01';
        this.fechaHasta = '2099-12-31';
      } else {
        const clave = claveDe(hoy);
        this.fechaDesde = clave;
        this.fechaHasta = clave;
      }

      this.mesVista = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      this.cargarCitas();
    },
    cerrarCalendario(event) {
      if (!event.target.closest('.fecha-picker')) this.calendarioAbierto = false;
    },
    formatDate(dateString) {
      if (!dateString) return 'Fecha no disponible';
      return new Date(dateString).toLocaleDateString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    },
    formatTime(dateString) {
      if (!dateString) return 'Hora no disponible';
      return new Date(dateString).toLocaleTimeString('es-CO', {
        hour: '2-digit', minute: '2-digit',
      });
    },
    async cargarCitas() {
      this.cargando = true;
      try {
        this.citas = await getReportQuotes(this.fechaDesde, this.fechaHasta);
      } catch (error) {
        console.error('No se pudo cargar el reporte:', error);
        if (error.response && error.response.status === 403) {
          notificar('No tienes permisos para ver este reporte. Debes iniciar sesión.');
          this.$router.push('/');
        } else {
          notificar('No se pudo cargar el reporte de citas.');
        }
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
    async descargarExcel() {
      try {
        await descargarInforme({
          vista: this.vista,
          citas: this.citasBuscadas,
          fechaDesde: this.fechaDesde,
          fechaHasta: this.fechaHasta,
          barberoId: this.barberoId,
          barberos: this.barberos,
          calificacion: this.calificacion,
        });
      } catch (error) {
        console.error('No se pudo descargar el informe:', error);
        notificar('No se pudo descargar el informe.');
      }
    },
    async checkUserRole() {
      const token = localStorage.getItem('token');
      if (!token) {
        notificar('No se ha iniciado sesión.');
        this.$router.push('/');
        return false;
      }
      try {
        await axios.get('http://localhost:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        return true;
      } catch (error) {
        console.error('Error al verificar el rol del usuario:', error);
        notificar('Error al verificar la sesión. Por favor, inicie sesión de nuevo.');
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
