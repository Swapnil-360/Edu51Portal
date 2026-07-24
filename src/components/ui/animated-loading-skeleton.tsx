import React, { useEffect, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'

// Interface for grid configuration structure
interface GridConfig {
    numCards: number // Total number of cards to display
    cols: number // Number of columns in the grid
    xBase: number // Base x-coordinate for positioning
    yBase: number // Base y-coordinate for positioning
    xStep: number // Horizontal step between cards
    yStep: number // Vertical step between cards
}

const AnimatedLoadingSkeleton = () => {
    const [windowWidth, setWindowWidth] = useState(0) // State to store window width for responsiveness
    const controls = useAnimation() // Controls for Framer Motion animations

    // Dynamically calculates grid configuration based on window width
    const getGridConfig = (width: number): GridConfig => {
        const numCards = 6 // Fixed number of cards
        const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1 // Set columns based on screen width
        return {
            numCards,
            cols,
            xBase: 40, // Starting x-coordinate
            yBase: 60, // Starting y-coordinate
            xStep: width >= 1024 ? 330 : width >= 640 ? 300 : 0, // Horizontal spacing
            yStep: 180 // Vertical spacing
        }
    }

    // Generates random animation paths for the search icon
    const generateSearchPath = (config: GridConfig) => {
        const { numCards, cols, xBase, yBase, xStep, yStep } = config
        const rows = Math.ceil(numCards / cols) // Calculate rows based on cards and columns
        let allPositions = []

        // Generate grid positions for cards
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if ((row * cols + col) < numCards) {
                    allPositions.push({
                        x: xBase + (col * xStep),
                        y: yBase + (row * yStep)
                    })
                }
            }
        }

        // Shuffle positions to create random animations
        const numRandomCards = Math.min(allPositions.length, 4)
        const shuffledPositions = allPositions
            .sort(() => Math.random() - 0.5)
            .slice(0, numRandomCards)

        if (shuffledPositions.length > 0) {
            // Ensure loop completion by adding the starting position
            shuffledPositions.push(shuffledPositions[0])
        }

        return {
            x: shuffledPositions.map(pos => pos.x),
            y: shuffledPositions.map(pos => pos.y),
            scale: Array(shuffledPositions.length).fill(1.2),
            transition: {
                duration: Math.max(shuffledPositions.length * 2, 4),
                repeat: Infinity, // Loop animation infinitely
                ease: [0.4, 0, 0.2, 1], // Ease function for smooth animation
                times: shuffledPositions.map((_, i) => i / (shuffledPositions.length - 1))
            }
        }
    }

    // Handles window resize events and updates the window width
    useEffect(() => {
        setWindowWidth(window.innerWidth)
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Updates animation path whenever the window width changes
    useEffect(() => {
        const config = getGridConfig(windowWidth)
        controls.start(generateSearchPath(config))
    }, [windowWidth, controls])

    // Variants for frame animations
    const frameVariants = {
        hidden: { opacity: 0, scale: 0.98 }, // Initial state (hidden)
        visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } } // Transition to visible state
    }

    // Variants for individual card animations
    const cardVariants = {
        hidden: { y: 15, opacity: 0 }, // Initial state (off-screen)
        visible: (i: number) => ({ // Animate based on card index
            y: 0,
            opacity: 1,
            transition: { delay: i * 0.08, duration: 0.3 } // Staggered animation
        })
    }

    // Glow effect variants for the search icon
    const glowVariants = {
        animate: {
            boxShadow: [
                "0 0 15px rgba(30, 157, 241, 0.15)",
                "0 0 25px rgba(30, 157, 241, 0.3)",
                "0 0 15px rgba(30, 157, 241, 0.15)"
            ],
            scale: [1, 1.08, 1], // Pulsating effect
            transition: {
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut" // Smooth pulsation
            }
        }
    }

    const config = getGridConfig(windowWidth) // Get current grid configuration

    return (
        <motion.div
            className="w-full max-w-5xl mx-auto p-4 pt-6 bg-transparent"
            variants={frameVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="relative overflow-hidden rounded-xl">
                {/* Search icon with animation */}
                <motion.div
                    className="absolute z-10 pointer-events-none hidden sm:block"
                    animate={controls}
                    style={{ left: 24, top: 24 }}
                >
                    <motion.div
                        className="bg-[#1e9df1]/10 p-3 rounded-full backdrop-blur-sm border border-[#1e9df1]/20 shadow-lg"
                        variants={glowVariants}
                        animate="animate"
                    >
                        <svg
                            className="w-6 h-6 text-[#1e9df1]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </motion.div>
                </motion.div>

                {/* Grid of animated cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(config.numCards)].map((_, i) => (
                        <motion.div
                            key={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            custom={i} // Index-based animation delay
                            whileHover={{ scale: 1.01 }} // Slight scale on hover
                            className="rounded-xl border p-4 flex flex-col justify-between overflow-hidden bg-white dark:bg-[#17181c] border-slate-200 dark:border-[#2f3336]/50 shadow-sm"
                        >
                            {/* Top details with avatar */}
                            <div className="flex items-start gap-3">
                                {/* Avatar placeholder */}
                                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-800/80 animate-pulse" />

                                {/* Detail lines placeholders */}
                                <div className="flex-1 min-w-0">
                                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800/80 rounded mb-2 animate-pulse" />
                                    <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800/80 rounded mb-1.5 animate-pulse" />
                                    <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
                                </div>
                            </div>

                            {/* Skills/Tags placeholders */}
                            <div className="flex flex-wrap gap-1.5 mt-4">
                                <div className="h-5 w-12 rounded-full bg-slate-100 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 animate-pulse" />
                                <div className="h-5 w-16 rounded-full bg-slate-100 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 animate-pulse" />
                                <div className="h-5 w-10 rounded-full bg-slate-100 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 animate-pulse" />
                            </div>

                            {/* Bottom row placeholders (mentorship badge & button) */}
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#2f3336]/30 flex items-center justify-between gap-2">
                                <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800/80 animate-pulse" />
                                <div className="h-8 w-24 rounded-lg bg-slate-200 dark:bg-slate-800/80 animate-pulse ml-auto" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

export default AnimatedLoadingSkeleton
