"use client";

import React, { useState } from "react";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className = "" }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Tabs"
        className="flex gap-1 overflow-x-auto no-scrollbar rounded-xl bg-neutral-100 p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`
              flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors
              focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
              ${
                active === tab.id
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={active !== tab.id}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
