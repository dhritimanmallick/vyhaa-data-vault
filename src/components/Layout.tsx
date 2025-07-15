import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Home, Users, FileText } from 'lucide-react';

export default function Layout() {
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-bold">Vyuhaa Med Data</h1>
            {isAdmin && (
              <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
                Admin
              </span>
            )}
          </div>

          <nav className="flex items-center space-x-4">
            {isAdmin && (
              <Link to="/dashboard">
                <Button 
                  variant={location.pathname === '/dashboard' ? 'default' : 'ghost'} 
                  size="sm"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            )}
            {isAdmin ? (
              <>
                <Link to="/documents">
                  <Button 
                    variant={location.pathname === '/documents' ? 'default' : 'ghost'} 
                    size="sm"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Manage Documents
                  </Button>
                </Link>
                <Link to="/users">
                  <Button 
                    variant={location.pathname === '/users' ? 'default' : 'ghost'} 
                    size="sm"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Users
                  </Button>
                </Link>
                <Link to="/view-documents">
                  <Button 
                    variant={location.pathname === '/view-documents' ? 'default' : 'ghost'} 
                    size="sm"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Documents
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/view-documents">
                <Button 
                  variant={location.pathname === '/view-documents' ? 'default' : 'ghost'} 
                  size="sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Documents
                </Button>
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}