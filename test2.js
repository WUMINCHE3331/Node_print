const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const printer = require("pdf-to-printer");

const express = require("express");
const app = express();
const port = 3000;
app.use(express.json());

const height = 35 * 2.83465; // 約 99.2 pt
const width = 35 * 2.83465; // 約 70.8 pt
const filePath = path.join(__dirname, "label_test.pdf");
const fontPath = path.join(__dirname, "LXGWWenKaiTC-Bold.ttf");
// 如果 LXGW 不存在，就使用 NotoSansTC
if (!fs.existsSync(fontPath)) {
  console.warn(
    "⚠️ LXGWWenKaiTC-Bold.ttf not found. Falling back to NotoSansTC-Bold.ttf."
  );
  fontPath = path.join(__dirname, "NotoSansTC-Bold.ttf");
}
function getCurrentFormattedDateTime() {
  const now = new Date();
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${MM}/${DD} ${HH}:${mm}`;
}
app.get("/status", async (req, res) => {
  try {
    // 這裡簡單回應 OK（更進一步可用 IPP 查是否可用）
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.toString() });
  }
});

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

  console.log("📦 收到資料：", JSON.stringify(data, null, 2));

  let  { order, items } = data;

  if (!order || !items || !Array.isArray(items)) {
    return res
      .status(400)
      .json({ success: false, message: "缺少 order 或 items 資料" });
  }
  // 定義不列印的分類
  const excludedCategories = ["塑膠袋", "折扣"];

  // 過濾 items，排除不列印的 category
  items = items.filter((item) => !excludedCategories.includes(item.category));
  console.log("過濾後的資料" ,items);
  // 若過濾後沒有可列印項目，直接回應不列印
  if (items.length === 0) {
    console.log("⚠️ 無可列印項目，全部屬於排除類別");
    return res.status(200).json({
      success: true,
      message: "無需列印的項目，皆屬於排除類別。",
    });
  }
  const timestamp = getCurrentFormattedDateTime();
  const orderNo = order.order_no || "N/A";
  const storeInfo = "茶理士 智障店 12345678";
  const note = "我不是加料,我是在加幸福幸福幸福";

  const doc = new PDFDocument({
    size: [width, height],
    margin: 2,
    autoFirstPage: false,
  });

  if (fs.existsSync(fontPath)) {
    doc.registerFont("CustomFont", fontPath);
  } else {
    console.error("❌ 找不到字體檔案 LXGWWenKaiTC-Bold.ttf");
    return res.status(500).json({ success: false, message: "缺少字體檔" });
  } 

  let totalLabels = 0;
  for (const item of items) {
    totalLabels += item.quantity || 1;
  }

  let currentLabel = 1;

  for (const item of items) {
    const name = item.name || "無品名";
    const price = item.price != null ? `$${item.price}` : "$0";
    const toppingNames = (item.options || [])
      .filter((opt) => opt.selected)
      .map((opt) => opt.name)
      .join(",");
    const sugar = item.sugar_level || "";
    const ice = item.ice || "";

    for (let i = 0; i < item.quantity; i++) {
      doc.addPage({ size: [width, height], margin: 2 });
      doc.font("CustomFont");

      const contentWidth = width - 4;
      const labelIndex = `${currentLabel}/${totalLabels}`;

      doc.fontSize(7).text(`#${orderNo} ${timestamp}    ${labelIndex}`, 3, 34, {
        width: contentWidth,
      });
      doc.fontSize(10).text(`${name} ${price}`, 3, 44, {
        width: contentWidth,
      });
      doc
        .fontSize(8)
        .text(
          `${sugar},${ice}${toppingNames ? "," + toppingNames : ""}`,
          3,
          56,
          {
            width: contentWidth,
          }
        );
      doc.fontSize(7).text(note, 3, 66, { width: contentWidth });
      doc.fontSize(7).text(storeInfo, 3, 87, { width: contentWidth });

      currentLabel++;
    }
  }

  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);
  doc.end();

  writeStream.on("finish", async () => {
    console.log("✅ PDF 已產生，準備列印");

    try {
      await printer.print(filePath, {
        printer: "Xprinter XP-420B",
      });
      console.log("🖨️ 成功送出列印");
    } catch (err) {
      console.error("❌ 列印錯誤:", err);
    }
  });

  return res.status(200).json({ success: true, message: "PDF 已產生" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🖨️ PDF列印服務啟動：http://0.0.0.0:${port}`);
});
