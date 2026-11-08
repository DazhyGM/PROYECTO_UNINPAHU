<template>
  <div class="row mb-2">
    <ul class="nav col-12 justify-content-center mx-auto">
      <h1 class="titulo-header">Perfil del Usuario</h1>
    </ul>
  </div>
  <div class="container perfil-usuario">
    <div class="profile-container">
      <div class="profile-image">
        <img src="/img/background/Icono usuario.png" width="100px" alt="Usuario">
      </div>
      <div class="profile-info">
        <div class="profile-name"><span class="profile-label">Nombre:</span> <span class="profile-value">{{ user.full_name }}</span></div>
        <div class="profile-name"><span class="profile-label">Correo:</span> <span class="profile-value">{{ user.user_email }}</span></div>
        <div class="profile-name"><span class="profile-label">Documento:</span> <span class="profile-value">{{ user.document_number }}</span></div>
        <div class="profile-name"><span class="profile-label">Tipo de Documento:</span> <span class="profile-value">{{ user.type_document }}</span></div>
        <div class="profile-name"><span class="profile-label">Dirección:</span> <span class="profile-value">{{ user.address }}</span></div>
        <div class="profile-name"><span class="profile-label">Telefono:</span> <span class="profile-value">{{ user.phone }}</span></div>
        <div class="profile-name" id="role"><span class="profile-label">Rol:</span> <span class="profile-value">{{ user.role }}</span></div>
      </div>
    </div>

    <div class="back-button-container">
      <router-link :to="`/EditPerfil/${user.id}`" class="btn btn-icon-edit">
        <img src="/img/background/editar_perfil_2.png"> Editar
      </router-link>
      <button v-if="['Cliente', 'Empleado'].includes(user.role)" class="btn botonav-citas" @click="goMisCitas">Mis
        citas</button>
      <button class="btn btn-delete" @click="confirmDelete"> Eliminar cuenta </button>
    </div>
    <button v-if="['Administrador', 'Cliente', 'Empleado'].includes(user.role)" class="btn back-button"
      @click="goBack">Regresar</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from "vue-router";
import { getUserData, deleteAccount } from "@/services/api";

const router = useRouter();
const isMenuOpen = ref(false);
const user = ref({});

const roleMapping = {
  "Admin": "Administrador",
  "Employee": "Empleado",
  "Client": "Cliente"
};

const fetchUserData = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("⚠️ No hay token en localStorage, redirigiendo al login.");
      router.push('/login');
      return;
    }

    const response = await getUserData(token);

    user.value = {
      id: response.user_id,
      full_name: response.full_name,
      user_email: response.user_email,
      document_number: response.document_number,
      type_document: response.type_document,
      address: response.address,
      phone: response.phone,
      role: roleMapping[response.role] || "Desconocido"
    };
  } catch (error) {
    console.error("Error al obtener los datos del usuario:", error);
    router.push('/login');
  }
};

const closeMenu = (event) => {
  if (!event.target.closest(".dropdown")) {
    isMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", closeMenu);
  fetchUserData();
});

onUnmounted(() => {
  document.removeEventListener("click", closeMenu);
});

const confirmDelete = async () => {
  const confirmed = window.confirm("¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.");
  if (!confirmed) return;

  try {
    const token = localStorage.getItem("token");
    await deleteAccount(user.value.id, token);
    alert("Cuenta eliminada exitosamente. ¡Hasta pronto!");
    localStorage.removeItem("token");
    router.push("/");
  } catch (error) {
    console.error("❌ Error al eliminar la cuenta:", error);
    alert("Hubo un problema al intentar eliminar tu cuenta.");
  }
};

const goBack = () => {
  router.push('/Home');
};

const goMisCitas = () => {
  router.push('/Citas');
};
</script>

<style scoped>
@import '@/assets/css/users/perfilUsuario.css';
</style>
