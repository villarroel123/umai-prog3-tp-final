'use client';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export default function SiteFrame({ children }) {
  const pathname = usePathname();
  if (pathname === '/caja-cobro' || pathname === '/panel' || pathname.startsWith('/panel/') || pathname === '/negocio' || pathname.startsWith('/negocio/')) return children;
  return <><Header/><main>{children}</main><Footer/></>;
}
