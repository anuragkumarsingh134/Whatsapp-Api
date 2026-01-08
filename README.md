# WhatsApp Multi-Device API Gateway

A robust, self-hosted WhatsApp API provider with a built-in aesthetic management dashboard. Manage multiple accounts, view QR codes in real-time, and access dynamic API documentation.

## Features
- 📱 **Multi-Device Support**: Connect multiple WhatsApp accounts simultaneously.
- 🎨 **Aesthetic Control Panel**: Built with Tailwind CSS for modern session management.
- 🔒 **API Key Security**: Secure your endpoints from unauthorized access.
- 📄 **Dynamic Documentation**: Get copy-paste URLs for each device directly in the UI.
- 🔄 **Auto-Reconnect**: Automatically recovers connections on server reboot.
- 📂 **File Persistence**: Sessions are stored securely in local folders.

## Setup Instructions

### 1. Installation
```bash
git clone [https://github.com/your-username/wa-api-gateway.git](https://github.com/your-username/wa-api-gateway.git)
cd wa-api-gateway
npm install


2. Configuration
Open server.ts and update the following:

API_KEY: Set your secret security token.

SERVER_IP: Set your server's IP address.

# Using PM2 (Recommended)
pm2 start "npx tsx server.ts" --name "wa-api"

API Usage
Endpoints follow this structure: GET /send-text?session=MY_DEVICE&number=91XXXXXXXXXX&msg=Hello&key=12345678


pm2 save

pm2 startup

pm2 save

Goal,Command
Check if app is running,pm2 list
View real-time logs,pm2 logs wa-api
Restart after code changes,pm2 restart wa-api
Stop the application,pm2 stop wa-api
See detailed stats (CPU/RAM),pm2 monit
