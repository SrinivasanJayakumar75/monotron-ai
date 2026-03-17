"use client"

import { useState } from "react"
import { ArrowRight, ChevronDown, Cpu, Layers, LibraryBigIcon, MenuIcon, Plug, X } from "lucide-react"
import Image from "next/image"
import { HeroCTA } from "./herocta"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

const productItems = [
  { name: "Platform", description: "All-in-one solution", icon: Layers, path: "/pricing" },
  { name: "AI ChatBot", description: "Smart automation tools", icon: Cpu, path: "/pricing" },
  { name: "Integrations", description: "Scalable infrastructure", icon: Plug, path: "/pricing" },
  { name: "Knowledge Base", description: "Enterprise protection", icon: LibraryBigIcon, path: "/pricing" },
]

export const Hero = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <section
      className="bg-cover bg-center bg-no-repeat min-h-screen"
      style={{ backgroundImage: "url('/herofront.png')" }}
    >
      <header className="sticky top-0 backdrop-blur-sm z-20">
        {/* Announcement bar */}
        <div className="flex justify-center items-center py-3 bg-black text-white text-xs sm:text-sm px-4 text-center">
          <div className="inline-flex gap-1 items-center">
            <p>Get started for free click signup</p>
            <ArrowRight className="h-4 w-4 inline-flex justify-center items-center" />
          </div>
        </div>

        {/* Nav bar */}
        <div className="py-3">
          <div className="container px-4">
            <div className="flex items-center justify-between">
              <Image src="/Sitelogo.png" alt="Logo" width={40} height={30} />

              {/* Hamburger */}
              <button
                className="md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </button>

              {/* Desktop nav */}
              <nav className="hidden md:flex gap-6 text-black/60 items-center">
                <Link href="/" className="hover:text-black transition-colors">Home</Link>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-black/60 hover:text-black transition-colors duration-300 outline-none">
                    Product
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 bg-white border-gray-200" align="start">
                    <DropdownMenuLabel className="text-black/60">Products</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-200" />
                    {productItems.map((item) => (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link
                          href={item.path}
                          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-orange-50 flex items-center justify-center flex-shrink-0">
                            <item.icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-black">{item.name}</div>
                            <div className="text-xs text-black/60">{item.description}</div>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Link href="/about" className="hover:text-black transition-colors">About</Link>
                <Link href="/integ" className="hover:text-black transition-colors">Integration</Link>
                <Link href="/pricing" className="hover:text-black transition-colors">Pricing</Link>
                <HeroCTA />
              </nav>
            </div>
          </div>

          {/* Mobile nav drawer */}
          {mobileOpen && (
            <nav className="md:hidden flex flex-col gap-4 px-6 py-5 border-t border-gray-100 text-black/70 text-sm">
              <Link href="/" onClick={() => setMobileOpen(false)} className="hover:text-black">Home</Link>
              <div className="flex flex-col gap-2">
                <span className="font-medium text-black/40 text-xs uppercase tracking-wider">Product</span>
                {productItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 pl-2 hover:text-black"
                  >
                    <item.icon className="w-4 h-4 text-blue-600" />
                    {item.name}
                  </Link>
                ))}
              </div>
              <Link href="/about" onClick={() => setMobileOpen(false)} className="hover:text-black">About</Link>
              <Link href="/integ" onClick={() => setMobileOpen(false)} className="hover:text-black">Integration</Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="hover:text-black">Pricing</Link>
              <div className="pt-2">
                <HeroCTA />
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Hero content */}
      <div className="container">
        <div className="px-4 sm:px-6 md:pl-10 pt-12 md:pt-20">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text tracking-tight">
            AI-Powered Agent.
          </h1>
          <p className="text-3xl sm:text-5xl md:text-7xl mt-1 font-bold bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text tracking-tight">
            Revolutionary Helpdesk Software.
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-7xl mt-1 font-bold bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text tracking-tight">
            All-in-One Service Suite.
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-8 mb-8">
            <HeroCTA />
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
    </section>
  )
}