import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 'md', text = '', color = 'primary' }) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-14 h-14 border-[3px]',
    xl: 'w-20 h-20 border-4',
  };

  const colorMap = {
    primary: 'border-primary-400',
    white: 'border-white',
    gray: 'border-gray-400',
  };

  // For larger sizes, show a more elaborate loader
  if (size === 'lg' || size === 'xl') {
    return (
      <div className="flex flex-col items-center justify-center gap-5">
        <div className="relative">
          {/* Outer glow ring */}
          <motion.div
            className={`${size === 'xl' ? 'w-24 h-24' : 'w-16 h-16'} rounded-full absolute -inset-1`}
            style={{ 
              background: color === 'white' 
                ? 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)' 
                : 'conic-gradient(from 0deg, transparent, rgba(29,158,117,0.15), transparent)' 
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          {/* Main spinner */}
          <div
            className={`${sizeMap[size]} ${colorMap[color]} rounded-full animate-spin relative`}
            style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}
          />
        </div>
        {text && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-sm font-medium ${color === 'white' ? 'text-white/80' : 'text-gray-500'}`}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizeMap[size]} ${colorMap[color]} rounded-full animate-spin`}
        style={{ borderTopColor: 'transparent' }}
      />
      {text && (
        <p className="text-gray-500 text-sm font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
}
