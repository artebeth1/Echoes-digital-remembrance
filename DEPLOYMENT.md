# 🚀 Echoes Deployment Guide

部署 Echoes 应用到 Vercel + Firebase

## Prerequisites

- GitHub 账户
- Vercel 账户 (免费，用 GitHub 登录)
- Google Gemini API Key (免费)
- Firebase Project (免费)

---

## 步骤 1: 获取 API Keys

### A. Google Gemini API Key
1. 访问 https://ai.google.dev/
2. 点 "Get API Key"
3. 创建新的 API key (免费配额足够开发)
4. 复制 key

### B. Firebase Configuration
1. 访问 https://console.firebase.google.com
2. 创建新项目 (或用现有的)
3. 在 "Project Settings" 找到你的配置：
   ```json
   {
     "apiKey": "AIza...",
     "authDomain": "your-project.firebaseapp.com",
     "projectId": "your-project-id",
     "storageBucket": "your-project.appspot.com",
     "messagingSenderId": "...",
     "appId": "..."
   }
   ```
4. 记下这些值

---

## 步骤 2: 部署到 Vercel

### 1. 访问 Vercel
- 打开 https://vercel.com
- 用 GitHub 账号登录

### 2. Import Project
- 点 "Add New" → "Project"
- 选择 "Echoes-digital-remembrance" repo
- 点 "Import"

### 3. 配置环境变量
在 "Environment Variables" 部分，添加：

```
VITE_GEMINI_API_KEY=your_gemini_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Deploy
- 点 "Deploy"
- 等待 2-3 分钟
- 获取你的 Live URL (例如: `https://echoes.vercel.app`)

---

## 步骤 3: 配置 Firebase

### 1. 启用 Authentication
1. Firebase Console → Authentication
2. 点 "Get started"
3. 启用 "Email/Password"

### 2. 创建 Firestore Database
1. Firebase Console → Firestore Database
2. 点 "Create Database"
3. 选择 "Start in test mode" (开发用)
4. 选择区域

### 3. 设置 Firestore Rules (可选但推荐)
```
rules_version = '3';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - only owner can read/write
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Characters collection - owner can manage
    match /characters/{characterId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    // Chats collection
    match /chats/{chatId} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## 步骤 4: 本地测试 (可选)

```bash
# Clone & install
git clone https://github.com/artebeth1/Echoes-digital-remembrance.git
cd Echoes-digital-remembrance
npm install

# Create .env.local
cp .env.example .env.local
# 编辑 .env.local，填入你的 API keys

# Run locally
npm run dev
# 访问 http://localhost:3000
```

---

## ✅ 完成！

你的应用现在已上线：

- **Frontend**: https://echoes.vercel.app (或你的自定义 URL)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication

---

## 故障排查

### "API Key not found" 错误
- 检查 Vercel 环境变量是否正确设置
- 重新部署 (Vercel 需要看到新的环境变量)

### Firebase 连接失败
- 确认 Firebase 配置正确
- 检查 Firestore 是否已创建
- 浏览器 Console (F12) 看详细错误

### 构建失败
- 检查 Vercel Build Logs
- 确保所有依赖都在 `package.json` 中
- 清除 node_modules: `rm -rf node_modules && npm install`

---

**需要帮助？** 开 Issue: https://github.com/artebeth1/Echoes-digital-remembrance/issues
