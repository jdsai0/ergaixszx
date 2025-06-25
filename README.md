我个人实测: gemini 2.0 flash模型是最好的, 其他模型比如2.5 flash或者deepseekv3会导致返回格式错误
如今存在的bug:
1. 由于模型能力, 导致小说生成质量低
2. 由于模型能力, 导致返回格式错误, 此时需要进行重复选择直到功能有效

# 共笔天下 - AI 交互式小说生成器

一个基于 AI 的交互式小说生成器，允许用户选择不同的风格，然后通过选择剧情分支来决定故事的走向。
![image](https://github.com/user-attachments/assets/b05b0078-a4a2-4a24-acea-9fa4dcbb4fac)
![image](https://github.com/user-attachments/assets/6d1badf7-3559-447b-a969-1097fe3ab47e)
![image](https://github.com/user-attachments/assets/f744a09e-a7ae-4b81-8ee3-f53e1fef7e50)

## 项目特点

- 多种小说风格：武侠江湖、科幻探索、奇幻魔法、悬疑推理等
- 丰富的交互选择：用户可以在故事中作出选择，影响故事发展方向
- 流畅的用户体验：美观的界面，无缝的故事过渡
- 历史记录：在当前会话中保存用户的阅读历史，可以随时回顾或继续

## 新增功能

### 1. 基于关键词的 AI 响应解析

- 修改了 AI 交互逻辑，不再依赖严格的 JSON 格式
- 使用关键词（`novelstory:`, `options:`, `structure_thinking:`, `preference_thinking:`）和特定分隔符(`.`)从 AI 响应中提取内容
- 实现了健壮的解析逻辑，可以处理各种可能的 AI 输出格式

### 2. 小说结构思考

- 用户选择风格后，系统会生成一个初始的小说结构大纲
- 当用户选择次数达到阈值（默认为 5 次）后，AI 会分析当前剧情并对后续结构进行调整
- 结构大纲在当前会话中保留，并在每次故事继续时提供给 AI 参考

### 3. 用户偏好分析

- 系统会记录用户在当前会话中的所有选择，并在达到阈值后分析用户的偏好
- AI 可以根据分析结果调整后续剧情和选项，使故事更符合用户喜好
- 偏好分析结果目前会记录在控制台中（仅用于调试）

## 技术栈

- 前端：React, TailwindCSS, Zustand
- AI：可配置的 AI 服务 (只支持OpenAI格式)

## 安装与运行

1.  **克隆项目**
    ```bash
    git clone https://github.com/TangQi001/novel_by_you.git
    cd novel_by_you
    ```

2.  **安装依赖**
    推荐使用 `pnpm`：
    ```bash
    pnpm install
    ```
    或者使用 `npm` 或 `yarn`：
    ```bash
    npm install
    # 或
    yarn install
    ```

3.  **配置环境变量**
    *   复制环境变量模板文件：
        ```bash
        cp .env.example .env.local
        ```
    *   编辑 `.env.local` 文件，填入**所有必需的** AI 服务配置信息。请参考文件内的注释说明：
        *   `VITE_AI_API_KEY`: 你的 AI 服务 API 密钥。
        *   `VITE_AI_CREATIVE_MODEL_NAME` / `VITE_AI_CREATIVE_MODEL_ENDPOINT`: "Creative" 模式使用的模型名称及完整接口地址。
        *   `VITE_AI_PRECISE_MODEL_NAME` / `VITE_AI_PRECISE_MODEL_ENDPOINT`: "Precise" 模式使用的模型名称及完整接口地址。
        *   `VITE_AI_BALANCED_MODEL_NAME` / `VITE_AI_BALANCED_MODEL_ENDPOINT`: "Balanced" 模式使用的模型名称及完整接口地址。
        *   `VITE_STRUCTURE_THINKING_THRESHOLD` (可选): 控制触发结构思考的阈值，默认为 5。

    `*_ENDPOINT` 字段必须包含完整的 `chat/completions` 路径（例如 `https://api.openai.com/v1/chat/completions`）。

如需增加更多风格，可在 `src/data/novelStyles.ts` 中新增定义。

4.  **运行开发服务器**
    ```bash
    pnpm dev
    # 或
    npm run dev
    # 或
    yarn dev
    ```
    应用将在本地启动，通常是 `http://localhost:5173`。

## 功能特点

- 🎭 多种小说风格：武侠、科幻、奇幻、悬疑等多种风格可选
- 🔄 交互式剧情：每个选择都会影响故事的发展方向
- 💾 会话历史记录：自动保存在当前浏览器会话中的阅读历史
- 🌓 深色/浅色主题：支持主题切换，提供舒适的阅读体验
- 📱 响应式设计：完美支持各种设备尺寸

## 技术栈 (详细)

- **前端框架**: React 18
- **构建工具**: Vite
- **样式方案**: Tailwind CSS
- **状态管理**: Zustand
- **UI 组件**: Radix UI (可能用于底层组件)
- **图标**: Lucide React
- **类型检查**: TypeScript

## 项目结构

```
src/
├── components/      # React 组件
├── data/           # 静态数据 (如小说风格定义)
├── lib/            # 工具库 (已移除 Supabase 客户端)
├── services/       # 服务层 (如 AI 交互逻辑)
├── store/          # 状态管理 (Zustand stores)
├── types/          # TypeScript 类型定义
└── App.tsx         # 应用入口组件
└── main.tsx        # 应用渲染入口
└── index.css       # 全局 CSS
```

## 部署

项目可以使用 Vercel, Netlify 或其他支持 Vite 应用的平台进行部署。

**构建命令**: `npm run build` (或 `pnpm build`, `yarn build`)
**输出目录**: `dist`

确保在部署平台正确配置了所有必需的环境变量 (主要是 AI 服务相关的变量)。

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 许可证

[Apache License 2.0](LICENSE)
