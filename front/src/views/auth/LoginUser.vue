<template>
  <div class="login-page">
    <header class="login-header">
      <img src="/img/background/LOGO.png" alt="Logo" class="login-logo" />
      <h1 class="login-title">Iniciar Sesión</h1>
      <p class="login-subtitle">Ingresa tu correo y contraseña para continuar.</p>
    </header>

    <section class="login-panel">
      <form @submit.prevent="logIn" class="login-form">
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
import { useRoute, useRouter } from "vue-router";
import { login } from "@/services/api";
import { confirmarSesionLocal } from "@/services/sesionLocal";
import { notificar } from "@/utils/alerts";

const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const loading = ref(false);

const logIn = async () => {
  if (!email.value || !password.value) {
    notificar("Todos los campos son obligatorios", "warning");
    return;
  }

  try {
    loading.value = true;

    const data = await login(email.value, password.value);

    if (!data.token) {
      throw new Error("No se recibió un token");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    confirmarSesionLocal(data.token);

    if (data.user?.role === "Employee") {
      sessionStorage.setItem("barberCitasModal", "1");
    } else {
      sessionStorage.removeItem("barberCitasModal");
    }

    await notificar("Inicio de sesión exitoso", "success");
    const redirect = route.query.redirect;
    const destino = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
      ? redirect
      : '/Home';
    router.push(destino);

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
            notificar(error.response.data.error || "Credenciales incorrectas. Intenta nuevamente.", "error");
        } else {
            notificar(error.response.data.error || "Ocurrió un error inesperado.", "error");
        }
    } else {
        notificar("Error de conexión con el servidor.", "error");
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