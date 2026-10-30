<template>
  <div class="citas-page">
    <header class="citas-header">
      <h1 class="citas-title">Mis Citas</h1>
      <p class="citas-subtitle">Revisa fecha, barbero, servicio y estado de cada cita.</p>
    </header>

    <section class="citas-filtros" v-if="!cargando" aria-label="Filtros de citas">
      <label v-for="campo in camposFecha" :key="campo.id" class="filtro-campo">
        <span>{{ campo.label }}</span>
        <div class="fecha-picker">
          <button class="fecha-trigger" type="button" :class="{ vacio: !fechaDe(campo.id) }"
            @click.stop="abrirCalendario(campo.id)">
            <span>{{ textoFecha(fechaDe(campo.id)) }}</span>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="2" y="3" width="12" height="11" rx="1.5" />
              <path d="M2 6.5h12M5.5 2v2.5M10.5 2v2.5" />
            </svg>
          </button>
          <div v-if="calendarioAbierto === campo.id" class="calendario-pop" @click.stop>
            <div class="calendario-head">
              <button type="button" aria-label="Mes anterior" @click="cambiarMes(-1)">‹</button>
              <p>{{ tituloMes }}</p>
              <button type="button" aria-label="Mes siguiente" @click="cambiarMes(1)">›</button>
            </div>
            <div class="calendario-grid">
              <span v-for="dia in diasSemana" :key="dia" class="calendario-dow">{{ dia }}</span>
              <button v-for="(celda, i) in celdasCalendario" :key="`${campo.id}-${i}`" type="button"
                class="calendario-dia" :class="claseDia(celda)" :disabled="!celda" @click="elegirDia(celda)">
                {{ celda ? celda.dia : '' }}
              </button>
            </div>
            <div class="calendario-foot">
              <button type="button" @click="borrarFecha">Borrar</button>
              <button type="button" @click="elegirHoy">Hoy</button>
            </div>
          </div>
        </div>
      </label>
      <label class="filtro-campo filtro-buscar">
        <span>Cliente</span>
        <input type="search" v-model="busqueda" placeholder="Buscar por nombre o cédula">
      </label>
      <button class="btn-limpiar" type="button" @click="limpiarFiltros">Limpiar</button>
    </section>

    <section class="citas-summary" v-if="!cargando" aria-label="Resumen de citas">
      <article class="summary-card">
        <span class="summary-value">{{ resumenFiltrado.total }}</span>
        <span class="summary-label">Total</span>
      </article>
      <article class="summary-card">
        <span class="summary-value">{{ resumenFiltrado.pendientes }}</span>
        <span class="summary-label">Pendientes</span>
      </article>
      <article class="summary-card">
        <span class="summary-value">{{ resumenFiltrado.finalizadas }}</span>
        <span class="summary-label">Finalizadas</span>
      </article>
      <article class="summary-card">
        <span class="summary-value">{{ resumenFiltrado.canceladas }}</span>
        <span class="summary-label">Canceladas</span>
      </article>
    </section>

    <section class="citas-panel">
      <div class="citas-toolbar" v-if="!cargando && citas.length">
        <label class="filtro-campo filtro-pagina">
          <span>Registros por página</span>
          <select v-model.number="porPagina">
            <option :value="5">5</option>
            <option :value="10">10</option>
          </select>
        </label>
        <p class="citas-rango">{{ textoRango }}</p>
      </div>

      <div v-if="cargando" class="citas-state">Cargando citas...</div>
      <div v-else-if="!citas.length" class="citas-state">No hay citas registradas.</div>
      <div v-else-if="!citasFiltradas.length" class="citas-state">No hay citas para ese filtro.</div>
      <div v-else class="citas-scroll">
        <table class="citas-table">
          <thead>
            <tr>
              <th v-for="columna in columnas" :key="columna.key">
                <span class="th-content">
                  {{ columna.label }}
                  <span class="sort-arrows">
                    <button class="sort-btn" type="button"
                      :class="{ active: sortKey === columna.key && sortDir === 'asc' }"
                      :aria-label="'Ordenar ' + columna.label + ' ascendente'"
                      @click="ordenar(columna.key, 'asc')">▲</button>
                    <button class="sort-btn" type="button"
                      :class="{ active: sortKey === columna.key && sortDir === 'desc' }"
                      :aria-label="'Ordenar ' + columna.label + ' descendente'"
                      @click="ordenar(columna.key, 'desc')">▼</button>
                  </span>
                </span>
              </th>
              <th v-if="puedeGestionar">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(cita, index) in citasPagina" :key="cita.id_quotes">
              <td class="col-num">{{ numeroFila(index) }}</td>
              <td class="col-fecha">{{ formatDate(cita.date_time) }}</td>
              <td class="col-hora">{{ formatTime(cita.date_time) }}</td>
              <td>{{ cita.client_name || 'N/A' }}</td>
              <td>{{ cita.barber_name || 'N/A' }}</td>
              <td>{{ cita.name_service || 'No disponible' }}</td>
              <td class="col-precio">{{ formatPrice(cita.price) }}</td>
              <td>
                <span class="badge-estado" :class="claseEstado(cita.state_quotes)">
                  {{ cita.state_quotes || 'Sin estado' }}
                </span>
              </td>
              <td v-if="puedeGestionar" class="acciones-cell">
                <div v-if="cita.state_quotes === 'pendiente'" class="acciones">
                  <button class="btn-icono btn-cancelar" type="button" title="Cancelar" aria-label="Cancelar cita"
                    @click="cancelarCita(cita.id_quotes)">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3.2 3.2l9.6 9.6M12.8 3.2l-9.6 9.6" />
                    </svg>
                  </button>
                  <button class="btn-icono btn-finalizar" type="button" title="Finalizar" aria-label="Finalizar cita"
                    @click="finalizarCita(cita.id_quotes)">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3.2 8.4l3 3.1 6.6-7" />
                    </svg>
                  </button>
                </div>
                <span v-else-if="cita.state_quotes === 'finalizada'" class="accion-nota">Completada</span>
                <span v-else-if="cita.state_quotes === 'cancelada'" class="accion-nota">Cerrada</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="citas-paginacion" v-if="!cargando && citasFiltradas.length">
        <button class="btn-pagina" type="button" :disabled="pagina === 1" @click="pagina -= 1">Anterior</button>
        <button v-for="n in paginasVisibles" :key="n" class="btn-pagina" type="button"
          :class="{ active: n === pagina }" @click="pagina = n">
          {{ n }}
        </button>
        <button class="btn-pagina" type="button" :disabled="pagina === totalPaginas" @click="pagina += 1">Siguiente</button>
      </div>
    </section>

    <div class="citas-footer">
      <button class="btn back-button" type="button" @click="$router.push('/Home')">Regresar</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { getQuotesWithServiceDetails, cancelQuote, finishQuote } from '@/services/quotesApi';

export default {
  name: 'CitasPendientes',
  data() {
    return {
      citas: [],
      userId: null,
      userRole: null,
      cargando: true,
      busqueda: '',
      fechaDesde: '',
      fechaHasta: '',
      calendarioAbierto: '',
      mesVista: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      camposFecha: [
        { id: 'desde', label: 'Desde' },
        { id: 'hasta', label: 'Hasta' },
      ],
      diasSemana: ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'],
      porPagina: 10,
      pagina: 1,
      sortKey: '',
      sortDir: 'asc',
      columnas: [
        { key: 'numero', label: '#' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'hora', label: 'Hora' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'barbero', label: 'Barbero' },
        { key: 'servicio', label: 'Servicio' },
        { key: 'valor', label: 'Valor' },
        { key: 'estado', label: 'Estado' },
      ],
    };
  },
  computed: {
    puedeGestionar() {
      return this.userRole === 'Employee' || this.userRole === 'Client' || this.userRole === 'admin';
    },
    citasFiltradas() {
      return this.citas.filter((cita) => this.coincideFecha(cita) && this.coincideBusqueda(cita));
    },
    citasOrdenadas() {
      if (!this.sortKey) return this.citasFiltradas;
      const dir = this.sortDir === 'desc' ? -1 : 1;
      return [...this.citasFiltradas].sort((a, b) => {
        const va = this.valorOrden(a, this.sortKey);
        const vb = this.valorOrden(b, this.sortKey);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
    },
    totalPaginas() {
      return Math.max(1, Math.ceil(this.citasOrdenadas.length / this.porPagina));
    },
    citasPagina() {
      const pagina = Math.min(this.pagina, this.totalPaginas);
      const inicio = (pagina - 1) * this.porPagina;
      return this.citasOrdenadas.slice(inicio, inicio + this.porPagina);
    },
    paginasVisibles() {
      const total = this.totalPaginas;
      const actual = Math.min(this.pagina, total);
      const inicio = Math.max(1, actual - 2);
      const fin = Math.min(total, actual + 2);
      const paginas = [];
      for (let i = inicio; i <= fin; i += 1) paginas.push(i);
      return paginas;
    },
    textoRango() {
      const total = this.citasOrdenadas.length;
      if (!total) return '0 citas';
      const pagina = Math.min(this.pagina, this.totalPaginas);
      const inicio = (pagina - 1) * this.porPagina + 1;
      const fin = Math.min(pagina * this.porPagina, total);
      return `${inicio}-${fin} de ${total}`;
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
    resumenFiltrado() {
      const contar = (estado) => this.citasFiltradas.filter(
        (cita) => (cita.state_quotes || '').toLowerCase() === estado
      ).length;

      return {
        total: this.citasFiltradas.length,
        pendientes: contar('pendiente'),
        finalizadas: contar('finalizada'),
        canceladas: contar('cancelada'),
      };
    },
  },
  watch: {
    busqueda() {
      this.pagina = 1;
    },
    fechaDesde() {
      this.pagina = 1;
    },
    fechaHasta() {
      this.pagina = 1;
    },
    porPagina() {
      this.pagina = 1;
    },
    totalPaginas(total) {
      if (this.pagina > total) this.pagina = total;
    },
  },
  methods: {
    async cargarCitas() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert("No se ha iniciado sesión.");
          this.$router.push('/');
          return;
        }

        const { data: userData } = await axios.get('http://localhost:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });

        this.userId = userData.user_id;
        this.userRole = userData.role;

        const citasData = await getQuotesWithServiceDetails(this.userRole === 'admin' ? null : this.userId);
        this.citas = citasData;
      } catch (error) {
        console.error('❌ Error al cargar citas:', error);
        alert("No se pudieron cargar las citas.");
      } finally {
        this.cargando = false;
      }
    },
    limpiarFiltros() {
      this.busqueda = '';
      this.fechaDesde = '';
      this.fechaHasta = '';
      this.calendarioAbierto = '';
      this.pagina = 1;
    },
    fechaDe(campo) {
      return campo === 'desde' ? this.fechaDesde : this.fechaHasta;
    },
    textoFecha(clave) {
      if (!clave) return 'dd/mm/aaaa';
      const [anio, mes, dia] = clave.split('-');
      return `${dia}/${mes}/${anio}`;
    },
    abrirCalendario(campo) {
      if (this.calendarioAbierto === campo) {
        this.calendarioAbierto = '';
        return;
      }
      this.calendarioAbierto = campo;
      const actual = this.fechaDe(campo);
      const base = actual ? this.claveAFecha(actual) : new Date();
      this.mesVista = new Date(base.getFullYear(), base.getMonth(), 1);
    },
    cambiarMes(delta) {
      this.mesVista = new Date(this.mesVista.getFullYear(), this.mesVista.getMonth() + delta, 1);
    },
    elegirDia(celda) {
      if (!celda) return;
      if (this.calendarioAbierto === 'desde') this.fechaDesde = celda.clave;
      else this.fechaHasta = celda.clave;
      this.calendarioAbierto = '';
    },
    elegirHoy() {
      const hoy = new Date();
      this.elegirDia({
        clave: this.fechaClave(hoy),
      });
    },
    borrarFecha() {
      if (this.calendarioAbierto === 'desde') this.fechaDesde = '';
      else this.fechaHasta = '';
      this.calendarioAbierto = '';
    },
    claseDia(celda) {
      if (!celda) return 'vacio';
      const hoy = this.fechaClave(new Date());
      const inicio = this.fechaDesde;
      const fin = this.fechaHasta;
      return {
        seleccionado: celda.clave === inicio || celda.clave === fin,
        hoy: celda.clave === hoy,
        'en-rango': inicio && fin && celda.clave > inicio && celda.clave < fin,
      };
    },
    claveAFecha(clave) {
      const [anio, mes, dia] = clave.split('-').map(Number);
      return new Date(anio, mes - 1, dia);
    },
    cerrarCalendario(event) {
      if (!event.target.closest('.fecha-picker')) this.calendarioAbierto = '';
    },
    coincideFecha(cita) {
      const fecha = this.fechaClave(cita.date_time);
      if (!fecha) return !this.fechaDesde && !this.fechaHasta;
      if (this.fechaDesde && fecha < this.fechaDesde) return false;
      if (this.fechaHasta && fecha > this.fechaHasta) return false;
      return true;
    },
    coincideBusqueda(cita) {
      const consulta = this.busqueda.trim().toLowerCase();
      if (!consulta) return true;
      const nombre = (cita.client_name || '').toLowerCase();
      const cedula = String(cita.client_document || '');
      const digitos = consulta.replace(/\D/g, '');
      return nombre.includes(consulta) || cedula.toLowerCase().includes(consulta) || (digitos && cedula.includes(digitos));
    },
    fechaClave(dateString) {
      if (!dateString) return '';
      const fecha = new Date(dateString);
      if (Number.isNaN(fecha.getTime())) return '';
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${fecha.getFullYear()}-${mes}-${dia}`;
    },
    ordenar(key, dir) {
      if (this.sortKey === key && this.sortDir === dir) {
        this.sortKey = '';
        this.sortDir = 'asc';
        return;
      }
      this.sortKey = key;
      this.sortDir = dir;
    },
    valorOrden(cita, key) {
      if (key === 'numero') return Number(cita.id_quotes) || 0;
      if (key === 'fecha') return new Date(cita.date_time).getTime() || 0;
      if (key === 'hora') {
        const fecha = new Date(cita.date_time);
        return fecha.getHours() * 60 + fecha.getMinutes();
      }
      if (key === 'cliente') return (cita.client_name || '').toLowerCase();
      if (key === 'barbero') return (cita.barber_name || '').toLowerCase();
      if (key === 'servicio') return (cita.name_service || '').toLowerCase();
      if (key === 'valor') return Number(cita.price) || 0;
      return (cita.state_quotes || '').toLowerCase();
    },
    numeroFila(index) {
      const pagina = Math.min(this.pagina, this.totalPaginas);
      return (pagina - 1) * this.porPagina + index + 1;
    },
    claseEstado(estado) {
      const key = (estado || '').toLowerCase();
      if (key === 'pendiente' || key === 'finalizada' || key === 'cancelada') {
        return `badge-${key}`;
      }
      return 'badge-otro';
    },
    formatPrice(price) {
      if (price === null || price === undefined || price === '') return 'N/A';
      return `$${Number(price).toLocaleString('es-CO')}`;
    },
    formatDate(dateString) {
      if (!dateString) return 'Fecha no disponible';
      return new Date(dateString).toLocaleDateString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    },
    formatTime(dateString) {
      if (!dateString) return 'Hora no disponible';
      return new Date(dateString).toLocaleTimeString('es-CO', {
        hour: '2-digit', minute: '2-digit'
      });
    },
    async cancelarCita(id) {
      try {
        await cancelQuote(id);
        alert('Cita cancelada con éxito');
        // Redirige a /Home después de cancelar
        this.$router.push('/Home');
      } catch (error) {
        console.error('❌ Error al cancelar cita:', error);
        alert('No se pudo cancelar la cita.');
      }
    },
    async finalizarCita(id) {
      try {
        await finishQuote(id);
        alert('Cita finalizada con éxito');
        // Redirige a /Home después de finalizar
        this.$router.push('/Home');
      } catch (error) {
        console.error('❌ Error al finalizar cita:', error);
        alert('No se pudo finalizar la cita.');
      }
    }
  },
  mounted() {
    this.cargarCitas();
    document.addEventListener('click', this.cerrarCalendario);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.cerrarCalendario);
  }
};
</script>

<style scoped>
@import '@/assets/css/services/citasPend.css';
</style>