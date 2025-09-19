'use client';

import React from 'react';

interface HybridTimeInputProps {
  label: string;
  value: string; // Format: "HH:MM" (e.g., "06:00", "14:30")
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function HybridTimeInput({ 
  label, 
  value, 
  onChange, 
  className = '', 
  disabled = false 
}: HybridTimeInputProps) {
  // Parse the current value
  const [hours, minutes] = value.split(':');
  const minuteOptions = ['00', '15', '30', '45'];

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newHours = e.target.value;
    
    // Ensure valid hour range
    const hourNum = parseInt(newHours);
    if (hourNum < 0) newHours = '00';
    if (hourNum > 23) newHours = '23';
    
    // Pad with zero if needed
    newHours = newHours.padStart(2, '0');
    
    onChange(`${newHours}:${minutes}`);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(`${hours}:${e.target.value}`);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center space-x-1">
        <input
          type="number"
          min="0"
          max="23"
          value={hours}
          onChange={handleHoursChange}
          disabled={disabled}
          className="w-12 px-2 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="06"
        />
        <span className="text-gray-500 font-medium">:</span>
        <select
          value={minutes}
          onChange={handleMinutesChange}
          disabled={disabled}
          className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {minuteOptions.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Helper function to format time for display
export function formatTimeForDisplay(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hourNum = parseInt(hours);
  const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${minutes} ${ampm}`;
}

// Helper function to validate 15-minute intervals
export function isValidTimeInterval(timeString: string): boolean {
  const [hours, minutes] = timeString.split(':');
  const validMinutes = ['00', '15', '30', '45'];
  return validMinutes.includes(minutes);
}
