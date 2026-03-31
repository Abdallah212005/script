import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, Trash2, Plus, Minus, Package, Zap } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onCheckout: () => Promise<void>;
}

export function CartDrawer({ isOpen, onClose, cart, onRemove, onUpdateQuantity, onCheckout }: CartDrawerProps) {
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] cursor-pointer"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0a0a0c] border-l border-white/10 z-[101] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">YOUR CART</h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
                    {cart.length} {cart.length === 1 ? 'Item' : 'Items'} Ready
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-6 h-6 text-white/40" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <Package className="w-16 h-16" />
                  <div>
                    <p className="text-lg font-bold">Cart is empty</p>
                    <p className="text-sm">Start adding some digital assets</p>
                  </div>
                </div>
              ) : (
                cart.map((item) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={`cart-item-${item.id}`}
                    className="p-4 bg-white/5 rounded-2xl border border-white/10 flex gap-4 group hover:border-purple-500/30 transition-colors"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                        <p className="text-purple-400 font-mono text-xs">${item.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1 border border-white/5">
                          <button 
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button 
                          onClick={() => onRemove(item.id)}
                          className="p-2 text-white/20 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 bg-black/60 backdrop-blur-xl border-t border-white/10 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-white/40">
                    <span>Subtotal</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-white/40">
                    <span>Processing Fee</span>
                    <span className="text-green-400">FREE</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/5">
                    <span>Total</span>
                    <span className="text-purple-400">${total.toLocaleString()}</span>
                  </div>
                </div>
                <button 
                  onClick={onCheckout}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-3 group cursor-pointer"
                >
                  <Zap className="w-5 h-5 group-hover:animate-pulse" />
                  INITIATE CHECKOUT
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
