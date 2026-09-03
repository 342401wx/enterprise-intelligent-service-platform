# Local data

The repository does not contain runtime data. The local test database, Fernet secret, email attachments, uploaded files, and generated files are stored outside the repository.

For local testing, set:

```powershell
$env:PLATFORM_DATA_DIR='D:\桌面\企业智能服务平台-local-data'
$env:PLATFORM_DB_PATH='D:\桌面\企业智能服务平台-local-data\platform.db'
$env:PLATFORM_SECRET_KEY_PATH='D:\桌面\企业智能服务平台-local-data\.platform-secret'
$env:PLATFORM_TEST_PASSWORD='12345678'
```

Then start the backend from the repository root:

```powershell
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

Never commit `.platform-secret`, API keys, AgentMail credentials, database files, real emails, or generated files.