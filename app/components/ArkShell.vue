<template>
  <div class="ark-shell">
    <ArkTopbar />
    <ArkRail />
    <main class="ark-main">
      <slot />
    </main>
    <footer class="ark-footer">
      <p>RESOURCE CACHE ADMIN // ENDFIELD MODERATE</p>
      <p>ARK UI · {{ version }}</p>
    </footer>
  </div>
</template>

<script setup>
const version = 'v0.1.0'
</script>
