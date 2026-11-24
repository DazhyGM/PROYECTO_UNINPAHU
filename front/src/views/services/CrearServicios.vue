<template>
  <div class="page-top">
    <router-link to="/Services" class="page-back">Regresar</router-link>
    <h1 class="titulo-header">Agregar servicio</h1>
  </div>
  <div class="container-create-service">
    <div class="row add-service-container">
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
            <input v-model="form.estimated_time" type="text" class="form-control custom-input" placeholder="00:30:00"
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

          <button type="submit" class="btn w-100 btn-add-service">
            Agregar
          </button>
        </form>
      </div>
    </div>

  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createService } from '@/services/servicesApi';
import SelectCampo from '@/components/ui/SelectCampo.vue';
import { notificar } from '@/utils/alerts';

export default {
  components: { SelectCampo },
  setup() {
    const router = useRouter();
    const imagePreview = ref(null);
    const selectedImageFile = ref(null);

    const form = ref({
      name_service: '',
      description: '',
      estimated_time: '',
      price: '',
      id_category_services: '',
      id_status: 1,
      image: ''
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

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedImageFile.value = file;
        form.value.image = file.name;
        imagePreview.value = URL.createObjectURL(file);
      }
    };

    const handleSubmit = async () => {
      if (
        !form.value.name_service.trim() ||
        !form.value.description.trim() ||
        !form.value.estimated_time.trim() ||
        !form.value.price ||
        !form.value.id_category_services ||
        !selectedImageFile.value
      ) {
        notificar('Por favor, complete todos los campos antes de continuar.', 'warning');
        return;
      }

      try {
        const formData = new FormData();
        formData.append('name_service', form.value.name_service);
        formData.append('description', form.value.description);
        formData.append('estimated_time', form.value.estimated_time);
        formData.append('price', form.value.price);
        formData.append('id_category_services', form.value.id_category_services);
        formData.append('id_status', form.value.id_status);
        formData.append('image', selectedImageFile.value);

        await createService(formData);
        notificar('Servicio creado correctamente.', 'success');

        form.value = {
          name_service: '',
          description: '',
          estimated_time: '',
          price: '',
          id_category_services: '',
          id_status: 1,
          image: ''
        };
        selectedImageFile.value = null;
        imagePreview.value = null;

      } catch (err) {
        console.error(err);
        notificar('Error al crear el servicio.', 'error');
      }
    };

    const regresar = () => {
      router.push('/editarServiciosADM');
    };

    return {
      categoriasServicio,
      estadosServicio,
      form,
      imagePreview,
      handleSubmit,
      handleImageUpload,
      regresar
    };
  }
};
</script>

<style scoped>
@import '@/assets/css/services/createServices.css';
</style>
