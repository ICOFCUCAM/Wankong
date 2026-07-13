import React from 'react';

// Coded brand logos (colored wordmarks + signature marks) for the "Trusted by"
// strip. Real logo artwork is trademarked and can't be bundled, but brand
// colours and iconic accents make these read as the genuine logos — far better
// than plain gray text.

const ARIAL = { fontFamily: 'Arial, Helvetica, sans-serif' } as const;
const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' } as const;

function Amazon() {
  return (
    <span className="relative inline-block font-bold text-[26px] leading-none text-[#232F3E]" style={ARIAL}>
      amazon
      <svg viewBox="0 0 100 18" className="absolute left-0.5 right-0.5 -bottom-2 w-[94%]" fill="none" aria-hidden>
        <path d="M4 8 C34 20 70 20 96 7" stroke="#FF9900" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M96 7 l-8 -1 l4 7 Z" fill="#FF9900" />
      </svg>
    </span>
  );
}

function Ebay() {
  return (
    <span className="font-extrabold text-[26px] leading-none italic" style={ARIAL}>
      <span style={{ color: '#E53238' }}>e</span>
      <span style={{ color: '#0064D2' }}>b</span>
      <span style={{ color: '#F5AF02' }}>a</span>
      <span style={{ color: '#86B817' }}>y</span>
    </span>
  );
}

function Spark() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <rect key={a} x="11" y="2" width="2" height="7" rx="1" fill="#FFC220" transform={`rotate(${a} 12 12)`} />
      ))}
    </svg>
  );
}

function Walmart() {
  return (
    <span className="inline-flex items-center gap-1.5 font-bold text-[23px] leading-none text-[#0071CE]" style={ARIAL}>
      Walmart <Spark />
    </span>
  );
}

function BestBuy() {
  return (
    <span className="inline-flex items-center gap-1.5 font-extrabold text-[19px] leading-none text-[#111]" style={ARIAL}>
      BEST
      <span className="relative px-1.5 py-0.5 text-white">
        <span className="absolute inset-0 -skew-x-12 rounded-[3px] bg-[#FFF200]" />
        <span className="relative text-[#111]">BUY</span>
      </span>
    </span>
  );
}

function AliExpress() {
  return (
    <span className="font-extrabold italic text-[22px] leading-none text-[#E43225]" style={ARIAL}>AliExpress</span>
  );
}

function Temu() {
  return (
    <span className="font-extrabold italic text-[25px] leading-none text-[#FB7701]" style={SERIF}>Temu</span>
  );
}

function Apple() {
  return (
    <svg viewBox="0 0 22 26" className="h-[26px] w-auto" fill="#111" aria-hidden>
      <path d="M15 6.2c1-1.2 1.7-2.9 1.5-4.6-1.4.1-3.1 1-4.1 2.2-.9 1-1.7 2.7-1.5 4.3 1.6.1 3.2-.8 4.1-1.9z" />
      <path d="M17.6 13.6c0-2.9 2.4-4.3 2.5-4.4-1.4-2-3.5-2.3-4.2-2.3-1.8-.2-3.5 1-4.4 1-.9 0-2.3-1-3.8-1-2 .1-3.8 1.1-4.8 2.9-2 3.6-.5 8.9 1.5 11.8.9 1.4 2 3 3.5 2.9 1.4-.1 1.9-.9 3.6-.9 1.7 0 2.2.9 3.7.9 1.5 0 2.5-1.4 3.4-2.8 1.1-1.6 1.5-3.2 1.6-3.3-.1 0-3-1.2-3-4.5z" />
    </svg>
  );
}

function Costco() {
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span className="font-extrabold text-[20px] tracking-tight text-[#E31837]" style={ARIAL}>COSTCO</span>
      <span className="font-bold text-[7px] tracking-[0.28em] text-[#005DAA] mt-0.5">WHOLESALE</span>
    </span>
  );
}

function Etsy() {
  return (
    <span className="font-extrabold italic text-[25px] leading-none text-[#F1641E]" style={SERIF}>Etsy</span>
  );
}

function Newegg() {
  return (
    <span className="font-extrabold text-[22px] leading-none" style={ARIAL}>
      <span className="text-[#1a1a1a]">new</span><span className="text-[#F7941E]">egg</span>
    </span>
  );
}

function Samsung() {
  return (
    <span className="font-extrabold text-[20px] leading-none tracking-[0.06em] text-[#1428A0]" style={ARIAL}>SAMSUNG</span>
  );
}

const MAP: Record<string, () => JSX.Element> = {
  amazon: Amazon, ebay: Ebay, walmart: Walmart, bestbuy: BestBuy,
  aliexpress: AliExpress, temu: Temu, apple: Apple, costco: Costco,
  etsy: Etsy, newegg: Newegg, samsung: Samsung,
};

export const BRAND_LIST = ['amazon', 'ebay', 'walmart', 'bestbuy', 'aliexpress', 'temu', 'apple', 'costco', 'etsy', 'newegg', 'samsung'];

export function BrandLogo({ name }: { name: string }) {
  const C = MAP[name];
  return C ? <C /> : null;
}
