const express = require("express");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const printer = require("pdf-to-printer");
const app = express();
const port = 3000;
const imagePath = path.join(__dirname, "dog.png"); // 這裡改為專案根目錄下的 dog.png
app.use(express.json());
printer
  .getPrinters()
  .then((printers) => {
    console.log("本機印表機列表：");
    printers.forEach((p) => console.log(p.name));
  })
  .catch(console.error);
app.post("/print", async (req, res) => {
  let data;

  if (typeof req.body.text === "string") {
    try {
      data = JSON.parse(req.body.text);
    } catch (e) {
      console.log("📨 測試訊息：", req.body.text);
      return res
        .status(200)
        .json({ success: true, message: "測試訊息已收到 ✅" });
    }
  } else {
    data = req.body;
  }

  const { order, items } = data;

  if (!order || !items || !Array.isArray(items)) {
    return res
      .status(400)
      .json({ success: false, message: "缺少 order 或 items 資料" });
  }

  const doc = new PDFDocument({
    size: [99.2, 70.8], // 35mm x 25mm in points
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
  const fontPath = path.join(__dirname, "LXGWWenKaiTC-Bold.ttf"); // 自行準備字體
  if (fs.existsSync(fontPath)) doc.font(fontPath);

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  // doc.on("end", () => {
  //   const pdfBuffer = Buffer.concat(chunks);
  //   const fileName = `label_order_${order.order_no}.pdf`;
  //   fs.writeFileSync(path.join(__dirname, fileName), pdfBuffer);
  //   console.log(`✅ 標籤 PDF 已儲存: ${fileName}`);
  //   res.json({ success: true, message: "PDF 產生成功 ✅" });
  // });
  
  let isFirstPage = true;
  // Step 1: 計算總共要印幾張標籤
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  let labelCount = 1;
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      if (!isFirstPage) {
        doc.addPage({ size: [99.2, 70.8], margin: 2 });
      }
      isFirstPage = false;

      const labelIndex = `${labelCount}/${totalCount}`;
      const toppings =
        item.options
          ?.filter((o) => o.selected)
          .map((o) => o.name)
          .join(",") || "";
      const storeName = "樂華店";
      const storePhone = "02-26629999";
      const qrText = `https://yourstore.tw/order/${order.order_no}`;

      const now = new Date();
      const timestamp = `${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}/${String(now.getDate()).padStart(2, "0")} ${String(
        now.getHours()
      ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      // 插入文字稍微右移
      // 1. Header 行：訂單號 + 日期時間
      doc.fontSize(7).text(`茶理士  #${order.order_no}`, 4, 2, { width: 60 });
      doc.fontSize(6).text(timestamp, 54, 3, { width: 40, align: "right" }); // 原本是 64 + 30

      doc.fontSize(10);
      const itemName = item.name;
      const itemPrice = item.price ? ` $${item.price}` : "";
      doc.text(`${itemName}${itemPrice}`, 4, 12, { width: 90 }); // 調整寬度避免換行

      // 標籤編號靠右
      doc.fontSize(7).text(labelIndex, 64, 14, { width: 30, align: "right" });
      // 3. 配料 + 冰糖，建議自動換行
      doc
        .fontSize(8)
        .text(
          `${item.sugar_level || ""},${item.ice || ""}${
            toppings ? "," + toppings : ""
          }`,
          4,
          25,
          { width: 90 }
        );
      // 隨機選一句
      const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

      // 插入笑話（小字體）
      doc.fontSize(7).text(randomJoke, 4, 36, { width: 90 });
      // 4. 門市資訊只印一次
      doc.fontSize(7).text(`${storeName} ${storePhone}`, 4, 58);
      doc.image(imagePath, 74, 50, { width: 30 });

      labelCount++;
    }
  }

  doc.end();
});
// // QRCode 右下角顯示
// const qrDataURL = await QRCode.toDataURL(qrText, { margin: 0 });
// const qrImageBuffer = Buffer.from(qrDataURL.split(",")[1], "base64");
// doc.image(qrImageBuffer, 72, 45, { width: 20 }); // 📍右下角

app.listen(port, "0.0.0.0", () => {
  console.log(`🖨️ PDF列印服務啟動：http://0.0.0.0:${port}`);
});
