import React from 'react';
import { Layers } from 'lucide-react';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ collapsed = false, className = '' }) => {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg shadow-sm">
        <Layers className="text-white w-5 h-5" />
      </div>
      <h1 
        className={`font-bold text-xl text-blue-600 transition-all duration-300 origin-left overflow-hidden whitespace-nowrap ${
          collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
        }`}
      >
        RORCC OA
      </h1>
    </div>
  );
};

export default Logo;
