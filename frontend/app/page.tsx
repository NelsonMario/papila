'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-24">
        <motion.div 
          className="max-w-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.p
            className="text-sm font-medium tracking-wide text-neutral-400 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Papila - Flavor Pairing Explorer
          </motion.p>
          
          <motion.h1 
            className="text-6xl md:text-8xl font-bold tracking-tight leading-[0.9] mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="text-neutral-900">Weird, wonderful</span>
            <br />
            <span className="text-neutral-400">&amp; tasty pairings</span>
          </motion.h1>
          
          <motion.p 
            className="text-xl text-neutral-500 leading-relaxed mb-12 max-w-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Discover harmonious flavor combinations through molecular science and culinary intuition.
          </motion.p>
          
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              href="/explore"
              className="inline-flex items-center gap-3 px-8 py-4 bg-neutral-900 text-white
                       rounded-full text-lg font-medium
                       hover:bg-neutral-800 transition-all duration-300
                       hover:scale-105 hover:shadow-lg"
            >
              Start exploring
              <span className="text-xl">→</span>
            </Link>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer 
        className="py-8 px-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <p className="text-sm text-neutral-400">
            The Art of Flavor
          </p>
          <p className="text-sm text-neutral-300">
            Built with FlavorDB data
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
