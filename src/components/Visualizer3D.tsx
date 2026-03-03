import React, { useRef, useEffect } from 'react';

interface Visualizer3DProps {
    analyser: AnalyserNode | null;
    isPlaying: boolean;
    accentColor: string;
}

const applyOpacity = (color: string, opacity: number): string => {
    // If it's hex, add hex alpha
    if (color.startsWith('#')) {
        const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
        return `${color}${alpha}`;
    }
    // If it's rgb, convert to rgba
    if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    // Fallback/already rgba/hsl
    return color;
};

export default function Visualizer3D({ analyser, isPlaying, accentColor }: Visualizer3DProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        // Particle system
        const numParticles = 150;
        const particles: any[] = [];
        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2 + 1,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                baseAlpha: Math.random() * 0.5 + 0.1
            });
        }

        // Audio Data Array
        let dataArray = new Uint8Array(0);
        if (analyser) {
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        }

        let smoothBass = 0;

        const renderLoop = () => {
            ctx.clearRect(0, 0, width, height);

            // Subtle atmospheric background
            const gradient = ctx.createRadialGradient(width / 2, height, 0, width / 2, height, height * 1.5);
            gradient.addColorStop(0, applyOpacity(accentColor, 0.1)); // 10% opacity
            gradient.addColorStop(0.5, applyOpacity(accentColor, 0.02)); // 2% opacity
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            let bassFactor = 0;
            let midFactor = 0;

            if (analyser && isPlaying) {
                analyser.getByteFrequencyData(dataArray);

                // Calculate Bass (approx 20-250Hz)
                let bassSum = 0;
                const bassBins = Math.floor(dataArray.length * 0.1);
                for (let i = 0; i < bassBins; i++) {
                    bassSum += dataArray[i];
                }
                const currentBass = (bassBins > 0) ? bassSum / bassBins / 255 : 0; // Guard NaN

                // Calculate Mids (approx 250-2000Hz)
                let midSum = 0;
                for (let i = bassBins; i < bassBins * 4; i++) {
                    midSum += dataArray[i];
                }
                midFactor = (bassBins > 0) ? midSum / (bassBins * 3) / 255 : 0;

                // Smooth the bass jump
                smoothBass += (currentBass - smoothBass) * 0.15;
                bassFactor = smoothBass;
            } else {
                smoothBass += (0 - smoothBass) * 0.05;
                bassFactor = smoothBass;
            }

            // Guard against NaN in scale
            bassFactor = isNaN(bassFactor) ? 0 : bassFactor;
            midFactor = isNaN(midFactor) ? 0 : midFactor;

            ctx.fillStyle = accentColor;

            // Draw Particles
            particles.forEach((p, i) => {
                // Pulse radius based on mids/bass, add variance per particle
                const pScale = isPlaying ? 1 + (bassFactor * 3) + (midFactor * 1.5 * (i % 2 === 0 ? 1 : 0.5)) : 1;

                p.x += p.vx * (1 + bassFactor * 2);
                p.y -= (0.2 + p.vy + (bassFactor * 1.5)); // Float up

                // Screen Wrap
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;

                ctx.beginPath();
                ctx.globalAlpha = Math.min(1, p.baseAlpha + (bassFactor * 0.5));
                const radius = p.radius * pScale;
                if (!isNaN(radius) && radius > 0) {
                    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Draw subtle frequency wave at bottom
            if (analyser && isPlaying && dataArray.length > 0) {
                ctx.globalAlpha = 0.15;
                ctx.beginPath();
                ctx.moveTo(0, height);

                const step = width / (dataArray.length / 4); // Only draw lower quarter
                for (let i = 0; i < dataArray.length / 4; i++) {
                    const value = dataArray[i] / 255;
                    const y = height - (value * height * 0.3); // max 30% height
                    ctx.lineTo(i * step, y);
                }

                ctx.lineTo(width, height);
                ctx.closePath();
                ctx.fill();
            }

            ctx.globalAlpha = 1.0;
            requestRef.current = requestAnimationFrame(renderLoop);
        };

        requestRef.current = requestAnimationFrame(renderLoop);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [analyser, isPlaying, accentColor]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ mixBlendMode: 'screen' }}
        />
    );
}
