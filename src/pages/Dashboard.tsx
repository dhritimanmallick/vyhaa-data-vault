import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Files, Users, Activity, Settings } from 'lucide-react';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome, {profile?.full_name}</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Admin Dashboard' : 'Document Access Portal'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdmin && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                <Files className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No documents uploaded yet</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1</div>
                <p className="text-xs text-muted-foreground">Admin account</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No recent activity</p>
              </CardContent>
            </Card>
          </>
        )}

        {!isAdmin && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Your Documents</CardTitle>
              <CardDescription>
                Documents that have been shared with you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                No documents have been assigned to you yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {isAdmin && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-20 flex flex-col items-center justify-center">
              <Files className="h-6 w-6 mb-2" />
              Upload Document
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Users className="h-6 w-6 mb-2" />
              Manage Users
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Activity className="h-6 w-6 mb-2" />
              View Audit Logs
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Settings className="h-6 w-6 mb-2" />
              Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}