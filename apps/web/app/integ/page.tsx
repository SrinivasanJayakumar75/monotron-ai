"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";


export default function IntegrationPage() {
    const { isSignedIn } = useUser();
  const steps = [
    {
      number: 1,
      title: "Create Your Account",
      description: "Sign up and set up your organization to get started."
    },
    {
      number: 2,
      title: "Get Integration Script",
      description: "Navigate to integrations and copy your unique script."
    },
    {
      number: 3,
      title: "Activate AI Chat",
      description: "Visit billing to unlock your AI chat feature."
    },
    {
      number: 4,
      title: "Build Knowledge Base",
      description: "Create and upload your product knowledge base for intelligent responses."
    }
  ];

  return (
    <section className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Quick Integration
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get your AI-powered chat up and running in just four simple steps
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              {/* Step Number Badge */}
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">{step.number}</span>
              </div>

              {/* Content */}
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Decorative Element */}
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-tl-full opacity-20"></div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
            <Link href={isSignedIn ? "/conversations" : "/sign-up"} className="block">
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
            Get Started Now
          </button>
          </Link>
        </div>
      </div>
    </section>
  );
}