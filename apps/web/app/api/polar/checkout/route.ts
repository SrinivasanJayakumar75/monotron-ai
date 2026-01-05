import { Checkout } from "@polar-sh/nextjs";

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  successUrl: process.env.SUCCESS_URL,
  returnUrl: process.env.NEXT_PUBLIC_APP_URL + "/billing",
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
  theme: "dark",
});