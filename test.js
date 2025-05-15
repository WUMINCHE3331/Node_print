const express = require("express");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

app.use(express.json());

app.post("/print", (req, res) => {
  let data;

  if (typeof req.body.text === "string") {
    try {
      data = JSON.parse(req.body.text);
    } catch (e) {
      return res.status(400).json({ success: false, message: "無法解析 text 內的 JSON" });
    }
  } else {
    data = req.body;
  }

  const { order, items } = data;

  if (!order || !items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: "缺少 order 或 items 資料" });
  }

  console.log("📝 收到要列印的資料：", JSON.stringify(data, null, 2));

  const doc = new PDFDocument({
    size: [200, 150],
    margin: 10,
  });

  const fontPath = path.join(__dirname, "SourceHanSansTC-VF.ttf");
  doc.font(fontPath);

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => {
    const pdfBuffer = Buffer.concat(chunks);
    const fileName = `label_order_${order.order_no}.pdf`;
    fs.writeFileSync(path.join(__dirname, fileName), pdfBuffer);
    console.log(`✅ 標籤 PDF 已儲存: ${fileName}`);

    res.json({ success: true, message: "已收到資料，標籤 PDF 已產生" });
  });

  let isFirstPage = true;

  items.forEach((item) => {
    // 依數量印多張
    for (let i = 0; i < item.quantity; i++) {
      if (!isFirstPage) {
        doc.addPage({ size: [200, 150], margin: 10 });
      }
      isFirstPage = false;

      doc.fontSize(14).text(`訂單編號: ${order.order_no}`, { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).text(`品項: ${item.name}`);
      doc.text(`數量: 1`); // 每張標籤都是單份
      doc.text(`甜度: ${item.sugar_level || "正常"}`);
      doc.text(`冰塊: ${item.ice || "正常"}`);

      if (item.options && item.options.length > 0) {
        const selectedOptions = item.options
          .filter((opt) => opt.selected)
          .map((opt) => opt.name)
          .join(", ");
        if (selectedOptions) {
          doc.text(`配料: ${selectedOptions}`);
        }
      }
    }
  });

  doc.end();
});

app.listen(port, () => {
  console.log(`🖨️ 列印服務已啟動：http://localhost:${port}`);
});
