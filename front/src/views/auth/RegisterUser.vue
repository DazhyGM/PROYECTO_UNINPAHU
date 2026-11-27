<template>
  <div class="container">
    <header class="d-flex flex-wrap align-items-center justify-content-center justify-content-md-between py-3 mb-4 border-bottom">
      <div class="page-back-row">
        <button class="page-back" type="button" @click="goBack">Regresar</button>
      </div>
      <div class="col-md-3 mb-2 mb-md-0">
  <router-link to="/Home">
    <img src="/img/background/LOGO.png" alt="Logo" width="125" height="125" class="d-inline-block align-text-top" />
  </router-link>
</div>

      <ul class="nav col-12 justify-content-center mx-auto">
        <h1 class="titulo-header">Registrarse</h1>
      </ul>
    </header>
  </div>

  <div class="recover-container">
    <form class="recover-form" @submit.prevent="confirmRegistro">
      <div class="row">
        <div class="col-md-6">
          <h3>Tipo de documento de identificación</h3>
          <label>
            <input type="radio" v-model="form.docType" value="1" required /> Cédula de Ciudadanía
          </label>
          <label>
            <input type="radio" v-model="form.docType" value="2" required /> Tarjeta de Identidad
          </label>
          <label>
            <input type="radio" v-model="form.docType" value="3" required /> Cédula de Extranjería
          </label>
          <label for="full-name">Nombres y Apellidos</label>
          <input type="text" id="full-name" v-model="form.fullName" required />
          <label for="email">Correo Electrónico</label>
          <input type="email" id="email" v-model="form.email" required />
          <label for="phone">Telefono</label>
          <input type="text" id="phone" v-model="form.phone" required />
        </div>
        <div class="col-md-6">
          <label for="id-number">Número de Identificación</label>
          <input type="text" id="id-number" v-model="form.idNumber" required />
          <label for="address">Dirección</label>
          <input type="text" id="address" v-model="form.address" required />
          <label for="password">Contraseña</label>
          <input type="password" id="password" v-model="form.password" required />
          <label for="confirm-password">Confirmar Contraseña</label>
          <input type="password" id="confirm-password" v-model="form.confirmPassword" required />
        </div>
      </div>

      <button type="submit" class="btn button-registrar">Registrarse</button>
    </form>
  </div>
  <footer class="py-3 my-4">
      <ul class="nav justify-content-center border-bottom pb-3 mb-3"></ul>
    </footer>
</template>

<script>
import { reactive } from 'vue';
import axios from 'axios';
import '@/assets/css/auth/registerUser.css';
import { notificar } from '@/utils/alerts';

export default {
  setup() {
    const form = reactive({
      docType: '',
      fullName: '',
      email: '',
      idNumber: '',
      address: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 3
    });

    const confirmRegistro = async () => {
  const trimmedPassword = form.password.trim();
  const trimmedConfirmPassword = form.confirmPassword.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  // Validaciones 
  const avisar = (texto) => notificar(texto, 'warning');

  if (!form.docType) {
    avisar('Por favor selecciona el tipo de documento.');
    return;
  }

  if (!form.fullName.trim()) {
    avisar('El nombre completo es obligatorio.');
    return;
  }

  if (!form.email.trim()) {
    avisar('El correo electrónico es obligatorio.');
    return;
  }

  if (!emailRegex.test(form.email)) {
    avisar('El correo electrónico no tiene un formato válido.');
    return;
  }

  if (!form.idNumber.trim()) {
    avisar('El número de documento es obligatorio.');
    return;
  }

  if (!/^\d+$/.test(form.idNumber.trim())) {
    avisar('El número de documento solo debe contener números.');
    return;
  }

  if (!form.address.trim()) {
    avisar('La dirección es obligatoria.');
    return;
  }

  if (!form.phone.trim()) {
    avisar('El teléfono es obligatorio.');
    return;
  }

  if (!/^\d+$/.test(form.phone.trim())) {
    avisar('El teléfono solo debe contener números.');
    return;
  }

  if (!trimmedPassword || !trimmedConfirmPassword) {
    avisar('Ambos campos de contraseña son obligatorios.');
    return;
  }

  if (trimmedPassword !== trimmedConfirmPassword) {
    avisar('Las contraseñas no coinciden.');
    return;
  }

  if (!passwordRegex.test(trimmedPassword)) {
    avisar('La contraseña debe tener mínimo 8 caracteres, incluyendo una mayúscula, una minúscula, un número y un símbolo.');
    return;
  }

  try {
    const response = await axios.post('/api/users/users/register', {
      full_name: form.fullName,
      user_email: form.email,
      user_password: trimmedPassword,
      document_number: form.idNumber,
      type_document_id: form.docType,
      address: form.address,
      phone: form.phone,
      role_fk: form.role
    });

    await notificar(response.data.message, 'success');
    window.location.href = '/Login';
  } catch (error) {
    console.error(error);
    notificar(error.response?.data?.message || 'Hubo un error al registrar el usuario.', 'error');
  }
};



    const goBack = () => {
      window.location.href = '/';
    };

    return { form, confirmRegistro, goBack };
  }
};

</script>

