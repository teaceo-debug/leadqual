'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo, LogoIcon } from '@/components/logo'
import {
  Zap,
  Target,
  Bell,
  BarChart3,
  Users,
  Webhook,
  ArrowRight,
  CheckCircle,
  XCircle,
  Play,
  ChevronDown,
  Sparkles,
  Shield,
  Moon,
  FileDown,
  Settings,
  Clock,
  TrendingUp,
  Star,
  Twitter,
  Linkedin,
  Github,
} from 'lucide-react'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
}

// Animated counter hook
function useCounter(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    let startTime: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
  }, [isInView, target, duration])

  return { count, ref }
}

// Section wrapper with fade-in animation
function AnimatedSection({ children, className = '', delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeInUp}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// Data
const problems = [
  { icon: Clock, text: 'Manual lead qualification wastes hours every day' },
  { icon: XCircle, text: 'Inconsistent scoring leads to missed opportunities' },
  { icon: TrendingUp, text: 'High-value leads slip through the cracks' },
]

const solutions = [
  { icon: Zap, text: 'AI analyzes and scores leads in seconds' },
  { icon: Target, text: 'Consistent ICP-based scoring every time' },
  { icon: CheckCircle, text: 'Prioritized pipeline, better conversions' },
]

const steps = [
  {
    number: '01',
    title: 'Define Your ICP',
    description: 'Set your ideal customer criteria with weighted attributes like company size, industry, and budget.',
    icon: Target,
  },
  {
    number: '02',
    title: 'Capture Leads',
    description: 'Embed our forms on your site or connect integrations to automatically capture lead data.',
    icon: Users,
  },
  {
    number: '03',
    title: 'AI Scores Automatically',
    description: 'Each lead gets a score from 0-100 with detailed reasoning explaining the qualification.',
    icon: Sparkles,
  },
  {
    number: '04',
    title: 'Prioritize & Close',
    description: 'Focus on hot leads first, respond faster, and close more deals with confidence.',
    icon: TrendingUp,
  },
]

const features = [
  {
    title: 'AI Scoring Engine',
    description: 'Our AI analyzes 20+ data points per lead to deliver accurate qualification scores.',
    icon: Sparkles,
    size: 'large',
    visual: 'gauge',
  },
  {
    title: 'ICP Configuration',
    description: 'Define exactly what makes your ideal customer with custom weighted criteria.',
    icon: Settings,
    size: 'medium-tall',
  },
  {
    title: 'Real-time Dashboard',
    description: 'See your entire pipeline at a glance with live analytics and trends.',
    icon: BarChart3,
    size: 'medium-wide',
  },
  {
    title: 'Email Notifications',
    description: 'Get instant alerts for hot leads.',
    icon: Bell,
    size: 'small',
  },
  {
    title: 'CSV Export',
    description: 'Export your data anytime.',
    icon: FileDown,
    size: 'small',
  },
  {
    title: 'Dark Mode',
    description: 'Easy on the eyes, always.',
    icon: Moon,
    size: 'small',
  },
  {
    title: 'API Access',
    description: 'Coming soon',
    icon: Webhook,
    size: 'small',
    comingSoon: true,
  },
]

const stats = [
  { value: 3, suffix: 'x', label: 'faster lead response time' },
  { value: 85, suffix: '%', label: 'accuracy in qualification' },
  { value: 2, suffix: 'hrs', label: 'saved per day on average' },
]

const testimonials = [
  {
    quote: "LeadScores transformed our sales process. We went from spending hours qualifying leads to focusing on the ones that actually convert.",
    author: 'Sarah Chen',
    title: 'VP of Sales',
    company: 'TechCorp',
    rating: 5,
  },
  {
    quote: "The AI scoring is incredibly accurate. It's like having a senior sales rep pre-qualifying every lead before it hits our CRM.",
    author: 'Michael Torres',
    title: 'Sales Director',
    company: 'GrowthLab',
    rating: 5,
  },
  {
    quote: "We reduced our lead response time by 70% and increased our conversion rate by 45%. Game changer for our team.",
    author: 'Emily Watson',
    title: 'Head of Revenue',
    company: 'ScaleUp Inc',
    rating: 5,
  },
]

const faqs = [
  {
    question: 'How does the AI scoring work?',
    answer: 'Our AI analyzes each lead against your defined Ideal Customer Profile (ICP). It evaluates attributes like company size, industry, job title, budget indicators, and more to generate a score from 0-100 with detailed reasoning.',
  },
  {
    question: 'Can I customize the scoring criteria?',
    answer: 'Absolutely! You can define and weight each criterion based on what matters most to your business. Set minimum company sizes, target industries, required job titles, and more.',
  },
  {
    question: 'What integrations do you support?',
    answer: 'We offer real-time webhooks that integrate with any tool including Slack, Zapier, and your CRM. Native integrations with Salesforce, HubSpot, and Pipedrive are on our roadmap.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. We use industry-standard encryption for data at rest and in transit. Your lead data is never shared with third parties or used to train our models.',
  },
  {
    question: 'What happens after the free trial?',
    answer: 'After your 14-day trial, you can choose a plan that fits your needs. All your leads and settings are preserved. No credit card required to start.',
  },
]

const footerLinks = {
  Product: ['Features', 'Pricing', 'Integrations', 'API Docs'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy', 'Terms', 'Security'],
  Resources: ['Help Center', 'Guides', 'Webinars', 'Changelog'],
}

// Company logos for social proof (placeholder SVGs)
const companyLogos = [
  'Acme Corp',
  'TechGiant',
  'InnovateCo',
  'GrowthLabs',
  'ScaleUp',
  'FutureTech',
]

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'glass border-b border-border/50'
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="group">
            <Logo size="md" className="transition-transform group-hover:scale-105" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Testimonials
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="btn-glow">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 md:pt-40 md:pb-32 hero-gradient overflow-hidden">
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="container mx-auto px-4"
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary mb-6"
              >
                <Sparkles className="h-4 w-4" />
                Powered by AI
              </motion.div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Qualify B2B leads{' '}
                <span className="gradient-text">instantly</span>{' '}
                with AI
              </h1>

              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
                Stop wasting time on unqualified leads. LeadScores uses AI to score and
                prioritize your inbound leads based on your Ideal Customer Profile.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="btn-glow gap-2 text-base">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="gap-2 text-base">
                    <Play className="h-4 w-4" />
                    Watch Demo
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                No credit card required &bull; 5 minute setup
              </p>
            </motion.div>

            {/* Right: Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <div className="relative">
                {/* Glow effect behind card */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-success/20 blur-3xl opacity-50" />

                <Card className="relative bg-card/80 backdrop-blur border-border/50 shadow-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold">Recent Leads</h3>
                      <span className="text-xs text-muted-foreground">Live</span>
                    </div>

                    <div className="space-y-4">
                      {/* Hot Lead */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-success/10 border border-success/20 score-hot"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success font-bold text-lg">
                            85
                          </div>
                          <div>
                            <p className="font-medium">Sarah Chen</p>
                            <p className="text-sm text-muted-foreground">VP Sales at TechCorp</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-success/20 text-success text-xs font-semibold uppercase tracking-wider">
                          Hot
                        </span>
                      </motion.div>

                      {/* Warm Lead */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-warning/10 border border-warning/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20 text-warning font-bold text-lg">
                            62
                          </div>
                          <div>
                            <p className="font-medium">Mike Johnson</p>
                            <p className="text-sm text-muted-foreground">Marketing Manager</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-warning/20 text-warning text-xs font-semibold uppercase tracking-wider">
                          Warm
                        </span>
                      </motion.div>

                      {/* Cold Lead */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground font-bold text-lg">
                            28
                          </div>
                          <div>
                            <p className="font-medium">John Doe</p>
                            <p className="text-sm text-muted-foreground">Student</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-muted-foreground/20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          Cold
                        </span>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Social Proof Bar */}
      <AnimatedSection className="py-12 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Trusted by sales teams at fast-growing companies
          </p>
          <div className="relative overflow-hidden">
            <div className="flex gap-12 animate-scroll-left">
              {[...companyLogos, ...companyLogos].map((logo, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 text-2xl font-bold text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Problem → Solution */}
      <AnimatedSection className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            {/* Problem */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 border border-destructive/20 px-4 py-1.5 text-sm font-medium text-destructive mb-6">
                <XCircle className="h-4 w-4" />
                The Problem
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-8">
                Manual lead qualification is broken
              </h2>
              <div className="space-y-4">
                {problems.map((problem, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    className="flex items-start gap-4 p-4 rounded-xl bg-muted/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive flex-shrink-0">
                      <problem.icon className="h-5 w-5" />
                    </div>
                    <p className="text-muted-foreground pt-2">{problem.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Solution */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-success/10 border border-success/20 px-4 py-1.5 text-sm font-medium text-success mb-6">
                <CheckCircle className="h-4 w-4" />
                The Solution
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-8">
                AI-powered scoring that just works
              </h2>
              <div className="space-y-4">
                {solutions.map((solution, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    className="flex items-start gap-4 p-4 rounded-xl bg-success/5 border border-success/10"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success flex-shrink-0">
                      <solution.icon className="h-5 w-5" />
                    </div>
                    <p className="pt-2">{solution.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* How It Works */}
      <AnimatedSection id="how-it-works" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">How it works</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Get up and running in minutes, not days. Four simple steps to transform your lead qualification.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex gap-6 pb-12 last:pb-0"
              >
                {/* Timeline line */}
                {i < steps.length - 1 && (
                  <div className="absolute left-6 top-14 bottom-0 w-px bg-border" />
                )}

                {/* Step number */}
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0 relative z-10">
                  <step.icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="pt-1">
                  <span className="text-sm font-medium text-primary">{step.number}</span>
                  <h3 className="text-xl font-semibold mt-1">{step.title}</h3>
                  <p className="text-muted-foreground mt-2">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Features Bento Grid */}
      <AnimatedSection id="features" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Everything you need</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features to capture, qualify, and manage leads efficiently.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {/* Large card - AI Scoring */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="col-span-2 row-span-2"
            >
              <Card className="h-full card-glow hover:border-primary/30 transition-colors">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">AI Scoring Engine</h3>
                  <p className="text-muted-foreground mt-2 flex-grow">
                    Our AI analyzes 20+ data points per lead to deliver accurate qualification scores with detailed reasoning.
                  </p>
                  {/* Visual: Gauge */}
                  <div className="mt-6 flex justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-muted"
                        />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          initial={{ strokeDasharray: '0 251.2' }}
                          whileInView={{ strokeDasharray: '213.5 251.2' }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="hsl(var(--primary))" />
                            <stop offset="100%" stopColor="hsl(var(--success))" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">85</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Medium tall - ICP Config */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="col-span-1 row-span-2"
            >
              <Card className="h-full card-glow hover:border-primary/30 transition-colors">
                <CardContent className="p-5 h-full flex flex-col">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                    <Settings className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">ICP Configuration</h3>
                  <p className="text-sm text-muted-foreground mt-2 flex-grow">
                    Define exactly what makes your ideal customer.
                  </p>
                  {/* Mini sliders visual */}
                  <div className="mt-4 space-y-3">
                    {['Company Size', 'Industry', 'Budget'].map((label, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="text-primary">{[80, 60, 90][i]}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${[80, 60, 90][i]}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Medium wide - Dashboard */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="col-span-1 row-span-2"
            >
              <Card className="h-full card-glow hover:border-primary/30 transition-colors">
                <CardContent className="p-5 h-full flex flex-col">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Real-time Dashboard</h3>
                  <p className="text-sm text-muted-foreground mt-2 flex-grow">
                    See your pipeline at a glance.
                  </p>
                  {/* Mini chart visual */}
                  <div className="mt-4 flex items-end justify-between gap-1 h-20">
                    {[40, 65, 45, 80, 55, 70, 85].map((height, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 bg-primary/20 rounded-t"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + i * 0.05, duration: 0.4 }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Small cards */}
            {[
              { icon: Bell, title: 'Email Alerts', desc: 'Instant notifications' },
              { icon: FileDown, title: 'CSV Export', desc: 'Export anytime' },
              { icon: Moon, title: 'Dark Mode', desc: 'Easy on the eyes' },
              { icon: Webhook, title: 'API Access', desc: 'Coming soon', comingSoon: true },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <Card className={`h-full card-glow hover:border-primary/30 transition-colors ${feature.comingSoon ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                      <feature.icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Stats Bar */}
      <AnimatedSection className="py-16 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {stats.map((stat, i) => {
              const { count, ref } = useCounter(stat.value)
              return (
                <div key={i} ref={ref} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold gradient-text stats-number">
                    {count}{stat.suffix}
                  </div>
                  <p className="text-muted-foreground mt-2">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </AnimatedSection>

      {/* Testimonials */}
      <AnimatedSection id="testimonials" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Loved by sales teams</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              See why leading companies trust LeadScores to qualify their leads.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {testimonials.map((testimonial, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="h-full card-glow hover:border-primary/30 transition-all hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {testimonial.author[0]}
                      </div>
                      <div>
                        <p className="font-medium">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.title}, {testimonial.company}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* FAQ */}
      <AnimatedSection id="faq" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Frequently asked questions</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about LeadScores.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="faq-trigger w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                    data-state={openFaq === i ? 'open' : 'closed'}
                  >
                    <span className="font-medium pr-4">{faq.question}</span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </button>
                  <motion.div
                    initial={false}
                    animate={{
                      height: openFaq === i ? 'auto' : 0,
                      opacity: openFaq === i ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 text-muted-foreground">
                      {faq.answer}
                    </div>
                  </motion.div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Final CTA */}
      <AnimatedSection className="py-20 md:py-32 cta-gradient text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold">
              Ready to close more deals?
            </h2>
            <p className="mt-6 text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
              Join hundreds of sales teams using LeadScores to prioritize their pipeline and convert more leads.
            </p>
            <div className="mt-10">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold">
                  Start Your Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm opacity-80">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                SOC 2 Compliant
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                GDPR Ready
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                256-bit SSL
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="py-16 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
            {/* Logo & tagline */}
            <div className="col-span-2">
              <Link href="/" className="mb-4 inline-block">
                <Logo size="md" />
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs">
                AI-powered lead qualification for B2B sales teams. Focus on the leads that matter.
              </p>
              <div className="flex gap-4 mt-6">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Github className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="font-semibold mb-4">{category}</h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} LeadScores. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
