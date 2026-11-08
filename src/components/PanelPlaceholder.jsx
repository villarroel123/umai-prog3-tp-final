import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function PanelPlaceholder({ eyebrow, title, description, icon: Icon, detail }) {
  return <div className="overview-page panel-placeholder-page"><div className="overview-heading"><div><span className="eyebrow">PANEL / {eyebrow}</span><h1>{title}<span className="accent">.</span></h1><p>{description}</p></div></div><div className="panel-placeholder"><span className="panel-placeholder-icon"><Icon size={31} strokeWidth={1.6}/></span><span className="eyebrow">PRÓXIMA ETAPA</span><h2>Este espacio está preparado.</h2><p>{detail}</p><Link href="/panel" className="quiet-link">Volver al resumen <ArrowRight size={16}/></Link></div></div>;
}
