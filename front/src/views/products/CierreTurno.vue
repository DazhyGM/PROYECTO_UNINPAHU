<template>
  <button class="page-back" type="button" @click="goBack">Regresar</button>
  <div class="page-top">
    <h1 class="titulo-header">Cierre de turno</h1>
  </div>
  <p class="insumo-nota">
    Escribe cuántas unidades gastaste hoy. Al guardar, esa cantidad se descuenta de tus insumos asignados y del inventario.
  </p>

  <SkeletonCarga v-if="cargando" tipo="filas" />
  <p v-else-if="insumos.length === 0" class="insumo-nota">No tienes insumos asignados para reportar.</p>
  <form v-else @submit.prevent="enviar">
    <table class="insumo-tabla">
      <thead>
        <tr>
          <th>Insumo</th>
          <th>Asignadas</th>
          <th>En inventario</th>
          <th>Gastadas hoy</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="insumo in insumos" :key="insumo.id_product">
          <td>{{ insumo.name }}</td>
          <td>{{ insumo.cantidad }}</td>
          <td>{{ insumo.stock }}</td>
          <td>
            <span v-if="insumo.consumido_hoy !== null && insumo.consumido_hoy !== undefined">
              Ya registraste {{ insumo.consumido_hoy }}
            </span>
            <input
              v-else
              v-model.number="insumo.gastadas"
              type="number"
              min="0"
              :max="maximo(insumo)"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <div class="insumo-acciones">
      <button class="btn btn-agregar" type="submit" :disabled="guardando || !pendientes.length || !puedeEnviar">
        {{ guardando ? 'Registrando...' : 'Registrar consumo' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import SkeletonCarga from '@/components/ui/SkeletonCarga.vue';
import { getMiDotacion, registrarConsumo } from '@/services/productsApi';
import { notificar } from '@/utils/alerts';

const router = useRouter();
const insumos = ref([]);
const cargando = ref(true);
const guardando = ref(false);

const goBack = () => router.push('/Products');
const maximo = (insumo) => Math.max(Math.min(Number(insumo.cantidad), Number(insumo.stock)), 0);
const pendientes = computed(() => insumos.value.filter((insumo) => insumo.consumido_hoy === null || insumo.consumido_hoy === undefined));
const puedeEnviar = computed(() => pendientes.value.every((insumo) => {
  const gastadas = Number(insumo.gastadas);
  return Number.isInteger(gastadas) && gastadas >= 0 && gastadas <= maximo(insumo);
}));

const cargar = async () => {
  cargando.value = true;
  try {
    const data = await getMiDotacion();
    insumos.value = (Array.isArray(data) ? data : []).map((insumo) => ({
      ...insumo,
      cantidad: Number(insumo.cantidad) || 0,
      stock: Number(insumo.stock) || 0,
      consumido_hoy: insumo.consumido_hoy === null || insumo.consumido_hoy === undefined ? null : Number(insumo.consumido_hoy),
      gastadas: 0,
    }));
  } catch (error) {
    insumos.value = [];
    notificar(error.response?.data?.error || 'No se pudieron cargar tus insumos.', 'error');
  } finally {
    cargando.value = false;
  }
};

const enviar = async () => {
  if (!puedeEnviar.value || !pendientes.value.length) return;
  guardando.value = true;
  try {
    await registrarConsumo(pendientes.value.map((insumo) => ({
      id_product: insumo.id_product,
      cantidad: Number(insumo.gastadas) || 0,
    })));
    await notificar('Consumo registrado. El inventario fue descontado.', 'success');
    await cargar();
  } catch (error) {
    notificar(error.response?.data?.error || 'No se pudo registrar el consumo.', 'error');
  } finally {
    guardando.value = false;
  }
};

onMounted(cargar);
</script>

<style scoped>
@import '@/assets/css/products/products.css';
</style>
