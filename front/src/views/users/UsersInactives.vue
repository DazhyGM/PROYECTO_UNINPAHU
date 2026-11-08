<template>
  <div class="row mb-2">
    <ul class="nav col-12 justify-content-center mx-auto">
      <h1 class="titulo-header">Usuarios Inactivos</h1>
    </ul>
  </div>

  <div class="container">
    <div class="search-filter-container">
      <div class="input-group buscar-usuario">
        <input type="text" v-model="searchQuery" class="form-control" placeholder="Buscar usuario...">
        <button class="btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-label="Ordenar usuarios"></button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><button class="dropdown-item" type="button" @click="sortUsers('asc')">A......Z</button></li>
          <li><button class="dropdown-item" type="button" @click="sortUsers('desc')">Z......A</button></li>
        </ul>
      </div>

      <SelectCampo v-model="selectedRole" :options="roles" />
    </div>

    <div class="content">
      <div class="pedido-container">
        <div v-for="user in filteredInactiveUsers" :key="user.user_id" class="pedido-box">
          <div class="icon-usuario-container">
            <img src="/img/logos/person-circle.svg" class="btn icon-usuario">
          </div>
          <span class="user-name">{{ user.full_name }}</span>
          <button class="activate-btn" @click="activateUser(user)">Activar</button>
        </div>
        <button class="btn back-button" @click="goBack">Regresar</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getInactiveUsers, updateUserStatus } from '@/services/api';
import SelectCampo from '@/components/ui/SelectCampo.vue';

const router = useRouter();
const inactiveUsers = ref([]);
const searchQuery = ref("");
const selectedRole = ref("");
const sortOrder = ref("");
const roles = [
  { value: "", label: "Todos los roles" },
  { value: "1", label: "Administrador" },
  { value: "2", label: "Empleado" },
  { value: "3", label: "Cliente" }
];

const loadInactiveUsers = async () => {
  try {
    inactiveUsers.value = await getInactiveUsers();
  } catch (error) {
    console.error("Error al obtener usuarios inactivos:", error);
  }
};

const activateUser = async (user) => {
  try {
    await updateUserStatus(user.user_id, 1);
    inactiveUsers.value = inactiveUsers.value.filter(u => u.user_id !== user.user_id);
  } catch (error) {
    console.error("Error al activar usuario:", error);
  }
};

const sortUsers = (order) => {
  sortOrder.value = order;
};

const filteredInactiveUsers = computed(() => {
  let result = inactiveUsers.value.filter(user =>
    user.userStatus_fk === 3 &&
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

const goBack = () => {
  router.push('/Users');
};

onMounted(loadInactiveUsers);
</script>

<style scoped>
@import '@/assets/css/users/usersInactives.css';
</style>
