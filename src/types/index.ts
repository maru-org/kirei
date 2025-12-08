export interface Metadata {
  cwd: string
}

export interface PlatformInfo {
  platform: string
  isMacOS: boolean
}

// 扫描器相关类型
export enum ScanCategory {
  UserCache = 0,
  SystemLog = 1,
  AppResidue = 2,
  Developer = 3,
  Downloads = 4
}

export interface ScanResult {
  path: string
  size: number
  mtime: Date
  name: string
  category: ScanCategory
  scannerId: string
}

export interface ScannerInfo {
  id: string
  name: string
  category: ScanCategory
  categoryName: string
}

export interface ScanResponse {
  success: boolean
  data: ScanResult[]
  count: number
  totalSize: number
}

export interface CleanResponse {
  success: boolean
  data: {
    successCount: number
    failCount: number
    totalCount: number
  }
}
