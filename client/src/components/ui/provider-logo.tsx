
import React, { useState } from 'react';
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
  
  if (!logoUrl || imageError) {
    return (
      <div className={cn(
        sizeClasses[size],
        'flex-shrink-0 bg-white rounded-md border flex items-center justify-center',
        'bg-gradient-to-br from-gray-50 to-gray-100',
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
      'flex-shrink-0 bg-white rounded-md border p-1 flex items-center justify-center',
      className
    )}>
      <img
        src={logoUrl}
        alt={name}
        className="max-h-full max-w-full object-contain"
        onError={() => setImageError(true)}
        loading="lazy"
      />
    </div>
  );
}
