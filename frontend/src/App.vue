<template>
  <div class="app-shell">
    <aside class="side-nav">
        <RouterLink class="nav-item" to="/home">
          <span class="material-symbols-rounded">home</span>
        </RouterLink>
        <RouterLink class="nav-item" to="/controls">
          <span class="material-symbols-rounded">tune</span>
        </RouterLink>
        <RouterLink class="nav-item" to="/filament">
          <span class="material-symbols-rounded">database</span>
        </RouterLink>
        <RouterLink class="nav-item" to="/settings">
          <span class="material-symbols-rounded">settings</span>
        </RouterLink>
        <RouterLink class="nav-item" to="/files">
          <span class="material-symbols-rounded">folder</span>
        </RouterLink>
    </aside>

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: auto 1fr;
  height: 100vh;
  overflow: hidden;
}

.side-nav {
  display: grid;
  padding: 8px;
  background: var(--van-background-2);
  height: 100%;
}

.nav-item {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-item .material-symbols-rounded {
  color: var(--van-text-color-2);
}

.nav-item.router-link-active .material-symbols-rounded {
  color: var(--van-primary-color);
}

.main {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 4px;
}
</style>
