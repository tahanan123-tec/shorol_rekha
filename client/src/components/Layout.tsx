import { ReactNode } from 'react';
import { Header } from './Header';
import { CartDrawer } from './CartDrawer';
import { NotificationCenter } from './NotificationCenter';
import { MobileMenu } from './MobileMenu';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <Toaster position="top-center" />
      <Header />
      <main className="pb-20">{children}</main>
      <CartDrawer />
      <NotificationCenter />
      <MobileMenu />
    </div>
  );
}
