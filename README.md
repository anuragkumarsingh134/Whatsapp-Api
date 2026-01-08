# WhatsApp Multi-Device API Gateway

A robust, self-hosted WhatsApp API provider with a built-in aesthetic management dashboard. Manage multiple accounts, view QR codes in real-time, and access dynamic API documentation.

## Features
- 📱 **Multi-Device Support**: Connect multiple WhatsApp accounts simultaneously.
- 🎨 **Modern Web Dashboard**: Beautiful, responsive UI built with Tailwind CSS.
- 🔒 **API Key Security**: Secure your endpoints from unauthorized access.
- 📄 **Dynamic Documentation**: Get copy-paste URLs for each device directly in the UI.
- 🔄 **Auto-Reconnect**: Automatically recovers connections on server reboot.
- 📂 **File Persistence**: Sessions are stored securely in local folders.
- 🚀 **Organized Structure**: Clean separation of frontend and backend code.

## Project Structure

```
Whatsapp-Api/
├── server.ts          # Backend server with API endpoints
├── public/            # Frontend files
│   ├── index.html     # Main dashboard page
│   ├── app.js         # Frontend JavaScript logic
│   └── styles.css     # Custom styles
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── README.md          # This file
```

## Setup Instructions

### 1. Installation

```bash
# Clone the repository (if applicable)
cd Whatsapp-Api

# Install dependencies
npm install
```

### 2. Configuration

Open `server.ts` and update the following:

- **API_KEY**: Set your secret security token (default: "12345678")
- **SERVER_IP**: Set your server's IP address (default: "192.168.2.112")
- **port**: Set the port number (default: 3000)

```typescript
let API_KEY = "12345678"; // Change this for production
const SERVER_IP = "192.168.2.112"; // Your server IP
const port = 3000;
```

### 3. Running the Application

#### Development Mode (with auto-reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

#### Using PM2 (Recommended for Production)
```bash
# Start the application
pm2 start "npm start" --name "wa-api"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### 4. Access the Dashboard

Open your browser and navigate to:
```
http://YOUR_SERVER_IP:3000
```

## API Usage

All API endpoints require the `key` query parameter for authentication.

### Endpoints

#### 1. Send Text Message
```
GET /send-text?session=SESSION_ID&number=91XXXXXXXXXX&msg=Hello&key=YOUR_API_KEY
```

**Parameters:**
- `session`: Your session ID (e.g., "Sales", "Support")
- `number`: Recipient phone number (with country code, no +)
- `msg`: Message text
- `key`: Your API key

**Example:**
```
http://192.168.2.112:3000/send-text?session=Sales&number=911234567890&msg=Hello%20World&key=12345678
```

#### 2. Send PDF Document
```
GET /send-pdf?session=SESSION_ID&number=91XXXXXXXXXX&url=YOUR_PDF_URL&key=YOUR_API_KEY
```

**Parameters:**
- `session`: Your session ID
- `number`: Recipient phone number (with country code, no +)
- `url`: Public URL to the PDF file
- `key`: Your API key

**Example:**
```
http://192.168.2.112:3000/send-pdf?session=Sales&number=911234567890&url=https://example.com/document.pdf&key=12345678
```

#### 3. Get QR Code
```
GET /get-qr?session=SESSION_ID&key=YOUR_API_KEY
```

#### 4. Connect Session
```
GET /connect?session=SESSION_ID&key=YOUR_API_KEY
```

#### 5. Get All Sessions Status
```
GET /status-all?key=YOUR_API_KEY
```

#### 6. Logout Session
```
GET /logout?session=SESSION_ID&key=YOUR_API_KEY
```

## PM2 Management Commands

| Goal | Command |
|------|---------|
| Check if app is running | `pm2 list` |
| View real-time logs | `pm2 logs wa-api` |
| Restart after code changes | `pm2 restart wa-api` |
| Stop the application | `pm2 stop wa-api` |
| See detailed stats (CPU/RAM) | `pm2 monit` |
| Delete from PM2 | `pm2 delete wa-api` |

## How to Use

1. **Start the Server**: Run `npm start` or use PM2
2. **Access Dashboard**: Open `http://YOUR_SERVER_IP:3000` in your browser
3. **Create Session**: Enter a session name (e.g., "Sales") and click "Register Device"
4. **Scan QR Code**: Use WhatsApp on your phone to scan the QR code
5. **View API Docs**: Click on a connected session to see API endpoints
6. **Send Messages**: Use the API endpoints shown in the documentation

## Security Notes

- ⚠️ **Change the default API_KEY** before deploying to production
- ⚠️ **Use HTTPS** in production environments
- ⚠️ **Restrict access** to your server IP if possible
- ⚠️ **Keep sessions folder secure** - it contains authentication data

## Troubleshooting

### Session Not Connecting
- Make sure WhatsApp is updated on your phone
- Try deleting the session and creating a new one
- Check server logs for errors

### QR Code Not Appearing
- Wait a few seconds for initialization
- Refresh the page and try again
- Check browser console for errors

### Messages Not Sending
- Verify the session status is "connected"
- Check that the phone number format is correct (country code + number, no +)
- Ensure the recipient number is registered on WhatsApp

## License

MIT

## Support

For issues and questions, please check the server logs and browser console for error messages.
