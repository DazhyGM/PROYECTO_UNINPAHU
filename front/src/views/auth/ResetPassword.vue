<template>
  <div class="reset-password">
    <header
      class="d-flex flex-wrap align-items-center justify-content-center justify-content-md-between py-3 mb-4 border-bottom">
      <div class="col-md-3 mb-2 mb-md-0">
  <router-link to="/Home">
    <img src="/img/background/LOGO.png" alt="Logo" width="125" height="125" class="d-inline-block align-text-top" />
  </router-link>
</div>

      <ul class="nav col-12 justify-content-center mx-auto">
        <h1 class="titulo-header">Restablecer Contraseña</h1>
      </ul>
    </header>
    <form @submit.prevent="resetPassword">
      <label for="password">Nueva Contraseña</label>
      <input v-model="newPassword" type="password" placeholder="Escribe aqui tu nueva contraseña" required />
      <label for="password">Confirmar Contraseña</label>
      <input v-model="confirmPassword" type="password" placeholder="Confirma la contraseña" required />
      <button class="btn btn-update" type="submit">Actualizar Contraseña</button>
    </form>
  </div>
</template>

<script>
import { resetPassword } from '@/services/api.js';
import { notificar } from '@/utils/alerts';

export default {
  data() {
    return {
      newPassword: '',
      confirmPassword: ''
    };
  },
  methods: {
    async resetPassword() {
      if (this.newPassword !== this.confirmPassword) {
        notificar('Las contraseñas no coinciden', 'warning');
        return;
      }

      try {
        const token = this.$route.params.token;
        const response = await resetPassword(token, this.newPassword);
        await notificar(response.message || 'Contraseña cambiada exitosamente.', 'success');
        this.$router.push("/login");

      } catch (error) {
        notificar('Ocurrió un error, intenta nuevamente', 'error');
        console.error("Error en resetPassword:", error);
      }
    }
  },
};
</script>

<style scoped>
/* .container {
  max-width: 600px;
  margin: auto;
  text-align: center;
}

:placeholder-shown{
  background-color: rgb(29, 27, 27);
  border-radius: 10px;
  text-align: center;
}

input,
button {
  width: 100%;
  margin: 10px 0;
  padding: 10px;
} */
 @import '@/assets/css/auth/resetPassword.css';
</style>