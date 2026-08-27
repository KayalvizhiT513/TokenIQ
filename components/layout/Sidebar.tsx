'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  BarChart3,
  DollarSign,
  Settings,
  LogOut,
  Home,
  GitPullRequest,
  Sliders,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TokenIQMark } from '@/components/brand/TokenIQMark'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/prs', label: 'PR Analytics', icon: GitPullRequest },
  { href: '/dashboard/cost', label: 'Cost Breakdown', icon: DollarSign },
  { href: '/dashboard/cost-comparison', label: 'Cost Verification', icon: DollarSign },
  { href: '/dashboard/models', label: 'Model Analysis', icon: BarChart3 },
  { href: '/dashboard/repositories', label: 'Repositories', icon: Settings },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Sliders },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-slate-50 h-screen flex flex-col">
      <div className="p-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <TokenIQMark className="h-7 w-7" />
          <span className="font-bold text-lg">TokenIQ</span>
        </Link>
        <p className="text-xs text-slate-600 mt-1">AI ROI Intelligence</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Button
              key={item.href}
              variant={isActive ? 'default' : 'ghost'}
              className={cn(
                'w-full justify-start gap-2',
                isActive && 'bg-blue-600 hover:bg-blue-700',
              )}
              onClick={() => router.push(item.href)}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
