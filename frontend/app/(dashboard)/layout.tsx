import type React from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { MobileHeader } from "@/components/dashboard/mobile-header"
import FloatingAIAgent from "@/components/FloatingAIAgent"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <MobileHeader />
        <div className="flex-1 overflow-y-auto relative pb-20 md:pb-0">{children}</div>
        <MobileNav />
      </main>

      <FloatingAIAgent />
    </div>
  )
}

