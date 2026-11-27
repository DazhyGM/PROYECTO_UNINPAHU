<template>
  <div id="app">
    <HeaderComponent v-if="!$route.meta.hideLayout" :isHome="$route.meta.isHome" />

    <main class="app-main">
      <SkeletonCarga v-if="cargandoRuta" tipo="pagina" />
      <router-view v-show="!cargandoRuta" />
    </main>

    <AlertaCalificacion />

    <CisoChat />

    <FooterComponent v-if="!$route.meta.hideLayout" />
  </div>
</template>



<script>
import HeaderComponent from '@/components/layout/HeaderComponent.vue'
import FooterComponent from '@/components/layout/FooterComponent.vue'
import SkeletonCarga from '@/components/ui/SkeletonCarga.vue'
import router from '@/router'
import AlertaCalificacion from '@/components/ratings/AlertaCalificacion.vue'
import CisoChat from '@/components/assistant/CisoChat.vue'

export default {
  components: {
    HeaderComponent,
    FooterComponent,
    SkeletonCarga,
    AlertaCalificacion,
    CisoChat
  },
  data() {
    return {
      cargandoRuta: false
    }
  },
  created() {
    let espera
    router.beforeEach(() => {
      clearTimeout(espera)
      espera = setTimeout(() => {
        this.cargandoRuta = true
      }, 160)
    })
    router.afterEach((to) => {
      clearTimeout(espera)
      this.cargandoRuta = false
      this.marcarHeader(to)
      this.marcarScroll()
    })
  },
  mounted() {
    this.marcarHeader(this.$route)
    this.marcarScroll()
    document.addEventListener('scroll', this.marcarScroll, { passive: true, capture: true })
  },
  beforeUnmount() {
    document.removeEventListener('scroll', this.marcarScroll, true)
  },
  methods: {
    marcarHeader(ruta) {
      document.documentElement.classList.toggle('con-header', !ruta.meta.hideLayout)
    },
    marcarScroll() {
      const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
      document.documentElement.classList.toggle('bajando', y > 120)
    }
  }
}
</script>

<style>
#app {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
}

.app-main {
  flex: 1 0 auto;
  width: 100%;
  min-width: 0;
  padding-bottom: 40px;
}
</style>
