import { ArrowRight, MenuIcon } from "lucide-react"
import Image from "next/image"


export const Header = () => {
    return (
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
            <Image className="pl-2" src="logo.svg" alt="Logo" width={40} height={30}/>
            <MenuIcon className="h-5 w-5 md:hidden"/>
            <nav className="hidden md:flex gap-6 text-black/60 items-center">
                <a href="#">Home</a>
                <a href="#">Product</a> 
                <a href="#">Resources</a>
                <a href="#">Pricing</a>
                <a href="#">View demo</a>
                <button className="bg-black text-white px-4 py-1 mr-2 rounded-lg inline-flex align-items justify-center tracking-tight">Sign Up</button>
            </nav>
            </div>
            </div>
        </div>
        </header>
    )
}