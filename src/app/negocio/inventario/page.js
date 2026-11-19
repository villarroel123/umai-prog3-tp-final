import InventoryPage from '@/components/InventoryPage';

export const metadata = { title: 'Inventario' };

export default async function Page({ searchParams }) {
  return <InventoryPage openNew={(await searchParams)?.nuevo === '1'} />;
}
