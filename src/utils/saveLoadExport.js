export const saveToFile = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const loadFromFile = () => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json,.txt,text/plain'
    
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) {
        reject(new Error('Файл не выбран'))
        return
      }
      
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target.result
          
          if (file.name.endsWith('.txt')) {
            // Парсим txt: "вопрос\tответ" на каждой строке
            const lines = text.split('\n').map(l => l.trim()).filter(l => l)
            const pairs = lines.map((line, idx) => {
              const parts = line.split(/\t|,|;/)
              return {
                id: `pair-${Date.now()}-${idx}`,
                left: parts[0]?.trim() || '',
                right: parts[1]?.trim() || '',
              }
            })
            resolve({ pairs, format: 'txt' })
          } else {
            // Парсим JSON
            const data = JSON.parse(text)
            resolve({ ...data, format: 'json' })
          }
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Ошибка чтения файла'))
      reader.readAsText(file)
    }
    
    input.click()
  })
}

export const exportToPDF = async (canvas, filename) => {
  // Импорт jsPDF динамически, чтобы не тянуть в основной бандл
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  const imgData = canvas.toDataURL('image/png')
  const imgWidth = pageWidth - 20
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  
  doc.addImage(imgData, 'PNG', 10, Math.max(10, (pageHeight - imgHeight) / 2), imgWidth, imgHeight)
  doc.save(filename)
}
