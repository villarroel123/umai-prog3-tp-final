'use client';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export default function SiteFrame({ children }) {
  const pathname = usePathname();
  if (pathname === '/panel' || pathname.startsWith('/panel/')) return children;
  return <><Header/><main>{children}</main><Footer/></>;
}
