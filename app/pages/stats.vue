<template>
  <ArkShell>
    <section class="ark-section" style="min-height:calc(100svh - 4.5rem)">
      <div class="ark-section-title">
        <p class="ark-kicker">ANALYTICS</p>
        <h2>缓存统计</h2>
        <div class="ark-title-rule"></div>
      </div>
      <ArkStatsGrid />
      <div class="mt-8 p-6 border border-ink/10">
        <p class="ark-panel-label">DAILY REQUESTS</p>
        <div class="ark-spark h-32" aria-hidden="true">
          <i style="height:22%"></i>
          <i style="height:38%"></i>
          <i style="height:55%;background:var(--ark-signal)"></i>
          <i style="height:44%"></i>
          <i style="height:62%"></i>
          <i style="height:74%"></i>
          <i style="height:68%;background:var(--ark-signal)"></i>
          <i style="height:82%"></i>
          <i style="height:91%"></i>
          <i style="height:86%"></i>
        </div>
      </div>
    </section>
  </ArkShell>
</template>
