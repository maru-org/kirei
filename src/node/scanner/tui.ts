import type { ScannerManager } from './core/manager'
import type { IScanner, ScanResult } from './types'
import process from 'node:process'
import * as readline from 'node:readline'
import c from 'ansis'
import { applySort } from './core/sorter'
import { SortStrategy } from './types'

interface UINode {
  name: string
  isCategory: boolean
  isParentDir?: boolean
  scanner?: IScanner
  data?: ScanResult
  children?: UINode[]
  loaded: boolean
  parent?: UINode
}

export class ScannerBrowser {
  private manager: ScannerManager
  private rootNodes: UINode[] = []

  private currentList: UINode[] = []
  private cursorIndex = 0
  private breadcrumbs: UINode[] = []

  private selectedPaths = new Set<string>()
  private totalSelectedSize = 0

  private isSearching = false
  private searchQuery = ''

  private loading = false
  private statusMessage = ''

  constructor(manager: ScannerManager) {
    this.manager = manager
    this.rootNodes = this.manager.getScanners().map(scanner => ({
      name: scanner.name,
      isCategory: true,
      scanner,
      loaded: false,
      children: [],
    }))
    this.currentList = this.rootNodes
  }

  private formatSize(bytes: number): string {
    const mb = bytes / 1024 / 1024
    if (mb > 1024)
      return `${(mb / 1024).toFixed(2)} GB`
    return `${mb.toFixed(2)} MB`
  }

  private get displayList(): UINode[] {
    if (!this.searchQuery)
      return this.currentList

    return this.currentList.filter((node) => {
      if (node.isParentDir)
        return false
      return node.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    })
  }

  async start(): Promise<ScanResult[]> {
    process.stdin.resume()
    readline.emitKeypressEvents(process.stdin)
    if (process.stdin.isTTY)
      process.stdin.setRawMode(true)
    process.stdout.write('\x1B[?25l')

    this.render()

    return new Promise((resolve) => {
      const handleKey = async (_str: string, key: readline.Key) => {
        if (key.ctrl && key.name === 'c') {
          this.cleanup(handleKey)
          process.exit(0)
        }

        if (this.loading)
          return

        if (this.isSearching) {
          if (key.name === 'escape') {
            this.exitSearchMode()
          }
          else if (key.name === 'backspace') {
            this.searchQuery = this.searchQuery.slice(0, -1)
            this.cursorIndex = 0
          }
          else if (key.name === 'return' || key.name === 'enter') {
            await this.handleEnter()
          }
          else if (key.name === 'up' || key.name === 'down') {
            this.handleNavigation(key.name)
          }
          else if (key.name === 'space') {
            this.toggleSelection()
          }
          // Regex for allowed chars
          else if (key.sequence && key.sequence.length === 1) {
            if (/^[a-zA-Z0-9.\-_/@#$%^&()[\]{}\s]$/.test(key.sequence)) {
              this.searchQuery += key.sequence
              this.cursorIndex = 0
            }
          }
        }
        else {
          switch (key.name) {
            case 'up':
            case 'down':
              this.handleNavigation(key.name)
              break
            case 'return':
            case 'enter':
              await this.handleEnter()
              break
            case 'space':
              this.toggleSelection()
              break
            case 'f':
              this.isSearching = true
              this.searchQuery = ''
              this.cursorIndex = 0
              break
            case 's':
              this.cleanup(handleKey)
              resolve(this.getSelectedItems())
              return
          }
        }

        this.render()
      }

      process.stdin.on('keypress', handleKey)
    })
  }

  private handleNavigation(direction: string) {
    const list = this.displayList
    if (direction === 'up') {
      this.cursorIndex = Math.max(0, this.cursorIndex - 1)
    }
    else {
      this.cursorIndex = Math.min(list.length - 1, this.cursorIndex + 1)
    }
  }

  private exitSearchMode() {
    this.isSearching = false
    this.searchQuery = ''
    this.cursorIndex = 0
  }

  private async handleEnter() {
    const list = this.displayList
    const node = list[this.cursorIndex]
    if (!node)
      return

    if (node.isParentDir) {
      this.handleGoBack()
      return
    }

    if (node.isCategory && node.scanner && !node.loaded) {
      this.loading = true
      this.render()

      const results = await this.manager.runSpecificScan(node.scanner)
      const sorted = applySort(results, SortStrategy.Size, true)

      const childNodes: UINode[] = sorted.map(r => ({
        name: r.name,
        isCategory: false,
        data: r,
        loaded: true,
        parent: node,
      }))

      const backNode: UINode = {
        name: '..',
        isParentDir: true,
        isCategory: false,
        loaded: true,
        parent: node,
      }

      node.children = [backNode, ...childNodes]
      node.loaded = true
      this.loading = false
    }

    if (node.children && node.children.length > 0) {
      if (this.isSearching)
        this.exitSearchMode()

      if (node.children.length === 1 && node.children[0].isParentDir) {
        this.statusMessage = c.yellow(' (Empty directory)')
        // Fix: Split into block to satisfy max-statements-per-line
        setTimeout(() => {
          this.statusMessage = ''
          this.render()
        }, 1000)
        return
      }

      this.breadcrumbs.push(node)
      this.currentList = node.children
      this.cursorIndex = 0
    }
  }

  private handleGoBack() {
    if (this.isSearching)
      this.exitSearchMode()

    const parent = this.breadcrumbs.pop()
    if (parent) {
      if (parent.parent) {
        this.currentList = parent.parent.children!
      }
      else {
        this.currentList = this.rootNodes
      }

      const index = this.currentList.indexOf(parent)
      this.cursorIndex = index !== -1 ? index : 0
    }
  }

  private toggleSelection() {
    const list = this.displayList
    const node = list[this.cursorIndex]

    if (!node || node.isCategory || node.isParentDir)
      return

    if (node.data) {
      const path = node.data.path
      if (this.selectedPaths.has(path)) {
        this.selectedPaths.delete(path)
        this.totalSelectedSize -= node.data.size
      }
      else {
        this.selectedPaths.add(path)
        this.totalSelectedSize += node.data.size
      }
    }
  }

  private getSelectedItems(): ScanResult[] {
    const allItems: ScanResult[] = []
    const traverse = (nodes: UINode[]) => {
      for (const node of nodes) {
        if (node.data && this.selectedPaths.has(node.data.path)) {
          allItems.push(node.data)
        }
        if (node.children && !node.isParentDir) {
          traverse(node.children)
        }
      }
    }
    traverse(this.rootNodes)
    return allItems
  }

  /* eslint-disable no-console */
  private render() {
    process.stdout.write('\x1B[2J\x1B[0f')

    console.log(c.gray('│'))
    console.log(`${c.gray('◇')}  ${c.bold('File Explorer')}`)
    console.log(`${c.gray('│')}  ${c.dim('Nav: ↑/↓/Enter | Search: "f" | Select: Space')}`)
    console.log(`${c.gray('│')}  ${c.green.bold('Press "s" to Submit Selection')} `)
    console.log(c.gray('│'))

    if (this.loading) {
      console.log(`${c.gray('│')}  ${c.yellow('Scanning... please wait...')}`)
      return
    }

    const list = this.displayList
    const maxHeight = 10

    if (this.cursorIndex >= list.length)
      this.cursorIndex = Math.max(0, list.length - 1)

    const startRow = Math.max(0, this.cursorIndex - Math.floor(maxHeight / 2))
    const endRow = Math.min(list.length, startRow + maxHeight)

    if (list.length === 0 && this.isSearching) {
      console.log(`${c.gray('│')}    ${c.dim('No matches found.')}`)
    }

    for (let i = startRow; i < endRow; i++) {
      const node = list[i]
      const isFocused = i === this.cursorIndex
      const bar = isFocused ? c.green('│') : c.gray('│')

      let prefix = ''
      let label = ''

      if (node.isParentDir) {
        prefix = '   '
        label = c.bold('.. (Go Back)')
      }
      else {
        let checkbox = c.dim('[ ] ')
        if (!node.isCategory && node.data) {
          const isSelected = this.selectedPaths.has(node.data.path)
          checkbox = isSelected ? c.green('[x] ') : c.dim('[ ] ')
        }
        else if (node.isCategory) {
          checkbox = '    '
        }

        const icon = node.isCategory ? '📁' : '📄'
        prefix = checkbox

        label = `${icon} ${node.name}`
        if (node.data)
          label += c.dim(` (${this.formatSize(node.data.size)})`)
      }

      if (isFocused) {
        console.log(`${bar}  ${c.cyan.bold('›')} ${prefix}${c.bold(label)} ${this.statusMessage}`)
      }
      else {
        console.log(`${bar}    ${prefix}${label}`)
      }
    }

    const remaining = list.length - endRow
    if (remaining > 0)
      console.log(`${c.gray('│')}    ${c.dim(`... ${remaining} more`)}`)

    console.log(c.gray('│'))

    if (this.isSearching) {
      console.log(`${c.gray('└')}  ${c.cyan('Search:')} ${this.searchQuery}${c.bold.bold('_')}`)
    }
    else {
      const pathStr = this.breadcrumbs.map(n => n.name).join(' / ')
      console.log(`${c.gray('└')}  Path: ${c.dim(`/ ${pathStr}`)}`)
    }

    if (this.selectedPaths.size > 0) {
      console.log(`   ${c.green('Selected:')} ${this.selectedPaths.size} items (${c.yellow(this.formatSize(this.totalSelectedSize))})`)
    }
  }
  /* eslint-enable no-console */

  private cleanup(listener: (str: string, key: readline.Key) => void) {
    process.stdin.removeListener('keypress', listener)
    if (process.stdin.isTTY)
      process.stdin.setRawMode(false)
    process.stdout.write('\x1B[?25h')
  }
}
