"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export const HeroCTA = () => {
  const { isSignedIn } = useUser();

  return (
    <Link
      href={isSignedIn ? "/conversations" : "/sign-up"}
      className="relative inline-flex items-center justify-center rounded-md
        bg-black px-5 py-2 text-sm font-medium text-white mr-2
        transition-all duration-300
        hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
    >
      {isSignedIn ? "Go to Dashboard" : "Sign Up"}
    </Link>
  );
};
