import Link from 'next/link';
import Image from 'next/image';
export default function Brand({ href = '/', label = 'ZETA, inicio' }) { return <Link href={href} className="brand" aria-label={label}><Image src="/zeta-mark.svg" alt="" width={34} height={34} className="brand-mark" unoptimized/><span>ZETA</span></Link>; }
