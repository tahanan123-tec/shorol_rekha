import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { User, Mail, CreditCard, MapPin, Settings, LogOut } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSave = () => {
    // TODO: Implement profile update API call
    toast.success('Profile updated successfully!');
    setIsEditing(false);
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Profile</h1>
          <p className="text-gray-600">Manage your account settings</p>
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {user.full_name?.charAt(0) || user.student_id.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {user.full_name || user.student_id}
              </h2>
              <p className="text-gray-500">Student ID: {user.student_id}</p>
              {user.created_at && (
                <p className="text-sm text-gray-400">
                  Member since {formatDate(user.created_at)}
                </p>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              disabled={!isEditing}
              icon={<User className="w-5 h-5" />}
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isEditing}
              icon={<Mail className="w-5 h-5" />}
            />

            <Input
              label="Student ID"
              value={user.student_id}
              disabled
              icon={<CreditCard className="w-5 h-5" />}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            {isEditing ? (
              <>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  fullWidth
                >
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(false)}
                  fullWidth
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => setIsEditing(true)}
                fullWidth
                icon={<Settings className="w-5 h-5" />}
              >
                Edit Profile
              </Button>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card hover onClick={() => router.push('/orders')}>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Order History</h3>
                <p className="text-sm text-gray-500">View past orders</p>
              </div>
            </div>
          </Card>

          <Card hover onClick={() => router.push('/favorites')}>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold">Favorites</h3>
                <p className="text-sm text-gray-500">Saved items</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Logout */}
        <Card>
          <Button
            variant="danger"
            fullWidth
            onClick={handleLogout}
            icon={<LogOut className="w-5 h-5" />}
          >
            Logout
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
