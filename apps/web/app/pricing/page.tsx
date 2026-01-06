"use client";

import { Button } from "@workspace/ui/components/button";
import { Check } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

const plans = [
  {
    name: "Starter",
    price: "Free plan",
    description: "Perfect for individuals and small projects",
    features: [
      "Dashboard Chatting",
      "Human to human chat only",
      "Send Email to Customers"
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$4",
    period: "/month",
    description: "For growing teams and businesses",
    features: [
      "AI Response",
      "AI Voice Calling Feature",
      "Escalate Feature for Human Chat",
      "Team collaboration",
      "Knowledge Base",
      "Dashboard Chatting",
      "Human to human chat",
      "Send Email to Customers"
    ],
    cta: "Start Now",
    popular: true,
  }
];

const Pricing = () => {
  const { isSignedIn } = useUser();
  return (
    <>
      {/* Hero */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        <div className="container px-6 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-up">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24">
        <div className="container px-6">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? "bg-gradient-to-b from-primary/10 to-card border-primary/50 shadow-lg"
                    : "bg-card border-border"
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-gradient-to-r from-primary to-[hsl(35_95%_55%)] text-primary-foreground text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                 <Link href={isSignedIn ? "/conversations" : "/sign-up"} className="block">
                  <Button
                    variant={plan.popular ? "destructive" : "outline"}
                    className="w-full"
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-16 bg-card/30">
        <div className="container px-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Have Questions?</h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help you find the perfect plan for your needs.
          </p>
          <Link href="mailto:monotron.contact@gmail.com">
          <Button variant="destructive" size="lg">
            Contact Support
          </Button>
          </Link>
        </div>
      </section>
    </>  

  );
};

export default Pricing;
