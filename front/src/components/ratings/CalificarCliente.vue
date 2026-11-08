<template>
  <div class="alerta-fondo" role="presentation">
    <section class="alerta-panel" role="dialog" aria-modal="true" aria-labelledby="titulo-cliente">
      <p class="alerta-kicker">Cita finalizada</p>
      <h2 id="titulo-cliente">Califica a este cliente</h2>
      <p class="alerta-texto">
        {{ cita.client_name || 'El cliente' }} recibió {{ cita.name_service || 'el servicio' }}.
        Esta nota alimenta el indicador de mejores clientes.
      </p>
      <p v-if="mensaje" class="alerta-nota">{{ mensaje }}</p>

      <form class="encuesta" @submit.prevent="enviar">
        <fieldset class="pregunta">
          <legend>En un rango de 1 a 5 estrellas, donde 1 es muy malo y 5 es muy bueno, califica a este cliente.</legend>
          <div class="estrellas" role="group" aria-label="Calificación del cliente">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="estrella"
              :class="{ activa: n <= calificacion }"
              :aria-pressed="n === calificacion"
              :aria-label="`${n} ${n === 1 ? 'estrella' : 'estrellas'}`"
              @click="calificacion = n"
            >★</button>
          </div>
        </fieldset>

        <p v-if="error" class="encuesta-error">{{ error }}</p>

        <button class="btn-enviar" type="submit" :disabled="enviando">
          {{ enviando ? 'Guardando...' : 'Enviar calificación' }}
        </button>
      </form>

      <button class="btn-despues" type="button" @click="$emit('cerrar')">Ahora no</button>
    </section>
  </div>
</template>

<script>
import { createClientRating } from '@/services/ratingsApi';

export default {
  name: 'CalificarCliente',
  props: {
    cita: {
      type: Object,
      required: true,
    },
    mensaje: {
      type: String,
      default: '',
    },
  },
  emits: ['guardada', 'cerrar'],
  data() {
    return {
      calificacion: 0,
      enviando: false,
      error: '',
    };
  },
  methods: {
    async enviar() {
      if (!this.calificacion) {
        this.error = 'Selecciona una calificación del 1 al 5.';
        return;
      }

      try {
        this.enviando = true;
        this.error = '';
        await createClientRating({
          id_quotes: this.cita.id_quotes,
          calificacion_cliente: this.calificacion,
        });
        this.$emit('guardada');
      } catch (err) {
        this.error = err.response?.data?.message || 'No se pudo guardar la calificación del cliente.';
      } finally {
        this.enviando = false;
      }
    },
  },
};
</script>

<style scoped>
.alerta-fondo {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.72);
}

.alerta-panel {
  width: min(560px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 28px 24px 22px;
  background: linear-gradient(180deg, #151515 0%, #0c0c0c 100%);
  border: 1px solid rgba(204, 175, 84, 0.45);
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}

.alerta-kicker {
  margin: 0 0 6px;
  color: #ccaf54;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.75rem;
}

.alerta-panel h2 {
  margin: 0 0 8px;
  color: #f4e7c4;
  font-size: 1.8rem;
}

.alerta-texto,
.alerta-nota {
  margin: 0 0 18px;
  color: #bdbdbd;
  line-height: 1.5;
}

.encuesta {
  display: flex;
  flex-direction: column;
  gap: 18px;
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

.btn-enviar,
.btn-despues {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  cursor: pointer;
}

.btn-enviar {
  color: #111111;
  background: #ccaf54;
  border: 1px solid #ccaf54;
  font-weight: 700;
}

.btn-enviar:disabled {
  opacity: 0.7;
  cursor: default;
}

.btn-despues {
  margin-top: 10px;
  color: #ccaf54;
  background: transparent;
  border: 1px solid rgba(204, 175, 84, 0.45);
}
</style>
