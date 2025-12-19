export const Hero = () => {
    return (
    <section>
        <div className="container">
            <div className="pl-10">
                <h1 className="text-7xl mt-6 font-bold bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text tracking-tight">The #1 AI Agent.</h1>
                <p className="text-7xl mt-1 font-bold bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text tracking-tight">
                    The Next generation Helpdesk.
                </p>
                <h1 className="text-7xl mt-1 font-bold bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text tracking-tight">
                    One Seamless Service Suite.
                </h1>
                <div className="flex gap-1 items-center mt-[30px] mb-28">
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
         bg-gray-600 px-5 py-2 text-sm font-medium text-white
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
    </section>)
    
}