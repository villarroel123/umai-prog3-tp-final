import './globals.css';
import './operations.css';
import './panel.css';
import './theme.css';
import './catalog-assets.css';
import './pos-compact.css';
import './sales-step3.css';
import './business-settings.css';
import './inventory.css';
import './articles.css';
import './panel-compact.css';
import './cashiers.css';
import './cashier-pos.css';
import { StoreProvider } from '@/context/StoreContext';
import SiteFrame from '@/components/SiteFrame';
export const metadata = { title: { default: 'ZETA — cobros en orden', template: '%s | ZETA' }, description: 'Sistema de cobros ZETA para registrar productos, ventas, pagos y comprobantes en un solo lugar.' };
export default function RootLayout({ children }) { return <html lang="es"><body><StoreProvider><SiteFrame>{children}</SiteFrame></StoreProvider></body></html>; }
