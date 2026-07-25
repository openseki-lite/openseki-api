<template>
  <div class="ark-stats-grid">
    <div v-for="stat in stats" :key="stat.label" class="ark-stat">
      <span class="ark-stat-label">{{ stat.label }}</span>
      <span class="ark-stat-value">{{ stat.value }}</span>
      <span class="ark-stat-trend">{{ stat.trend }}</span>
    </div>
  </div>
</template>

<script setup>
const stats = [
  { label: '缓存命中', value: '94.2%', trend: '+1.8% 较昨日' },
  { label: '今日请求', value: '128.4K', trend: '+12.3K 较昨日' },
  { label: '源站数量', value: '8', trend: '2 个待配置' },
  { label: '存储使用', value: '3.8 GB', trend: '剩余 6.2 GB' }
]
</script>
