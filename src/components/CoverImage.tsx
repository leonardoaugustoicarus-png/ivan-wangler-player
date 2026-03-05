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
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
        if (blob) {
            try {
                const newUrl = URL.createObjectURL(blob);
                setObjectUrl(newUrl);
                return () => URL.revokeObjectURL(newUrl);
            } catch (e) {
                console.warn('Failed to create object URL:', e);
                setHasError(true);
            }
        }
        setObjectUrl(url || null);
        return () => { };
    }, [blob, url]);

    if (!objectUrl || hasError) {
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
            onError={() => setHasError(true)}
        />
    );
}
