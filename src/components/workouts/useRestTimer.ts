"use client";

import { useState, useEffect, useCallback } from "react";

export function useRestTimer() {
    const [isRunning, setIsRunning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const defaultDuration = 120; // 2 minutes for Rehab default

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning && remainingSeconds > 0) {
            interval = setInterval(() => {
                setRemainingSeconds((prev) => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, remainingSeconds]);

    const start = useCallback((seconds: number = defaultDuration) => {
        setRemainingSeconds(seconds);
        setIsRunning(true);
    }, [defaultDuration]);

    const skip = useCallback(() => {
        setIsRunning(false);
        setRemainingSeconds(0);
    }, []);

    const adjust = useCallback((delta: number) => {
        setRemainingSeconds((prev) => Math.max(0, prev + delta));
    }, []);

    return {
        isRunning,
        remainingSeconds,
        defaultDuration,
        start,
        skip,
        adjust,
    };
}
