import ArticlesPage from '@/components/ArticlesPage';
export const metadata = { title: 'Artículos' };
export default async function Page({ searchParams }) { return <ArticlesPage openNew={(await searchParams)?.nuevo === '1'}/>; }
