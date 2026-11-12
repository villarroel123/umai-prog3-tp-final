import { requireUser } from '@/lib/guard';
import PanelPlaceholder from '@/components/PanelPlaceholder';
import { Boxes } from 'lucide-react';
export const metadata = { title: 'Consultar stock' };
export default async function Page() { await requireUser('/caja/stock', ['cashier']); return <PanelPlaceholder eyebrow="CAJA" title="Consultar stock" description="El catálogo y el stock se consultan desde la pantalla de caja." icon={Boxes} detail="La vista independiente se incorporará en una etapa posterior."/>; }
