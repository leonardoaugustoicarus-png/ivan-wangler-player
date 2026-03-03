import React, { useState, useEffect } from 'react';
import { Music2 } from 'lucide-react';

interface CoverImageProps {
    blob?: Blob | null;
    url?: string;
    className?: string;
    alt?: string;
}

/**
 * A memory-efficient component that manages the lifecycle of a Blob URL.
 * It creates a URL only when needed and revokes it when unmounted.
 */
export default function CoverImage({ blob, url, className, alt = "" }: CoverImageProps) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        // If we have a blob, manage its URL lifecycle
        if (blob) {
            const newUrl = URL.createObjectURL(blob);
            setObjectUrl(newUrl);

            return () => {
                URL.revokeObjectURL(newUrl);
                setObjectUrl(null);
            };
        }

        // If we only have a string URL, just use it
        setObjectUrl(url || null);
        return () => { };
    }, [blob, url]);

    if (!objectUrl) {
        return (
            <div className={`${className} bg-white/5 flex items-center justify-center`}>
                <Music2 size={24} className="text-white/20" />
            </div>
        );
    }

    return (
        <img
            src={objectUrl}
            alt={alt}
            className={`${className} object-cover`}
            onError={(e) => {
                // Fallback for broken blob URLs
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                    parent.classList.add('flex', 'items-center', 'justify-center', 'bg-white/5');
                    // Add a simple icon or text
                    parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white/20"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
                }
            }}
        />
    );
}
