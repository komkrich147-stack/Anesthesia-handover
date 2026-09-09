# CMU Anesthesia Handover

React + Vite + Tailwind CSS SPA สำหรับบันทึกข้อมูลผู้ป่วยรายห้องผ่าตัด และดู Dashboard สรุปภาพรวมการส่งเวร ข้อมูลเก็บบน **Supabase** (ฐานข้อมูลกลาง) พร้อม Realtime sync — ทุกอุปกรณ์ที่เปิดหน้านี้เห็นข้อมูลเดียวกันทันทีที่มีการบันทึก/แก้ไข/ลบ

## 1. Supabase — ตั้งค่าให้แล้ว ✅

ผมสร้างโปรเจกต์ Supabase, ตาราง `cases`, เปิด Row Level Security + policy, และเปิด Realtime ให้เรียบร้อยแล้วในบัญชี Supabase ที่คุณเชื่อมต่อไว้ (โปรเจกต์: `komkrich147-stack's Project`, region: ap-northeast-1)

ค่า URL/anon key ถูกใส่ไว้ในไฟล์ `.env` ที่แนบมาในนี้แล้ว (ไฟล์นี้ไม่ถูก push ขึ้น GitHub เพราะอยู่ใน `.gitignore` — เป็นเรื่องปกติและตั้งใจ) ถ้าต้องการสร้างโปรเจกต์ Supabase ใหม่เองในอนาคต ใช้ไฟล์ `supabase-setup.sql` รันซ้ำได้เลย แล้วเปลี่ยนค่าใน `.env` ตามโปรเจกต์ใหม่

**ค่าที่ต้องนำไปใส่ใน Vercel ตอน deploy (ขั้นตอนที่ 5 ด้านล่าง):**
- `VITE_SUPABASE_URL` = `https://yxareamcdhxdwfzvicad.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = (ดูค่าเต็มในไฟล์ `.env` ที่แนบมา)

## 2. รันบนเครื่องตัวเอง

ไฟล์ `.env` มีค่าพร้อมใช้แล้ว (ไม่ต้องสร้างเอง) แค่:

```bash
npm install
npm run dev
```

เปิด http://localhost:5173

> ไฟล์ `.env` ไม่ถูก push ขึ้น GitHub (อยู่ใน `.gitignore` แล้ว) เพราะมี key ส่วนตัวอยู่ข้างใน

## 3. Build สำหรับ production

```bash
npm run build
npm run preview   # ทดสอบไฟล์ build ก่อน deploy จริง
```

## 4. ขึ้น GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## 5. Deploy ขึ้น Vercel

1. เข้า https://vercel.com/new → Import repo จาก GitHub
2. **สำคัญ**: ก่อนกด Deploy ให้เปิด "Environment Variables" แล้วเพิ่ม 2 ตัวนี้ (ค่าเดียวกับใน `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. กด Deploy — ถ้าลืมใส่ env vars ตอนแรก เพิ่มทีหลังได้ที่ Project → Settings → Environment Variables แล้วกด Redeploy อีกครั้ง

## ความปลอดภัยที่ควรรู้

ระบบนี้ไม่มีระบบ login — ใครก็ตามที่มีลิงก์เว็บสามารถกรอก/ลบข้อมูลได้ (การลบและส่งเวรมีรหัส `9876` กันการกดพลาด แต่ไม่ใช่ระบบความปลอดภัยจริงจัง) และ Supabase anon key ที่ฝังในเว็บก็เปิดให้อ่าน/เขียนตารางได้เต็มที่ตาม policy ที่ตั้งไว้ เหมาะสำหรับใช้งานภายในหน่วยงานที่เชื่อใจกันเท่านั้น ถ้าต้องการความปลอดภัยกว่านี้ (เช่น ต้อง login ด้วยอีเมลโรงพยาบาลก่อนถึงจะเข้าได้) บอกได้เลย ต่อ Supabase Auth เพิ่มให้ได้

## โครงสร้างโปรเจกต์

```
anesthesia-handover/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── supabase-setup.sql       ← รันใน Supabase SQL Editor ครั้งเดียวตอนตั้งค่า
├── .env.example              ← copy เป็น .env แล้วใส่ค่าจริง
└── src/
    ├── main.jsx
    ├── index.css
    ├── supabaseClient.js     ← เชื่อมต่อ Supabase
    └── App.jsx                ← โค้ดหลักทั้งหมด (Dashboard + ฟอร์ม Add case)
```
