import React, { useState, useRef } from 'react';

interface VoiceInputProps {
  onVoiceInput: (text: string) => void;
  isListening: boolean;
  currentCommand: string;
}

export default function VoiceInput({
  onVoiceInput,
  isListening,
  currentCommand,
}: VoiceInputProps) {
  const [manualInput, setManualInput] = useState('');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const recognitionRef = useRef<any>(null);

  const startVoiceRecognition = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      alert('متصفحك لا يدعم التعرف على الكلام');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log('جاري الاستماع...');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');

      if (transcript.trim()) {
        onVoiceInput(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('خطأ في التعرف على الكلام:', event.error);
      alert(`خطأ: ${event.error}`);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onVoiceInput(manualInput);
      setManualInput('');
    }
  };

  return (
    <div className="voice-input">
      <div className="input-mode-tabs">
        <button
          className={`tab ${inputMode === 'voice' ? 'active' : ''}`}
          onClick={() => setInputMode('voice')}
        >
          🎤 صوتي
        </button>
        <button
          className={`tab ${inputMode === 'text' ? 'active' : ''}`}
          onClick={() => setInputMode('text')}
        >
          ⌨️ نصي
        </button>
      </div>

      {inputMode === 'voice' ? (
        <div className="voice-section">
          <button
            className={`voice-button ${isListening ? 'listening' : ''}`}
            onClick={startVoiceRecognition}
            disabled={isListening}
          >
            <span className={isListening ? 'pulse' : ''}>🎤</span>
            {isListening ? 'جاري الاستماع...' : 'اضغط للتحدث'}
          </button>

          {currentCommand && (
            <div className="voice-result">
              <p className="label">الأمر الأخير:</p>
              <p className="text">{currentCommand}</p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleTextSubmit} className="text-section">
          <input
            type="text"
            placeholder="اكتب الأمر هنا..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            disabled={isListening}
          />
          <button type="submit" disabled={isListening || !manualInput.trim()}>
            إرسال
          </button>
        </form>
      )}

      <div className="command-examples">
        <p className="title">📌 أمثلة على الأوامر:</p>
        <ul>
          <li>افتح ملف جديد على سطح المكتب</li>
          <li>أرسل ايميل إلى أحمد</li>
          <li>شغل البرنامج Chrome</li>
          <li>ما الوقت الآن</li>
          <li>التقط صورة من الشاشة</li>
        </ul>
      </div>
    </div>
  );
}
