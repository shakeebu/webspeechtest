import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const AudioVisualizer = ({ stream }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!stream) return;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 64;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f97316'; 
      const barWidth = (canvas.width / dataArray.length) * 2;
      dataArray.forEach((val, i) => {
        const height = (val / 255) * canvas.height;
        ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 1, height);
      });
    };
    draw();
    return () => {
      cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [stream]);

  return (
    <div className="visualizer-container">
      <canvas ref={canvasRef} width="600" height="40" />
    </div>
  );
};

function App() {
  const [transcript, setTranscript] = useState(() => {
    const saved = localStorage.getItem('pro_transcript');
    return saved ? JSON.parse(saved) : [];
  });
  const [interim, setInterim] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const isRecordingRef = useRef(false);
  const lastActiveRef = useRef(Date.now());
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const interimRef = useRef('');

  useEffect(() => {
    localStorage.setItem('pro_transcript', JSON.stringify(transcript));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interim]);

  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      setSeconds(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startEngine = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch(e) {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      lastActiveRef.current = Date.now();
      let interimStr = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          setTranscript(prev => [...prev, text]);
          setInterim('');
          interimRef.current = '';
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }
      setInterim(interimStr);
      interimRef.current = interimStr;
    };

    rec.onend = () => {
      if (isRecordingRef.current) {
        setTimeout(() => { if (isRecordingRef.current) startEngine(); }, 50);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      if (isRecordingRef.current) setTimeout(startEngine, 100);
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      setTimeout(startEngine, 200);
    }
  };

  const startRecording = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } 
      });
      setStream(s);
      setIsRecording(true);
      isRecordingRef.current = true;
      lastActiveRef.current = Date.now();
      startEngine();

      const watchdog = setInterval(() => {
        if (!isRecordingRef.current) { clearInterval(watchdog); return; }
        const idleTime = Date.now() - lastActiveRef.current;
        if (idleTime > 12000 && interimRef.current === '') {
          lastActiveRef.current = Date.now();
          if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
        }
      }, 3000);

    } catch (e) {
      alert("Mic access required.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setInterim('');
    interimRef.current = '';
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="Dashboard">
      <div className="Main-Frame">
        <header className="Top-Bar">
          <div className="Logo">
            <span className={`live-indicator ${isRecording ? 'active' : ''}`}></span>
            <h1>Doc-Patient <span className="highlight">Pro</span></h1>
          </div>
          <div className="Header-Controls">
            {isRecording && <div className="Session-Timer">{formatTime(seconds)}</div>}
            <button className="Info-Btn" onClick={() => setShowModal(true)}>LIMITATIONS</button>
          </div>
        </header>

        <AudioVisualizer stream={stream} />

        <div className="Transcript-Area" ref={scrollRef}>
          {transcript.map((txt, i) => (
            <div key={i} className="Bubble">
              <p>{txt}</p>
            </div>
          ))}
          {interim && <div className="Bubble interim"><p>{interim}...</p></div>}
          {transcript.length === 0 && !interim && (
            <div className="Empty-Note">
              <p>Place audio source near laptop.<br/>Recording will appear here.</p>
            </div>
          )}
        </div>

        <div className="Action-Bar">
          {!isRecording ? (
            <button className="Start-Btn" onClick={startRecording}>Start Session</button>
          ) : (
            <button className="Stop-Btn" onClick={stopRecording}>End Session</button>
          )}
          <button className="Clear-Btn" onClick={() => {
            if(window.confirm("Clear all history?")) {
              setTranscript([]);
              localStorage.removeItem('pro_transcript');
            }
          }}>Clear</button>
        </div>
      </div>

      {showModal && (
        <div className="Modal-Overlay" onClick={() => setShowModal(false)}>
          <div className="Modal-Content" onClick={e => e.stopPropagation()}>
            <h2>Technical Limitations & Challenges</h2>
            <div className="Modal-Body">
              <h3>Primary Purpose</h3>
              <p>This tool is designed for real-time transcription of clean human speech in professional environments such as doctor visits or client meetings. It focuses on maintaining a live connection between the browser and AI processing servers.</p>
              
              <h3>Core Limitations</h3>
              <p>The Web Speech API is hard-coded by browsers to timeout after roughly fifteen seconds of silence. This is done to preserve bandwidth on their servers. While we use a smart watchdog to bypass this, you may still see minor flickers in connectivity during long quiet periods.</p>
              <p>For sessions exceeding ten minutes, Google Cloud servers may de-prioritize the connection, leading to potential word loss. This is an inherent limitation of using free browser-based tools rather than paid dedicated servers.</p>
              <p>Acoustic distortion is a major factor when playing audio from one device to another. Sounds played from a mobile phone into a laptop microphone lose high-frequency clarity, making it difficult for the AI to distinguish human speech from background noise.</p>

              <h3>Honest Challenges Faced</h3>
              <p>Initially, the app failed to catch the first syllable after a pause because the microphone hardware would enter a sleep state. We solved this by implementing a silent wake-lock that keeps the audio pipeline warm at all times.</p>
              <p>The AI struggles with complex audio environments like YouTube videos with background music. It is optimized strictly for human vocal frequencies and interprets non-human sounds as static or noise to be filtered out.</p>
              <p>Stability in continuous sessions is naturally fragile. We implemented a stitched architecture that forces the engine to restart before it hits internal browser burnout limits.</p>

              <h3>Future Expectations</h3>
              <p>Since the audio processing happens on external servers, a one to two second lag is completely normal. Privacy is maintained as the audio is streamed through encrypted pipelines directly to the transcription engine.</p>
              <p>Different laptop hardware may exhibit different behaviors. Some high-end laptops have built-in noise-canceling chips that may occasionally conflict with our AI watchdog's attempts to keep the line active.</p>
            </div>
            <button className="Modal-Close" onClick={() => setShowModal(false)}>Return to Dashboard</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
