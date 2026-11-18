<template>
  <div class="calificar-page">
    <header class="calificar-header">
      <h1>Encuesta de satisfacción</h1>
      <p>Tu respuesta queda guardada para esta cita.</p>
    </header>

    <section class="calificar-panel">
      <p v-if="cargando" class="calificar-estado">Cargando encuesta...</p>
      <p v-else-if="error" class="calificar-error">{{ error }}</p>
      <div v-else-if="gracias" class="calificar-gracias">
        <h2>Gracias por tu opinión</h2>
        <p>Calidad del servicio: {{ gracias.servicio }} de 5</p>
        <p>Calidad de la barbería: {{ gracias.barberia }} de 5</p>
      </div>
      <FormularioCalificacion v-else-if="cita" :cita="cita" @guardada="marcarGuardada" />
    </section>

    <button v-if="desdeCorreo && gracias" class="back-button" type="button" @click="finalizar">Finalizar</button>
    <button v-else-if="!desdeCorreo" class="back-button" type="button" @click="$router.push('/Home')">Regresar</button>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import FormularioCalificacion from '@/components/ratings/FormularioCalificacion.vue';
import { getRatingQuote } from '@/services/ratingsApi';

const route = useRoute();
const cita = ref(null);
const cargando = ref(true);
const error = ref('');
const gracias = ref(null);
const desdeCorreo = computed(() => route.query.origen === 'correo');

const finalizar = () => {
  window.close();
  window.setTimeout(() => {
    if (!window.closed) {
      window.location.replace('about:blank');
    }
  }, 200);
};

const marcarGuardada = (datos) => {
  gracias.value = {
    servicio: datos.calificacion_servicio,
    barberia: datos.calificacion_barberia,
  };
};

onMounted(async () => {
  try {
    const data = await getRatingQuote(route.params.id);
    if (data.state_quotes !== 'finalizada') {
      error.value = 'Esta cita todavía no se puede calificar.';
      return;
    }
    if (data.calificada) {
      gracias.value = {
        servicio: data.calificacion_servicio,
        barberia: data.calificacion_barberia,
      };
      return;
    }
    cita.value = data;
  } catch (err) {
    error.value = err.response?.data?.message || 'No se pudo abrir la encuesta.';
  } finally {
    cargando.value = false;
  }
});
</script>

<style scoped>
.calificar-page {
  width: min(560px, calc(100% - 32px));
  margin: 48px auto 36px;
  color: #ffffff;
}

.calificar-header {
  margin-bottom: 22px;
  text-align: center;
}

.calificar-header h1 {
  margin: 0;
  color: #f4e7c4;
  font-size: 2.2rem;
}

.calificar-header p,
.calificar-estado {
  color: #bdbdbd;
}

.calificar-panel {
  padding: 28px 24px 22px;
  background: linear-gradient(180deg, #151515 0%, #0c0c0c 100%);
  border: 1px solid rgba(204, 175, 84, 0.45);
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.calificar-error {
  margin: 0;
  color: #f0a3a3;
  text-align: center;
}

.calificar-gracias {
  text-align: center;
}

.calificar-gracias h2 {
  margin-top: 0;
  color: #f4e7c4;
}

.calificar-gracias p {
  color: #d0d0d0;
}
</style>
