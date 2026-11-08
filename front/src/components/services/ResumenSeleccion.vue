<template>
  <aside class="resumen-flujo">
    <h3 class="resumen-flujo-title">Resumen</h3>
    <p class="resumen-flujo-note">Se completa con cada paso de la cita.</p>

    <div class="resumen-lista">
      <template v-if="servicios.length">
        <div v-for="(service, index) in servicios" :key="claveServicio(service, index)" class="resumen-servicio">
          <div class="resumen-fila">
            <span>Servicio</span>
            <strong>{{ nombreServicio(service) }}</strong>
          </div>
          <div class="resumen-fila">
            <span>Duración</span>
            <strong>{{ duracionServicio(service) }}</strong>
          </div>
          <div class="resumen-fila">
            <span>Precio</span>
            <strong>${{ formatPrice(service.price) }}</strong>
          </div>
        </div>
      </template>
      <div v-else class="resumen-fila">
        <span>Servicio</span>
        <strong class="pendiente">Pendiente</strong>
      </div>

      <div class="resumen-fila">
        <span>Barbero</span>
        <strong :class="{ pendiente: !barberName }">{{ barberName || 'Pendiente' }}</strong>
      </div>
      <div class="resumen-fila">
        <span>Fecha</span>
        <strong :class="{ pendiente: !date }">{{ fechaVisible }}</strong>
      </div>
      <div class="resumen-fila">
        <span>Hora</span>
        <strong :class="{ pendiente: !time }">{{ horaVisible }}</strong>
      </div>
      <div v-if="email" class="resumen-fila">
        <span>Correo</span>
        <strong>{{ email }}</strong>
      </div>
    </div>

    <div class="resumen-total">
      <span>Total</span>
      <strong>${{ formatPrice(total) }}</strong>
    </div>

    <div v-if="$slots.actions" class="resumen-acciones">
      <slot name="actions" />
    </div>
  </aside>
</template>

<script>
export default {
  name: 'ResumenSeleccion',
  props: {
    services: {
      type: Array,
      default: () => []
    },
    barberName: {
      type: String,
      default: ''
    },
    date: {
      type: String,
      default: ''
    },
    time: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    }
  },
  computed: {
    servicios() {
      return Array.isArray(this.services) ? this.services : [];
    },
    total() {
      return this.servicios.reduce((sum, service) => sum + (Number(service.price) || 0), 0);
    },
    fechaVisible() {
      if (!this.date) return 'Pendiente';
      const partes = this.date.split('-');
      if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
      return this.date;
    },
    horaVisible() {
      if (!this.time) return 'Pendiente';
      if (this.time.includes('a.m.') || this.time.includes('p.m.')) return this.time;
      const match = String(this.time).match(/(\d{1,2}):(\d{2})/);
      if (!match) return this.time;
      let hours = parseInt(match[1], 10);
      const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
      hours = hours % 12 || 12;
      return `${hours}:${match[2]} ${ampm}`;
    }
  },
  methods: {
    claveServicio(service, index) {
      return service.id_services || service.id || index;
    },
    nombreServicio(service) {
      return service.name_service || service.name || 'No disponible';
    },
    duracionServicio(service) {
      const value = service.estimated_time ?? service.duration;
      if (value === undefined || value === null || value === '') return 'No disponible';
      return /^\d+$/.test(String(value).trim()) ? `${value} min` : value;
    },
    formatPrice(value) {
      return (Number(value) || 0).toLocaleString('es-CO');
    }
  }
};
</script>

<style scoped>
.resumen-flujo {
  width: 100%;
  padding: 22px 20px 18px;
  color: #ffffff;
  background: linear-gradient(180deg, #151515 0%, #0c0c0c 100%);
  border: 1px solid rgba(204, 175, 84, 0.45);
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.resumen-flujo-title {
  margin: 0;
  color: #f4e7c4;
  font-size: 1.45rem;
  letter-spacing: 0.03em;
  text-align: left;
}

.resumen-flujo-note {
  margin: 6px 0 16px;
  color: #bdbdbd;
  font-size: 0.9rem;
  line-height: 1.4;
}

.resumen-lista {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resumen-servicio {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.resumen-fila {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.resumen-fila span {
  color: #bdbdbd;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.resumen-fila strong {
  color: #f3f3f3;
  font-size: 0.95rem;
  font-weight: 400;
  text-align: right;
}

.pendiente {
  color: #8d8d8d;
}

.resumen-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(204, 175, 84, 0.45);
}

.resumen-total span {
  color: #ccaf54;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.resumen-total strong {
  color: #f4e7c4;
  font-size: 1.35rem;
  font-weight: 400;
}

.resumen-acciones {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.resumen-acciones :deep(button),
.resumen-acciones :deep(.btn) {
  width: 100%;
  margin: 0;
}
</style>
