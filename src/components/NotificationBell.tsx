import { useNotifications } from '@/hooks/useNotifications';
import { Bell, X } from 'lucide-react';
import { formatDate } from '@/lib/constants';

export default function NotificationBell() {
  const { notifications, unreadCount, showPanel, setShowPanel, popup, markAllRead } = useNotifications();

  return (
    <>
      <button
        onClick={() => {
          setShowPanel(!showPanel);
          if (!showPanel && unreadCount > 0) markAllRead();
        }}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute right-4 top-16 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-slate-900">Notifications</h3>
              <button onClick={() => setShowPanel(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Aucune notification</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((n) => (
                  <div key={n.id} className={`px-4 py-3 ${n.is_read ? 'bg-white' : 'bg-orange-50/50'}`}>
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-slate-300 mt-1">{formatDate(n.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {popup && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-[slideDown_0.3s_ease-out] max-w-md">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{popup.title}</p>
            {popup.body && <p className="text-xs text-slate-300">{popup.body}</p>}
          </div>
          <button onClick={() => {}} className="hidden">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </>
  );
}
