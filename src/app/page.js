import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Clock3, ShoppingBasket, Sprout, Truck } from 'lucide-react';
import Catalog from '@/components/Catalog';

export default function Home() {
  return <>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-stage">
        <h1 id="hero-title" className="hero-wordmark">cesta.</h1>
        <img className="hero-tote" src="/images/hero-tote.png" alt="Bolsa de tela con verduras frescas, tomates y pan" />
        <div className="hero-intro">
          <p>Lo bueno de cada día,<br />en un solo lugar.</p>
          <Link href="/catalogo" className="hero-shop-link">ir al catálogo <ArrowRight size={17} /></Link>
        </div>
        <Link href="/catalogo?category=Frutas+y+verduras" className="hero-feature" aria-label="Explorar productos frescos">
          <span className="hero-feature-image"><img src="/images/hero-produce.png" alt="" /></span>
          <span className="hero-feature-bottom">fresco de verdad <ArrowUpRight size={16} /></span>
        </Link>
        <span className="hero-footnote">un mercado para vivir mejor · 2026</span>
      </div>
    </section>

    <section className="benefit-strip"><div className="container benefit-inner"><div><Sprout/><span>Productos seleccionados</span></div><div><Clock3/><span>Comprá cuando quieras</span></div><div><ShoppingBasket/><span>Todo en un solo lugar</span></div><div><Truck/><span>Pedido simple y seguro</span></div></div></section>
    <section className="section container" id="productos"><div className="section-heading"><div><span className="eyebrow">EL MERCADO</span><h2>Para llenar tu mesa<br/><em>de cosas buenas.</em></h2></div><Link className="view-all" href="/catalogo">Ver todos los productos <ArrowRight size={18}/></Link></div><Catalog compact/></section>
    <section className="story-section" id="como-funciona"><div className="container story-grid"><div className="story-art"><span className="story-art-label">SIMPLE ES MEJOR</span><div className="story-bag">🛍️</div><span className="story-art-bottom">CESTA · TODOS LOS DÍAS</span></div><div className="story-copy"><span className="eyebrow">ASÍ DE FÁCIL</span><h2>Tu compra,<br/><em>a tu ritmo.</em></h2><p>Elegí lo que necesitás, agregalo al carrito y confirmá tu pedido. Sin vueltas, sin perder tiempo.</p><div className="steps"><div><span>01</span><div><strong>Explorá el mercado</strong><p>Encontrá frescos y esenciales en categorías claras.</p></div><Check size={18}/></div><div><span>02</span><div><strong>Armá tu carrito</strong><p>Elegí cantidades y revisá todo antes de comprar.</p></div><Check size={18}/></div><div><span>03</span><div><strong>Seguí tu pedido</strong><p>Volvé a tu cuenta para ver el estado de cada compra.</p></div><Check size={18}/></div></div><Link className="button button-dark" href="/catalogo">Empezar a comprar <ArrowRight size={18}/></Link></div></div></section>
    <section className="container bottom-cta"><div><span className="eyebrow">UN MERCADO PARA TODOS</span><h2>Buenas elecciones<br/>empiezan acá.</h2></div><Link className="button button-light" href="/catalogo">Explorar el catálogo <ArrowRight size={18}/></Link></section>
  </>;
}
