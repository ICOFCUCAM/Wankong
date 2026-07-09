import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B0814] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-8xl font-black text-white mb-4">404</h1>
        <p className="text-2xl font-semibold text-gray-300 mb-2">Page not found</p>
        <p className="text-gray-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="px-6 py-3 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-medium rounded-xl transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
