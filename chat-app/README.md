# COMP 3920 Assignment 2 — Chat Messaging App

A Node.js + MySQL + MongoDB chat messaging system.

---

## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up your `.env` file
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 3. Set up MySQL (Aiven)
- Create a free MySQL service at https://aiven.io
- In your Aiven console, open a **Query** terminal (or connect via MySQL Workbench)
- Run the SQL in `config/schema.sql` to create your tables

### 4. Set up MongoDB (for sessions)
- Create a free cluster at https://www.mongodb.com/cloud/atlas
- Get your connection string and paste it into `MONGODB_URI` in `.env`

### 5. Run the app
```bash
npm run dev      # development (nodemon)
npm start        # production
```
Visit: http://localhost:3000

---

## Deploying to Render

1. Push your code to GitHub (without `.env` and `node_modules/`)
2. Go to https://render.com → **New Web Service**
3. Connect your GitHub repo
4. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add all your **Environment Variables** from `.env` in Render's dashboard
6. Deploy!

---

## Project Structure

```
chat-app/
├── config/
│   ├── db.js           # MySQL connection pool
│   └── schema.sql      # Database schema — run this on Aiven
├── controllers/
│   ├── authController.js
│   ├── groupController.js
│   └── messageController.js
├── middleware/
│   └── auth.js         # requireLogin middleware
├── public/
│   ├── css/style.css
│   └── js/main.js
├── routes/
│   ├── auth.js
│   ├── groups.js
│   └── messages.js
├── views/
│   ├── auth/
│   │   ├── login.ejs
│   │   └── signup.ejs
│   ├── groups/
│   │   ├── index.ejs   # Group list
│   │   ├── create.ejs  # Create group
│   │   └── chat.ejs    # Chat view
│   └── partials/
│       ├── header.ejs
│       └── footer.ejs
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

---

## Features Implemented

- ✅ Signup with bcrypt-hashed passwords (10+ chars, upper/lower/number/symbol)
- ✅ Login / Logout (session destroyed on logout)
- ✅ Sessions stored in encrypted MongoDB via connect-mongo
- ✅ `requireLogin` middleware — all routes protected
- ✅ Authorization — 400 error if you access a group you're not in
- ✅ View all your chat groups with last message date + unread count
- ✅ Unread message count clears when you open the group
- ✅ Create new groups and invite members
- ✅ Invite more members to an existing group
- ✅ View all messages in a group (oldest → newest)
- ✅ Send new messages
- ✅ Emoji reactions (toggle on/off, show counts)
- ✅ `.env` file for all secrets
