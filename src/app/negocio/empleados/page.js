import PanelPlaceholder from '@/components/PanelPlaceholder';
import { UserCog } from 'lucide-react';
export const metadata = { title: 'Empleados' };
export default function Page() { return <PanelPlaceholder eyebrow="EMPLEADOS" title="Empleados" description="Las invitaciones, estados y actividad de cajeros se desarrollarán en la Etapa 2." icon={UserCog} detail="Sección en desarrollo; todavía no se pueden invitar cajeros."/>; }
