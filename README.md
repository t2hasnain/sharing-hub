# Zephy Chat Application

Zephy is a modern, real-time messaging platform that allows users to chat and share high-quality images across different devices. The application features responsive design, dark/light mode toggle, and device type detection.

## Features

- Real-time chat with WebSocket communication
- High-quality image sharing
- Device type detection (PC, mobile, tablet)
- Local storage for message history
- Responsive design for all devices
- Dark/light mode toggle
- User-friendly UI with animations

## Tech Stack

- Backend: Python with Flask and Flask-SocketIO
- Frontend: HTML5, CSS3, JavaScript
- Communication: WebSockets for real-time messaging
- Storage: Local storage for messages and settings

## Installation

1. Clone the repository
```
git clone <repository-url>
cd zephy-chat
```

2. Install dependencies
```
pip install -r requirements.txt
```

3. Run the application
```
python app.py
```

4. Access the application
Open your browser and navigate to `http://localhost:5000`

## Project Structure

```
zephy-chat/
├── app/
│   ├── static/
│   │   ├── css/
│   │   │   ├── style.css
│   │   │   └── chat.css
│   │   ├── js/
│   │   │   ├── main.js
│   │   │   └── theme.js
│   │   ├── images/
│   │   └── uploads/
│   └── templates/
│       ├── base.html
│       ├── index.html
│       ├── chat.html
│       ├── about.html
│       └── privacy.html
├── app.py
├── requirements.txt
└── README.md
```

## Usage

1. Enter your username on the homepage
2. Start sending messages and images in the chat room
3. View online users and their device types
4. Toggle between dark and light themes using the switch in the navbar 