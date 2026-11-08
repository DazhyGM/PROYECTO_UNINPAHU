<template>
  <div class="login-page">
    <header class="login-header">
      <img src="/img/background/LOGO.png" alt="Logo" class="login-logo" />
      <h1 class="login-title">Iniciar Sesión</h1>
      <p class="login-subtitle">Ingresa tu correo y contraseña para continuar.</p>
    </header>

    <section class="login-panel">
      <form @submit.prevent="logIn" class="login-form">
        <p v-if="message" class="login-message">{{ message }}</p>

        <label class="login-field" for="email">
          <span>Correo electrónico</span>
          <input type="email" id="email" v-model="email" required placeholder="Ingresa tu correo electrónico" />
        </label>

        <label class="login-field" for="password">
          <span>Contraseña</span>
          <input type="password" id="password" v-model="password" required placeholder="Ingresa tu contraseña" />
        </label>

        <button type="submit" class="btn-iniciar-sesion" :disabled="loading">
          {{ loading ? 'Ingresando...' : 'Iniciar Sesión' }}
        </button>

        <div class="links">
          <a href="/forgotPassword">Recuperar contraseña</a>
          <a href="/register">¿No tienes usuario? Regístrate aquí</a>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "@/services/api";

const router = useRouter();

const email = ref("");
const password = ref("");
const message = ref("");
const loading = ref(false);

const logIn = async () => {
  if (!email.value || !password.value) {
    message.value = "⚠️ Todos los campos son obligatorios";
    return;
  }

  try {
    loading.value = true;
    console.log("📩 Enviando datos:", email.value, password.value);

    const data = await login(email.value, password.value);

    if (!data.token) {
      throw new Error("No se recibió un token");
    }

    message.value = "✅ Inicio de sesión exitoso";

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setTimeout(() => {
      router.push("/Home");
    }, 1000);

  } catch (error) {
    console.error("⚠️ Error en el login:", error);

    if (error.response) {
        if (error.response.status === 403) {
            if (error.response.data.error.includes("bloqueada")) {
                router.push("/errorUserBlock"); // Redirige si el usuario está bloqueado
            } else if (error.response.data.error.includes("eliminada")) {
                router.push("/errorUserDeleted"); // Redirige si el usuario está eliminado
            }
        } else if (error.response.status === 401) {
            message.value = error.response.data.error || "Credenciales incorrectas. Intenta nuevamente."; 
        } else {
            message.value = error.response.data.error || "Ocurrió un error inesperado.";
        }
    } else {
        message.value = "Error de conexión con el servidor.";
    }
  }
  finally {
    loading.value = false;
  }
};
</script>

<style scoped>
 @import '@/assets/css/auth/loginUser.css';
</style>