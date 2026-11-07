import Catalog from '@/components/Catalog';
export const metadata = { title: 'Productos', description: 'Explorá productos frescos y esenciales en cesta.' };
export default async function CatalogPage({ searchParams }) { const params = await searchParams; return <div className="container page-space"><div className="page-heading"><span className="eyebrow">NUESTRO MERCADO</span><h1>Todo lo que buscás,<br/><em>en un solo lugar.</em></h1><p>Descubrí productos para todos los momentos de tu día.</p></div><Catalog initialCategory={params.category || ''}/></div>; }
