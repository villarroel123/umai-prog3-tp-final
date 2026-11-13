import './globals.css';
import './operations.css';
import './panel.css';
import './theme.css';
import './catalog-assets.css';
import './pos-compact.css';
import './sales-step3.css';
import './business-settings.css';
import './inventory.css';
import { StoreProvider } from '@/context/StoreContext';
import SiteFrame from '@/components/SiteFrame';
export const metadata = { title: { default: 'caja. — cobros en orden', template: '%s | caja.' }, description: 'Sistema de caja para registrar productos, ventas, pagos y comprobantes en un solo lugar.' };
export default function RootLayout({ children }) { return <html lang="es"><body><StoreProvider><SiteFrame>{children}</SiteFrame></StoreProvider></body></html>; }
