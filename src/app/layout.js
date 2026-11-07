import './globals.css';
import { StoreProvider } from '@/context/StoreContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = { title: { default: 'Almacén — Tu mercado de todos los días', template: '%s | Almacén' }, description: 'Productos frescos y esenciales para comprar simple, todos los días.' };
export default function RootLayout({ children }) { return <html lang="es"><body><StoreProvider><Header/><main>{children}</main><Footer/></StoreProvider></body></html>; }
