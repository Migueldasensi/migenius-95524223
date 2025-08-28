import { useEffect } from "react";

interface SeoProps {
  title: string;
  description: string;
  canonicalPath: string;
}

const Seo = ({ title, description, canonicalPath }: SeoProps) => {
  useEffect(() => {
    document.title = title;

    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", description);
    document.head.appendChild(meta);

    const linkCanonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    linkCanonical.setAttribute("rel", "canonical");
    linkCanonical.setAttribute("href", window.location.origin + canonicalPath);
    document.head.appendChild(linkCanonical);
  }, [title, description, canonicalPath]);

  return null;
};

export default Seo;
