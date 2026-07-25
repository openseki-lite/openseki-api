<template>
  <section class="ark-hero" aria-label="概览">
    <div class="ark-grid" aria-hidden="true"></div>
    <div class="ark-art" aria-hidden="true">
      <div class="ark-orbit ark-orbit-a"></div>
      <div class="ark-orbit ark-orbit-b"></div>
      <div class="ark-orbit ark-orbit-c"></div>
      <div class="ark-core"><span></span></div>
      <div class="ark-vector ark-vector-a"></div>
      <div class="ark-vector ark-vector-b"></div>
    </div>

    <div class="ark-hero-copy">
      <p class="ark-kicker">CACHE OPERATIONS CENTER</p>
      <h1>
        资源<br>
        <span class="ark-title-outline">中转</span>
      </h1>
      <p class="ark-lede">
        零成本、国内可访问的资源缓存管理后台。监控命中状态、管理源站路由、执行缓存预热与刷新。
      </p>
      <div class="ark-actions">
        <NuxtLink to="/sources" class="ark-button ark-button-primary">管理源站</NuxtLink>
        <button class="ark-button" @click="purgeAll">刷新全部缓存</button>
      </div>
    </div>

    <aside class="ark-readout">
      <div class="ark-readout-head">
        <strong>LIVE METRICS</strong>
        <span>{{ now }}</span>
      </div>
      <dl>
        <div><dt>命中率</dt><dd>{{ metrics.hitRate }}</dd></div>
        <div><dt>今日请求</dt><dd>{{ metrics.requests }}</dd></div>
        <div><dt>缓存容量</dt><dd>{{ metrics.storage }}</dd></div>
      </dl>
      <div class="ark-spark" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
    </aside>

    <div class="ark-hero-footer">
      <span>ENDFIELD MODERATE UI</span>
      <span>WORKERS + R2 + D1</span>
      <span>REGION: EDGE</span>
    </div>
  </section>
</template>

<script setup>
const { purgeAll } = useCacheApi()

const now = computed(() => new Date().toLocaleDateString('zh-CN'))

const metrics = ref({
  hitRate: '94.2%',
  requests: '128.4K',
  storage: '3.8 GB'
})
</script>
