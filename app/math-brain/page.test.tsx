"use client";

import { useState } from "react";

export default function MathBrainPage() {
  const [test, setTest] = useState("Math Brain Test Page");

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">{test}</h1>
      <p className="text-slate-300 mb-4">This is a test to see if the basic component works.</p>
      
      <button 
        onClick={() => setTest("Button clicked!")}
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md"
      >
        Test Button
      </button>
      
      <div className="mt-8 p-4 bg-slate-800 rounded-lg">
        <h2 className="text-xl text-white mb-2">Debug Info</h2>
        <p className="text-slate-300">State: {test}</p>
        <p className="text-slate-300">Component is rendering successfully</p>
      </div>
    </main>
  );
}