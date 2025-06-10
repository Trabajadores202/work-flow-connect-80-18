
// This file provides compatibility shims for Next.js APIs that don't exist in Vite/React

// Mock useTheme hook for next-themes compatibility
export const useTheme = () => ({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
  themes: ['light', 'dark', 'system'],
  systemTheme: 'light'
});

// Mock Image component
import React from 'react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export const Image: React.FC<ImageProps> = ({ src, alt, className, ...props }) => {
  return <img src={src} alt={alt} className={className} {...props} />;
};

// Mock router
export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  back: () => {},
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/'
});

export const useSearchParams = () => ({
  get: () => null,
  getAll: () => [],
  has: () => false,
  forEach: () => {},
  toString: () => ''
});

export const usePathname = () => '/';

// Mock next/link
export const Link = ({ href, children, ...props }: any) => {
  return <a href={href} {...props}>{children}</a>;
};

// Export default object for compatibility
export default {
  useTheme,
  Image,
  useRouter,
  useSearchParams,
  usePathname,
  Link
};
