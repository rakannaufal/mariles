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

const series = computed(() => props.data.map(d => d.value))

const chartOptions = computed(() => ({
  chart: {
    type: 'donut',
    height: props.height,
    fontFamily: 'Poppins, sans-serif'
  },
  labels: props.data.map(d => d.label),
  colors: ['#0D5782', '#88D0E4', '#FB7185', '#F59E0B', '#10B981'],
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total',
            formatter: (w) => {
              return w.globals.seriesTotals.reduce((a, b) => a + b, 0)
            }
          }
        }
      }
    }
  },
  dataLabels: { enabled: false },
  legend: {
    position: 'bottom',
    horizontalAlign: 'center'
  },
  stroke: { show: false },
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
      type="donut"
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
