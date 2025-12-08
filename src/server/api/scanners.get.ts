import { scannerManager } from '../../node/scanner'
import { ScanCategory } from '../../node/scanner/types'

export default defineEventHandler(async () => {
  try {
    
    const scanners = scannerManager.getScanners()

    // 转换为更适合前端使用的格式
    const scannerData = scanners.map(scanner => {
      // 获取类别名称
      const categoryNames = {
        [ScanCategory.UserCache]: '用户缓存',
        [ScanCategory.SystemLog]: '系统日志',
        [ScanCategory.AppResidue]: '应用残留',
        [ScanCategory.Developer]: '开发者文件',
        [ScanCategory.Downloads]: '下载文件夹'
      };
      
      return {
        id: scanner.id,
        name: scanner.name,
        category: scanner.category,
        categoryName: categoryNames[scanner.category] || ScanCategory[scanner.category]
      };
    })

    return {
      success: true,
      data: scannerData
    }
  }
  catch (error) {
    console.error('Scanners error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get scanners'
    })
  }
})
