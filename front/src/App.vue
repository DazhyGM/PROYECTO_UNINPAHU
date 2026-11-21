<template>
  <div id="app">
    <HeaderComponent v-if="!$route.meta.hideLayout" :isHome="$route.meta.isHome" />

    <main class="app-main">
      <router-view />
    </main>

    <AlertaCalificacion />

    <CisoChat />

    <FooterComponent v-if="!$route.meta.hideLayout" />
  </div>
</template>



<script>
import HeaderComponent from '@/components/layout/HeaderComponent.vue'
import FooterComponent from '@/components/layout/FooterComponent.vue'
import AlertaCalificacion from '@/components/ratings/AlertaCalificacion.vue'
import CisoChat from '@/components/assistant/CisoChat.vue'

export default {
  components: {
    HeaderComponent,
    FooterComponent,
    AlertaCalificacion,
    CisoChat
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
