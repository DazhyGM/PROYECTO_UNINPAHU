<template>
  <div ref="raiz" class="select-campo" :class="{ abierto }">
    <button
      type="button"
      class="select-trigger"
      :class="{ vacio: !tieneValor }"
      :disabled="disabled"
      @click.stop="alternar"
    >
      <span>{{ etiqueta }}</span>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 6l5 5 5-5" />
      </svg>
    </button>
    <input
      v-if="required"
      class="select-campo-nativo"
      :value="tieneValor ? modelValue : ''"
      required
      tabindex="-1"
      aria-hidden="true"
    />
    <ul v-if="abierto" class="select-lista">
      <li v-for="opcion in options" :key="String(opcion.value)">
        <button type="button" :class="{ activo: esActivo(opcion.value) }" @click="elegir(opcion.value)">
          {{ opcion.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    modelValue: { default: '' },
    options: { type: Array, required: true },
    placeholder: { type: String, default: 'Seleccione' },
    disabled: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return { abierto: false };
  },
  computed: {
    tieneValor() {
      return this.options.some(opcion => String(opcion.value) === String(this.modelValue));
    },
    etiqueta() {
      const actual = this.options.find(opcion => String(opcion.value) === String(this.modelValue));
      return actual ? actual.label : this.placeholder;
    },
  },
  mounted() {
    document.addEventListener('click', this.cerrar);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.cerrar);
  },
  methods: {
    esActivo(valor) {
      return String(valor) === String(this.modelValue);
    },
    alternar() {
      if (!this.disabled) this.abierto = !this.abierto;
    },
    elegir(valor) {
      this.$emit('update:modelValue', valor);
      this.$emit('change', valor);
      this.abierto = false;
    },
    cerrar(event) {
      if (this.$refs.raiz && !this.$refs.raiz.contains(event.target)) this.abierto = false;
    },
  },
};
</script>

<style scoped>
.select-campo {
  position: relative;
  width: 100%;
  min-height: 42px;
  text-align: left;
}

.select-campo.abierto {
  z-index: 40;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 100%;
  min-height: 42px;
  margin: 0;
  padding: 0 12px;
  color: #ffffff;
  font-size: 14px;
  line-height: 1;
  text-align: left;
  background: #111111;
  border: 1px solid rgba(204, 175, 84, 0.45);
  border-radius: 10px;
  cursor: pointer;
}

.select-trigger.vacio {
  color: #8d8d8d;
}

.select-trigger:focus,
.select-campo.abierto .select-trigger {
  border-color: #ccaf54;
  outline: none;
}

.select-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.select-trigger svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  fill: none;
  stroke: #ccaf54;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.select-campo-nativo {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.select-lista {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 40;
  width: 100%;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: #14120c;
  border: 1px solid rgba(204, 175, 84, 0.55);
  border-radius: 12px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55);
}

.select-lista button {
  width: 100%;
  padding: 8px 10px;
  color: #f3f3f3;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.select-lista button:hover,
.select-lista button.activo {
  color: #111111;
  background: #ccaf54;
}
</style>
