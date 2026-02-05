<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'

interface Props {
    type?: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radialBar' | 'scatter' | 'bubble' | 'heatmap' | 'candlestick' | 'radar' | 'polarArea' | 'rangeBar'
    options: ApexOptions
    series: any[]
    height?: string | number
}

const props = withDefaults(defineProps<Props>(), {
    type: 'line',
    height: '100%'
})
</script>

<template>
    <VueApexCharts 
        :type="props.type" 
        :options="props.options" 
        :series="props.series" 
        :height="props.height"
    />
</template>
