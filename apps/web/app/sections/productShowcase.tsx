import Image from "next/image"


export const ProductShowcase = () => {
    return <section className="bg-gradient-to-b from-[#FFFFFF] to-[#D2DCFF] py-22">
        <div className="container">
            <div className="max-w-[540px] mx-auto">
            <div className="flex justify-center">
            <div className="text-sm inline-flex border border-[#222]/10px-3 py-1 rounded-md tracking-tight">Increase you client interactions with Monotron</div>
            </div>
            <h2 className="text-center text-4xl mt-5 font-bold tracking-tighter bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text">A more effective way to respond clients</h2>
            <p className="font-mono text-center text-[22px] leading-[30px] tracking-tight mt-5 font-bold tracking-tighter bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text">With our excellent AI calling feature you can easily progress sales</p>
            </div>
            <div className="flex justify-center mt-10">
            <Image src="/dashboardlogo.png" alt="Logo" width={1000} height={1000}/>
            </div>

        </div>
    </section>
}