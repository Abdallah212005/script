import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Terminal } from 'lucide-react';
import logo from '../logo.png';

export function ConsoleTitle({ text, className, showCursor = false }: { text: string, className?: string, showCursor?: boolean }) {
  const characters = text.split("");
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      x: -10,
      y: 10,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      style={{ display: "flex", overflow: "hidden" }}
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {characters.map((char, index) => (
        <motion.span key={`console-char-${index}-${char}`} variants={child}>
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
      {showCursor && (
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="ml-1 inline-block w-2 h-8 bg-purple-500"
        />
      )}
    </motion.div>
  );
}

export function TerminalTyping() {
  const [text, setText] = useState<string[]>([]);
  const fullText = [
    "INITIALIZING CORE SYSTEMS...",
    "ESTABLISHING SECURE CONNECTION...",
    "LOADING NEURAL INTERFACE...",
    "DECRYPTING ASSETS...",
    "SYSTEM READY."
  ];

  useEffect(() => {
    let currentLine = 0;
    let currentChar = 0;
    let interval: any;

    const type = () => {
      if (currentLine < fullText.length) {
        const line = fullText[currentLine];
        if (currentChar < line.length) {
          setText(prev => {
            const newLines = [...prev];
            newLines[currentLine] = line.substring(0, currentChar + 1);
            return newLines;
          });
          currentChar++;
          interval = setTimeout(type, 30 + Math.random() * 50);
        } else {
          currentLine++;
          currentChar = 0;
          interval = setTimeout(type, 400);
        }
      }
    };

    type();
    return () => clearTimeout(interval);
  }, []);

  return (
    <div className="bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10 font-mono text-sm text-white/80 w-full max-w-md shadow-2xl">
      <div className="flex gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500/50" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
        <div className="w-3 h-3 rounded-full bg-green-500/50" />
      </div>
      {text.map((line, i) => (
        <div key={`terminal-line-${i}`} className="mb-1">
          <span className="text-purple-400 mr-2">$</span>
          {line}
          {i === text.length - 1 && <span className="animate-pulse">_</span>}
        </div>
      ))}
    </div>
  );
}

export function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const [isFinished, setIsFinished] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 5000;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const progressTimer = setInterval(() => {
      currentStep++;
      setProgress(Math.min((currentStep / steps) * 100, 100));
      if (currentStep >= steps) clearInterval(progressTimer);
    }, interval);

    const timer = setTimeout(() => {
      setIsFinished(true);
      setTimeout(onComplete, 1000);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isFinished ? 0 : 1 }}
      transition={{ duration: 1, ease: "easeInOut" }}
      className="fixed inset-0 z-[1000] bg-[#050507] flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              opacity: 0 
            }}
            animate={{ 
              y: [null, Math.random() * -200],
              opacity: [0, 0.5, 0]
            }}
            transition={{ 
              duration: 2 + Math.random() * 4, 
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute w-1 h-1 bg-purple-500 rounded-full"
          />
        ))}
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="relative mb-12"
        >
          <motion.div
            animate={{ 
              filter: [
                "hue-rotate(0deg) brightness(1)",
                "hue-rotate(90deg) brightness(1.5)",
                "hue-rotate(0deg) brightness(1)"
              ]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="relative"
          >
            <img src={logo} alt="Logo" className="w-32 h-32 md:w-48 md:h-48 object-contain" />
            
            <motion.div
              animate={{ 
                opacity: [0, 0.5, 0],
                x: [-2, 2, -2],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 0.2, repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0 mix-blend-screen"
            >
              <img src={logo} alt="" className="w-full h-full object-contain opacity-50 sepia saturate-200 hue-rotate-180" />
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="text-center space-y-6">
          <ConsoleTitle 
            text="SCRIPT_SYSTEM_v2.0" 
            className="text-4xl md:text-6xl font-black tracking-[0.3em] text-white"
            showCursor
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <TerminalTyping />
          </motion.div>
        </div>

        <div className="absolute bottom-20 left-0 right-0 px-20">
          <div className="flex justify-between items-end mb-4 font-mono text-[10px] text-white/40 uppercase tracking-widest">
            <span>System Loading</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
            <motion.div 
              className="h-full bg-gradient-to-r from-purple-600 via-yellow-500 to-purple-600"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ height: "0%" }}
        animate={{ height: "10%" }}
        className="absolute top-0 left-0 right-0 bg-black z-20 border-b border-white/5"
      />
      <motion.div 
        initial={{ height: "0%" }}
        animate={{ height: "10%" }}
        className="absolute bottom-0 left-0 right-0 bg-black z-20 border-t border-white/5"
      />
    </motion.div>
  );
}
