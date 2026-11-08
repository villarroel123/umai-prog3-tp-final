import Brand from './Brand';
export default function Footer() { return <footer className="footer"><div className="footer-inner"><Brand/><span>Una caja clara para cada venta.</span><span>© {new Date().getFullYear()} caja.</span></div></footer>; }
