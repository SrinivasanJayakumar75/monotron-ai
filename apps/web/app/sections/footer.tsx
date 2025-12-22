import Image from "next/image"

export const Footer = () => {
    return <footer className="bg-black text-[#BCBCBC] text-sm py-10 text-center">
        <div className="container">
            <div className="inline-flex relative">
            <Image src="/Sitelogo.png" alt="Logo" width={40} height={30}/>
            </div>
            <nav className="flex flex-col md:flex-row justify-center gap-4 mt-4">
                <a href="#">Company</a>
                <a href="#">Product</a>
                <a href="#">Pricing</a>
                <a href="#">Contact Sales</a>   
                <a href="#">Features</a>
                <a href="#">Help</a>
                <a href="#">Customers</a>
            </nav>
            <div className="flex justify-center gap-4 mt-4">
                <Image src="logos7.svg" alt="Logo" width={20} height={20}/>
                <Image src="logos8.svg" alt="Logo" width={20} height={20}/>
            </div>
            <p className="mt-4">&copy; 2025 Monotron, Inc. All rights reserved.</p>

        </div>
    </footer>
}