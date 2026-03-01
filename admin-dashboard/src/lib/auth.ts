import { useEffect } from 'react';
import { useRouter } from 'next/router';

export const useAdminAuth = () => {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    
    if (!token) {
      router.push('/admin/login');
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    router.push('/admin/login');
  };

  const getUsername = () => {
    return localStorage.getItem('admin_username') || 'Admin';
  };

  const getToken = () => {
    return localStorage.getItem('admin_token');
  };

  return { logout, getUsername, getToken };
};

export const checkAuth = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('admin_token');
};
