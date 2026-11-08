import Link from 'next/link';
import Image from 'next/image';
export default function Brand({ href = '/', label = 'caja, inicio' }) { return <Link href={href} className="brand" aria-label={label}><Image src="/caja-mark.svg" alt="" width={34} height={34} className="brand-mark" unoptimized/><span>caja<span className="brand-dot">.</span></span></Link>; }
