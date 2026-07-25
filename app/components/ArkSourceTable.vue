<template>
  <div class="ark-table-wrap">
    <table class="ark-table">
      <thead>
        <tr>
          <th>前缀</th>
          <th>源站地址</th>
          <th>状态</th>
          <th>缓存策略</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="source in sources" :key="source.prefix">
          <td>{{ source.prefix }}</td>
          <td>{{ source.origin }}</td>
          <td>
            <span v-if="source.active" style="color:var(--ark-state)">ACTIVE</span>
            <span v-else style="color:var(--ark-muted)">DISABLED</span>
          </td>
          <td>{{ source.ttl }}</td>
          <td>
            <button class="ark-button" style="min-height:2rem;padding:.4rem .8rem .4rem 1.4rem" @click="purge(source.prefix)">刷新</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const { purge } = useCacheApi()

const sources = [
  { prefix: '/images/*', origin: 'https://origin-a.com', active: true, ttl: '7 days' },
  { prefix: '/assets/*', origin: 'https://origin-b.com', active: true, ttl: '7 days' },
  { prefix: '/docs/*', origin: 'https://docs.example.com', active: true, ttl: '1 day' },
  { prefix: '/static/*', origin: 'https://static.example.com', active: false, ttl: '30 days' }
]
</script>
