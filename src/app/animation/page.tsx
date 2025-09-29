'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnimationDemoPage() {
  const [show, setShow] = useState(true);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <h1 className="text-3xl font-bold">Framer Motion Demo</h1>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setShow((s) => !s)}
          className="rounded-md bg-indigo-500 px-4 py-2 font-medium hover:bg-indigo-400 transition"
        >
          {show ? 'Hide' : 'Show'} Box
        </button>
      </div>

      <div className="h-48 w-full max-w-md flex items-center justify-center">
        <AnimatePresence>
          {show && (
            <motion.div
              key="box"
              initial={{ opacity: 0, scale: 0.6, y: 30, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: -30, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="h-32 w-32 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 shadow-2xl"
              whileHover={{ scale: 1.08, rotate: 2 }}
              whileTap={{ scale: 0.96 }}
            />
          )}
        </AnimatePresence>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-slate-300"
      >
        Hover and tap the box. Toggle it to see enter/exit animations.
      </motion.p>
    </main>
  );
}


