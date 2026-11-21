<template>
  <div v-if="visible" class="ciso">
    <section v-if="abierto" class="ciso-panel" role="dialog" :aria-label="`Chat de ${nombre}`">
      <header class="ciso-cabeza">
        <span class="ciso-marca" aria-hidden="true">
          <img v-if="icono" :src="icono" alt="" />
          <span v-else v-html="tijeras"></span>
        </span>
        <div class="ciso-titulo">
          <h2>{{ nombre }}</h2>
          <p>Asistente de MysticalCut</p>
        </div>
        <button v-if="hayInteraccion" class="ciso-nueva" type="button" :disabled="pensando" @click="nuevaConversacion">
          Nueva conversación
        </button>
        <button class="ciso-cerrar" type="button" aria-label="Cerrar chat" @click="abierto = false">×</button>
      </header>

      <div ref="historial" class="ciso-historial">
        <article
          v-for="mensaje in mensajes"
          :key="mensaje.id"
          class="ciso-mensaje"
          :class="mensaje.autor === 'usuario' ? 'ciso-usuario' : 'ciso-ciso'"
        >
          <p>{{ mensaje.texto }}</p>
          <div
            v-if="mensaje.opciones && mensaje.opciones.length && esUltimo(mensaje) && !pensando"
            class="ciso-opciones"
          >
            <button
              v-for="(opcion, indice) in mensaje.opciones"
              :key="`${mensaje.id}-${indice}`"
              type="button"
              @click="enviar(opcion.envio || opcion.etiqueta)"
            >
              {{ opcion.etiqueta }}
            </button>
          </div>
        </article>
        <div v-if="pensando" class="ciso-escribiendo" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>

      <form class="ciso-form" @submit.prevent="enviar(borrador)">
        <input
          ref="entrada"
          v-model="borrador"
          type="text"
          autocomplete="off"
          placeholder="Escribe lo que necesitas"
          :disabled="pensando"
        />
        <button class="ciso-enviar" type="submit" :disabled="pensando || !borrador.trim()">Enviar</button>
      </form>
    </section>

    <button
      class="ciso-boton"
      type="button"
      :aria-expanded="abierto ? 'true' : 'false'"
      :aria-label="`Abrir el chat de ${nombre}`"
      :title="nombre"
      @click="alternar"
    >
      <img v-if="icono" :src="icono" alt="" />
      <span v-else v-html="tijeras"></span>
    </button>
  </div>
</template>

<script>
import { NOMBRE_CISO, crearSesionCiso, responderCiso, saludoCiso, sugerenciasDe } from '@/services/cisoEngine';

const ESPERA_CIERRE = 60000;
const LECTURA_DESPEDIDA = 1800;

// Cuando tengas la imagen de las tijeras, guárdala en front/public/img/background
// y escribe aquí la ruta, por ejemplo: '/img/background/ciso.png'
const ICONO_CISO = '';

const TIJERAS = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="6" cy="6" r="3"></circle>
    <circle cx="6" cy="18" r="3"></circle>
    <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
    <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
    <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
  </svg>
`;

export default {
  name: 'CisoChat',
  data() {
    return {
      icono: ICONO_CISO,
      nombre: NOMBRE_CISO,
      tijeras: TIJERAS,
      visible: false,
      abierto: false,
      pensando: false,
      borrador: '',
      mensajes: [],
      sesion: null,
      usuarioClave: '',
      consecutivo: 0,
      esperaCierre: null,
      despedida: null,
      despedidaId: null,
    };
  },
  computed: {
    hayInteraccion() {
      return this.mensajes.some((mensaje) => mensaje.autor === 'usuario');
    },
  },
  watch: {
    $route() {
      this.sincronizarSesion();
    },
  },
  mounted() {
    this.sincronizarSesion();
    window.addEventListener('storage', this.sincronizarSesion);
    window.addEventListener('keydown', this.alPulsarTecla);
  },
  beforeUnmount() {
    this.cancelarCierre();
    window.removeEventListener('storage', this.sincronizarSesion);
    window.removeEventListener('keydown', this.alPulsarTecla);
  },
  methods: {
    sincronizarSesion() {
      const token = localStorage.getItem('token');
      const crudo = localStorage.getItem('user');
      if (!token || !crudo) {
        this.cancelarCierre();
        this.visible = false;
        this.abierto = false;
        this.mensajes = [];
        this.sesion = null;
        this.usuarioClave = '';
        return;
      }

      let usuario = null;
      try {
        usuario = JSON.parse(crudo);
      } catch (error) {
        this.visible = false;
        this.abierto = false;
        return;
      }

      const clave = `${usuario.email || ''}|${usuario.full_name || ''}|${usuario.role || ''}`;
      if (clave !== this.usuarioClave) {
        this.cancelarCierre();
        this.usuarioClave = clave;
        this.sesion = crearSesionCiso(usuario);
        this.mensajes = [];
        this.abierto = false;
      }
      this.visible = true;
    },
    alternar() {
      if (this.abierto) {
        this.abierto = false;
        return;
      }
      this.abrir();
    },
    abrir() {
      if (!this.sesion) this.sincronizarSesion();
      if (!this.sesion) return;
      this.abierto = true;
      if (!this.mensajes.length) {
        this.mensajes.push(this.mensajeDe('ciso', saludoCiso(this.sesion)));
      }
      this.$nextTick(() => {
        this.bajar();
        if (this.$refs.entrada) this.$refs.entrada.focus();
      });
    },
    nuevaConversacion() {
      if (this.pensando) return;
      this.limpiarConversacion();
      this.abrir();
    },
    limpiarConversacion() {
      this.cancelarCierre();
      const usuario = this.sesion?.usuario;
      this.borrador = '';
      this.mensajes = [];
      this.despedidaId = null;
      if (usuario) this.sesion = crearSesionCiso(usuario);
    },
    cancelarCierre() {
      if (this.esperaCierre) {
        clearTimeout(this.esperaCierre);
        this.esperaCierre = null;
      }
      if (this.despedida) {
        clearTimeout(this.despedida);
        this.despedida = null;
      }
    },
    programarCierre() {
      this.cancelarCierre();
      this.esperaCierre = setTimeout(() => {
        this.esperaCierre = null;
        this.despedir();
      }, ESPERA_CIERRE);
    },
    despedir() {
      if (!this.abierto) return;
      if (this.pensando) {
        this.programarCierre();
        return;
      }
      const id = this.siguienteId();
      this.despedidaId = id;
      this.mensajes.push({
        id,
        autor: 'ciso',
        texto: 'Hasta luego. Cuando me necesites, aquí estaré.',
        opciones: [],
      });
      this.$nextTick(this.bajar);
      this.despedida = setTimeout(() => {
        this.limpiarConversacion();
        this.abierto = false;
      }, LECTURA_DESPEDIDA);
    },
    retirarDespedida() {
      if (!this.despedidaId) return;
      this.mensajes = this.mensajes.filter((mensaje) => mensaje.id !== this.despedidaId);
      this.despedidaId = null;
    },
    async enviar(texto) {
      const limpio = String(texto || '').trim();
      if (!limpio || this.pensando || !this.sesion) return;
      this.cancelarCierre();
      this.retirarDespedida();
      this.borrador = '';
      this.mensajes.push({ id: this.siguienteId(), autor: 'usuario', texto: limpio });
      this.pensando = true;
      this.$nextTick(this.bajar);
      try {
        const respuesta = await responderCiso(this.sesion, limpio);
        const lista = Array.isArray(respuesta) ? respuesta : [respuesta];
        const entregados = lista.filter(Boolean);
        entregados.forEach((mensaje) => {
          this.mensajes.push(this.mensajeDe('ciso', mensaje));
        });
        if (entregados.some((mensaje) => mensaje.listo)) {
          this.mensajes.push({
            id: this.siguienteId(),
            autor: 'ciso',
            texto: '¿Puedo ayudarte en algo más?',
            opciones: sugerenciasDe(this.sesion.usuario.role),
          });
          this.programarCierre();
        }
      } catch (error) {
        console.error('Ciso:', error);
        this.mensajes.push(this.mensajeDe('ciso', {
          texto: 'No pude completar eso. Inténtalo otra vez en un momento.',
          opciones: [],
        }));
      } finally {
        this.pensando = false;
        this.$nextTick(this.bajar);
      }
    },
    mensajeDe(autor, mensaje) {
      return {
        id: this.siguienteId(),
        autor,
        texto: mensaje.texto,
        opciones: mensaje.opciones || [],
      };
    },
    siguienteId() {
      this.consecutivo += 1;
      return this.consecutivo;
    },
    esUltimo(mensaje) {
      return this.mensajes[this.mensajes.length - 1]?.id === mensaje.id;
    },
    bajar() {
      const caja = this.$refs.historial;
      if (caja) caja.scrollTop = caja.scrollHeight;
    },
    alPulsarTecla(event) {
      if (event.key === 'Escape' && this.abierto) this.abierto = false;
    },
  },
};
</script>

<style>
@import '@/assets/css/components/cisoChat.css';
</style>
