# دليل النشر على السيرفر

## النشر على السيرفر الثاني

### الخطوة 1: نسخ المشروع إلى السيرفر

```bash
# من جهازك المحلي
scp -r quality-tickets-system qwertauda@136.111.97.150:/var/www/
```

أو استخدم Git:

```bash
# على السيرفر
cd /var/www
git clone <your-repo-url> quality-tickets-system
cd quality-tickets-system
```

### الخطوة 2: تثبيت Dependencies

```bash
cd /var/www/quality-tickets-system/api
npm install
```

### الخطوة 3: إعداد قاعدة البيانات

```bash
# إنشاء ملف .env
cp ENV_TEMPLATE.env .env
nano .env
```

عدّل الإعدادات:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=quality_tickets_system
PORT=3001
```

### الخطوة 4: تهيئة قاعدة البيانات

```bash
npm run init-db
```

### الخطوة 5: إعداد PM2

```bash
# تثبيت PM2 (إذا لم يكن مثبتاً)
sudo npm install -g pm2

# تشغيل التطبيق
pm2 start server.js --name quality-tickets-system

# حفظ الإعدادات
pm2 save

# إعداد PM2 للبدء التلقائي
pm2 startup
```

### الخطوة 6: إعداد Nginx (اختياري)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### الخطوة 7: الوصول

افتح المتصفح واذهب إلى:
```
http://136.111.97.150:3001
```

## إدارة PM2

```bash
# عرض الحالة
pm2 status

# عرض السجلات
pm2 logs quality-tickets-system

# إعادة التشغيل
pm2 restart quality-tickets-system

# إيقاف
pm2 stop quality-tickets-system
```

## التحديثات المستقبلية

```bash
# على السيرفر
cd /var/www/quality-tickets-system
git pull origin main
cd api
npm install  # إذا كانت هناك dependencies جديدة
pm2 restart quality-tickets-system
```

## استكشاف الأخطاء

### المشكلة: لا يمكن الاتصال
- تحقق من أن PM2 يعمل: `pm2 status`
- تحقق من السجلات: `pm2 logs quality-tickets-system`
- تحقق من المنفذ: `sudo netstat -tulpn | grep 3001`

### المشكلة: خطأ في قاعدة البيانات
- تحقق من إعدادات `.env`
- تحقق من أن MySQL يعمل: `sudo systemctl status mysql`
- جرب الاتصال: `mysql -u root -p`

### المشكلة: الصور لا تظهر
- تحقق من وجود مجلد `uploads/`
- تحقق من الصلاحيات: `chmod -R 755 uploads/`
- تحقق من مسار الصور في قاعدة البيانات

