"use client"

import * as React from "react"
import { Provider } from "jotai";
import {ConvexProvider,ConvexReactClient} from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export function Providers({ children }: { children: React.ReactNode }) {
  // During Vercel builds, env vars can be missing for preview environments.
  // Avoid constructing Convex clients with an empty/invalid URL (prerender crashes).
  const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

  return (
    <Provider>
      {convex ? <ConvexProvider client={convex}>{children}</ConvexProvider> : children}
    </Provider>
  );
}
