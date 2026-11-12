import PanelPlaceholder from '@/components/PanelPlaceholder';
import { LifeBuoy } from 'lucide-react';
export const metadata = { title: 'Soporte' };
export default function Page() { return <PanelPlaceholder eyebrow="ADMINISTRACIÓN" title="Soporte" description="Las solicitudes y respuestas de soporte se incorporarán en la Etapa 5." icon={LifeBuoy} detail="Todavía no registra solicitudes."/>; }
