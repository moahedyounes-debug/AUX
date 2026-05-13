import React from 'react';

interface Command {
  id: string;
  text: string;
  intent: string;
  result: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
}

interface DashboardProps {
  commands: Command[];
  apiStatus: string;
}

export default function Dashboard({ commands, apiStatus }: DashboardProps) {
  const lastCommand = commands[0];

  const getIntentEmoji = (intent: string): string => {
    const emojiMap: { [key: string]: string } = {
      file_create: '📄',
      file_read: '📖',
      file_delete: '🗑️',
      send_email: '📧',
      schedule_task: '⏰',
      open_app: '🚀',
      smart_home_control: '🏠',
      screenshot: '📸',
      system_info: '⚙️',
      error: '❌',
      processing: '⏳',
    };
    return emojiMap[intent] || '📋';
  };

  return (
    <div className="dashboard">
      <h2>📊 لوحة التحكم</h2>

      {lastCommand && (
        <div className={`last-command ${lastCommand.status}`}>
          <div className="command-header">
            <span className="emoji">{getIntentEmoji(lastCommand.intent)}</span>
            <span className="intent">{lastCommand.intent}</span>
            <span className={`badge ${lastCommand.status}`}>
              {lastCommand.status === 'success'
                ? '✓ نجح'
                : lastCommand.status === 'error'
                ? '✗ خطأ'
                : '⏳ جاري'}
            </span>
          </div>

          <div className="command-body">
            <p className="original-text">
              <strong>الأمر:</strong> {lastCommand.text}
            </p>
            <p className="result">
              <strong>النتيجة:</strong> {lastCommand.result}
            </p>
            <p className="timestamp">
              {new Date(lastCommand.timestamp).toLocaleTimeString('ar-SA')}
            </p>
          </div>
        </div>
      )}

      <div className="stats">
        <div className="stat-card">
          <span className="label">إجمالي الأوامر</span>
          <span className="value">{commands.length}</span>
        </div>

        <div className="stat-card">
          <span className="label">الأوامر الناجحة</span>
          <span className="value">
            {commands.filter(c => c.status === 'success').length}
          </span>
        </div>

        <div className="stat-card">
          <span className="label">الأخطاء</span>
          <span className="value">
            {commands.filter(c => c.status === 'error').length}
          </span>
        </div>

        <div className="stat-card">
          <span className="label">حالة الاتصال</span>
          <span className={`value ${apiStatus}`}>
            {apiStatus === 'connected' ? '🟢 متصل' : '🔴 غير متصل'}
          </span>
        </div>
      </div>

      <div className="features">
        <h3>✨ الميزات المتاحة</h3>
        <div className="feature-grid">
          <div className="feature-item">
            <span className="icon">📄</span>
            <span>إنشاء الملفات</span>
          </div>
          <div className="feature-item">
            <span className="icon">🚀</span>
            <span>فتح التطبيقات</span>
          </div>
          <div className="feature-item">
            <span className="icon">📸</span>
            <span>لقطات الشاشة</span>
          </div>
          <div className="feature-item">
            <span className="icon">⚙️</span>
            <span>معلومات النظام</span>
          </div>
          <div className="feature-item">
            <span className="icon">📧</span>
            <span>البريد (قريباً)</span>
          </div>
          <div className="feature-item">
            <span className="icon">⏰</span>
            <span>الجدولة (قريباً)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
