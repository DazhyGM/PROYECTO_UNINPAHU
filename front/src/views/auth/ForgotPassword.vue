<template>
  <div class="container-password">
    <header
      class="d-flex flex-wrap align-items-center justify-content-center justify-content-md-between py-3 mb-4 border-bottom">
      <div class="col-md-3 mb-2 mb-md-0">
        <img src="/img/background/LOGO.png" alt="Logo" width="125" height="125" class="d-inline-block align-text-top" />
      </div>
      <ul class="nav col-12 justify-content-center mx-auto">
        <h1>Recuperar Contraseña</h1>
      </ul>
    </header>

    <p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
    <form @submit.prevent="sendRecoveryEmail">
      <input v-model="email" type="email" placeholder="Escribe aqui tu correo electrónico" required :disabled="loading" />
      <button class="btn button-enviar" type="submit" :disabled="loading">
        {{ loading ? 'Enviando...' : 'Enviar' }}
      </button>
    </form>
    <button class="btn-regresar" @click="goBack" :disabled="loading">Regresar</button>

    <p v-if="message" class="feedback" :class="messageType === 'success' ? 'feedback-success' : 'feedback-error'" role="alert">
      {{ message }}
    </p>
  </div>
</template>

<script>
import { requestPasswordReset } from '@/services/api';

export default {
  data() {
    return {
      email: '',
      message: '',
      messageType: '',
      loading: false
    };
  },
  methods: {
    async sendRecoveryEmail() {
      this.message = '';
      this.messageType = '';
      const email = this.email.trim();

      if (!email) {
        this.messageType = 'error';
        this.message = 'Escribe el correo con el que te registraste.';
        return;
      }

      this.loading = true;
      try {
        const data = await requestPasswordReset(email);
        this.messageType = 'success';
        this.message = data.message || 'Te enviamos un enlace para restablecer tu contraseña.';
      } catch (error) {
        const serverMessage = error.response?.data?.message;
        this.messageType = 'error';
        this.message = typeof serverMessage === 'string' && serverMessage
          ? serverMessage
          : 'No pudimos enviar el correo. Inténtalo de nuevo.';
      } finally {
        this.loading = false;
      }
    },
    goBack() {
      this.$router.push('/Login');
    }
  }
};
</script>

<style scoped>
@import '@/assets/css/auth/forgotPassword.css';
</style>