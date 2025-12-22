"use client";

import Image from "next/image";
import {motion} from "framer-motion"

export const LogoTicker = () => {
    return <div className="py-8 md:py-8 mt-4">
        <div className="container">
            <div className="flex justify-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black,transparent)]">
            <motion.div className="flex gap-14 flex-none pr-14" animate={{
                translateX: "-50%",

            }}
            transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop",
            }}
            >
                <Image src="logos1.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos2.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos3.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos4.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos5.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos6.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos7.svg" alt="Logo" width={30} height={30}/>
                <Image src="logos8.svg" alt="Logo" width={30} height={30}/>
                <Image src="logos1.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos2.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos3.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos4.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos5.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos6.svg" alt="Logo" width={100} height={100}/>
                <Image src="logos7.svg" alt="Logo" width={30} height={30}/>
                <Image src="logos8.svg" alt="Logo" width={30} height={30}/>
            </motion.div>
            </div>

        </div>

    </div>
}