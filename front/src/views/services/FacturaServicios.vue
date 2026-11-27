<template>
  <div class="factura-container">
    <div class="factura-content">
      <div class="factura-wrapper">
        <button class="page-back" type="button" @click="volver">Regresar</button>
        <p class="mini-title">MysticalCut</p>
        <h1 class="resumen-title">Resumen Servicio</h1>
        <ResumenSeleccion :services="serviciosVisibles" :barber-name="barberName" :date="date" :time="time"
          :email="userEmail">
          <template #actions>
            <button class="confirmar-btn" @click="confirmarCita">Confirmar Cita</button>
          </template>
        </ResumenSeleccion>
      </div>
    </div>
  </div>
</template>

<script>
import {
  createQuote,
  sendQuoteEmail
} from '@/services/quotesApi';
import ResumenSeleccion from '@/components/services/ResumenSeleccion.vue';
import { notificar } from '@/utils/alerts';

export default {
  name: 'FacturaServicios',
  components: { ResumenSeleccion },
  data() {
    return {
      userId: null,
      barberId: null,
      barberName: '',
      date: '',
      time: '',
      servicioSeleccionado: {},
      userEmail: '',
      servicios: []
    };
  },
  computed: {
    totalServicios() {
      return this.servicioSeleccionado.price || 0;
    },
    serviciosVisibles() {
      if (this.servicios.length) return this.servicios;
      if (this.servicioSeleccionado && Object.keys(this.servicioSeleccionado).length) {
        return [this.servicioSeleccionado];
      }
      return [];
    },
    formattedDate() {
      if (!this.date) return '';
      const [year, month, day] = this.date.split('-');
      return `${day}/${month}/${year}`;
    },
    formattedTime() {
      if (!this.time) return '';
      return this.time.replace(/(\d{2}):(\d{2})/, (match, hh, mm) => {
        const hours = parseInt(hh);
        const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${mm} ${ampm}`;
      });
    }
  },
  mounted() {
    this.loadFacturaData();
  },
  methods: {
    loadFacturaData() {
      const facturaData = localStorage.getItem('facturaData');

      if (!facturaData) {
        console.error('No se encontraron datos de factura en localStorage');
        this.$router.push('/error-factura');
        return;
      }

      try {
        const data = JSON.parse(facturaData);
        console.log('Datos de factura cargados:', data);

        this.userId = data.user_id;
        this.barberId = data.barber_id;
        this.barberName = data.barber_name;
        this.date = data.date;
        this.time = data.time;
        this.servicios = data.servicios || [];

        this.servicioSeleccionado = this.servicios[0] || {};

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          this.userEmail = user.email || '';
        }

      } catch (error) {
        console.error('Error al procesar datos de factura:', error);
        this.$router.push('/error-factura');
      }
    },
    async enviarCorreo() {
      try {
        if (!this.userEmail) {
          console.warn('No se puede enviar correo: email no definido');
          return;
        }

        console.log('📤 Enviando correo a:', this.userEmail);
        const response = await sendQuoteEmail({
          email: this.userEmail,
          servicio: this.servicioSeleccionado.name || this.servicioSeleccionado.name_service,
          fecha: this.formattedDate,
          hora: this.formattedTime,
          barbero: this.barberName,
          total: this.totalServicios
        });

        console.log('📩 Respuesta del backend:', response);

        if (response && (response.message || response.msg)) {
          return true;
        }

        return false;

      } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        return false;
      }
    },
    async confirmarCita() {
      try {

        if (!this.userId || !this.barberId) {
          notificar('Faltan datos del usuario o del barbero.');
          return;
        }

        if (!this.date || !this.time) {
          notificar('Faltan la fecha o la hora de la cita.');
          return;
        }

        if (!this.servicioSeleccionado?.id &&
          !this.servicioSeleccionado?.id_services) {
          notificar('No se encontró el servicio seleccionado.');
          return;
        }

        const serviceId =
          this.servicioSeleccionado.id_services ||
          this.servicioSeleccionado.id;

        const quoteData = {
          user_id: this.userId,
          barber_id: this.barberId,
          date_time: `${this.date} ${this.time}:00`,
          state_quotes: 'pendiente',
          id_services: serviceId
        };

        await createQuote(quoteData);

        const enviado = await this.enviarCorreo();

        if (enviado) {
          await notificar('Cita confirmada correctamente y correo enviado', 'success');
        } else {
          await notificar(
            'Cita confirmada correctamente, pero hubo un problema con el correo',
            'warning'
          );
        }

        localStorage.removeItem('facturaData');

        this.$router.push('/citas');

      } catch (error) {

        console.error('❌ Error al confirmar la cita:', {
          message: error.message,
          response: error.response?.data,
          stack: error.stack
        });

        if (error.response?.data?.message) {
          notificar(error.response.data.message);
        } else if (error.response?.status === 409) {
          notificar('El barbero ya tiene una cita en ese horario.');
        } else {
          notificar(
            'No fue posible confirmar la cita: ' +
            (error.response?.data?.message || error.message)
          );
        }
      }
    },
    volver() {
      this.$router.back();
    }
  },
};
</script>

<style scoped>
@import '@/assets/css/services/facturaService.css';
</style>