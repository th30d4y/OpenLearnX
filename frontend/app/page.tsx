import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Zap, LinkIcon, BookOpen, Code, Lightbulb, Star, Sparkles, Rocket } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Hero Section with Enhanced Animations */}
      <section className="relative w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-primary-blue via-purple-600 to-primary-purple text-white animate-fade-in overflow-hidden cursor-crosshair">
        {/* Enhanced Animated geometric shapes with more visual appeal */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-white rounded-full mix-blend-overlay animate-blob animation-delay-4000"></div>
          
          {/* New attractive geometric shapes */}
          <div className="absolute top-1/3 left-1/2 w-64 h-64 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full mix-blend-overlay animate-pulse opacity-30"></div>
          <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-gradient-to-l from-yellow-300 to-orange-300 rounded-full mix-blend-overlay animate-bounce opacity-20"></div>
          <div className="absolute top-3/4 left-1/4 w-80 h-80 bg-gradient-to-br from-blue-300 to-cyan-300 rounded-full mix-blend-overlay animate-float opacity-25"></div>
        </div>

        {/* Enhanced animated background elements with more interactions and visual effects */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white rounded-full animate-float hover:animate-bounce cursor-pointer transition-all duration-500 hover:scale-150 hover:opacity-30 hover:rotate-45 hover:bg-gradient-to-r hover:from-pink-300 hover:to-yellow-300"></div>
          <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-white rounded-full animate-float animate-delay-500 hover:animate-wiggle cursor-pointer transition-all duration-500 hover:scale-125 hover:opacity-40 hover:rotate-90 hover:bg-gradient-to-l hover:from-blue-300 hover:to-green-300"></div>
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-white rounded-full animate-float animate-delay-1000 hover:animate-pulse cursor-pointer transition-all duration-500 hover:scale-200 hover:opacity-20 hover:rotate-180"></div>
          <div className="absolute top-1/3 left-1/2 w-20 h-20 bg-white rounded-full animate-rotate-slow hover:animate-wiggle cursor-pointer transition-all duration-500 hover:scale-150 hover:animate-spin-slow"></div>
          <div className="absolute bottom-1/4 left-1/3 w-28 h-28 bg-white rounded-full animate-pulse-subtle hover:animate-bounce cursor-pointer transition-all duration-500 hover:scale-125 hover:shadow-2xl hover:shadow-white/50"></div>
          
          {/* Enhanced triangular shapes with gradient effects */}
          <div className="absolute top-1/5 right-1/5 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[35px] border-b-white animate-spin-slow hover:animate-bounce hover:border-b-yellow-300 cursor-pointer transition-all duration-700"></div>
          <div className="absolute bottom-1/3 right-2/3 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[25px] border-b-white animate-ping hover:animate-wiggle hover:border-b-pink-300 cursor-pointer transition-all duration-700"></div>
          
          {/* New visually attractive hexagon shapes */}
          <div className="absolute top-1/6 left-3/4 w-12 h-12 bg-gradient-to-r from-purple-300 to-pink-300 transform rotate-45 animate-spin-slow hover:animate-bounce cursor-pointer transition-all duration-700 opacity-60"></div>
          <div className="absolute bottom-1/5 left-1/5 w-8 h-8 bg-gradient-to-l from-cyan-300 to-blue-300 transform rotate-12 animate-pulse hover:animate-wiggle cursor-pointer transition-all duration-700 opacity-70"></div>
          
          {/* Animated diamond shapes */}
          <div className="absolute top-2/3 left-2/3 w-6 h-6 bg-gradient-to-br from-yellow-300 to-orange-300 transform rotate-45 animate-bounce hover:animate-spin cursor-pointer transition-all duration-500 opacity-50"></div>
          <div className="absolute top-1/5 left-1/6 w-10 h-10 bg-gradient-to-tr from-green-300 to-teal-300 transform rotate-45 animate-float hover:animate-pulse cursor-pointer transition-all duration-600 opacity-40"></div>
          
          {/* Glowing orbs with pulsing effect */}
          <div className="absolute top-1/2 left-1/6 w-20 h-20 bg-gradient-radial from-pink-400/50 to-transparent rounded-full animate-pulse hover:animate-ping cursor-pointer transition-all duration-500"></div>
          <div className="absolute bottom-1/3 right-1/5 w-16 h-16 bg-gradient-radial from-cyan-400/40 to-transparent rounded-full animate-bounce hover:animate-pulse cursor-pointer transition-all duration-600"></div>
          
          {/* Morphing blob shapes */}
          <div className="absolute top-3/5 right-3/5 w-24 h-16 bg-gradient-to-r from-purple-300/30 to-pink-300/30 rounded-full animate-morph hover:animate-wobble cursor-pointer transition-all duration-700"></div>
          <div className="absolute bottom-2/5 left-3/5 w-18 h-24 bg-gradient-to-l from-blue-300/25 to-cyan-300/25 rounded-full animate-morph-reverse hover:animate-wobble cursor-pointer transition-all duration-800"></div>
        </div>
        
        {/* Enhanced interactive particles with trail effects and new visual elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/6 left-1/6 w-2 h-2 bg-white rounded-full animate-pulse opacity-60 shadow-lg shadow-white/50"></div>
          <div className="absolute top-2/3 left-3/4 w-1 h-1 bg-white rounded-full animate-pulse animate-delay-300 opacity-40 shadow-md shadow-white/30"></div>
          <div className="absolute top-1/2 left-1/5 w-1.5 h-1.5 bg-white rounded-full animate-pulse animate-delay-700 opacity-50 shadow-lg shadow-white/40"></div>
          <div className="absolute top-3/4 right-1/6 w-1 h-1 bg-white rounded-full animate-bounce opacity-70 shadow-sm shadow-white/60"></div>
          <div className="absolute top-1/3 right-1/2 w-2 h-2 bg-white rounded-full animate-ping opacity-30 shadow-xl shadow-white/20"></div>
          
          {/* Enhanced floating sparkles with different sizes and animations */}
          <div className="absolute top-1/4 right-1/3 animate-float animate-delay-200">
            <Sparkles className="w-4 h-4 text-white opacity-60 animate-pulse" />
          </div>
          <div className="absolute bottom-1/4 left-1/4 animate-float animate-delay-800">
            <Star className="w-3 h-3 text-white opacity-50 animate-spin-slow" />
          </div>
          <div className="absolute top-1/5 left-2/5 animate-float animate-delay-1200">
            <Sparkles className="w-2 h-2 text-yellow-300 opacity-70 animate-ping" />
          </div>
          <div className="absolute bottom-1/5 right-2/5 animate-float animate-delay-1600">
            <Star className="w-5 h-5 text-pink-300 opacity-40 animate-pulse" />
          </div>
          
          {/* Constellation-like connected dots */}
          <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-white rounded-full opacity-60"></div>
          <div className="absolute top-1/3 left-1/3 w-1 h-1 bg-white rounded-full opacity-60"></div>
          <div className="absolute top-2/5 left-1/4 w-1 h-1 bg-white rounded-full opacity-60"></div>
          {/* Connecting lines for constellation effect */}
          <div className="absolute top-1/3 left-1/4 w-16 h-px bg-gradient-to-r from-white/30 to-transparent"></div>
          <div className="absolute top-1/3 left-1/4 w-px h-8 bg-gradient-to-b from-white/30 to-transparent"></div>
          
          {/* Floating geometric shapes as particles */}
          <div className="absolute top-1/8 right-1/8 w-3 h-3 border border-white/40 rotate-45 animate-spin-slow opacity-50"></div>
          <div className="absolute bottom-1/8 left-1/8 w-2 h-2 border border-white/30 rounded-full animate-pulse opacity-60"></div>
          <div className="absolute top-5/6 right-5/6 w-4 h-1 bg-white/30 animate-float opacity-40"></div>
          
          {/* Ripple effects */}
          <div className="absolute top-1/2 left-1/2 w-32 h-32 border border-white/10 rounded-full animate-ping opacity-20"></div>
          <div className="absolute top-1/4 right-1/4 w-24 h-24 border border-white/15 rounded-full animate-pulse opacity-25"></div>
          <div className="absolute bottom-1/4 left-1/4 w-40 h-40 border border-white/8 rounded-full animate-ping animate-delay-1000 opacity-15"></div>
        </div>
        
        <div className="container px-4 md:px-6 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Enhanced title with typing effect simulation */}
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl animate-slide-in-up text-shimmer hover:animate-glow cursor-default transition-all duration-700 hover:scale-105 hover:rotate-1 hover:tracking-widest relative">
              <span className="inline-block hover:animate-bounce hover:text-yellow-300 transition-all duration-300">O</span>
              <span className="inline-block hover:animate-bounce hover:text-pink-300 transition-all duration-300 animation-delay-100">p</span>
              <span className="inline-block hover:animate-bounce hover:text-blue-300 transition-all duration-300 animation-delay-200">e</span>
              <span className="inline-block hover:animate-bounce hover:text-green-300 transition-all duration-300 animation-delay-300">n</span>
              <span className="inline-block hover:animate-bounce hover:text-purple-300 transition-all duration-300 animation-delay-400">L</span>
              <span className="inline-block hover:animate-bounce hover:text-red-300 transition-all duration-300 animation-delay-500">e</span>
              <span className="inline-block hover:animate-bounce hover:text-indigo-300 transition-all duration-300 animation-delay-600">a</span>
              <span className="inline-block hover:animate-bounce hover:text-orange-300 transition-all duration-300 animation-delay-700">r</span>
              <span className="inline-block hover:animate-bounce hover:text-teal-300 transition-all duration-300 animation-delay-800">n</span>
              <span className="inline-block hover:animate-bounce hover:text-cyan-300 transition-all duration-300 animation-delay-900">X</span>
              <span className="ml-4 text-2xl">–</span>
              <span className="text-3xl sm:text-4xl md:text-5xl ml-2">Decentralized Adaptive Learning</span>
              
              {/* Animated underline */}
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse opacity-60"></div>
            </h1>
            
            <p className="text-lg md:text-xl animate-slide-in-up animate-delay-200 opacity-90 hover:opacity-100 transition-all duration-300 cursor-text hover:scale-105 hover:text-yellow-100 relative">
              Unlock your potential with AI-powered adaptive learning, coding practice, and blockchain-secured
              credentials.
              
              {/* Floating accent */}
              <div className="absolute -top-2 -right-2 animate-bounce animate-delay-1000">
                <Rocket className="w-5 h-5 opacity-70 animate-spin-slow" />
              </div>
            </p>
            
            <div className="flex flex-col gap-2 sm:flex-row justify-center animate-slide-in-up animate-delay-300">
              <Link href="/courses">
                <Button className="bg-white text-primary-purple hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-full shadow-lg btn-animated hover-lift hover-glow transform transition-all duration-300 group cursor-pointer hover:shadow-2xl hover:animate-bounce-in hover:scale-110 hover:rotate-3 hover:bg-gradient-to-r hover:from-white hover:to-gray-100 relative overflow-hidden">
                  {/* Button shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700"></div>
                  
                  <span className="group-hover:translate-x-1 transition-transform duration-200 group-hover:font-bold relative z-10">Start Learning</span>
                  <Zap className="ml-2 h-5 w-5 group-hover:rotate-12 group-hover:animate-pulse group-hover:text-yellow-500 transition-all duration-300 relative z-10" />
                  
                  {/* Floating particles on hover */}
                  <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300">
                    <div className="w-2 h-2 bg-primary-purple rounded-full"></div>
                  </div>
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Enhanced animated gradient overlay with dynamic effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-gradient opacity-30 hover:opacity-50 transition-opacity duration-500"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 animate-pulse"></div>
        
        {/* Enhanced animated wave effect at bottom with more visual appeal */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 dark:from-gray-900 via-transparent to-transparent opacity-80"></div>
        
        {/* Additional floating elements for visual richness */}
        <div className="absolute inset-0 opacity-5">
          {/* Animated grid pattern */}
          <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern animate-grid-float"></div>
          
          {/* Flowing lines */}
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-flow-right"></div>
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/15 to-transparent animate-flow-left"></div>
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent animate-flow-right animate-delay-1000"></div>
        </div>
      </section>

      {/* Features Section with Enhanced Size and Better Space Utilization */}
      <section className="w-full py-16 md:py-28 lg:py-36 bg-gray-50 dark:bg-gray-900 animate-fade-in animate-delay-500 relative overflow-hidden">
        {/* Enhanced background pattern animation with more visual elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-blue/10 via-transparent to-primary-purple/10 animate-gradient-slow"></div>
          
          {/* Additional floating background elements */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-radial from-purple-200/20 to-transparent rounded-full animate-float-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-radial from-blue-200/15 to-transparent rounded-full animate-float-slow animate-delay-2000"></div>
          <div className="absolute top-3/4 left-3/4 w-32 h-32 bg-gradient-radial from-pink-200/25 to-transparent rounded-full animate-pulse-subtle"></div>
          
          {/* Geometric pattern overlay */}
          <div className="absolute inset-0 bg-hex-pattern opacity-10 animate-pattern-shift"></div>
        </div>
        
        {/* Wider container for better space utilization */}
        <div className="max-w-8xl mx-auto px-6 md:px-8 lg:px-12 relative z-10">
          <div className="text-center mb-16 animate-slide-in-up animate-delay-700">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6 text-gradient hover:animate-wiggle cursor-default transition-all duration-500 hover:scale-105 relative">
              Powerful Features
              
              {/* Animated accent lines */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-primary-blue to-primary-purple animate-pulse"></div>
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-primary-purple to-primary-blue animate-pulse animate-delay-500"></div>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto hover:text-foreground transition-colors duration-300 cursor-text hover:scale-105 animate-fade-in animate-delay-1000">
              Discover the tools and technologies that make OpenLearnX the ultimate learning platform
            </p>
          </div>
          
          {/* Enhanced grid with larger cards and better spacing */}
          <div className="grid gap-10 md:gap-12 lg:gap-14 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 stagger-container">
            
            {/* Interactive Courses Card - Enhanced Size */}
            <Card className="bg-white shadow-xl rounded-2xl p-8 md:p-10 dark:bg-gray-800 dark:text-gray-100 card-interactive hover-lift group transform transition-all duration-500 hover:shadow-2xl border-0 hover:border-2 hover:border-primary/30 cursor-pointer hover:rotate-1 hover:-translate-y-4 animate-slide-in-left animate-delay-300 relative overflow-hidden min-h-[320px] md:min-h-[360px]">
              {/* Card background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              
              <CardHeader className="flex flex-col items-center text-center space-y-6 pb-6 relative z-10">
                <div className="p-4 bg-primary-blue/10 rounded-2xl group-hover:bg-primary-blue/20 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 cursor-pointer group-hover:shadow-2xl group-hover:shadow-primary-blue/30">
                  <BookOpen className="h-12 w-12 md:h-14 md:w-14 text-primary-blue group-hover:scale-125 group-hover:animate-pulse transition-all duration-500" />
                  
                  {/* Floating sparkle effect */}
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300">
                    <Sparkles className="w-4 h-4 text-primary-blue" />
                  </div>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold group-hover:text-primary-blue transition-all duration-500 group-hover:tracking-wide cursor-pointer group-hover:translate-y-1">
                  Interactive Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-all duration-300 relative z-10 group-hover:translate-y-2 text-center text-lg leading-relaxed">
                Engage with rich multimedia content, track your progress, and master new subjects at your own pace with our comprehensive learning platform.
              </CardContent>
              
              {/* Hover shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 rounded-2xl"></div>
            </Card>

            {/* Coding Practice Card - Enhanced Size */}
            <Card className="bg-white shadow-xl rounded-2xl p-8 md:p-10 dark:bg-gray-800 dark:text-gray-100 card-interactive hover-lift group transform transition-all duration-500 hover:shadow-2xl border-0 hover:border-2 hover:border-primary/30 cursor-pointer hover:-rotate-1 hover:-translate-y-4 animate-slide-in-up animate-delay-500 relative overflow-hidden min-h-[320px] md:min-h-[360px]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              
              <CardHeader className="flex flex-col items-center text-center space-y-6 pb-6 relative z-10">
                <div className="p-4 bg-primary-purple/10 rounded-2xl group-hover:bg-primary-purple/20 transition-all duration-500 group-hover:-rotate-12 group-hover:scale-110 cursor-pointer group-hover:shadow-2xl group-hover:shadow-primary-purple/30 relative">
                  <Code className="h-12 w-12 md:h-14 md:w-14 text-primary-purple group-hover:scale-125 group-hover:animate-bounce transition-all duration-500" />
                  
                  {/* Code brackets animation */}
                  <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-300 text-primary-purple font-bold text-lg">{'<'}</div>
                  <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-300 text-primary-purple font-bold text-lg">{'>'}</div>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold group-hover:text-primary-purple transition-all duration-500 group-hover:tracking-wide cursor-pointer group-hover:translate-y-1">
                  LeetCode-Style Coding Practice
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-all duration-300 relative z-10 group-hover:translate-y-2 text-center text-lg leading-relaxed">
                Sharpen your coding skills with interactive problems, instant feedback, and a built-in code editor designed for optimal learning.
              </CardContent>
              
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 rounded-2xl"></div>
            </Card>

            {/* Advanced Quiz Platform Card - Enhanced Size */}
            <Card className="bg-white shadow-xl rounded-2xl p-8 md:p-10 dark:bg-gray-800 dark:text-gray-100 card-interactive hover-lift group transform transition-all duration-500 hover:shadow-2xl border-0 hover:border-2 hover:border-primary/30 cursor-pointer hover:rotate-1 hover:-translate-y-4 animate-slide-in-right animate-delay-700 relative overflow-hidden min-h-[320px] md:min-h-[360px]">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              
              <CardHeader className="flex flex-col items-center text-center space-y-6 pb-6 relative z-10">
                <div className="p-4 bg-primary-blue/10 rounded-2xl group-hover:bg-yellow-500/20 transition-all duration-500 group-hover:rotate-45 group-hover:scale-110 cursor-pointer group-hover:shadow-2xl group-hover:shadow-yellow-500/30 relative">
                  <Lightbulb className="h-12 w-12 md:h-14 md:w-14 text-primary-blue group-hover:scale-125 group-hover:animate-pulse-subtle transition-all duration-500 group-hover:text-yellow-500" />
                  
                  {/* Lightbulb glow effect */}
                  <div className="absolute inset-0 bg-yellow-400 rounded-2xl opacity-0 group-hover:opacity-20 group-hover:animate-ping transition-all duration-500"></div>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold group-hover:text-yellow-600 transition-all duration-500 group-hover:tracking-wide cursor-pointer group-hover:translate-y-1">
                  Advanced Quiz Platform
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-all duration-300 relative z-10 group-hover:translate-y-2 text-center text-lg leading-relaxed">
                Test your knowledge with timed multiple-choice quizzes, detailed explanations, and comprehensive performance tracking analytics.
              </CardContent>
              
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-yellow-300/10 to-transparent transition-transform duration-1000 rounded-2xl"></div>
            </Card>

            {/* AI-powered Learning Card - Enhanced Size */}
            <Card className="bg-white shadow-xl rounded-2xl p-8 md:p-10 dark:bg-gray-800 dark:text-gray-100 card-interactive hover-lift group transform transition-all duration-500 hover:shadow-2xl border-0 hover:border-2 hover:border-primary/30 cursor-pointer hover:-rotate-1 hover:-translate-y-4 animate-slide-in-left animate-delay-900 relative overflow-hidden min-h-[320px] md:min-h-[360px]">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              
              <CardHeader className="flex flex-col items-center text-center space-y-6 pb-6 relative z-10">
                <div className="p-4 bg-primary-purple/10 rounded-2xl group-hover:bg-pink-500/20 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 cursor-pointer group-hover:shadow-2xl group-hover:shadow-pink-500/30 relative">
                  <Brain className="h-12 w-12 md:h-14 md:w-14 text-primary-purple group-hover:scale-125 group-hover:animate-glow transition-all duration-500 group-hover:text-pink-500" />
                  
                  {/* Neural network visualization */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute top-1 left-1 w-2 h-2 bg-pink-400 rounded-full animate-ping animation-delay-100"></div>
                    <div className="absolute bottom-1 right-1 w-2 h-2 bg-pink-400 rounded-full animate-ping animation-delay-300"></div>
                    <div className="absolute top-1/2 right-1 w-2 h-2 bg-pink-400 rounded-full animate-ping animation-delay-500"></div>
                  </div>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold group-hover:text-pink-600 transition-all duration-500 group-hover:tracking-wide cursor-pointer group-hover:translate-y-1">
                  AI-powered Adaptive Learning
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-all duration-300 relative z-10 group-hover:translate-y-2 text-center text-lg leading-relaxed">
                Our platform intelligently adjusts content and question difficulty based on your performance, ensuring optimal learning outcomes.
              </CardContent>
              
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-pink-300/10 to-transparent transition-transform duration-1000 rounded-2xl"></div>
            </Card>

            {/* Blockchain Credentials Card - Enhanced Size */}
            <Card className="bg-white shadow-xl rounded-2xl p-8 md:p-10 dark:bg-gray-800 dark:text-gray-100 card-interactive hover-lift group transform transition-all duration-500 hover:shadow-2xl border-0 hover:border-2 hover:border-primary/30 cursor-pointer hover:rotate-1 hover:-translate-y-4 animate-slide-in-up animate-delay-1100 relative overflow-hidden min-h-[320px] md:min-h-[360px]">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              
              <CardHeader className="flex flex-col items-center text-center space-y-6 pb-6 relative z-10">
                <div className="p-4 bg-primary-blue/10 rounded-2xl group-hover:bg-green-500/20 transition-all duration-500 group-hover:-rotate-45 group-hover:scale-110 cursor-pointer group-hover:shadow-2xl group-hover:shadow-green-500/30 relative">
                  <LinkIcon className="h-12 w-12 md:h-14 md:w-14 text-primary-blue group-hover:scale-125 group-hover:rotate-180 transition-all duration-700 group-hover:text-green-500" />
                  
                  {/* Chain link animation */}
                  <div className="absolute -top-3 -left-3 opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-300">
                    <div className="w-3 h-3 border-2 border-green-500 rounded-full"></div>
                  </div>
                  <div className="absolute -bottom-3 -right-3 opacity-0 group-hover:opacity-100 group-hover:animate-bounce animation-delay-200 transition-all duration-300">
                    <div className="w-3 h-3 border-2 border-green-500 rounded-full"></div>
                  </div>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold group-hover:text-green-600 transition-all duration-500 group-hover:tracking-wide cursor-pointer group-hover:translate-y-1">
                  Blockchain-secured Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-all duration-300 relative z-10 group-hover:translate-y-2 text-center text-lg leading-relaxed">
                Your achievements are secured on the blockchain, providing verifiable and tamper-proof records that employers trust.
              </CardContent>
              
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-green-300/10 to-transparent transition-transform duration-1000 rounded-2xl"></div>
            </Card>

            {/* Personalized Dashboard Card - Enhanced Size - Spans full width on smaller screens */}
            <Card className="bg-white shadow-xl rounded-2xl p-8 md:p-10 dark:bg-gray-800 dark:text-gray-100 card-interactive hover-lift group transform transition-all duration-500 hover:shadow-2xl border-0 hover:border-2 hover:border-primary/30 cursor-pointer hover:-rotate-1 hover:-translate-y-4 animate-slide-in-right animate-delay-1300 relative overflow-hidden min-h-[320px] md:min-h-[360px] md:col-span-2 lg:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
              
              <CardHeader className="flex flex-col items-center text-center space-y-6 pb-6 relative z-10">
                <div className="p-4 bg-primary-purple/10 rounded-2xl group-hover:bg-yellow-300/20 transition-all duration-500 group-hover:rotate-180 group-hover:scale-110 cursor-pointer group-hover:shadow-2xl group-hover:shadow-yellow-300/30 relative">
                  <Zap className="h-12 w-12 md:h-14 md:w-14 text-primary-purple group-hover:scale-125 group-hover:animate-glow transition-all duration-500 group-hover:text-yellow-500" />
                  
                  {/* Electric effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-0 left-1/2 w-px h-3 bg-yellow-400 animate-pulse"></div>
                    <div className="absolute bottom-0 left-1/2 w-px h-3 bg-yellow-400 animate-pulse animation-delay-200"></div>
                    <div className="absolute left-0 top-1/2 w-3 h-px bg-yellow-400 animate-pulse animation-delay-400"></div>
                    <div className="absolute right-0 top-1/2 w-3 h-px bg-yellow-400 animate-pulse animation-delay-600"></div>
                  </div>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold group-hover:text-yellow-600 transition-all duration-500 group-hover:tracking-wide cursor-pointer group-hover:translate-y-1">
                  Personalized Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-all duration-300 relative z-10 group-hover:translate-y-2 text-center text-lg leading-relaxed">
                Track your progress, identify strengths and weaknesses, and visualize your learning journey with intuitive analytics.
              </CardContent>
              
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-yellow-300/10 to-transparent transition-transform duration-1000 rounded-2xl"></div>
            </Card>
          </div>
        </div>
      </section>

      {/* Enhanced Call-to-Action Section with more dynamic effects */}
      <section className="w-full py-16 bg-gradient-to-br from-primary-blue/5 via-purple-500/5 to-primary-purple/5 animate-fade-in animate-delay-1000 hover:from-primary-blue/10 hover:via-purple-500/10 hover:to-primary-purple/10 transition-all duration-700 cursor-default relative overflow-hidden">
        {/* Enhanced animated background pattern with more visual elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-blue to-transparent animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-primary-purple to-transparent animate-pulse animate-delay-500"></div>
          
          {/* Additional decorative elements */}
          <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-gradient-to-r from-primary-blue/20 to-transparent rounded-full animate-ping"></div>
          <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-gradient-to-l from-primary-purple/20 to-transparent rounded-full animate-pulse animate-delay-700"></div>
          <div className="absolute bottom-1/3 left-1/3 w-4 h-4 bg-gradient-to-br from-purple-400/20 to-transparent rounded-full animate-bounce"></div>
        </div>
        
        <div className="container px-4 md:px-6 text-center relative z-10">
          <div className="max-w-2xl mx-auto space-y-6 animate-slide-in-up animate-delay-300">
            <h3 className="text-2xl font-bold tracking-tight sm:text-3xl hover:animate-pulse cursor-default transition-all duration-500 hover:scale-105 hover:text-primary relative">
              Ready to Transform Your Learning Journey?
              
              {/* Floating question mark */}
              <div className="absolute -top-2 -right-6 animate-bounce animate-delay-1000 opacity-60">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">?</div>
              </div>
            </h3>
            
            <p className="text-lg text-muted-foreground hover:text-foreground transition-all duration-300 cursor-text hover:scale-105 animate-fade-in animate-delay-500">
              Join thousands of learners who are already experiencing the future of education
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-in-up animate-delay-700">
              <Link href="/courses">
                <Button className="btn-animated hover-lift hover-glow px-8 py-3 text-lg font-semibold cursor-pointer hover:shadow-2xl hover:animate-wiggle transform transition-all duration-500 hover:scale-110 hover:rotate-1 relative overflow-hidden group">
                  {/* Ripple effect */}
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 group-hover:animate-ping transition-all duration-300 rounded-lg"></div>
                  
                  <span className="group-hover:tracking-wider transition-all duration-300 relative z-10">Explore Courses</span>
                  
                  {/* Trailing sparkles */}
                  <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </Button>
              </Link>
              
              <Link href="/coding">
                <Button variant="outline" className="btn-animated hover-lift px-8 py-3 text-lg font-semibold border-2 hover:border-primary cursor-pointer hover:shadow-xl hover:animate-bounce transform transition-all duration-500 hover:scale-110 hover:-rotate-1 hover:bg-primary hover:text-primary-foreground relative overflow-hidden group">
                  {/* Slide-in background */}
                  <div className="absolute inset-0 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                  
                  <span className="group-hover:tracking-wider transition-all duration-300 relative z-10">Try Coding Practice</span>
                  
                  {/* Code symbol animation */}
                  <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-300 text-xs font-bold relative z-10">
                    {'</>'}
                  </div>
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Enhanced floating action elements */}
        <div className="absolute top-1/4 left-1/4 animate-float animate-delay-2000 opacity-20">
          <div className="w-8 h-8 border-2 border-primary rotate-45"></div>
        </div>
        <div className="absolute bottom-1/4 right-1/4 animate-float animate-delay-3000 opacity-20">
          <div className="w-6 h-6 bg-primary-purple rounded-full"></div>
        </div>
        <div className="absolute top-1/2 right-1/6 animate-pulse opacity-15">
          <div className="w-12 h-12 border border-primary-blue rounded-full"></div>
        </div>
        <div className="absolute bottom-1/6 left-1/6 animate-bounce opacity-25">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 transform rotate-45"></div>
        </div>
      </section>
    </div>
  )
}
