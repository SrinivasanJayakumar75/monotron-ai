"use client"

import * as React from "react"
import { Provider } from "jotai";
import {ConvexProvider,ConvexReactClient} from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function Providers({ children }: { children: React.ReactNode }) {
  if (!convex) {
    // Avoid crashing static build when the public Convex URL is missing.
    return <Provider>{children}</Provider>;
  }

  return (
    <ConvexProvider client={convex}>
      <Provider>
      {children}
      </Provider>
      </ConvexProvider>
  );
}
