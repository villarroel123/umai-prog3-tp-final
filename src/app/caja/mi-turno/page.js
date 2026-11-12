import { requireUser } from '@/lib/guard';
import PanelPlaceholder from '@/components/PanelPlaceholder';
import { Clock3 } from 'lucide-react';
export const metadata = { title: 'Mi turno' };
export default async function Page() { await requireUser('/caja/mi-turno', ['cashier']); return <PanelPlaceholder eyebrow="CAJA" title="Mi turno" description="El seguimiento de turnos y operaciones propias se incorporará en la Etapa 3." icon={Clock3} detail="Sección en desarrollo."/>; }
