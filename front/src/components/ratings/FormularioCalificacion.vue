<template>
  <form class="encuesta" @submit.prevent="enviar">
    <p class="encuesta-contexto">
      <strong>{{ cita.name_service || 'Servicio' }}</strong>
      con {{ cita.barber_name || 'tu barbero' }}
      <span v-if="fechaTexto"> · {{ fechaTexto }}</span>
    </p>

    <fieldset class="pregunta">
      <legend>En un rango de 1 a 5 estrellas, donde 1 es muy malo y 5 es muy bueno, califica la calidad del servicio prestado.</legend>
      <div class="estrellas" role="group" aria-label="Calidad del servicio prestado">
        <button
          v-for="n in 5"
          :key="`servicio-${n}`"
          type="button"
          class="estrella"
          :class="{ activa: n <= calificacionServicio }"
          :aria-pressed="n === calificacionServicio"
          :aria-label="`${n} ${n === 1 ? 'estrella' : 'estrellas'}`"
          @click="calificacionServicio = n"
        >★</button>
      </div>
    </fieldset>

    <fieldset class="pregunta">
      <legend>En un rango de 1 a 5 estrellas, donde 1 es muy malo y 5 es muy bueno, califica la calidad de la barbería en general.</legend>
      <div class="estrellas" role="group" aria-label="Calidad de la barbería en general">
        <button
          v-for="n in 5"
          :key="`barberia-${n}`"
          type="button"
          class="estrella"
          :class="{ activa: n <= calificacionBarberia }"
          :aria-pressed="n === calificacionBarberia"
          :aria-label="`${n} ${n === 1 ? 'estrella' : 'estrellas'}`"
          @click="calificacionBarberia = n"
        >★</button>
      </div>
    </fieldset>

    <p v-if="error" class="encuesta-error">{{ error }}</p>

    <button class="btn-enviar" type="submit" :disabled="enviando">
      {{ enviando ? 'Guardando...' : 'Enviar calificación' }}
    </button>
  </form>
</template>

<script setup>
import { computed, defineEmits, defineProps, ref } from 'vue';
import { createRating } from '@/services/ratingsApi';

const props = defineProps({
  cita: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['guardada']);

const calificacionServicio = ref(0);
const calificacionBarberia = ref(0);
const enviando = ref(false);
const error = ref('');

const fechaTexto = computed(() => {
  if (!props.cita?.date_time) return '';
  const fecha = new Date(props.cita.date_time);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const enviar = async () => {
  if (!calificacionServicio.value || !calificacionBarberia.value) {
    error.value = 'Selecciona una calificación del 1 al 5 en las dos preguntas.';
    return;
  }

  try {
    enviando.value = true;
    error.value = '';
    await createRating({
      id_quotes: props.cita.id_quotes,
      calificacion_servicio: calificacionServicio.value,
      calificacion_barberia: calificacionBarberia.value,
    });
    emit('guardada', {
      calificacion_servicio: calificacionServicio.value,
      calificacion_barberia: calificacionBarberia.value,
    });
  } catch (err) {
    error.value = err.response?.data?.message || 'No se pudo guardar la calificación.';
  } finally {
    enviando.value = false;
  }
};
</script>

<style scoped>
.encuesta {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.encuesta-contexto {
  margin: 0;
  color: #d0d0d0;
  line-height: 1.5;
}

.pregunta {
  margin: 0;
  padding: 0;
  border: 0;
}

.pregunta legend {
  margin-bottom: 10px;
  color: #f4e7c4;
  font-size: 0.98rem;
  line-height: 1.45;
}

.estrellas {
  display: flex;
  gap: 8px;
}

.estrella {
  width: 42px;
  height: 42px;
  color: #5c5340;
  background: #111111;
  border: 1px solid rgba(204, 175, 84, 0.45);
  border-radius: 10px;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.estrella.activa,
.estrella:hover {
  color: #111111;
  background: #ccaf54;
  border-color: #ccaf54;
}

.encuesta-error {
  margin: 0;
  color: #f0a3a3;
  font-size: 0.92rem;
}

.btn-enviar {
  height: 44px;
  color: #111111;
  background: #ccaf54;
  border: 1px solid #ccaf54;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.btn-enviar:disabled {
  opacity: 0.7;
  cursor: default;
}
</style>
