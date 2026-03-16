# Web-Based Voice Transcription (ERN Stack)

This project allows you to record voice through your microphone and see it transcribed in real-time in the browser.

## Tech Stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Transcription API:** Browser's Native Web Speech API (`webkitSpeechRecognition`)

## How to Run

### 1. Start the Backend
```bash
cd server
node index.js
```

### 2. Start the Frontend
```bash
cd client
npm install
npm run dev
```

### 3. Usage
- Open the URL provided by Vite (usually `http://localhost:5173`).
- Click **Start Recording**.
- Allow microphone access in your browser.
- Speak into your microphone and watch the text appear.
- Click **Stop Recording** to finish.

## Notes
- **Browser Compatibility:** This project works best in **Google Chrome** or **Microsoft Edge** as they provide robust support for the Web Speech API.
- **Microphone Permissions:** You must grant microphone permissions to the application.
- **No Database:** As per requirements, this project does not use a database.
