
// This file provides Next.js-like functionality for Vite
// It's a compatibility layer for components that expect Next.js APIs

declare global {
  interface Window {
    __NEXT_DATA__: any;
  }
}

// Mock Next.js router for compatibility
export const useRouter = () => ({
  push: (url: string) => window.location.href = url,
  replace: (url: string) => window.location.replace(url),
  back: () => window.history.back(),
  forward: () => window.history.forward(),
  reload: () => window.location.reload(),
  pathname: window.location.pathname,
  query: {},
  asPath: window.location.pathname + window.location.search,
});

// Mock Next.js Image component
export const Image = ({ src, alt, ...props }: any) => {
  return <img src={src} alt={alt} {...props} />;
};

// Mock Next.js Link component  
export const Link = ({ href, children, ...props }: any) => {
  return <a href={href} {...props}>{children}</a>;
};

// Mock Next.js Head component
export const Head = ({ children }: any) => {
  return null; // In a real app, you might want to use react-helmet
};

export default {};
