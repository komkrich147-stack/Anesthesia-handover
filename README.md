# ระบบส่งเวรวิสัญญี (Anesthesia Handover)

React + Vite + Tailwind CSS SPA สำหรับบันทึกข้อมูลผู้ป่วยรายห้องผ่าตัด และดู Dashboard สรุปภาพรวมการส่งเวร

> ⚠️ **ข้อจำกัดเวอร์ชันนี้**: ข้อมูลเก็บด้วย `localStorage` ของเบราว์เซอร์ — ใช้งานได้ดีระหว่างแท็บ/หน้าต่างบน **เครื่องเดียวกัน** เท่านั้น ถ้าจะใช้จริงในโรงพยาบาลที่แต่ละห้องผ่าตัดกรอกจากอุปกรณ์คนละเครื่องแล้วให้หัวหน้าเวรเห็นข้อมูลเดียวกันแบบเรียลไทม์ **ต้องต่อฐานข้อมูลกลาง** เช่น Supabase, Firebase Realtime Database หรือ backend ของโรงพยาบาลเอง — บอกได้เลยถ้าต้องการให้ช่วยต่อส่วนนี้เพิ่ม

## รันบนเครื่องตัวเอง

```bash
npm install
npm run dev
```

เปิด http://localhost:5173

## Build สำหรับ production

```bash
npm run build
npm run preview   # ทดสอบไฟล์ build ก่อน deploy จริง
```

## ขึ้น GitHub

```bash
cd anesthesia-handover
git init
git add .
git commit -m "Initial commit: Anesthesia handover app"

# สร้าง repo เปล่าบน https://github.com/new ก่อน (ห้ามติ๊ก README/gitignore ให้ GitHub สร้างเอง)
# แล้วแทนที่ <your-username> และ <repo-name> ด้านล่างด้วยของจริง
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

หรือถ้าติดตั้ง [GitHub CLI](https://cli.github.com/) ไว้แล้ว ใช้คำสั่งเดียวจบแทนได้:

```bash
gh repo create <repo-name> --public --source=. --remote=origin --push
```

## Deploy ขึ้น Vercel

**วิธีที่ 1 — ผ่านเว็บ (ง่ายที่สุด):**
1. เข้า https://vercel.com/new
2. เลือก "Import Git Repository" แล้วเลือก repo ที่เพิ่ง push ขึ้น GitHub
3. Vercel จะตรวจจับว่าเป็นโปรเจกต์ Vite ให้อัตโนมัติ (Build Command: `npm run build`, Output Directory: `dist`) — กด Deploy ได้เลยไม่ต้องแก้อะไร

**วิธีที่ 2 — ผ่าน CLI:**
```bash
npm install -g vercel
vercel login
vercel        # deploy preview
vercel --prod # deploy ขึ้น production
```

## โครงสร้างโปรเจกต์

```
anesthesia-handover/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── index.css
    └── App.jsx   ← โค้ดหลักทั้งหมดของแอป (ฟอร์ม + dashboard)
```
