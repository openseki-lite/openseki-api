<template>
  <ArkShell>
    <section class="ark-section" style="min-height:calc(100svh - 4.5rem)">
      <div class="ark-section-title">
        <p class="ark-kicker">SOURCE ROUTES</p>
        <h2>源站路由</h2>
        <div class="ark-title-rule"></div>
      </div>
      <div class="mb-6">
        <button class="ark-button ark-button-primary" @click="showAdd = true">新增源站</button>
      </div>
      <ArkSourceTable />

      <div v-if="showAdd" class="mt-8 p-6 border border-ink/10">
        <p class="ark-panel-label">NEW ROUTE</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="ark-field">
            <label for="prefix">路径前缀</label>
            <input id="prefix" v-model="form.prefix" class="ark-input" placeholder="/images/*">
          </div>
          <div class="ark-field">
            <label for="origin">源站地址</label>
            <input id="origin" v-model="form.origin" class="ark-input" placeholder="https://origin.example.com">
          </div>
        </div>
        <div class="ark-actions">
          <button class="ark-button ark-button-primary" @click="addRoute">保存</button>
          <button class="ark-button" @click="showAdd = false">取消</button>
        </div>
      </div>
    </section>
  </ArkShell>
</template>

<script setup>
const showAdd = ref(false)
const form = ref({ prefix: '', origin: '' })

function addRoute() {
  console.log('Add route', form.value)
  showAdd.value = false
}
</script>
