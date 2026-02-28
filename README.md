# Excel Analyzer Monorepo

מונוריפו שמכיל שני פרויקטים:
- `transactions-backend` — API עם Node.js/Express + MongoDB
- `transactions-frontend` — אפליקציית React עם Vite

## 1) הרצת Backend

### דרישות מקדימות
- Node.js 20+
- MongoDB זמין (לוקאלי או Atlas)

### שלבים
```bash
cd transactions-backend
cp .env.example .env
# ערוך את .env עם הערכים שלך (בלי לחשוף secrets)
npm install
npm run dev
```

השרת יעלה כברירת מחדל בכתובת: `http://localhost:3000`.

---

## 2) הרצת Frontend

### משתנה סביבה
ה-Frontend משתמש ב-`VITE_API_URL` כדי לדעת לאיזה Backend לפנות.

צור קובץ `.env` בתוך `transactions-frontend`:
```env
VITE_API_URL=http://localhost:3000
```

### שלבים
```bash
cd transactions-frontend
npm install
npm run dev
```

ברירת המחדל של Vite היא בד"כ: `http://localhost:5173`.

---

## 3) Smoke Test קצר (7 צעדים)

1. הרץ MongoDB וודא שהוא זמין.
2. הפעל Backend (`npm run dev` מתוך `transactions-backend`).
3. הפעל Frontend (`npm run dev` מתוך `transactions-frontend`).
4. פתח דפדפן ב-`http://localhost:5173`.
5. בצע הרשמה למשתמש חדש (Signup) והתחבר.
6. העלה קובץ `.xlsx` דרך מסך Upload ובדוק שנוצר batch חדש.
7. עבור ל-Dashboard וודא שמוצגים נתוני סיכום (ללא שגיאות API בקונסול הדפדפן).

---

## 4) משתני סביבה נדרשים

### Backend (`transactions-backend/.env`)

| משתנה | חובה | תיאור |
|---|---|---|
| `MONGO_URL` | כן | מחרוזת חיבור ל-MongoDB |
| `JWT_SECRET` | כן | סוד לחתימת JWT (מומלץ 32+ תווים) |
| `PORT` | לא | פורט לשרת (ברירת מחדל: `3000`) |
| `NODE_ENV` | לא | `development` / `production` |
| `JWT_EXPIRES_IN` | לא | תוקף טוקן (ברירת מחדל: `7d`) |
| `ALLOWED_ORIGINS` | לא | רשימת origins מופרדת בפסיקים עבור CORS |

### Frontend (`transactions-frontend/.env`)

| משתנה | חובה | תיאור |
|---|---|---|
| `VITE_API_URL` | מומלץ מאוד | כתובת ה-Backend (למשל `http://localhost:3000`) |

> אם `VITE_API_URL` לא מוגדר, ה-Frontend משתמש בברירת מחדל `http://localhost:3000`.

---

## אבטחה
- אין לשמור secrets אמיתיים ב-repo.
- השתמשו בקבצי `.env` לוקאליים בלבד.
- שתפו רק ערכי דוגמה כמו ב-`.env.example`.
