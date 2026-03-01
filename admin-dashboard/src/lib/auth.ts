import { useEffect } from 'react';
import { useRouter } from 'next/router';

export const useAdminAuth = () => {
  const router = useRouter();

  useEffect(() => {
    // Only check auth on client side
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('admin_token');
    
    // If no token and not already on login page, redirect
    if (!token && router.pathname !== '/login') {
      router.replace('/admin/login');
    }
  }, [router]);

  const logout = () => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    router.push('/admin/login');
  };

  const getUsername = () => {
    if (typeof window === 'undefined') return 'Admin';
    return localStorage.getItem('admin_username') || 'Admin';
  };

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_token');
  };

  return { logout, getUsername, getToken };
};

export const checkAuth = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('admin_token');
};
