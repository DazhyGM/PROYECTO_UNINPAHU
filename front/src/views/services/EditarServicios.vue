<template>
  <div class="page-top">
    <router-link to="/Services" class="page-back">Regresar</router-link>
    <h1 class="titulo-header">Editar Servicio</h1>
  </div>

  <div class="container-edit-services">
    <div class="row edit-container">
      <div class="col-md-5 text-center">
        <label class="form-label">Imagen actual:</label>
        
        <div class="image-placeholder mx-auto mb-3 d-flex align-items-center justify-content-center bg-light border rounded overflow-hidden" style="width: 200px; height: 200px;">
          <img :src="imagePreview || '/img/background/signointerrogacion.jpg'" alt="Preview" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
        </div>

        <div class="mb-3">
          <label class="form-label">Imagen</label>
          <input type="file" @change="handleImageUpload" class="form-control custom-input" />
          <div class="form-text mt-1" style="font-size: 0.85rem; color: #adb5bd;">
            <i class="bi bi-info-circle"></i> Tamaño ideal: 500x500 px (Formatos: JPG, PNG).
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Precio</label>
          <input v-model="form.price" type="number" class="form-control custom-input" placeholder="Precio" required />
        </div>

      </div>

      <div class="col-md-5 offset-md-1">
        <form @submit.prevent="handleSubmit" class="edit-form">
          <div class="mb-3">
            <label class="form-label">Nombre</label>
            <input v-model="form.name_service" type="text" class="form-control custom-input"
              placeholder="Nombre del servicio" required />
          </div>

          <div class="mb-3">
            <label class="form-label">Descripción</label>
            <input v-model="form.description" type="text" class="form-control custom-input" placeholder="Descripción"
              required />
          </div>

          <div class="mb-3">
            <label class="form-label">Tiempo estimado</label>
            <input v-model="form.estimated_time" type="text" class="form-select custom-input" placeholder="00:30:00"
              required />
          </div>

          <div class="mb-3">
            <label class="form-label">Categoría</label>
            <SelectCampo
              v-model="form.id_category_services"
              :options="categoriasServicio"
              placeholder="Seleccionar"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Estado</label>
            <SelectCampo v-model="form.id_status" :options="estadosServicio" />
          </div>

          <button type="submit" class="btn w-100 btn-save-service">
            Guardar Cambios
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getServiceById, updateService } from '@/services/servicesApi';
import SelectCampo from '@/components/ui/SelectCampo.vue';
import { notificar } from '@/utils/alerts';

export default {
  components: { SelectCampo },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const id = route.params.id;

    const imagePreview = ref(null);
    const selectedImageFile = ref(null);

    const form = ref({
      name_service: '',
      description: '',
      estimated_time: '',
      price: '',
      id_category_services: '',
      id_status: 1,
    });

    const categoriasServicio = [
      { value: '1', label: 'Corte' },
      { value: '2', label: 'Barba' },
      { value: '3', label: 'Cejas' },
      { value: '4', label: 'Tintes' },
      { value: '5', label: 'Combos' }
    ];
    const estadosServicio = [
      { value: 1, label: 'Activo' },
      { value: 2, label: 'Inactivo' }
    ];

    // Función limpia para resolver la ruta de la imagen sin quemar la URL completa
    const getServiceImage = (imageName) => {
      if (!imageName) return null;
      // Si ya viene con http o blob (preview local), se retorna tal cual
      if (imageName.startsWith('http') || imageName.startsWith('blob')) {
        return imageName;
      }
      // De lo contrario, usa la URL base de tu API o axios configurado
      return `/uploads/${imageName}`;
    };

    const loadService = async () => {
      try {
        const data = await getServiceById(id);
        form.value = {
          name_service: data.name_service,
          description: data.description,
          estimated_time: data.estimated_time,
          price: data.price,
          id_category_services: data.id_category_services,
          id_status: data.id_status,
        };
        
        if (data.image) {
          imagePreview.value = getServiceImage(data.image);
        }
      } catch (err) {
        console.error(err);
        notificar('Error al cargar el servicio.', 'error');
      }
    };

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedImageFile.value = file;
        imagePreview.value = URL.createObjectURL(file); // Genera una URL temporal local para el preview instantáneo
      }
    };

    const handleSubmit = async () => {
      if (
        !form.value.name_service.trim() ||
        !form.value.description.trim() ||
        !form.value.estimated_time.trim() ||
        !form.value.price ||
        !form.value.id_category_services
      ) {
        notificar('Por favor, complete todos los campos antes de continuar.', 'warning');
        return;
      }

      const formData = new FormData();
      for (const key in form.value) {
        formData.append(key, form.value[key]);
      }

      if (selectedImageFile.value) {
        formData.append('image', selectedImageFile.value);
      }

      try {
        await updateService(id, formData);
        await notificar('Servicio actualizado correctamente.', 'success');
        router.push('/Services');
      } catch (err) {
        console.error(err);
        notificar('Error al actualizar el servicio.', 'error');
      }
    };

    onMounted(loadService);

    return {
      categoriasServicio,
      estadosServicio,
      form,
      imagePreview,
      handleSubmit,
      handleImageUpload,
    };
  }
};
</script>

<style scoped>
@import '@/assets/css/services/editServices.css';
</style>