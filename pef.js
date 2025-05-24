// test.js
const PDFDocument = require('pdfkit')
const fs = require('fs')
// 新增一個 PDF (這邊調整成標籤紙的大小，單位是 pt）
// 紙張 size 要自己算一下，我的印表機大小錯誤會吐 error
const doc = new PDFDocument({
  size: [114, 85],
  margin: 0
})
doc.fontSize(20).text(`TEST`, 0, 35, { align: 'center'})
doc.pipe(fs.createWriteStream('./test.pdf'))
doc.end()