import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Star, Menu, User, ChevronRight, Share2, Heart } from 'lucide-react';
import { PRODUCT_THEMES, ProductTheme } from './constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTheme, setActiveTheme] = useState<ProductTheme>(PRODUCT_THEMES[0]);
  const [selectedSize, setSelectedSize] = useState('M');
  const [direction, setDirection] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleSizeChange = (newSize: string) => {
    const sizes = ['S', 'M', 'L', 'XL', '2XL'];
    const oldIndex = sizes.indexOf(selectedSize);
    const newIndex = sizes.indexOf(newSize);
    setDirection(newIndex > oldIndex ? 1 : -1);
    setSelectedSize(newSize);
  };

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <main className="relative min-h-screen w-full overflow-hidden transition-colors duration-700 ease-in-out">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 transition-all duration-1000 ease-in-out"
        style={{ background: activeTheme.bgGradient }}
      />

      {/* Abstract Background Logo/Shape */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-10">
        <motion.div
          key={activeTheme.id + '-logo'}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 1.5 }}
          className="w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] border-[40px] border-white rounded-full flex items-center justify-center"
        >
           <div className="w-[60%] h-[20%] bg-white rounded-full transform -rotate-45" />
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-8 md:px-12">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
             <div className="w-6 h-2 bg-black rounded-full transform -rotate-45" />
          </div>
          <span className="text-2xl font-bold tracking-tighter uppercase italic">Aura</span>
        </div>

        <div className="hidden md:flex items-center gap-8 glass px-8 py-3 rounded-full">
          {['Menu', 'About', 'Shop', 'Contact'].map((item) => (
            <a key={item} href="#" className="text-sm font-medium hover:opacity-70 transition-opacity">
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <User size={20} />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors md:hidden">
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-100px)] px-6 md:px-12 items-center">
        
        {/* Left Content: Product Info */}
        <div className="lg:col-span-4 space-y-8 pt-12 lg:pt-0">
          <motion.div
            key={activeTheme.id + '-title'}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-xl md:text-2xl font-light tracking-wide opacity-90">
              {activeTheme.subtitle}
            </h2>
            <h1 className="text-6xl md:text-8xl font-serif italic leading-none">
              {activeTheme.title}
            </h1>
          </motion.div>

          <motion.div
            key={activeTheme.id + '-desc'}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-md space-y-6"
          >
            <p className="text-sm md:text-base leading-relaxed opacity-80 font-light">
              {activeTheme.description}
            </p>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill={i < Math.floor(activeTheme.rating) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="text-xs font-medium opacity-60">({activeTheme.rating} / 5.0)</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex items-center gap-6"
          >
            <button className="group relative flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold overflow-hidden transition-all hover:pr-12">
              <span className="relative z-10">Add to Cart</span>
              <ShoppingBag size={18} className="relative z-10" />
              <div className="absolute right-4 opacity-0 group-hover:opacity-100 group-hover:right-6 transition-all">
                <ChevronRight size={18} />
              </div>
            </button>
            <button className="p-4 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
              <Heart size={20} />
            </button>
          </motion.div>
        </div>

        {/* Center Content: 3D Product Image */}
        <div className="lg:col-span-5 flex justify-center items-center py-12 lg:py-0 relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeTheme.id + selectedSize}
              custom={direction}
              variants={{
                enter: (direction: number) => ({
                  x: direction > 0 ? 200 : direction < 0 ? -200 : 0,
                  opacity: 0,
                  scale: 0.8,
                  rotate: direction > 0 ? 10 : direction < 0 ? -10 : 0
                }),
                center: {
                  x: 0,
                  opacity: 1,
                  scale: 1,
                  rotate: 0
                },
                exit: (direction: number) => ({
                  x: direction > 0 ? -200 : direction < 0 ? 200 : 0,
                  opacity: 0,
                  scale: 0.8,
                  rotate: direction > 0 ? -10 : direction < 0 ? 10 : 0
                })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ 
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.4 },
                scale: { duration: 0.4 },
                rotate: { duration: 0.4 }
              }}
              className="relative w-full max-w-[500px] aspect-square flex items-center justify-center"
            >
              {/* Glow Effect */}
              <div 
                className="absolute inset-0 blur-[100px] opacity-40 rounded-full transition-colors duration-700"
                style={{ backgroundColor: activeTheme.color }}
              />
              
              {/* Jacket Image */}
              <img 
                src={activeTheme.jacketImage} 
                alt={activeTheme.title}
                className="relative z-10 w-full h-full object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1000&auto=format&fit=crop';
                }}
              />

              {/* Price Tag Widget */}
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute top-10 right-0 glass px-6 py-4 rounded-2xl z-20"
              >
                <div className="text-xs uppercase tracking-widest opacity-60 mb-1">Price</div>
                <div className="text-3xl font-bold tracking-tighter">{activeTheme.price}</div>
                <div className="text-sm line-through opacity-40">{activeTheme.originalPrice}</div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Content: Widgets & Selectors */}
        <div className="lg:col-span-3 flex flex-col items-end gap-8 pb-12 lg:pb-0">
          
          {/* Color Selector Widget */}
          <div className="glass p-6 rounded-[32px] w-full max-w-[200px] space-y-6">
            <div className="text-xs font-bold uppercase tracking-widest opacity-60">Select Color</div>
            <div className="flex flex-col gap-4">
              {PRODUCT_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setActiveTheme(theme)}
                  className={cn(
                    "group relative flex items-center gap-4 p-2 rounded-2xl transition-all duration-300",
                    activeTheme.id === theme.id ? "bg-white/10" : "hover:bg-white/5"
                  )}
                >
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all duration-300",
                      activeTheme.id === theme.id ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className={cn(
                    "text-xs font-medium transition-opacity",
                    activeTheme.id === theme.id ? "opacity-100" : "opacity-40 group-hover:opacity-60"
                  )}>
                    {theme.name.split(' ')[1]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Size Selector Widget */}
          <div className="glass p-6 rounded-[32px] w-full max-w-[200px] space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest opacity-60">Size</div>
            <div className="grid grid-cols-3 gap-2">
              {['S', 'M', 'L', 'XL', '2XL'].map((size) => (
                <button 
                  key={size}
                  onClick={() => handleSizeChange(size)}
                  className={cn(
                    "h-10 flex items-center justify-center rounded-xl text-xs font-bold border transition-all",
                    selectedSize === size ? "bg-white text-black border-white" : "border-white/10 hover:border-white/40"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Share Action */}
          <button className="flex items-center gap-3 glass px-6 py-3 rounded-full hover:bg-white/10 transition-all">
            <Share2 size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Share Product</span>
          </button>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="relative z-10 flex flex-wrap gap-12 px-12 pb-12 opacity-40">
        {[
          { label: 'Insulation', value: '750 Fill' },
          { label: 'Weight', value: '500g' },
          { label: 'Temp', value: '-20°C' },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-1">{stat.label}</div>
            <div className="text-xl font-medium">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Decorative Elements */}
      <div className="fixed bottom-0 right-0 p-12 pointer-events-none">
        <div className="text-[20vh] font-serif italic opacity-[0.03] leading-none select-none">
          AURA
        </div>
      </div>
    </main>
  );
}
