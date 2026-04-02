export interface ProductTheme {
  id: string;
  name: string;
  color: string;
  bgGradient: string;
  accentColor: string;
  jacketImage: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
  originalPrice: string;
  rating: number;
}

export const PRODUCT_THEMES: ProductTheme[] = [
  {
    id: 'orange',
    name: 'Bright Orange',
    color: '#F27D26',
    bgGradient: 'radial-gradient(circle at 50% 50%, #F27D26 0%, #A34500 100%)',
    accentColor: 'rgba(242, 125, 38, 0.2)',
    jacketImage: 'https://png.pngtree.com/png-vector/20250321/ourmid/pngtree-vibrant-orange-t-shirt-mockup-hangs-ready-for-styling-png-image_15801013.png', // High-quality orange jacket
    title: 'Comfy Snug',
    subtitle: 'Wear your Style with Comfort',
    description: 'Experience the warmth and softness in every wear. Our cozy outerwear is designed for everyday comfort and crafted to keep you stylish and relaxed.',
    price: '$99.50',
    originalPrice: '$149.50',
    rating: 4.8
  },
  {
    id: 'olive',
    name: 'Olive Green',
    color: '#5A5A40',
    bgGradient: 'radial-gradient(circle at 50% 50%, #5A5A40 0%, #2A2A1A 100%)',
    accentColor: 'rgba(90, 90, 64, 0.2)',
    jacketImage: 'https://png.pngtree.com/png-vector/20231018/ourmid/pngtree-dark-green-t-shirt-with-hanger-png-image_10205775.png', // High-quality olive tactical jacket
    title: 'Relaxed Thick',
    subtitle: 'Premium Tactical Comfort',
    description: 'Engineered for the modern explorer. This olive variant features reinforced stitching and high-density insulation for extreme conditions.',
    price: '$110.00',
    originalPrice: '$165.00',
    rating: 4.9
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    color: '#7B61FF',
    bgGradient: 'radial-gradient(circle at 50% 50%, #7B61FF 0%, #3B217F 100%)',
    accentColor: 'rgba(123, 97, 255, 0.2)',
    jacketImage: 'https://png.pngtree.com/png-vector/20250305/ourmid/pngtree-blank-royal-blue-t-shirt-on-wooden-hanger-png-image_15723313.png', // High-quality purple jacket
    title: 'Premium Casual',
    subtitle: 'Elegance in Motion',
    description: 'A bold statement piece that doesn\'t compromise on utility. The Royal Purple edition brings a touch of luxury to your winter wardrobe.',
    price: '$125.00',
    originalPrice: '$189.00',
    rating: 4.7
  }
];
