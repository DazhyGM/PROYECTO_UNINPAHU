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
<<<<<<< HEAD
import SkeletonCarga from '@/components/ui/SkeletonCarga.vue'
import router from '@/router'
=======
import AlertaCalificacion from '@/components/ratings/AlertaCalificacion.vue'
import CisoChat from '@/components/assistant/CisoChat.vue'
>>>>>>> 69c8b0b1cb2248b10e6d8f0136764461b46540dd

export default {
  components: {
    HeaderComponent,
    FooterComponent,
<<<<<<< HEAD
    SkeletonCarga
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
    router.afterEach(() => {
      clearTimeout(espera)
      this.cargandoRuta = false
    })
=======
    AlertaCalificacion,
    CisoChat
>>>>>>> 69c8b0b1cb2248b10e6d8f0136764461b46540dd
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
