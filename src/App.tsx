import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, Gamepad2, Globe, ShoppingCart, ChevronRight, 
  Zap, LogIn, LogOut, Settings, Terminal
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './contexts/AuthContext';
import { AdminPanel } from './components/AdminPanel';
import { StorePage } from './components/StorePage';
import { CinematicIntro, ConsoleTitle, TerminalTyping } from './components/Intro';
import { Scene } from './components/ThreeScene';
import { CartDrawer } from './components/CartDrawer';
import { handleFirestoreError } from './lib/error-handling';
import { OperationType, CartItem, Product } from './types';
import logo from './logo.png';

export default function App() {
  const { user, isAdmin, login, logout, isLoggingIn } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [page, setPage] = useState<'home' | 'store' | 'admin'>('home');
  const [services, setServices] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (product: Product) => {
    const stock = typeof product.stock === 'number' ? product.stock : 0;
    if (stock <= 0) {
      alert("This product is currently out of stock.");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= stock) {
          alert(`Only ${stock} units available in stock.`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const stock = typeof item.stock === 'number' ? item.stock : 999;
        const newQty = Math.max(1, item.quantity + delta);
        if (delta > 0 && newQty > stock) {
          alert(`Only ${stock} units available in stock.`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const getServiceIcon = (name: string) => {
    switch (name?.toLowerCase()) {
      case 'cpu': return <Cpu />;
      case 'gamepad': return <Gamepad2 />;
      case 'globe': return <Globe />;
      case 'terminal': return <Terminal />;
      default: return <Zap />;
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[#050507] text-white selection:bg-purple-500/30">
      <AnimatePresence>
        {showIntro && (
          <CinematicIntro key="intro" onComplete={() => setShowIntro(false)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ duration: 1.5, delay: 0.5 }}
        className={showIntro ? "pointer-events-none" : ""}
      >
        {/* 3D Background */}
        <div className="fixed inset-0 z-0 opacity-80">
          <Canvas shadows dpr={[1, 2]}>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        </div>

        {/* Navigation */}
        <nav className={`fixed top-0 left-0 w-full p-8 flex justify-between items-center z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-xl py-6 border-b border-white/5' : ''}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setPage('home')} className="flex items-center gap-3 cursor-pointer">
              <img src={logo} alt="Script Services Logo" className="h-20 w-auto object-contain" />
            </button>
          </div>
          
          <div className="hidden md:flex gap-8 text-sm font-bold text-white/60 uppercase tracking-widest font-mono">
            {page === 'home' ? (
              <>
                <a href="#hero" className="hover:text-white transition-colors">Home</a>
                <a href="#services" className="hover:text-white transition-colors">Services</a>
                <a href="#contact" className="hover:text-white transition-colors">Contact</a>
                <button onClick={() => setPage('store')} className="hover:text-white transition-colors cursor-pointer">Store</button>
              </>
            ) : (
              <>
                <button onClick={() => setPage('home')} className="hover:text-white transition-colors cursor-pointer">Home</button>
                <button onClick={() => setPage('store')} className="text-white transition-colors cursor-pointer">Store</button>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                {/* Admin button hidden for client-only view as requested */}
                {/* {isAdmin && (
                  <button 
                    onClick={() => setPage('admin')}
                    className={`p-3 rounded-full border border-white/10 transition-all cursor-pointer ${page === 'admin' ? 'bg-purple-600' : 'bg-white/5 hover:bg-white/10'}`}
                    title="Admin Panel"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                )} */}
                <button 
                  onClick={logout}
                  className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 transition-all cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={login}
                disabled={isLoggingIn}
                className={`p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 transition-all cursor-pointer ${isLoggingIn ? 'opacity-50 cursor-wait' : ''}`}
                title={isLoggingIn ? "Logging in..." : "Login"}
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
              </button>
            )}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 transition-all cursor-pointer relative group"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </nav>

        <AnimatePresence mode="wait">
          {page === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Hero Content */}
              <section id="hero" className="relative z-10 min-h-screen flex flex-col justify-center px-8 md:px-24 pt-32 pb-20 pointer-events-none backdrop-blur-[2px]">
                <motion.div 
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="max-w-3xl pointer-events-auto"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-md">
                    <Globe className="w-3 h-3" />
                    Next-Gen Tech Solutions
                  </div>
                  
                  <h1 className="text-5xl md:text-8xl font-black leading-tight tracking-tighter mb-8 font-mono">
                    <ConsoleTitle 
                      text="SCRIPT" 
                      className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-orange-400 to-yellow-300" 
                    />
                    <ConsoleTitle 
                      text="SERVICES" 
                      className="text-white" 
                      showCursor={true}
                    />
                  </h1>
                  
                  <p className="text-lg md:text-2xl text-white/60 max-w-xl mb-12 leading-relaxed">
                    Expert Computer and PlayStation services. From hardware repairs to custom web development, we script your digital success.
                  </p>

                  <div className="flex flex-wrap gap-6 mb-16">
                    <button 
                      onClick={() => setPage('store')}
                      className="px-10 py-5 bg-[#FDB813] text-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-3 shadow-xl shadow-yellow-500/20 cursor-pointer"
                    >
                      Explore Store <ChevronRight className="w-5 h-5" />
                    </button>
                    <a href="#services" className="px-10 py-5 bg-white/5 backdrop-blur-md hover:bg-white/10 border border-white/10 font-bold rounded-xl transition-all cursor-pointer flex items-center">
                      Our Services
                    </a>
                  </div>

                  <div className="mt-8">
                    <TerminalTyping />
                  </div>
                </motion.div>
              </section>

              {/* Services Section */}
              <section id="services" className="relative z-10 min-h-screen py-32 px-8 md:px-24 bg-gradient-to-b from-transparent to-[#050507]">
                <div className="max-w-7xl mx-auto">
                  <div className="mb-20">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">OUR SERVICES</h2>
                    <div className="w-24 h-2 bg-gradient-to-r from-purple-600 to-yellow-500 rounded-full" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.length > 0 ? (
                      services.map((service, idx) => (
                        <motion.div 
                          key={`service-card-${service.id || idx}`}
                          whileHover={{ y: -10, scale: 1.02 }}
                          className="p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-purple-500/50 transition-all group shadow-2xl"
                        >
                          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500/40 transition-colors">
                            {React.cloneElement(getServiceIcon(service.iconName) as React.ReactElement<any>, { className: "text-purple-400 w-6 h-6" })}
                          </div>
                          <h3 className="text-xl font-bold mb-4">{service.title}</h3>
                          <p className="text-white/40 text-sm leading-relaxed">{service.description}</p>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full py-20 text-center bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10">
                        <Zap className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white/40">No services listed yet</h3>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Contact Section */}
              <section id="contact" className="relative z-10 py-32 px-8 md:px-24 bg-[#050507]/80 backdrop-blur-xl border-t border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
                  <div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8">GET IN TOUCH</h2>
                    <p className="text-white/50 text-lg mb-12 leading-relaxed">
                      Have a technical issue or need a custom solution? Our experts are ready to help you script your next digital breakthrough.
                    </p>
                    
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                          <Globe className="text-purple-400 w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Location</div>
                          <div className="text-white/40 text-sm">Tech District, Digital City</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                          <Terminal className="text-yellow-400 w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Email</div>
                          <div className="text-white/40 text-sm">support@scriptservices.tech</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const data = Object.fromEntries(formData.entries());
                      try {
                        await addDoc(collection(db, 'messages'), {
                          ...data,
                          createdAt: Timestamp.now(),
                          status: 'unread'
                        });
                        alert("Message sent successfully!");
                        (e.target as HTMLFormElement).reset();
                      } catch (error) {
                        handleFirestoreError(error, OperationType.CREATE, 'messages');
                      }
                    }}
                    className="space-y-6 bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">Name</label>
                        <input name="name" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors" placeholder="John Doe" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">Email</label>
                        <input name="email" type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors" placeholder="john@example.com" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">Subject</label>
                      <select name="subject" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors appearance-none">
                        <option className="bg-[#050507]">Computer Repair</option>
                        <option className="bg-[#050507]">PlayStation Service</option>
                        <option className="bg-[#050507]">Web Development</option>
                        <option className="bg-[#050507]">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">Message</label>
                      <textarea name="message" rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors resize-none" placeholder="How can we help?" required />
                    </div>
                    <button type="submit" className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-800 font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-xl shadow-purple-500/20">
                      Send Message
                    </button>
                  </form>
                </div>
              </section>
            </motion.div>
          ) : page === 'store' ? (
            <StorePage 
              key="store"
              onBack={() => setPage('home')} 
              onAddToCart={addToCart}
            />
          ) : (
            <AdminPanel 
              key="admin"
              onBack={() => setPage('home')} 
            />
          )}
        </AnimatePresence>

        <CartDrawer 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onRemove={removeFromCart}
          onUpdateQuantity={updateQuantity}
          onCheckout={async () => {
            if (!user) {
              login();
              return;
            }
            try {
              await addDoc(collection(db, 'orders'), {
                customerEmail: user.email,
                customerName: user.displayName,
                items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
                total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                status: 'pending',
                createdAt: serverTimestamp()
              });
              clearCart();
              setIsCartOpen(false);
              alert("Order placed successfully! We will contact you soon.");
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, 'orders');
            }
          }}
        />

        {/* Footer Stats/Info */}
        <div className="relative z-10 w-full px-8 md:px-24 py-12 flex flex-wrap justify-between items-end border-t border-white/5 bg-black/40 backdrop-blur-xl">
          <div className="flex gap-12 mb-8 md:mb-0">
            <div>
              <div className="text-2xl font-bold">500+</div>
              <div className="text-xs text-white/40 uppercase tracking-widest">Repairs Done</div>
            </div>
            <div>
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-xs text-white/40 uppercase tracking-widest">Tech Support</div>
            </div>
            <div>
              <div className="text-2xl font-bold">100%</div>
              <div className="text-xs text-white/40 uppercase tracking-widest">Satisfaction</div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Gamepad2 className="text-purple-400 w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold">PS5 Specialist</div>
                <div className="text-[10px] text-white/40 uppercase">Certified Service</div>
              </div>
            </div>
            <div className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-mono">
              © 2026 SCRIPT SERVICES. ALL RIGHTS RESERVED.
            </div>
          </div>
        </div>

        {/* Background Glows */}
        <div className="fixed top-1/4 -right-24 w-96 h-96 bg-purple-600/20 blur-[160px] rounded-full pointer-events-none" />
        <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-yellow-500/10 blur-[160px] rounded-full pointer-events-none" />
      </motion.div>
    </div>
  );
}
