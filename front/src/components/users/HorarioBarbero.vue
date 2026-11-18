<template>
  <section class="horario-barbero">
    <h3>Horario de atención</h3>
    <p>Marca los días de trabajo, la jornada y, si aplica, el descanso. En ese descanso no se agendan citas.</p>
    <div v-for="day in days" :key="day.day_of_week" class="horario-day">
      <label class="dia">
        <input type="checkbox" v-model="day.enabled" />
        {{ day.label }}
      </label>
      <div class="horario-times">
        <span>Jornada</span>
        <input type="time" v-model="day.start_time" :disabled="!day.enabled" />
        <span>a</span>
        <input type="time" v-model="day.end_time" :disabled="!day.enabled" />
      </div>
      <div class="horario-times">
        <label class="descanso">
          <input type="checkbox" v-model="day.break_enabled" :disabled="!day.enabled" />
          Descanso
        </label>
        <input type="time" v-model="day.break_start" :disabled="!day.enabled || !day.break_enabled" />
        <span>a</span>
        <input type="time" v-model="day.break_end" :disabled="!day.enabled || !day.break_enabled" />
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'HorarioBarbero',
  props: {
    days: {
      type: Array,
      required: true
    }
  }
};
</script>

<style scoped>
.horario-barbero {
  margin-top: 10px;
  text-align: left;
}

.horario-barbero h3 {
  color: #CCAF54;
  margin-bottom: 8px;
  font-size: 20px;
}

.horario-barbero p {
  color: #fff;
  margin-bottom: 16px;
}

.horario-day {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 8px 12px;
  align-items: center;
  margin-bottom: 14px;
}

.dia,
.descanso {
  color: #fff;
  margin: 0;
}

.horario-times {
  display: grid;
  grid-template-columns: 90px 1fr auto 1fr;
  gap: 8px;
  align-items: center;
}

.horario-times span,
.horario-day > .dia {
  color: #CCAF54;
}

.horario-times input[type="time"] {
  width: 100%;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid rgba(204, 175, 84, 0.45);
  background-color: #111111;
  color: #fff;
}

.horario-times input[type="time"]:disabled {
  opacity: 0.45;
}
</style>
