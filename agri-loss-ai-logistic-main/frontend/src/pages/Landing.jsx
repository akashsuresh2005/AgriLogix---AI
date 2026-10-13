import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ShieldCheck, Warehouse, Truck, ArrowRight, Activity, TrendingDown, Cpu } from 'lucide-react';

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-forest-500/10 via-forest-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-bold uppercase tracking-wider mb-8 shadow-xs">
          <Activity className="w-4 h-4 text-forest-600" />
          <span>AI-Powered Agriculture Supply Chain</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
          Prevent Post-Harvest Loss With <span className="text-forest-700">Intelligent ML Predictions</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Predict crop degradation risk, estimate financial loss, locate verified regional cold storage warehouses, and book climate-controlled transit before spoilage occurs.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-forest-600 hover:bg-forest-700 text-white font-semibold text-base shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2"
          >
            <span>Start Free Spoilage Analysis</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-forest-50/50 border border-[#cbd5e1] text-slate-800 font-semibold text-base shadow-xs transition-all flex items-center justify-center"
          >
            Sign In to Account
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-white border border-[#e5e9df] shadow-sm hover:shadow-md hover:border-forest-400 transition-all">
            <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-700 border border-forest-200 flex items-center justify-center mb-4">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">9-Factor ML Spoilage Model</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Analyzes storage duration, temperature, humidity, road quality, distance, and historical district metrics using calibrated Gradient Boosting.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e5e9df] shadow-sm hover:shadow-md hover:border-amber-400 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-4">
              <Warehouse className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Warehouse Matching</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Connects farmers directly with regional cold storage facilities based on proximity, crop suitability, and available capacity.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#e5e9df] shadow-sm hover:shadow-md hover:border-blue-400 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mb-4">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Climate Shipment Booking</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Seamlessly dispatch transport to cold storage with real-time status updates and automated risk notifications for warehouse managers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
