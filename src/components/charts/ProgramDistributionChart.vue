<script setup>
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  height: {
    type: Number,
    default: 300
  }
})

const series = computed(() => [{
  name: 'Siswa',
  data: props.data.map(d => d.value)
}])

const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: props.height,
    toolbar: { show: false },
    fontFamily: 'Poppins, sans-serif'
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      barHeight: '50%',
      distributed: true
    }
  },
  colors: ['#0D5782', '#0E7490', '#0891B2', '#06B6D4', '#22D3EE'],
  dataLabels: { enabled: true, formatter: (val) => val },
  xaxis: {
    categories: props.data.map(d => d.label),
    labels: { show: false },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: {
      show: true,
      style: { fontSize: '12px', fontFamily: 'Poppins, sans-serif' }
    }
  },
  grid: { show: false },
  legend: { show: false },
  tooltip: {
    y: {
      formatter: (val) => val + ' Siswa'
    }
  }
}))
</script>

<template>
  <div class="chart-container">
    <VueApexCharts
      type="bar"
      :height="height"
      :options="chartOptions"
      :series="series"
    />
  </div>
</template>

<style scoped>
.chart-container {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
