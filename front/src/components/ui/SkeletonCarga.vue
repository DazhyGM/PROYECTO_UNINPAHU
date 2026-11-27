<template>
  <div class="esqueleto" :class="`esqueleto-${tipo}`" role="status" aria-label="Cargando">
    <template v-if="tipo === 'tarjetas'">
      <div v-for="n in cantidad" :key="n" class="esqueleto-tarjeta">
        <span class="bloque media"></span>
        <span class="bloque linea"></span>
        <span class="bloque linea corta"></span>
      </div>
    </template>

    <template v-else-if="tipo === 'filas'">
      <span v-for="n in cantidad" :key="n" class="bloque fila"></span>
    </template>

    <template v-else-if="tipo === 'detalle'">
      <span class="bloque media grande"></span>
      <span class="bloque linea"></span>
      <span class="bloque linea"></span>
      <span class="bloque linea corta"></span>
    </template>

    <template v-else>
      <span class="bloque titulo"></span>
      <div class="esqueleto-grupo">
        <div v-for="n in 4" :key="n" class="esqueleto-tarjeta">
          <span class="bloque media"></span>
          <span class="bloque linea"></span>
          <span class="bloque linea corta"></span>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'SkeletonCarga',
  props: {
    tipo: {
      type: String,
      default: 'pagina',
    },
    cantidad: {
      type: Number,
      default: 4,
    },
  },
};
</script>

<style scoped>
.esqueleto {
  width: min(1140px, calc(100% - 32px));
  margin: 24px auto;
}

.esqueleto-tarjetas,
.esqueleto-grupo,
.esqueleto-tarjetas.esqueleto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  width: 100%;
  margin: 0;
}

.esqueleto-tarjeta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(204, 175, 84, 0.28);
  border-radius: 14px;
  background: #111;
}

.bloque {
  display: block;
  border-radius: 8px;
  background: linear-gradient(90deg, #1c1c1c 25%, #343024 37%, #1c1c1c 63%);
  background-size: 400% 100%;
  animation: brillo 1.2s ease-in-out infinite;
}

.media {
  height: 140px;
}

.media.grande {
  width: min(260px, 100%);
  height: 220px;
  margin: 0 auto 16px;
}

.linea {
  height: 16px;
}

.linea.corta {
  width: 60%;
}

.titulo {
  width: 42%;
  height: 34px;
  margin: 0 auto 22px;
}

.fila {
  height: 54px;
  margin-bottom: 10px;
}

.esqueleto-detalle {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.esqueleto-filas {
  display: block;
}

@keyframes brillo {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
</style>
