import PanelPlaceholder from '@/components/PanelPlaceholder';
import { Store } from 'lucide-react';
export const metadata = { title: 'Negocios' };
export default function Page() { return <PanelPlaceholder eyebrow="ADMINISTRACIÓN" title="Negocios" description="La gestión de negocios llegará en la Etapa 5." icon={Store} detail="Todavía no se pueden suspender ni reactivar negocios desde aquí."/>; }
