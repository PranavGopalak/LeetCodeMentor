'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, History, Settings } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'History', href: '/history', icon: History },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 px-6 py-3 flex justify-between items-center pb-safe">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.name}
            href={link.href}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${
              isActive
                ? 'text-lc-brand font-medium'
                : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px]">{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
