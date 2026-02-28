import { X, Bell, Check, Trash2 } from 'lucide-react';
import { useNotificationStore, useUIStore } from '@/lib/store';
import { Button } from './ui/Button';
import { formatDistanceToNow } from '@/lib/utils';

export function NotificationCenter() {
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll } =
    useNotificationStore();
  const { notificationsOpen, toggleNotifications } = useUIStore();

  if (!notificationsOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={toggleNotifications}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md glass z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Bell className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold">Notifications</h2>
          </div>
          <button onClick={toggleNotifications} className="btn-ghost p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear all
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No notifications
              </h3>
              <p className="text-gray-500">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`glass rounded-xl p-4 transition-all ${
                    !notification.read ? 'border-l-4 border-primary-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 flex-1">
                      {notification.title}
                    </h3>
                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(notification.created_at)}
                    </span>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
