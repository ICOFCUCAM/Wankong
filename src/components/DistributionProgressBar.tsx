import React from 'react';
import { Check } from 'lucide-react';

interface DistributionProgressBarProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

const DistributionProgressBar: React.FC<DistributionProgressBarProps> = ({ steps, currentStep }) => {
  return (
    <div className="w-full px-2">
      <div className="flex items-start">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="flex flex-col items-center flex-1">
              {/* Step circle + connector line row */}
              <div className="flex items-center w-full">
                {/* Left connector line */}
                {index !== 0 && (
                  <div
                    className={[
                      'flex-1 h-0.5 transition-colors duration-300',
                      isCompleted ? 'bg-[#00D9FF]' : 'bg-[#2d3a5a]',
                    ].join(' ')}
                  />
                )}

                {/* Step circle */}
                <div
                  className={[
                    'relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                    isCompleted
                      ? 'bg-[#00D9FF] text-[#0B0814]'
                      : isCurrent
                        ? 'bg-transparent ring-2 ring-[#00D9FF] text-[#00D9FF]'
                        : 'bg-transparent ring-2 ring-[#2d3a5a] text-gray-500',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}

                  {/* Pulse ring for current step */}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full ring-2 ring-[#00D9FF] opacity-40 animate-ping" />
                  )}
                </div>

                {/* Right connector line */}
                {!isLast && (
                  <div
                    className={[
                      'flex-1 h-0.5 transition-colors duration-300',
                      index < currentStep ? 'bg-[#00D9FF]' : 'bg-[#2d3a5a]',
                    ].join(' ')}
                  />
                )}
              </div>

              {/* Step label */}
              <div className="mt-2 px-1 text-center">
                <span
                  className={[
                    'text-[11px] font-medium leading-tight',
                    isCompleted
                      ? 'text-[#00D9FF]'
                      : isCurrent
                        ? 'text-white'
                        : 'text-gray-500',
                  ].join(' ')}
                >
                  {step}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DistributionProgressBar;
