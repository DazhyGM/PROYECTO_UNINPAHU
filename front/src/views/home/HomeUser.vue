<template>
  <div>
    <header class="py-3 mb-4 border-bottom">
      <div class="container d-flex align-items-center justify-content-between">
        <router-link to="/Home">
          <img src="/img/background/LOGO.png" alt="Logo" width="125" height="125" class="d-inline-block align-text-top" />
        </router-link>

        <div class="dropdown">
          <button class="btn dropdown-toggle-perfil" @click="toggleMenu">
            <img src="/img/background/Icono usuario.png" alt="Profile" class="icon me-2" />
            {{ user.full_name || 'Usuario' }}
          </button>

          <ul v-if="isMenuOpen" class="dropdown-menu dropdown-menu-end show">
            <li>
              <button class="dropdown-item" @click="goToProfile">
                Perfil
              </button>
            </li>
            <li>
              <hr class="dropdown-divider" />
            </li>
            <li>
              <button class="dropdown-item" @click="logout">
                Cerrar Sesión
              </button>
            </li>
          </ul>
        </div>
      </div>

      <ul class="nav justify-content-center flex-wrap">
        <li v-for="module in filteredModules" :key="module.module_route" class="nav-item">
          <a class="nav-link" :href="`/${module.module_route}`">
            {{ module.role_module }}
          </a>
        </li>
      </ul>
    </header>

    <!--Carrusel-->

    <div id="carouselExampleCaptions" class="carousel slide" data-bs-ride="carousel" data-bs-interval="4000">
      <div class="carousel-indicators">
        <button v-for="(item, index) in images" :key="index" type="button" :data-bs-target="'#carouselExampleCaptions'"
          :data-bs-slide-to="index" :class="{ active: index === 0 }" :aria-label="'Slide ' + (index + 1)">
        </button>
      </div>

      <div id="carouselExample" class="carousel slide" data-bs-ride="carousel">
        <div class="carousel-inner">
          <div v-for="(item, index) in images" :key="index" class="carousel-item" :class="{ active: index === 0 }">
            <img :src="item.src" class="d-block w-100" :alt="item.alt" />

            <!-- Título centrado solo en la primera imagen -->
            <h2 v-if="index === 0" class="titulo1">{{ item.title }}</h2>

            <!-- Para las demás imágenes -->
            <div v-else class="carousel-caption d-none d-md-block">
              <h2 class="carousel-title">{{ item.title }}</h2>
              <p v-if="item.text">{{ item.text }}</p>
            </div>
          </div>
        </div>

        <!-- Controles del carrusel -->
        <button class="carousel-control-prev" type="button" data-bs-target="#carouselExample" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Anterior</span>
        </button>

        <button class="carousel-control-next" type="button" data-bs-target="#carouselExample" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Siguiente</span>
        </button>
      </div>

      <button class="carousel-control-prev" type="button" data-bs-target="#carouselExampleCaptions"
        data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleCaptions"
        data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
      </button>
    </div>

    <!--Seccion de servicios-->

    <div class="container section">
      <h2 class="section-title">Servicios más populares</h2>
      <SkeletonCarga v-if="cargandoServicios" tipo="tarjetas" :cantidad="4" />
      <p v-else-if="!services.length" class="text-center">Todavía no hay servicios para mostrar.</p>
      <div v-else class="row row-cols-1 row-cols-md-4 g-8">
        <div v-for="service in services" :key="service.id_services" class="col">
          <div class="card servicio-popular">
            <router-link :to="`/View-Service/${service.id_services}`">
              <img :src="imagenServicio(service.image)" class="card-img-top" :alt="service.name_service"
                @error="usarImagenPredeterminada" />
            </router-link>
            <div class="card-body">
              <h5 class="card-title">{{ service.name_service }}</h5>
              <p class="card-text">{{ service.description }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="text-center mt-4">
        <a href="/services" class="btn btn-custom">Agenda tu cita</a>
      </div>

    </div>

    <!-- Inventario de insumos: solo administración y barberos -->

    <div v-if="user.role === 'Admin' || user.role === 'Employee'" class="container section">
      <h2 class="section-title">Insumos</h2>
      <div class="row row-cols-1 row-cols-md-4 g-8">
        <div v-for="product in products" :key="product.title" class="col">
          <div class="card">
            <a href="/Products">
              <img :src="product.image" class="card-img-top" :alt="product.title" />
            </a>
            <div class="card-body">
              <h5 class="card-title">{{ product.title }}</h5>
              <p class="card-text">{{ product.text }}</p>
            </div>
          </div>
        </div>
      </div>
      <!-- Botón para elegir un producto con más espacio abajo -->
      <div class="text-center mt-4 mb-4">
        <a href="/Products" class="btn btn-custom">{{ user.role === 'Employee' ? 'Mis insumos' : 'Ver inventario' }}</a>
      </div>

    </div>

    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <!-- Información de la barbería -->
          <div class="footer-info">
            <h5>Barbería Mystical Cut</h5>
            <p>
              <strong>Dirección:</strong> Calle Ejemplo 123, Ciudad, País <br />
              <strong>Teléfono:</strong> (123) 456-7890 <br />
              <strong>Email:</strong> contacto@mysticalcut.com
            </p>
            <!-- Redes Sociales -->
            <div class="social-icons">
              <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank"
                class="social-link">
                <img :src="getImagePath(social.image)" :alt="social.name" class="social-icon" />
              </a>
            </div>
          </div>

          <!-- Ubicación en Google Maps -->
          <div class="footer-map">
            <h5>Ubicación</h5>
            <iframe width="300" height="200" frameborder="0" style="border: 0; border-radius: 10px" allowfullscreen
              loading="lazy" referrerpolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d320.7485814835074!2d-74.11363336743096!3d4.566516616706714!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f98b7eaad79d7%3A0xd3bcb757e2f470a5!2sBoxter%20Barber%20Shop!5e1!3m2!1ses!2sco!4v1743355924822!5m2!1ses!2sco"></iframe>
          </div>
        </div>

        <p class="footer-copyright">© 2026 www.mysticalcut.com, Inc</p>
      </div>
    </footer>

    <div v-if="mostrarCitasDia" class="citas-dia-overlay" @click.self="cerrarCitasDia">
      <section class="citas-dia-modal" role="dialog" aria-modal="true" aria-labelledby="citas-dia-titulo">
        <button class="citas-dia-cerrar" type="button" aria-label="Cerrar" @click="cerrarCitasDia">×</button>
        <p class="citas-dia-kicker">Agenda de hoy</p>
        <h2 id="citas-dia-titulo">Citas del día</h2>
        <p class="citas-dia-fecha">{{ fechaHoyTexto }}</p>

        <SkeletonCarga v-if="cargandoCitasDia" tipo="filas" :cantidad="3" />
        <p v-else-if="errorCitasDia" class="citas-dia-vacio">No se pudieron cargar las citas de hoy.</p>
        <p v-else-if="!citasDelDia.length" class="citas-dia-vacio">No tienes citas para hoy.</p>
        <div v-else class="citas-dia-tabla-wrap">
          <table class="citas-dia-tabla">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cita in citasDelDia" :key="cita.id_quotes">
                <td>{{ formatHora(cita.date_time) }}</td>
                <td>{{ cita.client_name || 'Sin cliente' }}</td>
                <td>{{ cita.name_service || 'Sin servicio' }}</td>
                <td>
                  <span class="badge-estado" :class="claseEstado(cita.state_quotes)">
                    {{ cita.state_quotes || 'Sin estado' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from "vue-router";
import { getUserData } from "@/services/api";
import { getQuotesWithServiceDetails } from "@/services/quotesApi";
import { getPopularServices } from "@/services/servicesApi";
import SkeletonCarga from "@/components/ui/SkeletonCarga.vue";
import { cerrarSesion } from "@/services/sesion";

const router = useRouter();
const isMenuOpen = ref(false);
const user = ref({ full_name: '', role: '' });
const mostrarCitasDia = ref(false);
const cargandoCitasDia = ref(false);
const errorCitasDia = ref(false);
const citasDelDia = ref([]);
const services = ref([]);
const cargandoServicios = ref(false);

const imagenPredeterminada = '/img/background/combo01.png';

const imagenServicio = (imagen) => {
  const nombre = String(imagen || '').trim();
  if (!nombre || nombre === 'null') return imagenPredeterminada;
  if (nombre.startsWith('http') || nombre.startsWith('/')) return nombre;
  return `http://localhost:5000/uploads/${nombre}`;
};

const usarImagenPredeterminada = (evento) => {
  if (evento.target.src.endsWith(imagenPredeterminada)) return;
  evento.target.src = imagenPredeterminada;
};

const cargarServiciosPopulares = async () => {
  cargandoServicios.value = true;
  try {
    const data = await getPopularServices();
    services.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('No se pudieron cargar los servicios populares:', error);
    services.value = [];
  } finally {
    cargandoServicios.value = false;
  }
};

const fechaClave = (valor) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const fechaHoyTexto = new Date().toLocaleDateString('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const formatHora = (valor) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const claseEstado = (estado) => {
  const valor = (estado || '').toLowerCase();
  if (valor === 'pendiente') return 'badge-pendiente';
  if (valor === 'finalizada') return 'badge-finalizada';
  if (valor === 'cancelada') return 'badge-cancelada';
  return 'badge-otro';
};

const cerrarCitasDia = () => {
  mostrarCitasDia.value = false;
};

const cargarCitasDelDia = async () => {
  mostrarCitasDia.value = true;
  cargandoCitasDia.value = true;
  errorCitasDia.value = false;

  try {
    const token = localStorage.getItem('token');
    const perfil = await getUserData(token);
    const citas = await getQuotesWithServiceDetails(perfil.user_id);
    const hoy = fechaClave(new Date());

    citasDelDia.value = (Array.isArray(citas) ? citas : [])
      .filter((cita) => Number(cita.barber_id) === Number(perfil.user_id) && fechaClave(cita.date_time) === hoy)
      .sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
  } catch (error) {
    errorCitasDia.value = true;
    citasDelDia.value = [];
  } finally {
    cargandoCitasDia.value = false;
  }
};

// Función para alternar el menú
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

// Función para cerrar el menú si se hace clic fuera
const closeMenu = (event) => {
  if (!event.target.closest(".dropdown")) {
    isMenuOpen.value = false;
  }
};

// Agregar evento al montar el componente
onMounted(() => {
  document.addEventListener("click", closeMenu);

  // Cargar usuario desde localStorage
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      user.value = JSON.parse(storedUser);
      console.log("🔍 Usuario cargado desde localStorage:", user.value);
    } catch (error) {
      console.error("❌ Error al parsear usuario de localStorage", error);
    }
  }

  cargarServiciosPopulares();

  if (user.value.role === 'Employee' && sessionStorage.getItem('barberCitasModal') === '1') {
    sessionStorage.removeItem('barberCitasModal');
    cargarCitasDelDia();
  }
});

// 🔹 Eliminar evento al desmontar el componente
onUnmounted(() => {
  document.removeEventListener("click", closeMenu);
});

// Cerrar sesión
const logout = async () => {
  await cerrarSesion();
  router.push('/');
};

// Función para ir a la página de perfil
const goToProfile = () => {
  console.log("🔹 Redirigiendo a perfil...");
  isMenuOpen.value = false;
  router.push("/Perfil");
};

// 🔹 Definir los módulos y qué roles pueden verlos
const allModules = [
  { module_route: 'Home', role_module: 'Inicio', roles: ['Admin', 'Client', 'Employee'] },
  { module_route: 'Users', role_module: 'Usuarios', roles: ['Admin'] },
  { module_route: 'Services', role_module: 'Servicios', roles: ['Admin', 'Client'] },
  { module_route: 'Products', role_module: 'Insumos', roles: ['Admin', 'Employee'] },
  { module_route: 'Citas', role_module: 'Citas', roles: ['Employee', 'Client'] },
  { module_route: 'Reportes', role_module: 'Reportes', roles: ['Admin'] },

];

// Filtrar los módulos según el rol del usuario
const filteredModules = computed(() => {
  if (!user.value.role) return [];
  console.log("Filtrando módulos para el rol:", user.value.role);
  console.log("Módulos filtrados:", filteredModules.value);
  return allModules.filter(module => module.roles.includes(user.value.role));
});

// Observador para ver cambios en `user.role`
watch(() => user.value.role, (newRole) => {
  if (newRole) {
    console.log("😎 Rol actualizado del usuario:", newRole);
  }
});

// Definir imágenes del carrusel
const images = ref([
  { src: '/img/background/ImagenPrincipal.jpeg', alt: 'Imagen Principal', title: 'Bienvenidos a MysticalCut' },
  { src: '/img/background/Productos.jpg', alt: 'Productos', title: 'Los mejores productos de Barbería', text: 'Ofrecemos los mejores productos a los mejores precios.' },
  { src: '/img/background/corte.jpeg', alt: 'Servicios', title: 'Nuestros servicios', text: 'Ofrecemos una gran variedad de servicios como: Cortes, barba, tintura.' }
]);

// Lista de productos
const products = ref([
  { image: '/img/background/ceramate.jpg', title: 'Cera', text: 'Cera mate para estilizar tu cabello.' },
  { image: '/img/background/shampoocaida.jpg', title: 'Shampoo', text: 'Shampoo para prevenir la caída del cabello.' },
  { image: '/img/background/shaver.jpg', title: 'Shaver', text: 'Shaver bañada en oro para un afeitado perfecto.' },
  { image: '/img/background/cremabarba.jpg', title: 'Crema', text: 'Crema especial para cuidar tu barba.' }
]);
</script>

<script>
export default {
  data() {
    return {
      socialLinks: [
        { name: 'Facebook', url: 'https://facebook.com', image: 'logo_facebook.png' },
        { name: 'Instagram', url: 'https://instagram.com', image: 'instagram.png' },
        { name: 'TikTok', url: 'https://tiktok.com', image: 'tiktok.png' },
        { name: 'WhatsApp', url: 'https://wa.me/1234567890', image: 'whatsapp.jpg' }
      ]
    };
  },
  methods: {
    getImagePath(imageName) {
      return `/img/background/${imageName}`;
    }
  }
};
</script>
<style scoped>
@import '@/assets/css/components/footer.css';
@import '@/assets/css/home/citasDiaModal.css';

.servicio-popular img {
  width: 100%;
  height: 180px;
  object-fit: contain;
  background-color: #f8f9fa;
}

.servicio-popular .card-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
