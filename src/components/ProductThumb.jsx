import Image from 'next/image';

export default function ProductThumb({ product }) {
  const imageUrl = typeof product.imageUrl === 'string' && /^\/assets\/products\/[a-z0-9-]+\.webp$/.test(product.imageUrl)
    ? product.imageUrl
    : null;

  return imageUrl
    ? <span className="product-thumb"><Image src={imageUrl} alt="" width={48} height={48}/></span>
    : <span className="product-initial" aria-hidden="true">{product.name.slice(0, 1)}</span>;
}
