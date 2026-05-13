import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../web/src/App.css';
import VoiceInput from '../web/src/components/VoiceInput';
import Dashboard from '../web/src/components/Dashboard';
import CommandHistory from '../web/src/components/CommandHistory';

const API_BASE_URL = 'http://localhost:8000';

interface Command {
  id: string;
  text: string;
  intent: string;
  result: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
}

export default function App() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const [apiStatus, setApiStatus] = useState('disconnected');

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/health`);
        setApiStatus('connected');
      } catch (error) {
        setApiStatus('disconnected');
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 5000);

    // إضافة مستمع لاختصار لوحة المفاتيح الإلكترون
    if ((window as any).electron) {
      (window as any).electron.ipcRenderer.on('start-voice-input', () => {
        console.log('Voice input started from main process');
      });
    }

    return () => clearInterval(interval);
  }, []);

  const handleVoiceInput = async (text: string) => {
    setCurrentCommand(text);
    setIsListening(true);

    const commandId = Date.now().toString();
    const newCommand: Command = {
      id: commandId,
      text,
      intent: 'processing',
      result: 'جاري المعالجة...',
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    setCommands(prev => [newCommand, ...prev]);

    try {
      const response = await axios.post(`${API_BASE_URL}/process-command`, {
        text,
        language: 'ar',
      });

      const updatedCommand: Command = {
        id: commandId,
        text,
        intent: response.data.intent,
        result: response.data.result || 'تم تنفيذ الأمر بنجاح',
        timestamp: response.data.timestamp,
        status: 'success',
      };

      setCommands(prev =>
        prev.map(cmd => cmd.id === commandId ? updatedCommand : cmd)
      );

      // إرسال إشعار للعملية الرئيسية
      if ((window as any).electron) {
        (window as any).electron.ipcRenderer.send('voice-command', {
          text,
          intent: response.data.intent,
          result: response.data.result,
        });
      }
    } catch (error: any) {
      const errorCommand: Command = {
        id: commandId,
        text,
        intent: 'error',
        result: error.response?.data?.detail || 'حدث خطأ في معالجة الأمر',
        timestamp: new Date().toISOString(),
        status: 'error',
      };

      setCommands(prev =>
        prev.map(cmd => cmd.id === commandId ? errorCommand : cmd)
      );
    } finally {
      setIsListening(false);
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>🤖 نظام جارفيس الذكي - تطبيق سطح المكتب</h1>
        <div className={`api-status ${apiStatus}`}>
          <span className="status-dot"></span>
          {apiStatus === 'connected' ? 'متصل' : 'غير متصل'}
        </div>
      </div>

      <div className="app-container">
        <div className="main-content">
          <VoiceInput
            onVoiceInput={handleVoiceInput}
            isListening={isListening}
            currentCommand={currentCommand}
          />

          <Dashboard commands={commands} apiStatus={apiStatus} />
        </div>

        <div className="sidebar">
          <CommandHistory commands={commands} />
        </div>
      </div>

      <div className="app-footer">
        <p>JARVIS AI Assistant v1.0 Desktop | Alt+J للتفعيل | Ctrl+Shift+V للميكروفون</p>
      </div>
    </div>
  );
}
