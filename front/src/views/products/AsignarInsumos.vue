<template>
  <button class="page-back" type="button" @click="goBack">Regresar</button>
  <div class="page-top">
    <h1 class="titulo-header">Asignar insumos</h1>
  </div>
  <p class="insumo-nota">
    Elige un empleado y la cantidad de cada insumo que tendrá en su turno. No puedes asignar más de lo que hay en inventario.
  </p>

  <div class="container">
    <label class="form-label" for="empleado">Empleado</label>
    <select id="empleado" v-model="barberoId" class="insumo-selector" @change="cargarAsignacion">
      <option value="">Selecciona un empleado</option>
      <option v-for="empleado in empleados" :key="empleado.user_id" :value="empleado.user_id">
        {{ empleado.full_name }}
      </option>
    </select>
  </div>

  <SkeletonCarga v-if="cargando" tipo="filas" />
  <form v-else-if="barberoId" @submit.prevent="guardar">
    <table class="insumo-tabla">
      <thead>
        <tr>
          <th>Insumo</th>
          <th>En inventario</th>
          <th>Asignado a otros</th>
          <th>Cantidad para este empleado</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="insumo in insumos" :key="insumo.id_product">
          <td>{{ insumo.name }}</td>
          <td>{{ insumo.stock }}</td>
          <td>{{ insumo.asignado_otros }}</td>
          <td>
            <input
              v-model.number="insumo.cantidad"
              type="number"
              min="0"
              :max="disponible(insumo)"
            />
            <p v-if="insumo.cantidad > disponible(insumo)" class="error-message">
              Máximo disponible: {{ disponible(insumo) }}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="insumo-acciones">
      <button class="btn btn-agregar" type="submit" :disabled="guardando || !puedeGuardar">
        {{ guardando ? 'Guardando...' : 'Guardar asignación' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import SkeletonCarga from '@/components/ui/SkeletonCarga.vue';
import { getAsignacion, guardarAsignacion } from '@/services/productsApi';
import { notificar } from '@/utils/alerts';

const router = useRouter();
const empleados = ref([]);
const barberoId = ref('');
const insumos = ref([]);
const cargando = ref(false);
const guardando = ref(false);

const goBack = () => router.push('/Products');
const disponible = (insumo) => Math.max(Number(insumo.stock) - Number(insumo.asignado_otros), 0);
const puedeGuardar = computed(() => insumos.value.every((insumo) => {
  const cantidad = Number(insumo.cantidad);
  return Number.isInteger(cantidad) && cantidad >= 0 && cantidad <= disponible(insumo);
}));

const cargarEmpleados = async () => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get('/api/users/barbers', {
    headers: { Authorization: `Bearer ${token}` },
  });
  empleados.value = Array.isArray(data) ? data : [];
};

const cargarAsignacion = async () => {
  if (!barberoId.value) {
    insumos.value = [];
    return;
  }
  cargando.value = true;
  try {
    const data = await getAsignacion(barberoId.value);
    insumos.value = (data.insumos || []).map((insumo) => ({
      ...insumo,
      cantidad: Number(insumo.cantidad) || 0,
      stock: Number(insumo.stock) || 0,
      asignado_otros: Number(insumo.asignado_otros) || 0,
    }));
  } catch (error) {
    insumos.value = [];
    notificar(error.response?.data?.error || 'No se pudo cargar la asignación.', 'error');
  } finally {
    cargando.value = false;
  }
};

const guardar = async () => {
  if (!puedeGuardar.value) return;
  guardando.value = true;
  try {
    await guardarAsignacion(barberoId.value, insumos.value.map((insumo) => ({
      id_product: insumo.id_product,
      cantidad: Number(insumo.cantidad) || 0,
    })));
    await notificar('Asignación guardada.', 'success');
    await cargarAsignacion();
  } catch (error) {
    notificar(error.response?.data?.error || 'No se pudo guardar la asignación.', 'error');
  } finally {
    guardando.value = false;
  }
};

onMounted(async () => {
  try {
    await cargarEmpleados();
  } catch (error) {
    notificar('No se pudieron cargar los empleados.', 'error');
  }
});
</script>

<style scoped>
@import '@/assets/css/products/products.css';
</style>
