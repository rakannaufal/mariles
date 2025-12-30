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
  colors: ['#0D5782'], // Using primary color
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: '50%',
      dataLabels: {
          position: 'top' // Place data labels on top of bar
      }
    }
  },
  dataLabels: { 
      enabled: true,
      style: {
          fontSize: '10px',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 600,
          colors: ['#334155']
      },
      offsetY: -20
  },
  xaxis: {
    categories: props.data.map(d => d.label),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
        style: { fontSize: '12px', fontFamily: 'Poppins, sans-serif', colors: ['#64748B'] }
    }
  },
  yaxis: {
      show: false
  },
  grid: {
      show: false,
      padding: { top: 20 } 
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
