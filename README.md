# 企业智能服务平台

企业内部智能服务平台原型，提供 AI 助手、知识库、请假审批、企业邮箱、文件中心、日历与待办、模型 API 配置、权限管理和全链路审计能力。

## 功能

- AI 助手：对话、会话 ID、工具执行记录和审计追踪
- 知识库：文档管理、入库任务和知识问答入口
- 请假审批：员工申请、直属上级审批、申请记录和 DOCX 生成
- 企业邮箱：AgentMail 收件、发信、附件上传、正文查看和附件下载
- 文件中心：PDF、Word、Excel、PPT、Markdown、TXT、CSV 和 JSON 文件管理
- 日历与待办：月视图、请假日程、个人待办、截止日期、优先级和完成状态
- 模型配置：管理员配置通用模型 API、URL、模型名称和 API 格式
- 组织与权限：组织架构、角色、管理范围和审计记录

## 环境要求

- Node.js 18+
- Python 3.10+
- AgentMail CLI（使用邮箱功能时需要）

## 安装

```powershell
npm install
python -m pip install -r backend/requirements.txt
```

## 本地启动

运行后端前，设置本地数据目录。真实数据库、密钥、邮件、附件和生成文件不在本仓库中。

```powershell
$env:PLATFORM_DATA_DIR='D:\桌面\企业智能服务平台-local-data'
$env:PLATFORM_DB_PATH='D:\桌面\企业智能服务平台-local-data\platform.db'
$env:PLATFORM_SECRET_KEY_PATH='D:\桌面\企业智能服务平台-local-data\.platform-secret'
$env:PLATFORM_TEST_PASSWORD='12345678'

python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

另开一个终端启动前端：

```powershell
npm run dev
```

访问：`http://localhost:5173`

## 测试账号

管理员：

```text
账号：admin
密码：12345678
```

其他测试账号的默认密码也是 `12345678`，账号信息见 `test-fixtures/organization/users.json`。

## 模型配置

使用管理员登录后，打开“模型配置”，填写 Provider、模型名称、API URL 和 API Key。API URL 保存在本地 SQLite 配置表中，API Key 使用 Fernet 加密保存，不会通过配置接口返回明文。

## AgentMail

企业邮箱使用 AgentMail CLI。完成 AgentMail OAuth 授权后，可以在企业邮箱页面收发邮件，也可以在 AI 助手中使用自然语言：

```text
查看最近邮件
查看未读邮箱
看看第一条内容
请给 someone@example.com 发邮件，主题：会议通知，正文：请查收。
```

AI 发信会先展示收件人、主题和正文，回复“确认发送”后才会真正发送。

## 数据安全

以下内容只应保存在本地或安全的部署环境，不要提交到 GitHub：

- `backend/data/`
- SQLite 数据库和 `.platform-secret`
- API Key、AgentMail 凭据和登录令牌
- 真实邮件、附件、上传文件和生成文件
- 日志、依赖目录和构建产物

本地数据目录配置详见 [LOCAL_DATA.md](LOCAL_DATA.md)。

## 构建

```powershell
npm run build
```
## 开源项目致谢

本项目使用并参考了以下开源项目：

- [AgentMail CLI](https://www.npmjs.com/package/@tencent-qqmail/agently-cli)：提供 AgentMail OAuth 授权、邮件收取、读取、发送和附件下载能力。
- [OfficeCLI](https://github.com/iOfficeAI/OfficeCLI)：用于 AI Agent 场景下的 Word、Excel、PowerPoint 等 Office 文档处理与自动化。

本项目的企业邮箱功能通过 AgentMail CLI 接入；后端 Office 文件生成和解析同时使用 `python-docx`、`openpyxl` 和 `python-pptx` 等 Python 库。具体开源项目请遵循各自仓库和软件包中的许可证要求。