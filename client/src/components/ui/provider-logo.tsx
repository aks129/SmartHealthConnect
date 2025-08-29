
import React, { useState, useEffect } from 'react';
import { Building, Stethoscope, CreditCard, Pill, Microscope, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderLogoProps {
  logoUrl?: string;
  name: string;
  type?: 'provider' | 'insurance' | 'pharmacy' | 'lab' | 'tefca' | 'vendor';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fallbackText?: string;
}

export function ProviderLogo({ 
  logoUrl, 
  name, 
  type = 'provider', 
  size = 'md', 
  className,
  fallbackText 
}: ProviderLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Reset image error state when logoUrl changes
  useEffect(() => {
    if (logoUrl) {
      setImageError(false);
      setImageLoaded(false);
    }
  }, [logoUrl]);
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };
  
  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };
  
  const getTypeIcon = () => {
    const iconClass = cn(iconSizeClasses[size], getTypeColor());
    
    switch (type) {
      case 'provider':
        return <Stethoscope className={iconClass} />;
      case 'insurance':
        return <CreditCard className={iconClass} />;
      case 'pharmacy':
        return <Pill className={iconClass} />;
      case 'lab':
        return <Microscope className={iconClass} />;
      case 'tefca':
        return <Shield className={iconClass} />;
      default:
        return <Building className={iconClass} />;
    }
  };
  
  const getTypeColor = () => {
    switch (type) {
      case 'provider':
        return 'text-blue-600';
      case 'insurance':
        return 'text-green-600';
      case 'pharmacy':
        return 'text-red-600';
      case 'lab':
        return 'text-yellow-600';
      case 'tefca':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const getFallbackInitials = () => {
    if (fallbackText) {
      return fallbackText.substring(0, 2).toUpperCase();
    }
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };
  
  const handleImageLoad = () => {
    setImageLoaded(true);
  };
  
  const handleImageError = () => {
    console.warn(`Failed to load logo for ${name}: ${logoUrl}`);
    setImageError(true);
  };
  
  // Show fallback if no logo URL, image failed to load, or hasn't loaded yet
  if (!logoUrl || imageError) {
    return (
      <div className={cn(
        sizeClasses[size],
        'flex-shrink-0 bg-white rounded-md border flex items-center justify-center',
        'bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm',
        className
      )}>
        {fallbackText ? (
          <span className={cn(
            'font-semibold',
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base',
            getTypeColor()
          )}>
            {getFallbackInitials()}
          </span>
        ) : (
          getTypeIcon()
        )}
      </div>
    );
  }
  
  return (
    <div className={cn(
      sizeClasses[size],
      'flex-shrink-0 bg-white rounded-md border flex items-center justify-center overflow-hidden shadow-sm',
      className
    )}>
      {/* Show loading placeholder while image loads */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <span className={cn(
            'font-semibold text-gray-400',
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
          )}>
            {getFallbackInitials()}
          </span>
        </div>
      )}
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={cn(
          "max-h-full max-w-full object-contain transition-opacity duration-200",
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
}
