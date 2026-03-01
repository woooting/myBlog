<div align="center">

# 🚀 MyBlog - 基于 Nuxt 4 的个人博客系统

**现代化全栈博客解决方案，融合 SQLite 数据库与 Markdown 静态内容的双层内容管理架构**

[![Nuxt](https://img.shields.io/badge/Nuxt-4.3.0-00DC82?logo=nuxt.js)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite)](https://github.com/WiseLibs/better-sqlite3)

</div>

---

## ✨ 核心功能

### 📝 内容管理
- **富文本编辑器** - 基于 TipTap，支持 Markdown 语法实时预览
- **文章管理** - 创建、编辑、删除、发布/撤回，支持草稿自动保存
- **标签系统** - 灵活的标签分类，支持批量管理
- **消息管理** - 用户留言板，支持登录用户和访客留言

### 🔍 搜索与发现
- **全文搜索** - 文章标题和标签的智能匹配
- **标签云** - 热门标签展示，快速发现相关内容

### 👤 用户系统
- **OAuth 认证** - 支持 GitHub 和 Google 第三方登录
- **用户头像** - 自动获取并展示用户头像

### 🎨 用户体验
- **主题切换** - 深色/浅色主题一键切换
- **响应式设计** - 完美适配移动端与桌面端
- **图片上传** - 支持图片拖拽上传和 Base64 内联

---

## 🏗️ 架构设计

### Vibecoding 驱动开发

本项目采用 **Vibecoding** 理念设计，通过分层文档架构指导 AI 辅助开发：

```
┌─────────────────────────────────────────────────────────┐
│                    CLAUDE.md (根目录)                    │
│                   项目级 AI 开发指南                      │
├─────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   app/CLAUDE.md  │  │ server/CLAUDE.md │  │  资源规范文档     │  │
│  │   前端开发指南    │  │   后端开发指南    │  │  (技术日志规范)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │           │
│  ┌────────▼────────┐  ┌───────▼──────────┐  ┌───────▼──────────┐  │
│  │ api/CLAUDE.md    │  │ services/CLAUDE.md│  │ resource/        │  │
│  │ (API 封装规范)   │  │ (Service 层文档)  │  │ ├─ logs/         │  │
│  └─────────────────┘  └──────────────────┘  │ │  (技术日志)     │  │
│                                                │ ├─ notes/        │  │
│                                                │ │  (学习笔记)     │  │
│                                                │ └─ patterns/     │  │
│                                                │    (设计模式)     │  │
│                                                └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### AI 开发准则

**自动导入机制**
```typescript
// ❌ 禁止 - 在 app/ 目录下不要从 vue 导入
import { ref, computed } from 'vue'

// ✅ 正确 - Nuxt 4 自动导入所有 Vue API
const count = ref(0)
const doubled = computed(() => count.value * 2)
```

**Controller + Service 分层**
```typescript
// Controller 层 (server/api/) - 参数验证 + 调用 Service
export default defineEventHandler(async (event) => {
  const query = validateQuery(event, someSchema)
  const { someService } = await import('@server/services/some.service')
  const result = someService.someMethod(query)
  return successResponse(result)
})

// Service 层 (server/services/) - SQL 查询 + 业务逻辑
export const someService = {
  someMethod(options) {
    const stmt = db.prepare('SELECT * FROM table WHERE condition = ?')
    return stmt.all(param)
  }
}
```

**API 命名空间导入**
```typescript
// ✅ 推荐 - 命名空间导入
import * as postsApi from '@app/api/posts.api'
const posts = await postsApi.getList({ page: 1 })

// ❌ 不推荐 - 解构导入（失去命名空间）
import { getList } from '@app/api/posts.api'
```

### 分层目录结构

```
myBlog/
├── app/                          # 前端 (Nuxt app)
│   ├── api/                      # API 请求封装（命名空间导出）
│   │   ├── posts.api.ts
│   │   ├── tags.api.ts
│   │   └── messages.api.ts
│   ├── components/               # Vue 组件
│   │   ├── global/               # 全局组件（自动导入）
│   │   └── ...
│   ├── composables/              # 组合式函数（自动导入）
│   ├── layouts/                  # 布局组件
│   ├── pages/                    # 文件路由
│   └── CLAUDE.md                 # 前端开发指南
│
├── server/                       # 后端 (Nitro)
│   ├── api/                      # Controller 层
│   │   ├── posts/
│   │   ├── tags/
│   │   └── messages/
│   ├── schemas/                  # Zod 验证 Schema
│   │   ├── post.schema.ts
│   │   ├── tag.schema.ts
│   │   ├── message.schema.ts
│   │   └── CLAUDE.md             # Schema 文档
│   ├── services/                 # Service 层（SQL + 业务逻辑）
│   │   ├── posts.service.ts
│   │   ├── tags.service.ts
│   │   ├── messages.service.ts
│   │   └── CLAUDE.md             # Service 文档
│   └── CLAUDE.md                 # 后端开发指南
│
├── resource/                     # 技术资源（Vibecoding 核心）
│   ├── logs/                     # 开发日志
│   ├── notes/                    # 学习笔记
│   ├── patterns/                 # 设计模式提炼
│   └── 技术日志记录规范.md        # 日志编写规范
│
├── CLAUDE.md                     # 项目级 AI 开发指南
├── README.md                     # 项目说明（本文件）
└── nuxt.config.ts                # Nuxt 配置
```

---

## 📦 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **框架** | Nuxt | 4.3.0 | 全栈框架 |
| **前端** | Vue | 3.5 | UI 框架 |
| **语言** | TypeScript | 5.9 | 类型安全 |
| **后端** | Nitro | - | 服务端框架 |
| **数据库** | better-sqlite3 | - | 嵌入式数据库 |
| **验证** | Zod | - | Schema 验证 |
| **样式** | Sass | - | CSS 预处理 |
| **UI 库** | Element Plus | - | 组件库 |
| **图标** | @nuxt/icon | - | 图标系统 |
| **编辑器** | TipTap | - | 富文本编辑 |
| **通知** | vue-toastification | - | Toast 提示 |
| **轮播** | Swiper | - | 轮播组件 |
| **包管理** | pnpm | 8+ | 依赖管理 |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-username/myblog.git
cd myblog

# 安装依赖
pnpm install
```

### 开发模式

```bash
# 启动开发服务器
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 生产构建

```bash
# 构建
pnpm build

# 预览
pnpm preview
```

---

## 🔌 API 接口

### 文章管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/posts` | 获取文章列表 |
| POST | `/api/posts` | 创建文章 |
| GET | `/api/posts/:id` | 获取单篇文章 |
| PUT | `/api/posts/:id` | 更新文章 |
| DELETE | `/api/posts/:id` | 删除文章 |
| POST | `/api/posts/:id/publish` | 发布/撤回文章 |
| POST | `/api/posts/batch-delete` | 批量删除 |
| GET | `/api/posts/paginated` | 分页查询 |

### 标签管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/tags` | 获取标签列表 |
| POST | `/api/tags` | 创建标签 |
| GET | `/api/tags/:id` | 获取单标签 |
| PUT | `/api/tags/:id` | 更新标签 |
| DELETE | `/api/tags/:id` | 删除标签 |
| GET | `/api/tags/search` | 搜索标签 |
| GET | `/api/tags/popular` | 热门标签 |

### 消息管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/messages` | 获取留言列表 |
| POST | `/api/messages` | 创建留言 |
| DELETE | `/api/messages/:id` | 删除留言 |

---

## 🛠️ 开发命令

```bash
# 开发
pnpm dev              # 启动开发服务器

# 构建
pnpm build            # 生产构建
pnpm preview          # 本地预览

# 代码质量
pnpm lint             # ESLint 检查
pnpm lint:fix         # ESLint 自动修复
pnpm format           # Prettier 格式化
```

---

## 📚 文档导航

| 文档 | 路径 | 说明 |
|------|------|------|
| **项目指南** | `CLAUDE.md` | AI 开发准则、架构规范 |
| **前端指南** | `app/CLAUDE.md` | 组件列表、Composables、页面路由 |
| **后端指南** | `server/CLAUDE.md` | API 路由、数据库表结构 |
| **Schema 文档** | `server/schemas/CLAUDE.md` | Zod 验证 Schema 说明 |
| **Service 文档** | `server/services/CLAUDE.md` | Service 层依赖关系 |
| **API 文档** | `app/api/CLAUDE.md` | 前端 API 封装说明 |
| **日志规范** | `resource/技术日志记录规范.md` | 技术日志编写规范 |

---

## 🎓 学习资源

本项目采用 **Vibecoding** 理念进行开发，相关技术沉淀位于 `resource/` 目录：

- **`logs/`** - 开发过程中的问题解决记录
- **`notes/`** - 技术学习笔记和设计模式提炼
- **`patterns/`** - 可复用的代码模式库

推荐阅读：
1. `resource/logs/2025-02-11-indexdb-migration.md` - IndexedDB 迁移实践
2. `resource/技术日志记录规范.md` - 如何编写技术日志

---

## 📄 许可证

MIT License

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️**

Made with ❤️ by [Your Name](https://github.com/your-username)

</div>
