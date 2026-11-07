import ProductDetail from '@/components/ProductDetail';
import { adminConfigured, db } from '@/lib/firebase-admin';
import { DEMO_PRODUCTS } from '@/lib/models';
export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const product = adminConfigured ? (await db().collection('products').doc(id).get()).data() : DEMO_PRODUCTS.find(item => item.id === id);
    return { title: product?.name || 'Producto', description: product?.description || 'Detalle del producto en cesta.' };
  } catch { return { title: 'Producto', description: 'Detalle del producto en cesta.' }; }
}
export default async function ProductPage({ params }) { const { id } = await params; return <ProductDetail id={id}/>; }
