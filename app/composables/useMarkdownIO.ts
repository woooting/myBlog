/**
 * Markdown 导入/导出 Composable
 * 处理 Markdown 文件的读取和下载
 */
export function useMarkdownIO(editor: any) {
  /**
   * 导入 Markdown 文件
   */
  const importMarkdown = async (file: File): Promise<void> => {
    const content = await file.text()
    editor.value?.commands.setContent(content)
    return
  }

  /**
   * 导出 Markdown 文件
   */
  const exportMarkdown = () => {
    if (!editor.value) return
    const markdown = editor.value.storage.markdown.getMarkdown()
    downloadFile(markdown, 'document.md')
  }

  /**
   * 下载文件到本地
   */
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return {
    importMarkdown,
    exportMarkdown,
  }
}
