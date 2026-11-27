<template>
  <div class="container-scaled-wrapper">
    <header class="insumos-cabecera">
      <h1 class="titulo-header">{{ userRole === 'Employee' ? 'Mis insumos' : 'Insumos' }}</h1>
      <button class="page-back" type="button" @click="goBack">Regresar</button>
    </header>

    <div class="insumos-barra" v-if="userRole === 'Admin'">
      <router-link to="/Create-Products" class="btn btn-agregar">
        <img src="/img/logos/person-plus-fill.svg" style="width: 20px; height: 20px; margin-right: 5px;" />
        Agregar
      </router-link>
      <router-link to="/Asignar-Insumos" class="btn btn-agregar">Asignar a empleados</router-link>
      <router-link to="/ProductsInactives" class="btn btn-botonavinactive">
        Ver insumos inactivos
      </router-link>
    </div>

    <div class="container">

      <div v-if="userRole === 'Employee'" class="insumo-acciones">
        <router-link to="/Cierre-Turno" class="btn btn-agregar">Registrar consumo del turno</router-link>
      </div>

      <SkeletonCarga v-if="cargando" tipo="tarjetas" :cantidad="4" />
      <p v-else-if="userRole === 'Employee' && products.length === 0" class="insumo-nota">
        Todavía no tienes insumos asignados. El administrador debe entregártelos antes del turno.
      </p>
      <div v-else class="product-grid">
        <div class="product-card" v-for="product in products" :key="product.id_product">
          <img :src="getImageUrl(product.image)" alt="Imagen del insumo" class="product-img" />
          <h2 class="product-name">{{ product.name }}</h2>
          <p class="product-description">{{ product.description }}</p>
          <p v-if="userRole !== 'Employee'" class="product-price">${{ Number(product.price).toLocaleString() }}</p>
          <p class="product-amount">
            <strong>{{ userRole === 'Employee' ? 'Asignadas:' : 'Disponibles:' }}</strong>
            {{ userRole === 'Employee' ? product.cantidad : product.amount }}
          </p>
          <p v-if="userRole === 'Employee'" class="product-amount"><strong>En inventario:</strong> {{ product.stock }}</p>

          <div class="card-actions" v-if="userRole === 'Admin'">
            <label class="switch">
              <input type="checkbox" :checked="product.id_status === 1" @change="() => toggleSwitch(product)" />
              <span class="slider round"
                :class="{ blocked: product.id_status === 2, active: product.id_status === 1 }"></span>
            </label>

            <button class="btn-view" @click="() => viewProductDetails(product)">Ver</button>
            <button class="btn-edit" @click="() => editProduct(product.id_product)">Editar</button>
            <button class="btn-delete-prod" @click="() => confirmInactivate(product.id_product)">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showProductModal && selectedProduct" class="modal-overlay" @click.self="showProductModal = false">
    <div class="modal-content">
      <button class="close-modal-btn" @click="showProductModal = false">X</button>
      <h2 class="modal-title">{{ selectedProduct.name }}</h2>
      <img :src="getImageUrl(selectedProduct.image)" alt="Imagen del insumo" class="modal-product-img" />
      <p class="modal-description"><strong>Descripción:</strong> {{ selectedProduct.description }}</p>
      <p class="modal-price"><strong>Precio:</strong> ${{ Number(selectedProduct.price).toLocaleString() }}</p>
      <p class="modal-amount"><strong>Disponibles:</strong> {{ selectedProduct.amount }}</p>
      <p v-if="selectedProduct.comprobante" class="modal-description"><strong>Comprobante:</strong> {{ selectedProduct.comprobante }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getProducts, getMiDotacion, updateProductStatus } from "@/services/productsApi";
import axios from 'axios';
import { confirmar } from '@/utils/alerts';
import SkeletonCarga from '@/components/ui/SkeletonCarga.vue';

const router = useRouter();
const products = ref([]);
const userRole = ref('');
const cargando = ref(true);
const showProductModal = ref(false);
const selectedProduct = ref(null);

const goBack = () => router.push("/Home");
const getImageUrl = (imageName) => imageName ? `http://localhost:5000/uploads/${imageName}` : '/img/background/signointerrogacion.jpg';

const loadProducts = async () => {
  cargando.value = true;
  try {
    products.value = userRole.value === 'Employee' ? await getMiDotacion() : await getProducts();
  } finally {
    cargando.value = false;
  }
};

const fetchUserRole = async () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  const { data } = await axios.get('http://localhost:5000/api/users/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
  userRole.value = data.role;
};

const toggleSwitch = async (product) => {
  const newStatus = product.id_status === 1 ? 2 : 1;
  const action = newStatus === 1 ? "activo" : "agotado";
  const confirmed = await confirmar(`¿Estás seguro que deseas poner este insumo en estado ${action}?`);
  if (!confirmed) {
    await loadProducts();
    return;
  }
  await updateProductStatus(product.id_product, newStatus);
  await loadProducts();
};

const confirmInactivate = async (id_product) => {
  const confirmDelete = await confirmar("¿Estás seguro que deseas eliminar este insumo?");
  if (!confirmDelete) return;
  await updateProductStatus(id_product, 3);
  await loadProducts();
};

const editProduct = (id) => router.push(`/Edit-Products/${id}`);

const viewProductDetails = (product) => {
  selectedProduct.value = product;
  showProductModal.value = true;
};

onMounted(async () => {
  try {
    await fetchUserRole();
  } catch (error) {
    userRole.value = '';
  }
  await loadProducts();
});
</script>
<style scoped>
@import '@/assets/css/products/products.css';
</style>
