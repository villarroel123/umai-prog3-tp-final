import { ChartNoAxesCombined } from 'lucide-react';
import PanelPlaceholder from '@/components/PanelPlaceholder';
export const metadata = { title: 'Estadísticas' };
export default function Page() { return <PanelPlaceholder eyebrow="ESTADÍSTICAS" title="Estadísticas" description="Una lectura más profunda de las ventas y el movimiento del negocio." icon={ChartNoAxesCombined} detail="El resumen ya muestra ventas de los últimos siete días y productos más vendidos. Aquí podremos ampliar períodos, comparaciones y filtros en una próxima etapa."/>; }
