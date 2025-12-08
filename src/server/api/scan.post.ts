import { scannerManager } from '../../node/scanner'
import type { ScanCategory } from '../../node/scanner/types'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const categories: ScanCategory[] = body.categories || []
    
    // 运行扫描
    let results = await scannerManager.runScan(categories)
    
    // 按大小从大到小排序
    results.sort((a, b) => b.size - a.size)
    
    return {
      success: true,
      data: results,
      count: results.length,
      totalSize: results.reduce((acc, item) => acc + item.size, 0)
    }
  }
  catch (error) {
    console.error('Scan error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to perform scan'
    })
  }
})
