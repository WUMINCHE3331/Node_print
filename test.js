const express = require("express");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const printer = require("pdf-to-printer");
const app = express();
const port = 3030;
const imagePath = path.join(__dirname, "dog.png");
app.use(express.json());

printer.getPrinters().then((printers) => {
  console.log("本機印表機列表：");
  printers.forEach((p) => console.log(p.name));
}).catch(console.error);

app.post("/print", async (req, res) => {
  let data;

  if (typeof req.body.text === "string") {
    try {
      data = JSON.parse(req.body.text);
    } catch (e) {
      console.log("📨 測試訊息：", req.body.text);
      return res.status(200).json({ success: true, message: "測試訊息已收到 ✅" });
    }
  } else {
    data = req.body;
  }

  const { order, items } = data;

  if (!order || !items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: "缺少 order 或 items 資料" });
  }

  const doc = new PDFDocument({
    size: [70.8, 99.2], // 將紙張設定為直向
    margin: 2,
  });

  const jokes = [
    "喝了這杯，你就會笑！不信你喝喝看～",
    "珍珠說：我只是想泡個湯，結果變成了飲料主角。",
    "你知道奶茶的夢想是什麼嗎？變成拿鐵啊～",
    "我不是在加料，我是在加幸福。",
    "茶理士說：喝我不會變帥，但會變開心！",
    "人生苦短，多喝一點甜的（微糖啦）",
  ];

  const fontPath = path.join(__dirname, "LXGWWenKaiTC-Bold.ttf");
  if (fs.existsSync(fontPath)) doc.font(fontPath);

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", async () => {
    const pdfBuffer = Buffer.concat(chunks);
    const fileName = `label_order_${order.order_no}.pdf`;
    const filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    console.log(`✅ 標籤 PDF 已儲存: ${fileName}`);

    try {
      await printer.print(filePath, {
        printer: "Xprinter XP-420B",
      });
      console.log(`🖨️ 已送出列印：${fileName}`);
      res.json({ success: true, message: "PDF 產生並列印成功 ✅" });
    } catch (err) {
      console.error("❌ 列印失敗：", err);
      res.status(500).json({ success: false, message: "PDF 產生但列印失敗 ❌" });
    }
  });
// doc.on("end", async () => {
//     const pdfBuffer = Buffer.concat(chunks);
//     const fileName = `label_order_${order.order_no}.pdf`;
//     const filePath = path.join(__dirname, fileName);

//     // 儲存 PDF 檔案
//     fs.writeFileSync(filePath, pdfBuffer);
//     console.log(`✅ 標籤 PDF 已儲存: ${fileName}`);

//     try {
//       // 呼叫印表機列印 PDF（需安裝 pdf-to-printer）
//       await printer.print(filePath, {
//         printer: "Xprinter XP-420B",
//       });
//       console.log(`🖨️ 已送出列印：${fileName}`);
//       res.json({ success: true, message: "PDF 產生並列印成功 ✅" });
//     } catch (err) {
//       console.error("❌ 列印失敗：", err);
//       res.status(500).json({ success: false, message: "PDF 產生但列印失敗 ❌" });
//     }
//   });

  let isFirstPage = true;
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  let labelCount = 1;

  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      if (!isFirstPage) {
        doc.addPage({ size: [70.8, 99.2], margin: 2 });
      }
      isFirstPage = false;

      // 🌀 旋轉畫布（整頁）
      doc.rotate(90, { origin: [0, 0] });
      doc.translate(0, -70.8);

      const labelIndex = `${labelCount}/${totalCount}`;
      const toppings = item.options?.filter((o) => o.selected).map((o) => o.name).join(",") || "";
      const storeName = "樂華店";
      const storePhone = "02-26629999";
      const now = new Date();
      const timestamp = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      doc.fontSize(7).text(`茶理士  #${order.order_no}`, 4, 2, { width: 60 });
      doc.fontSize(6).text(timestamp, 54, 3, { width: 40, align: "right" });

      const itemName = item.name;
      const itemPrice = item.price ? ` $${item.price}` : "";
      doc.fontSize(10).text(`${itemName}${itemPrice}`, 4, 12, { width: 90 });
      doc.fontSize(7).text(labelIndex, 64, 14, { width: 30, align: "right" });
      doc.fontSize(8).text(`${item.sugar_level || ""},${item.ice || ""}${toppings ? "," + toppings : ""}`, 4, 25, { width: 90 });
      const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
      doc.fontSize(7).text(randomJoke, 4, 36, { width: 90 });
      doc.fontSize(7).text(`${storeName} ${storePhone}`, 4, 58);
      doc.image(imagePath, 74, 50, { width: 25 });

      labelCount++;
    }
  }

  doc.end();
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🖨️ PDF列印服務啟動：http://0.0.0.0:${port}`);
});
