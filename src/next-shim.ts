
// This file provides compatibility shims for Next.js APIs that don't exist in Vite/React

// Mock Image component for Next.js compatibility
export const Image = ({ src, alt, width, height, className, ...props }: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  [key: string]: any;
}) => {
  return (
    <img 
      src={src} 
      alt={alt} 
      width={width} 
      height={height} 
      className={className}
      {...props}
    />
  );
};

// Mock Link component for Next.js compatibility
export const Link = ({ href, children, className, ...props }: {
  href: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => {
  return (
    <a 
      href={href} 
      className={className}
      {...props}
    >
      {children}
    </a>
  );
};

// Mock useRouter for Next.js compatibility
export const useRouter = () => {
  return {
    push: (url: string) => {
      window.location.href = url;
    },
    replace: (url: string) => {
      window.location.replace(url);
    },
    back: () => {
      window.history.back();
    },
    pathname: window.location.pathname,
    query: {},
    asPath: window.location.pathname + window.location.search
  };
};

// Mock router object
export const router = {
  push: (url: string) => {
    window.location.href = url;
  },
  replace: (url: string) => {
    window.location.replace(url);
  },
  back: () => {
    window.history.back();
  }
};

// Export all mocks
export default {
  Image,
  useRouter,
  router,
  Link
};
