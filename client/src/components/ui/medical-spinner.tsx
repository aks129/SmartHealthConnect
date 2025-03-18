import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Heart, 
  Stethoscope, 
  Pill, 
  Thermometer, 
  Activity, 
  RefreshCw, 
  BadgePlus 
} from 'lucide-react';

interface MedicalSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  speed?: 'slow' | 'normal' | 'fast';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive';
  multiIcon?: boolean;
}

export function MedicalSpinner({
  size = 'md',
  text = 'Loading health data...',
  className,
  iconClassName,
  textClassName,
  speed = 'normal',
  variant = 'primary',
  multiIcon = false
}: MedicalSpinnerProps) {
  const [currentIcon, setCurrentIcon] = useState(0);
  
  // Icons to cycle through when multiIcon is true
  const medicalIcons = [
    Heart,
    Stethoscope,
    Pill,
    Thermometer,
    Activity,
    BadgePlus
  ];
  
  // Sizes for different spinner options
  const sizes = {
    sm: {
      container: 'max-w-xs',
      icon: 'h-8 w-8',
      text: 'text-sm'
    },
    md: {
      container: 'max-w-sm',
      icon: 'h-12 w-12',
      text: 'text-base'
    },
    lg: {
      container: 'max-w-md',
      icon: 'h-16 w-16',
      text: 'text-lg'
    },
    xl: {
      container: 'max-w-lg',
      icon: 'h-24 w-24',
      text: 'text-xl'
    }
  };
  
  // Animation speeds
  const speeds = {
    slow: '3s',
    normal: '2s',
    fast: '1s'
  };
  
  // Variants for different colors
  const variants = {
    primary: 'text-primary',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
    destructive: 'text-red-600'
  };
  
  // Cycle through icons when multiIcon is true
  useEffect(() => {
    if (!multiIcon) return;
    
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % medicalIcons.length);
    }, 800);
    
    return () => clearInterval(interval);
  }, [multiIcon]);
  
  // Get the current icon to display
  const IconComponent = multiIcon 
    ? medicalIcons[currentIcon] 
    : RefreshCw;
  
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-4',
      sizes[size].container,
      className
    )}>
      <div className="relative">
        {/* Pulsing circle behind the icon */}
        {variant === 'primary' && (
          <div className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full',
            'bg-primary/10 animate-ping',
            sizes[size].icon
          )} />
        )}
        
        {/* Background circle */}
        <div className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full',
          'bg-background border border-gray-200',
          multiIcon ? sizes[size].icon : ''
        )} style={multiIcon ? undefined : { width: '140%', height: '140%' }} />
        
        {/* Spinner icon */}
        <IconComponent 
          className={cn(
            'relative z-10',
            multiIcon ? 'animate-bounce' : 'animate-spin',
            variants[variant],
            sizes[size].icon,
            iconClassName
          )} 
          style={!multiIcon ? { animationDuration: speeds[speed] } : undefined}
        />
      </div>
      
      {text && (
        <p className={cn(
          'mt-4 text-center font-medium',
          variants[variant],
          sizes[size].text,
          textClassName
        )}>
          {text}
        </p>
      )}
    </div>
  );
}

// Loading overlay variant that covers content
interface MedicalLoadingOverlayProps extends MedicalSpinnerProps {
  loading: boolean;
  children: React.ReactNode;
  blur?: boolean;
}

export function MedicalLoadingOverlay({
  loading,
  children,
  blur = true,
  ...spinnerProps
}: MedicalLoadingOverlayProps) {
  return (
    <div className="relative w-full">
      {/* Content that will be overlaid */}
      <div className={cn(
        'transition-all duration-300',
        loading && (blur ? 'blur-sm' : 'opacity-50')
      )}>
        {children}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-50">
          <MedicalSpinner multiIcon={true} {...spinnerProps} />
        </div>
      )}
    </div>
  );
}