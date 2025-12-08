import { scannerManager } from '../../node/scanner'
import { DeleteMode } from '../../node/scanner/types'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { paths, mode = 'soft' } = body

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid paths provided'
      })
    }

    // 构造扫描结果对象
    const items = paths.map(path => ({
      path,
      size: 0, // 清理时不需要大小信息
      mtime: new Date(),
      name: path.split('/').pop() || path,
      category: 0, // 任意值，清理时不使用
      scannerId: 'web-api' // 标识来源
    }))

    // 执行清理
    const deleteMode = mode === 'hard' ? DeleteMode.Hard : DeleteMode.Soft
    const { successCount, failCount } = await scannerManager.clean(items, deleteMode)

    return {
      success: true,
      data: {
        successCount,
        failCount,
        totalCount: paths.length
      }
    }
  }
  catch (error) {
    console.error('Clean error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to perform clean operation'
    })
  }
})
