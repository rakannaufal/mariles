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
  name: 'Pendapatan',
  data: props.data.map(d => d.value)
}])

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    height: props.height,
    toolbar: { show: false },
    fontFamily: 'Poppins, sans-serif'
  },
  colors: ['#0D5782'],
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.7,
      opacityTo: 0.2,
      stops: [0, 90, 100]
    }
  },
  dataLabels: { enabled: false },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  xaxis: {
    categories: props.data.map(d => d.label),
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: {
      formatter: (value) => 'Rp ' + new Intl.NumberFormat('id-ID').format(value)
    }
  },
  grid: {
    borderColor: '#f1f1f1',
    strokeDashArray: 4
  },
  tooltip: {
    y: {
      formatter: (value) => 'Rp ' + new Intl.NumberFormat('id-ID').format(value)
    }
  }
}))
</script>

<template>
  <div class="chart-container">
    <VueApexCharts
      type="area"
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
