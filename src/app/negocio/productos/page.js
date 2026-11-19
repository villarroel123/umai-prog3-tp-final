import { redirect } from 'next/navigation';

export default async function Page({ searchParams }) {
  const params = await searchParams;
  redirect(`/negocio/inventario${params?.nuevo === '1' ? '?nuevo=1' : ''}`);
}
