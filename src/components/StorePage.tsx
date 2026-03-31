import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Filter, ArrowLeft, Star, ShoppingCart, Package,
  Cpu, Gamepad2, Globe, Terminal, Zap, ShieldCheck
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError } from '../lib/error-handling';
import { OperationType, Product } from '../types';

interface StorePageProps {
  onBack: () => void;
  onAddToCart: (product: Product) => void;
}

export function StorePage({ onBack, onAddToCart }: StorePageProps) {
  const { login } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'rating'>('newest');

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        rating: doc.data().rating || (4 + Math.random()),
        reviews: doc.data().reviews || Math.floor(Math.random() * 200) + 10
      }));
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => unsubscribe();
  }, []);

  const categories = Array.from(new Set(['All', ...products.map(p => p.category).filter(Boolean)]));

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });

  const getIcon = (name: string) => {
    switch (name?.toLowerCase()) {
      case 'cpu': return <Cpu />;
      case 'gamepad': return <Gamepad2 />;
      case 'globe': return <Globe />;
      case 'terminal': return <Terminal />;
      case 'zap': return <Zap />;
      case 'shield': return <ShieldCheck />;
      default: return <Package />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative z-10 pt-32 px-8 md:px-24 pb-20 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </button>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-2">TECH STORE</h2>
            <p className="text-white/40 text-lg max-w-2xl">Premium hardware and digital assets curated for the modern developer.</p>
          </div>

          <div className="flex flex-col gap-4 w-full md:w-96">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-purple-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-purple-500 transition-all backdrop-blur-xl"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-all appearance-none"
                >
                  <option value="newest" className="bg-[#050507]">Newest Arrivals</option>
                  <option value="price-low" className="bg-[#050507]">Price: Low to High</option>
                  <option value="price-high" className="bg-[#050507]">Price: High to Low</option>
                  <option value="rating" className="bg-[#050507]">Avg. Customer Review</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-8 no-scrollbar">
          {categories.map((cat, idx) => (
            <button
              key={`store-cat-${cat}-${idx}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2 rounded-full border text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat 
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' 
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
            <p className="text-white/40 animate-pulse">Scanning inventory...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, idx) => (
              <motion.div 
                key={`store-prod-${product.id}-${idx}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -8 }}
                className="group bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden flex flex-col h-full transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20"
              >
                <div className="relative h-48 bg-gradient-to-br from-purple-500/10 to-transparent flex items-center justify-center overflow-hidden">
                  {product.photoUrl ? (
                    <img 
                      src={product.photoUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
                      </div>
                      <div className="relative z-10 transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 text-white">
                        {React.cloneElement(getIcon(product.iconName) as React.ReactElement<any>, { size: 64, className: "text-purple-400" })}
                      </div>
                    </>
                  )}
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60">
                      {product.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-bold mb-2 truncate group-hover:text-purple-400 transition-colors">{product.name}</h3>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center text-yellow-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={`star-${product.id}-${star}`} 
                          className={`w-3 h-3 ${star <= Math.round(product.rating) ? 'fill-current' : 'opacity-20'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-white/40 font-bold">({product.reviews})</span>
                  </div>

                  <p className="text-white/40 text-xs leading-relaxed mb-6 line-clamp-2">
                    {product.description || "High-performance tech solution tailored for your needs."}
                  </p>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                        (product.stock || 0) <= 0 
                          ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                          : (product.stock || 0) < 10 
                            ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' 
                            : 'bg-green-500/10 border-green-500/20 text-green-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                          (product.stock || 0) <= 0 ? 'bg-red-400' : (product.stock || 0) < 10 ? 'bg-orange-400' : 'bg-green-400'
                        }`} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          {(product.stock || 0) <= 0 ? 'Out of Stock' : `${product.stock} Units Available`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between mb-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Price</span>
                        <div className="text-2xl font-black text-white">
                          {product.price.toLocaleString()} <span className="text-[10px] text-yellow-500 ml-1">EGP</span>
                        </div>
                      </div>
                      {product.price > 5000 && (
                        <div className="px-2 py-1 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[8px] font-black uppercase tracking-tighter">
                          Prime Delivery
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => onAddToCart(product)}
                      className="w-full py-4 bg-white/5 hover:bg-purple-600 border border-white/10 hover:border-purple-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      <ShoppingCart className="w-4 h-4 group-hover/btn:scale-110 transition-transform" /> 
                      Add to Cart
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 border-dashed">
            <Package className="w-16 h-16 text-white/10 mb-6" />
            <h3 className="text-2xl font-bold mb-2">No products found</h3>
            <p className="text-white/40">Try adjusting your search or filters to find what you're looking for.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="mt-8 text-purple-400 font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
