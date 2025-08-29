
import React from 'react';

interface LiaraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const LiaraLogo: React.FC<LiaraLogoProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Liara Health AI Icon - CSS version */}
      <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-400 rounded-lg shadow-lg">
          <div className="absolute inset-[2px] bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <div className="w-2/5 h-2/5 bg-gradient-to-br from-cyan-300 to-blue-300 rounded-full"></div>
          </div>
        </div>
      </div>
      
      {showText && (
        <span className={`font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent ${textSizeClasses[size]}`}>
          Liara Health AI
        </span>
      )}
    </div>
  );
};
