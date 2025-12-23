"use client"

import { ArrowRight, MenuIcon } from "lucide-react"
import Image from "next/image"
import { HeroCTA } from "./herocta"

export const Hero = () => {
    return (
    <section 
    
    className="bg-cover bg-center bg-no-repeat min-h-screen"
    style={{ backgroundImage: "url('/herofront.png')"}}>
        
        {/* Header is now INSIDE the Hero section */}
        <header className="sticky top-0 backdrop-blur-sm z-20">
            <div className="flex justify-center items-center py-3 bg-black text-white text-sm">
                <div className="inline-flex gap-1 items-center">
                    <p>Get started for free</p>
                    <ArrowRight className="h-4 w-4 inline-flex justify-center items-center"/>
                </div>
            </div>
            <div className="py-3">
                <div className="container">
                    <div className="flex items-center justify-between">
                        <Image className="pl-2" src="/Sitelogo.png" alt="Logo" width={40} height={30}/>
                        <MenuIcon className="h-5 w-5 md:hidden"/>
                        <nav className="hidden md:flex gap-6 text-black/60 items-center">
                            <a href="#">Home</a>
                            <a href="#">Product</a> 
                            <a href="#">Resources</a>
                            <a href="#">Pricing</a>
                            <a href="#">View demo</a>
                            <HeroCTA />


                        </nav>
                    </div>
                </div>
            </div>
        </header>

        {/* Hero content */}
        <div className="container">
            <div className="pl-10 pt-20">
                <h1 className="text-7xl font-bold bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text tracking-tight">AI-Powered Agent.</h1>
                <p className="text-7xl mt-1 font-bold bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text tracking-tight">
                    Revolutionary Helpdesk Software.
                </p>
                <h1 className="text-7xl mt-1 font-bold bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text tracking-tight">
                    All-in-One Service Suite.
                </h1>
                <div className="flex gap-1 items-center mt-[30px] mb-2 pb-42">
                    <button className="relative inline-flex items-center justify-center rounded-md
         bg-black px-5 py-2 text-sm font-medium text-white
         transition-all duration-300
         before:absolute before:inset-0 before:rounded-md
         before:bg-gradient-to-r before:from-white/10 before:via-white/30 before:to-white/10
         before:opacity-0 hover:before:opacity-100
         before:blur
         hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]
         focus:outline-none focus:ring-1 focus:ring-white/20">
                        Get for free
                    </button>
                    <button className="relative inline-flex items-center justify-center rounded-md
         bg-orange-800 px-5 py-2 text-sm font-medium text-white
         transition-all duration-300
         before:absolute before:inset-0 before:rounded-md
         before:bg-gradient-to-r before:from-white/10 before:via-white/30 before:to-white/10
         before:opacity-0 hover:before:opacity-100
         before:blur
         hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]
         focus:outline-none focus:ring-1 focus:ring-white/20">
                        View demo
                    </button>
                </div>
            </div>
        </div>
        {/* <LogoTicker/> */}
    </section>
    )
}

// Remove the separate Header export if you're not using it elsewhere