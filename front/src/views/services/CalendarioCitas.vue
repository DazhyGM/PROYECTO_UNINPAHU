<template>
  <div class="container-calendario">
    <header
      class="d-flex flex-wrap align-items-center justify-content-center justify-content-md-between py-3 mb-4 border-bottom">
      <div class="page-back-row">
        <button class="page-back" type="button" @click="regresar">Regresar</button>
      </div>
      <div class="col-md-3 mb-2 mb-md-0">
        <img src="/img/background/LOGO.png" alt="Logo" width="125" height="125" class="d-inline-block align-text-top" />
      </div>
      <ul class="nav col-12 justify-content-center mx-auto">
        <h1 class="titulo-header">Seleccione la fecha y horario</h1>
      </ul>
    </header>
    <div class="main-content">
      <div class="left-column">
        <div>
          <span class="barber-name">Barbero: {{ barberName }}</span>
        </div>

        <div class="calendar">
          <div class="calendar-header">
            <button @click="prevMonth">←</button>
            <span>{{ monthNames[currentMonth] }} {{ currentYear }}</span>
            <button @click="nextMonth">→</button>
          </div>

          <div class="calendar-grid">
            <div class="day-label" v-for="day in daysOfWeek" :key="day">{{ day }}</div>
            <div class="calendar-day" v-for="calendarDate in calendarDays" :key="formatDate(calendarDate)" :class="{
              selected: selectedDate === formatDate(calendarDate),
              empty: calendarDate === null,
              disabled: isDayDisabled(calendarDate)
            }" @click="calendarDate && !isDayDisabled(calendarDate) && selectDate(calendarDate)">
              {{ calendarDate ? new Date(calendarDate).getDate() : '' }}
            </div>
          </div>
        </div>

        <div class="time-list">
          <p v-if="scheduleLabel" class="schedule-label">{{ scheduleLabel }}</p>
          <SkeletonCarga v-if="loadingTimes" tipo="filas" :cantidad="4" />
          <p v-else-if="timeMessage" class="time-empty">{{ timeMessage }}</p>
          <p v-else-if="!selectedDate" class="time-empty">Selecciona un día para ver los horarios del barbero.</p>
          <div v-else class="time-scroll">
            <button v-for="slot in availableSlots" :key="slot.start" @click="selectTime(slot)"
              :class="['time-button', { selected: selectedTime === slot.start }]">
              {{ formatRange(slot) }}
            </button>
          </div>
        </div>
      </div>

      <div class="right-column">
        <ResumenSeleccion :services="selectedServices" :barber-name="barberName" :date="selectedDate"
          :time="selectedTimeLabel || selectedTime">
          <template #actions>
            <button v-if="selectedDate && selectedTime" class="confirm-button" :disabled="!userId || !barberId"
              @click="confirmQuote">
              Siguiente
            </button>
          </template>
        </ResumenSeleccion>
      </div>
    </div>
  </div>
</template>

<script>
import ResumenSeleccion from '@/components/services/ResumenSeleccion.vue';
import { getAvailability, getBarberSchedule } from '@/services/quotesApi';
import { notificar } from '@/utils/alerts';
import SkeletonCarga from '@/components/ui/SkeletonCarga.vue';

export default {
  name: 'CalendarioCitas',
  components: { ResumenSeleccion, SkeletonCarga },
  data() {
    return {
      selectedDate: '',
      selectedTime: '',
      selectedTimeLabel: '',
      barberId: null,
      barberName: '',
      userId: null,
      userName: '',
      userEmail: '',
      selectedServices: [],
      availableSlots: [],
      workingDays: [],
      dayEnds: {},
      scheduleLoaded: false,
      loadingTimes: false,
      timeMessage: '',
      scheduleWindow: null,
      daysOfWeek: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth(),
    };
  },
  computed: {
    calendarDays() {
      const days = [];
      const firstDay = new Date(this.currentYear, this.currentMonth, 1);
      const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
      const totalDays = lastDay.getDate();
      const startWeekday = (firstDay.getDay() + 6) % 7;
      for (let i = 0; i < startWeekday; i++) days.push(null);
      for (let i = 1; i <= totalDays; i++) days.push(new Date(this.currentYear, this.currentMonth, i));
      return days;
    },
    scheduleLabel() {
      if (!this.scheduleWindow) return '';
      const shift = `Atiende de ${this.formatTimeLabel(this.scheduleWindow.start)} a ${this.formatTimeLabel(this.scheduleWindow.end)}`;
      if (!this.scheduleWindow.breakStart || !this.scheduleWindow.breakEnd) return shift;
      return `${shift}. Descanso de ${this.formatTimeLabel(this.scheduleWindow.breakStart)} a ${this.formatTimeLabel(this.scheduleWindow.breakEnd)}`;
    }
  },
  methods: {
    formatDate(date) {
      if (!date) return '';
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    },
    isPastDate(date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date && date < today;
    },
    isShiftOver(date) {
      const end = this.dayEnds[date.getDay()];
      if (end == null) return false;
      const now = new Date();
      const sameDay = date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();
      if (!sameDay) return false;
      return (now.getHours() * 60) + now.getMinutes() >= end;
    },
    isDayDisabled(date) {
      if (!date || this.isPastDate(date)) return true;
      if (!this.scheduleLoaded) return false;
      if (!this.workingDays.includes(date.getDay())) return true;
      return this.isShiftOver(date);
    },
    formatTimeLabel(time24h) {
      const [hoursText, minutes] = time24h.split(':');
      const hours = Number(hoursText);
      const suffix = hours >= 12 ? 'p.m.' : 'a.m.';
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes} ${suffix}`;
    },
    formatRange(slot) {
      return `${this.formatTimeLabel(slot.start)} – ${this.formatTimeLabel(slot.end)}`;
    },
    minutesFromClock(value) {
      const match = String(value || '').match(/(\d{2}):(\d{2})/);
      if (!match) return null;
      return (Number(match[1]) * 60) + Number(match[2]);
    },
    serviceId() {
      const service = this.selectedServices[0];
      return service?.id_services || service?.id || null;
    },
    async selectDate(date) {
      this.selectedDate = this.formatDate(date);
      this.selectedTime = '';
      this.selectedTimeLabel = '';
      this.scheduleWindow = null;
      await this.loadSlots();
    },
    selectTime(slot) {
      this.selectedTime = slot.start;
      this.selectedTimeLabel = this.formatRange(slot);
    },
    async loadSchedule() {
      if (!this.barberId) return;
      try {
        const rows = await getBarberSchedule(this.barberId);
        const ends = {};
        this.workingDays = (rows || []).map((row) => {
          const day = Number(row.day_of_week);
          ends[day] = this.minutesFromClock(row.end_time);
          return day;
        });
        this.dayEnds = ends;
        this.scheduleLoaded = true;
        if (!this.workingDays.length) {
          this.timeMessage = 'Este barbero no tiene horarios asignados. Configúralos al editar el barbero.';
        }
      } catch (error) {
        this.scheduleLoaded = false;
        this.timeMessage = 'No se pudo cargar el horario del barbero.';
      }
    },
    async loadSlots() {
      this.availableSlots = [];
      this.timeMessage = '';
      if (!this.selectedDate) return;

      const serviceId = this.serviceId();
      if (!serviceId) {
        this.timeMessage = 'Selecciona un servicio antes de elegir la hora.';
        return;
      }

      this.loadingTimes = true;
      try {
        const availability = await getAvailability(this.barberId, this.selectedDate, serviceId);
        if (!availability.works) {
          const reasons = {
            past: 'Ese día ya pasó.',
            finished: 'La jornada de este barbero ya terminó.',
            closed: 'El barbero no atiende este día.'
          };
          this.timeMessage = reasons[availability.reason] || 'El barbero no atiende este día.';
          return;
        }

        this.scheduleWindow = {
          start: availability.start_time,
          end: availability.end_time,
          breakStart: availability.break_start,
          breakEnd: availability.break_end
        };
        this.availableSlots = availability.slots || [];
        if (!this.availableSlots.length) {
          this.timeMessage = 'No hay horarios libres. Las horas ocupadas, de descanso o que ya pasaron no se pueden agendar.';
        }
      } catch (error) {
        this.timeMessage = error.response?.data?.message || 'No se pudieron cargar los horarios.';
      } finally {
        this.loadingTimes = false;
      }
    },
    nextMonth() {
      if (this.currentMonth === 11) {
        this.currentMonth = 0;
        this.currentYear++;
      } else {
        this.currentMonth++;
      }
    },
    prevMonth() {
      const now = new Date();
      if ((this.currentMonth === 0 && this.currentYear === now.getFullYear()) || new Date(this.currentYear, this.currentMonth - 1) < new Date(now.getFullYear(), now.getMonth())) return;
      if (this.currentMonth === 0) {
        this.currentMonth = 11;
        this.currentYear--;
      } else {
        this.currentMonth--;
      }
    },
    convertTimeToMinutes(time) {
      const [hours, minutes] = time.split(':').map(Number);
      return (hours * 60) + minutes;
    },
    async confirmQuote() {
      console.log('--- INICIO confirmQuote ---');

      // Validar que haya exactamente un servicio
      if (!this.selectedServices?.length || this.selectedServices.length !== 1) {
        console.error('Error en servicios:', this.selectedServices);
        return notificar('Debes seleccionar exactamente un servicio');
      }

      const selectedService = this.selectedServices[0];

      // Obtener ID del servicio
      const serviceId = selectedService.id_services || selectedService.id;

      if (!serviceId) {
        console.error('Servicio sin ID válido:', selectedService);
        return notificar('El servicio seleccionado no tiene un ID válido');
      }

      // Validar fecha y hora
      if (!this.selectedDate || !this.selectedTime) {
        return notificar('Selecciona fecha y hora');
      }

      // Validar usuario y barbero
      if (!this.userId || !this.barberId) {
        return notificar('Faltan datos de usuario o barbero');
      }

      // Guardamos solamente los datos temporalmente
      const facturaData = {
        user_id: this.userId,
        barber_id: this.barberId,
        barber_name: this.barberName,
        date: this.selectedDate,
        time: this.selectedTime,
        servicios: this.selectedServices,
        id_services: serviceId
      };

      console.log(
        '📋 Datos preparados para la factura:',
        JSON.stringify(facturaData, null, 2)
      );

      // Guardar datos temporalmente
      localStorage.setItem(
        'facturaData',
        JSON.stringify(facturaData)
      );

      // Ir al resumen
      this.$router.push('/FacturaServicios');
    },

    regresar() {
      this.$router.go(-1);
    }
  },
  mounted() {
    console.log('--- INICIO mounted ---');

    this.barberId = localStorage.getItem('barberId');
    this.barberName = localStorage.getItem('barberName');
    this.userId = localStorage.getItem('userId');
    this.userName = localStorage.getItem('userName');
    this.userEmail = localStorage.getItem('userEmail');

    const storedServices = localStorage.getItem('selectedServices');
    try {
      this.selectedServices = storedServices ? JSON.parse(storedServices) : [];
      console.log('Servicios cargados:', this.selectedServices);

      if (!Array.isArray(this.selectedServices)) {
        console.warn('Formato inválido de servicios, reseteando...');
        this.selectedServices = [];
      }
    } catch (e) {
      console.error('Error al parsear servicios:', e);
      this.selectedServices = [];
    }

    console.log('Datos inicializados:', {
      barberId: this.barberId,
      userId: this.userId,
      servicesCount: this.selectedServices.length
    });

    if (!this.userId || !this.barberId) {
      notificar('Faltan datos del usuario o del barbero. La cita no podrá confirmarse.', 'warning');
    }

    this.loadSchedule();
  }
};
</script>

<style scoped>
@import '@/assets/css/services/calendarioCitas.css';
</style>