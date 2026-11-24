<template>
  <div class="page-top">
    <router-link to="/Services" class="page-back">Regresar</router-link>
    <h1 class="titulo-header">Detalles del Servicio</h1>
  </div>

  <div class="container-service mt-5 text-white">
    <div class="card p-4 text-white">
      <h2 class="text-center mb-4">{{ service.name_service }}</h2>

      <div class="d-flex flex-column align-items-center">
        <!-- Contenedor optimizado para que la imagen se ajuste perfectamente -->
        <div class="image-container mb-4 text-center d-flex align-items-center justify-content-center bg-dark rounded overflow-hidden" style="width: 250px; height: 250px;">
          <img :src="getImage(service.image)" :alt="service.name_service" 
            style="max-width: 100%; max-height: 100%; object-fit: contain;" />
        </div>

        <div class="details text-center">
          <p><strong>Descripción:</strong> {{ service.description }}</p>
          <p><strong>Tiempo estimado:</strong> {{ service.estimated_time }}</p>
          <p><strong>Precio:</strong> ${{ service.price }}</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getServiceById } from '@/services/servicesApi';
import { notificar } from '@/utils/alerts';

const route = useRoute();
const router = useRouter();
const service = ref({});

// Obtener datos del servicio
const fetchService = async () => {
  try {
    const id = route.params.id;
    if (!id) throw new Error("ID no proporcionado");
    service.value = await getServiceById(id);
  } catch (error) {
    console.error("Error al obtener el servicio:", error);
    notificar("No se pudo cargar el servicio.");
    router.push('/Services');
  }
};

const getImage = (image) => {
  if (!image) return '/img/background/combo01.png';
  if (image.startsWith('http') || image.startsWith('blob')) {
    return image;
  }
  return `http://localhost:5000/uploads/${image}`;
};

onMounted(fetchService);
</script>

<style scoped>
 @import '@/assets/css/services/viewService.css';
</style>