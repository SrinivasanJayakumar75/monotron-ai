"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function IntegCTA() {
  const { isSignedIn } = useUser();

  return (
    <Link href={isSignedIn ? "/conversations" : "/sign-up"} className="block">
      <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
        Get Started Now
      </button>
    </Link>
  );
}
