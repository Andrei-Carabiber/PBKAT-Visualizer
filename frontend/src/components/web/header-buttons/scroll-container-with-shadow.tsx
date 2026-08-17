import { useState, useRef, useEffect, type ReactNode } from "react";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";

export const ScrollContainerWithShadow = ({ children, height = 70 }: { children: ReactNode, height?: number }) => {
    const [showTopShadow, setShowTopShadow] = useState(false);
    const [showBottomShadow, setShowBottomShadow] = useState(false);

    const topRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!topRef.current || !bottomRef.current) return;

        // shadcn/Radix UI places this attribute on the actual scrolling viewport.
        const viewport = bottomRef.current.closest('[data-radix-scroll-area-viewport]');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // If the top element is NOT visible, we've scrolled down -> show top shadow
                    if (entry.target === topRef.current) {
                        setShowTopShadow(!entry.isIntersecting);
                    }
                    // If the bottom element is NOT visible, there's more content -> show bottom shadow
                    if (entry.target === bottomRef.current) {
                        setShowBottomShadow(!entry.isIntersecting);
                    }
                });
            },
            {
                root: viewport,
                threshold: 0,
            }
        );

        observer.observe(topRef.current);
        observer.observe(bottomRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <div className="relative w-full">
            <div
                className={`absolute -top-px left-0 right-0 h-4 bg-linear-to-b from-background to-transparent z-10 pointer-events-none transition-opacity duration-300 ${
                    showTopShadow ? "opacity-100" : "opacity-0"
                }`}
            />

            <ScrollArea type="always" className="w-full pr-4" style={{ height: `${height}vh` }}>
                {/* Invisible target element at the very top */}
                <div ref={topRef} className="h-px w-full shrink-0" />

                {children}

                {/* Invisible target element at the very bottom */}
                <div ref={bottomRef} className="h-px w-full shrink-0" />
            </ScrollArea>

            <div
                className={`absolute -bottom-px left-0 right-0 h-4 bg-linear-to-t from-background to-transparent z-10 pointer-events-none transition-opacity duration-300 ${
                    showBottomShadow ? "opacity-100" : "opacity-0"
                }`}
            />
        </div>
    );
};