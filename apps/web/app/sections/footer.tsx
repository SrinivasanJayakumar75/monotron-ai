import Image from "next/image"
import Link from "next/link"

export const Footer = () => {
    return <footer className="bg-black text-[#BCBCBC] text-sm py-10 text-center">
        <div className="container">
            <div className="inline-flex relative">
            <Image src="/Sitelogo.png" alt="Logo" width={40} height={30}/>
            </div>
            <nav className="flex flex-col md:flex-row justify-center gap-4 mt-4">
                <Link href="/about" className="transition-colors">About</Link>
                <Link href="/pricing" className="transition-colors">Product</Link>
                <Link href="/pricing" className="transition-colors">Pricing</Link>
                <Link href="mailto:monotron.contact@gmail.com">Contact</Link>
            </nav>
            <div className="flex justify-center gap-4 mt-4">
                <Link href="https://www.linkedin.com/in/srinivasan-jayakumar-61961928b/" target="_blank" rel="noopener noreferrer">
                    <Image src="/linkedinlogo.png" alt="LinkedIn" width={50} height={50}/>
                </Link>
            </div>
            <p className="mt-4">&copy; 2025 Monotron</p>

        </div>
    </footer>
}