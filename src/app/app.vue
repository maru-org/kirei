<script setup lang="ts">
import type { PlatformInfo } from '../types'

const { data: platformInfo } = await useFetch<PlatformInfo>('/api/platform.json')
</script>

<template>
  <div>
    <template v-if="platformInfo?.isMacOS">
      <p>Current detected system: {{ platformInfo?.platform }}</p>
    </template>
    <template v-else>
      <div class="unsupported-message">
        <h2>Unsupported Operating System</h2>
        <p>Sorry, this application only supports macOS.</p>
        <p>Current detected system: {{ platformInfo?.platform }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.unsupported-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.unsupported-message h2 {
  color: #e74c3c;
  margin-bottom: 1rem;
}

.unsupported-message p {
  color: #666;
  margin: 0.5rem 0;
}
</style>
