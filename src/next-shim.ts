
// This file provides shims for Next.js APIs that don't exist in Vite
// to prevent build errors when using components that reference Next.js

// Mock Next.js Image component
export const Image = ({ src, alt, ...props }: any) => {
  return <img src={src} alt={alt} {...props} />;
};

// Mock Next.js Link component  
export const Link = ({ href, children, ...props }: any) => {
  return <a href={href} {...props}>{children}</a>;
};

// Mock Next.js router
export const useRouter = () => ({
  push: (url: string) => window.location.href = url,
  replace: (url: string) => window.location.replace(url),
  back: () => window.history.back(),
  pathname: window.location.pathname,
  query: {},
  asPath: window.location.pathname + window.location.search,
});

// Mock Next.js head
export const Head = ({ children }: any) => {
  return null; // In a real app, you'd use react-helmet or similar
};

export default {};
