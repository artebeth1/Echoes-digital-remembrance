# 🍀 Echoes — Digital Remembrance Platform

> **一个治愈心灵的应用：** 通过 AI 重现已故亲人的对话，让你们继续相守。

![Echoes Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

---

## 📖 What is Echoes?

Echoes 是一个基于 AI 的数字悼念应用，允许用户：

✨ **创建虚拟角色** — 输入已故亲人的性格、回忆、说话方式  
💬 **实时对话** — 与 AI 驱动的虚拟人物进行深度交流  
🎤 **语音互动** — 录制语音，获得个性化回复  
🧠 **情感连接** — 通过对话重现珍贵的回忆和智慧  

**核心价值：** 为失去亲人的人提供心理陪伴与治愈。

---

## 🚀 Features

### 用户体验
- **温暖的界面设计** — 超现实主义美学（紫粉渐变、玻璃态效果）
- **对话式角色创建** — 9+ 步引导式问卷，深度构建角色档案
- **多种交互模式** — 文本聊天 + 语音对话 + 语音转文本
- **实时反馈** — 情感分析、角色口音、习惯性说话方式

### 技术能力
- **多维度 Persona JSON** — 深度性格模型（背景、记忆、习惯、价值观）
- **动态问题流** — 根据关系类型自适应（朋友 vs 家人）
- **记忆库** — 形式化的故事、话题、里程碑
- **AI Powered** — Google Gemini API + 自定义 Prompt Engineering

---

## 🛠️ Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (快速开发构建)
- Tailwind CSS (响应式设计)
- Firebase Realtime Database

**Backend / AI:**
- Google Gemini API (对话 + 情感理解)
- Firebase Authentication
- Firebase Realtime Database

**Deployment:**
- Frontend: Vercel
- Backend/Database: Firebase

---

## 📊 Project Metrics

| Metric | Value |
|--------|-------|
| 代码行数 | 3,500+ |
| 组件数 | 8+ |
| API 集成 | Google Gemini, Firebase |
| 用户流程 | 8 步对话式设计 |
| 部署目标 | Vercel + Firebase |

---

## 🏃 Quick Start

### Prerequisites
- Node.js 18+
- Gemini API Key (免费配额)
- Firebase Project (创建免费项目)

### Installation

```bash
# Clone & install
git clone https://github.com/artebeth1/Echoes-digital-remembrance.git
cd Echoes-digital-remembrance
npm install

# Setup environment
cp .env.example .env.local
# 编辑 .env.local，填入:
#   VITE_GEMINI_API_KEY=your_key
#   VITE_FIREBASE_CONFIG=your_config

# Run locally
npm run dev
```

Open `http://localhost:5173`

---

## 📱 User Flow

```
登录 → HomePage (树 + 动画)
  ↓
选择人物 或 创建新人物
  ↓
对话式问卷 (9 步)
  ├─ 名字、关系、昵称
  ├─ 背景、时代、性格
  ├─ 回忆、说话方式
  ├─ 喜好、习惯
  └─ 声音上传
  ↓
聊天 (文本/语音)
  ├─ 实时 AI 回复
  ├─ 情感分析
  └─ 个性化语音
```

---

## 🎨 Design Philosophy

**治愈为先** — 超现实主义美学 + 温暖配色  
**故事驱动** — 每个角色都是一个完整的故事  
**深度连接** — 细节的积累形成真实的对话体验  
**无界交流** — 突破生死的对话在这里延续  

---

## 🔐 Security & Privacy

✅ Firebase Authentication (安全的用户认证)  
✅ Firestore Rules (数据访问控制)  
✅ No third-party storage (用户数据仅存 Firebase)  
✅ HTTPS only (生产环境强制 HTTPS)  

---

## 📈 Roadmap

- [ ] 多语言支持 (中文、英文、日文)
- [ ] 离线模式 (本地 Persona 缓存)
- [ ] 高级声音克隆 (ElevenLabs integration)
- [ ] 情感图表 (对话趋势分析)
- [ ] 社区故事 (可选分享)
- [ ] 移动应用 (React Native)

---

## 💝 Why Echoes Matters

**数据：**
- 全球 ~260 万人每年因失去亲人而抑郁
- 传统悼念方式逐渐演变为数字形式
- 心理学研究表明，保持对话能帮助度过悲伤期

**我们的使命：**  
用 AI 和设计，将失落转化为连接。

---

## 🚀 Deployment

### Deploy to Vercel (Frontend)

```bash
# 1. Push to GitHub
git push origin main

# 2. 访问 vercel.com
# 3. Import "Echoes-digital-remembrance" repo
# 4. 设置环境变量
#    VITE_GEMINI_API_KEY=your_key
#    VITE_FIREBASE_CONFIG=your_config
# 5. Deploy
```

**Live URL:** (部署后获得)

---

## 📞 Support

**问题排查：**
- F12 打开浏览器 Console 查看错误
- 检查 `.env.local` 的 API Key
- Firebase Console 验证数据库规则

**反馈：**
- 开 Issue：https://github.com/artebeth1/Echoes-digital-remembrance/issues
- 或直接联系

---

## 📄 License

MIT License — 自由使用、修改、分发

---

## 👩‍💻 Made by

**Artebeth Yan**  
Northwestern University (Math + CS)  
Contact: [你的邮箱/社交媒体]

---

<div align="center">

**"有人想和你聊天。"**  
*Echoes brings them closer.*

[Live Demo](#) • [GitHub](https://github.com/artebeth1/Echoes-digital-remembrance) • [Portfolio](#)

</div>
