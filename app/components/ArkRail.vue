<template>
  <nav class="ark-rail" aria-label="主导航">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="ark-rail-item"
      :class="{ 'is-active': route.path === item.to }"
    >
      <span class="ark-rail-index">{{ item.index }}</span>
      <span>{{ item.label }}</span>
    </NuxtLink>
    <div class="ark-rail-code" aria-hidden="true">
      {{ route.path.replace('/', '').toUpperCase() || 'OVERVIEW' }}
    </div>
  </nav>
</template>

<script setup>
const route = useRoute()

const items = [
  { to: '/', label: '总览', index: '01' },
  { to: '/sources', label: '源站', index: '02' },
  { to: '/stats', label: '统计', index: '03' }
]
</script>
