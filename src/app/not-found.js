import Link from 'next/link';
export default function NotFound() { return <div className="inner-page history-empty"><h1>Esta página no está.</h1><p>Volvé a la caja para seguir trabajando.</p><Link href="/" className="button-primary">Ir al inicio</Link></div>; }
