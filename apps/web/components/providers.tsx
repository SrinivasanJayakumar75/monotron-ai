"use client"

import * as React from "react"

import {ConvexReactClient} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth} from '@clerk/nextjs'

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export function Providers({ children }: { children: React.ReactNode }) {
  // Avoid constructing Convex client with an empty URL during build/prerender.
  const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

  return (
    <>
      {convex ? (
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      ) : (
        children
      )}
    </>
  );
}
