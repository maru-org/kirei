<script setup lang="ts">
import type { PlatformInfo, ScannerInfo, ScanResult, ScanResponse, CleanResponse, ScanCategory } from '../types'

// 获取平台信息
const { data: platformInfo } = await useFetch<PlatformInfo>('/api/platform.json')

// 扫描器相关数据
const { data: scannersResponse, pending: scannersPending } = await useFetch<{ success: boolean, data: ScannerInfo[] }>('/api/scanners')
const scanners = computed(() => scannersResponse.value?.data || [])
const selectedCategories = ref<ScanCategory[]>([])
const scanResults = ref<ScanResult[]>([])
const scanning = ref(false)
const cleaning = ref(false)
const selectedItems = ref<Set<string>>(new Set())
const scanResponse = ref<ScanResponse | null>(null)
const cleanResponse = ref<CleanResponse | null>(null)

// 格式化文件大小
function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024
  if (mb > 1024)
    return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(2)} MB`
}

// 执行扫描
async function performScan() {
  if (selectedCategories.value.length === 0) {
    alert('请至少选择一个扫描类别')
    return
  }

  scanning.value = true
  selectedItems.value = new Set() // 清除选中的项目
  scanResults.value = [] // 清除之前的扫描结果

  try {
    const response = await $fetch('/api/scan', {
      method: 'POST',
      body: {
        categories: selectedCategories.value
      }
    })

    console.log('扫描响应:', response) // 添加调试日志
    
    scanResponse.value = response
    scanResults.value = response.data || []
  } catch (error) {
    console.error('扫描失败:', error)
    alert('扫描失败，请重试')
  } finally {
    scanning.value = false
  }
}

// 执行清理
async function performClean() {
  if (selectedItems.value.size === 0) {
    alert('请至少选择一个要清理的项目')
    return
  }

  if (!confirm('确定要清理选中的项目吗？此操作不可撤销！')) {
    return
  }

  cleaning.value = true

  try {
    const response = await $fetch('/api/clean', {
      method: 'POST',
      body: {
        paths: Array.from(selectedItems.value),
        mode: 'soft' // 默认软删除（移到回收站）
      }
    })

    cleanResponse.value = response

    // 清理成功后，重新扫描
    if (response.data.successCount > 0) {
      await performScan()
    }

    alert(`清理完成！成功: ${response.data.successCount}, 失败: ${response.data.failCount}`)
  } catch (error) {
    console.error('清理失败:', error)
    alert('清理失败，请重试')
  } finally {
    cleaning.value = false
  }
}

// 切换项目选择状态
function toggleItemSelection(path: string) {
  const newSet = new Set(selectedItems.value)
  if (newSet.has(path)) {
    newSet.delete(path)
  } else {
    newSet.add(path)
  }
  selectedItems.value = newSet
}

// 全选/取消全选
function toggleSelectAll() {
  if (selectedItems.value.size === scanResults.value.length) {
    selectedItems.value = new Set()
  } else {
    const newSet = new Set<string>()
    scanResults.value.forEach(item => newSet.add(item.path))
    selectedItems.value = newSet
  }
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Kirei - 系统清理工具</h1>
      <div class="platform-info" v-if="platformInfo">
        <span>系统: {{ platformInfo.isMacOS ? 'macOS' : '其他' }}</span>
      </div>
    </header>

    <main class="app-main">
      <!-- 扫描器选择 -->
      <section class="scanner-section">
        <h2>选择扫描类别</h2>
        <div v-if="scannersPending" class="loading">加载中...</div>
        <div v-else class="scanner-options">
          <div v-for="scanner in scanners" :key="scanner.id" class="scanner-option">
            <input
              type="checkbox"
              :id="`scanner-${scanner.id}`"
              :value="scanner.category"
              v-model="selectedCategories"
            />
            <label :for="`scanner-${scanner.id}`">{{ scanner.name }}</label>
          </div>
        </div>
        <button
          class="scan-button"
          @click="performScan"
          :disabled="scanning || selectedCategories.length === 0"
        >
          {{ scanning ? '扫描中...' : '开始扫描' }}
        </button>
      </section>

      <!-- 扫描结果 -->
      <section v-if="scanResults.length > 0" class="results-section">
        <div class="results-header">
          <h2>扫描结果</h2>
          <div class="results-info">
            <span>共 {{ scanResults.length }} 项，总计 {{ formatSize(scanResponse?.totalSize || 0) }}</span>
            <button class="select-all-button" @click="toggleSelectAll">
              {{ selectedItems.size === scanResults.length ? '取消全选' : '全选' }}
            </button>
          </div>
        </div>

        <div class="results-list">
          <div
            v-for="item in scanResults"
            :key="item.path"
            class="result-item"
            :class="{ selected: selectedItems.has(item.path) }"
            @click="toggleItemSelection(item.path)"
          >
            <div class="item-checkbox">
              <input
                type="checkbox"
                :checked="selectedItems.has(item.path)"
                @click.stop
              />
            </div>
            <div class="item-info">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-path">{{ item.path }}</div>
            </div>
            <div class="item-size">{{ formatSize(item.size) }}</div>
          </div>
        </div>

        <div class="actions">
          <button
            class="clean-button"
            @click="performClean"
            :disabled="cleaning || selectedItems.size === 0"
          >
            {{ cleaning ? '清理中...' : '清理选中项' }}
          </button>
        </div>
      </section>

      <!-- 清理结果 -->
      <section v-if="cleanResponse" class="clean-result">
        <h2>清理结果</h2>
        <div class="clean-stats">
          <div class="stat">
            <span class="stat-value success">{{ cleanResponse.data?.successCount || 0 }}</span>
            <span class="stat-label">成功清理</span>
          </div>
          <div class="stat">
            <span class="stat-value error">{{ cleanResponse.data?.failCount || 0 }}</span>
            <span class="stat-label">清理失败</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ cleanResponse.data?.totalCount || 0 }}</span>
            <span class="stat-label">总计</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style>
.app-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.app-header h1 {
  margin: 0;
  color: #333;
}

.platform-info {
  color: #666;
  font-size: 14px;
}

.app-main {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.scanner-section, .results-section, .clean-result {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.scanner-section h2, .results-section h2, .clean-result h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.scanner-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin: 20px 0;
}

.scanner-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scan-button, .clean-button, .select-all-button {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 15px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.scan-button:hover, .clean-button:hover, .select-all-button:hover {
  background-color: #2980b9;
}

.scan-button:disabled, .clean-button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.results-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.results-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background-color: #f8f9fa;
}

.result-item.selected {
  background-color: #e3f2fd;
}

.item-checkbox {
  margin-right: 12px;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-path {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-size {
  font-weight: 500;
  color: #333;
  margin-left: 15px;
}

.actions {
  margin-top: 20px;
  text-align: right;
}

.clean-result {
  text-align: center;
}

.clean-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-value.success {
  color: #27ae60;
}

.stat-value.error {
  color: #e74c3c;
}

.stat-label {
  font-size: 14px;
  color: #666;
}
</style>
