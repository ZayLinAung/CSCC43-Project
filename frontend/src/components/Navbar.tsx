'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/explore', label: 'Explore' },
    { href: '/friends', label: 'Friends' },
    { href: '/stocks', label: 'Stocks' },
    { href: '/portfolio', label: 'My Portfolio' },
    { href: '/stocklists', label: 'Stocklists' },
  ];

  return (
    <nav className="bg-white shadow-md">
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-indigo-600">
              Stock Social
            </Link>
          </div>
          <div className="hidden space-x-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  pathname === link.href
                    ? 'text-white bg-indigo-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
