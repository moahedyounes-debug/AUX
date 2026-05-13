import React from 'react';

interface Command {
  id: string;
  text: string;
  intent: string;
  result: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
}

interface CommandHistoryProps {
  commands: Command[];
}

export default function CommandHistory({ commands }: CommandHistoryProps) {
  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'pending':
        return '⏳';
      default:
        return '•';
    }
  };

  return (
    <div className="command-history">
      <h3>📜 السجل</h3>

      {commands.length === 0 ? (
        <div className="empty-state">
          <p>لا توجد أوامر حتى الآن</p>
          <p className="hint">ابدأ بإعطاء أمر صوتي</p>
        </div>
      ) : (
        <ul className="history-list">
          {commands.slice(0, 10).map(command => (
            <li key={command.id} className={`history-item ${command.status}`}>
              <div className="item-header">
                <span className={`status-icon ${command.status}`}>
                  {getStatusIcon(command.status)}
                </span>
                <span className="time">
                  {new Date(command.timestamp).toLocaleTimeString('ar-SA', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="item-body">
                <p className="command-text">{command.text}</p>
                <p className="intent-tag">{command.intent}</p>
              </div>

              {command.result && (
                <div className="item-result">
                  <p>{command.result.substring(0, 100)}...</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {commands.length > 10 && (
        <div className="show-more">
          عرض المزيد ({commands.length - 10} أمر إضافي)
        </div>
      )}
    </div>
  );
}
