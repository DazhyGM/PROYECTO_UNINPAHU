<template>
  <div class="editar-producto">
    <div class="page-top">
      <button class="page-back" type="button" @click="goBack">Regresar</button>
      <h1 class="titulo-header">Editar producto</h1>
    </div>

    <div class="row edit-product-container">
      <div class="col-md-5 text-center">
        <div class="mb-3">
          <label class="form-label">Imagen</label>
          <div class="image-placeholder mx-auto mb-3">
            <img :src="imagenVisible" alt="Imagen del producto" class="preview-image" />
          </div>
          <input type="file" accept="image/*" @change="onImageSelected" class="form-select custom-input" />
        </div>

        <div class="mb-3">
          <label class="block mb-1 form-label">Precio</label>
          <input v-model.number="product.price" type="number" min="1000" step="500" required
            class="form-select custom-input" placeholder="Precio" />
        </div>

      </div>

      <div class="col-md-5 offset-md-1">
        <form @submit.prevent="update" class="edit-form">
          <div class="mb-3">
            <label class="block mb-1 form-label">Cantidad</label>
            <input v-model.number="product.amount" type="number" min="1" required class="form-select custom-input"
              placeholder="Cantidad" />
          </div>
          <div class="mb-3">
            <label class="block mb-1 form-label">Nombre</label>
            <input v-model="product.name" type="text" required class="form-select custom-input"
              placeholder="Nombre del producto" />
          </div>

          <div class="mb-3">
            <label class="block mb-1 form-label">Comprobante</label>
            <input v-model="product.comprobante" type="text" class="form-select custom-input"
              placeholder="Número o referencia del comprobante" />
          </div>

          <div class="mb-3">
            <label class="block mb-1 form-label">Descripción</label>
            <textarea v-model="product.description" required rows="3" class="form-select custom-input"
              placeholder="Descripción del producto"></textarea>
          </div>

          <div class="mb-3">
            <label class="block mb-1 form-label">Categoría</label>
            <SelectCampo
              v-model="product.id_category"
              :options="categories.map(cat => ({ value: cat.id, label: cat.name }))"
              placeholder="Seleccione una categoría"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Estado</label>
            <SelectCampo
              v-model="product.id_status"
              :options="[
                { value: 1, label: 'Activo' },
                { value: 2, label: 'Agotado' },
                { value: 3, label: 'Inactivo' }
              ]"
            />
          </div>
          <div class="contenedor-botones">
            <button type="submit" class="btn btn-guardar flex-grow-1 me-2">
              Guardar cambios
            </button>
            <button type="button" @click="goBack" class="btn btn-cancelar flex-grow-1">
              Cancelar
            </button>
          </div>

        </form>

      </div>

    </div>

  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import SelectCampo from "@/components/ui/SelectCampo.vue";
import { useRoute, useRouter } from "vue-router";
import { getProductById, updateProduct } from "@/services/productsApi";
import { notificar } from "@/utils/alerts";

const route = useRoute();
const router = useRouter();

const product = ref({
  name: "",
  price: 1000,
  description: "",
  comprobante: "",
  amount: 1,
  id_category: null,
  id_status: 1,
  image: "",
});
const newImage = ref(null);
const imagenLocal = ref('');
const imagenVisible = computed(() => imagenLocal.value || getImageUrl(product.value.image));

const categories = ref([
  { id: 1, name: "Cabello" },
  { id: 2, name: "Belleza" },
  { id: 3, name: "Tintes y Coloración" },
  { id: 4, name: "Tratamientos Capilares" },
  { id: 5, name: "Productos de Estilo" },
]);

const getImageUrl = (imageName) => {
  const nombre = String(imageName || '').trim();
  if (!nombre) return '/img/background/signointerrogacion.jpg';
  if (nombre.startsWith('http') || nombre.startsWith('/')) return nombre;
  return `/uploads/${nombre}`;
};

const loadProduct = async () => {
  try {
    const id = route.params.id;
    const data = await getProductById(id);

    if (data) {
      product.value = {
        ...data,
        price: data.price != null ? Number(data.price) : 1000,
        amount: data.amount != null ? Number(data.amount) : 1,
        id_category: data.id_category != null ? Number(data.id_category) : null,
        id_status: data.id_status != null ? Number(data.id_status) : 1,
      };
      newImage.value = null;
      if (imagenLocal.value) URL.revokeObjectURL(imagenLocal.value);
      imagenLocal.value = '';
    } else {
      notificar('Producto no encontrado.', 'error');
    }
  } catch (err) {
    console.error("Error al cargar el producto:", err);
    notificar('Error al cargar el producto. Intente de nuevo.', 'error');
  }
};

const onImageSelected = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (imagenLocal.value) URL.revokeObjectURL(imagenLocal.value);
  newImage.value = file;
  imagenLocal.value = URL.createObjectURL(file);
};

const update = async () => {
  if (
    !product.value.name.trim() ||
    !product.value.price ||
    !product.value.description.trim() ||
    !product.value.amount ||
    !product.value.id_category
  ) {
    notificar('Por favor, complete todos los campos requeridos.', 'warning');
    return;
  }

  if (product.value.price <= 0) {
    notificar('El precio debe ser un valor positivo.', 'warning');
    return;
  }
  if (product.value.amount <= 0) {
    notificar('La cantidad debe ser al menos 1.', 'warning');
    return;
  }

  try {
    const formData = new FormData();
    formData.append("name", product.value.name);
    formData.append("price", product.value.price);
    formData.append("description", product.value.description);
    formData.append("amount", product.value.amount);
    formData.append("id_category", product.value.id_category);
    formData.append("id_status", product.value.id_status);

    if (newImage.value instanceof File && newImage.value.size > 0) {
      const tipo = String(newImage.value.type || '');
      const nombre = String(newImage.value.name || '').toLowerCase();
      const pareceImagen = tipo.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|jfif)$/.test(nombre);
      if (!pareceImagen) {
        notificar('Selecciona un archivo de imagen.', 'warning');
        return;
      }
      formData.append("image", newImage.value);
    }

    await updateProduct(route.params.id, formData);
    await notificar("Producto actualizado correctamente.", "success");
    router.push("/Products");
  } catch (err) {
    console.error("Error al actualizar producto:", err);
    const detalle = err.response?.data?.error || err.response?.data?.message;
    notificar(detalle || "Error al actualizar el producto. Intente de nuevo.", "error");
  }
};

const goBack = () => {
  router.push("/Products");
};

onMounted(loadProduct);
</script>

<style scoped>
 @import "@/assets/css/products/editProduct.css";
</style>