<template>
  <div class="app-shell">
    <aside class="side-nav">
        <RouterLink class="nav-item" to="/home" draggable="false" @dragstart.prevent @contextmenu.prevent>
          <i-material-symbols-home-rounded class="nav-icon" />
        </RouterLink>
        <RouterLink class="nav-item" to="/controls" draggable="false" @dragstart.prevent @contextmenu.prevent>
          <i-material-symbols-tune-rounded class="nav-icon" />
        </RouterLink>
        <RouterLink class="nav-item" to="/filament" draggable="false" @dragstart.prevent @contextmenu.prevent>
          <i-material-symbols-database class="nav-icon" />
        </RouterLink>
        <RouterLink class="nav-item" to="/settings" draggable="false" @dragstart.prevent @contextmenu.prevent>
          <i-material-symbols-settings-rounded class="nav-icon" />
        </RouterLink>
        <RouterLink class="nav-item" to="/files" draggable="false" @dragstart.prevent @contextmenu.prevent>
          <i-material-symbols-folder-rounded class="nav-icon" />
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
  height: 100%;
  overflow: hidden;
}

.side-nav {
  display: grid;
  padding: 8px;
  padding-left: calc(8px + env(safe-area-inset-left));
  background: var(--van-background-2);
  height: 100%;
  align-items: center;
}

.nav-item {
  width: 48px;
  height: 48px;
  display: grid;
  align-items: center;
  justify-content: center;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  color: var(--van-text-color-2);
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.nav-item.router-link-active {
  color: var(--van-primary-color);
}

.main {
  min-height: 0;
  padding-right: env(safe-area-inset-right);
  overflow: auto;
}

@media (orientation: portrait) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .side-nav {
    grid-row: 2;
    grid-auto-flow: column;
    grid-auto-columns: 48px;
    justify-content: space-between;
    justify-items: center;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
    border-top: var(--van-background-3) 1px solid;
  }

  .nav-item {
    width: 40px;
    height: 40px;
  }

  .main {
    grid-row: 1;
    height: auto;
    padding-right: 0;
  }
}
</style>
