import { UsersRound } from 'lucide-react';
import PanelPlaceholder from '@/components/PanelPlaceholder';
export const metadata = { title: 'Clientes' };
export default function Page() { return <PanelPlaceholder eyebrow="CLIENTES" title="Clientes" description="Un lugar para conocer y organizar a quienes compran en tu negocio." icon={UsersRound} detail="En una próxima etapa vas a poder reunir fichas de clientes y datos de contacto. Por ahora podés escribir un nombre opcional al cobrar."/>; }
