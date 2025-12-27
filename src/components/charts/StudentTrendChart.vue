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
    default: 250
  }
})

const series = computed(() => [{
  name: 'Siswa Baru',
  data: props.data.map(d => d.value)
}])

const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: props.height,
    toolbar: { show: false },
    fontFamily: 'Poppins, sans-serif'
  },
  colors: ['#88D0E4'],
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: '40%',
    }
  },
  dataLabels: { enabled: false },
  xaxis: {
    categories: props.data.map(d => d.label),
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    show: false
  },
  grid: {
    show: false
  },
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
}
</style>
