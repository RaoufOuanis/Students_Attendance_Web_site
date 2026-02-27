# Attendance Web App (Node.js)

تطبيق حضور بسيط للطلبة مبني على Node.js و MySQL مع واجهة للطلبة ولوحة تحكم للإدارة.

## الميزات
- تسجيل الطلبة مع التحقق من رقم الطالب وعدم تكرار IP.
- لوحة تحكم إدارية مع تفعيل/تعطيل التسجيل.
- صفحة QR للوصول السريع عبر الشبكة المحلية.
- استيراد قائمة الطلبة من CSV وتصدير قاعدة البيانات.

## التقنيات
- Node.js + Express
- MySQL (mysql2)
- EJS
- Socket.IO
- Bootstrap

## البنية
- `express.js`: خادم Express والمسارات.
- `public/`: صفحات الواجهة الثابتة.
- `views/`: قوالب EJS.
- `tools/`: أدوات الاستيراد/التصدير وتحويل XLSX.

## المتطلبات
- Node.js 18+ (يفضل LTS)
- MySQL Server

## الإعداد والتشغيل
1) تثبيت الحزم:

```bash
npm install
```

2) إعداد متغيرات البيئة (اختياري لكن موصى به):

```bash
# PowerShell
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="your_password"
$env:DB_NAME="attendance"
```

3) تشغيل الخادم:

```bash
node express.js
```

4) الواجهة:
- الطلاب: `http://localhost:3000/`
- QR: `http://localhost:3000/ip`
- الإدارة: `http://localhost:3000/admin`

## الجداول المطلوبة (الحد الأدنى)
- `students`: الأعمدة المستخدمة هي `ip`, `studentId`
- `mylist`: الأعمدة المستخدمة هي `name`, `surname`, `StudentIdL`

> تأكد من إنشاء قاعدة البيانات والجداول قبل التشغيل.

## أوامر الأدوات
- تحويل XLSX إلى CSV:

```bash
npm run xlsx:to-csv -- input.xlsx output.csv Sheet1
```

- استيراد قائمة الطلبة إلى جدول `mylist`:

```bash
npm run csv:import-mylist -- mylist.csv --truncate
```

- تصدير قاعدة البيانات:

```bash
npm run db:export -- attendance_backup.sql
```

## ملاحظات أمنية
- بيانات الدخول للإدارة ومعطيات قاعدة البيانات تحتوي على قيم افتراضية داخل [express.js](express.js). غيّرها قبل النشر.
- لا ترفع ملفات السجلات أو بيانات حساسة إلى GitHub.

## تشغيل عبر نفق (اختياري)
توجد سكربتات مساعدة في الجذر مثل `start-cloudflared.ps1` وملفات `*.cmd` لتشغيل النفق محليًا حسب بيئتك.
