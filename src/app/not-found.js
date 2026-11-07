import Link from 'next/link';
export default function NotFound() { return <div className="container page-space empty-state"><h1>Esta página no está.</h1><p>Volvé al mercado y seguí explorando.</p><Link href="/" className="button button-dark">Ir al inicio</Link></div>; }
