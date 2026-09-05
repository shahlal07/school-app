"use client";

import React from "react";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base"
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function stringToColor(str: string): string {
  const colors = [
    "bg-primary-600",
    "bg-success-600",
    "bg-warning-600",
    "bg-danger-600",
    "bg-neutral-600",
    "bg-primary-700",
    "bg-success-700"
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white ${sizeClasses[size]} ${stringToColor(name)} ${className}`}
      aria-label={`Avatar for ${name}`}
    >
      {getInitials(name)}
    </div>
  );
}
