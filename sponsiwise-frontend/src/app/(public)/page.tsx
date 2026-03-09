'use client';

import React, { useState } from 'react';
import {
  
  Search,
  Target,
  ShieldCheck,
  Zap,
  Globe,
  ArrowRight,
  Menu,
  X,
  Star,
  
  Briefcase,
  Trophy,
  Sparkles,
  Shield,
  Building2,
  FileText,
  Lock,
  MessageSquare,
  Check,
  Download,
  Eye,
  Settings,
  Headphones,
  UserCheck,
  Send,
 
  
  Calendar,
  Ticket,
  EyeOff,
  Plus,
  ArrowLeft,
  PieChart,
  BadgeCheck
} from 'lucide-react';
import EventCard from '@/components/homePageCom/EventCard';
import Logo from '@/components/logo/logo';


{/* all links in it will refer to the login page except the login page */}

const handleRegister = ()=>{
  window.location.href = '/register';
}

const handleLogin = ()=>{
  window.location.href = '/login';
}


const App = () => {
  const [view, setView] = useState('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
            
            <Logo />

            
          </div>
          
          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => handleRegister()} className="text-sm font-bold text-slate-500 hover:text-indigo-600">Join as Brand</button>
            <button onClick={() => handleRegister()} className="text-sm font-bold text-slate-500 hover:text-indigo-600">For Organizers</button>
            <button onClick={() => handleLogin()}

            className="px-6 py-3 bg-slate-900 text-white rounded-full font-bold text-sm hover:scale-105 transition-all">Login</button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 py-4 px-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <button onClick={() => handleRegister()} className="text-sm font-bold text-slate-500 hover:text-indigo-600 py-2 text-left">Join as Brand</button>
              <button onClick={() => handleRegister()} className="text-sm font-bold text-slate-500 hover:text-indigo-600 py-2 text-left">For Organizers</button>
              <button onClick={() => handleLogin()} className="px-6 py-3 bg-slate-900 text-white rounded-full font-bold text-sm hover:scale-105 transition-all">Login</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 sm:pt-40 pb-12 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 sm:mb-8 border border-indigo-100">
            <ShieldCheck className="w-3 h-3" /> The Marketplace for Giants
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[7.5rem] font-black tracking-tighter mb-6 sm:mb-8 leading-[0.9] sm:leading-[0.85] text-slate-900">
            Partner. Curate. <br /> <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">Command Culture.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 sm:mb-16 font-medium leading-relaxed px-2">
            The world's only high-trust ecosystem where global brands partner with verified event organizers. Hand-managed by Sponsiwise Concierge.
          </p>
        </div>
      </section>

      {/* Main Offering Hub */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 sm:pb-32">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
         
          {/* Offering 1: Event Listings */}
          <div className="group relative bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
            <div className="flex justify-between items-start mb-8 sm:mb-12">
              <div>
                <div className="w-12 sm:w-14 h-12 sm:h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                  <Ticket className="text-indigo-600 w-6 sm:w-7 h-6 sm:h-7" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-3 sm:mb-4 text-slate-900">Event Listings</h3>
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                  Browse a curated directory of high-tier festivals, summits, and elite sports. One-click interest.
                </p>
              </div>
              <div className="bg-indigo-600 text-white p-3 sm:p-4 rounded-2xl shadow-xl shadow-indigo-100">
                <Search className="w-5 sm:w-6 h-5 sm:h-6" />
              </div>
            </div>
           
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-10 opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700">
              <div className="h-24 sm:h-32 bg-slate-100 rounded-2xl p-4 flex flex-col justify-end">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Mumbai</p>
                <p className="text-xs font-bold">Lollapalooza 2025</p>
              </div>
              <div className="h-24 sm:h-32 bg-indigo-900 rounded-2xl p-4 flex flex-col justify-end text-white">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Delhi</p>
                <p className="text-xs font-bold">Zomato Concert</p>
              </div>
            </div>

            <button onClick={() => handleRegister()} className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors">
              Enter Marketplace <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Offering 2: IP Curation */}
          <div className="group relative bg-slate-900 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-indigo-600/20 blur-[100px] pointer-events-none"></div>
           
            <div className="flex justify-between items-start mb-8 sm:mb-12 relative z-10">
              <div>
                <div className="w-12 sm:w-14 h-12 sm:h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                  <Sparkles className="text-indigo-400 w-6 sm:w-7 h-6 sm:h-7" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-3 sm:mb-4 text-white">IP Curation Lab</h3>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                  Don't just partner. Create. We help brands architect and own proprietary IPs from scratch.
                </p>
              </div>
              <div className="rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Logo variant="light" size={32} />
              </div>
            </div>

            <div className="space-y-3 mb-8 sm:mb-10 relative z-10">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span className="text-xs font-bold text-white">Turnkey Logistics Managed</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                <span className="text-xs font-bold text-white">Legal & Compliance Shield</span>
              </div>
            </div>

            <button onClick={() => handleRegister()} className="w-full py-4 sm:py-5 bg-white text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors relative z-10">
              Build Your Own IP <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Directory Preview Section */}
      <section className="bg-white py-16 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-10 sm:mb-16">
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-3 sm:mb-4">Live Opportunities</h2>
              <p className="text-slate-500 font-medium">Verified professional event listings currently open for partnership.</p>
            </div>
            <button onClick={() => handleRegister()} className="hidden sm:flex items-center gap-2 text-indigo-600 font-bold hover:gap-4 transition-all">
              View All 140+ Events <ArrowRight className="w-5 h-5" />
            </button>
          </div>



          {/* Event Cards changes */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <EventCard
              title="Global Tech Summit"
              location="Bengaluru, KA"
              footfall="15k+ Attendees"
              tags={['Technology', 'B2B']}
              isLocked={true}
            />
            <EventCard
              title="Sonic Bloom Festival"
              location="Goa, India"
              footfall="45k+ Gen-Z"
              tags={['Music', 'Luxury']}
              isLocked={true}
            />
            <EventCard
              title="Elite Polo League"
              location="Jaipur, RJ"
              footfall="5k+ HNI"
              tags={['Sports', 'Premium']}
              isLocked={true}
            />
          </div>

          <button onClick={() => handleRegister()} className="sm:hidden flex items-center justify-center gap-2 text-indigo-600 font-bold mt-6 w-full">
            View All 140+ Events <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* The Concierge Promise */}
      <section className="py-16 sm:py-32 bg-slate-50 border-y border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-16 sm:w-20 h-16 sm:h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 sm:mb-10 shadow-2xl shadow-indigo-200">
            <Shield className="text-white w-8 sm:w-10 h-8 sm:h-10" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-6 sm:mb-8">The Sponsiwise Protocol</h2>
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-8 sm:mb-12">
            Brands and Organizers never communicate directly. Our Concierge Desk manages all inquiries, due diligence, and contract vetting to maintain the highest standard of professional synergy.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
             <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 flex items-center gap-4 text-left">
                <Check className="text-emerald-500 w-5 sm:w-6 h-5 sm:h-6 shrink-0" />
                <span className="text-sm font-bold">Zero spam or unsolicited pitches</span>
             </div>
             <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 flex items-center gap-4 text-left">
                <Check className="text-emerald-500 w-5 sm:w-6 h-5 sm:h-6 shrink-0" />
                <span className="text-sm font-bold">Identity & Budget Verification</span>
             </div>
          </div>
        </div>
      </section>

      <footer className="py-12 sm:py-20 bg-white text-center">
        <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
          
          <Logo />
        </div>


        {/* footer me kaam karna hai */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 sm:mb-8 px-4">
          <a href="#" className="hover:text-indigo-600">Privacy</a>
          <a href="#" className="hover:text-indigo-600">Standard Terms</a>
          <a href="#" className="hover:text-indigo-600">Concierge Desk</a>
        </div>
        <p className="text-xs text-slate-300">© 2025 Sponsiwise. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;

