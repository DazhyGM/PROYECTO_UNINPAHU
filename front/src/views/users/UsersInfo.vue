<template>
  <div class="container usuarios-page my-3">
    <div class="row mb-3">
      <ul class="nav col-12 justify-content-center mx-auto">
        <h1 class="titulo-header">Usuarios</h1>
      </ul>
    </div>

    <div class="barra-usuarios">
      <router-link to="/AgregarUser" class="btn btn-agregar">
        <img src="/img/logos/person-plus-fill.svg" alt="" width="18" height="18">
        Agregar
      </router-link>

      <router-link to="/usersInactives" class="btn btn-agregar">
        Ver usuarios inactivos
      </router-link>

      <SelectCampo v-model="selectedRole" :options="roles" @change="filtrarPorRol" />

      <div class="buscar-usuario dropdown">
        <input type="text" v-model="searchQuery" class="form-control" placeholder="Buscar usuario...">
        <button class="btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-label="Ordenar usuarios"></button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><button class="dropdown-item" type="button" @click="sortUsers('asc')">A......Z</button></li>
          <li><button class="dropdown-item" type="button" @click="sortUsers('desc')">Z......A</button></li>
        </ul>
      </div>
    </div>

    <div class="pedido-container">
      <div v-for="user in filteredUsers" :key="user.user_id" class="pedido-box">
        <div class="icon-usuario-container">
          <img src="/img/logos/person-circle.svg" class="btn icon-usuario">
        </div>

        <h5>{{ user.full_name }}</h5>

        <div class="icon-container">
          <router-link :to="`/EditUser/${user.user_id}`" class="btn btn-icon">
            <img src="/img/logos/pencil.svg" alt="Icono lapiz">
          </router-link>
          <router-link :to="`/VerUser/${user.user_id}`" class="btn btn-icon">
            <img src="/img/logos/eye.svg" alt="Icono Ojo">
          </router-link>
          <button class="btn btn-icon" @click="confirmDelete(user.user_id)">
            <img src="/img/logos/x-circle.svg">
          </button>

          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" :checked="user.userStatus_fk === 1"
              @change="toggleUserStatus(user)" :disabled="user.userStatus_fk === 3" :class="{
                'active-switch': user.userStatus_fk === 1,
                'blocked-switch': user.userStatus_fk === 2,
                'disabled-switch': user.userStatus_fk === 4,
              }" />
          </div>
        </div>
      </div>
    </div>

    <div class="btn-regresar mt-3">
      <button class="btn back-button" @click="goBack">Regresar</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from "vue-router";
import { getUsers, deleteUser, updateUserStatus, filterUsersByRole } from '@/services/api';
import SelectCampo from '@/components/ui/SelectCampo.vue';

const router = useRouter();
const users = ref([]);
const searchQuery = ref("");
const selectedRole = ref("");
const sortOrder = ref("");
const roles = [
  { value: "", label: "Todos los roles" },
  { value: "1", label: "Administrador" },
  { value: "2", label: "Empleado" },
  { value: "3", label: "Cliente" }
];

const loadUsers = async () => {
  try {
    users.value = await getUsers();
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
  }
};

const filteredUsers = computed(() => {
  let result = users.value.filter(user =>
    user.userStatus_fk !== 3 &&
    (selectedRole.value === "" || user.role_fk === Number(selectedRole.value)) &&
    (
      user.full_name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.document_number.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  );

  if (sortOrder.value === "asc") {
    result.sort((a, b) =>
      a.full_name.trim().localeCompare(b.full_name.trim(), 'es', { sensitivity: 'base' })
    );
  } else if (sortOrder.value === "desc") {
    result.sort((a, b) =>
      b.full_name.trim().localeCompare(a.full_name.trim(), 'es', { sensitivity: 'base' })
    );
  }

  return result;
});

const filtrarPorRol = async () => {
  try {
    if (selectedRole.value === "") {
      await loadUsers();
    } else {
      const data = await filterUsersByRole(selectedRole.value);
      users.value = Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.error("Error al filtrar por rol:", error);
  }
};

const toggleUserStatus = async (user) => {
  const newStatus = user.userStatus_fk === 1 ? 2 : 1;
  try {
    const response = await updateUserStatus(user.user_id, newStatus);
    if (response && response.message) {
      user.userStatus_fk = newStatus;
    } else {
      alert("Error al actualizar el estado del usuario.");
    }
  } catch (error) {
    alert("Hubo un error al cambiar el estado del usuario.");
  }
};

const confirmDelete = async (id) => {
  if (window.confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
    try {
      await deleteUser(id);
      users.value = users.value.filter(user => user.user_id !== id);
      alert("✅ Usuario eliminado exitosamente.");
    } catch (error) {
      alert("Hubo un error al intentar eliminar el usuario.");
    }
  }
};

const sortUsers = (order) => {
  sortOrder.value = order;
};

const goBack = () => {
  router.push('/Home');
};

onMounted(loadUsers);
</script>

<style scoped>
@import '@/assets/css/users/usersInfo.css';
</style>
