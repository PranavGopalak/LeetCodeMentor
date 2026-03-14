'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, History, Settings, Brain } from 'lucide-react';
import BreadthGrid from './BreadthGrid';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'History', href: '/history', icon: History },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-72 border-r border-border bg-card/50 hidden md:flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <div className="p-2 bg-lc-brand/10 rounded-lg">
          <Brain className="w-6 h-6 text-lc-brand" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">LeetMentor</h1>
      </div>

      <nav className="p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-lc-brand/10 text-lc-brand font-medium'
                  : 'text-foreground/70 hover:bg-card-hover hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50">
        <BreadthGrid />
      </div>

      <div className="mt-auto p-6 border-t border-border">
        <div className="text-sm text-foreground/50">
          Powered by Gemma AI
        </div>
      </div>
    </aside>
  );
}
