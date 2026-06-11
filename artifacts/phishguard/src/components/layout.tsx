import { Shield, LayoutDashboard, History, ScanLine } from "lucide-react";
import { Link, useLocation } from "wouter";
import { clsx } from "clsx";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/scan", label: "New Scan", icon: ScanLine },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Shield className="w-6 h-6 text-primary mr-2" />
          <span className="font-mono font-bold text-lg tracking-wider">PHISH<span className="text-primary">GUARD</span></span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={clsx(
                  "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 md:hidden">
          <Shield className="w-6 h-6 text-primary mr-2" />
          <span className="font-mono font-bold text-lg tracking-wider">PHISH<span className="text-primary">GUARD</span></span>
        </header>
        <div className="flex-1 p-6 md:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
