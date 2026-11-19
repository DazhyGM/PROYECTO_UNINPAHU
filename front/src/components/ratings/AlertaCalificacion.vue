<template>
  <div v-if="visible && citaActual" class="alerta-fondo" role="presentation">
    <section class="alerta-panel" role="dialog" aria-modal="true" aria-labelledby="titulo-encuesta">
      <p class="alerta-kicker">Servicio finalizado</p>
      <h2 id="titulo-encuesta">Cuéntanos cómo te fue</h2>
      <p class="alerta-texto">
        Tu cita ya terminó. Responde estas dos preguntas para guardar la calificación de esta visita.
        <span v-if="pendientes.length > 1"> Tienes {{ pendientes.length }} encuestas pendientes.</span>
      </p>

      <FormularioCalificacion :cita="citaActual" :key="citaActual.id_quotes" @guardada="alGuardar" />

      <button class="btn-despues" type="button" @click="posponer">Ahora no</button>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import FormularioCalificacion from '@/components/ratings/FormularioCalificacion.vue';
import { getPendingRatings } from '@/services/ratingsApi';

const CLAVE = 'calificacionesPospuestas';
const route = useRoute();
const pendientes = ref([]);
const visible = ref(false);

const citaActual = computed(() => pendientes.value[0] || null);

const rutasSinAlerta = () => {
  const path = route.path;
  return path.startsWith('/Calificar')
    || path.startsWith('/Login')
    || path.startsWith('/Register')
    || path.startsWith('/forgotPassword')
    || path.startsWith('/reset-password')
    || path === '/';
};

const idsPospuestos = () => {
  try {
    const guardados = JSON.parse(sessionStorage.getItem(CLAVE) || '[]');
    return new Set(guardados.map(Number));
  } catch (error) {
    return new Set();
  }
};

const cargar = async () => {
  if (!localStorage.getItem('token') || rutasSinAlerta()) {
    visible.value = false;
    pendientes.value = [];
    return;
  }

  try {
    const citas = await getPendingRatings();
    const omitidas = idsPospuestos();
    pendientes.value = (citas || []).filter((cita) => !omitidas.has(Number(cita.id_quotes)));
    visible.value = pendientes.value.length > 0;
  } catch (error) {
    pendientes.value = [];
    visible.value = false;
  }
};

const posponer = () => {
  const actuales = idsPospuestos();
  pendientes.value.forEach((cita) => actuales.add(Number(cita.id_quotes)));
  sessionStorage.setItem(CLAVE, JSON.stringify([...actuales]));
  visible.value = false;
  pendientes.value = [];
};

const alGuardar = () => {
  pendientes.value = pendientes.value.slice(1);
  visible.value = pendientes.value.length > 0;
};

onMounted(cargar);
watch(() => route.fullPath, cargar);
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

.alerta-texto {
  margin: 0 0 18px;
  color: #bdbdbd;
  line-height: 1.5;
}

.btn-despues {
  width: 100%;
  height: 40px;
  margin-top: 10px;
  color: #ccaf54;
  background: transparent;
  border: 1px solid rgba(204, 175, 84, 0.45);
  border-radius: 10px;
  cursor: pointer;
}
</style>
