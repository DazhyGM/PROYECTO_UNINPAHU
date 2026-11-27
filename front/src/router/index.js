import { createRouter, createWebHistory } from 'vue-router';
import { notificar } from '@/utils/alerts';
import { leerUsuario } from '@/services/sesionLocal';
import { cerrarSesion, validarSesion } from '@/services/sesion';

//Home
const Index = () => import('@/views/home/HomeIndex.vue');
const Home = () => import('@/views/home/HomeUser.vue');

//Auth
const Login = () => import('@/views/auth/LoginUser.vue');
const Register = () => import('@/views/auth/RegisterUser.vue');
const ForgotPassword = () => import('@/views/auth/ForgotPassword.vue');
const ResetPassword = () => import('@/views/auth/ResetPassword.vue');

//Users
const Users = () => import('@/views/users/UsersInfo.vue');
const Perfil = () => import('@/views/users/PerfilUsuario.vue');
const EditUser = () => import('@/views/users/EditUsers.vue');
const VerUser = () => import('@/views/users/VerUser.vue');
const AgregarUser = () => import('@/views/users/AgregarUser.vue');
const EditPerfil = () => import('@/views/users/EditPerfil.vue');
const UsersInactives = () => import('@/views/users/UsersInactives.vue');

//Services
const Service = () => import('@/views/services/ServicesBarber.vue');
const CrearServicios = () => import('@/views/services/CrearServicios.vue');
const EditarServicios = () => import('@/views/services/EditarServicios.vue');
const ServicesInactivos = () => import('@/views/services/ServicesInactivos.vue');
const ViewService = () => import('@/views/services/ViewService.vue');
const SeleccionarBarbero = () => import('@/views/services/SeleccionarBarbero.vue');
const CalendarioCitas = () => import('@/views/services/CalendarioCitas.vue');
const FacturaServicios = () => import('@/views/services/FacturaServicios.vue');
const CitasPendientes = () => import('@/views/services/CitasPendientes.vue');
const CalificarCita = () => import('@/views/services/CalificarCita.vue');
const Reportes = () => import('@/views/services/Reportes.vue');

//Products
const Products = () => import('@/views/products/ProductsView.vue');
const ProductsInactives = () => import('@/views/products/ProductsInactives.vue');
const CrearProducto = () => import('@/views/products/CrearProducto.vue');
const EditarProducto = () => import('@/views/products/EditarProducto.vue');
const AsignarInsumos = () => import('@/views/products/AsignarInsumos.vue');
const CierreTurno = () => import('@/views/products/CierreTurno.vue');

//Errors
const ErrorAuth = () => import('@/views/errors/ErrorAuth.vue');
const ErrorRole = () => import('@/views/errors/ErrorRole.vue');
const ErrorUserBlock = () => import('@/views/errors/ErrorUserBlock.vue');
const ErrorUserDeleted = () => import('@/views/errors/ErrorUserDeleted.vue');
const ErrorPNF = () => import('@/views/errors/ErrorPNF.vue');


const routes = [
  //Home
  { path: '/', component: Index, meta: { title: 'Inicio | MysticalCut', hideLayout: true } },
  { path: '/Home', component: Home, meta: { title: 'Home | MysticalCut', requiresAuth: true, isHome: true, hideLayout: true } },

  //Auth
  { path: '/Login', component: Login, meta: { title: 'Login | MysticalCut', hideLayout: true } },
  { path: '/Register', component: Register, meta: { title: 'Registrate | MysticalCut', hideLayout: true} },
  { path: '/forgotPassword', component: ForgotPassword, meta: { title: 'Recuperar Contraseña | MysticalCut', hideLayout: true } },
  { path: '/reset-password/:token', component: ResetPassword, meta: { title: 'Resetear Contraseña | MysticalCut', hideLayout: true } },

  //Users
  { path: '/Users', component: Users, meta: { title: 'Users | MysticalCut', requiresAuth: true, role: 'Admin' } },
  { path: '/Perfil', component: Perfil, meta: { title: 'Perfil | MysticalCut', requiresAuth: true } },
  { path: '/EditUser/:id', component: EditUser, meta: { title: 'Editar | MysticalCut', requiresAuth: true, role: 'Admin' } },
  { path: '/VerUser/:id', component: VerUser, meta: { title: 'Ver | MysticalCut', requiresAuth: true, role: 'Admin' } },
  { path: '/AgregarUser', component: AgregarUser, meta: { title: 'Agregar | MysticalCut', requiresAuth:true, role: 'Admin' } },
  { path: '/EditPerfil/:id', component: EditPerfil, meta: { title: 'Editar | MysticalCut', requiresAuth: true } },
  { path: '/usersInactives', component: UsersInactives, meta: { title: 'Usuarios Inactivos | MysticalCut', requiresAuth: true, role: 'Admin' } },

  //Services
  { path: '/Services', component: Service, meta: { title: 'Servicios | MysticalCut' } },
  { path: '/Create-Services', component: CrearServicios , meta: { title: 'Crear Servicios | MysticalCut' } },
  { path: '/Editar-Services/:id', component: EditarServicios , meta: { title: 'Editar Servicios | MysticalCut' } },
  { path: '/Services-Inactivos', component: ServicesInactivos , meta: { title: 'Servicios inactivos| MysticalCut' } },
  { path: '/View-Service/:id', component: ViewService , meta: { title: 'Ver Servicios | MysticalCut' } },
  { path: '/Select-Barbero', component: SeleccionarBarbero , meta: { title: 'Seleccionar Barbero | MysticalCut', hideLayout: true } },
  { path: '/Calendario', component: CalendarioCitas , meta: { title: 'Calendario | MysticalCut', hideLayout: true } },
  { path: '/FacturaServicios', component: FacturaServicios , meta: { title: 'factura | MysticalCut', hideLayout: true } },
  { path: '/Citas', component: CitasPendientes , meta: { title: 'Citas | MysticalCut', requiresAuth: true } },
  { path: '/Calificar/:id', component: CalificarCita, meta: { title: 'Calificar | MysticalCut', requiresAuth: true } },
  { path: '/Reportes', component: Reportes , meta: { title: 'Reportes | MysticalCut', requiresAuth: true, role: 'Admin'  } },

  //Products
  { path: '/Products', component: Products, meta: { title: 'Insumos | MysticalCut', requiresAuth: true, roles: ['Admin', 'Employee'] } },
  { path: '/ProductsInactives', component: ProductsInactives, meta: { title: 'Insumos inactivos | MysticalCut', requiresAuth: true, roles: ['Admin'] } },
  { path: '/Create-Products', component: CrearProducto, meta: { title: 'Crear insumo | MysticalCut', requiresAuth: true, roles: ['Admin'] } },
  { path: '/Edit-Products/:id', component: EditarProducto, meta: { title: 'Editar insumo | MysticalCut', requiresAuth: true, roles: ['Admin'] } },
  { path: '/Asignar-Insumos', component: AsignarInsumos, meta: { title: 'Asignar insumos | MysticalCut', requiresAuth: true, roles: ['Admin'] } },
  { path: '/Cierre-Turno', component: CierreTurno, meta: { title: 'Cierre de turno | MysticalCut', requiresAuth: true, roles: ['Employee'] } },

  //Errores
  { path: '/error', component: ErrorAuth, meta: { title: 'Error 404 | MysticalCut', hideLayout: true } },
  { path: '/:pathMatch(.*)*', redirect: '/errorPNF' },
  { path: '/errorRole', component: ErrorRole, meta: { title: 'Error 404 | MysticalCut', hideLayout: true } },
  { path: '/errorUserBlock', component: ErrorUserBlock, meta: { title: 'Error | MysticalCut', hideLayout: true } },
  { path: '/errorUserDeleted', component: ErrorUserDeleted, meta: { title: 'Error | MysticalCut', hideLayout: true } },
  { path: '/errorPNF', component: ErrorPNF, meta: { title: 'Error | MysticalCut' } },

];


const router = createRouter({
  history: createWebHistory(),
  routes,
});
//Middleware para cambiar el título de la página al navegar
router.afterEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title;
  }
});
//Protección de rutas
router.beforeEach(async (to, from, next) => {
  const habiaSesion = Boolean(localStorage.getItem('token') || localStorage.getItem('user'));
  const activa = await validarSesion();
  const user = activa ? leerUsuario() : null;
  const entradaPublica = to.path === '/' || to.path === '/Login';

  if (activa && user && entradaPublica) {
    next('/Home');
    return;
  }

  if (to.meta.requiresAuth) {
    if (!user) {
      if (habiaSesion || to.path.startsWith('/Calificar')) {
        next({ path: '/Login', query: { redirect: to.fullPath } });
      } else {
        next('/error');
      }
      return;
    }

    const roles = to.meta.roles || (to.meta.role ? [to.meta.role] : null);
    if (roles && !roles.includes(user.role)) {
      await cerrarSesion();
      notificar('No tienes permisos para acceder a esta página. Sesión cerrada.', 'error');
      next('/errorRole');
      return;
    }
  }

  next();
});



export default router;
