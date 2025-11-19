import Image from "next/image";
import Link from "next/link";
import React from 'react';
import { Activity, Brain, Users, Zap, TrendingUp, RotateCw } from 'lucide-react';

interface BenefitCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgColor: string;
  iconBgColor: string;
}

const benefitCards: BenefitCard[] = [
  {
    icon: <Activity className="w-6 h-6" />,
    title: 'Manage Anxiety',
    description: 'Learn techniques to calm racing thoughts, reduce worry, and regain control when anxiety strikes.',
    bgColor: 'bg-emerald-50',
    iconBgColor: 'bg-emerald-200',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'CBT Techniques',
    description: 'Practice cognitive behavioral therapy methods to identify and reframe negative thought patterns.',
    bgColor: 'bg-purple-50',
    iconBgColor: 'bg-purple-200',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Depression Support',
    description: 'Get compassionate support and practical strategies to navigate difficult emotions and low mood.',
    bgColor: 'bg-blue-50',
    iconBgColor: 'bg-blue-200',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Stress Management',
    description: 'Develop healthy coping mechanisms and relaxation techniques to handle life\'s challenges.',
    bgColor: 'bg-orange-50',
    iconBgColor: 'bg-orange-200',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Build Coping Skills',
    description: 'Learn evidence-based skills from DBT and other therapies to improve emotional regulation.',
    bgColor: 'bg-cyan-50',
    iconBgColor: 'bg-cyan-200',
  },
  {
    icon: <RotateCw className="w-6 h-6" />,
    title: '24/7 Availability',
    description: 'Access support anytime, day or night, without waiting for appointments or scheduling.',
    bgColor: 'bg-yellow-50',
    iconBgColor: 'bg-yellow-200',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-12 pt-12 bg-brandPrimary">
      <header className="flex items-center justify-between mb-16 ">
        <nav className="flex items-center gap-8 text-sm font-bold">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/about" className="hover:underline">About</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/signup"className="inline-block bg-textSecondary text-white px-6 py-2 shadow-lg
          rounded-full transition-shadow duration-200 hover:shadow-xl shadow-textSecondary/40">
            Sign Up
          </Link>
          <Link href="/login"className="inline-block bg-textSecondary text-white px-6 py-2 shadow-lg
          rounded-full shadow-md transition-shadow duration-200 hover:shadow-xl shadow-textSecondary/40">
            Login
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex items-center gap-12">
        <div className="w-1/2">
          <h1 className="text-4xl font-bold leading-tight">
            AI Therapist
          </h1>

          <h2 className="text-6xl font-bold leading-tight mt-1 text-textPrimary">
            Online Mental
          </h2>
          <h2 className="text-6xl font-bold leading-tight mt-1 text-textSecondary">
            Health Support
          </h2>

          <p className="mt-4 max-w-md text-muted-foreground">
            Chat with our AI therapist 24/7.
            <br />
            Private, Secure and always Available.
          </p>

          <div className="mt-8">
            <Link href="/login" className="inline-block bg-white text-textPrimary px-8 py-4 
            rounded-2xl shadow-lg font-semibold">
              Start Chat
            </Link>
          </div>
        </div>

        <div className="w-1/2 flex justify-end">
          <div className="w-[540px] h-[320px] rounded-2xl overflow-hidden shadow-lg relative">
            <Image
              src="/hero.png"
              alt="Hero"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
       
      </section>     
     
      <section className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] 
      bg-background py-20 mt-32 flex px-6">
        <div className="w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                
                {/* Left: Image */}
                <div className="flex justify-center items-center">
                    <div className="w-full max-w-md h-80 rounded-3xl overflow-hidden shadow-lg">
                        <img 
                            src="/hero-2.png" 
                            alt="AI Therapy" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Right: Content */}      
                <div className="w-full">
                    <h1 className="text-3xl font-bold text-gray-700 mb-2">AI Therapist</h1>
                    <p className="text-md text-gray-600 mb-10 leading-relaxed">
                        Use our AI therapist chatbot for comprehensive mental health support and guidance.
                    </p>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                        
                        {/* Feature 1: Encrypted */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-yellow-100">
                                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" 
                                              strokeLinejoin="round" 
                                              strokeWidth="2" 
                                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 
                                              2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z">     
                                        </path>
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-700 text-base">Encrypted</h3>
                                <p className="text-gray-600 text-sm mt-1">All of your data is encrypted to HIPAA standards.</p>
                            </div>
                        </div>

                        {/* Feature 2: Find Therapy */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" 
                                              strokeLinejoin="round" 
                                              strokeWidth="2" 
                                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 
                                              4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-700 text-base">Find Therapy</h3>
                                <p className="text-gray-600 text-sm mt-1">Find professional therapy results.</p>
                            </div>
                        </div>

                        {/* Feature 3: Personalized Care */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-teal-100">
                                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-700 text-base">Personalized Care</h3>
                                <p className="text-gray-600 text-sm mt-1">Therapy tailored to your unique needs.</p>
                            </div>
                        </div>

                        {/* Feature 4: 24/7 Chat */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" 
                                              strokeLinejoin="round" 
                                              strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-700 text-base">24/7 Chat</h3>
                                <p className="text-gray-600 text-sm mt-1">Chat with the AI counselor at anytime.</p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
      </section>

      <section className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-white py-20 flex px-6">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-3xl font-bold text-gray-700 mb-4">
              How our AI Therapist Helps You
            </h2>
            <p className="text-lg text-gray-600">
              Evidence-based therapeutic techniques, available whenever you need support
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="w-full flex justify-center">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefitCards.map((benefit, index) => (
              <div
                key={index}
                className={`${benefit.bgColor} rounded-2xl p-6 shadow-sm hover:shadow-md 
                transition-shadow duration-300`}
              >
                {/* Icon and Title */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${benefit.iconBgColor} w-12 h-12 rounded-full flex 
                  items-center justify-center flex-shrink-0`}>
                    <div className="text-gray-700">
                      {benefit.icon}
                    </div>
                  </div>
                  <h3 className="text-md font-semibold text-gray-700">
                    {benefit.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-xs leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>


    </main>
  );
}