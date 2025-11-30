import React from 'react';
import MondrianSketch from './components/MondrianSketch';

const App: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-100 p-8 font-sans">
      <div className="max-w-6xl w-full flex flex-col gap-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-end border-b-4 border-black pb-4">
          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-black">
              <span className="text-red-600">De</span> Stijl <span className="text-blue-700">Run</span>
            </h1>
            <p className="mt-2 text-gray-600 font-medium max-w-md">
              An infinite procedural composition. Navigate the neoplasticist cityscape.
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
             <div className="w-8 h-8 bg-yellow-400 border-2 border-black"></div>
             <div className="w-8 h-8 bg-blue-700 border-2 border-black"></div>
             <div className="w-8 h-8 bg-red-600 border-2 border-black"></div>
          </div>
        </header>

        {/* Main Canvas Container */}
        <main className="flex justify-center items-center bg-white p-4 border-2 border-gray-200 shadow-sm">
           <div className="relative group">
              <MondrianSketch />
              {/* Optional overlay hint */}
              <div className="absolute top-4 right-4 bg-white/90 border border-black p-2 text-xs font-mono shadow-md">
                SPACE or CLICK to JUMP
              </div>
           </div>
        </main>

        {/* Footer/Info */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-gray-500 border-t-2 border-gray-300 pt-4">
           <div>
             <span className="font-bold text-black">FIG 1.</span> Procedural Generation
           </div>
           <div className="text-center">
             INTERACTIVE SKETCH
           </div>
           <div className="text-right">
             PRESS [SPACE] TO START
           </div>
        </footer>

      </div>
    </div>
  );
};

export default App;